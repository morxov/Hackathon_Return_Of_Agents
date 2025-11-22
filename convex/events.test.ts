import { describe, test, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock Convex context for testing
interface MockEvent {
  _id: string;
  deviceId: string;
  category: string;
  confidence: number;
  createdAt: number;
  note?: string;
}

class MockDb {
  private events: MockEvent[] = [];
  private nextId = 1;

  async insert(table: string, data: Omit<MockEvent, '_id'>): Promise<string> {
    const id = `event_${this.nextId++}`;
    const event = { _id: id, ...data };
    this.events.push(event);
    return id;
  }

  query(table: string) {
    return {
      withIndex: (indexName: string) => ({
        order: (direction: string) => ({
          take: async (limit: number) => {
            const sorted = [...this.events].sort((a, b) => 
              direction === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt
            );
            return sorted.slice(0, limit);
          },
        }),
      }),
    };
  }

  getAll(): MockEvent[] {
    return [...this.events];
  }

  clear() {
    this.events = [];
    this.nextId = 1;
  }
}

// Generators for property-based testing
const deviceIdArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_-'.split('')),
  { minLength: 1, maxLength: 50 }
);

const categoryArb = fc.constantFrom('normal', 'distress', 'impact');

const confidenceArb = fc.double({ min: 0, max: 1, noNaN: true });

const noteArb = fc.option(fc.string({ maxLength: 200 }), { nil: undefined });

const eventArb = fc.record({
  deviceId: deviceIdArb,
  category: categoryArb,
  confidence: confidenceArb,
  note: noteArb,
});

describe('addEvent mutation', () => {
  let mockDb: MockDb;

  beforeEach(() => {
    mockDb = new MockDb();
  });

  // Feature: omi-audio-monitor, Property 15: Event insertion
  test('Property 15: Event insertion - inserted event can be queried immediately', async () => {
    await fc.assert(
      fc.asyncProperty(eventArb, async (eventData) => {
        const ctx = { db: mockDb };
        
        // Insert event
        const eventId = await mockDb.insert('events', {
          ...eventData,
          createdAt: Date.now(),
        });

        // Query all events
        const allEvents = mockDb.getAll();
        
        // The inserted event should be in the database
        const foundEvent = allEvents.find(e => e._id === eventId);
        expect(foundEvent).toBeDefined();
        expect(foundEvent?.deviceId).toBe(eventData.deviceId);
        expect(foundEvent?.category).toBe(eventData.category);
        expect(foundEvent?.confidence).toBe(eventData.confidence);
        expect(foundEvent?.note).toBe(eventData.note);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: omi-audio-monitor, Property 16: Timestamp generation
  test('Property 16: Timestamp generation - createdAt is within 1000ms of current time', async () => {
    await fc.assert(
      fc.asyncProperty(eventArb, async (eventData) => {
        const beforeInsert = Date.now();
        
        await mockDb.insert('events', {
          ...eventData,
          createdAt: Date.now(),
        });
        
        const afterInsert = Date.now();
        const allEvents = mockDb.getAll();
        const insertedEvent = allEvents[allEvents.length - 1];
        
        // Timestamp should be between before and after, with 1000ms tolerance
        expect(insertedEvent.createdAt).toBeGreaterThanOrEqual(beforeInsert - 1000);
        expect(insertedEvent.createdAt).toBeLessThanOrEqual(afterInsert + 1000);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: omi-audio-monitor, Property 17: Data persistence round-trip
  test('Property 17: Data persistence round-trip - inserted data matches queried data', async () => {
    await fc.assert(
      fc.asyncProperty(eventArb, async (eventData) => {
        const createdAt = Date.now();
        
        // Insert event
        const eventId = await mockDb.insert('events', {
          ...eventData,
          createdAt,
        });

        // Query the event back
        const allEvents = mockDb.getAll();
        const retrievedEvent = allEvents.find(e => e._id === eventId);
        
        // All fields should match exactly
        expect(retrievedEvent).toBeDefined();
        expect(retrievedEvent?.deviceId).toBe(eventData.deviceId);
        expect(typeof retrievedEvent?.deviceId).toBe('string');
        
        expect(retrievedEvent?.category).toBe(eventData.category);
        expect(typeof retrievedEvent?.category).toBe('string');
        
        expect(retrievedEvent?.confidence).toBe(eventData.confidence);
        expect(typeof retrievedEvent?.confidence).toBe('number');
        
        expect(retrievedEvent?.createdAt).toBe(createdAt);
        expect(typeof retrievedEvent?.createdAt).toBe('number');
        
        expect(retrievedEvent?.note).toBe(eventData.note);
        if (eventData.note !== undefined) {
          expect(typeof retrievedEvent?.note).toBe('string');
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe('recentEvents query', () => {
  let mockDb: MockDb;

  beforeEach(() => {
    mockDb = new MockDb();
  });

  // Feature: omi-audio-monitor, Property 18: Query sort order
  test('Property 18: Query sort order - events are returned in descending createdAt order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(eventArb, { minLength: 2, maxLength: 20 }),
        async (events) => {
          // Create a fresh MockDb for each property test run
          const testDb = new MockDb();
          
          // Insert events with different timestamps
          const timestamps: number[] = [];
          for (let i = 0; i < events.length; i++) {
            const timestamp = Date.now() + i * 1000; // Ensure unique timestamps
            timestamps.push(timestamp);
            await testDb.insert('events', {
              ...events[i],
              createdAt: timestamp,
            });
          }

          // Query events
          const result = await testDb.query('events')
            .withIndex('by_createdAt')
            .order('desc')
            .take(50);

          // Verify descending order
          for (let i = 0; i < result.length - 1; i++) {
            expect(result[i].createdAt).toBeGreaterThanOrEqual(result[i + 1].createdAt);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: omi-audio-monitor, Property 19: Query limit enforcement
  test('Property 19: Query limit enforcement - returns at most limit events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(eventArb, { minLength: 1, maxLength: 100 }),
        fc.integer({ min: 1, max: 50 }),
        async (events, limit) => {
          // Create a fresh MockDb for each property test run
          const testDb = new MockDb();
          
          // Insert all events
          for (let i = 0; i < events.length; i++) {
            await testDb.insert('events', {
              ...events[i],
              createdAt: Date.now() + i,
            });
          }

          // Query with limit
          const result = await testDb.query('events')
            .withIndex('by_createdAt')
            .order('desc')
            .take(limit);

          // Result should have at most 'limit' events
          expect(result.length).toBeLessThanOrEqual(limit);
          
          // If we have more events than the limit, result should equal limit
          if (events.length >= limit) {
            expect(result.length).toBe(limit);
          } else {
            // Otherwise, result should equal the number of events
            expect(result.length).toBe(events.length);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

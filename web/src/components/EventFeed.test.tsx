import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import EventFeed from './EventFeed';
import { Event } from './EventCard';

// Mock the convex/react module
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
}));

// Import after mocking
import { useQuery } from 'convex/react';

// Generators for property-based testing
const deviceIdArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_-'.split('')),
  { minLength: 1, maxLength: 50 }
);

const categoryArb = fc.constantFrom('normal', 'distress', 'impact');

const confidenceArb = fc.double({ min: 0, max: 1, noNaN: true });

const timestampArb = fc.integer({ min: 0, max: Date.now() + 1000000 });

const noteArb = fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined });

const eventArb = fc.record({
  _id: fc.uuid(),
  deviceId: deviceIdArb,
  category: categoryArb,
  confidence: confidenceArb,
  createdAt: timestampArb,
  note: noteArb,
});

const eventsArrayArb = fc.array(eventArb, { minLength: 0, maxLength: 50 });

describe('EventFeed', () => {
  // Feature: omi-audio-monitor, Property 20: Event reactivity
  test('Property 20: displays events returned from Convex query', () => {
    fc.assert(
      fc.property(eventsArrayArb, (events) => {
        // Mock useQuery to return our test events
        vi.mocked(useQuery).mockReturnValue(events);
        
        const { container } = render(<EventFeed />);
        
        if (events.length === 0) {
          // Should show empty state
          const text = container.textContent || '';
          return text.includes('No events yet');
        } else {
          // Should render EventCard for each event
          const eventCards = container.querySelectorAll('.event-card');
          return eventCards.length === events.length;
        }
      }),
      { numRuns: 100 }
    );
  });

  // Feature: omi-audio-monitor, Property 22: Visual differentiation
  test('Property 22: highlights distress and impact events', () => {
    fc.assert(
      fc.property(eventsArrayArb, (events) => {
        vi.mocked(useQuery).mockReturnValue(events);
        
        const { container } = render(<EventFeed />);
        
        // Count how many events should be highlighted
        const expectedHighlighted = events.filter(
          e => e.category === 'distress' || e.category === 'impact'
        ).length;
        
        // Count how many highlighted cards are rendered
        const highlightedCards = container.querySelectorAll('.event-card--highlighted');
        
        return highlightedCards.length === expectedHighlighted;
      }),
      { numRuns: 100 }
    );
  });

  // Test loading state
  test('displays loading state when events are undefined', () => {
    vi.mocked(useQuery).mockReturnValue(undefined);
    
    render(<EventFeed />);
    
    expect(screen.getByText(/Loading events/i)).toBeDefined();
  });

  // Test error state
  test('displays error state when events are null', () => {
    vi.mocked(useQuery).mockReturnValue(null);
    
    render(<EventFeed />);
    
    expect(screen.getByText(/Error loading events/i)).toBeDefined();
  });

  // Test empty state
  test('displays empty state when events array is empty', () => {
    vi.mocked(useQuery).mockReturnValue([]);
    
    render(<EventFeed />);
    
    expect(screen.getByText(/No events yet/i)).toBeDefined();
  });
});

# Design Document

## Overview

The Omi Audio Monitor is a personal safety system that leverages the Omi DevKit 2 wearable device to detect and classify audio events in real-time. The system architecture consists of three main components:

1. **Audio Server** - A Node.js/Express server that receives raw audio streams from the Omi Backend, extracts acoustic features, classifies events, and persists them to Convex
2. **Convex Backend** - A serverless database that stores audio events with timestamps and provides real-time queries
3. **React Dashboard** - A web interface that displays classified events in real-time with visual emphasis on distress and impact events

The system is designed for hackathon deployment with minimal infrastructure requirements, using ngrok for exposing the Audio Server and Convex for managed backend services.

## Architecture

```
[Omi DevKit 2 Necklace]
         ↓ (BLE audio stream)
[Omi Mobile App]
         ↓ (to cloud)
[Omi Backend]
         ↓ (HTTP POST with raw audio bytes)
[Audio Server (Node/Express)]
    ├─→ Audio Parser (bytes → samples)
    ├─→ Feature Extractor (RMS, peak)
    ├─→ Event Classifier (normal/distress/impact)
    └─→ Convex Client
         ↓
[Convex Backend]
    ├─→ events table
    └─→ recentEvents query
         ↓ (live subscription)
[React Dashboard]
    └─→ Event Feed (color-coded display)
```

### Data Flow

1. User wears Omi DevKit 2, which streams audio via BLE to the Omi mobile app
2. Omi app forwards audio to Omi Backend
3. Omi Backend sends periodic POST requests (every 5-10 seconds) to the Audio Server with raw audio bytes
4. Audio Server processes each chunk:
   - Parses raw bytes as 16-bit PCM audio
   - Computes RMS and peak amplitude
   - Classifies event based on thresholds
   - Stores event in Convex
5. Dashboard subscribes to Convex and updates in real-time as new events arrive

### Technology Stack

- **Audio Server**: Node.js 18+, Express 4.x, TypeScript 5.x
- **Backend**: Convex (serverless)
- **Frontend**: React 18+, Vite, TypeScript 5.x
- **Development**: ngrok for local tunneling
- **Property Testing**: fast-check (JavaScript/TypeScript PBT library)

## Components and Interfaces

### Audio Server

**Responsibilities:**
- Accept HTTP POST requests from Omi Backend
- Parse raw audio bytes into samples
- Extract acoustic features
- Classify events
- Persist events to Convex

**Key Interfaces:**

```typescript
// HTTP endpoint
POST /audio?sample_rate=16000&uid=<device_id>
Content-Type: application/octet-stream
Body: <raw audio bytes>

Response: 200 OK | 500 Error

// Internal functions
interface AudioFeatures {
  rms: number;        // Root mean square amplitude [0, 1]
  peak: number;       // Peak amplitude [0, 1]
  sampleCount: number;
}

interface Classification {
  category: 'normal' | 'distress' | 'impact';
  confidence: number; // [0, 1]
}

function parseAudioBytes(buffer: Buffer): Int16Array
function extractFeatures(samples: Int16Array): AudioFeatures
function classify(features: AudioFeatures): Classification
```

**Configuration:**
- `PORT`: Server port (default 3000)
- `CONVEX_URL`: Convex deployment URL

### Convex Backend

**Schema:**

```typescript
// convex/schema.ts
events: {
  deviceId: string,      // Omi user ID
  category: string,      // 'normal' | 'distress' | 'impact'
  confidence: number,    // [0, 1]
  createdAt: number,     // Unix timestamp (ms)
  note?: string          // Optional debug info (rms, peak, sample rate)
}

// Index for efficient time-based queries
index: by_createdAt on [createdAt]
```

**Mutations:**

```typescript
// convex/events.ts
addEvent(args: {
  deviceId: string,
  category: string,
  confidence: number,
  note?: string
}): Promise<Id<"events">>
```

**Queries:**

```typescript
recentEvents(args: {
  limit?: number  // default 50
}): Promise<Array<Event>>
// Returns events ordered by createdAt DESC
```

### React Dashboard

**Responsibilities:**
- Connect to Convex backend
- Subscribe to real-time event updates
- Display events with visual differentiation
- Highlight distress and impact events

**Key Components:**

```typescript
// App.tsx
function App() {
  const events = useQuery(api.events.recentEvents, { limit: 50 });
  return <EventFeed events={events} />;
}

// EventFeed.tsx
function EventFeed({ events }: { events: Event[] }) {
  return events.map(event => (
    <EventCard 
      key={event._id} 
      event={event}
      highlighted={event.category === 'distress' || event.category === 'impact'}
    />
  ));
}

// EventCard.tsx
function EventCard({ event, highlighted }: Props) {
  // Color coding:
  // - normal: gray
  // - distress: yellow/orange
  // - impact: red
  // - highlighted events: bold border, larger size
}
```

## Data Models

### Audio Processing

**Raw Audio Format:**
- Codec: 16-bit PCM, little-endian
- Channels: Mono
- Sample Rate: 16,000 Hz (fixed for Omi DevKit 2)
- Chunk Duration: 5-10 seconds (configurable in Omi app)
- Chunk Size: ~160,000 - 320,000 bytes (80,000 - 160,000 samples)

**Normalized Samples:**
- Int16 values [-32768, 32767] normalized to float [-1.0, 1.0]
- Normalization: `normalized = int16_value / 32768.0`

**Acoustic Features:**
- **RMS (Root Mean Square)**: Measures average loudness
  - Formula: `sqrt(sum(sample^2) / count)`
  - Range: [0, 1] for normalized samples
  - Typical values: 0.1-0.3 for normal speech, 0.5+ for shouting
  
- **Peak Amplitude**: Measures maximum loudness
  - Formula: `max(abs(sample))`
  - Range: [0, 1] for normalized samples
  - Typical values: 0.5-0.7 for speech, 0.9+ for impacts

### Classification Model

**Simple Threshold-Based Classifier (MVP):**

```
if peak > 0.9:
  category = "impact"
  confidence = 0.95
elif rms > 0.5:
  category = "distress"
  confidence = 0.8
else:
  category = "normal"
  confidence = 0.7
```

**Rationale:**
- Peak amplitude captures sudden loud events (impacts, crashes)
- RMS captures sustained loud events (shouting, screaming)
- Thresholds are conservative to minimize false positives
- For hackathon MVP, simplicity is prioritized over accuracy

**Future Enhancements:**
- Frequency analysis (FFT) to distinguish voice from other sounds
- Machine learning classifier trained on labeled distress audio
- Temporal patterns (e.g., repeated shouting)
- Integration with accelerometer data from DevKit 2

### Event Storage

**Event Record:**
```typescript
{
  _id: Id<"events">,           // Convex auto-generated
  deviceId: string,             // e.g., "user_abc123"
  category: "normal" | "distress" | "impact",
  confidence: number,           // 0.0 - 1.0
  createdAt: number,            // Unix timestamp (ms)
  note?: string                 // e.g., "rms=0.523, peak=0.891, sr=16000"
}
```

**Storage Characteristics:**
- Events are immutable once created
- No updates or deletes in MVP
- Indexed by createdAt for efficient time-range queries
- Typical event rate: 6-12 events per minute (one per 5-10 second chunk)


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Audio Server Properties

**Property 1: HTTP request acceptance**
*For any* valid audio byte buffer with Content-Type application/octet-stream, the server should accept the request and return status 200
**Validates: Requirements 1.1, 1.4**

**Property 2: Query parameter extraction**
*For any* HTTP request with sample_rate and uid query parameters, the server should correctly extract both values
**Validates: Requirements 1.2, 1.3**

**Property 3: Error handling**
*For any* request that causes a processing error, the server should return status 500
**Validates: Requirements 1.5**

**Property 4: Byte-to-sample conversion**
*For any* byte buffer with even length, parsing should produce an Int16Array with length equal to buffer.length / 2
**Validates: Requirements 2.1, 2.2**

**Property 5: Sample normalization bounds**
*For any* Int16 value, normalizing by dividing by 32768 should produce a value in the range [-1, 1]
**Validates: Requirements 2.3**

**Property 6: Sample rate flexibility**
*For any* valid sample rate value (not just 16000), the server should successfully process the audio
**Validates: Requirements 2.4**

**Property 7: RMS computation correctness**
*For any* array of normalized samples, the computed RMS should equal sqrt(sum(sample²) / count)
**Validates: Requirements 3.1, 3.3**

**Property 8: Peak computation correctness**
*For any* array of normalized samples, the computed peak should equal max(abs(sample))
**Validates: Requirements 3.2, 3.4**

**Property 9: Impact classification**
*For any* audio features with peak > 0.9, the classification category should be "impact"
**Validates: Requirements 4.1**

**Property 10: Distress classification**
*For any* audio features with rms > 0.5 and peak ≤ 0.9, the classification category should be "distress"
**Validates: Requirements 4.2**

**Property 11: Normal classification**
*For any* audio features with peak ≤ 0.9 and rms ≤ 0.5, the classification category should be "normal"
**Validates: Requirements 4.3**

**Property 12: Classification output format**
*For any* audio features, classification should produce a category string and a confidence number in [0, 1]
**Validates: Requirements 4.4**

**Property 13: Event persistence**
*For any* classified event, the server should invoke addEvent with the correct deviceId, category, and confidence
**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

**Property 14: Note content**
*For any* event sent to Convex, the note field should contain the rms, peak, and sample rate values
**Validates: Requirements 5.5**

### Convex Backend Properties

**Property 15: Event insertion**
*For any* addEvent mutation call, querying the events table immediately after should return the inserted event
**Validates: Requirements 6.1**

**Property 16: Timestamp generation**
*For any* inserted event, the createdAt timestamp should be within 1000ms of the current time
**Validates: Requirements 6.2**

**Property 17: Data persistence round-trip**
*For any* event data (deviceId, category, confidence, note), inserting then querying should return the same values with correct types
**Validates: Requirements 6.3, 6.4, 6.5, 6.6**

**Property 18: Query sort order**
*For any* set of events in the database, recentEvents should return them with createdAt values in descending order
**Validates: Requirements 7.1**

**Property 19: Query limit enforcement**
*For any* limit parameter value, recentEvents should return at most that many events
**Validates: Requirements 7.2**

### Dashboard Properties

**Property 20: Event reactivity**
*For any* new event added to Convex, the dashboard should update to display it within the subscription latency
**Validates: Requirements 8.3**

**Property 21: Event display completeness**
*For any* event displayed in the dashboard, the rendered output should contain the category, confidence, timestamp, and deviceId
**Validates: Requirements 8.4**

**Property 22: Visual differentiation**
*For any* distress or impact event, the dashboard should apply distinct highlighting styles that differ from normal events
**Validates: Requirements 8.5, 8.6**

### Edge Cases

The property-based test generators should handle these edge cases:

- **Empty audio buffers**: Zero-length byte arrays
- **Single-sample audio**: Buffers with only 2 bytes (1 sample)
- **Silent audio**: All samples are zero
- **Maximum amplitude**: Samples at Int16 limits (±32767)
- **Boundary thresholds**: RMS and peak values exactly at 0.5 and 0.9
- **Missing query parameters**: Requests without sample_rate or uid
- **Invalid sample rates**: Negative or zero sample rates
- **Very large buffers**: Audio chunks exceeding typical size
- **Special characters in uid**: Device IDs with unicode, spaces, special chars

## Error Handling

### Audio Server Errors

**Input Validation:**
- Invalid Content-Type → 400 Bad Request
- Missing query parameters → Use defaults (sample_rate=16000, uid="unknown")
- Malformed byte buffer (odd length) → 400 Bad Request
- Empty buffer → Process as silent audio (valid)

**Processing Errors:**
- Convex connection failure → 500 Internal Server Error, log error, retry once
- Classification error → 500 Internal Server Error, log error with audio features
- Unexpected exceptions → 500 Internal Server Error, log full stack trace

**Error Logging:**
All errors should be logged with:
- Timestamp
- Request details (uid, sample_rate, buffer length)
- Error message and stack trace
- Audio features if computed (rms, peak)

### Convex Errors

**Mutation Errors:**
- Schema validation failure → Throw ConvexError with details
- Database write failure → Retry with exponential backoff (Convex handles this)

**Query Errors:**
- Invalid limit parameter → Use default (50)
- Database read failure → Return empty array, log error

### Dashboard Errors

**Connection Errors:**
- Convex connection failure → Display "Connecting..." message
- Subscription error → Display error banner, retry connection

**Rendering Errors:**
- Invalid event data → Skip rendering that event, log warning
- Missing required fields → Display partial data with "N/A" for missing fields

## Testing Strategy

### Unit Testing

**Audio Server Unit Tests:**
- Test parseAudioBytes with various buffer sizes
- Test extractFeatures with known sample arrays
- Test classify with boundary threshold values
- Test HTTP endpoint with mock Convex client
- Test error handling with invalid inputs

**Convex Unit Tests:**
- Test addEvent mutation with valid data
- Test recentEvents query with various limits
- Test schema validation with invalid data

**Dashboard Unit Tests:**
- Test EventCard rendering with different categories
- Test EventFeed sorting and filtering
- Test color coding logic

### Property-Based Testing

We will use **fast-check** (https://github.com/dubzzz/fast-check) as the property-based testing library for JavaScript/TypeScript. Fast-check is the most mature and widely-used PBT library in the JavaScript ecosystem.

**Configuration:**
- Each property test should run a minimum of 100 iterations
- Use `fc.assert(fc.property(...), { numRuns: 100 })` or higher
- For critical properties (classification, data persistence), use 1000 iterations

**Test Tagging:**
Each property-based test MUST include a comment tag in this exact format:
```typescript
// Feature: omi-audio-monitor, Property X: <property description>
```

For example:
```typescript
// Feature: omi-audio-monitor, Property 5: Sample normalization bounds
test('normalized samples are in [-1, 1]', () => {
  fc.assert(
    fc.property(fc.integer({ min: -32768, max: 32767 }), (int16Value) => {
      const normalized = int16Value / 32768;
      return normalized >= -1 && normalized <= 1;
    }),
    { numRuns: 100 }
  );
});
```

**Property Test Coverage:**

Each correctness property listed above MUST be implemented as a property-based test. The tests should be organized as follows:

- **audio-server/src/audio.test.ts**: Properties 4-8 (parsing and feature extraction)
- **audio-server/src/classifier.test.ts**: Properties 9-12 (classification logic)
- **audio-server/src/server.test.ts**: Properties 1-3, 13-14 (HTTP and integration)
- **convex/events.test.ts**: Properties 15-19 (Convex mutations and queries)
- **web/src/components/EventFeed.test.tsx**: Properties 20-22 (dashboard rendering)

**Generators:**

Smart generators should be written to constrain the input space:

```typescript
// Generate valid audio buffers (even length, reasonable size)
const audioBufferArb = fc.uint8Array({ 
  minLength: 0, 
  maxLength: 320000 
}).filter(arr => arr.length % 2 === 0);

// Generate audio features with controlled ranges
const audioFeaturesArb = fc.record({
  rms: fc.double({ min: 0, max: 1 }),
  peak: fc.double({ min: 0, max: 1 }),
  sampleCount: fc.integer({ min: 0, max: 160000 })
});

// Generate valid device IDs
const deviceIdArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_-'.split('')),
  { minLength: 1, maxLength: 50 }
);

// Generate events with valid structure
const eventArb = fc.record({
  deviceId: deviceIdArb,
  category: fc.constantFrom('normal', 'distress', 'impact'),
  confidence: fc.double({ min: 0, max: 1 }),
  note: fc.option(fc.string(), { nil: undefined })
});
```

### Integration Testing

**End-to-End Flow:**
1. Send mock audio POST request to Audio Server
2. Verify event appears in Convex
3. Verify dashboard displays the event

**Component Integration:**
- Audio Server → Convex: Test that classified events are correctly stored
- Convex → Dashboard: Test that stored events are correctly retrieved and displayed

**Manual Testing:**
- Configure Omi app to send to local ngrok URL
- Wear DevKit 2 and generate test sounds (clap, shout, normal speech)
- Verify events appear in dashboard with correct classifications

### Test Execution

**Development:**
```bash
# Run all tests
npm test

# Run property tests only
npm test -- --grep "Property"

# Run with coverage
npm test -- --coverage
```

**CI/CD:**
- Run all tests on every commit
- Require 80% code coverage for Audio Server
- Require all property tests to pass

## Deployment

### Local Development

**Audio Server:**
```bash
cd audio-server
npm install
npm run dev  # Starts server on port 3000
ngrok http 3000  # Expose to internet
```

**Convex:**
```bash
cd convex
npx convex dev  # Starts local Convex instance
```

**Dashboard:**
```bash
cd web
npm install
npm run dev  # Starts Vite dev server
```

### Omi Configuration

1. Open Omi mobile app
2. Go to Settings → Developer Mode
3. Enable "Realtime audio bytes"
4. Set endpoint URL: `https://<your-ngrok-url>.ngrok.io/audio`
5. Set frequency: 5 seconds (for faster feedback) or 10 seconds (for less data)

### Production Deployment (Future)

**Audio Server:**
- Deploy to Railway, Render, or Fly.io
- Use environment variables for CONVEX_URL
- Enable HTTPS (required by Omi)

**Convex:**
- Deploy to Convex production: `npx convex deploy`
- Update Audio Server with production CONVEX_URL

**Dashboard:**
- Deploy to Vercel, Netlify, or Cloudflare Pages
- Configure Convex production URL in environment

## Security Considerations

### Audio Server

**Input Validation:**
- Limit request body size to 10 MB (prevents DoS)
- Validate Content-Type header
- Sanitize uid parameter (prevent injection)

**Authentication (Future):**
- Verify requests come from Omi Backend (shared secret or signature)
- Rate limiting per device ID
- API key authentication for dashboard access

### Convex

**Data Access:**
- No authentication in MVP (hackathon)
- Future: Implement Convex auth to restrict event creation
- Future: Row-level security to isolate events by user

### Dashboard

**Data Privacy:**
- No PII displayed (only device IDs)
- Future: Require login to view events
- Future: Encrypt sensitive event notes

## Performance Considerations

### Audio Server

**Expected Load:**
- 1 device: 6-12 requests/minute
- 10 devices: 60-120 requests/minute
- 100 devices: 600-1200 requests/minute

**Optimization:**
- Process audio synchronously (simple, fast enough for MVP)
- Future: Queue processing for high load
- Future: Batch Convex writes

**Resource Usage:**
- Memory: ~50 MB per request (audio buffer + processing)
- CPU: Minimal (simple math operations)
- Network: ~32 KB per request (audio) + ~1 KB (Convex write)

### Convex

**Query Performance:**
- Index on createdAt enables O(log n) queries
- Limit queries to 50 events (fast even with 100k+ events)
- Real-time subscriptions use Convex's optimized protocol

**Storage:**
- ~200 bytes per event
- 1 device, 1 day: ~10,000 events = 2 MB
- 100 devices, 30 days: ~30M events = 6 GB

### Dashboard

**Rendering Performance:**
- Limit display to 50 events (fast rendering)
- Use React.memo for EventCard components
- Debounce updates if events arrive rapidly

**Network:**
- Convex subscription uses WebSocket (efficient)
- Only changed events are sent (not full re-query)

## Future Enhancements

### Classification Improvements

1. **Frequency Analysis:**
   - Use FFT to extract frequency features
   - Distinguish voice (300-3000 Hz) from impacts (broadband)
   - Detect specific distress patterns (screaming has high harmonics)

2. **Machine Learning:**
   - Train classifier on labeled distress audio dataset
   - Use TensorFlow.js for in-browser inference
   - Features: MFCC, spectral centroid, zero-crossing rate

3. **Temporal Patterns:**
   - Detect repeated events (multiple shouts)
   - Track event sequences (impact followed by silence)
   - Sliding window analysis

### Safety Features

1. **Alert System:**
   - Send SMS/email when distress detected
   - Push notifications to trusted contacts
   - Integration with emergency services (911)

2. **Location Tracking:**
   - Include GPS coordinates with events
   - Show location on map in dashboard
   - Geofencing (alert when leaving safe zone)

3. **False Positive Reduction:**
   - User feedback loop (was this a real distress?)
   - Adaptive thresholds based on environment
   - Context awareness (time of day, location)

### User Experience

1. **Mobile Dashboard:**
   - Native iOS/Android app
   - Push notifications for distress events
   - Quick access to emergency contacts

2. **Historical Analysis:**
   - View events over time (charts, heatmaps)
   - Export data for analysis
   - Identify patterns and trends

3. **Multi-Device Support:**
   - Support multiple DevKit 2 devices per user
   - Device management (add, remove, rename)
   - Per-device settings and thresholds

### Infrastructure

1. **Scalability:**
   - Horizontal scaling of Audio Server
   - Load balancing across multiple instances
   - Caching layer for frequently accessed data

2. **Reliability:**
   - Health checks and monitoring
   - Automatic failover
   - Data backup and recovery

3. **Observability:**
   - Metrics dashboard (event rate, latency, errors)
   - Distributed tracing
   - Log aggregation and search

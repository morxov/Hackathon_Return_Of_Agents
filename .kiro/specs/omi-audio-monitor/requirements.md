# Requirements Document

## Introduction

This system is a personal safety device that provides real-time audio event monitoring and classification using the Omi DevKit 2 wearable device. The system receives audio streams from the Omi backend, classifies audio events (normal ambient sound, distress/shouting, impact, crash), stores events in a Convex database, and displays them in a live web dashboard. The primary use case is protecting college student women and women walking alone at night by detecting distress situations such as shouting, screaming, or physical impacts that may indicate danger.

## Glossary

- **Omi DevKit 2**: A wearable necklace device with audio recording capabilities, built on Seeed XIAO nRF52840, that streams audio via BLE to the Omi mobile app
- **Omi Backend**: The cloud service provided by Omi that receives audio from the mobile app and forwards it to developer webhooks
- **Audio Server**: The Node.js/Express server that receives raw audio bytes from Omi Backend and performs event classification
- **Convex**: A serverless backend platform used for storing and querying audio event data
- **Audio Event**: A classified segment of audio with a category (normal, voice, impact, crash) and confidence score
- **RMS (Root Mean Square)**: A measure of the average amplitude/loudness of an audio signal
- **Peak Amplitude**: The maximum absolute amplitude value in an audio segment
- **Sample Rate**: The number of audio samples per second, fixed at 16,000 Hz for Omi DevKit 2

## Requirements

### Requirement 1

**User Story:** As a system operator, I want the Audio Server to receive raw audio streams from the Omi Backend, so that I can process real-time audio data from the DevKit 2 device.

#### Acceptance Criteria

1. WHEN the Omi Backend sends a POST request with audio bytes, THEN the Audio Server SHALL accept the request with Content-Type application/octet-stream
2. WHEN the Audio Server receives audio data, THEN the Audio Server SHALL extract the sample_rate parameter from the query string
3. WHEN the Audio Server receives audio data, THEN the Audio Server SHALL extract the uid parameter from the query string to identify the device
4. WHEN the Audio Server processes a valid audio request, THEN the Audio Server SHALL respond with HTTP status 200
5. WHEN the Audio Server encounters an error during processing, THEN the Audio Server SHALL respond with HTTP status 500 and log the error

### Requirement 2

**User Story:** As a system operator, I want the Audio Server to parse raw audio bytes into usable samples, so that I can extract acoustic features for classification.

#### Acceptance Criteria

1. WHEN the Audio Server receives raw audio bytes, THEN the Audio Server SHALL interpret them as 16-bit PCM little-endian mono audio
2. WHEN the Audio Server parses audio bytes, THEN the Audio Server SHALL convert the byte buffer into an Int16Array of samples
3. WHEN the Audio Server normalizes samples, THEN the Audio Server SHALL divide each Int16 value by 32768 to produce values in the range [-1, 1]
4. WHEN the sample rate is not 16000 Hz, THEN the Audio Server SHALL still process the audio using the provided sample rate

### Requirement 3

**User Story:** As a system operator, I want the Audio Server to compute acoustic features from audio samples, so that I can classify different types of audio events.

#### Acceptance Criteria

1. WHEN the Audio Server processes audio samples, THEN the Audio Server SHALL compute the RMS value across all samples
2. WHEN the Audio Server processes audio samples, THEN the Audio Server SHALL compute the peak amplitude value across all samples
3. WHEN computing RMS, THEN the Audio Server SHALL calculate the square root of the mean of squared normalized samples
4. WHEN computing peak amplitude, THEN the Audio Server SHALL find the maximum absolute value among normalized samples

### Requirement 4

**User Story:** As a user wearing the safety device, I want the Audio Server to classify audio events based on acoustic features, so that distress situations like shouting or impacts can be detected and logged.

#### Acceptance Criteria

1. WHEN the peak amplitude exceeds 0.9, THEN the Audio Server SHALL classify the event as "impact" with high confidence
2. WHEN the RMS value exceeds 0.5 and peak is below 0.9, THEN the Audio Server SHALL classify the event as "distress" with moderate confidence
3. WHEN neither high peak nor high RMS conditions are met, THEN the Audio Server SHALL classify the event as "normal" with baseline confidence
4. WHEN the Audio Server classifies an event, THEN the Audio Server SHALL produce both a category string and a confidence number between 0 and 1
5. WHEN classifying distress events, THEN the Audio Server SHALL prioritize sensitivity to detect shouting and raised voices

### Requirement 5

**User Story:** As a system operator, I want the Audio Server to store classified events in Convex, so that I can persist event data for later analysis and display.

#### Acceptance Criteria

1. WHEN the Audio Server classifies an audio event, THEN the Audio Server SHALL invoke the Convex addEvent mutation
2. WHEN invoking addEvent, THEN the Audio Server SHALL provide the device ID from the uid parameter
3. WHEN invoking addEvent, THEN the Audio Server SHALL provide the classification category
4. WHEN invoking addEvent, THEN the Audio Server SHALL provide the confidence score
5. WHEN invoking addEvent, THEN the Audio Server SHALL provide a note containing RMS, peak, and sample rate values

### Requirement 6

**User Story:** As a backend developer, I want Convex to store audio events with timestamps, so that I can query events chronologically.

#### Acceptance Criteria

1. WHEN the Convex addEvent mutation is called, THEN the Convex SHALL insert a new event record into the events table
2. WHEN inserting an event, THEN the Convex SHALL automatically add a createdAt timestamp using the current time
3. WHEN storing an event, THEN the Convex SHALL persist the deviceId as a string
4. WHEN storing an event, THEN the Convex SHALL persist the category as a string
5. WHEN storing an event, THEN the Convex SHALL persist the confidence as a number
6. WHERE a note is provided, THEN the Convex SHALL persist the note as an optional string

### Requirement 7

**User Story:** As a backend developer, I want Convex to provide efficient queries for recent events, so that the dashboard can display events in real-time.

#### Acceptance Criteria

1. WHEN the recentEvents query is called, THEN the Convex SHALL return events ordered by createdAt in descending order
2. WHEN the recentEvents query is called with a limit parameter, THEN the Convex SHALL return at most that many events
3. WHEN the recentEvents query is called without a limit parameter, THEN the Convex SHALL default to returning 50 events
4. WHEN querying events, THEN the Convex SHALL use an index on createdAt for efficient retrieval

### Requirement 8

**User Story:** As a trusted contact or emergency responder, I want to view a live dashboard of audio events, so that I can monitor for distress situations and respond quickly if needed.

#### Acceptance Criteria

1. WHEN the dashboard loads, THEN the Dashboard SHALL establish a connection to the Convex backend
2. WHEN the dashboard is active, THEN the Dashboard SHALL subscribe to the recentEvents query
3. WHEN new events are added to Convex, THEN the Dashboard SHALL automatically update to display them
4. WHEN displaying events, THEN the Dashboard SHALL show the category, confidence, timestamp, and device ID for each event
5. WHEN displaying events, THEN the Dashboard SHALL use visual differentiation (color coding) based on event category, with distress and impact events prominently highlighted
6. WHEN displaying distress or impact events, THEN the Dashboard SHALL make them visually distinct to draw immediate attention

### Requirement 9

**User Story:** As a developer, I want clear separation between the audio processing server, database layer, and UI, so that the system is maintainable and each component can be modified independently.

#### Acceptance Criteria

1. WHEN the Audio Server implementation changes, THEN the Convex schema and Dashboard SHALL remain unaffected
2. WHEN the Dashboard implementation changes, THEN the Audio Server and Convex logic SHALL continue functioning unchanged
3. WHEN the Convex schema is extended, THEN the Audio Server and Dashboard SHALL require only minimal updates to their interfaces

# Implementation Plan

- [x] 1. Set up project structure and dependencies
  - Create three main directories: audio-server/, convex/, and web/
  - Initialize Node.js project in audio-server/ with TypeScript, Express, and Convex client
  - Initialize Convex project in convex/ directory
  - Initialize React + Vite project in web/ with TypeScript and Convex client
  - Configure TypeScript for all projects with strict mode
  - _Requirements: All_

- [x] 2. Implement Convex backend schema and operations
  - Define events table schema with deviceId, category, confidence, createdAt, and optional note fields
  - Create index on createdAt for efficient time-based queries
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.4_

- [x] 2.1 Implement addEvent mutation
  - Create mutation that accepts deviceId, category, confidence, and optional note
  - Automatically add createdAt timestamp using Date.now()
  - Return the inserted event ID
  - _Requirements: 6.1, 6.2_

- [x] 2.2 Write property test for addEvent mutation
  - **Property 15: Event insertion**
  - **Property 16: Timestamp generation**
  - **Property 17: Data persistence round-trip**
  - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6**

- [x] 2.3 Implement recentEvents query
  - Create query that accepts optional limit parameter (default 50)
  - Return events ordered by createdAt descending
  - Use the createdAt index for efficient retrieval
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 2.4 Write property test for recentEvents query
  - **Property 18: Query sort order**
  - **Property 19: Query limit enforcement**
  - **Validates: Requirements 7.1, 7.2**

- [x] 3. Implement audio processing core logic
  - Create audio parsing module that converts raw bytes to Int16Array samples
  - Create feature extraction module that computes RMS and peak amplitude
  - Create classification module that categorizes events based on thresholds
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4_

- [x] 3.1 Implement parseAudioBytes function
  - Accept Buffer and return Int16Array
  - Interpret bytes as 16-bit PCM little-endian mono audio
  - Handle edge cases (empty buffer, odd length)
  - _Requirements: 2.1, 2.2_

- [x] 3.2 Write property test for audio parsing
  - **Property 4: Byte-to-sample conversion**
  - **Validates: Requirements 2.1, 2.2**

- [x] 3.3 Implement extractFeatures function
  - Accept Int16Array and return AudioFeatures object with rms, peak, and sampleCount
  - Normalize samples by dividing by 32768
  - Compute RMS as sqrt(mean(sample²))
  - Compute peak as max(abs(sample))
  - _Requirements: 2.3, 3.1, 3.2, 3.3, 3.4_

- [x] 3.4 Write property tests for feature extraction
  - **Property 5: Sample normalization bounds**
  - **Property 7: RMS computation correctness**
  - **Property 8: Peak computation correctness**
  - **Validates: Requirements 2.3, 3.1, 3.2, 3.3, 3.4**

- [x] 3.5 Implement classify function
  - Accept AudioFeatures and return Classification object with category and confidence
  - Classify as "impact" if peak > 0.9 (confidence 0.95)
  - Classify as "distress" if rms > 0.5 and peak ≤ 0.9 (confidence 0.8)
  - Classify as "normal" otherwise (confidence 0.7)
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 3.6 Write property tests for classification
  - **Property 9: Impact classification**
  - **Property 10: Distress classification**
  - **Property 11: Normal classification**
  - **Property 12: Classification output format**
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [x] 4. Implement Audio Server HTTP endpoint
  - Create Express server with POST /audio endpoint
  - Configure express.raw() middleware for application/octet-stream
  - Extract sample_rate and uid from query parameters
  - Integrate audio processing pipeline (parse → extract → classify)
  - Initialize Convex client and call addEvent mutation
  - Implement error handling with appropriate HTTP status codes
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.4, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4.1 Set up Express server with raw body parsing
  - Create server.ts with Express app
  - Configure express.raw() for application/octet-stream with 10mb limit
  - Add basic logging middleware
  - _Requirements: 1.1_

- [x] 4.2 Implement /audio POST endpoint handler
  - Extract sample_rate and uid from query string (with defaults)
  - Parse request body as audio bytes
  - Extract features and classify
  - Build note string with rms, peak, and sample rate
  - Call Convex addEvent mutation with all parameters
  - Return 200 on success, 500 on error
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.4, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4.3 Write property tests for HTTP endpoint
  - **Property 1: HTTP request acceptance**
  - **Property 2: Query parameter extraction**
  - **Property 3: Error handling**
  - **Property 6: Sample rate flexibility**
  - **Property 13: Event persistence**
  - **Property 14: Note content**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 2.4, 5.1, 5.2, 5.3, 5.4, 5.5**

- [x] 4.4 Add environment configuration and startup
  - Load PORT and CONVEX_URL from environment variables
  - Start server and log listening port
  - Add graceful shutdown handling
  - _Requirements: All_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement React dashboard
  - Create React app with Vite and TypeScript
  - Set up Convex client and provider
  - Create EventFeed component that subscribes to recentEvents
  - Create EventCard component with color coding based on category
  - Implement visual highlighting for distress and impact events
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [x] 6.1 Set up React app structure
  - Initialize Vite project with React and TypeScript
  - Install Convex client dependencies
  - Configure ConvexProvider in main.tsx
  - Create basic App component
  - _Requirements: 8.1_

- [x] 6.2 Implement EventCard component
  - Create component that displays event category, confidence, timestamp, and deviceId
  - Implement color coding: gray for normal, yellow/orange for distress, red for impact
  - Add highlighted prop for visual emphasis (bold border, larger size)
  - Format timestamp as human-readable date/time
  - _Requirements: 8.4, 8.5, 8.6_

- [x] 6.3 Implement EventFeed component
  - Use useQuery hook to subscribe to recentEvents with limit 50
  - Map events to EventCard components
  - Mark distress and impact events as highlighted
  - Handle loading and error states
  - _Requirements: 8.2, 8.3_

- [x] 6.4 Implement App component
  - Render EventFeed component
  - Add header with title "Omi Audio Monitor"
  - Add basic styling for layout
  - _Requirements: 8.1, 8.2_

- [x] 6.5 Write property tests for dashboard components
  - **Property 20: Event reactivity**
  - **Property 21: Event display completeness**
  - **Property 22: Visual differentiation**
  - **Validates: Requirements 8.3, 8.4, 8.5, 8.6**

- [x] 7. Add development tooling and documentation
  - Create README files for each project with setup instructions
  - Add npm scripts for development and testing
  - Document Omi app configuration steps
  - Create example .env files
  - _Requirements: All_

- [x] 7.1 Create audio-server README
  - Document installation steps
  - Document environment variables (PORT, CONVEX_URL)
  - Document how to run with ngrok
  - Include example curl commands for testing
  - _Requirements: All_

- [x] 7.2 Create web README
  - Document installation steps
  - Document environment variables (VITE_CONVEX_URL)
  - Document how to run development server
  - Include screenshots of dashboard
  - _Requirements: All_

- [x] 7.3 Create root README
  - Document overall system architecture
  - Document Omi DevKit 2 configuration steps
  - Include links to sub-project READMEs
  - Add troubleshooting section
  - _Requirements: All_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

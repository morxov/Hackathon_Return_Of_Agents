# Omi Audio Monitor

A personal safety system that provides real-time audio event monitoring and classification using the Omi DevKit 2 wearable device. The system detects distress situations such as shouting, screaming, or physical impacts and displays them in a live web dashboard.

## Overview

The Omi Audio Monitor is designed to protect college student women and women walking alone at night by detecting audio events that may indicate danger. The system uses the Omi DevKit 2 wearable necklace to continuously monitor ambient audio and classify events into three categories:

- **Normal**: Regular ambient sound and conversation
- **Distress**: Shouting, screaming, or raised voices (RMS > 0.5)
- **Impact**: Crashes, loud impacts, or sudden loud events (peak > 0.9)

## System Architecture

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

### Components

1. **Audio Server** ([README](./audio-server/README.md))
   - Node.js/Express server that receives raw audio from Omi Backend
   - Extracts acoustic features (RMS, peak amplitude)
   - Classifies events using threshold-based logic
   - Stores events in Convex

2. **Convex Backend**
   - Serverless database that stores audio events with timestamps
   - Provides real-time queries for the dashboard
   - Automatically syncs data to connected clients

3. **React Dashboard** ([README](./web/README.md))
   - Web interface that displays classified events in real-time
   - Color-coded event cards (gray, yellow/orange, red)
   - Visual highlighting for distress and impact events

## Project Structure

```
.
├── audio-server/          # Node.js/Express audio processing server
│   ├── src/
│   │   ├── server.ts      # HTTP endpoint and Express setup
│   │   ├── audio.ts       # Audio processing and classification
│   │   └── *.test.ts      # Unit and property-based tests
│   ├── .env.example       # Example environment variables
│   └── package.json       # Dependencies and scripts
│
├── convex/                # Convex serverless backend
│   ├── schema.ts          # Database schema definition
│   ├── events.ts          # Mutations and queries
│   ├── events.test.ts     # Backend tests
│   └── package.json       # Dependencies and scripts
│
└── web/                   # React dashboard
    ├── src/
    │   ├── components/    # EventCard and EventFeed components
    │   ├── App.tsx        # Main app component
    │   └── main.tsx       # Entry point with Convex provider
    ├── .env.example       # Example environment variables
    └── package.json       # Dependencies and scripts
```

## Quick Start

### Prerequisites

- **Node.js 18+** and npm
- **Convex account** (free): https://convex.dev
- **ngrok** (for local development): https://ngrok.com
- **Omi DevKit 2** and Omi mobile app

### Installation

1. **Clone the repository and install dependencies:**

```bash
# Install dependencies for all projects
cd audio-server && npm install && cd ..
cd convex && npm install && cd ..
cd web && npm install && cd ..
```

2. **Set up Convex:**

```bash
cd convex
npx convex dev
```

This will:
- Create a new Convex project (or link to existing)
- Deploy the schema and functions
- Start the development server
- Display your Convex URL (e.g., `https://happy-animal-123.convex.cloud`)

**Important**: Copy the Convex URL for the next steps.

3. **Configure environment variables:**

```bash
# Audio Server
cd audio-server
cp .env.example .env
# Edit .env and set CONVEX_URL to your Convex URL

# Web Dashboard
cd ../web
cp .env.example .env.local
# Edit .env.local and set VITE_CONVEX_URL to your Convex URL
```

4. **Start the development servers:**

Open 4 terminal windows:

```bash
# Terminal 1: Convex (already running from step 2)
cd convex
npx convex dev

# Terminal 2: Audio Server
cd audio-server
npm run dev
# Server starts on http://localhost:3000

# Terminal 3: Expose Audio Server with ngrok
ngrok http 3000
# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)

# Terminal 4: Web Dashboard
cd web
npm run dev
# Dashboard opens at http://localhost:5173
```

5. **Configure Omi DevKit 2:**

- Open the **Omi mobile app**
- Go to **Settings → Developer Mode**
- Enable **"Realtime audio bytes"**
- Set **Webhook URL** to your ngrok URL: `https://<your-ngrok-url>.ngrok.io/audio`
- Set **Frequency** to 5 seconds (for faster feedback) or 10 seconds

6. **Test the system:**

- Wear the Omi DevKit 2 necklace
- Open the dashboard at `http://localhost:5173`
- Generate test sounds:
  - **Normal speech** → Gray events appear
  - **Shout or yell** → Yellow/orange distress events appear
  - **Clap loudly** → Red impact events appear

## Development

### Running Tests

Each project has its own test suite with unit tests and property-based tests:

```bash
# Audio Server tests
cd audio-server
npm test

# Convex tests
cd convex
npm test

# Web Dashboard tests
cd web
npm test

# Run all tests
npm test --workspaces
```

### Project-Specific Documentation

For detailed setup, API documentation, and troubleshooting:

- **[Audio Server README](./audio-server/README.md)** - HTTP endpoint, audio processing, classification logic
- **[Web Dashboard README](./web/README.md)** - React components, styling, deployment

### Design Documentation

For detailed system design, correctness properties, and architecture decisions:

- **[Requirements Document](./.kiro/specs/omi-audio-monitor/requirements.md)** - User stories and acceptance criteria
- **[Design Document](./.kiro/specs/omi-audio-monitor/design.md)** - Architecture, data models, correctness properties
- **[Implementation Tasks](./.kiro/specs/omi-audio-monitor/tasks.md)** - Development task list

## Omi DevKit 2 Configuration

### Step-by-Step Setup

1. **Install the Omi mobile app** (iOS or Android)

2. **Pair your Omi DevKit 2:**
   - Turn on the DevKit 2 (press the button)
   - Open the Omi app
   - Follow the pairing instructions

3. **Enable Developer Mode:**
   - In the Omi app, go to **Settings**
   - Scroll down to **Developer Mode**
   - Toggle it **ON**

4. **Configure Realtime Audio:**
   - In Developer Mode settings, find **"Realtime audio bytes"**
   - Toggle it **ON**
   - Enter your **Webhook URL**: `https://<your-ngrok-url>.ngrok.io/audio`
   - Set **Frequency**: 5 seconds (recommended for testing) or 10 seconds

5. **Verify Configuration:**
   - Check the Audio Server logs for incoming requests
   - Check the dashboard for new events appearing
   - If no events appear, see Troubleshooting below

### Audio Format

The Omi DevKit 2 sends audio in the following format:
- **Codec**: 16-bit PCM, little-endian
- **Channels**: Mono
- **Sample Rate**: 16,000 Hz
- **Chunk Duration**: 5-10 seconds (configurable)

## Classification Logic

The system uses a simple threshold-based classifier:

| Category | Condition | Confidence | Use Case |
|----------|-----------|------------|----------|
| **Impact** | Peak > 0.9 | 95% | Crashes, loud impacts, sudden events |
| **Distress** | RMS > 0.5 and peak ≤ 0.9 | 80% | Shouting, screaming, raised voices |
| **Normal** | Otherwise | 70% | Regular conversation, ambient sound |

**Acoustic Features:**
- **RMS (Root Mean Square)**: Measures average loudness over time
- **Peak Amplitude**: Measures maximum loudness in the audio chunk

## Troubleshooting

### No events appearing in dashboard

1. **Check Convex connection:**
   - Verify `VITE_CONVEX_URL` in `web/.env.local` matches your Convex URL
   - Ensure Convex dev server is running: `cd convex && npx convex dev`
   - Check browser console for connection errors

2. **Check Audio Server:**
   - Verify `CONVEX_URL` in `audio-server/.env` matches your Convex URL
   - Ensure Audio Server is running: `cd audio-server && npm run dev`
   - Check server logs for incoming requests

3. **Check Omi configuration:**
   - Verify ngrok is running: `ngrok http 3000`
   - Ensure Omi app has the correct ngrok HTTPS URL
   - Check that "Realtime audio bytes" is enabled
   - Try toggling Developer Mode off and on

4. **Check ngrok:**
   - Verify ngrok is running and showing the HTTPS URL
   - Check ngrok web interface at `http://localhost:4040` for incoming requests
   - Ensure the ngrok URL uses HTTPS (required by Omi)

### Audio Server not receiving requests

1. **Verify ngrok URL:**
   - Copy the HTTPS URL from ngrok (not HTTP)
   - Paste it into Omi app settings exactly: `https://abc123.ngrok.io/audio`
   - Don't forget the `/audio` path

2. **Check Omi app:**
   - Ensure DevKit 2 is paired and connected
   - Check that audio is being recorded (LED indicator)
   - Try restarting the Omi app

3. **Check firewall:**
   - Ensure port 3000 is not blocked
   - Check that ngrok can connect to localhost:3000

### Events classified incorrectly

1. **Check acoustic features:**
   - Look at the "note" field in events (visible in Convex dashboard)
   - Note shows RMS and peak values for debugging
   - Compare values to thresholds (RMS > 0.5, peak > 0.9)

2. **Adjust thresholds:**
   - Edit `audio-server/src/audio.ts`
   - Modify the `classify()` function thresholds
   - Restart the Audio Server

3. **Test with known audio:**
   - Use curl to send test audio (see Audio Server README)
   - Generate audio with known characteristics
   - Verify classification matches expectations

### Dashboard not updating in real-time

1. **Check WebSocket connection:**
   - Open browser DevTools → Network tab
   - Look for WebSocket connections to Convex
   - Verify connection status is "open"

2. **Check Convex subscription:**
   - Look for errors in browser console
   - Verify `useQuery` hook is working
   - Try refreshing the page

3. **Check browser compatibility:**
   - Ensure browser supports WebSockets
   - Try a different browser (Chrome, Firefox, Safari)
   - Disable browser extensions that might block WebSockets

### Build or dependency errors

1. **Clear and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check Node.js version:**
   ```bash
   node --version  # Should be 18+
   ```

3. **Check TypeScript:**
   ```bash
   npm list typescript  # Should be 5.x
   ```

### ngrok session expired

Free ngrok URLs expire after 2 hours. When this happens:

1. Restart ngrok: `ngrok http 3000`
2. Copy the new HTTPS URL
3. Update the Omi app with the new URL
4. No need to restart Audio Server or other components

## Production Deployment

### Audio Server

Deploy to Railway, Render, or Fly.io:

```bash
cd audio-server
npm run build

# Deploy to your platform
# Set environment variables: PORT, CONVEX_URL
```

Update Omi app with your production URL (must be HTTPS).

### Convex

Deploy to Convex production:

```bash
cd convex
npx convex deploy
```

Copy the production URL and update Audio Server and Web Dashboard environment variables.

### Web Dashboard

Deploy to Vercel, Netlify, or Cloudflare Pages:

```bash
cd web
npm run build

# Deploy dist/ directory to your platform
# Set environment variable: VITE_CONVEX_URL
```

## Future Enhancements

- **Frequency analysis** (FFT) to distinguish voice from other sounds
- **Machine learning classifier** trained on labeled distress audio
- **Alert system** with SMS/email notifications to trusted contacts
- **Location tracking** with GPS coordinates
- **Mobile dashboard** with push notifications
- **Historical analysis** with charts and trends

## License

MIT

## Support

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review project-specific READMEs
- Check Convex documentation: https://docs.convex.dev
- Check Omi documentation: https://docs.omi.me

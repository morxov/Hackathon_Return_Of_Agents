# Omi Audio Server

Node.js/Express server that receives raw audio streams from the Omi Backend, extracts acoustic features, classifies audio events, and persists them to Convex.

## Features

- Accepts raw audio bytes via HTTP POST endpoint
- Parses 16-bit PCM audio into samples
- Extracts acoustic features (RMS, peak amplitude)
- Classifies events as normal, distress, or impact
- Stores classified events in Convex with timestamps

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file in the `audio-server/` directory:

```bash
PORT=3000
CONVEX_URL=https://your-deployment.convex.cloud
```

- **PORT**: Server port (default: 3000)
- **CONVEX_URL**: Your Convex deployment URL (get this from `npx convex dev` or Convex dashboard)

## Development

Start the development server with hot reload:

```bash
npm run dev
```

The server will start on `http://localhost:3000`.

### Exposing with ngrok

To receive audio from the Omi Backend, you need to expose your local server to the internet:

```bash
# Install ngrok if you haven't already
brew install ngrok  # macOS
# or download from https://ngrok.com

# Expose your local server
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`) and use it in the Omi app configuration.

## Production

Build and run the production server:

```bash
npm run build
npm start
```

## API Endpoint

### POST /audio

Receives raw audio bytes from the Omi Backend.

**Query Parameters:**
- `sample_rate` (optional): Audio sample rate in Hz (default: 16000)
- `uid` (optional): Device/user identifier (default: "unknown")

**Request:**
```
POST /audio?sample_rate=16000&uid=user_abc123
Content-Type: application/octet-stream
Body: <raw audio bytes>
```

**Response:**
- `200 OK`: Audio processed successfully
- `500 Internal Server Error`: Processing failed

**Example with curl:**

```bash
# Test with a small audio file
curl -X POST \
  "http://localhost:3000/audio?sample_rate=16000&uid=test_device" \
  -H "Content-Type: application/octet-stream" \
  --data-binary "@test_audio.raw"

# Test with random bytes (simulated audio)
dd if=/dev/urandom bs=1024 count=32 | curl -X POST \
  "http://localhost:3000/audio?sample_rate=16000&uid=test_device" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @-
```

## Testing

Run all tests:

```bash
npm test
```

The test suite includes:
- Unit tests for audio parsing and feature extraction
- Property-based tests for classification logic
- Integration tests for the HTTP endpoint

## Classification Logic

The server uses a simple threshold-based classifier:

- **Impact**: Peak amplitude > 0.9 (confidence: 0.95)
  - Detects sudden loud events like crashes or impacts
  
- **Distress**: RMS > 0.5 and peak ≤ 0.9 (confidence: 0.8)
  - Detects sustained loud events like shouting or screaming
  
- **Normal**: Otherwise (confidence: 0.7)
  - Regular ambient sound and conversation

## Audio Format

The server expects audio in the following format:
- **Codec**: 16-bit PCM, little-endian
- **Channels**: Mono
- **Sample Rate**: 16,000 Hz (configurable)
- **Chunk Duration**: 5-10 seconds (configured in Omi app)

## Troubleshooting

### Server won't start

- Check that PORT is not already in use: `lsof -i :3000`
- Verify CONVEX_URL is set correctly in `.env`

### Convex connection errors

- Ensure Convex is running: `cd ../convex && npx convex dev`
- Verify CONVEX_URL matches the URL shown by `npx convex dev`
- Check network connectivity

### Audio not being received

- Verify ngrok is running and HTTPS URL is correct
- Check Omi app configuration (Settings → Developer Mode)
- Ensure "Realtime audio bytes" is enabled in Omi app
- Check server logs for incoming requests

### Classification seems wrong

- Check the note field in Convex events for RMS and peak values
- Adjust thresholds in `src/audio.ts` if needed
- Test with known audio samples using curl commands above

## Project Structure

```
audio-server/
├── src/
│   ├── server.ts       # Express server and HTTP endpoint
│   ├── server.test.ts  # Server integration tests
│   ├── audio.ts        # Audio processing and classification
│   └── audio.test.ts   # Audio processing tests
├── .env.example        # Example environment variables
├── package.json        # Dependencies and scripts
└── tsconfig.json       # TypeScript configuration
```

## License

MIT

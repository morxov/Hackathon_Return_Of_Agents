# Transcript Integration Setup

This guide explains how to set up transcript analysis alongside audio analysis for enhanced threat detection.

## Overview

The system now supports **two types of data** from Omi:

1. **Raw Audio Bytes** (existing) - Detects loud sounds, impacts, distress based on volume
2. **Transcripts** (new) - Detects threat keywords in speech

## Combined Threat Detection

The system combines both signals for more accurate threat detection:

- **Audio distress + threat keywords** = High confidence threat
- **Threat keywords alone** = Medium confidence threat  
- **Audio distress alone** = Distress event
- **Normal audio + normal speech** = Normal event

## Threat Keyword Categories

### Critical (Immediate Alert)
`gun, weapon, knife, shoot, shooting, bomb, explosive, kill, murder, attack, assault`

### High (Immediate Alert)
`threat, threaten, violence, violent, fight, hurt, harm, danger, dangerous`

### Medium (Alert if multiple keywords)
`help, emergency, scared, afraid, unsafe, uncomfortable, suspicious`

## Setup Instructions

### 1. Configure Omi App for Transcripts

You need to create an **Omi App** (different from Developer Mode):

1. Open the Omi mobile app
2. Go to **Settings → Apps**
3. Tap **"Create New App"** or **"Add App"**
4. Fill in the app details:
   - **Name**: "Safety Monitor" (or your choice)
   - **Description**: "Real-time safety threat detection"
   - **Webhook URL**: `https://your-ngrok-url.ngrok-free.app/transcript`
   - **Setup Completed URL**: `https://your-ngrok-url.ngrok-free.app/setup-completed`
5. Save the app

### 2. Enable the App

1. In the Omi app, go to **Settings → Apps**
2. Find your "Safety Monitor" app
3. Toggle it **ON**

### 3. How It Works

Once enabled, Omi will:
- Transcribe conversations in real-time
- Send transcript segments to your `/transcript` endpoint
- Include session IDs to group related conversations

Your server will:
- Analyze transcripts for threat keywords
- Classify threats as critical/high/medium
- Store events in Convex with transcript data
- Display in dashboard with keywords highlighted

## Testing

### Test with Audio Only (Current Setup)
```bash
# Make loud sounds near DevKit 2
# Should see "distress" or "impact" events
```

### Test with Transcripts
```bash
# Say threat keywords near DevKit 2:
"Help! Someone has a gun!"
# Should see "threat" event with keywords highlighted

# Say medium keywords:
"I feel unsafe and scared"
# Should see "monitor" event

# Normal conversation:
"How are you today?"
# Should see "normal" event
```

### Test Combined Detection
```bash
# Shout threat keywords (loud + keywords):
# Should see "threat" event with HIGH confidence

# Whisper threat keywords (quiet + keywords):
# Should see "monitor" or "threat" with MEDIUM confidence
```

## Dashboard Display

Events now show:

- **Category**: normal, monitor, distress, impact, threat
- **Threat Level**: critical, high, medium (if transcript detected threats)
- **Keywords**: Matched threat keywords (highlighted in red)
- **Transcript**: First 150 characters of what was said
- **Confidence**: Combined confidence score

### Color Coding

- 🔴 **Red** (threat, impact, critical) - Immediate attention required
- 🟠 **Orange** (distress, high) - Elevated concern
- 🟡 **Yellow** (monitor, medium) - Watch closely
- ⚪ **Gray** (normal) - All clear

## API Endpoints

### POST /audio
Receives raw audio bytes from Omi "Realtime audio bytes" feature.

**Query params**: `sample_rate`, `uid`  
**Body**: Binary audio data (application/octet-stream)

### POST /transcript
Receives transcripts from Omi App webhook.

**Query params**: `uid`  
**Body**: JSON
```json
{
  "session_id": "abc123",
  "segments": [
    {
      "id": "seg1",
      "text": "Help me please",
      "speaker": "SPEAKER_0",
      "speaker_id": 0,
      "is_user": false,
      "start": 0.0,
      "end": 2.5
    }
  ]
}
```

### GET /setup-completed
Required by Omi App integration. Returns `{ "is_setup_completed": true }`.

## Troubleshooting

### No transcript events appearing?

1. Check that the Omi App is enabled in Settings → Apps
2. Verify the webhook URL is correct (use your current ngrok URL)
3. Check audio-server logs for incoming POST /transcript requests
4. Make sure you're speaking clearly near the DevKit 2

### Only seeing audio events, no transcripts?

- You need BOTH configurations:
  - **Developer Mode → Realtime audio bytes** for audio analysis
  - **Settings → Apps → Your App** for transcript analysis

### Keywords not being detected?

- Check the logs - they show matched keywords
- Speak clearly and use exact keywords from the threat list
- Try saying multiple keywords for medium-level threats

## Security Considerations

⚠️ **Important**: This is a hackathon MVP. For production:

1. Add authentication to webhook endpoints
2. Encrypt sensitive transcript data
3. Implement rate limiting
4. Add user consent and privacy controls
5. Comply with recording laws in your jurisdiction
6. Add emergency contact notifications
7. Integrate with campus security systems

## Next Steps

- Add SMS/email alerts for critical threats
- Integrate with emergency services
- Add user location tracking
- Implement false positive feedback loop
- Train ML model on labeled threat data
- Add multi-language support

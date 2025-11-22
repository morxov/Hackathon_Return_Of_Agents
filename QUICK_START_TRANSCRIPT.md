# Quick Start: Transcript Integration

## 🚀 Start the System

```bash
# Terminal 1 - Convex
cd convex && npx convex dev

# Terminal 2 - Audio Server  
cd audio-server && npm run dev

# Terminal 3 - ngrok
/tmp/ngrok http 3000

# Terminal 4 - Dashboard
cd web && npm run dev
```

## 📱 Configure Omi App

### Step 1: Create an App in Omi

1. Open Omi app → **Settings → Apps**
2. Tap **"+"** or **"Create New App"**
3. Fill in:
   - **Name**: Safety Monitor
   - **Webhook URL**: `https://YOUR-NGROK-URL.ngrok-free.app/transcript`
   - **Setup URL**: `https://YOUR-NGROK-URL.ngrok-free.app/setup-completed`
4. **Save** and **Enable** the app

### Step 2: Keep Audio Bytes Enabled

Make sure you still have:
- **Settings → Developer Mode → Realtime audio bytes**
- URL: `https://YOUR-NGROK-URL.ngrok-free.app/audio`

## 🧪 Test It

### Option 1: Test with Real Speech

Speak near your DevKit 2:
- "Help! Someone has a gun!" → Should create **THREAT** event
- "I feel scared and unsafe" → Should create **MONITOR** event  
- "How are you today?" → Should create **NORMAL** event

### Option 2: Test with Script

```bash
./test-transcript.sh
```

Then check the dashboard at http://localhost:5173/

## 📊 What You'll See

Events now show:
- **🔴 THREAT** - Critical/high keywords detected
- **🟡 MONITOR** - Medium keywords detected
- **🟠 DISTRESS** - Loud audio detected
- **⚪ NORMAL** - All clear

Plus:
- Matched keywords (in red)
- Transcript text
- Threat level
- Higher confidence when audio + transcript both indicate threat

## 🎯 Threat Keywords

### Critical (Red Alert)
gun, weapon, knife, shoot, bomb, kill, murder, attack, assault

### High (Red Alert)
threat, violence, fight, hurt, harm, danger

### Medium (Yellow Alert if 2+)
help, emergency, scared, afraid, unsafe, suspicious

## 📝 Check Logs

Audio server will show:
```
[timestamp] POST /transcript
  📝 Transcript Analysis:
     Transcript: "Help! Someone has a gun!"
     Threat Level: CRITICAL
     Keywords: gun, help
     Classification: THREAT (confidence: 0.95)
```

## ❓ Troubleshooting

**No transcript events?**
- Check Omi app has your app enabled
- Verify ngrok URL is correct
- Look for POST /transcript in audio-server logs

**Keywords not detected?**
- Check logs to see what transcript was received
- Use exact keywords from the lists above
- Speak clearly near DevKit 2

**TypeScript errors in web?**
- Run `npx convex dev` to regenerate types
- Errors will disappear once Convex updates

## 📚 More Info

- Full setup guide: `TRANSCRIPT_SETUP.md`
- Implementation details: `IMPLEMENTATION_SUMMARY.md`

That's it! You now have dual-mode threat detection combining audio analysis and transcript analysis. 🎉

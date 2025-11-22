# Omi Audio Monitor Dashboard

Real-time web dashboard for monitoring audio events from the Omi DevKit 2. Displays classified events with visual emphasis on distress and impact events.

## Features

- Real-time event feed with live updates via Convex subscriptions
- Color-coded event cards based on category:
  - **Gray**: Normal ambient sound
  - **Yellow/Orange**: Distress (shouting, screaming)
  - **Red**: Impact (crashes, loud impacts)
- Visual highlighting for distress and impact events
- Displays event details: category, confidence, timestamp, device ID

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env.local` file in the `web/` directory:

```bash
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

- **VITE_CONVEX_URL**: Your Convex deployment URL (get this from `npx convex dev` or Convex dashboard)

**Note**: Vite requires environment variables to be prefixed with `VITE_` to be exposed to the client.

## Development

Start the development server:

```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173` (or another port if 5173 is in use).

The development server includes:
- Hot module replacement (HMR) for instant updates
- Fast refresh for React components
- TypeScript type checking

## Production

Build the production bundle:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Deploy the `dist/` directory to your hosting provider (Vercel, Netlify, Cloudflare Pages, etc.).

## Testing

Run all tests:

```bash
npm test
```

The test suite includes:
- Component tests for EventCard and EventFeed
- Property-based tests for event rendering and visual differentiation

## Dashboard Components

### EventFeed

The main component that subscribes to the Convex `recentEvents` query and displays a live feed of audio events.

- Automatically updates when new events are added
- Shows the 50 most recent events
- Highlights distress and impact events

### EventCard

Individual event display component with color coding and highlighting.

**Color Coding:**
- Normal events: Gray background
- Distress events: Yellow/orange background with bold border
- Impact events: Red background with bold border

**Displayed Information:**
- Event category (NORMAL, DISTRESS, IMPACT)
- Confidence score (0-100%)
- Timestamp (formatted as readable date/time)
- Device ID
- Optional note with acoustic features (RMS, peak, sample rate)

## Usage

1. Ensure the Convex backend is running:
   ```bash
   cd ../convex
   npx convex dev
   ```

2. Ensure the Audio Server is running and receiving data from Omi:
   ```bash
   cd ../audio-server
   npm run dev
   ```

3. Start the dashboard:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173` in your browser

5. Wear the Omi DevKit 2 and generate test sounds:
   - Normal speech → Gray events
   - Shouting or loud talking → Yellow/orange distress events
   - Clapping or impacts → Red impact events

## Dashboard Preview

The dashboard displays events in a vertical feed with the most recent at the top:

```
┌─────────────────────────────────────────┐
│     Omi Audio Monitor Dashboard         │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ 🔴 IMPACT                           │ │ ← Red, highlighted
│ │ Confidence: 95%                     │ │
│ │ 2024-01-15 14:32:15                 │ │
│ │ Device: user_abc123                 │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🟡 DISTRESS                         │ │ ← Yellow, highlighted
│ │ Confidence: 80%                     │ │
│ │ 2024-01-15 14:32:05                 │ │
│ │ Device: user_abc123                 │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ⚪ NORMAL                           │ │ ← Gray, normal
│ │ Confidence: 70%                     │ │
│ │ 2024-01-15 14:31:55                 │ │
│ │ Device: user_abc123                 │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Troubleshooting

### Dashboard shows "Connecting..." or "Loading..."

- Verify VITE_CONVEX_URL is set correctly in `.env.local`
- Ensure Convex is running: `cd ../convex && npx convex dev`
- Check browser console for connection errors
- Verify the Convex URL matches the one shown by `npx convex dev`

### No events appearing

- Ensure the Audio Server is running and receiving data
- Check that Omi app is configured correctly (Settings → Developer Mode)
- Verify events are being stored in Convex (check Convex dashboard)
- Check browser console for errors

### Events not updating in real-time

- Convex subscriptions use WebSockets - check that WebSocket connections are allowed
- Check browser console for subscription errors
- Try refreshing the page to re-establish the connection

### Build errors

- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Ensure TypeScript version matches: `npm list typescript`
- Check for type errors: `npm run build`

## Project Structure

```
web/
├── src/
│   ├── components/
│   │   ├── EventCard.tsx       # Individual event display
│   │   ├── EventCard.test.tsx  # EventCard tests
│   │   ├── EventCard.css       # EventCard styles
│   │   ├── EventFeed.tsx       # Event feed container
│   │   ├── EventFeed.test.tsx  # EventFeed tests
│   │   └── EventFeed.css       # EventFeed styles
│   ├── App.tsx                 # Main app component
│   ├── App.css                 # App styles
│   └── main.tsx                # Entry point with Convex provider
├── convex/                     # Generated Convex client
├── .env.local                  # Environment variables (not in git)
├── .env.example                # Example environment variables
├── index.html                  # HTML template
├── package.json                # Dependencies and scripts
├── vite.config.ts              # Vite configuration
└── tsconfig.json               # TypeScript configuration
```

## Deployment

### Vercel

```bash
npm run build
vercel --prod
```

Set environment variable in Vercel dashboard:
- `VITE_CONVEX_URL`: Your production Convex URL

### Netlify

```bash
npm run build
netlify deploy --prod --dir=dist
```

Set environment variable in Netlify dashboard:
- `VITE_CONVEX_URL`: Your production Convex URL

### Cloudflare Pages

```bash
npm run build
wrangler pages publish dist
```

Set environment variable in Cloudflare dashboard:
- `VITE_CONVEX_URL`: Your production Convex URL

## License

MIT

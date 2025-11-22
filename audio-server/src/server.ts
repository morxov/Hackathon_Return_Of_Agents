/**
 * Audio Server for Omi Audio Monitor
 * Receives raw audio streams from Omi Backend, processes and classifies events
 */

import express, { Request, Response } from 'express';
import { ConvexHttpClient } from 'convex/browser';
import dotenv from 'dotenv';
import { parseAudioBytes, extractFeatures, classify } from './audio';
import { ThreatAnalyzer, TranscriptSegment, combineThreatAnalysis } from './threat-analysis';

// Load environment variables
dotenv.config();

const app = express();

// Configure middleware
// JSON parser for transcript endpoint
app.use(express.json({ limit: '10mb' }));
// Raw parser for audio endpoint
app.use(express.raw({ 
  type: 'application/octet-stream', 
  limit: '10mb' 
}));

// Basic logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Lazy initialize Convex client
let convex: ConvexHttpClient | null = null;

function getConvexClient(): ConvexHttpClient {
  if (!convex) {
    const convexUrl = process.env.CONVEX_URL;
    if (!convexUrl) {
      throw new Error('CONVEX_URL environment variable is not set');
    }
    convex = new ConvexHttpClient(convexUrl);
  }
  return convex;
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// POST /audio endpoint - receives raw audio from Omi Backend
app.post('/audio', async (req: Request, res: Response) => {
  try {
    // Extract query parameters with defaults
    const sampleRate = parseInt(req.query.sample_rate as string) || 16000;
    const uid = (req.query.uid as string) || 'unknown';

    // Validate request body
    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const audioBuffer = req.body as Buffer;

    // Parse audio bytes
    const samples = parseAudioBytes(audioBuffer);

    // Extract features
    const features = extractFeatures(samples);

    // Classify event
    const classification = classify(features);

    // Build note string with rms, peak, and sample rate
    const note = `rms=${features.rms.toFixed(3)}, peak=${features.peak.toFixed(3)}, sr=${sampleRate}`;

    // Log detailed audio analysis
    console.log(`  📊 Audio Analysis:`);
    console.log(`     Buffer size: ${audioBuffer.length} bytes (${samples.length} samples)`);
    console.log(`     RMS: ${features.rms.toFixed(4)} | Peak: ${features.peak.toFixed(4)}`);
    console.log(`     Classification: ${classification.category.toUpperCase()} (confidence: ${classification.confidence})`);

    // Call Convex addEvent mutation
    // Using string path since _generated/api may not exist yet
    const client = getConvexClient();
    await client.mutation('events:addEvent' as any, {
      deviceId: uid,
      category: classification.category,
      confidence: classification.confidence,
      note: note,
    });

    // Return 200 on success
    res.status(200).json({ 
      success: true,
      category: classification.category,
      confidence: classification.confidence
    });

  } catch (error) {
    // Return 500 on error
    console.error('Error processing audio:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /transcript endpoint - receives transcripts from Omi App webhook
app.post('/transcript', async (req: Request, res: Response) => {
  try {
    // Extract uid from query parameters
    const uid = (req.query.uid as string) || 'unknown';

    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const { session_id, segments } = req.body;

    if (!session_id || !Array.isArray(segments)) {
      return res.status(400).json({ 
        error: 'Missing required fields: session_id and segments' 
      });
    }

    // Log transcript receipt
    console.log(`  📝 Transcript Analysis:`);
    console.log(`     Session: ${session_id}`);
    console.log(`     Segments: ${segments.length}`);

    // Analyze transcript for threats
    const analyzer = new ThreatAnalyzer(segments as TranscriptSegment[]);
    const analysis = analyzer.analyze();

    // Determine category based on threat analysis
    let category = 'normal';
    let confidence = 0.7;

    if (analysis.threatLevel === 'critical' || analysis.threatLevel === 'high') {
      category = 'threat';
      confidence = analysis.confidence;
    } else if (analysis.threatLevel === 'medium') {
      category = 'monitor';
      confidence = analysis.confidence;
    }

    // Get transcript text
    const transcriptText = segments.map((s: any) => s.text).join(' ');
    const context = analyzer.getContext(200);

    console.log(`     Transcript: "${context}"`);
    console.log(`     Threat Level: ${analysis.threatLevel || 'NONE'}`);
    if (analysis.matchedKeywords.length > 0) {
      console.log(`     Keywords: ${analysis.matchedKeywords.join(', ')}`);
    }
    console.log(`     Classification: ${category.toUpperCase()} (confidence: ${confidence})`);

    // Build note with threat info
    const note = analysis.matchedKeywords.length > 0
      ? `keywords=[${analysis.matchedKeywords.join(', ')}], context="${context}"`
      : `transcript="${context}"`;

    // Store in Convex
    const client = getConvexClient();
    await client.mutation('events:addEvent' as any, {
      deviceId: uid,
      category,
      confidence,
      note,
      transcript: transcriptText,
      threatKeywords: analysis.matchedKeywords.length > 0 ? analysis.matchedKeywords : undefined,
      threatLevel: analysis.threatLevel || undefined,
      sessionId: session_id,
    });

    // Return response
    res.status(200).json({
      success: true,
      session_id,
      segments_received: segments.length,
      threat_detected: analysis.matchedKeywords.length > 0,
      threat_level: analysis.threatLevel,
      keywords_found: analysis.matchedKeywords,
      category,
      confidence,
      should_alert: analysis.shouldAlert,
    });

  } catch (error) {
    console.error('Error processing transcript:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /setup-completed - Required by Omi App integration
app.get('/setup-completed', (req: Request, res: Response) => {
  res.status(200).json({ is_setup_completed: true });
});

export default app;

// Server startup and configuration
const PORT = parseInt(process.env.PORT || '3000', 10);

// Only start server if this file is run directly (not imported for testing)
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Audio Server listening on port ${PORT}`);
    console.log(`CONVEX_URL: ${process.env.CONVEX_URL ? 'configured' : 'NOT SET'}`);
  });

  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

/**
 * Audio processing module for Omi Audio Monitor
 * Handles parsing, feature extraction, and classification of audio data
 */

export interface AudioFeatures {
  rms: number;        // Root mean square amplitude [0, 1]
  peak: number;       // Peak amplitude [0, 1]
  sampleCount: number;
}

export interface Classification {
  category: 'normal' | 'distress' | 'impact';
  confidence: number; // [0, 1]
}

/**
 * Parse raw audio bytes into Int16Array samples
 * Interprets bytes as 16-bit PCM little-endian mono audio
 * 
 * @param buffer - Raw audio bytes
 * @returns Int16Array of audio samples
 * @throws Error if buffer has odd length
 */
export function parseAudioBytes(buffer: Buffer): Int16Array {
  // Handle empty buffer edge case
  if (buffer.length === 0) {
    return new Int16Array(0);
  }

  // Handle odd length edge case
  if (buffer.length % 2 !== 0) {
    throw new Error('Buffer length must be even for 16-bit audio');
  }

  // Convert buffer to Int16Array (16-bit PCM little-endian)
  const samples = new Int16Array(buffer.length / 2);
  
  for (let i = 0; i < samples.length; i++) {
    // Read 16-bit little-endian signed integer
    samples[i] = buffer.readInt16LE(i * 2);
  }

  return samples;
}

/**
 * Extract acoustic features from audio samples
 * 
 * @param samples - Int16Array of audio samples
 * @returns AudioFeatures object with rms, peak, and sampleCount
 */
export function extractFeatures(samples: Int16Array): AudioFeatures {
  const sampleCount = samples.length;

  // Handle empty samples
  if (sampleCount === 0) {
    return { rms: 0, peak: 0, sampleCount: 0 };
  }

  let sumSquares = 0;
  let maxAbs = 0;

  // Process all samples
  for (let i = 0; i < sampleCount; i++) {
    // Normalize sample by dividing by 32768
    const normalized = samples[i] / 32768.0;
    
    // Accumulate for RMS
    sumSquares += normalized * normalized;
    
    // Track peak
    const abs = Math.abs(normalized);
    if (abs > maxAbs) {
      maxAbs = abs;
    }
  }

  // Compute RMS: sqrt(mean(sample²))
  const rms = Math.sqrt(sumSquares / sampleCount);
  
  // Peak is the maximum absolute value
  const peak = maxAbs;

  return { rms, peak, sampleCount };
}

/**
 * Classify audio event based on acoustic features
 * 
 * @param features - AudioFeatures object
 * @returns Classification with category and confidence
 */
export function classify(features: AudioFeatures): Classification {
  // Impact: high peak amplitude (sudden loud event)
  if (features.peak > 0.9) {
    return { category: 'impact', confidence: 0.95 };
  }

  // Distress: high RMS (sustained loud event like shouting)
  if (features.rms > 0.5) {
    return { category: 'distress', confidence: 0.8 };
  }

  // Normal: everything else
  return { category: 'normal', confidence: 0.7 };
}

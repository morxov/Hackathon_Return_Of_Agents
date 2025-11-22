/**
 * Property-based tests for audio processing module
 */

import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseAudioBytes, extractFeatures, classify } from './audio';

describe('Audio Processing - Property Tests', () => {
  // Feature: omi-audio-monitor, Property 4: Byte-to-sample conversion
  // Validates: Requirements 2.1, 2.2
  test('Property 4: Byte-to-sample conversion - parsing produces correct sample count', () => {
    fc.assert(
      fc.property(
        // Generate buffers with even length (valid for 16-bit audio)
        fc.uint8Array({ minLength: 0, maxLength: 10000 }).filter(arr => arr.length % 2 === 0),
        (bytes) => {
          const buffer = Buffer.from(bytes);
          const samples = parseAudioBytes(buffer);
          
          // The number of samples should be exactly half the buffer length
          return samples.length === buffer.length / 2;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 4 (edge case): Empty buffer produces empty sample array', () => {
    const buffer = Buffer.from([]);
    const samples = parseAudioBytes(buffer);
    expect(samples.length).toBe(0);
  });

  test('Property 4 (edge case): Odd length buffer throws error', () => {
    const buffer = Buffer.from([0x00, 0x01, 0x02]); // 3 bytes (odd)
    expect(() => parseAudioBytes(buffer)).toThrow('Buffer length must be even');
  });

  // Feature: omi-audio-monitor, Property 5: Sample normalization bounds
  // Validates: Requirements 2.3
  test('Property 5: Sample normalization bounds - normalized samples are in [-1, 1]', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -32768, max: 32767 }), { minLength: 1, maxLength: 1000 }),
        (int16Values) => {
          const samples = new Int16Array(int16Values);
          const features = extractFeatures(samples);
          
          // RMS and peak should both be in [0, 1] range
          // (they're absolute values, so non-negative)
          return features.rms >= 0 && features.rms <= 1 &&
                 features.peak >= 0 && features.peak <= 1;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: omi-audio-monitor, Property 7: RMS computation correctness
  // Validates: Requirements 3.1, 3.3
  test('Property 7: RMS computation correctness - RMS equals sqrt(mean(sample²))', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -32768, max: 32767 }), { minLength: 1, maxLength: 1000 }),
        (int16Values) => {
          const samples = new Int16Array(int16Values);
          const features = extractFeatures(samples);
          
          // Manually compute expected RMS
          let sumSquares = 0;
          for (let i = 0; i < samples.length; i++) {
            const normalized = samples[i] / 32768.0;
            sumSquares += normalized * normalized;
          }
          const expectedRms = Math.sqrt(sumSquares / samples.length);
          
          // Allow small floating point error
          const epsilon = 1e-10;
          return Math.abs(features.rms - expectedRms) < epsilon;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: omi-audio-monitor, Property 8: Peak computation correctness
  // Validates: Requirements 3.2, 3.4
  test('Property 8: Peak computation correctness - peak equals max(abs(sample))', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -32768, max: 32767 }), { minLength: 1, maxLength: 1000 }),
        (int16Values) => {
          const samples = new Int16Array(int16Values);
          const features = extractFeatures(samples);
          
          // Manually compute expected peak
          let maxAbs = 0;
          for (let i = 0; i < samples.length; i++) {
            const normalized = samples[i] / 32768.0;
            const abs = Math.abs(normalized);
            if (abs > maxAbs) {
              maxAbs = abs;
            }
          }
          
          // Allow small floating point error
          const epsilon = 1e-10;
          return Math.abs(features.peak - maxAbs) < epsilon;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 5-8 (edge case): Empty samples return zero features', () => {
    const samples = new Int16Array(0);
    const features = extractFeatures(samples);
    expect(features.rms).toBe(0);
    expect(features.peak).toBe(0);
    expect(features.sampleCount).toBe(0);
  });

  test('Property 5-8 (edge case): Silent audio (all zeros) has zero RMS and peak', () => {
    const samples = new Int16Array(100).fill(0);
    const features = extractFeatures(samples);
    expect(features.rms).toBe(0);
    expect(features.peak).toBe(0);
  });

  test('Property 5-8 (edge case): Maximum amplitude samples', () => {
    const samples = new Int16Array([32767, -32768]);
    const features = extractFeatures(samples);
    // Peak should be very close to 1.0
    expect(features.peak).toBeGreaterThan(0.99);
    expect(features.peak).toBeLessThanOrEqual(1.0);
  });

  // Feature: omi-audio-monitor, Property 9: Impact classification
  // Validates: Requirements 4.1
  test('Property 9: Impact classification - peak > 0.9 results in impact category', () => {
    fc.assert(
      fc.property(
        fc.record({
          rms: fc.double({ min: 0, max: 1, noNaN: true }),
          peak: fc.double({ min: 0.900001, max: 1, noNaN: true }), // peak > 0.9
          sampleCount: fc.integer({ min: 1, max: 160000 })
        }),
        (features) => {
          const classification = classify(features);
          return classification.category === 'impact' && 
                 classification.confidence === 0.95;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: omi-audio-monitor, Property 10: Distress classification
  // Validates: Requirements 4.2
  test('Property 10: Distress classification - rms > 0.5 and peak ≤ 0.9 results in distress', () => {
    fc.assert(
      fc.property(
        fc.record({
          rms: fc.double({ min: 0.500001, max: 1, noNaN: true }), // rms > 0.5
          peak: fc.double({ min: 0, max: 0.9, noNaN: true }), // peak ≤ 0.9
          sampleCount: fc.integer({ min: 1, max: 160000 })
        }),
        (features) => {
          const classification = classify(features);
          return classification.category === 'distress' && 
                 classification.confidence === 0.8;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: omi-audio-monitor, Property 11: Normal classification
  // Validates: Requirements 4.3
  test('Property 11: Normal classification - low rms and peak results in normal', () => {
    fc.assert(
      fc.property(
        fc.record({
          rms: fc.double({ min: 0, max: 0.5, noNaN: true }), // rms ≤ 0.5
          peak: fc.double({ min: 0, max: 0.9, noNaN: true }), // peak ≤ 0.9
          sampleCount: fc.integer({ min: 1, max: 160000 })
        }),
        (features) => {
          const classification = classify(features);
          return classification.category === 'normal' && 
                 classification.confidence === 0.7;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: omi-audio-monitor, Property 12: Classification output format
  // Validates: Requirements 4.4
  test('Property 12: Classification output format - always returns valid category and confidence', () => {
    fc.assert(
      fc.property(
        fc.record({
          rms: fc.double({ min: 0, max: 1, noNaN: true }),
          peak: fc.double({ min: 0, max: 1, noNaN: true }),
          sampleCount: fc.integer({ min: 0, max: 160000 })
        }),
        (features) => {
          const classification = classify(features);
          
          // Check category is one of the valid values
          const validCategories = ['normal', 'distress', 'impact'];
          const hasValidCategory = validCategories.includes(classification.category);
          
          // Check confidence is in [0, 1]
          const hasValidConfidence = classification.confidence >= 0 && 
                                     classification.confidence <= 1;
          
          return hasValidCategory && hasValidConfidence;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 9-12 (edge case): Boundary at peak = 0.9', () => {
    const features = { rms: 0.3, peak: 0.9, sampleCount: 100 };
    const classification = classify(features);
    // At exactly 0.9, should be normal (not impact)
    expect(classification.category).toBe('normal');
  });

  test('Property 9-12 (edge case): Boundary at rms = 0.5', () => {
    const features = { rms: 0.5, peak: 0.7, sampleCount: 100 };
    const classification = classify(features);
    // At exactly 0.5, should be normal (not distress)
    expect(classification.category).toBe('normal');
  });

  test('Property 9-12 (edge case): Impact takes precedence over distress', () => {
    const features = { rms: 0.8, peak: 0.95, sampleCount: 100 };
    const classification = classify(features);
    // High RMS and high peak should classify as impact
    expect(classification.category).toBe('impact');
  });
});

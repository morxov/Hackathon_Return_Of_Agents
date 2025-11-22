/**
 * Threat Analysis Module
 * Analyzes transcripts for threat keywords and combines with audio analysis
 */

export interface ThreatKeywordConfig {
  keywords: string[];
  alert_immediately: boolean;
}

export const THREAT_KEYWORDS: Record<string, ThreatKeywordConfig> = {
  critical: {
    keywords: ['gun', 'weapon', 'knife', 'shoot', 'shooting', 'bomb', 'explosive', 'kill', 'murder', 'attack', 'assault'],
    alert_immediately: true,
  },
  high: {
    keywords: ['threat', 'threaten', 'violence', 'violent', 'fight', 'hurt', 'harm', 'danger', 'dangerous'],
    alert_immediately: true,
  },
  medium: {
    keywords: ['help', 'emergency', 'scared', 'afraid', 'unsafe', 'uncomfortable', 'suspicious'],
    alert_immediately: false,
  },
};

export interface TranscriptSegment {
  id: string;
  text: string;
  speaker: string;
  speaker_id: number;
  is_user: boolean;
  person_id?: string;
  start: number;
  end: number;
}

export interface ThreatAnalysisResult {
  threatLevel: string | null;
  matchedKeywords: string[];
  shouldAlert: boolean;
  confidence: number;
  fullText: string;
}

export class ThreatAnalyzer {
  private segments: TranscriptSegment[];
  private fullText: string;
  private matchedKeywords: string[] = [];
  private threatLevel: string | null = null;

  constructor(segments: TranscriptSegment[]) {
    this.segments = segments;
    this.fullText = segments.map(seg => seg.text.toLowerCase()).join(' ');
  }

  analyze(): ThreatAnalysisResult {
    // Check each threat level
    for (const [level, config] of Object.entries(THREAT_KEYWORDS)) {
      for (const keyword of config.keywords) {
        // Use word boundaries to avoid partial matches
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(this.fullText)) {
          this.matchedKeywords.push(keyword);
          if (!this.threatLevel || this.isHigherPriority(level, this.threatLevel)) {
            this.threatLevel = level;
          }
        }
      }
    }

    const shouldAlert = this.shouldAlert();
    const confidence = this.calculateConfidence();

    return {
      threatLevel: this.threatLevel,
      matchedKeywords: this.matchedKeywords,
      shouldAlert,
      confidence,
      fullText: this.fullText,
    };
  }

  private isHigherPriority(newLevel: string, currentLevel: string): boolean {
    const priority: Record<string, number> = {
      critical: 3,
      high: 2,
      medium: 1,
    };
    return (priority[newLevel] || 0) > (priority[currentLevel] || 0);
  }

  private shouldAlert(): boolean {
    if (!this.threatLevel) {
      return false;
    }

    // Always alert for critical/high threats
    if (this.threatLevel === 'critical' || this.threatLevel === 'high') {
      return true;
    }

    // For medium threats, check if we have enough context
    if (this.threatLevel === 'medium') {
      // Alert if multiple medium keywords detected
      return this.matchedKeywords.length >= 2;
    }

    return false;
  }

  private calculateConfidence(): number {
    if (!this.threatLevel) {
      return 0.7; // Default confidence for normal
    }

    // Base confidence on threat level
    const baseConfidence: Record<string, number> = {
      critical: 0.95,
      high: 0.85,
      medium: 0.75,
    };

    let confidence = baseConfidence[this.threatLevel] || 0.7;

    // Increase confidence if multiple keywords detected
    if (this.matchedKeywords.length > 1) {
      confidence = Math.min(0.99, confidence + 0.05 * (this.matchedKeywords.length - 1));
    }

    return confidence;
  }

  getContext(charLimit: number = 300): string {
    if (this.fullText.length <= charLimit) {
      return this.fullText;
    }

    // Try to center context around first keyword match
    if (this.matchedKeywords.length > 0) {
      const keyword = this.matchedKeywords[0];
      const keywordPos = this.fullText.indexOf(keyword);
      const start = Math.max(0, keywordPos - Math.floor(charLimit / 2));
      const end = Math.min(this.fullText.length, keywordPos + Math.floor(charLimit / 2));
      
      let context = this.fullText.substring(start, end);
      if (start > 0) {
        context = '...' + context;
      }
      if (end < this.fullText.length) {
        context = context + '...';
      }
      return context;
    }

    return this.fullText.substring(0, charLimit);
  }
}

/**
 * Combine audio analysis with transcript analysis for enhanced threat detection
 */
export interface CombinedThreatAnalysis {
  category: string;
  confidence: number;
  threatLevel: string | null;
  matchedKeywords: string[];
  reasoning: string;
}

export function combineThreatAnalysis(
  audioCategory: string,
  audioConfidence: number,
  transcriptAnalysis: ThreatAnalysisResult | null
): CombinedThreatAnalysis {
  // If no transcript, use audio only
  if (!transcriptAnalysis || !transcriptAnalysis.threatLevel) {
    return {
      category: audioCategory,
      confidence: audioConfidence,
      threatLevel: null,
      matchedKeywords: [],
      reasoning: 'Audio analysis only',
    };
  }

  // If transcript detected threat keywords
  const { threatLevel, matchedKeywords, confidence: transcriptConfidence } = transcriptAnalysis;

  // Combine signals
  let finalCategory = audioCategory;
  let finalConfidence = audioConfidence;
  let reasoning = '';

  // Critical/High threat keywords override audio classification
  if (threatLevel === 'critical' || threatLevel === 'high') {
    finalCategory = 'threat';
    finalConfidence = Math.max(transcriptConfidence, 0.9);
    reasoning = `Threat keywords detected: ${matchedKeywords.join(', ')}`;
  }
  // Medium threat + distress audio = elevated threat
  else if (threatLevel === 'medium' && audioCategory === 'distress') {
    finalCategory = 'threat';
    finalConfidence = Math.min((transcriptConfidence + audioConfidence) / 2 + 0.1, 0.95);
    reasoning = `Medium threat keywords + distress audio: ${matchedKeywords.join(', ')}`;
  }
  // Medium threat + normal audio = monitor
  else if (threatLevel === 'medium') {
    finalCategory = 'monitor';
    finalConfidence = transcriptConfidence;
    reasoning = `Medium threat keywords detected: ${matchedKeywords.join(', ')}`;
  }

  return {
    category: finalCategory,
    confidence: finalConfidence,
    threatLevel,
    matchedKeywords,
    reasoning,
  };
}

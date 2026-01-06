declare module '@alexa-multi-agent/shared-types' {
  export type Mood = 'happy' | 'sad' | 'scared' | 'angry' | 'neutral';
  export interface DateRange { start: string; end: string }
  // Stubbed emotion-related types to satisfy imports
  export interface Emotion {
    id?: string;
    userId?: string;
    libraryId?: string;
    mood: Mood;
    label?: string;
    confidence?: number;
    createdAt?: string | Date;
    expiresAt?: string | Date;
    context?: any;
  }
  export interface EmotionResult {
    primary?: Emotion;
    secondary?: Emotion;
    detected?: Emotion[] | boolean;
  }
  export interface EmotionTrend {
    date?: string;
    score?: number;
    mood?: Mood;
    period: string;
    [key: string]: any;
  }
  export interface EmotionPattern {
    pattern?: string;
    frequency?: number;
    moodDistribution: Record<Mood, number>;
    trends: EmotionTrend[];
    dominantMood: Mood;
    [key: string]: any;
  }
  export interface SentimentResult { sentiment?: string; score: number; magnitude?: number; confidence?: number; emotions?: Emotion[] }
}



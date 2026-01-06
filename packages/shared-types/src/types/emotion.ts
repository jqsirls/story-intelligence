export type Mood = 'happy' | 'sad' | 'scared' | 'angry' | 'neutral';

export interface Emotion {
  id: string;
  userId: string;
  libraryId?: string;
  mood: Mood;
  confidence: number; // 0-1
  context?: Record<string, any>;
  createdAt: string;
  expiresAt: string; // 365-day TTL
}

export interface EmotionResult {
  detected: boolean;
  mood: Mood;
  confidence: number;
  timestamp: string;
}

export interface EmotionPattern {
  userId: string;
  timeRange: DateRange;
  dominantMood: Mood;
  moodDistribution: Record<Mood, number>;
  trends: EmotionTrend[];
  insights: string[];
}

export interface EmotionTrend {
  period: string;
  mood: Mood;
  frequency: number;
  confidence: number;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  emotions: Mood[];
}
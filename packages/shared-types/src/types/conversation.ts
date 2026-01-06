import { Mood, Emotion, EmotionPattern } from './emotion';
import { StoryType } from './story';

export type ConversationPhase = 'character' | 'story' | 'editing' | 'finalization';
export type Channel = 'alexa' | 'web_chat' | 'mobile_voice' | 'agent_to_agent';

export interface ConversationContext {
  sessionId: string;
  userId: string;
  storyId?: string;
  characterIds: string[];
  currentPhase: ConversationPhase;
  conversationHistory: Turn[];
  emotionalState: EmotionalContext;
  preferences: UserPreferences;
  lastActivity: string;
  resumePrompt?: string;
}

export interface Turn {
  id: string;
  timestamp: string;
  speaker: 'user' | 'agent';
  content: string;
  intent?: string;
  confidence?: number;
}

export interface EmotionalContext {
  currentMood: Mood;
  confidence: number;
  recentEmotions: Emotion[];
  patterns: EmotionPattern[];
}

export interface UserPreferences {
  voiceSettings: VoiceSettings;
  storyPreferences: StoryPreferences;
  accessibilitySettings: AccessibilitySettings;
}

export interface VoiceSettings {
  voice: string; // ElevenLabs voice ID
  speed: number;
  emotion: 'excited' | 'calm' | 'mysterious' | 'gentle';
  volume: number;
  clarity: 'high';
}

export interface StoryPreferences {
  favoriteGenres: StoryType[];
  preferredLength: 'short' | 'medium' | 'long';
  complexityLevel: 'simple' | 'standard' | 'advanced';
}

export interface AccessibilitySettings {
  speechProcessingDelay: number;
  vocabularyLevel: 'simple' | 'standard' | 'advanced';
  attentionSpan: number;
  preferredInteractionStyle: 'brief' | 'detailed' | 'visual';
  assistiveTechnology: string[];
}
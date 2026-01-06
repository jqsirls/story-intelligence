import { z } from 'zod';

// Age groups for personality adaptation
export const AgeGroupSchema = z.enum(['3-5', '6-8', '9-10', '11+']);
export type AgeGroup = z.infer<typeof AgeGroupSchema>;

// Emotional states the agent can recognize
export const EmotionalStateSchema = z.enum([
  'happy',
  'excited',
  'calm',
  'sad',
  'anxious',
  'frustrated',
  'shy',
  'confident',
  'curious',
  'tired',
  'overwhelmed',
  'neutral'
]);
export type EmotionalState = z.infer<typeof EmotionalStateSchema>;

// Personality traits that define the agent's character
export interface PersonalityTraits {
  warmth: number; // 0-1 scale
  whimsy: number; // 0-1 scale
  empathy: number; // 0-1 scale
  youthfulness: number; // 0-1 scale
  playfulness: number; // 0-1 scale
  supportiveness: number; // 0-1 scale
}

// Context for personality adaptation
export interface PersonalityContext {
  childAge: number;
  ageGroup: AgeGroup;
  currentEmotionalState: EmotionalState;
  conversationPhase: 'greeting' | 'character_creation' | 'story_building' | 'editing' | 'farewell';
  sessionHistory: InteractionMemory[];
  childPreferences?: ChildPreferences;
}

// Memory of past interactions with a specific child
export interface InteractionMemory {
  timestamp: Date;
  childResponse: string;
  agentResponse: string;
  emotionalState: EmotionalState;
  effectivenessScore: number; // 0-1 how well the response worked
  personalityTraitsUsed: PersonalityTraits;
}

// Child-specific preferences learned over time
export interface ChildPreferences {
  favoriteWhimsicalWords: string[];
  preferredHumorStyle: 'silly' | 'wordplay' | 'absurd' | 'gentle';
  responseToEncouragement: 'high' | 'medium' | 'low';
  attentionSpan: 'short' | 'medium' | 'long';
  comfortWithSilliness: number; // 0-1 scale
}

// Voice analysis results for emotion detection
export interface VoiceEmotionAnalysis {
  detectedEmotion: EmotionalState;
  confidence: number; // 0-1
  toneIndicators: {
    pace: 'slow' | 'normal' | 'fast';
    volume: 'quiet' | 'normal' | 'loud';
    pitch: 'low' | 'normal' | 'high';
    energy: 'low' | 'medium' | 'high';
  };
  wordChoiceIndicators: {
    positiveWords: number;
    negativeWords: number;
    excitementWords: number;
    hesitationWords: number;
  };
}

// Personality response generation request
export interface PersonalityRequest {
  context: PersonalityContext;
  userInput: string;
  voiceAnalysis?: VoiceEmotionAnalysis;
  conversationGoal: string;
  storyContext?: {
    characterName?: string;
    storyType?: string;
    currentScene?: string;
  };
}

// Generated personality response
export interface PersonalityResponse {
  response: string;
  personalityTraitsUsed: PersonalityTraits;
  emotionalTone: EmotionalState;
  whimsicalElements: string[];
  empathicElements: string[];
  ageAppropriateAdaptations: string[];
  confidenceScore: number; // 0-1 how confident the agent is in this response
  suggestedFollowUp?: string;
}

// Whimsical language elements
export interface WhimsicalElements {
  sillyWords: string[];
  playfulPhrases: string[];
  nonsensicalElements: string[];
  giggleInducers: string[];
  ageAppropriateHumor: Record<AgeGroup, string[]>;
}

// Empathic response patterns
export interface EmpathicPatterns {
  validationPhrases: string[];
  supportiveResponses: string[];
  encouragementPhrases: string[];
  comfortingWords: string[];
  celebrationPhrases: string[];
}

// Personality adaptation rules
export interface PersonalityAdaptationRules {
  ageGroup: AgeGroup;
  vocabularyLevel: 'simple' | 'intermediate' | 'advanced';
  sentenceLength: 'short' | 'medium' | 'long';
  conceptComplexity: 'basic' | 'moderate' | 'complex';
  whimsyIntensity: number; // 0-1
  empathyExpression: 'direct' | 'gentle' | 'playful';
  encouragementStyle: 'enthusiastic' | 'warm' | 'respectful';
}

// Therapeutic timing system
export interface TherapeuticTiming {
  situationType: 'distress' | 'excitement' | 'confusion' | 'shyness' | 'frustration';
  recommendedApproach: 'silly' | 'gentle' | 'supportive' | 'playful' | 'calm';
  intensityLevel: number; // 0-1
  durationRecommendation: 'brief' | 'moderate' | 'extended';
}

// Personality consistency tracking
export interface PersonalityConsistency {
  coreTraits: PersonalityTraits;
  adaptationRange: {
    min: PersonalityTraits;
    max: PersonalityTraits;
  };
  consistencyScore: number; // 0-1
  deviationAlerts: string[];
}

// Relationship building metrics
export interface RelationshipMetrics {
  childId: string;
  interactionCount: number;
  averageEngagement: number; // 0-1
  preferredPersonalityTraits: PersonalityTraits;
  successfulInteractionPatterns: string[];
  challengingScenarios: string[];
  relationshipStrength: number; // 0-1
}

// Whimsy balance configuration
export interface WhimsyBalance {
  baseLevel: number; // 0-1
  emotionalModifiers: Record<EmotionalState, number>;
  contextModifiers: Record<string, number>;
  ageModifiers: Record<AgeGroup, number>;
  maxIntensity: number;
  minIntensity: number;
}

export const PersonalityRequestSchema = z.object({
  context: z.object({
    childAge: z.number().min(3).max(18),
    ageGroup: AgeGroupSchema,
    currentEmotionalState: EmotionalStateSchema,
    conversationPhase: z.enum(['greeting', 'character_creation', 'story_building', 'editing', 'farewell']),
    sessionHistory: z.array(z.any()).optional(),
    childPreferences: z.any().optional()
  }),
  userInput: z.string(),
  voiceAnalysis: z.any().optional(),
  conversationGoal: z.string(),
  storyContext: z.object({
    characterName: z.string().optional(),
    storyType: z.string().optional(),
    currentScene: z.string().optional()
  }).optional()
});

export const PersonalityResponseSchema = z.object({
  response: z.string(),
  personalityTraitsUsed: z.object({
    warmth: z.number().min(0).max(1),
    whimsy: z.number().min(0).max(1),
    empathy: z.number().min(0).max(1),
    youthfulness: z.number().min(0).max(1),
    playfulness: z.number().min(0).max(1),
    supportiveness: z.number().min(0).max(1)
  }),
  emotionalTone: EmotionalStateSchema,
  whimsicalElements: z.array(z.string()),
  empathicElements: z.array(z.string()),
  ageAppropriateAdaptations: z.array(z.string()),
  confidenceScore: z.number().min(0).max(1),
  suggestedFollowUp: z.string().optional()
});
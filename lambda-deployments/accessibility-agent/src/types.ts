import { z } from 'zod';

// Accessibility Profile Types
export const AccessibilityProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  profileName: z.string().min(1).max(100),
  
  // Speech and Communication
  speechProcessingDelay: z.number().min(0).max(10000).default(0), // milliseconds
  extendedResponseTime: z.boolean().default(false),
  alternativeInputMethods: z.array(z.enum(['touch', 'gesture', 'switch', 'eye_tracking'])).default([]),
  
  // Vocabulary and Language
  vocabularyLevel: z.enum(['simple', 'standard', 'advanced']).default('standard'),
  simplifiedLanguageMode: z.boolean().default(false),
  customVocabularyTerms: z.array(z.string()).default([]),
  
  // Attention and Engagement
  attentionSpanMinutes: z.number().min(1).max(60).default(15),
  engagementCheckFrequency: z.number().min(30).max(600).default(120), // seconds
  shorterInteractionCycles: z.boolean().default(false),
  
  // Assistive Technology
  screenReaderCompatible: z.boolean().default(false),
  voiceAmplifierIntegration: z.boolean().default(false),
  switchControlSupport: z.boolean().default(false),
  eyeTrackingSupport: z.boolean().default(false),
  
  // Motor and Physical
  extendedTimeouts: z.boolean().default(false),
  motorDifficultySupport: z.boolean().default(false),
  customTimeoutDuration: z.number().min(5000).max(60000).default(10000), // milliseconds
  
  // Visual and Audio
  voicePaceAdjustment: z.number().min(0.5).max(2.0).default(1.0), // speed multiplier
  visualCuesEnabled: z.boolean().default(false),
  highContrastMode: z.boolean().default(false),
  largeTextMode: z.boolean().default(false),
  
  // Cognitive Support
  memoryAidsEnabled: z.boolean().default(false),
  repetitionFrequency: z.number().min(1).max(5).default(1),
  structuredPrompts: z.boolean().default(false),
  
  // Preferences and Settings
  preferredInteractionStyle: z.enum(['conversational', 'structured', 'guided']).default('conversational'),
  breakReminders: z.boolean().default(false),
  breakReminderInterval: z.number().min(300).max(1800).default(600), // seconds
  
  // Metadata
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  isActive: z.boolean().default(true),
});

export type AccessibilityProfile = z.infer<typeof AccessibilityProfileSchema>;

// Communication Adaptation Types
export const CommunicationAdaptationSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string(),
  adaptationType: z.enum(['speech_delay', 'vocabulary_level', 'attention_span', 'motor_support']),
  originalInput: z.string(),
  adaptedResponse: z.string(),
  adaptationReason: z.string(),
  effectivenessScore: z.number().min(0).max(1).optional(),
  timestamp: z.date().default(() => new Date()),
});

export type CommunicationAdaptation = z.infer<typeof CommunicationAdaptationSchema>;

// Engagement Check Types
export const EngagementCheckSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string(),
  checkType: z.enum(['attention', 'comprehension', 'interest', 'fatigue']),
  prompt: z.string(),
  response: z.string().optional(),
  engagementLevel: z.number().min(0).max(1),
  timestamp: z.date().default(() => new Date()),
  actionTaken: z.string().optional(),
});

export type EngagementCheck = z.infer<typeof EngagementCheckSchema> & { id?: string };

// Assistive Technology Integration Types
export const AssistiveTechnologySchema = z.object({
  userId: z.string().uuid(),
  technologyType: z.enum(['screen_reader', 'voice_amplifier', 'switch_control', 'eye_tracking', 'other']),
  deviceName: z.string(),
  integrationStatus: z.enum(['connected', 'disconnected', 'error', 'testing']),
  capabilities: z.array(z.string()),
  configuration: z.record(z.any()).default({}),
  lastUsed: z.date().optional(),
  createdAt: z.date().default(() => new Date()),
});

export type AssistiveTechnology = z.infer<typeof AssistiveTechnologySchema> & { id?: string };

// Vocabulary Adaptation Types
export const VocabularyAdaptationSchema = z.object({
  originalWord: z.string(),
  simplifiedWord: z.string(),
  context: z.string(),
  ageGroup: z.enum(['3-5', '6-8', '9-11', '12+']),
  vocabularyLevel: z.enum(['simple', 'standard', 'advanced']),
  usage_count: z.number().default(0),
  effectiveness: z.number().min(0).max(1).default(0.5),
});

export type VocabularyAdaptation = z.infer<typeof VocabularyAdaptationSchema>;

// Multi-modal Input Types
export const MultiModalInputSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string(),
  inputType: z.enum(['voice', 'touch', 'gesture', 'switch', 'eye_tracking', 'combined']),
  inputData: z.record(z.any()),
  confidence: z.number().min(0).max(1),
  timestamp: z.date().default(() => new Date()),
  processingTime: z.number(), // milliseconds
});

export type MultiModalInput = z.infer<typeof MultiModalInputSchema>;

// Response Adaptation Types
export const ResponseAdaptationSchema = z.object({
  originalResponse: z.string(),
  adaptedResponse: z.string(),
  adaptationTypes: z.array(z.enum([
    'simplified_vocabulary',
    'slower_pace',
    'shorter_sentences',
    'visual_cues',
    'repetition',
    'structured_format',
    'memory_aids'
  ])),
  targetProfile: z.string().uuid(), // AccessibilityProfile ID
  effectivenessScore: z.number().min(0).max(1).optional(),
});

export type ResponseAdaptation = z.infer<typeof ResponseAdaptationSchema>;

// Error types
export class AccessibilityError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AccessibilityError';
  }
}

export class ProfileNotFoundError extends AccessibilityError {
  constructor(userId: string) {
    super(`Accessibility profile not found for user ${userId}`, 'PROFILE_NOT_FOUND', { userId });
  }
}

export class AdaptationError extends AccessibilityError {
  constructor(message: string, details?: any) {
    super(message, 'ADAPTATION_ERROR', details);
  }
}

export class AssistiveTechnologyError extends AccessibilityError {
  constructor(message: string, details?: any) {
    super(message, 'ASSISTIVE_TECH_ERROR', details);
  }
}
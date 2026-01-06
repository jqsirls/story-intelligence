/**
 * Type definitions for Kid Communication Intelligence System
 */

export interface KidCommunicationConfig {
  enableAudioIntelligence?: boolean;
  enableTestTimeAdaptation?: boolean;
  enableMultimodal?: boolean;
  enableDevelopmentalProcessing?: boolean;
  enableInventedWordIntelligence?: boolean;
  enableChildLogicInterpreter?: boolean;
  enableEmotionalSpeechIntelligence?: boolean;
  enableAdaptiveTranscription?: boolean;
  enableContinuousPersonalization?: boolean;
  enableConfidenceSystem?: boolean;
  supabaseUrl?: string;
  supabaseKey?: string;
  redisUrl?: string;
}

export interface AudioInput {
  data: Buffer | ArrayBuffer;
  sampleRate: number;
  channels: number;
  format: 'pcm' | 'wav' | 'mp3' | 'ogg';
  metadata?: {
    childId?: string;
    age?: number;
    sessionId?: string;
    timestamp?: string;
  };
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  language?: string;
  metadata?: {
    processingTime?: number;
    model?: string;
    alternatives?: string[];
  };
}

export interface EnhancedTranscriptionResult extends TranscriptionResult {
  audioIntelligence?: {
    pitchNormalized: boolean;
    spectralModified: boolean;
    noiseReduced: boolean;
  };
  personalization?: {
    adapted: boolean;
    confidenceBoost?: number;
  };
  inventedWords?: InventedWord[];
  nonLinearPatterns?: NonLinearPattern[];
  emotionalContext?: EmotionalContext;
  developmentalStage?: {
    stage: string;
    ageRange: string;
    adaptations: string[];
  };
  confidenceBreakdown?: ConfidenceBreakdown;
}

export interface InventedWord {
  word: string;
  inferredMeaning?: string;
  context?: string;
  phoneticSimilarity?: number;
  storyContext?: string;
  remembered: boolean;
}

export interface PronunciationVariant {
  original: string;
  childPronunciation: string;
  confidence: number;
  corrected: boolean;
}

export interface NonLinearPattern {
  type: 'topic_jump' | 'tangent' | 'question_cascade' | 'emotion_driven';
  detected: boolean;
  connections?: TopicConnection[];
  mainThread?: string;
}

export interface TopicConnection {
  topic1: string;
  topic2: string;
  connectionType: 'associative' | 'emotional' | 'temporal' | 'causal';
  strength: number;
}

export interface EmotionalContext {
  detectedEmotion: string;
  intensity: number;
  speechCharacteristics: {
    pitch?: number;
    pace?: number;
    volume?: number;
    tone?: string;
  };
  needsSupport?: boolean;
  selIntegration?: string;
}

export interface ConfidenceBreakdown {
  audioQuality: number;
  transcriptionConfidence: number;
  patternMatching: number;
  contextAlignment: number;
  overall: number;
  factors: {
    highPitch?: number;
    backgroundNoise?: number;
    pronunciationVariation?: number;
    inventedWords?: number;
    nonLinearLogic?: number;
  };
}

export interface ChildProfile {
  childId: string;
  age: number;
  voiceCharacteristics?: {
    averagePitch?: number;
    pronunciationPatterns?: PronunciationVariant[];
    speechRhythm?: number;
    formantRanges?: number[];
  };
  inventedWords?: InventedWord[];
  conversationStyle?: {
    topicJumpFrequency?: number;
    questionCascadeFrequency?: number;
    emotionalDrivenLogic?: boolean;
  };
  developmentalStage?: {
    piagetianStage?: string;
    executiveFunction?: {
      workingMemory?: number;
      attentionSpan?: number;
      impulseControl?: number;
    };
    languageDevelopment?: {
      vocabularySize?: number;
      grammarComplexity?: number;
      narrativeSkills?: number;
    };
  };
  personalizationData?: {
    adaptationCount?: number;
    lastAdaptation?: string;
    confidenceImprovement?: number;
  };
}

export interface MultimodalInput {
  voice?: AudioInput;
  visual?: {
    type: 'gesture' | 'facial_expression' | 'pointing' | 'button_press';
    data: any;
  };
  tactile?: {
    type: 'touch' | 'button' | 'screen_tap';
    data: any;
  };
  motion?: {
    type: 'movement' | 'orientation';
    data: any;
  };
}

export interface MultimodalResult {
  primaryInput: 'voice' | 'visual' | 'tactile' | 'motion';
  validated: boolean;
  crossModalConfirmation?: {
    voiceText?: string;
    visualConfirmation?: string;
    confidence: number;
  };
  modeSwitching?: {
    from: string;
    to: string;
    reason: string;
  };
}

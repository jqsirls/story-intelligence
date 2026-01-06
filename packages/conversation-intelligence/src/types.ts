import { Logger } from 'winston';

// Core conversation intelligence types
export interface ConversationIntelligenceConfig {
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  redis: {
    url: string;
    keyPrefix: string;
    ttl: number;
  };
  developmentalPsychology: {
    enabled: boolean;
    assessmentInterval: number; // minutes
    adaptationThreshold: number; // 0-1 confidence score
  };
  culturalContext: {
    enabled: boolean;
    supportedCultures: string[];
    defaultCulture: string;
  };
  personalization: {
    enabled: boolean;
    learningRate: number; // 0-1
    memoryRetention: number; // days
  };
}

// Natural Language Understanding types
export interface MultiModalIntent {
  primaryIntent: string;
  confidence: number;
  voiceContext: VoiceContext;
  emotionalContext: EmotionalContext;
  implicitMeaning: ImplicitMeaning;
  culturalContext: CulturalContext;
  developmentalContext: DevelopmentalContext;
  conversationRepair?: ConversationRepair;
}

export interface VoiceContext {
  tone: 'excited' | 'calm' | 'frustrated' | 'confused' | 'happy' | 'sad' | 'neutral';
  pace: 'fast' | 'normal' | 'slow';
  volume: 'loud' | 'normal' | 'quiet';
  clarity: number; // 0-1 speech clarity score
  hesitation: boolean;
  interruptions: number;
}

export interface EmotionalContext {
  primaryEmotion: string;
  emotionIntensity: number; // 0-1
  emotionalSubtext: string[];
  moodShift: 'positive' | 'negative' | 'neutral';
  engagementLevel: number; // 0-1
}

export interface ImplicitMeaning {
  hiddenIntent: string;
  confidence: number;
  contextClues: string[];
  inferredNeeds: string[];
  unspokenConcerns: string[];
}

export interface CulturalContext {
  detectedCulture: string;
  culturalNorms: string[];
  communicationStyle: 'direct' | 'indirect' | 'high-context' | 'low-context';
  familyStructure: 'nuclear' | 'extended' | 'single-parent' | 'blended' | 'other';
  religiousConsiderations: string[];
}

export interface DevelopmentalContext {
  cognitiveStage: CognitiveStage;
  executiveFunctionLevel: ExecutiveFunctionLevel;
  socialSkillsLevel: SocialSkillsLevel;
  emotionalDevelopmentStage: EmotionalDevelopmentStage;
  memoryCapacity: MemoryCapacity;
  processingSpeed: ProcessingSpeed;
  attentionSpan: AttentionSpan;
}

export interface ConversationRepair {
  misunderstandingDetected: boolean;
  repairStrategy: 'clarification' | 'repetition' | 'simplification' | 'example' | 'redirect';
  repairPrompt: string;
  confidence: number;
}

// Developmental Psychology types
export interface CognitiveStage {
  stage: 'sensorimotor' | 'preoperational' | 'concrete-operational' | 'formal-operational';
  substage?: string;
  characteristics: string[];
  capabilities: string[];
  limitations: string[];
  ageRange: [number, number];
}

export interface ExecutiveFunctionLevel {
  workingMemory: number; // 0-1 capacity score
  cognitiveFlexibility: number; // 0-1 ability score
  inhibitoryControl: number; // 0-1 control score
  planningAbility: number; // 0-1 planning score
  attentionRegulation: number; // 0-1 regulation score
}

export interface SocialSkillsLevel {
  perspectiveTaking: number; // 0-1 ability score
  empathy: number; // 0-1 empathy score
  cooperationSkills: number; // 0-1 cooperation score
  conflictResolution: number; // 0-1 resolution score
  communicationSkills: number; // 0-1 communication score
}

export interface EmotionalDevelopmentStage {
  emotionalRegulation: number; // 0-1 regulation ability
  emotionalExpression: number; // 0-1 expression ability
  emotionalUnderstanding: number; // 0-1 understanding level
  empathyDevelopment: number; // 0-1 empathy level
  attachmentSecurity: number; // 0-1 security score
}

export interface MemoryCapacity {
  shortTermCapacity: number; // items that can be held
  workingMemorySpan: number; // processing capacity
  longTermRetrieval: number; // 0-1 retrieval efficiency
  episodicMemory: number; // 0-1 episodic memory strength
}

export interface ProcessingSpeed {
  verbalProcessing: number; // 0-1 speed score
  visualProcessing: number; // 0-1 speed score
  auditoryProcessing: number; // 0-1 speed score
  motorProcessing: number; // 0-1 speed score
}

export interface AttentionSpan {
  sustainedAttention: number; // minutes
  selectiveAttention: number; // 0-1 ability score
  dividedAttention: number; // 0-1 ability score
  attentionShifting: number; // 0-1 flexibility score
}

// Zone of Proximal Development types
export interface ZPDAssessment {
  currentLevel: number; // 0-1 current ability
  potentialLevel: number; // 0-1 potential with support
  scaffoldingNeeded: ScaffoldingType[];
  optimalChallengeLevel: number; // 0-1 challenge level
  supportStrategies: string[];
}

export enum ScaffoldingType {
  VERBAL_PROMPTS = 'verbal_prompts',
  VISUAL_CUES = 'visual_cues',
  PHYSICAL_GUIDANCE = 'physical_guidance',
  MODELING = 'modeling',
  QUESTIONING = 'questioning',
  FEEDBACK = 'feedback',
  ENCOURAGEMENT = 'encouragement'
}

// Contextual Memory and Personalization types
export interface PersonalizationProfile {
  userId: string;
  communicationStyle: CommunicationStyle;
  preferences: UserPreferences;
  learningPatterns: LearningPatterns;
  engagementPatterns: EngagementPatterns;
  conversationHistory: ConversationMemory[];
  lastUpdated: Date;
}

export interface CommunicationStyle {
  preferredPace: 'fast' | 'normal' | 'slow';
  preferredComplexity: 'simple' | 'moderate' | 'complex';
  responseLength: 'brief' | 'moderate' | 'detailed';
  interactionStyle: 'formal' | 'casual' | 'playful';
  feedbackPreference: 'immediate' | 'delayed' | 'minimal';
}

export interface UserPreferences {
  storyTypes: string[];
  characterTypes: string[];
  themes: string[];
  avoidedTopics: string[];
  favoriteWords: string[];
  communicationTriggers: string[];
}

export interface LearningPatterns {
  optimalSessionLength: number; // minutes
  bestTimeOfDay: string;
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
  comprehensionSpeed: number; // 0-1
  retentionRate: number; // 0-1
  transferAbility: number; // 0-1
}

export interface EngagementPatterns {
  attentionTriggers: string[];
  disengagementSignals: string[];
  motivationalFactors: string[];
  optimalChallengeLevel: number; // 0-1
  recoveryStrategies: string[];
}

export interface ConversationMemory {
  timestamp: Date;
  context: string;
  userInput: string;
  systemResponse: string;
  emotionalState: string;
  engagementLevel: number;
  outcomes: string[];
  lessons: string[];
}

// Analysis and Assessment types
export interface ConversationAnalysis {
  intentAnalysis: MultiModalIntent;
  developmentalAssessment: DevelopmentalAssessment;
  personalizationInsights: PersonalizationInsights;
  conversationQuality: ConversationQuality;
  recommendations: ConversationRecommendations;
}

export interface DevelopmentalAssessment {
  cognitiveAssessment: CognitiveAssessment;
  executiveFunctionAssessment: ExecutiveFunctionAssessment;
  socialSkillsAssessment: SocialSkillsAssessment;
  emotionalAssessment: EmotionalAssessment;
  zpd: ZPDAssessment;
  developmentalRecommendations: string[];
}

export interface CognitiveAssessment {
  stage: CognitiveStage;
  reasoning: string[];
  evidence: string[];
  confidence: number;
  nextStageIndicators: string[];
}

export interface ExecutiveFunctionAssessment {
  currentLevel: ExecutiveFunctionLevel;
  strengths: string[];
  challenges: string[];
  supportNeeds: string[];
  developmentGoals: string[];
}

export interface SocialSkillsAssessment {
  currentLevel: SocialSkillsLevel;
  socialStrengths: string[];
  socialChallenges: string[];
  peerInteractionQuality: number; // 0-1
  socialLearningOpportunities: string[];
}

export interface EmotionalAssessment {
  currentStage: EmotionalDevelopmentStage;
  emotionalStrengths: string[];
  emotionalChallenges: string[];
  regulationStrategies: string[];
  supportNeeds: string[];
}

export interface PersonalizationInsights {
  styleAdaptations: string[];
  contentRecommendations: string[];
  engagementStrategies: string[];
  learningOptimizations: string[];
  communicationAdjustments: string[];
}

export interface ConversationQuality {
  coherence: number; // 0-1
  engagement: number; // 0-1
  understanding: number; // 0-1
  satisfaction: number; // 0-1
  developmentalAppropriate: number; // 0-1
  culturalSensitivity: number; // 0-1
}

export interface ConversationRecommendations {
  immediateActions: string[];
  sessionAdjustments: string[];
  longTermStrategies: string[];
  parentGuidance: string[];
  professionalReferrals: string[];
}

// Service interfaces
export interface INaturalLanguageUnderstanding {
  analyzeMultiModalIntent(
    userInput: string,
    voiceData?: any,
    context?: any
  ): Promise<MultiModalIntent>;
  
  extractImplicitMeaning(
    userInput: string,
    conversationHistory: string[],
    userProfile?: PersonalizationProfile
  ): Promise<ImplicitMeaning>;
  
  detectConversationRepair(
    userInput: string,
    systemResponse: string,
    context: any
  ): Promise<ConversationRepair | null>;
  
  analyzeCulturalContext(
    userInput: string,
    userProfile?: PersonalizationProfile
  ): Promise<CulturalContext>;
}

export interface IDevelopmentalPsychologyIntegration {
  assessCognitiveStage(
    userInput: string,
    conversationHistory: string[],
    userAge?: number
  ): Promise<CognitiveAssessment>;
  
  assessExecutiveFunction(
    behaviorPatterns: any,
    conversationData: any
  ): Promise<ExecutiveFunctionAssessment>;
  
  assessZPD(
    currentPerformance: any,
    supportedPerformance: any,
    context: any
  ): Promise<ZPDAssessment>;
  
  adaptToMemoryCapacity(
    memoryAssessment: MemoryCapacity,
    content: string
  ): Promise<string>;
  
  adaptToProcessingSpeed(
    processingAssessment: ProcessingSpeed,
    interaction: any
  ): Promise<any>;
}

export interface IContextualMemoryPersonalization {
  buildPersonalizationProfile(
    userId: string,
    conversationHistory: ConversationMemory[]
  ): Promise<PersonalizationProfile>;
  
  adaptCommunicationStyle(
    profile: PersonalizationProfile,
    context: any
  ): Promise<CommunicationStyle>;
  
  optimizeConversationFlow(
    profile: PersonalizationProfile,
    currentFlow: any
  ): Promise<any>;
  
  recognizeEngagementPatterns(
    conversationData: any,
    profile: PersonalizationProfile
  ): Promise<EngagementPatterns>;
  
  manageAttention(
    attentionData: any,
    developmentalContext: DevelopmentalContext
  ): Promise<any>;
}

// Error types
export class ConversationIntelligenceError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ConversationIntelligenceError';
  }
}

export enum ConversationIntelligenceErrorCode {
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',
  ASSESSMENT_FAILED = 'ASSESSMENT_FAILED',
  PERSONALIZATION_FAILED = 'PERSONALIZATION_FAILED',
  CULTURAL_CONTEXT_FAILED = 'CULTURAL_CONTEXT_FAILED',
  DEVELOPMENTAL_ASSESSMENT_FAILED = 'DEVELOPMENTAL_ASSESSMENT_FAILED',
  MEMORY_STORAGE_FAILED = 'MEMORY_STORAGE_FAILED',
  PROFILE_CREATION_FAILED = 'PROFILE_CREATION_FAILED',
  ADAPTATION_FAILED = 'ADAPTATION_FAILED'
}
import { 
  StoryType, StoryMood, StoryAudience, StoryComplexity, TherapeuticFocus,
  PostStorySupport, StoryReaction, EmotionalResponse, PostStorySession
} from '@alexa-multi-agent/shared-types';

export interface StoryClassificationRequest {
  userInput: string;
  context?: ConversationContext;
  userId: string;
  sessionId: string;
}

export interface StoryClassificationResult {
  storyType: StoryType;
  confidence: number;
  alternativeTypes?: Array<{
    type: StoryType;
    confidence: number;
  }>;
  reasoning: string;
}

export interface ConversationContext {
  previousMessages: string[];
  currentPhase: 'greeting' | 'character' | 'story' | 'editing' | 'finalization';
  emotionalState?: string;
  userAge?: number;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  favoriteStoryTypes: StoryType[];
  preferredMood: StoryMood;
  contentFilters: ContentFilter[];
}

export interface ContentFilter {
  type: 'violence' | 'scary' | 'complex_themes' | 'religious' | 'cultural';
  level: 'none' | 'mild' | 'moderate' | 'strict';
}

export interface PromptTemplate {
  storyType: StoryType;
  ageGroup: AgeGroup;
  systemPrompt: string;
  userPrompt: string;
  examples?: string[];
  constraints: string[];
}

export type AgeGroup = '3' | '4' | '5' | '6' | '7' | '8' | '9+';

export interface ModerationRequest {
  content: string;
  contentType: 'story' | 'character' | 'user_input';
  userAge?: number;
  storyType?: StoryType;
}

export interface ModerationResult {
  approved: boolean;
  flaggedCategories: string[];
  severity: 'low' | 'medium' | 'high';
  suggestedModifications?: string[];
  alternativeContent?: string;
}

export interface ContentAgentConfig {
  openaiApiKey: string;
  supabaseUrl: string;
  supabaseKey: string;
  redisUrl: string;
  moderationEnabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// Enhanced types for therapeutic stories
export interface TherapeuticStoryRequest extends StoryClassificationRequest {
  therapeuticFocus?: TherapeuticFocus;
  traumaHistory?: string[];
  currentEmotionalState?: string;
  supportNeeds?: string[];
  relationshipContext?: string;
  lossType?: string; // For Child Loss stories
  innerChildAge?: number; // For Inner Child stories
  birthContext?: string; // For New Birth stories
}

export interface TherapeuticStoryResult extends StoryClassificationResult {
  audience: StoryAudience;
  complexity: StoryComplexity;
  therapeuticFocus?: TherapeuticFocus;
  safetyConsiderations: string[];
  postStorySupport: PostStorySupport;
}

// Post-Story Support System
export interface PostStoryAnalysisRequest {
  storyId: string;
  storyType: StoryType;
  storyContent: string;
  userReaction: StoryReaction;
  userProfile?: {
    age?: number;
    therapeuticHistory?: string[];
    supportPreferences?: string[];
    crisisIndicators?: string[];
  };
}

export interface PostStoryAnalysisResult {
  emotionalAssessment: EmotionalAssessment;
  recommendedSupport: PostStorySupport;
  urgencyLevel: 'low' | 'moderate' | 'high' | 'crisis';
  followUpNeeded: boolean;
  professionalReferral?: boolean;
}

export interface EmotionalAssessment {
  primaryEmotions: string[];
  intensityLevel: number; // 1-10
  stabilityRisk: 'low' | 'moderate' | 'high';
  triggerIndicators: string[];
  copingCapacity: 'strong' | 'moderate' | 'limited' | 'overwhelmed';
  supportReadiness: boolean;
}

// Voice-guided support session
export interface SupportSessionRequest {
  userId: string;
  storyId: string;
  emotionalState: EmotionalResponse;
  preferredSupport: string[];
  timeAvailable: string; // "5 minutes", "15 minutes", etc.
  voiceGuidancePreferred: boolean;
}

export interface SupportSessionPlan {
  sessionId: string;
  duration: string;
  phases: SupportPhase[];
  voiceScript?: string;
  checkpoints: string[]; // Times to check in with user
  exitStrategies: string[]; // If user needs to stop
}

export interface SupportPhase {
  name: string;
  duration: string;
  type: 'grounding' | 'processing' | 'stabilizing' | 'integrating';
  activities: SupportActivity[];
  transitionCue: string;
}

export interface SupportActivity {
  name: string;
  instructions: string[];
  voiceGuidance?: string;
  duration: string;
  optional: boolean;
}

// Crisis detection and response
export interface CrisisIndicator {
  type: 'language' | 'emotional_intensity' | 'behavioral' | 'contextual';
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  description: string;
  immediateAction: string;
}

export interface CrisisResponse {
  level: 'support' | 'intervention' | 'emergency';
  immediateActions: string[];
  resources: string[];
  followUpRequired: boolean;
  professionalContact?: boolean;
}

// Character-related types
export interface CharacterCreationRequest {
  libraryId: string;
  name: string;
  traits: any; // CharacterTraits from shared-types
  artPrompt?: string;
}

export interface CharacterUpdateRequest {
  characterId: string;
  name?: string;
  traits?: any; // Partial<CharacterTraits>
  artPrompt?: string;
  appearanceUrl?: string;
}

export interface CharacterSearchOptions {
  libraryId: string;
  species?: string;
  ageRange?: { min: number; max: number };
  hasInclusivityTraits?: boolean;
  limit?: number;
  offset?: number;
}

export interface CharacterValidationRequest {
  traits: any; // CharacterTraits
  ageContext?: number;
  libraryId: string;
}

export interface CharacterValidationResult {
  isValid: boolean;
  ageAppropriate: boolean;
  issues: ValidationIssue[];
  suggestions: string[];
}

export interface ValidationIssue {
  type: 'age_inappropriate' | 'missing_required' | 'inconsistent' | 'safety_concern';
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

// Story Creation Types
export interface StoryCreationRequest {
  characterId: string;
  storyType: StoryType;
  userAge?: number;
  preferences?: {
    mood?: any;
    themes?: string[];
    avoidTopics?: string[];
  };
}

export interface StoryBeatRequest {
  storyId: string;
  userChoice?: string;
  voiceInput?: string;
}

export interface StoryEditRequest {
  storyId: string;
  voiceCommand: string;
  targetBeat?: number;
}

export interface StoryUpdate {
  updatedBeats: any[];
  affectedCharacters: string[];
  narrativeChanges: string[];
}

// Story Conversation Types
export interface StoryConversationSession {
  id: string;
  userId: string;
  libraryId: string;
  characterId: string;
  storyType: StoryType;
  phase: 'setup' | 'creation' | 'editing' | 'finalization';
  currentBeat: number;
  storyDraft?: any;
  conversationHistory: ConversationTurn[];
  choices: any[];
  lastActivity: string;
  ageContext?: number;
}

export interface ConversationTurn {
  timestamp: string;
  speaker: 'user' | 'agent';
  content: string;
  type: 'story_beat' | 'choice_selection' | 'edit_request' | 'confirmation';
  metadata?: any;
}

export interface StoryConversationResponse {
  sessionId: string;
  agentResponse: string;
  storyBeat?: any;
  choices: any[];
  phase: string;
  isComplete: boolean;
  needsConfirmation?: boolean;
  confirmationType?: 'story_finalization' | 'character_change' | 'major_edit';
}

// Enhanced confirmation and edge case handling types
export interface ConfirmationRequest {
  sessionId: string;
  userId: string;
  userInput: string;
  confirmationType: 'character_finalization' | 'story_finalization' | 'character_change' | 'story_edit' | 'asset_generation';
  context: ConfirmationContext;
  previousAttempts?: number;
}

export interface ConfirmationContext {
  itemBeingConfirmed: any;
  conversationHistory: string[];
  ageContext?: number;
  currentPhase: string;
  relatedData?: any;
}

export interface ConfirmationResult {
  confirmed: boolean;
  confidence: number;
  interpretation: 'explicit_yes' | 'explicit_no' | 'ambiguous' | 'partial' | 'retraction' | 'unclear';
  clarificationNeeded?: string;
  suggestedAction?: string;
  partialConfirmation?: {
    confirmedAspects: string[];
    unconfirmedAspects: string[];
    needsClarification: string[];
  };
  defaultBehavior?: 'proceed' | 'wait' | 'clarify' | 'cancel';
}

export interface AssetGenerationFailure {
  assetType: 'art' | 'audio' | 'activities' | 'pdf';
  error: Error;
  timestamp: string;
  retryCount: number;
  context: {
    storyId: string;
    characterId: string;
    userId: string;
    sessionId: string;
  };
}

export interface ProgressUpdate {
  sessionId: string;
  assetType: 'art' | 'audio' | 'activities' | 'pdf';
  status: 'queued' | 'generating' | 'completed' | 'failed' | 'fallback';
  progress: number;
  estimatedTimeRemaining: number;
  message: string;
  userVisible: boolean;
}

export interface AssetQualityValidation {
  assetType: 'art' | 'audio' | 'activities' | 'pdf';
  isValid: boolean;
  qualityScore: number;
  issues: QualityIssue[];
  recommendation: 'accept' | 'regenerate' | 'fallback' | 'manual_review';
}

export interface QualityIssue {
  type: 'resolution' | 'content_mismatch' | 'age_inappropriate' | 'technical_error' | 'incomplete';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  autoFixable: boolean;
}

export interface CharacterConsistencyCheck {
  characterId: string;
  storyId: string;
  currentTraits: any;
  storyProgression: any[];
  inconsistencies: CharacterInconsistency[];
  overallConsistencyScore: number;
}

export interface CharacterInconsistency {
  type: 'physical' | 'personality' | 'ability' | 'backstory' | 'relationship';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  description: string;
  conflictingElements: {
    original: string;
    current: string;
    storyBeat: number;
  };
  suggestedResolution: string;
  autoFixable: boolean;
}

export interface CharacterChangeRequest {
  characterId: string;
  storyId: string;
  changeType: 'trait_modification' | 'ability_change' | 'appearance_update' | 'personality_shift';
  originalValue: any;
  newValue: any;
  reason: string;
  userRequested: boolean;
  storyBeat?: number;
}

export interface StoryAdaptationPlan {
  storyId: string;
  characterChanges: CharacterChangeRequest[];
  affectedBeats: number[];
  adaptationStrategies: any[];
  narrativeChanges: any[];
  estimatedImpact: 'minimal' | 'moderate' | 'significant' | 'major_rewrite';
}

export interface UserConfirmationProtocol {
  changeRequest: CharacterChangeRequest;
  impactAssessment: {
    affectedStoryElements: string[];
    narrativeChangesRequired: string[];
    userVisibleChanges: string[];
  };
  confirmationPrompt: string;
  alternativeOptions: string[];
  proceedWithoutConfirmation: boolean;
}
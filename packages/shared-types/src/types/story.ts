export type StoryStatus = 'draft' | 'final';
export type StoryType = 
  // Children's story types
  'Adventure' | 'Bedtime' | 'Birthday' | 'Educational' | 'Financial Literacy' | 
  'Language Learning' | 'Medical Bravery' | 'Mental Health' | 'Milestones' | 
  'New Chapter Sequel' | 'Tech Readiness' |
  // Adult therapeutic story types
  'Child Loss' | 'Inner Child' | 'New Birth';

export type StoryAudience = 'child' | 'adult' | 'family';
export type StoryComplexity = 'simple' | 'therapeutic' | 'advanced';
export type TherapeuticFocus = 
  'grief_processing' | 'inner_child_healing' | 'new_life_celebration' |
  'abandonment' | 'betrayal' | 'fear' | 'anger' | 'guilt' | 'shame' |
  'loneliness' | 'self_worth' | 'perfectionism' | 'emotional_numbness' |
  'overwhelm' | 'trust_issues' | 'self_doubt' | 'rediscovering_magic' |
  'remembering_dreams' | 'embracing_playfulness' | 'reclaiming_joy';

export interface Story {
  id: string;
  libraryId: string;
  title: string;
  content: StoryContent;
  status: StoryStatus;
  ageRating: number;
  createdAt: string;
  finalizedAt?: string;
}

export interface StoryContent {
  type: StoryType;
  audience: StoryAudience;
  complexity: StoryComplexity;
  therapeuticFocus?: TherapeuticFocus;
  beats: StoryBeat[];
  characters: string[]; // Character IDs
  theme: string;
  setting: string;
  mood: StoryMood;
  heroJourneyStructure: HeroJourneyBeat[];
  postStorySupport?: PostStorySupport;
}

export interface StoryBeat {
  id: string;
  sequence: number;
  content: string;
  choices?: StoryChoice[];
  emotionalTone: string;
}

export interface StoryChoice {
  id: string;
  text: string;
  consequence: string;
  nextBeatId?: string;
}

export type StoryMood = 'excited' | 'calm' | 'mysterious' | 'gentle' | 'adventurous' | 'peaceful';

export interface HeroJourneyBeat {
  stage: 'ordinary_world' | 'call_to_adventure' | 'refusal_of_call' | 'meeting_mentor' | 'crossing_threshold' | 'tests_allies_enemies' | 'approach_inmost_cave' | 'ordeal' | 'reward' | 'road_back' | 'resurrection' | 'return_elixir';
  content: string;
  completed: boolean;
}

export interface StoryDraft {
  id: string;
  characterId: string;
  storyType: StoryType;
  outline: string;
  currentBeat: number;
  choices: StoryChoice[];
}

// Post-Story Support System
export interface PostStorySupport {
  emotionalState: EmotionalState;
  recommendedActions: SupportAction[];
  visualizations?: Visualization[];
  affirmations?: Affirmation[];
  groundingTechniques?: GroundingTechnique[];
  followUpPrompts?: string[];
  safetyResources?: SafetyResource[];
}

export interface EmotionalState {
  primary: EmotionalIntensity;
  secondary?: EmotionalIntensity[];
  triggers?: string[];
  needsImmediate?: boolean;
  stabilityLevel: 'stable' | 'processing' | 'vulnerable' | 'crisis';
}

export interface EmotionalIntensity {
  emotion: string;
  intensity: number; // 1-10 scale
  duration: 'momentary' | 'lingering' | 'persistent';
}

export type SupportActionType = 
  'breathing' | 'visualization' | 'affirmation' | 'movement' | 
  'journaling' | 'connection' | 'rest' | 'professional_help' |
  'grounding' | 'self_care' | 'reflection' | 'creative_expression';

export interface SupportAction {
  type: SupportActionType;
  title: string;
  description: string;
  duration: string; // "2-3 minutes", "10 minutes", etc.
  instructions: string[];
  voiceGuidance?: boolean;
  priority: 'immediate' | 'recommended' | 'optional';
}

export interface Visualization {
  title: string;
  description: string;
  script: string;
  duration: string;
  imagery: string[]; // Key visual elements
  purpose: 'calming' | 'empowering' | 'processing' | 'grounding';
}

export interface Affirmation {
  text: string;
  category: 'self_worth' | 'healing' | 'strength' | 'peace' | 'hope';
  repetitions: number;
  timing: 'immediate' | 'daily' | 'as_needed';
}

export interface GroundingTechnique {
  name: string;
  type: '5-4-3-2-1' | 'breathing' | 'progressive_muscle' | 'mindful_observation' | 'body_scan';
  instructions: string[];
  duration: string;
  effectiveness: 'mild' | 'moderate' | 'strong';
}

export interface SafetyResource {
  type: 'crisis_line' | 'therapist' | 'support_group' | 'emergency' | 'self_help';
  name: string;
  contact?: string;
  description: string;
  availability: string;
  urgency: 'immediate' | 'within_24h' | 'ongoing_support';
}

// Story Reaction and Response
export interface StoryReaction {
  userId: string;
  storyId: string;
  sessionId?: string;
  timestamp: string;
  emotionalResponse: EmotionalResponse;
  needsSupport: boolean;
  supportRequested?: SupportActionType[];
  followUpNeeded?: boolean;
}

export interface EmotionalResponse {
  felt: string[]; // emotions experienced
  intensity: number; // 1-10
  triggered?: boolean;
  overwhelmed?: boolean;
  comforted?: boolean;
  empowered?: boolean;
  processing?: boolean;
  needsSpace?: boolean;
}

export interface PostStorySession {
  id: string;
  storyId: string;
  userId: string;
  startTime: string;
  endTime?: string;
  supportActions: CompletedSupportAction[];
  emotionalJourney: EmotionalCheckpoint[];
  outcome: 'completed' | 'paused' | 'escalated' | 'referred';
}

export interface CompletedSupportAction {
  action: SupportAction;
  startTime: string;
  endTime?: string;
  effectiveness: number; // 1-10
  userFeedback?: string;
  completed: boolean;
}

export interface EmotionalCheckpoint {
  timestamp: string;
  emotionalState: EmotionalState;
  notes?: string;
  stabilityChange: 'improved' | 'stable' | 'declined';
}

// IP Attribution System Types
export interface IPAttribution {
  character: string;
  franchise: string;
  owner: string;
  confidence: 'high' | 'medium' | 'low';
  detectedAt: string;
  attributionText: string;
  personalUseMessage: string;
  ownershipDisclaimer: string;
}

export interface StoryMetadata {
  ipAttributions?: IPAttribution[];
  characterName?: string;
  storyType?: string;
  userAge?: number;
  keyBeats?: any[];
  phase?: string;
  [key: string]: any; // Allow other metadata fields
}

export interface IPDispute {
  id: string;
  storyId: string;
  reportedBy?: string;
  disputeType: 'missed_detection' | 'false_positive' | 'rights_holder_claim' | 'user_question';
  characterName: string;
  franchise?: string;
  owner?: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'escalated';
  resolution?: string;
  legalEscalated: boolean;
  createdAt: string;
  updatedAt: string;
}

// Update Story interface to include metadata
export interface Story {
  id: string;
  libraryId: string;
  title: string;
  content: StoryContent;
  status: StoryStatus;
  ageRating: number;
  createdAt: string;
  finalizedAt?: string;
  metadata?: StoryMetadata; // Add metadata field
}
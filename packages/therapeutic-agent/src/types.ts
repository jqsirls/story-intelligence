export interface TherapeuticPathway {
  id: string;
  name: string;
  targetCondition: TherapeuticCondition;
  ageRange: {
    min: number;
    max: number;
  };
  evidenceBase: EvidenceSource[];
  storyElements: TherapeuticStoryElement[];
  progressMarkers: ProgressMarker[];
  parentGuidance: ParentGuidanceProtocol;
  contraindications?: string[];
  requiredConsent: ConsentLevel;
}

export type TherapeuticCondition = 
  | 'anxiety'
  | 'grief'
  | 'social_skills'
  | 'self_esteem'
  | 'trauma'
  | 'adhd'
  | 'autism'
  | 'depression'
  | 'anger_management'
  | 'separation_anxiety'
  | 'school_refusal'
  | 'bullying'
  | 'family_changes'
  | 'medical_procedures'
  | 'sleep_difficulties';

export interface EvidenceSource {
  type: 'research_study' | 'clinical_guideline' | 'expert_consensus' | 'meta_analysis';
  title: string;
  authors: string[];
  year: number;
  doi?: string;
  summary: string;
  relevanceScore: number; // 0-1
}

export interface TherapeuticStoryElement {
  type: 'character_trait' | 'plot_device' | 'metaphor' | 'coping_strategy' | 'resolution_pattern';
  name: string;
  description: string;
  therapeuticPurpose: string;
  ageAdaptations: Record<string, string>; // age range -> adaptation
  culturalConsiderations: string[];
  contraindications?: string[];
}

export interface ProgressMarker {
  id: string;
  name: string;
  description: string;
  measurableOutcome: string;
  timeframe: string; // e.g., "after 3 sessions", "within 2 weeks"
  assessmentMethod: 'parent_report' | 'child_self_report' | 'behavioral_observation' | 'story_interaction_analysis';
  targetValue: number | string;
  criticalThreshold?: number | string; // When to escalate
}

export interface ParentGuidanceProtocol {
  preStoryBriefing: string;
  postStoryDiscussion: string[];
  warningSignsToWatch: string[];
  followUpActivities: string[];
  whenToSeekProfessionalHelp: string[];
  resourceLinks: ResourceLink[];
}

export interface ResourceLink {
  title: string;
  url: string;
  type: 'article' | 'video' | 'professional_directory' | 'crisis_hotline' | 'book_recommendation';
  ageAppropriate: boolean;
}

export type ConsentLevel = 'standard' | 'enhanced' | 'clinical' | 'crisis_intervention';

export interface TherapeuticSession {
  id: string;
  userId: string;
  pathwayId: string;
  sessionNumber: number;
  startTime: Date;
  endTime?: Date;
  storyId?: string;
  emotionalState: {
    pre: EmotionalAssessment;
    post?: EmotionalAssessment;
  };
  progressMarkers: ProgressMarkerResult[];
  parentNotifications: ParentNotification[];
  clinicalNotes?: string;
  nextSessionRecommendations: string[];
}

export interface EmotionalAssessment {
  mood: string;
  anxiety: number; // 1-10 scale
  confidence: number; // 1-10 scale
  engagement: number; // 1-10 scale
  copingSkillsUsed: string[];
  triggerEvents?: string[];
  assessmentMethod: 'voice_analysis' | 'interaction_patterns' | 'direct_questioning' | 'parent_report';
  timestamp: Date;
}

export interface ProgressMarkerResult {
  markerId: string;
  achieved: boolean;
  value: number | string;
  notes: string;
  timestamp: Date;
}

export interface ParentNotification {
  type: 'progress_update' | 'concern_alert' | 'session_summary' | 'resource_recommendation' | 'crisis_alert';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  actionRequired: boolean;
  resources?: ResourceLink[];
  timestamp: Date;
  delivered: boolean;
}

export interface CrisisIndicator {
  type: 'verbal_expression' | 'behavioral_pattern' | 'emotional_escalation' | 'safety_concern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  context: string;
  immediateResponse: string;
  escalationRequired: boolean;
  mandatoryReporting: boolean;
}

export interface TherapeuticOutcome {
  sessionId: string;
  pathwayId: string;
  userId: string;
  measuredAt: Date;
  outcomes: {
    [markerId: string]: {
      baseline: number | string;
      current: number | string;
      improvement: number; // percentage
      clinicallySignificant: boolean;
    };
  };
  overallProgress: 'declining' | 'stable' | 'improving' | 'significant_improvement';
  recommendedActions: string[];
  professionalReferralNeeded: boolean;
}

export interface TraumaInformedApproach {
  safetyFirst: boolean;
  trustworthiness: boolean;
  peerSupport: boolean;
  collaboration: boolean;
  empowerment: boolean;
  culturalHumility: boolean;
  genderResponsive: boolean;
}

export interface ADHDAdaptation {
  shortenedSessions: boolean;
  frequentBreaks: boolean;
  visualCues: boolean;
  movementIntegration: boolean;
  clearStructure: boolean;
  immediateRewards: boolean;
  sensoryConsiderations: string[];
}

export interface AutismAdaptation {
  predictableRoutines: boolean;
  sensoryAccommodations: string[];
  visualSupports: boolean;
  socialStoryFormat: boolean;
  specialInterests: string[];
  communicationStyle: 'direct' | 'metaphorical' | 'concrete';
  transitionSupport: boolean;
}

export interface TherapeuticStoryRequest {
  userId: string;
  pathwayId: string;
  sessionNumber: number;
  currentEmotionalState: EmotionalAssessment;
  previousProgress: ProgressMarkerResult[];
  parentConcerns?: string[];
  clinicalGoals: string[];
  adaptations: {
    adhd?: ADHDAdaptation;
    autism?: AutismAdaptation;
    trauma?: TraumaInformedApproach;
  };
}

export interface TherapeuticStoryResponse {
  storyId: string;
  pathway: TherapeuticPathway;
  storyContent: {
    title: string;
    characters: any[];
    plot: string;
    therapeuticElements: TherapeuticStoryElement[];
    copingStrategies: string[];
    discussionPrompts: string[];
  };
  expectedOutcomes: string[];
  parentGuidance: ParentGuidanceProtocol;
  followUpRecommendations: string[];
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    mitigations: string[];
  };
}
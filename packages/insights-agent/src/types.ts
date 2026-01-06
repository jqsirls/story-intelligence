import { Mood, EmotionPattern } from '@alexa-multi-agent/shared-types';

// Pattern Analysis Types
export interface PatternAnalysisRequest {
  userId: string;
  libraryId?: string;
  timeRange: DateRange;
  analysisTypes: AnalysisType[];
}

export interface PatternAnalysisResult {
  userId: string;
  libraryId?: string;
  timeRange: DateRange;
  emotionalPatterns: EmotionalPatternInsight[];
  interestPatterns: InterestPattern[];
  behavioralPatterns: BehavioralPattern[];
  storyPreferences: StoryPreferencePattern[];
  readingHabits: ReadingHabitPattern[];
  confidence: number;
  generatedAt: string;
}

export type AnalysisType = 
  | 'emotional' 
  | 'interests' 
  | 'behavioral' 
  | 'story_preferences' 
  | 'reading_habits';

export interface DateRange {
  start: string;
  end: string;
}

// Emotional Pattern Analysis
export interface EmotionalPatternInsight {
  pattern: EmotionPattern;
  insights: string[];
  trends: EmotionalTrend[];
  recommendations: EmotionalRecommendation[];
  riskFactors: RiskFactor[];
}

export interface EmotionalTrend {
  period: 'daily' | 'weekly' | 'monthly';
  direction: 'improving' | 'stable' | 'declining';
  mood: Mood;
  confidence: number;
  significance: 'low' | 'medium' | 'high';
}

export interface EmotionalRecommendation {
  type: 'story_type' | 'activity' | 'parental_attention' | 'professional_help';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionable: boolean;
}

export interface RiskFactor {
  type: 'bullying' | 'social_isolation' | 'anxiety' | 'depression' | 'behavioral_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  indicators: string[];
  recommendations: string[];
  requiresParentalNotification: boolean;
}

// Interest Detection
export interface InterestPattern {
  category: InterestCategory;
  keywords: string[];
  confidence: number;
  frequency: number;
  firstDetected: string;
  lastDetected: string;
  strength: 'emerging' | 'moderate' | 'strong' | 'passionate';
  examples: InterestExample[];
}

export type InterestCategory = 
  | 'sports' 
  | 'animals' 
  | 'science' 
  | 'art' 
  | 'music' 
  | 'technology' 
  | 'nature' 
  | 'adventure' 
  | 'fantasy' 
  | 'friendship' 
  | 'family' 
  | 'learning' 
  | 'creativity';

export interface InterestExample {
  source: 'story_content' | 'character_traits' | 'story_choices' | 'conversation';
  content: string;
  timestamp: string;
  relevanceScore: number;
}

// Behavioral Pattern Analysis
export interface BehavioralPattern {
  type: BehavioralPatternType;
  description: string;
  indicators: BehavioralIndicator[];
  confidence: number;
  timeframe: DateRange;
  severity: 'normal' | 'noteworthy' | 'concerning' | 'urgent';
  recommendations: BehavioralRecommendation[];
}

export type BehavioralPatternType = 
  | 'social_engagement' 
  | 'creativity_expression' 
  | 'problem_solving' 
  | 'emotional_regulation' 
  | 'attention_patterns' 
  | 'communication_style' 
  | 'conflict_resolution' 
  | 'empathy_development';

export interface BehavioralIndicator {
  metric: string;
  value: number;
  threshold: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  significance: 'low' | 'medium' | 'high';
}

export interface BehavioralRecommendation {
  action: string;
  rationale: string;
  targetAudience: 'child' | 'parent' | 'educator';
  urgency: 'low' | 'medium' | 'high';
  followUpRequired: boolean;
}

// Story Preference Analysis
export interface StoryPreferencePattern {
  storyType: string;
  preference: 'loves' | 'likes' | 'neutral' | 'dislikes' | 'avoids';
  frequency: number;
  completionRate: number;
  engagementScore: number;
  themes: ThemePreference[];
  characters: CharacterPreference[];
  settings: SettingPreference[];
}

export interface ThemePreference {
  theme: string;
  affinity: number; // -1 to 1
  examples: string[];
}

export interface CharacterPreference {
  characterType: string;
  traits: string[];
  affinity: number; // -1 to 1
  examples: string[];
}

export interface SettingPreference {
  setting: string;
  affinity: number; // -1 to 1
  examples: string[];
}

// Reading/Listening Habit Analysis
export interface ReadingHabitPattern {
  libraryId: string;
  totalSessions: number;
  averageSessionDuration: number;
  preferredTimeOfDay: TimeOfDayPreference[];
  sessionFrequency: SessionFrequency;
  attentionSpan: AttentionSpanAnalysis;
  interactionStyle: InteractionStyleAnalysis;
  progressionPatterns: ProgressionPattern[];
}

export interface TimeOfDayPreference {
  timeSlot: 'morning' | 'afternoon' | 'evening' | 'night';
  frequency: number;
  engagementLevel: number;
}

export interface SessionFrequency {
  daily: number;
  weekly: number;
  monthly: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface AttentionSpanAnalysis {
  averageMinutes: number;
  variability: number;
  optimalDuration: number;
  factors: AttentionFactor[];
}

export interface AttentionFactor {
  factor: 'story_type' | 'time_of_day' | 'character_engagement' | 'complexity';
  impact: number; // -1 to 1
  confidence: number;
}

export interface InteractionStyleAnalysis {
  participationLevel: 'passive' | 'moderate' | 'active' | 'highly_interactive';
  questionFrequency: number;
  choiceEngagement: number;
  creativityExpression: number;
}

export interface ProgressionPattern {
  skill: 'vocabulary' | 'comprehension' | 'creativity' | 'emotional_intelligence';
  progression: 'regressing' | 'stable' | 'improving' | 'accelerating';
  confidence: number;
  evidence: string[];
}

// External Recommendation Types (for task 10.2)
export interface ExternalRecommendation {
  id: string;
  type: 'product' | 'educational_resource' | 'activity' | 'book' | 'app';
  title: string;
  description: string;
  url?: string;
  price?: number;
  ageRange: AgeRange;
  relevanceScore: number;
  basedOnInterests: string[];
  source: RecommendationSource;
  metadata: Record<string, any>;
}

export interface AgeRange {
  min: number;
  max: number;
}

export type RecommendationSource = 'amazon' | 'educational_sites' | 'library_resources' | 'curated_content';

export interface RecommendationFilter {
  minRelevanceScore: number;
  maxPrice?: number;
  ageRange?: AgeRange;
  categories?: InterestCategory[];
  sources?: RecommendationSource[];
}

// Parental Notification Types
export interface ParentalNotification {
  id: string;
  userId: string;
  libraryId: string;
  type: NotificationType;
  severity: 'info' | 'attention' | 'concern' | 'urgent';
  title: string;
  message: string;
  insights: string[];
  recommendations: string[];
  actionRequired: boolean;
  createdAt: string;
  readAt?: string;
  acknowledgedAt?: string;
}

export type NotificationType = 
  | 'pattern_discovery' 
  | 'behavioral_change' 
  | 'emotional_concern' 
  | 'developmental_milestone' 
  | 'interest_emergence' 
  | 'risk_factor_detected';

// Service Interfaces
export interface PatternAnalysisService {
  analyzeEmotionalPatterns(userId: string, libraryId?: string, timeRange?: DateRange): Promise<EmotionalPatternInsight[]>;
  detectRiskFactors(userId: string, libraryId?: string, timeRange?: DateRange): Promise<RiskFactor[]>;
}

export interface InterestDetectionService {
  detectInterests(userId: string, libraryId?: string, timeRange?: DateRange): Promise<InterestPattern[]>;
  categorizeInterests(interests: InterestPattern[]): Promise<Map<InterestCategory, InterestPattern[]>>;
}

export interface BehavioralAnalysisService {
  analyzeBehavioralPatterns(userId: string, libraryId?: string, timeRange?: DateRange): Promise<BehavioralPattern[]>;
  assessSocialEngagement(userId: string, libraryId?: string, timeRange?: DateRange): Promise<BehavioralPattern>;
}

export interface StoryPreferenceService {
  analyzeStoryPreferences(userId: string, libraryId?: string, timeRange?: DateRange): Promise<StoryPreferencePattern[]>;
  predictStoryRecommendations(preferences: StoryPreferencePattern[]): Promise<string[]>;
}

export interface ReadingHabitService {
  analyzeReadingHabits(userId: string, libraryId: string, timeRange?: DateRange): Promise<ReadingHabitPattern>;
  assessAttentionPatterns(userId: string, libraryId: string, timeRange?: DateRange): Promise<AttentionSpanAnalysis>;
}

// Configuration Types
export interface InsightsConfig {
  database: {
    url: string;
    apiKey: string;
  };
  redis: {
    url: string;
    keyPrefix: string;
  };
  analysis: {
    defaultTimeRange: number; // days
    minDataPoints: number;
    confidenceThreshold: number;
  };
  notifications: {
    enabled: boolean;
    riskFactorThreshold: number;
    emailService?: {
      apiKey: string;
      fromEmail: string;
    };
  };
  external: {
    amazon?: {
      apiKey: string;
      associateTag: string;
    };
    educational?: {
      sources: string[];
    };
  };
}
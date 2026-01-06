/**
 * Fieldnotes (User Research Agent) - Type Definitions
 * Comprehensive types for multi-tenant research intelligence system
 */

// ============================================================================
// Core Configuration Types
// ============================================================================

export interface TenantConfig {
  tenantId: string;
  dataSources: DataSource[];
  personas: {
    buyer: BuyerPersona;
    endUser: EndUserPersona;
  };
  brandVoice: BrandVoice;
  tracks: TrackType[];
  delivery: DeliveryConfig;
  models: ModelConfig;
}

export interface DataSource {
  type: 'supabase' | 'segment' | 'mixpanel' | 'webhook';
  tables?: string[];
  apiKey?: string;
  webhookUrl?: string;
}

export interface BuyerPersona {
  name: string;
  priorities: string[];
  painPoints: string[];
  contextualFactors: string[];
}

export interface EndUserPersona {
  name: string;
  priorities: string[];
  painPoints: string[];
}

export interface BrandVoice {
  tone: string;
  avoid: string[];
  examples: Array<{ good: string; bad: string }>;
}

export type TrackType =
  | 'continuous_insight_mining'
  | 'buyer_reality_check'
  | 'user_experience_guardrails'
  | 'concept_interrogation'
  | 'brand_consistency';

export interface DeliveryConfig {
  slack?: SlackConfig;
  email?: EmailConfig;
  webhook?: WebhookConfig;
}

export interface SlackConfig {
  enabled: boolean;
  webhookUrl: string;
  channel: string;
  schedule: string;
  alertSeverities: AlertSeverity[];
}

export interface EmailConfig {
  enabled: boolean;
  recipients: string[];
  format?: 'html' | 'text';
}

export interface WebhookConfig {
  enabled: boolean;
  url: string;
  events?: WebhookEventType[];
}

export type WebhookEventType =
  | 'new_insight'
  | 'weekly_brief'
  | 'critical_finding'
  | 'pre_launch_memo';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ModelConfig {
  primary: string; // 'gpt-4o-mini'
  critique: string; // 'claude-haiku'
  synthesis: string; // 'claude-sonnet'
  costLimit: number; // monthly budget in dollars
}

// ============================================================================
// Analysis & Insight Types
// ============================================================================

export interface TrackEvaluation {
  trackName: TrackType;
  currentState: 'healthy' | 'concerning' | 'critical';
  evidence: Evidence[];
  tensions: Tension[];
  recommendations: Recommendation[];
  timestamp: Date;
}

export interface Evidence {
  metric: string;
  value: number | string;
  historicalValue?: number | string;
  percentChange?: number;
  source: string;
  sampleSize?: number;
}

export interface Tension {
  description: string;
  conflictingPriorities: string[];
  forceChoiceBy: Date;
  costOfInaction: string;
}

export interface Recommendation {
  action: string;
  rationale: string;
  urgency: AlertSeverity;
  estimatedImpact?: string;
  estimatedEffort?: 'low' | 'medium' | 'high';
}

export interface Insight {
  id: string;
  tenantId: string;
  trackType: TrackType;
  finding: string;
  evidence: Evidence[];
  recommendation: string;
  severity: AlertSeverity;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface Pattern {
  type: string;
  description: string;
  frequency: number;
  affectedUsers: number;
  confidence: number;
  examples: any[];
}

// ============================================================================
// Brief & Memo Types
// ============================================================================

export interface Brief {
  id: string;
  tenantId: string;
  weekOf: Date;
  critical: CriticalSection | null;
  tensions: Tension[];
  opportunities: Opportunity[];
  killList: KillListItem[];
  realityCheck: RealityCheckSummary;
  whatWeShipped: ShippedFeatureSummary[];
  selfDeception: SelfDeceptionAlert | null;
  deliveredAt?: Date;
  format: 'markdown' | 'json';
  content: string;
}

export interface CriticalSection {
  finding: string;
  evidence: Evidence[];
  impact: string;
  recommendation: string;
  costOfInaction: string;
}

export interface Opportunity {
  description: string;
  evidence: Evidence[];
  potentialValue: string;
  nextSteps: string[];
}

export interface KillListItem {
  feature: string;
  reason: string;
  usage: string;
  recommendation: string;
}

export interface RealityCheckSummary {
  buyerTrack: { status: string; keyFinding: string };
  userTrack: { status: string; keyFinding: string };
  brandTrack: { status: string; keyFinding: string };
}

export interface ShippedFeatureSummary {
  feature: string;
  shippedDate: Date;
  expectedImpact: string;
  actualImpact: string;
  verdict: 'success' | 'mixed' | 'failure' | 'too_early';
}

export interface SelfDeceptionAlert {
  claim: string;
  reality: string;
  evidence: Evidence[];
  recommendation: string;
}

export interface PreLaunchMemo {
  id: string;
  tenantId: string;
  featureName: string;
  concept: string;
  reality: string;
  whoIsThisFor: WhoAnalysis;
  whenWouldTheyQuit: AbandonmentRisk[];
  whatWillConfuse: UXConfusion[];
  buyerLens: BuyerLensAnalysis;
  userLens: UserLensAnalysis;
  languageAudit: LanguageAuditResult;
  tensionMap: Tension[];
  recommendation: 'ship' | 'dont_ship' | 'fix_first';
  confidence: number;
  createdAt: Date;
}

export interface WhoAnalysis {
  stated: string;
  evidenceBacked: boolean;
  actualData?: Evidence[];
  assumptions: string[];
}

export interface AbandonmentRisk {
  scenario: string;
  probability: 'low' | 'medium' | 'high';
  mitigation?: string;
}

export interface UXConfusion {
  moment: string;
  issue: string;
  severity: AlertSeverity;
}

export interface BuyerLensAnalysis {
  trustFactors: Array<{ factor: string; status: 'positive' | 'neutral' | 'concerning' }>;
  timeCommitment: string;
  valuePerception: string;
}

export interface UserLensAnalysis {
  delightFactors: Array<{ factor: string; rating: number }>;
  cognitiveLoad: 'low' | 'medium' | 'high';
  emotionalTone: string;
}

export interface LanguageAuditResult {
  flags: Array<{
    type: 'generic' | 'unclear_cta' | 'promise_gap' | 'off_brand';
    text: string;
    suggestion?: string;
  }>;
}

// ============================================================================
// Agent Challenge Types
// ============================================================================

export interface AgentChallenge {
  id: string;
  tenantId: string;
  challengedAgent: string;
  question: string;
  dataBacking: Evidence[];
  agentResponse?: string;
  synthesis: string;
  actionable: boolean;
  createdAt: Date;
}

// ============================================================================
// Cost Tracking Types
// ============================================================================

export interface CostTracking {
  tenantId: string;
  period: 'month' | 'week' | 'day';
  periodStart: Date;
  periodEnd: Date;
  eventsProcessed: number;
  llmTokensUsed: {
    'gpt-4o-mini': number;
    'claude-haiku': number;
    'claude-sonnet': number;
  };
  analysesGenerated: number;
  estimatedCost: number;
  costLimit: number;
  status: 'normal' | 'warning' | 'throttled' | 'blocked';
}

export interface UsageMetrics {
  timestamp: Date;
  operation: string;
  model: string;
  tokensUsed: number;
  cost: number;
  duration: number;
}

// ============================================================================
// Event & Analysis Request Types
// ============================================================================

export interface Event {
  id: string;
  event_id: string;
  event_type: string;
  source: string;
  event_time: Date;
  data: Record<string, any>;
  correlation_id?: string;
  user_id?: string;
  session_id?: string;
  agent_name?: string;
}

export interface AnalysisRequest {
  tenantId: string;
  timeframe: string;
  focus?: 'buyer' | 'user' | 'all';
  events?: Event[];
  tracks?: TrackType[];
}

export interface AnalysisResult {
  insights: Insight[];
  patterns: Pattern[];
  trackEvaluations: TrackEvaluation[];
  costUsed: number;
  generatedAt: Date;
}

// ============================================================================
// Feature & Concept Types
// ============================================================================

export interface Feature {
  name: string;
  description: string;
  targetAudience: string;
  successMetrics: string[];
  estimatedEffort?: string;
  prUrl?: string;
}

// ============================================================================
// User Experience Evaluation Types
// ============================================================================

export interface UserExperienceEvaluation {
  status: 'healthy' | 'concerning' | 'critical';
  findings: string[];
  evidence: Evidence[];
  recommendation: string;
  urgency: AlertSeverity;
}

export interface BehavioralData {
  metric: string;
  value: any;
  timestamp: Date;
  userSegment?: string;
}

// ============================================================================
// Cache Types
// ============================================================================

export interface CachedInsight {
  key: string;
  insight: Insight;
  metricValue: number;
  computedAt: Date;
  expiresAt: Date;
}

// ============================================================================
// Sampling Types
// ============================================================================

export interface SamplingRule {
  eventType: string;
  priority: 'critical' | 'medium' | 'low';
  samplingRate: number;
  adaptiveThreshold?: number;
}

// ============================================================================
// API Types
// ============================================================================

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface WebhookPayload {
  event: WebhookEventType;
  tenantId: string;
  data: any;
  timestamp: Date;
  signature?: string;
}

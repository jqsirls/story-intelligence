/**
 * Intelligence Curator
 * 
 * Central orchestrator for event-driven pipelines with veto authority.
 * Decides what's worth showing users - silence is a first-class output.
 * 
 * Principles:
 * - Comparative intelligence over absolute scores
 * - Confidence thresholds enforced
 * - Silence when signal is insufficient
 * - User-type-aware routing
 * - Frequency caps and quiet hours respected
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import { EmailService } from './EmailService';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface PipelineEvent {
  type: string;
  userId: string;
  profileId?: string;
  data: Record<string, any>;
  triggeredAt: Date;
  correlationId?: string;
}

export interface CurationDecision {
  execute: boolean;
  confidence: number;
  reasoning: string;
  vetoReason?: VetoReason;
  recommendations?: string[];
}

export type VetoReason = 
  | 'INSUFFICIENT_SIGNAL'
  | 'LOW_CONFIDENCE'
  | 'NOISE_REDUCTION'
  | 'FREQUENCY_CAP'
  | 'QUIET_HOURS'
  | 'CONSOLIDATION_PENDING'
  | 'SLA_MISSED'
  | 'KILL_SWITCH_ACTIVE';

export interface PipelineConfig {
  name: string;
  type: string;
  minConfidence: number;
  minSignalCount: number;
  frequencyCapDaily?: number;
  frequencyCapWeekly?: number;
  emotionalSLA?: number; // Minutes
  enabled: boolean;
}

export interface ComparativeInsight {
  subject: string;
  context: string;
  comparedTo: string[];
  improvements: Array<{
    metric: string;
    delta: number;
    baseline: number;
    interpretation: string;
  }>;
  recommendation: string;
  confidence: number;
}

// ============================================================================
// Pipeline Configurations
// ============================================================================

const PIPELINE_CONFIGS: Record<string, PipelineConfig> = {
  // Emotional pipelines
  'crisis_alert': {
    name: 'Crisis Alert',
    type: 'emotional',
    minConfidence: 0.9, // Very high bar for crisis
    minSignalCount: 1, // Immediate
    emotionalSLA: 5, // 5 minutes
    enabled: true
  },
  'early_intervention': {
    name: 'Early Intervention Alert',
    type: 'emotional',
    minConfidence: 0.7,
    minSignalCount: 3, // 3+ days negative
    emotionalSLA: 120, // 2 hours
    enabled: true
  },
  'therapeutic_suggestion': {
    name: 'Therapeutic Pathway Suggestion',
    type: 'emotional',
    minConfidence: 0.8,
    minSignalCount: 5, // 5+ day pattern
    emotionalSLA: 1440, // 24 hours
    enabled: true
  },
  'positive_celebration': {
    name: 'Positive Momentum Celebration',
    type: 'emotional',
    minConfidence: 0.7,
    minSignalCount: 7, // 7+ days positive
    emotionalSLA: 1440, // 24 hours
    enabled: true
  },
  
  // Insight pipelines
  'daily_digest': {
    name: 'Daily Consumption Digest',
    type: 'insight',
    minConfidence: 0.6,
    minSignalCount: 2, // 2+ events today
    frequencyCapDaily: 1,
    enabled: true
  },
  'weekly_insights': {
    name: 'Weekly Insights Report',
    type: 'insight',
    minConfidence: 0.7,
    minSignalCount: 3, // 3+ activities this week
    frequencyCapWeekly: 1,
    enabled: true
  },
  
  // Asset pipelines
  'story_complete': {
    name: 'Story Complete Notification',
    type: 'transactional',
    minConfidence: 1.0, // Always send
    minSignalCount: 1,
    enabled: true
  },
  'story_failure': {
    name: 'Graceful Asset Failure',
    type: 'transactional',
    minConfidence: 1.0, // Always send
    minSignalCount: 1,
    emotionalSLA: 60, // 1 hour
    enabled: true
  },
  
  // Referral pipelines
  'referral_reward': {
    name: 'Referral Reward Issued',
    type: 'transactional',
    minConfidence: 1.0,
    minSignalCount: 1,
    enabled: true
  },
  
  // B2B pipelines
  'org_health': {
    name: 'Organization Health Report',
    type: 'insight',
    minConfidence: 0.7,
    minSignalCount: 1,
    frequencyCapWeekly: 1,
    enabled: true
  }
};

// ============================================================================
// Intelligence Curator Service
// ============================================================================

export class IntelligenceCurator {
  private ssmCache: Map<string, { value: string; expiry: number }> = new Map();
  private readonly SSM_CACHE_TTL = 300000; // 5 minutes
  
  constructor(
    private supabase: SupabaseClient,
    private emailService: EmailService,
    private logger: Logger
  ) {}
  
  /**
   * Main curate method - decides if pipeline should execute
   */
  async curate(event: PipelineEvent): Promise<CurationDecision> {
    this.logger.info('Curating pipeline event', {
      eventType: event.type,
      userId: event.userId,
      correlationId: event.correlationId
    });
    
    const config = PIPELINE_CONFIGS[event.type];
    if (!config) {
      return {
        execute: false,
        confidence: 0,
        reasoning: `Unknown pipeline type: ${event.type}`,
        vetoReason: 'INSUFFICIENT_SIGNAL'
      };
    }
    
    // Check kill switch first
    const killSwitchActive = await this.checkKillSwitch(event.type);
    if (killSwitchActive) {
      this.logger.warn('Pipeline disabled via kill switch', {
        pipelineType: event.type
      });
      return {
        execute: false,
        confidence: 0,
        reasoning: 'Pipeline disabled via SSM kill switch',
        vetoReason: 'KILL_SWITCH_ACTIVE'
      };
    }
    
    // Check emotional SLA for time-sensitive pipelines
    if (config.emotionalSLA) {
      const slaMet = await this.checkEmotionalSLA(event, config.emotionalSLA);
      if (!slaMet) {
        return {
          execute: false,
          confidence: 0,
          reasoning: 'Emotional SLA missed - late empathy reads as noise',
          vetoReason: 'SLA_MISSED'
        };
      }
    }
    
    // Check signal count
    const signalCount = event.data.signalCount || 1;
    if (signalCount < config.minSignalCount) {
      return {
        execute: false,
        confidence: signalCount / config.minSignalCount,
        reasoning: `Insufficient signal: ${signalCount} < ${config.minSignalCount}`,
        vetoReason: 'INSUFFICIENT_SIGNAL'
      };
    }
    
    // Check confidence threshold
    const confidence = event.data.confidence || 0;
    if (confidence < config.minConfidence) {
      return {
        execute: false,
        confidence,
        reasoning: `Low confidence: ${confidence} < ${config.minConfidence}`,
        vetoReason: 'LOW_CONFIDENCE'
      };
    }
    
    // Check frequency caps
    const frequencyOk = await this.checkFrequencyCaps(event.userId, event.type, config);
    if (!frequencyOk) {
      return {
        execute: false,
        confidence,
        reasoning: 'Frequency cap exceeded',
        vetoReason: 'FREQUENCY_CAP'
      };
    }
    
    // Check user preferences (quiet hours, category opt-outs)
    const preferencesOk = await this.checkUserPreferences(event.userId, event.type);
    if (!preferencesOk) {
      return {
        execute: false,
        confidence,
        reasoning: 'User preferences or quiet hours prevent sending',
        vetoReason: 'QUIET_HOURS'
      };
    }
    
    // All checks passed - execute pipeline
    return {
      execute: true,
      confidence,
      reasoning: `Signal: ${signalCount}/${config.minSignalCount}, Confidence: ${confidence}/${config.minConfidence}`
    };
  }
  
  /**
   * Route event to appropriate pipeline based on user type
   */
  async routeByUserType(event: PipelineEvent): Promise<string> {
    const { data: user } = await this.supabase
      .from('users')
      .select('user_type')
      .eq('id', event.userId)
      .single();
    
    const userType = user?.user_type || 'other';
    
    // Map event types to user-type-specific variants
    const variantMap: Record<string, Record<string, string>> = {
      'weekly_insights': {
        'parent': 'weekly_insights_parent',
        'teacher': 'weekly_insights_teacher',
        'therapist': 'weekly_insights_therapist',
        'child_life_specialist': 'weekly_insights_specialist',
        'default': 'weekly_insights_parent'
      },
      'story_complete': {
        'child': 'story_complete_child',
        'parent': 'story_complete_parent',
        'teacher': 'story_complete_teacher',
        'therapist': 'story_complete_therapist',
        'default': 'story_complete_parent'
      }
    };
    
    const variants = variantMap[event.type];
    if (variants) {
      return variants[userType] || variants['default'];
    }
    
    return event.type;
  }
  
  /**
   * Generate comparative insights (relative to baseline)
   */
  async generateComparativeInsight(
    userId: string,
    storyId: string,
    context: string
  ): Promise<ComparativeInsight | null> {
    // Get this story's metrics
    const { data: storyMetrics } = await this.supabase
      .from('consumption_metrics')
      .select('*')
      .eq('story_id', storyId)
      .eq('user_id', userId)
      .single();
    
    if (!storyMetrics) {
      return null;
    }
    
    // Get user's baseline (last 5 stories in same context)
    const { data: baselineStories } = await this.supabase
      .from('consumption_metrics')
      .select('*')
      .eq('user_id', userId)
      .neq('story_id', storyId)
      .order('last_read_at', { ascending: false })
      .limit(5);
    
    if (!baselineStories || baselineStories.length === 0) {
      return null;
    }
    
    // Calculate baseline averages
    const avgEngagement = baselineStories.reduce((sum, s) => sum + (s.engagement_score || 0), 0) / baselineStories.length;
    const avgDuration = baselineStories.reduce((sum, s) => sum + (s.total_duration_seconds || 0), 0) / baselineStories.length;
    const avgReplays = baselineStories.reduce((sum, s) => sum + (s.replay_count || 0), 0) / baselineStories.length;
    
    // Calculate deltas
    const engagementDelta = (storyMetrics.engagement_score || 0) - avgEngagement;
    const durationDelta = (storyMetrics.total_duration_seconds || 0) - avgDuration;
    const replaysDelta = (storyMetrics.replay_count || 0) - avgReplays;
    
    // Generate interpretation
    const improvements: ComparativeInsight['improvements'] = [];
    
    if (engagementDelta > 5) {
      improvements.push({
        metric: 'engagement',
        delta: engagementDelta,
        baseline: avgEngagement,
        interpretation: `${engagementDelta.toFixed(0)}% more engaged than usual`
      });
    }
    
    if (durationDelta < -60) { // Fell asleep faster
      improvements.push({
        metric: 'sleep_time',
        delta: durationDelta,
        baseline: avgDuration,
        interpretation: `Fell asleep ${Math.abs(Math.round(durationDelta / 60))} minutes faster`
      });
    }
    
    if (replaysDelta > 0) {
      improvements.push({
        metric: 'replays',
        delta: replaysDelta,
        baseline: avgReplays,
        interpretation: `Replayed ${replaysDelta} more times than usual`
      });
    }
    
    // Only return insight if there are meaningful improvements
    if (improvements.length === 0) {
      return null;
    }
    
    // Get story title
    const { data: story } = await this.supabase
      .from('stories')
      .select('title')
      .eq('id', storyId)
      .single();
    
    const storyTitle = story?.title || 'This story';
    
    // Generate recommendation
    const recommendation = `Create more stories like "${storyTitle}" for ${context}`;
    
    return {
      subject: storyTitle,
      context,
      comparedTo: baselineStories.map(s => s.story_id),
      improvements,
      recommendation,
      confidence: improvements.length >= 2 ? 0.9 : 0.7
    };
  }
  
  /**
   * Execute pipeline (route to appropriate handler)
   */
  async executePipeline(event: PipelineEvent, decision: CurationDecision): Promise<void> {
    // Log execution
    const { data: execution } = await this.supabase
      .from('pipeline_executions')
      .insert({
        pipeline_type: event.type,
        pipeline_name: PIPELINE_CONFIGS[event.type]?.name || event.type,
        user_id: event.userId,
        triggered_by: 'event',
        trigger_data: event.data,
        vetoed: !decision.execute,
        veto_reason: decision.vetoReason,
        confidence_score: decision.confidence,
        status: decision.execute ? 'pending' : 'vetoed',
        started_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (!decision.execute || !execution) {
      return;
    }
    
    try {
      // Route to appropriate handler
      const variant = await this.routeByUserType(event);
      
      switch (variant) {
        case 'daily_digest':
          await this.handleDailyDigest(event);
          break;
        case 'weekly_insights_parent':
        case 'weekly_insights_teacher':
        case 'weekly_insights_therapist':
          await this.handleWeeklyInsights(event, variant);
          break;
        case 'story_complete_parent':
        case 'story_complete_teacher':
        case 'story_complete_child':
          await this.handleStoryComplete(event, variant);
          break;
        case 'crisis_alert':
          await this.handleCrisisAlert(event);
          break;
        default:
          this.logger.warn('Unknown pipeline variant', { variant });
      }
      
      // Mark execution as completed
      await this.supabase
        .from('pipeline_executions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result: { success: true }
        })
        .eq('id', execution.id);
      
    } catch (error) {
      this.logger.error('Pipeline execution failed', {
        executionId: execution.id,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Mark execution as failed
      await this.supabase
        .from('pipeline_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : String(error)
        })
        .eq('id', execution.id);
    }
  }
  
  // ============================================================================
  // Private Helper Methods
  // ============================================================================
  
  private async checkKillSwitch(pipelineType: string): Promise<boolean> {
    try {
      const paramName = `/storytailor-production/pipelines/${pipelineType}/enabled`;
      
      // Check cache first
      const cached = this.ssmCache.get(paramName);
      if (cached && cached.expiry > Date.now()) {
        return cached.value === 'false';
      }
      
      // Fetch from SSM (would use AWS SDK in real implementation)
      // For now, assume enabled unless explicitly disabled
      const value = 'true'; // TODO: Fetch from SSM
      
      this.ssmCache.set(paramName, {
        value,
        expiry: Date.now() + this.SSM_CACHE_TTL
      });
      
      return value !== 'true'; // Disabled if not explicitly 'true'
    } catch (error) {
      this.logger.warn('Failed to check kill switch, assuming enabled', {
        pipelineType,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
  
  private async checkEmotionalSLA(event: PipelineEvent, slaMinutes: number): Promise<boolean> {
    const elapsed = (Date.now() - event.triggeredAt.getTime()) / 60000;
    
    if (elapsed > slaMinutes) {
      this.logger.warn('Emotional SLA missed', {
        pipelineType: event.type,
        elapsed,
        sla: slaMinutes
      });
      return false;
    }
    
    return true;
  }
  
  private async checkFrequencyCaps(
    userId: string,
    pipelineType: string,
    config: PipelineConfig
  ): Promise<boolean> {
    // Check daily cap
    if (config.frequencyCapDaily) {
      const { count } = await this.supabase
        .from('email_delivery_log')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('email_type', pipelineType)
        .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
      if ((count || 0) >= config.frequencyCapDaily) {
        return false;
      }
    }
    
    // Check weekly cap
    if (config.frequencyCapWeekly) {
      const { count } = await this.supabase
        .from('email_delivery_log')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('email_type', pipelineType)
        .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      
      if ((count || 0) >= config.frequencyCapWeekly) {
        return false;
      }
    }
    
    return true;
  }
  
  private async checkUserPreferences(userId: string, pipelineType: string): Promise<boolean> {
    // Use should_send_email function from database
    const { data, error } = await this.supabase
      .rpc('should_send_email', {
        p_user_id: userId,
        p_email_type: pipelineType
      });
    
    if (error) {
      this.logger.error('Failed to check user preferences', { error });
      return true; // Default to allowing
    }
    
    return data === true;
  }
  
  // ============================================================================
  // Pipeline Handlers
  // ============================================================================
  
  private async handleDailyDigest(event: PipelineEvent): Promise<void> {
    // TODO: Implement daily digest handler
    this.logger.info('Daily digest handler', { userId: event.userId });
  }
  
  private async handleWeeklyInsights(event: PipelineEvent, variant: string): Promise<void> {
    // TODO: Implement weekly insights handler
    this.logger.info('Weekly insights handler', { userId: event.userId, variant });
  }
  
  private async handleStoryComplete(event: PipelineEvent, variant: string): Promise<void> {
    // TODO: Implement story complete handler
    this.logger.info('Story complete handler', { userId: event.userId, variant });
  }
  
  private async handleCrisisAlert(event: PipelineEvent): Promise<void> {
    // TODO: Implement crisis alert handler
    this.logger.info('Crisis alert handler', { userId: event.userId });
  }
}


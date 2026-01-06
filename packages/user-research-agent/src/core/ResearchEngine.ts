/**
 * Fieldnotes (User Research Agent) - Core Research Engine
 * Main orchestration class for managing tracks, scheduling, cost tracking, and caching
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createClient as createRedisClient, RedisClientType } from 'redis';
import {
  TenantConfig,
  AnalysisRequest,
  AnalysisResult,
  Insight,
  Brief,
  PreLaunchMemo,
  Feature,
  AgentChallenge,
  TrackEvaluation,
  TrackType,
  Tension
} from '../types';
import { Logger } from '../utils/logger';
import { ContinuousInsightMining } from './tracks/ContinuousInsightMining';
import { BuyerRealityCheck } from './tracks/BuyerRealityCheck';
import { UserExperienceGuardrails } from './tracks/UserExperienceGuardrails';
import { ConceptInterrogation } from './tracks/ConceptInterrogation';
import { BrandConsistency } from './tracks/BrandConsistency';
import { ModelOrchestrator } from './ModelOrchestrator';
import { BatchProcessor } from './BatchProcessor';
import { SmartSampler } from './SmartSampler';
import { CostController } from './CostController';
import { TruthTeller } from './TruthTeller';
import { TensionMapper } from './TensionMapper';
import { AgentChallenger } from './AgentChallenger';
import { EventCollector } from './EventCollector';
import { SlackAdapter } from '../integrations/SlackAdapter';
import { EmailAdapter } from '../integrations/EmailAdapter';
import { WebhookAdapter } from '../integrations/WebhookAdapter';

export class ResearchEngine {
  private supabase: SupabaseClient;
  private redis: RedisClientType;
  private logger: Logger;
  private tenantConfigs: Map<string, TenantConfig> = new Map();
  private modelOrchestrator: ModelOrchestrator;
  private batchProcessor: BatchProcessor;
  private smartSampler: SmartSampler;
  private costController: CostController;
  private truthTeller: TruthTeller;
  private tensionMapper: TensionMapper;
  private agentChallenger: AgentChallenger;
  private eventCollector: EventCollector;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    redisUrl: string
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.redis = createRedisClient({ url: redisUrl });
    this.logger = new Logger('ResearchEngine');
    
    // Initialize components
    this.modelOrchestrator = new ModelOrchestrator();
    this.batchProcessor = new BatchProcessor(this.supabase, this.redis);
    this.smartSampler = new SmartSampler();
    this.costController = new CostController(this.supabase);
    this.truthTeller = new TruthTeller(this.supabase, this.modelOrchestrator);
    this.tensionMapper = new TensionMapper();
    this.agentChallenger = new AgentChallenger(this.supabase, this.modelOrchestrator);
    this.eventCollector = new EventCollector(this.supabase);
  }

  /**
   * Initialize the engine and connect to services
   */
  async initialize(): Promise<void> {
    try {
      await this.redis.connect();
      await this.loadTenantConfigs();
      this.logger.info('ResearchEngine initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize ResearchEngine', error);
      throw error;
    }
  }

  /**
   * Shut down the engine gracefully
   */
  async shutdown(): Promise<void> {
    await this.redis.disconnect();
    this.logger.info('ResearchEngine shut down');
  }

  /**
   * Load tenant configurations from database
   */
  private async loadTenantConfigs(): Promise<void> {
    const { data: tenants, error } = await this.supabase
      .from('research_tenants')
      .select('*')
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to load tenant configs: ${error.message}`);
    }

    if (tenants) {
      for (const tenant of tenants) {
        this.tenantConfigs.set(tenant.tenant_id, tenant.config);
      }
      this.logger.info(`Loaded ${tenants.length} tenant configuration(s)`);
    }
  }

  /**
   * Run scheduled analysis (hourly, daily, or weekly)
   */
  async runScheduledAnalysis(
    tenantId: string,
    schedule: 'hourly' | 'daily' | 'weekly'
  ): Promise<void> {
    this.logger.info(`Running ${schedule} scheduled analysis for tenant ${tenantId}`);

    try {
      switch (schedule) {
        case 'hourly':
          await this.runHourlyAggregation(tenantId);
          break;
        case 'daily':
          await this.runDailyPatternDetection(tenantId);
          break;
        case 'weekly':
          await this.generateWeeklyBrief(tenantId);
          break;
      }
    } catch (error) {
      this.logger.error(`Failed ${schedule} analysis for tenant ${tenantId}`, error);
      throw error;
    }
  }

  /**
   * Hourly aggregation (no LLM, just SQL)
   */
  private async runHourlyAggregation(tenantId: string): Promise<void> {
    this.logger.info(`Running hourly aggregation for tenant ${tenantId}`);
    await this.batchProcessor.runHourlyAggregation(tenantId);
  }

  /**
   * Daily pattern detection (uses cheap LLM)
   */
  private async runDailyPatternDetection(tenantId: string): Promise<void> {
    this.logger.info(`Running daily pattern detection for tenant ${tenantId}`);
    await this.batchProcessor.runDailyPatternDetection(tenantId);
  }

  /**
   * Generate weekly brief
   */
  async generateWeeklyBrief(tenantId: string): Promise<Brief> {
    this.logger.info(`Generating weekly brief for tenant ${tenantId}`);

    const config = this.tenantConfigs.get(tenantId);
    if (!config) {
      throw new Error(`Tenant config not found: ${tenantId}`);
    }

    // Check cost limits before expensive operation
    const costStatus = await this.checkCostLimit(tenantId);
    if (costStatus.status === 'blocked') {
      throw new Error(`Cost limit exceeded for tenant ${tenantId}`);
    }

    const startTime = Date.now();

    // Run all enabled tracks
    const trackEvaluations = await this.runAllTracks(tenantId, config);

    // Synthesize brief (expensive Claude Sonnet call)
    const brief = await this.synthesizeBrief(tenantId, trackEvaluations);

    // Record cost
    const duration = Date.now() - startTime;
    await this.recordUsage(tenantId, 'weekly_brief', 'claude-sonnet', 50000, 2.5, duration);

    // Store in database
    await this.saveBrief(brief);

    // Deliver brief
    await this.deliverBrief(brief, config);

    this.logger.info(`Weekly brief generated and delivered for tenant ${tenantId}`);
    return brief;
  }

  /**
   * Generate pre-launch memo for a feature
   */
  async generatePreLaunchMemo(
    tenantId: string,
    feature: Feature
  ): Promise<PreLaunchMemo> {
    this.logger.info(`Generating pre-launch memo for feature: ${feature.name}`);

    const config = this.tenantConfigs.get(tenantId);
    if (!config) {
      throw new Error(`Tenant config not found: ${tenantId}`);
    }

    // Check cost limits
    const costStatus = await this.checkCostLimit(tenantId);
    if (costStatus.status === 'blocked') {
      throw new Error(`Cost limit exceeded for tenant ${tenantId}`);
    }

    // Run concept interrogation track
    const conceptTrack = new ConceptInterrogation(
      this.supabase,
      config.personas.buyer,
      config.personas.endUser
    );

    const memo = await conceptTrack.generatePreLaunchMemo(tenantId, feature);

    return memo;
  }

  /**
   * On-demand analysis
   */
  async analyzeOnDemand(request: AnalysisRequest): Promise<AnalysisResult> {
    this.logger.info(`Running on-demand analysis for tenant ${request.tenantId}`);

    const costStatus = await this.checkCostLimit(request.tenantId);
    if (costStatus.status === 'blocked') {
      throw new Error(`Cost limit exceeded for tenant ${request.tenantId}`);
    }

    const config = this.tenantConfigs.get(request.tenantId);
    if (!config) {
      throw new Error(`Tenant config not found: ${request.tenantId}`);
    }

    const tracksToRun = request.tracks || config.tracks;
    const trackEvaluations = await this.runSelectedTracks(
      request.tenantId,
      config,
      tracksToRun
    );

    const insights: Insight[] = [];
    for (const evaluation of trackEvaluations) {
      for (const evidence of evaluation.evidence) {
        insights.push({
          id: crypto.randomUUID(),
          tenantId: request.tenantId,
          trackType: evaluation.trackName,
          finding: `${evidence.metric}: ${evidence.value}`,
          evidence: [evidence],
          recommendation: evaluation.recommendations[0]?.action || '',
          severity: evaluation.currentState === 'critical' ? 'critical' : 'medium',
          createdAt: new Date()
        });
      }
    }

    return {
      insights,
      patterns: [],
      trackEvaluations,
      costUsed: 0.5, // Estimate
      generatedAt: new Date()
    };
  }

  /**
   * Challenge another agent
   */
  async challengeAgent(
    tenantId: string,
    agentName: string,
    question: string
  ): Promise<AgentChallenge> {
    this.logger.info(`Challenging agent ${agentName} for tenant ${tenantId}`);

    // Get data backing for the challenge
    const config = this.tenantConfigs.get(tenantId);
    if (!config) {
      throw new Error(`Tenant config not found: ${tenantId}`);
    }

    // Collect relevant events/data
    const events = await this.eventCollector.collectEvents(config.dataSources, '7 days');
    const dataBacking = events.slice(0, 10).map(e => ({
      metric: e.event_type,
      value: 1,
      source: 'event_store'
    }));

    // Use AgentChallenger to synthesize the challenge
    const challenge = await this.agentChallenger.challengeAgent(
      tenantId,
      agentName,
      question,
      dataBacking
    );

    return challenge;
  }

  /**
   * Run all enabled tracks for a tenant
   */
  private async runAllTracks(
    tenantId: string,
    config: TenantConfig
  ): Promise<TrackEvaluation[]> {
    return this.runSelectedTracks(tenantId, config, config.tracks);
  }

  /**
   * Run selected tracks
   */
  private async runSelectedTracks(
    tenantId: string,
    config: TenantConfig,
    tracks: TrackType[]
  ): Promise<TrackEvaluation[]> {
    const evaluations: TrackEvaluation[] = [];
    const configDataSources = config.dataSources || [];

    // Collect events once for all tracks
    const events = await this.eventCollector.collectEvents(configDataSources, '7 days');

    for (const trackType of tracks) {
      let evaluation: TrackEvaluation;

      switch (trackType) {
        case 'continuous_insight_mining': {
          const track = new ContinuousInsightMining(this.supabase);
          evaluation = await track.run(tenantId, '7 days');
          break;
        }
        case 'buyer_reality_check': {
          const track = new BuyerRealityCheck(this.supabase, config.personas.buyer);
          evaluation = await track.run(tenantId, '7 days');
          break;
        }
        case 'user_experience_guardrails': {
          const track = new UserExperienceGuardrails(this.supabase, config.personas.endUser);
          evaluation = await track.run(tenantId, '7 days');
          break;
        }
        case 'concept_interrogation': {
          // Concept interrogation is triggered on-demand, not in scheduled runs
          evaluation = {
            trackName: trackType,
            currentState: 'healthy',
            evidence: [],
            tensions: [],
            recommendations: [],
            timestamp: new Date()
          };
          break;
        }
        case 'brand_consistency': {
          const track = new BrandConsistency(this.supabase, config.brandVoice);
          evaluation = await track.run(tenantId);
          break;
        }
        default:
          evaluation = {
            trackName: trackType,
            currentState: 'healthy',
            evidence: [],
            tensions: [],
            recommendations: [],
            timestamp: new Date()
          };
      }

      evaluations.push(evaluation);
    }

    return evaluations;
  }

  /**
   * Synthesize brief from track evaluations
   */
  private async synthesizeBrief(
    tenantId: string,
    trackEvaluations: TrackEvaluation[]
  ): Promise<Brief> {
    // Identify tensions across tracks
    const tensions = this.tensionMapper.identifyTensions(trackEvaluations);
    
    // Detect self-deception
    const selfDeception = await this.truthTeller.detectSelfDeception(tenantId);

    // Find critical findings
    const criticalTrack = trackEvaluations.find(t => t.currentState === 'critical');
    const critical = criticalTrack ? {
      finding: criticalTrack.recommendations[0]?.action || 'Critical issue detected',
      evidence: criticalTrack.evidence.slice(0, 3),
      impact: 'High - requires immediate attention',
      recommendation: criticalTrack.recommendations[0]?.action || 'Investigate immediately',
      costOfInaction: 'TBD'
    } : null;

    // Generate brief content using Claude Sonnet
    const briefPrompt = this.formatBriefPrompt(trackEvaluations, tensions, selfDeception);
    const briefResult = await this.modelOrchestrator.complete(
      'strategicSynthesis',
      briefPrompt,
      { maxTokens: 4000 }
    );

    const brief: Brief = {
      id: crypto.randomUUID(),
      tenantId,
      weekOf: new Date(),
      critical,
      tensions: tensions.slice(0, 2), // Top 2 tensions
      opportunities: [],
      killList: [],
      realityCheck: {
        buyerTrack: {
          status: trackEvaluations.find(t => t.trackName === 'buyer_reality_check')?.currentState || 'healthy',
          keyFinding: 'See track evaluation'
        },
        userTrack: {
          status: trackEvaluations.find(t => t.trackName === 'user_experience_guardrails')?.currentState || 'healthy',
          keyFinding: 'See track evaluation'
        },
        brandTrack: {
          status: trackEvaluations.find(t => t.trackName === 'brand_consistency')?.currentState || 'healthy',
          keyFinding: 'See track evaluation'
        }
      },
      whatWeShipped: [],
      selfDeception,
      format: 'markdown',
      content: briefResult.response
    };

    return brief;
  }

  /**
   * Format prompt for brief synthesis
   */
  private formatBriefPrompt(
    trackEvaluations: TrackEvaluation[],
    tensions: Tension[],
    selfDeception: any
  ): string {
    return `
Generate a research brief from the following track evaluations.

Track Evaluations:
${trackEvaluations.map(t => `
- ${t.trackName}: ${t.currentState}
  Evidence: ${t.evidence.map(e => `${e.metric}: ${e.value}`).join(', ')}
  Recommendations: ${t.recommendations.map(r => r.action).join('; ')}
`).join('\n')}

${tensions.length > 0 ? `
Tensions:
${tensions.map(t => `- ${t.description} (${t.conflictingPriorities.join(' vs ')})`).join('\n')}
` : ''}

${selfDeception ? `
Self-Deception Alert:
Claim: ${selfDeception.claim}
Reality: ${selfDeception.reality}
` : ''}

Generate a brief in this format:
# Research Brief - Week of [Date]
*Delivered by Fieldnotes. Read in 5 minutes. Act on one thing.*

## 🔴 CRITICAL: Fix This Week
[If critical findings exist]

## 🟡 TENSIONS: Choose Soon
[Top 2 tensions]

## ⚠️ What We're Lying to Ourselves About
[If self-deception detected]

Be direct. No fluff. Plain language.
`.trim();
  }

  /**
   * Save brief to database
   */
  private async saveBrief(brief: Brief): Promise<void> {
    await this.supabase
      .from('research_briefs')
      .insert([{
        tenant_id: brief.tenantId,
        week_of: brief.weekOf,
        critical: brief.critical,
        tensions: brief.tensions,
        opportunities: brief.opportunities,
        kill_list: brief.killList,
        reality_check: brief.realityCheck,
        what_we_shipped: brief.whatWeShipped,
        self_deception: brief.selfDeception,
        format: brief.format,
        content: brief.content
      }]);
  }

  /**
   * Save pre-launch memo to database
   */
  private async savePreLaunchMemo(memo: PreLaunchMemo): Promise<void> {
    await this.supabase
      .from('research_pre_launch_memos')
      .insert([{
        tenant_id: memo.tenantId,
        feature_name: memo.featureName,
        concept: memo.concept,
        reality: memo.reality,
        who_is_this_for: memo.whoIsThisFor,
        when_would_they_quit: memo.whenWouldTheyQuit,
        what_will_confuse: memo.whatWillConfuse,
        buyer_lens: memo.buyerLens,
        user_lens: memo.userLens,
        language_audit: memo.languageAudit,
        tension_map: memo.tensionMap,
        recommendation: memo.recommendation,
        confidence: memo.confidence
      }]);
  }

  /**
   * Deliver brief via configured channels
   */
  private async deliverBrief(brief: Brief, config: TenantConfig): Promise<void> {
    const deliveryPromises: Promise<void>[] = [];

    // Slack delivery
    if (config.delivery.slack?.enabled && config.delivery.slack.webhookUrl) {
      const slackAdapter = new SlackAdapter(config.delivery.slack);
      deliveryPromises.push(slackAdapter.postWeeklyBrief(brief).catch(err => {
        this.logger.error('Slack delivery failed', err);
      }));
    }

    // Email delivery
    if (config.delivery.email?.enabled && config.delivery.email.recipients.length > 0) {
      const emailAdapter = new EmailAdapter(config.delivery.email);
      deliveryPromises.push(emailAdapter.sendWeeklyBrief(brief).catch(err => {
        this.logger.error('Email delivery failed', err);
      }));
    }

    // Webhook delivery
    if (config.delivery.webhook?.enabled && config.delivery.webhook.url) {
      const webhookAdapter = new WebhookAdapter(
        config.delivery.webhook,
        process.env.FIELDNOTES_WEBHOOK_SECRET
      );
      deliveryPromises.push(webhookAdapter.sendWeeklyBrief(brief).catch(err => {
        this.logger.error('Webhook delivery failed', err);
      }));
    }

    await Promise.allSettled(deliveryPromises);
    this.logger.info(`Brief delivered via ${deliveryPromises.length} channel(s)`);
  }

  /**
   * Check cost limit for tenant
   */
  private async checkCostLimit(tenantId: string): Promise<any> {
    return this.costController.checkLimit(tenantId);
  }

  /**
   * Get cost status for a tenant (public method)
   */
  async getCostStatus(tenantId: string): Promise<{ status: 'normal' | 'warning' | 'blocked'; cost: number; limit: number }> {
    return this.costController.checkLimit(tenantId);
  }

  /**
   * Reset cost tracking for a tenant (monthly reset)
   */
  async resetCostTracking(tenantId: string): Promise<void> {
    this.logger.info(`Resetting cost tracking for tenant ${tenantId}`);
    await this.costController.resetPeriod(tenantId);
  }

  /**
   * Record usage metrics
   */
  private async recordUsage(
    tenantId: string,
    operation: string,
    model: string,
    tokensUsed: number,
    cost: number,
    duration: number
  ): Promise<void> {
    await this.supabase.rpc('record_research_usage', {
      p_tenant_id: tenantId,
      p_operation: operation,
      p_model: model,
      p_tokens_used: tokensUsed,
      p_cost: cost,
      p_duration: duration
    });
  }

  /**
   * Get list of active tenant IDs
   */
  async getActiveTenants(): Promise<string[]> {
    const { data: tenants, error } = await this.supabase
      .from('research_tenants')
      .select('tenant_id')
      .eq('is_active', true);

    if (error || !tenants) {
      this.logger.error('Failed to get active tenants', error);
      return ['storytailor']; // Default fallback
    }

    return tenants.map(t => t.tenant_id);
  }
}

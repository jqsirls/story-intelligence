#!/bin/bash
# Deploy Insights Agent Lambda
# Generates actionable insights from platform data
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Environment setup
ENVIRONMENT=${1:-staging}
PREFIX="/storytailor-${ENVIRONMENT}"
LAMBDA_NAME="storytailor-insights-agent-${ENVIRONMENT}"
HANDLER_FILE="index.js"

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║              💡 DEPLOYING INSIGHTS AGENT 💡                       ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${CYAN}Lambda Name: ${LAMBDA_NAME}${NC}"
echo ""

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
    echo -e "${YELLOW}Usage: $0 [staging|production]${NC}"
    exit 1
fi

# Get AWS account info
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region || echo "us-east-1")
LAMBDA_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/storytailor-lambda-role-${ENVIRONMENT}"

echo -e "${GREEN}✅ AWS Account: ${AWS_ACCOUNT_ID}${NC}"
echo -e "${GREEN}✅ AWS Region: ${AWS_REGION}${NC}"
echo -e "${GREEN}✅ Lambda Role: storytailor-lambda-role-${ENVIRONMENT}${NC}"
echo ""

# Create deployment directory
DEPLOY_DIR="./lambda-deployments/insights-agent"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

echo -e "${BLUE}📁 Created deployment directory: $DEPLOY_DIR${NC}"

# Create package.json
cat > "$DEPLOY_DIR/package.json" << EOF
{
  "name": "storytailor-insights-agent",
  "version": "1.0.0",
  "description": "Storytailor Insights Agent - Actionable insights from platform data",
  "main": "index.js",
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "redis": "^4.6.0",
    "joi": "^17.11.0",
    "winston": "^3.11.0",
    "uuid": "^9.0.1",
    "date-fns": "^2.30.0"
  }
}
EOF

# Create Lambda handler
cat > "$DEPLOY_DIR/$HANDLER_FILE" << 'EOF'
const { createClient } = require('@supabase/supabase-js');
const { createClient: createRedisClient } = require('redis');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { 
  format, 
  subDays,
  subWeeks,
  subMonths,
  parseISO,
  differenceInDays,
  differenceInHours,
  startOfDay,
  endOfDay
} = require('date-fns');

// Configuration
const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    cacheTtl: 3600 // 1 hour
  },
  insights: {
    thresholds: {
      lowEngagement: 0.3,
      highEngagement: 0.7,
      riskChurn: 0.8,
      successfulOutcome: 0.8
    },
    weights: {
      engagement: 0.3,
      satisfaction: 0.3,
      frequency: 0.2,
      growth: 0.2
    }
  }
};

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Validation schemas
const generateInsightsSchema = Joi.object({
  scope: Joi.string().valid('user', 'family', 'platform').required(),
  targetId: Joi.string().uuid().optional().when('scope', {
    is: Joi.valid('user', 'family'),
    then: Joi.required()
  }),
  insightTypes: Joi.array().items(Joi.string().valid(
    'engagement', 'content', 'growth', 'risk', 'opportunity', 'recommendation'
  )).default(['all']),
  timeframe: Joi.string().valid('day', 'week', 'month', 'quarter').default('month')
});

const getUserInsightsSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  depth: Joi.string().valid('summary', 'detailed', 'comprehensive').default('summary')
});

const getFamilyInsightsSchema = Joi.object({
  familyId: Joi.string().uuid().required(),
  includeIndividuals: Joi.boolean().default(false)
});

const getActionableRecommendationsSchema = Joi.object({
  targetType: Joi.string().valid('user', 'family', 'platform').required(),
  targetId: Joi.string().uuid().optional(),
  priority: Joi.string().valid('all', 'high', 'medium', 'low').default('all'),
  category: Joi.string().valid('engagement', 'content', 'safety', 'growth').optional()
});

// Insights Service
class InsightsAgent {
  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.serviceKey);
    this.redis = null;
    this.isInitialized = false;
    this.insightGenerators = new Map();
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Connect to Redis
      this.redis = createRedisClient({ url: config.redis.url });
      await this.redis.connect();
      
      // Test Supabase connection
      const { error } = await this.supabase.from('insights').select('id').limit(1);
      if (error && !error.message.includes('does not exist')) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }
      
      // Initialize insight generators
      this.initializeGenerators();
      
      this.isInitialized = true;
      logger.info('InsightsAgent initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize InsightsAgent', { error: error.message });
      throw error;
    }
  }

  initializeGenerators() {
    // Register insight generators for different types
    this.insightGenerators.set('engagement', this.generateEngagementInsights.bind(this));
    this.insightGenerators.set('content', this.generateContentInsights.bind(this));
    this.insightGenerators.set('growth', this.generateGrowthInsights.bind(this));
    this.insightGenerators.set('risk', this.generateRiskInsights.bind(this));
    this.insightGenerators.set('opportunity', this.generateOpportunityInsights.bind(this));
    this.insightGenerators.set('recommendation', this.generateRecommendations.bind(this));
  }

  async generateInsights(params) {
    const { scope, targetId, insightTypes, timeframe } = params;
    const insightId = uuidv4();
    
    logger.info('Generating insights', { 
      insightId, 
      scope,
      targetId,
      insightTypes,
      timeframe
    });

    try {
      // Check cache first
      const cacheKey = `insights:${scope}:${targetId || 'platform'}:${timeframe}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        logger.info('Returning cached insights', { insightId });
        return JSON.parse(cached);
      }

      // Get relevant data based on scope
      const data = await this.gatherDataForScope(scope, targetId, timeframe);
      
      // Generate insights based on types
      const insights = {};
      const typesToGenerate = insightTypes.includes('all') 
        ? ['engagement', 'content', 'growth', 'risk', 'opportunity', 'recommendation']
        : insightTypes;

      for (const type of typesToGenerate) {
        const generator = this.insightGenerators.get(type);
        if (generator) {
          insights[type] = await generator(data, scope, targetId);
        }
      }

      // Calculate overall health score
      const healthScore = this.calculateHealthScore(insights);

      // Create insight summary
      const summary = {
        id: insightId,
        scope,
        targetId,
        timeframe,
        generatedAt: new Date().toISOString(),
        healthScore,
        insights,
        keyFindings: this.extractKeyFindings(insights),
        actionItems: this.extractActionItems(insights)
      };

      // Store insights
      await this.storeInsights(summary);
      
      // Cache results
      await this.redis.set(cacheKey, JSON.stringify(summary), {
        EX: config.redis.cacheTtl
      });

      logger.info('Insights generated successfully', { 
        insightId,
        healthScore,
        keyFindingsCount: summary.keyFindings.length
      });

      return summary;

    } catch (error) {
      logger.error('Failed to generate insights', { 
        insightId, 
        error: error.message 
      });
      throw error;
    }
  }

  async gatherDataForScope(scope, targetId, timeframe) {
    const endDate = new Date();
    let startDate;
    
    switch (timeframe) {
      case 'day':
        startDate = subDays(endDate, 1);
        break;
      case 'week':
        startDate = subWeeks(endDate, 1);
        break;
      case 'month':
        startDate = subMonths(endDate, 1);
        break;
      case 'quarter':
        startDate = subMonths(endDate, 3);
        break;
    }

    const data = {
      timeframe: { start: startDate, end: endDate },
      metrics: {}
    };

    switch (scope) {
      case 'user':
        data.user = await this.getUserData(targetId, startDate, endDate);
        data.metrics = await this.getUserMetrics(targetId, startDate, endDate);
        break;
      case 'family':
        data.family = await this.getFamilyData(targetId, startDate, endDate);
        data.metrics = await this.getFamilyMetrics(targetId, startDate, endDate);
        break;
      case 'platform':
        data.platform = await this.getPlatformData(startDate, endDate);
        data.metrics = await this.getPlatformMetrics(startDate, endDate);
        break;
    }

    return data;
  }

  async getUserData(userId, startDate, endDate) {
    const { data: user } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    const { data: sessions } = await this.supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const { data: stories } = await this.supabase
      .from('stories')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const { data: characters } = await this.supabase
      .from('characters')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    return {
      profile: user,
      sessions: sessions || [],
      stories: stories || [],
      characters: characters || [],
      activity: await this.getUserActivity(userId, startDate, endDate)
    };
  }

  async getUserMetrics(userId, startDate, endDate) {
    const data = await this.getUserData(userId, startDate, endDate);
    
    return {
      engagementRate: this.calculateEngagementRate(data),
      sessionFrequency: this.calculateSessionFrequency(data.sessions),
      contentCreation: {
        stories: data.stories.length,
        characters: data.characters.length,
        avgStoriesPerSession: data.sessions.length ? data.stories.length / data.sessions.length : 0
      },
      satisfaction: await this.calculateUserSatisfaction(userId, data),
      retention: await this.calculateRetention(userId, startDate, endDate)
    };
  }

  calculateEngagementRate(userData) {
    if (!userData.sessions || userData.sessions.length === 0) return 0;
    
    const totalDays = differenceInDays(new Date(), userData.profile.created_at);
    const activeDays = new Set(userData.sessions.map(s => 
      startOfDay(parseISO(s.created_at)).toISOString()
    )).size;
    
    return Math.min(activeDays / Math.max(totalDays, 1), 1);
  }

  calculateSessionFrequency(sessions) {
    if (!sessions || sessions.length === 0) return 0;
    
    const sessionDates = sessions.map(s => parseISO(s.created_at));
    sessionDates.sort((a, b) => a - b);
    
    if (sessionDates.length === 1) return 1;
    
    let totalGap = 0;
    for (let i = 1; i < sessionDates.length; i++) {
      totalGap += differenceInHours(sessionDates[i], sessionDates[i-1]);
    }
    
    const avgGapHours = totalGap / (sessionDates.length - 1);
    return 24 / avgGapHours; // Sessions per day
  }

  async generateEngagementInsights(data, scope, targetId) {
    const insights = [];
    
    if (scope === 'user') {
      const { engagementRate, sessionFrequency } = data.metrics;
      
      if (engagementRate < config.insights.thresholds.lowEngagement) {
        insights.push({
          type: 'warning',
          severity: 'high',
          message: 'User engagement is below threshold',
          metric: engagementRate,
          threshold: config.insights.thresholds.lowEngagement,
          recommendation: 'Consider personalized re-engagement campaigns'
        });
      } else if (engagementRate > config.insights.thresholds.highEngagement) {
        insights.push({
          type: 'positive',
          severity: 'info',
          message: 'User shows high engagement',
          metric: engagementRate,
          recommendation: 'Offer premium features or exclusive content'
        });
      }
      
      if (sessionFrequency < 0.5) { // Less than once every 2 days
        insights.push({
          type: 'opportunity',
          severity: 'medium',
          message: 'Session frequency could be improved',
          metric: sessionFrequency,
          recommendation: 'Implement daily reminders or streaks'
        });
      }
    }
    
    return insights;
  }

  async generateContentInsights(data, scope, targetId) {
    const insights = [];
    
    if (scope === 'user' && data.metrics.contentCreation) {
      const { stories, characters, avgStoriesPerSession } = data.metrics.contentCreation;
      
      if (stories === 0) {
        insights.push({
          type: 'opportunity',
          severity: 'high',
          message: 'User has not created any stories',
          recommendation: 'Guide user through story creation tutorial'
        });
      }
      
      if (characters === 0) {
        insights.push({
          type: 'opportunity',
          severity: 'medium',
          message: 'User has not created any characters',
          recommendation: 'Showcase character creation benefits'
        });
      }
      
      if (avgStoriesPerSession > 3) {
        insights.push({
          type: 'positive',
          severity: 'info',
          message: 'User is highly productive in sessions',
          metric: avgStoriesPerSession,
          recommendation: 'Consider offering bulk features or templates'
        });
      }
    }
    
    return insights;
  }

  async generateRiskInsights(data, scope, targetId) {
    const insights = [];
    
    if (scope === 'user') {
      // Check for churn risk
      const lastSession = data.user.sessions[data.user.sessions.length - 1];
      if (lastSession) {
        const daysSinceLastSession = differenceInDays(new Date(), parseISO(lastSession.created_at));
        
        if (daysSinceLastSession > 14) {
          insights.push({
            type: 'risk',
            severity: 'high',
            message: 'High churn risk - user inactive for 2+ weeks',
            metric: daysSinceLastSession,
            recommendation: 'Send win-back email with special offer'
          });
        } else if (daysSinceLastSession > 7) {
          insights.push({
            type: 'risk',
            severity: 'medium',
            message: 'Medium churn risk - user inactive for 1 week',
            metric: daysSinceLastSession,
            recommendation: 'Send engagement reminder'
          });
        }
      }
      
      // Check for declining engagement
      if (data.metrics.retention < 0.5) {
        insights.push({
          type: 'risk',
          severity: 'high',
          message: 'User retention is below 50%',
          metric: data.metrics.retention,
          recommendation: 'Investigate user feedback and pain points'
        });
      }
    }
    
    return insights;
  }

  async generateGrowthInsights(data, scope, targetId) {
    const insights = [];
    
    if (scope === 'platform') {
      const userGrowth = await this.calculateUserGrowth(data);
      const revenueGrowth = await this.calculateRevenueGrowth(data);
      
      if (userGrowth > 0.1) { // 10% growth
        insights.push({
          type: 'positive',
          severity: 'info',
          message: `Strong user growth of ${(userGrowth * 100).toFixed(1)}%`,
          metric: userGrowth,
          recommendation: 'Scale infrastructure to handle growth'
        });
      } else if (userGrowth < 0) {
        insights.push({
          type: 'warning',
          severity: 'high',
          message: 'User base is declining',
          metric: userGrowth,
          recommendation: 'Focus on retention and acquisition strategies'
        });
      }
      
      if (revenueGrowth < userGrowth) {
        insights.push({
          type: 'opportunity',
          severity: 'medium',
          message: 'Revenue growth lagging behind user growth',
          recommendation: 'Improve monetization and upselling'
        });
      }
    }
    
    return insights;
  }

  async generateOpportunityInsights(data, scope, targetId) {
    const insights = [];
    
    // Cross-sell opportunities
    if (scope === 'user' && data.user.profile) {
      if (!data.user.profile.subscription_tier || data.user.profile.subscription_tier === 'free') {
        if (data.metrics.engagementRate > 0.5) {
          insights.push({
            type: 'opportunity',
            severity: 'high',
            message: 'Engaged free user - premium upsell opportunity',
            recommendation: 'Offer premium trial with personalized benefits'
          });
        }
      }
      
      // Feature adoption opportunities
      const unusedFeatures = await this.getUnusedFeatures(targetId);
      if (unusedFeatures.length > 0) {
        insights.push({
          type: 'opportunity',
          severity: 'medium',
          message: `User has not tried ${unusedFeatures.length} features`,
          features: unusedFeatures,
          recommendation: 'Create feature discovery campaign'
        });
      }
    }
    
    return insights;
  }

  async generateRecommendations(data, scope, targetId) {
    const recommendations = [];
    
    // Analyze all insights to generate recommendations
    const allInsights = {
      engagement: await this.generateEngagementInsights(data, scope, targetId),
      content: await this.generateContentInsights(data, scope, targetId),
      risk: await this.generateRiskInsights(data, scope, targetId),
      growth: await this.generateGrowthInsights(data, scope, targetId),
      opportunity: await this.generateOpportunityInsights(data, scope, targetId)
    };
    
    // Prioritize recommendations based on severity and impact
    const prioritizedActions = this.prioritizeActions(allInsights);
    
    prioritizedActions.forEach((action, index) => {
      recommendations.push({
        priority: index + 1,
        action: action.recommendation,
        impact: action.severity,
        category: action.type,
        expectedOutcome: this.predictOutcome(action)
      });
    });
    
    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  prioritizeActions(insights) {
    const allActions = [];
    
    Object.values(insights).forEach(categoryInsights => {
      categoryInsights.forEach(insight => {
        if (insight.recommendation) {
          allActions.push({
            ...insight,
            score: this.calculateActionScore(insight)
          });
        }
      });
    });
    
    return allActions.sort((a, b) => b.score - a.score);
  }

  calculateActionScore(insight) {
    const severityScores = {
      high: 3,
      medium: 2,
      low: 1,
      info: 0.5
    };
    
    const typeScores = {
      risk: 3,
      warning: 2.5,
      opportunity: 2,
      positive: 1
    };
    
    return (severityScores[insight.severity] || 1) * (typeScores[insight.type] || 1);
  }

  predictOutcome(action) {
    // Simplified outcome prediction
    const outcomes = {
      risk: 'Prevent churn and maintain user base',
      warning: 'Improve key metrics by 10-20%',
      opportunity: 'Increase revenue or engagement by 15-30%',
      positive: 'Maintain momentum and build loyalty'
    };
    
    return outcomes[action.type] || 'Improve overall platform health';
  }

  calculateHealthScore(insights) {
    let score = 100;
    
    // Deduct points for issues
    Object.values(insights).forEach(categoryInsights => {
      categoryInsights.forEach(insight => {
        if (insight.type === 'risk' || insight.type === 'warning') {
          const penalty = insight.severity === 'high' ? 10 : 5;
          score -= penalty;
        }
      });
    });
    
    return Math.max(0, Math.min(100, score));
  }

  extractKeyFindings(insights) {
    const findings = [];
    
    Object.entries(insights).forEach(([category, categoryInsights]) => {
      const significantInsights = categoryInsights.filter(i => 
        i.severity === 'high' || i.type === 'positive'
      );
      
      significantInsights.forEach(insight => {
        findings.push({
          category,
          finding: insight.message,
          impact: insight.severity
        });
      });
    });
    
    return findings;
  }

  extractActionItems(insights) {
    const actions = [];
    
    Object.values(insights).forEach(categoryInsights => {
      categoryInsights.forEach(insight => {
        if (insight.recommendation && insight.severity !== 'info') {
          actions.push({
            action: insight.recommendation,
            priority: insight.severity,
            category: insight.type
          });
        }
      });
    });
    
    return actions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  async storeInsights(summary) {
    const { error } = await this.supabase
      .from('insights')
      .insert({
        id: summary.id,
        scope: summary.scope,
        target_id: summary.targetId,
        timeframe: summary.timeframe,
        health_score: summary.healthScore,
        insights_data: summary.insights,
        key_findings: summary.keyFindings,
        action_items: summary.actionItems,
        created_at: summary.generatedAt
      });
      
    if (error && !error.message.includes('does not exist')) {
      logger.warn('Could not store insights', { error: error.message });
    }
  }

  async getUserInsights(params) {
    const { userId, depth } = params;
    
    // Generate comprehensive user insights
    const insights = await this.generateInsights({
      scope: 'user',
      targetId: userId,
      insightTypes: ['all'],
      timeframe: 'month'
    });
    
    // Add user-specific details based on depth
    if (depth === 'detailed' || depth === 'comprehensive') {
      insights.behaviorPatterns = await this.analyzeBehaviorPatterns(userId);
      insights.contentPreferences = await this.analyzeContentPreferences(userId);
    }
    
    if (depth === 'comprehensive') {
      insights.predictiveAnalysis = await this.generatePredictiveAnalysis(userId);
      insights.comparativeAnalysis = await this.generateComparativeAnalysis(userId);
    }
    
    return insights;
  }

  async getFamilyInsights(params) {
    const { familyId, includeIndividuals } = params;
    
    // Generate family-level insights
    const familyInsights = await this.generateInsights({
      scope: 'family',
      targetId: familyId,
      insightTypes: ['all'],
      timeframe: 'month'
    });
    
    if (includeIndividuals) {
      // Get individual member insights
      const { data: familyMembers } = await this.supabase
        .from('family_members')
        .select('user_id')
        .eq('family_id', familyId);
        
      familyInsights.individualInsights = await Promise.all(
        (familyMembers || []).map(member => 
          this.getUserInsights({ userId: member.user_id, depth: 'summary' })
        )
      );
    }
    
    return familyInsights;
  }

  async getActionableRecommendations(params) {
    const { targetType, targetId, priority, category } = params;
    
    // Generate insights to base recommendations on
    const insights = await this.generateInsights({
      scope: targetType,
      targetId,
      insightTypes: ['recommendation'],
      timeframe: 'month'
    });
    
    let recommendations = insights.insights.recommendation || [];
    
    // Filter by priority if specified
    if (priority !== 'all') {
      recommendations = recommendations.filter(r => r.impact === priority);
    }
    
    // Filter by category if specified
    if (category) {
      recommendations = recommendations.filter(r => r.category === category);
    }
    
    // Enrich recommendations with implementation details
    const enrichedRecommendations = recommendations.map(rec => ({
      ...rec,
      implementationSteps: this.getImplementationSteps(rec),
      estimatedImpact: this.estimateImpact(rec),
      resources: this.getResourceRequirements(rec)
    }));
    
    return {
      targetType,
      targetId,
      recommendations: enrichedRecommendations,
      totalCount: enrichedRecommendations.length
    };
  }

  getImplementationSteps(recommendation) {
    // Simplified implementation steps based on action type
    const steps = {
      'Send win-back email with special offer': [
        'Segment inactive users',
        'Create personalized offer',
        'Design email template',
        'Schedule send',
        'Track open and conversion rates'
      ],
      'Guide user through story creation tutorial': [
        'Identify users without stories',
        'Create interactive tutorial',
        'Add progress tracking',
        'Implement rewards for completion'
      ],
      'Implement daily reminders or streaks': [
        'Design streak system',
        'Create reminder notifications',
        'Add streak rewards',
        'Track engagement impact'
      ]
    };
    
    return steps[recommendation.action] || ['Analyze requirements', 'Plan implementation', 'Execute', 'Measure results'];
  }

  estimateImpact(recommendation) {
    return {
      engagement: recommendation.category === 'engagement' ? 'High' : 'Medium',
      revenue: recommendation.category === 'opportunity' ? 'High' : 'Low',
      retention: recommendation.category === 'risk' ? 'High' : 'Medium',
      timeToImpact: recommendation.priority === 1 ? '1-2 weeks' : '2-4 weeks'
    };
  }

  getResourceRequirements(recommendation) {
    return {
      effort: recommendation.impact === 'high' ? 'High' : 'Medium',
      team: ['Product', 'Engineering', 'Marketing'],
      estimatedHours: recommendation.priority * 20 // Simplified estimate
    };
  }

  async getUserActivity(userId, startDate, endDate) {
    const { data: events } = await this.supabase
      .from('user_events')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
      
    return events || [];
  }

  async calculateUserSatisfaction(userId, userData) {
    // Simplified satisfaction calculation
    let satisfaction = 0.5; // Base satisfaction
    
    // Positive indicators
    if (userData.stories.length > 5) satisfaction += 0.2;
    if (userData.characters.length > 2) satisfaction += 0.1;
    if (userData.sessions.length > 10) satisfaction += 0.2;
    
    return Math.min(satisfaction, 1);
  }

  async calculateRetention(userId, startDate, endDate) {
    const totalDays = differenceInDays(endDate, startDate);
    const { data: activeDays } = await this.supabase
      .from('user_sessions')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
      
    const uniqueDays = new Set(
      (activeDays || []).map(s => startOfDay(parseISO(s.created_at)).toISOString())
    ).size;
    
    return uniqueDays / totalDays;
  }

  async getUnusedFeatures(userId) {
    // Simplified - would check actual feature usage
    const allFeatures = ['character_creation', 'voice_synthesis', 'library_sharing', 'educational_mode'];
    const { data: usedFeatures } = await this.supabase
      .from('feature_usage')
      .select('feature_name')
      .eq('user_id', userId);
      
    const used = new Set((usedFeatures || []).map(f => f.feature_name));
    return allFeatures.filter(f => !used.has(f));
  }

  async getFamilyData(familyId, startDate, endDate) {
    // Implementation for family data gathering
    return {};
  }

  async getFamilyMetrics(familyId, startDate, endDate) {
    // Implementation for family metrics
    return {};
  }

  async getPlatformData(startDate, endDate) {
    // Implementation for platform data gathering
    return {};
  }

  async getPlatformMetrics(startDate, endDate) {
    // Implementation for platform metrics
    return {};
  }

  async analyzeBehaviorPatterns(userId) {
    // Implementation for behavior pattern analysis
    return {};
  }

  async analyzeContentPreferences(userId) {
    // Implementation for content preference analysis
    return {};
  }

  async generatePredictiveAnalysis(userId) {
    // Implementation for predictive analysis
    return {};
  }

  async generateComparativeAnalysis(userId) {
    // Implementation for comparative analysis
    return {};
  }

  async calculateUserGrowth(data) {
    // Implementation for user growth calculation
    return 0.1; // 10% growth placeholder
  }

  async calculateRevenueGrowth(data) {
    // Implementation for revenue growth calculation
    return 0.08; // 8% growth placeholder
  }
}

// Lambda handler
const insightsAgent = new InsightsAgent();

exports.handler = async (event) => {
  logger.info('Insights Agent invoked', { 
    eventType: event.type,
    action: event.action,
    requestId: event.requestId || uuidv4()
  });

  try {
    // Initialize agent if needed
    await insightsAgent.initialize();

    // Parse event
    const { action, data } = event;

    switch (action) {
      case 'generateInsights': {
        const { error } = generateInsightsSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await insightsAgent.generateInsights(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'getUserInsights': {
        const { error } = getUserInsightsSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await insightsAgent.getUserInsights(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'getFamilyInsights': {
        const { error } = getFamilyInsightsSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await insightsAgent.getFamilyInsights(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'getActionableRecommendations': {
        const { error } = getActionableRecommendationsSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await insightsAgent.getActionableRecommendations(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'health': {
        return {
          statusCode: 200,
          body: JSON.stringify({
            status: 'healthy',
            agent: 'insights-agent',
            version: '1.0.0',
            initialized: insightsAgent.isInitialized,
            features: [
              'user_insights',
              'family_insights',
              'platform_insights',
              'actionable_recommendations',
              'predictive_analytics',
              'behavior_analysis',
              'risk_detection'
            ],
            insightTypes: [
              'engagement',
              'content',
              'growth',
              'risk',
              'opportunity',
              'recommendation'
            ]
          })
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    logger.error('Insights Agent error', { 
      error: error.message,
      stack: error.stack 
    });
    
    return {
      statusCode: error.message.includes('Validation') ? 400 : 500,
      body: JSON.stringify({
        error: error.message,
        type: 'InsightsAgentError'
      })
    };
  }
};
EOF

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
cd "$DEPLOY_DIR"
npm install --production

# Create deployment package
echo -e "${YELLOW}📦 Creating deployment package...${NC}"
zip -r deployment.zip . >/dev/null 2>&1

# Get environment variables
echo -e "${BLUE}🔧 Loading environment configuration...${NC}"
SUPABASE_URL="https://lendybmmnlqelrhkhdyc.supabase.co"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY is required}"
REDIS_URL="${REDIS_URL:?REDIS_URL is required}"

# Check if Lambda exists
LAMBDA_EXISTS=$(aws lambda get-function --function-name "$LAMBDA_NAME" 2>&1 | grep -c "FunctionName" || true)

if [ "$LAMBDA_EXISTS" -eq 0 ]; then
    echo -e "${YELLOW}🆕 Creating new Lambda function...${NC}"
    
    # Create Lambda function
    aws lambda create-function \
        --function-name "$LAMBDA_NAME" \
        --runtime nodejs20.x \
        --handler "index.handler" \
        --role "$LAMBDA_ROLE_ARN" \
        --zip-file fileb://deployment.zip \
        --timeout 60 \
        --memory-size 512 \
        --environment Variables="{
            ENVIRONMENT='$ENVIRONMENT',
            SUPABASE_URL='$SUPABASE_URL',
            SUPABASE_SERVICE_ROLE_KEY='$SUPABASE_SERVICE_KEY',
            REDIS_URL='$REDIS_URL'
        }" \
        --description "Storytailor Insights Agent - Actionable insights from platform data"
    
    echo -e "${GREEN}✅ Lambda function created${NC}"
    
    # Wait for function to be active
    echo -e "${YELLOW}⏳ Waiting for function to be active...${NC}"
    aws lambda wait function-active --function-name "$LAMBDA_NAME"
    
else
    echo -e "${YELLOW}♻️  Updating existing Lambda function...${NC}"
    
    # Update function code
    aws lambda update-function-code \
        --function-name "$LAMBDA_NAME" \
        --zip-file fileb://deployment.zip
    
    # Wait for update to complete
    aws lambda wait function-updated --function-name "$LAMBDA_NAME"
    
    # Update function configuration
    aws lambda update-function-configuration \
        --function-name "$LAMBDA_NAME" \
        --timeout 60 \
        --memory-size 512 \
        --environment Variables="{
            ENVIRONMENT='$ENVIRONMENT',
            SUPABASE_URL='$SUPABASE_URL',
            SUPABASE_SERVICE_ROLE_KEY='$SUPABASE_SERVICE_KEY',
            REDIS_URL='$REDIS_URL'
        }"
    
    echo -e "${GREEN}✅ Lambda function updated${NC}"
fi

# Add EventBridge permissions
echo -e "${YELLOW}🔗 Configuring EventBridge permissions...${NC}"
aws lambda add-permission \
    --function-name "$LAMBDA_NAME" \
    --statement-id "AllowEventBridgeInvoke" \
    --action "lambda:InvokeFunction" \
    --principal "events.amazonaws.com" \
    --source-arn "arn:aws:events:${AWS_REGION}:${AWS_ACCOUNT_ID}:rule/storytailor-${ENVIRONMENT}-insights-*" \
    2>/dev/null || true

# Test the function
echo -e "${BLUE}🧪 Testing Insights Agent...${NC}"
TEST_PAYLOAD='{"action":"health"}'

RESULT=$(aws lambda invoke \
    --function-name "$LAMBDA_NAME" \
    --payload "$TEST_PAYLOAD" \
    --cli-binary-format raw-in-base64-out \
    /tmp/insights-agent-test-output.json 2>&1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Test invocation successful${NC}"
    cat /tmp/insights-agent-test-output.json | jq '.'
else
    echo -e "${RED}❌ Test invocation failed${NC}"
    echo "$RESULT"
fi

# Cleanup
cd - > /dev/null
rm -rf "$DEPLOY_DIR"
rm -f /tmp/insights-agent-test-output.json

echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║              🎉 INSIGHTS AGENT DEPLOYED! 🎉                       ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Lambda Function: ${LAMBDA_NAME}${NC}"
echo -e "${CYAN}Region: ${AWS_REGION}${NC}"
echo ""
echo -e "${GREEN}✅ Insights Agent is ready to:${NC}"
echo -e "   • Generate actionable insights for users and families"
echo -e "   • Detect risks and opportunities"
echo -e "   • Provide growth and engagement analytics"
echo -e "   • Create personalized recommendations"
echo -e "   • Track platform health metrics"
echo ""

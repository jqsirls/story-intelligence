#!/bin/bash
# Deploy Analytics Intelligence Agent Lambda
# Provides business intelligence and analytics for platform optimization
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
LAMBDA_NAME="storytailor-analytics-intelligence-${ENVIRONMENT}"
HANDLER_FILE="index.js"

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║         📊 DEPLOYING ANALYTICS INTELLIGENCE AGENT 📊              ║${NC}"
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
DEPLOY_DIR="./lambda-deployments/analytics-intelligence"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

echo -e "${BLUE}📁 Created deployment directory: $DEPLOY_DIR${NC}"

# Create package.json
cat > "$DEPLOY_DIR/package.json" << EOF
{
  "name": "storytailor-analytics-intelligence",
  "version": "1.0.0",
  "description": "Storytailor Analytics Intelligence - Business intelligence and platform analytics",
  "main": "index.js",
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "redis": "^4.6.0",
    "joi": "^17.11.0",
    "winston": "^3.11.0",
    "uuid": "^9.0.1",
    "date-fns": "^2.30.0",
    "mathjs": "^12.0.0"
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
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
  parseISO
} = require('date-fns');
const { mean, median, std, quantileSeq } = require('mathjs');

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
  analytics: {
    retentionPeriods: {
      realtime: 1, // days
      daily: 30, // days
      weekly: 12, // weeks
      monthly: 12 // months
    },
    kpis: {
      targetDau: 10000,
      targetMau: 100000,
      targetRetention: 0.8,
      targetEngagement: 0.7
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
const getMetricsSchema = Joi.object({
  type: Joi.string().valid('usage', 'engagement', 'growth', 'revenue', 'performance').required(),
  period: Joi.string().valid('day', 'week', 'month', 'quarter', 'year').default('day'),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  aggregation: Joi.string().valid('sum', 'avg', 'count', 'unique').default('sum')
});

const getUserAnalyticsSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  metrics: Joi.array().items(Joi.string()).default(['engagement', 'stories', 'characters'])
});

const getPlatformInsightsSchema = Joi.object({
  category: Joi.string().valid('user_behavior', 'content_performance', 'system_health', 'business_metrics').required(),
  depth: Joi.string().valid('summary', 'detailed', 'comprehensive').default('summary')
});

const generateReportSchema = Joi.object({
  reportType: Joi.string().valid('executive', 'operational', 'technical', 'financial').required(),
  period: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly').required(),
  format: Joi.string().valid('json', 'pdf', 'csv').default('json'),
  recipients: Joi.array().items(Joi.string().email()).optional()
});

// Analytics Intelligence Service
class AnalyticsIntelligenceAgent {
  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.serviceKey);
    this.redis = null;
    this.isInitialized = false;
    this.metricsCache = new Map();
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Connect to Redis
      this.redis = createRedisClient({ url: config.redis.url });
      await this.redis.connect();
      
      // Test Supabase connection
      const { error } = await this.supabase.from('analytics_events').select('id').limit(1);
      if (error && !error.message.includes('does not exist')) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }
      
      this.isInitialized = true;
      logger.info('AnalyticsIntelligenceAgent initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AnalyticsIntelligenceAgent', { error: error.message });
      throw error;
    }
  }

  async getMetrics(params) {
    const { type, period, startDate, endDate, aggregation } = params;
    const metricsId = uuidv4();
    
    logger.info('Retrieving analytics metrics', { 
      metricsId, 
      type,
      period,
      aggregation
    });

    try {
      // Check cache first
      const cacheKey = `metrics:${type}:${period}:${aggregation}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        logger.info('Returning cached metrics', { metricsId });
        return JSON.parse(cached);
      }

      // Determine date range
      const dateRange = this.getDateRange(period, startDate, endDate);
      
      let metrics;
      switch (type) {
        case 'usage':
          metrics = await this.getUsageMetrics(dateRange, aggregation);
          break;
        case 'engagement':
          metrics = await this.getEngagementMetrics(dateRange, aggregation);
          break;
        case 'growth':
          metrics = await this.getGrowthMetrics(dateRange, aggregation);
          break;
        case 'revenue':
          metrics = await this.getRevenueMetrics(dateRange, aggregation);
          break;
        case 'performance':
          metrics = await this.getPerformanceMetrics(dateRange, aggregation);
          break;
      }

      // Add insights and trends
      const enrichedMetrics = await this.enrichMetricsWithInsights(metrics, type);

      // Cache results
      await this.redis.set(cacheKey, JSON.stringify(enrichedMetrics), {
        EX: config.redis.cacheTtl
      });

      logger.info('Metrics retrieved successfully', { 
        metricsId,
        dataPoints: enrichedMetrics.data?.length || 0
      });

      return enrichedMetrics;

    } catch (error) {
      logger.error('Failed to retrieve metrics', { 
        metricsId, 
        error: error.message 
      });
      throw error;
    }
  }

  async getUsageMetrics(dateRange, aggregation) {
    const { data: events } = await this.supabase
      .from('analytics_events')
      .select('*')
      .eq('event_type', 'user_activity')
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());

    // Process usage data
    const metrics = {
      dau: this.calculateDAU(events || []),
      mau: this.calculateMAU(events || []),
      sessions: this.calculateSessions(events || []),
      sessionDuration: this.calculateAverageSessionDuration(events || []),
      activeUsers: this.countUniqueUsers(events || [])
    };

    return {
      type: 'usage',
      period: dateRange,
      metrics,
      data: this.aggregateByPeriod(events || [], aggregation)
    };
  }

  async getEngagementMetrics(dateRange, aggregation) {
    const { data: events } = await this.supabase
      .from('analytics_events')
      .select('*')
      .in('event_type', ['story_created', 'story_completed', 'character_created', 'interaction'])
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());

    const metrics = {
      storyCompletionRate: this.calculateCompletionRate(events || []),
      averageStoriesPerUser: this.calculateAverageStoriesPerUser(events || []),
      characterEngagement: this.calculateCharacterEngagement(events || []),
      interactionRate: this.calculateInteractionRate(events || []),
      retentionRate: await this.calculateRetentionRate(dateRange)
    };

    return {
      type: 'engagement',
      period: dateRange,
      metrics,
      data: this.aggregateByPeriod(events || [], aggregation)
    };
  }

  async getGrowthMetrics(dateRange, aggregation) {
    const { data: users } = await this.supabase
      .from('users')
      .select('*')
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());

    const previousPeriod = this.getPreviousPeriod(dateRange);
    const { data: previousUsers } = await this.supabase
      .from('users')
      .select('*')
      .gte('created_at', previousPeriod.start.toISOString())
      .lte('created_at', previousPeriod.end.toISOString());

    const metrics = {
      newUsers: users?.length || 0,
      growthRate: this.calculateGrowthRate(users?.length || 0, previousUsers?.length || 0),
      churnRate: await this.calculateChurnRate(dateRange),
      netGrowth: (users?.length || 0) - await this.getChurnedUsers(dateRange),
      virality: await this.calculateViralityCoefficient(dateRange)
    };

    return {
      type: 'growth',
      period: dateRange,
      metrics,
      data: this.aggregateUserGrowth(users || [], aggregation)
    };
  }

  async getRevenueMetrics(dateRange, aggregation) {
    const { data: transactions } = await this.supabase
      .from('transactions')
      .select('*')
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());

    const metrics = {
      totalRevenue: this.sumRevenue(transactions || []),
      arpu: this.calculateARPU(transactions || []),
      ltv: await this.calculateLTV(),
      conversionRate: await this.calculateConversionRate(dateRange),
      revenueGrowth: await this.calculateRevenueGrowth(dateRange)
    };

    return {
      type: 'revenue',
      period: dateRange,
      metrics,
      data: this.aggregateRevenue(transactions || [], aggregation)
    };
  }

  async getPerformanceMetrics(dateRange, aggregation) {
    const { data: performance } = await this.supabase
      .from('system_metrics')
      .select('*')
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());

    const metrics = {
      avgResponseTime: this.calculateAverageResponseTime(performance || []),
      errorRate: this.calculateErrorRate(performance || []),
      uptime: this.calculateUptime(performance || []),
      apiLatency: this.calculateP95Latency(performance || []),
      throughput: this.calculateThroughput(performance || [])
    };

    return {
      type: 'performance',
      period: dateRange,
      metrics,
      data: this.aggregatePerformance(performance || [], aggregation)
    };
  }

  async getUserAnalytics(params) {
    const { userId, metrics } = params;
    const analyticsId = uuidv4();
    
    logger.info('Retrieving user analytics', { 
      analyticsId, 
      userId,
      metrics
    });

    try {
      const userAnalytics = {};

      if (metrics.includes('engagement')) {
        userAnalytics.engagement = await this.getUserEngagement(userId);
      }

      if (metrics.includes('stories')) {
        userAnalytics.stories = await this.getUserStoryMetrics(userId);
      }

      if (metrics.includes('characters')) {
        userAnalytics.characters = await this.getUserCharacterMetrics(userId);
      }

      // Calculate user score and recommendations
      userAnalytics.userScore = this.calculateUserScore(userAnalytics);
      userAnalytics.recommendations = await this.generateUserRecommendations(userId, userAnalytics);

      logger.info('User analytics retrieved', { analyticsId, userId });

      return {
        userId,
        analytics: userAnalytics,
        retrievedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to retrieve user analytics', { 
        analyticsId, 
        error: error.message 
      });
      throw error;
    }
  }

  async getPlatformInsights(params) {
    const { category, depth } = params;
    const insightsId = uuidv4();
    
    logger.info('Generating platform insights', { 
      insightsId, 
      category,
      depth
    });

    try {
      let insights;

      switch (category) {
        case 'user_behavior':
          insights = await this.getUserBehaviorInsights(depth);
          break;
        case 'content_performance':
          insights = await this.getContentPerformanceInsights(depth);
          break;
        case 'system_health':
          insights = await this.getSystemHealthInsights(depth);
          break;
        case 'business_metrics':
          insights = await this.getBusinessMetricsInsights(depth);
          break;
      }

      // Add AI-powered predictions
      insights.predictions = await this.generatePredictions(category, insights);
      
      // Add actionable recommendations
      insights.recommendations = await this.generateRecommendations(category, insights);

      logger.info('Platform insights generated', { 
        insightsId,
        recommendationCount: insights.recommendations?.length || 0
      });

      return insights;

    } catch (error) {
      logger.error('Failed to generate platform insights', { 
        insightsId, 
        error: error.message 
      });
      throw error;
    }
  }

  async generateReport(params) {
    const { reportType, period, format, recipients } = params;
    const reportId = uuidv4();
    
    logger.info('Generating analytics report', { 
      reportId, 
      reportType,
      period,
      format
    });

    try {
      // Gather data for report
      const reportData = await this.gatherReportData(reportType, period);
      
      // Generate report content
      const report = {
        id: reportId,
        type: reportType,
        period,
        generatedAt: new Date().toISOString(),
        summary: this.generateExecutiveSummary(reportData),
        metrics: reportData.metrics,
        insights: reportData.insights,
        recommendations: reportData.recommendations,
        charts: this.generateChartData(reportData)
      };

      // Format report based on requested format
      let formattedReport;
      switch (format) {
        case 'pdf':
          formattedReport = await this.generatePDFReport(report);
          break;
        case 'csv':
          formattedReport = this.generateCSVReport(report);
          break;
        default:
          formattedReport = report;
      }

      // Send to recipients if specified
      if (recipients && recipients.length > 0) {
        await this.sendReportToRecipients(formattedReport, recipients);
      }

      logger.info('Analytics report generated', { reportId });

      return {
        reportId,
        report: formattedReport,
        status: 'generated',
        recipients: recipients || []
      };

    } catch (error) {
      logger.error('Failed to generate report', { 
        reportId, 
        error: error.message 
      });
      throw error;
    }
  }

  // Helper methods
  getDateRange(period, startDate, endDate) {
    const now = new Date();
    let start, end;

    if (startDate && endDate) {
      start = parseISO(startDate);
      end = parseISO(endDate);
    } else {
      switch (period) {
        case 'day':
          start = startOfDay(now);
          end = endOfDay(now);
          break;
        case 'week':
          start = startOfWeek(now);
          end = endOfWeek(now);
          break;
        case 'month':
          start = startOfMonth(now);
          end = endOfMonth(now);
          break;
        case 'quarter':
          start = startOfMonth(subMonths(now, 2));
          end = endOfMonth(now);
          break;
        case 'year':
          start = new Date(now.getFullYear(), 0, 1);
          end = new Date(now.getFullYear(), 11, 31);
          break;
      }
    }

    return { start, end, period };
  }

  calculateDAU(events) {
    const uniqueUsers = new Set();
    const today = startOfDay(new Date());
    
    events.forEach(event => {
      const eventDate = parseISO(event.created_at);
      if (eventDate >= today) {
        uniqueUsers.add(event.user_id);
      }
    });

    return uniqueUsers.size;
  }

  calculateMAU(events) {
    const uniqueUsers = new Set();
    const thirtyDaysAgo = subDays(new Date(), 30);
    
    events.forEach(event => {
      const eventDate = parseISO(event.created_at);
      if (eventDate >= thirtyDaysAgo) {
        uniqueUsers.add(event.user_id);
      }
    });

    return uniqueUsers.size;
  }

  async enrichMetricsWithInsights(metrics, type) {
    const insights = [];

    // Add trend analysis
    if (metrics.data && metrics.data.length > 1) {
      const trend = this.calculateTrend(metrics.data);
      insights.push({
        type: 'trend',
        direction: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
        magnitude: Math.abs(trend),
        confidence: this.calculateTrendConfidence(metrics.data)
      });
    }

    // Add anomaly detection
    const anomalies = this.detectAnomalies(metrics.data);
    if (anomalies.length > 0) {
      insights.push({
        type: 'anomaly',
        count: anomalies.length,
        details: anomalies
      });
    }

    // Add benchmarking
    const benchmarks = await this.getBenchmarks(type);
    const comparison = this.compareToBenchmarks(metrics.metrics, benchmarks);
    insights.push({
      type: 'benchmark',
      status: comparison.status,
      details: comparison.details
    });

    return {
      ...metrics,
      insights
    };
  }

  calculateTrend(data) {
    if (!data || data.length < 2) return 0;
    
    const values = data.map(d => d.value);
    const n = values.length;
    
    // Simple linear regression
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  detectAnomalies(data) {
    if (!data || data.length < 10) return [];
    
    const values = data.map(d => d.value);
    const meanValue = mean(values);
    const stdDev = std(values);
    
    const anomalies = [];
    const threshold = 2; // 2 standard deviations
    
    data.forEach((point, index) => {
      const zScore = Math.abs((point.value - meanValue) / stdDev);
      if (zScore > threshold) {
        anomalies.push({
          index,
          date: point.date,
          value: point.value,
          zScore,
          severity: zScore > 3 ? 'high' : 'medium'
        });
      }
    });
    
    return anomalies;
  }

  generateExecutiveSummary(data) {
    const summary = {
      highlights: [],
      concerns: [],
      opportunities: []
    };

    // Analyze key metrics
    if (data.metrics.growthRate > 0.1) {
      summary.highlights.push(`Strong growth rate of ${(data.metrics.growthRate * 100).toFixed(1)}%`);
    }

    if (data.metrics.churnRate > 0.05) {
      summary.concerns.push(`Elevated churn rate of ${(data.metrics.churnRate * 100).toFixed(1)}%`);
    }

    if (data.metrics.conversionRate < 0.02) {
      summary.opportunities.push('Improve conversion funnel to increase revenue');
    }

    return summary;
  }

  calculateUserScore(analytics) {
    let score = 0;
    
    // Engagement score (40%)
    if (analytics.engagement) {
      score += analytics.engagement.engagementRate * 40;
    }
    
    // Content creation score (30%)
    if (analytics.stories) {
      const storyScore = Math.min(analytics.stories.totalStories / 10, 1) * 30;
      score += storyScore;
    }
    
    // Loyalty score (30%)
    if (analytics.engagement) {
      const loyaltyScore = analytics.engagement.daysActive / 30 * 30;
      score += Math.min(loyaltyScore, 30);
    }
    
    return Math.round(score);
  }
}

// Lambda handler
const analyticsIntelligence = new AnalyticsIntelligenceAgent();

exports.handler = async (event) => {
  logger.info('Analytics Intelligence Agent invoked', { 
    eventType: event.type,
    action: event.action,
    requestId: event.requestId || uuidv4()
  });

  try {
    // Initialize agent if needed
    await analyticsIntelligence.initialize();

    // Parse event
    const { action, data } = event;

    switch (action) {
      case 'getMetrics': {
        const { error } = getMetricsSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await analyticsIntelligence.getMetrics(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'getUserAnalytics': {
        const { error } = getUserAnalyticsSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await analyticsIntelligence.getUserAnalytics(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'getPlatformInsights': {
        const { error } = getPlatformInsightsSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await analyticsIntelligence.getPlatformInsights(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'generateReport': {
        const { error } = generateReportSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await analyticsIntelligence.generateReport(data);
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
            agent: 'analytics-intelligence',
            version: '1.0.0',
            initialized: analyticsIntelligence.isInitialized,
            features: [
              'usage_metrics',
              'engagement_analytics',
              'growth_tracking',
              'revenue_analysis',
              'performance_monitoring',
              'user_analytics',
              'platform_insights',
              'report_generation'
            ],
            capabilities: {
              metrics: ['usage', 'engagement', 'growth', 'revenue', 'performance'],
              insights: ['user_behavior', 'content_performance', 'system_health', 'business_metrics'],
              reports: ['executive', 'operational', 'technical', 'financial']
            }
          })
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    logger.error('Analytics Intelligence Agent error', { 
      error: error.message,
      stack: error.stack 
    });
    
    return {
      statusCode: error.message.includes('Validation') ? 400 : 500,
      body: JSON.stringify({
        error: error.message,
        type: 'AnalyticsIntelligenceError'
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
        --description "Storytailor Analytics Intelligence - Business intelligence and platform analytics"
    
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
    --source-arn "arn:aws:events:${AWS_REGION}:${AWS_ACCOUNT_ID}:rule/storytailor-${ENVIRONMENT}-analytics-*" \
    2>/dev/null || true

# Test the function
echo -e "${BLUE}🧪 Testing Analytics Intelligence Agent...${NC}"
TEST_PAYLOAD='{"action":"health"}'

RESULT=$(aws lambda invoke \
    --function-name "$LAMBDA_NAME" \
    --payload "$TEST_PAYLOAD" \
    --cli-binary-format raw-in-base64-out \
    /tmp/analytics-intelligence-test-output.json 2>&1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Test invocation successful${NC}"
    cat /tmp/analytics-intelligence-test-output.json | jq '.'
else
    echo -e "${RED}❌ Test invocation failed${NC}"
    echo "$RESULT"
fi

# Cleanup
cd - > /dev/null
rm -rf "$DEPLOY_DIR"
rm -f /tmp/analytics-intelligence-test-output.json

echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║         🎉 ANALYTICS INTELLIGENCE DEPLOYED! 🎉                    ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Lambda Function: ${LAMBDA_NAME}${NC}"
echo -e "${CYAN}Region: ${AWS_REGION}${NC}"
echo ""
echo -e "${GREEN}✅ Analytics Intelligence is ready to:${NC}"
echo -e "   • Track platform usage and engagement metrics"
echo -e "   • Analyze user behavior and growth patterns"
echo -e "   • Monitor revenue and conversion rates"
echo -e "   • Generate executive and operational reports"
echo -e "   • Provide AI-powered insights and predictions"
echo ""

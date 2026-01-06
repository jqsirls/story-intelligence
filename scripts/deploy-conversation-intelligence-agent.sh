#!/bin/bash
# Deploy Conversation Intelligence Agent Lambda
# Analyzes conversations for insights and quality
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
LAMBDA_NAME="storytailor-conversation-intelligence-${ENVIRONMENT}"
HANDLER_FILE="index.js"

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║      💬 DEPLOYING CONVERSATION INTELLIGENCE AGENT 💬              ║${NC}"
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
DEPLOY_DIR="./lambda-deployments/conversation-intelligence"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

echo -e "${BLUE}📁 Created deployment directory: $DEPLOY_DIR${NC}"

# Create package.json
cat > "$DEPLOY_DIR/package.json" << EOF
{
  "name": "storytailor-conversation-intelligence",
  "version": "1.0.0",
  "description": "Storytailor Conversation Intelligence - Conversation analysis and insights",
  "main": "index.js",
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "redis": "^4.6.0",
    "joi": "^17.11.0",
    "winston": "^3.11.0",
    "uuid": "^9.0.1",
    "sentiment": "^5.0.2",
    "natural": "^6.10.0"
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
const Sentiment = require('sentiment');
const natural = require('natural');

// Configuration
const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  analysis: {
    sentimentThresholds: {
      veryPositive: 5,
      positive: 1,
      neutral: 0,
      negative: -1,
      veryNegative: -5
    },
    qualityMetrics: {
      minResponseLength: 10,
      maxResponseTime: 5000,
      coherenceThreshold: 0.7
    }
  }
};

// Initialize NLP tools
const sentiment = new Sentiment();
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;

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
const analyzeConversationSchema = Joi.object({
  conversationId: Joi.string().uuid().required(),
  messages: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    role: Joi.string().valid('user', 'assistant', 'system').required(),
    content: Joi.string().required(),
    timestamp: Joi.date().iso().required()
  })).min(1).required(),
  userId: Joi.string().uuid().optional(),
  metadata: Joi.object().optional()
});

const getInsightsSchema = Joi.object({
  conversationId: Joi.string().uuid().optional(),
  userId: Joi.string().uuid().optional(),
  timeRange: Joi.object({
    start: Joi.date().iso().required(),
    end: Joi.date().iso().required()
  }).optional(),
  insightType: Joi.string().valid('sentiment', 'topics', 'quality', 'patterns', 'all').default('all')
});

// Conversation Intelligence Service
class ConversationIntelligenceAgent {
  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.serviceKey);
    this.redis = null;
    this.isInitialized = false;
    this.tfidf = new TfIdf();
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Connect to Redis
      this.redis = createRedisClient({ url: config.redis.url });
      await this.redis.connect();
      
      // Test Supabase connection
      const { error } = await this.supabase.from('conversations').select('id').limit(1);
      if (error && !error.message.includes('does not exist')) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }
      
      this.isInitialized = true;
      logger.info('ConversationIntelligenceAgent initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ConversationIntelligenceAgent', { error: error.message });
      throw error;
    }
  }

  async analyzeConversation(data) {
    const { conversationId, messages, userId, metadata } = data;
    const analysisId = uuidv4();
    
    logger.info('Analyzing conversation', { 
      analysisId, 
      conversationId,
      messageCount: messages.length
    });

    try {
      // Perform various analyses
      const sentimentAnalysis = this.analyzeSentiment(messages);
      const topicAnalysis = this.analyzeTopics(messages);
      const qualityMetrics = this.analyzeQuality(messages);
      const conversationFlow = this.analyzeFlow(messages);
      const engagementMetrics = this.analyzeEngagement(messages);

      // Generate insights
      const insights = this.generateInsights({
        sentiment: sentimentAnalysis,
        topics: topicAnalysis,
        quality: qualityMetrics,
        flow: conversationFlow,
        engagement: engagementMetrics
      });

      // Store analysis results
      const analysis = {
        id: analysisId,
        conversation_id: conversationId,
        user_id: userId,
        sentiment: sentimentAnalysis,
        topics: topicAnalysis,
        quality: qualityMetrics,
        flow: conversationFlow,
        engagement: engagementMetrics,
        insights,
        metadata,
        analyzed_at: new Date().toISOString()
      };

      // Save to database
      const { error: dbError } = await this.supabase
        .from('conversation_analyses')
        .insert(analysis);
        
      if (dbError && !dbError.message.includes('does not exist')) {
        logger.warn('Could not store analysis', { error: dbError.message });
      }

      // Cache results
      await this.redis.set(
        `analysis:${conversationId}`,
        JSON.stringify(analysis),
        { EX: 3600 } // 1 hour cache
      );

      logger.info('Conversation analysis completed', { 
        analysisId,
        overallSentiment: sentimentAnalysis.overall,
        topicCount: topicAnalysis.mainTopics.length
      });

      return {
        success: true,
        analysis: {
          id: analysisId,
          conversationId,
          sentiment: sentimentAnalysis,
          topics: topicAnalysis,
          quality: qualityMetrics,
          insights
        }
      };

    } catch (error) {
      logger.error('Conversation analysis failed', { 
        analysisId, 
        error: error.message 
      });
      throw error;
    }
  }

  analyzeSentiment(messages) {
    const sentiments = messages.map(msg => {
      const result = sentiment.analyze(msg.content);
      return {
        messageId: msg.id,
        role: msg.role,
        score: result.score,
        comparative: result.comparative,
        positive: result.positive,
        negative: result.negative,
        sentiment: this.categorize }
    });

    // Calculate overall sentiment
    const userSentiments = sentiments.filter(s => s.role === 'user');
    const avgScore = userSentiments.reduce((sum, s) => sum + s.score, 0) / userSentiments.length || 0;
    
    return {
      overall: this.categorizeSentiment(avgScore),
      score: avgScore,
      byMessage: sentiments,
      trend: this.calculateSentimentTrend(sentiments),
      distribution: this.calculateSentimentDistribution(sentiments)
    };
  }

  categorizeSentiment(score) {
    const { sentimentThresholds } = config.analysis;
    
    if (score >= sentimentThresholds.veryPositive) return 'very_positive';
    if (score >= sentimentThresholds.positive) return 'positive';
    if (score > sentimentThresholds.negative) return 'neutral';
    if (score > sentimentThresholds.veryNegative) return 'negative';
    return 'very_negative';
  }

  calculateSentimentTrend(sentiments) {
    if (sentiments.length < 2) return 'stable';
    
    const firstHalf = sentiments.slice(0, Math.floor(sentiments.length / 2));
    const secondHalf = sentiments.slice(Math.floor(sentiments.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, s) => sum + s.score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, s) => sum + s.score, 0) / secondHalf.length;
    
    const diff = secondAvg - firstAvg;
    
    if (diff > 2) return 'improving';
    if (diff < -2) return 'declining';
    return 'stable';
  }

  calculateSentimentDistribution(sentiments) {
    const distribution = {
      very_positive: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      very_negative: 0
    };
    
    sentiments.forEach(s => {
      distribution[s.sentiment]++;
    });
    
    return distribution;
  }

  analyzeTopics(messages) {
    // Clear previous documents
    this.tfidf = new TfIdf();
    
    // Add all messages to TF-IDF
    messages.forEach(msg => {
      this.tfidf.addDocument(msg.content);
    });
    
    // Extract key terms
    const keyTerms = [];
    messages.forEach((msg, idx) => {
      const terms = this.tfidf.listTerms(idx);
      terms.slice(0, 5).forEach(term => {
        keyTerms.push({
          term: term.term,
          tfidf: term.tfidf,
          messageIdx: idx
        });
      });
    });
    
    // Group and rank topics
    const topicMap = new Map();
    keyTerms.forEach(kt => {
      if (topicMap.has(kt.term)) {
        topicMap.get(kt.term).score += kt.tfidf;
        topicMap.get(kt.term).count++;
      } else {
        topicMap.set(kt.term, {
          term: kt.term,
          score: kt.tfidf,
          count: 1
        });
      }
    });
    
    // Convert to array and sort by score
    const mainTopics = Array.from(topicMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(t => ({
        topic: t.term,
        relevance: t.score / messages.length,
        frequency: t.count
      }));
    
    return {
      mainTopics,
      topicDiversity: mainTopics.length / 10, // 0-1 score
      topicCoherence: this.calculateTopicCoherence(mainTopics)
    };
  }

  calculateTopicCoherence(topics) {
    // Simple coherence based on topic count
    if (topics.length < 3) return 1.0;
    if (topics.length < 5) return 0.8;
    if (topics.length < 8) return 0.6;
    return 0.4;
  }

  analyzeQuality(messages) {
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    
    const metrics = {
      avgResponseLength: 0,
      avgResponseTime: 0,
      coherenceScore: 0,
      completenessScore: 0,
      relevanceScore: 0
    };
    
    if (assistantMessages.length === 0) return metrics;
    
    // Calculate average response length
    const totalLength = assistantMessages.reduce((sum, m) => sum + m.content.length, 0);
    metrics.avgResponseLength = totalLength / assistantMessages.length;
    
    // Calculate response times (if timestamps available)
    let totalResponseTime = 0;
    let responseCount = 0;
    
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].role === 'assistant' && messages[i-1].role === 'user') {
        const responseTime = new Date(messages[i].timestamp) - new Date(messages[i-1].timestamp);
        totalResponseTime += responseTime;
        responseCount++;
      }
    }
    
    if (responseCount > 0) {
      metrics.avgResponseTime = totalResponseTime / responseCount;
    }
    
    // Calculate coherence (simplified)
    metrics.coherenceScore = Math.min(metrics.avgResponseLength / 100, 1);
    
    // Calculate completeness (simplified)
    metrics.completenessScore = assistantMessages.every(m => 
      m.content.length >= config.analysis.qualityMetrics.minResponseLength
    ) ? 1 : 0.5;
    
    // Calculate relevance (simplified)
    metrics.relevanceScore = 0.8; // Would need more sophisticated analysis
    
    return metrics;
  }

  analyzeFlow(messages) {
    const turns = [];
    let currentTurn = null;
    
    messages.forEach((msg, idx) => {
      if (msg.role === 'user') {
        if (currentTurn) {
          turns.push(currentTurn);
        }
        currentTurn = {
          userMessage: msg,
          assistantResponse: null,
          turnNumber: turns.length + 1
        };
      } else if (msg.role === 'assistant' && currentTurn) {
        currentTurn.assistantResponse = msg;
      }
    });
    
    if (currentTurn) {
      turns.push(currentTurn);
    }
    
    return {
      totalTurns: turns.length,
      completedTurns: turns.filter(t => t.assistantResponse).length,
      avgTurnLength: this.calculateAvgTurnLength(turns),
      conversationPattern: this.identifyPattern(turns),
      flowQuality: this.assessFlowQuality(turns)
    };
  }

  calculateAvgTurnLength(turns) {
    if (turns.length === 0) return 0;
    
    const totalLength = turns.reduce((sum, turn) => {
      const userLength = turn.userMessage.content.length;
      const assistantLength = turn.assistantResponse?.content.length || 0;
      return sum + userLength + assistantLength;
    }, 0);
    
    return totalLength / turns.length;
  }

  identifyPattern(turns) {
    if (turns.length < 3) return 'brief';
    if (turns.length < 10) return 'normal';
    if (turns.length < 20) return 'extended';
    return 'long';
  }

  assessFlowQuality(turns) {
    let score = 1.0;
    
    // Penalize incomplete turns
    const incompleteTurns = turns.filter(t => !t.assistantResponse).length;
    score -= (incompleteTurns / turns.length) * 0.5;
    
    // Check for conversation continuity
    let abruptChanges = 0;
    for (let i = 1; i < turns.length; i++) {
      // Simple check - would need more sophisticated analysis
      if (turns[i].userMessage.content.length < 5) {
        abruptChanges++;
      }
    }
    score -= (abruptChanges / turns.length) * 0.3;
    
    return Math.max(0, score);
  }

  analyzeEngagement(messages) {
    const userMessages = messages.filter(m => m.role === 'user');
    
    return {
      userMessageCount: userMessages.length,
      avgUserMessageLength: userMessages.reduce((sum, m) => sum + m.content.length, 0) / userMessages.length || 0,
      questionCount: userMessages.filter(m => m.content.includes('?')).length,
      exclamationCount: userMessages.filter(m => m.content.includes('!')).length,
      engagementScore: this.calculateEngagementScore(userMessages)
    };
  }

  calculateEngagementScore(userMessages) {
    if (userMessages.length === 0) return 0;
    
    let score = 0;
    
    // More messages = higher engagement
    score += Math.min(userMessages.length / 10, 1) * 0.3;
    
    // Longer messages = higher engagement
    const avgLength = userMessages.reduce((sum, m) => sum + m.content.length, 0) / userMessages.length;
    score += Math.min(avgLength / 100, 1) * 0.3;
    
    // Questions = higher engagement
    const questionRatio = userMessages.filter(m => m.content.includes('?')).length / userMessages.length;
    score += questionRatio * 0.2;
    
    // Exclamations = higher engagement
    const exclamationRatio = userMessages.filter(m => m.content.includes('!')).length / userMessages.length;
    score += exclamationRatio * 0.2;
    
    return score;
  }

  generateInsights(analysis) {
    const insights = [];
    
    // Sentiment insights
    if (analysis.sentiment.overall === 'very_negative' || analysis.sentiment.overall === 'negative') {
      insights.push({
        type: 'warning',
        category: 'sentiment',
        message: 'User sentiment is negative. Consider intervention or support.',
        priority: 'high'
      });
    }
    
    if (analysis.sentiment.trend === 'declining') {
      insights.push({
        type: 'warning',
        category: 'sentiment',
        message: 'Sentiment is declining throughout the conversation.',
        priority: 'medium'
      });
    }
    
    // Quality insights
    if (analysis.quality.avgResponseTime > config.analysis.qualityMetrics.maxResponseTime) {
      insights.push({
        type: 'improvement',
        category: 'quality',
        message: 'Response times are slower than optimal.',
        priority: 'medium'
      });
    }
    
    if (analysis.quality.coherenceScore < config.analysis.qualityMetrics.coherenceThreshold) {
      insights.push({
        type: 'improvement',
        category: 'quality',
        message: 'Response coherence could be improved.',
        priority: 'medium'
      });
    }
    
    // Engagement insights
    if (analysis.engagement.engagementScore > 0.8) {
      insights.push({
        type: 'positive',
        category: 'engagement',
        message: 'High user engagement detected.',
        priority: 'low'
      });
    }
    
    // Flow insights
    if (analysis.flow.flowQuality < 0.5) {
      insights.push({
        type: 'improvement',
        category: 'flow',
        message: 'Conversation flow has interruptions or incomplete turns.',
        priority: 'medium'
      });
    }
    
    return insights;
  }

  async getInsights(params) {
    const { conversationId, userId, timeRange, insightType } = params;
    const insightId = uuidv4();
    
    logger.info('Retrieving conversation insights', { 
      insightId, 
      conversationId,
      userId,
      insightType
    });

    try {
      let analyses = [];
      
      // Retrieve relevant analyses
      if (conversationId) {
        // Get specific conversation analysis
        const cached = await this.redis.get(`analysis:${conversationId}`);
        if (cached) {
          analyses.push(JSON.parse(cached));
        } else {
          const { data } = await this.supabase
            .from('conversation_analyses')
            .select('*')
            .eq('conversation_id', conversationId)
            .single();
          if (data) analyses.push(data);
        }
      } else if (userId || timeRange) {
        // Get multiple analyses
        let query = this.supabase.from('conversation_analyses').select('*');
        
        if (userId) {
          query = query.eq('user_id', userId);
        }
        
        if (timeRange) {
          query = query
            .gte('analyzed_at', timeRange.start)
            .lte('analyzed_at', timeRange.end);
        }
        
        const { data } = await query;
        analyses = data || [];
      }
      
      // Aggregate insights based on type
      let aggregatedInsights;
      
      switch (insightType) {
        case 'sentiment':
          aggregatedInsights = this.aggregateSentimentInsights(analyses);
          break;
        case 'topics':
          aggregatedInsights = this.aggregateTopicInsights(analyses);
          break;
        case 'quality':
          aggregatedInsights = this.aggregateQualityInsights(analyses);
          break;
        case 'patterns':
          aggregatedInsights = this.aggregatePatternInsights(analyses);
          break;
        default:
          aggregatedInsights = {
            sentiment: this.aggregateSentimentInsights(analyses),
            topics: this.aggregateTopicInsights(analyses),
            quality: this.aggregateQualityInsights(analyses),
            patterns: this.aggregatePatternInsights(analyses)
          };
      }
      
      logger.info('Insights retrieved successfully', { 
        insightId,
        analysisCount: analyses.length
      });
      
      return {
        success: true,
        insights: aggregatedInsights,
        metadata: {
          analysisCount: analyses.length,
          timeRange: timeRange || null,
          insightType
        }
      };
      
    } catch (error) {
      logger.error('Failed to retrieve insights', { 
        insightId, 
        error: error.message 
      });
      throw error;
    }
  }

  aggregateSentimentInsights(analyses) {
    if (analyses.length === 0) return null;
    
    const sentiments = analyses.map(a => a.sentiment);
    const avgScore = sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length;
    
    return {
      averageSentiment: this.categorizeSentiment(avgScore),
      averageScore: avgScore,
      trendDistribution: this.aggregateTrends(sentiments.map(s => s.trend)),
      overallDistribution: this.mergeDistributions(sentiments.map(s => s.distribution))
    };
  }

  aggregateTopicInsights(analyses) {
    if (analyses.length === 0) return null;
    
    const allTopics = new Map();
    
    analyses.forEach(a => {
      a.topics.mainTopics.forEach(topic => {
        if (allTopics.has(topic.topic)) {
          allTopics.get(topic.topic).count++;
          allTopics.get(topic.topic).totalRelevance += topic.relevance;
        } else {
          allTopics.set(topic.topic, {
            topic: topic.topic,
            count: 1,
            totalRelevance: topic.relevance
          });
        }
      });
    });
    
    const topTopics = Array.from(allTopics.values())
      .map(t => ({
        topic: t.topic,
        frequency: t.count / analyses.length,
        avgRelevance: t.totalRelevance / t.count
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20);
    
    return {
      topTopics,
      topicDiversity: this.calculateOverallDiversity(analyses.map(a => a.topics.topicDiversity))
    };
  }

  aggregateQualityInsights(analyses) {
    if (analyses.length === 0) return null;
    
    const qualities = analyses.map(a => a.quality);
    
    return {
      avgResponseLength: qualities.reduce((sum, q) => sum + q.avgResponseLength, 0) / qualities.length,
      avgResponseTime: qualities.reduce((sum, q) => sum + q.avgResponseTime, 0) / qualities.length,
      avgCoherenceScore: qualities.reduce((sum, q) => sum + q.coherenceScore, 0) / qualities.length,
      avgCompletenessScore: qualities.reduce((sum, q) => sum + q.completenessScore, 0) / qualities.length,
      avgRelevanceScore: qualities.reduce((sum, q) => sum + q.relevanceScore, 0) / qualities.length
    };
  }

  aggregatePatternInsights(analyses) {
    if (analyses.length === 0) return null;
    
    const flows = analyses.map(a => a.flow);
    const engagements = analyses.map(a => a.engagement);
    
    return {
      avgConversationLength: flows.reduce((sum, f) => sum + f.totalTurns, 0) / flows.length,
      patternDistribution: this.aggregatePatterns(flows.map(f => f.conversationPattern)),
      avgEngagementScore: engagements.reduce((sum, e) => sum + e.engagementScore, 0) / engagements.length,
      avgQuestionsPerConversation: engagements.reduce((sum, e) => sum + e.questionCount, 0) / engagements.length
    };
  }

  aggregateTrends(trends) {
    const distribution = {
      improving: 0,
      stable: 0,
      declining: 0
    };
    
    trends.forEach(trend => {
      distribution[trend]++;
    });
    
    return distribution;
  }

  mergeDistributions(distributions) {
    const merged = {
      very_positive: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      very_negative: 0
    };
    
    distributions.forEach(dist => {
      Object.keys(dist).forEach(key => {
        merged[key] += dist[key];
      });
    });
    
    return merged;
  }

  aggregatePatterns(patterns) {
    const distribution = {
      brief: 0,
      normal: 0,
      extended: 0,
      long: 0
    };
    
    patterns.forEach(pattern => {
      distribution[pattern]++;
    });
    
    return distribution;
  }

  calculateOverallDiversity(diversities) {
    return diversities.reduce((sum, d) => sum + d, 0) / diversities.length;
  }
}

// Lambda handler
const conversationIntelligence = new ConversationIntelligenceAgent();

exports.handler = async (event) => {
  logger.info('Conversation Intelligence Agent invoked', { 
    eventType: event.type,
    action: event.action,
    requestId: event.requestId || uuidv4()
  });

  try {
    // Initialize agent if needed
    await conversationIntelligence.initialize();

    // Parse event
    const { action, data } = event;

    switch (action) {
      case 'analyzeConversation': {
        const { error } = analyzeConversationSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await conversationIntelligence.analyzeConversation(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'getInsights': {
        const { error } = getInsightsSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await conversationIntelligence.getInsights(data);
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
            agent: 'conversation-intelligence',
            version: '1.0.0',
            initialized: conversationIntelligence.isInitialized,
            features: [
              'sentiment_analysis',
              'topic_extraction',
              'quality_assessment',
              'flow_analysis',
              'engagement_metrics',
              'insight_generation',
              'pattern_recognition'
            ]
          })
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    logger.error('Conversation Intelligence Agent error', { 
      error: error.message,
      stack: error.stack 
    });
    
    return {
      statusCode: error.message.includes('Validation') ? 400 : 500,
      body: JSON.stringify({
        error: error.message,
        type: 'ConversationIntelligenceError'
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
        --description "Storytailor Conversation Intelligence - Conversation analysis and insights"
    
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
    --source-arn "arn:aws:events:${AWS_REGION}:${AWS_ACCOUNT_ID}:rule/storytailor-${ENVIRONMENT}-conversation-*" \
    2>/dev/null || true

# Test the function
echo -e "${BLUE}🧪 Testing Conversation Intelligence Agent...${NC}"
TEST_PAYLOAD='{"action":"health"}'

RESULT=$(aws lambda invoke \
    --function-name "$LAMBDA_NAME" \
    --payload "$TEST_PAYLOAD" \
    --cli-binary-format raw-in-base64-out \
    /tmp/conversation-intelligence-test-output.json 2>&1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Test invocation successful${NC}"
    cat /tmp/conversation-intelligence-test-output.json | jq '.'
else
    echo -e "${RED}❌ Test invocation failed${NC}"
    echo "$RESULT"
fi

# Cleanup
cd - > /dev/null
rm -rf "$DEPLOY_DIR"
rm -f /tmp/conversation-intelligence-test-output.json

echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║      🎉 CONVERSATION INTELLIGENCE DEPLOYED! 🎉                    ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Lambda Function: ${LAMBDA_NAME}${NC}"
echo -e "${CYAN}Region: ${AWS_REGION}${NC}"
echo ""
echo -e "${GREEN}✅ Conversation Intelligence is ready to:${NC}"
echo -e "   • Analyze conversation sentiment and emotions"
echo -e "   • Extract topics and themes"
echo -e "   • Assess conversation quality"
echo -e "   • Track engagement metrics"
echo -e "   • Generate actionable insights"
echo ""

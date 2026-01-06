#!/bin/bash
# Deploy Child Safety Agent Lambda
# Handles crisis detection and child safety measures
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
LAMBDA_NAME="storytailor-child-safety-agent-${ENVIRONMENT}"
HANDLER_FILE="index.js"

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║               🛡️  DEPLOYING CHILD SAFETY AGENT 🛡️                 ║${NC}"
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
DEPLOY_DIR="./lambda-deployments/child-safety-agent"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

echo -e "${BLUE}📁 Created deployment directory: $DEPLOY_DIR${NC}"

# Create package.json
cat > "$DEPLOY_DIR/package.json" << EOF
{
  "name": "storytailor-child-safety-agent",
  "version": "1.0.0",
  "description": "Storytailor Child Safety Agent - Crisis detection and safety measures",
  "main": "index.js",
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "redis": "^4.6.0",
    "joi": "^17.11.0",
    "winston": "^3.11.0",
    "uuid": "^9.0.1",
    "natural": "^6.0.0"
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
  safety: {
    crisisKeywords: [
      'hurt', 'pain', 'scared', 'help', 'emergency', 'danger',
      'bad touch', 'hit', 'abuse', 'suicide', 'kill', 'die'
    ],
    responseDelayMs: 100,
    maxContentLength: 5000
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
const analyzeContentSchema = Joi.object({
  content: Joi.string().max(5000).required(),
  userId: Joi.string().required(),
  conversationId: Joi.string().required(),
  metadata: Joi.object().optional()
});

const reportIncidentSchema = Joi.object({
  userId: Joi.string().required(),
  conversationId: Joi.string().required(),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
  category: Joi.string().required(),
  description: Joi.string().required()
});

// Services
class ChildSafetyAgent {
  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.serviceKey);
    this.redis = null;
    this.isInitialized = false;
    this.tokenizer = new natural.WordTokenizer();
    this.sentiment = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Connect to Redis
      this.redis = createRedisClient({ url: config.redis.url });
      await this.redis.connect();
      
      // Test Supabase connection
      const { error } = await this.supabase.from('safety_incidents').select('id').limit(1);
      if (error && !error.message.includes('does not exist')) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }
      
      this.isInitialized = true;
      logger.info('ChildSafetyAgent initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ChildSafetyAgent', { error: error.message });
      throw error;
    }
  }

  async analyzeContent(data) {
    const { content, userId, conversationId, metadata } = data;
    const analysisId = uuidv4();
    
    logger.info('Analyzing content for safety', { 
      analysisId, 
      userId,
      conversationId,
      contentLength: content.length
    });

    try {
      // Tokenize and analyze
      const tokens = this.tokenizer.tokenize(content.toLowerCase());
      const sentimentScore = this.sentiment.getSentiment(tokens);
      
      // Check for crisis keywords
      const detectedKeywords = [];
      for (const keyword of config.safety.crisisKeywords) {
        if (content.toLowerCase().includes(keyword)) {
          detectedKeywords.push(keyword);
        }
      }
      
      // Calculate risk score
      const riskScore = this.calculateRiskScore(content, detectedKeywords, sentimentScore);
      
      // Determine severity
      const severity = this.determineSeverity(riskScore, detectedKeywords);
      
      // Store analysis in cache
      const cacheKey = `safety_analysis:${analysisId}`;
      await this.redis.set(cacheKey, JSON.stringify({
        analysisId,
        userId,
        conversationId,
        timestamp: new Date().toISOString(),
        riskScore,
        severity,
        detectedKeywords,
        sentimentScore,
        metadata
      }), {
        EX: 86400 // 24 hour retention
      });
      
      // If high risk, store incident
      if (severity === 'high' || severity === 'critical') {
        await this.createIncident({
          userId,
          conversationId,
          severity,
          category: 'automated_detection',
          description: `High-risk content detected with keywords: ${detectedKeywords.join(', ')}`,
          analysisId
        });
      }
      
      logger.info('Content analysis complete', { 
        analysisId, 
        severity,
        riskScore,
        keywordCount: detectedKeywords.length
      });

      return {
        analysisId,
        safe: severity === 'none' || severity === 'low',
        severity,
        riskScore,
        recommendations: this.getRecommendations(severity, detectedKeywords),
        requiresReview: severity === 'high' || severity === 'critical',
        metadata: {
          keywordsDetected: detectedKeywords.length,
          sentimentScore,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Content analysis failed', { 
        analysisId, 
        error: error.message 
      });
      throw error;
    }
  }

  calculateRiskScore(content, keywords, sentiment) {
    let score = 0;
    
    // Keyword scoring
    score += keywords.length * 15;
    
    // Sentiment scoring
    if (sentiment < -0.5) score += 20;
    else if (sentiment < -0.2) score += 10;
    
    // Content patterns
    if (content.includes('!') && keywords.length > 0) score += 5;
    if (content.toUpperCase() === content && content.length > 10) score += 5;
    
    // Normalize to 0-100
    return Math.min(100, Math.max(0, score));
  }

  determineSeverity(riskScore, keywords) {
    if (riskScore >= 80 || keywords.includes('suicide') || keywords.includes('kill')) {
      return 'critical';
    } else if (riskScore >= 60) {
      return 'high';
    } else if (riskScore >= 40) {
      return 'medium';
    } else if (riskScore >= 20) {
      return 'low';
    }
    return 'none';
  }

  getRecommendations(severity, keywords) {
    const recommendations = [];
    
    switch (severity) {
      case 'critical':
        recommendations.push('Immediate adult intervention required');
        recommendations.push('Contact emergency services if immediate danger');
        recommendations.push('Provide crisis helpline resources');
        break;
      case 'high':
        recommendations.push('Adult supervision recommended');
        recommendations.push('Consider professional counseling');
        recommendations.push('Monitor future interactions closely');
        break;
      case 'medium':
        recommendations.push('Check in with the child');
        recommendations.push('Provide emotional support resources');
        break;
      case 'low':
        recommendations.push('Continue normal monitoring');
        break;
    }
    
    // Specific keyword recommendations
    if (keywords.includes('bad touch') || keywords.includes('abuse')) {
      recommendations.push('Contact child protective services');
      recommendations.push('Document incident thoroughly');
    }
    
    return recommendations;
  }

  async createIncident(data) {
    try {
      const incident = {
        id: uuidv4(),
        user_id: data.userId,
        conversation_id: data.conversationId,
        severity: data.severity,
        category: data.category,
        description: data.description,
        analysis_id: data.analysisId,
        created_at: new Date().toISOString(),
        status: 'open'
      };
      
      // Store in database (if table exists)
      try {
        await this.supabase
          .from('safety_incidents')
          .insert(incident);
      } catch (dbError) {
        logger.warn('Could not store incident in database', { error: dbError.message });
      }
      
      // Always store in cache
      const cacheKey = `incident:${incident.id}`;
      await this.redis.set(cacheKey, JSON.stringify(incident), {
        EX: 604800 // 7 day retention
      });
      
      logger.info('Safety incident created', { 
        incidentId: incident.id,
        severity: incident.severity
      });
      
      return incident;
    } catch (error) {
      logger.error('Failed to create incident', { error: error.message });
      throw error;
    }
  }

  async getIncidentHistory(userId, limit = 10) {
    try {
      // Try database first
      try {
        const { data, error } = await this.supabase
          .from('safety_incidents')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (!error && data) return data;
      } catch (dbError) {
        logger.warn('Could not fetch from database', { error: dbError.message });
      }
      
      // Fallback to cache scan (less efficient)
      const pattern = 'incident:*';
      const keys = await this.redis.keys(pattern);
      const incidents = [];
      
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const incident = JSON.parse(data);
          if (incident.user_id === userId) {
            incidents.push(incident);
          }
        }
      }
      
      return incidents
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit);
        
    } catch (error) {
      logger.error('Failed to get incident history', { error: error.message });
      throw error;
    }
  }
}

// Lambda handler
const safetyAgent = new ChildSafetyAgent();

exports.handler = async (event) => {
  logger.info('Child Safety Agent invoked', { 
    eventType: event.type,
    action: event.action,
    requestId: event.requestId || uuidv4()
  });

  try {
    // Initialize agent if needed
    await safetyAgent.initialize();

    // Parse event
    const { action, data } = event;

    switch (action) {
      case 'analyzeContent': {
        const { error } = analyzeContentSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await safetyAgent.analyzeContent(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'reportIncident': {
        const { error } = reportIncidentSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const incident = await safetyAgent.createIncident(data);
        return {
          statusCode: 200,
          body: JSON.stringify(incident)
        };
      }

      case 'getIncidentHistory': {
        if (!data.userId) throw new Error('userId is required');
        
        const history = await safetyAgent.getIncidentHistory(data.userId, data.limit);
        return {
          statusCode: 200,
          body: JSON.stringify({ incidents: history })
        };
      }

      case 'health': {
        return {
          statusCode: 200,
          body: JSON.stringify({
            status: 'healthy',
            agent: 'child-safety-agent',
            version: '1.0.0',
            initialized: safetyAgent.isInitialized,
            features: [
              'content_analysis',
              'crisis_detection',
              'incident_reporting',
              'sentiment_analysis'
            ]
          })
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    logger.error('Child Safety Agent error', { 
      error: error.message,
      stack: error.stack 
    });
    
    return {
      statusCode: error.message.includes('Validation') ? 400 : 500,
      body: JSON.stringify({
        error: error.message,
        type: 'ChildSafetyAgentError'
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

# Get environment variables from Parameter Store
echo -e "${BLUE}🔧 Loading environment configuration...${NC}"
SUPABASE_URL=$(aws ssm get-parameter --name "${PREFIX}/supabase-url" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")
SUPABASE_SERVICE_KEY=$(aws ssm get-parameter --name "${PREFIX}/supabase-service-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")
REDIS_URL=$(aws ssm get-parameter --name "${PREFIX}/redis-url" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")

# Check if Lambda exists
LAMBDA_EXISTS=$(aws lambda get-function --function-name "$LAMBDA_NAME" 2>&1 | grep -c "FunctionName" || true)

if [ "$LAMBDA_EXISTS" -eq 0 ]; then
    echo -e "${YELLOW}🆕 Creating new Lambda function...${NC}"
    
    # Create Lambda function
    aws lambda create-function \
        --function-name "$LAMBDA_NAME" \
        --runtime nodejs20.x \
        --handler "$HANDLER_FILE.handler" \
        --role "$LAMBDA_ROLE_ARN" \
        --zip-file fileb://deployment.zip \
        --timeout 30 \
        --memory-size 512 \
        --environment Variables="{
            ENVIRONMENT='$ENVIRONMENT',
            SUPABASE_URL='$SUPABASE_URL',
            SUPABASE_SERVICE_ROLE_KEY='$SUPABASE_SERVICE_KEY',
            REDIS_URL='$REDIS_URL'
        }" \
        --description "Storytailor Child Safety Agent - Crisis detection and safety measures"
    
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
        --timeout 30 \
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
    --source-arn "arn:aws:events:${AWS_REGION}:${AWS_ACCOUNT_ID}:rule/storytailor-${ENVIRONMENT}-safety-*" \
    2>/dev/null || true

# Test the function
echo -e "${BLUE}🧪 Testing Child Safety Agent...${NC}"
TEST_PAYLOAD='{"action":"health"}'

RESULT=$(aws lambda invoke \
    --function-name "$LAMBDA_NAME" \
    --payload "$TEST_PAYLOAD" \
    --cli-binary-format raw-in-base64-out \
    /tmp/child-safety-agent-test-output.json 2>&1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Test invocation successful${NC}"
    cat /tmp/child-safety-agent-test-output.json | jq '.'
else
    echo -e "${RED}❌ Test invocation failed${NC}"
    echo "$RESULT"
fi

# Cleanup
cd - > /dev/null
rm -rf "$DEPLOY_DIR"
rm -f /tmp/child-safety-agent-test-output.json

echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║              🎉 CHILD SAFETY AGENT DEPLOYED! 🎉                   ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Lambda Function: ${LAMBDA_NAME}${NC}"
echo -e "${CYAN}Region: ${AWS_REGION}${NC}"
echo ""
echo -e "${GREEN}✅ Child Safety Agent is ready to:${NC}"
echo -e "   • Analyze content for safety concerns"
echo -e "   • Detect crisis keywords and patterns"
echo -e "   • Create and track safety incidents"
echo -e "   • Provide intervention recommendations"
echo ""
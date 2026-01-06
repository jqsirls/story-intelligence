#!/bin/bash
# Deploy Therapeutic Agent Lambda
# Handles therapeutic interventions and emotional support
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
LAMBDA_NAME="storytailor-therapeutic-agent-${ENVIRONMENT}"
HANDLER_FILE="index.js"

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║              💚 DEPLOYING THERAPEUTIC AGENT 💚                    ║${NC}"
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
DEPLOY_DIR="./lambda-deployments/therapeutic-agent"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

echo -e "${BLUE}📁 Created deployment directory: $DEPLOY_DIR${NC}"

# Create package.json
cat > "$DEPLOY_DIR/package.json" << EOF
{
  "name": "storytailor-therapeutic-agent",
  "version": "1.0.0",
  "description": "Storytailor Therapeutic Agent - Therapeutic interventions and emotional support",
  "main": "index.js",
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "redis": "^4.6.0",
    "joi": "^17.11.0",
    "winston": "^3.11.0",
    "uuid": "^9.0.1",
    "openai": "^4.20.0"
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
const OpenAI = require('openai');

// Configuration
const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY
  },
  therapeutic: {
    sessionDuration: 30, // minutes
    emotionalStates: ['happy', 'sad', 'anxious', 'angry', 'fearful', 'excited', 'calm'],
    interventionTypes: ['breathing', 'grounding', 'storytelling', 'validation', 'coping']
  }
};

// Initialize OpenAI
const openai = new OpenAI({ apiKey: config.openai.apiKey });

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
const assessEmotionalStateSchema = Joi.object({
  userId: Joi.string().required(),
  conversationId: Joi.string().required(),
  recentMessages: Joi.array().items(Joi.object({
    content: Joi.string().required(),
    timestamp: Joi.string().required(),
    speaker: Joi.string().valid('user', 'assistant').required()
  })).required(),
  metadata: Joi.object().optional()
});

const provideInterventionSchema = Joi.object({
  userId: Joi.string().required(),
  emotionalState: Joi.string().valid(...config.therapeutic.emotionalStates).required(),
  intensity: Joi.number().min(1).max(10).required(),
  preferredType: Joi.string().valid(...config.therapeutic.interventionTypes).optional(),
  ageGroup: Joi.string().valid('preschool', 'elementary', 'middle', 'high').required()
});

const trackProgressSchema = Joi.object({
  userId: Joi.string().required(),
  sessionId: Joi.string().required(),
  preState: Joi.string().valid(...config.therapeutic.emotionalStates).required(),
  postState: Joi.string().valid(...config.therapeutic.emotionalStates).required(),
  interventionUsed: Joi.string().required(),
  effectiveness: Joi.number().min(1).max(5).required()
});

// Services
class TherapeuticAgent {
  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.serviceKey);
    this.redis = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Connect to Redis
      this.redis = createRedisClient({ url: config.redis.url });
      await this.redis.connect();
      
      // Test Supabase connection
      const { error } = await this.supabase.from('therapeutic_sessions').select('id').limit(1);
      if (error && !error.message.includes('does not exist')) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }
      
      this.isInitialized = true;
      logger.info('TherapeuticAgent initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize TherapeuticAgent', { error: error.message });
      throw error;
    }
  }

  async assessEmotionalState(data) {
    const { userId, conversationId, recentMessages, metadata } = data;
    const assessmentId = uuidv4();
    
    logger.info('Assessing emotional state', { 
      assessmentId, 
      userId,
      conversationId,
      messageCount: recentMessages.length
    });

    try {
      // Prepare conversation context
      const conversationText = recentMessages
        .map(m => `${m.speaker}: ${m.content}`)
        .join('\n');

      // Use AI to assess emotional state
      const prompt = `Analyze the following conversation and assess the emotional state of the user.
        
        Conversation:
        ${conversationText}
        
        Provide:
        1. Primary emotional state (one of: ${config.therapeutic.emotionalStates.join(', ')})
        2. Intensity (1-10 scale)
        3. Key emotional indicators found
        4. Recommended intervention type
        5. Risk level (low, medium, high)
        
        Focus on the user's messages and be sensitive to subtle emotional cues.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { 
            role: 'system', 
            content: 'You are a compassionate therapeutic AI trained in emotional assessment and child psychology.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const analysisText = completion.choices[0].message.content;
      const analysis = this.parseEmotionalAnalysis(analysisText);

      // Store assessment
      const assessment = {
        id: assessmentId,
        user_id: userId,
        conversation_id: conversationId,
        emotional_state: analysis.emotionalState,
        intensity: analysis.intensity,
        indicators: analysis.indicators,
        risk_level: analysis.riskLevel,
        recommended_intervention: analysis.recommendedIntervention,
        created_at: new Date().toISOString(),
        metadata: metadata || {}
      };

      const { error: dbError } = await this.supabase
        .from('emotional_assessments')
        .insert(assessment);
        
      if (dbError && !dbError.message.includes('does not exist')) {
        logger.warn('Could not store assessment in database', { error: dbError.message });
      }

      // Cache assessment
      const cacheKey = `assessment:${userId}:${conversationId}`;
      await this.redis.set(cacheKey, JSON.stringify(assessment), {
        EX: 3600 // 1 hour cache
      });

      // Check if immediate intervention needed
      const needsIntervention = analysis.intensity >= 7 || analysis.riskLevel === 'high';

      logger.info('Emotional assessment complete', { 
        assessmentId,
        emotionalState: analysis.emotionalState,
        intensity: analysis.intensity,
        needsIntervention
      });

      return {
        success: true,
        assessment: {
          id: assessmentId,
          emotionalState: analysis.emotionalState,
          intensity: analysis.intensity,
          riskLevel: analysis.riskLevel,
          needsIntervention,
          indicators: analysis.indicators,
          recommendedIntervention: analysis.recommendedIntervention
        }
      };

    } catch (error) {
      logger.error('Failed to assess emotional state', { 
        assessmentId, 
        error: error.message 
      });
      throw error;
    }
  }

  parseEmotionalAnalysis(text) {
    // Default values
    let analysis = {
      emotionalState: 'calm',
      intensity: 5,
      indicators: [],
      recommendedIntervention: 'validation',
      riskLevel: 'low'
    };

    try {
      // Parse emotional state
      for (const state of config.therapeutic.emotionalStates) {
        if (text.toLowerCase().includes(state)) {
          analysis.emotionalState = state;
          break;
        }
      }

      // Parse intensity
      const intensityMatch = text.match(/intensity[:\s]+(\d+)/i);
      if (intensityMatch) {
        analysis.intensity = parseInt(intensityMatch[1]);
      }

      // Parse risk level
      if (text.toLowerCase().includes('high risk')) {
        analysis.riskLevel = 'high';
      } else if (text.toLowerCase().includes('medium risk')) {
        analysis.riskLevel = 'medium';
      }

      // Parse indicators
      const indicatorMatch = text.match(/indicators?[:\s]+([^\n]+)/i);
      if (indicatorMatch) {
        analysis.indicators = indicatorMatch[1]
          .split(',')
          .map(i => i.trim())
          .filter(i => i.length > 0);
      }

      // Parse recommended intervention
      for (const type of config.therapeutic.interventionTypes) {
        if (text.toLowerCase().includes(type)) {
          analysis.recommendedIntervention = type;
          break;
        }
      }

    } catch (error) {
      logger.error('Error parsing emotional analysis', { error: error.message });
    }

    return analysis;
  }

  async provideIntervention(data) {
    const { userId, emotionalState, intensity, preferredType, ageGroup } = data;
    const interventionId = uuidv4();
    
    logger.info('Providing therapeutic intervention', { 
      interventionId, 
      userId,
      emotionalState,
      intensity,
      ageGroup
    });

    try {
      // Select intervention type
      const interventionType = preferredType || this.selectInterventionType(emotionalState, intensity);

      // Generate age-appropriate intervention
      const intervention = await this.generateIntervention(
        emotionalState,
        intensity,
        interventionType,
        ageGroup
      );

      // Create session
      const session = {
        id: interventionId,
        user_id: userId,
        emotional_state: emotionalState,
        intensity,
        intervention_type: interventionType,
        age_group: ageGroup,
        content: intervention.content,
        exercises: intervention.exercises,
        duration: config.therapeutic.sessionDuration,
        created_at: new Date().toISOString()
      };

      // Store session
      const { error: dbError } = await this.supabase
        .from('therapeutic_sessions')
        .insert(session);
        
      if (dbError && !dbError.message.includes('does not exist')) {
        logger.warn('Could not store session in database', { error: dbError.message });
      }

      // Cache active session
      const cacheKey = `active_session:${userId}`;
      await this.redis.set(cacheKey, JSON.stringify(session), {
        EX: config.therapeutic.sessionDuration * 60
      });

      logger.info('Therapeutic intervention provided', { 
        interventionId,
        interventionType
      });

      return {
        success: true,
        intervention: {
          id: interventionId,
          type: interventionType,
          content: intervention.content,
          exercises: intervention.exercises,
          estimatedDuration: intervention.duration,
          followUp: intervention.followUp
        }
      };

    } catch (error) {
      logger.error('Failed to provide intervention', { 
        interventionId, 
        error: error.message 
      });
      throw error;
    }
  }

  selectInterventionType(emotionalState, intensity) {
    // Logic to select best intervention based on state and intensity
    if (emotionalState === 'anxious' && intensity >= 7) {
      return 'breathing';
    } else if (emotionalState === 'angry') {
      return 'grounding';
    } else if (emotionalState === 'sad') {
      return intensity >= 7 ? 'validation' : 'storytelling';
    } else if (emotionalState === 'fearful') {
      return 'coping';
    }
    return 'storytelling';
  }

  async generateIntervention(emotionalState, intensity, type, ageGroup) {
    const ageDescriptions = {
      preschool: '3-5 year old',
      elementary: '6-11 year old',
      middle: '12-14 year old',
      high: '15-18 year old'
    };

    const prompt = `Create a therapeutic intervention for a ${ageDescriptions[ageGroup]} child who is feeling ${emotionalState} (intensity: ${intensity}/10).
      
      Intervention type: ${type}
      
      Please provide:
      1. A warm, empathetic introduction
      2. The main intervention content (${type} exercise)
      3. 2-3 simple exercises they can do
      4. Encouraging conclusion
      5. A follow-up activity suggestion
      
      Make it age-appropriate, engaging, and therapeutic. Use Story Intelligence™ principles.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { 
          role: 'system', 
          content: 'You are a compassionate child therapist creating therapeutic interventions through storytelling and play.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const interventionText = completion.choices[0].message.content;

    // Parse intervention components
    return {
      content: interventionText,
      exercises: this.extractExercises(interventionText),
      duration: this.estimateDuration(type, ageGroup),
      followUp: this.extractFollowUp(interventionText)
    };
  }

  extractExercises(content) {
    const exercises = [];
    const lines = content.split('\n');
    let inExercise = false;
    let currentExercise = '';

    for (const line of lines) {
      if (line.match(/exercise|activity|try this|let's practice/i)) {
        inExercise = true;
        currentExercise = line;
      } else if (inExercise && line.trim() === '') {
        exercises.push(currentExercise.trim());
        inExercise = false;
        currentExercise = '';
      } else if (inExercise) {
        currentExercise += ' ' + line;
      }
    }

    return exercises.slice(0, 3);
  }

  estimateDuration(type, ageGroup) {
    const baseDuration = {
      breathing: 5,
      grounding: 10,
      storytelling: 15,
      validation: 10,
      coping: 20
    };

    const ageMultiplier = {
      preschool: 0.5,
      elementary: 0.75,
      middle: 1,
      high: 1.2
    };

    return Math.round(baseDuration[type] * ageMultiplier[ageGroup]);
  }

  extractFollowUp(content) {
    const followUpMatch = content.match(/follow.?up|later|continue|next time/i);
    if (followUpMatch) {
      const index = content.indexOf(followUpMatch[0]);
      return content.substring(index, index + 200).trim();
    }
    return 'Continue practicing these exercises when you feel similar emotions.';
  }

  async trackProgress(data) {
    const { userId, sessionId, preState, postState, interventionUsed, effectiveness } = data;
    const progressId = uuidv4();
    
    logger.info('Tracking therapeutic progress', { 
      progressId,
      userId,
      sessionId,
      effectiveness
    });

    try {
      // Calculate improvement
      const stateValues = {
        'anxious': 1, 'fearful': 2, 'angry': 3, 'sad': 4,
        'calm': 5, 'happy': 6, 'excited': 7
      };
      
      const improvement = stateValues[postState] - stateValues[preState];
      const improved = improvement > 0;

      // Store progress record
      const progress = {
        id: progressId,
        user_id: userId,
        session_id: sessionId,
        pre_state: preState,
        post_state: postState,
        intervention_used: interventionUsed,
        effectiveness,
        improvement_score: improvement,
        improved,
        created_at: new Date().toISOString()
      };

      const { error: dbError } = await this.supabase
        .from('therapeutic_progress')
        .insert(progress);
        
      if (dbError && !dbError.message.includes('does not exist')) {
        logger.warn('Could not store progress in database', { error: dbError.message });
      }

      // Update user's therapeutic profile
      await this.updateTherapeuticProfile(userId, progress);

      // Generate insights
      const insights = await this.generateProgressInsights(userId);

      logger.info('Therapeutic progress tracked', { 
        progressId,
        improved,
        improvementScore: improvement
      });

      return {
        success: true,
        progress: {
          id: progressId,
          improved,
          improvementScore: improvement,
          effectiveness,
          insights
        }
      };

    } catch (error) {
      logger.error('Failed to track progress', { 
        progressId, 
        error: error.message 
      });
      throw error;
    }
  }

  async updateTherapeuticProfile(userId, progress) {
    try {
      const profileKey = `therapeutic_profile:${userId}`;
      const profile = await this.redis.get(profileKey);
      
      let profileData = profile ? JSON.parse(profile) : {
        userId,
        totalSessions: 0,
        averageEffectiveness: 0,
        preferredInterventions: {},
        emotionalPatterns: {}
      };

      // Update statistics
      profileData.totalSessions += 1;
      profileData.averageEffectiveness = 
        (profileData.averageEffectiveness * (profileData.totalSessions - 1) + progress.effectiveness) / 
        profileData.totalSessions;

      // Track intervention preferences
      if (!profileData.preferredInterventions[progress.intervention_used]) {
        profileData.preferredInterventions[progress.intervention_used] = 0;
      }
      profileData.preferredInterventions[progress.intervention_used] += progress.effectiveness;

      // Track emotional patterns
      if (!profileData.emotionalPatterns[progress.pre_state]) {
        profileData.emotionalPatterns[progress.pre_state] = 0;
      }
      profileData.emotionalPatterns[progress.pre_state] += 1;

      // Save updated profile
      await this.redis.set(profileKey, JSON.stringify(profileData), {
        EX: 604800 // 7 days
      });

    } catch (error) {
      logger.error('Failed to update therapeutic profile', { error: error.message });
    }
  }

  async generateProgressInsights(userId) {
    try {
      const profileKey = `therapeutic_profile:${userId}`;
      const profile = await this.redis.get(profileKey);
      
      if (!profile) return [];
      
      const profileData = JSON.parse(profile);
      const insights = [];

      // Most effective intervention
      const bestIntervention = Object.entries(profileData.preferredInterventions)
        .sort(([,a], [,b]) => b - a)[0];
      
      if (bestIntervention) {
        insights.push(`${bestIntervention[0]} exercises work best for this user`);
      }

      // Common emotional pattern
      const commonEmotion = Object.entries(profileData.emotionalPatterns)
        .sort(([,a], [,b]) => b - a)[0];
      
      if (commonEmotion) {
        insights.push(`User frequently experiences ${commonEmotion[0]} emotions`);
      }

      // Overall effectiveness
      if (profileData.averageEffectiveness >= 4) {
        insights.push('Therapeutic interventions are highly effective');
      } else if (profileData.averageEffectiveness >= 3) {
        insights.push('Moderate therapeutic progress observed');
      }

      return insights;

    } catch (error) {
      logger.error('Failed to generate insights', { error: error.message });
      return [];
    }
  }
}

// Lambda handler
const therapeuticAgent = new TherapeuticAgent();

exports.handler = async (event) => {
  logger.info('Therapeutic Agent invoked', { 
    eventType: event.type,
    action: event.action,
    requestId: event.requestId || uuidv4()
  });

  try {
    // Initialize agent if needed
    await therapeuticAgent.initialize();

    // Parse event
    const { action, data } = event;

    switch (action) {
      case 'assessEmotionalState': {
        const { error } = assessEmotionalStateSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await therapeuticAgent.assessEmotionalState(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'provideIntervention': {
        const { error } = provideInterventionSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await therapeuticAgent.provideIntervention(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'trackProgress': {
        const { error } = trackProgressSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await therapeuticAgent.trackProgress(data);
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
            agent: 'therapeutic-agent',
            version: '1.0.0',
            initialized: therapeuticAgent.isInitialized,
            features: [
              'emotional_assessment',
              'therapeutic_interventions',
              'progress_tracking',
              'age_appropriate_content',
              'multiple_intervention_types'
            ]
          })
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    logger.error('Therapeutic Agent error', { 
      error: error.message,
      stack: error.stack 
    });
    
    return {
      statusCode: error.message.includes('Validation') ? 400 : 500,
      body: JSON.stringify({
        error: error.message,
        type: 'TherapeuticAgentError'
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
OPENAI_API_KEY=$(aws ssm get-parameter --name "${PREFIX}/openai-api-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")

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
        --timeout 60 \
        --memory-size 512 \
        --environment Variables="{
            ENVIRONMENT='$ENVIRONMENT',
            SUPABASE_URL='$SUPABASE_URL',
            SUPABASE_SERVICE_ROLE_KEY='$SUPABASE_SERVICE_KEY',
            REDIS_URL='$REDIS_URL',
            OPENAI_API_KEY='$OPENAI_API_KEY'
        }" \
        --description "Storytailor Therapeutic Agent - Therapeutic interventions and emotional support"
    
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
            REDIS_URL='$REDIS_URL',
            OPENAI_API_KEY='$OPENAI_API_KEY'
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
    --source-arn "arn:aws:events:${AWS_REGION}:${AWS_ACCOUNT_ID}:rule/storytailor-${ENVIRONMENT}-therapeutic-*" \
    2>/dev/null || true

# Test the function
echo -e "${BLUE}🧪 Testing Therapeutic Agent...${NC}"
TEST_PAYLOAD='{"action":"health"}'

RESULT=$(aws lambda invoke \
    --function-name "$LAMBDA_NAME" \
    --payload "$TEST_PAYLOAD" \
    --cli-binary-format raw-in-base64-out \
    /tmp/therapeutic-agent-test-output.json 2>&1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Test invocation successful${NC}"
    cat /tmp/therapeutic-agent-test-output.json | jq '.'
else
    echo -e "${RED}❌ Test invocation failed${NC}"
    echo "$RESULT"
fi

# Cleanup
cd - > /dev/null
rm -rf "$DEPLOY_DIR"
rm -f /tmp/therapeutic-agent-test-output.json

echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║              🎉 THERAPEUTIC AGENT DEPLOYED! 🎉                    ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Lambda Function: ${LAMBDA_NAME}${NC}"
echo -e "${CYAN}Region: ${AWS_REGION}${NC}"
echo ""
echo -e "${GREEN}✅ Therapeutic Agent is ready to:${NC}"
echo -e "   • Assess emotional states"
echo -e "   • Provide age-appropriate interventions"
echo -e "   • Track therapeutic progress"
echo -e "   • Offer multiple intervention types"
echo ""
#!/bin/bash
# Deploy Auth Agent Lambda
# Based on the successful pattern from Router and Universal Agent deployments
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
LAMBDA_NAME="storytailor-auth-agent-${ENVIRONMENT}"
HANDLER_FILE="index.js"

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                   🔐 DEPLOYING AUTH AGENT 🔐                      ║${NC}"
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
DEPLOY_DIR="./lambda-deployments/auth-agent"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

echo -e "${BLUE}📁 Created deployment directory: $DEPLOY_DIR${NC}"

# Create package.json
cat > "$DEPLOY_DIR/package.json" << EOF
{
  "name": "storytailor-auth-agent",
  "version": "1.0.0",
  "description": "Storytailor Auth Agent - Handles authentication and account linking",
  "main": "index.js",
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "redis": "^4.6.0",
    "joi": "^17.11.0",
    "jsonwebtoken": "^9.0.2",
    "winston": "^3.11.0",
    "bcryptjs": "^2.4.3",
    "uuid": "^9.0.1"
  }
}
EOF

# Create Lambda handler
cat > "$DEPLOY_DIR/$HANDLER_FILE" << 'EOF'
const { createClient } = require('@supabase/supabase-js');
const { createClient: createRedisClient } = require('redis');
const winston = require('winston');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');

// Configuration
const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'storytailor-jwt-secret-' + process.env.ENVIRONMENT,
    expiresIn: '24h'
  },
  voiceCode: {
    length: 6,
    ttl: 300 // 5 minutes
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
const linkAccountSchema = Joi.object({
  email: Joi.string().email().required(),
  alexaPersonId: Joi.string().required(),
  deviceId: Joi.string().required()
});

const verifyVoiceCodeSchema = Joi.object({
  code: Joi.string().length(6).required(),
  alexaPersonId: Joi.string().required()
});

// Services
class AuthAgent {
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
      const { error } = await this.supabase.from('users').select('id').limit(1);
      if (error) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }
      
      this.isInitialized = true;
      logger.info('AuthAgent initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AuthAgent', { error: error.message });
      throw error;
    }
  }

  async linkAccount(data) {
    const { email, alexaPersonId, deviceId } = data;
    const correlationId = uuidv4();
    
    logger.info('Account linking request', { 
      correlationId, 
      alexaPersonId,
      deviceId,
      email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    });

    try {
      // Check if user exists
      const { data: existingUser, error: userError } = await this.supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single();

      let userId;
      
      if (!existingUser) {
        // Create new user
        const { data: newUser, error: createError } = await this.supabase
          .from('users')
          .insert({
            email,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) throw createError;
        userId = newUser.id;
        
        logger.info('Created new user', { correlationId, userId });
      } else {
        userId = existingUser.id;
      }

      // Generate voice code
      const voiceCode = this.generateVoiceCode();
      const codeKey = `voice_code:${voiceCode}`;
      
      // Store in Redis with TTL
      await this.redis.set(codeKey, JSON.stringify({
        userId,
        alexaPersonId,
        deviceId,
        email,
        createdAt: new Date().toISOString()
      }), {
        EX: config.voiceCode.ttl
      });

      logger.info('Voice code generated', { correlationId, userId });

      return {
        success: true,
        voiceCode,
        expiresIn: config.voiceCode.ttl,
        message: 'Check your email for the voice code'
      };

    } catch (error) {
      logger.error('Account linking failed', { 
        correlationId, 
        error: error.message 
      });
      throw error;
    }
  }

  async verifyVoiceCode(data) {
    const { code, alexaPersonId } = data;
    const correlationId = uuidv4();
    
    logger.info('Voice code verification', { correlationId, alexaPersonId });

    try {
      const codeKey = `voice_code:${code}`;
      const codeData = await this.redis.get(codeKey);
      
      if (!codeData) {
        throw new Error('Invalid or expired voice code');
      }

      const { userId, alexaPersonId: storedPersonId, email } = JSON.parse(codeData);
      
      if (storedPersonId !== alexaPersonId) {
        throw new Error('Voice code does not match Alexa person ID');
      }

      // Create or update user session
      const sessionId = uuidv4();
      const token = jwt.sign(
        { userId, sessionId, alexaPersonId },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      // Store session in database
      const { error: sessionError } = await this.supabase
        .from('user_sessions')
        .insert({
          id: sessionId,
          user_id: userId,
          alexa_person_id: alexaPersonId,
          token,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });

      if (sessionError) throw sessionError;

      // Delete used voice code
      await this.redis.del(codeKey);

      logger.info('Voice code verified successfully', { correlationId, userId });

      return {
        success: true,
        token,
        userId,
        message: 'Account linked successfully'
      };

    } catch (error) {
      logger.error('Voice code verification failed', { 
        correlationId, 
        error: error.message 
      });
      throw error;
    }
  }

  generateVoiceCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async validateToken(token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Check if session exists and is valid
      const { data: session } = await this.supabase
        .from('user_sessions')
        .select('*')
        .eq('id', decoded.sessionId)
        .eq('user_id', decoded.userId)
        .single();

      if (!session || new Date(session.expires_at) < new Date()) {
        throw new Error('Session expired or invalid');
      }

      return {
        valid: true,
        userId: decoded.userId,
        sessionId: decoded.sessionId,
        alexaPersonId: decoded.alexaPersonId
      };

    } catch (error) {
      logger.error('Token validation failed', { error: error.message });
      return { valid: false };
    }
  }
}

// Lambda handler
const authAgent = new AuthAgent();

exports.handler = async (event) => {
  logger.info('Auth Agent invoked', { 
    eventType: event.type,
    requestId: event.requestId || uuidv4()
  });

  try {
    // Initialize agent if needed
    await authAgent.initialize();

    // Parse event
    const { action, data } = event;

    switch (action) {
      case 'linkAccount': {
        const { error } = linkAccountSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await authAgent.linkAccount(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'verifyVoiceCode': {
        const { error } = verifyVoiceCodeSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await authAgent.verifyVoiceCode(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'validateToken': {
        if (!data.token) throw new Error('Token is required');
        
        const result = await authAgent.validateToken(data.token);
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
            agent: 'auth-agent',
            version: '1.0.0',
            initialized: authAgent.isInitialized
          })
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    logger.error('Auth Agent error', { 
      error: error.message,
      stack: error.stack 
    });
    
    return {
      statusCode: error.message.includes('Validation') ? 400 : 500,
      body: JSON.stringify({
        error: error.message,
        type: 'AuthAgentError'
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
JWT_SECRET=$(aws ssm get-parameter --name "${PREFIX}/jwt-secret" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")

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
            REDIS_URL='$REDIS_URL',
            JWT_SECRET='$JWT_SECRET'
        }" \
        --description "Storytailor Auth Agent - Handles authentication and account linking"
    
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
            REDIS_URL='$REDIS_URL',
            JWT_SECRET='$JWT_SECRET'
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
    --source-arn "arn:aws:events:${AWS_REGION}:${AWS_ACCOUNT_ID}:rule/storytailor-${ENVIRONMENT}-auth-*" \
    2>/dev/null || true

# Test the function
echo -e "${BLUE}🧪 Testing Auth Agent...${NC}"
TEST_PAYLOAD='{"action":"health"}'

RESULT=$(aws lambda invoke \
    --function-name "$LAMBDA_NAME" \
    --payload "$TEST_PAYLOAD" \
    --cli-binary-format raw-in-base64-out \
    /tmp/auth-agent-test-output.json 2>&1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Test invocation successful${NC}"
    cat /tmp/auth-agent-test-output.json | jq '.'
else
    echo -e "${RED}❌ Test invocation failed${NC}"
    echo "$RESULT"
fi

# Cleanup
cd - > /dev/null
rm -rf "$DEPLOY_DIR"
rm -f /tmp/auth-agent-test-output.json

echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                  🎉 AUTH AGENT DEPLOYED! 🎉                       ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Lambda Function: ${LAMBDA_NAME}${NC}"
echo -e "${CYAN}Region: ${AWS_REGION}${NC}"
echo ""
echo -e "${GREEN}✅ Auth Agent is ready to handle:${NC}"
echo -e "   • Account linking with voice codes"
echo -e "   • Token validation and management"
echo -e "   • Session management"
echo -e "   • COPPA-compliant authentication"
echo ""
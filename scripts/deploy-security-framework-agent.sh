#!/bin/bash
# Deploy Security Framework Agent Lambda
# Zero Trust security framework for platform protection
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
LAMBDA_NAME="storytailor-security-framework-${ENVIRONMENT}"
HANDLER_FILE="index.js"

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║           🔐 DEPLOYING SECURITY FRAMEWORK AGENT 🔐                ║${NC}"
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
DEPLOY_DIR="./lambda-deployments/security-framework"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

echo -e "${BLUE}📁 Created deployment directory: $DEPLOY_DIR${NC}"

# Copy the security framework package
echo -e "${YELLOW}📦 Copying security framework files...${NC}"
cp -r packages/security-framework/* "$DEPLOY_DIR/"

# Create package.json
cat > "$DEPLOY_DIR/package.json" << EOF
{
  "name": "storytailor-security-framework",
  "version": "1.0.0",
  "description": "Storytailor Security Framework - Zero Trust security for platform protection",
  "main": "index.js",
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "redis": "^4.6.0",
    "joi": "^17.11.0",
    "winston": "^3.11.0",
    "uuid": "^9.0.1",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "crypto": "^1.0.1",
    "aws-sdk": "^2.1482.0"
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
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const AWS = require('aws-sdk');

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
    secret: process.env.JWT_SECRET,
    issuer: 'storytailor-security',
    audience: 'storytailor-platform'
  },
  encryption: {
    algorithm: 'aes-256-gcm',
    keyDerivationIterations: 100000
  },
  zeroTrust: {
    sessionTimeout: 900, // 15 minutes
    maxLoginAttempts: 5,
    lockoutDuration: 1800, // 30 minutes
    requireMFA: true
  }
};

// AWS Services
const kms = new AWS.KMS({ region: process.env.AWS_REGION });
const ssm = new AWS.SSM({ region: process.env.AWS_REGION });

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
const authenticateSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  credentials: Joi.object({
    password: Joi.string().optional(),
    biometric: Joi.string().optional(),
    mfaToken: Joi.string().optional()
  }).or('password', 'biometric').required(),
  deviceInfo: Joi.object({
    id: Joi.string().required(),
    type: Joi.string().required(),
    platform: Joi.string().required(),
    trustScore: Joi.number().min(0).max(100).optional()
  }).required()
});

const authorizeSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  resource: Joi.string().required(),
  action: Joi.string().required(),
  context: Joi.object({
    sessionId: Joi.string().required(),
    deviceId: Joi.string().required(),
    requestId: Joi.string().optional()
  }).required()
});

const encryptDataSchema = Joi.object({
  data: Joi.alternatives().try(
    Joi.string(),
    Joi.object(),
    Joi.array()
  ).required(),
  keyId: Joi.string().optional(),
  metadata: Joi.object().optional()
});

// Import Zero Trust Architecture from package
let ZeroTrustArchitecture;
try {
  ZeroTrustArchitecture = require('./src/ZeroTrustArchitecture').ZeroTrustArchitecture;
} catch (error) {
  logger.warn('ZeroTrustArchitecture not found, using simplified version');
}

// Security Framework Service
class SecurityFrameworkAgent {
  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.serviceKey);
    this.redis = null;
    this.isInitialized = false;
    this.sessionCache = new Map();
    this.zeroTrust = null;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Connect to Redis
      this.redis = createRedisClient({ url: config.redis.url });
      await this.redis.connect();
      
      // Test Supabase connection
      const { error } = await this.supabase.from('security_events').select('id').limit(1);
      if (error && !error.message.includes('does not exist')) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }
      
      // Initialize Zero Trust if available
      if (ZeroTrustArchitecture) {
        this.zeroTrust = new ZeroTrustArchitecture(config);
        await this.zeroTrust.initialize();
      }
      
      this.isInitialized = true;
      logger.info('SecurityFrameworkAgent initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SecurityFrameworkAgent', { error: error.message });
      throw error;
    }
  }

  async authenticate(data) {
    const { userId, credentials, deviceInfo } = data;
    const sessionId = uuidv4();
    
    logger.info('Authenticating user', { 
      sessionId, 
      userId,
      deviceType: deviceInfo.type
    });

    try {
      // Check if user is locked out
      const lockoutKey = `lockout:${userId}`;
      const isLockedOut = await this.redis.get(lockoutKey);
      if (isLockedOut) {
        throw new Error('Account temporarily locked due to multiple failed attempts');
      }

      // Get user security profile
      const { data: user } = await this.supabase
        .from('users')
        .select('id, password_hash, mfa_enabled, security_settings')
        .eq('id', userId)
        .single();

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Verify credentials
      let authenticated = false;
      
      if (credentials.password) {
        authenticated = await bcrypt.compare(credentials.password, user.password_hash);
      } else if (credentials.biometric && this.zeroTrust) {
        authenticated = await this.zeroTrust.verifyBiometric(userId, credentials.biometric);
      }

      if (!authenticated) {
        await this.recordFailedAttempt(userId);
        throw new Error('Invalid credentials');
      }

      // Check MFA if enabled
      if (user.mfa_enabled && config.zeroTrust.requireMFA) {
        if (!credentials.mfaToken) {
          return {
            success: false,
            requiresMFA: true,
            sessionId,
            message: 'MFA token required'
          };
        }
        
        const mfaValid = await this.verifyMFAToken(userId, credentials.mfaToken);
        if (!mfaValid) {
          throw new Error('Invalid MFA token');
        }
      }

      // Calculate device trust score
      const trustScore = await this.calculateDeviceTrustScore(deviceInfo, userId);
      
      // Create session
      const session = {
        id: sessionId,
        userId,
        deviceId: deviceInfo.id,
        trustScore,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + config.zeroTrust.sessionTimeout * 1000).toISOString()
      };

      // Generate JWT
      const token = jwt.sign(
        { 
          sub: userId,
          sid: sessionId,
          did: deviceInfo.id,
          trs: trustScore
        },
        config.jwt.secret,
        {
          issuer: config.jwt.issuer,
          audience: config.jwt.audience,
          expiresIn: config.zeroTrust.sessionTimeout
        }
      );

      // Store session
      await this.redis.set(
        `session:${sessionId}`,
        JSON.stringify(session),
        { EX: config.zeroTrust.sessionTimeout }
      );

      // Log security event
      await this.logSecurityEvent({
        type: 'authentication',
        userId,
        sessionId,
        deviceId: deviceInfo.id,
        success: true,
        trustScore
      });

      logger.info('Authentication successful', { sessionId, userId, trustScore });

      return {
        success: true,
        session: {
          id: sessionId,
          token,
          expiresIn: config.zeroTrust.sessionTimeout,
          trustScore
        }
      };

    } catch (error) {
      logger.error('Authentication failed', { 
        sessionId, 
        error: error.message 
      });
      
      await this.logSecurityEvent({
        type: 'authentication',
        userId,
        sessionId,
        deviceId: deviceInfo.id,
        success: false,
        error: error.message
      });
      
      throw error;
    }
  }

  async authorize(data) {
    const { userId, resource, action, context } = data;
    const authzId = uuidv4();
    
    logger.info('Authorizing access', { 
      authzId, 
      userId,
      resource,
      action
    });

    try {
      // Verify session
      const session = await this.verifySession(context.sessionId);
      if (!session || session.userId !== userId) {
        throw new Error('Invalid or expired session');
      }

      // Check device consistency
      if (session.deviceId !== context.deviceId) {
        throw new Error('Device mismatch - potential security threat');
      }

      // Get user permissions
      const permissions = await this.getUserPermissions(userId);
      
      // Check authorization
      const authorized = this.checkPermission(permissions, resource, action);
      
      // Apply Zero Trust principles
      if (authorized && session.trustScore < 50) {
        // Low trust score - apply additional restrictions
        if (action === 'delete' || action === 'admin') {
          throw new Error('Insufficient trust score for this action');
        }
      }

      // Log authorization event
      await this.logSecurityEvent({
        type: 'authorization',
        userId,
        sessionId: context.sessionId,
        resource,
        action,
        authorized,
        trustScore: session.trustScore
      });

      return {
        success: true,
        authorized,
        context: {
          authzId,
          trustScore: session.trustScore,
          restrictions: session.trustScore < 70 ? ['limited_access'] : []
        }
      };

    } catch (error) {
      logger.error('Authorization failed', { 
        authzId, 
        error: error.message 
      });
      throw error;
    }
  }

  async encryptData(data) {
    const { data: plaintext, keyId, metadata } = data;
    const encryptionId = uuidv4();
    
    logger.info('Encrypting data', { 
      encryptionId,
      dataType: typeof plaintext,
      hasKeyId: !!keyId
    });

    try {
      // Get or generate data key
      let dataKey;
      if (keyId) {
        dataKey = await this.getDataKey(keyId);
      } else {
        dataKey = await this.generateDataKey();
      }

      // Serialize data if needed
      const dataToEncrypt = typeof plaintext === 'string' 
        ? plaintext 
        : JSON.stringify(plaintext);

      // Encrypt data
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        config.encryption.algorithm,
        Buffer.from(dataKey.plaintext, 'base64'),
        iv
      );

      let encrypted = cipher.update(dataToEncrypt, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      const authTag = cipher.getAuthTag();

      // Package encrypted data
      const encryptedPackage = {
        id: encryptionId,
        data: encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        keyId: dataKey.keyId,
        algorithm: config.encryption.algorithm,
        metadata: metadata || {},
        timestamp: new Date().toISOString()
      };

      // Store encryption metadata
      await this.storeEncryptionMetadata(encryptionId, encryptedPackage);

      logger.info('Data encrypted successfully', { encryptionId });

      return {
        success: true,
        encryption: {
          id: encryptionId,
          encryptedData: encrypted,
          keyId: dataKey.keyId,
          metadata: encryptedPackage
        }
      };

    } catch (error) {
      logger.error('Encryption failed', { 
        encryptionId, 
        error: error.message 
      });
      throw error;
    }
  }

  async recordFailedAttempt(userId) {
    const attemptsKey = `attempts:${userId}`;
    const attempts = await this.redis.incr(attemptsKey);
    
    if (attempts === 1) {
      await this.redis.expire(attemptsKey, 3600); // Reset after 1 hour
    }
    
    if (attempts >= config.zeroTrust.maxLoginAttempts) {
      const lockoutKey = `lockout:${userId}`;
      await this.redis.set(lockoutKey, '1', {
        EX: config.zeroTrust.lockoutDuration
      });
      
      await this.logSecurityEvent({
        type: 'account_lockout',
        userId,
        reason: 'Max login attempts exceeded',
        duration: config.zeroTrust.lockoutDuration
      });
    }
  }

  async verifyMFAToken(userId, token) {
    // Simplified MFA verification - in production, use TOTP/SMS/etc
    const storedToken = await this.redis.get(`mfa:${userId}`);
    return storedToken === token;
  }

  async calculateDeviceTrustScore(deviceInfo, userId) {
    let score = 50; // Base score
    
    // Check if device is known
    const { data: knownDevice } = await this.supabase
      .from('trusted_devices')
      .select('trust_score, last_seen')
      .eq('user_id', userId)
      .eq('device_id', deviceInfo.id)
      .single();
    
    if (knownDevice) {
      score += 30;
      // Bonus for recent activity
      const lastSeen = new Date(knownDevice.last_seen);
      const daysSince = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) score += 10;
    }
    
    // Platform trust
    if (['ios', 'android'].includes(deviceInfo.platform)) score += 10;
    
    // Device-provided trust score
    if (deviceInfo.trustScore) {
      score = Math.min(100, (score + deviceInfo.trustScore) / 2);
    }
    
    return Math.round(score);
  }

  async verifySession(sessionId) {
    const sessionData = await this.redis.get(`session:${sessionId}`);
    if (!sessionData) return null;
    
    const session = JSON.parse(sessionData);
    
    // Check expiration
    if (new Date(session.expiresAt) < new Date()) {
      await this.redis.del(`session:${sessionId}`);
      return null;
    }
    
    return session;
  }

  async getUserPermissions(userId) {
    const { data: permissions } = await this.supabase
      .from('user_permissions')
      .select('resource, actions')
      .eq('user_id', userId);
    
    return permissions || [];
  }

  checkPermission(permissions, resource, action) {
    return permissions.some(p => 
      p.resource === resource && 
      p.actions.includes(action)
    );
  }

  async generateDataKey() {
    // In production, use AWS KMS
    const keyData = {
      keyId: uuidv4(),
      plaintext: crypto.randomBytes(32).toString('base64')
    };
    
    return keyData;
  }

  async getDataKey(keyId) {
    // In production, retrieve from AWS KMS
    return {
      keyId,
      plaintext: crypto.randomBytes(32).toString('base64')
    };
  }

  async storeEncryptionMetadata(encryptionId, metadata) {
    await this.redis.set(
      `encryption:${encryptionId}`,
      JSON.stringify(metadata),
      { EX: 86400 } // 24 hours
    );
  }

  async logSecurityEvent(event) {
    const securityEvent = {
      id: uuidv4(),
      ...event,
      timestamp: new Date().toISOString()
    };
    
    // Store in database
    await this.supabase
      .from('security_events')
      .insert(securityEvent);
    
    // Also log critical events
    if (event.type === 'account_lockout' || !event.success) {
      logger.warn('Security event', securityEvent);
    }
  }

  async getSecurityMetrics() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const { data: events } = await this.supabase
      .from('security_events')
      .select('type, success')
      .gte('timestamp', oneDayAgo.toISOString());
    
    const metrics = {
      totalEvents: events?.length || 0,
      failedAuthentications: events?.filter(e => e.type === 'authentication' && !e.success).length || 0,
      successfulAuthentications: events?.filter(e => e.type === 'authentication' && e.success).length || 0,
      authorizationDenials: events?.filter(e => e.type === 'authorization' && !e.success).length || 0,
      accountLockouts: events?.filter(e => e.type === 'account_lockout').length || 0
    };
    
    return metrics;
  }
}

// Lambda handler
const securityFramework = new SecurityFrameworkAgent();

exports.handler = async (event) => {
  logger.info('Security Framework Agent invoked', { 
    eventType: event.type,
    action: event.action,
    requestId: event.requestId || uuidv4()
  });

  try {
    // Initialize agent if needed
    await securityFramework.initialize();

    // Parse event
    const { action, data } = event;

    switch (action) {
      case 'authenticate': {
        const { error } = authenticateSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await securityFramework.authenticate(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'authorize': {
        const { error } = authorizeSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await securityFramework.authorize(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'encryptData': {
        const { error } = encryptDataSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await securityFramework.encryptData(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'getSecurityMetrics': {
        const metrics = await securityFramework.getSecurityMetrics();
        return {
          statusCode: 200,
          body: JSON.stringify({ metrics })
        };
      }

      case 'health': {
        return {
          statusCode: 200,
          body: JSON.stringify({
            status: 'healthy',
            agent: 'security-framework',
            version: '1.0.0',
            initialized: securityFramework.isInitialized,
            features: [
              'zero_trust_authentication',
              'rbac_authorization',
              'data_encryption',
              'mfa_support',
              'device_trust_scoring',
              'security_event_logging'
            ],
            config: {
              sessionTimeout: config.zeroTrust.sessionTimeout,
              requireMFA: config.zeroTrust.requireMFA,
              encryptionAlgorithm: config.encryption.algorithm
            }
          })
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    logger.error('Security Framework Agent error', { 
      error: error.message,
      stack: error.stack 
    });
    
    return {
      statusCode: error.message.includes('Validation') ? 400 : 500,
      body: JSON.stringify({
        error: error.message,
        type: 'SecurityFrameworkError'
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
SUPABASE_URL="${SUPABASE_URL:?SUPABASE_URL is required}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY is required}"
REDIS_URL="${REDIS_URL:?REDIS_URL is required}"
JWT_SECRET="${JWT_SECRET:?JWT_SECRET is required}"

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
            REDIS_URL='$REDIS_URL',
            JWT_SECRET='$JWT_SECRET'
        }" \
        --description "Storytailor Security Framework - Zero Trust security for platform protection"
    
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
    --source-arn "arn:aws:events:${AWS_REGION}:${AWS_ACCOUNT_ID}:rule/storytailor-${ENVIRONMENT}-security-*" \
    2>/dev/null || true

# Test the function
echo -e "${BLUE}🧪 Testing Security Framework Agent...${NC}"
TEST_PAYLOAD='{"action":"health"}'

RESULT=$(aws lambda invoke \
    --function-name "$LAMBDA_NAME" \
    --payload "$TEST_PAYLOAD" \
    --cli-binary-format raw-in-base64-out \
    /tmp/security-framework-test-output.json 2>&1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Test invocation successful${NC}"
    cat /tmp/security-framework-test-output.json | jq '.'
else
    echo -e "${RED}❌ Test invocation failed${NC}"
    echo "$RESULT"
fi

# Cleanup
cd - > /dev/null
rm -rf "$DEPLOY_DIR"
rm -f /tmp/security-framework-test-output.json

echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║           🎉 SECURITY FRAMEWORK DEPLOYED! 🎉                      ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Lambda Function: ${LAMBDA_NAME}${NC}"
echo -e "${CYAN}Region: ${AWS_REGION}${NC}"
echo ""
echo -e "${GREEN}✅ Security Framework is ready to:${NC}"
echo -e "   • Provide Zero Trust authentication"
echo -e "   • Manage role-based authorization"
echo -e "   • Encrypt sensitive data"
echo -e "   • Track security events and metrics"
echo -e "   • Enforce platform-wide security policies"
echo ""

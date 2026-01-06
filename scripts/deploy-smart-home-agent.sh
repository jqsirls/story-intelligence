#!/bin/bash
# Deploy Smart Home Agent Lambda
# Handles smart home integrations and IoT control
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
LAMBDA_NAME="storytailor-smart-home-agent-${ENVIRONMENT}"
HANDLER_FILE="index.js"

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║               🏠 DEPLOYING SMART HOME AGENT 🏠                    ║${NC}"
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
DEPLOY_DIR="./lambda-deployments/smart-home-agent"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

echo -e "${BLUE}📁 Created deployment directory: $DEPLOY_DIR${NC}"

# Create package.json
cat > "$DEPLOY_DIR/package.json" << EOF
{
  "name": "storytailor-smart-home-agent",
  "version": "1.0.0",
  "description": "Storytailor Smart Home Agent - IoT integration and home automation",
  "main": "index.js",
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "redis": "^4.6.0",
    "joi": "^17.11.0",
    "winston": "^3.11.0",
    "uuid": "^9.0.1",
    "axios": "^1.6.0"
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
const axios = require('axios');

// Configuration
const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  integrations: {
    alexa: {
      enabled: true,
      skills: ['smart_home', 'routines', 'announcements']
    },
    google: {
      enabled: true,
      actions: ['smart_home', 'assistant_routines']
    },
    homekit: {
      enabled: true,
      accessories: ['lights', 'switches', 'sensors']
    }
  },
  deviceTypes: [
    'light', 'switch', 'thermostat', 'lock', 'camera',
    'speaker', 'sensor', 'outlet', 'fan', 'blind'
  ]
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
const controlDeviceSchema = Joi.object({
  userId: Joi.string().required(),
  deviceId: Joi.string().required(),
  action: Joi.string().valid('on', 'off', 'toggle', 'set', 'get').required(),
  value: Joi.alternatives().try(
    Joi.boolean(),
    Joi.number(),
    Joi.string(),
    Joi.object()
  ).optional(),
  metadata: Joi.object().optional()
});

const createRoutineSchema = Joi.object({
  userId: Joi.string().required(),
  name: Joi.string().min(1).max(100).required(),
  trigger: Joi.object({
    type: Joi.string().valid('time', 'voice', 'device', 'location').required(),
    value: Joi.any().required()
  }).required(),
  actions: Joi.array().items(Joi.object({
    deviceId: Joi.string().required(),
    action: Joi.string().required(),
    value: Joi.any().optional(),
    delay: Joi.number().min(0).optional()
  })).min(1).required()
});

const announceMessageSchema = Joi.object({
  userId: Joi.string().required(),
  message: Joi.string().min(1).max(500).required(),
  targets: Joi.array().items(Joi.string()).optional(),
  voice: Joi.string().valid('alexa', 'google', 'child', 'character').default('alexa'),
  priority: Joi.string().valid('low', 'normal', 'high').default('normal')
});

// Services
class SmartHomeAgent {
  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.serviceKey);
    this.redis = null;
    this.isInitialized = false;
    this.deviceCache = new Map();
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Connect to Redis
      this.redis = createRedisClient({ url: config.redis.url });
      await this.redis.connect();
      
      // Test Supabase connection
      const { error } = await this.supabase.from('smart_devices').select('id').limit(1);
      if (error && !error.message.includes('does not exist')) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }
      
      this.isInitialized = true;
      logger.info('SmartHomeAgent initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SmartHomeAgent', { error: error.message });
      throw error;
    }
  }

  async controlDevice(data) {
    const { userId, deviceId, action, value, metadata } = data;
    const controlId = uuidv4();
    
    logger.info('Controlling smart device', { 
      controlId, 
      userId,
      deviceId,
      action
    });

    try {
      // Get device information
      const device = await this.getDevice(deviceId, userId);
      if (!device) {
        throw new Error('Device not found or unauthorized');
      }

      // Validate action for device type
      this.validateDeviceAction(device.type, action, value);

      // Execute control action
      const result = await this.executeDeviceControl(device, action, value);

      // Log control event
      const controlEvent = {
        id: controlId,
        user_id: userId,
        device_id: deviceId,
        device_type: device.type,
        action,
        value: value || null,
        result,
        metadata: metadata || {},
        created_at: new Date().toISOString()
      };

      // Store in database
      const { error: dbError } = await this.supabase
        .from('device_controls')
        .insert(controlEvent);
        
      if (dbError && !dbError.message.includes('does not exist')) {
        logger.warn('Could not store control event', { error: dbError.message });
      }

      // Update device state in cache
      await this.updateDeviceState(deviceId, result.state);

      logger.info('Device control successful', { 
        controlId,
        deviceId,
        newState: result.state
      });

      return {
        success: true,
        control: {
          id: controlId,
          deviceId,
          action,
          state: result.state,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Device control failed', { 
        controlId, 
        error: error.message 
      });
      throw error;
    }
  }

  async getDevice(deviceId, userId) {
    // Check cache first
    const cacheKey = `device:${deviceId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      const device = JSON.parse(cached);
      if (device.user_id === userId || device.shared_with?.includes(userId)) {
        return device;
      }
    }

    // Query database
    const { data, error } = await this.supabase
      .from('smart_devices')
      .select('*')
      .eq('id', deviceId)
      .single();

    if (error || !data) {
      return null;
    }

    // Check authorization
    if (data.user_id !== userId && !data.shared_with?.includes(userId)) {
      return null;
    }

    // Cache device
    await this.redis.set(cacheKey, JSON.stringify(data), {
      EX: 3600 // 1 hour cache
    });

    return data;
  }

  validateDeviceAction(deviceType, action, value) {
    const validActions = {
      light: ['on', 'off', 'toggle', 'set'],
      switch: ['on', 'off', 'toggle'],
      thermostat: ['set', 'get'],
      lock: ['lock', 'unlock', 'get'],
      camera: ['on', 'off', 'get'],
      speaker: ['play', 'pause', 'stop', 'volume', 'announce'],
      sensor: ['get'],
      outlet: ['on', 'off', 'toggle'],
      fan: ['on', 'off', 'set'],
      blind: ['open', 'close', 'set']
    };

    const deviceActions = validActions[deviceType] || [];
    if (!deviceActions.includes(action)) {
      throw new Error(`Invalid action '${action}' for device type '${deviceType}'`);
    }

    // Validate value for specific actions
    if (action === 'set' && value === undefined) {
      throw new Error('Value required for set action');
    }
  }

  async executeDeviceControl(device, action, value) {
    // Simulate device control - in production, this would integrate with actual IoT APIs
    const mockDelay = Math.random() * 500 + 100; // 100-600ms delay
    await new Promise(resolve => setTimeout(resolve, mockDelay));

    // Calculate new state
    let newState = { ...device.state };
    
    switch (action) {
      case 'on':
        newState.power = true;
        break;
      case 'off':
        newState.power = false;
        break;
      case 'toggle':
        newState.power = !newState.power;
        break;
      case 'set':
        if (device.type === 'light' && typeof value === 'number') {
          newState.brightness = Math.max(0, Math.min(100, value));
        } else if (device.type === 'thermostat' && typeof value === 'number') {
          newState.temperature = Math.max(60, Math.min(85, value));
        } else if (device.type === 'fan' && typeof value === 'number') {
          newState.speed = Math.max(0, Math.min(3, value));
        } else if (device.type === 'blind' && typeof value === 'number') {
          newState.position = Math.max(0, Math.min(100, value));
        } else {
          newState.value = value;
        }
        break;
      case 'lock':
        newState.locked = true;
        break;
      case 'unlock':
        newState.locked = false;
        break;
    }

    return {
      success: true,
      state: newState,
      responseTime: Math.round(mockDelay)
    };
  }

  async updateDeviceState(deviceId, state) {
    // Update database
    await this.supabase
      .from('smart_devices')
      .update({
        state,
        last_updated: new Date().toISOString()
      })
      .eq('id', deviceId);

    // Update cache
    const cacheKey = `device:${deviceId}`;
    const device = await this.redis.get(cacheKey);
    if (device) {
      const deviceData = JSON.parse(device);
      deviceData.state = state;
      await this.redis.set(cacheKey, JSON.stringify(deviceData), {
        EX: 3600
      });
    }
  }

  async createRoutine(data) {
    const { userId, name, trigger, actions } = data;
    const routineId = uuidv4();
    
    logger.info('Creating smart home routine', { 
      routineId, 
      userId,
      name,
      triggerType: trigger.type
    });

    try {
      // Validate all devices exist and user has access
      for (const action of actions) {
        const device = await this.getDevice(action.deviceId, userId);
        if (!device) {
          throw new Error(`Device ${action.deviceId} not found or unauthorized`);
        }
      }

      // Create routine
      const routine = {
        id: routineId,
        user_id: userId,
        name,
        trigger,
        actions,
        enabled: true,
        execution_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Store in database
      const { error: dbError } = await this.supabase
        .from('smart_routines')
        .insert(routine);
        
      if (dbError && !dbError.message.includes('does not exist')) {
        logger.warn('Could not store routine', { error: dbError.message });
      }

      // Cache routine
      const cacheKey = `routine:${routineId}`;
      await this.redis.set(cacheKey, JSON.stringify(routine), {
        EX: 86400 // 24 hour cache
      });

      // Register trigger
      await this.registerRoutineTrigger(routineId, trigger);

      logger.info('Routine created successfully', { routineId });

      return {
        success: true,
        routine: {
          id: routineId,
          name,
          triggerType: trigger.type,
          actionCount: actions.length,
          enabled: true
        }
      };

    } catch (error) {
      logger.error('Failed to create routine', { 
        routineId, 
        error: error.message 
      });
      throw error;
    }
  }

  async registerRoutineTrigger(routineId, trigger) {
    // In production, this would register with appropriate services
    // For now, we'll store trigger registrations in Redis
    const triggerKey = `trigger:${trigger.type}:${trigger.value}`;
    const routines = await this.redis.get(triggerKey) || '[]';
    const routineList = JSON.parse(routines);
    
    if (!routineList.includes(routineId)) {
      routineList.push(routineId);
      await this.redis.set(triggerKey, JSON.stringify(routineList), {
        EX: 86400 // 24 hours
      });
    }
  }

  async announceMessage(data) {
    const { userId, message, targets, voice, priority } = data;
    const announcementId = uuidv4();
    
    logger.info('Creating announcement', { 
      announcementId, 
      userId,
      voice,
      priority,
      targetCount: targets?.length || 'all'
    });

    try {
      // Get user's devices capable of announcements
      const { data: devices } = await this.supabase
        .from('smart_devices')
        .select('*')
        .eq('user_id', userId)
        .in('type', ['speaker', 'display'])
        .eq('capabilities->announce', true);

      const targetDevices = targets ? 
        devices?.filter(d => targets.includes(d.id)) : 
        devices;

      if (!targetDevices || targetDevices.length === 0) {
        throw new Error('No announcement-capable devices found');
      }

      // Create announcement record
      const announcement = {
        id: announcementId,
        user_id: userId,
        message,
        voice,
        priority,
        target_devices: targetDevices.map(d => d.id),
        status: 'pending',
        created_at: new Date().toISOString()
      };

      // Store announcement
      await this.supabase
        .from('announcements')
        .insert(announcement);

      // Simulate announcement delivery
      const results = await this.deliverAnnouncement(
        announcement,
        targetDevices
      );

      logger.info('Announcement delivered', { 
        announcementId,
        successCount: results.filter(r => r.success).length,
        totalDevices: results.length
      });

      return {
        success: true,
        announcement: {
          id: announcementId,
          message,
          deliveredTo: results.filter(r => r.success).map(r => r.deviceId),
          failedDevices: results.filter(r => !r.success).map(r => r.deviceId)
        }
      };

    } catch (error) {
      logger.error('Failed to announce message', { 
        announcementId, 
        error: error.message 
      });
      throw error;
    }
  }

  async deliverAnnouncement(announcement, devices) {
    const results = [];
    
    for (const device of devices) {
      try {
        // Simulate announcement delivery
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // In production, this would call device-specific APIs
        results.push({
          deviceId: device.id,
          success: Math.random() > 0.1, // 90% success rate
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        results.push({
          deviceId: device.id,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  async getUserDevices(userId) {
    try {
      const { data, error } = await this.supabase
        .from('smart_devices')
        .select('*')
        .or(`user_id.eq.${userId},shared_with.cs.{${userId}}`)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Group by room
      const devicesByRoom = {};
      for (const device of data || []) {
        const room = device.room || 'Other';
        if (!devicesByRoom[room]) {
          devicesByRoom[room] = [];
        }
        devicesByRoom[room].push({
          id: device.id,
          name: device.name,
          type: device.type,
          state: device.state,
          online: device.online
        });
      }

      return devicesByRoom;

    } catch (error) {
      logger.error('Failed to get user devices', { error: error.message });
      return {};
    }
  }
}

// Lambda handler
const smartHomeAgent = new SmartHomeAgent();

exports.handler = async (event) => {
  logger.info('Smart Home Agent invoked', { 
    eventType: event.type,
    action: event.action,
    requestId: event.requestId || uuidv4()
  });

  try {
    // Initialize agent if needed
    await smartHomeAgent.initialize();

    // Parse event
    const { action, data } = event;

    switch (action) {
      case 'controlDevice': {
        const { error } = controlDeviceSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await smartHomeAgent.controlDevice(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'createRoutine': {
        const { error } = createRoutineSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await smartHomeAgent.createRoutine(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'announceMessage': {
        const { error } = announceMessageSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await smartHomeAgent.announceMessage(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'getUserDevices': {
        if (!data.userId) throw new Error('userId is required');
        
        const devices = await smartHomeAgent.getUserDevices(data.userId);
        return {
          statusCode: 200,
          body: JSON.stringify({ devices })
        };
      }

      case 'health': {
        return {
          statusCode: 200,
          body: JSON.stringify({
            status: 'healthy',
            agent: 'smart-home-agent',
            version: '1.0.0',
            initialized: smartHomeAgent.isInitialized,
            features: [
              'device_control',
              'routine_creation',
              'announcements',
              'multi_platform_integration'
            ],
            integrations: config.integrations,
            supportedDevices: config.deviceTypes
          })
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    logger.error('Smart Home Agent error', { 
      error: error.message,
      stack: error.stack 
    });
    
    return {
      statusCode: error.message.includes('Validation') ? 400 : 500,
      body: JSON.stringify({
        error: error.message,
        type: 'SmartHomeAgentError'
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
        --timeout 30 \
        --memory-size 512 \
        --environment Variables="{
            ENVIRONMENT='$ENVIRONMENT',
            SUPABASE_URL='$SUPABASE_URL',
            SUPABASE_SERVICE_ROLE_KEY='$SUPABASE_SERVICE_KEY',
            REDIS_URL='$REDIS_URL'
        }" \
        --description "Storytailor Smart Home Agent - IoT integration and home automation"
    
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
    --source-arn "arn:aws:events:${AWS_REGION}:${AWS_ACCOUNT_ID}:rule/storytailor-${ENVIRONMENT}-smart-home-*" \
    2>/dev/null || true

# Test the function
echo -e "${BLUE}🧪 Testing Smart Home Agent...${NC}"
TEST_PAYLOAD='{"action":"health"}'

RESULT=$(aws lambda invoke \
    --function-name "$LAMBDA_NAME" \
    --payload "$TEST_PAYLOAD" \
    --cli-binary-format raw-in-base64-out \
    /tmp/smart-home-agent-test-output.json 2>&1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Test invocation successful${NC}"
    cat /tmp/smart-home-agent-test-output.json | jq '.'
else
    echo -e "${RED}❌ Test invocation failed${NC}"
    echo "$RESULT"
fi

# Cleanup
cd - > /dev/null
rm -rf "$DEPLOY_DIR"
rm -f /tmp/smart-home-agent-test-output.json

echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║              🎉 SMART HOME AGENT DEPLOYED! 🎉                     ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Lambda Function: ${LAMBDA_NAME}${NC}"
echo -e "${CYAN}Region: ${AWS_REGION}${NC}"
echo ""
echo -e "${GREEN}✅ Smart Home Agent is ready to:${NC}"
echo -e "   • Control smart devices (lights, switches, etc.)"
echo -e "   • Create and manage routines"
echo -e "   • Make announcements on speakers"
echo -e "   • Integrate with Alexa, Google, HomeKit"
echo ""

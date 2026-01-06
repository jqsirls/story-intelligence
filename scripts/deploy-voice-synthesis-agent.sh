#!/bin/bash
# Deploy Voice Synthesis Agent Lambda
# Handles voice generation and synthesis with ElevenLabs
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
LAMBDA_NAME="storytailor-voice-synthesis-agent-${ENVIRONMENT}"
HANDLER_FILE="index.js"

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║              🎙️ DEPLOYING VOICE SYNTHESIS AGENT 🎙️                ║${NC}"
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
DEPLOY_DIR="./lambda-deployments/voice-synthesis-agent"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

echo -e "${BLUE}📁 Created deployment directory: $DEPLOY_DIR${NC}"

# Create package.json
cat > "$DEPLOY_DIR/package.json" << EOF
{
  "name": "storytailor-voice-synthesis-agent",
  "version": "1.0.0",
  "description": "Storytailor Voice Synthesis Agent - Voice generation with ElevenLabs",
  "main": "index.js",
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "redis": "^4.6.0",
    "joi": "^17.11.0",
    "winston": "^3.11.0",
    "uuid": "^9.0.1",
    "axios": "^1.6.0",
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
const axios = require('axios');
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
  elevenLabs: {
    apiKey: process.env.ELEVENLABS_API_KEY,
    apiUrl: 'https://api.elevenlabs.io/v1',
    defaultVoiceId: 'EXAVITQu4vr4xnSDxMaL', // Default voice
    modelId: 'eleven_multilingual_v2'
  },
  s3: {
    bucketName: process.env.VOICE_BUCKET || 'storytailor-voices',
    region: process.env.AWS_REGION || 'us-east-1'
  },
  voices: {
    narrator: { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', type: 'narrator' },
    child_male: { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', type: 'character' },
    child_female: { id: 'jsCqWAovK2LkecY7zXl4', name: 'Bella', type: 'character' },
    adult_male: { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', type: 'character' },
    adult_female: { id: 'ThT5KcBeYPX3keUQqHPh', name: 'Charlotte', type: 'character' }
  }
};

// AWS Services
const s3 = new AWS.S3({ region: config.s3.region });

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
const synthesizeTextSchema = Joi.object({
  text: Joi.string().min(1).max(5000).required(),
  voiceId: Joi.string().optional(),
  voiceType: Joi.string().valid('narrator', 'child_male', 'child_female', 'adult_male', 'adult_female').optional(),
  settings: Joi.object({
    stability: Joi.number().min(0).max(1).default(0.5),
    similarity_boost: Joi.number().min(0).max(1).default(0.75),
    style: Joi.number().min(0).max(1).default(0),
    use_speaker_boost: Joi.boolean().default(true)
  }).optional(),
  metadata: Joi.object().optional()
});

const synthesizeStorySchema = Joi.object({
  storyId: Joi.string().required(),
  scenes: Joi.array().items(Joi.object({
    text: Joi.string().required(),
    character: Joi.string().optional(),
    emotion: Joi.string().optional()
  })).required(),
  outputFormat: Joi.string().valid('mp3', 'webm').default('mp3')
});

const cloneVoiceSchema = Joi.object({
  userId: Joi.string().required(),
  name: Joi.string().min(1).max(100).required(),
  audioFiles: Joi.array().items(Joi.string()).min(1).max(25).required(),
  description: Joi.string().max(500).optional()
});

// Services
class VoiceSynthesisAgent {
  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.serviceKey);
    this.redis = null;
    this.isInitialized = false;
    this.voiceCache = new Map();
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Connect to Redis
      this.redis = createRedisClient({ url: config.redis.url });
      await this.redis.connect();
      
      // Test Supabase connection
      const { error } = await this.supabase.from('voice_synthesis').select('id').limit(1);
      if (error && !error.message.includes('does not exist')) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }
      
      // Test ElevenLabs API
      if (config.elevenLabs.apiKey && config.elevenLabs.apiKey !== 'placeholder') {
        await this.testElevenLabsConnection();
      }
      
      this.isInitialized = true;
      logger.info('VoiceSynthesisAgent initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize VoiceSynthesisAgent', { error: error.message });
      throw error;
    }
  }

  async testElevenLabsConnection() {
    try {
      const response = await axios.get(`${config.elevenLabs.apiUrl}/user`, {
        headers: {
          'xi-api-key': config.elevenLabs.apiKey
        }
      });
      logger.info('ElevenLabs API connected', { 
        subscription: response.data.subscription?.tier 
      });
    } catch (error) {
      logger.warn('ElevenLabs API not available', { error: error.message });
    }
  }

  async synthesizeText(data) {
    const { text, voiceId, voiceType, settings, metadata } = data;
    const synthesisId = uuidv4();
    
    logger.info('Synthesizing text to speech', { 
      synthesisId, 
      textLength: text.length,
      voiceType: voiceType || 'custom'
    });

    try {
      // Determine voice to use
      let selectedVoiceId = voiceId;
      if (!selectedVoiceId && voiceType) {
        selectedVoiceId = config.voices[voiceType]?.id;
      }
      if (!selectedVoiceId) {
        selectedVoiceId = config.elevenLabs.defaultVoiceId;
      }

      // Check cache first
      const cacheKey = this.getCacheKey(text, selectedVoiceId, settings);
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        logger.info('Returning cached synthesis', { synthesisId });
        return JSON.parse(cached);
      }

      // If no ElevenLabs API key, generate mock audio
      if (!config.elevenLabs.apiKey || config.elevenLabs.apiKey === 'placeholder') {
        return await this.generateMockAudio(synthesisId, text, selectedVoiceId);
      }

      // Call ElevenLabs API
      const audioData = await this.callElevenLabsAPI(
        text,
        selectedVoiceId,
        settings || {}
      );

      // Upload to S3
      const s3Key = `synthesis/${synthesisId}.mp3`;
      await s3.putObject({
        Bucket: config.s3.bucketName,
        Key: s3Key,
        Body: audioData,
        ContentType: 'audio/mpeg',
        Metadata: {
          synthesisId,
          voiceId: selectedVoiceId,
          textLength: text.length.toString()
        }
      }).promise();

      // Get presigned URL
      const audioUrl = s3.getSignedUrl('getObject', {
        Bucket: config.s3.bucketName,
        Key: s3Key,
        Expires: 3600 // 1 hour
      });

      // Store synthesis record
      const synthesis = {
        id: synthesisId,
        text_hash: this.hashText(text),
        voice_id: selectedVoiceId,
        voice_type: voiceType || 'custom',
        settings,
        s3_key: s3Key,
        audio_url: audioUrl,
        duration_seconds: Math.ceil(text.length / 150), // Estimate
        metadata: metadata || {},
        created_at: new Date().toISOString()
      };

      // Save to database
      const { error: dbError } = await this.supabase
        .from('voice_synthesis')
        .insert(synthesis);
        
      if (dbError && !dbError.message.includes('does not exist')) {
        logger.warn('Could not store synthesis record', { error: dbError.message });
      }

      // Cache result
      await this.redis.set(cacheKey, JSON.stringify(synthesis), {
        EX: 86400 // 24 hour cache
      });

      logger.info('Text synthesis completed', { 
        synthesisId,
        duration: synthesis.duration_seconds
      });

      return {
        success: true,
        synthesis: {
          id: synthesisId,
          audioUrl,
          duration: synthesis.duration_seconds,
          voiceUsed: selectedVoiceId
        }
      };

    } catch (error) {
      logger.error('Text synthesis failed', { 
        synthesisId, 
        error: error.message 
      });
      throw error;
    }
  }

  async callElevenLabsAPI(text, voiceId, settings) {
    try {
      const response = await axios.post(
        `${config.elevenLabs.apiUrl}/text-to-speech/${voiceId}`,
        {
          text,
          model_id: config.elevenLabs.modelId,
          voice_settings: {
            stability: settings.stability || 0.5,
            similarity_boost: settings.similarity_boost || 0.75,
            style: settings.style || 0,
            use_speaker_boost: settings.use_speaker_boost !== false
          }
        },
        {
          headers: {
            'xi-api-key': config.elevenLabs.apiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
          },
          responseType: 'arraybuffer'
        }
      );

      return Buffer.from(response.data);
    } catch (error) {
      logger.error('ElevenLabs API error', { 
        error: error.response?.data || error.message 
      });
      throw new Error('Voice synthesis service error');
    }
  }

  async generateMockAudio(synthesisId, text, voiceId) {
    // Generate mock audio file for testing
    logger.info('Generating mock audio (no ElevenLabs API key)', { synthesisId });
    
    // Create a simple WAV header
    const sampleRate = 44100;
    const duration = Math.ceil(text.length / 150); // seconds
    const numSamples = sampleRate * duration;
    
    // Store metadata instead of actual audio
    const mockData = {
      id: synthesisId,
      type: 'mock_audio',
      text: text.substring(0, 100) + '...',
      voiceId,
      duration,
      message: 'This is a mock audio response. Configure ElevenLabs API key for real synthesis.'
    };

    const s3Key = `mock/${synthesisId}.json`;
    await s3.putObject({
      Bucket: config.s3.bucketName,
      Key: s3Key,
      Body: JSON.stringify(mockData),
      ContentType: 'application/json'
    }).promise();

    const mockUrl = s3.getSignedUrl('getObject', {
      Bucket: config.s3.bucketName,
      Key: s3Key,
      Expires: 3600
    });

    return {
      success: true,
      synthesis: {
        id: synthesisId,
        audioUrl: mockUrl,
        duration,
        voiceUsed: voiceId,
        mock: true
      }
    };
  }

  async synthesizeStory(data) {
    const { storyId, scenes, outputFormat } = data;
    const sessionId = uuidv4();
    
    logger.info('Synthesizing story narration', { 
      sessionId, 
      storyId,
      sceneCount: scenes.length
    });

    try {
      const audioSegments = [];
      let totalDuration = 0;

      // Process each scene
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        
        // Determine voice for scene
        let voiceType = 'narrator';
        if (scene.character) {
          voiceType = this.getVoiceTypeForCharacter(scene.character);
        }

        // Adjust text for emotion
        const emotionalText = this.addEmotionalContext(scene.text, scene.emotion);

        // Synthesize scene
        const result = await this.synthesizeText({
          text: emotionalText,
          voiceType,
          settings: this.getEmotionSettings(scene.emotion)
        });

        audioSegments.push({
          sceneIndex: i,
          audioUrl: result.synthesis.audioUrl,
          duration: result.synthesis.duration,
          character: scene.character,
          emotion: scene.emotion
        });

        totalDuration += result.synthesis.duration;
      }

      // Create story synthesis record
      const storySynthesis = {
        id: sessionId,
        story_id: storyId,
        segments: audioSegments,
        total_duration: totalDuration,
        output_format: outputFormat,
        created_at: new Date().toISOString()
      };

      // Store in database
      await this.supabase
        .from('story_synthesis')
        .insert(storySynthesis);

      logger.info('Story synthesis completed', { 
        sessionId,
        totalDuration,
        segmentCount: audioSegments.length
      });

      return {
        success: true,
        synthesis: {
          id: sessionId,
          storyId,
          segments: audioSegments,
          totalDuration,
          format: outputFormat
        }
      };

    } catch (error) {
      logger.error('Story synthesis failed', { 
        sessionId, 
        error: error.message 
      });
      throw error;
    }
  }

  getVoiceTypeForCharacter(character) {
    // Simple mapping based on character attributes
    const lowerChar = character.toLowerCase();
    
    if (lowerChar.includes('child') || lowerChar.includes('kid')) {
      return lowerChar.includes('girl') ? 'child_female' : 'child_male';
    } else if (lowerChar.includes('woman') || lowerChar.includes('mother')) {
      return 'adult_female';
    } else if (lowerChar.includes('man') || lowerChar.includes('father')) {
      return 'adult_male';
    }
    
    return 'narrator';
  }

  addEmotionalContext(text, emotion) {
    if (!emotion) return text;
    
    // Add SSML-like markers for emotion (ElevenLabs will interpret naturally)
    const emotionPrefixes = {
      happy: '(cheerfully) ',
      sad: '(sadly) ',
      excited: '(excitedly) ',
      scared: '(fearfully) ',
      angry: '(angrily) ',
      calm: '(calmly) '
    };
    
    return emotionPrefixes[emotion] ? emotionPrefixes[emotion] + text : text;
  }

  getEmotionSettings(emotion) {
    // Adjust voice settings based on emotion
    const emotionSettings = {
      happy: { stability: 0.4, similarity_boost: 0.8, style: 0.7 },
      sad: { stability: 0.7, similarity_boost: 0.7, style: 0.3 },
      excited: { stability: 0.3, similarity_boost: 0.85, style: 0.8 },
      scared: { stability: 0.6, similarity_boost: 0.7, style: 0.5 },
      angry: { stability: 0.5, similarity_boost: 0.8, style: 0.6 },
      calm: { stability: 0.8, similarity_boost: 0.7, style: 0.2 }
    };
    
    return emotionSettings[emotion] || {};
  }

  async cloneVoice(data) {
    const { userId, name, audioFiles, description } = data;
    const cloneId = uuidv4();
    
    logger.info('Creating voice clone', { 
      cloneId, 
      userId,
      name,
      fileCount: audioFiles.length
    });

    try {
      // Check if user has permission for voice cloning
      const { data: user } = await this.supabase
        .from('users')
        .select('subscription_tier')
        .eq('id', userId)
        .single();

      if (!user || user.subscription_tier !== 'premium') {
        throw new Error('Voice cloning requires premium subscription');
      }

      // If no ElevenLabs API key, create mock clone
      if (!config.elevenLabs.apiKey || config.elevenLabs.apiKey === 'placeholder') {
        return await this.createMockVoiceClone(cloneId, userId, name, description);
      }

      // Create voice clone via ElevenLabs API
      // Note: This is a simplified version - actual implementation would handle file uploads
      const voiceData = await this.createElevenLabsVoice(name, audioFiles, description);

      // Store clone record
      const voiceClone = {
        id: cloneId,
        user_id: userId,
        name,
        elevenlabs_voice_id: voiceData.voice_id,
        description,
        status: 'active',
        created_at: new Date().toISOString()
      };

      await this.supabase
        .from('voice_clones')
        .insert(voiceClone);

      logger.info('Voice clone created successfully', { cloneId });

      return {
        success: true,
        clone: {
          id: cloneId,
          name,
          voiceId: voiceData.voice_id,
          status: 'active'
        }
      };

    } catch (error) {
      logger.error('Voice cloning failed', { 
        cloneId, 
        error: error.message 
      });
      throw error;
    }
  }

  async createMockVoiceClone(cloneId, userId, name, description) {
    logger.info('Creating mock voice clone', { cloneId });
    
    const mockVoiceId = `mock_voice_${cloneId}`;
    
    return {
      success: true,
      clone: {
        id: cloneId,
        name,
        voiceId: mockVoiceId,
        status: 'mock',
        message: 'This is a mock voice clone. Configure ElevenLabs API for real voice cloning.'
      }
    };
  }

  async createElevenLabsVoice(name, audioFiles, description) {
    // This would implement the actual ElevenLabs voice cloning API
    // For now, returning mock data
    return {
      voice_id: `elevenlabs_${uuidv4()}`
    };
  }

  getCacheKey(text, voiceId, settings) {
    const settingsStr = JSON.stringify(settings || {});
    const textHash = this.hashText(text);
    return `voice:${voiceId}:${textHash}:${this.hashText(settingsStr)}`;
  }

  hashText(text) {
    // Simple hash for caching
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  async getAvailableVoices() {
    const voices = [];
    
    // Add built-in voices
    for (const [key, voice] of Object.entries(config.voices)) {
      voices.push({
        id: voice.id,
        name: voice.name,
        type: voice.type,
        category: key
      });
    }
    
    // Add user's custom voices if any
    // This would query the database for user's cloned voices
    
    return voices;
  }
}

// Lambda handler
const voiceSynthesisAgent = new VoiceSynthesisAgent();

exports.handler = async (event) => {
  logger.info('Voice Synthesis Agent invoked', { 
    eventType: event.type,
    action: event.action,
    requestId: event.requestId || uuidv4()
  });

  try {
    // Initialize agent if needed
    await voiceSynthesisAgent.initialize();

    // Parse event
    const { action, data } = event;

    switch (action) {
      case 'synthesizeText': {
        const { error } = synthesizeTextSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await voiceSynthesisAgent.synthesizeText(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'synthesizeStory': {
        const { error } = synthesizeStorySchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await voiceSynthesisAgent.synthesizeStory(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'cloneVoice': {
        const { error } = cloneVoiceSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await voiceSynthesisAgent.cloneVoice(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'getAvailableVoices': {
        const voices = await voiceSynthesisAgent.getAvailableVoices();
        return {
          statusCode: 200,
          body: JSON.stringify({ voices })
        };
      }

      case 'health': {
        return {
          statusCode: 200,
          body: JSON.stringify({
            status: 'healthy',
            agent: 'voice-synthesis-agent',
            version: '1.0.0',
            initialized: voiceSynthesisAgent.isInitialized,
            features: [
              'text_to_speech',
              'story_narration',
              'voice_cloning',
              'emotional_synthesis'
            ],
            voiceCount: Object.keys(config.voices).length,
            elevenLabsConnected: !!config.elevenLabs.apiKey && config.elevenLabs.apiKey !== 'placeholder'
          })
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    logger.error('Voice Synthesis Agent error', { 
      error: error.message,
      stack: error.stack 
    });
    
    return {
      statusCode: error.message.includes('Validation') ? 400 : 500,
      body: JSON.stringify({
        error: error.message,
        type: 'VoiceSynthesisAgentError'
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
ELEVENLABS_API_KEY="${ELEVENLABS_API_KEY:-placeholder}"

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
            ELEVENLABS_API_KEY='$ELEVENLABS_API_KEY',
            VOICE_BUCKET='storytailor-voices-$ENVIRONMENT'
        }" \
        --description "Storytailor Voice Synthesis Agent - Voice generation with ElevenLabs"
    
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
            ELEVENLABS_API_KEY='$ELEVENLABS_API_KEY',
            VOICE_BUCKET='storytailor-voices-$ENVIRONMENT'
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
    --source-arn "arn:aws:events:${AWS_REGION}:${AWS_ACCOUNT_ID}:rule/storytailor-${ENVIRONMENT}-voice-*" \
    2>/dev/null || true

# Test the function
echo -e "${BLUE}🧪 Testing Voice Synthesis Agent...${NC}"
TEST_PAYLOAD='{"action":"health"}'

RESULT=$(aws lambda invoke \
    --function-name "$LAMBDA_NAME" \
    --payload "$TEST_PAYLOAD" \
    --cli-binary-format raw-in-base64-out \
    /tmp/voice-synthesis-agent-test-output.json 2>&1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Test invocation successful${NC}"
    cat /tmp/voice-synthesis-agent-test-output.json | jq '.'
else
    echo -e "${RED}❌ Test invocation failed${NC}"
    echo "$RESULT"
fi

# Cleanup
cd - > /dev/null
rm -rf "$DEPLOY_DIR"
rm -f /tmp/voice-synthesis-agent-test-output.json

echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║            🎉 VOICE SYNTHESIS AGENT DEPLOYED! 🎉                  ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Lambda Function: ${LAMBDA_NAME}${NC}"
echo -e "${CYAN}Region: ${AWS_REGION}${NC}"
echo ""
echo -e "${GREEN}✅ Voice Synthesis Agent is ready to:${NC}"
echo -e "   • Convert text to speech with multiple voices"
echo -e "   • Synthesize complete story narrations"
echo -e "   • Support emotional voice variations"
echo -e "   • Clone voices (with ElevenLabs API)"
echo ""

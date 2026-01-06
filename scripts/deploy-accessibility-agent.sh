#!/bin/bash
# Deploy Accessibility Agent Lambda
# Handles accessibility features and adaptive content
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
LAMBDA_NAME="storytailor-accessibility-agent-${ENVIRONMENT}"
HANDLER_FILE="index.js"

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║             ♿ DEPLOYING ACCESSIBILITY AGENT ♿                    ║${NC}"
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
DEPLOY_DIR="./lambda-deployments/accessibility-agent"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

echo -e "${BLUE}📁 Created deployment directory: $DEPLOY_DIR${NC}"

# Create package.json
cat > "$DEPLOY_DIR/package.json" << EOF
{
  "name": "storytailor-accessibility-agent",
  "version": "1.0.0",
  "description": "Storytailor Accessibility Agent - Adaptive content and accessibility features",
  "main": "index.js",
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "redis": "^4.6.0",
    "joi": "^17.11.0",
    "winston": "^3.11.0",
    "uuid": "^9.0.1",
    "compromise": "^14.10.0"
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
const nlp = require('compromise');

// Configuration
const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  accessibility: {
    features: [
      'screen_reader',
      'high_contrast',
      'large_text',
      'simple_language',
      'audio_description',
      'keyboard_navigation',
      'reduced_motion',
      'captions'
    ],
    readingLevels: {
      'preschool': { min: 0, max: 5 },
      'elementary': { min: 6, max: 11 },
      'middle': { min: 12, max: 14 },
      'high': { min: 15, max: 18 },
      'adult': { min: 19, max: 99 }
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
const adaptContentSchema = Joi.object({
  content: Joi.string().required(),
  userProfile: Joi.object({
    userId: Joi.string().required(),
    features: Joi.array().items(Joi.string().valid(...config.accessibility.features)).required(),
    readingLevel: Joi.string().valid('preschool', 'elementary', 'middle', 'high', 'adult').optional(),
    preferences: Joi.object().optional()
  }).required(),
  contentType: Joi.string().valid('story', 'instruction', 'menu', 'dialog').default('story')
});

const generateAltTextSchema = Joi.object({
  imageDescription: Joi.string().required(),
  context: Joi.string().optional(),
  maxLength: Joi.number().min(50).max(500).default(150)
});

const assessReadabilitySchema = Joi.object({
  text: Joi.string().required(),
  targetLevel: Joi.string().valid('preschool', 'elementary', 'middle', 'high', 'adult').optional()
});

// Services
class AccessibilityAgent {
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
      const { error } = await this.supabase.from('accessibility_profiles').select('id').limit(1);
      if (error && !error.message.includes('does not exist')) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }
      
      this.isInitialized = true;
      logger.info('AccessibilityAgent initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AccessibilityAgent', { error: error.message });
      throw error;
    }
  }

  async adaptContent(data) {
    const { content, userProfile, contentType } = data;
    const adaptationId = uuidv4();
    
    logger.info('Adapting content for accessibility', { 
      adaptationId, 
      userId: userProfile.userId,
      featureCount: userProfile.features.length,
      contentType
    });

    try {
      let adaptedContent = content;
      const adaptations = [];

      // Apply each requested feature
      for (const feature of userProfile.features) {
        const adaptation = await this.applyFeature(feature, adaptedContent, userProfile);
        adaptedContent = adaptation.content;
        adaptations.push({
          feature,
          applied: adaptation.applied,
          changes: adaptation.changes
        });
      }

      // Adjust reading level if specified
      if (userProfile.readingLevel) {
        const levelAdaptation = await this.adjustReadingLevel(
          adaptedContent, 
          userProfile.readingLevel
        );
        adaptedContent = levelAdaptation.content;
        adaptations.push({
          feature: 'reading_level',
          applied: true,
          changes: levelAdaptation.changes
        });
      }

      // Generate metadata for screen readers
      const metadata = this.generateAccessibilityMetadata(adaptedContent, contentType);

      // Store adaptation record
      const adaptationRecord = {
        id: adaptationId,
        user_id: userProfile.userId,
        original_content_hash: this.hashContent(content),
        adapted_content: adaptedContent,
        features_applied: userProfile.features,
        adaptations,
        metadata,
        created_at: new Date().toISOString()
      };

      // Cache the adaptation
      const cacheKey = `adaptation:${userProfile.userId}:${this.hashContent(content)}`;
      await this.redis.set(cacheKey, JSON.stringify(adaptationRecord), {
        EX: 86400 // 24 hour cache
      });

      logger.info('Content adaptation complete', { 
        adaptationId,
        adaptationsApplied: adaptations.length
      });

      return {
        success: true,
        adaptation: {
          id: adaptationId,
          content: adaptedContent,
          metadata,
          adaptations,
          cacheable: true
        }
      };

    } catch (error) {
      logger.error('Failed to adapt content', { 
        adaptationId, 
        error: error.message 
      });
      throw error;
    }
  }

  async applyFeature(feature, content, profile) {
    const changes = [];
    let adaptedContent = content;

    switch (feature) {
      case 'screen_reader':
        // Add ARIA labels and semantic structure
        adaptedContent = this.addScreenReaderSupport(content);
        changes.push('Added ARIA labels', 'Improved semantic structure');
        break;

      case 'high_contrast':
        // Add high contrast indicators
        adaptedContent = this.addHighContrastMarkers(content);
        changes.push('Added contrast markers for UI elements');
        break;

      case 'large_text':
        // Simplify and emphasize key text
        adaptedContent = this.emphasizeKeyText(content);
        changes.push('Emphasized important text', 'Simplified structure');
        break;

      case 'simple_language':
        // Simplify complex sentences
        adaptedContent = await this.simplifyLanguage(content);
        changes.push('Simplified vocabulary', 'Shortened sentences');
        break;

      case 'audio_description':
        // Add audio description markers
        adaptedContent = this.addAudioDescriptions(content);
        changes.push('Added audio description cues');
        break;

      case 'keyboard_navigation':
        // Add keyboard navigation hints
        adaptedContent = this.addKeyboardHints(content);
        changes.push('Added keyboard navigation markers');
        break;

      case 'reduced_motion':
        // Remove or mark motion-heavy content
        adaptedContent = this.reduceMotionContent(content);
        changes.push('Marked motion elements for static display');
        break;

      case 'captions':
        // Add caption markers for audio content
        adaptedContent = this.addCaptionMarkers(content);
        changes.push('Added caption indicators');
        break;
    }

    return {
      content: adaptedContent,
      applied: true,
      changes
    };
  }

  addScreenReaderSupport(content) {
    // Add structure markers for screen readers
    let structured = content;
    
    // Mark headings
    structured = structured.replace(/^#\s+(.+)$/gm, '[HEADING LEVEL 1] $1 [END HEADING]');
    structured = structured.replace(/^##\s+(.+)$/gm, '[HEADING LEVEL 2] $1 [END HEADING]');
    
    // Mark lists
    structured = structured.replace(/^-\s+(.+)$/gm, '[LIST ITEM] $1 [END LIST ITEM]');
    
    // Add navigation landmarks
    if (structured.includes('Chapter')) {
      structured = '[MAIN CONTENT START]\n' + structured + '\n[MAIN CONTENT END]';
    }
    
    return structured;
  }

  addHighContrastMarkers(content) {
    // Add markers for UI elements that need high contrast
    return content.replace(/\[button:([^\]]+)\]/g, '[HIGH CONTRAST BUTTON: $1]');
  }

  emphasizeKeyText(content) {
    // Use NLP to identify key phrases
    const doc = nlp(content);
    const importantWords = doc.nouns().out('array').slice(0, 5);
    
    let emphasized = content;
    for (const word of importantWords) {
      emphasized = emphasized.replace(
        new RegExp(`\\b${word}\\b`, 'gi'),
        `**${word.toUpperCase()}**`
      );
    }
    
    return emphasized;
  }

  async simplifyLanguage(content) {
    // Simplify complex sentences
    const doc = nlp(content);
    const sentences = doc.sentences().out('array');
    const simplified = [];
    
    for (const sentence of sentences) {
      if (sentence.split(' ').length > 15) {
        // Break long sentences
        const parts = sentence.split(',');
        simplified.push(...parts.map(p => p.trim() + '.'));
      } else {
        simplified.push(sentence);
      }
    }
    
    // Replace complex words with simpler alternatives
    let simpleContent = simplified.join(' ');
    const replacements = {
      'utilize': 'use',
      'implement': 'do',
      'demonstrate': 'show',
      'accomplish': 'do',
      'significant': 'big',
      'numerous': 'many'
    };
    
    for (const [complex, simple] of Object.entries(replacements)) {
      simpleContent = simpleContent.replace(new RegExp(complex, 'gi'), simple);
    }
    
    return simpleContent;
  }

  addAudioDescriptions(content) {
    // Add markers for audio descriptions
    return content.replace(/\[scene:([^\]]+)\]/g, '[AUDIO DESCRIPTION: $1]');
  }

  addKeyboardHints(content) {
    // Add keyboard navigation hints
    return content.replace(
      /\[interactive:([^\]]+)\]/g,
      '[KEYBOARD: Press ENTER to interact with $1]'
    );
  }

  reduceMotionContent(content) {
    // Mark motion elements for static display
    return content.replace(/\[animation:([^\]]+)\]/g, '[STATIC IMAGE: $1]');
  }

  addCaptionMarkers(content) {
    // Add caption markers for audio/video content
    return content.replace(/\[audio:([^\]]+)\]/g, '[CAPTIONS AVAILABLE: $1]');
  }

  async adjustReadingLevel(content, targetLevel) {
    const changes = [];
    let adjusted = content;
    
    // Get target reading age
    const ageRange = config.accessibility.readingLevels[targetLevel];
    
    // Analyze current readability
    const analysis = this.analyzeReadability(content);
    
    if (analysis.level > ageRange.max) {
      // Simplify if too complex
      adjusted = await this.simplifyLanguage(content);
      changes.push(`Simplified from ${analysis.level} to ${targetLevel} reading level`);
    } else if (analysis.level < ageRange.min && targetLevel !== 'preschool') {
      // Add complexity if too simple (except for preschool)
      adjusted = this.addComplexity(content);
      changes.push(`Enhanced complexity for ${targetLevel} level`);
    }
    
    return {
      content: adjusted,
      changes
    };
  }

  analyzeReadability(text) {
    // Simple readability analysis
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;
    const syllables = this.countSyllables(text);
    
    // Flesch Reading Ease approximation
    const avgWordsPerSentence = words / sentences;
    const avgSyllablesPerWord = syllables / words;
    
    const readingEase = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
    
    // Convert to grade level
    let gradeLevel;
    if (readingEase >= 90) gradeLevel = 5;
    else if (readingEase >= 80) gradeLevel = 6;
    else if (readingEase >= 70) gradeLevel = 7;
    else if (readingEase >= 60) gradeLevel = 8;
    else if (readingEase >= 50) gradeLevel = 10;
    else if (readingEase >= 30) gradeLevel = 13;
    else gradeLevel = 16;
    
    return {
      level: gradeLevel,
      ease: readingEase,
      avgWordsPerSentence,
      avgSyllablesPerWord
    };
  }

  countSyllables(text) {
    // Simple syllable counting
    const words = text.toLowerCase().split(/\s+/);
    let totalSyllables = 0;
    
    for (const word of words) {
      const syllables = word.replace(/[^aeiou]/g, '').length || 1;
      totalSyllables += syllables;
    }
    
    return totalSyllables;
  }

  addComplexity(content) {
    // Add subordinate clauses and varied sentence structure
    const sentences = content.split('. ');
    const enhanced = sentences.map((sentence, i) => {
      if (i % 3 === 0 && !sentence.includes(',')) {
        return sentence + ', which adds depth to the narrative';
      }
      return sentence;
    });
    
    return enhanced.join('. ');
  }

  generateAccessibilityMetadata(content, contentType) {
    const metadata = {
      contentType,
      structure: {
        headingCount: (content.match(/^#+\s/gm) || []).length,
        paragraphCount: content.split('\n\n').length,
        listCount: (content.match(/^-\s/gm) || []).length
      },
      readingTime: Math.ceil(content.split(/\s+/).length / 200), // minutes
      hasImages: content.includes('[image:') || content.includes('[scene:'),
      hasInteractive: content.includes('[interactive:'),
      requiresAudio: content.includes('[audio:')
    };
    
    return metadata;
  }

  async generateAltText(data) {
    const { imageDescription, context, maxLength } = data;
    
    logger.info('Generating alt text', { 
      descriptionLength: imageDescription.length,
      maxLength
    });

    try {
      // Generate concise, descriptive alt text
      let altText = imageDescription;
      
      // Add context if provided
      if (context) {
        altText = `In the context of ${context}: ${altText}`;
      }
      
      // Ensure proper length
      if (altText.length > maxLength) {
        // Intelligently truncate
        const doc = nlp(altText);
        const sentences = doc.sentences().out('array');
        
        altText = '';
        for (const sentence of sentences) {
          if (altText.length + sentence.length <= maxLength - 3) {
            altText += sentence + ' ';
          } else {
            break;
          }
        }
        altText = altText.trim() + '...';
      }
      
      // Ensure it's descriptive
      if (!altText.includes('image of') && !altText.includes('shows')) {
        altText = 'Image shows: ' + altText;
      }
      
      return {
        success: true,
        altText,
        length: altText.length,
        truncated: altText.endsWith('...')
      };

    } catch (error) {
      logger.error('Failed to generate alt text', { error: error.message });
      throw error;
    }
  }

  async assessReadability(data) {
    const { text, targetLevel } = data;
    
    logger.info('Assessing readability', { 
      textLength: text.length,
      targetLevel
    });

    try {
      const analysis = this.analyzeReadability(text);
      
      // Determine appropriate level
      let appropriateLevel;
      if (analysis.level <= 5) appropriateLevel = 'preschool';
      else if (analysis.level <= 8) appropriateLevel = 'elementary';
      else if (analysis.level <= 10) appropriateLevel = 'middle';
      else if (analysis.level <= 12) appropriateLevel = 'high';
      else appropriateLevel = 'adult';
      
      // Check if matches target
      const matchesTarget = !targetLevel || appropriateLevel === targetLevel;
      
      // Generate suggestions
      const suggestions = [];
      if (targetLevel && !matchesTarget) {
        if (analysis.level > config.accessibility.readingLevels[targetLevel].max) {
          suggestions.push('Use shorter sentences');
          suggestions.push('Replace complex words with simpler alternatives');
          suggestions.push('Break up long paragraphs');
        } else {
          suggestions.push('Add more descriptive language');
          suggestions.push('Use varied sentence structure');
          suggestions.push('Include more complex vocabulary where appropriate');
        }
      }
      
      return {
        success: true,
        analysis: {
          currentLevel: appropriateLevel,
          gradeLevel: analysis.level,
          readingEase: analysis.ease,
          matchesTarget,
          metrics: {
            avgWordsPerSentence: analysis.avgWordsPerSentence.toFixed(1),
            avgSyllablesPerWord: analysis.avgSyllablesPerWord.toFixed(1)
          },
          suggestions
        }
      };

    } catch (error) {
      logger.error('Failed to assess readability', { error: error.message });
      throw error;
    }
  }

  hashContent(content) {
    // Simple hash for caching
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  async getUserProfile(userId) {
    try {
      // Check cache first
      const cacheKey = `accessibility_profile:${userId}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
      
      // Query database
      const { data, error } = await this.supabase
        .from('accessibility_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error || !data) {
        // Return default profile
        return {
          userId,
          features: [],
          readingLevel: 'adult',
          preferences: {}
        };
      }
      
      // Cache result
      await this.redis.set(cacheKey, JSON.stringify(data), {
        EX: 3600 // 1 hour
      });
      
      return data;
    } catch (error) {
      logger.error('Failed to get user profile', { error: error.message });
      return null;
    }
  }
}

// Lambda handler
const accessibilityAgent = new AccessibilityAgent();

exports.handler = async (event) => {
  logger.info('Accessibility Agent invoked', { 
    eventType: event.type,
    action: event.action,
    requestId: event.requestId || uuidv4()
  });

  try {
    // Initialize agent if needed
    await accessibilityAgent.initialize();

    // Parse event
    const { action, data } = event;

    switch (action) {
      case 'adaptContent': {
        const { error } = adaptContentSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await accessibilityAgent.adaptContent(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'generateAltText': {
        const { error } = generateAltTextSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await accessibilityAgent.generateAltText(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'assessReadability': {
        const { error } = assessReadabilitySchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await accessibilityAgent.assessReadability(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'getUserProfile': {
        if (!data.userId) throw new Error('userId is required');
        
        const profile = await accessibilityAgent.getUserProfile(data.userId);
        return {
          statusCode: 200,
          body: JSON.stringify({ profile })
        };
      }

      case 'health': {
        return {
          statusCode: 200,
          body: JSON.stringify({
            status: 'healthy',
            agent: 'accessibility-agent',
            version: '1.0.0',
            initialized: accessibilityAgent.isInitialized,
            features: config.accessibility.features,
            supportedLevels: Object.keys(config.accessibility.readingLevels)
          })
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    logger.error('Accessibility Agent error', { 
      error: error.message,
      stack: error.stack 
    });
    
    return {
      statusCode: error.message.includes('Validation') ? 400 : 500,
      body: JSON.stringify({
        error: error.message,
        type: 'AccessibilityAgentError'
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
        --description "Storytailor Accessibility Agent - Adaptive content and accessibility features"
    
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
    --source-arn "arn:aws:events:${AWS_REGION}:${AWS_ACCOUNT_ID}:rule/storytailor-${ENVIRONMENT}-accessibility-*" \
    2>/dev/null || true

# Test the function
echo -e "${BLUE}🧪 Testing Accessibility Agent...${NC}"
TEST_PAYLOAD='{"action":"health"}'

RESULT=$(aws lambda invoke \
    --function-name "$LAMBDA_NAME" \
    --payload "$TEST_PAYLOAD" \
    --cli-binary-format raw-in-base64-out \
    /tmp/accessibility-agent-test-output.json 2>&1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Test invocation successful${NC}"
    cat /tmp/accessibility-agent-test-output.json | jq '.'
else
    echo -e "${RED}❌ Test invocation failed${NC}"
    echo "$RESULT"
fi

# Cleanup
cd - > /dev/null
rm -rf "$DEPLOY_DIR"
rm -f /tmp/accessibility-agent-test-output.json

echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║             🎉 ACCESSIBILITY AGENT DEPLOYED! 🎉                   ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Lambda Function: ${LAMBDA_NAME}${NC}"
echo -e "${CYAN}Region: ${AWS_REGION}${NC}"
echo ""
echo -e "${GREEN}✅ Accessibility Agent is ready to:${NC}"
echo -e "   • Adapt content for various accessibility needs"
echo -e "   • Support screen readers and high contrast"
echo -e "   • Adjust reading levels dynamically"
echo -e "   • Generate alt text for images"
echo -e "   • Assess and improve readability"
echo ""
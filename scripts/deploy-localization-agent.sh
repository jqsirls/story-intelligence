#!/bin/bash
# Deploy Localization Agent Lambda
# Handles multi-language support and translations
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
LAMBDA_NAME="storytailor-localization-agent-${ENVIRONMENT}"
HANDLER_FILE="index.js"

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║              🌍 DEPLOYING LOCALIZATION AGENT 🌍                   ║${NC}"
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
DEPLOY_DIR="./lambda-deployments/localization-agent"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

echo -e "${BLUE}📁 Created deployment directory: $DEPLOY_DIR${NC}"

# Create package.json
cat > "$DEPLOY_DIR/package.json" << EOF
{
  "name": "storytailor-localization-agent",
  "version": "1.0.0",
  "description": "Storytailor Localization Agent - Multi-language support and translations",
  "main": "index.js",
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "redis": "^4.6.0",
    "joi": "^17.11.0",
    "winston": "^3.11.0",
    "uuid": "^9.0.1",
    "openai": "^4.20.0",
    "franc": "^6.1.0"
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
const { franc } = require('franc');

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
  localization: {
    supportedLanguages: [
      { code: 'en', name: 'English', native: 'English' },
      { code: 'es', name: 'Spanish', native: 'Español' },
      { code: 'fr', name: 'French', native: 'Français' },
      { code: 'de', name: 'German', native: 'Deutsch' },
      { code: 'it', name: 'Italian', native: 'Italiano' },
      { code: 'pt', name: 'Portuguese', native: 'Português' },
      { code: 'zh', name: 'Chinese', native: '中文' },
      { code: 'ja', name: 'Japanese', native: '日本語' },
      { code: 'ko', name: 'Korean', native: '한국어' },
      { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
      { code: 'ar', name: 'Arabic', native: 'العربية' },
      { code: 'ru', name: 'Russian', native: 'Русский' }
    ],
    defaultLanguage: 'en',
    cacheTTL: 604800 // 7 days
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
const translateContentSchema = Joi.object({
  content: Joi.string().required(),
  targetLanguage: Joi.string().length(2).required(),
  sourceLanguage: Joi.string().length(2).optional(),
  contentType: Joi.string().valid('story', 'interface', 'educational', 'notification').default('story'),
  preserveFormatting: Joi.boolean().default(true),
  metadata: Joi.object().optional()
});

const detectLanguageSchema = Joi.object({
  text: Joi.string().min(10).required(),
  returnAll: Joi.boolean().default(false)
});

const localizeUISchema = Joi.object({
  elements: Joi.array().items(Joi.object({
    key: Joi.string().required(),
    text: Joi.string().required(),
    context: Joi.string().optional()
  })).required(),
  targetLanguage: Joi.string().length(2).required(),
  namespace: Joi.string().default('ui')
});

// Services
class LocalizationAgent {
  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.serviceKey);
    this.redis = null;
    this.isInitialized = false;
    this.translationCache = new Map();
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Connect to Redis
      this.redis = createRedisClient({ url: config.redis.url });
      await this.redis.connect();
      
      // Test Supabase connection
      const { error } = await this.supabase.from('translations').select('id').limit(1);
      if (error && !error.message.includes('does not exist')) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }
      
      this.isInitialized = true;
      logger.info('LocalizationAgent initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize LocalizationAgent', { error: error.message });
      throw error;
    }
  }

  async translateContent(data) {
    const { content, targetLanguage, sourceLanguage, contentType, preserveFormatting, metadata } = data;
    const translationId = uuidv4();
    
    logger.info('Translating content', { 
      translationId, 
      targetLanguage,
      sourceLanguage,
      contentType,
      contentLength: content.length
    });

    try {
      // Validate target language
      const targetLang = this.getLanguage(targetLanguage);
      if (!targetLang) {
        throw new Error(`Unsupported target language: ${targetLanguage}`);
      }

      // Detect source language if not provided
      const sourceLang = sourceLanguage || this.detectLanguageSync(content);
      
      // Check if translation needed
      if (sourceLang === targetLanguage) {
        return {
          success: true,
          translation: {
            id: translationId,
            content,
            sourceLanguage: sourceLang,
            targetLanguage,
            cached: false,
            noTranslationNeeded: true
          }
        };
      }

      // Check cache
      const cacheKey = this.getCacheKey(content, sourceLang, targetLanguage, contentType);
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        logger.info('Returning cached translation', { translationId });
        return {
          success: true,
          translation: {
            id: translationId,
            ...JSON.parse(cached),
            cached: true
          }
        };
      }

      // Prepare content for translation
      const preparedContent = preserveFormatting ? 
        this.prepareFormattedContent(content) : content;

      // Translate using OpenAI
      const translatedContent = await this.performTranslation(
        preparedContent,
        sourceLang,
        targetLanguage,
        contentType,
        targetLang.name
      );

      // Restore formatting if needed
      const finalContent = preserveFormatting ? 
        this.restoreFormatting(translatedContent, content) : translatedContent;

      // Store translation
      const translation = {
        id: translationId,
        content: finalContent,
        originalContent: content,
        sourceLanguage: sourceLang,
        targetLanguage,
        contentType,
        preservedFormatting: preserveFormatting,
        metadata: metadata || {},
        createdAt: new Date().toISOString()
      };

      // Save to database
      const { error: dbError } = await this.supabase
        .from('translations')
        .insert({
          ...translation,
          hash: this.hashContent(content)
        });
        
      if (dbError && !dbError.message.includes('does not exist')) {
        logger.warn('Could not store translation in database', { error: dbError.message });
      }

      // Cache translation
      await this.redis.set(cacheKey, JSON.stringify(translation), {
        EX: config.localization.cacheTTL
      });

      logger.info('Translation completed', { 
        translationId,
        fromLang: sourceLang,
        toLang: targetLanguage
      });

      return {
        success: true,
        translation: {
          id: translationId,
          content: finalContent,
          sourceLanguage: sourceLang,
          targetLanguage,
          cached: false
        }
      };

    } catch (error) {
      logger.error('Translation failed', { 
        translationId, 
        error: error.message 
      });
      throw error;
    }
  }

  async performTranslation(content, sourceLang, targetLang, contentType, targetLangName) {
    const systemPrompt = `You are a professional translator specializing in children's content. 
      Translate with cultural sensitivity and age-appropriate language.
      Preserve the tone, emotion, and storytelling quality.
      For ${contentType} content, maintain the appropriate style and register.`;

    const userPrompt = `Translate the following from ${sourceLang} to ${targetLang} (${targetLangName}):
      
      ${content}
      
      Important:
      - Maintain the same emotional tone
      - Keep it age-appropriate
      - Preserve any formatting markers
      - Adapt cultural references appropriately`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: Math.min(content.length * 2, 4000)
    });

    return completion.choices[0].message.content;
  }

  prepareFormattedContent(content) {
    // Mark formatting elements
    let prepared = content;
    
    // Preserve line breaks
    prepared = prepared.replace(/\n/g, '[NEWLINE]');
    
    // Preserve emphasis
    prepared = prepared.replace(/\*\*([^*]+)\*\*/g, '[BOLD]$1[/BOLD]');
    prepared = prepared.replace(/\*([^*]+)\*/g, '[ITALIC]$1[/ITALIC]');
    
    // Preserve special markers
    prepared = prepared.replace(/\[([^\]]+):([^\]]+)\]/g, '[MARKER:$1:$2]');
    
    return prepared;
  }

  restoreFormatting(translated, original) {
    let restored = translated;
    
    // Restore line breaks
    restored = restored.replace(/\[NEWLINE\]/g, '\n');
    
    // Restore emphasis
    restored = restored.replace(/\[BOLD\]([^[]+)\[\/BOLD\]/g, '**$1**');
    restored = restored.replace(/\[ITALIC\]([^[]+)\[\/ITALIC\]/g, '*$1*');
    
    // Restore special markers
    restored = restored.replace(/\[MARKER:([^:]+):([^\]]+)\]/g, '[$1:$2]');
    
    return restored;
  }

  async detectLanguage(data) {
    const { text, returnAll } = data;
    
    logger.info('Detecting language', { 
      textLength: text.length,
      returnAll
    });

    try {
      // Use franc for language detection
      const detected = franc(text);
      
      if (detected === 'und') {
        // Undetermined, try with OpenAI
        const aiDetected = await this.detectLanguageWithAI(text);
        return {
          success: true,
          detection: {
            language: aiDetected,
            confidence: 0.7,
            method: 'ai'
          }
        };
      }

      // Get full language info
      const language = this.getLanguageByCode(detected);
      
      if (returnAll) {
        // Return all possible languages with confidence scores
        const all = franc.all(text).slice(0, 5).map(([lang, score]) => ({
          code: lang,
          name: this.getLanguageByCode(lang)?.name || lang,
          confidence: score / 1000
        }));
        
        return {
          success: true,
          detection: {
            primary: language?.code || detected,
            all
          }
        };
      }

      return {
        success: true,
        detection: {
          language: language?.code || detected,
          confidence: 0.9,
          method: 'statistical'
        }
      };

    } catch (error) {
      logger.error('Language detection failed', { error: error.message });
      throw error;
    }
  }

  detectLanguageSync(text) {
    const detected = franc(text);
    if (detected === 'und') {
      return config.localization.defaultLanguage;
    }
    
    // Map franc codes to our codes
    const mapping = {
      'eng': 'en', 'spa': 'es', 'fra': 'fr', 'deu': 'de',
      'ita': 'it', 'por': 'pt', 'zho': 'zh', 'jpn': 'ja',
      'kor': 'ko', 'hin': 'hi', 'ara': 'ar', 'rus': 'ru'
    };
    
    return mapping[detected] || config.localization.defaultLanguage;
  }

  async detectLanguageWithAI(text) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { 
            role: 'system', 
            content: 'Detect the language of the text. Respond with only the ISO 639-1 two-letter language code.'
          },
          { role: 'user', content: text }
        ],
        temperature: 0,
        max_tokens: 10
      });

      const code = completion.choices[0].message.content.trim().toLowerCase();
      return this.getLanguage(code) ? code : config.localization.defaultLanguage;

    } catch (error) {
      return config.localization.defaultLanguage;
    }
  }

  async localizeUI(data) {
    const { elements, targetLanguage, namespace } = data;
    const localizationId = uuidv4();
    
    logger.info('Localizing UI elements', { 
      localizationId, 
      targetLanguage,
      namespace,
      elementCount: elements.length
    });

    try {
      // Validate language
      const targetLang = this.getLanguage(targetLanguage);
      if (!targetLang) {
        throw new Error(`Unsupported language: ${targetLanguage}`);
      }

      // Check cache for existing translations
      const translations = {};
      const toTranslate = [];
      
      for (const element of elements) {
        const cacheKey = `ui:${namespace}:${element.key}:${targetLanguage}`;
        const cached = await this.redis.get(cacheKey);
        
        if (cached) {
          translations[element.key] = JSON.parse(cached).text;
        } else {
          toTranslate.push(element);
        }
      }

      // Batch translate missing elements
      if (toTranslate.length > 0) {
        const batchTranslations = await this.batchTranslateUI(
          toTranslate,
          targetLanguage,
          targetLang.name
        );

        // Cache and merge results
        for (const element of toTranslate) {
          const translated = batchTranslations[element.key];
          if (translated) {
            translations[element.key] = translated;
            
            // Cache individual translation
            const cacheKey = `ui:${namespace}:${element.key}:${targetLanguage}`;
            await this.redis.set(cacheKey, JSON.stringify({
              text: translated,
              originalText: element.text,
              context: element.context
            }), {
              EX: config.localization.cacheTTL
            });
          }
        }
      }

      // Store complete localization set
      const localizationSet = {
        id: localizationId,
        namespace,
        language: targetLanguage,
        translations,
        elementCount: elements.length,
        createdAt: new Date().toISOString()
      };

      // Save to database
      const { error: dbError } = await this.supabase
        .from('ui_localizations')
        .insert(localizationSet);
        
      if (dbError && !dbError.message.includes('does not exist')) {
        logger.warn('Could not store UI localization', { error: dbError.message });
      }

      logger.info('UI localization completed', { 
        localizationId,
        translatedCount: Object.keys(translations).length
      });

      return {
        success: true,
        localization: {
          id: localizationId,
          language: targetLanguage,
          translations,
          namespace
        }
      };

    } catch (error) {
      logger.error('UI localization failed', { 
        localizationId, 
        error: error.message 
      });
      throw error;
    }
  }

  async batchTranslateUI(elements, targetLang, targetLangName) {
    const translations = {};
    
    // Create batch prompt
    const batchPrompt = elements.map((el, idx) => 
      `${idx + 1}. "${el.text}"${el.context ? ` (Context: ${el.context})` : ''}`
    ).join('\n');

    const systemPrompt = `You are translating UI elements for a children's storytelling app.
      Keep translations concise, child-friendly, and culturally appropriate.
      Maintain consistency across related terms.`;

    const userPrompt = `Translate these UI elements to ${targetLang} (${targetLangName}):
      
      ${batchPrompt}
      
      Respond with translations in the same numbered format.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    // Parse response
    const response = completion.choices[0].message.content;
    const lines = response.split('\n');
    
    for (let i = 0; i < elements.length; i++) {
      const line = lines[i];
      if (line) {
        // Extract translation from numbered format
        const match = line.match(/^\d+\.\s*"?([^"]+)"?/);
        if (match) {
          translations[elements[i].key] = match[1].trim();
        }
      }
    }

    return translations;
  }

  getLanguage(code) {
    return config.localization.supportedLanguages.find(lang => lang.code === code);
  }

  getLanguageByCode(code) {
    // Map common codes
    const mapping = {
      'eng': 'en', 'spa': 'es', 'fra': 'fr', 'deu': 'de',
      'ita': 'it', 'por': 'pt', 'zho': 'zh', 'jpn': 'ja',
      'kor': 'ko', 'hin': 'hi', 'ara': 'ar', 'rus': 'ru'
    };
    
    const mappedCode = mapping[code] || code;
    return this.getLanguage(mappedCode);
  }

  getCacheKey(content, sourceLang, targetLang, contentType) {
    const hash = this.hashContent(content);
    return `translation:${sourceLang}:${targetLang}:${contentType}:${hash}`;
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

  async getUserLanguagePreference(userId) {
    try {
      // Check cache
      const cacheKey = `user_language:${userId}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Query database
      const { data } = await this.supabase
        .from('user_preferences')
        .select('language')
        .eq('user_id', userId)
        .single();

      const language = data?.language || config.localization.defaultLanguage;
      
      // Cache result
      await this.redis.set(cacheKey, language, {
        EX: 3600 // 1 hour
      });

      return language;

    } catch (error) {
      logger.error('Failed to get user language preference', { error: error.message });
      return config.localization.defaultLanguage;
    }
  }

  async setUserLanguagePreference(userId, language) {
    try {
      // Validate language
      if (!this.getLanguage(language)) {
        throw new Error(`Unsupported language: ${language}`);
      }

      // Update database
      await this.supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          language,
          updated_at: new Date().toISOString()
        });

      // Update cache
      const cacheKey = `user_language:${userId}`;
      await this.redis.set(cacheKey, language, {
        EX: 3600
      });

      return true;

    } catch (error) {
      logger.error('Failed to set user language preference', { error: error.message });
      return false;
    }
  }
}

// Lambda handler
const localizationAgent = new LocalizationAgent();

exports.handler = async (event) => {
  logger.info('Localization Agent invoked', { 
    eventType: event.type,
    action: event.action,
    requestId: event.requestId || uuidv4()
  });

  try {
    // Initialize agent if needed
    await localizationAgent.initialize();

    // Parse event
    const { action, data } = event;

    switch (action) {
      case 'translateContent': {
        const { error } = translateContentSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await localizationAgent.translateContent(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'detectLanguage': {
        const { error } = detectLanguageSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await localizationAgent.detectLanguage(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'localizeUI': {
        const { error } = localizeUISchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await localizationAgent.localizeUI(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'getSupportedLanguages': {
        return {
          statusCode: 200,
          body: JSON.stringify({
            languages: config.localization.supportedLanguages,
            defaultLanguage: config.localization.defaultLanguage
          })
        };
      }

      case 'getUserLanguage': {
        if (!data.userId) throw new Error('userId is required');
        
        const language = await localizationAgent.getUserLanguagePreference(data.userId);
        return {
          statusCode: 200,
          body: JSON.stringify({ language })
        };
      }

      case 'setUserLanguage': {
        if (!data.userId || !data.language) {
          throw new Error('userId and language are required');
        }
        
        const success = await localizationAgent.setUserLanguagePreference(
          data.userId,
          data.language
        );
        
        return {
          statusCode: 200,
          body: JSON.stringify({ success })
        };
      }

      case 'health': {
        return {
          statusCode: 200,
          body: JSON.stringify({
            status: 'healthy',
            agent: 'localization-agent',
            version: '1.0.0',
            initialized: localizationAgent.isInitialized,
            supportedLanguages: config.localization.supportedLanguages.length,
            features: [
              'content_translation',
              'language_detection',
              'ui_localization',
              'batch_translation',
              'format_preservation'
            ]
          })
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    logger.error('Localization Agent error', { 
      error: error.message,
      stack: error.stack 
    });
    
    return {
      statusCode: error.message.includes('Validation') ? 400 : 500,
      body: JSON.stringify({
        error: error.message,
        type: 'LocalizationAgentError'
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
        --timeout 30 \
        --memory-size 512 \
        --environment Variables="{
            ENVIRONMENT='$ENVIRONMENT',
            SUPABASE_URL='$SUPABASE_URL',
            SUPABASE_SERVICE_ROLE_KEY='$SUPABASE_SERVICE_KEY',
            REDIS_URL='$REDIS_URL',
            OPENAI_API_KEY='$OPENAI_API_KEY'
        }" \
        --description "Storytailor Localization Agent - Multi-language support and translations"
    
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
    --source-arn "arn:aws:events:${AWS_REGION}:${AWS_ACCOUNT_ID}:rule/storytailor-${ENVIRONMENT}-localization-*" \
    2>/dev/null || true

# Test the function
echo -e "${BLUE}🧪 Testing Localization Agent...${NC}"
TEST_PAYLOAD='{"action":"health"}'

RESULT=$(aws lambda invoke \
    --function-name "$LAMBDA_NAME" \
    --payload "$TEST_PAYLOAD" \
    --cli-binary-format raw-in-base64-out \
    /tmp/localization-agent-test-output.json 2>&1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Test invocation successful${NC}"
    cat /tmp/localization-agent-test-output.json | jq '.'
else
    echo -e "${RED}❌ Test invocation failed${NC}"
    echo "$RESULT"
fi

# Cleanup
cd - > /dev/null
rm -rf "$DEPLOY_DIR"
rm -f /tmp/localization-agent-test-output.json

echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║              🎉 LOCALIZATION AGENT DEPLOYED! 🎉                   ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Lambda Function: ${LAMBDA_NAME}${NC}"
echo -e "${CYAN}Region: ${AWS_REGION}${NC}"
echo ""
echo -e "${GREEN}✅ Localization Agent is ready to:${NC}"
echo -e "   • Translate content into 12+ languages"
echo -e "   • Detect languages automatically"
echo -e "   • Localize UI elements in batches"
echo -e "   • Preserve formatting and cultural context"
echo -e "   • Cache translations for performance"
echo ""
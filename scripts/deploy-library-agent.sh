#!/bin/bash
# Deploy Library Agent Lambda
# Handles story management and library operations
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
LAMBDA_NAME="storytailor-library-agent-${ENVIRONMENT}"
HANDLER_FILE="index.js"

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                 📚 DEPLOYING LIBRARY AGENT 📚                     ║${NC}"
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
DEPLOY_DIR="./lambda-deployments/library-agent"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

echo -e "${BLUE}📁 Created deployment directory: $DEPLOY_DIR${NC}"

# Create package.json
cat > "$DEPLOY_DIR/package.json" << EOF
{
  "name": "storytailor-library-agent",
  "version": "1.0.0",
  "description": "Storytailor Library Agent - Story management and library operations",
  "main": "index.js",
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "redis": "^4.6.0",
    "joi": "^17.11.0",
    "winston": "^3.11.0",
    "uuid": "^9.0.1",
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
  s3: {
    bucketName: process.env.LIBRARY_BUCKET || 'storytailor-libraries',
    region: process.env.AWS_REGION || 'us-east-1'
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
const createLibrarySchema = Joi.object({
  userId: Joi.string().required(),
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  isPrivate: Joi.boolean().default(true),
  metadata: Joi.object().optional()
});

const addStorySchema = Joi.object({
  libraryId: Joi.string().required(),
  userId: Joi.string().required(),
  title: Joi.string().min(1).max(200).required(),
  content: Joi.string().required(),
  characterIds: Joi.array().items(Joi.string()).optional(),
  tags: Joi.array().items(Joi.string()).max(10).optional(),
  metadata: Joi.object().optional()
});

const searchStoriesSchema = Joi.object({
  userId: Joi.string().required(),
  query: Joi.string().optional(),
  libraryId: Joi.string().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  limit: Joi.number().min(1).max(100).default(20),
  offset: Joi.number().min(0).default(0)
});

// Services
class LibraryAgent {
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
      const { error } = await this.supabase.from('libraries').select('id').limit(1);
      if (error && !error.message.includes('does not exist')) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }
      
      // Test S3 access
      try {
        await s3.headBucket({ Bucket: config.s3.bucketName }).promise();
      } catch (s3Error) {
        logger.warn('S3 bucket not accessible', { error: s3Error.message });
      }
      
      this.isInitialized = true;
      logger.info('LibraryAgent initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize LibraryAgent', { error: error.message });
      throw error;
    }
  }

  async createLibrary(data) {
    const { userId, name, description, isPrivate, metadata } = data;
    const libraryId = uuidv4();
    
    logger.info('Creating library', { 
      libraryId, 
      userId,
      name
    });

    try {
      const library = {
        id: libraryId,
        user_id: userId,
        name,
        description: description || null,
        is_private: isPrivate,
        story_count: 0,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Store in database
      const { error: dbError } = await this.supabase
        .from('libraries')
        .insert(library);
        
      if (dbError && !dbError.message.includes('does not exist')) {
        throw dbError;
      }
      
      // Cache library data
      const cacheKey = `library:${libraryId}`;
      await this.redis.set(cacheKey, JSON.stringify(library), {
        EX: 3600 // 1 hour cache
      });
      
      // Update user's library list in cache
      const userLibrariesKey = `user_libraries:${userId}`;
      await this.redis.lPush(userLibrariesKey, libraryId);
      await this.redis.expire(userLibrariesKey, 3600);
      
      logger.info('Library created successfully', { libraryId });
      
      return {
        success: true,
        library: {
          id: libraryId,
          name,
          description,
          isPrivate,
          storyCount: 0,
          createdAt: library.created_at
        }
      };

    } catch (error) {
      logger.error('Failed to create library', { 
        libraryId, 
        error: error.message 
      });
      throw error;
    }
  }

  async addStory(data) {
    const { libraryId, userId, title, content, characterIds, tags, metadata } = data;
    const storyId = uuidv4();
    
    logger.info('Adding story to library', { 
      storyId,
      libraryId,
      userId,
      title
    });

    try {
      // Verify library ownership
      const library = await this.getLibrary(libraryId);
      if (!library || library.user_id !== userId) {
        throw new Error('Library not found or access denied');
      }
      
      const story = {
        id: storyId,
        library_id: libraryId,
        user_id: userId,
        title,
        content,
        character_ids: characterIds || [],
        tags: tags || [],
        metadata: metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Store in database
      const { error: dbError } = await this.supabase
        .from('stories')
        .insert(story);
        
      if (dbError && !dbError.message.includes('does not exist')) {
        throw dbError;
      }
      
      // Store content in S3 for backup
      try {
        const s3Key = `${userId}/libraries/${libraryId}/stories/${storyId}.json`;
        await s3.putObject({
          Bucket: config.s3.bucketName,
          Key: s3Key,
          Body: JSON.stringify(story),
          ContentType: 'application/json',
          ServerSideEncryption: 'AES256'
        }).promise();
      } catch (s3Error) {
        logger.warn('Could not backup to S3', { error: s3Error.message });
      }
      
      // Update library story count
      await this.updateLibraryCount(libraryId, 1);
      
      // Cache story
      const cacheKey = `story:${storyId}`;
      await this.redis.set(cacheKey, JSON.stringify(story), {
        EX: 3600 // 1 hour cache
      });
      
      // Add to library's story list
      const libraryStoriesKey = `library_stories:${libraryId}`;
      await this.redis.lPush(libraryStoriesKey, storyId);
      await this.redis.expire(libraryStoriesKey, 3600);
      
      logger.info('Story added successfully', { storyId, libraryId });
      
      return {
        success: true,
        story: {
          id: storyId,
          libraryId,
          title,
          characterIds,
          tags,
          createdAt: story.created_at
        }
      };

    } catch (error) {
      logger.error('Failed to add story', { 
        storyId, 
        error: error.message 
      });
      throw error;
    }
  }

  async searchStories(data) {
    const { userId, query, libraryId, tags, limit, offset } = data;
    
    logger.info('Searching stories', { 
      userId,
      query,
      libraryId,
      tags,
      limit,
      offset
    });

    try {
      let dbQuery = this.supabase
        .from('stories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (libraryId) {
        dbQuery = dbQuery.eq('library_id', libraryId);
      }
      
      if (query) {
        dbQuery = dbQuery.or(`title.ilike.%${query}%,content.ilike.%${query}%`);
      }
      
      if (tags && tags.length > 0) {
        dbQuery = dbQuery.contains('tags', tags);
      }
      
      const { data: stories, error, count } = await dbQuery;
      
      if (error && !error.message.includes('does not exist')) {
        throw error;
      }
      
      // If database query fails, try cache
      if (!stories) {
        const cachedStories = [];
        const pattern = libraryId ? `library_stories:${libraryId}` : `story:*`;
        
        if (libraryId) {
          const storyIds = await this.redis.lRange(`library_stories:${libraryId}`, 0, -1);
          for (const id of storyIds.slice(offset, offset + limit)) {
            const storyData = await this.redis.get(`story:${id}`);
            if (storyData) {
              cachedStories.push(JSON.parse(storyData));
            }
          }
        }
        
        return {
          stories: cachedStories,
          totalCount: cachedStories.length,
          hasMore: false
        };
      }
      
      logger.info('Stories found', { count: stories?.length || 0 });
      
      return {
        stories: stories || [],
        totalCount: count || stories?.length || 0,
        hasMore: (count || 0) > offset + limit
      };

    } catch (error) {
      logger.error('Failed to search stories', { 
        error: error.message 
      });
      throw error;
    }
  }

  async getLibrary(libraryId) {
    try {
      // Check cache first
      const cacheKey = `library:${libraryId}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
      
      // Query database
      const { data, error } = await this.supabase
        .from('libraries')
        .select('*')
        .eq('id', libraryId)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      // Cache result
      await this.redis.set(cacheKey, JSON.stringify(data), {
        EX: 3600
      });
      
      return data;
    } catch (error) {
      logger.error('Failed to get library', { error: error.message });
      return null;
    }
  }

  async updateLibraryCount(libraryId, increment) {
    try {
      const { error } = await this.supabase
        .from('libraries')
        .update({ 
          story_count: this.supabase.raw(`story_count + ${increment}`),
          updated_at: new Date().toISOString()
        })
        .eq('id', libraryId);
      
      if (error) {
        logger.warn('Could not update library count', { error: error.message });
      }
      
      // Invalidate cache
      await this.redis.del(`library:${libraryId}`);
    } catch (error) {
      logger.error('Failed to update library count', { error: error.message });
    }
  }

  async getUserLibraries(userId, limit = 20) {
    try {
      const { data, error } = await this.supabase
        .from('libraries')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(limit);
      
      if (error && !error.message.includes('does not exist')) {
        throw error;
      }
      
      return data || [];
    } catch (error) {
      logger.error('Failed to get user libraries', { error: error.message });
      return [];
    }
  }
}

// Lambda handler
const libraryAgent = new LibraryAgent();

exports.handler = async (event) => {
  logger.info('Library Agent invoked', { 
    eventType: event.type,
    action: event.action,
    requestId: event.requestId || uuidv4()
  });

  try {
    // Initialize agent if needed
    await libraryAgent.initialize();

    // Parse event
    const { action, data } = event;

    switch (action) {
      case 'createLibrary': {
        const { error } = createLibrarySchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await libraryAgent.createLibrary(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'addStory': {
        const { error } = addStorySchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await libraryAgent.addStory(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'searchStories': {
        const { error } = searchStoriesSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await libraryAgent.searchStories(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'getUserLibraries': {
        if (!data.userId) throw new Error('userId is required');
        
        const libraries = await libraryAgent.getUserLibraries(data.userId, data.limit);
        return {
          statusCode: 200,
          body: JSON.stringify({ libraries })
        };
      }

      case 'health': {
        return {
          statusCode: 200,
          body: JSON.stringify({
            status: 'healthy',
            agent: 'library-agent',
            version: '1.0.0',
            initialized: libraryAgent.isInitialized,
            features: [
              'library_management',
              'story_storage',
              'search_capabilities',
              's3_backup'
            ]
          })
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    logger.error('Library Agent error', { 
      error: error.message,
      stack: error.stack 
    });
    
    return {
      statusCode: error.message.includes('Validation') ? 400 : 500,
      body: JSON.stringify({
        error: error.message,
        type: 'LibraryAgentError'
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
            REDIS_URL='$REDIS_URL',
            LIBRARY_BUCKET='storytailor-libraries-$ENVIRONMENT'
        }" \
        --description "Storytailor Library Agent - Story management and library operations"
    
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
            LIBRARY_BUCKET='storytailor-libraries-$ENVIRONMENT'
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
    --source-arn "arn:aws:events:${AWS_REGION}:${AWS_ACCOUNT_ID}:rule/storytailor-${ENVIRONMENT}-library-*" \
    2>/dev/null || true

# Test the function
echo -e "${BLUE}🧪 Testing Library Agent...${NC}"
TEST_PAYLOAD='{"action":"health"}'

RESULT=$(aws lambda invoke \
    --function-name "$LAMBDA_NAME" \
    --payload "$TEST_PAYLOAD" \
    --cli-binary-format raw-in-base64-out \
    /tmp/library-agent-test-output.json 2>&1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Test invocation successful${NC}"
    cat /tmp/library-agent-test-output.json | jq '.'
else
    echo -e "${RED}❌ Test invocation failed${NC}"
    echo "$RESULT"
fi

# Cleanup
cd - > /dev/null
rm -rf "$DEPLOY_DIR"
rm -f /tmp/library-agent-test-output.json

echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                🎉 LIBRARY AGENT DEPLOYED! 🎉                      ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Lambda Function: ${LAMBDA_NAME}${NC}"
echo -e "${CYAN}Region: ${AWS_REGION}${NC}"
echo ""
echo -e "${GREEN}✅ Library Agent is ready to:${NC}"
echo -e "   • Create and manage user libraries"
echo -e "   • Store and retrieve stories"
echo -e "   • Search stories by tags and content"
echo -e "   • Backup stories to S3"
echo ""
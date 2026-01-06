#!/bin/bash
# Deploy Educational Agent Lambda
# Handles educational content generation and learning experiences
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
LAMBDA_NAME="storytailor-educational-agent-${ENVIRONMENT}"
HANDLER_FILE="index.js"

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║              🎓 DEPLOYING EDUCATIONAL AGENT 🎓                    ║${NC}"
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
DEPLOY_DIR="./lambda-deployments/educational-agent"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

echo -e "${BLUE}📁 Created deployment directory: $DEPLOY_DIR${NC}"

# Create package.json
cat > "$DEPLOY_DIR/package.json" << EOF
{
  "name": "storytailor-educational-agent",
  "version": "1.0.0",
  "description": "Storytailor Educational Agent - Educational content and learning experiences",
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
  educational: {
    maxLessonLength: 2000,
    cacheTTL: 86400, // 24 hours
    ageGroups: {
      'preschool': { min: 3, max: 5 },
      'elementary': { min: 6, max: 11 },
      'middle': { min: 12, max: 14 },
      'high': { min: 15, max: 18 }
    }
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
const generateLessonSchema = Joi.object({
  userId: Joi.string().required(),
  topic: Joi.string().min(1).max(200).required(),
  ageGroup: Joi.string().valid('preschool', 'elementary', 'middle', 'high').required(),
  learningObjectives: Joi.array().items(Joi.string()).max(5).optional(),
  duration: Joi.number().min(5).max(60).default(15), // minutes
  includeActivities: Joi.boolean().default(true),
  metadata: Joi.object().optional()
});

const assessProgressSchema = Joi.object({
  userId: Joi.string().required(),
  lessonId: Joi.string().required(),
  responses: Joi.array().items(Joi.object({
    questionId: Joi.string().required(),
    answer: Joi.string().required(),
    timeSpent: Joi.number().optional()
  })).required()
});

const recommendNextSchema = Joi.object({
  userId: Joi.string().required(),
  completedTopics: Joi.array().items(Joi.string()).optional(),
  interests: Joi.array().items(Joi.string()).optional(),
  ageGroup: Joi.string().valid('preschool', 'elementary', 'middle', 'high').required()
});

// Services
class EducationalAgent {
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
      const { error } = await this.supabase.from('educational_content').select('id').limit(1);
      if (error && !error.message.includes('does not exist')) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }
      
      this.isInitialized = true;
      logger.info('EducationalAgent initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize EducationalAgent', { error: error.message });
      throw error;
    }
  }

  async generateLesson(data) {
    const { userId, topic, ageGroup, learningObjectives, duration, includeActivities, metadata } = data;
    const lessonId = uuidv4();
    
    logger.info('Generating educational lesson', { 
      lessonId, 
      userId,
      topic,
      ageGroup
    });

    try {
      // Check cache first
      const cacheKey = `lesson:${topic}:${ageGroup}:${duration}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        logger.info('Returning cached lesson', { lessonId });
        const cachedLesson = JSON.parse(cached);
        cachedLesson.id = lessonId;
        return cachedLesson;
      }

      // Generate lesson content with OpenAI
      const ageRange = config.educational.ageGroups[ageGroup];
      const objectives = learningObjectives?.join(', ') || 'general learning';
      
      const prompt = `Create an educational lesson for ${ageGroup} students (ages ${ageRange.min}-${ageRange.max}) about "${topic}".
        Duration: ${duration} minutes
        Learning objectives: ${objectives}
        
        Include:
        1. Introduction (engaging hook)
        2. Main content (age-appropriate explanation)
        3. Key vocabulary with definitions
        4. ${includeActivities ? '2-3 interactive activities' : 'Summary points'}
        5. Assessment questions (3-5 questions)
        
        Make it engaging, age-appropriate, and educational. Use Story Intelligence™ principles.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert educational content creator specializing in age-appropriate learning experiences.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const lessonContent = completion.choices[0].message.content;

      // Parse lesson structure
      const lesson = {
        id: lessonId,
        userId,
        topic,
        ageGroup,
        duration,
        content: lessonContent,
        learningObjectives: learningObjectives || [],
        includeActivities,
        generatedAt: new Date().toISOString(),
        metadata: metadata || {}
      };

      // Extract vocabulary
      lesson.vocabulary = this.extractVocabulary(lessonContent);

      // Generate assessment
      lesson.assessment = await this.generateAssessment(topic, ageGroup, lessonContent);

      // Store in database
      const { error: dbError } = await this.supabase
        .from('educational_content')
        .insert({
          ...lesson,
          type: 'lesson'
        });
        
      if (dbError && !dbError.message.includes('does not exist')) {
        logger.warn('Could not store lesson in database', { error: dbError.message });
      }

      // Cache the lesson
      await this.redis.set(cacheKey, JSON.stringify(lesson), {
        EX: config.educational.cacheTTL
      });

      // Track user progress
      await this.updateUserProgress(userId, 'lesson_generated', { topic, ageGroup });

      logger.info('Educational lesson generated successfully', { lessonId });

      return {
        success: true,
        lesson: {
          id: lessonId,
          topic,
          ageGroup,
          duration,
          content: lessonContent,
          vocabulary: lesson.vocabulary,
          assessment: lesson.assessment,
          learningObjectives
        }
      };

    } catch (error) {
      logger.error('Failed to generate lesson', { 
        lessonId, 
        error: error.message 
      });
      throw error;
    }
  }

  extractVocabulary(content) {
    const vocabPattern = /vocabulary:|key terms:|important words:/i;
    const vocabSection = content.split(vocabPattern)[1];
    
    if (!vocabSection) return [];
    
    const words = [];
    const lines = vocabSection.split('\n').slice(0, 10);
    
    for (const line of lines) {
      const match = line.match(/^[\s-]*([^:]+):\s*(.+)$/);
      if (match) {
        words.push({
          term: match[1].trim(),
          definition: match[2].trim()
        });
      }
    }
    
    return words;
  }

  async generateAssessment(topic, ageGroup, content) {
    try {
      const prompt = `Based on this lesson about "${topic}" for ${ageGroup} students, create 3-5 assessment questions.
        
        Lesson content: ${content.substring(0, 1000)}...
        
        Format each question as:
        Q: [Question]
        A: [Correct answer]
        Options: [For multiple choice, provide 4 options]`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an educational assessment expert.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 500
      });

      const assessmentText = completion.choices[0].message.content;
      return this.parseAssessment(assessmentText);

    } catch (error) {
      logger.error('Failed to generate assessment', { error: error.message });
      return [];
    }
  }

  parseAssessment(text) {
    const questions = [];
    const questionBlocks = text.split(/Q:\s*/i).filter(block => block.trim());
    
    for (const block of questionBlocks) {
      const lines = block.split('\n');
      const question = lines[0].trim();
      
      const answerMatch = block.match(/A:\s*(.+)/i);
      const answer = answerMatch ? answerMatch[1].trim() : '';
      
      const optionsMatch = block.match(/Options:\s*(.+)/i);
      const options = optionsMatch ? 
        optionsMatch[1].split(',').map(opt => opt.trim()) : [];
      
      if (question && answer) {
        questions.push({
          id: uuidv4(),
          question,
          answer,
          options: options.length > 0 ? options : undefined,
          type: options.length > 0 ? 'multiple-choice' : 'open-ended'
        });
      }
    }
    
    return questions;
  }

  async assessProgress(data) {
    const { userId, lessonId, responses } = data;
    const assessmentId = uuidv4();
    
    logger.info('Assessing user progress', { 
      assessmentId,
      userId,
      lessonId,
      responseCount: responses.length
    });

    try {
      // Get lesson details
      const { data: lesson } = await this.supabase
        .from('educational_content')
        .select('*')
        .eq('id', lessonId)
        .single();

      if (!lesson) {
        throw new Error('Lesson not found');
      }

      // Score responses
      let correctCount = 0;
      const scoredResponses = [];
      
      for (const response of responses) {
        const question = lesson.assessment?.find(q => q.id === response.questionId);
        if (question) {
          const isCorrect = this.checkAnswer(response.answer, question.answer);
          correctCount += isCorrect ? 1 : 0;
          
          scoredResponses.push({
            ...response,
            isCorrect,
            correctAnswer: question.answer
          });
        }
      }

      const score = Math.round((correctCount / responses.length) * 100);
      const passed = score >= 70;

      // Store assessment result
      const assessmentResult = {
        id: assessmentId,
        user_id: userId,
        lesson_id: lessonId,
        responses: scoredResponses,
        score,
        passed,
        completed_at: new Date().toISOString()
      };

      await this.supabase
        .from('assessment_results')
        .insert(assessmentResult);

      // Update user progress
      await this.updateUserProgress(userId, 'assessment_completed', {
        lessonId,
        topic: lesson.topic,
        score,
        passed
      });

      // Generate feedback
      const feedback = await this.generateFeedback(lesson.topic, score, scoredResponses);

      logger.info('Assessment completed', { assessmentId, score, passed });

      return {
        success: true,
        assessment: {
          id: assessmentId,
          score,
          passed,
          correctCount,
          totalQuestions: responses.length,
          feedback
        }
      };

    } catch (error) {
      logger.error('Failed to assess progress', { 
        assessmentId, 
        error: error.message 
      });
      throw error;
    }
  }

  checkAnswer(userAnswer, correctAnswer) {
    const normalize = (str) => str.toLowerCase().trim().replace(/[^\w\s]/gi, '');
    return normalize(userAnswer) === normalize(correctAnswer);
  }

  async generateFeedback(topic, score, responses) {
    if (score >= 90) {
      return `Excellent work! You've mastered the concepts about ${topic}. Ready for the next challenge?`;
    } else if (score >= 70) {
      return `Good job! You understand ${topic} well. Review the missed questions to strengthen your knowledge.`;
    } else {
      return `Keep trying! ${topic} can be challenging. Let's review the material together and try again.`;
    }
  }

  async recommendNext(data) {
    const { userId, completedTopics, interests, ageGroup } = data;
    
    logger.info('Generating recommendations', { 
      userId,
      ageGroup,
      completedCount: completedTopics?.length || 0
    });

    try {
      // Get user's learning history
      const { data: history } = await this.supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      // Analyze performance and interests
      const recommendations = await this.analyzeAndRecommend(
        history || [],
        completedTopics || [],
        interests || [],
        ageGroup
      );

      logger.info('Recommendations generated', { 
        userId,
        recommendationCount: recommendations.length
      });

      return {
        success: true,
        recommendations
      };

    } catch (error) {
      logger.error('Failed to generate recommendations', { 
        error: error.message 
      });
      throw error;
    }
  }

  async analyzeAndRecommend(history, completed, interests, ageGroup) {
    const recommendations = [];
    
    // Core subjects by age group
    const coreSubjects = {
      preschool: ['Colors', 'Shapes', 'Numbers', 'Letters', 'Animals'],
      elementary: ['Math Basics', 'Reading', 'Science', 'History', 'Geography'],
      middle: ['Algebra', 'Literature', 'Biology', 'World History', 'Earth Science'],
      high: ['Advanced Math', 'Chemistry', 'Physics', 'Literature Analysis', 'Social Studies']
    };

    // Get subjects for age group
    const subjects = coreSubjects[ageGroup] || coreSubjects.elementary;
    
    // Filter out completed topics
    const available = subjects.filter(s => !completed.includes(s));
    
    // Add interest-based recommendations
    for (const interest of interests) {
      if (!completed.includes(interest)) {
        recommendations.push({
          topic: interest,
          reason: 'Based on your interests',
          difficulty: 'adaptive',
          estimatedDuration: 20
        });
      }
    }

    // Add core subject recommendations
    for (const subject of available.slice(0, 3)) {
      recommendations.push({
        topic: subject,
        reason: 'Core curriculum',
        difficulty: ageGroup,
        estimatedDuration: 15
      });
    }

    return recommendations;
  }

  async updateUserProgress(userId, action, data) {
    try {
      const progress = {
        id: uuidv4(),
        user_id: userId,
        action,
        data,
        created_at: new Date().toISOString()
      };

      await this.supabase
        .from('user_progress')
        .insert(progress);

      // Update cache
      const cacheKey = `user_progress:${userId}`;
      await this.redis.lPush(cacheKey, JSON.stringify(progress));
      await this.redis.lTrim(cacheKey, 0, 99); // Keep last 100 entries
      await this.redis.expire(cacheKey, 86400);

    } catch (error) {
      logger.error('Failed to update user progress', { error: error.message });
    }
  }
}

// Lambda handler
const educationalAgent = new EducationalAgent();

exports.handler = async (event) => {
  logger.info('Educational Agent invoked', { 
    eventType: event.type,
    action: event.action,
    requestId: event.requestId || uuidv4()
  });

  try {
    // Initialize agent if needed
    await educationalAgent.initialize();

    // Parse event
    const { action, data } = event;

    switch (action) {
      case 'generateLesson': {
        const { error } = generateLessonSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await educationalAgent.generateLesson(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'assessProgress': {
        const { error } = assessProgressSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await educationalAgent.assessProgress(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'recommendNext': {
        const { error } = recommendNextSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await educationalAgent.recommendNext(data);
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
            agent: 'educational-agent',
            version: '1.0.0',
            initialized: educationalAgent.isInitialized,
            features: [
              'lesson_generation',
              'vocabulary_extraction',
              'assessment_creation',
              'progress_tracking',
              'recommendations'
            ]
          })
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    logger.error('Educational Agent error', { 
      error: error.message,
      stack: error.stack 
    });
    
    return {
      statusCode: error.message.includes('Validation') ? 400 : 500,
      body: JSON.stringify({
        error: error.message,
        type: 'EducationalAgentError'
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
        --description "Storytailor Educational Agent - Educational content and learning experiences"
    
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
    --source-arn "arn:aws:events:${AWS_REGION}:${AWS_ACCOUNT_ID}:rule/storytailor-${ENVIRONMENT}-educational-*" \
    2>/dev/null || true

# Test the function
echo -e "${BLUE}🧪 Testing Educational Agent...${NC}"
TEST_PAYLOAD='{"action":"health"}'

RESULT=$(aws lambda invoke \
    --function-name "$LAMBDA_NAME" \
    --payload "$TEST_PAYLOAD" \
    --cli-binary-format raw-in-base64-out \
    /tmp/educational-agent-test-output.json 2>&1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Test invocation successful${NC}"
    cat /tmp/educational-agent-test-output.json | jq '.'
else
    echo -e "${RED}❌ Test invocation failed${NC}"
    echo "$RESULT"
fi

# Cleanup
cd - > /dev/null
rm -rf "$DEPLOY_DIR"
rm -f /tmp/educational-agent-test-output.json

echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║              🎉 EDUCATIONAL AGENT DEPLOYED! 🎉                    ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Lambda Function: ${LAMBDA_NAME}${NC}"
echo -e "${CYAN}Region: ${AWS_REGION}${NC}"
echo ""
echo -e "${GREEN}✅ Educational Agent is ready to:${NC}"
echo -e "   • Generate age-appropriate lessons"
echo -e "   • Create vocabulary and assessments"
echo -e "   • Track learning progress"
echo -e "   • Recommend next topics"
echo ""
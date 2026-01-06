#!/bin/bash
# Deploy Knowledge Base Agent to AWS Lambda
set -e

echo "🧠 Deploying Knowledge Base Agent"
echo "=================================="

ENVIRONMENT=${1:-staging}
FUNCTION_NAME="storytailor-knowledge-base-${ENVIRONMENT}"

# Create temporary directory
TEMP_DIR=$(mktemp -d)
echo "Working directory: $TEMP_DIR"

# Create package.json with Knowledge Base Agent dependencies
cat > "$TEMP_DIR/package.json" << EOF
{
  "name": "storytailor-knowledge-base-agent",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "jsonwebtoken": "^9.0.2",
    "joi": "^17.11.0",
    "winston": "^3.8.0",
    "zod": "^3.20.0"
  }
}
EOF

# Create Knowledge Base Agent Lambda function
cat > "$TEMP_DIR/index.js" << 'EOF'
const { createClient } = require('@supabase/supabase-js');
const Joi = require('joi');
const winston = require('winston');

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
});

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Knowledge Base Agent Implementation
class KnowledgeBaseAgent {
  constructor() {
    this.storyIntelligenceKB = this.initializeStoryIntelligenceKB();
    this.platformKB = this.initializePlatformKB();
    this.config = {
      confidenceThreshold: 0.7,
      maxRelatedQuestions: 5,
      enableAutoEscalation: true,
      supportContactInfo: {
        email: 'support@storytailor.com',
        chatUrl: 'https://storytailor.com/chat'
      }
    };
  }

  initializeStoryIntelligenceKB() {
    return new Map([
      ['brand_overview', {
        concept: 'Story Intelligence™',
        explanation: 'Story Intelligence™ is the revolutionary technology created by Storytailor Inc that enables award-caliber personal storytelling. Like OpenAI licenses GPT to power other platforms, Storytailor Inc will eventually license Story Intelligence to empower storytelling across industries.',
        examples: [
          'Award-caliber stories created just for your family',
          'Cinema-quality narratives that remain private treasures',
          'Gallery-worthy art generated for personal family albums'
        ],
        benefits: [
          'Stories so beautiful they could theoretically win awards',
          'Art quality that could hang in museums (but stays in family albums)',
          'Creates entirely new family experiences through story creation'
        ],
        differentiators: [
          'Not "AI-powered" - powered by Story Intelligence™',
          'Creates new category alongside books and traditional publishing',
          'Focuses on story creation + off-screen activities'
        ]
      }],
      ['si_vs_ai', {
        concept: 'Story Intelligence vs AI',
        explanation: 'Story Intelligence™ is specialized narrative intelligence, not generic AI. We say "SI Powered" not "AI-powered" because it\'s narrative-specific.',
        examples: [
          'SI Powered storytelling (not AI-powered)',
          'Powered by Story Intelligence™',
          'Revolutionary SI technology creates cinema-quality family stories'
        ],
        benefits: [
          'More precise and meaningful than generic "AI" terminology',
          'Establishes Storytailor as category creator',
          'Emphasizes narrative specialization over general automation'
        ],
        differentiators: [
          'Story Intelligence™ is narrative-specific, not general AI',
          'Focuses on emotional intelligence and family bonding',
          'Created specifically for personal storytelling excellence'
        ]
      }]
    ]);
  }

  initializePlatformKB() {
    return new Map([
      ['what_is_storytailor', {
        question: 'What is Storytailor?',
        answer: 'Storytailor® is a revolutionary platform powered by Story Intelligence™ that creates award-caliber personal stories for families. Unlike traditional books, we create stories through conversation that generate real-world family activities and memories.',
        category: 'general',
        confidence: 0.95
      }],
      ['how_does_it_work', {
        question: 'How does Storytailor work?',
        answer: 'You have natural conversations with our Story Intelligence™ system to create characters and stories. The system uses advanced narrative understanding to craft award-caliber stories that adapt to your child\'s age and interests.',
        category: 'platform_usage',
        confidence: 0.9
      }],
      ['is_safe_for_children', {
        question: 'Is this safe for my child?',
        answer: 'Yes! Storytailor is COPPA/GDPR compliant with advanced privacy protection. All stories remain private to your family, content is age-appropriate and positive, and we use military-grade encryption.',
        category: 'safety',
        confidence: 0.95
      }]
    ]);
  }

  shouldHandleQuery(query) {
    const normalizedQuery = query.toLowerCase();
    const knowledgeKeywords = [
      'help', 'how', 'what', 'why', 'explain', 'guide',
      'faq', 'question', 'support', 'problem', 'issue',
      'story intelligence', 'storytailor', 'features',
      'account', 'library', 'character', 'privacy'
    ];

    const questionPatterns = [
      /^(what|how|why|when|where|can|will|do|does|is|are)/i,
      /\?$/,
      /help.*with/i,
      /tell me about/i
    ];

    const hasKnowledgeKeyword = knowledgeKeywords.some(keyword => 
      normalizedQuery.includes(keyword)
    );

    const isQuestion = questionPatterns.some(pattern => 
      pattern.test(normalizedQuery)
    );

    return hasKnowledgeKeyword || isQuestion;
  }

  async handleQuery(query) {
    try {
      logger.info('Processing knowledge query', { query: query.query });

      // Try Story Intelligence knowledge base first
      let response = this.queryStoryIntelligence(query);
      
      // If no SI match, try platform knowledge base
      if (!response) {
        response = this.queryPlatform(query);
      }

      // If still no match, generate fallback
      if (!response || response.confidence < this.config.confidenceThreshold) {
        if (this.config.enableAutoEscalation) {
          await this.escalateToSupport(query);
        }
        response = this.generateFallbackResponse(query);
      }

      // Log the query for analytics
      await this.logQuery(query, response);

      return response;

    } catch (error) {
      logger.error('Error processing knowledge query', { error: error.message, query: query.query });
      return this.generateErrorResponse(query);
    }
  }

  queryStoryIntelligence(query) {
    const normalizedQuery = query.query.toLowerCase();
    
    if (normalizedQuery.includes('story intelligence') || normalizedQuery.includes('what is storytailor')) {
      const knowledge = this.storyIntelligenceKB.get('brand_overview');
      return this.formatStoryIntelligenceResponse(knowledge, query);
    }
    
    if (normalizedQuery.includes('vs ai') || normalizedQuery.includes('ai powered')) {
      const knowledge = this.storyIntelligenceKB.get('si_vs_ai');
      return this.formatStoryIntelligenceResponse(knowledge, query);
    }

    return null;
  }

  queryPlatform(query) {
    const normalizedQuery = query.query.toLowerCase();
    
    for (const [key, faq] of this.platformKB) {
      if (this.queryMatchesFAQ(normalizedQuery, faq)) {
        return {
          id: `kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          query: query.query,
          answer: faq.answer,
          category: faq.category,
          confidence: faq.confidence,
          sources: [{
            type: 'faq',
            title: faq.question,
            excerpt: faq.answer.substring(0, 150) + '...'
          }],
          relatedQuestions: this.getRelatedQuestions(faq.category),
          poweredBy: 'Story Intelligence™',
          timestamp: new Date().toISOString()
        };
      }
    }
    
    return null;
  }

  formatStoryIntelligenceResponse(knowledge, query) {
    let answer = `**${knowledge.concept}**\n\n${knowledge.explanation}\n\n`;
    
    if (knowledge.examples && knowledge.examples.length > 0) {
      answer += `**Examples:**\n${knowledge.examples.map(ex => `• ${ex}`).join('\n')}\n\n`;
    }
    
    if (knowledge.benefits && knowledge.benefits.length > 0) {
      answer += `**Benefits:**\n${knowledge.benefits.map(benefit => `• ${benefit}`).join('\n')}\n\n`;
    }
    
    if (knowledge.differentiators && knowledge.differentiators.length > 0) {
      answer += `**What Makes This Special:**\n${knowledge.differentiators.map(diff => `• ${diff}`).join('\n')}`;
    }

    return {
      id: `si_kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      query: query.query,
      answer,
      category: 'story_intelligence',
      confidence: 0.95,
      sources: [{
        type: 'documentation',
        title: 'Story Intelligence™ Brand Guide',
        excerpt: knowledge.explanation
      }],
      relatedQuestions: [
        'How is Story Intelligence different from AI?',
        'What makes Storytailor stories award-caliber?',
        'How does the new category work?'
      ],
      poweredBy: 'Story Intelligence™',
      timestamp: new Date().toISOString()
    };
  }

  queryMatchesFAQ(query, faq) {
    const searchText = `${faq.question} ${faq.answer}`.toLowerCase();
    const queryWords = query.split(' ').filter(word => word.length > 2);
    return queryWords.some(word => searchText.includes(word));
  }

  getRelatedQuestions(category) {
    const questionSets = {
      general: [
        'How do I create my first story?',
        'What age groups are supported?',
        'Is this safe for children?'
      ],
      platform_usage: [
        'What is Story Intelligence?',
        'How does character creation work?',
        'Can I save my stories?'
      ],
      safety: [
        'How is privacy protected?',
        'What is COPPA compliance?',
        'Is content age-appropriate?'
      ]
    };

    return questionSets[category] || [];
  }

  generateFallbackResponse(query) {
    return {
      id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      query: query.query,
      answer: `I'd be happy to help! While I don't have a specific answer for that question, here are some ways to get help:

• **Try asking differently** - I understand questions about Story Intelligence™, platform features, and account management
• **Contact our support team** at ${this.config.supportContactInfo.email}
• **Start creating a story** - often the best way to learn is by trying!

Remember, Storytailor® is powered by Story Intelligence™ to create award-caliber personal stories for your family.`,
      category: 'support',
      confidence: 0.5,
      sources: [],
      relatedQuestions: [
        'What is Story Intelligence?',
        'How do I create my first story?',
        'What makes Storytailor different?'
      ],
      poweredBy: 'Story Intelligence™',
      timestamp: new Date().toISOString()
    };
  }

  generateErrorResponse(query) {
    return {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      query: query.query,
      answer: 'I encountered an issue processing your question. Please try asking again or contact our support team for assistance.',
      category: 'error',
      confidence: 0.1,
      sources: [],
      relatedQuestions: [],
      poweredBy: 'Story Intelligence™',
      timestamp: new Date().toISOString()
    };
  }

  async logQuery(query, response) {
    try {
      await supabase.rpc('log_knowledge_query', {
        p_user_id: query.userId || null,
        p_session_id: query.context?.sessionId || 'unknown',
        p_query_text: query.query,
        p_category: response.category,
        p_confidence_score: response.confidence,
        p_response_type: response.category === 'error' ? 'fallback' : 'knowledge_base',
        p_response_id: response.id
      });
    } catch (error) {
      logger.error('Failed to log knowledge query', { error: error.message });
    }
  }

  async escalateToSupport(query) {
    try {
      logger.info('Escalating query to support', { query: query.query });
      // Additional escalation logic would go here
    } catch (error) {
      logger.error('Failed to escalate to support', { error: error.message });
    }
  }
}

// Validation schemas
const knowledgeQuerySchema = Joi.object({
  query: Joi.string().min(1).max(500).required(),
  category: Joi.string().valid('platform_usage', 'story_creation', 'account_management', 'troubleshooting', 'features', 'general').optional(),
  userId: Joi.string().uuid().optional(),
  context: Joi.object({
    sessionId: Joi.string().optional(),
    userType: Joi.string().valid('child', 'parent', 'teacher', 'organization_admin').optional(),
    currentPage: Joi.string().optional()
  }).optional()
});

// Initialize Knowledge Base Agent
const knowledgeAgent = new KnowledgeBaseAgent();

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight successful' })
    };
  }

  try {
    const path = event.path || event.rawPath || '';
    const method = event.httpMethod || event.requestContext?.http?.method || 'GET';

    logger.info('Processing request', { path, method });

    // Health check endpoint
    if (path === '/health' && method === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          status: 'healthy', 
          service: 'Knowledge Base Agent',
          poweredBy: 'Story Intelligence™',
          timestamp: new Date().toISOString()
        })
      };
    }

    // Knowledge query endpoint
    if (path === '/knowledge/query' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      
      // Validate request
      const { error, value } = knowledgeQuerySchema.validate(body);
      if (error) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Validation Error',
            details: error.details[0].message,
            poweredBy: 'Story Intelligence™'
          })
        };
      }

      // Check if this should be handled by knowledge base
      if (!knowledgeAgent.shouldHandleQuery(value.query)) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            handled: false,
            message: 'Query should be handled by other agents',
            poweredBy: 'Story Intelligence™'
          })
        };
      }

      // Process knowledge query
      const response = await knowledgeAgent.handleQuery(value);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          handled: true,
          response,
          poweredBy: 'Story Intelligence™'
        })
      };
    }

    // Default 404 for unknown endpoints
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Endpoint not found',
        poweredBy: 'Story Intelligence™'
      })
    };

  } catch (error) {
    logger.error('Lambda function error', { error: error.message, stack: error.stack });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        poweredBy: 'Story Intelligence™'
      })
    };
  }
};
EOF

echo "📦 Installing dependencies..."
cd "$TEMP_DIR"
npm install --production

echo "🗜️ Creating deployment package..."
zip -r function.zip . -x "*.DS_Store*" "*.git*"

echo "☁️ Deploying to AWS Lambda..."

# Check if function exists
if aws lambda get-function --function-name "$FUNCTION_NAME" >/dev/null 2>&1; then
  echo "📝 Updating existing function..."
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file fileb://function.zip
else
  echo "🆕 Creating new function..."
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime nodejs18.x \
    --role "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/storytailor-lambda-role-${ENVIRONMENT}" \
    --handler index.handler \
    --zip-file fileb://function.zip \
    --timeout 30 \
    --memory-size 512 \
    --environment Variables="{
      SUPABASE_URL=$SUPABASE_URL,
      SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY,
      JWT_SECRET=$JWT_SECRET
    }" \
    --description "Storytailor Knowledge Base Agent - Powered by Story Intelligence™"
fi

echo "🔧 Updating function configuration..."
aws lambda update-function-configuration \
  --function-name "$FUNCTION_NAME" \
  --environment Variables="{
    SUPABASE_URL=$SUPABASE_URL,
    SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY,
    JWT_SECRET=$JWT_SECRET
  }"

# Create or update API Gateway integration
echo "🌐 Setting up API Gateway..."

# Get API Gateway ID (assuming it exists from previous deployments)
API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='storytailor-api'].ApiId" --output text)

if [ "$API_ID" != "None" ] && [ -n "$API_ID" ]; then
  echo "🔗 Adding routes to existing API Gateway: $API_ID"
  
  # Create integration
  INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id "$API_ID" \
    --integration-type AWS_PROXY \
    --integration-uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:$(aws sts get-caller-identity --query Account --output text):function:$FUNCTION_NAME/invocations" \
    --payload-format-version "2.0" \
    --query IntegrationId --output text)
  
  # Create routes
  aws apigatewayv2 create-route \
    --api-id "$API_ID" \
    --route-key "GET /knowledge/health" \
    --target "integrations/$INTEGRATION_ID"
    
  aws apigatewayv2 create-route \
    --api-id "$API_ID" \
    --route-key "POST /knowledge/query" \
    --target "integrations/$INTEGRATION_ID"
    
  aws apigatewayv2 create-route \
    --api-id "$API_ID" \
    --route-key "OPTIONS /knowledge/{proxy+}" \
    --target "integrations/$INTEGRATION_ID"
  
  # Give API Gateway permission to invoke Lambda
  aws lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id "apigateway-invoke-knowledge-base" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:us-east-1:$(aws sts get-caller-identity --query Account --output text):$API_ID/*/*" \
    2>/dev/null || echo "Permission already exists"
  
  echo "📡 API Gateway routes created for Knowledge Base Agent"
else
  echo "⚠️ API Gateway not found. Knowledge Base Agent deployed but not accessible via API Gateway."
fi

echo "🧪 Testing deployment..."
aws lambda invoke \
  --function-name "$FUNCTION_NAME" \
  --payload '{"httpMethod":"GET","path":"/health"}' \
  response.json

if grep -q "healthy" response.json; then
  echo "✅ Knowledge Base Agent deployment successful!"
  echo "🔗 Function ARN: $(aws lambda get-function --function-name $FUNCTION_NAME --query Configuration.FunctionArn --output text)"
  if [ -n "$API_ID" ]; then
    echo "🌐 API Endpoint: https://$API_ID.execute-api.us-east-1.amazonaws.com/staging/knowledge/query"
  fi
else
  echo "❌ Deployment test failed"
  cat response.json
  exit 1
fi

# Cleanup
rm -rf "$TEMP_DIR"
echo "🧹 Cleanup completed"

echo ""
echo "🎉 Knowledge Base Agent deployed successfully!"
echo "   Powered by Story Intelligence™"
echo ""
echo "Test with:"
echo "curl -X POST https://$API_ID.execute-api.us-east-1.amazonaws.com/staging/knowledge/query \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"query\": \"What is Story Intelligence?\"}'"
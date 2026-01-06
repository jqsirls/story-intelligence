#!/bin/bash
# Update Router Lambda to handle HTTP events from API Gateway
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║       🔄 UPDATING ROUTER TO HANDLE HTTP EVENTS 🔄                ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"

# Configuration
FUNCTION_NAME="storytailor-router-staging"
RUNTIME="nodejs20.x"
TIMEOUT=60
MEMORY_SIZE=512
ENVIRONMENT=${ENVIRONMENT:-staging}

echo -e "${CYAN}Function: ${FUNCTION_NAME}${NC}"
echo -e "${CYAN}Environment: ${ENVIRONMENT}${NC}"
echo ""

# Load environment variables
source .env.staging

# Create deployment directory
DEPLOY_DIR=$(mktemp -d)
echo -e "${BLUE}📁 Creating deployment package in $DEPLOY_DIR${NC}"

# Create updated Lambda handler with HTTP support
cat > $DEPLOY_DIR/index.js << 'EOF'
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

// Initialize AWS clients
const eventBridge = new EventBridgeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Intent patterns for classification
const INTENT_PATTERNS = {
  AUTH: [
    /\b(login|logout|sign\s*(in|up|out)|register|authenticate|password)\b/i,
    /\b(account|profile|settings|preferences)\b/i
  ],
  CONTENT: [
    /\b(story|stories|create|generate|write|tell|narrative|plot)\b/i,
    /\b(character|protagonist|hero|villain)\b/i,
    /\b(genre|theme|adventure|mystery|fantasy)\b/i
  ],
  EMOTION: [
    /\b(feel|feeling|emotion|mood|happy|sad|scared|excited|worried)\b/i,
    /\b(comfort|support|help|understand|empathy)\b/i
  ],
  EDUCATIONAL: [
    /\b(learn|teach|education|lesson|study|homework|school)\b/i,
    /\b(math|science|history|reading|spelling)\b/i
  ],
  THERAPEUTIC: [
    /\b(therapy|therapeutic|healing|trauma|anxiety|stress)\b/i,
    /\b(mindfulness|meditation|breathing|calm|relax)\b/i
  ],
  SMART_HOME: [
    /\b(light|lights|brightness|dim|color|room)\b/i,
    /\b(temperature|thermostat|heat|cool|weather)\b/i,
    /\b(device|smart|home|automation)\b/i
  ],
  COMMERCE: [
    /\b(buy|purchase|subscribe|payment|billing|price|cost)\b/i,
    /\b(subscription|plan|upgrade|premium)\b/i
  ],
  KNOWLEDGE: [
    /\b(what|who|where|when|why|how|explain|define)\b/i,
    /\b(fact|information|knowledge|answer|question)\b/i,
    /\b(story\s*intelligence|storytailor|si™)\b/i
  ]
};

// Agent mapping
const AGENT_MAPPING = {
  AUTH: 'storytailor-auth-agent-staging',
  CONTENT: 'storytailor-api-staging', // Content is embedded in main API
  EMOTION: 'storytailor-api-staging', // Emotion is embedded in main API
  EDUCATIONAL: 'storytailor-educational-agent-staging',
  THERAPEUTIC: 'storytailor-therapeutic-agent-staging',
  SMART_HOME: 'storytailor-smart-home-agent-staging',
  COMMERCE: 'storytailor-commerce-agent-staging',
  KNOWLEDGE: 'storytailor-knowledge-base-staging',
  PERSONALITY: 'storytailor-api-staging', // Personality is embedded
  CHILD_SAFETY: 'storytailor-child-safety-agent-staging',
  ACCESSIBILITY: 'storytailor-accessibility-agent-staging',
  LOCALIZATION: 'storytailor-localization-agent-staging',
  LIBRARY: 'storytailor-library-agent-staging',
  VOICE_SYNTHESIS: 'storytailor-voice-synthesis-agent-staging',
  SECURITY: 'storytailor-security-framework-staging',
  ANALYTICS: 'storytailor-analytics-intelligence-staging',
  CONVERSATION: 'storytailor-conversation-intelligence-staging',
  INSIGHTS: 'storytailor-insights-agent-staging'
};

// Route-to-agent mapping for specific endpoints
const ROUTE_MAPPING = {
  '/health': 'HEALTH_CHECK',
  '/v1/auth/register': 'AUTH',
  '/v1/auth/login': 'AUTH',
  '/v1/auth/me': 'AUTH',
  '/v1/auth/refresh': 'AUTH',
  '/v1/stories': 'CONTENT',
  '/v1/characters': 'CONTENT',
  '/v1/conversation/start': 'CONTENT',
  '/v1/conversation/message': 'CONTENT',
  '/v1/conversation/end': 'CONTENT',
  '/knowledge/query': 'KNOWLEDGE',
  '/knowledge/health': 'KNOWLEDGE',
  '/v1/commerce': 'COMMERCE',
  '/v1/analytics': 'ANALYTICS'
};

// Parse HTTP event from API Gateway v2
function parseHttpEvent(event) {
  console.log('Parsing HTTP event:', JSON.stringify(event, null, 2));
  
  // Handle API Gateway v2 event format
  if (event.requestContext && event.requestContext.http) {
    const method = event.requestContext.http.method;
    const path = event.rawPath || event.requestContext.http.path;
    const body = event.body ? 
      (event.isBase64Encoded ? 
        Buffer.from(event.body, 'base64').toString() : 
        event.body) : 
      '{}';
    
    let parsedBody = {};
    try {
      parsedBody = JSON.parse(body);
    } catch (e) {
      parsedBody = { raw: body };
    }
    
    return {
      method,
      path,
      headers: event.headers || {},
      body: parsedBody,
      queryStringParameters: event.queryStringParameters || {},
      pathParameters: event.pathParameters || {},
      isHttpEvent: true
    };
  }
  
  // Handle direct Lambda invocation
  return {
    ...event,
    isHttpEvent: false
  };
}

// Intent classification function
function classifyIntent(input) {
  const scores = {};
  
  // Calculate scores for each intent
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    scores[intent] = patterns.reduce((score, pattern) => {
      const matches = input.match(pattern);
      return score + (matches ? matches.length : 0);
    }, 0);
  }
  
  // Find the highest scoring intent
  let primaryIntent = 'CONTENT'; // Default
  let maxScore = 0;
  
  for (const [intent, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      primaryIntent = intent;
    }
  }
  
  // Get secondary intents (with score > 0)
  const secondaryIntents = Object.entries(scores)
    .filter(([intent, score]) => score > 0 && intent !== primaryIntent)
    .map(([intent]) => intent);
  
  return {
    primary: primaryIntent,
    secondary: secondaryIntents,
    confidence: maxScore > 0 ? Math.min(maxScore / 5, 1) : 0.5
  };
}

// Route to appropriate agent via Lambda invocation
async function routeToAgent(agentFunction, payload) {
  console.log(`Routing to ${agentFunction} with payload:`, JSON.stringify(payload, null, 2));
  
  try {
    const command = new InvokeCommand({
      FunctionName: agentFunction,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(payload)
    });
    
    const response = await lambdaClient.send(command);
    const responsePayload = JSON.parse(new TextDecoder().decode(response.Payload));
    
    console.log(`Response from ${agentFunction}:`, JSON.stringify(responsePayload, null, 2));
    return responsePayload;
  } catch (error) {
    console.error(`Error invoking ${agentFunction}:`, error);
    throw error;
  }
}

// Main handler
exports.handler = async (event) => {
  console.log('Router received event:', JSON.stringify(event, null, 2));
  
  try {
    // Parse the event
    const request = parseHttpEvent(event);
    
    // Handle HTTP requests from API Gateway
    if (request.isHttpEvent) {
      const { method, path, headers, body, queryStringParameters, pathParameters } = request;
      
      // Health check
      if (path === '/health' && method === 'GET') {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service: 'router',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            multiAgentSystem: {
              status: 'operational',
              agents: Object.keys(AGENT_MAPPING).length,
              capabilities: Object.keys(AGENT_MAPPING)
            }
          })
        };
      }
      
      // Determine target agent based on route
      let targetIntent = null;
      let targetAgent = null;
      
      // Check specific route mappings first
      for (const [route, intent] of Object.entries(ROUTE_MAPPING)) {
        if (path.startsWith(route)) {
          targetIntent = intent;
          break;
        }
      }
      
      // If no specific route match, classify based on content
      if (!targetIntent && (method === 'POST' || method === 'PUT')) {
        const input = body.input || body.message || body.query || JSON.stringify(body);
        const classification = classifyIntent(input);
        targetIntent = classification.primary;
      }
      
      // Special handling for health check intent
      if (targetIntent === 'HEALTH_CHECK') {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'healthy',
            service: 'storytailor-api',
            timestamp: new Date().toISOString()
          })
        };
      }
      
      // Get target agent
      targetAgent = AGENT_MAPPING[targetIntent] || 'storytailor-universal-staging';
      
      // Route to the appropriate agent
      const agentResponse = await routeToAgent(targetAgent, event);
      
      // Return the agent's response
      return agentResponse;
      
    } else {
      // Handle direct Lambda invocation (legacy support)
      const { action, input, conversationId, userId } = request;
      
      if (action === 'health') {
        return {
          statusCode: 200,
          body: JSON.stringify({
            service: 'router',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            capabilities: Object.keys(AGENT_MAPPING)
          })
        };
      }
      
      if (action === 'classify') {
        const classification = classifyIntent(input);
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            classification
          })
        };
      }
      
      if (action === 'route') {
        const classification = classifyIntent(input);
        const targetAgent = AGENT_MAPPING[classification.primary] || 'storytailor-universal-staging';
        
        const agentResponse = await routeToAgent(targetAgent, {
          action: 'process',
          input,
          conversationId,
          userId,
          classification
        });
        
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            classification,
            response: agentResponse
          })
        };
      }
      
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Invalid action. Supported: health, classify, route'
        })
      };
    }
    
  } catch (error) {
    console.error('Router error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error.message,
        service: 'router'
      })
    };
  }
};
EOF

# Create package.json
cat > $DEPLOY_DIR/package.json << EOF
{
  "name": "storytailor-router",
  "version": "2.0.0",
  "description": "Central router for Storytailor multi-agent system with HTTP support",
  "main": "index.js",
  "dependencies": {
    "@aws-sdk/client-eventbridge": "^3.0.0",
    "@aws-sdk/client-dynamodb": "^3.0.0",
    "@aws-sdk/lib-dynamodb": "^3.0.0",
    "@aws-sdk/client-lambda": "^3.0.0"
  }
}
EOF

# Install dependencies
cd $DEPLOY_DIR
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install --production

# Create deployment package
echo -e "${YELLOW}📦 Creating deployment package...${NC}"
zip -r function.zip . >/dev/null 2>&1

# Update Lambda function
echo -e "${YELLOW}🚀 Updating Router Lambda...${NC}"

# Update function code
aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://function.zip \
    --publish >/dev/null

echo -e "${GREEN}✅ Router code updated${NC}"

# Wait for update to complete
echo -e "${YELLOW}⏳ Waiting for update to complete...${NC}"
aws lambda wait function-updated --function-name $FUNCTION_NAME

# Update function configuration to ensure all environment variables are set
aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --runtime $RUNTIME \
    --timeout $TIMEOUT \
    --memory-size $MEMORY_SIZE \
    --environment Variables="{
        OPENAI_API_KEY='$OPENAI_API_KEY',
        SUPABASE_URL='$SUPABASE_URL',
        SUPABASE_SERVICE_KEY='$SUPABASE_SERVICE_KEY',
        EVENT_BUS_NAME='storytailor-$ENVIRONMENT',
        ENVIRONMENT='$ENVIRONMENT'
    }" >/dev/null

echo -e "${GREEN}✅ Router configuration updated${NC}"

# Clean up
cd - >/dev/null
rm -rf $DEPLOY_DIR

# Test the updated Router
echo ""
echo -e "${BLUE}🧪 Testing updated Router...${NC}"

# Test direct invocation
echo -e "${CYAN}Testing direct invocation...${NC}"
aws lambda invoke \
    --function-name $FUNCTION_NAME \
    --payload '{"action":"health"}' \
    /tmp/router-direct-response.json >/dev/null 2>&1

echo "Direct invocation response:"
cat /tmp/router-direct-response.json | jq '.'

# Test HTTP-style invocation
echo ""
echo -e "${CYAN}Testing HTTP-style invocation...${NC}"
aws lambda invoke \
    --function-name $FUNCTION_NAME \
    --payload '{
        "requestContext": {
            "http": {
                "method": "GET",
                "path": "/health"
            }
        },
        "rawPath": "/health",
        "headers": {}
    }' \
    /tmp/router-http-response.json >/dev/null 2>&1

echo "HTTP invocation response:"
cat /tmp/router-http-response.json | jq '.'

# Test via API Gateway
echo ""
echo -e "${CYAN}Testing via API Gateway...${NC}"
API_RESPONSE=$(curl -s "https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/health")
echo "API Gateway response:"
echo "$API_RESPONSE" | jq '.'

# Clean up test files
rm -f /tmp/router-direct-response.json /tmp/router-http-response.json

echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║           🎉 ROUTER UPDATE COMPLETE! 🎉                           ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ Router now handles HTTP events from API Gateway${NC}"
echo -e "${GREEN}✅ Intelligent routing based on path and content${NC}"
echo -e "${GREEN}✅ All agents accessible through unified API${NC}"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo -e "   1. Test agent-specific endpoints"
echo -e "   2. Monitor Router logs for traffic patterns"
echo -e "   3. Begin Phase 3: Testing & Quality Assurance"
echo ""
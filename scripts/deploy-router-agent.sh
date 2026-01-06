#!/bin/bash

# Storytailor Router Agent Deployment Script
# Central orchestration for the multi-agent system

set -e

# Configuration
FUNCTION_NAME="storytailor-router-staging"
RUNTIME="nodejs20.x"
TIMEOUT=60
MEMORY_SIZE=512
ENVIRONMENT=${ENVIRONMENT:-staging}

echo "🚀 Deploying Storytailor Router Agent"
echo "===================================="
echo ""

# Load environment variables
source .env.staging

# Create deployment directory
DEPLOY_DIR=$(mktemp -d)
echo "📁 Creating deployment package in $DEPLOY_DIR"

# Create Lambda handler
cat > $DEPLOY_DIR/index.js << 'EOF'
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize AWS clients
const eventBridge = new EventBridgeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

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
    /\b(fact|information|knowledge|answer|question)\b/i
  ]
};

// Agent mapping
const AGENT_MAPPING = {
  AUTH: 'auth-agent',
  CONTENT: 'content-agent',
  EMOTION: 'emotion-agent',
  EDUCATIONAL: 'educational-agent',
  THERAPEUTIC: 'therapeutic-agent',
  SMART_HOME: 'smart-home-agent',
  COMMERCE: 'commerce-agent',
  KNOWLEDGE: 'knowledge-base-agent',
  PERSONALITY: 'personality-agent',
  CHILD_SAFETY: 'child-safety-agent',
  ACCESSIBILITY: 'accessibility-agent',
  LOCALIZATION: 'localization-agent'
};

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

// Route to appropriate agent
async function routeToAgent(intent, payload) {
  const agentName = AGENT_MAPPING[intent] || 'universal-agent';
  
  console.log(`Routing to ${agentName} for intent: ${intent}`);
  
  // Send event to EventBridge
  const command = new PutEventsCommand({
    Entries: [{
      Source: 'storytailor.router',
      DetailType: 'AgentRequest',
      Detail: JSON.stringify({
        targetAgent: agentName,
        intent,
        payload,
        timestamp: new Date().toISOString()
      }),
      EventBusName: process.env.EVENT_BUS_NAME || 'storytailor-staging'
    }]
  });
  
  try {
    await eventBridge.send(command);
    return { success: true, agent: agentName };
  } catch (error) {
    console.error('Error routing to agent:', error);
    return { success: false, error: error.message };
  }
}

// Main handler
exports.handler = async (event) => {
  console.log('Router received event:', JSON.stringify(event, null, 2));
  
  try {
    // Parse the request
    const { action, input, conversationId, userId } = event;
    
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
      // Classify the intent
      const classification = classifyIntent(input);
      
      // Store conversation state if conversationId provided
      if (conversationId) {
        await docClient.send(new PutCommand({
          TableName: 'conversations',
          Item: {
            id: conversationId,
            userId,
            lastIntent: classification.primary,
            lastInput: input,
            timestamp: new Date().toISOString()
          }
        }));
      }
      
      // Route to primary agent
      const routingResult = await routeToAgent(classification.primary, {
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
          routing: routingResult
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
    
  } catch (error) {
    console.error('Router error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
EOF

# Create package.json
cat > $DEPLOY_DIR/package.json << EOF
{
  "name": "storytailor-router",
  "version": "1.0.0",
  "description": "Central router for Storytailor multi-agent system",
  "main": "index.js",
  "dependencies": {
    "@aws-sdk/client-eventbridge": "^3.0.0",
    "@aws-sdk/client-dynamodb": "^3.0.0",
    "@aws-sdk/lib-dynamodb": "^3.0.0"
  }
}
EOF

# Install dependencies
cd $DEPLOY_DIR
npm install --production

# Create deployment package
zip -r function.zip .

# Deploy to Lambda
echo ""
echo "📦 Deploying to AWS Lambda..."

# Check if function exists
if aws lambda get-function --function-name $FUNCTION_NAME 2>/dev/null; then
    echo "Updating existing function..."
    
    # Update function code
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://function.zip \
        --publish
    
    # Update function configuration
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
        }"
else
    echo "Creating new function..."
    
    # Create the function
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime $RUNTIME \
        --role arn:aws:iam::326181217496:role/storytailor-lambda-role-$ENVIRONMENT \
        --handler index.handler \
        --timeout $TIMEOUT \
        --memory-size $MEMORY_SIZE \
        --zip-file fileb://function.zip \
        --environment Variables="{
            OPENAI_API_KEY='$OPENAI_API_KEY',
            SUPABASE_URL='$SUPABASE_URL',
            SUPABASE_SERVICE_KEY='$SUPABASE_SERVICE_KEY',
            EVENT_BUS_NAME='storytailor-$ENVIRONMENT',
            ENVIRONMENT='$ENVIRONMENT'
        }"
fi

# Clean up
cd -
rm -rf $DEPLOY_DIR

echo ""
echo "✅ Router Agent deployed successfully!"
echo ""
echo "🔍 Testing the deployment..."

# Test the function
aws lambda invoke \
    --function-name $FUNCTION_NAME \
    --payload '{"action":"health"}' \
    /tmp/router-response.json

echo "Response:"
cat /tmp/router-response.json | jq .

echo ""
echo "🎯 Router Agent Deployment Complete!"
echo "  Function: $FUNCTION_NAME"
echo "  Memory: ${MEMORY_SIZE}MB"
echo "  Timeout: ${TIMEOUT}s"
echo ""
echo "Next steps:"
echo "1. Deploy Universal Agent"
echo "2. Setup EventBridge rules"
echo "3. Configure Redis for state management"
#!/bin/bash

# Storytailor Universal Agent Deployment Script
# Core agent framework that all specialized agents extend

set -e

# Configuration
FUNCTION_NAME="storytailor-universal-staging"
RUNTIME="nodejs20.x"
TIMEOUT=30
MEMORY_SIZE=256
ENVIRONMENT=${ENVIRONMENT:-staging}

echo "🚀 Deploying Storytailor Universal Agent"
echo "======================================"
echo ""

# Load environment variables
source .env.staging

# Create deployment directory
DEPLOY_DIR=$(mktemp -d)
echo "📁 Creating deployment package in $DEPLOY_DIR"

# Create Lambda handler
cat > $DEPLOY_DIR/index.js << 'EOF'
// Universal Agent - Base framework for all Storytailor agents

class UniversalAgent {
  constructor(config = {}) {
    this.name = config.name || 'universal-agent';
    this.version = config.version || '1.0.0';
    this.capabilities = config.capabilities || [];
    this.metadata = {
      created: new Date().toISOString(),
      environment: process.env.ENVIRONMENT || 'staging'
    };
  }

  // Core validation method
  async validateInput(input) {
    if (!input) {
      throw new Error('Input is required');
    }
    
    if (typeof input === 'string' && input.length > 10000) {
      throw new Error('Input exceeds maximum length');
    }
    
    return true;
  }

  // Core processing method - to be overridden by specialized agents
  async process(input, context = {}) {
    await this.validateInput(input);
    
    return {
      success: true,
      agent: this.name,
      message: 'Base universal agent processing',
      input: input,
      context: context,
      timestamp: new Date().toISOString()
    };
  }

  // Health check method
  async health() {
    return {
      service: this.name,
      status: 'healthy',
      version: this.version,
      capabilities: this.capabilities,
      environment: this.metadata.environment,
      timestamp: new Date().toISOString()
    };
  }

  // Metrics collection
  async getMetrics() {
    return {
      agent: this.name,
      requests_processed: 0,
      avg_response_time: 0,
      error_rate: 0,
      timestamp: new Date().toISOString()
    };
  }
}

// Agent Registry - tracks all available agent types
const AGENT_REGISTRY = {
  'auth': { name: 'auth-agent', capabilities: ['authentication', 'authorization'] },
  'content': { name: 'content-agent', capabilities: ['story-creation', 'character-management'] },
  'emotion': { name: 'emotion-agent', capabilities: ['emotion-detection', 'mood-tracking'] },
  'library': { name: 'library-agent', capabilities: ['story-storage', 'library-management'] },
  'commerce': { name: 'commerce-agent', capabilities: ['payments', 'subscriptions'] },
  'educational': { name: 'educational-agent', capabilities: ['learning', 'curriculum'] },
  'therapeutic': { name: 'therapeutic-agent', capabilities: ['wellness', 'support'] },
  'smart-home': { name: 'smart-home-agent', capabilities: ['iot', 'device-control'] },
  'child-safety': { name: 'child-safety-agent', capabilities: ['content-filtering', 'crisis-detection'] },
  'accessibility': { name: 'accessibility-agent', capabilities: ['universal-design', 'adaptations'] },
  'localization': { name: 'localization-agent', capabilities: ['translation', 'cultural-adaptation'] },
  'personality': { name: 'personality-agent', capabilities: ['consistency', 'voice-adaptation'] }
};

// Factory method to create specialized agents
function createAgent(type, config = {}) {
  const agentConfig = AGENT_REGISTRY[type];
  if (!agentConfig) {
    throw new Error(`Unknown agent type: ${type}`);
  }
  
  return new UniversalAgent({
    ...agentConfig,
    ...config
  });
}

// Lambda handler
exports.handler = async (event) => {
  console.log('Universal Agent received event:', JSON.stringify(event, null, 2));
  
  try {
    const { action, agentType, input, context } = event;
    
    // Health check
    if (action === 'health') {
      const universalAgent = new UniversalAgent({
        name: 'universal-agent-framework',
        version: '1.0.0',
        capabilities: Object.keys(AGENT_REGISTRY)
      });
      
      const health = await universalAgent.health();
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          ...health,
          registry: AGENT_REGISTRY,
          totalAgentTypes: Object.keys(AGENT_REGISTRY).length
        })
      };
    }
    
    // Create agent instance
    if (action === 'create') {
      if (!agentType) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            success: false,
            error: 'Agent type is required'
          })
        };
      }
      
      try {
        const agent = createAgent(agentType);
        const info = await agent.health();
        
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            agent: info
          })
        };
      } catch (error) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            success: false,
            error: error.message
          })
        };
      }
    }
    
    // Process request with specific agent
    if (action === 'process') {
      if (!agentType) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            success: false,
            error: 'Agent type is required for processing'
          })
        };
      }
      
      const agent = createAgent(agentType);
      const result = await agent.process(input, context);
      
      return {
        statusCode: 200,
        body: JSON.stringify(result)
      };
    }
    
    // Get metrics
    if (action === 'metrics') {
      const universalAgent = new UniversalAgent({
        name: 'universal-agent-framework'
      });
      
      const metrics = await universalAgent.getMetrics();
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          metrics
        })
      };
    }
    
    // List available agents
    if (action === 'list') {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          agents: AGENT_REGISTRY,
          count: Object.keys(AGENT_REGISTRY).length
        })
      };
    }
    
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        error: 'Invalid action. Supported: health, create, process, metrics, list'
      })
    };
    
  } catch (error) {
    console.error('Universal Agent error:', error);
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
  "name": "storytailor-universal-agent",
  "version": "1.0.0",
  "description": "Universal agent framework for Storytailor multi-agent system",
  "main": "index.js",
  "dependencies": {}
}
EOF

# Create deployment package
cd $DEPLOY_DIR
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
            SUPABASE_URL='$SUPABASE_URL',
            SUPABASE_SERVICE_KEY='$SUPABASE_SERVICE_KEY',
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
            SUPABASE_URL='$SUPABASE_URL',
            SUPABASE_SERVICE_KEY='$SUPABASE_SERVICE_KEY',
            ENVIRONMENT='$ENVIRONMENT'
        }"
fi

# Clean up
cd -
rm -rf $DEPLOY_DIR

echo ""
echo "✅ Universal Agent deployed successfully!"
echo ""
echo "🔍 Testing the deployment..."

# Test the function
aws lambda invoke \
    --function-name $FUNCTION_NAME \
    --payload '{"action":"health"}' \
    --cli-binary-format raw-in-base64-out \
    /tmp/universal-response.json

echo "Response:"
cat /tmp/universal-response.json | jq .

echo ""
echo "🎯 Universal Agent Deployment Complete!"
echo "  Function: $FUNCTION_NAME"
echo "  Memory: ${MEMORY_SIZE}MB"
echo "  Timeout: ${TIMEOUT}s"
echo ""
echo "Next steps:"
echo "1. Setup EventBridge for agent communication"
echo "2. Configure Redis for state management"
echo "3. Deploy specialized agents (Auth, Content, etc.)"
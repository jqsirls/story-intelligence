#!/bin/bash

# 🚀 DEPLOY ALL AGENTS - FULL MULTI-AGENT POWERHOUSE DEPLOYMENT
# This script deploys all 30+ agent packages to AWS Lambda functions
# Converting from embedded 3-agent system to distributed multi-agent ecosystem

set -e

# Configuration
ENVIRONMENT=${ENVIRONMENT:-staging}
AWS_REGION=${AWS_REGION:-us-east-1}
RUNTIME="nodejs18.x"
MEMORY_SIZE=1024
TIMEOUT=30
IAM_ROLE_NAME="storytailor-lambda-role-${ENVIRONMENT}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get AWS Account ID and IAM Role ARN
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
IAM_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${IAM_ROLE_NAME}"

log "Starting Full Multi-Agent Deployment"
log "Environment: ${ENVIRONMENT}"
log "AWS Region: ${AWS_REGION}"
log "IAM Role: ${IAM_ROLE_ARN}"

# Function to deploy a single agent
deploy_agent() {
    local package_name=$1
    local function_name=$2
    local memory=${3:-$MEMORY_SIZE}
    local timeout=${4:-$TIMEOUT}
    local description=$5
    
    log "Deploying ${package_name} → ${function_name}"
    
    # Check if package exists
    if [ ! -d "packages/${package_name}" ]; then
        error "Package packages/${package_name} not found"
        return 1
    fi
    
    # Create temporary directory
    local temp_dir=$(mktemp -d)
    local package_dir="${temp_dir}/${package_name}"
    
    # Copy package to temp directory
    cp -r "packages/${package_name}" "${temp_dir}/"
    cd "${package_dir}"
    
    # Install dependencies
    log "Installing dependencies for ${package_name}"
    npm install --production || {
        error "Failed to install dependencies for ${package_name}"
        rm -rf "${temp_dir}"
        return 1
    }
    
    # Create deployment package
    log "Creating deployment package for ${function_name}"
    zip -r "${function_name}.zip" . -x "*.test.*" "__tests__/*" "*.md" || {
        error "Failed to create deployment package for ${package_name}"
        rm -rf "${temp_dir}"
        return 1
    }
    
    # Deploy to AWS Lambda
    log "Deploying ${function_name} to AWS Lambda"
    
    # Check if function exists
    if aws lambda get-function --function-name "${function_name}" &>/dev/null; then
        # Update existing function
        aws lambda update-function-code \
            --function-name "${function_name}" \
            --zip-file "fileb://${function_name}.zip" || {
            error "Failed to update Lambda function ${function_name}"
            rm -rf "${temp_dir}"
            return 1
        }
        
        # Update configuration
        aws lambda update-function-configuration \
            --function-name "${function_name}" \
            --memory-size "${memory}" \
            --timeout "${timeout}" \
            --environment "Variables={
                SUPABASE_URL=${SUPABASE_URL},
                SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY},
                JWT_SECRET=${JWT_SECRET},
                OPENAI_API_KEY=${OPENAI_API_KEY},
                ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY:-},
                ENVIRONMENT=${ENVIRONMENT},
                EVENTBRIDGE_BUS_NAME=storytailor-${ENVIRONMENT},
                REDIS_URL=${REDIS_URL:-}
            }" || {
            warning "Failed to update configuration for ${function_name}"
        }
        
        success "Updated existing function ${function_name}"
    else
        # Create new function
        aws lambda create-function \
            --function-name "${function_name}" \
            --runtime "${RUNTIME}" \
            --role "${IAM_ROLE_ARN}" \
            --handler "index.handler" \
            --zip-file "fileb://${function_name}.zip" \
            --memory-size "${memory}" \
            --timeout "${timeout}" \
            --description "${description}" \
            --environment "Variables={
                SUPABASE_URL=${SUPABASE_URL},
                SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY},
                JWT_SECRET=${JWT_SECRET},
                OPENAI_API_KEY=${OPENAI_API_KEY},
                ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY:-},
                ENVIRONMENT=${ENVIRONMENT},
                EVENTBRIDGE_BUS_NAME=storytailor-${ENVIRONMENT},
                REDIS_URL=${REDIS_URL:-}
            }" || {
            error "Failed to create Lambda function ${function_name}"
            rm -rf "${temp_dir}"
            return 1
        }
        
        success "Created new function ${function_name}"
    fi
    
    # Wait for function to be active
    log "Waiting for ${function_name} to be active..."
    aws lambda wait function-active --function-name "${function_name}" || {
        warning "Function ${function_name} may not be fully active yet"
    }
    
    # Cleanup
    cd - > /dev/null
    rm -rf "${temp_dir}"
    
    success "Successfully deployed ${function_name}"
}

# PHASE 1: CORE ORCHESTRATION AGENTS
echo
log "🚀 PHASE 1: DEPLOYING CORE ORCHESTRATION AGENTS"
echo

deploy_agent "router" "storytailor-router-${ENVIRONMENT}" 1024 60 "Central orchestrator and intent classification router"
deploy_agent "storytailor-agent" "storytailor-main-${ENVIRONMENT}" 1024 60 "Main Alexa+ orchestrator and handoff manager"
deploy_agent "universal-agent" "storytailor-universal-${ENVIRONMENT}" 1024 60 "Channel-agnostic universal interface"

# PHASE 2: CRITICAL DOMAIN AGENTS
echo
log "🔐 PHASE 2: DEPLOYING CRITICAL DOMAIN AGENTS"
echo

deploy_agent "auth-agent" "storytailor-auth-${ENVIRONMENT}" 512 30 "Authentication and COPPA compliance agent"
deploy_agent "content-agent" "storytailor-content-${ENVIRONMENT}" 2048 300 "Story and character creation agent"
deploy_agent "library-agent" "storytailor-library-${ENVIRONMENT}" 1024 30 "Story library management and permissions"
deploy_agent "emotion-agent" "storytailor-emotion-${ENVIRONMENT}" 1024 30 "Emotional intelligence and daily check-ins"
deploy_agent "personality-agent" "storytailor-personality-${ENVIRONMENT}" 512 30 "Personality consistency and voice adaptation"
deploy_agent "child-safety-agent" "storytailor-safety-${ENVIRONMENT}" 1024 60 "Crisis detection and mandatory reporting"

# PHASE 3: INTELLIGENCE AGENTS
echo
log "🧠 PHASE 3: DEPLOYING INTELLIGENCE AGENTS"
echo

deploy_agent "educational-agent" "storytailor-educational-${ENVIRONMENT}" 1024 60 "Classroom tools and educational assessments"
deploy_agent "therapeutic-agent" "storytailor-therapeutic-${ENVIRONMENT}" 1024 60 "Mental health support and therapeutic pathways"
deploy_agent "accessibility-agent" "storytailor-accessibility-${ENVIRONMENT}" 512 30 "Universal design and inclusive features"
deploy_agent "localization-agent" "storytailor-localization-${ENVIRONMENT}" 1024 30 "Multi-language and cultural adaptation"
deploy_agent "conversation-intelligence" "storytailor-conversation-${ENVIRONMENT}" 1024 60 "Advanced NLU and developmental psychology"
deploy_agent "analytics-intelligence" "storytailor-analytics-${ENVIRONMENT}" 1024 30 "Advanced analytics and predictive intelligence"
deploy_agent "insights-agent" "storytailor-insights-${ENVIRONMENT}" 512 30 "Pattern-based recommendations and insights"

# PHASE 4: INTEGRATION & SPECIALIZED AGENTS
echo
log "🔌 PHASE 4: DEPLOYING INTEGRATION & SPECIALIZED AGENTS"
echo

deploy_agent "commerce-agent" "storytailor-commerce-${ENVIRONMENT}" 1024 30 "Stripe subscriptions and payment management"
deploy_agent "smart-home-agent" "storytailor-smarthome-${ENVIRONMENT}" 512 30 "IoT and smart display integration"
deploy_agent "security-framework" "storytailor-security-${ENVIRONMENT}" 512 30 "Security framework and privacy protection"
deploy_agent "voice-synthesis" "storytailor-voice-${ENVIRONMENT}" 1024 60 "Voice and audio generation services"
deploy_agent "content-safety" "storytailor-content-safety-${ENVIRONMENT}" 512 30 "Content moderation and safety filtering"

# Verify all deployments
echo
log "🔍 VERIFYING ALL DEPLOYMENTS"
echo

# List all deployed Storytailor functions
log "Listing all deployed Storytailor Lambda functions:"
aws lambda list-functions \
    --query "Functions[?contains(FunctionName, 'storytailor')].{Name:FunctionName,Runtime:Runtime,State:State,Memory:MemorySize}" \
    --output table

# Test health endpoints
echo
log "🏥 TESTING AGENT HEALTH ENDPOINTS"
echo

# Get API Gateway URL (assuming it exists)
if [ -n "${API_GATEWAY_URL}" ]; then
    # Test main health endpoint
    log "Testing main API health..."
    curl -s "${API_GATEWAY_URL}/health" | jq . || warning "Main health check failed"
    
    # Test router health
    log "Testing router health..."
    curl -s "${API_GATEWAY_URL}/router/health" | jq . || warning "Router health check failed"
else
    warning "API_GATEWAY_URL not set, skipping health checks"
fi

# Final summary
echo
success "🎉 MULTI-AGENT DEPLOYMENT COMPLETE!"
echo
log "📊 DEPLOYMENT SUMMARY:"
log "   ✅ Core Orchestration: Router, Main, Universal"
log "   ✅ Critical Domains: Auth, Content, Library, Emotion, Personality, Safety"
log "   ✅ Intelligence: Educational, Therapeutic, Accessibility, Localization, Conversation, Analytics, Insights"
log "   ✅ Integration: Commerce, SmartHome, Security, Voice, ContentSafety"
echo
log "🎯 NEXT STEPS:"
log "   1. Configure EventBridge for agent communication"
log "   2. Setup Redis for conversation state management"
log "   3. Update API Gateway routes to use Router orchestration"
log "   4. Test end-to-end multi-agent workflows"
echo
log "🚀 Ready for Phase 2: Orchestration Integration!"
 
 
 
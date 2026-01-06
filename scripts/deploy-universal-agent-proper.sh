#!/bin/bash
# Deploy Universal Agent Lambda (Proper Deployment)
# Based on deploy-auth-agent.sh pattern - bundles auth-agent EmailService
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
ENVIRONMENT=${1:-production}
PREFIX="/storytailor-${ENVIRONMENT}"
LAMBDA_NAME="storytailor-universal-agent-${ENVIRONMENT}"
HANDLER="dist/lambda.handler"
AGENT_DIR="packages/universal-agent"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                📚 DEPLOYING LIBRARY AGENT 📚                      ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${CYAN}Lambda Name: ${LAMBDA_NAME}${NC}"
echo -e "${CYAN}Handler: ${HANDLER}${NC}"
echo ""

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
    echo -e "${YELLOW}Usage: $0 [staging|production]${NC}"
    exit 1
fi

# Get AWS account info
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=${AWS_REGION:-us-east-1}
LAMBDA_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/storytailor-lambda-role-${ENVIRONMENT}"

echo -e "${GREEN}✅ AWS Account: ${AWS_ACCOUNT_ID}${NC}"
echo -e "${GREEN}✅ AWS Region: ${AWS_REGION}${NC}"
echo -e "${GREEN}✅ Lambda Role: storytailor-lambda-role-${ENVIRONMENT}${NC}"
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# Verify agent directory exists
if [ ! -d "$AGENT_DIR" ]; then
    echo -e "${RED}❌ Error: Universal Agent directory not found at $AGENT_DIR${NC}"
    exit 1
fi

# Step 1: Build workspace dependencies
echo -e "${BLUE}📦 Step 1: Building workspace dependencies...${NC}"

# Build shared-types
if [ -d "packages/shared-types" ]; then
    echo -e "${YELLOW}  Building @alexa-multi-agent/shared-types...${NC}"
    cd packages/shared-types
    npm run build:skip-proto >/dev/null 2>&1 || npm run build >/dev/null 2>&1 || echo -e "${YELLOW}  ⚠️  shared-types build may have issues${NC}"
    cd "$PROJECT_ROOT"
fi

# Build voice-synthesis (needed for WebVTT service)
if [ -d "packages/voice-synthesis" ]; then
    echo -e "${YELLOW}  Building @alexa-multi-agent/voice-synthesis...${NC}"
    cd packages/voice-synthesis
    npm run build >/dev/null 2>&1 || echo -e "${YELLOW}  ⚠️  voice-synthesis build may have issues${NC}"
    cd "$PROJECT_ROOT"
fi

# Build router (needed for Universal Agent)
if [ -d "packages/router" ]; then
    echo -e "${YELLOW}  Building @alexa-multi-agent/router...${NC}"
    cd packages/router
    npm run build >/dev/null 2>&1 || echo -e "${YELLOW}  ⚠️  router build may have issues${NC}"
    cd "$PROJECT_ROOT"
fi

# Step 2: Build universal-agent
echo -e "${BLUE}📦 Step 2: Building Universal Agent...${NC}"
cd "$AGENT_DIR"
if ! npm run build; then
    echo -e "${RED}❌ Error: Build failed (TypeScript errors)${NC}"
    exit 1
fi

if [ ! -d "dist" ] || [ ! -f "dist/lambda.js" ]; then
    echo -e "${RED}❌ Error: Build failed - dist/lambda.js not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"
cd "$PROJECT_ROOT"

# Step 3: Prepare deployment directory
echo -e "${BLUE}📦 Step 3: Preparing deployment package...${NC}"
DEPLOY_DIR=$(mktemp -d)
echo -e "${CYAN}Deploy directory: $DEPLOY_DIR${NC}"

# Copy universal-agent dist files
cp -r "$AGENT_DIR/dist" "$DEPLOY_DIR/"
echo -e "${GREEN}✅ Copied Universal Agent dist files${NC}"

# Step 4: Install production dependencies
echo -e "${BLUE}📦 Step 4: Installing production dependencies...${NC}"
cd "$DEPLOY_DIR"

# Use the actual package.json from lambda-deployments/universal-agent (more reliable)
if [ -f "$PROJECT_ROOT/lambda-deployments/universal-agent/package.json" ]; then
    echo -e "${CYAN}  Using package.json from lambda-deployments/universal-agent${NC}"
    cp "$PROJECT_ROOT/lambda-deployments/universal-agent/package.json" package.json
    echo -e "${GREEN}  ✅ Copied package.json (includes all dependencies)${NC}"
else
    echo -e "${YELLOW}  ⚠️  lambda-deployments/universal-agent/package.json not found, using hardcoded dependencies${NC}"
    # Create package.json with all dependencies (including router dependencies)
    cat > package.json << 'EOF'
{
  "name": "@alexa-multi-agent/universal-agent",
  "version": "1.0.0",
  "description": "Storytailor Universal Agent - Account management, data export, and B2B onboarding with email notifications",
  "main": "dist/lambda.js",
  "dependencies": {
    "@aws-sdk/client-ses": "^3.490.0",
    "@aws-sdk/client-ssm": "^3.614.0",
    "@aws-sdk/client-eventbridge": "^3.450.0",
    "@aws-sdk/client-sqs": "^3.450.0",
    "@sendgrid/mail": "^8.1.0",
    "@supabase/supabase-js": "^2.38.0",
    "@opentelemetry/api": "^1.4.0",
    "@opentelemetry/sdk-node": "^0.41.0",
    "@opentelemetry/resources": "^1.15.0",
    "@opentelemetry/semantic-conventions": "^1.15.0",
    "openai": "^4.20.1",
    "ioredis": "^5.8.2",
    "redis": "^4.6.0",
    "winston": "^3.11.0",
    "zod": "^3.22.0",
    "uuid": "^9.0.1",
    "jsonwebtoken": "^9.0.2",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "rate-limiter-flexible": "^2.4.2",
    "graphql": "^16.8.0",
    "graphql-http": "^1.20.0",
    "express-graphql": "^0.12.0",
    "swagger-ui-express": "^5.0.0",
    "openapi-types": "^12.1.0",
    "joi": "^17.11.0",
    "ws": "^8.14.2",
    "axios": "^1.6.2",
    "aws-sdk": "^2.1490.0",
    "node-fetch": "^3.3.2",
    "serverless-http": "^3.2.0",
    "jwks-rsa": "^3.1.0"
  }
}
EOF
fi

# Install production dependencies
npm install --production --legacy-peer-deps --no-audit --no-fund --no-package-lock 2>&1 | grep -v "npm WARN" || true
echo -e "${GREEN}✅ Production dependencies installed${NC}"

# Verify critical dependencies are installed
echo -e "${CYAN}🔍 Verifying critical dependencies...${NC}"
if [ ! -d "node_modules/zod" ]; then
    echo -e "${RED}❌ ERROR: zod not found in node_modules after npm install${NC}"
    echo -e "${YELLOW}  Attempting to install zod explicitly...${NC}"
    npm install zod@^3.22.0 --save --legacy-peer-deps --no-audit --no-fund 2>&1 | grep -v "npm WARN" || true
    if [ ! -d "node_modules/zod" ]; then
        echo -e "${RED}❌ ERROR: Failed to install zod. Deployment aborted.${NC}"
        exit 1
    fi
fi
if [ ! -d "node_modules/serverless-http" ]; then
    echo -e "${RED}❌ ERROR: serverless-http not found in node_modules after npm install${NC}"
    echo -e "${YELLOW}  Attempting to install serverless-http explicitly...${NC}"
    npm install serverless-http@^3.2.0 --save --legacy-peer-deps --no-audit --no-fund 2>&1 | grep -v "npm WARN" || true
    if [ ! -d "node_modules/serverless-http" ]; then
        echo -e "${RED}❌ ERROR: Failed to install serverless-http. Deployment aborted.${NC}"
        exit 1
    fi
fi
if [ ! -d "node_modules/jwks-rsa" ]; then
    echo -e "${RED}❌ ERROR: jwks-rsa not found in node_modules after npm install${NC}"
    echo -e "${YELLOW}  Attempting to install jwks-rsa explicitly...${NC}"
    npm install jwks-rsa@^3.1.0 --save --legacy-peer-deps --no-audit --no-fund 2>&1 | grep -v "npm WARN" || true
    if [ ! -d "node_modules/jwks-rsa" ]; then
        echo -e "${RED}❌ ERROR: Failed to install jwks-rsa. Deployment aborted.${NC}"
        exit 1
    fi
fi
if [ ! -d "node_modules/openai" ]; then
    echo -e "${RED}❌ ERROR: openai not found in node_modules after npm install${NC}"
    echo -e "${YELLOW}  Attempting to install openai explicitly...${NC}"
    npm install openai@^4.0.0 --save --legacy-peer-deps --no-audit --no-fund 2>&1 | grep -v "npm WARN" || true
    if [ ! -d "node_modules/openai" ]; then
        echo -e "${RED}❌ ERROR: Failed to install openai. Deployment aborted.${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✅ Critical dependencies verified: zod, serverless-http, jwks-rsa, and openai found${NC}"

# Step 5: Bundle workspace dependencies
echo -e "${BLUE}📦 Step 5: Bundling workspace dependencies...${NC}"

# Copy shared-types
if [ -d "$PROJECT_ROOT/packages/shared-types/dist" ]; then
    echo -e "${YELLOW}  Bundling @alexa-multi-agent/shared-types...${NC}"
    mkdir -p "node_modules/@alexa-multi-agent/shared-types"
    cp -r "$PROJECT_ROOT/packages/shared-types/dist" "node_modules/@alexa-multi-agent/shared-types/"
    cat > "node_modules/@alexa-multi-agent/shared-types/package.json" << 'EOF'
{
  "name": "@alexa-multi-agent/shared-types",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts"
}
EOF
    echo -e "${GREEN}  ✅ @alexa-multi-agent/shared-types bundled${NC}"
fi

# Bundle auth-agent (needed for AuthMiddleware)
if [ -d "$PROJECT_ROOT/packages/auth-agent/dist" ]; then
    echo -e "${YELLOW}  Bundling @alexa-multi-agent/auth-agent...${NC}"
    
    # Copy the entire auth-agent dist directory
    mkdir -p "node_modules/@alexa-multi-agent/auth-agent"
    cp -r "$PROJECT_ROOT/packages/auth-agent/dist"/* "node_modules/@alexa-multi-agent/auth-agent/" 2>/dev/null || true
    
    # Create package.json for auth-agent module
    cat > "node_modules/@alexa-multi-agent/auth-agent/package.json" << 'EOF'
{
  "name": "@alexa-multi-agent/auth-agent",
  "version": "1.0.0",
  "main": "index.js",
  "types": "index.d.ts"
}
EOF
    
    echo -e "${GREEN}  ✅ Auth agent bundled${NC}"
elif [ -d "$PROJECT_ROOT/packages/auth-agent/src" ]; then
    echo -e "${YELLOW}  Bundling @alexa-multi-agent/auth-agent (from src)...${NC}"
    
    # Copy source files
    mkdir -p "node_modules/@alexa-multi-agent/auth-agent/src"
    cp -r "$PROJECT_ROOT/packages/auth-agent/src"/* "node_modules/@alexa-multi-agent/auth-agent/src/" 2>/dev/null || true
    
    # Create package.json
    cat > "node_modules/@alexa-multi-agent/auth-agent/package.json" << 'EOF'
{
  "name": "@alexa-multi-agent/auth-agent",
  "version": "1.0.0",
  "main": "src/index.js",
  "types": "src/index.d.ts"
}
EOF
    
    echo -e "${GREEN}  ✅ Auth agent bundled (from source)${NC}"
fi

# Bundle router if it exists (needed for Universal Agent)
# IMPORTANT: This must be outside the auth-agent block so it always runs
if [ -d "$PROJECT_ROOT/packages/router/dist" ]; then
    echo -e "${YELLOW}  Bundling @alexa-multi-agent/router...${NC}"
    echo -e "${CYAN}    Source: $PROJECT_ROOT/packages/router/dist${NC}"
    
    # List source files for debugging
    echo -e "${CYAN}    Source files:${NC}"
    ls -la "$PROJECT_ROOT/packages/router/dist" | head -10 | sed 's/^/      /' || true
    
    # Remove any existing router directory or symlink (npm install may have created a symlink)
    if [ -e "node_modules/@alexa-multi-agent/router" ]; then
      echo -e "${CYAN}    Removing existing router (may be symlink from npm install)...${NC}"
      rm -rf "node_modules/@alexa-multi-agent/router" 2>&1 | sed 's/^/      /' || true
    fi
    
    # Create router directory first
    mkdir -p "node_modules/@alexa-multi-agent/router"
    echo -e "${CYAN}    Created directory: node_modules/@alexa-multi-agent/router${NC}"
    
    # Copy the entire dist directory to router root (not router/dist/)
    # This matches the package.json "main": "dist/index.js" structure
    echo -e "${CYAN}    Copying dist directory...${NC}"
    cp -r "$PROJECT_ROOT/packages/router/dist" "node_modules/@alexa-multi-agent/router/" 2>&1 | sed 's/^/      /' || {
      echo -e "${RED}    ❌ Copy failed${NC}"
      exit 1
    }
    
    # Also copy router to dist directory as a fallback (for direct require paths)
    echo -e "${CYAN}    Copying router to dist directory as fallback...${NC}"
    mkdir -p "dist/router"
    cp -r "$PROJECT_ROOT/packages/router/dist"/* "dist/router/" 2>&1 | sed 's/^/      /' || {
      echo -e "${YELLOW}    ⚠️  Fallback copy failed (non-critical)${NC}"
    }
    
    # Verify the copy was successful and list copied files
    if [ ! -f "node_modules/@alexa-multi-agent/router/dist/index.js" ]; then
      echo -e "${RED}  ❌ ERROR: Failed to copy router dist files${NC}"
      echo -e "${RED}    Expected: node_modules/@alexa-multi-agent/router/dist/index.js${NC}"
      echo -e "${RED}    Actual files in router directory:${NC}"
      find "node_modules/@alexa-multi-agent/router" -type f 2>/dev/null | head -20 | sed 's/^/      /' || echo "      (directory not found or empty)"
      exit 1
    fi
    
    # List copied files for verification
    echo -e "${CYAN}    Copied files (first 10):${NC}"
    find "node_modules/@alexa-multi-agent/router/dist" -type f 2>/dev/null | head -10 | sed 's/^/      /' || echo "      (no files found)"
    
    # Verify key files exist
    echo -e "${CYAN}    Verifying key files:${NC}"
    if [ -f "node_modules/@alexa-multi-agent/router/dist/index.js" ]; then
      echo -e "${GREEN}      ✅ dist/index.js exists${NC}"
      echo -e "${CYAN}        Size: $(stat -f%z "node_modules/@alexa-multi-agent/router/dist/index.js" 2>/dev/null || stat -c%s "node_modules/@alexa-multi-agent/router/dist/index.js" 2>/dev/null || echo "unknown") bytes${NC}"
    else
      echo -e "${RED}      ❌ dist/index.js missing${NC}"
    fi
    
    if [ -f "node_modules/@alexa-multi-agent/router/dist/PlatformAwareRouter.js" ]; then
      echo -e "${GREEN}      ✅ dist/PlatformAwareRouter.js exists${NC}"
    else
      echo -e "${YELLOW}      ⚠️  dist/PlatformAwareRouter.js not found (may be in index.js)${NC}"
    fi
    
    # Create package.json for router module with proper module resolution
    # CRITICAL: Do NOT create package.json in dist/router directory (used for direct file requires)
    # Only create it in node_modules for package resolution
    echo -e "${CYAN}    Creating package.json in node_modules only...${NC}"
    cat > "node_modules/@alexa-multi-agent/router/package.json" << 'EOF'
{
  "name": "@alexa-multi-agent/router",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "commonjs"
}
EOF
    
    # CRITICAL: Remove any package.json from dist/router to prevent Node.js from treating it as a package
    # when requiring files directly via absolute paths
    if [ -f "dist/router/package.json" ]; then
      echo -e "${CYAN}    Removing package.json from dist/router to prevent package resolution...${NC}"
      rm -f "dist/router/package.json"
    fi
    
    # Verify package.json was created
    if [ ! -f "node_modules/@alexa-multi-agent/router/package.json" ]; then
      echo -e "${RED}  ❌ ERROR: Failed to create router package.json${NC}"
      exit 1
    fi
    
    # Show package.json contents for verification
    echo -e "${CYAN}    package.json contents:${NC}"
    cat "node_modules/@alexa-multi-agent/router/package.json" | sed 's/^/      /'
    
    # Verify module resolution path
    echo -e "${CYAN}    Verifying module resolution:${NC}"
    echo -e "${CYAN}      Main entry: dist/index.js${NC}"
    echo -e "${CYAN}      Full path: node_modules/@alexa-multi-agent/router/dist/index.js${NC}"
    if [ -f "node_modules/@alexa-multi-agent/router/dist/index.js" ]; then
      echo -e "${GREEN}      ✅ Module resolution path is correct${NC}"
    else
      echo -e "${RED}      ❌ Module resolution path is incorrect${NC}"
    fi
    
    echo -e "${GREEN}  ✅ @alexa-multi-agent/router bundled${NC}"
else
    echo -e "${YELLOW}  ⚠️  Router dist directory not found: $PROJECT_ROOT/packages/router/dist${NC}"
    echo -e "${YELLOW}     This is expected if router hasn't been built yet${NC}"
fi

# Bundle event-system if it exists (needed by router and universal-agent)
if [ -d "$PROJECT_ROOT/packages/event-system/dist" ]; then
    echo -e "${YELLOW}  Bundling @alexa-multi-agent/event-system...${NC}"
    # Create event-system directory first
    mkdir -p "node_modules/@alexa-multi-agent/event-system"
    # Copy the entire dist directory to event-system root (not event-system/dist/)
    # This matches the package.json "main": "dist/index.js" structure
    cp -r "$PROJECT_ROOT/packages/event-system/dist" "node_modules/@alexa-multi-agent/event-system/" 2>/dev/null || true
    
    # Also create @storytailor/event-system alias for compatibility
    mkdir -p "node_modules/@storytailor/event-system"
    cp -r "$PROJECT_ROOT/packages/event-system/dist" "node_modules/@storytailor/event-system/" 2>/dev/null || true
    
    # Create package.json for event-system module (both names for compatibility)
    cat > "node_modules/@alexa-multi-agent/event-system/package.json" << 'EOF'
{
  "name": "@alexa-multi-agent/event-system",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "commonjs"
}
EOF
    cat > "node_modules/@storytailor/event-system/package.json" << 'EOF'
{
  "name": "@storytailor/event-system",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "commonjs"
}
EOF
    echo -e "${GREEN}  ✅ @alexa-multi-agent/event-system bundled (also as @storytailor/event-system)${NC}"
fi

# Bundle voice-synthesis if it exists (needed for WebVTT service)
if [ -d "$PROJECT_ROOT/packages/voice-synthesis/dist" ]; then
    echo -e "${YELLOW}  Bundling @alexa-multi-agent/voice-synthesis...${NC}"
    echo -e "${CYAN}    Source: $PROJECT_ROOT/packages/voice-synthesis/dist${NC}"
    
    # Remove any existing voice-synthesis directory
    if [ -e "node_modules/@alexa-multi-agent/voice-synthesis" ]; then
      echo -e "${CYAN}    Removing existing voice-synthesis (may be symlink from npm install)...${NC}"
      rm -rf "node_modules/@alexa-multi-agent/voice-synthesis" 2>&1 | sed 's/^/      /' || true
    fi
    
    # Create voice-synthesis directory
    mkdir -p "node_modules/@alexa-multi-agent/voice-synthesis"
    echo -e "${CYAN}    Created directory: node_modules/@alexa-multi-agent/voice-synthesis${NC}"
    
    # Copy the entire dist directory
    echo -e "${CYAN}    Copying dist directory...${NC}"
    cp -r "$PROJECT_ROOT/packages/voice-synthesis/dist" "node_modules/@alexa-multi-agent/voice-synthesis/" 2>&1 | sed 's/^/      /' || {
      echo -e "${YELLOW}    ⚠️  Voice synthesis copy failed (non-critical if not using WebVTT)${NC}"
    }
    
    # Also copy to dist directory as fallback (for direct require paths)
    echo -e "${CYAN}    Copying voice-synthesis to dist directory as fallback...${NC}"
    mkdir -p "dist/voice-synthesis"
    cp -r "$PROJECT_ROOT/packages/voice-synthesis/dist"/* "dist/voice-synthesis/" 2>&1 | sed 's/^/      /' || {
      echo -e "${YELLOW}    ⚠️  Fallback copy failed (non-critical)${NC}"
    }
    
    # Create package.json for voice-synthesis module
    echo -e "${CYAN}    Creating package.json...${NC}"
    cat > "node_modules/@alexa-multi-agent/voice-synthesis/package.json" << 'EOF'
{
  "name": "@alexa-multi-agent/voice-synthesis",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "commonjs"
}
EOF
    
    # Verify key files exist
    if [ -f "node_modules/@alexa-multi-agent/voice-synthesis/dist/VoiceService.js" ]; then
      echo -e "${GREEN}      ✅ VoiceService.js exists${NC}"
    else
      echo -e "${YELLOW}      ⚠️  VoiceService.js not found (WebVTT may have limited functionality)${NC}"
    fi
    
    echo -e "${GREEN}  ✅ @alexa-multi-agent/voice-synthesis bundled${NC}"
else
    echo -e "${YELLOW}  ⚠️  Voice synthesis dist directory not found: $PROJECT_ROOT/packages/voice-synthesis/dist${NC}"
    echo -e "${YELLOW}     WebVTT service will have limited functionality${NC}"
fi

# Bundle a2a-adapter if it exists (needed for RESTAPIGateway)
if [ -d "$PROJECT_ROOT/packages/a2a-adapter/dist" ]; then
    echo -e "${YELLOW}  Bundling @alexa-multi-agent/a2a-adapter...${NC}"
    
    # Remove any existing a2a-adapter directory
    if [ -e "node_modules/@alexa-multi-agent/a2a-adapter" ]; then
      echo -e "${CYAN}    Removing existing a2a-adapter...${NC}"
      rm -rf "node_modules/@alexa-multi-agent/a2a-adapter" 2>&1 | sed 's/^/      /' || true
    fi
    
    # Create a2a-adapter directory
    mkdir -p "node_modules/@alexa-multi-agent/a2a-adapter"
    
    # Copy the entire dist directory
    cp -r "$PROJECT_ROOT/packages/a2a-adapter/dist" "node_modules/@alexa-multi-agent/a2a-adapter/" 2>&1 | sed 's/^/      /' || {
      echo -e "${RED}    ❌ a2a-adapter copy failed${NC}"
      exit 1
    }
    
    # Create package.json for a2a-adapter module
    cat > "node_modules/@alexa-multi-agent/a2a-adapter/package.json" << 'EOF'
{
  "name": "@alexa-multi-agent/a2a-adapter",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "commonjs"
}
EOF
    
    echo -e "${GREEN}  ✅ @alexa-multi-agent/a2a-adapter bundled${NC}"
else
    echo -e "${RED}  ❌ ERROR: a2a-adapter dist directory not found: $PROJECT_ROOT/packages/a2a-adapter/dist${NC}"
    echo -e "${RED}     RESTAPIGateway requires a2a-adapter${NC}"
    exit 1
fi

# Bundle library-agent if it exists (needed for LibraryService)
if [ -d "$PROJECT_ROOT/packages/library-agent/dist" ]; then
    echo -e "${YELLOW}  Bundling @alexa-multi-agent/library-agent...${NC}"
    
    # Remove any existing library-agent directory
    if [ -e "node_modules/@alexa-multi-agent/library-agent" ]; then
      echo -e "${CYAN}    Removing existing library-agent...${NC}"
      rm -rf "node_modules/@alexa-multi-agent/library-agent" 2>&1 | sed 's/^/      /' || true
    fi
    
    # Create library-agent directory
    mkdir -p "node_modules/@alexa-multi-agent/library-agent"
    
    # Copy the entire dist directory
    cp -r "$PROJECT_ROOT/packages/library-agent/dist" "node_modules/@alexa-multi-agent/library-agent/" 2>&1 | sed 's/^/      /' || {
      echo -e "${RED}    ❌ library-agent copy failed${NC}"
      exit 1
    }
    
    # Create package.json for library-agent module
    cat > "node_modules/@alexa-multi-agent/library-agent/package.json" << 'EOF'
{
  "name": "@alexa-multi-agent/library-agent",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "commonjs"
}
EOF
    
    echo -e "${GREEN}  ✅ @alexa-multi-agent/library-agent bundled${NC}"
else
    echo -e "${RED}  ❌ ERROR: library-agent dist directory not found: $PROJECT_ROOT/packages/library-agent/dist${NC}"
    echo -e "${RED}     RESTAPIGateway requires library-agent${NC}"
    exit 1
fi

# Bundle commerce-agent if it exists (needed for CommerceAgent)
if [ -d "$PROJECT_ROOT/packages/commerce-agent/dist" ]; then
    echo -e "${YELLOW}  Bundling @alexa-multi-agent/commerce-agent...${NC}"
    
    # Remove any existing commerce-agent directory
    if [ -e "node_modules/@alexa-multi-agent/commerce-agent" ]; then
      echo -e "${CYAN}    Removing existing commerce-agent...${NC}"
      rm -rf "node_modules/@alexa-multi-agent/commerce-agent" 2>&1 | sed 's/^/      /' || true
    fi
    
    # Create commerce-agent directory
    mkdir -p "node_modules/@alexa-multi-agent/commerce-agent"
    
    # Copy the entire dist directory
    cp -r "$PROJECT_ROOT/packages/commerce-agent/dist" "node_modules/@alexa-multi-agent/commerce-agent/" 2>&1 | sed 's/^/      /' || {
      echo -e "${RED}    ❌ commerce-agent copy failed${NC}"
      exit 1
    }
    
    # Create package.json for commerce-agent module
    cat > "node_modules/@alexa-multi-agent/commerce-agent/package.json" << 'EOF'
{
  "name": "@alexa-multi-agent/commerce-agent",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "commonjs"
}
EOF
    
    echo -e "${GREEN}  ✅ @alexa-multi-agent/commerce-agent bundled${NC}"
else
    echo -e "${RED}  ❌ ERROR: commerce-agent dist directory not found: $PROJECT_ROOT/packages/commerce-agent/dist${NC}"
    echo -e "${RED}     RESTAPIGateway requires commerce-agent${NC}"
    exit 1
fi

# Verify router bundling before zipping
if [ -d "node_modules/@alexa-multi-agent/router" ]; then
    echo -e "${YELLOW}  Verifying router bundling before zipping...${NC}"
    
    # Show directory structure
    echo -e "${CYAN}    Router directory structure:${NC}"
    find "node_modules/@alexa-multi-agent/router" -type f 2>/dev/null | head -20 | sed 's/^/      /' || echo "      (no files found)"
    
    # Check for key files
    if [ ! -f "node_modules/@alexa-multi-agent/router/dist/index.js" ]; then
        echo -e "${RED}  ❌ ERROR: Router dist/index.js not found at expected location${NC}"
        echo -e "${YELLOW}  Router directory contents:${NC}"
        ls -la "node_modules/@alexa-multi-agent/router/" 2>/dev/null | sed 's/^/      /' || echo "      Directory not accessible"
        if [ -d "node_modules/@alexa-multi-agent/router/dist" ]; then
            echo -e "${YELLOW}  dist/ directory contents:${NC}"
            ls -la "node_modules/@alexa-multi-agent/router/dist/" 2>/dev/null | sed 's/^/      /' || echo "      Directory not accessible"
        fi
        exit 1
    fi
    
    # Show file size
    ROUTER_INDEX_SIZE=$(stat -f%z "node_modules/@alexa-multi-agent/router/dist/index.js" 2>/dev/null || stat -c%s "node_modules/@alexa-multi-agent/router/dist/index.js" 2>/dev/null || echo "unknown")
    echo -e "${CYAN}    Router dist/index.js size: $ROUTER_INDEX_SIZE bytes${NC}"
    
    if [ ! -f "node_modules/@alexa-multi-agent/router/package.json" ]; then
        echo -e "${RED}  ❌ ERROR: Router package.json not found${NC}"
        exit 1
    fi
    
    ROUTER_MAIN=$(node -e "console.log(require('./node_modules/@alexa-multi-agent/router/package.json').main)" 2>/dev/null || echo "")
    if [ "$ROUTER_MAIN" != "dist/index.js" ]; then
        echo -e "${RED}  ❌ ERROR: Router package.json main entry is '$ROUTER_MAIN', expected 'dist/index.js'${NC}"
        exit 1
    fi
    
    # Count total router files
    ROUTER_FILE_COUNT=$(find "node_modules/@alexa-multi-agent/router" -type f 2>/dev/null | wc -l | tr -d ' ')
    echo -e "${CYAN}    Total router files: $ROUTER_FILE_COUNT${NC}"
    
    echo -e "${GREEN}  ✅ Router verification passed: dist/index.js exists ($ROUTER_INDEX_SIZE bytes), package.json main='dist/index.js'${NC}"
else
    echo -e "${YELLOW}  ⚠️  WARNING: Router not bundled (node_modules/@alexa-multi-agent/router not found)${NC}"
    echo -e "${YELLOW}  This is OK if router is not needed for this deployment${NC}"
fi

# Step 6: Create deployment zip
echo -e "${BLUE}📦 Step 6: Creating deployment zip...${NC}"
zip -r universal-agent-deployment.zip . >/dev/null 2>&1

if [ ! -f "universal-agent-deployment.zip" ]; then
    echo -e "${RED}❌ Error: Failed to create deployment zip${NC}"
    exit 1
fi

# Verify critical dependencies are in the zip
echo -e "${CYAN}🔍 Verifying critical dependencies in zip...${NC}"
if ! unzip -l universal-agent-deployment.zip 2>/dev/null | grep -q "node_modules/zod/"; then
    echo -e "${RED}❌ ERROR: zod not found in deployment zip${NC}"
    echo -e "${YELLOW}  Contents of zip (node_modules):${NC}"
    unzip -l universal-agent-deployment.zip 2>/dev/null | grep "node_modules/" | head -20 | sed 's/^/      /' || echo "      No node_modules found"
    exit 1
fi
if ! unzip -l universal-agent-deployment.zip 2>/dev/null | grep -q "node_modules/serverless-http/"; then
    echo -e "${RED}❌ ERROR: serverless-http not found in deployment zip${NC}"
    exit 1
fi
if ! unzip -l universal-agent-deployment.zip 2>/dev/null | grep -q "node_modules/jwks-rsa/"; then
    echo -e "${RED}❌ ERROR: jwks-rsa not found in deployment zip${NC}"
    exit 1
fi
if ! unzip -l universal-agent-deployment.zip 2>/dev/null | grep -q "node_modules/openai/"; then
    echo -e "${RED}❌ ERROR: openai not found in deployment zip${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Critical dependencies verified in zip: zod, serverless-http, jwks-rsa, and openai found${NC}"

PACKAGE_SIZE=$(ls -lh universal-agent-deployment.zip | awk '{print $5}')
PACKAGE_SIZE_BYTES=$(stat -f%z universal-agent-deployment.zip 2>/dev/null || stat -c%s universal-agent-deployment.zip 2>/dev/null || echo "0")
echo -e "${GREEN}✅ Deployment package created: $PACKAGE_SIZE${NC}"

# Verify router is in the zip file
if [ -d "node_modules/@alexa-multi-agent/router" ]; then
    echo -e "${YELLOW}  Verifying router in zip file...${NC}"
    
    # List all router files in the zip
    echo -e "${CYAN}    Router files in deployment package:${NC}"
    unzip -l universal-agent-deployment.zip 2>/dev/null | grep "@alexa-multi-agent/router" | head -20 | sed 's/^/      /' || echo "      No router files found"
    
    # Check for key files
    if unzip -l universal-agent-deployment.zip 2>/dev/null | grep -q "node_modules/@alexa-multi-agent/router/dist/index.js"; then
        echo -e "${GREEN}  ✅ Router dist/index.js found in zip file${NC}"
        # Show file size
        ROUTER_SIZE=$(unzip -l universal-agent-deployment.zip 2>/dev/null | grep "node_modules/@alexa-multi-agent/router/dist/index.js" | awk '{print $1}' || echo "unknown")
        echo -e "${CYAN}      File size: $ROUTER_SIZE bytes${NC}"
    else
        echo -e "${RED}  ❌ ERROR: Router dist/index.js NOT found in zip file${NC}"
        echo -e "${YELLOW}  Files in zip matching router:${NC}"
        unzip -l universal-agent-deployment.zip 2>/dev/null | grep "@alexa-multi-agent/router" | head -10 | sed 's/^/      /' || echo "      No router files found"
        exit 1
    fi
    
    if unzip -l universal-agent-deployment.zip 2>/dev/null | grep -q "node_modules/@alexa-multi-agent/router/package.json"; then
        echo -e "${GREEN}  ✅ Router package.json found in zip file${NC}"
    else
        echo -e "${RED}  ❌ ERROR: Router package.json NOT found in zip file${NC}"
        exit 1
    fi
fi

# Get environment variables from Parameter Store
echo -e "${BLUE}🔧 Loading environment configuration...${NC}"
# Try both parameter path formats for compatibility
SUPABASE_URL=$(aws ssm get-parameter --name "${PREFIX}/supabase/url" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
               aws ssm get-parameter --name "${PREFIX}/supabase-url" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")
AUTO_CONFIRM_USERS=$(aws ssm get-parameter --name "/storytailor-${ENVIRONMENT}/AUTO_CONFIRM_USERS" --region ${REGION} --query "Parameter.Value" --output text 2>/dev/null || echo "false")
ENABLE_KID_INTELLIGENCE=$(aws ssm get-parameter --name "/storytailor-${ENVIRONMENT}/ENABLE_KID_INTELLIGENCE" --region ${REGION} --query "Parameter.Value" --output text 2>/dev/null || echo "false")
SUPABASE_SERVICE_KEY=$(aws ssm get-parameter --name "${PREFIX}/supabase/service-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
                       aws ssm get-parameter --name "${PREFIX}/supabase-service-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
                       aws ssm get-parameter --name "${PREFIX}/supabase-service-role-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")
SUPABASE_ANON_KEY=$(aws ssm get-parameter --name "${PREFIX}/supabase/anon-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
                    aws ssm get-parameter --name "${PREFIX}/supabase-anon-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")
REDIS_URL=$(aws ssm get-parameter --name "${PREFIX}/redis-url" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || \
             aws ssm get-parameter --name "${PREFIX}/redis/url" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")

# Email service configuration
EMAIL_FROM=$(aws ssm get-parameter --name "${PREFIX}/email-from" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "magic@storytailor.com")

# Step 7: Deploy to Lambda
echo -e "${BLUE}📤 Step 7: Deploying to Lambda...${NC}"

# Check if Lambda exists
LAMBDA_EXISTS=$(aws lambda get-function --function-name "$LAMBDA_NAME" --region "$AWS_REGION" 2>&1 | grep -c "FunctionName" || echo "0")
LAMBDA_EXISTS=$(echo "$LAMBDA_EXISTS" | tr -d '\n' | head -c 1)

if [ "$LAMBDA_EXISTS" = "0" ] || [ -z "$LAMBDA_EXISTS" ]; then
    echo -e "${YELLOW}🆕 Creating new Lambda function...${NC}"
    
    if [ "$PACKAGE_SIZE_BYTES" -gt 52428800 ]; then
        echo -e "${YELLOW}⚠️  Package size > 50MB, uploading to S3 first...${NC}"
        S3_BUCKET="storytailor-lambda-deploys"
        S3_KEY="universal-agent-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).zip"
        
        if ! aws s3 ls "s3://${S3_BUCKET}" --region "$AWS_REGION" 2>/dev/null; then
            echo -e "${YELLOW}Creating S3 bucket: $S3_BUCKET${NC}"
            aws s3 mb "s3://${S3_BUCKET}" --region "$AWS_REGION"
        fi
        
        # Upload to S3 with explicit region handling
        echo -e "${CYAN}   Uploading package to S3...${NC}"
        aws s3 cp universal-agent-deployment.zip "s3://${S3_BUCKET}/${S3_KEY}" --region "$AWS_REGION" 2>&1
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Uploaded to S3: s3://${S3_BUCKET}/${S3_KEY}${NC}"
        else
            echo -e "${RED}❌ S3 upload failed${NC}"
            exit 1
        fi
        
        # Wait a moment for S3 to propagate
        sleep 2
        
        aws lambda create-function \
            --function-name "$LAMBDA_NAME" \
            --runtime nodejs22.x \
            --handler "$HANDLER" \
            --role "$LAMBDA_ROLE_ARN" \
            --code "S3Bucket=${S3_BUCKET},S3Key=${S3_KEY}" \
            --timeout 60 \
            --memory-size 512 \
            --environment Variables="{
                ENVIRONMENT='$ENVIRONMENT',
                SUPABASE_URL='$SUPABASE_URL',
                SUPABASE_SERVICE_ROLE_KEY='$SUPABASE_SERVICE_KEY',
                REDIS_URL='$REDIS_URL',
                EMAIL_FROM='$EMAIL_FROM',
                SENDGRID_FROM_EMAIL='magic@storytailor.com',
                AUTO_CONFIRM_USERS='$AUTO_CONFIRM_USERS',
                ENABLE_KID_INTELLIGENCE='$ENABLE_KID_INTELLIGENCE'
            }" \
            --region "$AWS_REGION" \
            --description "Storytailor Universal Agent - Account management, data export, and B2B onboarding with email notifications"
    else
        aws lambda create-function \
            --function-name "$LAMBDA_NAME" \
            --runtime nodejs22.x \
            --handler "$HANDLER" \
            --role "$LAMBDA_ROLE_ARN" \
            --zip-file fileb://universal-agent-deployment.zip \
            --timeout 60 \
            --memory-size 512 \
            --environment Variables="{
                ENVIRONMENT='$ENVIRONMENT',
                SUPABASE_URL='$SUPABASE_URL',
                SUPABASE_SERVICE_ROLE_KEY='$SUPABASE_SERVICE_KEY',
                SUPABASE_ANON_KEY='$SUPABASE_ANON_KEY',
                REDIS_URL='$REDIS_URL',
                EMAIL_FROM='$EMAIL_FROM',
                SENDGRID_FROM_EMAIL='magic@storytailor.com',
                AUTO_CONFIRM_USERS='$AUTO_CONFIRM_USERS',
                ENABLE_KID_INTELLIGENCE='$ENABLE_KID_INTELLIGENCE'
            }" \
            --region "$AWS_REGION" \
            --description "Storytailor Universal Agent - Account management, data export, and B2B onboarding with email notifications"
    fi
    
    echo -e "${GREEN}✅ Lambda function created${NC}"
    
    # Wait for function to be active
    echo -e "${YELLOW}⏳ Waiting for function to be active...${NC}"
    aws lambda wait function-active --function-name "$LAMBDA_NAME" --region "$AWS_REGION"
    
else
    echo -e "${YELLOW}♻️  Updating existing Lambda function...${NC}"
    
    if [ "$PACKAGE_SIZE_BYTES" -gt 52428800 ]; then
        echo -e "${YELLOW}⚠️  Package size > 50MB, uploading to S3 first...${NC}"
        S3_BUCKET="storytailor-lambda-deploys"
        S3_KEY="universal-agent-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).zip"
        
        # Get actual S3 bucket region (null means us-east-1)
        S3_BUCKET_REGION_RAW=$(aws s3api get-bucket-location --bucket "$S3_BUCKET" 2>/dev/null || echo '{"LocationConstraint": null}')
        if echo "$S3_BUCKET_REGION_RAW" | grep -q '"LocationConstraint": null'; then
            S3_BUCKET_REGION="us-east-1"
        else
            S3_BUCKET_REGION=$(echo "$S3_BUCKET_REGION_RAW" | grep -o '"LocationConstraint": "[^"]*"' | sed 's/.*"LocationConstraint": "\([^"]*\)".*/\1/' || echo "us-east-1")
        fi
        
        # Check if bucket exists, create in Lambda region if needed
        if ! aws s3api head-bucket --bucket "$S3_BUCKET" 2>/dev/null; then
            echo -e "${YELLOW}Creating S3 bucket: $S3_BUCKET in region $AWS_REGION${NC}"
            aws s3 mb "s3://${S3_BUCKET}" --region "$AWS_REGION"
            S3_BUCKET_REGION="$AWS_REGION"
        fi
        
        # Upload to S3 using the bucket's actual region
        echo -e "${CYAN}   Uploading package to S3 (bucket region: $S3_BUCKET_REGION)...${NC}"
        if [ "$S3_BUCKET_REGION" != "$AWS_REGION" ]; then
            echo -e "${YELLOW}   ⚠️  S3 bucket is in $S3_BUCKET_REGION, Lambda is in $AWS_REGION${NC}"
            echo -e "${YELLOW}   Using region-specific S3 endpoint...${NC}"
        fi
        
        aws s3 cp universal-agent-deployment.zip "s3://${S3_BUCKET}/${S3_KEY}" --region "$S3_BUCKET_REGION" 2>&1
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Uploaded to S3: s3://${S3_BUCKET}/${S3_KEY}${NC}"
        else
            echo -e "${RED}❌ S3 upload failed${NC}"
            exit 1
        fi
        
        # Wait for S3 to propagate (especially important for cross-region)
        if [ "$S3_BUCKET_REGION" != "$AWS_REGION" ]; then
            echo -e "${CYAN}   Waiting for S3 cross-region propagation (5 seconds)...${NC}"
            sleep 5
        else
            sleep 2
        fi
        
        # Update Lambda from S3
        echo -e "${CYAN}   Updating Lambda from S3...${NC}"
        if aws lambda update-function-code \
            --function-name "$LAMBDA_NAME" \
            --s3-bucket "$S3_BUCKET" \
            --s3-key "$S3_KEY" \
            --region "$AWS_REGION" 2>&1; then
            echo -e "${GREEN}✅ Lambda updated from S3 successfully${NC}"
        else
            echo -e "${RED}❌ S3 update failed - trying alternative approach...${NC}"
            # Alternative: Create a bucket in the Lambda's region
            S3_BUCKET_REGIONAL="storytailor-lambda-deploys-${AWS_REGION}"
            echo -e "${YELLOW}   Creating regional S3 bucket: $S3_BUCKET_REGIONAL in $AWS_REGION${NC}"
            aws s3 mb "s3://${S3_BUCKET_REGIONAL}" --region "$AWS_REGION" 2>/dev/null || true
            S3_KEY_REGIONAL="universal-agent-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).zip"
            aws s3 cp universal-agent-deployment.zip "s3://${S3_BUCKET_REGIONAL}/${S3_KEY_REGIONAL}" --region "$AWS_REGION"
            sleep 2
            aws lambda update-function-code \
                --function-name "$LAMBDA_NAME" \
                --s3-bucket "$S3_BUCKET_REGIONAL" \
                --s3-key "$S3_KEY_REGIONAL" \
                --region "$AWS_REGION"
        fi
    else
        # Update function code
        aws lambda update-function-code \
            --function-name "$LAMBDA_NAME" \
            --zip-file fileb://universal-agent-deployment.zip \
            --region "$AWS_REGION"
    fi
    
    # Wait for update to complete
    aws lambda wait function-updated --function-name "$LAMBDA_NAME" --region "$AWS_REGION"
    
    # Update function configuration
    aws lambda update-function-configuration \
        --function-name "$LAMBDA_NAME" \
        --handler "$HANDLER" \
        --timeout 60 \
        --memory-size 512 \
        --environment Variables="{
            ENVIRONMENT='$ENVIRONMENT',
            SUPABASE_URL='$SUPABASE_URL',
            SUPABASE_SERVICE_ROLE_KEY='$SUPABASE_SERVICE_KEY',
            SUPABASE_ANON_KEY='$SUPABASE_ANON_KEY',
            REDIS_URL='$REDIS_URL',
            EMAIL_FROM='$EMAIL_FROM',
            SENDGRID_FROM_EMAIL='magic@storytailor.com',
            AUTO_CONFIRM_USERS='$AUTO_CONFIRM_USERS',
            ENABLE_KID_INTELLIGENCE='$ENABLE_KID_INTELLIGENCE'
        }" \
        --region "$AWS_REGION"
    
    echo -e "${GREEN}✅ Lambda function updated${NC}"
fi

# Cleanup deployment directory
cd "$PROJECT_ROOT"
rm -rf "$DEPLOY_DIR"

# Test invocation
echo -e "${BLUE}🧪 Testing Universal Agent...${NC}"
TEST_RESPONSE=$(aws lambda invoke \
    --function-name "$LAMBDA_NAME" \
    --region "$AWS_REGION" \
    --payload '{"action":"health"}' \
    --cli-binary-format raw-in-base64-out \
    /tmp/universal-agent-test-response.json 2>&1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Test invocation successful${NC}"
    cat /tmp/universal-agent-test-response.json | jq '.' 2>/dev/null || cat /tmp/universal-agent-test-response.json
    echo ""
else
    echo -e "${YELLOW}⚠️  Test invocation had issues (function may still be deploying)${NC}"
fi

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                  🎉 LIBRARY AGENT DEPLOYED! 🎉                   ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Lambda Function: ${LAMBDA_NAME}${NC}"
echo -e "${CYAN}Region: ${AWS_REGION}${NC}"
echo -e "${CYAN}Handler: ${HANDLER}${NC}"
echo ""
echo -e "${GREEN}✅ Universal Agent is ready to handle:${NC}"
echo "   • Story management (create, read, update, delete)"
echo "   • Character management (create, read, update, delete)"
echo "   • Account deletion requested, data export completed, B2B onboarding emails ⭐ NEW"
echo "   • Transfer emails (request, sent, accepted, rejected) ⭐ NEW"
echo "   • Transfer emails (request, sent, accepted, rejected) ⭐ NEW"


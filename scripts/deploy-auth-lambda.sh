#!/bin/bash
# Deploy Lambda Function with Authentication
# This script creates and deploys a Lambda function with full authentication support
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENVIRONMENT=${1:-staging}
PREFIX="/storytailor-${ENVIRONMENT}"

echo -e "${BLUE}🚀 Deploying Lambda Function with Authentication${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}================================================${NC}"

# Get AWS info
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region || echo "us-east-1")

echo -e "${GREEN}✅ AWS Account: ${AWS_ACCOUNT_ID}${NC}"
echo -e "${GREEN}✅ AWS Region: ${AWS_REGION}${NC}"

# Create temporary directory for Lambda function
TEMP_DIR=$(mktemp -d)
echo -e "${BLUE}Working directory: $TEMP_DIR${NC}"

# Create package.json
cat > "$TEMP_DIR/package.json" << EOF
{
  "name": "storytailor-api-auth",
  "version": "1.0.0",
  "description": "Storytailor API Lambda function with authentication",
  "main": "index.js",
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "openai": "^4.20.0",
    "axios": "^1.6.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "joi": "^17.11.0"
  }
}
EOF

# Create main handler with authentication
cat > "$TEMP_DIR/index.js" << 'EOF'
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Joi = require('joi');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET;

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().max(50).required(),
  lastName: Joi.string().max(50).required(),
  age: Joi.number().integer().min(3).max(120).required(),
  userType: Joi.string().valid(
    'child', 'parent', 'guardian', 'grandparent', 'aunt_uncle', 
    'older_sibling', 'foster_caregiver', 'teacher', 'librarian', 
    'afterschool_leader', 'childcare_provider', 'nanny', 
    'child_life_specialist', 'therapist', 'medical_professional', 
    'coach_mentor', 'enthusiast', 'other'
  ).required(),
  parentEmail: Joi.string().email().when('age', {
    is: Joi.number().less(13),
    then: Joi.required(),
    otherwise: Joi.optional()
  })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Helper functions
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { sub: userId, type: 'access' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  
  const refreshToken = jwt.sign(
    { sub: userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  return {
    accessToken,
    refreshToken,
    expiresIn: 3600
  };
};

const validateToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const authenticateRequest = (event) => {
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  const payload = validateToken(token);
  
  return payload && payload.type === 'access' ? payload : null;
};

exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Parse the request
    const { httpMethod, path: rawPath, body, queryStringParameters } = event;
    const requestBody = body ? JSON.parse(body) : {};
    
    // Remove staging prefix from path if it exists
    const path = rawPath ? rawPath.replace(/^\/staging/, '') || '/' : '/';
    
    // CORS headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };
    
    // Handle OPTIONS requests for CORS
    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }
    
    // Handle different routes
    switch (path) {
      case '/health':
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: process.env.ENVIRONMENT,
            version: '2.0.0',
            features: ['authentication', 'stories', 'database']
          })
        };
      
      // Authentication routes
      case '/v1/auth/register':
        if (httpMethod === 'POST') {
          const { error: validationError, value } = registerSchema.validate(requestBody);
          if (validationError) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({
                success: false,
                error: 'Validation Error',
                details: validationError.details[0].message
              })
            };
          }
          
          const { email, password, firstName, lastName, age, userType, parentEmail } = value;
          
          // Check if user already exists
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();
          
          if (existingUser) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({
                success: false,
                error: 'User already exists'
              })
            };
          }
          
          // Create user with Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                first_name: firstName,
                last_name: lastName,
                age,
                user_type: userType,
                parent_email: parentEmail,
                is_coppa_protected: age < 13
              }
            }
          });
          
          if (authError) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({
                success: false,
                error: authError.message
              })
            };
          }
          
          // Generate tokens
          const tokens = generateTokens(authData.user.id);
          
          return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
              success: true,
              user: {
                id: authData.user.id,
                email,
                firstName,
                lastName,
                age,
                isCoppaProtected: age && age < 13,
                parentConsentRequired: age && age < 13
              },
              tokens
            })
          };
        }
        break;
      
      case '/v1/auth/login':
        if (httpMethod === 'POST') {
          const { error: validationError, value } = loginSchema.validate(requestBody);
          if (validationError) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({
                success: false,
                error: 'Validation Error',
                details: validationError.details[0].message
              })
            };
          }
          
          const { email, password } = value;
          
          // Authenticate with Supabase
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          if (authError) {
            return {
              statusCode: 401,
              headers,
              body: JSON.stringify({
                success: false,
                error: 'Invalid email or password'
              })
            };
          }
          
          // Get user data
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single();
          
          // Update last login
          await supabase
            .from('users')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', authData.user.id);
          
          // Generate tokens
          const tokens = generateTokens(authData.user.id);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              user: {
                id: authData.user.id,
                email: authData.user.email,
                firstName: userData?.first_name,
                lastName: userData?.last_name,
                age: userData?.age,
                isCoppaProtected: userData?.is_coppa_protected || false,
                parentConsentVerified: userData?.parent_consent_verified || false,
                lastLoginAt: new Date().toISOString()
              },
              tokens
            })
          };
        }
        break;
      
      case '/v1/auth/me':
        if (httpMethod === 'GET') {
          const authPayload = authenticateRequest(event);
          if (!authPayload) {
            return {
              statusCode: 401,
              headers,
              body: JSON.stringify({
                success: false,
                error: 'Authorization token required'
              })
            };
          }
          
          // Get user data
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', authPayload.sub)
            .single();
          
          if (error || !userData) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({
                success: false,
                error: 'User not found'
              })
            };
          }
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              user: {
                id: userData.id,
                email: userData.email,
                firstName: userData.first_name,
                lastName: userData.last_name,
                age: userData.age,
                isCoppaProtected: userData.is_coppa_protected,
                parentConsentVerified: userData.parent_consent_verified,
                isEmailConfirmed: userData.email_confirmed,
                lastLoginAt: userData.last_login_at,
                createdAt: userData.created_at
              }
            })
          };
        }
        break;
      
      case '/v1/auth/refresh':
        if (httpMethod === 'POST') {
          const { refreshToken } = requestBody;
          if (!refreshToken) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({
                success: false,
                error: 'Refresh token required'
              })
            };
          }
          
          const payload = validateToken(refreshToken);
          if (!payload || payload.type !== 'refresh') {
            return {
              statusCode: 401,
              headers,
              body: JSON.stringify({
                success: false,
                error: 'Invalid refresh token'
              })
            };
          }
          
          // Generate new tokens
          const tokens = generateTokens(payload.sub);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              tokens
            })
          };
        }
        break;
      
      // Protected stories routes
      case '/v1/stories':
        const authPayload = authenticateRequest(event);
        if (!authPayload) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'Authorization required',
              code: 'AUTH_TOKEN_MISSING'
            })
          };
        }
        
        if (httpMethod === 'GET') {
          // Get stories for authenticated user
          const { data, error } = await supabase
            .from('stories')
            .select('*')
            .eq('user_id', authPayload.sub)
            .order('created_at', { ascending: false })
            .limit(10);
          
          if (error) throw error;
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: true,
              stories: data || [],
              count: data ? data.length : 0
            })
          };
        } else if (httpMethod === 'POST') {
          // Create story for authenticated user
          const storyData = {
            user_id: authPayload.sub,
            title: requestBody.title || 'Untitled Story',
            content: requestBody.content || '',
            description: requestBody.description || '',
            age_range: requestBody.age_range || '3-8',
            themes: requestBody.themes || [],
            metadata: requestBody.metadata || {}
          };
          
          const { data, error } = await supabase
            .from('stories')
            .insert([storyData])
            .select();
          
          if (error) throw error;
          
          return {
            statusCode: 201,
            headers,
            body: JSON.stringify({ 
              success: true,
              story: data[0] 
            })
          };
        }
        break;
      
      // Legacy routes (for backward compatibility)
      case '/stories':
        if (httpMethod === 'GET') {
          const { data, error } = await supabase
            .from('stories')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
          
          if (error) throw error;
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: true,
              stories: data || [],
              count: data ? data.length : 0
            })
          };
        } else if (httpMethod === 'POST') {
          const storyData = {
            title: requestBody.title || 'Untitled Story',
            content: requestBody.content || '',
            description: requestBody.description || '',
            age_range: requestBody.age_range || '3-8',
            themes: requestBody.themes || [],
            metadata: requestBody.metadata || {}
          };
          
          const { data, error } = await supabase
            .from('stories')
            .insert([storyData])
            .select();
          
          if (error) throw error;
          
          return {
            statusCode: 201,
            headers,
            body: JSON.stringify({ 
              success: true,
              story: data[0] 
            })
          };
        }
        break;
      
      case '/test-db':
        const { data, error } = await supabase
          .from('stories')
          .select('count(*)', { count: 'exact' });
        
        if (error) throw error;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            database: 'connected',
            story_count: data.length,
            timestamp: new Date().toISOString()
          })
        };
      
      default:
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ 
            success: false,
            error: 'Not found',
            path: path,
            method: httpMethod,
            availableEndpoints: [
              '/health',
              '/v1/auth/register',
              '/v1/auth/login',
              '/v1/auth/me',
              '/v1/auth/refresh',
              '/v1/stories',
              '/stories',
              '/test-db'
            ]
          })
        };
    }
    
  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
EOF

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
cd "$TEMP_DIR"
npm install --production --silent
cd - > /dev/null

echo -e "${YELLOW}📦 Creating deployment package...${NC}"
PACKAGE_FILE="/tmp/storytailor-api-auth-${ENVIRONMENT}.zip"
cd "$TEMP_DIR"
zip -r "$PACKAGE_FILE" . -q
cd - > /dev/null

echo -e "${GREEN}✅ Package created: $(basename $PACKAGE_FILE)${NC}"

# Get environment variables
echo -e "${YELLOW}📋 Getting environment variables...${NC}"
SUPABASE_URL=$(aws ssm get-parameter --name "${PREFIX}/supabase/url" --query 'Parameter.Value' --output text)
SUPABASE_SERVICE_KEY=$(aws ssm get-parameter --name "${PREFIX}/supabase/service_key" --with-decryption --query 'Parameter.Value' --output text)
OPENAI_API_KEY=$(aws ssm get-parameter --name "${PREFIX}/openai/api_key" --with-decryption --query 'Parameter.Value' --output text)
ELEVENLABS_API_KEY=$(aws ssm get-parameter --name "${PREFIX}/elevenlabs/api_key" --with-decryption --query 'Parameter.Value' --output text)
JWT_SECRET=$(aws ssm get-parameter --name "${PREFIX}/jwt/secret" --with-decryption --query 'Parameter.Value' --output text)

# Deploy Lambda function
FUNCTION_NAME="storytailor-api-${ENVIRONMENT}"

echo -e "${YELLOW}🔄 Updating Lambda function with authentication...${NC}"

# Update function code
aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://$PACKAGE_FILE" \
    --output table > /dev/null

echo -e "${YELLOW}⏳ Waiting for code update to complete...${NC}"
sleep 15

# Update function configuration
aws lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --handler "index.handler" \
    --timeout 60 \
    --memory-size 512 \
    --environment Variables="{
        ENVIRONMENT=$ENVIRONMENT,
        SUPABASE_URL=$SUPABASE_URL,
        SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY,
        OPENAI_API_KEY=$OPENAI_API_KEY,
        ELEVENLABS_API_KEY=$ELEVENLABS_API_KEY,
        JWT_SECRET=$JWT_SECRET
    }" \
    --output table > /dev/null

echo -e "${GREEN}✅ Function updated with authentication${NC}"

# Test the function
echo -e "${YELLOW}🧪 Testing deployed function...${NC}"

# Test health endpoint with proper JSON
echo '{"httpMethod":"GET","path":"/health","headers":{},"queryStringParameters":null}' > /tmp/test-payload.json
HEALTH_RESPONSE=$(aws lambda invoke \
    --function-name "$FUNCTION_NAME" \
    --payload file:///tmp/test-payload.json \
    /tmp/lambda-response.json \
    --output text --query 'StatusCode')

if [ "$HEALTH_RESPONSE" = "200" ] && [ -f /tmp/lambda-response.json ]; then
    echo -e "${GREEN}✅ Health check test successful${NC}"
    echo -e "${BLUE}Response: $(cat /tmp/lambda-response.json)${NC}"
else
    echo -e "${RED}❌ Health check test failed${NC}"
    echo -e "${RED}Status Code: $HEALTH_RESPONSE${NC}"
    if [ -f /tmp/lambda-response.json ]; then
        echo -e "${RED}Response: $(cat /tmp/lambda-response.json)${NC}"
    fi
fi

# Clean up
rm -rf "$TEMP_DIR"
rm -f "$PACKAGE_FILE"
rm -f /tmp/lambda-response.json

echo ""
echo -e "${GREEN}🎉 Lambda deployment with authentication completed!${NC}"
echo ""
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo -e "${GREEN}✅ Function: ${FUNCTION_NAME}${NC}"
echo -e "${BLUE}   Runtime: Node.js 18.x${NC}"
echo -e "${BLUE}   Memory: 512 MB${NC}"
echo -e "${BLUE}   Timeout: 60 seconds${NC}"
echo -e "${BLUE}   Features: Authentication, Stories, Database${NC}"
echo ""
echo -e "${BLUE}Available endpoints:${NC}"
echo -e "${BLUE}   GET  /health              - Health check${NC}"
echo -e "${BLUE}   POST /v1/auth/register    - User registration${NC}"
echo -e "${BLUE}   POST /v1/auth/login       - User login${NC}"
echo -e "${BLUE}   GET  /v1/auth/me          - Get user profile${NC}"
echo -e "${BLUE}   POST /v1/auth/refresh     - Refresh token${NC}"
echo -e "${BLUE}   GET  /v1/stories          - List user stories (auth required)${NC}"
echo -e "${BLUE}   POST /v1/stories          - Create story (auth required)${NC}"
echo -e "${BLUE}   GET  /stories             - List all stories (legacy)${NC}"
echo -e "${BLUE}   POST /stories             - Create story (legacy)${NC}"
echo -e "${BLUE}   GET  /test-db             - Test database${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "${BLUE}1. Test authentication endpoints${NC}"
echo -e "${BLUE}2. Verify JWT token validation${NC}"
echo -e "${BLUE}3. Test protected routes${NC}"
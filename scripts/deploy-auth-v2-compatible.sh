#!/bin/bash
# Deploy Lambda Function Compatible with HTTP API Gateway v2
set -e

echo "🚀 Deploying HTTP API Gateway v2 Compatible Lambda"
echo "=================================================="

ENVIRONMENT=${1:-staging}
FUNCTION_NAME="storytailor-api-${ENVIRONMENT}"

# Create temporary directory
TEMP_DIR=$(mktemp -d)
echo "Working directory: $TEMP_DIR"

# Create package.json
cat > "$TEMP_DIR/package.json" << EOF
{
  "name": "storytailor-api-auth-v2",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "joi": "^17.11.0"
  }
}
EOF

# Create HTTP API Gateway v2 compatible handler
cat > "$TEMP_DIR/index.js" << 'EOF'
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const Joi = require('joi');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
  
  return { accessToken, refreshToken, expiresIn: 3600 };
};

const validateToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const authenticateRequest = (event) => {
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  
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
    // HTTP API Gateway v2 format
    const { requestContext, body, headers } = event;
    const httpMethod = requestContext.http.method;
    let path = requestContext.http.path;
    
    // Remove staging prefix if present
    if (path.startsWith('/staging')) {
      path = path.substring(8) || '/';
    }
    
    const requestBody = body ? JSON.parse(body) : {};
    
    // CORS headers
    const responseHeaders = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };
    
    // Handle OPTIONS requests for CORS
    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: responseHeaders,
        body: ''
      };
    }
    
    console.log(`Processing ${httpMethod} ${path}`);
    
    // Route handling
    switch (path) {
      case '/health':
        return {
          statusCode: 200,
          headers: responseHeaders,
          body: JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: process.env.ENVIRONMENT || 'staging',
            version: '2.1.0',
            features: ['authentication', 'stories', 'database'],
            apiGateway: 'v2'
          })
        };
      
      case '/v1/auth/register':
        if (httpMethod === 'POST') {
          const { error: validationError, value } = registerSchema.validate(requestBody);
          if (validationError) {
            return {
              statusCode: 400,
              headers: responseHeaders,
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
              headers: responseHeaders,
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
              headers: responseHeaders,
              body: JSON.stringify({
                success: false,
                error: authError.message
              })
            };
          }
          
          const tokens = generateTokens(authData.user.id);
          
          return {
            statusCode: 201,
            headers: responseHeaders,
            body: JSON.stringify({
              success: true,
              user: {
                id: authData.user.id,
                email,
                firstName,
                lastName,
                age,
                isCoppaProtected: age && age < 13
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
              headers: responseHeaders,
              body: JSON.stringify({
                success: false,
                error: 'Validation Error',
                details: validationError.details[0].message
              })
            };
          }
          
          const { email, password } = value;
          
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          if (authError) {
            return {
              statusCode: 401,
              headers: responseHeaders,
              body: JSON.stringify({
                success: false,
                error: 'Invalid email or password'
              })
            };
          }
          
          const tokens = generateTokens(authData.user.id);
          
          return {
            statusCode: 200,
            headers: responseHeaders,
            body: JSON.stringify({
              success: true,
              user: {
                id: authData.user.id,
                email: authData.user.email
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
              headers: responseHeaders,
              body: JSON.stringify({
                success: false,
                error: 'Authorization token required'
              })
            };
          }
          
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', authPayload.sub)
            .single();
          
          if (error || !userData) {
            return {
              statusCode: 404,
              headers: responseHeaders,
              body: JSON.stringify({
                success: false,
                error: 'User not found'
              })
            };
          }
          
          return {
            statusCode: 200,
            headers: responseHeaders,
            body: JSON.stringify({
              success: true,
              user: {
                id: userData.id,
                email: userData.email,
                firstName: userData.first_name,
                lastName: userData.last_name
              }
            })
          };
        }
        break;
      
      case '/v1/stories':
        const authPayload = authenticateRequest(event);
        if (!authPayload) {
          return {
            statusCode: 401,
            headers: responseHeaders,
            body: JSON.stringify({
              success: false,
              error: 'Authorization required'
            })
          };
        }
        
        if (httpMethod === 'GET') {
          const { data, error } = await supabase
            .from('stories')
            .select('*')
            .eq('user_id', authPayload.sub)
            .order('created_at', { ascending: false })
            .limit(10);
          
          if (error) throw error;
          
          return {
            statusCode: 200,
            headers: responseHeaders,
            body: JSON.stringify({ 
              success: true,
              stories: data || [],
              count: data ? data.length : 0
            })
          };
        }
        break;
      
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
            headers: responseHeaders,
            body: JSON.stringify({ 
              success: true,
              stories: data || [],
              count: data ? data.length : 0
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
          headers: responseHeaders,
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
          headers: responseHeaders,
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

echo "📦 Installing dependencies..."
cd "$TEMP_DIR"
npm install --production --silent
cd - > /dev/null

echo "📦 Creating deployment package..."
PACKAGE_FILE="/tmp/storytailor-api-v2-${ENVIRONMENT}.zip"
cd "$TEMP_DIR"
zip -r "$PACKAGE_FILE" . -q
cd - > /dev/null

echo "🚀 Updating Lambda function..."
aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://$PACKAGE_FILE" > /dev/null

echo "⏳ Waiting for update..."
sleep 10

echo "✅ Lambda function updated for HTTP API Gateway v2"

# Clean up
rm -rf "$TEMP_DIR"
rm -f "$PACKAGE_FILE"

echo "🧪 Testing the updated function..."
curl -s "https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/health" | jq '.'
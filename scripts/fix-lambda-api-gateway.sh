#!/bin/bash
# Fix Lambda function for API Gateway v2 format
set -e

ENVIRONMENT=${1:-staging}
FUNCTION_NAME="storytailor-api-${ENVIRONMENT}"

echo "🔧 Updating Lambda function for API Gateway v2..."

# Create updated Lambda function code
TEMP_DIR=$(mktemp -d)

cat > "$TEMP_DIR/package.json" << EOF
{
  "name": "storytailor-api",
  "version": "1.0.0",
  "description": "Storytailor API Lambda function",
  "main": "index.js",
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "openai": "^4.20.0",
    "axios": "^1.6.0"
  }
}
EOF

# Create updated handler that works with both API Gateway v1 and v2
cat > "$TEMP_DIR/index.js" << 'EOF'
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Handle both API Gateway v1 and v2 formats
    let httpMethod, path, body, queryStringParameters;
    
    if (event.version === '2.0') {
      // API Gateway v2 format (HTTP API)
      httpMethod = event.requestContext.http.method;
      path = event.rawPath.replace('/staging', ''); // Remove stage from path
      body = event.body;
      queryStringParameters = event.queryStringParameters;
    } else {
      // API Gateway v1 format (REST API) or direct invocation
      httpMethod = event.httpMethod || 'GET';
      path = event.path || '/health';
      body = event.body;
      queryStringParameters = event.queryStringParameters;
    }
    
    console.log('Parsed request:', { httpMethod, path, body });
    
    const requestBody = body ? JSON.parse(body) : {};
    
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
            version: '1.0.0',
            apiGatewayVersion: event.version || 'v1'
          })
        };
      
      case '/stories':
        if (httpMethod === 'GET') {
          // Get stories
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
          // Create story
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
        // Test database connection
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
            availableEndpoints: ['/health', '/stories', '/test-db']
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
PACKAGE_FILE="/tmp/storytailor-api-${ENVIRONMENT}-updated.zip"
cd "$TEMP_DIR"
zip -r "$PACKAGE_FILE" . -q
cd - > /dev/null

echo "🚀 Updating Lambda function..."
aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://$PACKAGE_FILE" \
    --output table > /dev/null

echo "✅ Lambda function updated successfully!"

# Clean up
rm -rf "$TEMP_DIR"
rm -f "$PACKAGE_FILE"

echo "🧪 Testing updated function..."
sleep 5  # Wait for function to be ready

# Test with API Gateway v2 format
cat > /tmp/test-payload.json << 'EOF'
{
  "version": "2.0",
  "routeKey": "GET /health",
  "rawPath": "/staging/health",
  "requestContext": {
    "http": {
      "method": "GET",
      "path": "/staging/health"
    }
  }
}
EOF

aws lambda invoke \
    --function-name "$FUNCTION_NAME" \
    --payload file:///tmp/test-payload.json \
    /tmp/test-response.json > /dev/null

echo "Response: $(cat /tmp/test-response.json)"

# Clean up
rm -f /tmp/test-payload.json /tmp/test-response.json

echo "🎉 Lambda function update complete!"
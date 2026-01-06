#!/bin/bash
# Deploy AI Story Generation Integration
set -e

echo "🤖 Deploying AI Story Generation Integration"
echo "==========================================="

ENVIRONMENT=${1:-staging}
FUNCTION_NAME="storytailor-api-${ENVIRONMENT}"

# Create temporary directory
TEMP_DIR=$(mktemp -d)
echo "Working directory: $TEMP_DIR"

# Create package.json with OpenAI
cat > "$TEMP_DIR/package.json" << EOF
{
  "name": "storytailor-ai-integration",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "joi": "^17.11.0",
    "openai": "^4.20.0"
  }
}
EOF

# Create AI-enhanced Lambda function
cat > "$TEMP_DIR/index.js" << 'EOF'
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const OpenAI = require('openai');

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const JWT_SECRET = process.env.JWT_SECRET;

// Validation schemas
const storyGenerationSchema = Joi.object({
  prompt: Joi.string().min(10).max(500).required(),
  ageRange: Joi.string().valid('3-5', '6-8', '9-12').default('6-8'),
  mood: Joi.string().valid('happy', 'adventurous', 'calm', 'educational').default('happy'),
  length: Joi.string().valid('short', 'medium', 'long').default('medium'),
  characters: Joi.array().items(Joi.string()).max(3).default([]),
  theme: Joi.string().max(50).optional()
});

// Helper functions
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

const generateStoryWithAI = async (prompt, options = {}) => {
  const {
    ageRange = '6-8',
    mood = 'happy',
    length = 'medium',
    characters = [],
    theme = ''
  } = options;

  // Build system prompt based on age range
  const ageGuidance = {
    '3-5': 'simple words, basic concepts, very short sentences, repetitive patterns',
    '6-8': 'elementary vocabulary, clear storylines, positive messages, 200-400 words',
    '9-12': 'more complex vocabulary, detailed plots, character development, 400-800 words'
  };

  const lengthGuidance = {
    'short': '150-250 words',
    'medium': '300-500 words', 
    'long': '500-800 words'
  };

  const systemPrompt = `You are a master children's storyteller. Create an engaging, age-appropriate story for children aged ${ageRange}.

GUIDELINES:
- Use ${ageGuidance[ageRange]}
- Target length: ${lengthGuidance[length]}
- Mood: ${mood}
- Ensure content is completely safe and appropriate
- Include positive messages and life lessons
- Make characters relatable and diverse
- End with a satisfying, uplifting conclusion

SAFETY REQUIREMENTS:
- No violence, scary content, or inappropriate themes
- Promote kindness, friendship, and positive values
- Avoid stereotypes and ensure inclusive representation
- Keep content educational and inspiring

${characters.length > 0 ? `Include these characters: ${characters.join(', ')}` : ''}
${theme ? `Theme: ${theme}` : ''}

Create a complete story with a clear beginning, middle, and end.`;

  const userPrompt = `Create a ${mood} story for children aged ${ageRange}: ${prompt}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: length === 'short' ? 400 : length === 'medium' ? 700 : 1000,
      temperature: 0.8,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    const storyContent = completion.choices[0]?.message?.content;
    if (!storyContent) {
      throw new Error('OpenAI returned empty content');
    }

    // Extract title from the story (first line or generate one)
    const lines = storyContent.split('\n').filter(line => line.trim());
    let title = 'A Wonderful Story';
    let content = storyContent;

    // Check if first line looks like a title
    if (lines[0] && lines[0].length < 100 && !lines[0].includes('.')) {
      title = lines[0].replace(/^#+\s*/, '').trim();
      content = lines.slice(1).join('\n').trim();
    }

    return {
      title,
      content,
      wordCount: content.split(/\s+/).length,
      estimatedReadingTime: Math.ceil(content.split(/\s+/).length / 150)
    };

  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error(`Story generation failed: ${error.message}`);
  }
};

exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    const { requestContext, body, headers } = event;
    const httpMethod = requestContext.http.method;
    let path = requestContext.http.path;
    
    // Remove staging prefix if present
    if (path.startsWith('/staging')) {
      path = path.substring(8) || '/';
    }

    const requestBody = body ? JSON.parse(body) : {};
    
    const responseHeaders = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };
    
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
            version: '3.0.0',
            features: ['authentication', 'stories', 'database', 'ai-generation'],
            aiIntegration: {
              openai: !!process.env.OPENAI_API_KEY,
              model: 'gpt-4'
            }
          })
        };

      case '/v1/stories/generate':
        if (httpMethod === 'POST') {
          // Authentication required for AI generation
          const authPayload = authenticateRequest(event);
          if (!authPayload) {
            return {
              statusCode: 401,
              headers: responseHeaders,
              body: JSON.stringify({
                success: false,
                error: 'Authorization required for AI story generation'
              })
            };
          }

          // Validate request
          const { error: validationError, value } = storyGenerationSchema.validate(requestBody);
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

          const { prompt, ageRange, mood, length, characters, theme } = value;

          try {
            // Generate story with AI
            const generatedStory = await generateStoryWithAI(prompt, {
              ageRange,
              mood,
              length,
              characters,
              theme
            });

            // Save to database
            const storyData = {
              user_id: authPayload.sub,
              title: generatedStory.title,
              content: generatedStory.content,
              description: `AI-generated ${mood} story for ages ${ageRange}`,
              age_range: ageRange,
              themes: [mood, ...(theme ? [theme] : [])],
              metadata: {
                aiGenerated: true,
                prompt: prompt,
                wordCount: generatedStory.wordCount,
                estimatedReadingTime: generatedStory.estimatedReadingTime,
                generationTimestamp: new Date().toISOString(),
                model: 'gpt-4'
              }
            };

            const { data, error } = await supabase
              .from('stories')
              .insert([storyData])
              .select();

            if (error) throw error;

            return {
              statusCode: 201,
              headers: responseHeaders,
              body: JSON.stringify({
                success: true,
                story: data[0],
                aiMetadata: {
                  wordCount: generatedStory.wordCount,
                  estimatedReadingTime: generatedStory.estimatedReadingTime,
                  model: 'gpt-4'
                }
              })
            };

          } catch (error) {
            console.error('Story generation error:', error);
            return {
              statusCode: 500,
              headers: responseHeaders,
              body: JSON.stringify({
                success: false,
                error: 'Story generation failed',
                message: error.message
              })
            };
          }
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
            .limit(20);
          
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
              '/v1/stories/generate (POST)',
              '/v1/stories (GET)',
              '/stories (GET)'
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
PACKAGE_FILE="/tmp/storytailor-ai-${ENVIRONMENT}.zip"
cd "$TEMP_DIR"
zip -r "$PACKAGE_FILE" . -q
cd - > /dev/null

echo "🚀 Updating Lambda function with AI integration..."
aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://$PACKAGE_FILE" > /dev/null

echo "⏳ Waiting for update..."
sleep 15

echo "✅ AI Story Generation deployed successfully"

# Clean up
rm -rf "$TEMP_DIR"
rm -f "$PACKAGE_FILE"

echo "🧪 Testing AI integration..."
curl -s "https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/health" | jq '.'
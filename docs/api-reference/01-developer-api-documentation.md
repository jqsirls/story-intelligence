# 🌟 Storytailor Developer API Documentation

> **⚡ Latest Update**: Fixed critical age validation bug and added comprehensive user type support (January 2025)

## 📋 **Table of Contents**
1. [Recent Updates](#recent-updates)
2. [Quick Start](#quick-start)
3. [Authentication](#authentication)
4. [API Reference](#api-reference)
5. [Error Codes](#error-codes)
6. [Frontend Integration](#frontend-integration)
7. [Alexa Integration](#alexa-integration)
8. [Multi-Agent Connection](#multi-agent-connection)
9. [SDKs & Libraries](#sdks--libraries)
10. [Webhooks](#webhooks)
11. [Rate Limits](#rate-limits)

---

## 🔄 **Recent Updates**

### **🚨 Critical Fix: Age Validation (January 2025)**

**Issue Resolved**: Adult registration was failing due to incorrect age validation (max 17 years)

**What Changed**:
- ✅ **Age validation**: Now accepts ages 3-120 (was 3-17)
- ✅ **User types**: Added comprehensive user type system with 18 categories
- ✅ **Required fields**: `firstName`, `lastName`, `age`, and `userType` now required
- ✅ **COPPA compliance**: Enhanced for children under 13 with `parentEmail` requirement
- ✅ **Error handling**: Improved validation error messages

**Migration Required**: YES
- Update registration calls to include `userType` field
- Update age validation logic to accept adult ages
- Add `parentEmail` for child registrations (age < 13)

**Before (Broken)**:
```json
{
  "email": "adult@example.com",
  "password": "SecurePass123!",
  "age": 40  // ❌ This would fail with "age must be ≤ 17"
}
```

**After (Fixed)**:
```json
{
  "email": "adult@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "age": 40,
  "userType": "parent"  // ✅ Now works correctly
}
```

### **📊 System Status**
- **API Health**: ✅ Operational (Version 4.0.0)
- **Success Rate**: 🎯 100% for all registration types
- **Breaking Changes**: ⚠️ YES - Update required for registration endpoints

---

## 🚀 **Quick Start**

> **Product REST API contract**: Treat `docs/api/REST_API_EXPERIENCE_MASTER.md` as canonical.  
> The `execute-api` base URL and `/v1/...` examples in this file are legacy and may not match the current product REST gateway.

### **Base URL**
```
https://staging-api.storytailor.dev/api/v1
```

### **Create an account / get JWT**
```bash
curl -X POST https://staging-api.storytailor.dev/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "...": "See docs/api/REST_API_EXPERIENCE_MASTER.md for the exact request body"
  }'
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "email": "developer@yourcompany.com"
  },
  "tokens": {
    "accessToken": "[REDACTED_JWT]",  // ← Your API Key
    "refreshToken": "[REDACTED_JWT]",
    "expiresIn": 3600
  }
}
```

### **Test Your Connection**
```bash
curl -H "Authorization: Bearer [REDACTED_JWT]" \
  https://staging-api.storytailor.dev/health
```

---

## 🔐 **Authentication**

### **Authentication Methods**
- **Bearer Token**: JWT-based authentication (recommended)
> Note: the product REST gateway uses JWT bearer tokens. Any “API key” phrasing in legacy docs refers to older surfaces and should not be used as the product REST contract.

### **Headers Required**
```http
Authorization: Bearer [REDACTED_JWT]
Content-Type: application/json
User-Agent: YourApp/1.0.0
```

### **Token Management**

#### **Refresh Token**
```bash
curl -X POST /api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```

#### **Token Validation**
```bash
curl -X POST /v1/auth/validate \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_ACCESS_TOKEN"}'
```

---

## 📚 **API Reference**

### **Authentication Endpoints**

#### **POST /v1/auth/register**
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "age": 25,
  "userType": "parent"
}
```

**Field Descriptions:**
- `email` (string, required): Valid email address
- `password` (string, required): Minimum 8 characters
- `firstName` (string, required): User's first name (max 50 chars)
- `lastName` (string, required): User's last name (max 50 chars)
- `age` (number, required): User's age (3-120 years)
- `userType` (string, required): User type from allowed list
- `parentEmail` (string, optional): Required for children under 13 (COPPA compliance)

**Valid User Types:**
- `child` - Child user (under 18)
- `parent` - Parent or primary guardian
- `guardian` - Legal guardian
- `grandparent` - Grandparent
- `aunt_uncle` - Aunt or uncle
- `older_sibling` - Older sibling caregiver
- `foster_caregiver` - Foster or kinship caregiver
- `teacher` - Teacher or educator
- `librarian` - Librarian
- `afterschool_leader` - After-school program leader
- `childcare_provider` - Childcare provider
- `nanny` - Nanny or babysitter
- `child_life_specialist` - Child life specialist
- `therapist` - Therapist or counselor
- `medical_professional` - Medical professional
- `coach_mentor` - Coach or mentor
- `enthusiast` - Storytelling enthusiast
- `other` - Other caregiver type

**COPPA Compliance Example (Child Registration):**
```json
{
  "email": "child@example.com",
  "password": "SecurePassword123!",
  "firstName": "Emma",
  "lastName": "Smith",
  "age": 8,
  "userType": "child",
  "parentEmail": "parent@example.com"
}
```

**Response (201):**
```json
{
  "success": true,
  "user": {
    "id": "5e05b6d9-8ab9-481c-9587-4e355b40ae62",
    "email": "child@example.com",
    "firstName": "Emma",
    "lastName": "Smith",
    "age": 8,
    "userType": "child",
    "isCoppaProtected": true,
    "parentConsentRequired": true
  },
  "tokens": {
    "accessToken": "[REDACTED_JWT]",
    "refreshToken": "[REDACTED_JWT]",
    "expiresIn": 3600
  }
}
```

**Response Fields:**
- `user.isCoppaProtected`: `true` if user is under 13 (COPPA protected)
- `user.parentConsentRequired`: `true` if parental consent verification is needed
- `user.userType`: The user type specified during registration

**Error Responses:**

**400 Bad Request - Validation Error:**
```json
{
  "success": false,
  "error": "Validation Error",
  "details": "\"age\" must be less than or equal to 120"
}
```

**400 Bad Request - Missing Parent Email:**
```json
{
  "success": false,
  "error": "Validation Error",
  "details": "\"parentEmail\" is required"
}
```

**409 Conflict - Email Already Exists:**
```json
{
  "success": false,
  "error": "User already exists",
  "details": "An account with this email address already exists"
}
```

#### **POST /v1/auth/login**
Authenticate existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com"
  },
  "tokens": {
    "accessToken": "[REDACTED_JWT]",
    "refreshToken": "[REDACTED_JWT]",
    "expiresIn": 3600
  }
}
```

#### **GET /v1/auth/me**
Get current user profile.

**Headers:**
```http
Authorization: Bearer [REDACTED_JWT]
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "authenticated": true
  }
}
```

### **Story Generation Endpoints**

#### **POST /v1/stories/generate**
Generate Story Intelligence™ powered stories using OpenAI GPT-4.

**Headers:**
```http
Authorization: Bearer [REDACTED_JWT]
Content-Type: application/json
```

**Request:**
```json
{
  "prompt": "Create a story about a brave little mouse",
  "ageRange": "6-8",
  "mood": "adventurous",
  "length": "medium",
  "characters": ["mouse", "cat", "owl"],
  "theme": "friendship"
}
```

**Response (201):**
```json
{
  "success": true,
  "story": {
    "id": "214bb202-9d24-4ceb-9c9e-32c08b081b40",
    "title": "The Cheese Quest",
    "content": "Once upon a time, in a quiet town...",
    "description": "AI-generated adventurous story for ages 6-8",
    "age_range": "6-8",
    "themes": ["adventurous", "friendship"],
    "metadata": {
      "aiGenerated": true,
      "model": "gpt-4",
      "wordCount": 321,
      "estimatedReadingTime": 3,
      "generationTimestamp": "2025-08-02T07:02:51.008Z"
    },
    "created_at": "2025-08-02T07:02:51.073341+00:00"
  },
  "aiMetadata": {
    "wordCount": 321,
    "estimatedReadingTime": 3,
    "model": "gpt-4"
  }
}
```

#### **GET /v1/stories**
Retrieve user's stories.

**Headers:**
```http
Authorization: Bearer [REDACTED_JWT]
```

**Response (200):**
```json
{
  "success": true,
  "stories": [
    {
      "id": "214bb202-9d24-4ceb-9c9e-32c08b081b40",
      "title": "The Cheese Quest",
      "content": "Once upon a time...",
      "age_range": "6-8",
      "themes": ["adventurous", "friendship"],
      "created_at": "2025-08-02T07:02:51.073341+00:00"
    }
  ],
  "count": 1
}
```

#### **POST /v1/stories/{id}/synthesize**
Generate audio for a story using ElevenLabs.

**Headers:**
```http
Authorization: Bearer [REDACTED_JWT]
Content-Type: application/json
```

**Request:**
```json
{
  "voiceId": "child-friendly-voice",
  "speed": 1.0,
  "includeWebVTT": true
}
```

**Response (200):**
```json
{
  "success": true,
  "audio": {
    "url": "https://cdn.storytailor.com/audio/story-123.mp3",
    "duration": 180,
    "webvttUrl": "https://cdn.storytailor.com/webvtt/story-123.vtt",
    "voiceId": "child-friendly-voice"
  }
}
```

### **System Endpoints**

#### **GET /health**
System health check.

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-02T07:02:19.315Z",
  "environment": "staging",
  "version": "4.0.0",
  "features": [
    "authentication",
    "stories",
    "database",
    "ai-generation"
  ],
  "integrations": {
    "supabase": true,
    "openai": true,
    "elevenlabs": true
  }
}
```

---

## ⚠️ **Error Codes**

### **HTTP Status Codes**
| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### **Error Response Format**
```json
{
  "success": false,
  "error": "Error Type",
  "message": "Detailed error description",
  "code": "ERROR_CODE",
  "timestamp": "2025-08-02T07:02:19.315Z",
  "details": {
    "field": "validation error details"
  }
}
```

### **Common Error Codes**
| Code | Description | Solution |
|------|-------------|----------|
| `AUTH_TOKEN_MISSING` | No authorization header | Include `Authorization: Bearer [REDACTED_JWT]
| `AUTH_TOKEN_INVALID` | Invalid or expired token | Refresh token or re-authenticate |
| `VALIDATION_ERROR` | Request validation failed | Check request parameters |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait and retry with backoff |
| `STORY_GENERATION_FAILED` | AI generation error | Retry with different prompt |
| `INSUFFICIENT_CREDITS` | Not enough API credits | Upgrade plan or add credits |

---

## 💻 **Frontend Integration**

### **JavaScript/TypeScript**

#### **Installation**
```bash
npm install @storytailor/sdk
```

#### **Basic Usage**
```typescript
import { StorytalorClient } from '@storytailor/sdk';

const client = new StorytalorClient({
  apiKey: '[REDACTED_API_KEY]',
  baseUrl: 'https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging'
});

// Generate a story
const story = await client.stories.generate({
  prompt: 'A magical adventure',
  ageRange: '6-8',
  mood: 'adventurous'
});

console.log(story.title, story.content);
```

#### **React Integration**
```jsx
import { useStorytailor } from '@storytailor/react';

function StoryGenerator() {
  const { generateStory, loading, error } = useStorytailor();
  
  const handleGenerate = async () => {
    const story = await generateStory({
      prompt: 'A brave little mouse',
      ageRange: '6-8'
    });
    console.log(story);
  };
  
  return (
    <div>
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Story'}
      </button>
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}
```

### **Embeddable Widget**

#### **HTML Integration**
```html
<!-- Webflow/HTML -->
<div data-storytailor-key="your-api-key" 
     data-storytailor-theme="magical"
     style="width: 400px; height: 600px;">
</div>
<script src="https://cdn.storytailor.com/embed/v1/storytailor-embed.js"></script>
```

#### **React Component**
```jsx
import { StorytalorEmbed } from '@storytailor/embed';

function MyApp() {
  return (
    <StorytalorEmbed
      apiKey="your-api-key"
      theme="child-friendly"
      features={{
        voice: true,
        stories: true,
        reader: true
      }}
      onStoryGenerated={(story) => {
        console.log('New story:', story);
      }}
    />
  );
}
```

#### **iframe Integration**
```html
<iframe 
  src="https://embed.storytailor.com/widget?key=your-api-key&theme=magical"
  width="400" 
  height="600"
  frameborder="0"
  allow="microphone">
</iframe>
```

### **Configuration Options**

#### **Widget Themes**
- `child-friendly` - Bright, playful colors
- `magical` - Fantasy-inspired design
- `educational` - Clean, learning-focused

#### **Features**
```javascript
{
  voice: true,           // Enable voice input/output
  stories: true,         // Show story library
  reader: true,          // Interactive story reader
  offline: true,         // Offline support
  analytics: false       // Usage analytics
}
```

---

## 🎤 **Alexa Integration**

### **Skill Configuration**

#### **Skill Manifest**
```json
{
  "manifest": {
    "publishingInformation": {
      "locales": {
        "en-US": {
          "name": "Storytailor",
          "summary": "Story Intelligence™ powered storytelling for children",
          "description": "Create personalized stories with AI"
        }
      }
    },
    "apis": {
      "custom": {
        "endpoint": {
          "uri": "https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/alexa"
        }
      }
    }
  }
}
```

#### **Interaction Model**
```json
{
  "interactionModel": {
    "languageModel": {
      "invocationName": "storytailor",
      "intents": [
        {
          "name": "GenerateStoryIntent",
          "slots": [
            {
              "name": "storyPrompt",
              "type": "AMAZON.SearchQuery"
            },
            {
              "name": "ageRange",
              "type": "AgeRangeType"
            }
          ],
          "samples": [
            "create a story about {storyPrompt}",
            "tell me a story about {storyPrompt} for {ageRange} year olds",
            "generate a {storyPrompt} story"
          ]
        }
      ],
      "types": [
        {
          "name": "AgeRangeType",
          "values": [
            {"name": {"value": "3-5"}},
            {"name": {"value": "6-8"}},
            {"name": {"value": "9-12"}}
          ]
        }
      ]
    }
  }
}
```

### **Lambda Handler for Alexa**

#### **Request Processing**
```javascript
const AlexaHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'GenerateStoryIntent';
  },
  
  async handle(handlerInput) {
    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const storyPrompt = slots.storyPrompt.value;
    const ageRange = slots.ageRange.value || '6-8';
    
    // Call Storytailor API
    const response = await fetch('https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/v1/stories/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STORYTAILOR_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: storyPrompt,
        ageRange: ageRange,
        mood: 'adventurous',
        length: 'short'
      })
    });
    
    const story = await response.json();
    
    return handlerInput.responseBuilder
      .speak(story.story.content)
      .withSimpleCard('Your Story', story.story.title)
      .getResponse();
  }
};
```

### **Account Linking**

#### **OAuth Configuration**
```json
{
  "accountLinkingRequest": {
    "type": "AUTH_CODE",
    "authorizationUri": "https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/oauth/authorize",
    "accessTokenUri": "https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/oauth/token",
    "clientId": "your-alexa-client-id",
    "scopes": ["stories:generate", "stories:read"]
  }
}
```

---

## 🤖 **Multi-Agent Connection**

### **Agent Protocol**

#### **Agent Registration**
```json
{
  "agentId": "your-agent-id",
  "name": "Your AI Agent",
  "version": "1.0.0",
  "capabilities": [
    "story-generation",
    "voice-synthesis",
    "content-safety"
  ],
  "endpoints": {
    "webhook": "https://your-agent.com/webhook",
    "health": "https://your-agent.com/health"
  },
  "authentication": {
    "type": "bearer",
    "token": "your-agent-token"
  }
}
```

#### **Message Format**
```json
{
  "messageId": "msg-123",
  "timestamp": "2025-08-02T07:02:19.315Z",
  "source": "storytailor-universal-agent",
  "target": "your-agent-id",
  "type": "story-generation-request",
  "payload": {
    "prompt": "Create a story about friendship",
    "context": {
      "userId": "user-123",
      "sessionId": "session-456",
      "preferences": {
        "ageRange": "6-8",
        "mood": "happy"
      }
    }
  },
  "metadata": {
    "priority": "normal",
    "timeout": 30000
  }
}
```

### **MCP (Model Context Protocol) Integration**

#### **Server Configuration**
```json
{
  "mcpServers": {
    "storytailor": {
      "command": "npx",
      "args": ["@storytailor/mcp-server"],
      "env": {
        "STORYTAILOR_API_KEY": "your-api-key",
        "STORYTAILOR_BASE_URL": "https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging"
      }
    }
  }
}
```

#### **Tool Definitions**
```json
{
  "tools": [
    {
      "name": "generate_story",
      "description": "Generate an Story Intelligence™ powered story",
      "inputSchema": {
        "type": "object",
        "properties": {
          "prompt": {"type": "string"},
          "ageRange": {"type": "string", "enum": ["3-5", "6-8", "9-12"]},
          "mood": {"type": "string"},
          "length": {"type": "string", "enum": ["short", "medium", "long"]}
        },
        "required": ["prompt"]
      }
    },
    {
      "name": "synthesize_audio",
      "description": "Convert story text to speech",
      "inputSchema": {
        "type": "object",
        "properties": {
          "storyId": {"type": "string"},
          "voiceId": {"type": "string"},
          "speed": {"type": "number", "minimum": 0.5, "maximum": 2.0}
        },
        "required": ["storyId"]
      }
    }
  ]
}
```

### **Agent Communication**

#### **WebSocket Connection**
```javascript
const ws = new WebSocket('wss://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/agents');

ws.on('open', () => {
  // Register agent
  ws.send(JSON.stringify({
    type: 'agent-register',
    agentId: 'your-agent-id',
    capabilities: ['story-generation']
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  
  if (message.type === 'story-generation-request') {
    // Process story generation request
    handleStoryRequest(message.payload);
  }
});
```

#### **HTTP Webhook**
```javascript
app.post('/webhook/storytailor', (req, res) => {
  const { messageId, type, payload } = req.body;
  
  switch (type) {
    case 'story-generation-request':
      handleStoryGeneration(payload)
        .then(result => {
          res.json({
            messageId,
            success: true,
            result
          });
        })
        .catch(error => {
          res.status(500).json({
            messageId,
            success: false,
            error: error.message
          });
        });
      break;
      
    default:
      res.status(400).json({
        error: 'Unknown message type'
      });
  }
});
```

---

## 📱 **SDKs & Libraries**

### **JavaScript/TypeScript SDK**
```bash
npm install @storytailor/sdk
```

### **Python SDK**
```bash
pip install storytailor-sdk
```

```python
from storytailor import StorytalorClient

client = StorytalorClient(api_key='your-token')

story = client.stories.generate(
    prompt='A magical adventure',
    age_range='6-8',
    mood='adventurous'
)

print(story.title, story.content)
```

### **iOS SDK**
```swift
import StorytalorSDK

let client = StorytalorClient(apiKey: "[REDACTED_API_KEY]")

client.generateStory(
    prompt: "A brave little mouse",
    ageRange: .ages6to8,
    mood: .adventurous
) { result in
    switch result {
    case .success(let story):
        print(story.title)
    case .failure(let error):
        print("Error: \(error)")
    }
}
```

### **Android SDK**
```kotlin
import com.storytailor.sdk.StorytalorClient

val client = StorytalorClient("your-token")

client.generateStory(
    prompt = "A magical adventure",
    ageRange = AgeRange.AGES_6_TO_8,
    mood = Mood.ADVENTUROUS
) { result ->
    when (result) {
        is Success -> println(result.story.title)
        is Error -> println("Error: ${result.message}")
    }
}
```

---

## 🔗 **Webhooks**

### **Webhook Configuration**
```json
{
  "webhookUrl": "https://your-app.com/webhooks/storytailor",
  "events": [
    "story.generated",
    "story.synthesized",
    "user.registered"
  ],
  "secret": "your-webhook-secret"
}
```

### **Event Types**

#### **story.generated**
```json
{
  "event": "story.generated",
  "timestamp": "2025-08-02T07:02:19.315Z",
  "data": {
    "storyId": "214bb202-9d24-4ceb-9c9e-32c08b081b40",
    "userId": "user-123",
    "title": "The Cheese Quest",
    "wordCount": 321,
    "ageRange": "6-8"
  }
}
```

#### **story.synthesized**
```json
{
  "event": "story.synthesized",
  "timestamp": "2025-08-02T07:02:19.315Z",
  "data": {
    "storyId": "214bb202-9d24-4ceb-9c9e-32c08b081b40",
    "audioUrl": "https://cdn.storytailor.com/audio/story-123.mp3",
    "duration": 180,
    "voiceId": "child-friendly-voice"
  }
}
```

---

## ⚡ **Rate Limits**

### **Rate Limit Headers**
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1609459200
```

### **Limits by Plan**
| Plan | Requests/Hour | Stories/Day | Audio/Day |
|------|---------------|-------------|-----------|
| Free | 100 | 5 | 2 |
| Pro | 1,000 | 50 | 25 |
| Enterprise | 10,000 | 500 | 250 |

### **Rate Limit Handling**
```javascript
const response = await fetch('/v1/stories/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(storyRequest)
});

if (response.status === 429) {
  const resetTime = response.headers.get('X-RateLimit-Reset');
  const waitTime = (resetTime * 1000) - Date.now();
  
  console.log(`Rate limited. Retry after ${waitTime}ms`);
  
  setTimeout(() => {
    // Retry request
  }, waitTime);
}
```

---

## 🛠️ **Testing & Development**

### **Sandbox Environment**
```
Base URL: https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging
```

### **Test API Key**
```
Bearer [REDACTED_JWT]
```

### **Postman Collection**
Download our Postman collection: [Storytailor API Collection](https://api.storytailor.com/postman)

---

## 📞 **Support & Resources**

- **API Status**: https://status.storytailor.com
- **Documentation**: https://docs.storytailor.com
- **Discord Community**: https://discord.gg/storytailor
- **Email Support**: developers@storytailor.com
- **GitHub**: https://github.com/storytailor/sdk

---

**🌟 Ready to build amazing storytelling experiences? Get started with your API key today!**
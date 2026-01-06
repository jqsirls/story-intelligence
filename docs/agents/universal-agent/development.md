# Universal Agent - Developer Documentation

**Status**: Draft  
**Audience**: Engineering  
**Last Updated**: 2025-12-13

## Technical Architecture

### Core Components

1. **RESTAPIGateway** (`packages/universal-agent/src/api/RESTAPIGateway.ts`)
   - Express.js REST API gateway
   - 60+ REST endpoints
   - Authentication middleware
   - Request validation with Zod
   - Error handling

2. **UniversalStorytellerAPI** (`packages/universal-agent/src/UniversalStorytellerAPI.ts`)
   - Core API class
   - Conversation management
   - Story and character operations
   - Agent coordination

3. **UniversalConversationEngine** (`packages/universal-agent/src/conversation/UniversalConversationEngine.ts`)
   - Channel-agnostic conversation management
   - Cross-channel synchronization
   - Session management
   - Real-time streaming support

4. **DeletionService** (`packages/universal-agent/src/services/DeletionService.ts`)
   - Account, story, character deletion
   - Hibernation and storage tiering
   - Glacier archiving

5. **EmailService** (`packages/universal-agent/src/services/EmailService.ts`)
   - SendGrid dynamic templates
   - AWS SES fallback
   - 28+ email types
   - Engagement tracking

6. **InactivityMonitorService** (`packages/universal-agent/src/services/InactivityMonitorService.ts`)
   - User inactivity detection
   - Warning emails
   - Account hibernation

## API Reference

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password",
  "age": 8,
  "parentEmail": "parent@example.com"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}
```

### Conversation Endpoints

#### Start Conversation
```http
POST /api/v1/conversation/start
Authorization: Bearer {token}
Content-Type: application/json

{
  "platform": "web",
  "language": "en",
  "voiceEnabled": true,
  "smartHomeEnabled": false
}
```

#### Send Message
```http
POST /api/v1/conversation/message
Authorization: Bearer {token}
Content-Type: application/json

{
  "sessionId": "session-123",
  "message": {
    "type": "text",
    "content": "Let's create a story!",
    "metadata": {}
  }
}
```

### Story Endpoints

#### Create Story
```http
POST /api/v1/stories
Authorization: Bearer {token}
Content-Type: application/json

{
  "character": "character-123",
  "storyType": "adventure",
  "libraryId": "library-456",
  "generateAssets": true
}
```

#### List Stories
```http
GET /api/v1/stories?libraryId=library-456&limit=10&offset=0
Authorization: Bearer {token}
```

### Deletion Endpoints

#### Request Account Deletion
```http
POST /api/v1/account/delete
Authorization: Bearer {token}
Content-Type: application/json

{
  "immediate": false,
  "reason": "No longer using service"
}
```

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts` - Complete API implementation
- `docs/system/api_endpoints_inventory.md` - Full endpoint documentation

## Integration Guide

### Basic Integration

```typescript
import fetch from 'node-fetch';

const API_URL = 'https://{function-url}';
const API_TOKEN = 'your-api-token';

// Health check
const health = await fetch(`${API_URL}/health`);
const healthData = await health.json();

// Start conversation
const conversation = await fetch(`${API_URL}/api/v1/conversation/start`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    platform: 'web',
    language: 'en',
    voiceEnabled: true
  })
});
const conversationData = await conversation.json();
```

### Error Handling

```typescript
try {
  const response = await fetch(`${API_URL}/api/v1/stories`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(storyData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const story = await response.json();
  return story;
} catch (error) {
  console.error('API Error:', error);
  // Handle error
}
```

## Configuration

### Environment Variables
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[REDACTED_SUPABASE_SERVICE_ROLE_KEY]
REDIS_URL=redis://...
SENDGRID_API_KEY=SG...
EMAIL_FROM=magic@storytailor.com
ENABLE_KID_INTELLIGENCE=true
AUTO_CONFIRM_USERS=false
```

### Lambda Configuration
- **Runtime**: Node.js 22.x
- **Timeout**: 30 seconds
- **Memory**: 512 MB
- **Handler**: `dist/lambda.handler`
- **Region**: us-east-1

## Testing

### Local Testing
```bash
cd packages/universal-agent
npm test
```

### Integration Testing
```bash
# Test against staging
export API_URL=https://{staging-function-url}
npm run test:integration
```

### Health Check
```bash
curl https://{function-url}/health
```

## Deployment

```bash
./scripts/deploy-universal-agent-proper.sh production
```

**Code References:**
- `scripts/deploy-universal-agent-proper.sh` - Deployment script
- `docs/system/deployment_inventory.md` - Deployment details


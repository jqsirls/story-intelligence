# Interactive API Explorer

The Storytailor API Explorer provides a comprehensive, interactive interface for testing and exploring our APIs with live examples and real-time responses.

## Access the API Explorer

🚀 **[Launch API Explorer](https://api.storytailor.com/explorer)**

## Features

### 🔍 Live API Testing
- Test all endpoints with real API calls
- Interactive request/response viewer
- Real-time validation and error handling
- Support for all authentication methods

### 📚 Complete Documentation
- Detailed endpoint descriptions
- Request/response schemas
- Code examples in multiple languages
- Interactive parameter editors

### 🛠 Developer Tools
- API key management
- Request history and bookmarking
- Response formatting and filtering
- Export to various formats (cURL, Postman, etc.)

## Getting Started

### 1. Authentication

Choose your authentication method:

#### API Key Authentication
```javascript
// Add your API key in the explorer header
Authorization: Bearer [REDACTED_JWT]
```

#### OAuth 2.0 (Coming Soon)
```javascript
// OAuth flow for server-to-server integration
Authorization: Bearer [REDACTED_JWT]
```

### 2. Select an Endpoint

Browse available endpoints by category:

- **Conversations** - Start and manage storytelling conversations
- **Stories** - Create, edit, and retrieve stories
- **Characters** - Manage character creation and customization
- **Libraries** - Organize and share story collections
- **Voice** - Text-to-speech and voice processing
- **Assets** - Generate and manage story assets (images, audio, PDFs)
- **Webhooks** - Real-time event notifications
- **Analytics** - Usage metrics and insights

### 3. Configure Parameters

Use the interactive parameter editor to:
- Set required and optional parameters
- Choose from predefined values
- Upload files for testing
- Configure request headers

### 4. Execute and Analyze

- Send requests with one click
- View formatted responses
- Analyze response times and status codes
- Save successful requests for later use

## API Categories

### Conversation API

#### Start Conversation
```http
POST /api/v1/conversations
```

**Interactive Example:**
```json
{
  "userId": "user-123",
  "storyType": "adventure",
  "ageGroup": "6-8",
  "language": "en",
  "voiceEnabled": true
}
```

**Try it now:** [Start Conversation →](https://api.storytailor.com/explorer#/conversations/start)

#### Send Message
```http
POST /api/v1/conversations/{conversationId}/messages
```

**Interactive Example:**
```json
{
  "message": "I want to create a story about a brave dragon",
  "messageType": "text",
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "platform": "web"
  }
}
```

**Try it now:** [Send Message →](https://api.storytailor.com/explorer#/conversations/message)

### Story API

#### Create Story
```http
POST /api/v1/stories
```

**Interactive Example:**
```json
{
  "title": "The Brave Little Dragon",
  "character": {
    "name": "Spark",
    "species": "dragon",
    "traits": ["brave", "kind", "curious"]
  },
  "storyType": "adventure",
  "ageGroup": "6-8",
  "generateAssets": true
}
```

**Try it now:** [Create Story →](https://api.storytailor.com/explorer#/stories/create)

#### Get Story
```http
GET /api/v1/stories/{storyId}
```

**Try it now:** [Get Story →](https://api.storytailor.com/explorer#/stories/get)

### Character API

#### Create Character
```http
POST /api/v1/characters
```

**Interactive Example:**
```json
{
  "name": "Luna",
  "species": "unicorn",
  "age": 7,
  "traits": {
    "personality": ["kind", "magical", "wise"],
    "appearance": {
      "coatColor": "silver",
      "maneColor": "rainbow",
      "eyeColor": "blue"
    },
    "abilities": ["healing", "flight", "magic"]
  }
}
```

**Try it now:** [Create Character →](https://api.storytailor.com/explorer#/characters/create)

### Voice API

#### Text-to-Speech
```http
POST /api/v1/voice/synthesize
```

**Interactive Example:**
```json
{
  "text": "Once upon a time, in a magical forest far away...",
  "voice": "child-friendly-narrator",
  "speed": 1.0,
  "emotion": "excited",
  "format": "mp3"
}
```

**Try it now:** [Synthesize Speech →](https://api.storytailor.com/explorer#/voice/synthesize)

### Asset Generation API

#### Generate Story Assets
```http
POST /api/v1/assets/generate
```

**Interactive Example:**
```json
{
  "storyId": "story-123",
  "assetTypes": ["cover_art", "character_art", "audio", "pdf"],
  "style": "watercolor",
  "quality": "high"
}
```

**Try it now:** [Generate Assets →](https://api.storytailor.com/explorer#/assets/generate)

## Advanced Features

### Real-time Testing

#### WebSocket Connections
Test real-time features like streaming conversations:

```javascript
// WebSocket endpoint for real-time conversation
wss://api.storytailor.com/v1/conversations/{conversationId}/stream

// Example message
{
  "type": "message",
  "content": "Tell me about the dragon's adventure",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Try it now:** [WebSocket Tester →](https://api.storytailor.com/explorer#/websocket)

#### Server-Sent Events
Test streaming responses:

```javascript
// SSE endpoint for streaming story generation
GET /api/v1/stories/{storyId}/stream

// Example event
data: {"type": "story_chunk", "content": "The dragon soared high above the clouds..."}
```

**Try it now:** [SSE Tester →](https://api.storytailor.com/explorer#/sse)

### Webhook Testing

#### Configure Webhook Endpoints
```json
{
  "url": "https://your-app.com/webhooks/storytailor",
  "events": ["story.completed", "character.created"],
  "secret": "your-webhook-secret"
}
```

#### Test Webhook Delivery
The explorer can simulate webhook events to test your endpoint:

```json
{
  "event": "story.completed",
  "data": {
    "storyId": "story-123",
    "title": "The Brave Little Dragon",
    "completedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Try it now:** [Webhook Tester →](https://api.storytailor.com/explorer#/webhooks)

### Batch Operations

#### Bulk Story Creation
```json
{
  "stories": [
    {
      "title": "Adventure Story 1",
      "character": {...},
      "storyType": "adventure"
    },
    {
      "title": "Bedtime Story 1", 
      "character": {...},
      "storyType": "bedtime"
    }
  ],
  "generateAssets": true
}
```

**Try it now:** [Bulk Operations →](https://api.storytailor.com/explorer#/bulk)

## Code Generation

### Export Requests

Export your tested requests as code in multiple languages:

#### cURL
```bash
curl -X POST "https://api.storytailor.com/v1/conversations" \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "storyType": "adventure"
  }'
```

#### JavaScript/Node.js
```javascript
const response = await fetch('https://api.storytailor.com/v1/conversations', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-api-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'user-123',
    storyType: 'adventure'
  })
});
```

#### Python
```python
import requests

response = requests.post(
    'https://api.storytailor.com/v1/conversations',
    headers={
        'Authorization': 'Bearer your-api-key',
        'Content-Type': 'application/json'
    },
    json={
        'userId': 'user-123',
        'storyType': 'adventure'
    }
)
```

#### PHP
```php
$response = wp_remote_post('https://api.storytailor.com/v1/conversations', [
    'headers' => [
        'Authorization' => 'Bearer your-api-key',
        'Content-Type' => 'application/json'
    ],
    'body' => json_encode([
        'userId' => 'user-123',
        'storyType' => 'adventure'
    ])
]);
```

### Export Collections

Export entire API collections for:
- **Postman** - Import into Postman workspace
- **Insomnia** - Import into Insomnia client
- **OpenAPI** - Generate OpenAPI 3.0 specification
- **GraphQL** - Generate GraphQL schema (for GraphQL endpoints)

## Testing Environments

### Sandbox Environment

Test safely without affecting production data:

```javascript
// Sandbox base URL
https://sandbox-api.storytailor.com/v1/

// Use sandbox API keys
Authorization: Bearer [REDACTED_JWT]
```

### Mock Responses

Enable mock responses for consistent testing:

```json
{
  "mockMode": true,
  "mockScenario": "success", // "success", "error", "timeout"
  "mockDelay": 1000 // milliseconds
}
```

## Performance Testing

### Load Testing

Test API performance with simulated load:

```javascript
// Configure load test
{
  "concurrent_users": 10,
  "duration": "60s",
  "ramp_up": "10s",
  "endpoints": [
    "/api/v1/conversations",
    "/api/v1/stories"
  ]
}
```

### Response Time Analysis

Monitor API performance:
- Average response time
- 95th percentile response time
- Error rate tracking
- Throughput metrics

## Collaboration Features

### Share API Tests

Share your API tests with team members:

```javascript
// Generate shareable link
https://api.storytailor.com/explorer/shared/abc123

// Export test collection
{
  "name": "Story Creation Tests",
  "tests": [...],
  "environment": "sandbox"
}
```

### Team Workspaces

Collaborate with your team:
- Shared API key management
- Team test collections
- Usage analytics
- Access control

## Integration with Development Tools

### VS Code Extension

Install the Storytailor API Explorer extension:

```bash
# Search for "Storytailor API Explorer" in VS Code extensions
# Or install via command line
code --install-extension storytailor.api-explorer
```

### CLI Tool

Use the command-line interface:

```bash
# Install CLI
npm install -g @storytailor/cli

# Test API endpoint
storytailor api test conversations/start --data '{"userId": "user-123"}'

# Generate code
storytailor api generate --endpoint conversations/start --language javascript
```

## Support and Feedback

### Getting Help

- **Documentation**: [API Reference](../api-reference/README.md)
- **Community**: [Developer Forum](https://community.storytailor.com)
- **Support**: [Contact Support](../support/contact.md)

### Feedback

Help us improve the API Explorer:
- **Feature Requests**: [GitHub Issues](https://github.com/storytailor/api-explorer/issues)
- **Bug Reports**: [Bug Tracker](https://github.com/storytailor/api-explorer/issues)
- **Suggestions**: [Feedback Form](https://forms.storytailor.com/api-explorer-feedback)

---

## Quick Links

- 🚀 **[Launch API Explorer](https://api.storytailor.com/explorer)**
- 📖 **[API Reference](../api-reference/README.md)**
- 🛠 **[Code Generators](./code-generators.md)**
- 🧪 **[Testing Tools](./testing.md)**
- 📊 **[Developer Dashboard](./dashboard.md)**
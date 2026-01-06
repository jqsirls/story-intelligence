# REST API Gateway Implementation

## Overview

The REST API Gateway provides a comprehensive third-party integration solution for the Storytailor platform. It enables developers to embed Storytailor's storytelling capabilities into any application through a robust REST API, GraphQL endpoint, webhook system, and developer dashboard.

## Features Implemented

### ✅ 1. Comprehensive REST API

- **Full CRUD Operations**: Complete story, character, and conversation management
- **Platform Agnostic**: Supports web, mobile, voice assistants, and custom platforms
- **Batch Operations**: Efficient bulk processing for high-volume integrations
- **Advanced Filtering**: Sophisticated query parameters for data retrieval
- **File Upload Support**: Handle audio, images, and other media files
- **Export Capabilities**: Multiple format support (JSON, CSV, PDF)

### ✅ 2. GraphQL Endpoint

- **Flexible Queries**: Allow clients to request exactly the data they need
- **Real-time Subscriptions**: Live updates for conversation and story events
- **Type-safe Schema**: Comprehensive GraphQL schema with full type definitions
- **Interactive Playground**: Built-in GraphiQL interface for development
- **Query Optimization**: Efficient data fetching with minimal over-fetching

### ✅ 3. Advanced Authentication & Rate Limiting

- **API Key Management**: Create, manage, and revoke API keys with custom permissions
- **Granular Permissions**: Fine-grained access control (read, write, admin)
- **Distributed Rate Limiting**: Redis-backed rate limiting for scalability
- **Custom Rate Limits**: Per-API-key configurable rate limits
- **Usage Tracking**: Real-time monitoring of API usage and quotas
- **Security Headers**: Comprehensive security middleware with Helmet.js

### ✅ 4. Webhook System for Real-time Integrations

- **Platform-Specific Transformations**: Native format support for Discord, Slack, Teams
- **Reliable Delivery**: Retry logic with exponential backoff
- **Signature Verification**: HMAC-SHA256 webhook signature validation
- **Event Filtering**: Subscribe to specific events or all events
- **Delivery Analytics**: Track success rates, response times, and failures
- **Webhook Testing**: Built-in webhook testing and validation tools

### ✅ 5. Developer Dashboard

- **API Analytics**: Comprehensive usage statistics and performance metrics
- **Real-time Monitoring**: Live dashboard with request rates and error tracking
- **Quota Management**: Visual quota usage with alerts and notifications
- **API Key Management**: Create, configure, and manage API keys
- **Webhook Management**: Register, test, and monitor webhook endpoints
- **Usage Reports**: Generate detailed usage reports in multiple formats

### ✅ 6. Interactive API Documentation

- **Swagger/OpenAPI**: Complete API documentation with interactive examples
- **Live Testing**: Test API endpoints directly from the documentation
- **Code Examples**: Multi-language code samples (JavaScript, Python, cURL)
- **SDK Documentation**: Comprehensive SDK usage guides
- **Integration Guides**: Step-by-step integration tutorials

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    REST API Gateway                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Express   │  │   GraphQL   │  │   WebSocket         │  │
│  │   REST API  │  │   Endpoint  │  │   Real-time         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Rate        │  │ Auth &      │  │ Request             │  │
│  │ Limiting    │  │ Permissions │  │ Validation          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Webhook     │  │ Developer   │  │ Analytics &         │  │
│  │ Delivery    │  │ Dashboard   │  │ Monitoring          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                Universal Storyteller API                    │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Conversation Management
- `POST /v1/conversation/start` - Start new conversation
- `POST /v1/conversation/message` - Send message
- `POST /v1/conversation/batch` - Batch message processing
- `POST /v1/conversation/stream` - Server-sent events streaming
- `POST /v1/conversation/voice` - Voice input processing
- `GET /v1/conversation/:sessionId/analytics` - Conversation analytics
- `POST /v1/conversation/end` - End conversation

### Story Management
- `GET /v1/stories` - List stories with filtering
- `GET /v1/stories/:storyId` - Get specific story
- `POST /v1/stories` - Create new story
- `PUT /v1/stories/:storyId` - Update story
- `DELETE /v1/stories/:storyId` - Delete story
- `POST /v1/stories/bulk` - Bulk story operations
- `POST /v1/stories/:storyId/assets` - Generate/regenerate assets
- `GET /v1/stories/:storyId/export` - Export story (JSON, PDF, etc.)

### Character Management
- `GET /v1/characters` - List characters
- `GET /v1/characters/:characterId` - Get specific character
- `POST /v1/characters` - Create character
- `PUT /v1/characters/:characterId` - Update character
- `DELETE /v1/characters/:characterId` - Delete character
- `GET /v1/characters/templates` - Get character templates

### Authentication & User Management
- `POST /v1/auth/authenticate` - User authentication
- `POST /v1/auth/link` - Account linking
- `GET /v1/auth/profile` - Get user profile

### Smart Home Integration
- `POST /v1/smarthome/connect` - Connect smart device
- `GET /v1/smarthome/devices` - List connected devices
- `POST /v1/smarthome/control` - Control smart device
- `DELETE /v1/smarthome/devices/:deviceId` - Disconnect device

### Webhook Management
- `POST /v1/webhooks` - Create webhook
- `GET /v1/webhooks` - List webhooks
- `PUT /v1/webhooks/:webhookId` - Update webhook
- `DELETE /v1/webhooks/:webhookId` - Delete webhook
- `POST /v1/webhooks/:webhookId/test` - Test webhook
- `GET /v1/webhooks/verify` - Webhook verification

### Analytics & Monitoring
- `GET /v1/analytics/usage` - Usage analytics
- `GET /v1/analytics/conversations` - Conversation analytics
- `GET /v1/analytics/stories` - Story analytics

### Developer Dashboard
- `GET /developer/dashboard` - Dashboard data
- `POST /developer/api-keys` - Create API key
- `GET /developer/api-keys` - List API keys
- `DELETE /developer/api-keys/:keyId` - Revoke API key

## Webhook Events

The webhook system supports the following events:

### Conversation Events
- `conversation.started` - New conversation session started
- `conversation.message` - Message sent/received in conversation
- `conversation.ended` - Conversation session ended

### Story Events
- `story.created` - New story created
- `story.updated` - Story content updated
- `story.assets_generated` - Story assets (art, audio, PDF) generated
- `story.completed` - Story marked as complete
- `story.deleted` - Story deleted

### Character Events
- `character.created` - New character created
- `character.updated` - Character traits updated
- `character.deleted` - Character deleted

### Smart Home Events
- `smarthome.device_connected` - Smart device connected
- `smarthome.device_disconnected` - Smart device disconnected
- `smarthome.action_executed` - Smart home action performed

### System Events
- `webhook.test` - Test webhook delivery
- `api.rate_limit_exceeded` - Rate limit exceeded
- `api.quota_warning` - Approaching quota limit

## Platform-Specific Webhook Formats

### Discord
```json
{
  "embeds": [{
    "title": "📚 New Story Created!",
    "description": "A new story \"The Dragon Adventure\" has been created.",
    "color": 5865242,
    "timestamp": "2024-01-01T00:00:00Z",
    "fields": [
      {
        "name": "Story Type",
        "value": "adventure",
        "inline": true
      },
      {
        "name": "Character",
        "value": "Luna the Unicorn",
        "inline": true
      }
    ]
  }]
}
```

### Slack
```json
{
  "text": "📚 New story created: \"The Dragon Adventure\"",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*📚 New Story Created!*\n\n*Title:* The Dragon Adventure\n*Type:* adventure\n*Character:* Luna the Unicorn"
      }
    }
  ]
}
```

### Microsoft Teams
```json
{
  "@type": "MessageCard",
  "@context": "http://schema.org/extensions",
  "themeColor": "0076D7",
  "summary": "New Story Created",
  "sections": [{
    "activityTitle": "📚 New Story Created!",
    "activitySubtitle": "Story: The Dragon Adventure",
    "facts": [
      {
        "name": "Story Type",
        "value": "adventure"
      },
      {
        "name": "Character",
        "value": "Luna the Unicorn"
      }
    ]
  }]
}
```

## Integration Examples

### Discord Bot Integration
```javascript
const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

const command = new SlashCommandBuilder()
    .setName('create-story')
    .setDescription('Create a personalized story')
    .addStringOption(option =>
        option.setName('character')
            .setDescription('Character name')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('type')
            .setDescription('Story type')
            .setRequired(true)
            .addChoices(
                { name: 'Adventure', value: 'adventure' },
                { name: 'Bedtime', value: 'bedtime' },
                { name: 'Educational', value: 'educational' }
            ));

async function execute(interaction) {
    const character = interaction.options.getString('character');
    const storyType = interaction.options.getString('type');
    
    const response = await axios.post('https://api.storytailor.com/v1/stories', {
        character: { name: character },
        storyType: storyType
    }, {
        headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
    });
    
    await interaction.reply(`Story created: ${response.data.title}`);
}
```

### Slack App Integration
```javascript
const { App } = require('@slack/bolt');
const axios = require('axios');

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
});

app.command('/create-story', async ({ command, ack, respond }) => {
    await ack();
    
    const [character, storyType] = command.text.split(' ');
    
    try {
        const response = await axios.post('https://api.storytailor.com/v1/stories', {
            character: { name: character },
            storyType: storyType || 'adventure'
        }, {
            headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
        });
        
        await respond({
            text: `📚 Story created: "${response.data.title}"`,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*${response.data.title}*\n${response.data.summary}`
                    }
                }
            ]
        });
    } catch (error) {
        await respond('Sorry, I couldn\'t create the story. Please try again.');
    }
});
```

### Web Application Integration
```javascript
import { StorytalorAPI } from '@storytailor/api-client';

const client = new StorytalorAPI('your-api-key');

// Start conversation
const session = await client.conversation.start({
    platform: 'web',
    voiceEnabled: true,
    smartHomeEnabled: true
});

// Send message
const response = await client.conversation.sendMessage(session.sessionId, {
    type: 'text',
    content: 'Create a story about a brave knight'
});

// Stream responses for real-time chat
for await (const chunk of client.conversation.stream(session.sessionId, message)) {
    console.log('Received chunk:', chunk.content);
    updateUI(chunk);
}

// Create story directly
const story = await client.stories.create({
    character: {
        name: 'Sir Galahad',
        species: 'human',
        traits: {
            age: 25,
            occupation: 'knight',
            personality: 'brave'
        }
    },
    storyType: 'adventure',
    generateAssets: true
});
```

## Rate Limiting

The API implements sophisticated rate limiting:

### Default Limits
- **Free Tier**: 100 requests/hour
- **Pro Tier**: 1,000 requests/hour
- **Enterprise**: Custom limits

### Custom API Key Limits
```javascript
// Create API key with custom rate limit
const apiKey = await createAPIKey({
    name: 'High Volume Integration',
    permissions: ['stories:read', 'stories:write', 'conversation:use'],
    rateLimit: {
        requests: 5000,
        window: 3600 // 1 hour
    }
});
```

### Rate Limit Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 2024-01-01T01:00:00Z
Retry-After: 3600
```

## Error Handling

### Standard Error Format
```json
{
    "error": "ValidationError",
    "message": "Invalid story type provided",
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "req_123456789",
    "details": {
        "field": "storyType",
        "allowedValues": ["adventure", "bedtime", "educational"]
    }
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid API key)
- `403` - Forbidden (insufficient permissions)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Security Features

### Authentication
- API key-based authentication
- JWT token support for user sessions
- OAuth 2.0 integration for third-party apps

### Authorization
- Role-based access control (RBAC)
- Granular permissions system
- Resource-level access control

### Security Headers
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security

### Data Protection
- Request/response encryption (HTTPS only)
- PII tokenization in logs
- Webhook signature verification
- Input validation and sanitization

## Monitoring & Analytics

### Real-time Metrics
- Request rate and response times
- Error rates and types
- Active connections and sessions
- Webhook delivery success rates

### Historical Analytics
- Usage trends over time
- Popular endpoints and features
- Geographic distribution
- Performance benchmarks

### Alerting
- Rate limit threshold alerts
- Error rate spike notifications
- Webhook delivery failure alerts
- Quota usage warnings

## Deployment

### Environment Variables
```bash
# API Configuration
API_BASE_URL=https://api.storytailor.com
PORT=3000
NODE_ENV=production

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Redis (for rate limiting and caching)
REDIS_URL=redis://localhost:6379

# External APIs
OPENAI_API_KEY=your-openai-key
ELEVENLABS_API_KEY=your-elevenlabs-key

# Security
WEBHOOK_SECRET=your-webhook-secret
JWT_SECRET=your-jwt-secret

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://anotherdomain.com
```

### Docker Deployment
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: storytailor-api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: storytailor-api-gateway
  template:
    metadata:
      labels:
        app: storytailor-api-gateway
    spec:
      containers:
      - name: api-gateway
        image: storytailor/api-gateway:latest
        ports:
        - containerPort: 3000
        env:
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        - name: SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: storytailor-secrets
              key: supabase-url
```

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Load Testing
```bash
npm run test:load
```

### Security Testing
```bash
npm run test:security
```

## Performance Optimization

### Caching Strategy
- Redis for rate limiting and session data
- CDN for static assets and documentation
- Response caching for frequently accessed data

### Database Optimization
- Connection pooling
- Query optimization
- Read replicas for analytics

### Monitoring
- Application Performance Monitoring (APM)
- Real-time error tracking
- Performance profiling

## Future Enhancements

### Planned Features
- [ ] SDK generation for additional languages (Go, Ruby, PHP)
- [ ] Advanced analytics dashboard with custom metrics
- [ ] Webhook replay and debugging tools
- [ ] API versioning and deprecation management
- [ ] Advanced security features (IP whitelisting, request signing)
- [ ] GraphQL subscriptions for real-time updates
- [ ] Batch webhook delivery optimization
- [ ] Custom rate limiting algorithms
- [ ] API marketplace integration
- [ ] White-label customization options

## Support

### Documentation
- Interactive API documentation: `/api-docs`
- GraphQL playground: `/graphql`
- Developer guides: `/docs`

### Support Channels
- Email: api-support@storytailor.com
- Discord: [Storytailor Developers](https://discord.gg/storytailor-dev)
- GitHub Issues: [storytailor/api-gateway](https://github.com/storytailor/api-gateway)

### SLA
- **Uptime**: 99.9% availability
- **Response Time**: <200ms average
- **Support Response**: <24 hours for technical issues

---

This REST API Gateway implementation provides a comprehensive foundation for third-party integrations, enabling developers to embed Storytailor's powerful storytelling capabilities into any application or platform.
# Universal Agent - Usage Guidelines

**Status**: Draft  
**Audience**: Engineering | Product  
**Last Updated**: 2025-12-13

## When to Use This Agent

### Always Use Universal Agent For:
1. **All REST API Requests**: Every REST API call should go through Universal Agent
2. **Third-Party Integrations**: All partner and developer integrations
3. **Web and Mobile Apps**: All web and mobile application API calls
4. **Authentication**: User registration, login, and session management
5. **Conversation Management**: Starting, managing, and ending conversations
6. **Story and Character CRUD**: Creating, reading, updating, and deleting stories/characters
7. **Deletion Operations**: Account, story, character, and library member deletions
8. **Email Tracking**: Email engagement tracking and analytics

### Use Cases

#### Web Application Integration
**When**: Building a web application that uses Storytailor
**Universal Agent Action**: Provides REST API endpoints for all operations

#### Mobile App Integration
**When**: Building a mobile app (iOS, Android, React Native)
**Universal Agent Action**: Provides REST API endpoints optimized for mobile

#### Third-Party Platform Integration
**When**: Integrating Storytailor into Discord, Slack, or custom platforms
**Universal Agent Action**: Provides REST API and webhook system

#### Account Management
**When**: User wants to manage account, export data, or delete account
**Universal Agent Action**: Handles all account management operations

#### Conversation Management
**When**: Starting or managing conversations across channels
**Universal Agent Action**: Coordinates with Router and manages conversation state

## When NOT to Use It

### Direct Agent Calls (Rare Cases)
Only bypass Universal Agent when:
1. **Internal Agent-to-Agent Communication**: Agents calling each other directly (though EventBridge is preferred)
2. **Lambda-to-Lambda Invocation**: Direct Lambda invocations for performance-critical operations
3. **Internal Admin Operations**: Operations that don't need API gateway features

**Note**: Even in these cases, consider if Universal Agent would provide value (monitoring, rate limiting, etc.)

## Integration Patterns

### REST API Integration
```typescript
// Health check
const health = await fetch('https://{function-url}/health');

// Start conversation
const response = await fetch('https://{function-url}/api/v1/conversation/start', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    platform: 'web',
    language: 'en',
    voiceEnabled: true
  })
});
```

### Webhook Integration
```typescript
// Create webhook
const webhook = await fetch('https://{function-url}/api/v1/webhooks', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://your-app.com/webhook',
    events: ['story.created', 'conversation.ended']
  })
});
```

## Timing Considerations

### Request Timing
- **Health Check**: <50ms
- **Authentication**: <200ms
- **Simple CRUD**: <300ms
- **Conversation Start**: <1000ms (includes Router coordination)
- **Story Creation**: <5000ms (depends on Content Agent)
- **Deletion Processing**: <3000ms (depends on data volume)

### Rate Limits
- **Default**: 100 requests per minute per user
- **API Keys**: Configurable per key
- **Burst**: Allows short bursts above limit

## Error Handling

### Standard Error Responses
```json
{
  "error": "Error code",
  "message": "Human-readable message",
  "details": {}
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Rate Limited
- `500` - Internal Server Error

## Best Practices

1. **Always Use Authentication**: Include Bearer token in Authorization header
2. **Handle Rate Limits**: Implement exponential backoff for 429 responses
3. **Use Batch Operations**: Use bulk endpoints when processing multiple items
4. **Monitor Health**: Check `/health` endpoint before making requests
5. **Handle Errors Gracefully**: Implement proper error handling and retry logic


# Universal Agent - Detailed Functionality

**Status**: Draft  
**Audience**: Engineering | Product  
**Last Updated**: 2025-12-13

## Complete Feature List

### REST API Gateway
- **60+ REST API Endpoints**: Comprehensive API for third-party integrations
- **Authentication Middleware**: Token-based authentication with AuthAgent integration
- **Rate Limiting**: Per-user and per-API-key rate limiting
- **CORS Support**: Cross-origin resource sharing for web integrations
- **Request Validation**: Zod schema validation for all endpoints
- **Error Handling**: Standardized error responses with proper HTTP status codes

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts` - REST API implementation
- `docs/system/api_endpoints_inventory.md` - Complete endpoint list

### Conversation Management
- **Channel-Agnostic Engine**: UniversalConversationEngine supports multiple channels
- **Cross-Channel Synchronization**: Real-time state sync across channels
- **Session Management**: Automatic session cleanup and timeout handling
- **Streaming Support**: Real-time streaming for conversation responses
- **Platform Optimizations**: Channel-specific optimizations (Alexa, Web, Mobile, API)

**Code References:**
- `packages/universal-agent/src/conversation/UniversalConversationEngine.ts` - Conversation engine
- `packages/universal-agent/src/conversation/UniversalConversationManager.ts` - Conversation manager
- `packages/universal-agent/CHANNEL_AGNOSTIC_CONVERSATION_SYSTEM.md` - System documentation

### Deletion System
- **Account Deletion**: Grace period deletion with cancellation support
- **Story Deletion**: Story deletion with asset cleanup
- **Character Deletion**: Character deletion with optional story removal
- **Library Member Removal**: Remove members from shared libraries
- **Conversation Asset Clearing**: Clear conversation-related assets
- **Hibernation**: Archive accounts to Glacier for long-term storage
- **Storage Tiering**: Move assets to Glacier for cost optimization

**Code References:**
- `packages/universal-agent/src/services/DeletionService.ts` - Deletion service
- `docs/deletion-system.md` - Deletion system documentation

### Email Service
- **SendGrid Integration**: Dynamic template support with 30+ templates
- **AWS SES Fallback**: Fallback to SES for transactional emails
- **28+ Email Types**: Welcome, receipts, invitations, transfers, notifications, etc.
- **Engagement Tracking**: Email open and click tracking
- **Template Rendering**: HTML template rendering with dynamic data

**Code References:**
- `packages/universal-agent/src/services/EmailService.ts` - Email service
- `packages/universal-agent/src/templates/emails/` - Email templates

### Inactivity Monitoring
- **User Inactivity Detection**: Monitor user activity and detect inactivity
- **Warning Emails**: Send inactivity warnings at thresholds
- **Account Hibernation**: Automatically hibernate inactive accounts
- **Storage Optimization**: Move inactive account assets to Glacier

**Code References:**
- `packages/universal-agent/src/services/InactivityMonitorService.ts` - Inactivity monitoring
- `lambda-deployments/inactivity-processor/` - Processor Lambda

### Storage Lifecycle Management
- **S3 to Glacier Migration**: Move old assets to Glacier
- **Cost Optimization**: Reduce storage costs for infrequently accessed data
- **Restore Capabilities**: Restore archived data when needed

**Code References:**
- `packages/universal-agent/src/services/StorageLifecycleService.ts` - Storage lifecycle

## API Endpoint Categories

### Health & Documentation (2)
- `GET /health` - Health check
- `GET /docs` - API documentation

### Authentication (4)
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/authenticate` - Authenticate user
- `GET /api/v1/auth/profile` - Get user profile

### Conversations (8)
- `POST /api/v1/conversation/start` - Start conversation
- `POST /api/v1/conversation/message` - Send message
- `POST /api/v1/conversation/batch` - Batch message processing
- `POST /api/v1/conversation/stream` - Stream message response
- `POST /api/v1/conversation/voice` - Voice message processing
- `GET /api/v1/conversation/:sessionId/analytics` - Get analytics
- `POST /api/v1/conversation/end` - End conversation
- `GET /api/v1/conversation` - List conversations

### Stories (6)
- `GET /api/v1/stories` - List stories
- `GET /api/v1/stories/:storyId` - Get story
- `POST /api/v1/stories` - Create story
- `POST /api/v1/stories/bulk` - Bulk operations
- `POST /api/v1/stories/:storyId/assets` - Generate assets
- `GET /api/v1/stories/:storyId/export` - Export story

### Characters (3)
- `GET /api/v1/characters` - List characters
- `POST /api/v1/characters` - Create character
- `GET /api/v1/characters/templates` - Get templates

### Deletion System (11)
- `POST /api/v1/account/delete` - Request account deletion
- `POST /api/v1/account/delete/confirm` - Confirm deletion
- `POST /api/v1/account/delete/cancel` - Cancel deletion
- `GET /api/v1/account/export` - Export account data
- `DELETE /api/v1/stories/:id` - Delete story
- `POST /api/v1/stories/:id/delete/cancel` - Cancel story deletion
- `DELETE /api/v1/characters/:id` - Delete character
- `POST /api/v1/libraries/:id/members/:userId/remove` - Remove library member
- `POST /api/v1/conversations/:sessionId/assets/clear` - Clear conversation assets
- `GET /api/v1/emails/:messageId/track` - Track email engagement

**See**: [API Endpoints Inventory](../../system/api_endpoints_inventory.md) for complete list

## Technical Specifications

### Performance
- **Average Response Time**: ~200-500ms for simple endpoints
- **Conversation Start**: ~500-1000ms (includes Router coordination)
- **Story Creation**: ~2-5s (depends on Content Agent)
- **Deletion Processing**: ~1-3s (depends on data volume)

### Scalability
- **Concurrent Requests**: Handles 1000+ concurrent requests
- **Rate Limiting**: Configurable per user/API key
- **Session Management**: Supports 10,000+ active sessions

### Dependencies
- **Supabase**: Database and authentication
- **Redis**: Conversation state caching
- **Router**: Intent classification and agent delegation
- **SendGrid**: Email delivery
- **AWS SES**: Email fallback
- **S3/Glacier**: Storage and archiving

## Limitations

1. **Lambda Timeout**: 30-second timeout limits long-running operations
2. **Memory**: 512 MB may be insufficient for large batch operations
3. **Cold Starts**: First request after inactivity may have ~500ms cold start
4. **Regional**: All resources must be in us-east-1 for optimal performance


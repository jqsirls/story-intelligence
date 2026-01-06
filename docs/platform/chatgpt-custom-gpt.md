# ChatGPT Custom GPT Integration for Storytailor

**Status**: ✅ Active  
**Last Updated**: 2025-12-17  
**Audience**: Users | Parents | Internal Team | Partners  
**Purpose**: Primary Storytailor Interface & Testing Platform

## Overview

The Storytailor Custom GPT provides the **complete Storytailor experience within ChatGPT**. Users can create accounts, build characters, generate personalized stories, manage their library, and access all Storytailor features - all through natural conversation in ChatGPT. This serves as the **primary interface** while the full Storytailor.com platform is being built, and will continue to be available as an alternative access method.

### What This Integration Provides

- **Complete Storytailor Experience**: Full access to all Storytailor features within ChatGPT
- **Account Management**: Create accounts, authenticate, manage profiles
- **Character Creation**: Build and manage characters through conversation
- **Story Generation**: Create personalized, award-caliber stories using Story Intelligence™
- **Library Management**: Access, organize, and manage your story library
- **Conversational Interface**: Natural language interaction for all features
- **Testing Platform**: Internal testing while building the full Storytailor.com platform

### Important Notes

- **Primary Interface**: This is currently the main way to access Storytailor while building the full platform
- **Future Access**: Users will later be able to access Storytailor.com directly, but this GPT will remain available
- **Full Feature Set**: All Storytailor capabilities are available through this interface
- **COPPA Compliance**: All stories require parent authentication; children should not use this directly
- **REST API Based**: Uses Storytailor's REST API endpoints (not MCP protocol)

### Important Distinctions

**REST API vs MCP Protocol:**
- **Custom GPT**: Tests REST API endpoints (`/v1/stories`, `/v1/characters`, etc.)
- **MCP Protocol**: Uses JSON-RPC 2.0 protocol for AI assistant integration (Cursor, Claude Desktop)
- **MCP Testing**: Use MCP-specific tools and scripts, not Custom GPT

**Code References:**
- `docs/platform/mcp/what.md` - MCP protocol documentation
- `docs/platform/sdks/rest-api.md` - REST API documentation
- `api/openapi-specification.yaml` - Complete OpenAPI specification

## Use Cases

### 1. Primary User Interface
- **Full Storytailor Experience**: Complete access to all features
- **Account Creation**: New users can create accounts and get started
- **Story Creation**: Create personalized stories through conversation
- **Library Management**: Access and manage story collections
- **Character Management**: Build and customize characters
- **Ongoing Access**: Available even after Storytailor.com launches

### 2. Internal Testing & Development
- **Platform Testing**: Test full user journeys while building Storytailor.com
- **Feature Validation**: Validate new features before full platform release
- **User Experience Testing**: Test conversational flows and interactions
- **API Integration Testing**: Verify API endpoints work correctly
- **QA Testing**: Comprehensive testing of all user journeys

### 3. Partner Demonstrations
- Show complete Storytailor capabilities to potential partners
- Demonstrate full user experience
- Showcase natural language interface
- Integration feasibility discussions

### 4. Early Access & Beta Testing
- Provide early access to new features
- Gather user feedback
- Test new capabilities
- Validate user experience improvements

## Prerequisites

### Required
- **ChatGPT Plus or Enterprise**: Custom GPTs require a paid ChatGPT subscription
- **OpenAPI Schema**: ChatGPT Actions configuration file (provided)

### For New Users
- **No API Key Needed Initially**: Users can create accounts through the GPT
- **Email Address**: Required for account creation
- **COPPA Compliance**: Parent/guardian verification for users under 13

### For Existing Users
- **Storytailor Account**: Existing account with active subscription
- **API Key**: Can be generated from account settings (optional - GPT can handle authentication)

### For Internal Testing
- **Internal API Key**: Contact platform team for staging credentials
- **Staging Access**: For testing new features

### For Partners
- **Partner Dashboard Access**: For partner API keys
- **Partner Agreement**: Rate limits and access configured per agreement

## Quick Start

### For New Users (Recommended)

**No setup required!** Just start chatting:

1. Open the Storytailor Custom GPT in ChatGPT
2. Start a conversation: "I'd like to create a story for my child"
3. The GPT will guide you through:
   - Account creation (if needed)
   - Character creation
   - Story creation
   - Library management

**That's it!** The GPT handles all authentication and setup automatically.

### For Existing Users

**Option 1: Use GPT Authentication (Recommended)**
- Just start chatting - the GPT will handle authentication
- No API key needed if you have an account

**Option 2: Use API Key**
1. Log in to your Storytailor account
2. Navigate to Settings → API Keys
3. Generate a new API key
4. Configure in Custom GPT Actions (see Step 3 below)

### For Developers/Partners

1. Access partner dashboard
2. Navigate to API Keys section
3. Generate partner API key
4. Configure rate limits as per agreement
5. Use API key in Custom GPT configuration

### For Internal Testing

1. Contact platform team for internal API key
2. Use staging environment credentials
3. Higher rate limits for testing
4. Configure with staging base URL

### Step 2: Create Custom GPT in ChatGPT

1. Open ChatGPT and navigate to "Explore GPTs"
2. Click "Create" to start building your Custom GPT
3. Configure the GPT with the following:

**Name**: Storytailor API Explorer  
**Description**: Explore and test Storytailor's REST API for personalized storytelling

**Instructions** (System Prompt):
```
You are Storytailor, an AI assistant that helps create personalized, award-caliber stories for children using Story Intelligence™ technology. You provide the complete Storytailor experience within ChatGPT.

IMPORTANT WARNINGS:
- ChatGPT Custom GPT is NOT COPPA-compliant for direct child use
- Parents should NOT allow children to use this Custom GPT directly
- All story creation requires parent authentication
- Stories created are subject to COPPA protections
- This is for parent use to create stories for their children

YOUR PRIMARY ROLE:
You are the complete Storytailor interface. Help users:
1. **Account Management**: Create accounts, authenticate, manage profiles
   - Guide new users through account creation
   - Handle authentication and login
   - Manage user preferences and settings

2. **Character Creation**: Help users build characters
   - Collect character details (name, age, personality, interests)
   - Create characters through the API
   - Manage existing characters
   - Update character information

3. **Story Creation**: Guide users through creating personalized stories
   - Understand what kind of story they want (adventure, bedtime, educational, etc.)
   - Collect story preferences and requirements
   - Generate stories using Story Intelligence™
   - Help customize and refine stories

4. **Library Management**: Help users access and manage their stories
   - List their story library
   - Retrieve specific stories
   - Organize and manage collections
   - Share stories (when feature available)

5. **Conversational Experience**: Provide a natural, friendly experience
   - Use age-appropriate language
   - Be warm, encouraging, and helpful
   - Guide users through processes step-by-step
   - Handle errors gracefully with helpful messages

CONVERSATION FLOW:
- Start by checking if user is authenticated (use API to check)
- If not authenticated, guide them through account creation or login
- Once authenticated, help them with their request
- For story creation: collect preferences → create story → confirm success
- Always confirm actions and provide next steps

ERROR HANDLING:
- If authentication fails, guide user to create account or check API key
- If rate limits hit, explain their tier and upgrade options
- If API errors occur, provide helpful error messages
- Always offer to help resolve issues

RATE LIMITS:
- Free tier: 10 requests/hour
- Family tier: 100 requests/hour
- Professional tier: 1000 requests/hour
- Explain limits clearly and suggest upgrades when needed

Always emphasize:
- Story Intelligence™ creates award-caliber, personalized stories
- All stories are COPPA-compliant and safe for children
- Quality and safety are top priorities
- Stories are created specifically for each child
```

### Step 3: Configure Actions (OpenAPI Schema)

1. In Custom GPT configuration, go to "Actions" section
2. Click "Create new action"
3. Import the OpenAPI schema from `docs/platform/chatgpt-custom-gpt/openapi-schema.yaml`
4. Configure authentication:

**For User-Facing GPT (Recommended)**:
- **Authentication Type**: API Key (optional - GPT can handle account creation)
- **Header Name**: `Authorization`
- **Header Format**: `Bearer {api_key}`
- **Note**: Users can create accounts through the GPT, so API key is optional initially

**For Testing/Development**:
- **Authentication Type**: API Key
- **Header Name**: `Authorization`
- **Header Format**: `Bearer {api_key}`
- **API Key**: Enter your Storytailor API key (internal, partner, or user key)

### Step 4: Test Integration

Test with a simple request:
```
"Hello, I'd like to create a story for my child"
```

The Custom GPT should:
1. Check if you're authenticated
2. If not, guide you through account creation or login
3. Once authenticated, help you create a character and story
4. Guide you through the complete story creation process

**Full User Journey Test**:
```
"Create an adventure story about a brave knight for my 7-year-old"
```

The GPT should handle the complete flow:
- Authentication check
- Character creation (if needed)
- Story preferences collection
- Story generation
- Confirmation and next steps

## Configuration Options

### Configuration 1: Internal Testing

**Use Case**: Team testing, QA, development

**Base URL**: 
```
https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging
```

**Authentication**:
- Internal JWT token or API key
- Contact platform team for credentials
- Higher rate limits for testing

**Rate Limits**: 
- Custom limits based on testing needs
- Typically 1000+ requests/hour

**Endpoints**: 
- Full access including internal endpoints
- Staging environment only

**Setup Steps**:
1. Obtain internal API key from platform team
2. Configure Custom GPT with staging base URL
3. Use internal API key for authentication
4. Test against staging environment

**Code References**:
- `docs/platform/sdks/rest-api.md` - REST API base URLs
- `AGENTS.md` - Environment configuration

### Configuration 2: Developer/Partner

**Use Case**: Partner integration testing, developer tooling

**Base URL**: 
```
https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws/v1
```
(Production) or staging (configurable)

**Authentication**:
- Partner API key from partner dashboard
- Developer tier access

**Rate Limits**: 
- Based on partner agreement
- Typically 100-1000 requests/hour

**Endpoints**: 
- Public API endpoints only
- No internal endpoints

**Setup Steps**:
1. Access partner dashboard
2. Generate partner API key
3. Configure Custom GPT with production/staging URL
4. Use partner API key for authentication

**Code References**:
- `docs/platform/a2a/development.md` - Partner integration guide
- `docs/platform/sdks/rest-api.md` - API authentication

### Configuration 3: Parent/Consumer (Primary Use Case)

**Use Case**: Complete Storytailor experience for parents and users

**Base URL**: 
```
https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws/v1
```
(Production only)

**Authentication**:
- User API key from Storytailor account
- **Initial Setup**: Users can create accounts through the GPT
- **Requirement**: Active Storytailor subscription (Free/Family/Professional tier)

**Rate Limits**: 
- Free tier: 10 requests/hour
- Family tier: 100 requests/hour
- Professional tier: 1000 requests/hour

**Endpoints**: 
- Full consumer-facing endpoints
- Account creation and authentication
- Story management
- Character management
- Conversations
- Library management

**Setup Steps**:
1. **For New Users**: 
   - Start conversation in Custom GPT
   - GPT will guide through account creation
   - API key generated automatically upon account creation
   
2. **For Existing Users**:
   - Log in to Storytailor account (via GPT or web)
   - Generate API key from Settings → API Keys
   - Configure Custom GPT with production URL
   - Use user API key for authentication

**Abuse Prevention**:
- API keys tied to user accounts
- Rate limits enforced per subscription tier
- Usage tracking and monitoring
- Automatic rate limiting
- Upgrade prompts for limit hits

**Code References**:
- `docs/platform/sdks/rest-api.md` - API authentication
- `packages/universal-agent/src/api/RESTAPIGateway.ts:381-419` - API key validation

## Authentication

### API Key Authentication

**Header Format**:
```
Authorization: Bearer <api_key>
```

**Alternative Format**:
```
X-API-Key: <api_key>
```

**For ChatGPT Actions**:
- Configure in Custom GPT Actions settings
- Authentication Type: API Key
- Header Name: `Authorization`
- Header Format: `Bearer {api_key}`

**Code References**:
- `packages/universal-agent/src/api/RESTAPIGateway.ts:381-419` - API key validation middleware
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2970-2994` - API key hashing

### JWT Token Authentication (Internal Only)

**Header Format**:
```
Authorization: Bearer <jwt_token>
```

**Use Case**: Internal testing only

**Code References**:
- `packages/universal-agent/src/api/RESTAPIGateway.ts:320-536` - JWT validation middleware

### Payment Plan Requirements (Parents/Consumers)

**For Parent/Consumer Use**:
- API keys are tied to user accounts with active subscriptions
- Rate limits enforced per subscription tier
- Usage tracking and monitoring
- Automatic rate limiting for free tier users
- Upgrade prompts for users hitting limits

**Subscription Tiers**:
- **Free Tier**: 10 requests/hour
- **Family Tier**: 100 requests/hour  
- **Professional Tier**: 1000 requests/hour

**Getting API Key**:
1. Log in to Storytailor account
2. Navigate to Settings → API Keys
3. Generate new API key
4. Copy API key for Custom GPT configuration

## OpenAPI Schema Configuration

### Using Existing OpenAPI Spec

The Storytailor OpenAPI specification is available at:
- **File**: `api/openapi-specification.yaml`
- **Version**: 5.1.0
- **Format**: OpenAPI 3.1

### ChatGPT-Optimized Schema

For Custom GPT Actions, you can use the full OpenAPI spec or create a simplified version focusing on key endpoints:

**Key Endpoints to Include**:
- Health check (`GET /health`)
- Story management (`GET /v1/stories`, `POST /v1/stories`, `GET /v1/stories/{storyId}`)
- Character management (`GET /v1/characters`, `POST /v1/characters`, `GET /v1/characters/{characterId}`)
- Conversation (`POST /v1/conversation/start`, `POST /v1/conversation/message`)

**Schema Configuration**:
1. Copy `api/openapi-specification.yaml`
2. Remove internal-only endpoints
3. Add authentication scheme:
   ```yaml
   components:
     securitySchemes:
       BearerAuth:
         type: http
         scheme: bearer
         bearerFormat: JWT
   ```
4. Add rate limit information to endpoint descriptions
5. Include example requests/responses

**Code References**:
- `api/openapi-specification.yaml` - Complete OpenAPI specification
- `docs/platform/sdks/rest-api.md` - API endpoint documentation

## Complete User Experience Guide

### Handling Full User Journeys

The Custom GPT should handle complete user journeys from start to finish:

#### 1. New User Onboarding

**Flow**:
1. User starts conversation: "I want to create a story"
2. GPT checks authentication (use `/v1/auth/me` endpoint)
3. If not authenticated:
   - Guide user through account creation
   - Collect required information (email, age verification for COPPA)
   - Create account via `/v1/auth/register`
   - Generate API key for user
   - Store API key for session
4. Once authenticated, proceed with user's request

**Example Conversation**:
```
User: "I'd like to create a story for my 7-year-old"
GPT: "I'd be happy to help! First, let me check if you have a Storytailor account..."
[Checks authentication]
GPT: "It looks like you're new here. Let's get you set up! I'll need:
- Your email address
- Confirmation that you're the parent/guardian (for COPPA compliance)
- Your child's age

Once we create your account, we can start creating amazing stories!"
```

#### 2. Story Creation Journey

**Flow**:
1. User requests story creation
2. GPT checks for existing characters
3. If no character: Guide character creation first
4. Collect story preferences:
   - Story type (adventure, bedtime, educational, etc.)
   - Character to feature
   - Preferences (theme, length, etc.)
5. Create story via `/v1/stories` endpoint
6. Confirm success and provide next steps

**Example Conversation**:
```
User: "Create an adventure story"
GPT: "Great! Let's create an adventure story. First, do you have a character, or would you like to create one?"
[If no character, guide through character creation]
GPT: "Perfect! Now, what kind of adventure would you like? Some options:
- A quest to find a hidden treasure
- A journey to save a magical kingdom
- An exploration of a mysterious island
- Or tell me your own idea!"
[Collect preferences]
GPT: "Wonderful! I'm creating your personalized adventure story now..."
[Creates story via API]
GPT: "Your story 'The Brave Knight's Quest' is ready! Would you like me to:
- Read it to you
- Save it to your library
- Create another story"
```

#### 3. Library Management

**Flow**:
1. User requests to see their stories
2. List stories via `/v1/stories` endpoint
3. Present stories in organized format
4. Allow user to:
   - View specific story details
   - Create new stories
   - Manage existing stories

**Example Conversation**:
```
User: "Show me my stories"
GPT: "Let me get your story library..."
[Fetches stories via API]
GPT: "You have 5 amazing stories in your library:
1. 'The Brave Knight's Quest' (Adventure) - Created 2 days ago
2. 'Luna's Bedtime Adventure' (Bedtime) - Created 1 week ago
3. 'The Magic School' (Educational) - Created 2 weeks ago
...

Which story would you like to explore, or would you like to create a new one?"
```

#### 4. Character Management

**Flow**:
1. User wants to create or manage characters
2. List existing characters via `/v1/characters`
3. Guide character creation:
   - Name
   - Age
   - Personality traits
   - Interests
4. Create character via `/v1/characters` endpoint
5. Confirm and offer to use in story

**Example Conversation**:
```
User: "I want to create a character named Luna"
GPT: "I'd love to help you create Luna! Let me ask a few questions:
- How old is Luna?
- What's Luna's personality like? (brave, curious, kind, etc.)
- What are Luna's interests? (adventure, animals, music, etc.)
- What species is Luna? (human, animal, fantasy creature, etc.)"
[Collects information]
GPT: "Perfect! I'm creating Luna now..."
[Creates character via API]
GPT: "Luna is ready! Would you like to create a story featuring Luna?"
```

### Error Handling & Recovery

The GPT should handle errors gracefully:

**Authentication Errors**:
- Guide user to create account or check API key
- Offer to help with account recovery
- Provide clear next steps

**Rate Limit Errors**:
- Explain current tier limits
- Suggest upgrade options
- Provide time until limit resets

**API Errors**:
- Provide helpful error messages
- Offer to retry
- Suggest alternative approaches

**Missing Information**:
- Ask clarifying questions
- Guide user through providing needed information
- Confirm understanding before proceeding

## Available Actions

Based on the OpenAPI specification, the following endpoints are available through Custom GPT:

### Authentication & Account Management

**Register User**:
- **Endpoint**: `POST /v1/auth/register`
- **Description**: Create a new Storytailor account with COPPA compliance
- **Request Body**: Email, password, age verification, parental consent (if under 13)
- **Authentication**: Not required (public endpoint)
- **Use Case**: New user onboarding

**Login User**:
- **Endpoint**: `POST /v1/auth/login`
- **Description**: Authenticate user and receive JWT tokens
- **Request Body**: Email, password
- **Authentication**: Not required (public endpoint)
- **Use Case**: Existing user authentication

**Get Current User**:
- **Endpoint**: `GET /v1/auth/me`
- **Description**: Get authenticated user profile
- **Authentication**: Required
- **Use Case**: Check authentication status, get user info

**Refresh Token**:
- **Endpoint**: `POST /v1/auth/refresh`
- **Description**: Refresh JWT access token
- **Request Body**: Refresh token
- **Authentication**: Not required (uses refresh token)
- **Use Case**: Maintain session

**Code References**:
- `api/openapi-specification.yaml:78-184` - Authentication endpoints
- `packages/universal-agent/src/api/RESTAPIGateway.ts` - Authentication implementation

### Story Management

**List Stories**:
- **Endpoint**: `GET /v1/stories`
- **Description**: Get user's story library
- **Parameters**: `limit`, `offset`, `type`
- **Authentication**: Required

**Create Story**:
- **Endpoint**: `POST /v1/stories`
- **Description**: Generate a new AI-powered story using Story Intelligence™
- **Request Body**: Character details, story type, preferences
- **Authentication**: Required

**Get Story**:
- **Endpoint**: `GET /v1/stories/{storyId}`
- **Description**: Get story details including content and audio
- **Parameters**: `storyId` (path parameter)
- **Authentication**: Required

**Update Story**:
- **Endpoint**: `PUT /v1/stories/{storyId}`
- **Description**: Update story metadata
- **Authentication**: Required

**Delete Story**:
- **Endpoint**: `DELETE /v1/stories/{storyId}`
- **Description**: Delete a story
- **Authentication**: Required

**Code References**:
- `api/openapi-specification.yaml:186-273` - Story endpoints
- `packages/universal-agent/src/api/RESTAPIGateway.ts:825-905` - Story endpoint implementation

### Character Management

**List Characters**:
- **Endpoint**: `GET /v1/characters`
- **Description**: Get user's character library
- **Authentication**: Required

**Create Character**:
- **Endpoint**: `POST /v1/characters`
- **Description**: Create a new character
- **Request Body**: Character name, age, species, preferences
- **Authentication**: Required

**Get Character**:
- **Endpoint**: `GET /v1/characters/{characterId}`
- **Description**: Get character details
- **Authentication**: Required

**Update Character**:
- **Endpoint**: `PUT /v1/characters/{characterId}`
- **Description**: Update character details
- **Authentication**: Required

**Code References**:
- `api/openapi-specification.yaml` - Character endpoints (search for `/v1/characters`)
- `packages/universal-agent/src/api/RESTAPIGateway.ts:906-971` - Character endpoint implementation

### Conversation

**Start Conversation**:
- **Endpoint**: `POST /v1/conversation/start`
- **Description**: Start a new storytelling conversation
- **Request Body**: Platform, language, voice settings
- **Authentication**: Required

**Send Message**:
- **Endpoint**: `POST /v1/conversation/message`
- **Description**: Send a message in a conversation
- **Request Body**: Session ID, message content
- **Authentication**: Required

**Get Conversation History**:
- **Endpoint**: `GET /v1/conversation/{sessionId}`
- **Description**: Get conversation history
- **Authentication**: Required

**Code References**:
- `api/openapi-specification.yaml` - Conversation endpoints
- `packages/universal-agent/src/api/RESTAPIGateway.ts:625-683` - Conversation endpoint implementation

### Health & Status

**Health Check**:
- **Endpoint**: `GET /health`
- **Description**: Check API health status
- **Authentication**: Not required (public endpoint)
- **Use Case**: Verify API availability, system status checks

**Code References**:
- `api/openapi-specification.yaml:57-75` - Health endpoint
- `packages/universal-agent/src/api/RESTAPIGateway.ts` - Health check implementation

## User Journey Examples

### Complete Story Creation Flow

**User**: "I want to create an adventure story for my 7-year-old daughter"

**GPT Flow**:
1. Check authentication: `GET /v1/auth/me`
2. If not authenticated: Guide account creation → `POST /v1/auth/register`
3. Check for characters: `GET /v1/characters`
4. If no character: Guide character creation → `POST /v1/characters`
5. Collect story preferences (conversation)
6. Create story: `POST /v1/stories`
7. Confirm success and offer next steps

**Expected GPT Behavior**:
- Friendly, conversational tone
- Step-by-step guidance
- Clear confirmations
- Helpful error messages
- Natural conversation flow

### Library Access Flow

**User**: "Show me my stories"

**GPT Flow**:
1. Check authentication: `GET /v1/auth/me`
2. If authenticated: List stories → `GET /v1/stories`
3. Present stories in organized format
4. Offer to view specific story or create new one

**Expected GPT Behavior**:
- Present stories clearly
- Offer actions (view, create, manage)
- Help navigate library
- Suggest creating new stories if library is empty

## Rate Limiting & Abuse Prevention

### Rate Limiting Strategy

**Default Rate Limits**:
- **Free Tier**: 10 requests/hour
- **Family Tier**: 100 requests/hour
- **Professional Tier**: 1000 requests/hour
- **Internal/Partner**: Custom limits based on agreement

**Rate Limit Headers**:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time when limit resets

**Code References**:
- `packages/universal-agent/src/api/RESTAPIGateway.ts:340-380` - Rate limiting middleware
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2890-2893` - Per-API-key rate limits

### Abuse Prevention

**Payment Plan Integration**:
- API keys are tied to user accounts with active subscriptions
- Rate limits enforced per subscription tier
- Usage tracking and monitoring
- Automatic rate limiting for free tier users
- Upgrade prompts for users hitting limits

**Monitoring**:
- All API requests are logged
- Usage patterns are monitored
- Unusual activity triggers alerts
- Rate limit violations are tracked

**Upgrade Paths**:
- Free tier users hitting limits receive upgrade prompts
- Family tier users can upgrade to Professional tier
- Professional tier users can request custom limits

**Code References**:
- `packages/universal-agent/src/api/RESTAPIGateway.ts:340-380` - Rate limiting implementation
- `docs/platform/sdks/rest-api.md:209-220` - Rate limiting documentation

## COPPA Compliance

### Important Warnings

**ChatGPT Custom GPT is NOT COPPA-Compliant for Direct Child Use**

- **Children should NOT use this Custom GPT directly**
- **Parents should NOT allow children to access this Custom GPT**
- **This tool is for parent/developer exploration only**

### Usage Guidelines

**For Parents**:
- Use Custom GPT to explore Storytailor capabilities
- Create stories through Custom GPT (requires parent authentication)
- All stories created are subject to COPPA protections
- Children should use official Storytailor apps/platforms, not Custom GPT

**For Developers/Partners**:
- Use Custom GPT for API exploration and testing
- Not intended for end-user child interactions
- All child interactions must go through COPPA-compliant channels

**For Internal Testing**:
- Use for API testing and validation
- Not for child user testing
- Child testing should use official Storytailor platforms

### Child Safety

**All Story Creation**:
- Requires parent authentication
- Subject to COPPA protections
- Content moderation applies
- Child safety agent screening

**Stories Created Through Custom GPT**:
- Same COPPA protections as official platforms
- Parent authentication required
- Content safety screening applies
- Age-appropriate content generation

**Code References**:
- `docs/brand/ethical-positioning-guidelines.md` - COPPA compliance guidelines
- `docs/agents/child-safety-agent/what.md` - Child safety agent documentation

## Troubleshooting

### Common Issues

#### Issue 1: Authentication Failed

**Symptoms**: 
- "401 Unauthorized" errors
- "Invalid API key" messages

**Solutions**:
1. Verify API key is correct
2. Check API key format: `Bearer <api_key>` or `X-API-Key: <api_key>`
3. Ensure API key is active (not revoked)
4. For parent/consumer: Verify active subscription
5. Check API key permissions match endpoint requirements

**Code References**:
- `packages/universal-agent/src/api/RESTAPIGateway.ts:381-419` - API key validation

#### Issue 2: Rate Limit Exceeded

**Symptoms**:
- "429 Too Many Requests" errors
- Rate limit headers show 0 remaining

**Solutions**:
1. Check current subscription tier
2. Review rate limit headers for reset time
3. Wait for rate limit window to reset
4. Consider upgrading subscription tier
5. For internal testing: Request higher rate limits

**Code References**:
- `packages/universal-agent/src/api/RESTAPIGateway.ts:340-380` - Rate limiting

#### Issue 3: Endpoint Not Found

**Symptoms**:
- "404 Not Found" errors
- Endpoint not available in Custom GPT

**Solutions**:
1. Verify endpoint path is correct
2. Check OpenAPI schema includes the endpoint
3. Verify endpoint is public (not internal-only)
4. Check base URL configuration
5. Review endpoint documentation

**Code References**:
- `api/openapi-specification.yaml` - Complete endpoint list
- `docs/system/api-endpoints-inventory.md` - Endpoint inventory

#### Issue 4: Invalid Request Format

**Symptoms**:
- "400 Bad Request" errors
- Request body validation errors

**Solutions**:
1. Review endpoint documentation for required fields
2. Check request body format matches schema
3. Verify parameter types (string, number, boolean)
4. Check required vs optional fields
5. Review example requests in documentation

**Code References**:
- `api/openapi-specification.yaml` - Request/response schemas
- `docs/platform/sdks/rest-api.md` - API examples

#### Issue 5: Custom GPT Not Responding

**Symptoms**:
- Custom GPT doesn't call API
- No response from Custom GPT

**Solutions**:
1. Verify OpenAPI schema is correctly configured
2. Check authentication is set up properly
3. Verify base URL is accessible
4. Test API endpoint directly (curl/Postman)
5. Check ChatGPT Actions configuration

### Getting Help

**Internal Team**:
- Contact Platform Integration team
- Check `#platform-integration` Slack channel
- Review internal documentation

**Partners**:
- Contact partner support
- Review partner documentation
- Access partner dashboard

**Parents/Consumers**:
- Contact Storytailor support
- Review user documentation
- Check account settings

## Code References

### API Implementation
- `packages/universal-agent/src/api/RESTAPIGateway.ts:74-3500` - Complete REST API Gateway implementation
- `packages/universal-agent/src/api/RESTAPIGateway.ts:381-419` - API key validation middleware
- `packages/universal-agent/src/api/RESTAPIGateway.ts:320-536` - JWT validation middleware
- `packages/universal-agent/src/api/RESTAPIGateway.ts:340-380` - Rate limiting middleware

### API Documentation
- `docs/platform/sdks/rest-api.md` - REST API documentation
- `api/openapi-specification.yaml` - Complete OpenAPI specification
- `docs/system/api-endpoints-inventory.md` - Endpoint inventory
- `docs/storytailor/partner_integration.md:148-266` - REST API endpoints

### Related Documentation
- `docs/platform/mcp/what.md` - MCP protocol (different from REST API)
- `docs/platform/a2a/development.md` - A2A protocol development guide
- `docs/brand/ethical-positioning-guidelines.md` - COPPA compliance guidelines
- `AGENTS.md` - Environment configuration and URLs

## Related Documentation

- **[REST API Documentation](./sdks/rest-api.md)** - Complete REST API reference
- **[MCP Protocol Documentation](./mcp/what.md)** - MCP protocol (JSON-RPC 2.0, not REST)
- **[A2A Protocol Documentation](./a2a/development.md)** - Agent-to-Agent protocol
- **[Partner Integration Guide](../../storytailor/partner_integration.md)** - Partner integration guide

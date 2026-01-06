Status: Draft  
Audience: Partner  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 3 - Story Intelligence partner API documentation with code references

# Story Intelligence™ Partner API

## Overview

This document describes how partners can integrate with Story Intelligence™ through REST APIs, webhooks, and SDKs to leverage award-caliber story generation capabilities.

## API Base URL

```
**Production (us-east-1):** `https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws/v1` ✅
**Production (us-east-1):** `https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws/v1` ✅

**Note:** Production resources are in `us-east-1`. The legacy URL may be for staging/legacy purposes. Verify which URL to use for your environment.
```

**Code Reference:**
- `docs/system/inventory.md` - API endpoint inventory
- `docs/docs/PLATFORM_OVERVIEW.md:241-244` - Base URL configuration

## Authentication

### API Key Authentication

All Story Intelligence API requests require authentication via API key.

**Header Format:**
```
Authorization: Bearer <api_key>
```

**API Key Management:**
- Create API keys: `POST /v1/developer/api-keys`
- List API keys: `GET /v1/developer/api-keys`
- Revoke API keys: `DELETE /v1/developer/api-keys/:keyId`

**Code References:**
- `packages/universal-agent/src/RESTAPIGateway.ts` - API key authentication middleware
- `supabase/migrations/` - API key storage schema (hashed with SHA-256)
- `docs/storytailor/partner_integration.md` - Complete partner integration guide

## Story Intelligence Endpoints

### Story Creation

#### Create Story with Story Intelligence

**Endpoint:** `POST /v1/stories`

**Request Body:**
```json
{
  "characterId": "char_123",
  "storyType": "Adventure",
  "userAge": 6,
  "preferences": {
    "mood": "excited",
    "themes": ["friendship", "courage"],
    "avoidTopics": []
  }
}
```

**Response:**
```json
{
  "id": "story_123",
  "characterId": "char_123",
  "storyType": "Adventure",
  "outline": "Hero's journey outline...",
  "currentBeat": 0,
  "choices": [
    {
      "id": "choice_1",
      "text": "Explore the forest",
      "consequence": "Discovers hidden path"
    }
  ]
}
```

**Code References:**
- `packages/content-agent/src/services/StoryCreationService.ts:46-78` - Story draft creation
- `packages/content-agent/src/services/StoryCreationService.ts:205-250` - Hero's journey generation
- `packages/router/src/services/IntentClassifier.ts:400-407` - Story creation intent routing

### Story Continuation

#### Continue Story Beat

**Endpoint:** `POST /v1/stories/:storyId/beats`

**Request Body:**
```json
{
  "userChoice": "choice_1",
  "voiceInput": "I want to explore the forest"
}
```

**Response:**
```json
{
  "beat": {
    "id": "beat_2",
    "sequence": 2,
    "content": "Story beat content...",
    "emotionalTone": "excited"
  },
  "choices": [
    {
      "id": "choice_2",
      "text": "Follow the path",
      "consequence": "Reaches clearing"
    }
  ],
  "isComplete": false
}
```

**Code References:**
- `packages/content-agent/src/services/StoryCreationService.ts:83-100` - Story beat continuation
- `packages/content-agent/src/services/StoryCreationService.ts:332-365` - Beat content generation
- `packages/content-agent/src/services/StoryCreationService.ts:372-402` - Choice generation

### Character Creation

#### Create Character with Story Intelligence

**Endpoint:** `POST /v1/characters`

**Request Body:**
```json
{
  "name": "Luna",
  "age": 6,
  "species": "human",
  "appearance": {
    "eyeColor": "brown",
    "hairColor": "black",
    "hairTexture": "curly"
  },
  "personality": ["brave", "curious"],
  "interests": ["space", "animals"]
}
```

**Response:**
```json
{
  "id": "char_123",
  "name": "Luna",
  "traits": {
    "age": 6,
    "species": "human",
    "appearance": { ... },
    "personality": ["brave", "curious"],
    "interests": ["space", "animals"]
  }
}
```

**Code References:**
- `packages/content-agent/src/services/CharacterGenerationService.ts:104-144` - Character trait extraction
- `packages/content-agent/src/services/CharacterGenerationService.ts:419-458` - Conversational character creation
- `docs/prompts-library/content-generation.md#character-generation-prompts` - Character prompts

## Story Intelligence Features

### Narrative Intelligence Features

**Hero's Journey Structure:**
- 12-beat narrative arc
- Character transformation
- Mentor figures and threshold guardians
- Trials and revelations

**Code References:**
- `packages/content-agent/src/services/StoryCreationService.ts:211-225` - 12-beat structure
- `docs/prompts-library/content-generation.md#heros-journey-outline` - Hero's journey prompts

### Developmental Intelligence Features

**Age-Appropriate Content:**
- Automatic age detection and adaptation
- Vocabulary level matching
- Sentence structure complexity
- Emotional complexity matching

**Code References:**
- `packages/content-agent/src/services/PromptSelector.ts:35-89` - Age constraints
- `lambda-deployments/conversation-agent/src/prompts/FrankieSystemPrompt.js:179-238` - Age-specific adaptations

### Personal Intelligence Features

**Character Profile Integration:**
- Individual personality traits
- Family relationship dynamics
- Cultural background nuances
- Personal interests and passions

**Code References:**
- `packages/personality-agent/src/PersonalityFramework.ts:29-36` - Personality traits
- `packages/content-agent/src/services/CharacterGenerationService.ts:104-144` - Profile handling

### Literary Excellence Features

**Quality Standards:**
- Pulitzer-quality narrative structure
- Publishing-grade grammar and syntax
- Award-caliber storytelling techniques
- Professional editorial process

**Code References:**
- `packages/content-agent/src/services/StoryCreationService.ts:237-238` - Pulitzer-quality prompt
- `packages/analytics-intelligence/src/services/StoryQualityAssessmentService.ts:8-659` - Quality assessment

## Webhooks

### Story Intelligence Events

Partners can subscribe to Story Intelligence events via webhooks:

**Available Events:**
- `story.created` - Story draft created
- `story.updated` - Story beat added or updated
- `story.completed` - Story finished
- `character.created` - Character created
- `character.updated` - Character updated

**Webhook Configuration:**
- Create webhook: `POST /v1/webhooks`
- List webhooks: `GET /v1/webhooks`
- Update webhook: `PUT /v1/webhooks/:webhookId`
- Delete webhook: `DELETE /v1/webhooks/:webhookId`

**Code References:**
- `packages/universal-agent/src/RESTAPIGateway.ts` - Webhook management endpoints
- `supabase/migrations/` - Webhook storage schema
- `docs/storytailor/partner_integration.md` - Webhook integration details

## Rate Limiting

**Limits:**
- Story creation: 10 requests/minute per API key
- Story continuation: 30 requests/minute per API key
- Character creation: 20 requests/minute per API key

**Headers:**
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: Time when limit resets

**Code References:**
- `packages/universal-agent/src/middleware/` - Rate limiting middleware
- `docs/storytailor/partner_integration.md` - Rate limiting details

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "STORY_CREATION_FAILED",
    "message": "Failed to create story: Invalid character ID",
    "details": {
      "characterId": "char_invalid"
    }
  }
}
```

### Common Error Codes

- `STORY_CREATION_FAILED` - Story creation error
- `CHARACTER_NOT_FOUND` - Character ID not found
- `INVALID_STORY_TYPE` - Invalid story type
- `AGE_OUT_OF_RANGE` - Age not supported
- `RATE_LIMIT_EXCEEDED` - Rate limit exceeded
- `AUTHENTICATION_FAILED` - Invalid API key

**Code References:**
- `packages/universal-agent/src/RESTAPIGateway.ts` - Error handling
- `packages/shared-types/src/errors.ts` - Error type definitions

## SDKs (Coming Soon)

**Planned SDKs:**
- JavaScript/TypeScript SDK
- Python SDK
- iOS SDK
- Android SDK

**Code References:**
- `docs/storytailor/partner_integration.md` - SDK roadmap

## Integration Examples

### Basic Story Creation

```javascript
const response = await fetch('**Production (us-east-1):** `https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws/v1` ✅
**Production (us-east-1):** `https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws/v1` ✅

**Note:** Production resources are in `us-east-1`. The legacy URL may be for staging/legacy purposes. Verify which URL to use for your environment./stories', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    characterId: 'char_123',
    storyType: 'Adventure',
    userAge: 6,
    preferences: {
      mood: 'excited',
      themes: ['friendship', 'courage']
    }
  })
});

const story = await response.json();
```

### Continue Story

```javascript
const response = await fetch(`**Production (us-east-1):** `https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws/v1` ✅
**Production (us-east-1):** `https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws/v1` ✅

**Note:** Production resources are in `us-east-1`. The legacy URL may be for staging/legacy purposes. Verify which URL to use for your environment./stories/${storyId}/beats`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userChoice: 'choice_1',
    voiceInput: 'I want to explore the forest'
  })
});

const nextBeat = await response.json();
```

## Best Practices

### Story Intelligence Integration

1. **Use Appropriate Story Types**: Select story types that match the child's age and interests
2. **Provide Character Context**: Include detailed character information for better story quality
3. **Handle Choices Gracefully**: Present choices in age-appropriate format
4. **Monitor Quality**: Use quality assessment endpoints to ensure award-caliber output
5. **Respect Rate Limits**: Implement exponential backoff for rate limit errors

**Code References:**
- `packages/content-agent/src/services/StoryTypeClassifier.ts:70-94` - Story type classification
- `packages/content-agent/src/services/PromptSelector.ts:35-89` - Age-appropriate constraints
- `packages/analytics-intelligence/src/services/StoryQualityAssessmentService.ts:8-659` - Quality assessment

## Related Documentation

- **Overview:** See [Story Intelligence Overview](./overview.md)
- **Architecture:** See [Story Intelligence Architecture](./architecture.md)
- **Partner Integration:** See [Partner Integration Guide](../storytailor/partner_integration.md)
- **API Reference:** See [Complete API Documentation](../../docs/docs/API_DOCUMENTATION.md)

# API Reference

> **🚨 BREAKING CHANGES**: Version 4.0.0 deployed with critical age validation fixes - [View Changelog](../CHANGELOG.md)

> **REST API Contract Precedence (Product REST API)**: For the product REST API, the canonical contract is `docs/api/REST_API_EXPERIENCE_MASTER.md`.  
> This `docs/api-reference/**` section contains legacy and multi-surface reference content and may not match the current product REST gateway.

Complete reference documentation for the Storytailor API. Build Story Intelligence™ powered storytelling experiences with our comprehensive REST API and GraphQL endpoints.

## 🚀 Getting Started

### Base URLs

**Production** (Product REST API)
```
https://api.storytailor.dev/api/v1
```

**Staging** (Product REST API)
```
https://staging-api.storytailor.dev/api/v1
```

**Note**: If this file lists other base URLs elsewhere, treat them as legacy unless they are explicitly verified.

### Authentication

Product REST API requests require **JWT** authentication:

```http
Authorization: Bearer <jwt_token>
```

### Request Format

All requests should include the `Content-Type` header:

```http
Content-Type: application/json
```

### Response Format

Most product REST responses are returned in JSON format:

```json
{
  "success": true,
  "data": { /* response data */ }
}
```

## 📚 API Endpoints

### Conversations

#### Start Conversation

Start a new storytelling conversation.

```http
POST /conversations
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | Yes | Unique identifier for the user |
| `storyType` | string | No | Type of story (adventure, bedtime, educational, etc.) |
| `ageGroup` | string | No | Target age group (3-5, 6-8, 9-12) |
| `language` | string | No | Language code (en, es, fr, etc.) |
| `voiceEnabled` | boolean | No | Enable voice input/output |

**Example Request:**

```json
{
  "userId": "user-123",
  "storyType": "adventure",
  "ageGroup": "6-8",
  "language": "en",
  "voiceEnabled": true
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "conversationId": "conv_abc123",
    "status": "active",
    "welcomeMessage": "Hi! I'm excited to create an adventure story with you. What's your character's name?",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Send Message

Send a message in an active conversation.

```http
POST /conversations/{conversationId}/messages
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | string | Yes | The message content |
| `messageType` | string | No | Type of message (text, voice) |
| `metadata` | object | No | Additional message metadata |

**Example Request:**

```json
{
  "message": "My character's name is Luna and she's a magical unicorn",
  "messageType": "text",
  "metadata": {
    "timestamp": "2024-01-15T10:31:00Z",
    "platform": "web"
  }
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "messageId": "msg_xyz789",
    "response": "Luna is a beautiful name for a magical unicorn! What color is Luna's coat?",
    "responseType": "text",
    "conversationState": "character_creation",
    "suggestions": ["Silver", "White", "Rainbow", "Golden"]
  }
}
```

#### Get Conversation

Retrieve conversation details and history.

```http
GET /conversations/{conversationId}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": "conv_abc123",
    "userId": "user-123",
    "status": "active",
    "storyType": "adventure",
    "messages": [
      {
        "id": "msg_001",
        "content": "Hi! I'm excited to create an adventure story with you.",
        "sender": "ai",
        "timestamp": "2024-01-15T10:30:00Z"
      },
      {
        "id": "msg_002",
        "content": "My character's name is Luna",
        "sender": "user",
        "timestamp": "2024-01-15T10:31:00Z"
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:31:00Z"
  }
}
```

### Stories

#### Create Story

Create a new story with specified parameters.

```http
POST /stories
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Story title |
| `character` | object | Yes | Character details |
| `storyType` | string | Yes | Type of story |
| `ageGroup` | string | Yes | Target age group |
| `generateAssets` | boolean | No | Generate images, audio, and PDF |

**Example Request:**

```json
{
  "title": "Luna's Magical Adventure",
  "character": {
    "name": "Luna",
    "species": "unicorn",
    "traits": {
      "personality": ["brave", "kind", "magical"],
      "appearance": {
        "coatColor": "silver",
        "maneColor": "rainbow",
        "eyeColor": "blue"
      }
    }
  },
  "storyType": "adventure",
  "ageGroup": "6-8",
  "generateAssets": true
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": "story_def456",
    "title": "Luna's Magical Adventure",
    "content": "Once upon a time, in a magical forest far away, lived a beautiful silver unicorn named Luna...",
    "character": {
      "id": "char_ghi789",
      "name": "Luna",
      "species": "unicorn",
      "traits": {
        "personality": ["brave", "kind", "magical"],
        "appearance": {
          "coatColor": "silver",
          "maneColor": "rainbow",
          "eyeColor": "blue"
        }
      }
    },
    "storyType": "adventure",
    "ageGroup": "6-8",
    "status": "completed",
    "assets": {
      "coverArt": "https://assets.storytailor.com/stories/story_def456/cover.jpg",
      "characterArt": "https://assets.storytailor.com/stories/story_def456/character.jpg",
      "audio": "https://assets.storytailor.com/stories/story_def456/audio.mp3",
      "pdf": "https://assets.storytailor.com/stories/story_def456/story.pdf"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "completedAt": "2024-01-15T10:35:00Z"
  }
}
```

#### Get Story

Retrieve a specific story by ID.

```http
GET /stories/{storyId}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": "story_def456",
    "title": "Luna's Magical Adventure",
    "content": "Once upon a time, in a magical forest far away...",
    "character": {
      "id": "char_ghi789",
      "name": "Luna",
      "species": "unicorn"
    },
    "storyType": "adventure",
    "ageGroup": "6-8",
    "status": "completed",
    "assets": {
      "coverArt": "https://assets.storytailor.com/stories/story_def456/cover.jpg",
      "audio": "https://assets.storytailor.com/stories/story_def456/audio.mp3"
    },
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### List Stories

Retrieve a list of stories with optional filtering.

```http
GET /stories
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | Filter by user ID |
| `storyType` | string | Filter by story type |
| `ageGroup` | string | Filter by age group |
| `status` | string | Filter by status (draft, completed) |
| `limit` | integer | Number of results (max 100) |
| `offset` | integer | Pagination offset |

**Example Request:**

```http
GET /stories?userId=user-123&storyType=adventure&limit=10
```

**Example Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "story_def456",
      "title": "Luna's Magical Adventure",
      "storyType": "adventure",
      "status": "completed",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "total": 1,
    "limit": 10,
    "offset": 0,
    "hasMore": false
  }
}
```

### Characters

#### Create Character

Create a new character for stories.

```http
POST /characters
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Character name |
| `species` | string | Yes | Character species |
| `traits` | object | Yes | Character traits and appearance |

**Example Request:**

```json
{
  "name": "Spark",
  "species": "dragon",
  "traits": {
    "personality": ["brave", "friendly", "curious"],
    "appearance": {
      "scaleColor": "emerald green",
      "eyeColor": "golden",
      "size": "medium"
    },
    "abilities": ["fire-breathing", "flying", "magic"]
  }
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": "char_jkl012",
    "name": "Spark",
    "species": "dragon",
    "traits": {
      "personality": ["brave", "friendly", "curious"],
      "appearance": {
        "scaleColor": "emerald green",
        "eyeColor": "golden",
        "size": "medium"
      },
      "abilities": ["fire-breathing", "flying", "magic"]
    },
    "avatarUrl": "https://assets.storytailor.com/characters/char_jkl012/avatar.jpg",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Voice Synthesis

#### Synthesize Speech

Convert text to speech with customizable voice settings.

```http
POST /voice/synthesize
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | Yes | Text to synthesize |
| `voice` | string | No | Voice ID or name |
| `speed` | number | No | Speech speed (0.5-2.0) |
| `emotion` | string | No | Emotional tone |
| `format` | string | No | Audio format (mp3, wav) |

**Example Request:**

```json
{
  "text": "Once upon a time, in a magical forest far away, lived a beautiful silver unicorn named Luna.",
  "voice": "child-friendly-narrator",
  "speed": 1.0,
  "emotion": "excited",
  "format": "mp3"
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "audioUrl": "https://assets.storytailor.com/audio/audio_mno345.mp3",
    "duration": 12.5,
    "format": "mp3",
    "voice": "child-friendly-narrator",
    "generatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Asset Generation

#### Generate Story Assets

Generate images, audio, and PDF for a story.

```http
POST /assets/generate
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `storyId` | string | Yes | Story ID |
| `assetTypes` | array | Yes | Types of assets to generate |
| `style` | string | No | Art style preference |
| `quality` | string | No | Quality level (standard, high) |

**Example Request:**

```json
{
  "storyId": "story_def456",
  "assetTypes": ["cover_art", "character_art", "audio", "pdf"],
  "style": "watercolor",
  "quality": "high"
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "storyId": "story_def456",
    "assets": {
      "coverArt": {
        "url": "https://assets.storytailor.com/stories/story_def456/cover.jpg",
        "style": "watercolor",
        "generatedAt": "2024-01-15T10:32:00Z"
      },
      "characterArt": {
        "url": "https://assets.storytailor.com/stories/story_def456/character.jpg",
        "style": "watercolor",
        "generatedAt": "2024-01-15T10:33:00Z"
      },
      "audio": {
        "url": "https://assets.storytailor.com/stories/story_def456/audio.mp3",
        "duration": 180.5,
        "generatedAt": "2024-01-15T10:34:00Z"
      },
      "pdf": {
        "url": "https://assets.storytailor.com/stories/story_def456/story.pdf",
        "pages": 8,
        "generatedAt": "2024-01-15T10:35:00Z"
      }
    },
    "generationTime": 180000
  }
}
```

### Libraries

#### Create Library

Create a new story library.

```http
POST /libraries
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | Library name |
| `description` | string | No | Library description |
| `isPublic` | boolean | No | Whether library is public |

**Example Request:**

```json
{
  "name": "My Adventure Stories",
  "description": "A collection of exciting adventure stories",
  "isPublic": false
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": "lib_pqr678",
    "name": "My Adventure Stories",
    "description": "A collection of exciting adventure stories",
    "isPublic": false,
    "ownerId": "user-123",
    "storyCount": 0,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Webhooks

#### Create Webhook

Register a webhook endpoint for real-time notifications.

```http
POST /webhooks
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Webhook endpoint URL |
| `events` | array | Yes | Events to subscribe to |
| `secret` | string | No | Secret for signature verification |

**Example Request:**

```json
{
  "url": "https://yourapp.com/webhooks/storytailor",
  "events": ["story.completed", "character.created"],
  "secret": "your-webhook-secret"
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": "webhook_stu901",
    "url": "https://yourapp.com/webhooks/storytailor",
    "events": ["story.completed", "character.created"],
    "status": "active",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

## 🔒 Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request is missing required parameters",
    "details": {
      "missingFields": ["userId", "storyType"]
    },
    "requestId": "req_123456789",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Request is malformed or missing required parameters |
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `FORBIDDEN` | 403 | Insufficient permissions for the requested operation |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `RATE_LIMITED` | 429 | Too many requests, rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

## 📊 Rate Limits

### Default Limits

| Plan | Requests per minute | Requests per day |
|------|-------------------|------------------|
| Free | 60 | 1,000 |
| Basic | 300 | 10,000 |
| Pro | 1,000 | 50,000 |
| Enterprise | Custom | Custom |

### Rate Limit Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248000
```

## 🔄 Pagination

### Request Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Number of results per page (max 100) |
| `offset` | integer | Number of results to skip |

### Response Format

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 150,
    "limit": 20,
    "offset": 40,
    "hasMore": true
  }
}
```

## 🎯 GraphQL API

### GraphQL Endpoint

```
POST https://api.storytailor.com/graphql
```

### Example Query

```graphql
query GetStories($userId: String!, $limit: Int) {
  stories(userId: $userId, limit: $limit) {
    id
    title
    storyType
    character {
      name
      species
    }
    assets {
      coverArt
      audio
    }
    createdAt
  }
}
```

### Example Mutation

```graphql
mutation CreateStory($input: CreateStoryInput!) {
  createStory(input: $input) {
    id
    title
    content
    character {
      id
      name
    }
    assets {
      coverArt
      audio
      pdf
    }
  }
}
```

## 📡 WebSocket API

### Connection

```javascript
const ws = new WebSocket('wss://api.storytailor.com/v1/ws');

ws.onopen = () => {
  // Authenticate
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your-api-key'
  }));
};
```

### Real-time Events

```javascript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'story.progress':
      console.log('Story generation progress:', data.progress);
      break;
    case 'story.completed':
      console.log('Story completed:', data.story);
      break;
    case 'conversation.message':
      console.log('New message:', data.message);
      break;
  }
};
```

## 🛠 SDKs and Libraries

### Official SDKs

- **JavaScript/Node.js**: `@storytailor/node-sdk`
- **Python**: `storytailor-python`
- **PHP**: `storytailor/php-sdk`
- **Ruby**: `storytailor-ruby`
- **Go**: `github.com/storytailor/go-sdk`

### Installation

```bash
# Node.js
npm install @storytailor/node-sdk

# Python
pip install storytailor

# PHP
composer require storytailor/php-sdk
```

---

## 🔗 Related Resources

- 🚀 **[Quick Start Guide](../README.md)**
- 🛠 **[Integration Guides](../integration-guides/README.md)**
- 📊 **[Developer Dashboard](../tools/dashboard.md)**
- 🧪 **[Testing Tools](../tools/testing.md)**
- 💬 **[Support](../support/README.md)**

Need help? Check out our [interactive API explorer](../tools/api-explorer.md) or [contact support](../support/contact.md)!
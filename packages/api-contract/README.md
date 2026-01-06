# @storytailor/api-contract

OpenAPI specifications and type definitions for Storytailor platform APIs.

## Overview

This package provides comprehensive API contracts for the Storytailor platform, ensuring type safety and consistent integration across all client applications. Powered by Story Intelligence™, these contracts define the interfaces for multi-agent storytelling, character creation, and knowledge base interactions.

## Installation

```bash
npm install @storytailor/api-contract
```

## Usage

### TypeScript Types

```typescript
import {
  ConversationStartRequest,
  ConversationStartResponse,
  StoryCreateRequest,
  CharacterCreateRequest,
  API_CONFIG,
  ENDPOINTS
} from '@storytailor/api-contract';

// Type-safe API requests
const startConversation = async (request: ConversationStartRequest): Promise<ConversationStartResponse> => {
  const response = await fetch(`${API_CONFIG.baseUrls.staging}${ENDPOINTS.conversations.start}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  
  return response.json();
};
```

### Zod Schema Validation

```typescript
import { ConversationStartRequestSchema, ErrorResponseSchema } from '@storytailor/api-contract';

// Validate requests
const validateRequest = (data: unknown) => {
  const result = ConversationStartRequestSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid request: ${result.error.message}`);
  }
  return result.data;
};

// Validate API responses
const validateResponse = (response: unknown) => {
  if ('success' in response && !response.success) {
    return ErrorResponseSchema.parse(response);
  }
  // Handle success response...
};
```

### OpenAPI Specification

```typescript
import { openApiSpec } from '@storytailor/api-contract';

// Generate API documentation
console.log(openApiSpec.info.title); // "Storytailor Platform API"
console.log(openApiSpec.info.description); // "Storytailor® Platform API powered by Story Intelligence™"
```

## API Endpoints

### Conversations

Start and manage storytelling conversations:

- `POST /v1/conversation/start` - Start new conversation
- `POST /v1/conversation/message` - Send message
- `POST /v1/conversation/end` - End conversation

### Stories

Create and manage stories:

- `GET /stories` - List user stories
- `POST /stories` - Create new story
- `GET /stories/{id}` - Get specific story

### Characters

Character creation and management:

- `GET /characters` - List user characters
- `POST /characters` - Create new character
- `GET /characters/{id}` - Get specific character

### Knowledge Base

Story Intelligence™ knowledge queries:

- `POST /knowledge/query` - Query knowledge base
- `GET /knowledge/health` - Knowledge system health

### Authentication

User authentication and management:

- `POST /auth/register` - Register new user (COPPA compliant)
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh tokens

## Type Definitions

### Core Types

```typescript
interface User {
  id: string;
  email: string;
  age: number; // 3-120 range
  userType: 'child' | 'parent' | 'teacher' | 'organization';
  firstName: string;
  lastName: string;
  parentEmail?: string; // Required for users under 13
}

interface Story {
  id: string;
  userId: string;
  title: string;
  content: string;
  ageRange: string;
  themes: string[];
  metadata: Record<string, any>;
}

interface Character {
  id: string;
  userId: string;
  name: string;
  description: string;
  personality: Record<string, any>;
  appearance: Record<string, any>;
}
```

### API Response Structure

All API responses follow this structure:

```typescript
interface BaseResponse {
  success: boolean;
  timestamp: string;
  poweredBy: 'Story Intelligence™';
  platform: 'Storytailor®';
}

interface SuccessResponse<T> extends BaseResponse {
  success: true;
  data: T;
}

interface ErrorResponse extends BaseResponse {
  success: false;
  error: string;
  message: string;
  code?: string;
}
```

## Configuration

### Environment Configuration

```typescript
import { API_CONFIG } from '@storytailor/api-contract';

const apiClient = new ApiClient({
  baseUrl: API_CONFIG.baseUrls.production,
  apiKey: 'your-api-key',
  timeout: 30000
});
```

### Error Handling

```typescript
import { ERROR_CODES, HTTP_STATUS } from '@storytailor/api-contract';

try {
  const result = await apiCall();
} catch (error) {
  if (error.code === ERROR_CODES.AUTH_INVALID_TOKEN) {
    // Handle authentication error
  } else if (error.status === HTTP_STATUS.TOO_MANY_REQUESTS) {
    // Handle rate limiting
  }
}
```

## Validation

### Age Validation

COPPA-compliant age validation:

```typescript
import { VALIDATION } from '@storytailor/api-contract';

const validateAge = (age: number) => {
  if (age < VALIDATION.MIN_AGE || age > VALIDATION.MAX_AGE) {
    throw new Error(`Age must be between ${VALIDATION.MIN_AGE} and ${VALIDATION.MAX_AGE}`);
  }
  
  if (age < 13) {
    // Require parental consent
    return { requiresParentalConsent: true };
  }
  
  return { requiresParentalConsent: false };
};
```

### Content Validation

```typescript
const validateStoryContent = (content: string) => {
  if (content.length < VALIDATION.MIN_STORY_LENGTH) {
    throw new Error('Story content too short');
  }
  if (content.length > VALIDATION.MAX_STORY_LENGTH) {
    throw new Error('Story content too long');
  }
};
```

## Multi-Agent System

### Agent Names

```typescript
import { AGENT_NAMES } from '@storytailor/api-contract';

// Route to specific agents
const routeToAgent = (intent: string) => {
  switch (intent) {
    case 'create_story':
      return AGENT_NAMES.CONTENT;
    case 'emotion_support':
      return AGENT_NAMES.EMOTION;
    case 'smart_home_control':
      return AGENT_NAMES.SMART_HOME;
    default:
      return AGENT_NAMES.ROUTER;
  }
};
```

### Agent Response Types

```typescript
interface AgentResponse {
  agentName: string;
  success: boolean;
  data: Record<string, any>;
  nextPhase?: string;
  suggestions: string[];
  metadata: Record<string, any>;
}
```

## Story Intelligence™ Branding

### Brand Constants

```typescript
import { STORY_INTELLIGENCE } from '@storytailor/api-contract';

// Proper branding usage
const brandedResponse = {
  message: "Story created successfully",
  poweredBy: STORY_INTELLIGENCE.POWERED_BY,
  technology: STORY_INTELLIGENCE.TRADEMARK
};

// Brand differentiation
const messaging = STORY_INTELLIGENCE.DIFFERENTIATION; // "Not AI-powered - powered by Story Intelligence™"
```

## OpenAPI Features

- **Complete endpoint documentation**: All 60+ API endpoints
- **Request/response schemas**: Full validation schemas
- **Authentication flows**: Bearer token and API key auth
- **Error response standards**: Consistent error handling
- **Example requests**: Working code examples
- **COPPA compliance**: Child safety documentation

## Development

```bash
# Install dependencies
npm install

# Build package
npm run build

# Validate OpenAPI spec
npm run validate

# Generate types from OpenAPI
npm run build:openapi

# Type check
npm run type-check
```

## Contributing

When updating API contracts:

1. Update OpenAPI specification in `src/schemas/storytailor-api.yaml`
2. Add corresponding TypeScript types in `src/types/index.ts`
3. Add Zod schemas for validation
4. Update documentation
5. Validate against existing implementations

## Versioning

This package follows semantic versioning:

- **Major**: Breaking API changes
- **Minor**: New endpoints or optional fields
- **Patch**: Bug fixes and documentation updates

## License

Part of the Storytailor platform. All rights reserved.

---

**Powered by Story Intelligence™**
 
 
 
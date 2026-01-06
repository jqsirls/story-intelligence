# Library Agent - Developer Documentation

**Status**: Draft  
**Audience**: Engineering  
**Last Updated**: 2025-12-11

## Technical Architecture

### Core Components

1. **LibraryAgent** (`packages/library-agent/src/LibraryAgent.ts`)
   - Main agent class
   - Coordinates all operations
   - Lines of Code: ~600+

2. **Story Management**
   - Story CRUD operations
   - Story organization
   - Story search and filtering

3. **Character Management**
   - Character CRUD operations
   - Character organization
   - Character search and filtering

## API Endpoints

Library Agent is integrated into Universal Agent and accessible via:
- `GET /v1/stories` - List user stories
- `GET /v1/stories/:id` - Get story
- `POST /v1/stories` - Save story (via Content Agent)
- `GET /v1/characters` - List user characters
- `GET /v1/characters/:id` - Get character
- `POST /v1/characters` - Save character (via Content Agent)

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts` - API integration

## Integration Guide

### Basic Usage

```typescript
import { LibraryAgent } from '@alexa-multi-agent/library-agent';

const agent = new LibraryAgent({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  redisUrl: process.env.REDIS_URL,
});

await agent.initialize();

const stories = await agent.getUserStories(userId);
```

## Configuration Options

### Database Configuration
- **Supabase URL**: From SSM `/storytailor-production/supabase/url`
- **Supabase Key**: From SSM `/storytailor-production/supabase/service-key`
- **Redis URL**: From SSM `/storytailor-production/redis/url` (for caching)

## Error Handling

### Database Errors
- Handles connection errors gracefully
- Retries failed operations
- Provides user-friendly error messages

## Testing Guide

### Unit Tests
```typescript
import { LibraryAgent } from '@alexa-multi-agent/library-agent';

const agent = new LibraryAgent(testConfig);

// Test story retrieval
const stories = await agent.getUserStories('test-user-id');

// Test character retrieval
const characters = await agent.getUserCharacters('test-user-id');
```

## Deployment Instructions

### Lambda Deployment

Library Agent is deployed as `storytailor-library-agent-production`:
- **Runtime**: nodejs22.x
- **Memory**: 512 MB
- **Timeout**: 30 seconds
- **Handler**: `dist/lambda.handler`

**Code References:**
- `docs/system/deployment_inventory.md:36` - Deployment configuration

### Environment Variables

Set via SSM Parameter Store:
- `/storytailor-production/supabase/url`
- `/storytailor-production/supabase/service-key`
- `/storytailor-production/redis/url`

**Code References:**
- `docs/system/ssm_parameters_inventory.md` - SSM parameters

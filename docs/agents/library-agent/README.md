# Library Agent

**Status**: ✅ Active and Healthy  
**Package**: `@alexa-multi-agent/library-agent`  
**Lambda Function**: `storytailor-library-agent-production`  
**Function URL**: `https://4lx7abj4gr5dbfwqyatsqtjdzu0atdon.lambda-url.us-east-1.on.aws/`  
**Last Updated**: 2025-12-11

## Overview

The Library Agent manages story and character libraries for users, providing CRUD operations, organization, search, and metadata management. It serves as the persistence layer for all user-created content.

## Quick Start

### What It Does

The Library Agent:
- **Manages Stories**: Stores, retrieves, updates, and deletes user stories
- **Manages Characters**: Stores, retrieves, updates, and deletes user characters
- **Organizes Content**: Provides library organization and search
- **Tracks Metadata**: Maintains story and character metadata

### When to Use It

The Library Agent is used for:
- Saving stories and characters
- Retrieving user's story library
- Organizing and searching content
- Managing story and character metadata

### Quick Integration Example

```typescript
import { LibraryAgent } from '@alexa-multi-agent/library-agent';

const agent = new LibraryAgent(config);
await agent.initialize();

const stories = await agent.getUserStories(userId);
```

## Health Status

**Verified**: ✅ **HEALTHY**
```json
{
  "agentName": "library",
  "success": true,
  "data": {
    "message": "Library agent ready"
  }
}
```

## Documentation Links

- [Marketing Information](./marketing.md) - Value proposition and features
- [Cost Analysis](./cost.md) - Cost per operation and economics
- [Development Guide](./development.md) - Technical implementation
- [Who](./who.md) - Team and ownership
- [What](./what.md) - Complete functionality
- [Why](./why.md) - Business rationale
- [When](./when.md) - Usage guidelines
- [Where](./where.md) - Deployment and location

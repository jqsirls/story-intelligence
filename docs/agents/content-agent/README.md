# Content Agent

**Status**: ✅ Active  
**Package**: `@alexa-multi-agent/content-agent`  
**Lambda Function**: `storytailor-content-production`  
**Last Updated**: 2025-12-11

## Overview

The Content Agent is the core story generation engine in Storytailor's multi-agent system. It handles story type classification, content moderation, character creation, story generation, and asset creation, coordinating with multiple specialized agents to deliver award-quality, age-appropriate stories.

## Quick Start

### What It Does

The Content Agent:
- **Classifies Story Types**: Identifies which of 11 story types the user wants
- **Creates Characters**: Generates inclusive, diverse characters
- **Generates Stories**: Creates Pulitzer-quality stories using Hero's Journey structure
- **Moderates Content**: Ensures age-appropriate, safe content
- **Generates Assets**: Creates images, audio, and PDFs for stories
- **Coordinates Agents**: Works with Emotion, Personality, Child Safety, Localization agents

### When to Use It

The Content Agent is used for:
- Story creation requests
- Character creation requests
- Content moderation
- Asset generation
- Story editing and adaptation

### Quick Integration Example

```typescript
import { ContentAgent } from '@alexa-multi-agent/content-agent';

const agent = new ContentAgent(config);
await agent.initialize();

const story = await agent.createStory({
  characterId: 'char-123',
  storyType: 'ADVENTURE',
  userAge: 7,
});
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

# Personality Agent

**Status**: ✅ Active  
**Package**: `@alexa-multi-agent/personality-agent`
**Lambda Function**: `storytailor-personality-agent-production`  
**Region**: us-east-1  
**Last Updated**: 2025-12-13

## Overview

The Personality Agent maintains brand voice and character personality consistency throughout the Storytailor platform. It ensures that all interactions maintain a warm, whimsical, age-appropriate tone while preserving individual character personalities.

## Quick Start

### What It Does

- **Brand Voice Maintenance**: Consistent Story Intelligence™ messaging, warm and whimsical tone preservation, age-appropriate communication
- **Character Personality Consistency**: Character personality preservation across stories, individual trait integration, personality-based story recommendations
- **Story Intelligence™ Integration**: Supports Personal Intelligence pillar with individual personality traits recognition and character personality matching

## Documentation Links

- [What It Does](./what.md) - Detailed functionality and capabilities
- [Why It Exists](./why.md) - Business rationale and value proposition
- [When to Use](./when.md) - Usage guidelines and integration points
- [Where It's Deployed](./where.md) - Deployment location and Lambda configuration
- [Who Owns It](./who.md) - Team ownership and maintainers
- [Development Guide](./development.md) - Technical implementation and API reference
- [Marketing Information](./marketing.md) - Value proposition and features
- [Cost Analysis](./cost.md) - Cost per operation and economics

## Configuration

### Environment Variables
- `SUPABASE_URL` - From SSM Parameter Store
- `SUPABASE_SERVICE_ROLE_KEY` - From SSM Parameter Store

### Lambda Configuration
- **Runtime**: Node.js 22.x
- **Timeout**: 60 seconds
- **Memory**: 512 MB
- **Region**: us-east-1

## API Integration

The Personality Agent is integrated into the Universal Agent and works behind the scenes to:
- Maintain brand voice in all responses
- Preserve character personalities
- Ensure consistent messaging
- Support personalization

## Status

✅ **Production Ready**
- Deployed to AWS Lambda (us-east-1)
- Bundled in Universal Agent
- Brand voice active
- Character consistency maintained
- Story Intelligence™ integration complete

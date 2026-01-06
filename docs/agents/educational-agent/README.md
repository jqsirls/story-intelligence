# Educational Agent

**Status**: ✅ Active  
**Package**: `@alexa-multi-agent/educational-agent`
**Lambda Function**: `storytailor-educational-agent-production`  
**Region**: us-east-1  
**Last Updated**: 2025-12-13

## Overview

The Educational Agent provides classroom tools, assessments, and educational content features for educators using Storytailor in educational settings.

## Quick Start

### What It Does

- **Classroom Tools**: Educational story generation, curriculum alignment, learning objectives integration, student engagement tracking, assessment tools
- **Educational Content**: Age-appropriate educational stories, learning-focused narratives, skill development stories, knowledge reinforcement
- **Assessment Integration**: Learning outcome tracking, progress monitoring, skill assessment, educational metrics
- **Story Intelligence™ Integration**: Supports Developmental Intelligence pillar with cognitive development stages and learning style preferences

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
- **Timeout**: 10 seconds
- **Memory**: 256 MB
- **Region**: us-east-1

## API Integration

The Educational Agent is integrated into the Universal Agent and accessible via:
- Educational story creation endpoints
- Assessment endpoints
- Classroom management endpoints

## Status

✅ **Production Ready**
- Deployed to AWS Lambda (us-east-1)
- Bundled in Universal Agent
- Educational features operational
- Classroom tools active
- Assessment integration functional

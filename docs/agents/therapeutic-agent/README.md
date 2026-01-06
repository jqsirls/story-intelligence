# Therapeutic Agent

**Status**: ✅ Active  
**Package**: `@alexa-multi-agent/therapeutic-agent`
**Lambda Function**: `storytailor-therapeutic-agent-production`  
**Region**: us-east-1  
**Last Updated**: 2025-12-13

## Overview

A comprehensive evidence-based therapeutic storytelling framework for children's emotional development and healing. This agent provides specialized therapeutic pathways, crisis intervention capabilities, and healthcare provider integration for safe, effective therapeutic support.

## Quick Start

### What It Does

- **Evidence-Based Therapeutic Pathways**: Anxiety Management (CBT-based), Grief Support (attachment-based), Social Skills Development, Self-Esteem Building, Trauma-Informed Care, ADHD Support, Autism Adaptations
- **Crisis Intervention System**: Emotional trigger detection, risk assessment, emergency response, mandatory reporting, safety planning
- **Healthcare Provider Integration**: Progress sharing, collaborative care, therapeutic insights, data export (HIPAA-compliant), professional referrals
- **Parent Dashboard & Insights**: Progress visualization, milestone tracking, actionable insights, follow-up protocols, real-time metrics

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

The Therapeutic Agent is integrated into the Universal Agent and accessible via:
- Therapeutic story creation endpoints
- Progress tracking endpoints
- Healthcare provider integration endpoints

## Story Intelligence™ Integration

The Therapeutic Agent supports **Personal Intelligence** and **Developmental Intelligence** pillars:
- Emotional needs and triggers identification
- Therapeutic timing sensitivity
- Age-appropriate therapeutic content
- Individual personality traits integration

## Status

✅ **Production Ready**
- Deployed to AWS Lambda (us-east-1)
- Bundled in Universal Agent
- Therapeutic pathways operational
- Crisis intervention active
- Healthcare integration functional

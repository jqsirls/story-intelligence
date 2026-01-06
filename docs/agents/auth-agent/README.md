# Auth Agent

**Status**: ✅ Active  
**Package**: `@alexa-multi-agent/auth-agent`  
**Lambda Function**: `storytailor-auth-agent-production`  
**Function URL**: `https://nfunet3jojvau5s5rpim7fu3ze0spcii.lambda-url.us-east-1.on.aws/`  
**Last Updated**: 2025-12-11

## Overview

The Auth Agent handles OAuth 2.0 voice-forward authentication flow for the Storytailor platform, enabling seamless account linking between Storytailor and voice devices (Alexa, Google, Apple). It provides secure user authentication, token management, and COPPA-compliant account creation.

## Quick Start

### What It Does

The Auth Agent:
- **Account Linking**: Links Storytailor accounts with voice platform accounts
- **Voice Code Authentication**: Generates and verifies 6-digit codes for voice devices
- **Token Management**: Issues and validates JWT access and refresh tokens
- **User Registration**: Creates new user accounts with COPPA compliance
- **Session Management**: Manages user sessions and authentication state

### When to Use It

The Auth Agent is used for:
- User registration and login
- Account linking with voice platforms
- Token generation and validation
- Email verification
- Password management

### Quick Integration Example

```typescript
import { AuthAgent } from '@alexa-multi-agent/auth-agent';

const agent = new AuthAgent(config);
await agent.initialize();

const linkingResponse = await agent.linkAccount({
  customerEmail: 'user@example.com',
  alexaPersonId: 'amzn1.ask.person.EXAMPLE123',
  deviceType: 'voice'
});
```

## Health Status

**Verified**: ✅ **HEALTHY** (via Router delegation)

## Documentation Links

- [Marketing Information](./marketing.md) - Value proposition and features
- [Cost Analysis](./cost.md) - Cost per operation and economics
- [Development Guide](./development.md) - Technical implementation
- [Who](./who.md) - Team and ownership
- [What](./what.md) - Complete functionality
- [Why](./why.md) - Business rationale
- [When](./when.md) - Usage guidelines
- [Where](./where.md) - Deployment and location

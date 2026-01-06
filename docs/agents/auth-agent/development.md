# Auth Agent - Development Guide

**Status**: Draft  
**Audience**: Engineering  
**Last Updated**: 2025-12-11

## Technical Overview

### Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Voice Skill │───▶│  Auth Agent  │───▶│  Supabase   │
└─────────────┘    └──────────────┘    └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    Redis    │
                    │  (Caching)   │
                    └─────────────┘
```

### Core Components

1. **AuthAgent Class**: Main authentication agent
2. **AccountLinkingService**: Handles account linking
3. **VoiceCodeService**: Manages voice codes
4. **TokenService**: JWT token management

**Code References:**
- `packages/auth-agent/src/auth-agent.ts` - Main agent class
- `packages/auth-agent/src/services/` - Service implementations

## Setup and Installation

### Prerequisites
- Node.js 22.x
- Supabase project with migrations applied
- Redis instance
- Environment variables configured

### Installation

```bash
cd packages/auth-agent
npm install
npm run build
```

### Configuration

```typescript
import { AuthAgentConfig } from '@alexa-multi-agent/auth-agent';

const config: AuthAgentConfig = {
  supabase: {
    url: process.env.SUPABASE_URL!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
  },
  redis: {
    url: process.env.REDIS_URL!
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    issuer: 'storytailor.com',
    audience: 'storytailor-users',
    accessTokenTtl: 3600,
    refreshTokenTtl: 1209600
  },
  voiceCode: {
    length: 6,
    ttl: 300,
    maxAttempts: 3
  },
  rateLimit: {
    maxRequestsPerMinute: 10,
    windowMs: 60000
  }
};
```

## API Reference

### AuthAgent Class

#### Constructor
```typescript
constructor(config: AuthAgentConfig)
```

#### Methods

##### `initialize(): Promise<void>`
Initializes the agent, connects to Redis and validates Supabase.

##### `linkAccount(request: AccountLinkingRequest): Promise<AccountLinkingResponse>`
Links a Storytailor account with a voice platform account.

##### `verifyVoiceCode(verification: VoiceCodeVerification): Promise<TokenResponse>`
Verifies voice code and returns JWT tokens.

##### `validateToken(token: string): Promise<UserSession | null>`
Validates JWT token and returns user session.

##### `refreshToken(refreshToken: string): Promise<TokenResponse>`
Refreshes access token.

##### `revokeToken(refreshToken: string): Promise<void>`
Revokes a refresh token.

## Database Schema

### Required Tables

```sql
-- Users table (from existing schema)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  -- ... other fields
);

-- Alexa user mappings
CREATE TABLE alexa_user_mappings (
  alexa_person_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  -- ... other fields
);

-- Voice codes
CREATE TABLE voice_codes (
  id UUID PRIMARY KEY,
  email TEXT,
  code TEXT,
  expires_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0
);
```

**Code References:**
- `supabase/migrations/20240101000003_auth_agent_tables.sql` - Complete schema

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Test Coverage
```bash
npm run test:coverage
```

## Deployment

### Lambda Deployment
```bash
bash scripts/deploy-auth-agent.sh
```

### Environment Variables
- Set via SSM Parameter Store
- Loaded at runtime
- Never hardcoded

## Monitoring

### Key Metrics
- Account linking success rate
- Voice code verification success rate
- Token validation latency
- Rate limiting triggers
- Error rates by type

### Logging
- Structured logging with Winston
- Log levels: error, warn, info, debug
- Correlation IDs for tracing

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Check Redis URL
   - Verify network connectivity
   - Check Redis authentication

2. **Supabase Connection Failed**
   - Verify Supabase URL
   - Check service role key
   - Verify network access

3. **Token Validation Fails**
   - Check JWT secret
   - Verify token expiration
   - Check token signature

### Debug Mode
```bash
LOG_LEVEL=debug npm start
```

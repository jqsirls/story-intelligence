Status: Draft  
Audience: Internal  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 0.5 - Maps source code packages to deployed Lambda functions

# Code to Deployment Mapping

## Overview

This document maps source code packages to deployed Lambda functions, identifying deployment scripts, handlers, dependencies, and environment variables for each deployment.

## Mapping Methodology

- **Source Code Location**: Verified against `packages/` directory structure
- **Deployment Scripts**: Verified against `scripts/deploy-*.sh` files
- **Handler Entry Points**: Extracted from deployment scripts and `lambda.ts` files
- **Dependencies**: Inferred from `package.json` files and deployment scripts
- **Environment Variables**: Extracted from deployment scripts (SSM parameter references)

## Universal Agent

**Lambda Function:** `storytailor-universal-agent-{ENVIRONMENT}`

**Source Code:**
- Package: `packages/universal-agent/`
- Entry Point: `packages/universal-agent/src/lambda.ts`
- Handler: `dist/lambda.handler` (verified in `scripts/deploy-universal-agent-proper.sh:19`)

**Deployment Script:**
- File: `scripts/deploy-universal-agent-proper.sh`
- Lines: 1-715
- Environment: `production`, `staging`

**Dependencies Bundled:**
- `@alexa-multi-agent/universal-agent` (self)
- `@alexa-multi-agent/router` (embedded)
- `@alexa-multi-agent/auth-agent` (EmailService bundled)
- Express, Winston, Redis, Supabase client, Joi, etc.

**Environment Variables:**
- `ENVIRONMENT` - Environment identifier
- `SUPABASE_URL` - From SSM `/storytailor-{ENV}/supabase/url`
- `SUPABASE_SERVICE_ROLE_KEY` - From SSM `/storytailor-{ENV}/supabase/service-key`
- `REDIS_URL` - From SSM `/storytailor-{ENV}/redis/url`
- `EMAIL_FROM` - From SSM `/storytailor-{ENV}/email-from`
- `SENDGRID_FROM_EMAIL` - Hardcoded `magic@storytailor.com`
- `AUTO_CONFIRM_USERS` - From SSM or default
- `ENABLE_KID_INTELLIGENCE` - From SSM or default

**Verified Against:**
- `scripts/deploy-universal-agent-proper.sh:18-19, 586-595, 607-616, 665-674`
- `packages/universal-agent/src/lambda.ts:1-100`

## Auth Agent

**Lambda Function:** `storytailor-auth-agent-{ENVIRONMENT}`

**Source Code:**
- Package: `packages/auth-agent/`
- Entry Point: Unknown (likely `src/lambda.ts` or `src/index.ts`)

**Deployment Script:**
- File: `scripts/deploy-auth-agent.sh`
- Pattern: Similar to universal-agent deployment

**Dependencies:**
- `@alexa-multi-agent/auth-agent` (self)
- Supabase client, JWT libraries, Redis

**Environment Variables:**
- `SUPABASE_URL` - From SSM
- `SUPABASE_SERVICE_ROLE_KEY` - From SSM
- `REDIS_URL` - From SSM
- `JWT_SECRET` - From SSM (likely)

**Verified Against:**
- `scripts/deploy-auth-agent.sh:18`

## Library Agent

**Lambda Function:** `storytailor-library-agent-{ENVIRONMENT}`

**Source Code:**
- Package: `packages/library-agent/`
- Entry Point: Unknown

**Deployment Script:**
- File: `scripts/deploy-library-agent.sh`
- Pattern: Similar to universal-agent deployment

**Dependencies:**
- `@alexa-multi-agent/library-agent` (self)
- Supabase client

**Environment Variables:**
- `SUPABASE_URL` - From SSM
- `SUPABASE_SERVICE_ROLE_KEY` - From SSM

**Verified Against:**
- `scripts/deploy-library-agent.sh:18`

## Content Agent

**Lambda Function:** `storytailor-content-{ENVIRONMENT}`

**Source Code:**
- Package: `packages/content-agent/`
- Alternative: `lambda-deployments/content-agent/` (102 files)

**Deployment Script:**
- File: Unknown (may be embedded in universal-agent or separate script)

**Dependencies:**
- `@alexa-multi-agent/content-agent` (self)
- OpenAI client, Supabase client

**Environment Variables:**
- `OPENAI_API_KEY` - From SSM (likely)
- `SUPABASE_URL` - From SSM
- `SUPABASE_SERVICE_ROLE_KEY` - From SSM

> ASSUMPTION: Content agent may be bundled in universal-agent rather than deployed separately, or deployment script not found in `scripts/` directory.

## Conversation Agent

**Lambda Function:** `storytailor-conversation-agent-{ENVIRONMENT}`

**Source Code:**
- Location: `lambda-deployments/conversation-agent/` (86 files)
- Package: May not exist in `packages/` (bundled elsewhere)

**Deployment Script:**
- File: Unknown

**Dependencies:**
- ElevenLabs client, OpenAI client, Redis
- Frankie system prompt (`lambda-deployments/conversation-agent/src/prompts/FrankieSystemPrompt.js`)

**Environment Variables:**
- `ELEVENLABS_API_KEY` - From SSM (likely)
- `OPENAI_API_KEY` - From SSM
- `REDIS_URL` - From SSM

**Verified Against:**
- `lambda-deployments/conversation-agent/` directory structure

## Router

**Lambda Function:** `storytailor-router-{ENVIRONMENT}` (staging), `storytailor-staging-router` (staging)

**Source Code:**
- Package: `packages/router/`
- Alternative: `lambda-deployments/router/` (extensive source)

**Deployment Script:**
- File: `scripts/deploy-router-agent.sh`
- Alternative: `scripts/update-router-http-handler.sh`

**Dependencies:**
- `@alexa-multi-agent/router` (self)
- Multiple agent packages (delegated)

**Environment Variables:**
- `OPENAI_API_KEY` - From SSM
- `REDIS_URL` - From SSM
- `SUPABASE_URL` - From SSM

**Verified Against:**
- `scripts/deploy-router-agent.sh:9`
- `scripts/update-router-http-handler.sh:19`

## Smart Home Agent

**Lambda Function:** `storytailor-smart-home-agent-{ENVIRONMENT}`

**Source Code:**
- Package: `packages/smart-home-agent/`
- Key Files: `src/devices/PhilipsHueManager.ts`

**Deployment Script:**
- File: `scripts/deploy-smart-home-agent.sh`

**Dependencies:**
- `@alexa-multi-agent/smart-home-agent` (self)
- Philips Hue SDK, Supabase client

**Environment Variables:**
- `HUE_CLIENT_ID` - From SSM `/storytailor-{ENV}/hue/client-id`
- `HUE_CLIENT_SECRET` - From SSM `/storytailor-{ENV}/hue/client-secret`
- `HUE_REDIRECT_URI` - From SSM `/storytailor-{ENV}/hue/redirect-uri`
- `SUPABASE_URL` - From SSM

**Verified Against:**
- `scripts/deploy-smart-home-agent.sh:18`
- `packages/smart-home-agent/src/devices/PhilipsHueManager.ts`

## Other Agents

### Therapeutic Agent
- **Function:** `storytailor-therapeutic-agent-{ENVIRONMENT}`
- **Package:** `packages/therapeutic-agent/`
- **Script:** `scripts/deploy-therapeutic-agent.sh:18`

### Educational Agent
- **Function:** `storytailor-educational-agent-{ENVIRONMENT}`
- **Package:** `packages/educational-agent/`
- **Script:** `scripts/deploy-educational-agent.sh:18`

### Localization Agent
- **Function:** `storytailor-localization-agent-{ENVIRONMENT}`
- **Package:** `packages/localization-agent/`
- **Script:** `scripts/deploy-localization-agent.sh:18`

### Child Safety Agent
- **Function:** `storytailor-child-safety-agent-{ENVIRONMENT}`
- **Package:** `packages/child-safety-agent/`
- **Script:** `scripts/deploy-child-safety-agent.sh:18`

### Commerce Agent
- **Function:** `storytailor-commerce-agent-{ENVIRONMENT}`
- **Package:** `packages/commerce-agent/`
- **Script:** `scripts/deploy-commerce-agent.sh:18`

### Accessibility Agent
- **Function:** `storytailor-accessibility-agent-{ENVIRONMENT}`
- **Package:** `packages/accessibility-agent/`
- **Script:** `scripts/deploy-accessibility-agent.sh:18`

### Security Framework
- **Function:** `storytailor-security-framework-{ENVIRONMENT}`
- **Package:** `packages/security-framework/`
- **Script:** `scripts/deploy-security-framework-agent.sh:18`

### Analytics Intelligence
- **Function:** `storytailor-analytics-intelligence-{ENVIRONMENT}`
- **Package:** `packages/analytics-intelligence/`
- **Script:** `scripts/deploy-analytics-intelligence-agent.sh:18`

### Conversation Intelligence
- **Function:** `storytailor-conversation-intelligence-{ENVIRONMENT}`
- **Package:** `packages/conversation-intelligence/`
- **Script:** `scripts/deploy-conversation-intelligence-agent.sh:18`

### Insights Agent
- **Function:** `storytailor-insights-agent-{ENVIRONMENT}`
- **Package:** `packages/insights-agent/`
- **Script:** `scripts/deploy-insights-agent.sh:18`

### Voice Synthesis Agent
- **Function:** `storytailor-voice-synthesis-agent-{ENVIRONMENT}`
- **Package:** `packages/voice-synthesis/`
- **Script:** `scripts/deploy-voice-synthesis-agent.sh:18`

### IDP Agent
- **Function:** `storytailor-idp-agent-{ENVIRONMENT}`
- **Package:** `packages/idp-agent/`
- **Script:** `scripts/deploy-idp-agent.sh` (found in grep)

## Functions Deployed But Code Location Unknown

1. **storytailor-character-agent-{ENVIRONMENT}**
   - Deployed: ✅ (production: 2025-12-04, staging: 2025-11-23)
   - Code Location: `lambda-deployments/character-agent/` (12 files found)
   - Package: May not exist in `packages/character-agent/`
   - Deployment Script: Not found in `scripts/`

2. **storytailor-health-monitoring-agent-{ENVIRONMENT}**
   - Deployed: ✅ (production: 2025-12-04)
   - Code Location: `packages/health-monitoring/` (likely)
   - Deployment Script: Not found in `scripts/`

3. **storytailor-event-system-{ENVIRONMENT}**
   - Deployed: ✅ (production: 2025-11-24)
   - Code Location: `packages/event-system/` (likely)
   - Deployment Script: Not found in `scripts/`

4. **storytailor-knowledge-base-{ENVIRONMENT}**
   - Deployed: ✅ (staging: 2025-08-07)
   - Code Location: `packages/knowledge-base-agent/` (likely)
   - Deployment Script: `scripts/deploy-knowledge-base-agent.sh` or `scripts/deploy-knowledge-base-complete.sh` (found)

5. **storytailor-api-{ENVIRONMENT}**
   - Deployed: ✅ (staging: 2025-08-07)
   - Code Location: Unknown (may be universal-agent or separate)
   - Deployment Script: Not found in `scripts/`

6. **storytailor-staging-avatar-agent**
   - Deployed: ✅ (staging: 2025-10-20)
   - Code Location: `packages/avatar-agent/` (likely)
   - Deployment Script: Not found in `scripts/`

## Functions in Code But Not Deployed

Based on `packages/` directory analysis:

1. **storytailor-personality-agent-{ENVIRONMENT}**
   - Code: `packages/personality-agent/` exists
   - Deployed: ✅ (staging: 2025-11-23)
   - Note: May be bundled in universal-agent for production

2. **storytailor-content-safety-{ENVIRONMENT}**
   - Code: `packages/content-safety/` exists, `lambda-deployments/content-safety/` exists
   - Deployed: ❓ Not found in AWS Lambda list
   - Note: May be bundled in content-agent

## Deployment Patterns

### Standard Deployment Pattern

Most agents follow this pattern (from `deploy-universal-agent-proper.sh`):

1. Build shared-types dependency
2. Build agent package (`npm run build`)
3. Create deployment directory
4. Copy dist files
5. Install production dependencies
6. Create ZIP package
7. Deploy to Lambda (create or update)
8. Set environment variables from SSM
9. Test invocation

### Handler Pattern

- **Standard:** `dist/lambda.handler`
- **Alternative:** May vary by agent

### Environment Variable Pattern

- **Prefix:** `/storytailor-{ENVIRONMENT}/`
- **Common Parameters:**
  - `supabase/url`
  - `supabase/service-key` or `supabase-service-key`
  - `redis/url` or `redis-url`
  - `openai-api-key`
  - Service-specific keys (hue, elevenlabs, stripe, etc.)

## Gaps and Issues

1. **Missing Deployment Scripts**: 6+ functions deployed but no deployment script found
2. **Handler Paths Unknown**: Only universal-agent handler path verified
3. **Code Location Ambiguity**: Some functions exist in `lambda-deployments/` but not `packages/`
4. **Bundled vs. Separate**: Unclear which agents are bundled in universal-agent vs. deployed separately
5. **Environment Variable Verification**: Only universal-agent environment variables fully documented

TAG: RISK  
TODO[DEVOPS]: Verify handler paths for all deployed functions  
TODO[DEVOPS]: Create missing deployment scripts or document deployment method  
TODO[ENGINEERING]: Clarify which agents are bundled vs. separately deployed  
TODO[DEVOPS]: Document environment variables for all functions

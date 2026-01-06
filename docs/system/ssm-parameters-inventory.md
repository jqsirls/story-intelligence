Status: Draft  
Audience: Internal  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Partially  
Doc-ID: AUTO  
Notes: Phase 0.5 - SSM Parameter Store inventory from AWS CLI

# SSM Parameters Inventory

## Overview

This document inventories all AWS Systems Manager (SSM) Parameter Store parameters used by the Storytailor platform, verified against AWS SSM service via AWS CLI.

## Verification Method

**Command Used:**
```bash
aws ssm describe-parameters --query 'Parameters[?contains(Name, `storytailor`)].{Name:Name,Type:Type,LastModified:LastModifiedDate}' --output table
```

**Status:** ✅ AWS CLI access available - Results verified from actual AWS resources

## Parameter Organization

Parameters are organized by environment prefix:
- `/storytailor-production/` - Production environment
- `/storytailor-staging/` - Staging environment
- `/storytailor-prod/` - Alternative production prefix (legacy)

## Production Parameters

### Supabase Configuration

| Parameter Name | Type | Last Modified | Purpose | Used By |
|----------------|------|--------------|---------|---------|
| `/storytailor-production/supabase/url` | String | 2025-08-14 | Supabase project URL | Universal Agent, All agents |
| `/storytailor-production/supabase/anon-key` | SecureString | 2025-08-14 | Supabase anonymous key | Client-side operations |
| `/storytailor-production/supabase/service-key` | SecureString | 2025-08-14 | Supabase service role key | Server-side operations |
| `/storytailor-prod/supabase/service_key` | SecureString | 2025-08-10 | Legacy service key | Legacy deployments |

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:121-122` - Reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- `scripts/deploy-universal-agent-proper.sh:544-545` - Retrieves from SSM

### OpenAI Model Configuration

| Parameter Name | Type | Last Modified | Purpose | Used By |
|----------------|------|---------------|---------|---------|
| `/storytailor-production/openai/model-story` | String | TBD | Primary text model for story generation (default: gpt-5.1) | Content Agent, Story Creation |
| `/storytailor-production/openai/model-conversation` | String | TBD | Lightweight model for conversations (default: gpt-5.1-mini) | Conversation Agent, Content Safety |
| `/storytailor-production/openai/model-safety` | String | TBD | Safety and content moderation model (default: gpt-5.1) | Child Safety Agent, Content Safety |
| `/storytailor-production/openai/model-routing` | String | TBD | Routing and intent classification model (default: gpt-5.1-mini) | Router, Intent Classifier |
| `/storytailor-production/openai/model-image` | String | TBD | Image generation model (default: gpt-image-1) | Content Agent, Art Generation |
| `/storytailor-production/openai/model-video` | String | TBD | Video generation model (default: sora-2) | Content Agent, Animation Service |

**Code References:**
- `packages/shared-types/src/config/model-config.ts` - Centralized model configuration
- `packages/content-agent/src/services/ArtGenerationService.ts:504` - Image generation
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:29-72` - Tier-based model selection

**Environment Variable Mapping:**
- `OPENAI_MODEL_STORY` → `/storytailor-{ENV}/openai/model-story`
- `OPENAI_MODEL_CONVERSATION` → `/storytailor-{ENV}/openai/model-conversation`
- `OPENAI_MODEL_SAFETY` → `/storytailor-{ENV}/openai/model-safety`
- `OPENAI_MODEL_ROUTING` → `/storytailor-{ENV}/openai/model-routing`
- `OPENAI_MODEL_IMAGE` → `/storytailor-{ENV}/openai/model-image`
- `OPENAI_MODEL_VIDEO` → `/storytailor-{ENV}/openai/model-video`

### Redis Configuration

| Parameter Name | Type | Last Modified | Purpose | Used By |
|----------------|------|---------------|---------|---------|
| `/storytailor-production/redis/url` | SecureString | 2025-08-09 | Redis connection URL | Universal Agent, Router, Conversation Agent |

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:232-253` - Redis rate limiting
- `scripts/deploy-universal-agent-proper.sh:550` - Retrieves from SSM

### OpenAI Configuration

| Parameter Name | Type | Last Modified | Purpose | Used By |
|----------------|------|---------------|---------|---------|
| `/storytailor-production/openai/api-key` | SecureString | 2025-08-14 | OpenAI API key | Content Agent, Router, Conversation Intelligence |

**Code References:**
- Used by multiple agents for story generation and intent classification

### Email Configuration

| Parameter Name | Type | Last Modified | Purpose | Used By |
|----------------|------|---------------|---------|---------|
| `/storytailor-production/email/sender` | String | 2025-08-16 | Email sender address | Universal Agent (EmailService) |
| `/storytailor-production/email/templates/invite` | String | 2025-08-16 | Invite email template | Universal Agent |
| `/storytailor-production/email/templates/receipt` | String | 2025-08-16 | Receipt email template | Commerce Agent |

**Code References:**
- `scripts/deploy-universal-agent-proper.sh:553` - Retrieves `email-from`

### Smart Home Integration (Philips Hue)

| Parameter Name | Type | Last Modified | Purpose | Used By |
|----------------|------|---------------|---------|---------|
| `/storytailor-production/hue/client-id` | SecureString | 2025-08-14 | Hue OAuth client ID | Smart Home Agent |
| `/storytailor-production/hue/client-secret` | SecureString | 2025-08-14 | Hue OAuth client secret | Smart Home Agent |
| `/storytailor-production/hue/redirect-uri` | String | 2025-08-14 | Hue OAuth redirect URI | Smart Home Agent |
| `/storytailor-production/hue/application-key` | SecureString | 2025-08-14 | Hue application key (legacy) | Smart Home Agent |
| `/storytailor-production/hue/oauth/client-id` | String | 2025-11-20 | Hue OAuth client ID (new) | Smart Home Agent |
| `/storytailor-production/hue/oauth/client-secret` | SecureString | 2025-11-20 | Hue OAuth client secret (new) | Smart Home Agent |
| `/storytailor-production/hue/oauth/redirect-uri` | String | 2025-11-20 | Hue OAuth redirect URI (new) | Smart Home Agent |
| `/storytailor-production/hue/oauth-client-secret` | SecureString | 2025-11-20 | Hue OAuth client secret (alternative) | Smart Home Agent |

**Code References:**
- `packages/smart-home-agent/src/devices/PhilipsHueManager.ts` - Uses Hue credentials
- `lambda-deployments/conversation-agent/src/integrations/HueConversationIntegration.js` - Hue integration

### LiveKit Configuration

| Parameter Name | Type | Last Modified | Purpose | Used By |
|----------------|------|---------------|---------|---------|
| `/storytailor-production/livekit/url` | String | 2025-08-14 | LiveKit server URL | Avatar Agent |
| `/storytailor-production/livekit/api-key` | SecureString | 2025-08-14 | LiveKit API key | Avatar Agent |
| `/storytailor-production/livekit/api-secret` | SecureString | 2025-08-14 | LiveKit API secret | Avatar Agent |

### Hedra Configuration

| Parameter Name | Type | Last Modified | Purpose | Used By |
|----------------|------|---------------|---------|---------|
| `/storytailor-production/hedra/api-key` | SecureString | 2025-10-13 | Hedra API key | Avatar Agent |

### Stability AI Configuration

| Parameter Name | Type | Last Modified | Purpose | Used By |
|----------------|------|---------------|---------|---------|
| `/storytailor-production/stability/api-key` | SecureString | 2025-08-14 | Stability AI API key | Content Agent (image generation) |

### Stripe Configuration

| Parameter Name | Type | Last Modified | Purpose | Used By |
|----------------|------|---------------|---------|---------|
| `/storytailor-production/stripe/secret-key` | SecureString | 2025-08-19 | Stripe secret key | Commerce Agent |
| `/storytailor-production/stripe/webhook-secret` | SecureString | 2025-08-09 | Stripe webhook secret | Commerce Agent |
| `/storytailor-production/stripe/price_ids_v2` | String | 2025-10-12 | Stripe price IDs (v2) | Commerce Agent |
| `/storytailor-production/stripe/price_ids_complete` | String | 2025-10-12 | Stripe price IDs (complete) | Commerce Agent |

**Code References:**
- `packages/commerce-agent/src/` - Uses Stripe credentials

### ElevenLabs Configuration

| Parameter Name | Type | Last Modified | Purpose | Used By |
|----------------|------|---------------|---------|---------|
| `/storytailor-production/tts/elevenlabs/api-key` | SecureString | 2025-09-24 | ElevenLabs API key | Voice Synthesis Agent, Conversation Agent |

**Code References:**
- `packages/voice-synthesis/src/` - Uses ElevenLabs API

### Assets Configuration

| Parameter Name | Type | Last Modified | Purpose | Used By |
|----------------|------|---------------|---------|---------|
| `/storytailor-production/assets/bucket` | String | 2025-08-14 | S3 bucket for assets | Content Agent, Universal Agent |

### CI/Testing Configuration

| Parameter Name | Type | Last Modified | Purpose | Used By |
|----------------|------|---------------|---------|---------|
| `/storytailor-production/ci/router/ensure-audio` | String | 2025-10-10 | CI flag for router audio | Router (testing) |

## Staging Parameters

### Core Configuration

| Parameter Name | Type | Last Modified | Purpose | Used By |
|----------------|------|---------------|---------|---------|
| `/storytailor-staging/supabase-url` | String | 2025-08-03 | Supabase project URL | All staging agents |
| `/storytailor-staging/supabase-service-key` | SecureString | 2025-08-03 | Supabase service key | All staging agents |
| `/storytailor-staging/redis-url` | SecureString | 2025-08-03 | Redis connection URL | Staging agents |
| `/storytailor-staging/openai-api-key` | SecureString | 2025-08-03 | OpenAI API key | Staging agents |
| `/storytailor-staging/jwt-secret` | SecureString | 2025-08-03 | JWT secret | Auth Agent |

### Service Keys

| Parameter Name | Type | Last Modified | Purpose | Used By |
|----------------|------|---------------|---------|---------|
| `/storytailor-staging/elevenlabs-api-key` | SecureString | 2025-10-20 | ElevenLabs API key | Voice Synthesis Agent |
| `/storytailor-staging/hedra-api-key` | SecureString | 2025-10-20 | Hedra API key | Avatar Agent |
| `/storytailor-staging/stripe-webhook-secret` | SecureString | 2025-08-07 | Stripe webhook secret | Commerce Agent |

### CI/Testing Configuration

| Parameter Name | Type | Last Modified | Purpose | Used By |
|----------------|------|---------------|---------|---------|
| `/storytailor-staging/ci/router/avatar-smoke-mode` | String | 2025-10-15 | Avatar smoke test mode | Router (testing) |
| `/storytailor-staging/ci/router/test-bearer` | SecureString | 2025-10-15 | Test bearer token | Router (testing) |
| `/storytailor-staging/ci/test-user/email` | String | 2025-10-09 | Test user email | Testing scripts |
| `/storytailor-staging/ci/test-user/password` | SecureString | 2025-10-09 | Test user password | Testing scripts |
| `/storytailor-staging/avatar-smoke-fallback` | String | 2025-08-14 | Avatar smoke test fallback | Avatar Agent (testing) |

### Cognito Configuration

| Parameter Name | Type | Last Modified | Purpose | Used By |
|----------------|------|---------------|---------|---------|
| `/storytailor-staging/cognito/app-client-id` | String | Unknown | Cognito app client ID | Auth Agent (if used) |

## Parameter Usage in Code

### Universal Agent

**File:** `packages/universal-agent/src/api/RESTAPIGateway.ts`

**Lines 121-122:**
```typescript
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
```

**File:** `scripts/deploy-universal-agent-proper.sh`

**Lines 544-545:**
```bash
SUPABASE_URL=$(aws ssm get-parameter --name "${PREFIX}/supabase/url" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")
SUPABASE_SERVICE_KEY=$(aws ssm get-parameter --name "${PREFIX}/supabase/service-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")
```

**Line 550:**
```bash
REDIS_URL=$(aws ssm get-parameter --name "${PREFIX}/redis/url" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")
```

**Line 553:**
```bash
EMAIL_FROM=$(aws ssm get-parameter --name "${PREFIX}/email-from" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "magic@storytailor.com")
```

### Smart Home Agent

**File:** `packages/smart-home-agent/src/devices/PhilipsHueManager.ts`

> ASSUMPTION: Reads Hue credentials from environment variables set from SSM parameters

**Verified SSM Parameters:**
- `/storytailor-production/hue/client-id`
- `/storytailor-production/hue/client-secret`
- `/storytailor-production/hue/redirect-uri`
- `/storytailor-production/hue/oauth/client-id` (new format)
- `/storytailor-production/hue/oauth/client-secret` (new format)

## Parameter Naming Inconsistencies

1. **Supabase Service Key:**
   - Production: `/storytailor-production/supabase/service-key` (new)
   - Production: `/storytailor-prod/supabase/service_key` (legacy)
   - Staging: `/storytailor-staging/supabase-service-key` (different format)

2. **Supabase URL:**
   - Production: `/storytailor-production/supabase/url` (new)
   - Staging: `/storytailor-staging/supabase-url` (different format)

3. **Redis URL:**
   - Production: `/storytailor-production/redis/url` (new)
   - Staging: `/storytailor-staging/redis-url` (different format)

4. **Hue OAuth:**
   - Multiple parameter sets exist (legacy and new format)
   - `/storytailor-production/hue/oauth-client-secret` vs `/storytailor-production/hue/oauth/client-secret`

## Missing Parameters (Referenced in Code But Not Found)

Based on code analysis, these parameters may be needed but not found in SSM:

1. **Feature Flags:**
   - `AUTO_CONFIRM_USERS` - Referenced in deployment script but may use default
   - `ENABLE_KID_INTELLIGENCE` - Referenced in deployment script but may use default

2. **Service-Specific:**
   - Some agents may require additional SSM parameters not yet documented

## Parameter Security

- **SecureString Parameters**: All API keys, secrets, and sensitive data stored as SecureString
- **String Parameters**: URLs and non-sensitive configuration stored as String
- **Encryption**: SecureString parameters encrypted with AWS KMS

## Parameter Access Pattern

**Deployment Script Pattern:**
```bash
PREFIX="/storytailor-${ENVIRONMENT}"
VALUE=$(aws ssm get-parameter --name "${PREFIX}/parameter/path" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")
```

**Code Access Pattern:**
- Parameters retrieved during deployment and set as Lambda environment variables
- Code reads from `process.env.VARIABLE_NAME` (not directly from SSM)

## Gaps Identified

1. **Naming Inconsistency**: Production and staging use different naming conventions
2. **Legacy Parameters**: Some parameters exist in both old and new formats
3. **Missing Documentation**: Not all parameters have clear purpose documentation
4. **Code Verification**: Parameter usage in code not fully verified for all agents

TAG: RISK  
TODO[DEVOPS]: Standardize parameter naming across environments  
TODO[DEVOPS]: Migrate legacy parameters to new naming convention  
TODO[ENGINEERING]: Document all SSM parameter usage in code  
TODO[DEVOPS]: Verify all referenced parameters exist in SSM

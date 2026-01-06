# API Keys Registry - Complete Configuration Guide

**Last Updated**: 2025-12-16  
**Purpose**: Ensure ALL API keys are properly stored, loaded, and never lost

## Critical API Keys - All Must Be Configured

### Universal Agent API Keys (Set in Lambda Environment)
These keys are used by the Universal Agent and MUST be set in its Lambda environment variables.

### 1. Supabase (Database)
- **SSM Paths** (checked in order):
  - `/storytailor-production/supabase/url`
  - `/storytailor-production/supabase-url`
- **Service Key**:
  - `/storytailor-production/supabase/service-key`
  - `/storytailor-production/supabase-service-key`
  - `/storytailor-production/supabase-service-role-key`
- **Anon Key**:
  - `/storytailor-production/supabase/anon-key`
  - `/storytailor-production/supabase-anon-key`
- **Lambda Env Vars**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
- **Status**: ✅ REQUIRED - Database operations depend on this

### 2. Redis (Session Management)
- **SSM Paths**:
  - `/storytailor-production/redis-url`
  - `/storytailor-production/redis/url`
- **Lambda Env Var**: `REDIS_URL`
- **Status**: ✅ REQUIRED - Session management depends on this

### 3. OpenAI (AI Content Generation)
- **SSM Paths**:
  - `/storytailor-production/openai/api-key`
  - `/storytailor-production/openai-api-key`
- **Lambda Env Var**: `OPENAI_API_KEY`
- **Test Endpoint**: `https://api.openai.com/v1/models`
- **Status**: ✅ REQUIRED - Intent classification and content generation

### 4. ElevenLabs (Voice Synthesis)
- **SSM Paths**:
  - `/storytailor-production/tts/elevenlabs/api-key` ⭐ PRIMARY PATH
  - `/storytailor-production/elevenlabs/api-key`
  - `/storytailor-production/elevenlabs-api-key`
- **Lambda Env Var**: `ELEVENLABS_API_KEY`
- **Test Endpoint**: `https://api.elevenlabs.io/v1/user`
- **Status**: ✅ REQUIRED - Voice synthesis for mobile/voice channels

### 5. SendGrid (Email Templates)
- **SSM Paths**:
  - `/storytailor-production/sendgrid-api-key` ⭐ PRIMARY PATH
  - `/storytailor-production/sendgrid/api-key`
  - `/storytailor-production/email/sendgrid_api_key`
- **Lambda Env Var**: `SENDGRID_API_KEY`
- **Test Endpoint**: `https://api.sendgrid.com/v3/user/profile`
- **Templates**:
  - `invite` → `Storytailor_Invite_v1` (SSM: `/storytailor-production/email/templates/invite`)
  - `receipt` → `Storytailor_Receipt_v1` (SSM: `/storytailor-production/email/templates/receipt`)
- **Status**: ✅ REQUIRED - Template-based email delivery

### 6. AWS SES (Email Service)
- **SSM Paths**:
  - `/storytailor-production/email-from`
  - `/storytailor-production/email/sender`
- **Lambda Env Var**: `EMAIL_FROM`
- **Default**: `magic@storytailor.com`
- **Status**: ✅ REQUIRED - Fallback email service

### 7. Stripe (Payments)
- **SSM Paths**:
  - `/storytailor-production/stripe-secret-key`
  - `/storytailor-production/stripe/secret-key`
- **Used By**: Commerce Agent
- **Lambda Env Var**: Not set in Universal Agent (Commerce Agent uses directly)
- **Status**: ✅ REQUIRED for Commerce Agent

### 8. Stability AI (Image Generation)
- **SSM Paths**:
  - `/storytailor-production/stability/api-key`
- **Used By**: Content Agent (image generation)
- **Lambda Env Var**: Not set in Universal Agent (Content Agent uses directly)
- **Status**: ✅ REQUIRED for Content Agent image generation

### 9. Hedra (Avatar Generation)
- **SSM Paths**:
  - `/storytailor-production/hedra/api-key`
- **Used By**: Avatar Agent
- **Lambda Env Var**: Not set in Universal Agent (Avatar Agent uses directly)
- **Status**: ✅ REQUIRED for Avatar Agent

### 10. LiveKit (Video/Audio Streaming)
- **SSM Paths**:
  - `/storytailor-production/livekit/api-key`
  - `/storytailor-production/livekit/api-secret`
  - `/storytailor-production/livekit/url`
- **Used By**: Avatar Agent (WebRTC connections)
- **Lambda Env Var**: Not set in Universal Agent (Avatar Agent uses directly)
- **Status**: ✅ REQUIRED for Avatar Agent

### 11. Philips Hue (Smart Home)
- **SSM Paths**:
  - `/storytailor-production/hue/client-id`
  - `/storytailor-production/hue/client-secret`
  - `/storytailor-production/hue/oauth/client-id`
  - `/storytailor-production/hue/oauth/client-secret`
  - `/storytailor-production/hue/oauth/redirect-uri`
  - `/storytailor-production/hue/application-key`
  - `/storytailor-production/hue/redirect-uri`
- **Used By**: Smart Home Agent
- **Lambda Env Var**: Not set in Universal Agent (Smart Home Agent uses directly)
- **Status**: ✅ REQUIRED for Smart Home Agent

### 12. Twilio (SMS/Voice - Optional)
- **SSM Paths**: Not currently configured
- **Used By**: Not currently implemented
- **Status**: ⚠️ OPTIONAL - Mentioned in docs but not implemented

### 13. Fieldnotes (Unknown Service)
- **SSM Paths**:
  - `/storytailor-production/fieldnotes/api-key`
- **Used By**: Unknown
- **Status**: ⚠️ UNKNOWN - Has SSM key but usage unclear

### 14. EventBridge (Event Publishing)
- **Event Bus**: `default` (us-east-1)
- **IAM Permission**: `events:PutEvents` on event bus ARN
- **Lambda Env Var**: `EVENT_BUS_NAME` (optional, defaults to 'default')
- **Status**: ✅ REQUIRED - Event-driven architecture

---

## Other Agent API Keys (Not Set in Universal Agent Lambda)

These keys are used by specialized agents and are loaded directly by those agents from SSM. They do NOT need to be in Universal Agent's Lambda environment variables, but they MUST exist in SSM for those agents to function.

## Deployment Script Configuration

The deployment script (`scripts/deploy-universal-agent-proper.sh`) MUST include ALL API keys in THREE places:

1. **SSM Parameter Loading** (lines 581-603): Loads all keys from SSM
2. **Lambda Function Creation** (lines 646-655 and 667-679): Sets env vars when creating new function
3. **Lambda Function Update** (lines 777-787): Updates env vars on existing function

### Critical: All Keys Must Be Included

The deployment script now includes ALL keys in the Lambda environment:
```bash
--environment Variables="{
    ENVIRONMENT='$ENVIRONMENT',
    SUPABASE_URL='$SUPABASE_URL',
    SUPABASE_SERVICE_ROLE_KEY='$SUPABASE_SERVICE_KEY',
    SUPABASE_ANON_KEY='$SUPABASE_ANON_KEY',
    REDIS_URL='$REDIS_URL',
    OPENAI_API_KEY='$OPENAI_API_KEY',          # ✅ CRITICAL
    ELEVENLABS_API_KEY='$ELEVENLABS_API_KEY',  # ✅ CRITICAL
    SENDGRID_API_KEY='$SENDGRID_API_KEY',      # ✅ CRITICAL
    EMAIL_FROM='$EMAIL_FROM',
    SENDGRID_FROM_EMAIL='magic@storytailor.com',
    AUTO_CONFIRM_USERS='$AUTO_CONFIRM_USERS',
    ENABLE_KID_INTELLIGENCE='$ENABLE_KID_INTELLIGENCE'
}"
```

## Verification Script

Run `scripts/verify-all-api-keys.sh` to verify:
- ✅ All keys exist in SSM
- ✅ All keys are set in Lambda environment variables
- ✅ All keys are valid and working (API tests)

## Prevention of Key Loss

### 1. SSM Parameter Store
- All keys stored as `SecureString` type
- Multiple fallback paths checked
- Version history enabled

### 2. Deployment Script
- Always loads from SSM before deployment
- Always sets ALL keys in Lambda environment
- No keys are omitted or skipped

### 3. Lambda Environment Variables
- All keys set during function creation
- All keys updated during function updates
- No partial updates that could lose keys

### 4. Verification
- Pre-deployment verification script
- Post-deployment verification script
- Regular health checks

## Template Configuration

SendGrid templates are stored in SSM at:
- `/storytailor-production/email/templates/{template-name}`

Template name mapping (code → SSM):
- `invitation` → `invite` (SSM: `/storytailor-production/email/templates/invite`)
- `receipt` → `receipt` (SSM: `/storytailor-production/email/templates/receipt`)

## Emergency Recovery

If keys are lost:
1. Check SSM Parameter Store version history
2. Check deployment script history (git)
3. Check Lambda environment variable history (AWS Console)
4. Restore from backup if available

## Checklist Before Deployment

- [ ] All SSM parameters exist and are accessible
- [ ] Deployment script loads all keys from SSM
- [ ] Deployment script sets all keys in Lambda environment
- [ ] Verification script passes
- [ ] API key tests pass
- [ ] Lambda environment variables match SSM values

## Complete API Key Inventory

### Universal Agent (8 keys in Lambda)
1. ✅ Supabase URL
2. ✅ Supabase Service Key
3. ✅ Supabase Anon Key
4. ✅ Redis URL
5. ✅ OpenAI API Key
6. ✅ ElevenLabs API Key
7. ✅ SendGrid API Key
8. ✅ Email From

### Other Agents (11+ keys in SSM)
1. ✅ Stability AI (Content Agent)
2. ✅ Hedra (Avatar Agent)
3. ✅ LiveKit API Key (Avatar Agent)
4. ✅ LiveKit API Secret (Avatar Agent)
5. ✅ LiveKit URL (Avatar Agent)
6. ✅ Philips Hue Client ID (Smart Home Agent)
7. ✅ Philips Hue Client Secret (Smart Home Agent)
8. ✅ Philips Hue OAuth Client ID (Smart Home Agent)
9. ✅ Philips Hue OAuth Client Secret (Smart Home Agent)
10. ✅ Stripe Secret Key (Commerce Agent)
11. ✅ Fieldnotes API Key (Unknown service)

**Total Verified**: 19 API keys across all agents ✅

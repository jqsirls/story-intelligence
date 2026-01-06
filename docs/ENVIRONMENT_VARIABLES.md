# Environment Variables - Complete Reference

**Date**: December 29, 2025  
**Status**: ✅ COMPLETE - All environment variables documented  
**Source**: Lambda deployment scripts, source code analysis

---

## Overview

This document provides a comprehensive reference for ALL environment variables used across the Storytailor platform. Variables are grouped by service/purpose and include type, source (SSM Parameter Store vs direct), and usage implications.

**Total Variables**: 35  
**SSM Parameters**: 28 (stored in AWS Parameter Store)  
**Direct Variables**: 7 (set at deployment/runtime)

---

## Core Infrastructure

### Database & Caching

#### SUPABASE_URL
- **Type**: String (URL)
- **Required**: ✅ Yes
- **Source**: SSM Parameter Store (`/storytailor-{environment}/supabase/url`)
- **Example**: `https://lendybmmnlqelrhkhdyc.supabase.co`
- **Purpose**: Supabase project URL for database and auth
- **Used In**: Universal Agent, Content Agent, all services
- **Impact**: 🔴 Critical - System cannot start without this
- **Validation**: Must be valid HTTPS URL

#### SUPABASE_SERVICE_ROLE_KEY
- **Type**: String (JWT secret)
- **Required**: ✅ Yes
- **Source**: SSM Parameter Store (`/storytailor-{environment}/supabase/service-key`)
- **Encrypted**: ✅ Yes (WithDecryption required)
- **Purpose**: Service role key for bypassing RLS (admin operations)
- **Used In**: User creation, service-level operations
- **Impact**: 🔴 Critical - Required for admin operations
- **Security**: 🔒 NEVER log or expose this value

#### SUPABASE_ANON_KEY
- **Type**: String (JWT secret)
- **Required**: ✅ Yes
- **Source**: SSM Parameter Store (`/storytailor-{environment}/supabase/anon-key`)
- **Purpose**: Anonymous key for public API access
- **Used In**: Client-side auth, public endpoints
- **Impact**: 🔴 Critical - Required for user auth
- **Validation**: Must be valid JWT

#### REDIS_URL
- **Type**: String (URL)
- **Required**: ✅ Yes
- **Source**: SSM Parameter Store (`/storytailor-{environment}/redis-url`)
- **Example**: `redis://localhost:6379` or `rediss://prod.redis.amazonaws.com:6379`
- **Purpose**: Redis connection for conversation state caching
- **Used In**: Router, conversation management
- **Impact**: 🟡 High - System degrades without caching
- **Fallback**: System continues but performance degrades

---

## AI & Content Generation

#### OPENAI_API_KEY
- **Type**: String (API key)
- **Required**: ✅ Yes
- **Source**: SSM Parameter Store (`/storytailor-{environment}/openai/api-key`)
- **Encrypted**: ✅ Yes
- **Purpose**: OpenAI API key for story generation and chat
- **Used In**: Content Agent, Router (intent classification)
- **Impact**: 🔴 Critical - Cannot generate stories without this
- **Fallback**: Falls back to SSM if not in env vars
- **Validation**: Must start with `sk-`
- **Cost**: ~$0.50-$2.00 per story (gpt-4o)

#### ELEVENLABS_API_KEY
- **Type**: String (API key)
- **Required**: ✅ Yes
- **Source**: SSM Parameter Store (`/storytailor-{environment}/elevenlabs/api-key`)
- **Encrypted**: ✅ Yes
- **Purpose**: ElevenLabs API key for voice synthesis
- **Used In**: Voice synthesis service, audio generation
- **Impact**: 🔴 Critical - Cannot generate audio without this
- **Validation**: 32-character hex string
- **Cost**: ~$0.30 per story (11 characters per minute)

#### ELEVENLABS_VOICE_ID
- **Type**: String (UUID)
- **Required**: ✅ Yes
- **Source**: SSM Parameter Store (`/storytailor-{environment}/elevenlabs/voice-id`)
- **Default**: `EXAVITQu4vr4xnSDxMaL` (Bella - storytelling voice)
- **Purpose**: Default voice ID for story narration
- **Used In**: Voice synthesis service
- **Impact**: 🟡 Medium - Falls back to default if missing
- **Options**: See ElevenLabs voice library

---

## Email & Notifications

#### SENDGRID_API_KEY
- **Type**: String (API key)
- **Required**: ✅ Yes
- **Source**: SSM Parameter Store (`/storytailor-{environment}/sendgrid/api-key`)
- **Encrypted**: ✅ Yes
- **Purpose**: SendGrid API key for transactional emails
- **Used In**: Email service, magic link auth, notifications
- **Impact**: 🟡 High - Users cannot receive emails
- **Validation**: Must start with `SG.`
- **Fallback**: Email features disabled if missing

#### EMAIL_FROM
- **Type**: String (email address)
- **Required**: ✅ Yes
- **Source**: SSM Parameter Store (`/storytailor-{environment}/email/from`)
- **Default**: `magic@storytailor.com`
- **Purpose**: "From" address for all outgoing emails
- **Used In**: Email service
- **Impact**: 🟡 Medium - Uses default if missing
- **Validation**: Must be verified in SendGrid

#### SENDGRID_FROM_EMAIL
- **Type**: String (email address)
- **Required**: ❌ No (hardcoded in deployment)
- **Default**: `magic@storytailor.com`
- **Purpose**: SendGrid-specific from address
- **Used In**: SendGrid email templates
- **Impact**: 🟢 Low - Duplicate of EMAIL_FROM

---

## Payments & Monetization

#### STRIPE_SECRET_KEY
- **Type**: String (API key)
- **Required**: ✅ Yes
- **Source**: SSM Parameter Store (`/storytailor-{environment}/stripe/secret-key`)
- **Encrypted**: ✅ Yes
- **Purpose**: Stripe API key for payment processing
- **Used In**: Commerce agent, subscription management
- **Impact**: 🔴 Critical - Cannot process payments
- **Fallback**: Falls back to SSM if not in env vars
- **Validation**: Must start with `sk_live_` or `sk_test_`
- **Security**: 🔒 NEVER log or expose this value

#### STRIPE_WEBHOOK_SECRET
- **Type**: String (webhook secret)
- **Required**: ✅ Yes
- **Source**: SSM Parameter Store (`/storytailor-{environment}/stripe/webhook-secret`)
- **Encrypted**: ✅ Yes
- **Purpose**: Stripe webhook signature verification
- **Used In**: Webhook handlers
- **Impact**: 🔴 Critical - Cannot process webhooks without verification
- **Validation**: Must start with `whsec_`
- **Security**: 🔒 Required for security

### Stripe Price IDs (8 variables)

All stored in SSM Parameter Store (`/storytailor-{environment}/stripe/*-price-id`):

#### STRIPE_PRO_INDIVIDUAL_PRICE_ID
- **Purpose**: Monthly Pro Individual subscription price ID
- **Example**: `price_1JxYZabcdef123456`
- **Impact**: 🟡 High - Cannot sell Pro Individual subscriptions

#### STRIPE_PRO_INDIVIDUAL_YEARLY_PRICE_ID
- **Purpose**: Yearly Pro Individual subscription price ID (20% discount)
- **Impact**: 🟡 Medium - Annual billing unavailable

#### STRIPE_PRO_ORGANIZATION_PRICE_ID
- **Purpose**: Monthly Pro Organization subscription price ID
- **Impact**: 🟡 Medium - Cannot sell Pro Organization

#### STRIPE_PRO_ORGANIZATION_YEARLY_PRICE_ID
- **Purpose**: Yearly Pro Organization subscription price ID
- **Impact**: 🟡 Medium - Annual billing unavailable

#### STRIPE_STORY_PACK_5_PRICE_ID
- **Purpose**: 5-story pack one-time purchase price ID
- **Impact**: 🟡 Medium - Cannot sell story packs

#### STRIPE_STORY_PACK_10_PRICE_ID
- **Purpose**: 10-story pack one-time purchase price ID
- **Impact**: 🟡 Medium - Best-value pack unavailable

#### STRIPE_STORY_PACK_25_PRICE_ID
- **Purpose**: 25-story pack one-time purchase price ID
- **Impact**: 🟡 Medium - Bulk pack unavailable

#### STRIPE_GIFT_CARD_1_MONTH_PRICE_ID
- **Purpose**: 1-month gift card price ID
- **Impact**: 🟢 Low - Gift cards optional

#### STRIPE_GIFT_CARD_3_MONTH_PRICE_ID
- **Purpose**: 3-month gift card price ID
- **Impact**: 🟢 Low - Gift cards optional

#### STRIPE_GIFT_CARD_6_MONTH_PRICE_ID
- **Purpose**: 6-month gift card price ID
- **Impact**: 🟢 Low - Gift cards optional

#### STRIPE_GIFT_CARD_12_MONTH_PRICE_ID
- **Purpose**: 12-month gift card price ID
- **Impact**: 🟢 Low - Gift cards optional

---

## A2A Protocol (Agent-to-Agent Communication)

#### A2A_BASE_URL
- **Type**: String (URL)
- **Required**: ✅ Yes
- **Source**: SSM Parameter Store (`/storytailor-{environment}/a2a/base-url`)
- **Default**: `https://storyintelligence.dev` (production)
- **Purpose**: Base URL for A2A protocol endpoints
- **Used In**: A2A adapter, agent discovery
- **Impact**: 🟡 High - A2A protocol unavailable
- **Validation**: Must be valid HTTPS URL

#### A2A_WEBHOOK_URL
- **Type**: String (URL)
- **Required**: ✅ Yes
- **Source**: SSM Parameter Store (`/storytailor-{environment}/a2a/webhook-url`)
- **Default**: `{A2A_BASE_URL}/a2a/webhook`
- **Purpose**: Webhook URL for A2A callbacks
- **Used In**: Task delegation, async responses
- **Impact**: 🟡 Medium - Async A2A unavailable

#### A2A_HEALTH_URL
- **Type**: String (URL)
- **Required**: ✅ Yes
- **Source**: SSM Parameter Store (`/storytailor-{environment}/a2a/health-url`)
- **Default**: `{A2A_BASE_URL}/health`
- **Purpose**: Health check URL for A2A endpoints
- **Used In**: Monitoring, availability checks
- **Impact**: 🟢 Low - Monitoring only

#### A2A_JWKS_URL
- **Type**: String (URL)
- **Required**: ✅ Yes
- **Source**: SSM Parameter Store (`/storytailor-{environment}/a2a/jwks-url`)
- **Purpose**: JWKS endpoint for A2A token verification
- **Used In**: A2A authentication
- **Impact**: 🟡 High - Cannot verify A2A tokens
- **Security**: 🔒 Required for secure A2A

#### A2A_TOKEN_ISSUER
- **Type**: String
- **Required**: ✅ Yes
- **Source**: SSM Parameter Store (`/storytailor-{environment}/a2a/token-issuer`)
- **Default**: `storytailor.com`
- **Purpose**: Expected issuer for A2A JWT tokens
- **Used In**: Token validation
- **Impact**: 🟡 High - Token validation fails
- **Security**: 🔒 Must match actual issuer

#### A2A_TOKEN_AUDIENCE
- **Type**: String
- **Required**: ✅ Yes
- **Source**: SSM Parameter Store (`/storytailor-{environment}/a2a/token-audience`)
- **Default**: `storytailor-agents`
- **Purpose**: Expected audience for A2A JWT tokens
- **Used In**: Token validation
- **Impact**: 🟡 High - Token validation fails
- **Security**: 🔒 Must match actual audience

---

## Feature Flags & Configuration

#### ENVIRONMENT
- **Type**: String (enum)
- **Required**: ✅ Yes
- **Source**: Direct (set at deployment)
- **Values**: `production`, `staging`, `development`
- **Purpose**: Environment identifier for SSM parameter resolution
- **Used In**: All services for SSM parameter lookups
- **Impact**: 🔴 Critical - Determines which SSM params to load
- **Default**: `production`

#### AUTO_CONFIRM_USERS
- **Type**: String (boolean)
- **Required**: ❌ No
- **Source**: SSM Parameter Store (`/storytailor-{environment}/config/auto-confirm-users`)
- **Values**: `'true'` or `'false'` (string)
- **Default**: `'false'`
- **Purpose**: Auto-confirm user emails (dev/staging only)
- **Used In**: Auth routes, user creation
- **Impact**: 🟡 Medium - Manual verification required if false
- **Security**: ⚠️ MUST be false in production

#### ENABLE_KID_INTELLIGENCE
- **Type**: String (boolean)
- **Required**: ❌ No
- **Source**: SSM Parameter Store (`/storytailor-{environment}/config/enable-kid-intelligence`)
- **Values**: `'true'` or `'false'`
- **Default**: `'true'`
- **Purpose**: Enable/disable KidIntelligence™ insights feature
- **Used In**: Insights agent, pattern analysis
- **Impact**: 🟢 Low - Feature toggle only

#### LOG_LEVEL
- **Type**: String (enum)
- **Required**: ❌ No
- **Source**: Direct (runtime)
- **Values**: `error`, `warn`, `info`, `debug`
- **Default**: `info`
- **Purpose**: Winston logger level
- **Used In**: All services
- **Impact**: 🟢 Low - Logging verbosity only
- **Performance**: ⚠️ `debug` can impact Lambda cold starts

#### LOG_EVENTS
- **Type**: String (boolean)
- **Required**: ❌ No
- **Source**: Direct (runtime)
- **Values**: `'true'` or `'false'`
- **Default**: `'false'`
- **Purpose**: Log all Lambda events (debugging)
- **Used In**: Lambda handler
- **Impact**: 🟢 Low - Debugging only
- **Performance**: ⚠️ Increases CloudWatch costs

#### DEBUG_FS
- **Type**: String (boolean)
- **Required**: ❌ No
- **Source**: Direct (runtime)
- **Values**: `'true'` or `'false'`
- **Default**: `'false'`
- **Purpose**: Debug filesystem module loading
- **Used In**: Lambda initialization
- **Impact**: 🟢 Low - Debugging only

---

## AWS Configuration

#### AWS_REGION
- **Type**: String
- **Required**: ❌ No (auto-detected)
- **Source**: AWS Lambda runtime
- **Default**: `us-east-2` (fallback) or `us-east-1` (production)
- **Purpose**: AWS region for service calls
- **Used In**: EventBridge, SQS, SSM, all AWS SDK calls
- **Impact**: 🟡 Medium - Uses incorrect region if wrong
- **Auto-Detected**: ✅ Yes (from Lambda environment)

#### EVENT_BUS_NAME
- **Type**: String
- **Required**: ❌ No
- **Source**: Direct (hardcoded in code)
- **Default**: `default`
- **Purpose**: EventBridge bus name for asset generation events
- **Used In**: Asset generation pipeline
- **Impact**: 🟡 Medium - Events go to wrong bus
- **Note**: Uses `default` bus (always exists)

---

## Variable Summary by Impact

### 🔴 Critical (System Cannot Function)
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_ANON_KEY
- OPENAI_API_KEY
- ELEVENLABS_API_KEY
- STRIPE_SECRET_KEY (for commerce)
- STRIPE_WEBHOOK_SECRET (for webhooks)
- ENVIRONMENT

### 🟡 High (Major Features Unavailable)
- REDIS_URL (performance degradation)
- SENDGRID_API_KEY (no emails)
- ELEVENLABS_VOICE_ID (uses default)
- STRIPE_*_PRICE_ID (specific products unavailable)
- A2A_BASE_URL (A2A protocol unavailable)
- EMAIL_FROM (uses default)

### 🟢 Low (Optional Features)
- AUTO_CONFIRM_USERS (dev convenience)
- ENABLE_KID_INTELLIGENCE (feature flag)
- LOG_LEVEL (logging only)
- LOG_EVENTS (debugging)
- DEBUG_FS (debugging)
- STRIPE_GIFT_CARD_*_PRICE_ID (optional products)

---

## SSM Parameter Store Structure

### Naming Convention
```
/storytailor-{environment}/{service}/{parameter-name}
```

### Examples
- `/storytailor-production/supabase/url`
- `/storytailor-production/stripe/secret-key`
- `/storytailor-staging/config/auto-confirm-users`

### Encryption
All sensitive values (keys, secrets, passwords) are stored with `SecureString` type and require `WithDecryption: true` when retrieving.

### Retrieval Pattern
```javascript
const stage = process.env.ENVIRONMENT || 'production';
const value = await getSsmParam(`/storytailor-${stage}/service/param`, true);
```

---

## Deployment Checklist

Before deploying to a new environment:

1. ✅ Set ENVIRONMENT variable (production/staging/development)
2. ✅ Create all required SSM parameters for that environment
3. ✅ Encrypt sensitive parameters (keys, secrets)
4. ✅ Verify Stripe price IDs match Stripe dashboard
5. ✅ Verify email from address is verified in SendGrid
6. ✅ Test A2A URLs are accessible
7. ✅ Verify Supabase URL and keys are correct
8. ✅ Test Redis connection
9. ✅ Verify OpenAI and ElevenLabs keys have credits
10. ✅ Set AUTO_CONFIRM_USERS to false in production

---

## Troubleshooting

### "Cannot connect to database"
- Check SUPABASE_URL is correct
- Verify SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY
- Check network connectivity to Supabase

### "Redis connection failed"
- Check REDIS_URL format
- Verify Redis server is running
- Check network/security groups

### "OpenAI API error"
- Verify OPENAI_API_KEY is valid
- Check OpenAI account has credits
- Verify key has correct permissions

### "Email not sending"
- Check SENDGRID_API_KEY is valid
- Verify EMAIL_FROM is verified in SendGrid
- Check SendGrid account status

### "Payment processing failed"
- Verify STRIPE_SECRET_KEY matches environment
- Check STRIPE_WEBHOOK_SECRET is correct
- Verify Stripe price IDs exist in dashboard

### "SSM parameter not found"
- Verify ENVIRONMENT variable is set
- Check parameter exists: `/storytailor-{env}/{service}/{param}`
- Verify IAM role has ssm:GetParameter permission

---

## Security Best Practices

1. 🔒 **Never log sensitive values** (keys, secrets, tokens)
2. 🔒 **Always use SSM Parameter Store** for secrets (don't hardcode)
3. 🔒 **Encrypt sensitive parameters** using SecureString type
4. 🔒 **Rotate keys regularly** (quarterly recommended)
5. 🔒 **Use IAM roles** for Lambda execution (don't embed credentials)
6. 🔒 **Restrict SSM access** to only necessary parameters
7. 🔒 **Audit parameter access** via CloudTrail
8. 🔒 **Validate all URLs** before using (prevent SSRF)
9. 🔒 **Use environment-specific parameters** (don't share between prod/staging)
10. 🔒 **Monitor for leaked keys** via git-secrets or similar tools

---

## Cost Implications

### By Variable

| Variable | Cost Driver | Monthly Cost (estimate) |
|----------|-------------|-------------------------|
| OPENAI_API_KEY | Per token | $500-$2000 (varies by usage) |
| ELEVENLABS_API_KEY | Per character | $100-$400 (varies by usage) |
| SENDGRID_API_KEY | Per email | $15-$50 (100k emails = $15) |
| REDIS_URL | Per instance | $50-$200 (ElastiCache) or $0 (local) |
| STRIPE_SECRET_KEY | Per transaction | 2.9% + $0.30 per transaction |
| SUPABASE_URL | Per project | $25-$599 (Pro plan) |

**Total Estimated Monthly Cost**: $700-$3000 (varies by scale)

---

## Related Documentation

- `docs/api/CRITICAL_ENDPOINTS_REAL_EXAMPLES.md` - API endpoint examples
- `scripts/deploy-universal-agent-proper.sh` - Deployment script with env vars
- `API_PARAMETER_VALIDATION_FINDINGS.md` - API validation requirements
- `.env.example` - Example environment file (if exists)

---

*Last Updated: 2025-12-29T06:35:00.000Z*  
*Status: COMPLETE ✅*  
*Total Variables Documented: 35*


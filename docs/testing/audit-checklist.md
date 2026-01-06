Status: Draft  
Audience: Internal | Auditor  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 8 - Audit checklist with verification commands

# Audit Checklist

## Overview

This document provides a human-verifiable checklist for auditing the deployed Storytailor environment against documentation. Each section includes concrete commands, console views, and test scenarios with expected outcomes.

**Purpose:** Verify deployed environment matches documentation
**Audience:** Internal teams, auditors, compliance officers

## Architecture Check

### Lambda Functions

**Verification Command:**
```bash
# List all Lambda functions
aws lambda list-functions --region us-east-1 --query 'Functions[?contains(FunctionName, `storytailor`)].FunctionName' --output table

# Expected: 44 functions (17 production, 27 staging)
```

**AWS Console Check:**
1. Navigate to AWS Lambda Console
2. Filter by function name: `storytailor`
3. Verify function count matches documentation
4. Check runtime versions (nodejs22.x, nodejs20.x, nodejs18.x)

**Code References:**
- `docs/system/deployment_inventory.md:24-80` - Lambda function inventory
- `docs/system/inventory.md:319-329` - Deployment status

**Expected Results:**
- ✅ 44 functions total
- ✅ 17 production functions
- ✅ 27 staging functions
- ✅ Runtime distribution: nodejs22.x (39), nodejs20.x (3), nodejs18.x (2)

### SSM Parameters

**Verification Command:**
```bash
# List all SSM parameters
aws ssm describe-parameters --region us-east-1 \
  --parameter-filters "Key=Name,Values=/storytailor" \
  --query 'Parameters[].Name' --output table

# Expected: 50+ parameters
```

**AWS Console Check:**
1. Navigate to AWS Systems Manager → Parameter Store
2. Filter by path: `/storytailor`
3. Verify parameter count matches documentation
4. Check SecureString encryption for sensitive parameters

**Code References:**
- `docs/system/ssm_parameters_inventory.md:24-220` - SSM parameter inventory
- `docs/system/inventory.md:145` - SSM status

**Expected Results:**
- ✅ 50+ parameters
- ✅ All sensitive parameters encrypted (SecureString)
- ✅ Environment-specific paths (`/storytailor-{ENV}/`)

### Database Schema

**Verification Command:**
```bash
# Connect to Supabase and list tables
psql $SUPABASE_DB_URL -c "\dt" | grep -E "users|stories|characters|libraries|emotions"

# Expected: 120+ tables
```

**Supabase Console Check:**
1. Navigate to Supabase Dashboard → Database → Tables
2. Verify table count matches documentation
3. Check RLS policies enabled on all tables
4. Verify data retention policies exist

**Code References:**
- `docs/system/database_schema_inventory.md:1-343` - Complete schema inventory
- `supabase/migrations/` - 26 migration files

**Expected Results:**
- ✅ 120+ tables
- ✅ RLS enabled on all tables
- ✅ Data retention policies configured
- ✅ 26 migration files applied

## Data Flow Check

### API Endpoints

**Verification Command:**
```bash
# Test Router health endpoint
curl -X GET https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/v1/health

# Expected: HTTP 200, {"status": "healthy"}
```

**Test Scenarios:**
1. **Health Check:**
   ```bash
   curl -X GET https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/v1/health
   # Expected: HTTP 200
   ```

2. **Intent Classification:**
   ```bash
   curl -X POST https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/v1/route \
     -H "Content-Type: application/json" \
     -d '{"action": "classify", "message": "I want to create a story"}'
   # Expected: HTTP 200, intent classification result
   ```

**Code References:**
- `docs/system/api_endpoints_inventory.md:24-360` - API endpoints inventory
- `packages/universal-agent/src/api/RESTAPIGateway.ts:74-3511` - REST API Gateway

**Expected Results:**
- ✅ Health endpoint returns 200
- ✅ Intent classification works
- ✅ 60+ REST API endpoints available

### Redis Connection

**Verification Command:**
```bash
# Test Redis connection (if accessible)
redis-cli -h $REDIS_HOST -p $REDIS_PORT PING

# Expected: PONG
```

**Code References:**
- `docs/system/inventory.md:172-177` - Redis status
- `packages/universal-agent/src/api/RESTAPIGateway.ts:232-253` - Redis rate limiting

**Expected Results:**
- ✅ Redis connection successful
- ✅ Rate limiting functional
- ✅ Session state storage working

## Third-Party Integration Check

### OpenAI Integration

**Verification Command:**
```bash
# Check SSM parameter exists
aws ssm get-parameter --name "/storytailor-staging/openai/api-key" --region us-east-1 --with-decryption

# Expected: Parameter exists, value is encrypted
```

**Test Scenario:**
```bash
# Test story generation (requires valid API key)
curl -X POST https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/v1/stories/generate \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"character": {"name": "Test"}, "storyType": "adventure"}'
# Expected: HTTP 200, story generated
```

**Code References:**
- `docs/integrations/openai.md` - OpenAI integration
- `docs/system/inventory.md:185` - OpenAI status

**Expected Results:**
- ✅ SSM parameter exists
- ✅ Story generation works
- ✅ Content moderation functional

### ElevenLabs Integration

**Verification Command:**
```bash
# Check SSM parameter exists
aws ssm get-parameter --name "/storytailor-staging/tts/elevenlabs/api-key" --region us-east-1 --with-decryption

# Expected: Parameter exists, value is encrypted
```

**Test Scenario:**
```bash
# Test voice synthesis (requires valid API key)
curl -X POST https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/v1/voice/synthesize \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, this is a test", "voiceId": "default"}'
# Expected: HTTP 200, audio URL returned
```

**Code References:**
- `docs/integrations/elevenlabs.md` - ElevenLabs integration
- `docs/system/inventory.md:187,196` - ElevenLabs status

**Expected Results:**
- ✅ SSM parameter exists
- ✅ Voice synthesis works
- ✅ Conversational AI functional

### Stripe Integration

**Verification Command:**
```bash
# Check SSM parameters exist
aws ssm get-parameter --name "/storytailor-staging/stripe/secret-key" --region us-east-1 --with-decryption
aws ssm get-parameter --name "/storytailor-staging/stripe/webhook-secret" --region us-east-1 --with-decryption

# Expected: Both parameters exist, values encrypted
```

**Code References:**
- `docs/integrations/stripe.md` - Stripe integration
- `docs/system/inventory.md:207` - Stripe status

**Expected Results:**
- ✅ SSM parameters exist
- ✅ Payment processing functional
- ✅ Webhook handling works

## Safety/Compliance Check

### COPPA Compliance

**Verification Command:**
```bash
# Test child registration (under 13)
curl -X POST https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"age": 8, "userType": "child", "parentEmail": "parent@example.com", ...}'

# Expected: HTTP 200, "isCoppaProtected": true
```

**Database Check:**
```sql
-- Verify COPPA protection flag
SELECT id, age, is_coppa_protected, parent_consent_verified 
FROM users 
WHERE age < 13 
LIMIT 10;

-- Expected: All users under 13 have is_coppa_protected = true
```

**Code References:**
- `docs/compliance/coppa.md` - COPPA compliance
- `packages/universal-agent/src/middleware/AuthMiddleware.ts:83-108` - Parent consent middleware

**Expected Results:**
- ✅ Users under 13 automatically flagged as COPPA-protected
- ✅ Parent email required for under-13 users
- ✅ Parent consent middleware blocks unauthorized access

### GDPR Compliance

**Verification Command:**
```bash
# Test data export (Article 15)
curl -X GET https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/v1/user/data/export \
  -H "Authorization: Bearer $JWT_TOKEN"

# Expected: HTTP 200, JSON data export
```

**Database Check:**
```sql
-- Verify data retention policies
SELECT table_name, retention_period, deletion_strategy 
FROM data_retention_policies 
WHERE is_active = true;

-- Expected: Retention policies configured for all data types
```

**Code References:**
- `docs/compliance/gdpr.md` - GDPR compliance
- `supabase/migrations/20240101000002_enhanced_schema_and_policies.sql:133-139` - Retention policies

**Expected Results:**
- ✅ Data export functional
- ✅ Data retention policies configured
- ✅ Automated cleanup working

### Child Safety

**Verification Command:**
```bash
# Test crisis detection (requires valid test scenario)
curl -X POST https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/v1/route \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "route", "message": "I feel very sad and nobody likes me"}'

# Expected: HTTP 200, therapeutic response, safety incident logged
```

**Database Check:**
```sql
-- Verify safety incident logging
SELECT id, user_id, incident_type, severity, created_at 
FROM safety_incidents 
ORDER BY created_at DESC 
LIMIT 10;

-- Expected: Safety incidents logged (content hashed, not raw text)
```

**Code References:**
- `docs/compliance/child-safety.md` - Child safety design
- `packages/child-safety-agent/src/ChildSafetyAgent.ts:34-609` - Child Safety Agent

**Expected Results:**
- ✅ Crisis detection functional
- ✅ Safety incidents logged
- ✅ Parent notifications sent

## Test Scenarios

### Scenario 1: New User Registration (Adult)

**Steps:**
1. Register adult user (age 35)
2. Verify `isCoppaProtected` = false
3. Verify no parent email required
4. Verify user can access all features

**Expected Outcome:**
- ✅ Registration successful
- ✅ `isCoppaProtected`: false
- ✅ No parent consent required
- ✅ Full feature access

**Code References:**
- `docs/developer-docs/05_COMPLIANCE/01_PRIVACY_COMPLIANCE_VERIFICATION_REPORT.md:48-59` - Adult registration test

### Scenario 2: New User Registration (Child)

**Steps:**
1. Register child user (age 8) with parent email
2. Verify `isCoppaProtected` = true
3. Verify parent email required
4. Verify parent consent required for features

**Expected Outcome:**
- ✅ Registration successful
- ✅ `isCoppaProtected`: true
- ✅ Parent email required
- ✅ Parent consent required for features

**Code References:**
- `docs/developer-docs/05_COMPLIANCE/01_PRIVACY_COMPLIANCE_VERIFICATION_REPORT.md:55-59` - Child registration test

### Scenario 3: Story Generation

**Steps:**
1. Authenticate user
2. Create character
3. Generate story
4. Verify story includes text, images, audio

**Expected Outcome:**
- ✅ Story generated successfully
- ✅ Story includes text content
- ✅ Story includes cover image
- ✅ Story includes audio narration

**Code References:**
- `TEST_RESULTS_SUMMARY.md:13-17` - Story generation test

### Scenario 4: Crisis Detection

**Steps:**
1. Send concerning message
2. Verify crisis detection activated
3. Verify therapeutic response
4. Verify safety incident logged

**Expected Outcome:**
- ✅ Crisis detection activated
- ✅ Therapeutic response provided
- ✅ Safety incident logged
- ✅ Parent notification sent (if applicable)

**Code References:**
- `docs/compliance/child-safety.md` - Crisis detection
- `packages/child-safety-agent/src/services/CrisisEscalationProtocol.ts:1-499` - Crisis escalation

## TODOs for Missing Verification Steps

**TODO[ENGINEERING]:**
- [ ] Add automated audit script that runs all verification commands
- [ ] Create audit report generator
- [ ] Add compliance verification dashboard

**TODO[DEVOPS]:**
- [ ] Document AWS Console navigation paths
- [ ] Create audit runbook with screenshots
- [ ] Add automated compliance checks to CI/CD

**TODO[QA]:**
- [ ] Create test data sets for audit scenarios
- [ ] Document expected outcomes for all test scenarios
- [ ] Add performance benchmarks to audit checklist

## Related Documentation

- **Testing and Quality:** See [Testing and Quality](./testing-and-quality.md)
- **Compliance:** See [Compliance Documentation](../compliance/README.md)
- **System Inventory:** See [System Inventory](../system/inventory.md)

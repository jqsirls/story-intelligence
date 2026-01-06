# Comprehensive End-to-End REST API Testing

Complete guide for running and interpreting E2E REST API tests for the Storytailor platform.

## Overview

The `scripts/test-complete-rest-api-flow.js` script validates the entire user journey from account creation through story generation, covering all critical API endpoints and user workflows.

## What Gets Tested

### 1. Authentication Flow
- **User Signup**: Create new account with email/password
- **User Signin**: Authenticate existing user
- **Password Reset**: Request and verify password reset flow
- **JWT Token Validation**: Verify Supabase JWT tokens work with API

### 2. Subscription Management
- **Pro Subscription Creation**: Grant Pro tier access
- **Stripe Integration**: Verify payment processing (sandbox mode)
- **Subscription Status**: Check active subscription retrieval
- **Billing Period**: Validate subscription dates and renewal

### 3. Character Creation
- **Basic Character Data**: Name, age, species, personality
- **Inclusivity Traits**: 5 diverse traits across categories
  - Mobility (wheelchair_user)
  - Communication (hearing_aid_user)
  - Cultural (hijab_wearer)
  - Visual (glasses_wearer)
  - Neurodiversity (autism_spectrum)
- **Character Images**: Verify reference image generation
- **Trait Visibility**: Validate `always_visible` vs `contextual` logic

### 4. Story Creation (All 15 Types)
- **Standard Stories** (12):
  - Adventure
  - Bedtime
  - Birthday
  - Educational
  - Financial Literacy
  - Language Learning
  - Medical Bravery
  - Mental Health
  - Milestones
  - Music
  - Tech Readiness
  - New Chapter Sequel
- **Therapeutic Stories** (3):
  - Child-Loss
  - Inner-Child
  - New Birth

### 5. Asset Generation Pipeline
- **Cover Image**: Verify generation with custom palette and motif
- **Scene Images** (4 beats): Check pose variation and style consistency
- **Audio File**: Validate TTS generation with word timestamps
- **PDF File**: Verify formatted story export
- **QR Code**: Check sharing code generation

### 6. Library Management
- **Library Invite**: Send invitation to collaborator
- **Library Transfer**: Transfer ownership to another user
- **Library Share**: Share read-only access with family

### 7. Pipeline Features
- **Realtime Subscriptions**: Verify Supabase Realtime updates
- **Progressive Loading**: Check asset status polling
- **EventBridge Triggers**: Validate async asset job queueing

## Running the Tests

### Prerequisites

```bash
# Ensure environment variables are in SSM Parameter Store
/storytailor/production/supabase-url
/storytailor/production/supabase-anon-key
/storytailor/production/supabase-service-key

# Ensure infrastructure is running
npm run infrastructure:start
```

### Execute Tests

```bash
# Run complete E2E test suite
node scripts/test-complete-rest-api-flow.js

# Results saved to:
test-results/e2e-rest-api/run-TIMESTAMP/
```

### Expected Output

```
🚀 Starting Comprehensive E2E REST API Tests
Results will be saved to: test-results/e2e-rest-api/run-1767040000000

=== Testing Authentication ===
✅ auth/signup - PASSED
✅ auth/signin - PASSED
✅ auth/password_reset - PASSED

=== Testing Subscription ===
✅ subscription/create_pro - PASSED

=== Testing Character Creation ===
✅ character/create_with_traits - PASSED
✅ character/generate_images - PASSED

=== Testing Story Creation: adventure ===
✅ story/create_adventure - PASSED

... (all 15 story types) ...

=== Testing Library Management ===
✅ library/invite - PASSED
✅ library/transfer - PASSED
✅ library/share - PASSED

=== Testing Pipeline Features ===
✅ pipeline/realtime_subscription - PASSED
✅ pipeline/progressive_loading - PASSED
✅ pipeline/eventbridge_trigger - PASSED

=================================================================
📊 COMPREHENSIVE E2E REST API TEST REPORT
=================================================================
Run ID: run-1767040000000
Duration: 45.23s
API Base URL: https://api.storytailor.dev

Test Results by Category:
✅ auth: 3/3 passed (0 failed, 0 skipped)
✅ subscription: 1/1 passed (0 failed, 0 skipped)
✅ character: 2/2 passed (0 failed, 0 skipped)
✅ story: 15/15 passed (0 failed, 0 skipped)
✅ library: 3/3 passed (0 failed, 0 skipped)
✅ pipeline: 3/3 passed (0 failed, 0 skipped)

Overall: 27/27 passed (100.00%)

📁 Results saved to:
   test-results/e2e-rest-api/run-1767040000000
=================================================================
```

## Test Results Structure

Each test run creates a timestamped directory with JSON files:

```
test-results/e2e-rest-api/run-TIMESTAMP/
├── 1-auth-signup.json           # User creation response
├── 2-subscription-created.json  # Pro subscription details
├── 3-character-created.json     # Character with inclusivity traits
├── 4-story-adventure.json       # First story type
├── 4-story-birthday.json        # Second story type
├── 4-story-child-loss.json      # Therapeutic story type
├── ...                          # All 15 story types
├── 5-library-management.json    # Invite/transfer/share results
├── 6-pipeline-features.json     # Realtime/EventBridge results
└── FINAL-E2E-REPORT.json        # Comprehensive summary
```

## Interpreting Results

### FINAL-E2E-REPORT.json Structure

```json
{
  "runId": "run-1767040000000",
  "startTime": "2025-12-29T18:00:00.000Z",
  "endTime": "2025-12-29T18:00:45.000Z",
  "duration": 45230,
  "apiBaseUrl": "https://api.storytailor.dev",
  "tests": {
    "auth": { "total": 3, "passed": 3, "failed": 0, "skipped": 0 },
    "subscription": { "total": 1, "passed": 1, "failed": 0, "skipped": 0 },
    "character": { "total": 2, "passed": 2, "failed": 0, "skipped": 0 },
    "story": { "total": 15, "passed": 15, "failed": 0, "skipped": 0 },
    "library": { "total": 3, "passed": 3, "failed": 0, "skipped": 0 },
    "pipeline": { "total": 3, "passed": 3, "failed": 0, "skipped": 0 }
  },
  "summary": {
    "totalTests": 27,
    "totalPassed": 27,
    "totalFailed": 0,
    "totalSkipped": 0,
    "passRate": "100.00%"
  },
  "failures": [],
  "endpoints": {
    "POST /auth/signup": { "count": 1, "totalDuration": 234, "avgDuration": 234 },
    "POST /auth/signin": { "count": 1, "totalDuration": 189, "avgDuration": 189 },
    "POST /libraries": { "count": 1, "totalDuration": 456, "avgDuration": 456 },
    "POST /characters": { "count": 1, "totalDuration": 678, "avgDuration": 678 },
    "POST /stories": { "count": 15, "totalDuration": 23456, "avgDuration": 1563 }
  }
}
```

### Key Metrics

- **Pass Rate**: Should be 100% for production readiness
- **Duration**: Total test runtime (target: <60s for full suite)
- **Endpoint Performance**: Average response time per endpoint
- **Failures**: Any failed tests with error details

## Troubleshooting

### Common Issues

#### 1. Authentication Failures

**Symptom**: `auth/signup` or `auth/signin` fails with 401

**Causes**:
- Invalid Supabase credentials in SSM
- JWT secret mismatch
- API endpoint not accepting Supabase tokens

**Fix**:
```bash
# Verify SSM parameters
aws ssm get-parameters \
  --names /storytailor/production/supabase-anon-key \
  --with-decryption

# Check Universal Agent Lambda environment variables
aws lambda get-function-configuration \
  --function-name UniversalAgent-production
```

#### 2. Story Generation Timeouts

**Symptom**: `story/create_*` tests timeout or fail

**Causes**:
- Content Agent Lambda cold start
- OpenAI API rate limits
- Asset generation job queue backlog

**Fix**:
```bash
# Check Content Agent Lambda logs
aws logs tail /aws/lambda/ContentAgent-production --follow

# Verify EventBridge rule is enabled
aws events describe-rule --name storytailor-asset-worker-production

# Check asset job queue
node scripts/poll-story-assets.js <story-id>
```

#### 3. Asset Generation Incomplete

**Symptom**: Stories created but assets stuck in "pending"

**Causes**:
- Asset Worker Lambda not triggered
- S3 bucket permissions
- CDN not serving images

**Fix**:
```bash
# Manually invoke Asset Worker
aws lambda invoke \
  --function-name AssetWorker-production \
  --payload '{}' \
  response.json

# Verify S3 bucket policy
aws s3api get-bucket-policy \
  --bucket storytailor-assets-production-326181217496

# Test CDN connection
./scripts/verify-cdn-connection.sh
```

## CI/CD Integration

### GitHub Actions

```yaml
name: E2E REST API Tests

on:
  push:
    branches: [ main, staging ]
  pull_request:
    branches: [ main ]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run E2E tests
        run: node scripts/test-complete-rest-api-flow.js
        env:
          API_BASE_URL: ${{ secrets.API_BASE_URL }}
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-test-results
          path: test-results/e2e-rest-api/
```

## Best Practices

### 1. Run Before Deployment

Always execute E2E tests before deploying to production:

```bash
# Run tests against staging
API_BASE_URL=https://staging-api.storytailor.dev \
  node scripts/test-complete-rest-api-flow.js

# If passing, deploy to production
npm run deploy:production

# Run tests against production
API_BASE_URL=https://api.storytailor.dev \
  node scripts/test-complete-rest-api-flow.js
```

### 2. Monitor Test Duration

Track test execution time over releases:

```bash
# Extract duration from report
jq '.duration' test-results/e2e-rest-api/run-*/FINAL-E2E-REPORT.json

# Alert if duration exceeds threshold (e.g., 120s)
if [ $DURATION -gt 120000 ]; then
  echo "⚠️  E2E tests taking too long: ${DURATION}ms"
fi
```

### 3. Validate All Story Types

Never skip story type tests. Each type has unique prompt logic:

```bash
# Verify all 15 story types tested
jq '.tests.story.total' test-results/e2e-rest-api/run-*/FINAL-E2E-REPORT.json
# Expected output: 15
```

### 4. Check Asset Generation

After story creation, poll for asset completion:

```bash
# Wait for all assets to be "ready"
for story_id in $(jq -r '.id' test-results/e2e-rest-api/run-*/4-story-*.json); do
  node scripts/poll-story-assets.js $story_id
done
```

## Related Documentation

- [Story Creation Pipeline](../api/STORY_CREATION_PIPELINE.md)
- [V2 Parity Image Validation](./v2-parity-image-validation.md)
- [OpenAPI Extensions](../api/OPENAPI_EXTENSIONS.md)
- [System Behavior Guarantees](../api/SYSTEM_BEHAVIOR_GUARANTEES.md)

## Maintenance

### Updating Tests

When adding new API endpoints or story types:

1. Update `ALL_STORY_TYPES` array in script
2. Add new test function (e.g., `testNewFeature()`)
3. Call function in `main()` execution flow
4. Update this documentation with new test coverage
5. Update CI/CD workflows to reflect new tests

### Performance Benchmarks

| Test Category | Target Duration | Current Avg | Status |
|--------------|----------------|-------------|--------|
| Authentication | <1s | 0.8s | ✅ |
| Subscription | <2s | 1.2s | ✅ |
| Character Creation | <3s | 2.1s | ✅ |
| Story Creation (1 type) | <5s | 3.8s | ✅ |
| Story Creation (all 15) | <60s | 45s | ✅ |
| Library Management | <2s | 1.5s | ✅ |
| Pipeline Features | <5s | 3.2s | ✅ |

### Test Data Cleanup

E2E tests create real data in the database. Clean up periodically:

```sql
-- Delete test users (created with e2e-test-* email pattern)
DELETE FROM auth.users 
WHERE email LIKE 'e2e-test-%@storytailor.dev';

-- This cascades to:
-- - libraries
-- - characters
-- - stories
-- - subscriptions
```

## Version History

**Version**: 1.0  
**Last Updated**: December 29, 2025  
**Author**: Storytailor Engineering  

**Changes**:
- Initial version with comprehensive E2E test coverage
- Covers all 15 story types
- Includes V2 parity validation for image generation
- Integrates CDN verification
- Supports CI/CD workflows


# Complete Testing Guide

**Last Updated**: December 26, 2025  
**Purpose**: Comprehensive guide for testing the Storytailor Multi-Agent System

---

## Overview

This guide covers all testing approaches for the Storytailor system, from unit tests to production validation.

---

## Testing Philosophy

### Principles

1. **Test Real Behavior**: Tests should verify actual functionality, not just that code doesn't throw errors
2. **90% Coverage**: Maintain 90% test coverage requirement
3. **No Placeholders**: All tests must be complete and functional
4. **Real Database Testing**: Critical flows tested against real Supabase database
5. **Production Validation**: All deployments validated in production environment

### Test Types

- **Unit Tests**: Test individual functions and classes in isolation
- **Integration Tests**: Test interactions between components
- **E2E Tests**: Test complete user journeys
- **Database Tests**: Test against real Supabase database
- **API Tests**: Test REST API endpoints via HTTP
- **Production Tests**: Validate deployed systems

---

## Unit Testing

### Running Unit Tests

```bash
# Run all unit tests
npm run test

# Run tests for specific package
turbo run test --filter=<package-name>

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Structure

Tests are located in `src/__tests__/` directories within each package:

```
packages/
  universal-agent/
    src/
      __tests__/
        AuthRoutes.test.ts
        RESTAPIGateway.test.ts
  content-agent/
    src/
      __tests__/
        CharacterGeneration.test.ts
```

### Writing Unit Tests

**Example**:
```typescript
describe('AuthRoutes', () => {
  it('should register adult user with jurisdiction-aware age verification', async () => {
    const result = await authRoutes.register({
      email: 'test@example.com',
      password: 'password123',
      userType: 'parent',
      country: 'US',
      ageVerification: { method: 'confirmation' }
    });
    
    expect(result.success).toBe(true);
    expect(result.user.isMinor).toBe(false);
  });
});
```

---

## Integration Testing

### Running Integration Tests

```bash
# Run integration tests
npm run test:integration

# Run specific integration test
jest --config jest.integration.config.js --testPathPattern=<test-name>
```

### Integration Test Structure

Integration tests verify interactions between:
- Multiple agents
- Database operations
- External services (Supabase, Redis)
- API endpoints

**Location**: `packages/*/src/__tests__/integration/`

---

## E2E Testing

### Running E2E Tests

```bash
# Run E2E tests
npm run test:e2e

# Run specific E2E test
jest --config jest.e2e.config.js --testPathPattern=<test-name>
```

### E2E Test Coverage

E2E tests cover complete user journeys:
- User registration → Story creation → Character creation
- Storytailor ID creation → Consent workflow
- Story generation → Asset creation → Consumption tracking
- Multi-agent orchestration flows

---

## Database Testing

### Real Database Testing

**Purpose**: Test against actual Supabase database to verify schema, migrations, and data operations.

**Script**: `scripts/test-storytailor-id-real-db.js`

**Usage**:
```bash
# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-key"

# Run database tests
node scripts/test-storytailor-id-real-db.js
```

**What It Tests**:
- Schema changes (columns, constraints, indexes)
- Data operations (insert, update, delete)
- RLS policies
- Triggers and functions
- Migration application

**Important**: These tests modify the database. Use staging environment or test database.

---

## API Testing

### REST API Endpoint Testing

**Purpose**: Test REST API endpoints via HTTP requests to verify they work in production.

### Test Scripts

#### 1. Comprehensive API Test (`test-wized-webflow-apis.js`)

**Purpose**: Test all critical endpoints for Wized/Webflow integration

**Usage**:
```bash
API_BASE_URL=https://api.storytailor.dev \
node scripts/test-wized-webflow-apis.js
```

**Tests**:
- Authentication (5 endpoints)
- Stories (4 endpoints)
- Characters (3 endpoints)
- Storytailor IDs (3 endpoints)
- User endpoints (3 endpoints)

**Note**: May hit rate limits on registration. Use existing user script instead.

#### 2. Test with Existing User (`test-with-existing-user.js`)

**Purpose**: Test endpoints with pre-existing credentials (bypasses rate limits)

**Usage**:
```bash
TEST_EMAIL=your-email@example.com \
TEST_PASSWORD=your-password \
API_BASE_URL=https://api.storytailor.dev \
node scripts/test-with-existing-user.js
```

**Advantages**:
- No rate limit issues
- Faster execution
- Can test protected endpoints immediately

#### 3. Quick API Test (`test-all-apis-now.js`)

**Purpose**: Quick test of critical endpoints

**Usage**:
```bash
TEST_EMAIL=your-email@example.com \
TEST_PASSWORD=your-password \
node scripts/test-all-apis-now.js
```

### Expected Test Results

**Success Criteria**:
- ✅ **80%+ success rate** = Ready for production
- ⚠️ **50-79% success rate** = Minor fixes needed
- ❌ **<50% success rate** = Major issues

### Common Issues

**1. Rate Limiting**:
- **Symptom**: `email rate limit exceeded`
- **Solution**: Use `test-with-existing-user.js` with existing credentials
- **Wait**: 60+ seconds between registration attempts

**2. Authentication Errors**:
- **Symptom**: `401 Unauthorized`
- **Solution**: Re-login to get fresh token
- **Check**: Token expiration (1 hour)

**3. Missing Endpoints**:
- **Symptom**: `404 Not Found`
- **Solution**: Verify endpoint is implemented in `RESTAPIGateway.ts`
- **Check**: Line numbers in API status document

---

## Production Validation

### Health Check

```bash
# Basic health check
curl https://api.storytailor.dev/health

# Expected response:
# {"status":"healthy","service":"universal-agent","initialized":false,"timestamp":"..."}
```

### Critical Endpoint Validation

```bash
# 1. Login
curl -X POST https://api.storytailor.dev/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# 2. Get Profile (with token from step 1)
curl -X GET https://api.storytailor.dev/api/v1/auth/me \
  -H "Authorization: Bearer <token>"

# 3. List Stories
curl -X GET https://api.storytailor.dev/api/v1/stories \
  -H "Authorization: Bearer <token>"

# 4. List Storytailor IDs
curl -X GET https://api.storytailor.dev/api/v1/storytailor-ids \
  -H "Authorization: Bearer <token>"
```

### Production Test Checklist

- [ ] Health check responding
- [ ] Authentication working (login, register, profile)
- [ ] Story CRUD operations working
- [ ] Character CRUD operations working
- [ ] Storytailor ID endpoints working
- [ ] Real-time features working (SSE, WebVTT)
- [ ] Error handling working correctly
- [ ] Rate limiting working correctly
- [ ] No errors in CloudWatch logs

---

## Inclusivity System Testing

### Comprehensive Inclusivity Validation

**Purpose**: Validate all 39 inclusivity traits with real image generation

**Script**: `scripts/test-comprehensive-inclusivity-validation.js`

**Usage**:
```bash
cd lambda-deployments/content-agent
npm run build
cd ../..
node scripts/test-comprehensive-inclusivity-validation.js
```

**What It Tests**:
- All 39 traits generate valid images
- No filter rejections
- Species-first language working
- Context-sensitive transformations
- Trait persistence in story images

**Results**: `COMPREHENSIVE_VALIDATION_RESULTS.md`

**Cost**: ~$3.20 for 80 images, ~2.5 hours execution time

### Quick Inclusivity Tests

**Visual Traits Only**:
```bash
node scripts/test-visual-traits-only.js
```

**Halo Device Variants**:
```bash
node scripts/test-halo-imagination-variants.js
```

---

## Test Scripts Reference

### Critical Scripts (Keep)

- `test-wized-webflow-apis.js` - Comprehensive API testing
- `test-with-existing-user.js` - API testing with credentials
- `test-comprehensive-inclusivity-validation.js` - Full inclusivity validation
- `run-storytailor-id-tests.sh` - Database testing helper

### Deployment Scripts

- `deploy-universal-agent-proper.sh` - Production deployment
- `validate-openapi-extensions.ts` - API contract validation
- `validate-migrations.js` - Migration validation

---

## Test Data Management

### Creating Test Users

**Via Supabase Dashboard**:
1. Go to Authentication → Users
2. Create user with email and password
3. Use credentials in test scripts

**Via API** (may hit rate limits):
```bash
curl -X POST https://api.storytailor.dev/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "userType": "parent",
    "country": "US",
    "ageVerification": {"method": "confirmation"},
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Test Data Cleanup

**Manual Cleanup**:
- Delete test users via Supabase Dashboard
- Delete test stories/characters via API
- Clean up test libraries

**Automated Cleanup** (future):
- Scheduled cleanup job
- Test data expiration
- Automatic deletion

---

## Continuous Integration

### CI Test Pipeline

**Commands**:
```bash
# Full CI validation
npm run ci:validate

# Includes:
# - Linting
# - Type checking
# - Unit tests
# - Integration tests
```

**CI Configuration**: `.github/workflows/ci.yml`

**Test Requirements**:
- All tests must pass
- 90% coverage maintained
- No linting errors
- No type errors

---

## Troubleshooting

### Tests Failing

**1. Module Resolution Errors**:
- **Symptom**: `Cannot find module '@alexa-multi-agent/...'`
- **Solution**: Run `npm run build` first
- **Check**: Workspace dependencies built

**2. Database Connection Errors**:
- **Symptom**: `Failed to connect to Supabase`
- **Solution**: Check environment variables
- **Verify**: `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` set

**3. Rate Limit Errors**:
- **Symptom**: `email rate limit exceeded`
- **Solution**: Use existing user credentials
- **Wait**: 60+ seconds between attempts

**4. Timeout Errors**:
- **Symptom**: `Request timeout`
- **Solution**: Increase timeout in test script
- **Check**: Network connectivity

---

## Best Practices

1. **Test Real Behavior**: Verify actual functionality, not just code execution
2. **Use Real Data**: Test with realistic data when possible
3. **Test Edge Cases**: Include boundary conditions and error cases
4. **Clean Up**: Remove test data after tests complete
5. **Document Results**: Record test results and findings
6. **Automate**: Use CI/CD for automated testing
7. **Monitor**: Track test results over time

---

## Related Documentation

- [Deployment Guide](../deployment/COMPLETE_DEPLOYMENT_GUIDE.md) - How to deploy
- [API Status](../api/API_STATUS.md) - API endpoint inventory
- [Migration Guide](../database/MIGRATION_GUIDE.md) - Database testing
- [Inclusivity Testing Playbook](./INCLUSIVITY_TESTING_PLAYBOOK.md) - Inclusivity validation

---

**Last Updated**: December 26, 2025  
**Maintained By**: Engineering Team


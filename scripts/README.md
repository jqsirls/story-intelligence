# Scripts Reference

**Last Updated**: December 26, 2025  
**Purpose**: Index of all active scripts with usage instructions

---

## Critical Scripts (Keep)

### API Testing

**`test-wized-webflow-apis.js`**
- **Purpose**: Comprehensive test of all Wized/Webflow critical endpoints
- **Usage**:
  ```bash
  API_BASE_URL=https://api.storytailor.dev \
  node scripts/test-wized-webflow-apis.js
  ```
- **Tests**: 19 endpoints across 5 categories
- **Note**: May hit rate limits on registration

**`test-with-existing-user.js`**
- **Purpose**: Test endpoints with pre-existing credentials (bypasses rate limits)
- **Usage**:
  ```bash
  TEST_EMAIL=your-email@example.com \
  TEST_PASSWORD=your-password \
  API_BASE_URL=https://api.storytailor.dev \
  node scripts/test-with-existing-user.js
  ```
- **Advantages**: No rate limit issues, faster execution

### Inclusivity Validation

**`test-comprehensive-inclusivity-validation.js`**
- **Purpose**: Validate all 39 inclusivity traits with real image generation
- **Usage**:
  ```bash
  cd lambda-deployments/content-agent
  npm run build
  cd ../..
  node scripts/test-comprehensive-inclusivity-validation.js
  ```
- **Results**: `COMPREHENSIVE_VALIDATION_RESULTS.md`
- **Cost**: ~$3.20 for 80 images, ~2.5 hours execution time

### Deployment

**`deploy-universal-agent-proper.sh`**
- **Purpose**: Deploy Universal Agent Lambda to production/staging
- **Usage**:
  ```bash
  ./scripts/deploy-universal-agent-proper.sh [staging|production]
  ```
- **What it does**:
  - Verifies inclusivity system integrity (39 traits)
  - Builds all workspace dependencies
  - Bundles modules correctly
  - Uploads to S3
  - Updates Lambda function
  - Verifies deployment

### Database Testing

**`run-storytailor-id-tests.sh`**
- **Purpose**: Run Storytailor ID database tests
- **Usage**:
  ```bash
  ./scripts/run-storytailor-id-tests.sh [staging|production]
  ```
- **What it does**:
  - Fetches Supabase credentials from AWS SSM
  - Runs database schema tests
  - Runs API endpoint tests
  - Reports results

### Validation

**`validate-openapi-extensions.ts`**
- **Purpose**: Validate OpenAPI extensions for all endpoints
- **Usage**:
  ```bash
  npx ts-node scripts/validate-openapi-extensions.ts
  ```
- **Validates**: `x-scope`, `x-visibility`, `x-idempotency`, `x-quota` extensions

**`validate-migrations.js`**
- **Purpose**: Validate SQL migration files
- **Usage**:
  ```bash
  node scripts/validate-migrations.js
  ```
- **Validates**: Syntax, idempotency, safety

---

## Script Categories

### Testing Scripts

**API Testing**:
- `test-wized-webflow-apis.js` - Comprehensive API test
- `test-with-existing-user.js` - API test with credentials

**Inclusivity Testing**:
- `test-comprehensive-inclusivity-validation.js` - Full 39-trait validation
- `test-visual-traits-only.js` - Visual traits only
- `test-halo-imagination-variants.js` - Halo device variants
- `test-species-adaptation.js` - Species adaptation tests

**Content Testing**:
- `test-full-story-generation.js` - Full story generation
- `test-complex-characters.js` - Complex character tests
- `test-end-to-end-image-quality.js` - Image quality validation

### Deployment Scripts

**Lambda Deployment**:
- `deploy-universal-agent-proper.sh` - Universal Agent deployment
- `deploy-embed-to-cdn.sh` - Embed widget deployment

**Infrastructure**:
- `setup-a2a-ssm-parameters.sh` - A2A SSM parameters
- `setup-a2a-cloudfront.sh` - A2A CloudFront setup
- `setup-a2a-waf.sh` - A2A WAF setup

### Database Scripts

**Testing**:
- `run-storytailor-id-tests.sh` - Storytailor ID tests

**Validation**:
- `validate-migrations.js` - Migration validation

### Utility Scripts

**Validation**:
- `validate-openapi-extensions.ts` - OpenAPI extension validation

**Code Generation**:
- `generate-sdks.sh` - SDK generation
- `generate-widget-api-key.sh` - Widget API key generation

---

## Script Usage Patterns

### Testing Pattern

```bash
# 1. Set environment variables
export API_BASE_URL="https://api.storytailor.dev"
export TEST_EMAIL="your-email@example.com"
export TEST_PASSWORD="your-password"

# 2. Run test script
node scripts/test-with-existing-user.js
```

### Deployment Pattern

```bash
# 1. Verify prerequisites
npm run build
npm run test

# 2. Deploy
./scripts/deploy-universal-agent-proper.sh production

# 3. Verify deployment
curl https://api.storytailor.dev/health
```

### Validation Pattern

```bash
# 1. Run validation
npx ts-node scripts/validate-openapi-extensions.ts

# 2. Fix any issues
# 3. Re-run validation
```

---

## Script Organization

### Active Scripts (Keep)

All scripts in `scripts/` are considered active and maintained.

### Archived Scripts

Temporary or one-time-use scripts have been removed. Historical scripts are in git history.

---

## Adding New Scripts

When adding new scripts:

1. **Use descriptive names** - Clear purpose from filename
2. **Add to this README** - Document usage and purpose
3. **Include usage examples** - Show how to run
4. **Add error handling** - Graceful failure with clear messages
5. **Document dependencies** - What needs to be installed/configured

---

## Script Best Practices

1. **Error Handling**: Always handle errors gracefully
2. **Logging**: Use clear, informative log messages
3. **Environment Variables**: Use env vars for configuration
4. **Idempotency**: Scripts should be safe to run multiple times
5. **Documentation**: Include usage instructions in script comments

---

## Related Documentation

- [Complete Testing Guide](../docs/testing/COMPLETE_TESTING_GUIDE.md) - Testing procedures
- [Deployment Guide](../docs/deployment/COMPLETE_DEPLOYMENT_GUIDE.md) - Deployment process
- [AGENTS.md](../AGENTS.md) - System architecture

---

**Last Updated**: December 26, 2025  
**Maintained By**: Engineering Team


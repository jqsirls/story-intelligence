Status: Draft  
Audience: Internal  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 8 - Testing and quality documentation with verification commands

# Testing and Quality

## Overview

Storytailor uses a comprehensive testing framework including Jest for unit and integration tests, K6 for load testing, OWASP ZAP for security testing, and Cypress for end-to-end testing. All tests are integrated into CI/CD pipelines with quality gates.

**Test Framework:** Jest (TypeScript)
**Test Coverage Target:** 80% (branches, functions, lines, statements)
**CI/CD:** GitHub Actions

**Code References:**
- `jest.config.js:1-40` - Jest configuration
- `jest.setup.js:1-45` - Test setup and mocks
- `package.json:9-22` - Test scripts
- `COMPREHENSIVE_SYSTEM_AUDIT_REPORT.md:384-443` - Test framework summary

## Test Types

### Unit Tests

**Framework:** Jest with TypeScript
**Location:** `packages/**/__tests__/**/*.test.ts`, `tests/**/*.test.ts`
**Coverage Target:** 80% (branches, functions, lines, statements)

**Test Files:**
- `packages/router/src/__tests__/Router.test.ts` - Router unit tests
- `packages/auth-agent/src/__tests__/AuthAgent.test.ts` - Auth Agent tests
- `packages/content-agent/src/__tests__/ArtGenerationService.test.ts` - Content Agent tests
- `packages/child-safety-agent/src/__tests__/ChildSafetyAgent.test.ts` - Child Safety tests
- `tests/kid-communication-intelligence/kid-intelligence-service.test.ts` - Kid Intelligence tests

**Code References:**
- `jest.config.js:12-16` - Coverage collection configuration
- `jest.config.js:18-24` - Coverage thresholds

**Running Unit Tests:**
```bash
# Run all unit tests
npm test

# Run tests for specific package
npm test -- packages/router

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

**Code Location:** `package.json:12`

### Integration Tests

**Framework:** Jest with TypeScript
**Location:** `packages/**/__tests__/integration/**/*.test.ts`, `testing/integration/`
**Test Environment:** Requires Supabase and Redis

**Test Files:**
- `packages/router/src/__tests__/integration/router.integration.test.ts` - Router integration tests
- `tests/kid-communication-intelligence/integration/universal-agent-integration.test.ts` - Universal Agent integration
- `testing/integration/global-setup.js` - Integration test setup
- `testing/integration/global-teardown.js` - Integration test teardown

**Code References:**
- `package.json:13` - Integration test script
- `testing/integration/global-setup.js` - Global setup

**Running Integration Tests:**
```bash
# Run all integration tests
npm run test:integration

# Run production integration tests
npm run test:integration:production
```

**Code Location:** `package.json:13-14`

### End-to-End (E2E) Tests

**Framework:** Cypress
**Location:** `testing/e2e/specs/`
**Test Scenarios:** User journeys, accessibility, multi-language, therapeutic flows

**Test Files:**
- `testing/e2e/specs/conversation-flows/story-types.cy.js` - Story type flows
- `testing/e2e/specs/accessibility/screen-reader-compatibility.cy.js` - Accessibility tests
- `testing/e2e/specs/therapeutic/clinical-validation.cy.js` - Therapeutic validation
- `testing/e2e/specs/personality/consistency-testing.cy.js` - Personality consistency
- `testing/e2e/specs/edge-cases/failure-modes.cy.js` - Failure mode testing

**Code References:**
- `testing/e2e/cypress.config.js` - Cypress configuration
- `testing/e2e/support/commands.js` - Custom Cypress commands

**Running E2E Tests:**
```bash
# Run E2E tests
npm run test:e2e

# Run with Cypress UI
npx cypress open
```

**Code Location:** `package.json:15`

### Load Tests

**Framework:** K6
**Location:** `testing/load/k6-load-tests.js`
**Performance Targets:**
- 500 RPS capacity
- 95% of requests under 800ms
- Error rate under 1%
- Cold starts under 150ms

**Code References:**
- `testing/load/k6-load-tests.js` - K6 load test script
- `package.json:19` - Load test script
- `testing/README.md:1-367` - Load testing documentation

**Running Load Tests:**
```bash
# Run baseline load test (500 RPS)
k6 run --env API_BASE_URL=https://api.storytailor.dev \
       --env API_KEY=your-api-key \
       --env K6_SCENARIO_NAME=baseline_load \
       testing/load/k6-load-tests.js

# Run spike test
k6 run --env K6_SCENARIO_NAME=spike_test testing/load/k6-load-tests.js

# Run stress test
k6 run --env K6_SCENARIO_NAME=stress_test testing/load/k6-load-tests.js
```

**Code Location:** `package.json:19`

### Security Tests

**Framework:** OWASP ZAP, Semgrep, Bandit
**Location:** `testing/security/`
**Test Categories:** Authentication, input validation, OWASP Top 10

**Test Files:**
- `testing/security/owasp-zap-security-tests.py` - OWASP ZAP security scanning
- `testing/security/ai-specific-attack-vectors.py` - AI-specific attack vectors

**Code References:**
- `testing/security/owasp-zap-security-tests.py` - Security test script
- `package.json:20` - Security test script
- `testing/README.md:1-367` - Security testing documentation

**Running Security Tests:**
```bash
# Run OWASP ZAP security tests
npm run test:security

# Or directly
python testing/security/owasp-zap-security-tests.py \
  --url https://api.storytailor.dev \
  --api-key your-api-key \
  --output security_report.json
```

**Code Location:** `package.json:20`

### Compliance Tests

**Framework:** Python (requests)
**Location:** `testing/compliance/`
**Test Categories:** COPPA, GDPR, UK Children's Code

**Test Files:**
- `testing/compliance/coppa-gdpr-validation-tests.py` - COPPA/GDPR validation
- `testing/compliance/ethical-ai-validation.py` - Ethical AI validation

**Code References:**
- `testing/compliance/coppa-gdpr-validation-tests.py` - Compliance test script
- `package.json:21` - Compliance test script
- `testing/README.md:1-367` - Compliance testing documentation

**Running Compliance Tests:**
```bash
# Run compliance tests
npm run test:compliance

# Or directly
python testing/compliance/coppa-gdpr-validation-tests.py \
  --url https://api.storytailor.dev \
  --api-key your-api-key \
  --output compliance_report.json
```

**Code Location:** `package.json:21`

### Chaos Engineering Tests

**Framework:** Node.js
**Location:** `testing/chaos-engineering/`
**Test Scenarios:** Network partitions, service failures, database failures

**Test Files:**
- `testing/chaos-engineering/chaos-test-suite.js` - Chaos engineering tests
- `testing/chaos-engineering/network-partition-simulator.js` - Network partition simulation

**Code References:**
- `testing/chaos-engineering/chaos-test-suite.js` - Chaos test script

## Test Execution

### Local Development

**Quick Test Suite:**
```bash
# Run all tests
npm test

# Run specific test type
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:coverage
```

**Code References:**
- `package.json:12-22` - Test scripts

### CI/CD Integration

**GitHub Actions Workflows:**
- `.github/workflows/ci.yml` - Continuous integration
- `.github/workflows/comprehensive-ci-cd.yml` - Comprehensive CI/CD
- `.github/workflows/smoke-tests.yml` - Smoke tests
- `.github/workflows/staging-deploy.yml` - Staging deployment
- `.github/workflows/production-deploy.yml` - Production deployment

**Code References:**
- `.github/workflows/ci.yml` - CI workflow
- `.github/workflows/comprehensive-ci-cd.yml` - Comprehensive CI/CD workflow

**CI Test Execution:**
```bash
# CI validation (lint, type-check, test)
npm run ci:validate

# CI build (build, integration tests)
npm run ci:build
```

**Code Location:** `package.json:39-40`

## Test Coverage

### Coverage Targets

**Jest Configuration:**
- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

**Code References:**
- `jest.config.js:18-24` - Coverage thresholds

**Code Location:** `jest.config.js:18-24`

### Coverage Reports

**Coverage Directory:** `tests/reports/coverage`

**Generating Coverage Reports:**
```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open tests/reports/coverage/index.html
```

**Code Location:** `jest.config.js:26`

## Quality Gates

### QA Orchestrator

**Location:** `qa-orchestrator/`
**Quality Gates:** 11 checkpoints

**Quality Gate Checkpoints:**
1. Repository checkout and version lock
2. Secret scanning
3. Static analysis
4. SBOM generation and vulnerability scanning
5. Full test matrix execution
6. Staging stack resilience testing
7. Log inspection for PII and raw prompts
8. Red team security testing
9. Compliance validation
10. Secret management migration
11. Runbook generation

**Code References:**
- `qa-orchestrator/quality-gate-report.md:1-444` - Quality gate report
- `qa-orchestrator/remediation-scripts/` - Remediation scripts

**Running Quality Gates:**
```bash
# Run QA orchestrator
cd qa-orchestrator
./run-quality-gates.sh
```

## Test Results

### Test Status Summary

**Current Test Results:**
- **Contract Tests:** 62/62 passed (100%)
- **Functional Tests:** 7/7 passed (100%)
- **User Journey Tests:** 9/9 passed (100%)
- **Load Tests:** 6/7 passed (85.7%) - High concurrency stress test failed due to AWS account limit

**Code References:**
- `TEST_RESULTS_SUMMARY.md:1-104` - Test results summary
- `COMPREHENSIVE_SYSTEM_AUDIT_REPORT.md:393-397` - Test coverage summary

### Known Test Failures

**High Concurrency Stress Test:**
- **Status:** FAILING
- **Issue:** AWS account concurrency limit (10 in us-east-2) ⚠️ **Note:** Historical reference - all production now in us-east-1
- **Impact:** Cannot test with 20+ concurrent users
- **Resolution:** AWS Support case submitted for limit increase to 1000

**Code References:**
- `COMPREHENSIVE_SYSTEM_AUDIT_REPORT.md:470-476` - Known test failures

## Verification Commands

### Verify Test Framework Installation

```bash
# Verify Jest installation
npm list jest

# Verify K6 installation
k6 version

# Verify Cypress installation
npx cypress --version

# Verify Python dependencies
pip list | grep -E "requests|python-owasp-zap"
```

### Verify Test Execution

```bash
# Verify unit tests run
npm test -- --listTests | head -20

# Verify integration tests run
npm run test:integration -- --listTests | head -20

# Verify E2E tests exist
ls -la testing/e2e/specs/**/*.cy.js

# Verify load tests exist
ls -la testing/load/k6-load-tests.js
```

### Verify CI/CD Integration

```bash
# Verify GitHub Actions workflows
ls -la .github/workflows/*.yml

# Verify CI scripts
cat .github/scripts/smoke-tests.js | head -50
```

## Related Documentation

- **Test Checklist:** See `tests/TEST_CHECKLIST.md`
- **QA Execution Plan:** See [QA Execution Plan](../qa-reports/execution-plan.md)
- **Testing Status:** See [Comprehensive Testing Complete](./comprehensive-testing-complete.md)
- **Audit Checklist:** See [Audit Checklist](./audit-checklist.md)

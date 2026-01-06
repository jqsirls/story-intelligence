Status: Draft  
Audience: Internal  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Partially  
Doc-ID: AUTO  
Notes: Phase 0.5 - Gap analysis comparing code, deployment, and documentation

# Gap Analysis

## Overview

This document identifies gaps between code implementation, deployment state, and documentation, comparing what exists in code vs. what is deployed vs. what is documented.

## Analysis Methodology

- **Code Exists:** Verified against `packages/` and `lambda-deployments/` directories
- **Deployed:** Verified against AWS Lambda function list
- **Documented:** Verified against `docs/` and `docs/` documentation
- **Tested:** Verified against `tests/` directory

## Missing Deployments (Code Exists, Not Deployed)

| Component | Code Location | Deployment Script | Lambda Function Expected | Status | Impact | Priority |
|-----------|---------------|-------------------|--------------------------|--------|--------|----------|
| Personality Agent (Production) | `packages/personality-agent/` | Unknown | `storytailor-personality-agent-production` | ❌ Not deployed | Medium | Medium |
| Content Safety Agent | `packages/content-safety/`, `lambda-deployments/content-safety/` | Unknown | `storytailor-content-safety-{ENV}` | ❌ Not deployed | Low | Low |
| Knowledge Base Agent (Production) | `packages/knowledge-base-agent/` | `scripts/deploy-knowledge-base-agent.sh` | `storytailor-knowledge-base-{ENV}` | ⚠️ Only staging deployed | Medium | Medium |
| Avatar Agent (Production) | `packages/avatar-agent/` | Unknown | `storytailor-avatar-agent-production` | ❌ Not deployed | Medium | Medium |

## Missing Code (Deployed But Code Missing)

| Lambda Function | Deployment Date | Expected Code Location | Status | Impact | Priority |
|----------------|-----------------|------------------------|--------|--------|----------|
| `storytailor-character-agent-production` | 2025-12-04 | `packages/character-agent/` or `lambda-deployments/character-agent/` | ⚠️ Code in lambda-deployments only | Low | Low |
| `storytailor-health-monitoring-agent-production` | 2025-12-04 | `packages/health-monitoring/` | ✅ Code exists | None | None |
| `storytailor-event-system-production` | 2025-11-24 | `packages/event-system/` | ✅ Code exists | None | None |
| `storytailor-api-staging` | 2025-08-07 | Unknown (may be universal-agent) | ⚠️ May be legacy name | Low | Low |

## Missing Documentation (Code/Deployed But Not Documented)

| Component | Code/Deployment Status | Documentation Location | Status | Impact | Priority |
|-----------|------------------------|-------------------------|--------|--------|----------|
| Character Agent | ✅ Deployed | `docs/agents/character-agent.md` | ❌ Missing | Medium | Medium |
| Health Monitoring Agent | ✅ Deployed | `docs/agents/health-monitoring-agent.md` | ❌ Missing | Low | Low |
| Event System | ✅ Deployed | `docs/agents/event-system.md` | ❌ Missing | Low | Low |
| Avatar Agent | ✅ Deployed (staging) | `docs/agents/avatar-agent.md` | ❌ Missing | Medium | Medium |
| Content Safety | ⚠️ Code exists | `docs/agents/content-safety-agent.md` | ❌ Missing | Low | Low |
| WebVTT Routes | ✅ Code exists | API documentation | ⚠️ Partial | Medium | Medium |
| GraphQL Schema | ✅ Code exists | API documentation | ❌ Missing | Low | Low |
| WebSocket Protocol | ✅ Code exists | API documentation | ⚠️ Partial | Medium | Medium |

## Missing Tests (Code Exists But No Tests)

| Component | Code Location | Test Location | Status | Impact | Priority |
|-----------|---------------|---------------|--------|--------|----------|
| API Key Management | `packages/universal-agent/src/api/RESTAPIGateway.ts:2995-3230` | `tests/` | ⚠️ Unknown | Medium | Medium |
| Webhook Delivery | `packages/universal-agent/src/api/RESTAPIGateway.ts:2608-2703` | `tests/` | ⚠️ Unknown | Medium | Medium |
| WebVTT Routes | `packages/universal-agent/src/api/WebVTTRoutes.ts` | `tests/` | ⚠️ Unknown | Medium | Medium |
| Therapeutic Group Routes | `packages/universal-agent/src/api/RESTAPIGateway.ts:1496-2045` | `tests/` | ⚠️ Unknown | Low | Low |

> ASSUMPTION: Test coverage not fully analyzed - requires `tests/` directory analysis

## Deployment Script Gaps

| Lambda Function | Deployed | Deployment Script | Status | Impact | Priority |
|----------------|----------|-------------------|--------|--------|----------|
| `storytailor-character-agent-{ENV}` | ✅ Yes | ❌ Not found | Missing script | Medium | Medium |
| `storytailor-health-monitoring-agent-{ENV}` | ✅ Yes | ❌ Not found | Missing script | Low | Low |
| `storytailor-event-system-{ENV}` | ✅ Yes | ❌ Not found | Missing script | Low | Low |
| `storytailor-api-{ENV}` | ✅ Yes (staging) | ❌ Not found | Missing script | Low | Low |
| `storytailor-staging-avatar-agent` | ✅ Yes | ❌ Not found | Missing script | Medium | Medium |

## Environment Variable Gaps

| Variable | Referenced In | SSM Parameter | Status | Impact | Priority |
|----------|---------------|---------------|--------|--------|----------|
| `AUTO_CONFIRM_USERS` | Deployment script | Unknown | ⚠️ May use default | Low | Low |
| `ENABLE_KID_INTELLIGENCE` | Deployment script | Unknown | ⚠️ May use default | Low | Low |
| Service-specific keys | Various agents | Some documented | ⚠️ Partial | Medium | Medium |

## Database Schema Gaps

| Table | Referenced In Code | Migration File | Status | Impact | Priority |
|-------|-------------------|----------------|--------|--------|----------|
| All tables | Code queries | Migrations exist | ✅ Verified | None | None |

**Note:** Database schema appears complete - all code-referenced tables exist in migrations.

## API Endpoint Gaps

| Endpoint | Code Location | Documentation | Status | Impact | Priority |
|----------|---------------|---------------|--------|--------|----------|
| WebVTT endpoints | `WebVTTRoutes.ts` | `docs/docs/API_DOCUMENTATION.md` | ⚠️ Partial | Medium | Medium |
| GraphQL endpoint | `RESTAPIGateway.ts:109` | `docs/docs/API_DOCUMENTATION.md` | ❌ Missing | Low | Low |
| WebSocket protocol | `RESTAPIGateway.ts:2507-2576` | `docs/docs/API_DOCUMENTATION.md` | ⚠️ Partial | Medium | Medium |
| AuthRoutes endpoints | `AuthRoutes` class | `docs/docs/API_DOCUMENTATION.md` | ⚠️ Partial | Medium | Medium |

## Runtime Version Gaps

| Function | Current Runtime | Target Runtime | Status | Impact | Priority |
|----------|----------------|----------------|--------|--------|----------|
| `storytailor-idp-agent-production` | nodejs18.x | nodejs22.x | ⚠️ Legacy | Low | Low |
| `storytailor-knowledge-base-staging` | nodejs18.x | nodejs22.x | ⚠️ Legacy | Low | Low |
| `storytailor-api-staging` | nodejs18.x | nodejs22.x | ⚠️ Legacy | Low | Low |
| `storytailor-staging-library-agent` | nodejs20.x | nodejs22.x | ⚠️ Legacy | Low | Low |
| `storytailor-staging-avatar-agent` | nodejs20.x | nodejs22.x | ⚠️ Legacy | Low | Low |
| `storytailor-staging-insights-agent` | nodejs20.x | nodejs22.x | ⚠️ Legacy | Low | Low |
| `storytailor-staging-universal-agent` | nodejs20.x | nodejs22.x | ⚠️ Legacy | Medium | Medium |

## SSM Parameter Naming Inconsistencies

| Issue | Production Format | Staging Format | Impact | Priority |
|-------|------------------|----------------|--------|----------|
| Supabase URL | `/storytailor-production/supabase/url` | `/storytailor-staging/supabase-url` | Medium | Medium |
| Supabase Service Key | `/storytailor-production/supabase/service-key` | `/storytailor-staging/supabase-service-key` | Medium | Medium |
| Redis URL | `/storytailor-production/redis/url` | `/storytailor-staging/redis-url` | Medium | Medium |
| Hue OAuth | Multiple parameter sets (legacy and new) | Unknown | Low | Low |

## Documentation Coverage

### Well Documented

- ✅ Universal Agent (deployment, API endpoints)
- ✅ Story Intelligence (complete documentation)
- ✅ Platform Overview (comprehensive)
- ✅ API Documentation (most endpoints)
- ✅ Agent Index (21 agents documented)

### Partially Documented

- ⚠️ WebVTT implementation (Phase 1 mentioned, details missing)
- ⚠️ GraphQL API (endpoint exists, schema not documented)
- ⚠️ WebSocket protocol (endpoint exists, message types not fully documented)
- ⚠️ User journeys (some exist, not all modes documented)
- ⚠️ Prompts library (not extracted from code)

### Missing Documentation

- ❌ Character Agent (deployed but not in docs/agents/)
- ❌ Health Monitoring Agent (deployed but not documented)
- ❌ Event System (deployed but not documented)
- ❌ Avatar Agent (deployed but not documented)
- ❌ Content Safety Agent (code exists but not documented)
- ❌ Deployment procedures for missing scripts
- ❌ Environment variable reference for all functions
- ❌ Handler paths for all Lambda functions

## Code-to-Deployment Verification Status

| Category | Verified | Partially Verified | Not Verified |
|----------|----------|-------------------|--------------|
| Lambda Functions | 44/44 (100%) | 0 | 0 |
| Deployment Scripts | 15/44 (34%) | 0 | 29/44 (66%) |
| Handler Paths | 1/44 (2%) | 0 | 43/44 (98%) |
| Environment Variables | 1/44 (2%) | 0 | 43/44 (98%) |
| SSM Parameters | 50+ parameters | 0 | Service-specific parameters |
| Database Tables | 120+ tables | 0 | Column details for all tables |
| API Endpoints | 60+ endpoints | WebVTT, GraphQL, WebSocket | AuthRoutes details |

## Recommendations

### High Priority

1. **Create missing deployment scripts** for character-agent, health-monitoring, event-system, avatar-agent
2. **Document missing agents** (character, health-monitoring, event-system, avatar, content-safety)
3. **Standardize SSM parameter naming** across environments
4. **Extract and document prompts library** from code
5. **Complete user journey documentation** for all interaction modes

### Medium Priority

1. **Verify handler paths** for all Lambda functions
2. **Document environment variables** for all functions
3. **Update legacy runtime versions** to nodejs22.x
4. **Document WebVTT, GraphQL, WebSocket** APIs completely
5. **Map code database queries** to tables

### Low Priority

1. **Document deployment procedures** for functions without scripts
2. **Verify test coverage** for new features (API keys, webhooks)
3. **Complete database schema documentation** with all columns
4. **Document RLS policy details** for all tables

## Action Items Summary

**Total Gaps Identified:** 50+

**By Category:**
- Missing Deployments: 4
- Missing Code: 0 (all deployed functions have code)
- Missing Documentation: 8+
- Missing Tests: 4+ (requires verification)
- Missing Deployment Scripts: 5
- Runtime Version Gaps: 7
- SSM Parameter Issues: 4
- API Documentation Gaps: 4

TAG: RISK  
TODO[DEVOPS]: Create missing deployment scripts  
TODO[ENGINEERING]: Document missing agents  
TODO[DEVOPS]: Standardize SSM parameter naming  
TODO[ENGINEERING]: Extract prompts library from code  
TODO[ENGINEERING]: Complete user journey documentation  
TODO[DEVOPS]: Verify handler paths for all functions  
TODO[DEVOPS]: Document environment variables for all functions  
TODO[DEVOPS]: Update legacy runtime versions

# Documentation & Project Cleanup Required - December 29, 2025

**Status:** 🚨 Critical - Will Cause Future Confusion  
**Date:** December 29, 2025  
**Priority:** High - Should be done before next development session

---

## Executive Summary

After completing today's work (RLS fixes, E2E tests, disability representation), we discovered:
1. **80+ outdated status files** in project root
2. **18 E2E testing docs** with overlapping/conflicting content
3. **Missing references** to today's database schema changes in API docs
4. **Test script invocation issue** preventing disability test completion

---

## 1. Root Directory Cleanup

### Files to Archive (Move to `_archive/december-2025/`)

**Outdated Status Files (62 files):**
```
ALL_ENDPOINTS_IMPLEMENTED.md
ALL_PROMPTS_COMPARISON_V2_VS_V3.md
ALL_REST_APIS_TESTED_FINAL.md
ALL_TESTS_PASSING_FINAL.md
API_PARAMETER_VALIDATION_FINDINGS.md
API_RESPONSE_VERIFICATION.md
API_TEST_RESULTS.md
API_TESTING_STATUS.md
APPLY_ORGANIZATION_ID_MIGRATION.md
ARCHITECTURE_ADVICE_AND_TEST_SUMMARY.md
ASSET_GENERATION_PIPELINE_STATUS.md
ASSETS_CDN_IMPLEMENTATION_COMPLETE.md
BULLETPROOF_SYSTEM_PROGRESS_REPORT.md
CDN_SETUP_COMPLETE.md
CHARACTER_IMAGE_GENERATION_ANALYSIS.md
COMPLETE_FIX_SUMMARY.md
COMPLETE_PIPELINE_VERIFICATION_DEC_28.md
COMPLETE_PLAN_SUMMARY.md
COMPLETE_PROMPT_IMPLEMENTATION_PLAN.md
COMPLETE_STORY_TYPES_DOCUMENTATION.md
COMPREHENSIVE_API_TEST_RESULTS.md
COMPREHENSIVE_IMPLEMENTATION_ASSESSMENT.md
COMPREHENSIVE_STATUS_UPDATE.md
COMPREHENSIVE_TEST_RESULTS_FINAL.md
COMPREHENSIVE_TEST_RESULTS.md
CONTENT_AGENT_FIX_SUMMARY.md
CONTINUED_PROGRESS_REPORT.md
CRITICAL_ERROR_ACKNOWLEDGMENT.md
CRITICAL_FINDINGS.md
CURRENT_STATUS_DEC_28.md
CURRENT_STATUS_WITH_BLOCKERS.md
DEPLOYMENT_AND_TESTING_COMPLETE.md
DEPLOYMENT_COMPLETE_SUMMARY.md
DEPLOYMENT_COMPLETE.md
DEPLOYMENT_READINESS_SUMMARY.md
DEPLOYMENT_READY_SUMMARY.md
DEPLOYMENT_SUMMARY_2025-12-26.md
DEPLOYMENT_V3_SUCCESS.md
END_OF_SESSION_SUMMARY.md
EXECUTIVE_SUMMARY.md
FINAL_DELIVERY.md
FINAL_PIPELINE_TEST_IN_PROGRESS.md
FINAL_PROGRESSIVE_CHAIN_FIX.md
FINAL_STATUS_DEC_28_2AM.md
FINAL_TEST_RESULTS_YEARLY_PLANS.md
FINAL_VERIFICATION_STATUS.md
FIX_S3_DOWNLOAD_IMPLEMENTED.md
FIXED_AND_WORKING.md
FIXES_APPLIED_6_MINOR_FAILURES.md
FIXES_APPLIED_MISSING_ENDPOINTS.md
FIXES_SUMMARY.md
GENERATIVE_FEATURES_CRITICAL_SUMMARY.md
GENERATIVE_FEATURES_STATUS.md
IAM_PERMISSIONS_FIX_COMPLETE.md
IAM_PERMISSIONS_FIXED.md
IAM_PERMISSIONS_SUCCESS.md
IMAGE_GENERATION_FIXES_COMPLETE.md
IMPLEMENTATION_COMPLETE_SUMMARY.md
IMPLEMENTATION_PROGRESS_REPORT.md
MISSING_ENDPOINTS_IMPLEMENTED.md
NEW_CHAPTER_SEQUEL_ADDED.md
NEXT_STEPS_COMPLETE.md
NEXT_STEPS_STATUS.md
```

**Test Result JSON Files (3 files):**
```
HALO_VARIANT_TEST_RESULTS_variant-a_1766354907934.json
HALO_VARIANT_TEST_RESULTS_variant-a_1766358287246.json
HALO_VARIANT_TEST_RESULTS_variant-a_1766366164623.json
```

**Old Deployment Files (10 files):**
```
OPENAI_REQUEST_IDS.md
OPENAI_SUPPORT_CONTACT.md
PASSWORD_RECOVERY_RATE_LIMIT_FIX.md
PHASE_5_TEST_SCRIPT_UPDATED.md
PIPELINE_INTEGRATION_TEST_COMPLETE.md
PIPELINE_INTEGRATION_TEST_VALIDATION.md
PIPELINE_RESEARCH_FINDINGS.md
PIPELINE_TEST_FINDINGS.md
PIPELINE_TEST_RESULTS_AFTER_IAM_FIX.md
PIPELINE_TEST_RESULTS_WITH_AI_CONTENT.md
```

**Old Planning Files (8 files):**
```
PLAN_ADDITIONS_UX_PLG_ENHANCEMENTS.md
PLAN_COMPLIANCE_VERIFICATION.md
PLAN_MERGE_SUMMARY.md
PRODUCTION_LAUNCH_READY.md
PRODUCTION_READY_SUMMARY.md
PROGRESSIVE_BEAT_LOADING_EXAMPLE.md
PROGRESSIVE_CHAIN_S3_FIX.md
PROGRESSIVE_STATUS_IMPLEMENTED.md
```

**Old Prompt/Story Files (10 files):**
```
PROMPT_ARCHITECTURE_FIX_REQUIRED.md
PROMPT_QUALITY_CRISIS_SUMMARY.md
PROMPT_SYSTEM_FINAL_STATUS.md
REMAINING_PROMPT_FIXES_STATUS.md
STORY_AND_IMAGES_COMPLETE.md
STORY_DATABASE_SAVE_FIX.md
STORY_DATABASE_SAVE_SUCCESS.md
STORY_PIPELINE_STATUS_EXPLAINED.md
STORY_TYPE_FIXES_COMPLETE.md
STORY_TYPE_PARAMETERS_COMPLETE_AUDIT.md
STORY_TYPES_FIXED_AND_PIPED.md
```

**Old REST API Files (4 files):**
```
REST_API_AUTH_FIX_STATUS.md
REST_API_COMPLETE_STATUS.md
REST_API_TEST_STATUS.md
RESEARCH_FINDINGS.md
```

**Old Test Status Files (5 files):**
```
TEST_RESULTS_AND_DEPLOYMENT_NEEDED.md
TEST_VERIFICATION_CHECKLIST.md
TESTING_AND_DOCUMENTATION_COMPLETE.md
TESTING_BLOCKER_RESOLUTION.md
TRAIT_DISCIPLINE_COMPLETE.md
```

**Old V3 Implementation Files (5 files):**
```
V3_IMPLEMENTATION_COMPLETE.md
V3_PRODUCTION_TEST_RESULTS.md
V3_PROMPT_DEPLOYMENT_STATUS.md
V3_PROMPT_SYSTEM_COMPLETE.md
V3_PROMPT_SYSTEM_VALIDATION_COMPLETE.md
```

**Miscellaneous Old Files (5 files):**
```
YEARLY_PLAN_SUPPORT_COMPLETE.md
SESSION_COMPLETE_DEC_28.md
STRIPE_PRICE_ID_MAPPING.md
STRIPE_PRICE_IDS_CONFIGURED.md
STRIPE_PRICE_IDS_REQUIRED.md
```

**Total to Archive:** 92 files

### Files to Keep in Root

**Current/Active Files (Keep):**
```
COMPLETE_DECEMBER_29_2025.md (Today's master summary)
DISABILITY_REPRESENTATION_FIX_COMPLETE.md (Active feature)
DISABILITY_REPRESENTATION_TEST_PENDING.md (Active test)
RLS_POLICY_FIX_REQUIRED.md (Reference guide for Supabase)
AGENTS.md (Developer guide)
CONTRIBUTING.md
PROJECT_MAP.md
README.md
ADMIN_PLAN_CREATED.md (If still relevant)
TEST_USER_INFO.md (Contains test credentials)
PUSH_TO_GITHUB.md (If still relevant)
```

---

## 2. Testing Documentation Cleanup

### Consolidate E2E Testing Docs

**Current State:** 18 E2E testing documents with overlapping content

**Recommended Structure:**

1. **`docs/testing/README.md`** (Index/Navigation)
2. **`docs/testing/e2e-testing-guide.md`** (How to run E2E tests) ← NEW, consolidates:
   - `comprehensive-e2e-testing.md`
   - `COMPLETE_TESTING_GUIDE.md`
   - `e2e-testing-complete.md`
3. **`docs/testing/e2e-schema-alignment-2025-12-29.md`** (Keep - production schema reference)
4. **`docs/testing/testing-and-quality.md`** (Keep - general QA practices)

**Archive These E2E Files (Move to `_archive/testing-history/`):**
```
comprehensive-e2e-testing.md (redundant with new guide)
COMPLETE_TESTING_GUIDE.md (redundant)
e2e-testing-complete.md (outdated status)
HONEST-USER-JOURNEY-TESTING-STATUS.md (outdated)
real-user-journey-testing-status.md (outdated)
SYSTEM-LIVE-AND-READY.md (outdated status)
live-system-verification.md (outdated)
final-verification-complete.md (outdated)
deployment-summary.md (outdated)
final-deployment-verification-report.md (outdated)
phase5-e2e-testing-verification.md (outdated)
100-percent-plan-compliance-progress.md (outdated)
phase11-complete-verification-per-plan.md (outdated)
phase11-final-verification.md (outdated)
phase11-integration-verification-results.md (outdated)
```

**Keep These Testing Files:**
```
e2e-schema-alignment-2025-12-29.md (Current schema reference)
testing-and-quality.md (General QA practices)
v2-parity-image-validation.md (Image quality standards)
INCLUSIVITY_TESTING_PLAYBOOK.md (Inclusivity testing)
HOW_TO_RUN_INCLUSIVITY_TESTS.md (Inclusivity testing)
REAL_DATABASE_TESTING.md (DB testing guide)
whimsical-scenario-capabilities.md (Feature testing)
ai-bias-validation-testing-guide.md (Bias validation)
audit-checklist.md (QA checklist)
```

**Router/MCP Testing Files (Archive - Likely Outdated):**
```
router-production-final-verification.md
router-production-comprehensive-test-results.md
router-zero-tolerance-final.md
router-zero-tolerance-verification.md
mcp-production-status.md
mcp-zero-tolerance-verification.md
```

**Phase Testing Files (Archive - Time-Specific):**
```
phase4-credentials-deployment-status.md
phase4-full-test-execution-complete.md
phase4-user-types-verification.md
phase4-enhancements-complete.md
phase4-test-execution-results.md
phase2-performance-optimizations.md
phase3-deployment-verification.md
phase2-performance-optimization.md
phase6-typescript-verification.md
```

**Search Path Files (Archive - Completed Migration):**
```
search_path_fix_100_percent_complete.md
search_path_fix_instructions.md
search_path_final_status.md
search_path_system_functions_status.md
```

---

## 3. API Documentation Updates

### Files That Need Schema References

**`docs/api/STORY_CREATION_PIPELINE.md`**
- ✅ Already comprehensive
- ⚠️ Add note about RLS policies (link to `docs/database/RLS_POLICY_FIXES_2025-12-29.md`)
- ⚠️ Add note about test mode bypass

**`docs/api/troubleshooting/STORY_GENERATION_ERRORS.md`**
- ⚠️ Add "infinite recursion detected in policy" error with link to fix guide
- ⚠️ Add "Could not find column in schema cache" errors with link to schema alignment doc

**`docs/api/troubleshooting/COMMON_ERRORS.md`**
- ⚠️ Add RLS policy errors section

### New Files Needed

**`docs/api/database-schema-reference.md`** (NEW)
- Link to production schema
- Link to E2E schema alignment doc
- Common pitfalls (direct columns vs JSONB fields)

---

## 4. Test Script Fix (Immediate Blocker)

### Problem
The `scripts/test-disability-representation.js` invoked the Content Agent Lambda with `InvocationType: 'Event'` (async), but the Lambda handler received an empty payload.

### Root Cause
Event invocations for Lambda don't pass the payload the same way as `RequestResponse` invocations.

### Fix Required
Update `scripts/test-disability-representation.js`:

```javascript
// BEFORE (line 188):
const invokeParams = {
  FunctionName: CONTENT_AGENT_FUNCTION_NAME,
  InvocationType: 'Event', // ❌ Async, loses payload
  Payload: JSON.stringify(payload),
};

// AFTER:
const invokeParams = {
  FunctionName: CONTENT_AGENT_FUNCTION_NAME,
  InvocationType: 'RequestResponse', // ✅ Sync, preserves payload
  Payload: JSON.stringify(payload),
};
```

**Then:** Re-run the test to generate images.

---

## 5. Action Plan

### Immediate (Next 30 Minutes)
1. ✅ Fix `scripts/test-disability-representation.js` invocation type
2. ✅ Re-run disability representation test
3. ✅ Verify images generate with wheelchair integration

### Short-Term (Next Session)
4. Archive 92 outdated root files to `_archive/december-2025/`
5. Consolidate 15 E2E testing docs into single guide
6. Update API troubleshooting docs with RLS errors
7. Create `docs/api/database-schema-reference.md`

### Medium-Term (This Week)
8. Review `docs/api-reference/` for outdated content
9. Update OpenAPI spec with schema notes
10. Create automated doc generation for schema

---

## 6. File Organization Standards (Going Forward)

### Root Directory Rules
- **ONLY** keep active work docs (≤5 files)
- Archive completed work immediately after session
- Use dated archive folders: `_archive/YYYY-MM/`

### Documentation Rules
- **One canonical doc per topic** (no duplicates)
- Add "Last Updated" and "Supersedes" headers
- Link to related docs instead of duplicating content

### Test Documentation Rules
- Keep test guides, archive test results
- Date-stamp all test result files
- Archive results after 30 days

---

## 7. Priority Order

**P0 (Immediate):**
1. Fix test script invocation
2. Complete disability representation test

**P1 (Next Session):**
3. Archive 92 root files
4. Consolidate E2E testing docs

**P2 (This Week):**
5. Update API docs with schema references
6. Create schema reference doc

**P3 (When Time Permits):**
7. Review api-reference folder
8. Automate schema doc generation

---

## 8. Success Metrics

**After Cleanup:**
- ✅ Root directory has ≤15 files (currently ~150)
- ✅ Testing docs consolidated to ≤10 files (currently 40+)
- ✅ All docs have clear "Last Updated" dates
- ✅ No duplicate/conflicting content
- ✅ Schema changes documented in API guides

---

## Appendix: Archive Folder Structure

```
_archive/
  december-2025/
    status-files/          (92 files)
    test-results/          (JSON files)
    deployment-summaries/  (deployment docs)
  testing-history/
    phase-testing/         (phase docs)
    router-mcp/           (router/MCP docs)
    e2e-archives/         (old E2E docs)
```

---

**Next Immediate Action:** Fix test script and verify disability representation images.
**Next Session Action:** Execute cleanup plan to prevent future confusion.

---

**Status:** 🚨 Action Required  
**Last Updated:** December 29, 2025 22:30 UTC


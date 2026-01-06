# Deeper Cleanup Execution Plan

**Date**: 2025-12-14
**Status**: READY FOR EXECUTION

## Overview

This document provides the step-by-step execution plan for the deeper cleanup of root directory files. All files have been assessed and categorized by importance.

## Pre-Execution Checklist

- [ ] Review `docs/DEEPER_CLEANUP_PLAN.md` for complete assessment
- [ ] Create git tag: `before-deeper-cleanup-20251214`
- [ ] Verify no active work on files to be moved/deleted
- [ ] Backup important files if needed

## Execution Phases

### Phase 1: Move HIGH Importance Files ✅ READY

**Files to Move** (15 files):

```bash
# Create target directories
mkdir -p docs/operations docs/development docs/integration-guides docs/system docs/finance docs/compliance

# Move files
mv AGENT_HANDOFF.md docs/operations/
mv AGENT_TO_LAMBDA_MAPPING.md docs/deployment/
mv COMPLETE_MULTI_AGENT_IMPLEMENTATION_SPECIFICATION.md docs/development/
mv UNIVERSAL_STORYTAILOR_AGENT_PLAN.md docs/development/
mv UNIVERSAL_STORYTAILOR_INTEGRATION_GUIDE.md docs/integration-guides/
mv SELF_HEALING_INTEGRATION_PLAN.md docs/development/
mv SELF_HEALING_IMPLEMENTATION_GUIDE.md docs/development/  # Check if empty first
mv PLATFORM_AGNOSTIC_SMART_HOME_DESIGN.md docs/development/
mv SMART_HOME_INTEGRATION_PLAN.md docs/integration-guides/
mv COMPREHENSIVE_REGION_AUDIT_AND_STRATEGY.md docs/system/
mv REALITY_CHECK_MULTI_AGENT_GAP_ANALYSIS.md docs/system/
mv HONEST_MULTI_AGENT_ASSESSMENT.md docs/system/
mv COST_OPTIMIZATION_ANALYSIS.md docs/finance/
mv MONITORING_AND_COST_OPTIMIZATION_PLAN.md docs/operations/
mv PRIVACY_COMPLIANCE_IMPLEMENTATION.md docs/compliance/
```

**Validation**:
- Verify files moved successfully
- Check for broken references
- Update `docs/README.md` with new locations

### Phase 2: Consolidate MEDIUM Importance Files ✅ READY

**Files to Move** (20 files):

```bash
# Move to appropriate docs subdirectories
mv COMPREHENSIVE_TESTING_COMPLETE.md docs/testing/
mv COMPREHENSIVE_E2E_AND_DOCUMENTATION_COMPLETE.md docs/testing/
mv EMBEDDED_MULTI_AGENT_IMPLEMENTATION_PLAN.md docs/development/
mv FULL_MULTI_AGENT_DEPLOYMENT_SPECIFICATION.md docs/deployment/
mv MISSING_ENDPOINTS_ANALYSIS.md docs/system/
mv MISSING_COMPONENTS_CREATED.md docs/system/
mv MONITORING_AND_ENHANCEMENT_RECOMMENDATIONS.md docs/operations/
mv PRIVACY_COMPLIANCE_ANALYSIS.md docs/compliance/
mv PRIVACY_COMPLIANCE_SOLUTIONS.md docs/compliance/
mv STORYTAILOR_SYSTEM_AUDIT_COMPLETE.md docs/system/
mv CURRENT_SYSTEM_STATE_DOCUMENTATION.md docs/system/
mv CHECKPOINT_VERIFICATION_SYSTEM.md docs/system/
mv AGENT_ENDPOINT_VERIFICATION.md docs/system/
mv CHARACTER_CREATION_ENDPOINTS_ADDED.md docs/system/
mv CONVERSATION_ENDPOINTS_IMPLEMENTED.md docs/system/
mv DELETION_SYSTEM_DEPLOYMENT_COMPLETE.md docs/deployment/
mv DATABASE_RELATIONSHIP_FIX_COMPLETE.md docs/system/

# Files to extract content from then delete
# COMPREHENSIVE_EMAIL_INTEGRATION_PLAN.md → Extract to docs/integration-guides/email-integration.md
# COMPREHENSIVE_QA_EXECUTION_PLAN.md → Extract to docs/qa-reports/EXECUTION_PLAN.md
# COMPREHENSIVE_ORCHESTRATION_VERIFICATION.md → Extract to docs/system/orchestration-verification.md
```

**Validation**:
- Verify content extracted before deletion
- Update canonical docs with extracted content
- Verify files moved successfully

### Phase 3: Delete LOW Importance Files ✅ READY

**Files to Delete** (40+ files):

```bash
# Status reports (30 files)
rm -f AGENTS_FULLY_CONFIGURED_SUCCESS.md
rm -f CRITICAL_AGENTS_DEPLOYMENT_SUCCESS.md
rm -f EPIC_DEPLOYMENT_MARATHON_COMPLETE.md
rm -f FINAL_COMPREHENSIVE_SYSTEM_STATUS_UPDATED.md
rm -f FINAL_MULTI_AGENT_STATUS_UPDATE.md
rm -f FINAL_PRODUCTION_DEPLOYMENT_COMPLETE.md
rm -f FINAL_VERIFICATION_COMPLETE.md
rm -f PRODUCTION_DEPLOYMENT_COMPLETE.md
rm -f PRODUCTION_DEPLOYMENT_COMPLETE_FINAL.md
rm -f PRODUCTION_DEPLOYMENT_FINAL.md
rm -f PRODUCTION_DEPLOYMENT_READY.md
rm -f PRODUCTION_DEPLOYMENT_SUCCESS.md
rm -f PRODUCTION_PUSH_AND_AUDIT_COMPLETE.md
rm -f PRODUCTION_REGION_CONFIRMED.md
rm -f EMAIL_INTEGRATION_COMPLETE.md
rm -f EMAIL_INTEGRATION_DEPLOYMENT_COMPLETE.md
rm -f EMAIL_SYSTEM_DEPLOYMENT_COMPLETE.md
rm -f FULL_EMAIL_INTEGRATION_DEPLOYMENT_COMPLETE.md
rm -f DELETION_SYSTEM_DEPLOYMENT_COMPLETE.md  # Already moved in Phase 2
rm -f MONITORING_SETUP_COMPLETE.md
rm -f MONITORING_CHECKLIST_COMPLETE.md
rm -f GIT_CLEANUP_COMPLETE.md
rm -f CLEANUP_SCRIPT_COMPLETE.md
rm -f REGION_CLEANUP_COMPLETE.md
rm -f REGION_CONSOLIDATION_COMPLETE.md
rm -f REGION_MIGRATION_COMPLETE.md
rm -f REGION_MIGRATION_VERIFICATION_COMPLETE.md
rm -f FINAL_MIGRATION_VERIFICATION_COMPLETE.md
rm -f US_EAST_2_CLEANUP_COMPLETE.md
rm -f COMPLETE_STATUS_AND_NEXT_STEPS.md

# Phase progress reports (13 files)
rm -f PHASE_1_PROGRESS_UPDATE.md
rm -f PHASE_2_CHECKPOINT_FOCUS.md
rm -f PHASE_2_DEPLOYMENT_CHECKPOINT.md
rm -f PHASE_2_DEPLOYMENT_PLAN.md
rm -f PHASE_2_MASSIVE_DEPLOYMENT_SUCCESS.md
rm -f PHASE_2_PROGRESS_UPDATE.md
rm -f PHASE_2_QA_CRITICAL_AGENTS_REVIEW.md
rm -f PHASE_3_CHECKPOINT_100_PERCENT.md
rm -f PHASE_3_PROGRESS_100_PERCENT.md
rm -f PHASE_4_5_COMPLETE.md
rm -f PHASE_6_API_ENDPOINT_TESTING.md
rm -f PHASE_6_PROGRESS.md
rm -f NEXT_STEPS_DEPLOYMENT.md
rm -f NEXT_STEPS_PROGRESS.md

# Todo lists (2 files)
rm -f MASTER_COMPREHENSIVE_TODO_LIST.md
rm -f UNIFIED_MASTER_TODO_LIST.md

# Other disposable (15 files)
rm -f WORK_ON_MAIN.md
rm -f PLAN_STATUS_AND_CLEANUP_ASSESSMENT.md
rm -f SYSTEM_SNAPSHOT_BACKUP_RESTORE_POINT.md
rm -f FINAL_DEPLOYMENT_READINESS.md
rm -f PRODUCTION_INFRASTRUCTURE_DISCOVERY.md
rm -f SCHEDULED_EXECUTION_ANALYSIS.md
rm -f SCHEDULED_EXECUTION_CHECK.md
rm -f IMMEDIATE_SCHEDULED_EXECUTION_TEST.md
rm -f E2E_TEST_EXECUTION_TRACKER.md
rm -f TEST_FIXES_LOG.md
rm -f PROCESSOR_MONITORING_CHECKLIST.md
rm -f SENDGRID_TEMPLATES_CONNECTED.md
rm -f SENDGRID_TEMPLATES_DISCONNECTED.md
rm -f CTA_BUTTON_ROTATOR_README.md
rm -f MULTI_AGENT_SYSTEM_REALITY_CHECK.md  # May have value, review first
```

**Validation**:
- Verify no code references (grep check)
- Confirm files deleted
- Verify build still works

### Phase 4: Handle Special Cases ✅ READY

**Files to Move** (7 files):

```bash
# SQL scripts
mv MIGRATION_VERIFICATION_SCRIPT.sql supabase/migrations/ 2>/dev/null || mv MIGRATION_VERIFICATION_SCRIPT.sql scripts/
mv CRITICAL_MIGRATIONS_FOR_DASHBOARD.sql supabase/migrations/
# Check if REMAINING_TABLES_TO_CREATE.sql has been applied
# If applied: rm -f REMAINING_TABLES_TO_CREATE.sql
# If not: mv REMAINING_TABLES_TO_CREATE.sql supabase/migrations/

# Migration guides
mv MIGRATION_INSTRUCTIONS.md docs/deployment/
mv MIGRATION_APPLICATION_INSTRUCTIONS.md docs/deployment/

# Example files
mv cta-button-example.html examples/
mv cta-button-rotator.js examples/
mv cta-button-rotator-inline.js examples/

# Test script
mv test-api-keys.js testing/ 2>/dev/null || rm -f test-api-keys.js
```

**Validation**:
- Verify SQL scripts in correct location
- Verify examples accessible
- Check migration guides in docs

### Phase 5: Directory Cleanup ✅ READY

**Directories to Clean**:

```bash
# Delete build artifacts
rm -rf dist/
rm -rf deploy-token-service/

# Delete log directories
rm -rf error-logs/

# Delete empty directories
rm -rf monitoring/  # Empty, duplicate of packages/monitoring
rm -rf mintlify-story-intelligence/  # Empty
rm -rf mintlify-storytailor/  # Empty

# Delete old deployment archives
rm -rf deployments/*.zip  # Timestamped deployment packages

# Review these directories:
# - agentic-ux/ (33 .md files - check for unique content vs docs/)
# - services/ (MCP server - KEEP, it's active)
# - ~/ (personal config - review if belongs in repo)
```

**Validation**:
- Verify directories deleted/cleaned
- Check for duplicate content
- Consolidate if needed

## Post-Execution Validation

1. **File Count Check**:
   ```bash
   find . -maxdepth 1 -name "*.md" | wc -l
   # Should be ~5 (README.md, AGENTS.md, config files)
   ```

2. **Build Verification**:
   ```bash
   npm run build
   npm run test
   ```

3. **Reference Check**:
   ```bash
   grep -r "AGENT_HANDOFF\|AGENT_TO_LAMBDA\|COMPLETE_MULTI_AGENT" . --exclude-dir=node_modules --exclude-dir=.git
   # Should only find references in docs/
   ```

4. **Documentation Index Update**:
   - Update `docs/README.md` with new file locations
   - Verify all moved files accessible

## Rollback Plan

If issues arise:
```bash
git checkout before-deeper-cleanup-20251214 -- .
# Or restore specific files:
git checkout before-deeper-cleanup-20251214 -- <file>
```

## Success Metrics

- ✅ Root markdown files: 100 → ~5
- ✅ All HIGH importance files moved to `docs/`
- ✅ All MEDIUM importance files consolidated
- ✅ All LOW importance files deleted
- ✅ Build and tests still pass
- ✅ No broken references

## Related Documentation

- [Deeper Cleanup Plan](./DEEPER_CLEANUP_PLAN.md) - Complete assessment
- [File Action List](./FILE_ACTION_LIST.md) - Original action list
- [Execution Plan](./EXECUTION_PLAN.md) - Overall execution roadmap

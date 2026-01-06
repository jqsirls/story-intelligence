# File-by-File Action List

**Last Updated**: 2025-12-13

This document provides a comprehensive action list for all files and directories requiring attention during the cleanup process.

## Root Directory Files

### DELETE (Quarantine First)

| File Pattern | Count | Risk | Effort | Owner | Action |
|------------|-------|------|--------|-------|--------|
| `*_SUMMARY.md` | ~76 | LOW | S | Eng | Quarantine → Review → Delete |
| `*_STATUS.md` | ~67 | LOW | S | Eng | Quarantine → Review → Delete |
| `*_REPORT.md` | ~81 | LOW | S | Eng | Quarantine → Review → Delete |
| `*_AUDIT.md` | ~8 | MED | S | Eng | Quarantine → Review → Extract → Delete |
| `*_RESULTS.md` | ~6 | LOW | S | Eng | Quarantine → Review → Delete |
| `region-inventory-*.txt` | ~2 | LOW | S | Eng | Delete (timestamped) |

**Total**: ~240 root-level files

### MOVE

| File/Directory | Target | Risk | Effort | Owner | Action |
|----------------|--------|------|--------|-------|--------|
| `00_SETUP/` | `docs/setup/` or delete if duplicate | MED | M | Eng | Compare content, merge or delete |
| `02_API_DOCUMENTATION/` | `docs/api-reference/` | MED | M | Eng | Merge into existing api-reference |
| `04_DEPLOYMENT/` | `docs/deployment/` | MED | M | Eng | Merge into existing deployment |
| `05_COMPLIANCE/` | `docs/compliance/` | MED | M | Eng | Merge into existing compliance |

### DELETE Directories

| Directory | Risk | Effort | Owner | Action |
|-----------|------|--------|-------|--------|
| `tmp-ci/` | LOW | S | Eng | Verify contents, then delete |
| `tmp-ci-merge/` | LOW | S | Eng | Verify contents, then delete |
| `test-results/` | LOW | S | Eng | Add to .gitignore, delete |
| `production-deployment-20251018-210251/` | LOW | S | Eng | Extract notes if any, then delete |
| `deploy-token-service/` | LOW | S | Eng | Verify only .tsbuildinfo, then delete |

## Package-Level Files

### DELETE (Quarantine First)

| File Pattern | Location | Risk | Effort | Owner | Action |
|--------------|----------|------|--------|-------|--------|
| `IMPLEMENTATION_SUMMARY.md` | `packages/*/` | LOW | S | Eng | Extract implementation details, then delete |
| `VERIFICATION_SYSTEM_SUMMARY.md` | `packages/auth-agent/` | LOW | S | Eng | Extract verification details, then delete |

**Files Found**:
- `packages/auth-agent/VERIFICATION_SYSTEM_SUMMARY.md`
- `packages/commerce-agent/IMPLEMENTATION_SUMMARY.md`
- `packages/voice-synthesis/IMPLEMENTATION_SUMMARY.md`
- `packages/universal-agent/TASK_18_5_IMPLEMENTATION_SUMMARY.md`
- `packages/content-agent/ASSET_GENERATION_SUMMARY.md`
- `supabase/IMPLEMENTATION_SUMMARY.md`

## Documentation Directories

### CONSOLIDATE

| Directory | Target | Risk | Effort | Owner | Action |
|-----------|--------|------|--------|-------|--------|
| `STORYTAILOR_DEVELOPER_DOCUMENTATION/` | `docs/` | MED | L | Eng + Product | Compare content, merge unique items |
| `agentic-ux/developer-docs/` | `docs/` | MED | L | Eng + Product | Compare with STORYTAILOR_DEVELOPER_DOCUMENTATION, merge |
| `agentic-ux/docs/` | `docs/` | MED | L | Eng + Product | Review and merge if not duplicate |

## Special Cases

### Files Requiring Extra Review

| File | Reason | Risk | Action |
|------|--------|------|--------|
| `COMPREHENSIVE_TASK_AUDIT_RESULTS.md` | Contains project status audit | MED | Extract valuable insights to `docs/DECISIONS.md`, then delete |
| `CHARACTER_VISUAL_VOICE_INTEGRATION_SUMMARY.md` | May contain integration details | MED | Extract integration details to appropriate doc, then delete |
| Files with "COMPREHENSIVE" or "FINAL" | May be authoritative | MED | Review carefully, extract if valuable |

### Files in docs/ Directory

| File | Action | Reason |
|------|--------|--------|
| `docs/PRODUCTION_DEPLOYMENT_SUMMARY.md` | KEEP or UPDATE | May be current status |
| `docs/DOCUMENTATION_COMPLETE_SUMMARY.md` | DELETE | Disposable artifact pattern |
| `docs/PRODUCTION_DOCUMENTATION_AUDIT_COMPLETE.md` | DELETE | Disposable artifact pattern |
| `docs/CONSISTENCY_REPORT.md` | REVIEW | May have valuable findings |

**Note**: Files in `docs/` that match disposable patterns should be reviewed but are lower priority since they're already in canonical location.

## Infrastructure Files

### UPDATE

| File | Action | Risk | Effort | Owner |
|------|--------|------|--------|-------|
| `.gitignore` | Add disposable artifact patterns | LOW | S | Eng |
| `README.md` | Add link to canonical docs | LOW | S | Eng |
| `docs/README.md` | Update to reference new canonical structure | LOW | S | Eng |

### CREATE

| File | Purpose | Risk | Effort | Owner |
|------|---------|------|--------|-------|
| `.github/PULL_REQUEST_TEMPLATE.md` | Standardize PR format | LOW | S | Eng |
| `.github/ISSUE_TEMPLATE/` | Standardize issue format | LOW | S | Eng |
| `docs/DEFINITION_OF_DONE.md` | DoD checklist | LOW | S | Eng + Product |

## Package Structure

### RENAME/CONSOLIDATE (If Needed)

| Package | Issue | Risk | Effort | Owner | Action |
|---------|-------|------|--------|-------|--------|
| `monitoring/` vs `health-monitoring/` | Potential overlap | MED | M | Eng | Audit, consolidate if duplicate |
| `storytailor-agent/` vs `universal-agent/` | Naming inconsistency | MED | M | Eng | Use `universal-agent` as canonical name |

## Risk Levels

- **LOW**: Safe to proceed, minimal impact
- **MED**: Requires careful review, may have dependencies
- **HIGH**: Significant impact, requires extensive testing

## Effort Levels

- **S**: Small (< 1 hour)
- **M**: Medium (1-4 hours)
- **L**: Large (> 4 hours)

## Owner Roles

- **Eng**: Engineering team
- **Product**: Product team
- **Eng + Product**: Collaboration required

## Execution Order

1. **Phase 1**: Quarantine root disposable artifacts (PR 1)
2. **Phase 2**: Update .gitignore and create policy (PR 2) ✅
3. **Phase 3**: Create canonical docs (PR 3) ✅
4. **Phase 4**: Package-level cleanup (PR 4)
5. **Phase 5**: Documentation consolidation (PR 5)
6. **Phase 6**: Root directory cleanup (PR 6)
7. **Phase 7**: Pre-commit hooks (PR 7)
8. **Phase 8**: Fill documentation gaps (PR 8)
9. **Phase 9**: Structure optimization (PR 9)

## Related Documentation

- [How We Work](./HOW_WE_WORK.md) - Development workflow
- [Multi-Lens Audit](./MULTI_LENS_AUDIT.md) - Audit findings

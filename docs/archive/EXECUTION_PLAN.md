# Execution Plan

**Last Updated**: 2025-12-13

## Overview

This plan provides a detailed execution roadmap for the repo cleanup and restructuring, organized by timeframes and risk levels.

## Day 1-2: Quick Wins (Low Risk)

### PR 1: Quarantine Root Disposable Artifacts ✅ IN PROGRESS

**Status**: Quarantine structure created, manifest generation script ready

**Steps**:
1. ✅ Create `_quarantine/` directory structure
2. ✅ Create manifest generation script
3. ⏳ Move all root-level disposable files to `_quarantine/root-disposable-artifacts/`
4. ⏳ Generate manifest with content summaries
5. ⏳ Move disposable directories to `_quarantine/directories/`
6. ⏳ Create git tag `before-cleanup-YYYYMMDD`

**Validation**:
- Run `npm run build && npm run test`
- Review manifest with team
- Extract valuable content to canonical docs

**Rollback**: Git revert or restore from tag

**Next**: After team review, create PR 1b to delete approved files

### PR 2: Update .gitignore and Policy ✅ COMPLETE

**Status**: ✅ Completed
- ✅ Updated `.gitignore` with disposable artifact patterns
- ✅ Created `docs/HOW_WE_WORK.md` with disposable artifacts policy

### PR 3: Create Canonical Documentation ✅ COMPLETE

**Status**: ✅ Completed
- ✅ Created `docs/WHAT_THIS_IS.md`
- ✅ Created `docs/MENTAL_MODEL.md`
- ✅ Created `docs/HOW_WE_WORK.md`
- ✅ Created `docs/NAMING.md`
- ✅ Created `docs/OWNERSHIP.md`
- ✅ Created `docs/DECISIONS.md`

## Week 1: Stabilization

### PR 4: Package-Level Cleanup

**Steps**:
1. Move `packages/*/IMPLEMENTATION_SUMMARY.md` to `_quarantine/packages/`
2. Move `packages/*/VERIFICATION_SYSTEM_SUMMARY.md` to `_quarantine/packages/`
3. Create manifest with content summaries
4. Extract implementation details to package READMEs or `docs/DECISIONS.md`
5. Update package READMEs if they reference these files
6. After review, delete approved files

**Validation**:
- Build all packages: `turbo run build`
- Test all packages: `turbo run test`
- Verify package READMEs still accurate

**Rollback**: Git revert

**Files to Process**:
- `packages/auth-agent/VERIFICATION_SYSTEM_SUMMARY.md`
- `packages/commerce-agent/IMPLEMENTATION_SUMMARY.md`
- `packages/voice-synthesis/IMPLEMENTATION_SUMMARY.md`
- `packages/universal-agent/TASK_18_5_IMPLEMENTATION_SUMMARY.md`
- `packages/content-agent/ASSET_GENERATION_SUMMARY.md`
- `supabase/IMPLEMENTATION_SUMMARY.md`

## Weeks 2-4: Restructuring

### PR 5: Documentation Consolidation

**Steps**:
1. Compare `STORYTAILOR_DEVELOPER_DOCUMENTATION/` with `docs/`
2. Merge unique content from `STORYTAILOR_DEVELOPER_DOCUMENTATION/` into `docs/`
3. Compare `agentic-ux/developer-docs/` with merged docs
4. Merge unique content if not duplicate
5. Move numbered root folders (`00_SETUP/`, etc.) to `docs/` or delete if duplicate
6. Update all cross-references
7. Delete original directories after migration

**Validation**:
- Search for broken links: `grep -r "STORYTAILOR_DEVELOPER_DOCUMENTATION" docs/`
- Verify all docs accessible from `docs/README.md`
- Run link checker if available

**Rollback**: Git revert (large change, review carefully)

**Risk**: MED - May break external links

### PR 6: Root Directory Cleanup

**Steps**:
1. Move remaining root files to appropriate locations
2. Audit `~/` directory - determine if disposable
3. Audit `.audit/` directory - determine if tool artifacts
4. Audit `.kiro/` directory - determine if tool artifacts
5. Clean up any remaining disposable files

**Validation**:
- Full build: `npm run build`
- Full test: `npm run test`
- Type check: `npm run type-check`

**Rollback**: Git revert

## 30-60 Day: Scale Plan

### PR 7: Pre-commit Hooks

**Steps**:
1. Create `.husky/` directory (if using husky) or `.git/hooks/`
2. Add pre-commit hook to check for disposable artifacts
3. Add CI check in `.github/workflows/ci.yml`
4. Test by trying to commit a disposable artifact

**Validation**:
- Try to commit `test_SUMMARY.md` - should fail
- Verify hook runs in CI

**Rollback**: Remove hook

### PR 8: Documentation Gap Filling

**Steps**:
1. Review `docs/MULTI_LENS_AUDIT.md` findings
2. Create missing runbooks:
   - PII handling runbook
   - Secrets management documentation
   - Performance monitoring guide
3. Create missing documentation:
   - Design system documentation
   - Analytics taxonomy
   - Data flow diagram
4. Complete `.env.example` with all required variables

**Validation**:
- New hire can onboard in one day
- All documentation is findable
- No missing critical documentation

**Rollback**: N/A (additive only)

### PR 9: Structure Optimization

**Steps**:
1. Audit `monitoring/` vs `health-monitoring/` packages
2. Consolidate if duplicate, keep separate if different
3. Update all imports if consolidated
4. Optimize package dependencies
5. Create dependency graph visualization

**Validation**:
- Dependency graph analysis
- All builds pass
- All tests pass
- No circular dependencies

**Rollback**: Git revert

## Merge Plan Checklist

### Before Each PR

- [ ] Create git tag for rollback point
- [ ] Run `npm run ci:validate` (lint + type-check + test)
- [ ] Verify no code references files being deleted/moved
- [ ] Review file contents for valuable information
- [ ] Extract valuable content to canonical docs before deletion
- [ ] Check for references in documentation files
- [ ] Verify no legal/compliance information in files to delete
- [ ] Update cross-references if moving files
- [ ] Test build and test suite
- [ ] Create manifest of files being deleted with content summaries
- [ ] Review PR with team (for large changes)
- [ ] Get explicit approval for deletions

### After Each PR

- [ ] Verify build still works
- [ ] Verify tests still pass
- [ ] Update documentation index if needed
- [ ] Communicate changes to team

## Risk Register

### High Risk

**Documentation consolidation** - May break external links
- **Mitigation**: Search for all references before moving, update immediately
- **Rollback**: Git revert
- **Owner**: Eng + Product

### Medium Risk

**Package cleanup** - May break internal references
- **Mitigation**: Grep for all references, update before deleting
- **Rollback**: Git revert
- **Owner**: Eng

**Package consolidation** - May break imports
- **Mitigation**: Update all imports, test thoroughly
- **Rollback**: Git revert
- **Owner**: Eng

### Low Risk

**Root disposable artifact deletion** - No code references
- **Mitigation**: Quarantine before deletion, content review, human approval
- **Rollback**: Git revert or restore from tag
- **Owner**: Eng

## Definition of Success

### Measurable Outcomes

1. **File count reduction**: Root directory from 300+ markdown files to <20
2. **Documentation clarity**: New hire can find any doc in <2 minutes
3. **Build time**: No increase in build/test time
4. **Zero breakage**: All tests pass, all builds succeed
5. **Team adoption**: Team uses canonical docs, stops creating disposable artifacts

### Validation Methods

- **File count**: `find . -maxdepth 1 -name "*.md" | wc -l`
- **Documentation findability**: Time new hire to find specific doc
- **Build/test**: `npm run ci:validate` passes
- **Team survey**: Ask team about doc findability

## Timeline Summary

| Phase | Duration | PRs | Risk Level |
|-------|----------|-----|------------|
| Day 1-2 | 2 days | PR 1-3 | LOW |
| Week 1 | 1 week | PR 4 | LOW-MED |
| Weeks 2-4 | 3 weeks | PR 5-6 | MED |
| 30-60 Day | 1-2 months | PR 7-9 | LOW-MED |

## Dependencies

- PR 1 must complete before PR 1b (deletion)
- PR 2 should complete early (gitignore update)
- PR 3 should complete early (canonical docs)
- PR 5 should complete before PR 6 (doc consolidation before root cleanup)
- PR 8 can run in parallel with others (additive only)

## Related Documentation

- [File Action List](./FILE_ACTION_LIST.md) - Detailed file actions
- [Structure Proposal](./STRUCTURE_PROPOSAL.md) - Target structure
- [How We Work](./HOW_WE_WORK.md) - Development workflow

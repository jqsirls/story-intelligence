# Decision Log

**Last Updated**: 2025-12-13

This log records significant architectural, technical, and process decisions made for the Storytailor project.

## Format

Each decision entry includes:
- **Date**: When the decision was made
- **Context**: What problem we were solving
- **Decision**: What we decided
- **Consequences**: What this means for the project
- **Status**: Current status (Active, Superseded, etc.)

## Decisions

### 2025-12-13: Quarantine System for File Cleanup

**Context**: Need to clean up 300+ disposable artifact files without losing important information.

**Decision**: Implement a quarantine system where files are moved to `_quarantine/` directory for review before deletion, rather than deleting immediately.

**Consequences**:
- Files can be reviewed before deletion
- Valuable content can be extracted to canonical docs
- Team can approve deletions explicitly
- Git history preserves all files even after deletion

**Status**: Active

---

### 2025-12-13: Canonical Documentation Structure

**Context**: Documentation sprawl across multiple directories makes it hard to find information.

**Decision**: Establish canonical documentation structure in `docs/` with core files:
- `WHAT_THIS_IS.md` - Product overview
- `MENTAL_MODEL.md` - System architecture
- `HOW_WE_WORK.md` - Development workflow
- `NAMING.md` - Naming conventions
- `OWNERSHIP.md` - Ownership and responsibilities
- `DECISIONS.md` - This file

**Consequences**:
- Single source of truth for core information
- Easier onboarding for new team members
- Clearer documentation organization
- Reduced documentation duplication

**Status**: Active

---

### 2025-12-13: Disposable Artifacts Policy

**Context**: Repo cluttered with temporary SUMMARY, STATUS, REPORT, AUDIT, RESULTS files.

**Decision**: Establish policy that these file patterns are disposable and should not be committed:
- `*_SUMMARY.md`
- `*_STATUS.md`
- `*_REPORT.md`
- `*_AUDIT.md`
- `*_RESULTS.md`
- `*_COMPLETE.md`
- `*_SUCCESS.md`
- `*_READY.md`
- `*_FINAL.md`
- `PRODUCTION*.md` (except in docs/)
- `DEPLOYMENT*.md` (except in docs/)

**Consequences**:
- Cleaner repo
- Faster navigation
- Clearer what's important vs temporary
- Enforced via `.gitignore` and PR reviews
- Package-level disposable artifacts also removed

**Status**: Active

---

### Previous Decisions (To Be Migrated)

*Note: Previous decisions may exist in quarantined files. These will be extracted and added here during the cleanup process.*

## Adding New Decisions

When making a significant decision:

1. **Document immediately**: Add to this file
2. **Be concise**: One decision per entry
3. **Include context**: Why the decision was made
4. **Update status**: Mark as Active, Superseded, or Deprecated

## Related Documentation

- [How We Work](./HOW_WE_WORK.md) - Development workflow
- [Ownership](./OWNERSHIP.md) - Decision authority

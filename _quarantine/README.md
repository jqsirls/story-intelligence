# Quarantine Directory

This directory contains files pending review before deletion. Files are moved here instead of being deleted immediately to ensure no important information is lost.

## Structure

- `root-disposable-artifacts/` - Root-level disposable files (SUMMARY, STATUS, REPORT, AUDIT, RESULTS)
- `packages/` - Package-level disposable files
- `directories/` - Entire directories pending review
- `MANIFEST.md` - Master manifest of all quarantined files with content summaries

## Review Process

1. Files are moved here with a manifest entry
2. Team reviews manifest and content summaries
3. Valuable content is extracted to canonical docs
4. Files are approved for deletion or moved to `_archive/`
5. Only explicitly approved files are deleted

## Safety

- All files remain in git history even after deletion
- Git tags are created before major deletions for rollback
- Content is extracted before deletion when valuable

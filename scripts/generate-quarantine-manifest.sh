#!/bin/bash
# Generate quarantine manifest for disposable artifacts

REPO_ROOT="/Users/jqsirls/Library/CloudStorage/Dropbox-Storytailor/JQ Sirls/Storytailor Inc/Projects/Storytailor Agent"
QUARANTINE_DIR="$REPO_ROOT/_quarantine"
MANIFEST="$QUARANTINE_DIR/MANIFEST.md"

cd "$REPO_ROOT" || exit 1

cat > "$MANIFEST" << 'EOF'
# Quarantine Manifest

**Generated**: $(date)
**Purpose**: List of all files quarantined for review before deletion

## Review Process

1. Review each file's content summary
2. Extract valuable information to canonical docs
3. Mark action: DELETE, ARCHIVE, or MIGRATE
4. Only delete files explicitly approved

## Files by Category

EOF

echo "## Root-Level Disposable Artifacts" >> "$MANIFEST"
echo "" >> "$MANIFEST"
echo "| File | Size | Modified | Content Preview | Action |" >> "$MANIFEST"
echo "|------|------|----------|----------------|--------|" >> "$MANIFEST"

find . -maxdepth 1 -type f \( -name "*_SUMMARY.md" -o -name "*_STATUS.md" -o -name "*_REPORT.md" -o -name "*_AUDIT.md" -o -name "*_RESULTS.md" \) | while read -r file; do
    filename=$(basename "$file")
    size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "?")
    modified=$(stat -f%Sm -t "%Y-%m-%d" "$file" 2>/dev/null || stat -c%y "$file" 2>/dev/null | cut -d' ' -f1 || echo "?")
    preview=$(head -c 200 "$file" 2>/dev/null | tr '\n' ' ' | sed 's/|/\\|/g' | cut -c1-200)
    echo "| \`$filename\` | $size bytes | $modified | $preview... | PENDING |" >> "$MANIFEST"
done

echo "" >> "$MANIFEST"
echo "## Special Cases Requiring Extra Review" >> "$MANIFEST"
echo "" >> "$MANIFEST"
echo "Files with 'COMPREHENSIVE' or 'FINAL' in name may contain authoritative information:" >> "$MANIFEST"
echo "" >> "$MANIFEST"

find . -maxdepth 1 -type f -name "*COMPREHENSIVE*" -o -name "*FINAL*" | grep -E "(SUMMARY|STATUS|REPORT|AUDIT|RESULTS)" | while read -r file; do
    filename=$(basename "$file")
    echo "- \`$filename\` - ⚠️ Review carefully" >> "$MANIFEST"
done

echo "" >> "$MANIFEST"
echo "---" >> "$MANIFEST"
echo "" >> "$MANIFEST"
echo "**Next Steps**: Review manifest, extract valuable content, then approve deletions" >> "$MANIFEST"

chmod +x "$REPO_ROOT/scripts/generate-quarantine-manifest.sh"
echo "Manifest generated at $MANIFEST"

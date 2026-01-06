#!/bin/bash
# Install Git Hooks - Inclusivity System Protection
# 
# This script installs git hooks from .git-hooks/ (version controlled)
# to .git/hooks/ (where git actually looks for them)
#
# Runs automatically on npm install via "prepare" script

set -e

HOOKS_DIR=".git/hooks"
SOURCE_DIR=".git-hooks"

echo "🔧 Installing git hooks for inclusivity system protection..."

# Ensure .git/hooks directory exists
mkdir -p "$HOOKS_DIR"

# Copy pre-commit hook
if [ -f "$SOURCE_DIR/pre-commit" ]; then
  cp "$SOURCE_DIR/pre-commit" "$HOOKS_DIR/pre-commit"
  chmod +x "$HOOKS_DIR/pre-commit"
  echo "✅ Installed: pre-commit hook"
  echo "   - Blocks commits with <39 traits"
  echo "   - Blocks commits with TODO placeholders"
  echo "   - Blocks deletion of critical files"
else
  echo "⚠️  Warning: $SOURCE_DIR/pre-commit not found"
  exit 1
fi

echo ""
echo "✅ Git hooks installed successfully"
echo "   Inclusivity system now protected at commit-time"
echo ""

#!/bin/bash

# Extract all test URLs from terminal output
TERMINAL_FILE="/Users/jqsirls/.cursor/projects/Users-jqsirls-Library-CloudStorage-Dropbox-Storytailor-JQ-Sirls-Storytailor-Inc-Projects-Storytailor-Agent/terminals/944701.txt"

echo "=== WHIMSICAL TEST IMAGE URLS ==="
echo ""

# Extract all scenario names and URLs
grep -B 10 "📸 HEADSHOT URL\|🧍 BODYSHOT URL" "$TERMINAL_FILE" | grep -E "TEST:|📸|🧍|https://" | sed 's/\[INFO\]//g' | sed 's/\[WARN\]//g'

echo ""
echo "=== EXTRACTION COMPLETE ==="

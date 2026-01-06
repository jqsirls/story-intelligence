#!/bin/bash

# Script to open all HTML files in browser for easy PDF conversion
# After opening, print each to PDF using browser's print dialog

cd "$(dirname "$0")"

echo "Opening HTML files in browser for PDF conversion..."
echo ""
echo "For each file that opens:"
echo "  1. File → Print (Cmd+P)"
echo "  2. Click 'PDF' dropdown → 'Save as PDF'"
echo "  3. Save with .pdf extension (replace .html with .pdf)"
echo ""

# Open all HTML files in default browser
for html_file in *.html; do
    if [ -f "$html_file" ]; then
        echo "Opening $html_file..."
        open "$html_file"
        sleep 2  # Wait 2 seconds between opens
    fi
done

echo ""
echo "All HTML files opened in browser."
echo "Convert each to PDF using Print → Save as PDF"
echo ""
echo "PDF files should be saved in this folder with .pdf extension"

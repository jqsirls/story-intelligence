#!/bin/bash

# Simple script to help create PDFs using macOS built-in tools
# This creates HTML versions that can be easily printed to PDF

cd "$(dirname "$0")"
mkdir -p pdf-version

echo "Creating HTML versions for easy PDF conversion..."
echo ""

# Create a simple HTML wrapper for each markdown file
for file in *.md; do
    if [ "$file" != "README.md" ] && [ "$file" != "PDF-GENERATION-GUIDE.md" ] && [ "$file" != "generate-pdfs.sh" ] && [ "$file" != "generate-pdfs.js" ]; then
        html_file="pdf-version/${file%.md}.html"
        echo "Creating HTML: $html_file"
        
        # Create HTML with basic styling
        cat > "$html_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${file%.md}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            line-height: 1.6;
        }
        h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        h3 { color: #777; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        code { background-color: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
        pre { background-color: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
        blockquote { border-left: 4px solid #ddd; padding-left: 20px; margin-left: 0; color: #666; }
    </style>
</head>
<body>
EOF
        
        # Convert markdown to HTML (basic conversion)
        # This is a simple approach - for better results, use pandoc or markdown converter
        sed 's/^# \(.*\)$/<h1>\1<\/h1>/' "$file" | \
        sed 's/^## \(.*\)$/<h2>\1<\/h2>/' | \
        sed 's/^### \(.*\)$/<h3>\1<\/h3>/' | \
        sed 's/\*\*\(.*\)\*\*/<strong>\1<\/strong>/g' | \
        sed 's/^- \(.*\)$/<li>\1<\/li>/' | \
        sed 's/^|\(.*\)|$/<tr><td>\1<\/td><\/tr>/' >> "$html_file"
        
        echo "</body></html>" >> "$html_file"
    fi
done

echo ""
echo "HTML files created in pdf-version/ folder"
echo ""
echo "To create PDFs:"
echo "1. Open each HTML file in a web browser"
echo "2. Print to PDF (File → Print → Save as PDF)"
echo "3. Save with .pdf extension"
echo ""
echo "Or use:"
echo "  open pdf-version/*.html"
echo "  Then print each to PDF"

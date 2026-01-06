#!/bin/bash

# Script to generate PDFs from markdown files for PRIVO submission
# This script attempts multiple methods to convert markdown to PDF

cd "$(dirname "$0")"
mkdir -p pdf-version

echo "Generating PDFs for PRIVO submission package..."
echo ""

# Method 1: Try using pandoc (if available)
if command -v pandoc &> /dev/null; then
    echo "Using pandoc to generate PDFs..."
    for file in *.md; do
        if [ "$file" != "README.md" ] && [ "$file" != "generate-pdfs.sh" ]; then
            echo "  Converting $file..."
            pandoc "$file" -o "pdf-version/${file%.md}.pdf" --pdf-engine=wkhtmltopdf 2>/dev/null || \
            pandoc "$file" -o "pdf-version/${file%.md}.pdf" 2>/dev/null || \
            echo "    Failed to convert $file with pandoc"
        fi
    done
    echo "PDF generation complete!"
    exit 0
fi

# Method 2: Try using md-to-pdf via npx
if command -v npx &> /dev/null; then
    echo "Using npx md-to-pdf to generate PDFs..."
    for file in *.md; do
        if [ "$file" != "README.md" ] && [ "$file" != "generate-pdfs.sh" ]; then
            echo "  Converting $file..."
            npx --yes @md-to-pdf/cli "$file" --output "pdf-version/${file%.md}.pdf" 2>/dev/null || \
            echo "    Failed to convert $file"
        fi
    done
    echo "PDF generation complete!"
    exit 0
fi

# Method 3: Instructions
echo "No PDF converter found. Please use one of the following methods:"
echo ""
echo "Option 1: Install pandoc"
echo "  macOS: brew install pandoc basictex"
echo "  Then run: ./generate-pdfs.sh"
echo ""
echo "Option 2: Use online converter"
echo "  Visit: https://www.markdowntopdf.com/"
echo "  Upload each .md file and download PDFs"
echo ""
echo "Option 3: Use VS Code"
echo "  Install 'Markdown PDF' extension"
echo "  Open each .md file and export as PDF"
echo ""
echo "Option 4: Use macOS Preview"
echo "  Open .md file in markdown viewer"
echo "  Print to PDF (File → Print → Save as PDF)"

# PDF Versions of PRIVO Submission Documents

This folder contains PDF versions of all PRIVO submission documents for easy sharing and printing.

## PDF Generation Instructions

To generate PDFs from the markdown files, you can use one of the following methods:

### Method 1: Using Pandoc (Recommended)

```bash
# Install pandoc (if not already installed)
# macOS: brew install pandoc
# Then convert each file:
cd privo-submission
for file in *.md; do
  pandoc "$file" -o "pdf-version/${file%.md}.pdf" --pdf-engine=wkhtmltopdf
done
```

### Method 2: Using Online Converter

1. Visit https://www.markdowntopdf.com/ or similar service
2. Upload each .md file
3. Download the generated PDF
4. Save to this folder

### Method 3: Using VS Code Extension

1. Install "Markdown PDF" extension in VS Code
2. Open each .md file
3. Right-click → "Markdown PDF: Export (pdf)"
4. Save to this folder

### Method 4: Using macOS Preview

1. Open each .md file in a markdown viewer
2. Print to PDF (File → Print → Save as PDF)
3. Save to this folder

## Files to Convert

- 00-cover-letter.md
- 01-company-information.md
- 02-product-description.md
- 03-privacy-policy.md
- 04-coppa-compliance.md
- 05-data-practices.md
- 06-parental-consent-process.md
- 07-security-measures.md
- 08-third-party-services.md
- 09-testing-verification.md
- README.md

## Note

The markdown files in the parent directory are the source files. PDFs should be generated from these markdown files to ensure consistency and formatting.

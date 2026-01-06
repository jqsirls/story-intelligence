# PDF Generation Guide

This guide provides multiple methods to generate PDF versions of all PRIVO submission documents.

## Quick Method: VS Code Extension (Recommended)

1. **Install Extension:**
   - Open VS Code
   - Go to Extensions (Cmd+Shift+X)
   - Search for "Markdown PDF"
   - Install the extension by yzane

2. **Generate PDFs:**
   - Open each .md file in VS Code
   - Right-click in the editor
   - Select "Markdown PDF: Export (pdf)"
   - Save to `pdf-version/` folder

## Method 2: Online Converter

1. Visit https://www.markdowntopdf.com/
2. Upload each markdown file
3. Download the generated PDF
4. Save to `pdf-version/` folder with same name (replace .md with .pdf)

**Files to convert:**
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

## Method 3: Pandoc (Command Line)

```bash
# Install pandoc (macOS)
brew install pandoc basictex

# Navigate to privo-submission folder
cd privo-submission

# Convert all markdown files to PDF
for file in *.md; do
  pandoc "$file" -o "pdf-version/${file%.md}.pdf" \
    -V geometry:margin=1in \
    -V fontsize=11pt
done
```

## Method 4: macOS Preview

1. Open each .md file in a markdown viewer (e.g., MacDown, Marked 2, or VS Code preview)
2. Print to PDF:
   - File → Print (Cmd+P)
   - Click "PDF" dropdown
   - Select "Save as PDF"
3. Save to `pdf-version/` folder

## Method 5: Using Node.js (if workspace issues resolved)

```bash
cd privo-submission
npm install -g markdown-pdf
for file in *.md; do
  markdown-pdf "$file" -o "pdf-version/${file%.md}.pdf"
done
```

## PDF File Naming

All PDFs should be named to match the markdown files:
- `00-cover-letter.pdf`
- `01-company-information.pdf`
- `02-product-description.pdf`
- `03-privacy-policy.pdf`
- `04-coppa-compliance.pdf`
- `05-data-practices.pdf`
- `06-parental-consent-process.pdf`
- `07-security-measures.pdf`
- `08-third-party-services.pdf`
- `09-testing-verification.pdf`
- `README.pdf`

## Verification

After generating PDFs, verify:
- ✅ All 11 files converted
- ✅ PDFs are readable
- ✅ Formatting is preserved
- ✅ Company information appears correctly
- ✅ No broken links or formatting issues

---

**Note:** The markdown files are the source of truth. PDFs should be generated from these markdown files to ensure consistency.

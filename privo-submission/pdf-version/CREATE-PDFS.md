# Create PDFs from HTML Files

## Quick Method (Recommended)

### Step 1: Open All HTML Files

Run this command in Terminal:
```bash
cd privo-submission/pdf-version
./OPEN-FOR-PDF.sh
```

This will open all HTML files in your default browser.

### Step 2: Convert Each to PDF

For each HTML file that opens:

1. **Print the page:**
   - Press `Cmd+P` (or File → Print)

2. **Save as PDF:**
   - Click the "PDF" dropdown button (bottom left)
   - Select "Save as PDF"

3. **Name the file:**
   - Save with `.pdf` extension
   - Example: `00-cover-letter.html` → `00-cover-letter.pdf`
   - Save in the same `pdf-version/` folder

### Step 3: Verify

After converting all files, verify:
- ✅ 10 PDF files created
- ✅ All PDFs are readable
- ✅ Formatting looks good
- ✅ Company information appears correctly

## Alternative: Manual Conversion

If the script doesn't work, manually:

1. Navigate to `privo-submission/pdf-version/`
2. Open each HTML file in browser
3. Print → Save as PDF
4. Save with `.pdf` extension

## Files to Convert

1. `00-cover-letter.html` → `00-cover-letter.pdf`
2. `01-company-information.html` → `01-company-information.pdf`
3. `02-product-description.html` → `02-product-description.pdf`
4. `03-privacy-policy.html` → `03-privacy-policy.pdf`
5. `04-coppa-compliance.html` → `04-coppa-compliance.pdf`
6. `05-data-practices.html` → `05-data-practices.pdf`
7. `06-parental-consent-process.html` → `06-parental-consent-process.pdf`
8. `07-security-measures.html` → `07-security-measures.pdf`
9. `08-third-party-services.html` → `08-third-party-services.pdf`
10. `09-testing-verification.html` → `09-testing-verification.pdf`

---

**Note:** HTML files are styled and ready for PDF conversion. The markdown files in the parent directory are the source of truth.

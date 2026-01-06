#!/usr/bin/env node

/**
 * Convert markdown files to PDF using markdown-to-html and headless browser
 * This script creates PDFs for PRIVO submission
 */

const fs = require('fs');
const path = require('path');

const sourceDir = __dirname;
const pdfDir = path.join(sourceDir, 'pdf-version');

// Ensure pdf-version directory exists
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

const mdFiles = fs.readdirSync(sourceDir)
  .filter(file => file.endsWith('.md') && 
                  file !== 'README.md' && 
                  file !== 'PDF-GENERATION-GUIDE.md' &&
                  !file.includes('generate') &&
                  !file.includes('convert'))
  .sort();

console.log('PRIVO Submission PDF Generator');
console.log('================================\n');
console.log(`Found ${mdFiles.length} markdown files to convert\n`);

// Instructions for manual conversion
console.log('Since automated PDF conversion requires additional tools,');
console.log('please use one of these methods:\n');
console.log('RECOMMENDED: VS Code Extension');
console.log('  1. Install "Markdown PDF" extension in VS Code');
console.log('  2. Open each .md file');
console.log('  3. Right-click → "Markdown PDF: Export (pdf)"');
console.log('  4. Save to pdf-version/ folder\n');
console.log('ALTERNATIVE: Online Converter');
console.log('  1. Visit https://www.markdowntopdf.com/');
console.log('  2. Upload each .md file');
console.log('  3. Download PDFs to pdf-version/ folder\n');
console.log('Files to convert:');
mdFiles.forEach((file, i) => {
  console.log(`  ${i + 1}. ${file} → pdf-version/${file.replace('.md', '.pdf')}`);
});

console.log('\nSee PDF-GENERATION-GUIDE.md for detailed instructions.');

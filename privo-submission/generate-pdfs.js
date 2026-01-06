#!/usr/bin/env node

/**
 * Script to generate PDFs from markdown files for PRIVO submission
 * Uses markdown-pdf library to convert .md files to PDF
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sourceDir = __dirname;
const pdfDir = path.join(sourceDir, 'pdf-version');

// Ensure pdf-version directory exists
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

// List of markdown files to convert (excluding README and this script)
const mdFiles = fs.readdirSync(sourceDir)
  .filter(file => file.endsWith('.md') && file !== 'README.md' && file !== 'generate-pdfs.md')
  .sort();

console.log('Generating PDFs for PRIVO submission package...\n');

// Try to use markdown-pdf if available
try {
  // Check if markdown-pdf is available
  try {
    require.resolve('markdown-pdf');
  } catch (e) {
    console.log('Installing markdown-pdf...');
    execSync('npm install markdown-pdf --no-save', { cwd: sourceDir, stdio: 'inherit' });
  }

  const markdownpdf = require('markdown-pdf');
  
  let converted = 0;
  let failed = 0;

  mdFiles.forEach((file, index) => {
    const inputPath = path.join(sourceDir, file);
    const outputPath = path.join(pdfDir, file.replace('.md', '.pdf'));
    
    console.log(`[${index + 1}/${mdFiles.length}] Converting ${file}...`);
    
    try {
      markdownpdf()
        .from(inputPath)
        .to(outputPath, () => {
          converted++;
          console.log(`  ✓ Created ${path.basename(outputPath)}`);
          
          if (converted + failed === mdFiles.length) {
            console.log(`\n✅ Successfully converted ${converted} files to PDF`);
            if (failed > 0) {
              console.log(`⚠️  ${failed} files failed to convert`);
            }
          }
        });
    } catch (error) {
      failed++;
      console.log(`  ✗ Failed to convert ${file}: ${error.message}`);
    }
  });
  
} catch (error) {
  console.error('Error:', error.message);
  console.log('\nAlternative: Please use one of these methods:');
  console.log('1. Install pandoc: brew install pandoc');
  console.log('2. Use online converter: https://www.markdowntopdf.com/');
  console.log('3. Use VS Code "Markdown PDF" extension');
  console.log('4. Use macOS Preview (open .md file, Print to PDF)');
  process.exit(1);
}

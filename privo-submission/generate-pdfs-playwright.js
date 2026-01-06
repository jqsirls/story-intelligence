#!/usr/bin/env node

/**
 * Convert HTML files to PDF using Playwright via npx
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const pdfDir = path.join(__dirname, 'pdf-version');
const htmlFiles = fs.readdirSync(pdfDir)
  .filter(file => file.endsWith('.html'))
  .sort();

console.log(`Found ${htmlFiles.length} HTML files to convert to PDF\n`);

// Create a temporary script for playwright
const tempScript = path.join(__dirname, 'temp-playwright-script.js');
const scriptContent = `
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const files = ${JSON.stringify(htmlFiles)};
  const pdfDir = ${JSON.stringify(pdfDir)};
  
  for (const htmlFile of files) {
    const htmlPath = path.join(pdfDir, htmlFile);
    const pdfPath = path.join(pdfDir, htmlFile.replace('.html', '.pdf'));
    
    console.log(\`Converting \${htmlFile}...\`, { end: ' ' });
    
    try {
      await page.goto(\`file://\${htmlPath}\`, { waitUntil: 'networkidle' });
      await page.pdf({
        path: pdfPath,
        format: 'Letter',
        margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
        printBackground: true
      });
      console.log(\`✓ Created \${path.basename(pdfPath)}\`);
    } catch (error) {
      console.log(\`✗ Error: \${error.message}\`);
    }
  }
  
  await browser.close();
})();
`;

fs.writeFileSync(tempScript, scriptContent);

try {
  console.log('Running Playwright to generate PDFs...\n');
  execSync(`npx --yes playwright@latest ${tempScript}`, {
    stdio: 'inherit',
    cwd: __dirname
  });
} catch (error) {
  console.error('Error running playwright:', error.message);
} finally {
  // Clean up temp script
  if (fs.existsSync(tempScript)) {
    fs.unlinkSync(tempScript);
  }
}

#!/usr/bin/env node

/**
 * Convert HTML files to PDF using Playwright
 * Uses npx to run playwright without requiring local installation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const pdfDir = path.join(__dirname, 'pdf-version');
const htmlFiles = fs.readdirSync(pdfDir)
  .filter(file => file.endsWith('.html'))
  .sort();

console.log(`Found ${htmlFiles.length} HTML files to convert to PDF\n`);

// Use inline script with npx playwright
const script = `
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const files = ${JSON.stringify(htmlFiles)};
  const pdfDir = ${JSON.stringify(pdfDir)};
  
  let converted = 0;
  let failed = 0;
  
  for (const htmlFile of files) {
    const htmlPath = path.join(pdfDir, htmlFile);
    const pdfPath = path.join(pdfDir, htmlFile.replace('.html', '.pdf'));
    
    process.stdout.write(\`Converting \${htmlFile}... \`);
    
    try {
      await page.goto(\`file://\${htmlPath}\`, { waitUntil: 'networkidle' });
      await page.pdf({
        path: pdfPath,
        format: 'Letter',
        margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
        printBackground: true
      });
      console.log(\`✓ Created \${path.basename(pdfPath)}\`);
      converted++;
    } catch (error) {
      console.log(\`✗ Error: \${error.message}\`);
      failed++;
    }
  }
  
  await browser.close();
  console.log(\`\\n✅ Successfully converted \${converted} files to PDF\`);
  if (failed > 0) {
    console.log(\`⚠️  \${failed} files failed to convert\`);
  }
})();
`;

// Write to a temp file and execute with node, but use npx for playwright
const tempScript = path.join(__dirname, '.temp-pdf-gen.js');
fs.writeFileSync(tempScript, script);

try {
  // Install playwright if needed and run
  console.log('Generating PDFs with Playwright...\n');
  
  // Use eval to run the script with playwright from npx
  execSync(`node -e "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
    stdio: 'inherit',
    cwd: __dirname,
    env: { ...process.env, NODE_PATH: require.resolve.paths('playwright')?.[0] || '' }
  });
} catch (error) {
  // Fallback: try using npx playwright directly with eval
  try {
    const escapedScript = script.replace(/'/g, "'\\''").replace(/\n/g, ' ');
    execSync(`npx --yes -p playwright@latest node -e '${escapedScript}'`, {
      stdio: 'inherit',
      cwd: __dirname
    });
  } catch (e) {
    console.error('Error:', e.message);
    console.log('\nTrying alternative method...');
    // Last resort: create individual commands
    for (const htmlFile of htmlFiles) {
      const htmlPath = path.join(pdfDir, htmlFile);
      const pdfPath = path.join(pdfDir, htmlFile.replace('.html', '.pdf'));
      console.log(`Converting ${htmlFile}...`);
      
      const singleFileScript = `
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://${htmlPath.replace(/'/g, "\\'")}');
  await page.pdf({ path: '${pdfPath.replace(/'/g, "\\'")}', format: 'Letter', margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' }, printBackground: true });
  await browser.close();
})();
`;
      try {
        execSync(`npx --yes -p playwright@latest node -e "${singleFileScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
          stdio: 'inherit',
          cwd: __dirname
        });
        console.log(`✓ Created ${path.basename(pdfPath)}`);
      } catch (err) {
        console.log(`✗ Failed: ${err.message}`);
      }
    }
  }
} finally {
  if (fs.existsSync(tempScript)) {
    fs.unlinkSync(tempScript);
  }
}

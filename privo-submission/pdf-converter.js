const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const pdfDir = path.join(__dirname, 'pdf-version');
const htmlFiles = fs.readdirSync(pdfDir)
  .filter(file => file.endsWith('.html'))
  .sort();

console.log(`Found ${htmlFiles.length} HTML files to convert to PDF\n`);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  let converted = 0;
  let failed = 0;
  
  for (const htmlFile of htmlFiles) {
    const htmlPath = path.join(pdfDir, htmlFile);
    const pdfPath = path.join(pdfDir, htmlFile.replace('.html', '.pdf'));
    
    process.stdout.write(`Converting ${htmlFile}... `);
    
    try {
      await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
      await page.pdf({
        path: pdfPath,
        format: 'Letter',
        margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
        printBackground: true
      });
      console.log(`✓ Created ${path.basename(pdfPath)}`);
      converted++;
    } catch (error) {
      console.log(`✗ Error: ${error.message}`);
      failed++;
    }
  }
  
  await browser.close();
  console.log(`\n✅ Successfully converted ${converted} files to PDF`);
  if (failed > 0) {
    console.log(`⚠️  ${failed} files failed to convert`);
  }
})();

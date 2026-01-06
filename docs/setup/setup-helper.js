#!/usr/bin/env node

/**
 * Interactive Notion Setup Helper
 * Guides users through the Notion integration setup process
 */

const readline = require('readline');
const { execSync } = require('child_process');
const fs = require('fs');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Prompt user for input
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Display welcome message
 */
function showWelcome() {
  console.log('\n🤖 Storytailor Notion Integration Setup');
  console.log('=====================================');
  console.log('This helper will guide you through setting up automated');
  console.log('documentation sync with your Notion teamspace.\n');
}

/**
 * Validate Notion page ID format
 */
function isValidPageId(pageId) {
  // Remove any hyphens and check if it's a valid UUID format
  const cleanId = pageId.replace(/-/g, '');
  return /^[a-f0-9]{32}$/i.test(cleanId);
}

/**
 * Extract page ID from Notion URL
 */
function extractPageIdFromUrl(url) {
  try {
    // Handle various Notion URL formats
    const urlPattern = /notion\.so\/.*?([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i;
    const match = url.match(urlPattern);
    
    if (match) {
      return match[1].replace(/-/g, '');
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get and validate Notion page ID
 */
async function getNotionPageId() {
  console.log('📍 Notion Page Setup');
  console.log('You need to provide the page ID where documentation will be created.');
  console.log('This can be from a Notion URL or the raw page ID.\n');
  
  while (true) {
    const input = await askQuestion('Enter Notion page URL or page ID: ');
    
    if (!input) {
      console.log('❌ Please enter a valid URL or page ID.\n');
      continue;
    }
    
    // Try to extract from URL first
    let pageId = extractPageIdFromUrl(input);
    
    // If not a URL, treat as direct page ID
    if (!pageId) {
      pageId = input.replace(/-/g, '');
    }
    
    if (isValidPageId(pageId)) {
      console.log(`✅ Valid page ID: ${pageId}\n`);
      return pageId;
    } else {
      console.log('❌ Invalid page ID format. Please try again.\n');
      console.log('Example URL: https://notion.so/workspace/Page-Title-abc123def456...');
      console.log('Example ID: abc123def456...\n');
    }
  }
}

/**
 * Check and install dependencies
 */
async function checkDependencies() {
  console.log('🔧 Checking dependencies...');
  
  try {
    // Check if package.json exists
    if (!fs.existsSync('package.json')) {
      console.log('📦 Initializing npm project...');
      execSync('npm init -y', { stdio: 'inherit' });
    }
    
    // Install required packages
    console.log('📦 Installing required packages...');
    execSync('npm install @notionhq/client fs path', { stdio: 'inherit' });
    
    console.log('✅ Dependencies installed successfully.\n');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    throw error;
  }
}

/**
 * Run the sync script
 */
async function runSync(pageId) {
  console.log('🚀 Starting documentation sync...');
  
  try {
    // Set environment variable and run sync
    process.env.NOTION_PAGE_ID = pageId;
    
    const { createTeamspaceStructure } = require('./notion-sync');
    const homePageId = await createTeamspaceStructure();
    
    console.log('\n🎉 Setup completed successfully!');
    console.log(`📍 Your documentation is available at:`);
    console.log(`   https://notion.so/${homePageId.replace(/-/g, '')}`);
    
  } catch (error) {
    console.error('\n💥 Sync failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Verify your Notion integration has access to the page');
    console.log('2. Check that the page ID is correct');
    console.log('3. Ensure your integration token is valid');
    console.log('4. Try running the sync again with: node notion-sync.js');
    throw error;
  }
}

/**
 * Show final instructions
 */
function showFinalInstructions() {
  console.log('\n📚 Next Steps:');
  console.log('1. Share the Notion page with your team members');
  console.log('2. Customize the page layouts for your workflow');
  console.log('3. Set up regular sync schedule (weekly recommended)');
  console.log('4. Monitor sync logs for any content issues');
  
  console.log('\n🔗 For manual sync runs:');
  console.log('   node notion-sync.js');
  
  console.log('\n📖 For more information:');
  console.log('   See 03_NOTION_API_AUTOMATION_SETUP.md');
}

/**
 * Main setup process
 */
async function main() {
  try {
    showWelcome();
    
    // Get configuration
    const pageId = await getNotionPageId();
    
    // Setup dependencies
    await checkDependencies();
    
    // Confirm before proceeding
    const confirm = await askQuestion('Ready to sync documentation? (y/N): ');
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('Setup cancelled.');
      process.exit(0);
    }
    
    // Run sync
    await runSync(pageId);
    
    // Show final instructions
    showFinalInstructions();
    
  } catch (error) {
    console.error('\n💥 Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run setup
main();
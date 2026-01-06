#!/usr/bin/env node

/**
 * Notion Documentation Sync Script
 * Automatically syncs Storytailor documentation to Notion teamspace
 */

const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

// Configuration (never hardcode tokens)
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PARENT_PAGE_ID = process.env.NOTION_PAGE_ID || '243f5e9ea7e680cc9750cef2582350a8';

if (!NOTION_TOKEN) {
  throw new Error('Missing NOTION_TOKEN')
}

// Initialize Notion client
const notion = new Client({ auth: NOTION_TOKEN });

// Documentation structure mapping
const SECTIONS = [
  {
    title: '🏗️ Core Architecture',
    description: 'System design and multi-agent orchestration',
    folder: '01_CORE_ARCHITECTURE',
    priority: 'CRITICAL'
  },
  {
    title: '📖 API Documentation', 
    description: 'Complete developer API resources and integration guides',
    folder: '02_API_DOCUMENTATION',
    priority: 'CRITICAL'
  },
  {
    title: '🧪 QA Reports',
    description: 'Quality assurance, testing, and system analysis',
    folder: '02_QA_REPORTS',
    priority: 'HIGH'
  },
  {
    title: '📋 Implementation Guides',
    description: 'Step-by-step implementation instructions',
    folder: '03_IMPLEMENTATION_GUIDES', 
    priority: 'HIGH'
  },
  {
    title: '🚀 Deployment',
    description: 'Production deployment and infrastructure guides',
    folder: '04_DEPLOYMENT',
    priority: 'CRITICAL'
  },
  {
    title: '🛡️ Compliance & Privacy',
    description: 'Privacy compliance, regulatory documentation, and security',
    folder: '05_COMPLIANCE',
    priority: 'CRITICAL'
  }
];

/**
 * Create a new page in Notion
 */
async function createPage(parentId, title, content = '') {
  try {
    const response = await notion.pages.create({
      parent: { page_id: parentId },
      properties: {
        title: {
          title: [
            {
              text: {
                content: title
              }
            }
          ]
        }
      },
      children: content ? [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: content.substring(0, 2000) // Notion block limit
                }
              }
            ]
          }
        }
      ] : []
    });
    
    console.log(`✅ Created page: ${title}`);
    return response.id;
  } catch (error) {
    console.error(`❌ Failed to create page ${title}:`, error.message);
    return null;
  }
}

/**
 * Read and process markdown file
 */
function readMarkdownFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return null;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Handle large files - take first 50KB
    if (content.length > 50000) {
      console.log(`⚠️  Large file truncated: ${path.basename(filePath)}`);
      return content.substring(0, 50000) + '\n\n... (content truncated due to size)';
    }
    
    return content;
  } catch (error) {
    console.error(`❌ Error reading file ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Import documentation files from a folder
 */
async function importFolderDocs(parentPageId, folderPath) {
  const fullPath = path.join(__dirname, '..', folderPath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Folder not found: ${folderPath}`);
    return;
  }
  
  const files = fs.readdirSync(fullPath).filter(file => 
    file.endsWith('.md') && !file.startsWith('.')
  );
  
  console.log(`📁 Importing ${files.length} files from ${folderPath}`);
  
  for (const file of files) {
    const filePath = path.join(fullPath, file);
    const content = readMarkdownFile(filePath);
    
    if (content) {
      const pageTitle = file.replace('.md', '').replace(/^\d+_/, '');
      await createPage(parentPageId, pageTitle, content);
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

/**
 * Create the main teamspace structure
 */
async function createTeamspaceStructure() {
  try {
    console.log('🚀 Starting Notion documentation sync...');
    
    // Create main home page
    const homePageId = await createPage(
      PARENT_PAGE_ID,
      '📚 Storytailor Developer Documentation Hub',
      'Complete documentation and resources for the Storytailor multi-agent platform.'
    );
    
    if (!homePageId) {
      throw new Error('Failed to create home page');
    }
    
    // Create main sections
    const sectionPages = {};
    
    for (const section of SECTIONS) {
      console.log(`\n📖 Creating section: ${section.title}`);
      
      const sectionPageId = await createPage(
        homePageId,
        section.title,
        `${section.description}\n\nPriority: ${section.priority}`
      );
      
      if (sectionPageId) {
        sectionPages[section.folder] = sectionPageId;
        
        // Import documentation files
        await importFolderDocs(sectionPageId, section.folder);
      }
      
      // Rate limiting between sections
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Create status tracking database
    console.log('\n📊 Creating status tracking...');
    await createPage(
      homePageId,
      '📊 Documentation Status',
      'Track documentation updates, sync status, and team progress.'
    );
    
    console.log('\n🎉 Documentation sync completed successfully!');
    console.log(`📍 Access your documentation at: https://notion.so/${homePageId.replace(/-/g, '')}`);
    
    return homePageId;
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Validate configuration
    if (!NOTION_TOKEN || !PARENT_PAGE_ID) {
      throw new Error('Missing required environment variables: NOTION_TOKEN and NOTION_PAGE_ID');
    }
    
    console.log('🔧 Configuration validated');
    console.log(`📍 Target page: ${PARENT_PAGE_ID}`);
    
    // Execute sync
    await createTeamspaceStructure();
    
    console.log('\n✨ All done! Your Notion teamspace is ready.');
    
  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { createTeamspaceStructure, createPage, importFolderDocs };
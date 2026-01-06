#!/bin/bash

# Setup GitHub Repository Script

echo "=== Setting up GitHub Repository ==="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "Initializing git repository..."
    git init
fi

# Check if README exists
if [ ! -f "README.md" ]; then
    echo "Creating README.md..."
    cat > README.md << 'EOF'
# Storytailor Multi-Agent System

## Overview
Storytailor is an industry-leading multi-agent AI system designed to create personalized, interactive stories for children aged 3-17. Built with a sophisticated 18-agent architecture, it provides safe, educational, and emotionally intelligent storytelling experiences.

## Architecture
- **15+ Specialized Agents**: Each agent handles specific aspects of the storytelling experience
- **Event-Driven Communication**: Using AWS EventBridge for inter-agent messaging
- **Zero Trust Security**: Comprehensive security framework with child safety at its core
- **Multi-Platform Support**: Alexa, Google Home, mobile apps, and web

## Current Status
- ✅ Phase 1: Critical Infrastructure - COMPLETE
- ✅ Phase 2: Multi-Agent Deployment - 18 AGENTS DEPLOYED
- 🔴 Phase 3: Testing & Quality Assurance - IN PROGRESS
- 🔵 Phase 4: Identity Platform - PLANNED
- 🏁 Phase 5: Final Validation - PLANNED

## Technology Stack
- **Runtime**: Node.js 18.x on AWS Lambda
- **Database**: Supabase (PostgreSQL)
- **AI Services**: OpenAI GPT-4, ElevenLabs
- **Infrastructure**: AWS (Lambda, API Gateway, EventBridge, S3, CloudWatch)
- **Security**: JWT, OAuth 2.0, AWS KMS, Zero Trust Architecture

## Development
This is a monorepo using npm workspaces. Each agent is a separate package in the `packages/` directory.

```bash
# Install dependencies
npm install

# Run tests
npm test

# Deploy to staging
./scripts/deploy-complete-system.sh
```

## Documentation
See `STORYTAILOR_DEVELOPER_DOCUMENTATION/` for comprehensive documentation including:
- Architecture guides
- API documentation
- User journey mappings
- Brand guidelines
- Deployment procedures

## License
© 2024 Storytailor Inc. All rights reserved.
EOF
fi

# Add GitHub remote (you'll need to create the repo on GitHub first)
echo ""
echo "⚠️  Please create a new repository on GitHub first:"
echo "   1. Go to https://github.com/new"
echo "   2. Name it 'storytailor-agent' (or your preferred name)"
echo "   3. Keep it private"
echo "   4. Don't initialize with README, .gitignore, or license"
echo ""
echo "Once created, enter the repository URL (e.g., git@github.com:username/storytailor-agent.git):"
read -p "GitHub repo URL: " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo "❌ No URL provided. Exiting."
    exit 1
fi

# Add remote
git remote add origin "$REPO_URL" 2>/dev/null || git remote set-url origin "$REPO_URL"

# Create main branch if needed
git branch -M main

# Push to GitHub
echo "Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed to GitHub!"
    echo ""
    echo "Repository is now available at: $REPO_URL"
    echo ""
    echo "Next steps:"
    echo "1. Set up branch protection rules on main branch"
    echo "2. Add collaborators if needed"
    echo "3. Configure GitHub Actions for CI/CD"
    echo "4. Set up GitHub Secrets for deployment"
else
    echo "❌ Failed to push to GitHub. Please check your credentials and try again."
    exit 1
fi

# Create GitHub Actions workflow directory
mkdir -p .github/workflows

echo "✅ GitHub repository setup complete!"
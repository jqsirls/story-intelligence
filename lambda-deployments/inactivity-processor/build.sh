#!/bin/bash
# Build script for inactivity-processor that includes services

set -e

echo "Building inactivity-processor with services..."

# Copy services from universal-agent
mkdir -p src/services
cp -r ../../packages/universal-agent/src/services/*.ts src/services/

# Copy email templates
mkdir -p src/templates/emails
cp -r ../../packages/universal-agent/src/templates/emails/*.html src/templates/emails/

# Update imports in copied service files to use relative paths
find src/services -name "*.ts" -type f -exec sed -i '' 's|from '\''\./EmailService'\''|from '\''../services/EmailService'\''|g' {} \;
find src/services -name "*.ts" -type f -exec sed -i '' 's|from '\''\./EmailTemplateService'\''|from '\''../services/EmailTemplateService'\''|g' {} \;
find src/services -name "*.ts" -type f -exec sed -i '' 's|from '\''\./DeletionService'\''|from '\''../services/DeletionService'\''|g' {} \;
find src/services -name "*.ts" -type f -exec sed -i '' 's|from '\''\./StorageLifecycleService'\''|from '\''../services/StorageLifecycleService'\''|g' {} \;
find src/services -name "*.ts" -type f -exec sed -i '' 's|from '\''\./InactivityMonitorService'\''|from '\''../services/InactivityMonitorService'\''|g' {} \;

# Update lambda.ts imports
sed -i '' 's|from '\''\.\.\/\.\.\/\.\.\/packages\/universal-agent\/src\/services\/|from '\''\.\/services\/|g' src/lambda.ts

# Build TypeScript
npm run build

echo "Build complete!"

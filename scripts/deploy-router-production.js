#!/usr/bin/env node
/**
 * Router Lambda Deployment Script
 * Deploys router Lambda with winston dependency
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REGION = 'us-east-1';
const LAMBDA_NAME = 'storytailor-router-production';
const RUNTIME = 'nodejs22.x';
const TIMEOUT = 60;
const MEMORY_SIZE = 512;

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEPLOY_DIR = path.join(PROJECT_ROOT, 'lambda-deployments', 'router');

function exec(command, options = {}) {
  console.log(`> ${command}`);
  try {
    return execSync(command, { 
      cwd: options.cwd || PROJECT_ROOT,
      stdio: 'inherit',
      encoding: 'utf8',
      ...options 
    });
  } catch (error) {
    console.error(`Error executing: ${command}`);
    throw error;
  }
}

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

async function main() {
  try {
    log('=== Router Deployment Started ===');
    
    // Step 1: Build
    log('Step 1: Building TypeScript...');
    exec('npm run build', { cwd: DEPLOY_DIR });
    
    const distLambda = path.join(DEPLOY_DIR, 'dist', 'lambda.js');
    if (!fs.existsSync(distLambda)) {
      throw new Error('dist/lambda.js not found after build');
    }
    log('✅ Build complete');
    
    // Step 2: Ensure winston
    log('Step 2: Ensuring winston dependency...');
    const nodeModulesDir = path.join(DEPLOY_DIR, 'node_modules');
    if (!fs.existsSync(nodeModulesDir)) {
      fs.mkdirSync(nodeModulesDir, { recursive: true });
    }
    
    const winstonDir = path.join(nodeModulesDir, 'winston');
    if (!fs.existsSync(winstonDir)) {
      log('Searching for winston in project...');
      // Find winston in project
      const findCmd = `find "${PROJECT_ROOT}" -type d -name "winston" -path "*/node_modules/*" 2>/dev/null | grep -v ".git" | head -1`;
      const winstonSource = execSync(findCmd, { encoding: 'utf8' }).trim();
      
      if (winstonSource && fs.existsSync(winstonSource)) {
        log(`Found winston at: ${winstonSource}`);
        execSync(`cp -r "${winstonSource}" "${winstonDir}"`);
        log('✅ Copied winston');
      } else {
        throw new Error('winston not found in project');
      }
    }
    
    // Copy dependencies
    for (const dep of ['logform', 'triple-beam']) {
      const depDir = path.join(nodeModulesDir, dep);
      if (!fs.existsSync(depDir)) {
        const findCmd = `find "${PROJECT_ROOT}" -type d -name "${dep}" -path "*/node_modules/*" 2>/dev/null | grep -v ".git" | head -1`;
        const depSource = execSync(findCmd, { encoding: 'utf8' }).trim();
        if (depSource && fs.existsSync(depSource)) {
          execSync(`cp -r "${depSource}" "${depDir}"`);
        }
      }
    }
    
    if (!fs.existsSync(winstonDir)) {
      throw new Error('winston still missing');
    }
    log('✅ Winston verified');
    
    // Step 3: Create package
    log('Step 3: Creating deployment package...');
    const tempDir = fs.mkdtempSync('/tmp/router-deploy-');
    
    try {
      execSync(`cp -r "${path.join(DEPLOY_DIR, 'dist')}" "${tempDir}/"`);
      execSync(`cp -r "${nodeModulesDir}" "${tempDir}/"`);
      execSync(`cp "${path.join(DEPLOY_DIR, 'package.json')}" "${tempDir}/"`);
      
      if (!fs.existsSync(path.join(tempDir, 'node_modules', 'winston'))) {
        throw new Error('winston not in package');
      }
      
      const zipFile = '/tmp/router-deployment.zip';
      execSync(`cd "${tempDir}" && zip -r "${zipFile}" . >/dev/null 2>&1`);
      log('✅ Package created');
      
      // Step 4: Deploy
      log('Step 4: Deploying to Lambda...');
      const envVars = execSync(
        `aws lambda get-function-configuration --function-name "${LAMBDA_NAME}" --region "${REGION}" --query 'Environment.Variables' --output json 2>/dev/null || echo '{}'`,
        { encoding: 'utf8' }
      ).trim();
      
      execSync(
        `aws lambda update-function-code --function-name "${LAMBDA_NAME}" --region "${REGION}" --zip-file fileb://${zipFile} --publish`
      );
      log('✅ Code updated');
      
      log('Waiting for update...');
      execSync(`aws lambda wait function-updated --function-name "${LAMBDA_NAME}" --region "${REGION}"`);
      
      execSync(
        `aws lambda update-function-configuration --function-name "${LAMBDA_NAME}" --region "${REGION}" --handler "dist/lambda.handler" --runtime "${RUNTIME}" --timeout ${TIMEOUT} --memory-size ${MEMORY_SIZE} --environment "Variables=${envVars}"`
      );
      log('✅ Configuration updated');
      
      // Step 5: Test
      log('Step 5: Testing...');
      const testPayload = JSON.stringify({
        rawPath: '/health',
        path: '/health',
        requestContext: {
          http: { method: 'GET', path: '/health' },
          requestId: `test-${Date.now()}`,
          stage: 'production'
        },
        headers: {},
        body: null,
        isBase64Encoded: false
      });
      
      fs.writeFileSync('/tmp/router-test-payload.json', testPayload);
      execSync(
        `aws lambda invoke --function-name "${LAMBDA_NAME}" --region "${REGION}" --payload file:///tmp/router-test-payload.json --cli-binary-format raw-in-base64-out /tmp/router-test-response.json`
      );
      
      if (fs.existsSync('/tmp/router-test-response.json')) {
        const response = JSON.parse(fs.readFileSync('/tmp/router-test-response.json', 'utf8'));
        const status = response.statusCode || 500;
        if (status === 200) {
          log(`✅ Health check passed (status: ${status})`);
        } else {
          log(`⚠️  Status: ${status}`);
          console.log(JSON.stringify(response, null, 2));
        }
      }
      
      log('');
      log('=== Deployment Complete ===');
      log(`Function: ${LAMBDA_NAME}`);
      log(`Handler: dist/lambda.handler`);
      log(`Runtime: ${RUNTIME}`);
      
    } finally {
      // Cleanup
      execSync(`rm -rf "${tempDir}"`);
      if (fs.existsSync('/tmp/router-deployment.zip')) {
        fs.unlinkSync('/tmp/router-deployment.zip');
      }
    }
    
  } catch (error) {
    console.error('Deployment failed:', error.message);
    process.exit(1);
  }
}

main();

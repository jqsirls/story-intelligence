# Router Deployment Execution Guide

## Date: 2025-12-17
## Status: Ready for Deployment

---

## Deployment Scripts Available

### Primary Script
**File**: `scripts/deploy-router-production.sh`
- ✅ Syntax verified
- ✅ All dependencies handled
- ✅ Complete deployment workflow

### Alternative Scripts
1. **`scripts/deploy-router-production-simple.sh`** - Simplified with logging
2. **`scripts/deploy-router-production.js`** - Node.js version
3. **`scripts/deploy-router-manual.sh`** - Step-by-step manual execution

---

## Pre-Deployment Checklist

- [x] Script syntax verified
- [x] Winston dependency handling implemented
- [x] Deployment package creation logic complete
- [x] Lambda configuration update logic complete
- [x] Health check test included

---

## Deployment Steps (Automated)

The script performs these steps automatically:

1. **Build TypeScript**
   ```bash
   cd lambda-deployments/router
   npm run build
   ```

2. **Ensure Winston Dependency**
   - Checks for winston in node_modules
   - Searches project for winston if missing
   - Copies winston and dependencies (logform, triple-beam)

3. **Create Deployment Package**
   - Copies `dist/` directory
   - Copies `node_modules/` directory
   - Copies `package.json`
   - Creates zip file: `/tmp/router-deployment.zip`

4. **Deploy to Lambda**
   - Updates function code
   - Waits for update to complete
   - Updates configuration:
     - Handler: `dist/lambda.handler`
     - Runtime: `nodejs22.x`
     - Timeout: 60 seconds
     - Memory: 512 MB

5. **Test Deployment**
   - Invokes Lambda with health check payload
   - Verifies response status code

---

## Manual Execution

If automated script doesn't work, execute these commands manually:

```bash
# 1. Navigate to project root
cd "/Users/jqsirls/Library/CloudStorage/Dropbox-Storytailor/JQ Sirls/Storytailor Inc/Projects/Storytailor Agent"

# 2. Build
cd lambda-deployments/router
npm run build

# 3. Ensure winston
if [ ! -d "node_modules/winston" ]; then
  WINSTON_SOURCE=$(find .. -type d -name "winston" -path "*/node_modules/*" | head -1)
  mkdir -p node_modules
  cp -r "$WINSTON_SOURCE" node_modules/winston
fi

# 4. Create package
TEMP_DIR=$(mktemp -d)
cp -r dist "$TEMP_DIR/"
cp -r node_modules "$TEMP_DIR/"
cp package.json "$TEMP_DIR/"
cd "$TEMP_DIR"
zip -r /tmp/router-deployment.zip .

# 5. Deploy
aws lambda update-function-code \
  --function-name storytailor-router-production \
  --region us-east-1 \
  --zip-file fileb:///tmp/router-deployment.zip \
  --publish

# 6. Wait
aws lambda wait function-updated \
  --function-name storytailor-router-production \
  --region us-east-1

# 7. Update config
ENV_VARS=$(aws lambda get-function-configuration \
  --function-name storytailor-router-production \
  --region us-east-1 \
  --query 'Environment.Variables' \
  --output json)

aws lambda update-function-configuration \
  --function-name storytailor-router-production \
  --region us-east-1 \
  --handler "dist/lambda.handler" \
  --runtime "nodejs22.x" \
  --timeout 60 \
  --memory-size 512 \
  --environment "Variables=${ENV_VARS}"

# 8. Test
TEST_PAYLOAD='{"rawPath":"/health","path":"/health","requestContext":{"http":{"method":"GET","path":"/health"},"requestId":"test","stage":"production"},"headers":{},"body":null,"isBase64Encoded":false}'
echo "$TEST_PAYLOAD" > /tmp/router-test-payload.json

aws lambda invoke \
  --function-name storytailor-router-production \
  --region us-east-1 \
  --payload file:///tmp/router-test-payload.json \
  --cli-binary-format raw-in-base64-out \
  /tmp/router-test-response.json

cat /tmp/router-test-response.json | jq '.'
```

---

## Verification

After deployment, verify:

1. **Lambda Function Status**
   ```bash
   aws lambda get-function \
     --function-name storytailor-router-production \
     --region us-east-1 \
     --query 'Configuration.[LastUpdateStatus,Handler,Runtime]'
   ```

2. **Health Check**
   ```bash
   # Via Lambda Function URL (if configured)
   curl https://<router-function-url>/health
   
   # Or via Lambda invoke
   aws lambda invoke \
     --function-name storytailor-router-production \
     --region us-east-1 \
     --payload '{"rawPath":"/health","path":"/health","requestContext":{"http":{"method":"GET","path":"/health"},"requestId":"test","stage":"production"},"headers":{},"body":null,"isBase64Encoded":false}' \
     --cli-binary-format raw-in-base64-out \
     /tmp/response.json
   cat /tmp/response.json | jq '.'
   ```

3. **MCP Integration**
   ```bash
   # Test via MCP server
   curl -X POST https://gri66fqbukqq3ghgqb4kfrqabi0dupql.lambda-url.us-east-1.on.aws/call \
     -H "Content-Type: application/json" \
     -d '{"tool":"router.health","params":{}}'
   ```

---

## Troubleshooting

### Issue: Script exits immediately
- Check script syntax: `bash -n scripts/deploy-router-production.sh`
- Verify AWS CLI is installed: `aws --version`
- Check AWS credentials: `aws sts get-caller-identity`

### Issue: Winston not found
- Script automatically searches and copies winston from project
- Manual copy: Find winston in project and copy to `lambda-deployments/router/node_modules/`

### Issue: npm authentication errors
- Script now copies dependencies from project's node_modules instead of installing
- If you see "Access token expired" warnings, they're non-blocking
- Dependencies are copied from existing project installations
- Only winston is mandatory; other deps are loaded lazily

### Issue: Build fails
- Check TypeScript: `cd lambda-deployments/router && npm run build`
- Verify tsconfig.json exists
- Check for TypeScript errors

### Issue: Deployment fails
- Verify Lambda function exists: `aws lambda get-function --function-name storytailor-router-production --region us-east-1`
- Check IAM permissions for Lambda updates
- Verify zip file created: `ls -lh /tmp/router-deployment.zip`

---

## Expected Results

After successful deployment:

- ✅ Lambda function code updated
- ✅ Handler set to `dist/lambda.handler`
- ✅ Runtime set to `nodejs22.x`
- ✅ Winston dependency included
- ✅ Health check returns 200
- ✅ MCP router.health tool works

---

**Script Status**: ✅ Ready  
**Last Verified**: 2025-12-17  
**Next Action**: Execute deployment script

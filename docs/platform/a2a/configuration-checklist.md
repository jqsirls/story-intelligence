Status: Published  
Audience: DevOps | Engineering  
Last-Updated: 2025-12-17  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  

# A2A Configuration Checklist

Quick reference checklist for configuring A2A protocol in production.

## Prerequisites

- [x] A2A adapter code deployed
- [x] Lambda function deployed
- [x] Function URL active
- [x] Environment variables configured in deployment script

## Configuration Steps

### 1. Configure API Keys

**Option A: Interactive Setup (Recommended)**
```bash
./scripts/setup-a2a-ssm-parameters.sh production
```

**Option B: Manual Configuration**
```bash
aws ssm put-parameter \
  --name "/storytailor-production/a2a/api-keys" \
  --type "SecureString" \
  --value '{
    "partner-key-1": {
      "agentId": "partner-1",
      "scopes": ["library.read", "storytelling"]
    }
  }' \
  --region us-east-1 \
  --overwrite
```

**Verify:**
```bash
aws ssm get-parameter \
  --name "/storytailor-production/a2a/api-keys" \
  --region us-east-1 \
  --with-decryption \
  --query 'Parameter.Value' | jq '.'
```

### 2. Configure OAuth (Optional)

**If using OAuth 2.0 authentication:**

```bash
# JWKS URL
aws ssm put-parameter \
  --name "/storytailor-production/a2a/jwks-url" \
  --type "String" \
  --value "https://your-oauth-provider.com/.well-known/jwks.json" \
  --region us-east-1 \
  --overwrite

# Token Issuer (optional)
aws ssm put-parameter \
  --name "/storytailor-production/a2a/token-issuer" \
  --type "String" \
  --value "https://your-oauth-provider.com" \
  --region us-east-1 \
  --overwrite

# Token Audience (optional)
aws ssm put-parameter \
  --name "/storytailor-production/a2a/token-audience" \
  --type "String" \
  --value "storytailor-a2a-api" \
  --region us-east-1 \
  --overwrite
```

### 3. Re-deploy Universal Agent

```bash
./scripts/deploy-universal-agent-proper.sh production
```

**Verify deployment:**
```bash
aws lambda get-function \
  --function-name storytailor-universal-agent-production \
  --region us-east-1 \
  --query 'Configuration.LastUpdateStatus'
```

### 4. Verify Configuration

**Check API keys loaded:**
```bash
aws logs tail /aws/lambda/storytailor-universal-agent-production \
  --since 10m --region us-east-1 \
  --format short | grep -i "api keys"
```

**Expected log message:**
```
Loaded A2A API keys from SSM Parameter Store { paramName: '/storytailor-production/a2a/api-keys', keyCount: 1 }
```

### 5. Test Endpoints

**Test Discovery:**
```bash
curl https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws/a2a/discovery
```

**Test Message Endpoint (with API key):**
```bash
curl -X POST \
  https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws/a2a/message \
  -H "Content-Type: application/json" \
  -H "X-API-Key: [REDACTED_API_KEY]" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "library.list",
    "params": {}
  }'
```

**Expected response:** JSON-RPC 2.0 response (not authentication error)

### 6. Set Up Monitoring

**CloudWatch Alarms:**
- [ ] A2A authentication failures
- [ ] A2A endpoint 5xx errors
- [ ] Task creation failures
- [ ] High API key usage (anomaly detection)

**Log Insights Queries:**
- Failed authentication attempts
- Task state transitions
- Router integration errors

### 7. Partner Onboarding

For each partner:
- [ ] Generate unique API key
- [ ] Assign appropriate scopes
- [ ] Share Function URL and Agent Card endpoint
- [ ] Provide integration documentation
- [ ] Set up partner-specific monitoring
- [ ] Test partner integration

## Troubleshooting

### API Keys Not Loading

**Check:**
1. SSM parameter exists: `aws ssm get-parameter --name "/storytailor-production/a2a/api-keys"`
2. Lambda has SSM read permissions
3. Parameter name matches exactly: `/storytailor-{stage}/a2a/api-keys`
4. JSON format is valid

**Fix:**
- Re-run setup script or manually update parameter
- Re-deploy Lambda function

### Authentication Failures

**Check:**
1. API key is correct
2. API key exists in SSM parameter
3. Headers are correct: `X-API-Key: [REDACTED_API_KEY]
4. Lambda logs show "Loaded A2A API keys"

**Fix:**
- Verify API key in SSM
- Check CloudWatch logs for authentication errors
- Test with curl to isolate issues

### Supabase Connection Errors

**Check:**
1. Supabase URL accessible from Lambda
2. VPC configuration (if Lambda in VPC)
3. Security group rules
4. Supabase credentials in SSM

**Fix:**
- Verify network connectivity
- Check VPC/security group configuration
- Verify Supabase credentials

## Related Documentation

- **Deployment Verification:** `docs/platform/a2a/deployment-verification.md`
- **API Reference:** `docs/platform/a2a/api-reference.md`
- **Integration Guide:** `docs/platform/a2a/integration-guide.md`
- **Deployment Guide:** `docs/platform/a2a/deployment.md`

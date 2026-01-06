Status: Published  
Audience: DevOps | Engineering  
Last-Updated: 2025-12-17  
Owner: Engineering Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  

# CloudFront Integration Guide for A2A Protocol

## Overview

This guide walks you through completing the CloudFront integration for A2A endpoints. CloudFront provides:
- **WAF Protection**: Rate limiting and DDoS protection
- **Better Performance**: Global CDN with edge caching
- **HTTPS**: SSL/TLS termination
- **Custom Domain**: Professional API endpoint

## Current Status

✅ **CloudFront Distribution Created**
- **Distribution ID:** `E3E123A9Y293GH`
- **Domain:** `d3su0gpyy6qhel.cloudfront.net`
- **Status:** InProgress (deploying)
- **Origin:** Function URL `https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws/`

## Step-by-Step Instructions

### Step 1: Wait for CloudFront Deployment (15-20 minutes)

CloudFront distributions take 15-20 minutes to deploy globally. You need to wait until the status is `Deployed` before proceeding.

#### Check Deployment Status

```bash
# Check current status
aws cloudfront get-distribution --id E3E123A9Y293GH --query 'Distribution.Status' --output text

# Expected output:
# InProgress  (still deploying)
# Deployed    (ready to use)
```

#### Monitor Deployment Progress

```bash
# Watch status in real-time (updates every 30 seconds)
watch -n 30 'aws cloudfront get-distribution --id E3E123A9Y293GH --query "Distribution.Status" --output text'
```

#### What Happens During Deployment

1. **0-5 minutes**: Distribution configuration is being validated
2. **5-15 minutes**: Distribution is being propagated to edge locations globally
3. **15-20 minutes**: Final propagation and activation
4. **Status changes to "Deployed"**: Ready to use

#### When Status is "Deployed"

Once you see `Deployed`, proceed to Step 2.

---

### Step 2: Create and Associate WAF Web ACL

WAF (Web Application Firewall) provides rate limiting and DDoS protection. It must be associated with the CloudFront distribution.

#### 2.1 Create WAF Web ACL

```bash
# Run the WAF setup script
./scripts/setup-a2a-waf.sh production
```

**What this does:**
- Creates a WAF Web ACL named `a2a-function-url-waf-production`
- Configures rate limiting: 100 requests per 5 minutes per IP
- Adds AWS Managed Rules (Common Rule Set, Known Bad Inputs)
- Returns the WAF Web ACL ARN

**Expected output:**
```
✅ Created WAF Web ACL
  ARN: arn:aws:wafv2:us-east-1:ACCOUNT_ID:global/webacl/a2a-function-url-waf-production/WAF_ID
```

**Note:** Save the ARN - you'll need it in the next step.

#### 2.2 Get WAF Web ACL ARN

If you need to retrieve the ARN later:

```bash
# Get WAF Web ACL ARN
aws wafv2 get-web-acl \
  --scope CLOUDFRONT \
  --region us-east-1 \
  --name a2a-function-url-waf-production \
  --id $(aws wafv2 list-web-acls --scope CLOUDFRONT --region us-east-1 --query "WebACLs[?Name=='a2a-function-url-waf-production'].Id" --output text) \
  --query 'WebACL.Arn' \
  --output text
```

#### 2.3 Associate WAF with CloudFront Distribution

**Important:** CloudFront distributions require an ETag for updates. You must:
1. Get the current distribution config with ETag
2. Update the config with WAF Web ACL ID
3. Update the distribution with the new config and ETag

```bash
# Step 1: Get current distribution config and ETag
aws cloudfront get-distribution-config \
  --id E3E123A9Y293GH \
  --output json > /tmp/cloudfront-config.json

# Extract ETag (needed for update)
ETAG=$(aws cloudfront get-distribution-config \
  --id E3E123A9Y293GH \
  --query 'ETag' \
  --output text)

# Step 2: Get WAF Web ACL ID
WAF_ACL_ID=$(aws wafv2 list-web-acls \
  --scope CLOUDFRONT \
  --region us-east-1 \
  --query "WebACLs[?Name=='a2a-function-url-waf-production'].Id" \
  --output text)

# Step 3: Update distribution config with WAF
# This requires editing the JSON file to add WebACLId
# Use jq to update the config
jq '.DistributionConfig.WebACLId = "'$WAF_ACL_ID'"' \
  <(aws cloudfront get-distribution-config --id E3E123A9Y293GH --query 'DistributionConfig' --output json) \
  > /tmp/cloudfront-config-updated.json

# Step 4: Update distribution with new config
aws cloudfront update-distribution \
  --id E3E123A9Y293GH \
  --distribution-config file:///tmp/cloudfront-config-updated.json \
  --if-match "$ETAG"
```

**Alternative: Use AWS Console**

1. Go to CloudFront Console: https://console.aws.amazon.com/cloudfront/
2. Click on distribution `E3E123A9Y293GH`
3. Go to "Security" tab
4. Click "Edit" next to "AWS WAF web ACL"
5. Select `a2a-function-url-waf-production`
6. Click "Save changes"
7. Wait for deployment (another 15-20 minutes)

**Verify WAF Association**

```bash
# Check if WAF is associated
aws cloudfront get-distribution \
  --id E3E123A9Y293GH \
  --query 'Distribution.DistributionConfig.WebACLId' \
  --output text
```

Should return the WAF Web ACL ID if successfully associated.

---

### Step 3: Update DNS/CNAME

Point your custom domain to the CloudFront distribution.

#### Option A: Use CloudFront Domain Directly

**No DNS changes needed** - use the CloudFront domain directly:
- **A2A Base URL:** `https://d3su0gpyy6qhel.cloudfront.net`
- **Discovery Endpoint:** `https://d3su0gpyy6qhel.cloudfront.net/a2a/discovery`
- **Message Endpoint:** `https://d3su0gpyy6qhel.cloudfront.net/a2a/message`

#### Option B: Use Custom Domain (Recommended for Production)

**3.1 Request SSL Certificate (if using custom domain)**

```bash
# Request certificate via AWS Certificate Manager (ACM)
# Must be in us-east-1 for CloudFront
aws acm request-certificate \
  --domain-name storyintelligence.dev \
  --validation-method DNS \
  --region us-east-1
```

**3.2 Add Certificate to CloudFront Distribution**

```bash
# Get certificate ARN
CERT_ARN=$(aws acm list-certificates \
  --region us-east-1 \
  --query "CertificateSummaryList[?DomainName=='storyintelligence.dev'].CertificateArn" \
  --output text)

# Update distribution with certificate (requires ETag, similar to WAF association)
# Use AWS Console or update-distribution command
```

**3.3 Create CNAME Record**

In your DNS provider (Route 53, Cloudflare, etc.):

```
Type: CNAME
Name: storyintelligence.dev (or a2a.storyintelligence.dev)
Value: d3su0gpyy6qhel.cloudfront.net
TTL: 300 (5 minutes)
```

**3.4 Update A2A Base URL in SSM**

```bash
# Update A2A_BASE_URL to use custom domain
aws ssm put-parameter \
  --name "/storytailor-production/a2a/base-url" \
  --type "String" \
  --value "https://storyintelligence.dev" \
  --region us-east-1 \
  --overwrite
```

**3.5 Re-deploy Universal Agent**

```bash
./scripts/deploy-universal-agent-proper.sh production
```

---

### Step 4: Test A2A Endpoints via CloudFront

Once CloudFront is deployed and DNS is configured, test the endpoints.

#### 4.1 Test Discovery Endpoint

```bash
# Test via CloudFront domain
curl https://d3su0gpyy6qhel.cloudfront.net/a2a/discovery

# Or via custom domain (if configured)
curl https://storyintelligence.dev/a2a/discovery
```

**Expected Response:**
```json
{
  "agentCard": {
    "id": "storytailor-agent",
    "name": "Storytailor Agent",
    "version": "1.0.0",
    "capabilities": ["storytelling", "emotional-check-in", "crisis-detection"],
    "endpoints": {
      "service": "https://d3su0gpyy6qhel.cloudfront.net/a2a/message",
      "webhook": "https://d3su0gpyy6qhel.cloudfront.net/a2a/webhook",
      "health": "https://d3su0gpyy6qhel.cloudfront.net/health"
    }
  }
}
```

#### 4.2 Test Message Endpoint

```bash
# Test with API key
curl -X POST https://d3su0gpyy6qhel.cloudfront.net/a2a/message \
  -H "Content-Type: application/json" \
  -H "X-API-Key: [REDACTED_API_KEY]" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "library.list",
    "params": {}
  }'
```

**Expected Response:**
- JSON-RPC 2.0 response (not authentication error)
- Should route through CloudFront → Function URL → Lambda

#### 4.3 Test Rate Limiting (WAF)

```bash
# Test rate limiting by making 101 requests quickly
for i in {1..101}; do
  curl -X POST https://d3su0gpyy6qhel.cloudfront.net/a2a/message \
    -H "Content-Type: application/json" \
    -H "X-API-Key: [REDACTED_API_KEY]" \
    -d '{"jsonrpc":"2.0","id":"'$i'","method":"library.list","params":{}}' &
done
wait

# The 101st request should be blocked by WAF rate limiting
```

**Expected:** Requests 1-100 succeed, request 101+ blocked (403 Forbidden)

#### 4.4 Verify CloudFront Headers

```bash
# Check CloudFront headers
curl -I https://d3su0gpyy6qhel.cloudfront.net/a2a/discovery

# Should see:
# x-amz-cf-id: <cloudfront-request-id>
# x-cache: Miss from cloudfront (first request)
# x-cache: Hit from cloudfront (subsequent requests)
```

---

## Verification Checklist

After completing all steps:

- [ ] CloudFront distribution status is "Deployed"
- [ ] WAF Web ACL created and associated with distribution
- [ ] DNS/CNAME configured (or using CloudFront domain directly)
- [ ] Discovery endpoint works via CloudFront
- [ ] Message endpoint works via CloudFront
- [ ] Rate limiting works (WAF blocking excessive requests)
- [ ] CloudWatch alarms monitoring CloudFront metrics
- [ ] A2A_BASE_URL updated in SSM (if using custom domain)

---

## Troubleshooting

### CloudFront Status Stuck on "InProgress"

**Check:**
```bash
# Check for errors
aws cloudfront get-distribution --id E3E123A9Y293GH --query 'Distribution.Status' --output text

# Check CloudFront logs
aws cloudfront list-distributions --query "DistributionList.Items[?Id=='E3E123A9Y293GH']" --output json
```

**Solution:** Wait longer (can take up to 30 minutes). If stuck > 1 hour, check AWS Console for errors.

### WAF Not Blocking Requests

**Check WAF association:**
```bash
aws cloudfront get-distribution \
  --id E3E123A9Y293GH \
  --query 'Distribution.DistributionConfig.WebACLId' \
  --output text
```

**Solution:** If empty, WAF is not associated. Re-run Step 2.3.

### DNS Not Resolving

**Check DNS:**
```bash
# Check CNAME resolution (replace with your custom domain)
dig storyintelligence.dev CNAME

# Check CloudFront domain
dig d3su0gpyy6qhel.cloudfront.net
```

**Solution:** Verify CNAME record is correct and TTL has expired (wait 5 minutes after DNS update).

### 403 Forbidden from CloudFront

**Possible causes:**
1. WAF rate limiting (expected behavior)
2. Origin access control misconfigured
3. SSL certificate issues

**Check:**
```bash
# Check CloudFront access logs
aws cloudfront get-distribution --id E3E123A9Y293GH --query 'Distribution.DistributionConfig.Logging'
```

### Endpoints Return 502 Bad Gateway

**Possible causes:**
1. Function URL not accessible from CloudFront
2. Origin timeout
3. Lambda function error

**Check:**
```bash
# Test Function URL directly
curl https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws/health

# Check Lambda logs
aws logs tail /aws/lambda/storytailor-universal-agent-production --since 10m
```

---

## Monitoring

### CloudFront Metrics

```bash
# View CloudFront metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name Requests \
  --dimensions Name=DistributionId,Value=E3E123A9Y293GH \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

### WAF Metrics

```bash
# View WAF blocked requests
aws cloudwatch get-metric-statistics \
  --namespace AWS/WAFV2 \
  --metric-name BlockedRequests \
  --dimensions Name=WebACL,Value=a2a-function-url-waf-production Name=Rule,Value=A2A-RateLimit \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

---

## Next Steps After Integration

1. **Update Partner Documentation**
   - Share new CloudFront domain or custom domain
   - Update API reference with new base URL
   - Notify partners of domain change

2. **Monitor Performance**
   - Track CloudFront cache hit rates
   - Monitor WAF block rates
   - Check response times (should improve with CDN)

3. **Optimize Caching**
   - Configure cache behaviors for A2A endpoints
   - Set appropriate TTLs for discovery endpoint
   - Disable caching for message/task endpoints (they're dynamic)

4. **Set Up Alarms**
   - CloudFront error rate alarms
   - WAF block rate alarms
   - Origin response time alarms

---

## Related Documentation

- **Deployment Verification:** `docs/platform/a2a/deployment-verification.md`
- **API Reference:** `docs/platform/a2a/api-reference.md`
- **Configuration Checklist:** `docs/platform/a2a/configuration-checklist.md`

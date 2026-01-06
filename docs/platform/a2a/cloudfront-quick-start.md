Status: Published  
Audience: DevOps | Engineering  
Last-Updated: 2025-12-17  
Doc-ID: AUTO  

# CloudFront Integration - Quick Start

## Current Status

✅ **CloudFront Distribution Created**
- **ID:** `E3E123A9Y293GH`
- **Domain:** `d3su0gpyy6qhel.cloudfront.net`
- **Status:** InProgress (deploying now)

## What You Need to Do (In Order)

### Step 1: Wait for CloudFront to Deploy ⏱️

**Time Required:** 15-20 minutes

**What to do:**
```bash
# Check status every few minutes
aws cloudfront get-distribution --id E3E123A9Y293GH --query 'Distribution.Status'
```

**Wait until you see:** `Deployed` (not `InProgress`)

**Why:** CloudFront needs to propagate to edge locations globally before it can serve traffic.

---

### Step 2: Create WAF (Web Application Firewall) 🛡️

**Time Required:** 2-3 minutes

**What to do:**
```bash
./scripts/setup-a2a-waf.sh production
```

**What happens:**
- Creates a WAF Web ACL with rate limiting (100 requests/5min per IP)
- Adds security rules
- Returns a WAF ID/ARN

**Expected output:**
```
✅ Created WAF Web ACL
  ARN: arn:aws:wafv2:us-east-1:...
```

**Why:** WAF protects your API from DDoS attacks and rate limits abusive requests.

---

### Step 3: Associate WAF with CloudFront 🔗

**Time Required:** 2-3 minutes (plus 15-20 min for redeployment)

**What to do:**
```bash
./scripts/associate-waf-with-cloudfront.sh production E3E123A9Y293GH
```

**What happens:**
- Gets current CloudFront configuration
- Adds WAF Web ACL to the configuration
- Updates the distribution
- Distribution redeploys (another 15-20 minutes)

**Expected output:**
```
✅ WAF successfully associated
⚠️  Distribution will need to redeploy (15-20 minutes)
```

**Why:** WAF only works when associated with the CloudFront distribution.

**Note:** After this step, wait another 15-20 minutes for redeployment.

---

### Step 4: Choose Your Domain Strategy 🌐

**You have 2 options:**

#### Option A: Use CloudFront Domain (Easiest - No DNS Changes)

**What to do:** Nothing! Just use the CloudFront domain.

**Your A2A endpoints will be:**
- Discovery: `https://d3su0gpyy6qhel.cloudfront.net/a2a/discovery`
- Message: `https://d3su0gpyy6qhel.cloudfront.net/a2a/message`
- Health: `https://d3su0gpyy6qhel.cloudfront.net/health`

**Pros:** 
- ✅ No DNS configuration needed
- ✅ Works immediately
- ✅ Free

**Cons:**
- ❌ Long CloudFront domain name
- ❌ Less professional for partners

#### Option B: Use Custom Domain (Recommended for Production)

**What to do:**

1. **Create CNAME record in your DNS:**
   ```
   Type: CNAME
   Name: storyintelligence.dev (or a2a.storyintelligence.dev)
   Value: d3su0gpyy6qhel.cloudfront.net
   TTL: 300
   ```

2. **Request SSL certificate (if not already done):**
   ```bash
   aws acm request-certificate \
     --domain-name storyintelligence.dev \
     --validation-method DNS \
     --region us-east-1
   ```

3. **Add certificate to CloudFront** (via AWS Console or CLI)

4. **Update A2A_BASE_URL in SSM:**
   ```bash
   aws ssm put-parameter \
     --name "/storytailor-production/a2a/base-url" \
     --type "String" \
     --value "https://storyintelligence.dev" \
     --region us-east-1 \
     --overwrite
   ```

5. **Re-deploy Universal Agent:**
   ```bash
   ./scripts/deploy-universal-agent-proper.sh production
   ```

**Pros:**
- ✅ Professional domain name
- ✅ Better for partner integration
- ✅ Can use your brand domain

**Cons:**
- ❌ Requires DNS configuration
- ❌ Requires SSL certificate
- ❌ Takes longer to set up

---

### Step 5: Test Everything ✅

**Time Required:** 5 minutes

**What to do:**

1. **Test Discovery Endpoint:**
   ```bash
   curl https://d3su0gpyy6qhel.cloudfront.net/a2a/discovery
   ```
   **Expected:** JSON response with agent card

2. **Test Message Endpoint:**
   ```bash
   curl -X POST https://d3su0gpyy6qhel.cloudfront.net/a2a/message \
     -H "Content-Type: application/json" \
     -H "X-API-Key: [REDACTED_API_KEY]" \
     -d '{"jsonrpc":"2.0","id":"1","method":"library.list","params":{}}'
   ```
   **Expected:** JSON-RPC response (not authentication error)

3. **Test Rate Limiting (WAF):**
   ```bash
   # Make 101 requests quickly - the 101st should be blocked
   for i in {1..101}; do
     curl -X POST https://d3su0gpyy6qhel.cloudfront.net/a2a/message \
       -H "X-API-Key: [REDACTED_API_KEY]" \
       -d '{"jsonrpc":"2.0","id":"'$i'","method":"library.list","params":{}}' &
   done
   wait
   ```
   **Expected:** First 100 succeed, 101st+ returns 403 Forbidden

**Why:** Verify everything works end-to-end through CloudFront.

---

## Timeline Summary

| Step | Action | Time | Can Skip? |
|------|--------|------|-----------|
| 1 | Wait for CloudFront deployment | 15-20 min | ❌ No |
| 2 | Create WAF | 2-3 min | ❌ No |
| 3 | Associate WAF | 2-3 min + 15-20 min redeploy | ❌ No |
| 4 | DNS/Custom Domain | 5-10 min | ✅ Yes (use CloudFront domain) |
| 5 | Test | 5 min | ❌ No |

**Total Time:** ~40-60 minutes (if using CloudFront domain) or ~50-70 minutes (if using custom domain)

---

## Quick Command Reference

```bash
# Check CloudFront status
aws cloudfront get-distribution --id E3E123A9Y293GH --query 'Distribution.Status'

# Create WAF
./scripts/setup-a2a-waf.sh production

# Associate WAF
./scripts/associate-waf-with-cloudfront.sh production E3E123A9Y293GH

# Test endpoints
curl https://d3su0gpyy6qhel.cloudfront.net/a2a/discovery
```

---

## Troubleshooting

**Q: CloudFront status stuck on "InProgress"**
- **A:** Wait longer (can take up to 30 minutes). Check AWS Console for errors.

**Q: WAF association fails**
- **A:** Make sure CloudFront is "Deployed" first. Check WAF exists: `aws wafv2 list-web-acls --scope CLOUDFRONT`

**Q: Endpoints return 502 Bad Gateway**
- **A:** Test Function URL directly. Check Lambda logs for errors.

**Q: Rate limiting not working**
- **A:** Verify WAF is associated: `aws cloudfront get-distribution --id E3E123A9Y293GH --query 'Distribution.DistributionConfig.WebACLId'`

---

## For More Details

See the complete guide: `docs/platform/a2a/cloudfront-integration-guide.md`

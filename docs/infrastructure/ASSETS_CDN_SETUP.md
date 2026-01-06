# Assets CDN Setup Guide

## Overview

All images (character headshots, bodyshots, story covers, scene images, PDFs) are served through a branded CloudFront CDN at `assets.storytailor.dev` instead of direct S3 URLs.

**Benefits:**
- ✅ Branded vanity URL (`assets.storytailor.dev`)
- ✅ Better performance (CloudFront edge caching)
- ✅ Consistent URL structure
- ✅ Easy to switch CDN providers if needed

## Current Status

**CDN Domain:** `assets.storytailor.dev`  
**S3 Bucket:** `storytailor-assets-production` (production)  
**CloudFront:** Not yet configured (see setup steps below)

## Setup Steps

### Step 1: Create CloudFront Distribution

Run the setup script:

```bash
./scripts/setup-assets-cloudfront.sh production
```

This will:
- Create CloudFront distribution for the assets S3 bucket
- Set up Origin Access Control (OAC) for secure S3 access
- Configure bucket policy for CloudFront
- Return distribution ID and domain

**Time Required:** 2-3 minutes  
**Wait Time:** 15-20 minutes for CloudFront to deploy

### Step 2: Request SSL Certificate

Request an SSL certificate for `assets.storytailor.dev`:

```bash
aws acm request-certificate \
  --domain-name assets.storytailor.dev \
  --validation-method DNS \
  --region us-east-1
```

**Note:** Certificate must be in `us-east-1` region for CloudFront.

### Step 3: Validate Certificate

1. Check certificate status:
   ```bash
   aws acm list-certificates --region us-east-1
   ```

2. Get validation records:
   ```bash
   aws acm describe-certificate \
     --certificate-arn <CERT_ARN> \
     --region us-east-1 \
     --query 'Certificate.DomainValidationOptions'
   ```

3. Add DNS CNAME records as shown in validation output

4. Wait for validation (usually 5-10 minutes)

### Step 4: Add Custom Domain to CloudFront

Once certificate is validated, update CloudFront distribution:

```bash
# Get distribution config
aws cloudfront get-distribution-config \
  --id <DISTRIBUTION_ID> \
  --output json > dist-config.json

# Edit dist-config.json to add:
# - Aliases: ["assets.storytailor.dev"]
# - ViewerCertificate: { ACMCertificateArn: "<CERT_ARN>", SSLSupportMethod: "sni-only" }

# Update distribution (requires ETag from get-distribution-config)
aws cloudfront update-distribution \
  --id <DISTRIBUTION_ID> \
  --distribution-config file://dist-config.json \
  --if-match <ETAG>
```

### Step 5: Create DNS CNAME Record

Create CNAME record pointing to CloudFront domain:

```
Type: CNAME
Name: assets.storytailor.dev
Value: <CLOUDFRONT_DOMAIN> (e.g., d1234567890abc.cloudfront.net)
TTL: 300
```

### Step 6: Update SSM Parameter Store

Set the CDN URL in SSM Parameter Store:

```bash
aws ssm put-parameter \
  --name "/storytailor-production/asset-cdn-url" \
  --type "String" \
  --value "https://assets.storytailor.dev" \
  --region us-east-1 \
  --overwrite
```

### Step 7: Redeploy Content Agent

After CloudFront is deployed and DNS is configured:

```bash
./scripts/deploy-content-agent-with-deps.sh production
```

This ensures the Content Agent Lambda has the latest code that uses CDN URLs.

## URL Structure

### Character Images
- Headshot: `https://assets.storytailor.dev/characters/{characterId}/headshot-{timestamp}.png`
- Bodyshot: `https://assets.storytailor.dev/characters/{characterId}/bodyshot-{timestamp}.png`

### Story Images
- Cover: `https://assets.storytailor.dev/covers/{story-title}-cover-{timestamp}.png`
- Scene: `https://assets.storytailor.dev/scenes/{story-title}-scene-{beat}-{timestamp}.png`

### PDFs
- PDF: `https://assets.storytailor.dev/pdfs/{storyId}/{filename}.pdf`

### Other Assets
- Images: `https://assets.storytailor.dev/images/{title}-{timestamp}.png`

## Environment Variables

The code uses the following environment variable priority:

1. `ASSET_CDN_URL` - Primary (from SSM Parameter Store)
2. `CDN_BASE_URL` - Fallback
3. Default: `https://assets.storytailor.dev`

**SSM Parameter Path:**
- Production: `/storytailor-production/asset-cdn-url`
- Staging: `/storytailor-staging/asset-cdn-url`

## Code Implementation

All image uploads use the `cdnUrl.ts` helper:

```typescript
import { getCdnUrl, getAssetBucketName } from './utils/cdnUrl';

// Upload to S3
const s3Key = `characters/${characterId}/headshot-${Date.now()}.png`;
await s3Client.send(new PutObjectCommand({
  Bucket: getAssetBucketName(),
  Key: s3Key,
  Body: imageBuffer,
  ContentType: 'image/png'
}));

// Return CDN URL
const cdnUrl = getCdnUrl(s3Key);
// Returns: https://assets.storytailor.dev/characters/{characterId}/headshot-{timestamp}.png
```

## Testing

After setup, verify CDN is working:

```bash
# Test CDN URL (should return 200)
curl -I https://assets.storytailor.dev/characters/test/headshot-123.png

# Verify it's served from CloudFront
curl -I https://assets.storytailor.dev/characters/test/headshot-123.png | grep -i "x-amz-cf"
```

## Troubleshooting

### Images Not Loading

1. **Check CloudFront status:**
   ```bash
   aws cloudfront get-distribution --id <DIST_ID> --query 'Distribution.Status'
   ```
   Must be `Deployed` (not `InProgress`)

2. **Check DNS propagation:**
   ```bash
   dig assets.storytailor.dev
   ```
   Should resolve to CloudFront domain

3. **Check bucket policy:**
   ```bash
   aws s3api get-bucket-policy --bucket storytailor-assets-production
   ```
   Should allow CloudFront service principal

4. **Check SSL certificate:**
   ```bash
   aws acm list-certificates --region us-east-1
   ```
   Certificate must be validated

### Fallback Behavior

If CloudFront is not yet configured, the CDN URLs will return 404. The code will:
- Still upload images to S3 successfully
- Return CDN URLs (which will work once CloudFront is set up)
- No errors in Lambda execution

**Recommendation:** Set up CloudFront before deploying to production.

## Related Files

- `scripts/setup-assets-cloudfront.sh` - CloudFront setup script
- `lambda-deployments/content-agent/src/utils/cdnUrl.ts` - CDN URL helper
- `lambda-deployments/content-agent/src/RealContentAgent.ts` - Image upload methods
- `lambda-deployments/content-agent/src/lambda.ts` - Character image generation




# How to Run Inclusivity Tests - Definitive Guide

## Purpose

This document provides the PROVEN pattern for running inclusivity validation tests. This pattern has successfully generated 100+ test images and must NEVER be forgotten.

## The Proven Pattern (NEVER CHANGE THIS)

### Pattern Overview

**Lambda-deployments tests run via standalone Node.js scripts, NOT Jest.**

**Why**: lambda-deployments is NOT a workspace package (only packages/* are workspaces). Tests require built code from dist/, not source from src/.

### Step-by-Step Process

```bash
# Step 1: Build lambda-deployments code
cd lambda-deployments/content-agent
npm run build

# Step 2: Return to project root
cd ../..

# Step 3: Run standalone test script
node scripts/test-[script-name].js
```

**That's it.** This pattern has generated 100+ successful test images.

## Available Test Scripts

### 1. Comprehensive Validation (ALL 39 Traits)

```bash
node scripts/test-comprehensive-inclusivity-validation.js
```

**Generates:**
- 80 images (39 traits × human + creature + 2 baseline)
- Cost: $3.20
- Time: ~2-2.5 hours with 1.5-minute spacing
- Output: COMPREHENSIVE_VALIDATION_RESULTS.md

**When to run:**
- Before major releases
- After significant code changes
- Quarterly validation
- Annual baseline update

### 2. Halo Device Validation

```bash
node scripts/test-halo-imagination-variants.js variant-a
```

**Generates:**
- 8-9 images (various ages and ethnicities)
- Cost: ~$0.32-$0.36
- Time: ~1.5 hours with 10-minute spacing
- Output: HALO_VARIANT_A_PROGRESS.md → HALO_VARIANT_A_COMPLETE_RESULTS.md

**Historical results:**
- REVIEW_ALL_HALO_IMAGES.md (8 successful images, ages 5-8)
- HALO_DEVICE_UNIVERSAL_SOLUTION_FINAL.md (complete analysis)

## Why This Pattern Works

### The Build Step is REQUIRED

Lambda-deployments code must be built because:
1. Scripts require from `dist/` not `src/`
2. TypeScript must be compiled to JavaScript
3. Dependencies must be resolved

**If you skip build**: Script fails with "Cannot find module" errors

### Standalone Scripts (Not Jest)

Jest configuration at project root only scans:
- `tests/`
- `packages/`

Lambda-deployments is NOT in Jest roots, so:
- `npm test` can't find lambda-deployments tests
- Jest can't resolve lambda-deployments imports
- Must use standalone Node.js scripts

**This is intentional** - lambda-deployments is deployment code, not workspace package.

### Why Spacing Matters

**Halo tests**: 10-minute spacing (very conservative)
**Comprehensive tests**: 1.5-minute spacing (reasonable for large batches)

**Rationale:**
- Prevents rate limiting
- Reduces account flagging risk
- OpenAI safety filters less sensitive with spacing

## Historical Test Results

### Halo Device Testing (Dec 21-22, 2025)

**Script**: `scripts/test-halo-imagination-variants.js`
**Results**: REVIEW_ALL_HALO_IMAGES.md
**Images**: 8 successful (100% filter success)
**Breakthrough**: Power Detection Crown (ages 5-8)

**Key URLs:**
- Mexican age 6: https://storytailor-audio.s3.us-east-1.amazonaws.com/characters/char-headshot-halo-variant-a-mexican-6-...
- African American age 7: https://storytailor-audio.s3.us-east-1.amazonaws.com/characters/char-headshot-halo-variant-a-african-american-7-...
- Indian age 5, Samoan age 6, Brazilian age 8: All successful

### Species Adaptation Testing (Dec 19-20, 2025)

**Script**: Custom standalone script
**Results**: SPECIES_TEST_RESULTS_ALL_URLS.md
**Images**: 26 successful across 13 scenarios
**Breakthrough**: Identified "human in costume" problem, led to species-first language fix

**Key URLs:**
- Dragon + DS: https://storytailor-audio.s3.us-east-1.amazonaws.com/characters/char-headshot-dragon-ds-wheelchair-...
- Monster + vitiligo: https://storytailor-audio.s3.us-east-1.amazonaws.com/characters/char-headshot-monster-vitiligo-...
- Robot + autism + prosthetic: https://storytailor-audio.s3.us-east-1.amazonaws.com/characters/char-headshot-robot-autism-prosthetic-...

## Common Issues & Solutions

### Issue: "Cannot find module CharacterGenerationService"

**Cause**: Lambda-deployments not built
**Solution**: `cd lambda-deployments/content-agent && npm run build`

### Issue: "OPENAI_API_KEY not set"

**Cause**: No API key in environment or SSM
**Solution**: `export OPENAI_API_KEY="your-key-here"`

### Issue: "Connection error" during test

**Cause**: OpenAI API temporary issue (not filter rejection)
**Solution**: Re-run that specific test, usually works on retry

### Issue: "traitsValidated: false"

**Cause**: Vision model detected trait not visible
**Action**: Review prompt for that trait, may need to strengthen MANDATORY requirements

### Issue: Filter rejection

**Cause**: Medical language or dangerous symbol detected
**Action**: CRITICAL - this is regression, check if prompt was simplified

## Script Anatomy (For Creating New Tests)

### Required Imports

```javascript
const { CharacterGenerationService } = require('../lambda-deployments/content-agent/dist/services/CharacterGenerationService');
const OpenAI = require('openai').default;
const { execSync } = require('child_process');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
```

### API Key Setup

```javascript
const OPENAI_KEY = process.env.OPENAI_API_KEY || execSync(
  'aws ssm get-parameter --name "/storytailor-production/openai/api-key" --with-decryption --query "Parameter.Value" --output text',
  { encoding: 'utf8' }
).trim();
```

### Service Initialization

```javascript
const openai = new OpenAI({ apiKey: OPENAI_KEY });
const charService = new CharacterGenerationService(openai, logger);
```

### Generate Images

```javascript
const result = await charService.generateReferenceImagesWithValidation(
  traits,
  characterId
);

// result contains:
// - headshot: { url, prompt, traitsValidated }
// - bodyshot: { url, prompt, traitsValidated }
// - colorPalette: { skin, hair, eyes }
// - expressions: [{ emotion, description }]
```

### Generate Signed URLs (7-Day Expiry)

```javascript
async function generateSignedUrl(s3Url) {
  const match = s3Url.match(/amazonaws\.com\/(.+)$/);
  if (!match) return s3Url;
  
  const key = match[1];
  const bucket = 'storytailor-audio';
  
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return await getSignedUrl(s3Client, command, { expiresIn: 604800 });
}
```

## Never Forget Checklist

Before running ANY inclusivity test:

- [ ] Build lambda-deployments code first
- [ ] Run from project root (not from lambda-deployments/)
- [ ] Use standalone Node.js script (not Jest)
- [ ] Include spacing between tests (1.5-10 minutes)
- [ ] Log results to markdown file
- [ ] Generate signed URLs (7-day expiry)
- [ ] Record all URLs for baseline comparison

## What "traitsValidated: true" Means

**Vision model confirmed:**
- Trait is visible in generated image
- Trait is not smoothed/minimized by AI
- Representation is authentic (not generic)

**If false**: AI bias detected, trait not accurately represented

## Success Metrics

**Filter Success Rate**: % of images that passed OpenAI safety filters
**Trait Validation Rate**: % of successful images where traits were visible
**Target**: 100% filter success, >95% trait validation

---

**Last Updated:** December 2025
**Status:** Definitive guide based on 100+ successful test images
**Pattern**: PROVEN and NEVER CHANGES

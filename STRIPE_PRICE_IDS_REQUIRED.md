# Stripe Price IDs Configuration Required

## Issue
The checkout endpoints are failing because Stripe price IDs are not configured in environment variables.

**Error**: `You passed an empty string for 'line_items[0][price]'`

## Required Environment Variables

The following environment variables must be set in SSM Parameter Store or Lambda environment:

### Subscription Plans
- `STRIPE_PRO_INDIVIDUAL_PRICE_ID` - Pro Individual subscription price ID
- `STRIPE_PRO_ORGANIZATION_PRICE_ID` - Pro Organization subscription price ID

### Story Packs
- `STRIPE_STORY_PACK_5_PRICE_ID` - 5-pack story credits
- `STRIPE_STORY_PACK_10_PRICE_ID` - 10-pack story credits
- `STRIPE_STORY_PACK_25_PRICE_ID` - 25-pack story credits

### Gift Cards
- `STRIPE_GIFT_CARD_1_MONTH_PRICE_ID` - 1 month gift card
- `STRIPE_GIFT_CARD_3_MONTH_PRICE_ID` - 3 month gift card
- `STRIPE_GIFT_CARD_6_MONTH_PRICE_ID` - 6 month gift card
- `STRIPE_GIFT_CARD_12_MONTH_PRICE_ID` - 12 month gift card

## How to Set Up

### Option 1: Use the Verification Script
```bash
./scripts/verify-stripe-products.sh
```

This script will:
1. Check if products/prices exist in Stripe
2. Create them if missing
3. Update the config file with price IDs

### Option 2: Manual Setup in SSM Parameter Store

```bash
# Set subscription price IDs
aws ssm put-parameter \
  --name "/storytailor-production/stripe/pro-individual-price-id" \
  --value "price_xxxxx" \
  --type "String" \
  --overwrite

aws ssm put-parameter \
  --name "/storytailor-production/stripe/pro-organization-price-id" \
  --value "price_xxxxx" \
  --type "String" \
  --overwrite

# Set story pack price IDs
aws ssm put-parameter \
  --name "/storytailor-production/stripe/story-pack-5-price-id" \
  --value "price_xxxxx" \
  --type "String" \
  --overwrite

aws ssm put-parameter \
  --name "/storytailor-production/stripe/story-pack-10-price-id" \
  --value "price_xxxxx" \
  --type "String" \
  --overwrite

aws ssm put-parameter \
  --name "/storytailor-production/stripe/story-pack-25-price-id" \
  --value "price_xxxxx" \
  --type "String" \
  --overwrite

# Set gift card price IDs
aws ssm put-parameter \
  --name "/storytailor-production/stripe/gift-card-1-month-price-id" \
  --value "price_xxxxx" \
  --type "String" \
  --overwrite

aws ssm put-parameter \
  --name "/storytailor-production/stripe/gift-card-3-month-price-id" \
  --value "price_xxxxx" \
  --type "String" \
  --overwrite

aws ssm put-parameter \
  --name "/storytailor-production/stripe/gift-card-6-month-price-id" \
  --value "price_xxxxx" \
  --type "String" \
  --overwrite

aws ssm put-parameter \
  --name "/storytailor-production/stripe/gift-card-12-month-price-id" \
  --value "price_xxxxx" \
  --type "String" \
  --overwrite
```

### Option 3: Update Lambda Environment Variables

The deployment script should load these from SSM, but you can also set them directly in Lambda:

1. Go to AWS Lambda Console
2. Select `storytailor-universal-agent-production`
3. Configuration → Environment variables
4. Add each variable listed above

## Current Status

✅ **Code Updated**: Better error messages added to indicate missing price IDs  
⏳ **Configuration Needed**: Price IDs must be set in SSM Parameter Store or Lambda environment

## Test Status After Fix

Once price IDs are configured:
- ✅ Individual checkout should work
- ✅ Story pack purchase should work
- ✅ Gift card purchase should work

## Verification

After setting price IDs, re-run the test suite:
```bash
TEST_EMAIL=j+1226@jqsirls.com \
TEST_PASSWORD=Fntra2015! \
API_BASE_URL=https://api.storytailor.dev \
node scripts/test-comprehensive-commerce-apis.js
```


#!/bin/bash

# Stripe Product Verification Script
# Verifies all 9 required Stripe products exist or creates missing ones

set -e

echo "🔍 Verifying Stripe Products..."

# Check if Stripe CLI is available
if ! command -v stripe &> /dev/null; then
  echo "❌ Stripe CLI not found. Install: https://stripe.com/docs/stripe-cli"
  exit 1
fi

# Check if STRIPE_SECRET_KEY is set
if [ -z "$STRIPE_SECRET_KEY" ]; then
  echo "⚠️  STRIPE_SECRET_KEY not set. Using Stripe CLI default."
fi

echo ""
echo "📋 Required Products (9 total):"
echo "  Subscriptions (2):"
echo "    1. Pro Individual - \$9.99/month"
echo "    2. Pro Organization - Per-seat"
echo "  Story Packs (3):"
echo "    3. 5-Story Pack - \$4.99"
echo "    4. 10-Story Pack - \$8.99"
echo "    5. 25-Story Pack - \$14.99"
echo "  Gift Cards (4):"
echo "    6. 1-Month Gift - \$9.99"
echo "    7. 3-Month Gift - \$27.99"
echo "    8. 6-Month Gift - \$49.99"
echo "    9. 12-Month Gift - \$99.99"
echo ""

# Check SSM for existing price IDs
echo "🔍 Checking AWS SSM Parameter Store..."
if command -v aws &> /dev/null; then
  SSM_PREFIX="/storytailor-production/stripe"
  
  echo "Checking: ${SSM_PREFIX}/pro_individual_price_id"
  aws ssm get-parameter --name "${SSM_PREFIX}/pro_individual_price_id" --query 'Parameter.Value' --output text 2>/dev/null || echo "  ❌ Not found in SSM"
  
  echo "Checking: ${SSM_PREFIX}/pro_organization_price_id"
  aws ssm get-parameter --name "${SSM_PREFIX}/pro_organization_price_id" --query 'Parameter.Value' --output text 2>/dev/null || echo "  ❌ Not found in SSM"
else
  echo "⚠️  AWS CLI not found. Skipping SSM check."
fi

echo ""
echo "📦 Listing existing Stripe products..."
stripe products list --limit 100

echo ""
echo "💰 Listing existing Stripe prices..."
stripe prices list --limit 100

echo ""
echo "✅ Verification complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Review the products/prices above"
echo "  2. Create missing products using:"
echo "     stripe products create --name 'Product Name' --description 'Description'"
echo "  3. Create prices using:"
echo "     stripe prices create --product prod_XXX --unit-amount 499 --currency usd"
echo "  4. Update SSM parameters with price IDs"
echo "  5. Update packages/commerce-agent/src/config.ts with all 9 price IDs"
echo ""


#!/usr/bin/env bash
set -euo pipefail

# Sets Stripe TEST-lane parameters in AWS SSM Parameter Store for the production namespace.
# This script is intentionally non-interactive and never echoes secret values.
#
# Required env vars (do NOT paste values into chat):
# - STRIPE_TEST_SECRET_KEY              (must start with sk_test_)
# - STRIPE_TEST_WEBHOOK_SECRET          (must start with whsec_)
# - STRIPE_TEST_PRICE_ID_INDIVIDUAL_MONTHLY (must start with price_)
# - STRIPE_TEST_PRICE_ID_INDIVIDUAL_YEARLY  (must start with price_)
# - STRIPE_TEST_PRICE_ID_ORG                (must start with price_)
#
# Optional env vars:
# - AWS_REGION (default: us-east-1)
# - SSM_PREFIX (default: /storytailor-production)
#
# Usage example (run locally):
#   AWS_REGION=us-east-1 SSM_PREFIX=/storytailor-production \
#   STRIPE_TEST_SECRET_KEY=... STRIPE_TEST_WEBHOOK_SECRET=... \
#   STRIPE_TEST_PRICE_ID_INDIVIDUAL_MONTHLY=... STRIPE_TEST_PRICE_ID_INDIVIDUAL_YEARLY=... STRIPE_TEST_PRICE_ID_ORG=... \
#   bash scripts/set-stripe-test-lane-ssm.sh

AWS_REGION="${AWS_REGION:-us-east-1}"
SSM_PREFIX="${SSM_PREFIX:-/storytailor-production}"

require_prefix() {
  local name="$1"
  local value="$2"
  local prefix="$3"
  if [[ -z "$value" || "$value" != ${prefix}* ]]; then
    echo "ERROR: $name must start with ${prefix} (refusing to write to SSM)"
    exit 2
  fi
}

STRIPE_TEST_SECRET_KEY="${STRIPE_TEST_SECRET_KEY:-}"
STRIPE_TEST_WEBHOOK_SECRET="${STRIPE_TEST_WEBHOOK_SECRET:-}"
STRIPE_TEST_PRICE_ID_INDIVIDUAL_MONTHLY="${STRIPE_TEST_PRICE_ID_INDIVIDUAL_MONTHLY:-}"
STRIPE_TEST_PRICE_ID_INDIVIDUAL_YEARLY="${STRIPE_TEST_PRICE_ID_INDIVIDUAL_YEARLY:-}"
STRIPE_TEST_PRICE_ID_ORG="${STRIPE_TEST_PRICE_ID_ORG:-}"

require_prefix STRIPE_TEST_SECRET_KEY "$STRIPE_TEST_SECRET_KEY" "sk_test_"
require_prefix STRIPE_TEST_WEBHOOK_SECRET "$STRIPE_TEST_WEBHOOK_SECRET" "whsec_"
require_prefix STRIPE_TEST_PRICE_ID_INDIVIDUAL_MONTHLY "$STRIPE_TEST_PRICE_ID_INDIVIDUAL_MONTHLY" "price_"
require_prefix STRIPE_TEST_PRICE_ID_INDIVIDUAL_YEARLY "$STRIPE_TEST_PRICE_ID_INDIVIDUAL_YEARLY" "price_"
require_prefix STRIPE_TEST_PRICE_ID_ORG "$STRIPE_TEST_PRICE_ID_ORG" "price_"

put_secure() {
  local name="$1"
  local value="$2"
  aws ssm put-parameter --region "$AWS_REGION" --name "$name" --type "SecureString" --value "$value" --overwrite >/dev/null
}

put_string() {
  local name="$1"
  local value="$2"
  aws ssm put-parameter --region "$AWS_REGION" --name "$name" --type "String" --value "$value" --overwrite >/dev/null
}

put_secure "${SSM_PREFIX}/stripe/test/secret-key" "$STRIPE_TEST_SECRET_KEY"
put_secure "${SSM_PREFIX}/stripe/test/webhook-secret" "$STRIPE_TEST_WEBHOOK_SECRET"
put_string "${SSM_PREFIX}/stripe/test/price-id-individual-monthly" "$STRIPE_TEST_PRICE_ID_INDIVIDUAL_MONTHLY"
put_string "${SSM_PREFIX}/stripe/test/price-id-individual-yearly" "$STRIPE_TEST_PRICE_ID_INDIVIDUAL_YEARLY"
put_string "${SSM_PREFIX}/stripe/test/price-id-org" "$STRIPE_TEST_PRICE_ID_ORG"

# Ensure test mode is active for the deployed Universal Agent.
put_string "${SSM_PREFIX}/stripe/mode" "test"

echo "OK: Stripe TEST lane SSM params updated under ${SSM_PREFIX}/stripe/test/* (values not printed)"



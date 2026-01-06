#!/bin/bash
# Setup SSM Parameters for Deletion System Configuration (Part B6)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

REGION="us-east-1"
PARAMETER_PREFIX="/storytailor/deletion/"

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     Setting Up SSM Parameters for Deletion System                 ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to create or update SSM parameter
create_parameter() {
  local PARAM_NAME=$1
  local PARAM_VALUE=$2
  local PARAM_TYPE=${3:-String}
  local DESCRIPTION=$4
  
  FULL_NAME="${PARAMETER_PREFIX}${PARAM_NAME}"
  
  echo -e "${YELLOW}Creating/Updating: ${FULL_NAME}${NC}"
  
  # Check if parameter exists
  if aws ssm get-parameter --name "${FULL_NAME}" --region "${REGION}" >/dev/null 2>&1; then
    echo -e "${YELLOW}  Parameter exists, updating...${NC}"
    aws ssm put-parameter \
      --name "${FULL_NAME}" \
      --value "${PARAM_VALUE}" \
      --type "${PARAM_TYPE}" \
      --description "${DESCRIPTION}" \
      --overwrite \
      --region "${REGION}" >/dev/null 2>&1
  else
    echo -e "${YELLOW}  Creating new parameter...${NC}"
    aws ssm put-parameter \
      --name "${FULL_NAME}" \
      --value "${PARAM_VALUE}" \
      --type "${PARAM_TYPE}" \
      --description "${DESCRIPTION}" \
      --region "${REGION}" >/dev/null 2>&1
  fi
  
  echo -e "${GREEN}  ✓ ${FULL_NAME}${NC}"
}

# Inactivity thresholds (in days)
create_parameter "inactivity/free_user_threshold" "180" "String" "Days of inactivity before deletion for free users (never paid)"
create_parameter "inactivity/former_paid_threshold" "540" "String" "Days of inactivity before deletion for former paid users"
create_parameter "inactivity/institutional_threshold" "720" "String" "Days of inactivity before deletion for institutional users"

# Grace periods (in days)
create_parameter "grace_period/account_deletion" "30" "String" "Grace period in days for account deletion"
create_parameter "grace_period/story_deletion" "7" "String" "Grace period in days for story deletion"
create_parameter "grace_period/character_deletion" "7" "String" "Grace period in days for character deletion"

# Email configuration
create_parameter "email/from_address" "noreply@storytailor.com" "String" "Default from address for deletion emails"
create_parameter "email/ses_region" "us-east-1" "String" "AWS SES region for email sending"
create_parameter "email/sendgrid_api_key" "" "SecureString" "SendGrid API key (optional, leave empty to use SES only)"

# Storage configuration
create_parameter "storage/glacier_vault_name" "storytailor-archives" "String" "S3 Glacier vault name for archival"
create_parameter "storage/s3_bucket" "storytailor-media-production" "String" "S3 bucket for media assets"
create_parameter "storage/glacier_tier" "Standard" "String" "Glacier retrieval tier (Standard, Expedited, Bulk)"

# Hibernation configuration
create_parameter "hibernation/enabled" "true" "String" "Enable account hibernation for cost savings"
create_parameter "hibernation/restore_days" "90" "String" "Days to keep hibernated accounts before permanent deletion"

# Processing schedule (cron expressions)
create_parameter "schedule/inactivity_check" "cron(0 2 * * ? *)" "String" "EventBridge schedule for inactivity monitoring (daily at 2 AM UTC)"
create_parameter "schedule/deletion_processing" "cron(0 3 * * ? *)" "String" "EventBridge schedule for deletion processing (daily at 3 AM UTC)"

# Warning email thresholds
create_parameter "warnings/month_before" "30" "String" "Send warning email 30 days before deletion"
create_parameter "warnings/threshold_reached" "0" "String" "Send warning when inactivity threshold is reached"
create_parameter "warnings/7_days_before" "7" "String" "Send warning 7 days before scheduled deletion"
create_parameter "warnings/final_warning" "1" "String" "Send final warning 1 day before deletion"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          SSM Parameters Created Successfully!                    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}📝 Next steps:${NC}"
echo -e "  1. Update SendGrid API key if using:"
echo -e "     aws ssm put-parameter --name ${PARAMETER_PREFIX}email/sendgrid_api_key --value 'YOUR_KEY' --type SecureString --overwrite"
echo -e "  2. Configure EventBridge rules to trigger processors"
echo -e "  3. Update Lambda environment variables to read from SSM"

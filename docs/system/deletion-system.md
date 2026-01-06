# Deletion System Documentation

## Overview

The Storytailor deletion system provides a comprehensive, tier-based approach to managing user data lifecycle, account inactivity, and cost optimization. It implements graceful deletion with email notifications, data export capabilities, and automated processing.

## Architecture

### Components

1. **DeletionService** (`packages/universal-agent/src/services/DeletionService.ts`)
   - Handles all deletion types: account, story, character, library member, conversation assets
   - Manages grace periods and scheduled deletions
   - Integrates with S3/Glacier for storage lifecycle

2. **InactivityMonitorService** (`packages/universal-agent/src/services/InactivityMonitorService.ts`)
   - Tracks user inactivity based on tier
   - Sends warning emails at configured thresholds
   - Updates user engagement tracking

3. **StorageLifecycleService** (`packages/universal-agent/src/services/StorageLifecycleService.ts`)
   - Manages S3 to Glacier tiering
   - Handles asset deletion and restoration
   - Calculates storage usage

4. **EmailService** (`packages/universal-agent/src/services/EmailService.ts`)
   - Dual email provider support (AWS SES + SendGrid fallback)
   - Integrates with EmailTemplateService for rendering
   - Tracks email engagement

5. **EmailTemplateService** (`packages/universal-agent/src/services/EmailTemplateService.ts`)
   - Loads and renders HTML email templates
   - Handles dynamic data substitution
   - Generates tracking pixels and click redirects

### Lambda Processors

1. **inactivity-processor** (`lambda-deployments/inactivity-processor/`)
   - Triggered by EventBridge (daily at 2 AM UTC)
   - Monitors user inactivity
   - Sends warning emails

2. **deletion-processor** (`lambda-deployments/deletion-processor/`)
   - Triggered by EventBridge (daily at 3 AM UTC)
   - Processes pending deletion requests
   - Executes scheduled deletions

## User Tiers

The system categorizes users into tiers with different inactivity thresholds:

| Tier | Description | Inactivity Threshold | Grace Period |
|------|-------------|---------------------|--------------|
| `free_never_paid` | Free users who never upgraded | 180 days | 30 days |
| `former_paid` | Users who paid but downgraded | 540 days | 30 days |
| `current_paid` | Active paid subscribers | N/A (no auto-deletion) | 30 days |
| `institutional` | Institutional/organization accounts | 720 days | 60 days |

## Deletion Types

### Account Deletion

- **Grace Period**: 30 days (configurable via SSM)
- **Process**:
  1. User requests deletion (immediate or scheduled)
  2. System creates deletion request with scheduled date
  3. Warning emails sent at: 30 days, 7 days, 1 day before deletion
  4. User can cancel anytime before scheduled date
  5. On scheduled date:
     - All stories, characters, and media assets deleted
     - Data archived to Glacier (if configured)
     - Account marked as deleted
     - Audit log entry created

### Story Deletion

- **Grace Period**: 7 days (configurable)
- **Process**:
  1. User requests story deletion
  2. Associated media assets (art, audio) scheduled for deletion
  3. Warning email sent
  4. User can cancel before scheduled date
  5. On scheduled date: story and assets deleted

### Character Deletion

- **Grace Period**: 7 days (configurable)
- **Options**:
  - `deleteStories`: Delete all stories featuring the character
  - `removeFromStories`: Remove character from stories but keep stories
- **Process**: Similar to story deletion

### Library Member Removal

- **Immediate**: No grace period
- **Process**: Removes user from library, preserves their data

### Conversation Assets

- **Immediate**: No grace period
- **Process**: Cleans up temporary assets (art, audio) from conversations

## Email Templates

All email templates are located in `packages/universal-agent/src/templates/emails/`:

1. **inactivity-warning-month-before.html** - Sent 30 days before threshold
2. **inactivity-warning-threshold.html** - Sent when threshold is reached
3. **inactivity-warning-7-days.html** - Sent 7 days before deletion
4. **inactivity-warning-final.html** - Final warning 1 day before deletion
5. **account-deletion-request.html** - Confirmation of deletion request
6. **account-deletion-reminders.html** - Reminder emails during grace period
7. **account-deletion-complete.html** - Confirmation of completed deletion
8. **account-hibernated.html** - Notification of account hibernation
9. **story-deletion-request.html** - Story deletion confirmation
10. **character-deletion-request.html** - Character deletion confirmation
11. **library-member-removed.html** - Library member removal notification

### Email Tracking

- **Open Tracking**: 1x1 pixel with tracking token
- **Click Tracking**: Redirect URLs with tracking token
- **Engagement Updates**: Updates `user_tiers.last_engagement_at` on open/click

## API Endpoints

All endpoints are under `/api/v1`:

### Account Deletion

- `POST /api/v1/account/delete` - Request account deletion
  - Body: `{ "immediate": boolean, "reason": string }`
- `POST /api/v1/account/delete/confirm` - Confirm immediate deletion
  - Body: `{ "token": string }`
- `POST /api/v1/account/delete/cancel` - Cancel deletion request
  - Body: `{ "requestId": string }`
- `GET /api/v1/account/export` - Export all user data

### Story Deletion

- `DELETE /api/v1/stories/:storyId` - Request story deletion
  - Body: `{ "immediate": boolean, "reason": string }`
- `POST /api/v1/stories/:storyId/delete/cancel` - Cancel story deletion
  - Body: `{ "requestId": string }`

### Character Deletion

- `DELETE /api/v1/characters/:characterId` - Request character deletion
  - Body: `{ "deleteStories": boolean, "removeFromStories": boolean }`

### Library Management

- `POST /api/v1/libraries/:libraryId/members/:userId/remove` - Remove library member

### Conversation Assets

- `POST /api/v1/conversations/:sessionId/assets/clear` - Clear conversation assets
  - Body: `{ "assetKeys": string[] }`

### Email Tracking

- `GET /api/v1/email/track?type=open&token=...&userId=...` - Track email open
- `GET /api/v1/email/track?type=click&token=...&userId=...&redirect=...` - Track email click

## Database Schema

### New Tables

1. **user_tiers** - User tier information and engagement tracking
2. **deletion_requests** - Pending deletion requests
3. **deletion_audit_log** - Anonymized audit log
4. **email_engagement_tracking** - Email open/click tracking
5. **hibernated_accounts** - Hibernated account information

### Modified Tables

- **users**: Added `subscription_tier`, `first_paid_at`, `hibernated_at`
- **media_assets**: Added `deleted_at`, `deletion_request_id`, `glacier_archive_id`

See `supabase/migrations/20250101000001_deletion_system.sql` for full schema.

## Configuration (SSM Parameters)

All configuration is stored in AWS Systems Manager Parameter Store under `/storytailor/deletion/`:

### Inactivity Thresholds
- `inactivity/free_user_threshold` - Days (default: 180)
- `inactivity/former_paid_threshold` - Days (default: 540)
- `inactivity/institutional_threshold` - Days (default: 720)

### Grace Periods
- `grace_period/account_deletion` - Days (default: 30)
- `grace_period/story_deletion` - Days (default: 7)
- `grace_period/character_deletion` - Days (default: 7)

### Email Configuration
- `email/from_address` - Default from address
- `email/ses_region` - AWS SES region
- `email/sendgrid_api_key` - SendGrid API key (SecureString)

### Storage Configuration
- `storage/glacier_vault_name` - Glacier vault name
- `storage/s3_bucket` - S3 bucket name
- `storage/glacier_tier` - Retrieval tier (Standard/Expedited/Bulk)

### Hibernation
- `hibernation/enabled` - Enable/disable hibernation
- `hibernation/restore_days` - Days to keep hibernated accounts

### Schedules
- `schedule/inactivity_check` - Cron expression (default: `cron(0 2 * * ? *)`)
- `schedule/deletion_processing` - Cron expression (default: `cron(0 3 * * ? *)`)

### Warning Thresholds
- `warnings/month_before` - Days before deletion (default: 30)
- `warnings/threshold_reached` - Send when threshold reached (default: 0)
- `warnings/7_days_before` - Days before deletion (default: 7)
- `warnings/final_warning` - Days before deletion (default: 1)

## Deployment

### 1. Database Migration

```bash
# Apply migration to Supabase
supabase migration up
```

### 2. Deploy Lambda Processors

```bash
./scripts/deploy-deletion-processors.sh
```

### 3. Setup SSM Parameters

```bash
./scripts/setup-deletion-ssm-parameters.sh
```

### 4. Configure EventBridge Rules

Create EventBridge rules to trigger processors:

```bash
# Inactivity processor (daily at 2 AM UTC)
aws events put-rule \
  --name storytailor-inactivity-check \
  --schedule-expression "cron(0 2 * * ? *)" \
  --state ENABLED

aws events put-targets \
  --rule storytailor-inactivity-check \
  --targets "Id=1,Arn=arn:aws:lambda:REGION:ACCOUNT:function:storytailor-inactivity-processor-production"

# Deletion processor (daily at 3 AM UTC)
aws events put-rule \
  --name storytailor-deletion-processing \
  --schedule-expression "cron(0 3 * * ? *)" \
  --state ENABLED

aws events put-targets \
  --rule storytailor-deletion-processing \
  --targets "Id=1,Arn=arn:aws:lambda:REGION:ACCOUNT:function:storytailor-deletion-processor-production"
```

## Testing

Run the comprehensive deletion system test suite:

```bash
./scripts/test-deletion-system-production.sh
```

The test suite covers:
- All API endpoints
- Lambda processor functionality
- Error handling
- Response validation

## Cost Optimization

### Hibernation

Accounts that haven't been accessed for extended periods can be hibernated:
- Data archived to Glacier
- Reduced storage costs
- Can be restored within configured period

### Storage Lifecycle

- Active assets: S3 Standard
- Inactive assets (>90 days): S3 Glacier
- Deleted assets: Removed after grace period

## Security & Compliance

### Data Privacy

- All deletion operations are logged in `deletion_audit_log` (anonymized)
- RLS policies ensure data isolation
- Email tracking respects user privacy

### GDPR Compliance

- Right to deletion: Full account deletion
- Right to data export: `/api/v1/account/export` endpoint
- Consent management: Email opt-out support

### COPPA Compliance

- Parental consent required for accounts
- Enhanced data protection for children's accounts
- Extended grace periods for family accounts

## Monitoring

### CloudWatch Metrics

- `DeletionRequestsCreated` - Number of deletion requests
- `DeletionsProcessed` - Number of deletions executed
- `InactivityWarningsSent` - Number of warning emails sent
- `StorageArchived` - Amount of data archived to Glacier

### CloudWatch Alarms

- High deletion request rate
- Processor failures
- Storage usage thresholds

## Troubleshooting

### Common Issues

1. **Processors not triggering**
   - Check EventBridge rule configuration
   - Verify Lambda permissions
   - Check CloudWatch logs

2. **Emails not sending**
   - Verify SES/SendGrid configuration
   - Check email service credentials in SSM
   - Review email service logs

3. **Deletions not processing**
   - Verify database migration applied
   - Check deletion_requests table
   - Review processor logs

## Support

For issues or questions:
- Check CloudWatch logs for processors
- Review deletion_audit_log for deletion history
- Verify SSM parameters for configuration

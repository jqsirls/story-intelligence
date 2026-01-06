# Supabase Database Schema

This directory contains the database migrations and schema for the Alexa Multi-Agent System, designed with COPPA/GDPR compliance and comprehensive data retention policies.

## Migration Files

- `20240101000000_initial_schema.sql` - Initial database schema with core tables
- `20240101000001_rls_policies.sql` - Row-level security policies
- `20240101000002_enhanced_schema_and_policies.sql` - Enhanced schema with COPPA compliance and data retention
- `test_enhanced_schema.sql` - Test script to verify schema functionality

## Core Tables

### Users and Authentication
- `users` - User profiles with COPPA protection flags
- `alexa_user_mappings` - Links Alexa Person IDs to Supabase users
- `voice_codes` - Temporary codes for voice-based account verification
- `user_preferences` - User settings for voice, accessibility, content, and privacy

### Content Management
- `libraries` - Story collections with hierarchical permissions
- `library_permissions` - Role-based access control (Owner, Admin, Editor, Viewer)
- `stories` - Story content with draft/final status tracking
- `characters` - Character definitions linked to stories
- `media_assets` - Generated assets (audio, images, PDFs, activities)

### Interaction Tracking
- `story_interactions` - User engagement tracking for analytics
- `emotions` - Mood tracking with 365-day TTL
- `audio_transcripts` - Voice interaction transcripts with 30-day TTL
- `conversation_states` - Session state management with 24-hour TTL

### Commerce and Compliance
- `subscriptions` - Stripe subscription management
- `audit_log` - Comprehensive audit trail with PII hashing
- `data_retention_policies` - Configurable data retention rules

## Key Features

### COPPA Compliance
- Automatic COPPA protection flag for users under 13
- Parent consent verification requirements
- Enhanced permission checks for protected users
- Trigger validation before content creation

### Data Retention
- Automatic 30-day deletion of audio transcripts
- 365-day TTL for emotional data with anonymization
- Configurable retention policies per table
- Automated cleanup functions

### Security Features
- Row-level security (RLS) on all tables
- PII hashing in audit logs (SHA-256)
- Enhanced permission checking with COPPA validation
- Comprehensive audit logging with correlation IDs

### GDPR Compliance
- Complete user data export functionality
- Secure user data deletion with confirmation
- Anonymization of audit logs instead of deletion
- Privacy-preserving data retention policies

## Database Functions

### Permission Management
```sql
-- Check library permissions with COPPA compliance
SELECT check_library_permission_with_coppa('library-id', 'Editor');

-- Basic permission check
SELECT check_library_permission('library-id', 'Viewer');

-- COPPA compliance check
SELECT check_coppa_compliance('user-id', 'library-id');
```

### Audit Logging
```sql
-- Enhanced audit logging with PII hashing
SELECT log_audit_event_enhanced(
  'ContentAgent',
  'story_created',
  '{"story_id": "123", "title": "My Story"}'::jsonb,
  'session_123',
  'correlation_456'
);
```

### Data Management
```sql
-- Export user data (GDPR Article 15)
SELECT export_user_data('user-id');

-- Delete user data (GDPR Article 17)
SELECT delete_user_data('user-id', 'confirmation-token');

-- Run data retention cleanup
SELECT * FROM cleanup_expired_data_enhanced();
```

## Row-Level Security Policies

All tables have RLS enabled with policies that ensure:
- Users can only access their own data
- Library permissions are properly enforced
- COPPA-protected users have additional restrictions
- Audit logs maintain proper access controls

## Triggers

### COPPA Protection
- Automatically sets `is_coppa_protected` flag for users under 13
- Validates parent consent before content creation in sub-libraries

### Data Validation
- Ensures data integrity across related tables
- Validates business rules at the database level

## Performance Optimizations

### Indexes
- Comprehensive indexing on frequently queried columns
- Partial indexes for conditional queries (e.g., COPPA-protected users)
- Composite indexes for complex queries

### Query Optimization
- Efficient RLS policies to minimize performance impact
- Optimized functions using SECURITY DEFINER
- Proper use of JSONB for flexible schema requirements

## Development Workflow

### Running Migrations
```bash
# Apply all migrations
supabase db reset

# Apply specific migration
supabase migration up --target 20240101000002

# Test schema
supabase db test --file test_enhanced_schema.sql
```

### Local Development
```bash
# Start local Supabase
supabase start

# Generate TypeScript types
supabase gen types typescript --local > types/database.ts

# Run tests
supabase test db
```

## Monitoring and Maintenance

### Scheduled Jobs
The following jobs should be scheduled in production:
```sql
-- Daily cleanup of expired data
SELECT cron.schedule('cleanup-expired-data', '0 2 * * *', 'SELECT cleanup_expired_data_enhanced();');

-- Weekly audit log anonymization
SELECT cron.schedule('anonymize-old-audits', '0 3 * * 0', 'UPDATE audit_log SET payload = jsonb_build_object(''anonymized'', true) WHERE created_at < NOW() - INTERVAL ''2 years'';');
```

### Health Checks
```sql
-- Check data retention policy compliance
SELECT table_name, last_cleanup_at, 
       CASE WHEN last_cleanup_at < NOW() - INTERVAL '25 hours' 
            THEN 'OVERDUE' ELSE 'OK' END as status
FROM data_retention_policies WHERE is_active = true;

-- Monitor COPPA compliance
SELECT COUNT(*) as coppa_protected_users,
       COUNT(*) FILTER (WHERE parent_consent_verified) as with_consent
FROM users WHERE is_coppa_protected = true;
```

## Compliance Notes

### COPPA Requirements
- Users under 13 are automatically flagged as COPPA-protected
- Parent consent is required before content creation in sub-libraries
- Enhanced audit logging tracks all interactions with protected users

### GDPR Requirements
- Complete data export functionality (Article 15)
- Secure data deletion with confirmation (Article 17)
- Data retention policies with automatic cleanup
- PII hashing in audit logs for privacy protection

### Security Best Practices
- All sensitive data is properly encrypted
- PII is hashed using SHA-256 in audit logs
- Row-level security prevents unauthorized access
- Comprehensive audit trail for compliance reporting

## Troubleshooting

### Common Issues
1. **RLS Policy Violations**: Check user permissions and COPPA compliance
2. **Function Execution Errors**: Verify user has proper role assignments
3. **Data Retention Issues**: Check cleanup job execution and policy configuration
4. **Local Auth SMS warning**: If you see `WARN: no SMS provider is enabled. Disabling phone login` during `supabase start`, it is local-only. In this repo, phone signups are disabled locally via `supabase/config.toml` (`[auth.sms] enable_signup = false`). If you need phone OTP locally, enable an SMS provider (e.g. Twilio) and provide credentials via local-only env (do not commit).

### Debug Queries
```sql
-- Check user permissions for a library
SELECT l.name, lp.role, u.email
FROM libraries l
LEFT JOIN library_permissions lp ON l.id = lp.library_id
LEFT JOIN users u ON lp.user_id = u.id
WHERE l.id = 'library-id';

-- Verify COPPA compliance status
SELECT id, email, age, is_coppa_protected, parent_consent_verified
FROM users WHERE is_coppa_protected = true;

-- Check data retention policy status
SELECT * FROM data_retention_policies WHERE is_active = true;
```
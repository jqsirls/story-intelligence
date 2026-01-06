Status: Draft  
Audience: Internal | Partner | Auditor  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 7 - Supabase integration documentation with privacy statement

# Supabase Integration

## Overview

Supabase provides the primary database (PostgreSQL) and authentication services for Storytailor. All user data, stories, characters, and system state are stored in Supabase with Row Level Security (RLS) enabled.

**SSM Parameters:** `/storytailor-{ENV}/supabase/url`, `/storytailor-{ENV}/supabase/service-key`, `/storytailor-{ENV}/supabase/anon-key`
**Status:** ✅ Active

**Code References:**
- `supabase/migrations/` - 26+ migration files
- `docs/system/inventory.md:155-167` - Database status
- `docs/system/database_schema_inventory.md:1-343` - Complete schema inventory

## Database Schema

### Core Tables

**User Tables:**
- `users` - User accounts with COPPA protection flags
- `parental_consents` - Parental consent records
- `age_verification_records` - Age verification records

**Content Tables:**
- `stories` - Story content
- `characters` - Character data
- `libraries` - Story libraries
- `media_assets` - Audio, image, PDF assets

**Code References:**
- `supabase/migrations/20240101000000_initial_schema.sql:6-56` - Core tables
- `docs/system/database_schema_inventory.md:24-343` - Complete table inventory

### Row Level Security (RLS)

**RLS Enabled:**
- All tables have RLS policies enabled
- User-based access control
- COPPA-protected user restrictions

**Code References:**
- `supabase/migrations/20240101000001_rls_policies.sql` - RLS policies
- `supabase/migrations/20240101000000_initial_schema.sql:154-166` - RLS enablement

**Code Location:** `supabase/migrations/20240101000001_rls_policies.sql`

## Authentication

### Supabase Auth

**Features:**
- User authentication
- Email verification
- Password reset
- OAuth providers

**Code References:**
- `packages/auth-agent/src/auth-agent.ts:31-848` - Auth Agent
- `packages/universal-agent/src/api/RESTAPIGateway.ts` - Auth routes

## Data Retention

### Automated Retention Policies

**Retention Periods:**
- Audio transcripts: 30 days (hard delete)
- Emotions: 365 days (anonymize)
- Voice codes: 1 day (hard delete)
- Conversation states: 24 hours (hard delete)
- Audit logs: 7 years (anonymize)

**Code References:**
- `supabase/migrations/20240101000002_enhanced_schema_and_policies.sql:133-139` - Retention policies
- `supabase/migrations/20240101000001_rls_policies.sql:150-157` - Cleanup functions

**Code Location:** `supabase/migrations/20240101000002_enhanced_schema_and_policies.sql:133-139`

## TAG: PRIVACY

### Child-Identifying Data Flow

**Data Stored in Supabase:**
- **User Accounts**: User IDs, emails, ages, parent emails
- **Story Content**: Stories created by children
- **Character Data**: Characters created by children
- **Emotional Data**: Emotion tracking data
- **Audio Transcripts**: Voice conversation transcripts (30-day retention)
- **Conversation States**: Conversation session data (24-hour retention)
- **Parental Consents**: Parent consent records
- **Safety Incidents**: Safety incident logs (content hashed, not raw text)

**Data Protection Measures:**
1. **Row Level Security (RLS)**: All tables protected by RLS policies
2. **Encryption at Rest**: Supabase provides encryption at rest
3. **Encrypted Transmission**: All database connections use SSL/TLS
4. **Data Retention**: Automated retention policies for all data types
5. **COPPA Protection**: Automatic COPPA protection flags for users under 13
6. **Parental Consent**: Parent consent required for children under 13
7. **Access Control**: Service role key used only for server-side operations
8. **Anonymization**: Emotional data anonymized after 365 days (not deleted)
9. **Content Hashing**: Safety incidents store content hashes, not raw text

**Code References:**
- `supabase/migrations/20240101000001_rls_policies.sql` - RLS policies
- `supabase/migrations/20240101000002_enhanced_schema_and_policies.sql:133-139` - Retention policies
- `packages/security-framework/src/privacy/PrivacyAuditService.ts:148-152` - COPPA compliance rules

**Compliance Status:**
- ✅ **COPPA Compliant**: RLS policies, parental consent, data retention
- ✅ **GDPR Compliant**: Data retention, right to erasure, encryption
- ✅ **Data Minimization**: Only necessary data stored

**Privacy Risk Assessment:**
- **Risk Level**: Low (data stored securely with RLS and encryption)
- **Mitigation**: RLS policies, encryption, retention policies, parental consent
- **Parental Consent**: Required for children under 13

## Configuration

### SSM Parameters

**Required Parameters:**
- `/storytailor-{ENV}/supabase/url` - Supabase project URL
- `/storytailor-{ENV}/supabase/service-key` - Supabase service role key (SecureString)
- `/storytailor-{ENV}/supabase/anon-key` - Supabase anonymous key (SecureString)

**Code References:**
- `docs/system/ssm_parameters_inventory.md:24-50` - SSM parameter inventory

### Database Connection

**Connection String:**
- Supabase URL: `https://lendybmmnlqelrhkhdyc.supabase.co`
- SSL/TLS: Required
- Connection pooling: Supported

**Code References:**
- `packages/universal-agent/src/UniversalStorytellerAPI.ts:68-863` - Database connection

## Related Documentation

- **Database Schema:** See [Database Schema Inventory](../system/database_schema_inventory.md)
- **Compliance:** See [Compliance Documentation](../compliance/README.md)

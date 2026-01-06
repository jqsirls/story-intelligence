# Complete Deployment Guide

**Last Updated**: December 26, 2025  
**Status**: Production Ready

---

## Overview

This guide covers deployment of the Storytailor Multi-Agent System to production, including Universal Agent Lambda, database migrations, and verification procedures.

---

## Universal Agent Lambda Deployment

### Prerequisites

1. **AWS Credentials**: Configured with appropriate permissions
2. **SSM Parameters**: All required parameters set in AWS SSM Parameter Store
3. **Dependencies Built**: All workspace packages built (`npm run build`)

### Deployment Steps

#### 1. Build Dependencies

The Universal Agent depends on multiple workspace packages. Build them in order:

```bash
# Build shared types first
cd packages/shared-types && npm run build && cd ../..

# Build voice synthesis (required for WebVTT)
cd packages/voice-synthesis && npm run build && cd ../..

# Build router (required for routing)
cd packages/router && npm run build && cd ../..

# Build universal agent
cd packages/universal-agent && npm run build && cd ../..
```

#### 2. Deploy Universal Agent

Use the dedicated deployment script:

```bash
./scripts/deploy-universal-agent-proper.sh [environment]
```

**What the script does**:
- Builds all dependencies in correct order
- Bundles workspace packages into deployment package
- Removes `dist/router/package.json` to prevent module resolution issues
- Uploads to S3
- Updates Lambda function
- Verifies deployment

#### 3. Verify Deployment

```bash
# Health check
curl https://api.storytailor.dev/health

# Expected response:
# {"status":"healthy","service":"universal-agent","initialized":false,"timestamp":"..."}
```

### Module Bundling Gotchas

**Router Module Resolution**:
- Router is bundled to both `node_modules/@alexa-multi-agent/router` AND `dist/router/`
- **CRITICAL**: `dist/router/package.json` is REMOVED to prevent Node.js from treating it as a package during direct file requires
- Router's `package.json` only exists in `node_modules/@alexa-multi-agent/router/package.json`

**Voice Synthesis Bundling**:
- Voice synthesis is bundled to `node_modules/@alexa-multi-agent/voice-synthesis/dist/`
- Also copied to `dist/voice-synthesis/` as fallback for direct require paths
- WebVTTService uses multiple loading strategies (package → direct path → source)

**Workspace Dependencies**:
- All workspace packages must be built BEFORE universal-agent
- Dependencies are copied into deployment package's `node_modules/`
- Each bundled package gets a `package.json` with correct `main` field

### Environment Variables (SSM Parameters)

The deployment script reads from SSM Parameter Store:

**Required Parameters**:
- `/{prefix}/supabase/url` or `/{prefix}/supabase-url`
- `/{prefix}/supabase/service-key` or `/{prefix}/supabase-service-key`
- `/{prefix}/supabase/anon-key` or `/{prefix}/supabase-anon-key`
- `/{prefix}/redis-url` or `/{prefix}/redis/url`
- `/{prefix}/openai-api-key`
- `/{prefix}/elevenlabs-api-key`
- `/{prefix}/stripe-secret-key`
- `/{prefix}/a2a-base-url`
- `/{prefix}/api-base-url`

**Prefix**: `storytailor-production` or `storytailor-staging`

### Common Deployment Issues

**"Cannot find module '@alexa-multi-agent/router'"**:
- Check that router was built: `cd packages/router && npm run build`
- Verify `dist/router/package.json` is removed (deployment script does this)
- Check that router files exist in `node_modules/@alexa-multi-agent/router/dist/`

**Voice Synthesis Not Available**:
- Verify voice-synthesis was built: `cd packages/voice-synthesis && npm run build`
- Check that files exist in deployment package
- Review WebVTTService logs for initialization errors

**Module Resolution Errors**:
- Ensure `package.json` files have correct `main` field pointing to `dist/` files
- Check that `type: "commonjs"` is set in bundled package.json files
- Verify no conflicting `package.json` files in `dist/` directories used for direct requires

---

## Database Migration Deployment

### Prerequisites

1. **Supabase Access**: Admin access to Supabase project
2. **Migration Files**: All migrations in `supabase/migrations/`
3. **Backup**: Database backup before applying migrations

### Migration Process

#### 1. Review Migrations

All migrations are in `supabase/migrations/` with timestamped filenames:

```
20251226000000_adult_only_registration.sql
20251226000001_storytailor_id_enhancement.sql
20251226000002_library_consent.sql
20251226000003_migrate_existing_libraries.sql
20251226000004_cleanup_age_triggers.sql
20251226000005_fix_story_id_constraint.sql
```

#### 2. Apply Migrations

**Option A: Via Supabase Studio** (Recommended for Production)

1. Go to Supabase Dashboard → SQL Editor
2. Open each migration file
3. Copy SQL content
4. Paste into SQL Editor
5. Execute
6. Verify success

**Option B: Via Supabase CLI** (For Local Development)

```bash
# Apply all pending migrations
supabase db push

# Or apply specific migration
supabase migration up <migration_name>
```

#### 3. Verify Migrations

```sql
-- Check migration history
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;

-- Verify schema changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('country', 'locale', 'is_minor');
```

### Migration Best Practices

1. **Always Backup First**: Create database backup before applying migrations
2. **Test in Staging**: Apply migrations to staging first
3. **Verify Idempotency**: Migrations should be safe to run multiple times
4. **Check Dependencies**: Ensure no RLS policies, triggers, or functions depend on columns being dropped
5. **Monitor Performance**: Large migrations may impact database performance

### Troubleshooting Migrations

**Error: "cannot drop column X because other objects depend on it"**:
- Find dependent objects: `SELECT * FROM pg_depend WHERE refobjid = 'users'::regclass;`
- Drop dependencies first (RLS policies, triggers, functions)
- Then drop column

**Error: "constraint X already exists"**:
- Use `DROP CONSTRAINT IF EXISTS` before creating
- Or use `IF NOT EXISTS` when creating

**Error: "column X does not exist"**:
- Check if migration was already applied
- Verify column name spelling
- Check if column was renamed in previous migration

---

## Production Verification Checklist

### Pre-Deployment

- [ ] All tests passing (`npm run test`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Database migrations reviewed and tested in staging
- [ ] SSM parameters updated with correct values
- [ ] Environment variables verified

### Deployment

- [ ] Universal Agent Lambda deployed successfully
- [ ] Database migrations applied successfully
- [ ] Health check endpoint responding
- [ ] No errors in CloudWatch logs

### Post-Deployment

- [ ] API endpoints responding correctly
- [ ] Authentication working (login, register, profile)
- [ ] Story CRUD operations working
- [ ] Character CRUD operations working
- [ ] Storytailor ID endpoints working
- [ ] Real-time features working (SSE, WebVTT)
- [ ] Error handling working correctly
- [ ] Rate limiting working correctly

### Health Check

```bash
# Basic health check
curl https://api.storytailor.dev/health

# Expected: {"status":"healthy","service":"universal-agent",...}

# Test authentication
curl -X POST https://api.storytailor.dev/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test protected endpoint
curl -X GET https://api.storytailor.dev/api/v1/auth/me \
  -H "Authorization: Bearer <token>"
```

---

## Rollback Procedures

### Lambda Rollback

1. **Find Previous Version**:
   ```bash
   aws lambda list-versions-by-function \
     --function-name storytailor-universal-agent-production
   ```

2. **Update Alias to Previous Version**:
   ```bash
   aws lambda update-alias \
     --function-name storytailor-universal-agent-production \
     --name production \
     --function-version <previous-version>
   ```

3. **Or Redeploy Previous Code**:
   ```bash
   git checkout <previous-commit>
   ./scripts/deploy-universal-agent-proper.sh production
   ```

### Database Rollback

**⚠️ WARNING**: Database rollbacks are complex and may cause data loss.

1. **Restore from Backup** (Safest):
   - Use Supabase dashboard to restore from backup
   - Or use `pg_restore` if you have backup file

2. **Reverse Migration** (If migration is reversible):
   - Create reverse migration SQL
   - Apply reverse migration
   - Verify data integrity

3. **Manual Fix** (Last resort):
   - Manually fix schema issues
   - Update data as needed
   - Document changes

---

## Monitoring & Health Checks

### CloudWatch Metrics

Monitor these metrics:
- Lambda invocations
- Lambda errors
- Lambda duration
- Lambda throttles
- API Gateway 4xx/5xx errors

### Health Check Endpoint

**Endpoint**: `GET /health`

**Response**:
```json
{
  "status": "healthy",
  "service": "universal-agent",
  "initialized": false,
  "timestamp": "2025-12-26T20:15:48.381Z"
}
```

**Monitoring**:
- Set up CloudWatch alarm for health check failures
- Alert if status != "healthy"
- Alert if endpoint returns 5xx

### Log Monitoring

**Key Log Patterns to Monitor**:
- `ERROR` - Any error logs
- `Failed to` - Operation failures
- `Cannot find module` - Module resolution issues
- `Timeout` - Request timeouts
- `Rate limit` - Rate limiting issues

---

## Deployment Checklist Summary

### Before Deployment
- [ ] Code reviewed and approved
- [ ] Tests passing
- [ ] Migrations reviewed
- [ ] SSM parameters updated
- [ ] Backup created

### During Deployment
- [ ] Dependencies built
- [ ] Lambda deployed
- [ ] Migrations applied
- [ ] Health check passing

### After Deployment
- [ ] API endpoints tested
- [ ] Critical flows tested
- [ ] Monitoring verified
- [ ] Team notified

---

## Related Documentation

- [API Status](../api/API_STATUS.md) - Complete API endpoint inventory
- [Testing Guide](../testing/COMPLETE_TESTING_GUIDE.md) - How to test deployments
- [Migration Guide](../database/MIGRATION_GUIDE.md) - Database migration details
- [AGENTS.md](../../AGENTS.md) - Multi-agent system architecture

---

**Last Updated**: December 26, 2025  
**Maintained By**: Engineering Team


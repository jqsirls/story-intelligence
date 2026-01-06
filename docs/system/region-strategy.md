# AWS Region Strategy

**Status:** Official Documentation  
**Last Updated:** December 13, 2025  
**Audience:** Engineering | DevOps | Infrastructure

## 🎯 Primary Production Region

**Region:** `us-east-1` (US East - N. Virginia)

**This is the SINGLE SOURCE OF TRUTH for all production deployments.**

---

## 📋 Region Policy

### Production Environment

**ALL production resources MUST be deployed to `us-east-1`:**

- ✅ **Lambda Functions** - All production Lambda functions
- ✅ **EventBridge Rules** - All scheduled and event-driven rules
- ✅ **S3 Buckets** - Primary buckets for assets, deployments, backups
- ✅ **CloudWatch Logs** - All log groups
- ✅ **IAM Roles** - Execution roles for Lambda functions
- ✅ **API Gateway** - All API endpoints (if used)
- ✅ **VPC Resources** - VPCs, subnets, security groups (if used)

### Staging Environment

**ALL staging resources SHOULD be deployed to `us-east-1`** (for consistency and easier testing)

### Development Environment

**ALL development resources SHOULD be deployed to `us-east-1`** (for consistency)

---

## 🌍 Global Services (No Region)

These services are global and don't require region specification:

- ✅ **SSM Parameter Store** - Global service, accessible from any region
- ✅ **Route 53** - Global DNS service
- ✅ **CloudFront** - Global CDN
- ✅ **IAM** - Global identity and access management
- ✅ **SES** - Email service (configured per region, but can be accessed globally)

**Note:** While SSM is global, parameters are typically accessed from the same region as the Lambda function for performance.

---

## 📊 Current Production Resources

### Lambda Functions in us-east-1

**Core Functions (Primary Entry Points):**
- `storytailor-router-production` - Intent routing and delegation
- `storytailor-universal-agent-production` - Core REST API
- `storytailor-commerce-agent-production` - Payments and subscriptions
- `storytailor-library-agent-production` - Library management

**Agent Functions:**
- `storytailor-conversation-agent-production`
- `storytailor-content-production`
- `storytailor-auth-agent-production`
- `storytailor-emotion-agent-production`
- `storytailor-character-agent-production`
- `storytailor-educational-agent-production`
- `storytailor-therapeutic-agent-production`
- `storytailor-voice-synthesis-agent-production`
- `storytailor-accessibility-agent-production`
- `storytailor-child-safety-agent-production`
- `storytailor-security-framework-production`
- `storytailor-health-monitoring-agent-production`
- `storytailor-localization-agent-production`
- `storytailor-idp-agent-production`
- `storytailor-event-system-production`
- And 15+ more production functions

**Processor Functions:**
- ✅ `storytailor-inactivity-processor-production` - **IN us-east-1** (migrated December 13, 2025)
- ✅ `storytailor-deletion-processor-production` - **IN us-east-1** (migrated December 13, 2025)

### EventBridge Rules in us-east-1

**Scheduled Rules:**
- ✅ `storytailor-inactivity-check` - **IN us-east-1** (migrated December 13, 2025)
  - Schedule: `cron(0 2 * * ? *)` (Daily at 2 AM UTC)
  - Target: `storytailor-inactivity-processor-production`
- ✅ `storytailor-deletion-processing` - **IN us-east-1** (migrated December 13, 2025)
  - Schedule: `cron(0 3 * * ? *)` (Daily at 3 AM UTC)
  - Target: `storytailor-deletion-processor-production`

### S3 Buckets in us-east-1

- `storytailor-assets-production-326181217496` - Media assets
- `storytailor-audio` - Audio files
- `storytailor-audio-326181217496` - Audio files (backup)
- `storytailor-backups-326181217496` - System backups
- `storytailor-cdn-logs` - CloudFront logs
- `storytailor-lambda-deploys-us-east-1` - Deployment artifacts

---

## ✅ Migration Status

### Region Consolidation Complete (December 13, 2025)

**Status:** ✅ **100% COMPLETE**

All production resources have been migrated from `us-east-2` to `us-east-1`:

- ✅ **Processors:** Both inactivity and deletion processors migrated
- ✅ **EventBridge Rules:** All scheduled rules migrated
- ✅ **Handler Paths:** Corrected to `dist/index.handler`
- ✅ **Database Relationships:** Fixed with proper foreign key constraints
- ✅ **Environment Variables:** Configured from SSM Parameter Store
- ✅ **Testing:** Both processors verified working

**Legacy Resources:**
- ✅ **us-east-2:** 0 production functions remaining
- ⚠️ **us-east-2:** 29 staging functions (duplicates, can be cleaned up)

### Cost Optimization

- ✅ **Production:** All resources consolidated to us-east-1
- ✅ **No Duplicates:** 0 duplicate production functions
- ⚠️ **Staging:** 29 staging functions in us-east-2 (low-cost, optional cleanup)

---

## ✅ Deployment Scripts

All deployment scripts default to `us-east-1`:

- ✅ `scripts/deploy-universal-agent-proper.sh` - `AWS_REGION=${AWS_REGION:-us-east-1}`
- ✅ `scripts/deploy-commerce-agent-proper.sh` - `AWS_REGION=${AWS_REGION:-us-east-1}`
- ✅ `scripts/deploy-library-agent-proper.sh` - `AWS_REGION=${AWS_REGION:-us-east-1}`
- ✅ `scripts/configure-eventbridge-deletion.sh` - `REGION="us-east-1"`

---

## 📝 Documentation Standards

### When Documenting Regions:

1. **Always specify `us-east-1` for production**
2. **Never use `us-east-2` unless explicitly documenting legacy/duplicate resources**
3. **Include region in all deployment documentation**
4. **Verify region against actual AWS resources before documenting**

### Files That Must Specify Region:

- Deployment scripts
- Architecture diagrams
- Infrastructure documentation
- Agent location documentation (`docs/agents/*/where.md`)
- System documentation (`docs/system/*.md`)

---

## 🔍 Verification

To verify a resource is in the correct region:

```bash
# Lambda function
aws lambda get-function --function-name <name> --query 'Configuration.FunctionArn' --output text | awk -F: '{print $4}'

# EventBridge rule
aws events describe-rule --name <name> --query 'Arn' --output text | awk -F: '{print $4}'

# S3 bucket
aws s3api get-bucket-location --bucket <name> --output text
```

---

## 📚 Related Documentation

- [Comprehensive Region Audit and Strategy](./COMPREHENSIVE_REGION_AUDIT_AND_STRATEGY.md) - Full audit and migration plan
- `PRODUCTION_REGION_CONFIRMED.md` - Initial region confirmation
- `docs/system/deployment_inventory.md` - All deployed functions
- `docs/system/architecture.md` - System architecture

---

## 📚 Related Documentation

- `docs/system/region_migration_complete.md` - Complete migration details (December 13, 2025)
- `REGION_CONSOLIDATION_COMPLETE.md` - Migration completion report
- `docs/system/deployment_inventory.md` - Deployment inventory
- `docs/system/architecture.md` - System architecture

---

**Status:** ✅ **OFFICIAL DOCUMENTATION**

**This document is the SINGLE SOURCE OF TRUTH for region strategy.**

**Last Updated:** December 13, 2025  
**Migration Status:** ✅ **100% COMPLETE** - All production resources in us-east-1


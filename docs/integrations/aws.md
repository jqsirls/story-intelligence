Status: Draft  
Audience: Internal | Partner | Auditor  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 7 - AWS services integration documentation with privacy statement

# AWS Services Integration

## Overview

Storytailor uses multiple AWS services for infrastructure, including Lambda functions, SSM Parameter Store, S3 storage, and EventBridge for event-driven communication.

**Code References:**
- `docs/system/inventory.md:140-154` - AWS services inventory
- `docs/system/deployment_inventory.md:24-80` - Lambda function inventory
- `docs/system/ssm_parameters_inventory.md:24-220` - SSM parameters inventory

## AWS Services Used

### AWS Lambda

**Purpose:** Serverless function execution
**Status:** ✅ Active

**Configuration:**
- 44 functions deployed
- Runtime: nodejs22.x (primary), nodejs20.x, nodejs18.x
- Memory: 256MB - 2048MB
- Timeout: 5s - 300s

**Code References:**
- `docs/system/deployment_inventory.md:24-80` - Lambda function inventory
- `docs/system/inventory.md:144` - Lambda status

### AWS SSM Parameter Store

**Purpose:** Secrets and configuration management
**Status:** ✅ Active

**Configuration:**
- 50+ parameters stored
- SecureString encryption for sensitive data
- Environment-based parameter paths

**Code References:**
- `docs/system/ssm_parameters_inventory.md:24-220` - SSM parameter inventory
- `docs/system/inventory.md:145` - SSM status

### AWS S3

**Purpose:** Asset storage, Lambda deployments
**Status:** ✅ Active

**Configuration:**
- `storytailor-lambda-deploys` bucket
- Asset storage for stories, images, audio

**Code References:**
- `docs/system/inventory.md:147` - S3 status
- `scripts/deploy-universal-agent-proper.sh:567-575` - S3 deployment

### AWS EventBridge

**Purpose:** Event-driven communication
**Status:** ⚠️ Unknown (may be used)

**Code References:**
- `packages/event-system/src/EventPublisher.ts:1-385` - Event publisher
- `docs/system/inventory.md:149` - EventBridge status

## TAG: PRIVACY

### Child-Identifying Data Flow

**Data Stored in AWS Services:**
- **Lambda Logs**: May contain user IDs, session IDs, story content (CloudWatch Logs)
- **SSM Parameters**: API keys, secrets (no user data)
- **S3 Buckets**: Story assets, images, audio files (may contain child-created content)
- **EventBridge Events**: Event data (may contain user IDs, session IDs)

**Data Protection Measures:**
1. **Encryption at Rest**: S3 buckets encrypted, SSM parameters encrypted
2. **Encryption in Transit**: All AWS API calls use HTTPS/TLS
3. **IAM Access Control**: Lambda functions use IAM roles with least privilege
4. **CloudWatch Log Retention**: Logs retained per retention policy (typically 30 days)
5. **S3 Access Control**: S3 buckets protected by IAM policies
6. **SSM Encryption**: All SecureString parameters encrypted with AWS KMS
7. **EventBridge Encryption**: Events encrypted in transit and at rest

**Code References:**
- `docs/system/inventory.md:140-154` - AWS services
- `docs/system/deployment_inventory.md:24-80` - Lambda configuration

**Compliance Status:**
- ✅ **COPPA Compliant**: Encryption, access control, retention policies
- ✅ **GDPR Compliant**: Encryption, access control, data minimization
- ✅ **AWS Shared Responsibility**: Storytailor responsible for data protection, AWS provides infrastructure security

**Privacy Risk Assessment:**
- **Risk Level**: Low (AWS provides enterprise-grade security)
- **Mitigation**: Encryption, access control, retention policies, IAM roles
- **Parental Consent**: Required for children under 13 (data stored in AWS services)

## Configuration

### IAM Roles

**Lambda Execution Role:**
- `storytailor-lambda-role-{ENV}`
- Permissions for Lambda, SSM, S3, EventBridge

**Code References:**
- `docs/system/inventory.md:146` - IAM role
- `scripts/deploy-universal-agent-proper.sh:41` - Role creation

### SSM Parameters

**Parameter Paths:**
- `/storytailor-{ENV}/` - Environment-specific parameters
- SecureString encryption for sensitive data

**Code References:**
- `docs/system/ssm_parameters_inventory.md:24-220` - Parameter inventory

## Related Documentation

- **System Architecture:** See [System Architecture](../system/architecture.md)
- **Deployment Inventory:** See [Deployment Inventory](../system/deployment_inventory.md)
- **Compliance:** See [Compliance Documentation](../compliance/README.md)

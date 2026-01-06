Status: Draft  
Audience: Internal | Partner | Auditor  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 6 - COPPA compliance documentation verified against code and database

# COPPA Compliance

## Overview

Storytailor complies with the Children's Online Privacy Protection Act (COPPA) and its 2025 amendments. This document details all COPPA compliance measures implemented in the codebase and database.

**Regulatory Framework:** COPPA §312.2-312.6 (FTC Rule 16 CFR Part 312)

**Code References:**
- `docs/developer-docs/05_COMPLIANCE/01_PRIVACY_COMPLIANCE_VERIFICATION_REPORT.md:42-82` - COPPA verification
- `packages/universal-agent/src/middleware/AuthMiddleware.ts:83-108` - Parent consent middleware
- `supabase/migrations/20240101000000_initial_schema.sql:10` - Parent email requirement

## Age Threshold Protection

### Automatic COPPA Protection

**Implementation:** Users under 13 are automatically flagged as COPPA-protected.

**Code References:**
- `supabase/migrations/20240101000017_add_user_type_support.sql:76-78` - Database-level age check
- `packages/universal-agent/src/middleware/AuthMiddleware.ts:93` - `isCoppaProtected` check

**Database Schema:**
```sql
-- From migration 20240101000017_add_user_type_support.sql
IF p_age < 13 AND (p_parent_email IS NULL OR p_parent_email = '') THEN
  RAISE EXCEPTION 'Children under 13 require parent email for COPPA compliance';
END IF;
```

**Code Location:** `supabase/migrations/20240101000017_add_user_type_support.sql:76-78`

### User Registration

**Age Verification:**
- Age field required during registration
- Automatic `isCoppaProtected` flag set for users < 13
- Parent email required for under-13 users

**Code References:**
- `packages/auth-agent/src/auth-agent.ts:99-100` - Account linking with age verification
- `supabase/migrations/20240101000000_initial_schema.sql:10` - `parent_email` column

## Verifiable Parental Consent (VPC)

### COPPA §312.2 - Verifiable Parental Consent

**Status:** ⚠️ Implementation in progress (70% complete)

**Current Implementation:**
- Parent email collection required
- Consent request workflow exists
- Verification token system implemented

**Code References:**
- `privacy-compliance-solutions.md:13-63` - Multi-step parental verification system
- `packages/auth-agent/src/services/` - Age verification and parental control services
- `lambda-deployments/router/src/lambda.ts:834-924` - Consent HTTP handlers

**Database Schema:**
```sql
-- From PRIVACY_COMPLIANCE_SOLUTIONS.md:30-40
CREATE TABLE parental_consent_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_user_id UUID REFERENCES users NOT NULL,
  parent_email TEXT NOT NULL,
  verification_token TEXT NOT NULL,
  consent_scope JSONB NOT NULL,
  verification_method TEXT, -- 'email', 'sms', 'video_call', 'id_verification'
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);
```

**Code Location:** `privacy-compliance-solutions.md:30-40`

### Consent Workflow

**Router Endpoints:**
- `POST /v1/consent/request` - Create pending consent record
- `POST /v1/consent/verify` - Parent verification
- `POST /v1/consent/revoke` - Revoke consent
- `GET /v1/consent/status?user=<id>` - Get consent status

**Code References:**
- `lambda-deployments/router/src/lambda.ts:834-924` - Consent HTTP handlers
- `ROAD_TO_PRODUCTION_TODO.md:1034-1054` - VPC implementation status

### Parent Consent Middleware

**Implementation:** Middleware blocks under-13 requests without verified parent consent.

**Code References:**
- `packages/universal-agent/src/middleware/AuthMiddleware.ts:83-108` - `requireParentConsent()` middleware

**Code Location:** `packages/universal-agent/src/middleware/AuthMiddleware.ts:83-108`

```typescript
requireParentConsent = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  if (req.user.isCoppaProtected && !req.user.parentConsentVerified) {
    res.status(403).json({
      success: false,
      error: 'Parent consent required for this action',
      code: 'PARENT_CONSENT_REQUIRED',
      details: {
        isCoppaProtected: true,
        parentConsentVerified: false,
        message: 'This account requires parent consent before accessing this feature.'
      }
    });
    return;
  }
  next();
};
```

## Parental Rights (COPPA §312.4)

### Parental Dashboard

**Implementation:** Parental control service provides dashboard functionality.

**Code References:**
- `packages/auth-agent/src/services/ParentalControlService.ts` - Parental dashboard service
- `privacy-compliance-solutions.md:66-68` - Parental rights dashboard

### Parental Rights

**Rights Provided:**
- Access to child's data
- Deletion of child's data
- Consent withdrawal
- Account management

**Code References:**
- `packages/auth-agent/src/services/ParentalControlService.ts` - Parental controls implementation

## Data Minimization (COPPA §312.5)

### Purpose-Based Data Collection

**Implementation:** Data collection limited to necessary purposes for story creation and safety.

**Code References:**
- `packages/security-framework/src/privacy/PrivacyAuditService.ts:148-152` - COPPA compliance rules
- `privacy-compliance-implementation.md:32-50` - Consent records schema

**Database Schema:**
```sql
-- From PRIVACY_COMPLIANCE_IMPLEMENTATION.md:32-50
CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  purpose_id UUID REFERENCES data_purposes NOT NULL,
  consent_given BOOLEAN NOT NULL,
  consent_method TEXT NOT NULL,
  parent_consent BOOLEAN DEFAULT FALSE,
  consent_timestamp TIMESTAMPTZ DEFAULT NOW(),
  withdrawal_timestamp TIMESTAMPTZ,
  legal_basis TEXT NOT NULL
);
```

**Code Location:** `privacy-compliance-implementation.md:32-50`

### Data Retention for Children

**Enhanced Retention Policies:**
- Stricter retention periods for COPPA-protected users
- Automatic data cleanup with child-specific protections

**Code References:**
- `PRIVACY_COMPLIANCE_SOLUTIONS.md:92-95` - Enhanced cleanup with child protection
- `supabase/migrations/20240101000002_enhanced_schema_and_policies.sql:133-139` - Data retention policies

## Safe Harbor Programs (COPPA §312.6)

### PRIVO Certification

**Status:** Draft pack prepared (see [PRIVO Draft Pack](./privo-draft.md))

**Code References:**
- `docs/compliance/privo-draft.md` - PRIVO certification documentation

## Database-Level Enforcement

### Parent Email Requirement

**Database Constraint:** Children under 13 cannot register without parent email.

**Code References:**
- `supabase/migrations/20240101000017_add_user_type_support.sql:76-78` - Database-level enforcement
- `docs/developer-docs/05_COMPLIANCE/01_PRIVACY_COMPLIANCE_VERIFICATION_REPORT.md:73-81` - Database evidence

**Why This Matters:** Database-level enforcement prevents any application bug from bypassing this critical protection.

## Testing Evidence

### Age Verification Tests

**Test Case 1: Adult Registration (Age 35)**
```bash
curl -X POST https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/v1/auth/register \
  -d '{"age": 35, "userType": "parent", ...}'
# Result: ✅ "isCoppaProtected": false
```

**Test Case 2: Child Registration (Age 8)**
```bash
curl -X POST https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/v1/auth/register \
  -d '{"age": 8, "userType": "child", "parentEmail": "parent@example.com", ...}'
# Result: ✅ "isCoppaProtected": true
```

**Test Case 3: Child Without Parent Email**
```bash
curl -X POST https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/v1/auth/register \
  -d '{"age": 10, "userType": "child"}'
# Result: ✅ Error: "parentEmail is required"
```

**Code References:**
- `docs/developer-docs/05_COMPLIANCE/01_PRIVACY_COMPLIANCE_VERIFICATION_REPORT.md:48-79` - Testing evidence

## Compliance Status Summary

| COPPA Requirement | Status | Code Reference |
|-------------------|--------|----------------|
| **§312.2 - Verifiable Parental Consent** | ⚠️ In Progress (70%) | `PRIVACY_COMPLIANCE_SOLUTIONS.md:13-63` |
| **§312.3 - Notice Requirements** | ⚠️ Partial | Child-specific notices needed |
| **§312.4 - Parental Rights** | ✅ Implemented | `packages/auth-agent/src/services/ParentalControlService.ts` |
| **§312.5 - Data Minimization** | ✅ Implemented | `PRIVACY_COMPLIANCE_IMPLEMENTATION.md:32-50` |
| **§312.6 - Safe Harbor** | ⚠️ Draft Pack | `docs/compliance/privo-draft.md` |

## Related Documentation

- **Privacy Compliance Verification Report:** See [Privacy Compliance Verification Report](./01_PRIVACY_COMPLIANCE_VERIFICATION_REPORT.md)
- **GDPR Compliance:** See [GDPR Compliance](./gdpr.md)
- **Child Safety:** See [Child Safety Design](./child-safety.md)

# Parental Consent Process

## Overview

Getting verifiable parental consent is a key COPPA requirement. Here's how our consent process works from a parent's perspective.

## When Consent Is Required

**Consent is required when:**
- A child under 13 years of age registers for a Storytailor account
- A child under 13 attempts to use Storytailor services
- Any data collection occurs for a child under 13

**Consent is NOT required when:**
- User is 13 years of age or older
- User is a parent or guardian registering their own account

## Consent Request Process

### Step 1: Child Registration

When a child under 13 starts to register:
1. They enter their age
2. We see they're under 13 and ask for a parent's email
3. Without a parent email, registration stops
4. With a parent email, we create the account but lock it until the parent approves

### Step 2: We Reach Out to Parents

Once we have the parent's email:
1. We create a consent request (valid for 7 days)
2. We send the parent an email explaining:
   - What Storytailor is (current web platform at Storytailor.com)
   - What Story Intelligence™ will add in the future (voice, emotion detection)
   - Exactly what data we'll collect (current and future)
   - A link to our privacy policy
   - How to give or deny consent

### Step 3: Parent Review

Parents can take their time to:
- Read our privacy policy
- Understand what data we collect now (Storytailor 3.0)
- Understand what additional data Story Intelligence™ will collect in the future
- Learn about their rights (access, delete, export data)
- Decide whether to approve

## Consent Verification Process

### Option 1: Email Link Verification

**How It Works:**
1. Parent clicks verification link in email
2. Parent is directed to consent verification page
3. Parent reviews consent information
4. Parent confirms consent
5. Consent status is updated to "verified"
6. Parent receives confirmation email

### Option 2: API Verification

**How It Works:**
1. Parent uses consent request ID from email
2. Parent submits consent verification through API
3. System validates consent request ID
4. Consent status is updated to "verified"
5. Parent receives confirmation

### Consent Verification Requirements

**Parent Must:**
- Have access to the email address provided
- Confirm understanding of data collection practices
- Confirm understanding of parental rights
- Explicitly provide consent

**System Validates:**
- Consent request ID is valid
- Consent request has not expired
- Parent email matches consent request

## Consent Status

### Status Values

**none:**
- No consent request has been created
- Child cannot use Storytailor services
- No data collection occurs

**pending:**
- Consent request created, awaiting parent verification
- Child cannot use Storytailor services
- No data collection occurs
- Request expires after 7 days

**verified:**
- Parent has verified consent
- Child can use Storytailor services
- Data collection permitted
- Consent remains valid until revoked

**revoked:**
- Parent has revoked consent
- Child cannot use Storytailor services
- Data collection stopped
- Existing data can be deleted upon request

### Checking Consent Status

Parents can check consent status at any time:
- Via email request to privacy@storytailor.com
- Via API endpoint (with authentication)
- Status includes: current status, consent date, expiration information

## Consent Revocation Process

### How Parents Revoke Consent

**Via Email:**
1. Parent sends email to privacy@storytailor.com
2. Parent includes: name, relationship to child, child's user ID or email
3. Parent requests consent revocation
4. System verifies parent identity
5. Consent is revoked immediately
6. Data collection stops immediately
7. Parent receives confirmation

**Via API:**
1. Parent uses authenticated API endpoint
2. Parent submits revocation request
3. System validates parent authentication
4. Consent is revoked immediately
5. Data collection stops immediately
6. Parent receives confirmation

### What Happens When Consent Is Revoked

**Immediate Effects:**
- Consent status changes to "revoked"
- All data collection stops immediately
- Child cannot use Storytailor services
- Revocation is logged and timestamped

**Data Handling:**
- Existing data can be deleted upon parent request
- Parent can request immediate deletion of all child data
- Audit logs are anonymized (retained for legal compliance)
- Parent receives confirmation of revocation and data deletion (if requested)

## Consent Expiration

### Automatic Expiration

**Consent Requests:**
- Consent requests expire after 7 days if not verified
- Expired requests cannot be verified
- New consent request must be created

**Consent Status:**
- Verified consent does not expire automatically
- Consent remains valid until revoked by parent
- Consent can be revoked at any time

### Handling Expired Requests

**If Consent Request Expires:**
- Parent receives notification of expiration
- New consent request can be created
- Child cannot use services until consent is verified

## Consent Records and Audit Trail

### What Is Recorded

**Consent Request:**
- Request creation date and time
- Parent email address
- Child age
- Consent request ID
- Request status

**Consent Verification:**
- Verification date and time
- Verification method (email link or API)
- Consent status change
- Verification confirmation

**Consent Revocation:**
- Revocation date and time
- Revocation method
- Revocation reason (if provided)
- Data deletion status (if requested)

### Audit Trail

**All Consent Actions Are Logged:**
- Consent request creation
- Consent verification
- Consent status checks
- Consent revocation
- Consent expiration

**Audit Log Retention:**
- Audit logs retained for 7 years (legal requirement)
- Logs anonymized after 1 year for privacy
- Logs used for compliance verification

## Parental Rights Related to Consent

### Right to Review Consent

Parents can:
- Review current consent status
- Review consent history
- Review consent request details
- Review consent verification date

### Right to Revoke Consent

Parents can:
- Revoke consent at any time
- Request immediate data deletion
- Receive confirmation of revocation
- Request new consent if desired

### Right to Understand Consent

Parents receive:
- Clear explanation of what data will be collected
- Clear explanation of how data will be used
- Link to privacy policy
- Information about parental rights

## Contact Information

**Privacy Inquiries:** privacy@storytailor.com  
**Consent Questions:** privacy@storytailor.com  
**Mailing Address:**  
Storytailor Inc.  
7131 w 135th, #1074  
Overland Park, KS 66223

**Response Time:** All privacy inquiries responded to within 30 days.

---

**Storytailor Inc.**  
7131 w 135th, #1074  
Overland Park, KS 66223

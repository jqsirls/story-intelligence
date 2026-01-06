# Registration and Authentication Journeys

**Last Updated:** December 2025  
**Audience:** Product, Design, Marketing, Support

## Overview

This document walks through all registration and authentication flows, showing how different user types create accounts and access Storytailor.

---

## Journey 1: Child Under 13 Registration (With Parent Approval)

**The most important journey—shows COPPA protection from the first moment.**

### What Happens

**Step 1: Child Visits Storytailor.com**
- Emma (age 8) wants to create a Storytailor account
- She clicks "Sign Up" on the homepage

**Step 2: Account Information**
- Emma fills in:
  - Email address
  - Password
  - First name: Emma
  - Last name: Smith
  - Age: 8

**Step 3: System Detects Child Under 13**
- System sees Emma is 8 years old
- A new field appears: "Parent's Email Address (Required)"
- Message displays: "Since you're under 13, we need your parent's permission to create your account"

**Step 4: Parent Email Required**
- Emma enters her mom's email: mom@example.com
- Without this email, the "Create Account" button stays disabled
- She cannot proceed without a parent email

**Step 5: Account Created But Locked**
- System creates Emma's account
- Account is marked as "COPPA Protected"
- Account is locked—Emma cannot log in yet
- Message displays: "Account created! We've sent an email to your parent for approval"

**Step 6: Parent Receives Email**
Mom receives an email within minutes with approval request and privacy information.

**Step 7: Parent Reviews and Approves**
- Mom clicks "Review Privacy Policy"
- Reads the full privacy policy
- Clicks "Approve"
- Receives confirmation email

**Step 8: Emma Can Now Use Storytailor**
- Emma's account is unlocked
- She can log in and start creating stories
- All COPPA protections remain in place

### Key Points

- Database-level enforcement prevents account creation without parent email
- Both child and parent receive clear communication
- Child cannot access service until parent approves
- Parents receive full information before deciding
- 7-day expiration ensures timely decision

---

## Journey 2: Child Under 13 Registration (Blocked)

**Shows what happens when parent email is missing.**

### What Happens

**Step 1: Child Visits Storytailor.com**
- Alex (age 10) wants to create an account
- Clicks "Sign Up"

**Step 2: Account Information**
- Alex fills in email, password, name, age: 10
- Parent email field appears but Alex skips it

**Step 3: Cannot Proceed**
- "Create Account" button is disabled
- Red message appears: "Parent email is required for children under 13"
- Alex cannot create account

**Step 4: System Prevents Registration**
- Even if Alex tries to bypass (developer tools, API, etc.)
- Database itself rejects the registration
- Error: "Children under 13 require parent email for COPPA compliance"

### Key Points

- Multiple layers prevent bypass
- Clear messaging explains why
- Database-level enforcement (not just UI)
- COPPA requirement strictly enforced

---

## Journey 3: Adult (13+) Registration

**Shows streamlined flow for users 13 and older.**

### What Happens

**Step 1: User Visits Storytailor.com**
- Mike (age 16) wants to create an account
- Clicks "Sign Up"

**Step 2: Account Information**
- Mike fills in:
  - Email: mike@example.com
  - Password
  - Name: Mike Chen
  - Age: 16

**Step 3: System Sees User Is 13 or Older**
- No parent email field appears
- No consent requirement
- COPPA protections do not apply

**Step 4: Account Created and Active**
- Account created immediately
- Mike can log in right away
- No waiting for approval
- Message: "Welcome to Storytailor! Start creating your first story"

**Step 5: Mike Starts Using Storytailor**
- Full access to all features
- Privacy protections still active (encryption, security)
- Can create stories immediately

### Key Points

- Different process for 13+ (no unnecessary friction)
- Automatic age-based detection
- Privacy still protected (just not COPPA-specific)
- Immediate access

---

## Journey 4: Parent Registration (Creating Own Account)

**Parents creating accounts for themselves.**

### What Happens

**Step 1: Parent Visits Storytailor.com**
- Sarah (age 35) wants her own account
- She's a parent but wants to create stories herself
- Clicks "Sign Up"

**Step 2: Account Information**
- Sarah fills in:
  - Email: sarah@example.com
  - Password
  - Name: Sarah Martinez
  - Age: 35
  - User type: Parent (optional selection)

**Step 3: Account Created Immediately**
- No parent email required (Sarah is an adult)
- No consent needed
- Account active immediately

**Step 4: Sarah Can Create Stories**
- Full access to Storytailor
- Can create stories for herself or with her children
- Can later add children's accounts as sub-accounts/profiles

### Key Points

- Adults have direct access
- System supports different user types
- Parents can have their own stories
- Can manage children's accounts from their account

---

## Journey 5: Login (Existing User)

**Returning users logging in.**

### What Happens

**Step 1: User Visits Storytailor.com**
- Emma returns to Storytailor
- Clicks "Log In"

**Step 2: Enter Credentials**
- Enters email and password
- Clicks "Log In"

**Step 3: Authentication Check**
- System verifies credentials
- Checks account status (active, suspended, etc.)
- For children under 13: Verifies parent consent is still active

**Step 4: Logged In Successfully**
- Emma sees her homepage/dashboard
- Recent stories displayed
- Ready to continue where she left off

### What Can Go Wrong

**Wrong password:**
- Error: "Email or password is incorrect"
- Can click "Forgot Password?" to reset

**Account locked (consent revoked):**
- Error: "Your account access has been revoked. Contact parent."
- Cannot log in until parent re-approves

**Account suspended:**
- Error: "Your account has been suspended. Contact support at safety@storytailor.com"
- Typically due to safety violations

### Key Points

- Simple login flow
- Account status checked on every login
- COPPA consent verified for children
- Clear error messages guide next steps

---

## Journey 6: Password Reset

**User forgot password and needs to reset.**

### What Happens

**Step 1: User Clicks "Forgot Password?"**
- On login screen
- Clicks "Forgot Password?"

**Step 2: Enter Email**
- User enters email address
- Clicks "Send Reset Link"

**Step 3: Email Sent**
- Message: "If this email exists in our system, we've sent a password reset link"
- (Note: We don't confirm if email exists for security)

**Step 4: User Checks Email**
- Receives email within minutes
- Subject: "Reset your Storytailor password"
- Contains secure reset link (expires in 1 hour)

**Step 5: Reset Password**
- User clicks link
- Taken to password reset page
- Enters new password (must meet requirements)
- Confirms new password

**Step 6: Password Updated**
- Success message: "Password updated! You can now log in"
- Link to login page
- Confirmation email sent

**Step 7: User Logs In**
- Uses new password
- Logged in successfully

### What Can Go Wrong

**Link expired (after 1 hour):**
- Error: "This password reset link has expired"
- Can request new reset link

**Password too weak:**
- Error: "Password must be at least 8 characters with number and symbol"
- Requirements shown clearly

### Key Points

- Secure reset process
- Email-based verification
- Time-limited links (1 hour)
- Clear password requirements
- Confirmation at each step

---

## Journey 7: Email Verification

**Verifying email address after registration.**

### What Happens

**Step 1: After Registration**
- User creates account
- Sees message: "Please verify your email address"
- Verification email sent automatically

**Step 2: Check Email**
- User receives verification email
- Subject: "Verify your Storytailor email"
- Contains verification link

**Step 3: Click Verification Link**
- User clicks link in email
- Taken to Storytailor.com
- Message: "Email verified! Your account is now fully active"

**Step 4: Account Fully Active**
- Email verification badge shows "Verified"
- Full access to all features
- Can now receive important notifications

### What Can Go Wrong

**Didn't receive email:**
- User can click "Resend Verification Email"
- Check spam folder
- Contact support if still not received

**Link expired:**
- Can request new verification link
- Link expires after 24 hours for security

### Key Points

- Email verification confirms contact information
- Required for important notifications
- Secure, time-limited links
- Easy to resend if needed

---

## Journey 8: Parent Consent Verification

**Parents approving their child's account.**

### What Happens

**Step 1: Parent Receives Consent Email**
- Dad receives email: "Approval Needed: Lily wants to join Storytailor"
- Email sent within 1 minute of Lily's registration
- Contains consent request ID and verification link

**Step 2: Parent Clicks Verification Link**
- Link goes to consent verification page
- Page displays:
  - Child's name and age
  - What data will be collected
  - Link to full privacy policy
  - Parent's rights (access, delete, export, revoke)

**Step 3: Parent Reviews Information**
- Dad reads what data is collected
- Reviews privacy policy
- Understands he can revoke consent anytime
- Understands his rights to access and delete data

**Step 4: Parent Provides Consent**
- Dad clicks "I Approve"
- System updates consent status to "verified"
- Timestamp recorded for audit trail

**Step 5: Confirmations Sent**
- Dad receives email: "You've approved Lily's Storytailor account"
- Lily receives notification: "Your account is approved! You can now log in"

**Step 6: Child Can Now Use Storytailor**
- Lily logs in successfully
- Can create stories
- All COPPA protections active

### Alternative: Parent Denies Consent

**If Dad clicks "I Do Not Approve":**
- Consent status set to "denied"
- Lily's account remains locked
- Both receive email explaining denial
- Account can be deleted if desired

### Key Points

- Parent makes final decision
- All information provided before decision
- Two-way communication
- Recorded consent with timestamp
- Parents can deny (not forced to approve)

---

## Journey 9: Consent Expiration (7-Day Window)

**What happens if parent doesn't respond.**

### What Happens

**Step 1: Child Registers**
- Jake (age 9) registers
- Dad's email provided
- Consent email sent

**Step 2: Days Pass**
- Day 1: Email sent, no response
- Day 3: Reminder email sent
- Day 5: Final reminder email
- Day 7: Consent request expires

**Step 3: Consent Expires**
- After 7 days without response
- Consent status: "expired"
- Jake still cannot log in
- No data collected

**Step 4: Jake Tries to Log In**
- Message: "Your account is waiting for parent approval"
- System blocks access
- No data collection occurs

**Step 5: Dad Can Still Approve**
- Dad can contact support to restart process
- Or Jake can re-register
- New consent request created
- New 7-day window starts

### Key Points

- Time limit enforced (not indefinite)
- No access without consent
- No data collected while waiting
- Can restart process anytime
- Reminders sent before expiration

---

## Related Documentation

- **Technical Version:** `../comprehensive-user-journeys.md` - With code references and agent flows
- **API Version:** `../rest-api.md` - API-focused registration flows
- **Journey Index:** `../INDEX.md` - Complete map of all journeys
- **COPPA Compliance:** `../../compliance/coppa.md` - Legal requirements
- **Privacy Policy:** `../../compliance/privacy-policy.md` - Full privacy documentation

---

**Storytailor Inc.**  
Product Documentation

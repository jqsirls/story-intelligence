# Edge Cases and Error Recovery Journeys

**Last Updated:** December 2025  
**Audience:** Product, Design, Support, QA

## Overview

This document covers what happens when things go wrong and how users recover. Understanding edge cases helps build better products and support better users.

---

## Journey 1: Network Interruption During Story Creation

**What happens if connection drops while creating a story.**

### What Happens

**Step 1: User Creating Story**
- Emma is midway through creating an adventure story
- Has answered 3 of 5 story questions
- Network connection drops (Wi-Fi disconnects)

**Step 2: System Detects Connection Loss**
- Automatic save triggered
- Current progress saved to browser cache
- System queues story state for recovery

**Step 3: Emma Reconnects**
- Emma's Wi-Fi comes back 5 minutes later
- She reopens Storytailor.com

**Step 4: Recovery Offered**
- Message: "Welcome back! We saved your story progress"
- Shows: "You were creating an adventure with Brave the Dragon"
- Options:
  - "Continue where I left off"
  - "Start over"

**Step 5: Emma Continues**
- Clicks "Continue"
- Story creation resumes at question 4
- All previous answers preserved
- Seamless continuation

### Key Points

- Automatic progress saving
- No data loss
- Clear recovery options
- User chooses to continue or restart

---

## Journey 2: Story Generation Failure

**What happens if AI story generation fails.**

### What Happens

**Step 1: User Requests Story**
- User completes all story questions
- Clicks "Generate Story"
- Loading screen appears

**Step 2: Generation Fails**
- OpenAI API timeout or error
- System detects failure
- User hasn't waited long (less than 2 minutes)

**Step 3: User Sees Friendly Error**
- Message: "Hmm, something went wrong creating your story"
- Explanation: "Don't worry, we saved your character and story ideas"
- Options:
  - "Try Again" (automatic retry)
  - "Create Different Story"
  - "Contact Support"

**Step 4: User Clicks "Try Again"**
- System retries with same parameters
- Often works on second attempt
- If still fails after 3 attempts: Escalates to support

**Step 5: Success or Support**
- If retry works: Story generated, user happy
- If still failing: "We've notified our team. They'll reach out within 1 hour"
- User's story ideas saved for support team

### Key Points

- User-friendly error messages
- Automatic retry option
- Progress is never lost
- Clear escalation path
- Support loop closes within 1 hour

---

## Journey 3: Account Lockout (Wrong Password)

**User enters wrong password multiple times.**

### What Happens

**Step 1: User Enters Wrong Password**
- User tries to log in
- Enters incorrect password
- Error: "Email or password is incorrect"

**Step 2: Multiple Failed Attempts**
- User tries again: Wrong password
- After 3 failed attempts within 5 minutes:
- Message: "Too many failed attempts"

**Step 3: Temporary Lockout**
- Account locked for 15 minutes
- Message: "For security, please wait 15 minutes before trying again"
- Or: "Click 'Forgot Password?' to reset your password now"

**Step 4: User Options**
- Wait 15 minutes (lockout expires automatically)
- Click "Forgot Password?" to reset immediately
- Contact support if account compromised

**Step 5: Resolution**
- If user waits: Can try again after 15 minutes
- If user resets password: Immediate access with new password
- Account security maintained

### Key Points

- Security against brute force attacks
- Temporary lockout (not permanent)
- Password reset option available
- Clear wait time shown
- Automatic unlock after time period

---

## Journey 4: Permission Denied Scenario

**User trying to do something they don't have permission for.**

### What Happens

**Step 1: Grandma Tries to Delete Story**
- Grandma (Viewer permission) is reading Emma's story
- Clicks "Delete Story" button

**Step 2: Permission Check**
- System checks: Grandma is Viewer (cannot delete)
- Action blocked

**Step 3: Clear Error Message**
- Message: "You don't have permission to delete this story"
- Explanation: "Only Editors and Admins can delete stories"
- Shows: "Your current access level: Viewer"
- Suggests: "Contact the library owner to request Editor access"

**Step 4: Grandma Understands**
- Clear explanation of why action blocked
- Knows who to contact (library owner)
- Can continue viewing stories

### Key Points

- Permission checks prevent errors
- Clear explanation of permissions
- Shows current access level
- Suggests resolution path

---

## Journey 5: Consent Expiration

**Parent doesn't respond to consent request within 7 days.**

### What Happens

**Step 1: Child Registers**
- Jake (age 9) registers
- Dad's email provided
- Consent email sent

**Step 2: Days Pass**
- Day 1: Email sent
- Day 3: Reminder email sent
- Day 5: Final reminder
- Day 7: Consent request expires

**Step 3: Consent Expires**
- After 7 days without response
- Consent status: "expired"
- Jake still cannot log in

**Step 4: Jake Tries to Log In**
- Message: "Your account is waiting for parent approval"
- Explanation: "We sent an email to your parent 7 days ago, but they haven't responded yet"
- Action: "Ask your parent to check their email, or contact support@storytailor.com"

**Step 5: Resolution Options**
- Dad finds original email and approves (if still available)
- Dad contacts support to restart approval process
- Jake re-registers (starts over with new consent request)

### Key Points

- Consent doesn't wait indefinitely
- Multiple reminders sent
- Clear messaging to child
- Easy to restart process
- No data collected during waiting period

---

## Journey 6: Failed Story Sharing (No Permission)

**User tries to share story they don't own.**

### What Happens

**Step 1: User Tries to Share**
- User finds a story in shared family library
- Story was created by someone else
- User clicks "Share Story"

**Step 2: Permission Check**
- System checks: User is Viewer (cannot share)
- Only Editors and Owners can share stories
- Action blocked

**Step 3: Clear Message**
- "You cannot share this story"
- Explanation: "Only the story creator or library admins can share stories"
- Shows: "This story was created by [Name]"
- Suggests: "Ask [Name] to share the story for you"

### Key Points

- Sharing requires ownership or editor permission
- Clear explanation
- Shows who owns the story
- Suggests resolution

---

## Journey 7: Account Deletion with Active Subscription

**What happens when deleting account with paid subscription.**

### What Happens

**Step 1: Parent Requests Account Deletion**
- Parent wants to delete child's account
- Account has active subscription
- Clicks "Delete Account"

**Step 2: Subscription Warning**
- System detects active subscription
- Message: "This account has an active subscription"
- Shows:
  - Subscription type: Premium
  - Renewal date: February 15, 2025
  - Amount: $19.99/month
- Warning: "Deleting account will cancel subscription. This will not be refunded."

**Step 3: Parent Chooses Action**
- Options:
  - "Cancel subscription first, then delete account"
  - "Delete account and cancel subscription"
  - "Keep account active"

**Step 4: Proceed with Deletion**
- If parent proceeds:
  - Subscription canceled immediately
  - Refund policy applies (if applicable)
  - Account deleted
  - All data removed

**Step 5: Confirmation**
- Email confirmation sent
- Includes:
  - Account deletion confirmation
  - Subscription cancellation confirmation
  - Final billing information

### Key Points

- Clear warning about subscriptions
- Financial implications explained
- Choice to cancel subscription separately
- No surprise charges

---

## Journey 8: Character Already Exists (Duplicate)

**User tries to create character with same name as existing character.**

### What Happens

**Step 1: User Creates Character**
- Creating new character named "Luna"

**Step 2: System Detects Duplicate**
- Character named "Luna" already exists in user's library
- System catches this

**Step 3: Friendly Message**
- "You already have a character named Luna!"
- Shows existing Luna with traits
- Options:
  - "Use existing Luna"
  - "Create new Luna with different last name"
  - "Choose different name"

**Step 4: User Chooses**
- User can reuse existing character
- Or create new one with slight variation
- Or pick completely different name

### Key Points

- Prevents confusion with duplicate names
- Offers clear options
- Can reuse existing characters
- User makes final decision

---

## Journey 9: Email Already Registered

**User tries to register with email that's already in use.**

### What Happens

**Step 1: User Tries to Register**
- Fills in registration form
- Email: user@example.com
- Clicks "Create Account"

**Step 2: System Detects Duplicate**
- Email already exists in system
- Registration blocked

**Step 3: Helpful Error Message**
- "An account with this email already exists"
- Options:
  - "Log in instead"
  - "Forgot password?"
  - "Use different email"
- Link to login page

**Step 4: User Takes Action**
- Clicks "Log in instead" if they forgot they had account
- Or "Forgot password?" if they can't remember password
- Or uses different email if they want separate account

### Key Points

- Clear error messaging
- Helpful recovery options
- Link to login/reset
- Prevents duplicate accounts

---

## Journey 10: Session Timeout

**User's session expires while using Storytailor.**

### What Happens

**Step 1: User Creating Story**
- User is creating a story
- Takes a long time (over 1 hour)
- Session expires

**Step 2: User Tries to Save**
- Clicks "Generate Story" or "Save"
- Session no longer valid

**Step 3: Graceful Handling**
- Message: "Your session has expired for security"
- "Don't worry, we saved your progress!"
- "Please log in again to continue"
- [Log In] button

**Step 4: User Logs In Again**
- Enters credentials
- Logged back in

**Step 5: Progress Restored**
- All story progress restored
- Character details preserved
- Can continue immediately

### Key Points

- Sessions expire for security (after 1 hour inactive)
- Progress automatically saved
- User just needs to log in again
- No work lost

---

## Journey 11: Safety Incident Detected

**System detects concerning content in child's conversation or story.**

**Note:** This is a Story Intelligence feature (future release with conversation capabilities).

### What Happens

**Step 1: Child Mentions Concerning Content**
- During story creation conversation
- Child mentions something concerning
- System detects potential safety issue

**Step 2: System Responds Appropriately**
- Immediate, supportive response to child
- "Thank you for sharing that with me"
- "Let's make sure you're safe"
- System does NOT shame or alarm child

**Step 3: Parent Notified Immediately**
- Parent receives urgent email or notification
- Subject: "Safety alert for [Child]'s account"
- Includes:
  - Nature of concern (general description)
  - Timestamp
  - Recommended actions
  - Support resources
- Does NOT include verbatim conversation (privacy)

**Step 4: Support Team Notified**
- Internal safety team alerted
- Review incident
- Determine if authorities should be notified (mandatory reporting)
- Prepare support resources for family

**Step 5: Follow-Up**
- Parent can access incident details in account
- Safety team may reach out to parent
- Resources provided (counseling, support lines)
- Ongoing monitoring if needed

### Key Points

- Child safety is priority
- Supportive, not punitive response to child
- Parent notified immediately
- Professional support available
- Complies with mandatory reporting laws

---

## Journey 12: Account Suspended (Safety Violation)

**Account suspended due to terms of service violation.**

### What Happens

**Step 1: Violation Detected**
- User violates terms of service
- Example: Inappropriate content, abuse, etc.
- Safety team reviews

**Step 2: Account Suspended**
- Account access disabled
- User cannot log in

**Step 3: User Tries to Log In**
- Error message: "Your account has been suspended"
- Explanation: "Your account was suspended for violating our Terms of Service"
- Next steps: "Contact safety@storytailor.com for more information"
- Appeal process information provided

**Step 4: User Contacts Support**
- Emails safety@storytailor.com
- Safety team reviews case
- Discussion about violation and path forward

**Step 5: Resolution**
- If appeal approved: Account reinstated
- If violation confirmed: Account remains suspended or deleted
- Clear communication throughout

### Key Points

- Safety violations taken seriously
- Appeal process available
- Clear communication
- Support team handles sensitively

---

## Related Documentation

- **All Journeys:** `./README.md` - Index of product journeys
- **Technical Error Handling:** `../../api-reference/error-catalog.md` - Technical error codes
- **Troubleshooting:** `../../api-reference/troubleshooting.md` - Common issues and solutions
- **Safety Framework:** `../../compliance/child-safety.md` - Safety policies

---

**Storytailor Inc.**  
Product Documentation

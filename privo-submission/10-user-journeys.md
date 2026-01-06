# User Journeys - COPPA Compliance in Practice

## Overview

This document shows how our COPPA compliance measures work in real user scenarios. Each journey walks through what users experience and how privacy protections are applied.

**Note on UI Details:** The exact wording and navigation may change as we refine the user interface (for example, "Children's Accounts" might become "Profiles," or "Account Settings" might be accessed differently). However, the underlying flows, privacy protections, and COPPA compliance measures remain consistent regardless of UI changes.

---

## Journey 1: Child Under 13 Registration (With Parent Approval)

**This is the most important journey—it shows how COPPA protection works from the first moment.**

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
Mom receives an email within minutes:

> **Subject:** Approval Needed: Emma wants to join Storytailor
> 
> Hi,
>
> Emma (age 8) has created a Storytailor account and needs your approval before she can use it.
>
> **What is Storytailor?**
> Storytailor.com is where children create personalized stories.
>
> **What information we collect:**
> - Stories Emma creates
> - Characters she makes
> - Basic account information
> - (In the future: voice conversations and emotional data when Story Intelligence™ is added)
>
> **Your rights as a parent:**
> - Access all of Emma's information
> - Delete Emma's data anytime
> - Revoke approval anytime
>
> [Review Privacy Policy] [Approve] [Deny]
>
> This approval request expires in 7 days.

**Step 7: Parent Reviews and Approves**
- Mom clicks "Review Privacy Policy"
- Reads the full privacy policy
- Clicks "Approve"
- Receives confirmation email

**Step 8: Emma Can Now Use Storytailor**
- Emma's account is unlocked
- She can log in and start creating stories
- All COPPA protections remain in place

### What This Journey Shows

✅ **Database-level enforcement:** System won't create account without parent email  
✅ **Clear communication:** Both child and parent understand what's happening  
✅ **Locked until consent:** Child cannot use service without parental approval  
✅ **Transparent process:** Parents know exactly what they're approving  
✅ **Time limit:** 7-day expiration ensures timely decision

---

## Journey 2: Child Under 13 Registration (Without Parent Email)

**This journey shows what happens when a child tries to register without providing a parent's email.**

### What Happens

**Step 1: Child Visits Storytailor.com**
- Alex (age 10) wants to create an account
- Clicks "Sign Up"

**Step 2: Account Information**
- Alex fills in:
  - Email: alex@example.com
  - Password
  - Name: Alex Johnson
  - Age: 10
- Parent email field appears but Alex skips it

**Step 3: Cannot Proceed**
- "Create Account" button is disabled
- Red message appears: "Parent email is required for children under 13"
- Alex cannot create account without providing parent email

**Step 4: System Prevents Registration**
- Even if Alex tries to bypass the form (developer tools, API call, etc.)
- Database itself will reject the registration
- Error message: "Children under 13 require parent email for COPPA compliance"

### What This Journey Shows

✅ **Cannot bypass protection:** Multiple layers prevent registration without parent email  
✅ **Clear messaging:** Child understands why they need parent email  
✅ **Database enforcement:** Even technical bypasses won't work  
✅ **COPPA requirement met:** No account creation for under-13 without parent contact

---

## Journey 3: Parent Consent Verification

**This journey shows how parents verify consent after a child registers.**

### What Happens

**Step 1: Parent Receives Consent Email**
- Dad receives email: "Approval Needed: Lily wants to join Storytailor"
- Email sent within 1 minute of Lily's registration
- Contains consent request ID and verification link

**Step 2: Parent Clicks Verification Link**
- Link goes to: storytailor.com/consent/verify/[request-id]
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
- Timestamp is recorded for audit trail

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
- Lily cannot log in
- Both Dad and Lily receive email explaining denial
- Account can be deleted if desired

### What This Journey Shows

✅ **Parent in control:** Parent makes the final decision  
✅ **Informed consent:** All information provided before decision  
✅ **Two-way communication:** Both parent and child receive updates  
✅ **Recorded consent:** Timestamp and status tracked for audit  
✅ **Can deny:** Parents have real choice, not just "approve or nothing"

---

## Journey 4: Parent Checking Consent Status

**This journey shows how parents can check consent status anytime.**

### What Happens

**Step 1: Parent Logs Into Storytailor.com**
- Mom logs into her Storytailor account
- Goes to "Account Settings" → "Manage Children's Accounts"

**Step 2: View Consent Information**
- Sees Emma's account with all consent details:
  - Consent status: "Approved"
  - Date approved: "January 15, 2025"
  - Data collection: "Active"
  - Stories created: 5
  - Last active: "Today at 3:42 PM"

**Step 3: Review Options**
- Can click "View Details" to see:
  - Full consent history
  - What data has been collected
  - When consent was given
  - Options to revoke or manage settings

### Alternative Method: Email Inquiry

If parent doesn't have account access:
- Can email privacy@storytailor.com
- We verify identity and send status
- Response within 24-48 hours

### What This Journey Shows

✅ **Transparency:** Parents can always check consent status  
✅ **Identity verification:** Protect child by verifying parent  
✅ **Quick response:** Information provided within 1-2 days  
✅ **Next steps clear:** Parents know how to revoke if desired

---

## Journey 5: Parent Revokes Consent

**This journey shows how parents can revoke consent and stop data collection.**

### What Happens

**Step 1: Parent Logs Into Storytailor.com**
- Dad logs into his Storytailor account
- Goes to "Account Settings" → "Manage Children's Accounts"
- Sees Lily's account listed

**Step 2: Access Parental Controls**
- Clicks on Lily's account
- Sees "Parental Controls" section with:
  - Current consent status: "Approved"
  - Approval date: "January 15, 2025"
  - Data collection: "Active"
  - [Revoke Consent] button

**Step 3: Revoke Consent**
- Dad clicks "Revoke Consent"
- System asks: "Are you sure? This will stop Lily from using Storytailor."
- Dad confirms: "Yes, Revoke Consent"

**Step 4: Consent Revoked Immediately**
- Consent status changes to "Revoked" instantly
- Data collection stops immediately
- Lily is logged out automatically
- Timestamp recorded for audit

**Step 5: Confirmations Sent**
- Dad sees confirmation on screen: "Consent revoked. Lily can no longer access Storytailor."
- Dad receives email: "Consent revoked for Lily's account. Data collection has stopped."
- Lily receives email: "Your Storytailor account access has been revoked by your parent"

**Step 6: Optional: Delete Data**
- Screen shows: "Would you like to delete Lily's data?"
- Options: "Delete All Data" or "Keep Data (in case you change your mind)"
- If Dad clicks "Delete All Data":
  - All of Lily's stories and data deleted immediately
  - Confirmation shown on screen and via email

### Alternative Method: Email Request

If parent doesn't have account access:
- Can email privacy@storytailor.com
- We verify identity and process revocation
- Same outcome, just takes longer (24-48 hours vs. instant)

### What This Journey Shows

✅ **Parent control:** Parent can stop access anytime  
✅ **Immediate action:** Revocation happens quickly  
✅ **Clear communication:** Both parent and child informed  
✅ **Optional deletion:** Parent decides about existing data  
✅ **Audit trail:** All actions timestamped and recorded

---

## Journey 6: Parent Requests to See Child's Data

**This journey shows how parents exercise their right to access their child's information.**

### What Happens

**Step 1: Parent Logs Into Storytailor.com**
- Mom logs into her account
- Goes to "Account Settings" → "Manage Children's Accounts"
- Clicks on Emma's account

**Step 2: View Child's Data Dashboard**
- Mom sees complete overview:
  - Account information (email, age, creation date)
  - Stories created: 5 stories (with titles and dates)
  - Characters: 3 characters (with names)
  - Account activity summary
  - Privacy settings

**Step 3: Access Detailed Data**
- Mom clicks "View All Data"
- Can browse:
  - Each story (full text)
  - Each character (full details)
  - Consent history (when approved, status)
  - Safety records (if any)
  - (Future: Voice conversations, emotional data if Story Intelligence™ is active)

**Step 4: Download Everything**
- Mom clicks "Download All Data"
- System prepares export file
- Downloads immediately as: storytailor-emma-data-2025-01-15.json
- Can open and review offline

### Alternative Method: Email Request

If parent doesn't have account access:
- Can email privacy@storytailor.com
- We verify identity and send data
- Provided within 30 days

### What This Journey Shows

✅ **Full transparency:** Parent sees everything we have  
✅ **Complete data:** Nothing is hidden  
✅ **Timely response:** Within 30 days (usually faster)  
✅ **Readable format:** Parent can understand the data  
✅ **Informed decisions:** Parent can decide next steps

---

## Journey 7: Parent Requests to Delete Child's Data

**This journey shows how parents can delete all their child's information.**

### What Happens

**Step 1: Parent Requests Deletion**
- Dad wants all of Lily's data deleted
- Sends email to privacy@storytailor.com
- Subject: "Delete all data for Lily"
- Includes: Dad's name, relationship to Lily, Lily's email

**Step 2: We Verify Parent Identity**
- Confirm email matches parent email on file
- Additional verification for deletion (higher security)
- May call or video chat to confirm identity
- Verify relationship to child

**Step 3: We Confirm Deletion Request**
- Email sent to Dad: "We received your request to delete Lily's data"
- Lists what will be deleted:
  - All of Lily's stories (5 stories)
  - All of Lily's characters (3 characters)
  - All account information
  - All consent records
  - (Future: Voice conversations, emotional data if applicable)
- Note: Audit logs will be anonymized but kept for legal compliance (7 years)

**Step 4: Dad Confirms**
- Dad replies: "Yes, please delete all of Lily's data"
- Or clicks confirmation link in email

**Step 5: We Delete the Data Immediately**
- All of Lily's data permanently deleted within hours
- Cannot be recovered
- Audit logs anonymized (personal info removed, but activity log kept)

**Step 6: Deletion Confirmed**
- Dad receives email: "Lily's data has been deleted"
- Email includes:
  - Date and time of deletion
  - What was deleted
  - What was anonymized (audit logs)
  - Confirmation that Lily's account is closed

### What This Journey Shows

✅ **Parent control:** Parent can delete everything  
✅ **Extra verification:** Higher security for destructive action  
✅ **Clear confirmation:** Parent knows exactly what will be deleted  
✅ **Immediate deletion:** Data removed right away  
✅ **Cannot recover:** True deletion, not just hiding  
✅ **Audit compliance:** Logs kept but anonymized (legal requirement)

---

## Journey 8: Parent Exports Child's Data

**This journey shows how parents can get a copy of all their child's information.**

### What Happens

**Step 1: Parent Logs Into Storytailor.com**
- Mom logs into her account
- Goes to "Account Settings" → "Manage Children's Accounts"
- Clicks on Emma's account

**Step 2: Request Data Export**
- Mom clicks "Privacy & Data"
- Clicks "Download All Data"
- System asks: "Are you sure? This will create a complete copy of Emma's data."
- Mom confirms: "Yes, Download"

**Step 3: System Prepares Export**
- Loading message: "Preparing Emma's data... This may take a moment"
- System collects:
  - All stories (5 stories with full text)
  - All characters (3 characters with traits)
  - Account information
  - Consent history
  - Safety incident records (if any)
  - (Future: Voice conversations, emotional data if applicable)

**Step 4: Download Ready**
- Screen shows: "Your download is ready!"
- File size: 2.5 MB
- Format: JSON (readable in any text editor)
- [Download Now] button

**Step 5: Mom Downloads File**
- Clicks "Download Now"
- File downloads: storytailor-emma-export-2025-01-15.json
- Can open in text editor or import into other tools
- Complete copy of all Emma's data

**Step 6: Can Export Again Anytime**
- Mom can request new export anytime
- Previous exports don't expire
- Always gets current/latest data

### Alternative Method: Email Request

If parent doesn't have account access:
- Can email privacy@storytailor.com
- We verify identity and create export
- Secure download link sent via email (expires in 7 days)
- Provided within 30 days

### What This Journey Shows

✅ **Data portability:** Parent gets complete copy of data  
✅ **Secure delivery:** Link expires to prevent misuse  
✅ **Readable format:** Data can be opened and understood  
✅ **Complete information:** Nothing is hidden  
✅ **Repeatable:** Can request export anytime

---

## Journey 9: Adult (13+) Registration

**This journey shows how registration works for users 13 and older—no parental consent needed.**

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

### What This Journey Shows

✅ **Age-appropriate process:** Different flow for 13+  
✅ **No unnecessary friction:** Adults don't need parent approval  
✅ **Automatic detection:** System knows based on age  
✅ **Privacy maintained:** Security applies to everyone

---

## Journey 10: Parent Registration (Creating Own Account)

**This journey shows how parents create accounts for themselves.**

### What Happens

**Step 1: Parent Visits Storytailor.com**
- Sarah (age 35) wants her own Storytailor account
- She's a parent but wants to create stories herself
- Clicks "Sign Up"

**Step 2: Account Information**
- Sarah fills in:
  - Email: sarah@example.com
  - Password
  - Name: Sarah Martinez
  - Age: 35
  - User type: Parent

**Step 3: Account Created Immediately**
- No parent email required (Sarah is an adult)
- No consent needed
- Account active immediately

**Step 4: Sarah Can Create Stories**
- Full access to Storytailor
- Can create stories for herself or with her children
- Privacy protections active

### What This Journey Shows

✅ **Adults have direct access:** No consent needed for 13+  
✅ **User types supported:** System understands different user types  
✅ **Simple process:** No unnecessary barriers for adults

---

## Journey 11: Creating a Story (Data Collection in Action)

**This journey shows what data is collected when a child creates a story.**

### What Happens

**Step 1: Child Logs Into Storytailor.com**
- Emma (age 8, with parent approval) logs in
- Sees homepage: "What story would you like to create today?"

**Step 2: Start Story Creation**
- Emma clicks "Create New Story"
- System asks: "What type of story?" (Adventure, Bedtime, Educational, etc.)
- Emma selects: "Adventure"

**Step 3: Choose or Create Character**
- System asks: "Who is the hero of your story?"
- Emma can:
  - Use existing character (Luna the Mouse)
  - Create new character
- Emma selects: "Create new character"

**Step 4: Character Creation**
- Emma describes her character:
  - Name: "Brave the Dragon"
  - Traits: "Brave, kind, loves flying"
  - Appearance: "Purple with gold scales"
- System saves this character to Emma's account

**Step 5: Story Details**
- System asks story questions:
  - "Where does the adventure take place?" → "In the clouds"
  - "What is Brave trying to do?" → "Find a lost treasure"
  - "What makes this treasure special?" → "It grants wishes"

**Step 6: Story Generated**
- System creates a personalized story
- Story includes:
  - Brave the Dragon as hero
  - Adventure in the clouds
  - Age-appropriate length and vocabulary (for 8-year-old)
  - Positive themes and character growth

**Step 7: Story Saved**
- Story automatically saved to Emma's library
- Emma can:
  - Read the story anytime
  - Download the story
  - Share with family members (if parent approves)
  - Delete the story

### What Data Was Collected

**During This Journey:**
- Character: "Brave the Dragon" with traits and appearance
- Story: Complete story text with metadata
- Preferences: Emma likes adventure stories, dragon characters

**What Was NOT Collected:**
- No voice recordings (Story Intelligence™ feature, not active yet)
- No location data
- No photos
- No personal information beyond what Emma provided
- No tracking of what Emma does outside Storytailor

### What This Journey Shows

✅ **Minimal data collection:** Only story content and characters  
✅ **Purpose-clear:** Data collected to save and display stories  
✅ **User control:** Emma can delete stories anytime  
✅ **No hidden tracking:** Only what's needed for the service  
✅ **Parent visibility:** Parent can access all of this data anytime

---

## Journey 12: Consent Expiration (7-Day Window)

**This journey shows what happens if a parent doesn't respond to consent request.**

### What Happens

**Step 1: Child Registers, Parent Email Sent**
- Jake (age 9) registers
- Dad's email provided: dad@example.com
- Consent email sent immediately

**Step 2: Days Pass**
- Day 1: Email sent, no response
- Day 3: Reminder email sent to dad
- Day 5: Final reminder email sent
- Day 7: Consent request expires

**Step 3: Consent Request Expires**
- After 7 days without response
- Consent status changes to "expired"
- Jake still cannot log in
- No data has been collected (account never activated)

**Step 4: Jake Tries to Log In**
- Message: "Your account is waiting for parent approval"
- System does not let Jake access anything
- No data collection occurs

**Step 5: Dad Can Still Approve (New Request Needed)**
- Dad can contact us: privacy@storytailor.com
- We create new consent request
- New 7-day window starts
- Or Jake can re-register (starts process over)

### What This Journey Shows

✅ **Time limit enforced:** Consent doesn't wait forever  
✅ **No access without consent:** Jake cannot use service  
✅ **No data collected:** Account locked means no data collection  
✅ **Can restart:** Parent can still approve later  
✅ **Reminder system:** Parents get reminders before expiration

---

## Journey 13: Inviting Family Member to Library/Profile

**This journey shows how family members can be invited to access a child's library or profile.**

### What Happens

**Step 1: Parent Invites Grandma**
- Mom (Emma's parent) logs into Storytailor.com
- Goes to Emma's profile/library
- Clicks "Share Access" or "Invite Family Member"

**Step 2: Choose Access Level**
- Mom enters grandma's email: grandma@example.com
- System asks: "What level of access should Grandma have?"
  - **Viewer:** Can see stories but cannot change anything
  - **Editor:** Can see and edit stories
  - **Admin:** Can see, edit, and manage settings

- Mom selects: "Viewer" (Grandma can read stories but not change them)

**Step 3: Invitation Sent**
- Grandma receives email: "Sarah invited you to view Emma's stories on Storytailor"
- Email includes:
  - Who invited her (Sarah/Mom)
  - Whose stories she'll access (Emma)
  - What she can do (view only)
  - [Accept Invitation] button
  - Invitation expires in 7 days

**Step 4: Grandma Accepts**
- Grandma clicks "Accept Invitation"
- If Grandma has Storytailor account: She logs in
- If Grandma doesn't have account: Quick adult registration (no consent needed, she's over 13)
- Invitation is accepted

**Step 5: Grandma Can Now View Emma's Stories**
- Grandma logs into Storytailor.com
- Sees Emma's library/profile in her account
- Can browse and read all of Emma's stories
- Cannot edit or delete (viewer permission)
- Cannot invite others (not an admin)

**Step 6: Mom Can Manage Access**
- Mom can see who has access to Emma's profile
- Can change Grandma's permission level (upgrade to Editor, downgrade, etc.)
- Can remove Grandma's access anytime

### What This Journey Shows

✅ **Parent-controlled:** Parent decides who gets access  
✅ **Permission levels:** Granular control (Viewer/Editor/Admin)  
✅ **Invite system:** Secure, email-based invitations  
✅ **Revocable:** Access can be removed anytime  
✅ **Child privacy protected:** Only people parent approves can access

---

## Journey 16: Transferring a Story Between Libraries

**This journey shows how stories can be moved or copied between libraries (useful for family sharing or organization).**

### What Happens

**Step 1: Parent Wants to Transfer Story**
- Dad created a story in his library: "The Brave Knight"
- Wants to move it to Lily's library so she can continue the story
- Goes to story settings
- Clicks "Transfer Story"

**Step 2: Choose Target Library**
- System shows libraries Dad has access to:
  - Dad's Library (current location)
  - Lily's Library (daughter, Dad has Admin access)
  - Family Library (shared library)
- Dad selects: "Lily's Library"

**Step 3: Choose Transfer Type**
- **Move:** Story leaves Dad's library, goes to Lily's (story moves)
- **Copy:** Story stays in Dad's library, copy goes to Lily's (story duplicates)
- Dad selects: "Move"

**Step 4: Confirm Transfer**
- System shows: "Move 'The Brave Knight' to Lily's Library?"
- Warns: "Story will be removed from your library"
- Dad confirms: "Yes, Move Story"

**Step 5: Story Transferred**
- Story removed from Dad's Library
- Story appears in Lily's Library
- Lily now owns the story
- Lily can edit, share, or delete it

**Step 6: Notifications**
- Dad sees confirmation: "Story moved to Lily's Library"
- Lily gets notification: "Dad shared a story with you!"

### Alternative: Copy Instead of Move

If Dad chose "Copy":
- Original story stays in Dad's Library
- Copy appears in Lily's Library
- Both can edit their own version independently
- Changes don't sync between copies

### What This Journey Shows

✅ **Flexible sharing:** Move or copy stories  
✅ **Permission-based:** Only works if parent has access to both libraries  
✅ **Ownership transfer:** Story ownership can change  
✅ **Clear confirmation:** User knows what will happen

---

## Journey 17: Changing Permission Levels

**This journey shows how permissions can be updated for family members.**

### What Happens

**Step 1: Mom Wants to Change Grandma's Access**
- Grandma currently has "Viewer" access to Emma's library
- Mom wants to upgrade her to "Editor" so Grandma can help create stories

**Step 2: Mom Manages Permissions**
- Mom logs into Storytailor.com
- Goes to Emma's profile/library
- Clicks "Manage Access" or "People with Access"
- Sees list:
  - Mom (Owner)
  - Grandma (Viewer)
  - Dad (Admin)

**Step 3: Change Grandma's Permission**
- Mom clicks on Grandma's name
- Sees dropdown: "Permission Level"
- Current: Viewer
- Options:
  - Viewer (can see stories)
  - Editor (can see and edit stories)
  - Admin (can see, edit, and manage permissions)
- Mom selects: "Editor"

**Step 4: Permission Updated**
- System saves change immediately
- Grandma's access upgraded to Editor

**Step 5: Grandma Has New Capabilities**
- Next time Grandma logs in
- Can now edit Emma's stories
- Can create new stories in Emma's library
- Still cannot manage permissions (not an admin)

**Step 6: Notifications**
- Grandma receives email: "Your access to Emma's stories has been updated to Editor"
- Mom sees confirmation

### Permission Levels Explained

**Viewer:**
- Can see and read stories
- Cannot edit or delete
- Cannot invite others
- Cannot manage settings

**Editor:**
- Can see and read stories
- Can edit stories
- Can create new stories in the library
- Cannot delete library or manage permissions
- Cannot invite others

**Admin:**
- Can see, read, and edit stories
- Can create and delete stories
- Can invite others
- Can manage permissions for others
- Cannot delete the library itself (only Owner can)

**Owner:**
- Full control over everything
- Can delete the entire library
- Can transfer ownership
- Usually the parent for child profiles

### What This Journey Shows

✅ **Flexible permissions:** Can adjust access levels as needs change  
✅ **Granular control:** Four levels with clear capabilities  
✅ **Instant updates:** Changes take effect immediately  
✅ **Notifications:** People know when their access changes  
✅ **Parent control:** Parent (Owner/Admin) manages all access

---

## Journey 14: Profile Update (Email Change)

**This journey shows how profile changes work with privacy verification.**

### What Happens

**Step 1: Parent Wants to Update Email**
- Mom's email changed from old@example.com to new@example.com
- Logs into Storytailor.com
- Goes to "Account Settings"

**Step 2: Update Parent Email**
- Clicks "Update Email"
- Enters new email: new@example.com
- System asks for password (security check)

**Step 3: Verification Email to New Address**
- Email sent to new@example.com
- Subject: "Verify your new email for Emma's account"
- Contains verification link

**Step 4: Mom Verifies New Email**
- Mom clicks verification link
- New email confirmed
- Old email receives notification: "Your email was changed"

**Step 5: All Future Communications Use New Email**
- Consent communications go to new email
- Data access requests go to new email
- Safety notifications go to new email

### What This Journey Shows

✅ **Verified changes:** Cannot change email without verification  
✅ **Security check:** Password required  
✅ **Notification:** Old email notified of change  
✅ **Seamless update:** All systems use new email going forward

---

## Journey 15: Account Deletion (Child or Parent Request)

**This journey shows how accounts are deleted completely.**

### What Happens

**Step 1: Parent Logs Into Storytailor.com**
- Parent logs into account
- Goes to "Account Settings" → "Manage Children's Accounts"
- Clicks on Emma's account

**Step 2: Access Account Deletion**
- Parent clicks "Privacy & Data"
- Scrolls to "Delete Account" section (bottom of page)
- Clicks "Delete Emma's Account"

**Step 3: Deletion Confirmation Screen**
- System shows warning: "This will permanently delete everything. This cannot be undone."
- Lists what will be deleted:
  - Emma's account
  - All stories (5 stories)
  - All characters (3 characters)
  - Parent email
  - Consent records
  - All personal information
- Note: "Audit logs will be anonymized but kept for legal compliance"

**Step 4: Parent Confirms**
- Parent enters password (security check)
- Types "DELETE" to confirm (prevents accidental deletion)
- Clicks "Permanently Delete Account"

**Step 5: Everything Deleted Immediately**
- Emma's account deleted
- All data permanently removed
- Cannot be recovered
- Audit logs anonymized

**Step 6: Confirmations**
- Screen shows: "Emma's account has been deleted"
- Parent receives email:
  - Deletion timestamp
  - What was deleted
  - What was anonymized
  - Confirmation number

### Alternative Method: Email Request

If parent doesn't have account access:
- Can email privacy@storytailor.com
- We verify identity thoroughly (call/video chat for security)
- Process deletion within 24-48 hours
- Send confirmation

### What This Journey Shows

✅ **Complete deletion:** Everything is removed  
✅ **Cannot recover:** Truly deleted, not just hidden  
✅ **Legal compliance:** Audit logs anonymized, not deleted  
✅ **Clear confirmation:** Parent knows it's done  
✅ **Parent verification:** Extra security for permanent action

---

## Summary: How These Journeys Demonstrate COPPA Compliance

### Age Verification (Journeys 1, 2, 9)
Shows that:
- System automatically detects age
- Different flows for under-13 vs. 13+
- Cannot bypass age protections

### Parental Consent (Journeys 1, 3, 12)
Shows that:
- Parents receive clear information
- Parents make informed decision
- Children cannot access without consent
- Consent is tracked and auditable

### Parental Rights (Journeys 4, 6, 7, 8)
Shows that:
- Parents can access all child data
- Parents can delete all child data
- Parents can export all child data
- Parents can revoke consent anytime
- All requests are verified for security

### Data Minimization (Journey 11)
Shows that:
- Only necessary data collected
- Clear purpose for each data point
- No hidden tracking
- User control over their data

### Security & Verification (All journeys)
Shows that:
- Parent identity verified before sensitive actions
- Email verification for changes
- Audit trail maintained
- Secure communication throughout

---

**Note to PRIVO Reviewers:** These journeys describe how the system will work. The UI is in development, but the backend COPPA infrastructure is complete and functional. All protections described here are enforced at the database and API level, ensuring compliance regardless of the user interface.

---

**Storytailor Inc.**  
7131 w 135th, #1074  
Overland Park, KS 66223

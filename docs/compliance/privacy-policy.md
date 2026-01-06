Status: PRIVO-Aligned Privacy Policy  
Audience: Parents | Children | PRIVO Auditor  
Last-Updated: 2025-01-15  
Owner: Storytailor Legal & Compliance Team  
Legal-Review: Pending  
Doc-ID: PRIVACY-POLICY-2025-001

# Storytailor Privacy Policy

**Effective Date:** January 15, 2025  
**Last Updated:** January 15, 2025

## Welcome!

Hi! This is our Privacy Policy. It tells you how we protect your information when you use Storytailor. We wrote it in simple words so it's easy to understand.

**For Parents:** This policy explains how we collect, use, and protect your child's information in compliance with the Children's Online Privacy Protection Act (COPPA) and other privacy laws. We are committed to protecting children's privacy.

## What is Storytailor?

Storytailor is a service that helps create stories through voice conversations. You can talk to Storytailor, and it will help you create amazing stories with characters and adventures!

**Important:** Storytailor is a backend service that works through voice assistants (like Alexa) and other apps. We don't have our own website or app that you can visit directly.

## Information We Collect

### For Children Under 13

If you are under 13 years old, we need to collect some information to make Storytailor work, but we only collect what we really need:

**What We Collect:**
- Your age (to make sure we protect your privacy)
- Your parent's email address (so we can get permission from your parent)
- The stories you create (so you can save and share them)
- The characters you create (so they can be in your stories)
- Your voice conversations (we keep these for only 30 days, then delete them)
- How you're feeling (we keep this for 1 year, then make it anonymous)

**What We DON'T Collect:**
- Your full name
- Your home address
- Your phone number
- Your school name
- Photos of you
- Your location

### For Parents

If you're a parent, we collect:
- Your email address (so we can contact you about your child's account)
- Information you provide when giving consent for your child to use Storytailor

## Why We Collect Information

We only collect information to:
1. **Make Storytailor work** - So you can create and save stories
2. **Keep you safe** - So we can help if something concerning happens
3. **Follow the law** - So we can get permission from parents for children under 13
4. **Make Storytailor better** - So we can improve the service (but we make your information anonymous first)

**We never sell your information to anyone.**

## How We Use Your Information

### Stories and Characters
- We save your stories so you can come back and read them later
- We save your characters so they can appear in your stories
- Only you and your family can see your stories

### Voice Conversations
- We keep what you say for 30 days to help Storytailor understand you
- After 30 days, we delete it completely
- We never share your conversations with anyone

### How You're Feeling
- We keep track of how you're feeling to help Storytailor understand you better
- After 1 year, we make this information anonymous (we remove your name and personal details)
- This helps us make Storytailor better for everyone

### Safety
- If something concerning happens, we might need to tell your parent
- We keep a record of safety incidents (but we don't save the exact words you said, just a summary)
- This helps keep you safe

## Parental Consent

### For Children Under 13

**Important:** If you're under 13, we need permission from your parent before you can use Storytailor.

**What Parents Need to Do:**
1. Provide your parent's email address when you sign up
2. Your parent will receive an email asking for permission
3. Your parent needs to give permission before you can use Storytailor
4. Your parent can take away permission at any time

**How Parents Give Permission:**
- Parents receive an email with a link to give permission
- Parents can also use our API to give permission
- Parents can check permission status anytime
- Parents can revoke permission anytime

## Your Parent's Rights

Your parent has special rights to protect your information:

### 1. Right to See Your Information
Your parent can ask to see all the information we have about you. We'll provide it within 30 days.

**How to Request:**
- Email: privacy@storytailor.com
- API: `GET /v1/parent/data?userId=<your_user_id>`

### 2. Right to Delete Your Information
Your parent can ask us to delete all your information. We'll delete it right away.

**How to Request:**
- Email: privacy@storytailor.com
- API: `DELETE /v1/parent/data?userId=<your_user_id>`

### 3. Right to Export Your Information
Your parent can ask for a copy of all your information. We'll send it in a format they can read.

**How to Request:**
- Email: privacy@storytailor.com
- API: `GET /v1/parent/export?userId=<your_user_id>`

### 4. Right to Revoke Consent
Your parent can take away permission for you to use Storytailor at any time.

**How to Revoke:**
- Email: privacy@storytailor.com
- API: `POST /v1/consent/revoke`

## How Long We Keep Your Information

We don't keep your information forever. Here's how long we keep different types of information:

| Type of Information | How Long We Keep It | What Happens After |
|---------------------|---------------------|-------------------|
| **Voice Conversations** | 30 days | Deleted completely |
| **How You're Feeling** | 1 year | Made anonymous (your name removed) |
| **Stories You Create** | Until you delete them | You can delete them anytime |
| **Characters You Create** | Until you delete them | You can delete them anytime |
| **Safety Records** | 7 years (required by law) | Made anonymous after 1 year |
| **Parent Email** | Until account is deleted | Deleted when account is deleted |

**Automatic Deletion:** We automatically delete information when the time is up. You don't need to do anything.

## Who Can See Your Information

### People Who Can See Your Information

1. **You and Your Family** - You can see your own stories and information
2. **Your Parent** - Your parent can see all your information
3. **Storytailor Team** - Our team can see your information to:
   - Help you if you have a problem
   - Keep you safe
   - Make Storytailor work better
   - Follow the law

### People Who CANNOT See Your Information

- Other kids using Storytailor
- Strangers
- Advertisers
- Companies that want to sell you things

**We never share your information with anyone who wants to sell you things.**

## Third-Party Services

We use some other companies to help Storytailor work. Here's who they are and what they do:

### AWS (Amazon Web Services)
- **What they do:** Help us store information and run Storytailor
- **What information they see:** Your stories, characters, and account information
- **How they protect it:** They use strong encryption and security
- **More information:** https://aws.amazon.com/compliance/

### Supabase
- **What they do:** Help us store your information in a database
- **What information they see:** Your stories, characters, and account information
- **How they protect it:** They use encryption and special security rules
- **More information:** https://supabase.com/security

### SendGrid (Twilio)
- **What they do:** Help us send emails to parents
- **What information they see:** Only parent email addresses (not child information)
- **How they protect it:** They use encryption when sending emails
- **More information:** https://support.sendgrid.com/hc/en-us/articles/360041790233-Is-Twilio-SendGrid-HIPAA-Compliant

**Important:** These companies are not allowed to use your information for anything except helping Storytailor work. They have signed agreements promising to protect your information.

## How We Keep Your Information Safe

We work really hard to keep your information safe:

### Encryption
- All your information is encrypted (like a secret code) when it's stored
- All your information is encrypted when it's sent over the internet
- This means even if someone tries to see it, they can't read it

### Access Control
- Only people who need to see your information can see it
- Everyone who works at Storytailor has special training about privacy
- We check regularly to make sure only the right people can see your information

### Security Rules
- We have special rules (called "Row Level Security") that make sure you can only see your own information
- Parents can only see their own child's information
- We log everything so we can see if something goes wrong

### Regular Checks
- We check our security regularly
- We fix any problems we find right away
- We have a plan if something bad happens

## What Happens If Something Goes Wrong

If we think someone might have seen your information when they shouldn't have, we will:
1. Tell your parent right away
2. Tell the authorities if the law requires it
3. Fix the problem
4. Do everything we can to make sure it doesn't happen again

## Changes to This Policy

Sometimes we might need to change this Privacy Policy. If we make important changes, we will:
- Tell your parent by email
- Put a notice on our website (if we have one)
- Update the "Last Updated" date at the top

**Your parent can always see the latest version of this policy.**

## Special Rules for Children

### Children Under 13

If you're under 13, we have special rules to protect you:
- We need your parent's permission before you can use Storytailor
- We collect less information about you
- We delete your information faster
- We have extra security to protect you
- Your parent has special rights to see and delete your information

### Children 13 and Older

If you're 13 or older, you can use Storytailor, but we still protect your privacy:
- We still use encryption and security
- We still delete your information when we don't need it
- You can ask us to delete your information anytime

## Your Choices

### You Can:
- Ask your parent to see your information
- Ask your parent to delete your information
- Ask your parent to stop letting you use Storytailor
- Delete your stories and characters anytime

### You Cannot:
- Use Storytailor without your parent's permission (if you're under 13)
- See other kids' stories or information
- Share your information with strangers

## Contact Us

### For Privacy Questions

**Email:** privacy@storytailor.com  
**Phone:** [To be provided]  
**Mailing Address:** [To be provided]

### For Technical Questions

**Email:** tech@storytailor.com

### For Safety Concerns

**Email:** safety@storytailor.com

**We respond to all privacy questions within 30 days.**

## For Parents: Detailed Information

### COPPA Compliance

Storytailor complies with the Children's Online Privacy Protection Act (COPPA). This means:
- We require verifiable parental consent before collecting information from children under 13
- We only collect information necessary for the service
- We provide parents with full control over their child's information
- We maintain strict security measures
- We delete information according to our retention policies

### Verifiable Parental Consent (VPC)

**How It Works:**
1. When a child under 13 registers, we require a parent email address
2. We send an email to the parent requesting consent
3. The parent can verify consent through our API or email link
4. Consent can be revoked at any time
5. We maintain records of all consent actions

**API Endpoints:**
- `POST /v1/consent/request` - Request parental consent
- `POST /v1/consent/verify` - Verify parental consent
- `GET /v1/consent/status` - Check consent status
- `POST /v1/consent/revoke` - Revoke consent

### Data Retention Policies

**Automated Deletion:**
- Voice transcripts: Deleted after 30 days
- Emotional data: Anonymized after 365 days
- Conversation states: Deleted after 24 hours
- Voice codes: Deleted after 1 day
- Audit logs: Anonymized after 7 years (legal requirement)

**Manual Deletion:**
- Parents can request immediate deletion of all child data
- Stories and characters can be deleted by the child or parent at any time
- Account deletion removes all associated data

### Security Measures

**Encryption:**
- All data encrypted at rest (in storage)
- All data encrypted in transit (when sent over internet)
- TLS 1.3 for all API communications

**Access Control:**
- Row Level Security (RLS) on all database tables
- User-based access control
- Parent-child relationship verification
- Service role access only for system operations

**Audit Logging:**
- All data access logged
- All consent actions logged
- All deletion requests logged
- Safety incidents logged (with content hashing, not raw text)

### Third-Party Service Agreements

All third-party services have Data Processing Agreements (DPAs) that ensure:
- They only use data to provide the service
- They maintain appropriate security measures
- They comply with applicable privacy laws
- They don't use data for their own purposes

**DPA References:**
- AWS: Automatically applies (incorporated into AWS Service Terms)
- Supabase: Available at https://supabase.com/legal/dpa
- SendGrid: Available through Twilio legal documentation

### Parental Rights (Detailed)

**Right to Access (COPPA §312.3, GDPR Article 15):**
- Parents can request all information about their child
- We provide information within 30 days
- Information provided in machine-readable format (JSON)
- Includes: user data, stories, characters, emotions, consent records, safety incidents

**Right to Delete (COPPA §312.5, GDPR Article 17):**
- Parents can request immediate deletion of all child data
- We delete data immediately upon verified request
- Audit logs anonymized (retained for legal compliance)
- Confirmation sent to parent

**Right to Export (GDPR Article 20):**
- Parents can request export of all child data
- Provided in JSON format
- Downloadable from secure S3 link (expires in 7 days)
- Includes all data types

**Right to Revoke Consent (COPPA §312.5):**
- Parents can revoke consent at any time
- Revocation immediately stops data collection
- Existing data can be deleted upon request
- Confirmation sent to parent

### How to Exercise Rights

**Via Email:**
Send email to privacy@storytailor.com with:
- Subject: "Parental Rights Request"
- Your name and relationship to child
- Child's user ID or email
- Type of request (access, deletion, export, revoke consent)
- Verification of parent identity

**Via API:**
Use our REST API endpoints (see API documentation):
- Authentication required (parent JWT token)
- All requests logged for audit purposes
- Responses provided in JSON format

### Data Minimization

We only collect information necessary for:
1. **Service Delivery:** Stories, characters, conversation state
2. **Safety:** Safety incident detection and parent notifications
3. **Compliance:** Age verification, parental consent
4. **Improvement:** Anonymized emotional data (after 1 year)

We do NOT collect:
- Full names
- Physical addresses
- Phone numbers
- School information
- Photos or videos
- Location data (beyond IP address for security)

### International Users

**GDPR Compliance:**
Storytailor complies with the General Data Protection Regulation (GDPR) for users in the European Union. All rights described above apply to EU users.

**Data Transfers:**
- Data stored in US-based servers (AWS us-east-1)
- Data transfers protected by Standard Contractual Clauses (SCCs)
- All third-party services have GDPR-compliant DPAs

### PRIVO Certification

Storytailor is pursuing PRIVO COPPA Safe Harbor certification. This certification demonstrates our commitment to protecting children's privacy and complying with COPPA requirements.

**PRIVO Safe Harbor:**
- PRIVO is an FTC-approved COPPA Safe Harbor program
- Certification demonstrates compliance with COPPA
- Regular audits ensure ongoing compliance
- More information: https://www.privo.com/

## Questions?

If you have any questions about this Privacy Policy or how we protect your information, please contact us:

**Email:** privacy@storytailor.com  
**We respond within 30 days.**

---

**Storytailor Privacy Policy**  
Version 1.0  
Effective: January 15, 2025  
Last Updated: January 15, 2025

**This policy is PRIVO-aligned and COPPA-compliant.**

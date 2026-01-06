# OpenAI Support Contact - Medical Device False Positives

**Date:** December 21, 2025  
**Contact:** jq@storytailor.com  
**Platform:** storytailor.com | storytailor.dev  
**Issue:** Content moderation false positives blocking medical representation for children

---

## Support Request Letter

**To:** OpenAI Safety Team (help.openai.com)  
**From:** JQ Sirls, Founder & CEO, Storytailor Inc.  
**Subject:** Medical Device Representation - False Positive Safety Violations

Dear OpenAI Safety Team,

We are Storytailor (storytailor.com), a children's therapeutic storytelling platform serving hospitalized children ages 3-10. Our foundational principle: "Can we create a magical experience for a child in the hospital who's just sitting there miserable?"

### THE ISSUE

Your API safety filter is incorrectly flagging medical device representations as `safety_violations=[sexual]`, preventing us from serving children who desperately need to see themselves.

### WHAT WE'RE TRYING TO CREATE

Personalized character images for children wearing **halo cervical orthosis** (medical neck/spine stabilization devices). These children are in hospitals recovering from serious injuries. They cannot find themselves represented in ANY children's book or media.

**Our approach:**
- "Brave healing helper decorated with favorite stickers"
- Device personalized with superhero emblems, rainbows, hearts, stars
- Child shown with dignity, bravery, and hope
- Age-appropriate, G-rated, therapeutic content

### EVIDENCE OF FALSE POSITIVES

**Successful Generations (Proving It's Possible):**

Request ID: req_980d8ced8dcc4f2d83ba3eefff607a6b (initially rejected, then passed)
- African American child (age 5) with halo device decorated with Batman/Superman stickers
- Result: Beautiful, dignified, brave representation
- NO sexual content

Request ID: req_663d6118965648cdb7cf975cf4407dca (initially rejected, then passed)
- Chinese child (age 4) with halo device decorated with rainbow/hearts/stars
- Result: Hopeful, joyful, age-appropriate representation
- NO sexual content

**Inappropriate False Positives (Same Language, Incorrectly Rejected):**

The following requests have IDENTICAL language to successful cases but were incorrectly rejected with `[sexual]` tags:

- req_e5f789329a54433287a15bef8f0db933 (Mexican child, age 6, animal stickers)
- req_c99f728fbbf3442d93be5360d5b207f1 (Samoan child, age 6, ocean stickers)
- req_bfa98387b5214b6d976e2e5f8d1d4406 (Indian child, age 5, star stickers)
- req_f7cdf0000df544d9bad5e449be81a508 (Human child with medical halo device)
- req_bb612be9b00145eea7cae569f4db2372 (Superhero with halo device - context version)
- req_3e6b41e9657f4069a28f4c40c6d36f43 (Water elemental - fantasy context)

**Plus 20+ additional false positives** - all tagged `[sexual]`, none containing actual sexual content.

### THE PATTERN

**What appears to trigger false positives:**
- Medical device descriptions combined with children
- Certain age descriptors ("early elementary proportions")
- Certain sticker themes (animals, ocean, nature)
- Completely unpredictable variations

**What sometimes passes:**
- Same language with different ethnicities
- Ages 4-5 vs ages 6+
- Superhero or rainbow/abstract sticker themes
- RETRY attempts (same prompt rejected then passes)

**This inconsistency suggests a training issue in your content moderation system.**

### THE IMPACT

A child with a halo cervical orthosis sitting miserable in a hospital bed:
- Cannot find themselves in any children's book
- Cannot see themselves as brave and powerful
- Storytailor exists specifically to serve THIS child
- Your false positives prevent us from helping them

**These are the most vulnerable children** - seriously injured, scared, isolated. They deserve representation with dignity.

### WHAT WE NEED

1. **Review our use case** - This is legitimate children's therapeutic content
2. **Guidance** on acceptable language for medical devices + children representations
3. **Whitelist consideration** for medical representation in children's therapeutic contexts
4. **Fix** for inappropriate `[sexual]` tagging on medical device imagery

### SUPPORTING EVIDENCE

We have:
- Working successful examples (2 children with halo devices generated beautifully)
- 40+ other successful images (wheelchairs, prosthetics, Down syndrome, diverse species)
- Comprehensive testing showing the system CAN work
- Pattern documentation showing inconsistent filter behavior

**The technology exists to do this right. Your filter inconsistency is the barrier.**

### OUR COMMITMENT

- All content is G-rated, age-appropriate, therapeutic
- COPPA compliant platform with verified parent accounts
- Medical accuracy combined with child-friendly framing
- Dignity-first representation for children with medical needs
- Serving children in the most challenging circumstances (hospitals, medical treatment)

### REQUEST FOR PARTNERSHIP

We're trying to solve a problem NO ONE else is solving - authentic representation for medically complex children in therapeutic contexts. Your API enables this mission.

**Can we work together to:**
1. Fix the false positive tagging issue
2. Establish guidelines for medical representation in children's content
3. Enable this critically important use case

**These children are counting on us.** Every false positive rejection is a child who can't see themselves.

---

**Contact Information:**

JQ Sirls, Founder & CEO  
Email: jq@storytailor.com  
Platform: storytailor.com | storytailor.dev  
API Key: [Your API key if needed]

**Sample Successful Images Available Upon Request**

Thank you for your consideration and partnership in serving the most vulnerable children.

Sincerely,  
JQ Sirls  
Storytailor Inc.

---

## Evidence Attachments

**Include with support request:**
1. Screenshots of the 2 successful African American and Chinese children (proving it works)
2. List of 20+ request IDs with false `[sexual]` tags
3. Example prompt showing there's no inappropriate content
4. Platform description and mission statement
5. COPPA compliance documentation

**Follow-up:** Request call/meeting to discuss medical representation guidelines

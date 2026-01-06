# Communication Tone Guide

**Status**: MANDATORY PATTERN - All email copy must comply  
**Version**: 1.0  
**Date**: December 25, 2025  
**Enforcement**: Word count limits, tone validation, code-enforced checks

---

## Core Voice: Calm, Selective, Quietly Brilliant

Storytailor's communication voice is:
- **Confident without arrogance** - Trust the insight, no hedging
- **Selective, not noisy** - Send only when signal is strong
- **Actionable, not informational** - Every email has ONE clear action

---

## Principles

### 1. Confidence Without Arrogance

**Don't hedge**:
- ❌ "We think maybe possibly Emma might like this..."
- ❌ "Based on our analysis, it appears that perhaps..."
- ❌ "We wanted to share what we found if that's helpful..."

**Trust the insight**:
- ✅ "Emma loved 'The Brave Dragon.'"
- ✅ "Create another dragon story?"
- ✅ "Ruby is Emma's favorite character."

**Don't apologize**:
- ❌ "Sorry to bother you but..."
- ❌ "We don't mean to be pushy..."
- ❌ "Hope this isn't too much..."

**Be direct**:
- ✅ "Emma loved [story]."
- ✅ "Your stories were shared 5 times."
- ✅ "Bedtime is working."

**Don't beg**:
- ❌ "Please pretty please read this important message..."
- ❌ "We really hope you'll consider..."
- ❌ "It would mean a lot if you..."

**Be respectful**:
- ✅ "Create another? [Link]"
- ✅ "Continue pathway? [Yes] [Pause]"
- ✅ "Update preferences [Link]"

---

### 2. Selective, Not Noisy

**Fewer words, more meaning**:
- Every word must earn its place
- If it doesn't add value, delete it
- Trust readers to understand without over-explanation

**Send only when signal is strong**:
- 2+ events for daily digest (not 1)
- 5+ days for therapeutic suggestion (not 3)
- Clear improvement for effectiveness insights

**Silence when appropriate**:
- No activity today? No email.
- Pattern unclear? Wait for more data.
- User not engaged? Reduce frequency.

---

### 3. Actionable, Not Informational

**Every email needs ONE clear action.**

**Wrong** (informational only):
```
Subject: Your Weekly Analysis is Ready

Hi there!

We wanted to let you know that we've finished analyzing your child's 
story engagement patterns for this week. We found some interesting 
things that you might want to review. The data shows various metrics 
about how Emma interacted with her stories.

Would you like to see the full report? Let us know!

Thanks,
The Storytailor Team
```

**Right** (actionable):
```
Subject: Emma loved "The Brave Dragon"

Emma loved "The Brave Dragon."

Fell asleep 5 minutes faster than usual. Replayed dragon scene 3x.

Create another dragon story? [Link]
```

**Principles applied**:
- Subject: Specific insight
- Body: 3 sentences max
- Action: Clear CTA
- No fluff

---

## Email Structure Template

### Universal Structure

```typescript
interface EmailStructure {
  subject: string;          // [Specific insight or action]
  opening: string;          // [One sentence: What happened]
  context: string;          // [One-two sentences: Why it matters]
  action: string;           // [One sentence: What to do]
  cta: string;              // [Link]
}

// Example
{
  subject: "Emma loved 'The Brave Dragon'",
  opening: "Emma loved 'The Brave Dragon.'",
  context: "Fell asleep 5 minutes faster. Replayed dragon scene 3x.",
  action: "Create another dragon story?",
  cta: "[Link]"
}
```

### Word Limits (Enforced)

```typescript
const WORD_LIMITS = {
  transactional: 50,   // Story complete, payment receipt
  insight: 100,        // Daily digest, story effectiveness
  weekly_report: 200,  // Weekly insights
  monthly_report: 300  // Monthly progress
};

// Code enforcement
function validateWordCount(emailBody: string, emailType: string): boolean {
  const wordCount = emailBody.split(/\s+/).length;
  const limit = WORD_LIMITS[emailType];
  
  if (wordCount > limit) {
    logger.error('Word count exceeded', {
      emailType,
      wordCount,
      limit
    });
    return false;
  }
  
  return true;
}
```

**Rule**: No email should require scrolling on mobile.

---

## Forbidden Phrases

### Marketing Fluff (Never Use)

```typescript
const FORBIDDEN_PHRASES = [
  /we're excited to share/i,
  /just wanted to let you know/i,
  /hope this email finds you well/i,
  /thanks so much for being a valued user/i,
  /please don't hesitate to reach out/i,
  /we'd love to hear from you/i,
  /your feedback is important to us/i,
  /at storytailor, we believe/i
];

// Code enforcement
function hasForbiddenPhrases(emailBody: string): string[] {
  return FORBIDDEN_PHRASES
    .filter(pattern => pattern.test(emailBody))
    .map(p => p.source);
}
```

---

## Required Elements

### Every Insight Email Must Have

```typescript
interface RequiredElements {
  specificName: boolean;      // "Emma", "The Brave Dragon" (not "your child", "the story")
  comparativeData: boolean;   // "5 minutes faster", "3x more" (not "82 score")
  singleCTA: boolean;         // ONE action (not multiple)
  confidence: boolean;        // No hedging ("loved" not "seemed to maybe like")
}

// Code enforcement
function validateRequiredElements(email: string): RequiredElements {
  return {
    specificName: hasSpecificName(email),
    comparativeData: /faster|slower|better|worse|more|less|vs|than/.test(email),
    singleCTA: (email.match(/\[.*?\]/g) || []).length === 1,
    confidence: !/(maybe|perhaps|possibly|might|could)/.test(email)
  };
}

// Block send if missing required elements
const validation = validateRequiredElements(emailBody);
if (!validation.comparativeData) {
  throw new Error('Email must include comparative data');
}
```

---

## Good vs Bad Examples

### Example 1: Daily Digest

**Bad** (wordy, apologetic, informational):
```
Subject: Your Daily Activity Summary is Ready!

Hi there!

We hope you're having a great day! We wanted to reach out to share 
your daily activity summary for December 24th. We think you might 
find it interesting to see what Emma did today with Storytailor.

She read 2 stories today, which is pretty good! She seemed to enjoy 
"The Brave Dragon" more than "Moonlight Dreams" based on our analysis. 
We noticed she replayed a scene in the dragon story, which might 
indicate she really liked it.

If you'd like to see more details, just let us know! We're always 
here to help.

Have a wonderful evening!
The Storytailor Team
```

**Good** (brief, confident, actionable):
```
Subject: Emma read 2 stories today

Emma read 2 stories today.

Loved "The Brave Dragon" (replayed 3x). Skipped "Moonlight Dreams" at 40%.

Create another dragon story? [Link]
```

### Example 2: Therapeutic Suggestion

**Bad** (medical-ish, pushy, over-explained):
```
Subject: We Think Emma Might Have Anxiety - Please Read

Dear Parent,

We've been monitoring Emma's emotional patterns and we're concerned 
that she may be exhibiting symptoms of childhood anxiety disorder. 
Based on our sophisticated AI analysis, we believe she requires 
therapeutic intervention.

We strongly recommend you immediately enroll her in our CBT-based 
anxiety treatment program. This is an 8-week course that has been 
shown to be effective for children with anxiety disorders like Emma's.

Please click here to start treatment right away. If you don't respond 
within 24 hours, we'll follow up again.

Concerned about Emma,
The Storytailor Team
```

**Good** (observational, optional, supportive):
```
Subject: Stories might help with Emma's worries

We noticed Emma felt worried 5 days this week.

Some children benefit from anxiety-support stories (CBT-based, 8 weeks). 
Completely optional.

This is not a diagnosis. Consider discussing with Emma's healthcare 
provider if you're concerned.

Explore pathway? [Yes, tell me more] [No, thanks]

Crisis resources: 988, text HOME to 741741
```

### Example 3: Story Complete

**Bad** (over-enthusiastic, generic):
```
Subject: 🎉 Amazing News - Your Story is Finally Ready!!!

Hey there, Awesome Parent!

We are SO EXCITED to tell you that your absolutely incredible story 
"The Brave Dragon" is now complete and ready for you to enjoy! We 
worked really hard on it and we think you're going to LOVE it!

Your story includes everything you asked for and more! We can't wait 
for you to experience it with your child! It's going to be magical!

Click here to see your amazing story right now!!! Don't miss out!!!

Can't wait to hear what you think!
Your Friends at Storytailor 🎉✨🌟
```

**Good** (matter-of-fact, specific):
```
Subject: "The Brave Dragon" is ready

"The Brave Dragon" is ready.

Includes audio (12 min), 6 illustrations, PDF, activities.

Play story? [Link]
```

---

## Tone Validation (Code-Enforced)

```typescript
interface ToneValidation {
  wordCount: number;
  hasComparative: boolean;
  ctaCount: number;
  hasForbiddenPhrases: boolean;
  hasRequiredElements: boolean;
  toneScore: number; // 0-1
}

function validateEmailTone(emailBody: string, emailType: string): ToneValidation {
  const wordCount = emailBody.split(/\s+/).length;
  const comparativePatterns = /faster|slower|better|worse|more|less|improved|vs|than/i;
  const hasComparative = comparativePatterns.test(emailBody);
  const ctaCount = (emailBody.match(/\[.*?\]/g) || []).length;
  const forbidden = hasForbiddenPhrases(emailBody);
  const required = validateRequiredElements(emailBody);
  
  // Calculate tone score
  let score = 1.0;
  if (wordCount > WORD_LIMITS[emailType]) score -= 0.3;
  if (!hasComparative) score -= 0.2;
  if (ctaCount !== 1) score -= 0.2;
  if (forbidden.length > 0) score -= 0.3;
  
  return {
    wordCount,
    hasComparative,
    ctaCount,
    hasForbiddenPhrases: forbidden.length > 0,
    hasRequiredElements: required.comparativeData && required.singleCTA,
    toneScore: Math.max(score, 0)
  };
}

// Reject if score < 0.7
async function sendEmailWithToneValidation(email: Email): Promise<void> {
  const validation = validateEmailTone(email.body, email.type);
  
  if (validation.toneScore < 0.7) {
    logger.error('Email tone validation failed', {
      toneScore: validation.toneScore,
      wordCount: validation.wordCount,
      issues: {
        tooLong: validation.wordCount > WORD_LIMITS[email.type],
        noComparative: !validation.hasComparative,
        wrongCTACount: validation.ctaCount !== 1,
        forbiddenPhrases: validation.hasForbiddenPhrases
      }
    });
    
    throw new Error('Email failed tone validation');
  }
  
  // Pass validation - send
  await emailService.sendEmail(email);
}
```

---

## Subject Line Rules

### Principles

1. **Specific, not generic**
   - ✅ "Emma loved 'The Brave Dragon'"
   - ❌ "Your Weekly Report"

2. **Insight, not announcement**
   - ✅ "Bedtime is working"
   - ❌ "Important Update Inside"

3. **Outcome, not process**
   - ✅ "Story ready"
   - ❌ "Story Generation Complete"

4. **Personal, not broadcast**
   - ✅ "Emma's anxiety improved"
   - ❌ "Mental Health Update"

### Examples

**Transactional**:
- ✅ "Story ready"
- ✅ "Character complete"
- ✅ "Payment received"
- ❌ "Your Storytailor Transaction is Complete"

**Insights**:
- ✅ "Emma loved 'The Brave Dragon'"
- ✅ "Ruby is Emma's favorite"
- ✅ "Bedtime is working"
- ❌ "Your Weekly Insights Report"

**Action Required**:
- ✅ "Payment failed - update card"
- ✅ "Trial ends tomorrow"
- ✅ "Emma hasn't read in 5 days"
- ❌ "Important: Action Required on Your Account"

---

## Body Copy Rules

### Opening Sentence

**Repeat the insight** (from subject):
```
Subject: Emma loved "The Brave Dragon"
Opening: Emma loved "The Brave Dragon."
```

**Why repeat?**: Email clients show subject + first line. Reinforce the insight.

### Middle Section (Context)

**One or two sentences** explaining why it matters:
```
Fell asleep 5 minutes faster than usual. Replayed dragon scene 3x.
```

**Use comparative data**, not absolute scores.

### Closing (Action)

**One sentence** with clear CTA:
```
Create another dragon story? [Link]
```

**ONE action**, not multiple:
- ❌ "Create story [Link] or view analytics [Link] or update preferences [Link]"
- ✅ "Create another? [Link]"

---

## Email Length Targets

### By Type

```typescript
const WORD_LIMITS = {
  transactional: 50,   // "Story ready. Includes audio, art, PDF. Play? [Link]"
  insight: 100,        // Daily digests, story effectiveness
  weekly_report: 200,  // Weekly insights with multiple data points
  monthly_report: 300  // Monthly progress summaries
};
```

**Enforcement**:
```typescript
async function enforceWordLimit(emailBody: string, emailType: string): Promise<void> {
  const wordCount = emailBody.split(/\s+/).length;
  const limit = WORD_LIMITS[emailType];
  
  if (wordCount > limit) {
    throw new Error(`Email exceeds word limit: ${wordCount} > ${limit}`);
  }
}
```

**No email should require scrolling on mobile.**

---

## Forbidden Phrases

### Never Use These

```typescript
const FORBIDDEN_PHRASES = [
  // Marketing fluff
  /we're excited to share/i,
  /just wanted to let you know/i,
  /hope this email finds you well/i,
  /thanks so much for being a valued user/i,
  /please don't hesitate to reach out/i,
  
  // Apologetic
  /sorry to bother you/i,
  /we don't mean to be pushy/i,
  /hope this isn't too much/i,
  
  // Begging
  /please pretty please/i,
  /we really hope/i,
  /it would mean a lot/i,
  
  // Generic greetings
  /dear (valued )?customer/i,
  /to whom it may concern/i,
  /hello there/i,
  
  // Over-explanation
  /we wanted to reach out because/i,
  /the reason we're contacting you/i,
  /let us explain/i
];
```

---

## Required Elements Checklist

**Every insight email must have**:
- [ ] Specific names ("Emma", not "your child")
- [ ] Specific stories ("The Brave Dragon", not "your story")
- [ ] Comparative data ("5 minutes faster", not "score 82")
- [ ] Single clear action ("Create another?")
- [ ] Confident tone (no hedging)
- [ ] Word count within limits
- [ ] ONE CTA only

---

## Example Rewrites

### Example 1: Story Complete

**Before** (verbose, generic):
```
Subject: Your Story Generation is Complete

Dear Storytailor User,

We're pleased to inform you that the story generation process for your 
requested story has been completed successfully. Your story is now 
available in your library and includes all the assets you selected 
during the creation process.

We hope you and your child enjoy listening to this story together. If 
you have any questions or need assistance, please don't hesitate to 
contact our support team.

Best regards,
The Storytailor Team
```

**After** (brief, specific):
```
Subject: "The Brave Dragon" is ready

"The Brave Dragon" is ready.

Includes audio (12 min), 6 illustrations, PDF, activities.

Play story? [Link]
```

### Example 2: Referral Reward

**Before** (apologetic, confusing):
```
Subject: You May Have Earned a Reward - Please Review

Hi there,

We wanted to let you know that it looks like one of your friends might 
have signed up using your referral code, and if they complete their 
subscription, you should be eligible for a reward. We're still 
processing this, but we thought you'd want to know.

We'll send another email once everything is confirmed. Thanks for your 
patience and for being such a great advocate for Storytailor!
```

**After** (confident, clear):
```
Subject: $10 credit earned

Sarah subscribed using your referral.

$10 credit applied to your account. Auto-applies to next invoice.

Refer another friend? [Link]
```

### Example 3: Early Intervention

**Before** (clinical, alarming):
```
Subject: URGENT: Emma May Be Experiencing Mental Health Issues

Dear Parent,

Our AI system has detected patterns in Emma's emotional responses that 
indicate she may be suffering from anxiety or depression. These symptoms 
require immediate attention and we strongly recommend you seek 
professional treatment.

Emma has exhibited concerning behaviors for 5 consecutive days, which 
meets the clinical threshold for intervention. Please take this seriously 
and contact a mental health professional right away.
```

**After** (caring, non-clinical):
```
Subject: Emma felt worried this week

Emma felt worried 5 days this week.

Some children benefit from anxiety-support stories. Completely optional.

This is not a diagnosis. Consider discussing with Emma's healthcare 
provider if you're concerned.

Explore pathway? [Yes] [No]

Crisis resources: 988
```

---

## Tone Score Calculation

```typescript
function calculateToneScore(email: string, type: string): number {
  let score = 100;
  
  // Word count penalty
  const wordCount = email.split(/\s+/).length;
  if (wordCount > WORD_LIMITS[type]) {
    score -= ((wordCount - WORD_LIMITS[type]) / WORD_LIMITS[type]) * 30;
  }
  
  // Forbidden phrases penalty
  const forbidden = hasForbiddenPhrases(email);
  score -= forbidden.length * 10;
  
  // Missing comparative penalty
  if (!/faster|slower|better|worse|more|less|vs|than/.test(email)) {
    score -= 20;
  }
  
  // Wrong CTA count penalty
  const ctaCount = (email.match(/\[.*?\]/g) || []).length;
  if (ctaCount !== 1) {
    score -= 15;
  }
  
  // Hedging penalty
  if (/(maybe|perhaps|possibly|might|could)/.test(email)) {
    score -= 10;
  }
  
  return Math.max(score, 0) / 100; // 0-1 scale
}

// Minimum score: 0.7
if (calculateToneScore(emailBody, emailType) < 0.7) {
  throw new Error('Email tone score below minimum 0.7');
}
```

---

## Testing Email Copy

### Pre-Send Checklist

Before sending ANY email:
- [ ] Read aloud - does it sound natural?
- [ ] Remove unnecessary words - can anything be cut?
- [ ] Check tone score - is it ≥0.7?
- [ ] Verify single CTA - is action clear?
- [ ] Check word count - within limits?
- [ ] Test on mobile - fits one screen?
- [ ] No forbidden phrases - all clear?
- [ ] Comparative data included - not absolute scores?

---

## Sacred Status

This document is marked SACRED in `AGENTS.md`:
- All email copy must pass tone validation
- Word limits cannot be exceeded
- Forbidden phrases are blocked in code
- Monthly copy review required

**"Calm, selective, quietly brilliant" is not a suggestion. It's the standard.**

---

## Success Metrics

**Good tone shows**:
- Open rate >40%
- Click-through rate >5%
- Unsubscribe rate <0.2%
- Positive replies ("This was helpful!")
- Low support tickets about emails

**Poor tone shows**:
- Open rate declining
- CTR <2%
- Unsubscribe spike
- Complaints about "too many emails"
- Marked as spam

**We win by being helpful, not annoying.**


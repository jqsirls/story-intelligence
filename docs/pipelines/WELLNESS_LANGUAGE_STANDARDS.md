# Wellness Language Standards - Safe Deployment Guidelines

**Date**: December 25, 2025  
**Status**: APPROVED FOR IMMEDIATE USE  
**Purpose**: Define wellness language that can be used WITHOUT clinical review

---

## Core Principle

**We observe and suggest resources. We do NOT diagnose or prescribe.**

---

## Safe Language Framework

### Wellness Terms (Use These) ✅

| Instead of (Clinical) | Use (Wellness) |
|----------------------|----------------|
| anxiety-support | worry-management |
| depression-focused | mood-support |
| trauma-informed | emotion-processing |
| therapeutic pathway | coping skills program |
| intervention | resource |
| treatment | support program |
| symptoms | feelings |
| diagnose | notice |
| therapy | skill-building |
| clinical | supportive |

### Code-Enforced Substitutions

```typescript
// Auto-replace clinical terms with wellness terms
const WELLNESS_SUBSTITUTIONS: Record<string, string> = {
  'anxiety-support': 'worry-management',
  'anxiety support': 'worry management',
  'depression-focused': 'mood-support',
  'depression focused': 'mood support',
  'trauma-informed': 'emotion-processing',
  'trauma informed': 'emotion processing',
  'therapeutic pathway': 'coping skills program',
  'therapeutic program': 'skill-building program',
  'intervention': 'resource',
  'treatment': 'support program',
  'symptoms': 'feelings',
  'diagnose': 'notice',
  'therapy': 'skill-building',
  'clinical': 'supportive'
};

export function enforceWellnessLanguage(text: string): string {
  let updated = text;
  
  for (const [clinical, wellness] of Object.entries(WELLNESS_SUBSTITUTIONS)) {
    const regex = new RegExp(clinical, 'gi');
    updated = updated.replace(regex, wellness);
  }
  
  return updated;
}

// Apply before EVERY email send
const emailBody = enforceWellnessLanguage(originalBody);
```

---

## Email Templates (Wellness-Compliant)

### Template: Pattern Observation with Comparative Suggestion

**SAFE** (uses user's own stories - honest):
```
Subject: Create another calming story?

Emma felt worried 5 days this week.

Your story "The Brave Dragon" helped Emma feel calm before 
(worried → peaceful).

Create another story like that?

[Create Story]

If you're concerned about Emma's wellbeing, please contact her healthcare 
provider.

Crisis resources: 988, text HOME to 741741

---
This is a wellness observation from story interactions, not a medical 
diagnosis or treatment recommendation.
```

**Alternative** (if user has no helpful stories yet):
```
Subject: Check in with Emma

Emma felt worried 5 days this week.

Consider:
• Checking in with Emma about her feelings
• Creating a calming story together
• Speaking with healthcare provider if concerned

[Create Story Together]

Crisis: 988, text HOME to 741741
```

**UNSAFE** (clinical framing):
```
Subject: Anxiety pattern detected ❌

Emma shows symptoms of anxiety disorder.

We recommend our therapeutic intervention program for anxiety treatment.

This 8-week therapy program has been clinically proven to reduce anxiety.

[Enroll in therapy] [Decline treatment]
```

### Template: Crisis Alert

**SAFE** (observation + resources):
```
Subject: Check in with Emma

We noticed Emma seemed very distressed during her last story.

Please check in with Emma when you can.

If Emma is in immediate danger, call 911.

For crisis support:
• 988 (National Crisis Hotline)
• Text HOME to 741741
• Contact Emma's healthcare provider

This is an observation from story interactions, not a medical assessment.
```

**UNSAFE** (diagnostic):
```
Subject: CRISIS: Emma in psychological distress ❌

Our system diagnosed Emma with acute emotional crisis requiring immediate 
clinical intervention.

This constitutes a mental health emergency.

[Begin emergency therapy]
```

### Template: Weekly Check-In

**SAFE** (behavioral observation):
```
Subject: How's Emma doing?

You're in week 4 of the worry-management story program.

Emma has enjoyed 3/4 stories. She seems to like the calm-breathing stories best.

How is Emma doing overall?

[Good, continue] [Not sure, let's chat] [Things are harder]

If you select "Things are harder," we'll suggest speaking with a 
professional and pause the program.
```

---

## Scope Boundaries (What We ARE vs. ARE NOT)

### WE ARE (Wellness) ✅

```
✅ Educational platform teaching coping skills through stories
✅ Wellness tool providing emotional awareness activities
✅ Observation system that notices patterns and alerts parents
✅ Resource directory connecting parents to professional help
✅ Engagement platform tracking story consumption
```

### WE ARE NOT (Clinical) ❌

```
❌ Medical device or diagnostic tool
❌ Psychological assessment service
❌ Therapy or mental health treatment
❌ Crisis intervention service (we refer to 988)
❌ Replacement for professional care
❌ Clinical decision support system
```

### In Terms of Service

**Add this section**:
```
WELLNESS SERVICE SCOPE

Storytailor is a wellness and educational platform. We provide:
• Stories that teach emotional coping skills
• Observation of patterns in story interactions
• Suggestions for story-based wellness resources
• Referrals to professional mental health services

We do NOT provide:
• Medical or psychological diagnosis
• Mental health treatment or therapy
• Crisis intervention (we refer to 988)
• Professional mental health services
• Assessment or evaluation of mental health conditions

FOR MENTAL HEALTH CONCERNS: Contact a licensed mental health professional, 
your child's pediatrician, or call 988 (National Crisis Hotline).

FOR EMERGENCIES: Call 911.
```

---

## Deployment-Safe Disclaimer (Use Everywhere)

### Standard Disclaimer Block

```html
<div style="margin-top: 20px; padding: 15px; background: #FFF9E6; border-left: 4px solid #F59E0B;">
  <p style="margin: 0; font-size: 13px; color: #92400E;">
    <strong>Important:</strong> This is a wellness observation from story 
    interactions, not a medical or psychological diagnosis, assessment, or 
    treatment recommendation. For mental health concerns, consult your child's 
    healthcare provider or call 988 (National Crisis Hotline).
  </p>
</div>
```

**Must appear in EVERY email that mentions**:
- Emotional patterns
- Worry/anxiety/sadness/anger
- Coping skills programs
- Behavioral observations

---

## Code Implementation

### Update TherapeuticAutoAssignService.ts

```typescript
// Change pathway descriptions
const PATHWAY_DESCRIPTIONS: Record<string, string> = {
  'worry-management': {
    name: 'Worry-Management Story Program', // Not "Anxiety-Support"
    approach: 'Based on CBT principles', // Not "CBT-based therapy"
    duration: '8 weeks',
    description: 'Stories that teach coping skills for big feelings', // Not "therapeutic"
    disclaimer: 'This is a wellness program teaching coping skills through storytelling. It is not therapy or medical treatment.'
  }
};

// Update email subject
// OLD: "Stories might help with Emma's anxiety"
// NEW: "Resources for Emma's worries"

// Update email body
const body = `
We noticed Emma felt worried 5 days this week.

Some children benefit from stories that teach coping skills for big feelings.

This 8-week program uses storytelling to practice emotion-management techniques 
based on CBT principles.

This is not therapy or medical treatment - just wellness stories that teach skills.

If you're concerned about Emma's wellbeing, please contact her healthcare provider.

Would you like to try it?
[Yes, learn more] [No thanks]

Crisis resources: 988, text HOME to 741741
`;

// Apply wellness language enforcement
const safebody = enforceWellnessLanguage(body);
```

### Update CrisisAlertService.ts

```typescript
// Strengthen disclaimer
const subject = 'Check in with your child'; // Not "CRISIS DETECTED"

const body = `
We noticed concerning emotions during storytelling.

Please check in with your child as soon as possible.

FOR IMMEDIATE DANGER: Call 911

For crisis support:
• 988 (National Crisis Hotline)
• Text HOME to 741741  
• 1-800-448-3000 (Boys Town - child crisis)
• Contact your child's healthcare provider

This is an observation from story interactions, not a medical assessment 
or emergency intervention. We are not crisis counselors.

For professional mental health support, contact a licensed provider.
`;
```

---

## Testing Wellness Language

### Validation Checklist

Before sending ANY emotion-related email:

- [ ] No clinical terms (anxiety, depression, disorder, therapy, treatment)
- [ ] Uses wellness terms (worries, mood, feelings, coping, support)
- [ ] Includes "not a diagnosis" disclaimer
- [ ] Includes "consult healthcare provider" suggestion
- [ ] Includes crisis resources (988, 741741)
- [ ] Frames as "observation" not "detection"
- [ ] Frames as "resource" not "intervention"
- [ ] Frames as "suggestion" not "recommendation"

### Automated Validation

```typescript
interface WellnessLanguageValidation {
  hasClinicalTerms: string[];      // Should be []
  hasWellnessFraming: boolean;     // Should be true
  hasDisclaimer: boolean;          // Must be true
  hasCrisisResources: boolean;     // Must be true
  hasProfessionalReferral: boolean; // Must be true
}

function validateWellnessLanguage(text: string): WellnessLanguageValidation {
  const clinicalTerms = FORBIDDEN_CLINICAL_LANGUAGE
    .filter(pattern => pattern.test(text))
    .map(p => p.source);
  
  const wellnessFraming = /wellness|wellbeing|coping|support|manage|practice/i.test(text);
  const hasDisclaimer = /not a (diagnosis|medical|treatment|therapy)/i.test(text);
  const hasCrisisResources = /988|741741|crisis|emergency/i.test(text);
  const hasProfessionalReferral = /healthcare provider|professional|pediatrician|therapist/i.test(text);
  
  return {
    hasClinicalTerms: clinicalTerms,
    hasWellnessFraming,
    hasDisclaimer,
    hasCrisisResources,
    hasProfessionalReferral
  };
}

// Block send if validation fails
const validation = validateWellnessLanguage(emailBody);
if (validation.hasClinicalTerms.length > 0) {
  throw new Error(`Clinical language detected: ${validation.hasClinicalTerms.join(', ')}`);
}
if (!validation.hasDisclaimer) {
  throw new Error('Wellness disclaimer required');
}
if (!validation.hasCrisisResources) {
  throw new Error('Crisis resources required');
}
if (!validation.hasProfessionalReferral) {
  throw new Error('Professional referral required');
}
```

---

## Deploy-Ready vs. Review-Required

### ✅ Can Deploy Immediately (With Wellness Language)

- Crisis alerts (observation + 988 referral)
- Pattern notifications (observation + professional referral suggestion)
- Story suggestions for coping skills
- Parent check-ins
- Resource directories

**Requirements**:
- Use wellness language
- Include disclaimers
- Offer professional referral
- No clinical claims

### ⏳ Needs Clinical Review (Even With Wellness Language)

- Auto-enrollment in 8-week programs
- Tracking "effectiveness" of programs
- Making any outcome claims
- Long-term emotional tracking

**Why**: Duration + structured program + outcome measurement = higher scrutiny, even if wellness-framed

---

## Immediate Action Items

### 1. Update Language (30 minutes)

Run find/replace across codebase:
```bash
# In all email templates and services
anxiety-support → worry-management
depression-focused → mood-support
therapeutic → skill-building
intervention → resource
treatment → support program
```

### 2. Add Wellness Validation (1 hour)

Add `enforceWellnessLanguage()` function to EmailService:
```typescript
async sendEmail(options: SendEmailOptions) {
  // Enforce wellness language
  if (options.html) {
    options.html = enforceWellnessLanguage(options.html);
  }
  if (options.text) {
    options.text = enforceWellnessLanguage(options.text);
  }
  
  // Validate wellness compliance
  const validation = validateWellnessLanguage(options.html || options.text);
  if (validation.hasClinicalTerms.length > 0) {
    throw new Error('Clinical language detected');
  }
  
  // Send
  await this.sendViaProvider(options);
}
```

### 3. Strengthen Disclaimers (30 minutes)

Update disclaimer in `TherapeuticAutoAssignService.ts`:
```typescript
const disclaimer = `
This is not a medical or psychological diagnosis, assessment, or treatment 
recommendation. It's a wellness observation based on story interactions.

For mental health concerns, contact your child's healthcare provider or 
call 988 (National Crisis Hotline).
`;
```

### 4. Deploy With Confidence ✅

**After these 3 changes**, you can deploy:
- Pattern notifications (wellness-framed)
- Story suggestions (coping resources)
- Crisis alerts (observation + 988)
- Parent check-ins

**Still schedule clinical review**, but you're not blocked from deploying observation + referral features.

---

## Summary: Your Path Forward

### TODAY (Deploy Safely)

1. ✅ Apply wellness language substitutions
2. ✅ Add automated wellness validation
3. ✅ Strengthen disclaimers
4. ✅ Deploy observation + referral features

**Safe to deploy**:
- Crisis alerts → Observation + 988 referral
- Pattern notifications → Observation + professional referral suggestion
- Resource suggestions → "Stories that teach coping skills"

### SOON (Schedule Review)

1. ⏳ Clinical psychologist review (2-4 weeks)
2. ⏳ Legal counsel review (1-2 weeks)
3. ⏳ Use guidance in this doc to prepare review packet

**After review, enable**:
- Auto-suggested 8-week programs
- Structured pathway tracking
- Outcome measurement
- Enhanced features

---

**Bottom line**: With wellness language, you can deploy observation + referral features NOW. Get clinical review for structured programs later.


# Clinical Guidance Recommendations - AI Analysis

**Date**: December 25, 2025  
**Status**: PRELIMINARY GUIDANCE - Not a substitute for licensed clinical review  
**Purpose**: Inform clinical review preparation with research-backed recommendations

---

## ⚠️ Important Disclaimer

**This document provides AI-generated guidance based on best practices research. It does NOT replace:**
- Licensed clinical psychologist review
- Legal counsel opinion
- Ethics board approval
- Insurance verification

**Use this to prepare for actual review, not as final approval.**

---

## Question 1: Is 5-day pattern + 0.9 confidence sufficient for therapeutic suggestion?

### Recommendation: **YES, with caveats**

**Analysis**:

**5-day minimum is reasonable** because:
- Clinical rule of thumb: 2 weeks for mood disorder screening, but 5-7 days for "concerning pattern" observation
- We're NOT diagnosing - just observing and suggesting resources
- Lower bar appropriate for "observation" vs "diagnosis"
- Industry standard: Crisis apps often use 3-7 day windows for pattern alerts

**0.9 confidence is appropriately conservative** because:
- Higher than typical wellness apps (0.7-0.8)
- Reflects high-stakes nature (suggestions to children)
- Reduces false positives (which damage trust)
- Industry standard: Crisis detection typically 0.9-0.95

**However, ADD these safeguards**:

1. **Require 2 different signal types**:
   ```typescript
   // Not just "5 days of anxiety check-ins"
   // But "5 days anxiety + parent concern + story avoidance"
   const multipleSignals = signals.length >= 2;
   if (!multipleSignals) return veto('INSUFFICIENT_VARIETY');
   ```

2. **Age appropriateness**:
   ```typescript
   // Different thresholds by age
   if (childAge < 5) {
     minDays = 7; // Younger children have more variable emotions
   } else if (childAge < 8) {
     minDays = 5;
   } else {
     minDays = 5;
   }
   ```

3. **Parent-reported validation**:
   ```typescript
   // If parent also noticed concern, higher confidence
   if (parentAlsoNoticed) {
     confidence += 0.1; // Boost confidence
   }
   ```

### Recommendation to Clinician

**Ask clinician**: 
- "For a non-diagnostic wellness tool, is 5 days + 0.9 confidence + multiple signal types adequate for suggesting story-based emotional support resources?"
- Frame as: "Suggesting coping resources" NOT "diagnosing condition"

---

## Question 2: Is our language appropriately non-diagnostic?

### Recommendation: **MOSTLY YES, with improvements needed**

**Current language (GOOD ✅)**:
- "We noticed patterns that might indicate..."
- "Some children benefit from..."
- "This is not a diagnosis"
- "Consider discussing with healthcare provider"

**Improvements needed**:

### Change 1: Remove "anxiety" from parent-facing language

**Current**:
```
"Emma felt worried 5 days this week."
"Some children benefit from anxiety-support stories."
```

**Better** (less clinical):
```
"Emma felt worried 5 days this week."
"Some children benefit from stories that help with big feelings."
```

**Why**: "Anxiety-support" still implies we're addressing a clinical condition. "Big feelings" is wellness language.

### Change 2: Lead with action, not pattern

**Current**:
```
"We noticed Emma felt worried 5 days this week."
```

**Better**:
```
"Would you like stories that help children manage worries?"

(Context below: "We noticed Emma felt worried this week")
```

**Why**: Leads with resource offer, not observation that might alarm parent.

### Change 3: Strengthen non-diagnosis disclaimer

**Current**:
```
"This is not a diagnosis."
```

**Better**:
```
"This is not a medical or psychological diagnosis, assessment, or treatment recommendation. It's simply an observation based on story interactions."
```

**Why**: More explicit about what we're NOT doing.

### Code Enforcement Enhancement

```typescript
// Add REQUIRED wellness language
const REQUIRED_WELLNESS_PHRASES = [
  /wellness|wellbeing|support|help|cope|manage/i
];

// Change from clinical to wellness terms
const WELLNESS_SUBSTITUTIONS = {
  'anxiety-support': 'worry-management',
  'depression-focused': 'mood-support',
  'trauma-informed': 'emotion-processing',
  'therapeutic': 'supportive',
  'treatment': 'support program',
  'intervention': 'resource'
};

function enforceWellnessLanguage(text: string): string {
  let updated = text;
  for (const [clinical, wellness] of Object.entries(WELLNESS_SUBSTITUTIONS)) {
    updated = updated.replace(new RegExp(clinical, 'gi'), wellness);
  }
  return updated;
}
```

### Recommendation to Clinician

**Ask clinician**: 
- "Please review all email language samples and mark any phrases that could be interpreted as diagnostic or clinical"
- "What alternative wellness language would you recommend?"

---

## Question 3: Are crisis resources adequate?

### Recommendation: **YES, but expand**

**Current resources ✅**:
- 988 (National Suicide Prevention Lifeline)
- Crisis Text Line (HOME to 741741)
- 911 for emergency

**Add these for comprehensiveness**:

### Expand Crisis Resources

```typescript
const CRISIS_RESOURCES = {
  immediate: {
    call: '988 (National Crisis Hotline)',
    text: 'Text HOME to 741741 (Crisis Text Line)',
    emergency: '911 (Life-threatening emergency)'
  },
  
  // Add child-specific resources
  childSpecific: {
    call: '1-800-448-3000 (Boys Town National Hotline - 24/7 child crisis)',
    online: 'https://www.yourlifeyourvoice.org/ (Boys Town online chat)'
  },
  
  // Add parent support
  parentSupport: {
    call: '1-800-273-8255 (SAMHSA National Helpline - free, confidential)',
    online: 'https://www.samhsa.gov/find-help/national-helpline'
  },
  
  // Add local resources
  local: {
    message: 'Contact your child\'s healthcare provider',
    findTherapist: 'https://www.psychologytoday.com/us/therapists (Find local therapist)'
  }
};
```

### Tiered Crisis Response

**Level 1: Immediate danger** (confidence >0.95):
```
CALL 911 NOW if immediate danger

Then:
988 (Crisis Hotline)
Text HOME to 741741
```

**Level 2: Concerning pattern** (confidence 0.8-0.95):
```
Check in with your child

Resources if needed:
• 988 (24/7 crisis support)
• Text HOME to 741741
• Contact child's healthcare provider
```

**Level 3: Observation** (confidence 0.7-0.8):
```
We noticed [pattern]

Consider:
• Checking in with your child
• Contacting healthcare provider if concerned
```

### Recommendation to Clinician

**Ask clinician**: 
- "Are these crisis resources comprehensive for child-focused emotional support?"
- "Should we differentiate resources by severity level?"
- "Are there additional child-specific resources we should include?"

---

## Question 4: Should we require healthcare provider verification before enrollment?

### Recommendation: **NO for wellness, YES if clinical outcomes measured**

**Current approach (wellness model) ✅**:
```
Parent opts in → Stories begin
No healthcare provider verification required
```

**Why NO verification is appropriate**:
- We're offering **wellness resources** (stories), not **clinical treatment**
- Equivalent to: Meditation apps, sleep apps, exercise apps (none require MD verification)
- Verification creates friction, reduces accessibility
- Parents are already gatekeepers (opt-in required)

**However, IF we claim clinical outcomes**:
- "Reduces anxiety by 30%" → Medical device territory → FDA regulation
- "Treats depression" → Clinical claim → Healthcare provider required
- "Therapeutic pathway" → Implies treatment → Higher bar

**Our safe zone (wellness language)**:
- "Stories designed to support children with big feelings" ✅
- "May help children practice coping strategies" ✅
- "Based on CBT principles" ✅ (educational, not prescriptive)

**Cross the line (clinical claims)**:
- "Treats anxiety" ❌
- "Clinically proven to reduce symptoms" ❌
- "Therapeutic intervention for diagnosed conditions" ❌

### Recommendation

**For wellness model (current approach)**:
```typescript
// Parent opt-in sufficient
async suggestPathway(pattern) {
  // 1. Send observation + suggestion email
  // 2. Parent clicks "Yes, tell me more"
  // 3. Explain program (8 weeks, CBT-based principles)
  // 4. Parent clicks "Enroll" (opt-in)
  // 5. Stories begin
  // 6. No healthcare provider verification needed
}
```

**Add this disclaimer**:
```
"This program uses storytelling to teach coping skills. It is not therapy 
or medical treatment. For professional mental health support, contact your 
child's healthcare provider."
```

**If you later want clinical claims**:
```typescript
// Would require:
- Healthcare provider verification
- Clinical trial with control group
- FDA review (if making medical claims)
- IRB approval
- Liability insurance increase
```

### Recommendation to Clinician

**Ask clinician**: 
- "As a wellness tool using storytelling to teach coping skills (not therapy), is parent opt-in sufficient?"
- "If we wanted to make clinical efficacy claims later, what would be required?"

---

## Question 5: What outcome metrics should we measure?

### Recommendation: **Measure wellness outcomes, not clinical outcomes**

**Safe wellness metrics (measure these) ✅**:

### User Engagement Metrics
```typescript
{
  programCompletion: number, // % who finish 8 weeks
  storyConsumption: number,  // Stories consumed per week
  parentSatisfaction: number, // 1-5 rating
  voluntaryDropout: number,  // % who opt-out
  programRepeats: number     // % who restart after completion
}
```

### Behavioral Observation Metrics
```typescript
{
  storyReplayPatterns: {
    favoriteStories: string[], // Which stories loved
    skillPractice: number      // Stories about coping skills replayed
  },
  
  parentReportedChange: {
    parentNoticed: boolean,     // "Did you notice any changes?"
    positiveChange: string,     // Free text: "Emma seems calmer"
    concernsRemain: boolean     // "Are you still concerned?"
  },
  
  resourceUtilization: {
    professionalReferralFollowed: boolean, // Did they see therapist?
    crisisResourcesUsed: boolean           // Did they call 988?
  }
}
```

### What NOT to measure (clinical outcomes) ❌

```typescript
// These require clinical validation, control groups, IRB approval:
{
  anxietyReduction: number,        // ❌ Clinical claim
  depressionScores: number,        // ❌ Diagnostic
  symptomImprovement: number,      // ❌ Medical claim
  clinicalSignificance: boolean,   // ❌ Clinical judgment
  diagnosisConfirmed: boolean      // ❌ WAY over the line
}
```

### Reframe Clinical Language

**Instead of** "Anxiety reduced by 30%"  
**Say**: "85% of parents reported their child seemed calmer after using the program"

**Instead of**: "Depression symptoms improved"  
**Say**: "Parents noticed more positive interactions and engagement"

**Instead of**: "Therapeutic efficacy demonstrated"  
**Say**: "High program completion rate (75%) and parent satisfaction (4.2/5)"

### Survey Questions (Safe)

**Week 4 check-in**:
```
1. Is your child enjoying the stories? (Yes/No)
2. Have you noticed any changes in how your child talks about worries? (Free text)
3. Is this program helpful for your family? (1-5 scale)
4. Have you spoken with a healthcare provider about your child's emotions? (Yes/No)
```

**Week 8 completion**:
```
1. Would you recommend this program to other parents? (Yes/No)
2. What did you like most? (Free text)
3. What could be improved? (Free text)
4. Did you consult with a professional during the program? (Yes/No)
5. Do you feel the program was helpful? (1-5 scale)
```

### Recommendation to Clinician

**Ask clinician**: 
- "What outcome metrics can we safely measure as a wellness tool?"
- "How should we phrase survey questions to avoid clinical assessment territory?"
- "What would cross the line into clinical outcomes research?"

---

## Question 6: How often should we re-confirm parent consent?

### Recommendation: **Every 4 weeks, with soft checks**

**Research-backed approach**:

### Consent Hierarchy

**Initial opt-in** (Week 0):
```
Full informed consent:
- What: 8-week story program teaching coping skills
- How: CBT-based principles via storytelling
- Not: Therapy, medical treatment, or diagnosis
- Can: Opt-out anytime without penalty
- Should: Still consult healthcare provider if concerned

[Enroll] [Decline]
```

**Soft check-in** (Week 4):
```
You're halfway through the worry-management story program.

Continue? [Yes, continue] [Pause] [Stop]

You can resume anytime if you pause.
```

**Re-consent** (Week 8 - if continuing):
```
You completed the 8-week program. Emma enjoyed 6/8 stories.

Would you like to:
[Repeat program] [Try different pathway] [Pause for now]
```

**Ongoing** (if long-term):
```
Every 4 weeks: Soft check-in with opt-out
Every 12 weeks: Re-confirm with updated consent (in case program changed)
```

### Why 4 weeks?

- **Too frequent** (weekly): Annoying, implies we're uncertain
- **Too infrequent** (never): Problematic if parent's situation changed
- **4 weeks (balanced)**: Mid-program check, quarterly for ongoing

### Automatic opt-out triggers

```typescript
// Auto-pause program if:
const AUTO_PAUSE_CONDITIONS = [
  { condition: 'parentMarkedEmailAsSpam', action: 'immediate_stop' },
  { condition: 'noProgramEngagement14Days', action: 'pause_with_email' },
  { condition: 'parentExplicitlyDeclined', action: 'immediate_stop' },
  { condition: 'crisisEventDetected', action: 'pause_pending_professional' }
];
```

### Recommendation to Clinician

**Ask clinician**: 
- "Is 4-week re-confirmation appropriate for an 8-week wellness program?"
- "Should we have different re-consent schedules for different age groups?"
- "What constitutes adequate ongoing consent?"

---

## Question 7: What are red flags for immediate discontinuation?

### Recommendation: **Define clear stop conditions**

### Tier 1: IMMEDIATE STOP (No Questions)

```typescript
const IMMEDIATE_STOP_CONDITIONS = [
  'parentExplicitOptOut',          // Parent says stop
  'crisisEventDetected',           // Crisis detected (escalate to professional)
  'parentReportedHarm',            // Parent says program making things worse
  'multipleSkippedStories',        // Child avoiding stories (sign program not helping)
  'professionalRequestedStop',     // Healthcare provider says stop
  'complianceViolation'            // Parental consent expired/invalid
];
```

**Actions**:
1. Stop program immediately
2. Send confirmation email: "Program paused as requested"
3. Offer resources: "If you need support, contact 988 or child's healthcare provider"
4. Do NOT try to re-engage (respect their decision)
5. Log reason for discontinuation (learn from it)

### Tier 2: PAUSE & CHECK (Concern, Not Crisis)

```typescript
const PAUSE_AND_CHECK_CONDITIONS = [
  'increasedNegativeEmotions',     // Pattern worsening, not improving
  'noEngagement14Days',            // Child not interested
  'parentExpressedConcern',        // Parent unsure if helping
  'conflictingSignals'             // Mixed data (improving + worsening)
];
```

**Actions**:
1. Pause program automatically
2. Send email: "We noticed [pattern]. How is Emma doing?"
3. Offer options:
   - "Everything's fine, continue" → Resume
   - "I'm not sure" → Professional referral + pause
   - "Things are worse" → Stop + urgent professional referral

### Tier 3: SOFT CHECK (Low Concern)

```typescript
const SOFT_CHECK_CONDITIONS = [
  'midProgramCheckpoint',          // Week 4 automatic check
  'lowEngagement7Days',            // Not consuming stories regularly
  'parentNoResponse3Emails'        // Parent not engaged
];
```

**Actions**:
1. Send check-in email: "How's it going?"
2. Continue program unless parent responds with concern
3. Offer easy opt-out

### Red Flags Requiring Professional Referral

**ALWAYS recommend professional help if**:
```typescript
const PROFESSIONAL_REFERRAL_TRIGGERS = [
  'crisisDetected',                // Any crisis event
  'patternWorseningNotImproving',  // 2+ weeks worse
  'multipleEmotionTypes',          // Anxiety + depression + anger
  'parentReportsSevereImpact',     // "Can't go to school"
  'suicidalIdeation',              // ANY mention
  'harmToSelf',                    // Self-harm patterns
  'harmToOthers'                   // Aggression patterns
];
```

**Action** (immediate):
```typescript
async function triggerProfessionalReferral(userId, reason) {
  // 1. Pause program
  await pauseProgram(userId);
  
  // 2. Send URGENT email
  await sendEmail({
    subject: 'Please contact a professional',
    body: `
      We noticed ${reason} and believe professional support would be helpful.
      
      This is beyond what storytelling can address.
      
      Please contact:
      • Child's pediatrician or therapist
      • 988 (Crisis Hotline)
      • Emergency: 911
      
      We've paused the story program. You can resume after speaking with 
      a professional, or we can help you find resources.
    `
  });
  
  // 3. Log for legal protection
  await logProfessionalReferral(userId, reason, 'urgent');
}
```

### Clinical Deterioration Protocol

**If child's condition worsens during program**:

```typescript
// Week 0 baseline: Anxiety score (from check-ins) = 5/10
// Week 2: Anxiety score = 7/10 (worse)
// Week 4: Anxiety score = 8/10 (still worse)

if (currentScore > baselineScore + 2 && weeksInProgram >= 2) {
  return {
    action: 'PAUSE_AND_REFER',
    reasoning: 'Pattern worsening, not improving. Professional evaluation recommended.',
    urgency: 'high'
  };
}
```

### Recommendation to Clinician

**Ask clinician**: 
- "What red flags should trigger immediate program discontinuation?"
- "How should we handle situation where child's emotions worsen during program?"
- "When should we insist on professional referral vs. simply suggesting it?"

---

## Additional Clinical Recommendations

### 1. Add Age Restrictions

**Recommend**:
```typescript
const THERAPEUTIC_AGE_RESTRICTIONS = {
  minimum: 4, // Below 4: Developmental assessment too unreliable
  maximum: 12 // Above 12: Different emotional needs, consider teen-specific
};

if (childAge < 4) {
  return veto('AGE_TOO_YOUNG', 'Emotional patterns less reliable under age 4');
}
```

**Rationale**: Emotional regulation develops significantly 4-7 years old. Below 4, patterns may not indicate concerning trends.

### 2. Add Parental Mental Health Check

**Before suggesting child program, check parent**:
```typescript
// If parent shows distress patterns
if (parentEmotionCheckInsShowDistress) {
  // Suggest parent resources FIRST
  await sendParentSupportResources();
  
  // Don't suggest child pathway yet (parent needs support first)
  return veto('PARENT_SUPPORT_NEEDED');
}
```

**Rationale**: Children's emotional health closely tied to parent's. If parent is struggling, address that first.

### 3. Add Cultural Considerations

**Different cultures view mental health differently**:
```typescript
// Offer opt-in for cultural customization
const culturalConsiderations = {
  language: 'en', // Spanish, Mandarin, etc.
  culturalContext: 'western', // Adjust story themes
  professionalReferralType: 'standard' // Some cultures prefer family doctor over therapist
};
```

**Recommendation**: Let parents self-identify if they want culturally-adapted content.

### 4. Add Comorbidity Warnings

**If multiple concerning patterns**:
```typescript
// If child shows anxiety + depression + behavioral concerns
if (concerningPatternTypes.length >= 3) {
  return {
    action: 'PROFESSIONAL_REFERRAL_REQUIRED',
    reasoning: 'Multiple concerning patterns detected. This is beyond wellness support.',
    skipStoryProgram: true
  };
}
```

**Rationale**: Multiple comorbid patterns require professional assessment, not wellness stories.

---

## Legal Protection Recommendations

### 1. Explicit Scope Limitation

**Add to every therapeutic email**:
```
SCOPE OF SERVICE

Storytailor provides:
✅ Wellness stories teaching coping skills
✅ Emotional awareness activities
✅ Parent observations and resources

Storytailor does NOT provide:
❌ Medical diagnosis or assessment
❌ Psychological treatment or therapy
❌ Professional mental health services
❌ Crisis intervention (we refer to 988)

For mental health concerns, always consult a licensed professional.
```

### 2. Clear Liability Disclaimer

**In terms of service**:
```
LIMITATION OF LIABILITY - MENTAL HEALTH

Storytailor is a wellness and educational platform. We do not provide 
medical or psychological services. Our emotion tracking and story 
suggestions are for wellness purposes only.

We are not liable for:
- Failure to detect emotional distress
- False positive alerts
- Outcomes of story programs
- Decisions made based on our observations

You remain solely responsible for your child's mental health care. 
Always consult with licensed professionals for mental health concerns.
```

### 3. Document Every Decision

```typescript
interface TherapeuticDecisionLog {
  timestamp: string;
  userId: string;
  systemAction: string;
  systemReasoning: string;
  confidence: number;
  parentResponse: string;
  outcome: string;
  
  // Legal protection
  disclaimerShown: boolean;       // Was "not a diagnosis" shown?
  crisisResourcesOffered: boolean; // Were crisis resources provided?
  professionalReferralOffered: boolean; // Was professional referral offered?
  parentConsentValid: boolean;    // Was consent current?
}
```

**Retention**: 7 years (statute of limitations for many states)

---

## Final Clinical Recommendations Summary

### ✅ APPROVED AS-IS

1. **5-day pattern + 0.9 confidence** - Appropriate for wellness observation
2. **Crisis resources** - Adequate, but expand with child-specific options
3. **No healthcare provider verification** - Correct for wellness model

### ⚠️ NEEDS IMPROVEMENT

1. **Language** - Replace "anxiety-support" with "worry-management" (wellness framing)
2. **Disclaimers** - Strengthen "not a diagnosis" language
3. **Outcome metrics** - Measure engagement/satisfaction, NOT clinical outcomes

### ✅ ADDITIONAL SAFEGUARDS RECOMMENDED

1. **Age restrictions** - Minimum age 4, maximum 12 for pathways
2. **Multiple signal types** - Require 2+ different signals (not just one type)
3. **Comorbidity check** - If 3+ concerning pattern types, refer to professional immediately
4. **Parental distress check** - Support parent first if parent is struggling
5. **Deterioration protocol** - Auto-pause if child's patterns worsen during program

---

## Deployment Decision Tree

### Can Deploy NOW (Wellness Features) ✅

- Emotion check-ins (observation only)
- Story recommendations based on mood
- Parent notifications of patterns
- Crisis resources (referral, not intervention)
- **AS LONG AS**: No clinical claims, clear disclaimers, wellness language

### Needs Clinical Review (Before Deploy) ⏳

- Auto-suggesting "therapeutic pathways"
- Using terms like "anxiety-support" or "depression-focused"
- Claiming outcomes ("reduces anxiety")
- 8-week guided programs

### Cannot Deploy Without FDA Review ❌

- Medical claims ("treats anxiety")
- Diagnostic capabilities ("detects depression")
- Clinical efficacy claims ("clinically proven")
- Prescription-like language ("requires this treatment")

---

## Recommendations to Your Clinical Reviewer

**Frame the conversation this way**:

> "We're building a wellness storytelling platform that teaches coping skills 
> through narrative. We observe emotional patterns and suggest story-based 
> resources. We do NOT diagnose, treat, or replace professional care.
> 
> We want your guidance on:
> 1. Are our observation thresholds appropriate? (5 days, 0.9 confidence)
> 2. Is our language sufficiently non-clinical?
> 3. What outcome metrics can we safely measure?
> 4. What would require FDA review or clinical trial?
> 
> Our goal: Be helpful and safe, not practice psychology."

---

## My Recommendation to You

### Safe Path Forward (Deploy Now)

**Change language from**:
- "anxiety-support stories" → "worry-management stories"
- "therapeutic pathway" → "story-based coping program"
- "depression-focused" → "mood-support"
- "intervention" → "resource"

**Strengthen disclaimers**:
- "This is not medical advice, diagnosis, assessment, or treatment"
- "Always consult healthcare provider for mental health concerns"
- "We provide wellness stories, not therapy"

**With these changes, you can deploy**:
- ✅ Pattern observation + notification
- ✅ Story suggestions for coping skills
- ✅ Crisis resource referrals
- ✅ Parent check-ins

**Still get clinical review for**:
- ⏳ Language validation
- ⏳ Threshold appropriateness confirmation
- ⏳ Liability assessment
- ⏳ Insurance verification

### Safer Alternative (If Time-Sensitive)

**Phase 1**: Deploy observation + referral only
```
"We noticed Emma felt worried 5 days this week.

Consider:
• Checking in with Emma
• Speaking with her healthcare provider if concerned

Resources: 988, text HOME to 741741"
```

**Phase 2** (post-clinical review): Add story program suggestions
```
"Some children benefit from stories that teach coping skills for worries.

8-week program using CBT principles. Completely optional.

[Learn more] [No thanks]"
```

---

## Summary Answers to Your 7 Questions

1. **5-day + 0.9 confidence?** → ✅ YES (add: multiple signal types, age restrictions)

2. **Language appropriate?** → ⚠️ MOSTLY (change "anxiety-support" to "worry-management")

3. **Crisis resources adequate?** → ✅ YES (add: child-specific resources, tiered response)

4. **Require healthcare provider verification?** → ❌ NO (wellness model doesn't require it)

5. **What outcome metrics?** → ✅ Measure: engagement, satisfaction, parent observations | ❌ Don't measure: clinical outcomes, symptom reduction

6. **Re-confirm consent frequency?** → ✅ Every 4 weeks (soft check), 12 weeks (re-consent)

7. **Red flags for discontinuation?** → ✅ 3 tiers: Immediate stop (parent request, crisis), Pause & check (worsening), Soft check (low engagement)

---

**Next step**: Share this guidance with your licensed clinical psychologist for validation and refinement. This provides a solid starting point for their review.


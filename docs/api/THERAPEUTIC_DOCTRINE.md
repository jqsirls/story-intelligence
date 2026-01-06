# Therapeutic Doctrine

**Status**: SACRED - Cannot Be Simplified  
**Version**: 1.0  
**Date**: December 25, 2025  
**Enforcement**: Code validation, clinical review, legal approval

---

## Purpose

This document defines the ethical boundaries, clinical guardrails, and legal requirements for ANY feature that:
- Suggests therapeutic interventions
- Auto-assigns therapeutic pathways
- Detects emotional patterns for clinical purposes
- Provides mental health guidance

**This is not feature documentation. This is ethical law.**

---

## The Boundary We're Crossing

Storytailor has crossed from **reflection** ("Your child seems sad") into **prescription** ("Try these anxiety-management stories").

This is clinical suggestion territory. Engineers must feel the ethical weight of this responsibility.

---

## Non-Negotiable Guardrails

### 1. Always Require Parent Opt-In

**Rule**: No auto-enrollment without explicit, informed consent.

**Implementation**:
```typescript
async suggestTherapeuticPathway(userId: string, pathway: string): Promise<void> {
  // NEVER auto-enroll
  const consent = await getParentConsent(userId, pathway);
  
  if (!consent) {
    throw new Error('Parent consent required for therapeutic pathways');
  }
  
  // Explain what pathway is
  await sendExplanationEmail(userId, {
    pathway,
    description: PATHWAY_DESCRIPTIONS[pathway],
    duration: '8 weeks',
    approach: 'CBT-based',
    canDecline: true
  });
  
  // Allow decline without friction
  // Re-confirm every 4 weeks
}
```

**Email language**:
```
We've noticed patterns that might indicate [observation].

Some children benefit from [pathway name], an 8-week program using 
[approach type] techniques to support [goal].

This is completely optional. You can decline without any impact on 
your experience.

Would you like to explore this? [Yes, tell me more] [No, thanks]
```

### 2. Never Diagnose

**Rule**: Observe and suggest, never diagnose or label.

**Forbidden Language**:
```typescript
const FORBIDDEN_CLINICAL_LANGUAGE = [
  /diagnos(ed|is|e)/i,
  /treatment (for|of)/i,
  /requires? therapy/i,
  /has (anxiety|depression|adhd|autism)/i,
  /suffering from/i,
  /disorder/i,
  /syndrome/i,
  /condition/i,
  /symptoms? of/i,
  /clinically (significant|depressed|anxious)/i
];

// Code enforcement
function validateTherapeuticLanguage(message: string): {
  valid: boolean;
  violations: string[];
} {
  const violations = FORBIDDEN_CLINICAL_LANGUAGE
    .filter(pattern => pattern.test(message))
    .map(p => p.source);
  
  return {
    valid: violations.length === 0,
    violations
  };
}

// Block send if validation fails
const validation = validateTherapeuticLanguage(emailBody);
if (!validation.valid) {
  logger.error('Therapeutic language violation', { violations });
  throw new Error('Email contains forbidden clinical language');
}
```

**Permitted Language**:
- ✅ "We noticed patterns that might indicate..."
- ✅ "Some children benefit from..."
- ✅ "Would you like to explore..."
- ✅ "Consider discussing with a professional..."
- ✅ "Stories designed to support..."
- ✅ "This is an observation, not a diagnosis..."

**Always Include**:
```
This is not a diagnosis. It's just an observation based on patterns 
we've noticed. If you're concerned, please contact [Child]'s 
healthcare provider.
```

### 3. Always Offer Professional Referral

**Rule**: Every therapeutic suggestion must include professional referral option.

**Required Elements**:
```typescript
interface TherapeuticEmail {
  observation: string;
  suggestion: string;
  professionalReferral: {
    message: string; // "Consider discussing with healthcare provider"
    crisisResources: string[]; // Crisis hotlines
    findTherapistLink: string;
  };
  disclaimers: string[]; // "Not a replacement for professional care"
}
```

**Crisis Resources** (always include):
```
National Crisis Hotline: 988
Crisis Text Line: Text HOME to 741741
Emergency: 911

Find a therapist: [Link to Psychology Today or similar]
```

### 4. Audit Every Suggestion

**Rule**: Log therapeutic suggestions for review and learning.

**Required Logging**:
```typescript
interface TherapeuticAuditLog {
  userId: string;
  childProfileId: string;
  pathway: string;
  
  // What triggered it
  triggerPattern: string; // "5+ days anxiety, confidence 0.85"
  confidenceScore: number;
  dataPoints: number;
  
  // Parent response
  parentAccepted: boolean;
  acceptedAt?: Date;
  declinedAt?: Date;
  declineReason?: string;
  
  // Outcome measurement
  outcomeMeasured: boolean;
  effectivenessScore?: number; // 0-100
  
  // Clinical review
  reviewedBy?: string; // Clinician ID
  reviewedAt?: Date;
  reviewNotes?: string;
}

// Log EVERY suggestion
await supabase.from('therapeutic_audit_log').insert({
  user_id: userId,
  pathway: pathwayName,
  trigger_pattern: `${daysOfPattern} days ${emotionType}, confidence ${confidence}`,
  confidence_score: confidence,
  parent_accepted: null, // Pending response
  logged_at: new Date().toISOString()
});
```

**Retention**: 365 days minimum for therapeutic data.

**Monthly Review Process**:
1. Are suggestions helping? (measure outcomes)
2. Are parents accepting? (>50% acceptance rate expected)
3. Are there false positives? (parent reports child is fine)
4. Update algorithms based on outcomes

### 5. Medical Professional Review

**Rule**: Every therapeutic pathway must be clinically validated.

**Review Requirements**:
- Licensed clinician reviews pathway design
- Evidence-based approach verification
- Language review for clinical appropriateness
- Annual audit by external reviewer

**Cannot Ship Without**:
- [ ] Clinician review signed off
- [ ] Legal review completed
- [ ] Ethics board approval
- [ ] Parent testing (n≥20) with informed consent
- [ ] Compliance audit (COPPA, GDPR, HIPAA if applicable)
- [ ] Professional liability insurance coverage confirmed

---

## Code Enforcement

### Pre-Send Validation

**Every therapeutic email MUST pass**:
```typescript
async function validateTherapeuticEmail(email: TherapeuticEmail): Promise<void> {
  // 1. Language validation
  const langValidation = validateTherapeuticLanguage(email.body);
  if (!langValidation.valid) {
    throw new Error(`Forbidden clinical language: ${langValidation.violations.join(', ')}`);
  }
  
  // 2. Required elements check
  if (!email.professionalReferral) {
    throw new Error('Professional referral required in therapeutic emails');
  }
  
  if (!email.crisisResources || email.crisisResources.length === 0) {
    throw new Error('Crisis resources required in therapeutic emails');
  }
  
  if (!email.disclaimers || !email.disclaimers.includes('not a diagnosis')) {
    throw new Error('Diagnosis disclaimer required');
  }
  
  // 3. Parent consent check
  const hasConsent = await checkParentConsent(email.userId, email.pathway);
  if (!hasConsent) {
    throw new Error('Parent consent required before therapeutic suggestions');
  }
  
  // 4. Audit logging
  await logTherapeuticSuggestion(email);
  
  // All checks passed
}
```

### Pre-Production Checklist

Before ANY therapeutic feature ships:
- [ ] Code passes language validation tests
- [ ] Clinical psychologist reviewed and approved
- [ ] Legal team reviewed for liability
- [ ] Ethics board approved approach
- [ ] Parent testing completed (n≥20, informed consent)
- [ ] COPPA compliance verified
- [ ] GDPR compliance verified
- [ ] HIPAA compliance verified (if healthcare provider integration)
- [ ] Insurance review (professional liability coverage)
- [ ] Audit logging functional
- [ ] Crisis escalation pathways tested
- [ ] Monthly review process scheduled

---

## Therapeutic Pathway Definitions

### What Counts as "Therapeutic"

**Therapeutic features include**:
- Auto-assignment of CBT-based story sequences
- Anxiety/depression/trauma-focused content recommendations
- Emotional regulation pathway suggestions
- Crisis intervention protocols
- Professional referral triggers

**NOT therapeutic** (lower bar):
- Generic emotion tracking ("How are you feeling?")
- Story mood matching ("You seem sad, here's a happy story")
- Celebration of positive emotions
- Engagement pattern observations

### Confidence Thresholds

**Higher bar for clinical suggestions**:
```typescript
const CONFIDENCE_THRESHOLDS = {
  generic_emotion: 0.6,     // Low stakes
  story_recommendation: 0.7, // Medium stakes
  therapeutic_suggestion: 0.9, // HIGH STAKES - must be very confident
  crisis_intervention: 0.95   // CRITICAL - cannot afford false positives
};
```

**Signal Duration Requirements**:
```typescript
const PATTERN_REQUIREMENTS = {
  single_check_in: 0, // No pattern needed
  emotional_trend: 3, // 3+ days
  therapeutic_suggestion: 5, // 5+ days minimum
  crisis_alert: 1 // Immediate, but VERY high confidence
};
```

---

## Liability & Risk Management

### What Could Go Wrong

**Scenario 1**: Child not actually anxious, parent upset by suggestion  
**Mitigation**: High confidence threshold (0.9), 5+ day pattern requirement, language is "might benefit" not "needs"

**Scenario 2**: Parent relies on Storytailor instead of professional care  
**Mitigation**: Always include professional referral, explicit "not a replacement" disclaimer

**Scenario 3**: Crisis missed due to false negative  
**Mitigation**: Conservative threshold (0.95), multiple detection methods, parent encouraged to reach out

**Scenario 4**: Medical advice liability claim  
**Mitigation**: Never diagnose, licensed clinician review, explicit disclaimers, professional liability insurance

### Insurance Requirements

**Professional Liability Coverage**:
- Medical advice liability
- Misdiagnosis claims
- Treatment outcome disputes
- Crisis intervention failures

**Verify coverage before launching therapeutic features.**

---

## Monthly Review Process

### Metrics to Monitor

1. **Acceptance Rate**: % parents who opt-in (target: >50%)
2. **False Positive Rate**: % dismissed alerts (target: <30%)
3. **Effectiveness**: % pathways showing improvement (target: >60%)
4. **Professional Referrals**: % users who sought professional help (track outcome)
5. **Unsubscribe Rate**: % who disable therapeutic emails (target: <5%)

### Red Flags Requiring Immediate Review

- Acceptance rate <30% (suggestions not helpful)
- False positive rate >50% (algorithm too sensitive)
- Unsubscribe spike after therapeutic launch
- Parent complaints about "overstepping"
- Medical professional feedback suggesting harm

### Adjustment Protocol

**If metrics miss targets**:
1. Pause pipeline via kill switch
2. Clinical review of failures
3. Algorithm adjustment
4. Re-review by clinician
5. Re-test with small cohort
6. Re-launch with monitoring

---

## HIPAA Considerations

**If healthcare provider integration exists**:
- Business Associate Agreement (BAA) required
- PHI encryption at rest and in transit
- Access logs for all PHI
- Breach notification protocols
- Right to access/amendment/deletion
- Minimum necessary disclosure

**Current status**: No healthcare provider integration, no PHI handling.  
**If added**: Legal and compliance review MANDATORY before launch.

---

## Sacred Status

This document is marked SACRED in `AGENTS.md`:
- Cannot be simplified without clinical review
- Changes require legal approval
- Enforcement mechanisms in code
- Monthly compliance audit required

**Violation of these guidelines is a compliance issue, not a product decision.**

---

## Contact for Review

**Before implementing ANY therapeutic feature**:
1. Clinical Psychologist: [Contact required]
2. Legal Counsel: [Contact required]
3. Ethics Board: [Contact required]
4. Compliance Officer: [Contact required]

**Do not proceed without approval.**


# Clinical Review Requirements - Therapeutic Features

**Audience**: Medical/Legal Team  
**Status**: MANDATORY REVIEW REQUIRED  
**Version**: 1.0  
**Date**: December 25, 2025

---

## ⚠️ DEPLOYMENT BLOCKER

**Therapeutic auto-assignment features CANNOT be enabled until this review is complete.**

Current status: Code implemented but gated behind `CLINICAL_REVIEW_REQUIRED = true` flag.

---

## What Requires Review

### 1. Therapeutic Auto-Assignment Service

**File**: `packages/universal-agent/src/services/TherapeuticAutoAssignService.ts`

**Function**: Automatically suggests therapeutic pathways when emotional patterns detected.

**Example Flow**:
```
Child shows anxiety pattern 5+ days
  ↓
System confidence: 0.92 (above 0.9 threshold)
  ↓
Send email to parent: "Stories might help with Emma's worries"
  ↓
Parent opts in (explicit consent)
  ↓
8-week CBT-based story program begins
```

**Clinical Concerns**:
- Are we overstepping into clinical territory?
- Is 5-day pattern sufficient for suggestion?
- Is 0.9 confidence threshold appropriate?
- Is language appropriate (observe vs diagnose)?

### 2. Crisis Detection & Alert

**File**: `packages/universal-agent/src/services/CrisisAlertService.ts`

**Function**: Detects crisis from emotional signals, alerts parent immediately.

**Example Flow**:
```
Emotion detection: High distress, confidence 0.96
  ↓
SLA: Within 5 minutes (real-time)
  ↓
Multi-channel alert:
  - Stop conversation immediately
  - Push notification to parent
  - Email with crisis resources
  - If healthcare provider linked: HIPAA-compliant notification
```

**Clinical Concerns**:
- False positive rate acceptable?
- 0.95 confidence sufficient?
- Crisis resources appropriate?
- Liability if crisis missed?

### 3. Early Intervention Alerts

**File**: `packages/universal-agent/src/services/IntelligenceCurator.ts` (handler: early_intervention)

**Function**: Flags concerning patterns (3+ days negative emotions).

**Example Email**:
```
Subject: Check in with Emma

Emma felt worried 3 days this week.

This is just an observation, not a diagnosis. Consider checking in 
with Emma or discussing with her healthcare provider if you're concerned.

Crisis resources: 988, text HOME to 741741
```

**Clinical Concerns**:
- 3-day pattern too short?
- Language appropriately non-diagnostic?
- Professional referral prominent enough?

---

## Required Reviews

### 1. Clinical Psychologist Review

**Reviewer**: Licensed clinical psychologist specializing in child development

**Review Scope**:
- [ ] Therapeutic pathway designs (CBT-based, 8-week programs)
- [ ] Language in all therapeutic emails (observe vs diagnose)
- [ ] Parent consent process (informed, optional, re-confirmable)
- [ ] Crisis detection thresholds (0.95 confidence acceptable?)
- [ ] Early intervention triggers (3-day pattern sufficient?)
- [ ] Professional referral prominence (always included?)
- [ ] Expected outcomes measurement (valid metrics?)

**Questions for Clinician**:
1. Is 5-day pattern + 0.9 confidence sufficient for therapeutic suggestion?
2. Is our language appropriately non-diagnostic?
3. Are crisis resources adequate?
4. Should we require healthcare provider verification before enrollment?
5. What outcome metrics should we measure?
6. How often should we re-confirm parent consent?
7. What are red flags for immediate discontinuation?

**Deliverable**: Written approval with any recommended changes.

### 2. Legal Review

**Reviewer**: Legal counsel with healthcare/liability experience

**Review Scope**:
- [ ] Professional liability exposure (suggesting clinical pathways)
- [ ] Medical advice disclaimer sufficiency
- [ ] Parent consent legally adequate?
- [ ] Crisis alert liability (false positives vs false negatives)
- [ ] COPPA compliance (parental consent for <13)
- [ ] Insurance coverage verification
- [ ] Breach of duty risk assessment

**Questions for Legal**:
1. Does suggesting therapeutic pathways create liability?
2. Are disclaimers ("not a diagnosis") sufficient?
3. Do we need Business Associate Agreement (BAA) for healthcare provider integration?
4. What insurance coverage is required?
5. If crisis alert fails (false negative), what's our liability?
6. If crisis alert is wrong (false positive), what's our liability?
7. Can we be sued for medical advice?

**Deliverable**: Legal opinion with risk assessment and required changes.

### 3. Ethics Board Review

**Reviewer**: Ethics board (if exists) or independent ethicist

**Review Scope**:
- [ ] Vulnerable population protection (children)
- [ ] Algorithmic bias concerns
- [ ] Consent process fairness
- [ ] Data usage appropriateness
- [ ] Power dynamics (system suggesting clinical pathways)
- [ ] Harm potential assessment

**Questions for Ethics Board**:
1. Is it ethical to auto-suggest therapeutic pathways?
2. How do we ensure vulnerable populations protected?
3. Is there algorithmic bias risk?
4. Is parent consent process adequate?
5. What oversight mechanisms should exist?

**Deliverable**: Ethics approval with any concerns documented.

### 4. Compliance Review

**Reviewer**: Compliance officer

**Review Scope**:
- [ ] COPPA compliance (parental consent)
- [ ] GDPR compliance (EU users)
- [ ] HIPAA compliance (if healthcare provider integration)
- [ ] State-specific mental health laws
- [ ] Data retention requirements
- [ ] Right to deletion

**Questions for Compliance**:
1. Are we COPPA compliant?
2. GDPR compliant for EU users?
3. If we notify healthcare providers, is HIPAA required?
4. State-specific mental health laws?
5. Data retention requirements for therapeutic data?

**Deliverable**: Compliance sign-off with required changes.

### 5. Insurance Review

**Reviewer**: Insurance broker/risk management

**Review Scope**:
- [ ] Professional liability coverage adequate?
- [ ] Medical advice exclusions?
- [ ] Coverage limits appropriate?
- [ ] Policy endorsements needed?

**Questions for Insurance**:
1. Does current policy cover therapeutic suggestions?
2. What coverage limits are recommended?
3. Do we need specific endorsements?
4. What's the premium impact?

**Deliverable**: Insurance verification letter.

---

## Review Process

### Step 1: Preparation (Week 1)

- [ ] Compile all therapeutic code
- [ ] Extract all email language samples
- [ ] Document detection algorithms
- [ ] Prepare confidence threshold data
- [ ] Create review packet

### Step 2: Clinical Review (Week 2)

- [ ] Schedule review meeting
- [ ] Present system to clinician
- [ ] Answer questions
- [ ] Document feedback
- [ ] Implement required changes

### Step 3: Legal Review (Week 3)

- [ ] Share clinical review results
- [ ] Present system to legal counsel
- [ ] Discuss liability scenarios
- [ ] Document risk assessment
- [ ] Implement required changes

### Step 4: Ethics Review (Week 3-4)

- [ ] Present to ethics board
- [ ] Address concerns
- [ ] Document approval
- [ ] Implement required changes

### Step 5: Compliance & Insurance (Week 4)

- [ ] Compliance sign-off
- [ ] Insurance verification
- [ ] Final documentation

### Step 6: Parent Testing (Week 5-6)

- [ ] Recruit 20+ parents (informed consent)
- [ ] Enable therapeutic features for test cohort
- [ ] Monitor outcomes
- [ ] Collect feedback
- [ ] Document results

### Step 7: Final Approval (Week 7)

- [ ] All reviews complete
- [ ] All changes implemented
- [ ] Parent testing successful
- [ ] Final sign-off from all parties

---

## Required Documentation

### Clinical Review Package

1. **Therapeutic Pathway Designs**
   - CBT-based anxiety program (8 weeks)
   - Other pathways as applicable
   - Story content examples
   - Expected outcomes

2. **Detection Algorithms**
   - Confidence calculation methodology
   - Pattern recognition logic
   - Threshold justification
   - False positive/negative analysis

3. **Language Samples**
   - All therapeutic email templates
   - SMS/push notification content
   - In-app messaging
   - Professional referral language

4. **Consent Process**
   - Parent consent flow
   - Re-confirmation schedule
   - Decline without friction
   - Withdrawal process

5. **Outcome Measurement**
   - Effectiveness metrics
   - Parent satisfaction tracking
   - Professional referral rates
   - Audit logging

### Legal Review Package

1. **Liability Assessment**
   - False positive scenarios
   - False negative scenarios
   - Medical advice claims
   - Harm potential analysis

2. **Disclaimers**
   - "Not a diagnosis" language
   - "Not a replacement for professional care"
   - Crisis resources
   - Professional referral

3. **Insurance Coverage**
   - Current policy review
   - Coverage gap analysis
   - Required endorsements
   - Premium impact

4. **Regulatory Compliance**
   - COPPA checklist
   - GDPR checklist
   - State mental health laws
   - HIPAA (if applicable)

---

## Forbidden Language (Code-Enforced)

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

// Automated validation before send
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

// Block send if violations found
if (!validation.valid) {
  throw new Error('Forbidden clinical language detected');
}
```

**This is enforced in code** - cannot be bypassed.

---

## Permitted Language Examples

### ✅ Good (Observational)

- "We noticed patterns that might indicate..."
- "Some children benefit from..."
- "Would you like to explore..."
- "Consider discussing with a professional..."
- "Stories designed to support..."
- "This is an observation, not a diagnosis"
- "If you're concerned, contact [Child]'s healthcare provider"

### ❌ Bad (Diagnostic)

- "Emma has anxiety disorder"
- "Requires treatment for depression"
- "Diagnosed with emotional dysregulation"
- "Suffering from trauma"
- "Symptoms of ADHD detected"
- "Clinically significant anxiety"

---

## Audit Requirements

### Data Retention

**Therapeutic data**: 365 days minimum
- Pathway suggestions
- Parent responses (accept/decline)
- Effectiveness measurements
- Clinical review notes

**Crisis alerts**: 365 days minimum
- Detection events
- Confidence scores
- Alert sent (yes/no)
- Parent response

**General pipeline data**: 90 days
- Pipeline executions
- Veto decisions
- Email delivery logs

### Monthly Audit Report

**Metrics to report**:
1. Therapeutic suggestions sent: X
2. Parent acceptance rate: Y%
3. False positive rate: Z%
4. Effectiveness outcomes: Average score
5. Professional referrals: Count
6. Crisis alerts: Count
7. Crisis false positives: Count

**Review meeting**: First Monday of each month

**Attendees**: Clinical psychologist, legal counsel, compliance officer, product owner

---

## Sign-Off Form

```
CLINICAL REVIEW SIGN-OFF
Date: _______________

I, ________________________ (Printed Name), a licensed clinical 
psychologist, have reviewed the Storytailor Automatic Pipeline System's 
therapeutic features including:

☐ Therapeutic pathway designs
☐ Detection algorithms and thresholds
☐ All email language and messaging
☐ Parent consent process
☐ Crisis detection and alert system
☐ Early intervention triggers
☐ Professional referral protocols

I find the system:
☐ APPROVED - Ready for production use
☐ APPROVED WITH CHANGES - See attached recommendations
☐ NOT APPROVED - Requires substantial revision

Clinical concerns (if any): ____________________________________
______________________________________________________________

Recommendations: ______________________________________________
______________________________________________________________

Signature: _____________________ Date: _____________________
License #: _____________________
```

---

## Contact for Review Coordination

**Project Lead**: [Contact]  
**Clinical Coordinator**: [Contact]  
**Legal Coordinator**: [Contact]

---

**This review process is mandatory before therapeutic features can be enabled in production.**


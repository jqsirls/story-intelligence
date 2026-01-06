# Safety Boundaries

> **Version**: 1.0  
> **Last Updated**: December 23, 2025  
> **Status**: Canonical Reference  
> **Compliance**: COPPA, GDPR, HIPAA considerations

This document defines explicit safety boundaries for the Storytailor® platform, particularly around emotion intelligence features and mental health considerations. These are not suggestions—they are hard constraints.

---

## 1. Scope Classification

### 1.1 Surface Types

| Surface | Audience | Emotion Data Visibility | Crisis Escalation |
|---------|----------|------------------------|-------------------|
| Child-facing | Children (5-12) | None | Immediate redirect |
| Parent/Guardian | Adults with custody | Full | Parent notification |
| Educator | Teachers, therapists | Aggregated only | Parent notification |
| Admin/Support | Internal staff | Full (audited) | Protocol activation |

### 1.2 Endpoint Scope Requirements

Every endpoint involving emotional data MUST declare its scope:

```yaml
x-scope: parent-facing      # Adult-only
x-scope: child-safe         # Safe for child interaction
x-scope: educator-view      # Aggregated, anonymized
x-scope: internal-only      # Staff access only
```

---

## 2. Mental Health Feature Boundaries

### 2.1 Advisory vs. Authoritative

**CRITICAL**: Storytailor provides **advisory** emotional insights, NOT clinical diagnoses.

| Feature | Classification | Liability |
|---------|---------------|-----------|
| Emotion check-ins | Advisory observation | None |
| Emotion patterns | Advisory trends | None |
| Story recommendations | Advisory suggestions | None |
| Crisis detection | Alert trigger ONLY | Requires parent action |
| Mental health diagnosis | **FORBIDDEN** | N/A |

### 2.2 Required Disclaimers

All emotion-related API responses MUST include:

```json
{
  "data": { ... },
  "advisory": {
    "disclaimer": "This information is for awareness purposes only and is not a clinical assessment. If you have concerns about your child's emotional wellbeing, please consult a qualified healthcare professional.",
    "helplineUrl": "https://storytailor.com/resources/mental-health"
  }
}
```

### 2.3 Prohibited Actions

The system MUST NOT:

- ❌ Diagnose mental health conditions
- ❌ Prescribe treatments or interventions
- ❌ Make definitive statements about a child's mental state
- ❌ Store or transmit data to third-party clinical systems
- ❌ Share emotion data with advertisers or marketers
- ❌ Use emotion data for content targeting without explicit consent

---

## 3. Crisis Detection & Response

### 3.1 Crisis Triggers

The following patterns trigger crisis protocol:

| Trigger | Detection Method | Threshold |
|---------|------------------|-----------|
| Sustained distress | 3+ consecutive "sad"/"anxious" check-ins | 72 hours |
| Self-harm keywords | Content analysis | Any match |
| Crisis keywords | "hurt myself", "don't want to be here" | Any match |
| Sudden mood shift | Happy → Distressed | Within 24h |
| Extended absence | No check-ins after regular pattern | 7 days |

### 3.2 Crisis Response Levels

| Level | Trigger | Response |
|-------|---------|----------|
| **Yellow** | Sustained distress | Email parent with resources |
| **Orange** | Crisis keyword detected | Immediate push + email to parent |
| **Red** | Self-harm indication | Immediate all-channel alert + helpline resources |

### 3.3 Crisis Response Flow

```
1. Detection occurs in EmotionAgent
2. Log event (anonymized) for compliance
3. Trigger notification to parent/guardian ONLY
4. Display resources to parent (NOT child)
5. Never block child's access (could increase distress)
6. Follow up after 24h if no parent acknowledgment
```

### 3.4 What We DO NOT Do

- ❌ Contact authorities directly (we are not mandated reporters for digital services)
- ❌ Lock the child's account
- ❌ Display crisis content to the child
- ❌ Make assumptions about the child's safety
- ❌ Store crisis events longer than 30 days

---

## 4. Emotion Data Handling

### 4.1 Data Retention

| Data Type | Retention | Reason |
|-----------|-----------|--------|
| Individual check-ins | 30 days | Trend analysis |
| Aggregated patterns | 1 year | Long-term insights |
| Crisis events | 30 days | Compliance review |
| Anonymous analytics | Indefinite | Product improvement |

### 4.2 Data Access Control

```typescript
// Emotion data access is ALWAYS scoped
interface EmotionDataAccess {
  userId: string;          // Parent/guardian only
  profileId: string;       // Specific child
  accessLevel: 'full' | 'aggregated' | 'none';
  auditLog: boolean;       // Always true for internal access
}
```

### 4.3 Anonymization Rules

For educator/admin views:

```json
{
  "classroom": "Grade 3 - Room 12",
  "emotionDistribution": {
    "happy": 45,
    "calm": 30,
    "anxious": 15,
    "sad": 10
  },
  "note": "Aggregated from 25 students, minimum cohort size met"
}
```

**Minimum cohort size**: 10 (never show aggregates for smaller groups)

---

## 5. Content Safety

### 5.1 Story Content Boundaries

All generated stories MUST NOT contain:

| Category | Examples | Enforcement |
|----------|----------|-------------|
| Violence | Graphic injury, weapons | Content filter + human review |
| Sexual content | Any romantic/sexual themes | Hard block |
| Substance abuse | Drugs, alcohol | Hard block |
| Horror | Gore, extreme fear | Age-gated (10+) |
| Discrimination | Racism, bullying glorification | Hard block |
| Self-harm | Any self-injury themes | Hard block + crisis protocol |

### 5.2 Character Safety

Character generation MUST:

- ✅ Represent diverse appearances positively
- ✅ Avoid stereotypes
- ✅ Never sexualize children
- ✅ Maintain age-appropriate appearances
- ✅ Use species-first language for accessibility traits

### 5.3 Moderation Queue

Content flagged by filters goes to human review:

```json
{
  "contentId": "story_abc123",
  "flagReason": "potential_violence",
  "confidence": 0.72,
  "status": "pending_review",
  "autoAction": "held",
  "reviewDeadline": "2024-12-24T12:00:00Z"
}
```

---

## 6. Child-Facing API Restrictions

### 6.1 Endpoints Blocked for Child Tokens

```yaml
# These endpoints return 403 for child-scope tokens
/emotions/patterns       # Only parents see patterns
/emotions/crisis-alerts  # Only parents see alerts
/account/subscription    # Billing is adult-only
/transfers/*             # Content transfers are adult-only
/organizations/*         # B2B features are adult-only
```

### 6.2 Child-Safe Endpoints

```yaml
# Safe for child tokens
/stories                 # View their own stories
/characters              # View their own characters
/emotions/check-in       # Submit a check-in (simple emoji)
/audio/play              # Listen to stories
```

### 6.3 Child Token Restrictions

```typescript
interface ChildTokenRestrictions {
  canViewOwnContent: true;
  canCreateContent: true;  // Stories are reviewed
  canViewEmotionHistory: false;
  canViewFamilyMembers: false;
  canModifyAccount: false;
  canAccessBilling: false;
  sessionTimeout: '30m';   // Shorter than adult
}
```

---

## 7. External Trigger Handling

### 7.1 Smart Home Integration Safety

For Philips Hue and similar:

| Scenario | Behavior |
|----------|----------|
| Calm story | Soft, warm colors |
| Exciting story | Brighter, varied colors |
| Sad/anxious story | Warm, stable colors (NOT dark) |
| Crisis content | Default ambient (no dramatic changes) |

**Never**: Flash lights, use red/emergency colors, create strobe effects

### 7.2 Notification Limits

| User Type | Max per day | Max per hour | Quiet hours |
|-----------|-------------|--------------|-------------|
| Parent | 20 | 5 | Respected |
| Child | 5 | 2 | 8pm-8am local |
| Educator | 10 | 3 | Respected |

---

## 8. Logging & Anonymization

### 8.1 What We Log (Anonymized)

```json
{
  "event": "emotion_checkin",
  "profileIdHash": "sha256:abc123...",
  "emotion": "happy",
  "timestamp": "2024-12-23T12:00:00Z",
  "storyContext": true,
  "crisisIndicator": false
}
```

### 8.2 What We NEVER Log

- ❌ Raw child names (tokenized only)
- ❌ Exact location data
- ❌ Device identifiers tied to children
- ❌ Cross-session tracking of children
- ❌ Behavioral profiles of children

### 8.3 Log Retention

| Log Type | Retention | Access |
|----------|-----------|--------|
| API access logs | 30 days | Automated monitoring |
| Emotion events | 30 days | Parent-requested only |
| Crisis events | 30 days | Compliance review |
| Anonymized analytics | 2 years | Product team |

---

## 9. Parent Control Guarantees

### 9.1 Parent Rights

Parents/guardians can ALWAYS:

- ✅ View all emotion data for their children
- ✅ Delete all emotion data for their children
- ✅ Disable emotion tracking entirely
- ✅ Export all data (GDPR compliance)
- ✅ Remove child's account immediately
- ✅ Block specific content types

### 9.2 Parent Consent Required For

- Any emotion data collection
- Story sharing outside family
- Educator access to child's data
- Any third-party integration

### 9.3 Consent Verification

```typescript
interface ConsentRecord {
  parentId: string;
  childProfileId: string;
  consentType: 'emotion_tracking' | 'educator_access' | 'sharing';
  grantedAt: string;
  expiresAt: string;      // Annual renewal required
  verificationMethod: 'email' | 'phone' | 'privo';
}
```

---

## 10. Compliance Summary

| Regulation | Requirement | Our Compliance |
|------------|-------------|----------------|
| **COPPA** | Parental consent for <13 | PRIVO verified consent |
| **GDPR** | Data minimization | 30-day retention, anonymization |
| **GDPR** | Right to deletion | Immediate soft delete, 30-day hard delete |
| **CCPA** | Do not sell | No data sales, ever |
| **HIPAA** | PHI protection | Not a covered entity, but we follow principles |

---

## 11. Escalation Contacts

| Scenario | Contact | Response Time |
|----------|---------|---------------|
| Safety concern | safety@storytailor.com | <4 hours |
| Data breach | security@storytailor.com | <1 hour |
| COPPA inquiry | compliance@storytailor.com | <24 hours |
| General support | support@storytailor.com | <24 hours |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-12-23 | Initial release |

---

*This document defines hard boundaries. Violations require incident reporting and review.*


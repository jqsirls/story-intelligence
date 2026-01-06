# SendGrid Template Creation Guide

**Date**: December 25, 2025  
**Purpose**: Step-by-step guide for creating the 11 new SendGrid email templates

---

## Templates to Create

### Tier 1: Professional Design Required (11)

1. `character-complete` - Character Birth Certificate ready
2. `story-partial-complete` - Some assets ready, others pending
3. `story-generation-failed` - Complete generation failure
4. `asset-timeout` - Asset stuck in generating
5. `weekly-insights-parent` - Parent emotional/engagement report
6. `weekly-insights-teacher` - Classroom progress report
7. `weekly-insights-therapist` - HIPAA-compliant client progress
8. `monthly-progress-report` - Comprehensive monthly summary
9. `seat-welcome` - B2B new member onboarding
10. `org-health-report` - Organization utilization report
11. `power-user-detected` - Free→Paid upsell offer

---

## Creation Process (For Each Template)

### Step 1: Design in SendGrid

1. Log into SendGrid: https://app.sendgrid.com
2. Navigate to: Email API → Dynamic Templates
3. Click "Create a Dynamic Template"
4. Name: `storytailor-{template-name}`
5. Click "Add Version" → "Blank Template" or "Code Editor"

### Step 2: Add Dynamic Variables

Use handlebar syntax for dynamic content:

```handlebars
{{userName}}
{{childName}}
{{storyTitle}}
{{characterName}}
{{headshotUrl}}
{{pdfUrl}}
{{playUrl}}
```

### Step 3: Design Email

**Follow Communication Tone Guide**:
- Word count: 50-200 words
- Single CTA
- Specific names (not generic)
- Comparative data (where applicable)
- Confident tone (no hedging)

**Brand Guidelines**:
- Logo: Storytailor® (first mention), Storytailor (subsequent)
- Tagline: Story Intelligence™
- Colors: #4F46E5 (primary), #2D3748 (text), #718096 (secondary)
- Font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto

### Step 4: Test with Sample Data

Click "Test Data" and add:

```json
{
  "userName": "Sarah",
  "childName": "Emma",
  "storyTitle": "The Brave Dragon",
  "characterName": "Ruby the Fox",
  "headshotUrl": "https://example.com/headshot.png",
  "pdfUrl": "https://example.com/certificate.pdf",
  "playUrl": "https://storytailor.com/story/123"
}
```

Send test email to yourself.

### Step 5: Get Template ID

After saving, copy the template ID (format: `d-abc123...`)

### Step 6: Store in SSM

```bash
aws ssm put-parameter \
  --name /storytailor-production/email/templates/character-complete \
  --value "d-abc123..." \
  --type String \
  --region us-east-1
```

### Step 7: Verify in Code

Template should now be accessible via:

```typescript
const templateId = await emailService.getTemplateId('character-complete');
```

---

## Template Specifications

### 1. character-complete

**Purpose**: Celebrate character with Birth Certificate

**Variables**:
```typescript
{
  userName: string;
  characterName: string;
  headshotUrl: string; // Presigned S3 URL
  pdfUrl: string; // Presigned S3 URL for Birth Certificate
  species: string;
  personality: string[];
}
```

**Subject**: `${characterName}'s Birth Certificate is Ready!`

**Body** (max 100 words):
```
${characterName} is officially registered!

Download the Birth Certificate and share ${characterName}'s adventures.

[View Character] [Download Certificate]
```

---

### 2. story-partial-complete

**Purpose**: Explain partial completion, set expectations

**Variables**:
```typescript
{
  userName: string;
  storyTitle: string;
  readyAssets: string[]; // ['audio', 'art']
  pendingAssets: string[]; // ['pdf', 'activities']
  storyUrl: string;
}
```

**Subject**: `"${storyTitle}" partially ready`

**Body** (max 100 words):
```
"${storyTitle}" is ready, but some assets are still generating.

Ready: ${readyAssets.join(', ')}
Still working on: ${pendingAssets.join(', ')}

We're retrying automatically. You'll get another email when complete.

[View Story]
```

---

### 3. story-generation-failed

**Purpose**: Graceful failure with support

**Variables**:
```typescript
{
  userName: string;
  storyTitle: string;
  errorMessage: string;
  supportUrl: string;
}
```

**Subject**: `Issue with "${storyTitle}"`

**Body** (max 75 words):
```
We encountered an issue generating "${storyTitle}".

We're working on it and will retry automatically. You'll receive an email when it's ready.

If this continues, contact support.

[Contact Support]
```

---

### 4. asset-timeout

**Purpose**: Set expectations for delayed generation

**Variables**:
```typescript
{
  userName: string;
  storyTitle: string;
  eta: string; // "15 minutes"
}
```

**Subject**: `Story taking longer than expected`

**Body** (max 50 words):
```
Your story is taking longer than expected to generate.

We're still working on it. ETA: ${eta}.

You'll receive an email when it's ready.
```

---

### 5. weekly-insights-parent

**Purpose**: Emotional trends + story engagement

**Variables**:
```typescript
{
  parentName: string;
  childName: string;
  primaryMood: string;
  moodShift: string; // "sad → calm"
  favoriteStory: string;
  readingTime: number; // Minutes
  recommendations: string[];
}
```

**Subject**: `${childName}'s week with Storytailor`

**Body** (max 200 words):
```
This week: ${childName} loved "${favoriteStory}".

Emotional trend: ${moodShift}
Reading time: ${readingTime} minutes

${recommendations[0]}

[Create Story]
```

---

### 6. weekly-insights-teacher

**Purpose**: Classroom progress report

**Variables**:
```typescript
{
  teacherName: string;
  activeStudents: number;
  storiesUsed: number;
  topStudents: string[];
  strugglingStudents: string[];
  recommendations: string[];
}
```

**Subject**: `Classroom insights this week`

**Body** (max 200 words):
```
This week: ${activeStudents} students, ${storiesUsed} stories.

Top performers: ${topStudents.join(', ')}
Need support: ${strugglingStudents.join(', ')}

${recommendations[0]}

[Create Lesson]
```

---

### 7. weekly-insights-therapist

**Purpose**: HIPAA-compliant client progress

**Variables**:
```typescript
{
  therapistName: string;
  clientInitials: string; // Not full name (HIPAA)
  sessionsCompleted: number;
  pathwayProgress: number; // %
  outcomeScore: number;
  crisisEvents: number;
  recommendations: string[];
}
```

**Subject**: `Client progress update`

**Body** (max 200 words):
```
This week: ${clientInitials} completed ${sessionsCompleted} sessions.

Pathway progress: ${pathwayProgress}%
Outcome score: ${outcomeScore}/100
Crisis events: ${crisisEvents}

${recommendations[0]}

[View Details]

HIPAA-compliant report. Do not forward.
```

---

### 8. monthly-progress-report

**Purpose**: Comprehensive monthly summary

**Variables**:
```typescript
{
  userName: string;
  month: string;
  storiesCreated: number;
  storiesConsumed: number;
  topStory: string;
  emotionalTrend: string;
  developmentalMilestones: string[];
}
```

**Subject**: `Your month with Storytailor`

**Body** (max 300 words):
```
${month} summary:

Created: ${storiesCreated} stories
Consumed: ${storiesConsumed} stories
Favorite: "${topStory}"

Emotional trend: ${emotionalTrend}

Milestones:
${developmentalMilestones.map(m => `• ${m}`).join('\n')}

[View Full Report]
```

---

### 9. seat-welcome

**Purpose**: B2B new member onboarding

**Variables**:
```typescript
{
  memberName: string;
  orgName: string;
  adminName: string;
  setupUrl: string;
}
```

**Subject**: `Welcome to ${orgName} on Storytailor`

**Body** (max 100 words):
```
Welcome to ${orgName}'s Storytailor account!

You now have access to the shared library and all organization features.

${adminName} added you to the team.

[Get Started]
```

---

### 10. org-health-report

**Purpose**: Executive summary for org admins

**Variables**:
```typescript
{
  adminName: string;
  orgName: string;
  seatUtilization: number; // %
  activeMembers: number;
  totalSeats: number;
  recommendation: string;
}
```

**Subject**: `${orgName} health report`

**Body** (max 200 words):
```
Monthly health report for ${orgName}:

Seat utilization: ${seatUtilization}%
Active members: ${activeMembers}/${totalSeats}

Recommendation: ${recommendation}

[View Dashboard]
```

---

### 11. power-user-detected

**Purpose**: Conversion-focused upsell

**Variables**:
```typescript
{
  userName: string;
  storiesThisWeek: number;
  discountPercent: number; // 30
  upgradeUrl: string;
}
```

**Subject**: `Power user! ${discountPercent}% off upgrade`

**Body** (max 100 words):
```
You created ${storiesThisWeek} stories this week. You need Premium!

${discountPercent}% off if you upgrade today.

Premium includes:
• Unlimited stories
• Advanced features
• Priority support

[Upgrade Now]

Offer expires in 48 hours.
```

---

## Testing Checklist

For each template:
- [ ] Variables render correctly
- [ ] Subject line clear and specific
- [ ] Body follows tone guide (calm, selective, confident)
- [ ] Word count within limits
- [ ] Single CTA
- [ ] Comparative data (where applicable)
- [ ] Mobile responsive
- [ ] Test on Gmail, Outlook, Apple Mail
- [ ] Unsubscribe link works
- [ ] Preference center link works

---

## SSM Parameter Naming Convention

```bash
/storytailor-production/email/templates/{template-name}
```

**Examples**:
```bash
/storytailor-production/email/templates/character-complete
/storytailor-production/email/templates/weekly-insights-parent
/storytailor-production/email/templates/org-health-report
```

---

## Verification

After creating all templates:

```bash
# List all template parameters
aws ssm get-parameters-by-path \
  --path /storytailor-production/email/templates \
  --region us-east-1

# Should show 45 total templates (34 existing + 11 new)
```

---

## Template Creation Status

| # | Template | Status | Template ID | SSM Parameter |
|---|----------|--------|-------------|---------------|
| 1 | character-complete | ⏳ Pending | - | /storytailor-production/email/templates/character-complete |
| 2 | story-partial-complete | ⏳ Pending | - | /storytailor-production/email/templates/story-partial-complete |
| 3 | story-generation-failed | ⏳ Pending | - | /storytailor-production/email/templates/story-generation-failed |
| 4 | asset-timeout | ⏳ Pending | - | /storytailor-production/email/templates/asset-timeout |
| 5 | weekly-insights-parent | ⏳ Pending | - | /storytailor-production/email/templates/weekly-insights-parent |
| 6 | weekly-insights-teacher | ⏳ Pending | - | /storytailor-production/email/templates/weekly-insights-teacher |
| 7 | weekly-insights-therapist | ⏳ Pending | - | /storytailor-production/email/templates/weekly-insights-therapist |
| 8 | monthly-progress-report | ⏳ Pending | - | /storytailor-production/email/templates/monthly-progress-report |
| 9 | seat-welcome | ⏳ Pending | - | /storytailor-production/email/templates/seat-welcome |
| 10 | org-health-report | ⏳ Pending | - | /storytailor-production/email/templates/org-health-report |
| 11 | power-user-detected | ⏳ Pending | - | /storytailor-production/email/templates/power-user-detected |

**Note**: These templates should be created in SendGrid UI by design team, then template IDs stored in SSM.

---

## Next Steps

1. Share this guide with design team
2. Design team creates templates in SendGrid
3. Store template IDs in SSM
4. Test email sending via EmailService
5. Validate on multiple email clients

---

**Template creation is the final step before deployment.**


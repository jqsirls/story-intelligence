Status: Draft  
Audience: Internal  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 2.6 - Safety prompts extracted from code with file paths and line numbers

# Safety Prompts

## Overview

This document contains all prompts used for content moderation, safety checks, crisis detection, and bias detection in Storytailor.

## Content Moderation

### OpenAI Moderation

**Location:** `packages/content-agent/src/services/ContentModerator.ts:68-73`

**Purpose:** Run OpenAI moderation API on content

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/ContentModerator.ts:68-73
private async runOpenAIModeration(content: string): Promise<OpenAI.Moderations.ModerationCreateResponse> {
  return await this.openai.moderations.create({
    input: content,
    model: 'text-moderation-latest'
  });
}
```

**Note:** OpenAI moderation API does not use prompts - it's a direct content analysis API.

### Custom Moderation Checks

**Location:** `packages/content-agent/src/services/ContentModerator.ts:75-125`

**Purpose:** Run custom child-safety filters

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/ContentModerator.ts:75-125
private async runCustomModeration(request: ModerationRequest): Promise<{
  flagged: boolean;
  categories: string[];
  severity: 'low' | 'medium' | 'high';
  suggestions: string[];
}> {
  const flaggedCategories: string[] = [];
  const suggestions: string[] = [];
  let severity: 'low' | 'medium' | 'high' = 'low';

  // Age-specific content checks
  if (request.userAge) {
    const ageIssues = this.checkAgeAppropriate(request.content, request.userAge);
    if (ageIssues.length > 0) {
      flaggedCategories.push('age_inappropriate');
      suggestions.push(...ageIssues);
      severity = 'medium';
    }
  }

  // Story type specific checks
  if (request.storyType) {
    const storyTypeIssues = this.checkStoryTypeAppropriate(request.content, request.storyType);
    if (storyTypeIssues.length > 0) {
      flaggedCategories.push('story_type_mismatch');
      suggestions.push(...storyTypeIssues);
    }
  }

  // Child-specific safety checks
  const safetyIssues = this.checkChildSafety(request.content);
  if (safetyIssues.length > 0) {
    flaggedCategories.push('child_safety');
    suggestions.push(...safetyIssues);
    severity = 'high';
  }

  // Educational value checks
  const educationalIssues = this.checkEducationalValue(request.content, request.contentType);
  if (educationalIssues.length > 0) {
    flaggedCategories.push('educational_concern');
    suggestions.push(...educationalIssues);
  }

  return {
    flagged: flaggedCategories.length > 0,
    categories: flaggedCategories,
    severity,
    suggestions
  };
}
```

### Age-Appropriate Checks

**Location:** `packages/content-agent/src/services/ContentModerator.ts:127-158`

**Purpose:** Check content for age-appropriateness

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/ContentModerator.ts:127-158
private checkAgeAppropriate(content: string, age: number): string[] {
  const issues: string[] = [];
  const lowerContent = content.toLowerCase();

  // Vocabulary complexity check
  if (age <= 5) {
    const complexWords = this.findComplexWords(content);
    if (complexWords.length > 0) {
      issues.push(`Simplify vocabulary: ${complexWords.slice(0, 3).join(', ')}`);
    }
  }

  // Sentence length check
  const sentences = content.split(/[.!?]+/);
  const avgWordsPerSentence = sentences.reduce((acc, sentence) => 
    acc + sentence.trim().split(/\s+/).length, 0) / sentences.length;

  if (age <= 6 && avgWordsPerSentence > 10) {
    issues.push('Use shorter sentences for better comprehension');
  }

  // Emotional complexity check
  if (age <= 7) {
    const complexEmotions = ['anxiety', 'depression', 'existential', 'mortality', 'divorce'];
    const foundComplex = complexEmotions.filter(emotion => lowerContent.includes(emotion));
    if (foundComplex.length > 0) {
      issues.push(`Avoid complex emotional themes: ${foundComplex.join(', ')}`);
    }
  }

  return issues;
}
```

### Story Type Appropriate Checks

**Location:** `packages/content-agent/src/services/ContentModerator.ts:160-191`

**Purpose:** Check content matches story type requirements

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/ContentModerator.ts:160-191
private checkStoryTypeAppropriate(content: string, storyType: StoryType): string[] {
  const issues: string[] = [];
  const lowerContent = content.toLowerCase();

  switch (storyType) {
    case 'Bedtime':
      if (this.containsExcitingElements(lowerContent)) {
        issues.push('Bedtime stories should be calm and soothing, not exciting');
      }
      break;
    
    case 'Educational':
      if (!this.containsLearningElements(lowerContent)) {
        issues.push('Educational stories should include clear learning objectives');
      }
      break;
    
    case 'Medical Bravery':
      if (this.containsScaryMedicalContent(lowerContent)) {
        issues.push('Medical stories should be supportive, not frightening');
      }
      break;
    
    case 'Mental Health':
      if (!this.containsPositiveCoping(lowerContent)) {
        issues.push('Mental health stories should include positive coping strategies');
      }
      break;
  }

  return issues;
}
```

### Child Safety Checks

**Location:** `packages/content-agent/src/services/ContentModerator.ts:193-219`

**Purpose:** Check content for child safety concerns

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/ContentModerator.ts:193-219
private checkChildSafety(content: string): string[] {
  const issues: string[] = [];
  const lowerContent = content.toLowerCase();

  // Violence indicators
  const violenceWords = ['fight', 'hit', 'hurt', 'blood', 'weapon', 'kill', 'die', 'death'];
  const foundViolence = violenceWords.filter(word => lowerContent.includes(word));
  if (foundViolence.length > 0) {
    issues.push(`Remove violent content: ${foundViolence.join(', ')}`);
  }

  // Scary content indicators
  const scaryWords = ['monster', 'ghost', 'scary', 'frightening', 'nightmare', 'dark', 'alone'];
  const foundScary = scaryWords.filter(word => lowerContent.includes(word));
  if (foundScary.length > 2) { // Allow some mild scary elements
    issues.push('Reduce scary or frightening elements');
  }

  // Inappropriate themes
  const inappropriateThemes = ['adult', 'mature', 'sexual', 'drug', 'alcohol', 'smoking'];
  const foundInappropriate = inappropriateThemes.filter(theme => lowerContent.includes(theme));
  if (foundInappropriate.length > 0) {
    issues.push(`Remove inappropriate themes: ${foundInappropriate.join(', ')}`);
  }

  return issues;
}
```

## Inappropriate Content Detection

### AI Content Analysis Prompt

**Location:** `packages/child-safety-agent/src/services/InappropriateContentHandler.ts:249-278`

**Purpose:** Analyze content for inappropriate content using AI

**Code Reference:**
```typescript
// Code location: packages/child-safety-agent/src/services/InappropriateContentHandler.ts:249-278
private async performAIContentAnalysis(request: InappropriateContentRequest): Promise<{
  isInappropriate: boolean;
  categories: InappropriateCategory[];
  severity: 'mild' | 'moderate' | 'severe' | 'extreme';
  confidence: number;
  reasoning: string;
}> {
  try {
    const contextText = request.conversationContext.join(' | ');
    
    const prompt = `You are a child safety expert analyzing content for appropriateness for children.

Analyze the following user input for inappropriate content:

User input: "${request.userInput}"
Conversation context: ${contextText}
Child's age: ${request.userAge || 'unknown'}
Previous inappropriate requests: ${request.previousInappropriateRequests}

Check for these categories of inappropriate content:
- Sexual content or romantic themes inappropriate for children
- Violence, aggression, or harmful behavior
- Profanity or inappropriate language
- Hate speech or discriminatory content
- Dangerous activities that could cause harm
- Substance use (alcohol, drugs, smoking)
- Inappropriate relationships (age-inappropriate romantic content)
- Requests for personal information
- Scary content inappropriate for the child's age

Respond with a JSON object:
{
  "isInappropriate": boolean,
  "categories": ["category1", "category2"],
  "severity": "mild|moderate|severe|extreme",
  "confidence": number (0-1 scale),
  "reasoning": "Brief explanation"
}

Consider the child's developmental stage and err on the side of caution for child safety.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a child safety expert analyzing content for age-appropriateness with sensitivity and care.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 400
    });
}
```

## Disclosure Detection

### Disclosure Detection System Prompt

**Location:** `packages/child-safety-agent/src/services/DisclosureDetectionService.ts:221-250`

**Purpose:** Analyze child's message for potential disclosures of abuse, neglect, or safety concerns

**Code Reference:**
```typescript
// Code location: packages/child-safety-agent/src/services/DisclosureDetectionService.ts:221-250
private async performAIAnalysis(request: DisclosureDetectionRequest): Promise<{
  hasDisclosure: boolean;
  disclosureType: DisclosureType;
  severity: number;
  confidence: number;
  reasoning: string;
}> {
  try {
    const prompt = `You are a child safety expert analyzing a child's message for potential disclosures of abuse, neglect, or other safety concerns.

IMPORTANT: This is for child protection purposes. Analyze the following message and conversation context for any signs of:
- Physical abuse or violence
- Emotional abuse or psychological harm
- Sexual abuse or inappropriate contact
- Neglect or lack of care
- Bullying or peer victimization
- Self-harm or suicidal thoughts
- Substance abuse
- Domestic violence exposure
- Mental health crisis
- Unsafe situations

Child's message: "${request.userInput}"

Conversation context: ${request.conversationContext.join(' | ')}

Child's age: ${request.userAge || 'unknown'}

Respond with a JSON object containing:
{
  "hasDisclosure": boolean,
  "disclosureType": "none|physical_abuse|emotional_abuse|sexual_abuse|neglect|bullying|self_harm|suicidal_ideation|substance_abuse|domestic_violence|mental_health_crisis|unsafe_situation",
  "severity": number (0-1 scale),
  "confidence": number (0-1 scale),
  "reasoning": "Brief explanation of analysis"
}

Be extremely careful and err on the side of caution. Even subtle indicators should be flagged for professional review.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a child safety expert. Analyze messages for potential disclosures with extreme care and sensitivity.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for consistent analysis
      max_tokens: 500
    });
}
```

## Prompt Sanitization

### Prompt Sanitization Filter

**Location:** `packages/content-safety/src/filters/PromptSanitizationFilter.ts:22-174`

**Purpose:** Filter prompt injection attempts and safety bypasses

**Code Reference:**
```typescript
// Code location: packages/content-safety/src/filters/PromptSanitizationFilter.ts:22-174
async filter(request: ContentSafetyRequest): Promise<PreFilterResult> {
  this.logger.debug('Running prompt sanitization filter', {
    contentType: request.contentType,
    contentLength: request.content.length
  });

  const warnings: string[] = [];
  const modifications: string[] = [];
  let sanitizedContent = request.content;
  let riskLevel: 'low' | 'medium' | 'high' = 'low';

  try {
    // Check for injection attempts
    const injectionPatterns = [
      /ignore\s+previous\s+instructions/i,
      /forget\s+everything/i,
      /system\s*:\s*/i,
      /assistant\s*:\s*/i,
      /human\s*:\s*/i,
      /<\|.*?\|>/g,
      /\[INST\].*?\[\/INST\]/g,
      /###\s*instruction/i
    ];

    let hasInjection = false;
    for (const pattern of injectionPatterns) {
      if (pattern.test(request.content)) {
        hasInjection = true;
        sanitizedContent = sanitizedContent.replace(pattern, '');
        warnings.push('Removed potential prompt injection attempt');
        modifications.push('Sanitized prompt injection patterns');
        riskLevel = 'high';
      }
    }

    // Check for attempts to bypass safety measures
    const bypassPatterns = [
      /jailbreak/i,
      /DAN\s+mode/i,
      /developer\s+mode/i,
      /unrestricted/i,
      /no\s+filter/i,
      /bypass\s+safety/i
    ];

    for (const pattern of bypassPatterns) {
      if (pattern.test(request.content)) {
        sanitizedContent = sanitizedContent.replace(pattern, '');
        warnings.push('Removed safety bypass attempt');
        modifications.push('Removed safety bypass language');
        riskLevel = 'high';
      }
    }

    // Check for inappropriate content requests
    const inappropriatePatterns = [
      /generate\s+.*?(violent|sexual|harmful)/i,
      /create\s+.*?(inappropriate|adult|mature)/i,
      /write\s+.*?(disturbing|graphic|explicit)/i
    ];

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(request.content)) {
        sanitizedContent = sanitizedContent.replace(pattern, '');
        warnings.push('Removed inappropriate content request');
        modifications.push('Sanitized inappropriate content patterns');
        riskLevel = 'high';
      }
    }
  }
}
```

**Note:** This filter uses pattern matching, not prompts. It sanitizes content before it reaches AI models.

## Emotion Detection

### Emotion Detection (Emotion Agent)

**Location:** Based on `packages/emotion-agent/README.md` and emotion response guidance

**Purpose:** Detect emotions from user input and audio

**Code Reference:**
- `lambda-deployments/conversation-agent/src/prompts/EmotionResponseGuidance.js:17-195` - Emotion response framework
- `packages/emotion-agent/src/EmotionAgent.ts:83` - Daily emotional check-ins

**Note:** Emotion detection primarily uses the Emotion Response Guidance framework (see [Conversation Prompts](./conversation.md#emotion-response-guidance)) rather than explicit prompts. The system uses pattern matching and audio analysis for emotion detection.

## Crisis Detection

### Crisis Detection (Emotion Response Guidance)

**Location:** `lambda-deployments/conversation-agent/src/prompts/EmotionResponseGuidance.js:135-158`

**Purpose:** Detect and respond to crisis situations (Tier 3)

**Code Reference:**
```javascript
// Code location: lambda-deployments/conversation-agent/src/prompts/EmotionResponseGuidance.js:135-158
TIER 3: CONCERNING CUES (Crisis intervention required)

Signs: Harm talk, abuse hints, self-blame with intensity, disclosures

Response Pattern:
1. STOP GENTLY: Pause story without alarm
2. SUPPORTIVE PRESENCE: "Thank you for sharing that with me. You're brave."
3. SAFETY CHECK: "Let's make sure you're safe."
4. ADULT CONNECTION: "I will tell a grown up to check in. I will stay with you."
5. NO ADVICE: Never diagnose, counsel, or give medical guidance
6. LOG AND ALERT: Immediate parent notification and potential mandatory reporting

Example Responses:
- "Thank you for telling me. That sounds really hard."
- "You're brave for talking about this."
- "Let's make sure you're safe right now."
- "I'm going to have a trusted adult check in with you."
- "I will stay with you until they arrive."

After Crisis Response:
- Maintain supportive presence
- Offer age-appropriate safety resources
- Continue gentle connection without returning to story immediately
- Follow up with therapeutic storytelling for healing (if appropriate)
```

## Bias Detection

**Location:** `packages/content-safety/src/types.ts:100-101`

**Purpose:** Bias detection in generated content

**Code Reference:**
```typescript
// Code location: packages/content-safety/src/types.ts:100-101
export interface BiasDetectionResult {
  biasDetections: number;
  // ... other fields
}
```

**Note:** Bias detection is implemented but specific prompts are not found in the codebase. The system likely uses pattern matching and content analysis rather than explicit prompts.

## Related Prompts

- **Emotion Response:** See [Conversation Prompts](./conversation.md#emotion-response-guidance)
- **Frankie Safety Responses:** See [Conversation Prompts](./conversation.md#frankie-system-prompt)

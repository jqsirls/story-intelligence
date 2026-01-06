# Content Agent

The Content Agent is responsible for story type classification, prompt selection, and content moderation within the Alexa Multi-Agent System. It provides voice-driven story creation capabilities with specialized prompts for different story types and age-appropriate content filtering.

## Features

### Story Type Classification
- Classifies user input into 11 story types using OpenAI function calling
- Supports confidence scoring and alternative type suggestions
- Handles clarification when classification confidence is low
- Caches classification results for performance

### Prompt Selection
- Age-appropriate prompt templates for each story type
- Supports age groups: 3, 4, 5, 6, 7, 8, 9+
- Dynamic constraint generation based on user age
- Story type descriptions for user clarification

### Content Moderation
- OpenAI moderation API integration
- Custom child-safety filters
- Age-appropriate content validation
- Story type consistency checks
- Therapeutic content safety protocols
- Crisis detection and intervention
- Batch moderation support

### Post-Story Support System
- Emotional state analysis after story completion
- Personalized support recommendations
- Crisis detection and intervention protocols
- Guided visualization and grounding techniques
- Voice-guided support sessions
- Professional referral pathways
- Safety resource integration

### Supported Story Types

#### Children's Stories (Ages 3-12)
1. **Adventure** - Action-packed journeys, quests, exploration
2. **Bedtime** - Calm, soothing stories for sleep time
3. **Birthday** - Celebration-themed stories for special occasions
4. **Educational** - Learning-focused stories that teach concepts
5. **Financial Literacy** - Stories that teach money management
6. **Language Learning** - Stories that help learn new languages
7. **Medical Bravery** - Stories that help with medical procedures
8. **Mental Health** - Stories addressing emotional well-being
9. **Milestones** - Stories celebrating achievements
10. **New Chapter Sequel** - Continuing stories from previous sessions
11. **Tech Readiness** - Stories introducing technology concepts

#### Therapeutic Stories (Adults)
12. **Child Loss** - Therapeutic stories for processing grief and honoring a child's memory
13. **Inner Child** - Healing stories for connecting with and nurturing your inner child
14. **New Birth** - Celebratory stories for welcoming new life and embracing change

## Installation

```bash
npm install @alexa-multi-agent/content-agent
```

## Configuration

Set the following environment variables:

```bash
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
REDIS_URL=redis://localhost:6379
MODERATION_ENABLED=true
LOG_LEVEL=info
```

## Usage

### Basic Usage

```typescript
import { ContentAgent, createConfig } from '@alexa-multi-agent/content-agent';

const config = createConfig();
const contentAgent = new ContentAgent(config);
await contentAgent.initialize();

// Classify story intent
const result = await contentAgent.classifyStoryIntent({
  userInput: 'I want an adventure story',
  userId: 'user123',
  sessionId: 'session456'
});

console.log(result.storyType); // 'Adventure'
console.log(result.confidence); // 0.9
```

### Story Type Routing

```typescript
// Route with clarification handling
const routing = await contentAgent.routeStoryType({
  userInput: 'Tell me something',
  userId: 'user123',
  sessionId: 'session456'
});

if (!routing.shouldProceed) {
  console.log(routing.clarificationNeeded);
  // Ask user for clarification
}
```

### Prompt Template Selection

```typescript
// Get age-appropriate prompt template
const template = contentAgent.selectPromptTemplate('Adventure', 7);
console.log(template.systemPrompt);
console.log(template.constraints);
```

### Content Moderation

```typescript
// Moderate story content
const moderation = await contentAgent.moderateContent({
  content: 'Story content here...',
  contentType: 'story',
  userAge: 6,
  storyType: 'Adventure'
});

if (!moderation.approved) {
  console.log('Content flagged:', moderation.flaggedCategories);
  console.log('Suggestions:', moderation.suggestedModifications);
}
```

### Therapeutic Story Classification

```typescript
// Classify therapeutic story with enhanced context
const therapeuticResult = await contentAgent.classifyTherapeuticStory({
  userInput: 'I need help processing the loss of my child',
  userId: 'user123',
  sessionId: 'session456',
  therapeuticFocus: 'grief_processing',
  currentEmotionalState: 'vulnerable',
  traumaHistory: ['child_loss'],
  context: {
    currentPhase: 'greeting',
    userAge: 35,
    emotionalState: 'grieving'
  }
});

console.log(therapeuticResult.storyType); // 'Child Loss'
console.log(therapeuticResult.audience); // 'adult'
console.log(therapeuticResult.safetyConsiderations);
```

### Post-Story Support

```typescript
// Analyze emotional response after story completion
const postStoryAnalysis = await contentAgent.analyzePostStoryResponse({
  storyId: 'story_123',
  storyType: 'Child Loss',
  storyContent: 'A therapeutic story about remembering...',
  userReaction: {
    userId: 'user123',
    storyId: 'story_123',
    timestamp: new Date().toISOString(),
    emotionalResponse: {
      felt: ['sadness', 'love', 'longing'],
      intensity: 7,
      processing: true,
      needsSpace: false
    },
    needsSupport: true
  }
});

if (postStoryAnalysis.urgencyLevel === 'high') {
  // Create immediate support session
  const supportSession = await contentAgent.createSupportSession({
    userId: 'user123',
    storyId: 'story_123',
    emotionalState: postStoryAnalysis.emotionalAssessment,
    preferredSupport: ['breathing', 'visualization'],
    timeAvailable: '15 minutes',
    voiceGuidancePreferred: true
  });
  
  // Guide user through support session
  console.log(supportSession.voiceScript);
}
```

### Crisis Detection and Response

```typescript
// The system automatically detects crisis indicators
const analysis = await contentAgent.analyzePostStoryResponse({
  // ... story data
  userReaction: {
    emotionalResponse: {
      felt: ['hopeless', 'overwhelmed'],
      intensity: 9,
      overwhelmed: true
    }
  }
});

if (analysis.urgencyLevel === 'crisis') {
  // Automatic crisis response with safety resources
  console.log(analysis.recommendedSupport.safetyResources);
  // Includes crisis hotlines, emergency contacts, etc.
}
```

### Batch Operations

```typescript
// Batch moderate multiple pieces of content
const requests = [
  { content: 'Story 1...', contentType: 'story', userAge: 5 },
  { content: 'Story 2...', contentType: 'story', userAge: 7 }
];

const results = await contentAgent.batchModerateContent(requests);
```

## API Reference

### ContentAgent

#### Methods

**Core Classification & Moderation**
- `initialize()` - Initialize the agent and connect to services
- `shutdown()` - Shutdown the agent and close connections
- `classifyStoryIntent(request)` - Classify user input into story type
- `classifyTherapeuticStory(request)` - Enhanced classification for therapeutic stories
- `routeStoryType(request)` - Route story type with clarification handling
- `selectPromptTemplate(storyType, age)` - Get prompt template for story type and age
- `moderateContent(request)` - Moderate content for safety
- `batchModerateContent(requests)` - Batch moderate multiple pieces of content

**Post-Story Support**
- `analyzePostStoryResponse(request)` - Analyze user's emotional state after story
- `createSupportSession(request)` - Create personalized support session plan
- `generateImmediateSupport(intensity, storyType, triggers)` - Generate immediate support recommendations

**Utility Methods**
- `getAvailableStoryTypes()` - Get list of all supported story types
- `getStoryTypeDescription(storyType)` - Get description for story type
- `generateStoryTypeOptions(age)` - Generate age-appropriate story type options
- `generateEnhancedStoryTypeOptions(age, therapeuticNeeds)` - Enhanced options with therapeutic matching
- `healthCheck()` - Check health of all services
- `getMetrics()` - Get performance metrics including therapeutic story metrics

### Types

#### StoryClassificationRequest
```typescript
interface StoryClassificationRequest {
  userInput: string;
  context?: ConversationContext;
  userId: string;
  sessionId: string;
}
```

#### StoryClassificationResult
```typescript
interface StoryClassificationResult {
  storyType: StoryType;
  confidence: number;
  alternativeTypes?: Array<{
    type: StoryType;
    confidence: number;
  }>;
  reasoning: string;
}
```

#### ModerationRequest
```typescript
interface ModerationRequest {
  content: string;
  contentType: 'story' | 'character' | 'user_input';
  userAge?: number;
  storyType?: StoryType;
}
```

#### ModerationResult
```typescript
interface ModerationResult {
  approved: boolean;
  flaggedCategories: string[];
  severity: 'low' | 'medium' | 'high';
  suggestedModifications?: string[];
  alternativeContent?: string;
}
```

## Testing

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

## Architecture

The Content Agent consists of three main services:

1. **StoryTypeClassifier** - Uses OpenAI function calling to classify user intent
2. **PromptSelector** - Manages age-appropriate prompt templates
3. **ContentModerator** - Ensures content safety using OpenAI moderation + custom filters

## Privacy & Data Retention

### 🔒 **Privacy-First Therapeutic Data Handling**

The ContentAgent implements a strict privacy-first approach for therapeutic content:

#### **What Gets Permanently Stored (Database)**
- ✅ Final story content (sanitized, PII removed)
- ✅ Basic story metadata (type, creation date, completion status)
- ✅ User preferences for story types
- ✅ Anonymized usage metrics

#### **What Gets Auto-Deleted (Ephemeral Storage)**
- 🔥 Emotional responses and assessments (24h max)
- 🔥 Crisis indicators and support session data (12-72h max)
- 🔥 Therapeutic conversation context (24h max)
- 🔥 Personal trauma history (24h max)
- 🔥 Specific triggers mentioned (24h max)
- 🔥 Support session transcripts (12h max)
- 🔥 Voice guidance scripts (12h max)
- 🔥 All PII related to therapeutic processing

#### **Automatic Data Cleanup**
- Scheduled cleanup runs every 6 hours
- Crisis data retained for 72 hours (for safety follow-up)
- Support session data retained for 12 hours
- Emotional responses retained for 24 hours maximum
- Emergency purge capabilities for GDPR compliance

```typescript
// Privacy-focused usage
const contentAgent = new ContentAgent(config);

// Therapeutic data is automatically ephemeral
const analysis = await contentAgent.analyzePostStoryResponse(request);
// ↑ This data auto-expires in 24 hours

// Stories are sanitized before permanent storage
const sanitized = contentAgent.sanitizeStoryForStorage(storyContent, 'Child Loss');
// ↑ PII and therapeutic details removed

// Manual privacy controls
await contentAgent.purgeSessionTherapeuticData(sessionId, userId);
await contentAgent.purgeUserTherapeuticData(userId);
```

## Performance

- Classification results are cached in Redis for 5 minutes
- Batch operations supported for high-throughput scenarios
- Circuit breaker pattern for external API failures
- Comprehensive error handling with graceful degradation
- Automatic cleanup of ephemeral therapeutic data

## Compliance

- COPPA compliant age-appropriate content filtering
- OpenAI moderation integration for safety
- Audit logging for all moderation decisions
- PII tokenization in logs

## Monitoring

The agent provides health checks and metrics:

- Service connectivity status
- Classification and moderation counts
- Cache hit rates
- Average response times

## Contributing

1. Follow TypeScript best practices
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass before submitting PR

## License

MIT License
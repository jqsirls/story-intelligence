# Conversation Intelligence Agent

Advanced conversation intelligence system with natural language understanding, developmental psychology integration, and contextual memory personalization for the Storytailor platform.

## Features

### 🧠 Advanced Natural Language Understanding
- **Multi-modal Intent Detection**: Combines voice, context, and emotion analysis
- **Implicit Meaning Extraction**: Understands hidden needs and unspoken concerns
- **Age-appropriate Interpretation**: Adapts understanding to developmental stages
- **Cultural Context Understanding**: Recognizes diverse family communication patterns
- **Conversation Repair System**: Detects and handles misunderstandings gracefully

### 🎯 Developmental Psychology Integration
- **Piagetian Cognitive Assessment**: Evaluates cognitive development stages
- **Zone of Proximal Development (ZPD)**: Identifies optimal learning challenges
- **Executive Function Assessment**: Measures working memory, attention, and planning
- **Memory Capacity Adaptation**: Adjusts content to cognitive load limits
- **Processing Speed Optimization**: Adapts timing and pacing to individual needs

### 💭 Contextual Memory & Personalization
- **Long-term Context Preservation**: Maintains conversation history and patterns
- **Communication Style Adaptation**: Personalizes interaction approach
- **Learning Pattern Recognition**: Identifies optimal learning conditions
- **Engagement Pattern Analysis**: Tracks attention triggers and recovery strategies
- **Attention Management**: Provides developmental-appropriate attention support

## Architecture

```
ConversationIntelligenceAgent
├── NaturalLanguageUnderstanding
│   ├── Multi-modal Intent Analysis
│   ├── Implicit Meaning Extraction
│   ├── Cultural Context Analysis
│   └── Conversation Repair Detection
├── DevelopmentalPsychologyIntegration
│   ├── Cognitive Stage Assessment
│   ├── Executive Function Evaluation
│   ├── ZPD Assessment
│   └── Developmental Adaptations
└── ContextualMemoryPersonalization
    ├── Profile Building
    ├── Communication Adaptation
    ├── Flow Optimization
    └── Attention Management
```

## Installation

```bash
npm install @storytailor/conversation-intelligence
```

## Usage

### Basic Setup

```typescript
import { ConversationIntelligenceAgent } from '@storytailor/conversation-intelligence';
import { createLogger } from 'winston';

const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4',
    maxTokens: 500,
  },
  redis: {
    url: process.env.REDIS_URL,
    keyPrefix: 'conversation-intelligence',
    ttl: 3600,
  },
  developmentalPsychology: {
    enabled: true,
    assessmentInterval: 30,
    adaptationThreshold: 0.7,
  },
  culturalContext: {
    enabled: true,
    supportedCultures: ['en-US', 'es-ES', 'fr-FR'],
    defaultCulture: 'en-US',
  },
  personalization: {
    enabled: true,
    learningRate: 0.1,
    memoryRetention: 30,
  },
};

const logger = createLogger({
  level: 'info',
  format: winston.format.json(),
});

const agent = new ConversationIntelligenceAgent(config, logger);
await agent.initialize();
```

### Conversation Analysis

```typescript
const analysis = await agent.analyzeConversation(
  "I want to create a story about a brave princess who saves dragons!",
  {
    userId: 'child-123',
    conversationHistory: [
      'Hello!',
      'What should we create today?',
      'I love stories about princesses'
    ],
    userAge: 7,
    voiceData: {
      tone: 'excited',
      pace: 'fast',
      volume: 'normal',
      clarity: 0.9
    }
  }
);

console.log('Primary Intent:', analysis.intentAnalysis.primaryIntent);
console.log('Cognitive Stage:', analysis.developmentalAssessment.cognitiveAssessment.stage.stage);
console.log('Engagement Level:', analysis.intentAnalysis.emotionalContext.engagementLevel);
console.log('Recommendations:', analysis.recommendations.immediateActions);
```

### Personalization Profile

```typescript
const conversationHistory = [
  {
    timestamp: new Date(),
    context: 'story_creation',
    userInput: 'I want to make a story about dragons',
    systemResponse: 'Great! Tell me about your dragon character.',
    emotionalState: 'excited',
    engagementLevel: 0.9,
    outcomes: ['character_creation_started'],
    lessons: ['prefers_fantasy_themes']
  }
];

const profile = await agent.buildPersonalizationProfile('child-123', conversationHistory);

console.log('Communication Style:', profile.communicationStyle);
console.log('Learning Patterns:', profile.learningPatterns);
console.log('Engagement Patterns:', profile.engagementPatterns);
```

### Conversation Adaptation

```typescript
const developmentalContext = {
  cognitiveStage: { stage: 'concrete-operational' },
  executiveFunctionLevel: {
    workingMemory: 0.7,
    cognitiveFlexibility: 0.6,
    inhibitoryControl: 0.6,
    planningAbility: 0.5,
    attentionRegulation: 0.6
  },
  attentionSpan: {
    sustainedAttention: 12, // minutes
    selectiveAttention: 0.7,
    dividedAttention: 0.5,
    attentionShifting: 0.6
  }
};

const adaptation = await agent.adaptConversation(
  profile,
  developmentalContext,
  { type: 'story_creation', engagementLevel: 0.8 }
);

console.log('Adapted Style:', adaptation.adaptedStyle);
console.log('Optimized Flow:', adaptation.optimizedFlow);
console.log('Attention Management:', adaptation.attentionManagement);
```

### Conversation Repair

```typescript
const repairResult = await agent.handleConversationRepair(
  "What? I don't understand what you mean.",
  "Let's create a character with temporal displacement abilities.",
  { userAge: 6, conversationHistory: [] }
);

if (repairResult.repairNeeded) {
  console.log('Repair Strategy:', repairResult.repairStrategy);
  console.log('Repair Prompt:', repairResult.repairPrompt);
  // Apply the repair strategy in your conversation flow
}
```

## Configuration Options

### OpenAI Configuration
- `apiKey`: OpenAI API key for language processing
- `model`: GPT model to use (recommended: gpt-4)
- `maxTokens`: Maximum tokens per API call

### Redis Configuration
- `url`: Redis connection URL for caching
- `keyPrefix`: Prefix for Redis keys
- `ttl`: Time-to-live for cached data (seconds)

### Developmental Psychology
- `enabled`: Enable developmental assessments
- `assessmentInterval`: Minutes between assessments
- `adaptationThreshold`: Confidence threshold for adaptations

### Cultural Context
- `enabled`: Enable cultural context analysis
- `supportedCultures`: List of supported culture codes
- `defaultCulture`: Default culture when detection fails

### Personalization
- `enabled`: Enable personalization features
- `learningRate`: Rate of profile updates (0-1)
- `memoryRetention`: Days to retain conversation history

## API Reference

### ConversationIntelligenceAgent

#### Methods

- `initialize()`: Initialize the agent and all services
- `shutdown()`: Gracefully shutdown the agent
- `analyzeConversation(input, context)`: Perform comprehensive conversation analysis
- `buildPersonalizationProfile(userId, history)`: Build or update user profile
- `adaptConversation(profile, context, conversation)`: Adapt conversation based on analysis
- `handleConversationRepair(input, response, context)`: Detect and handle repair needs
- `getHealthStatus()`: Get agent health and service status

### Types

Key types exported by the package:

- `ConversationAnalysis`: Complete conversation analysis results
- `MultiModalIntent`: Intent analysis with voice, emotion, and context
- `DevelopmentalAssessment`: Cognitive and developmental evaluation
- `PersonalizationProfile`: User's communication and learning profile
- `ConversationQuality`: Quality metrics for conversation assessment

## Integration with Router

```typescript
// In your Router implementation
import { ConversationIntelligenceAgent } from '@storytailor/conversation-intelligence';

class EnhancedRouter extends Router {
  private conversationIntelligence: ConversationIntelligenceAgent;

  async route(turnContext: TurnContext): Promise<CustomerResponse> {
    // Analyze conversation with intelligence agent
    const analysis = await this.conversationIntelligence.analyzeConversation(
      turnContext.userInput,
      {
        userId: turnContext.userId,
        conversationHistory: await this.getConversationHistory(turnContext),
        voiceData: turnContext.voiceData,
        userAge: turnContext.userProfile?.age,
      }
    );

    // Apply recommendations to routing decision
    const intent = this.enhanceIntentWithAnalysis(
      await this.intentClassifier.classifyIntent(turnContext),
      analysis
    );

    // Check for conversation repair needs
    const repairResult = await this.conversationIntelligence.handleConversationRepair(
      turnContext.userInput,
      turnContext.lastSystemResponse,
      { userAge: turnContext.userProfile?.age }
    );

    if (repairResult.repairNeeded) {
      return this.createRepairResponse(repairResult);
    }

    // Continue with enhanced routing...
    return super.route(turnContext);
  }
}
```

## Performance Considerations

- **Caching**: Personalization profiles are cached in Redis for 7 days
- **Batch Processing**: Multiple assessments can be performed in parallel
- **Fallback Strategies**: Graceful degradation when external services fail
- **Memory Management**: Conversation history is limited to last 50 interactions

## Privacy & Compliance

- **Data Minimization**: Only stores necessary conversation patterns
- **Anonymization**: Personal identifiers are hashed or removed
- **Retention Policies**: Automatic cleanup of expired data
- **COPPA Compliance**: Special handling for users under 13
- **GDPR Support**: Data export and deletion capabilities

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm test -- --testNamePattern="ConversationIntelligenceAgent"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
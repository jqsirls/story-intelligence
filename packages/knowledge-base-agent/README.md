# Knowledge Base Agent

The Knowledge Base Agent provides platform guidance, FAQ handling, and Story Intelligence™ education that complements the existing multi-agent conversation system without conflicts.

## Features

### 🧠 **Story Intelligence™ Knowledge Base**
- Brand education and messaging consistency
- SI vs AI terminology clarification
- New category positioning (story creation + off-screen activities)
- Licensing model explanation (like OpenAI with GPT)

### 📚 **Platform Knowledge Base**
- Feature guidance (story creation, character building, library management)
- User onboarding and help
- Contextual assistance based on conversation state
- Troubleshooting and support escalation

### ❓ **FAQ System**
- Comprehensive FAQ database with smart matching
- Category-based organization
- User type-specific responses
- Popularity tracking and optimization

### 🔗 **Integration with Existing Systems**
- Complements existing conversation router without conflicts
- Returns null for queries better handled by other agents
- Provides brand messaging for other agents to use
- Integrates with existing conversation state management

## Architecture

### Core Components

1. **KnowledgeBaseAgent** - Main orchestrator that integrates with existing router
2. **StoryIntelligenceKnowledgeBase** - Specialized SI brand and concept knowledge
3. **PlatformKnowledgeBase** - Platform features, FAQs, and user guidance

### Integration Strategy

The Knowledge Base Agent is designed to complement, not replace, existing conversation handling:

```typescript
// In existing conversation router
const knowledgeAgent = new KnowledgeBaseAgent(logger);

// Check if query should go to knowledge base
if (knowledgeAgent.canHandleQuery(userInput)) {
  const response = await knowledgeAgent.handleQuery({
    query: userInput,
    userId: user.id,
    context: conversationContext
  });
  
  if (response) {
    return response; // Knowledge base handled it
  }
}

// Otherwise, continue with existing routing logic
```

## Usage

### Basic Query Handling

```typescript
import { KnowledgeBaseAgent } from '@storytailor/knowledge-base-agent';

const agent = new KnowledgeBaseAgent(logger, {
  confidenceThreshold: 0.7,
  enableAutoEscalation: true,
  supportContactInfo: {
    email: 'support@storytailor.com'
  }
});

// Handle platform questions
const response = await agent.handleQuery({
  query: "What is Story Intelligence?",
  category: "story_intelligence",
  userId: "user-123"
});
```

### Contextual Help

```typescript
// Get help based on current state
const suggestions = await agent.getContextualHelp({
  sessionId: "session-123",
  userId: "user-123",
  currentFeature: "story_creation",
  conversationState: currentState
});
```

### Brand Consistency

```typescript
// Get SI branding for other agents
const siBranding = agent.getStoryIntelligenceBranding();
const siVsAI = agent.getSIvsAIMessaging();

// Use in other agent responses
const response = `This story is powered by ${siBranding.concept}...`;
```

## Knowledge Categories

### Story Intelligence™ Concepts
- **Brand Overview**: What SI is and how it works
- **SI vs AI**: Why we say "SI Powered" not "Story Intelligence™ powered"
- **New Category**: Story creation + off-screen activities
- **Platform Features**: How Storytailor® uses Story Intelligence™

### Platform Features
- **Story Creation**: Voice-driven narrative building with hero's journey
- **Character Creation**: Inclusive character design with AI art generation
- **Library Management**: Family story collections with privacy controls
- **Voice Interface**: Natural conversation across all platforms

### FAQ Topics
- Platform overview and benefits
- Age appropriateness and safety
- Privacy and data protection
- Quality standards and award-caliber content
- Relationship to traditional books and reading

## Support Escalation

The agent automatically escalates complex queries to human support:

```typescript
// Check pending escalations (for support dashboard)
const pending = agent.getPendingEscalations();

// Update escalation status
agent.updateEscalationStatus("esc-123", "resolved");
```

## Configuration

```typescript
interface KnowledgeBaseConfig {
  confidenceThreshold: number;     // Minimum confidence to return answer
  maxRelatedQuestions: number;     // Number of related questions to suggest
  enableAutoEscalation: boolean;   // Auto-escalate low confidence queries
  supportContactInfo: {
    email: string;
    chatUrl?: string;
    phoneNumber?: string;
  };
}
```

## Testing

```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run type-check         # TypeScript validation
```

## Integration Points

### With Existing Router
- Plugs into existing intent classification
- Returns null for non-knowledge queries
- Maintains conversation context

### With Personality Agent
- Uses consistent Story Intelligence™ messaging
- Maintains warm, whimsical tone
- Age-appropriate communication

### With Analytics
- Tracks query patterns and resolution rates
- Identifies knowledge gaps
- Measures user satisfaction

## Performance

- Sub-200ms response time for cached FAQs
- Confidence scoring for accurate routing
- Graceful degradation with fallback responses
- Minimal memory footprint

## Privacy & Compliance

- No storage of user queries beyond session
- COPPA-compliant contextual help
- Encrypted support escalation data
- Privacy-first design principles

---

**Note**: This agent is designed to fill the knowledge gap identified in the system audit while maintaining 100% compatibility with existing agents and conversation flows.
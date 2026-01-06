# InsightsAgent

The InsightsAgent is a comprehensive pattern analysis system that detects and analyzes user behavior patterns from emotional check-ins, story interactions, and reading habits. It provides actionable insights for personalized recommendations and parental notifications.

## Features

### Pattern Analysis (Task 10.1)
- **Emotional Pattern Detection**: Analyzes mood trends, emotional stability, and risk factors
- **Interest Identification**: Detects interests in sports, animals, science, art, music, technology, nature, adventure, fantasy, friendship, family, learning, and creativity
- **Behavioral Pattern Recognition**: Identifies social engagement, creativity expression, problem-solving skills, emotional regulation, attention patterns, communication style, conflict resolution, and empathy development
- **Story Preference Analysis**: Tracks preferences across different story types, themes, characters, and settings
- **Reading Habit Analysis**: Monitors session frequency, attention span, interaction style, and skill progression per sub-library

### External Recommendation Systems (Task 10.2)
- **Amazon Product Recommendations**: Suggests relevant products based on detected interests with price filtering and age appropriateness
- **Educational Resource Integration**: Connects to Khan Academy, NASA Kids, National Geographic, and other educational platforms
- **Library Resource Suggestions**: Recommends books and materials from curated library collections
- **Curated Activity Recommendations**: Provides hands-on activities and projects aligned with interests
- **Parental Notification System**: Sends privacy-compliant alerts about pattern discoveries and recommendations
- **Recommendation Scoring**: Uses relevance algorithms with confidence thresholds and filtering options

### Key Capabilities
- **Multi-dimensional Analysis**: Combines emotional, behavioral, and interaction data for comprehensive insights
- **Risk Factor Detection**: Identifies potential concerns like bullying, social isolation, anxiety, depression, and behavioral changes
- **Personalized Recommendations**: Generates story type and activity recommendations based on detected patterns
- **Privacy-Compliant**: Implements data retention policies and anonymization for COPPA/GDPR compliance
- **Real-time Caching**: Uses Redis for performance optimization with configurable TTL
- **Confidence Scoring**: Provides confidence levels for all analysis results

## Installation

```bash
npm install @alexa-multi-agent/insights-agent
```

## Configuration

```typescript
import { createInsightsConfig } from '@alexa-multi-agent/insights-agent';

const config = createInsightsConfig({
  database: {
    url: process.env.SUPABASE_URL,
    apiKey: process.env.SUPABASE_ANON_KEY
  },
  redis: {
    url: process.env.REDIS_URL,
    keyPrefix: 'insights'
  },
  analysis: {
    defaultTimeRange: 30, // days
    minDataPoints: 5,
    confidenceThreshold: 0.3
  },
  notifications: {
    enabled: true,
    riskFactorThreshold: 0.7
  }
});
```

## Usage

### Basic Pattern Analysis

```typescript
import { InsightsAgent } from '@alexa-multi-agent/insights-agent';

const insightsAgent = new InsightsAgent(config);
await insightsAgent.initialize();

// Comprehensive analysis for a user
const analysis = await insightsAgent.getComprehensiveAnalysis(
  'user-123',
  'library-456'
);

console.log(`Confidence: ${analysis.confidence}`);
console.log(`Emotional Patterns: ${analysis.emotionalPatterns.length}`);
console.log(`Interest Patterns: ${analysis.interestPatterns.length}`);
```

### Specific Analysis Request

```typescript
const request = {
  userId: 'user-123',
  libraryId: 'library-456',
  timeRange: {
    start: '2024-01-01T00:00:00Z',
    end: '2024-01-31T23:59:59Z'
  },
  analysisTypes: ['emotional', 'interests', 'behavioral']
};

const result = await insightsAgent.analyzePatterns(request);
```

### Library-Specific Analysis

```typescript
// Analyze reading habits for a specific sub-library
const libraryAnalysis = await insightsAgent.getLibraryAnalysis(
  'user-123',
  'child-library-789'
);

const habits = libraryAnalysis.readingHabits[0];
console.log(`Average session: ${habits.averageSessionDuration} minutes`);
console.log(`Attention span: ${habits.attentionSpan.averageMinutes} minutes`);
console.log(`Participation: ${habits.interactionStyle.participationLevel}`);
```

### External Recommendations

```typescript
// Generate external recommendations based on interests
const recommendations = await insightsAgent.generateExternalRecommendations(
  'user-123',
  specificAnalysis.interestPatterns,
  8, // Age 8
  {
    minRelevanceScore: 0.5,
    maxPrice: 50,
    categories: ['animals', 'science'],
    sources: ['amazon', 'educational_sites']
  }
);

console.log(`Generated ${recommendations.length} recommendations`);
```

### Parental Notifications

```typescript
// Send parental notification about pattern discoveries
await insightsAgent.sendParentalNotification(
  'user-123',
  'library-456',
  'interest_emergence',
  'New Interest Detected',
  'Your child is showing strong interest in science topics.',
  ['Increased engagement with science-themed stories'],
  ['Consider science experiment kits', 'Visit local science museum'],
  'info'
);
```

### Comprehensive Analysis with Recommendations

```typescript
// Get analysis and recommendations together
const fullAnalysis = await insightsAgent.getComprehensiveAnalysisWithRecommendations(
  'user-123',
  'library-456',
  undefined, // Use default time range
  { minRelevanceScore: 0.6 }
);

console.log(`Analysis confidence: ${fullAnalysis.analysis.confidence}`);
console.log(`Recommendations: ${fullAnalysis.recommendations.length}`);
```

## External Recommendation Sources

### Amazon Product Recommendations
- Age-appropriate toys, books, and educational materials
- Price filtering and relevance scoring
- Product ratings and review integration
- ASIN tracking for inventory management

### Educational Resources
- **Khan Academy Kids**: Interactive lessons and activities
- **NASA Kids Club**: Space science content and games
- **National Geographic Kids**: Animal facts and nature content
- **Scratch Programming**: Visual coding for children
- **CommonLit & ReadWorks**: Reading comprehension materials

### Library Resources
- Curated book recommendations by age and interest
- Classic and contemporary children's literature
- Educational series and activity books
- Reading level and genre classification

### Curated Activities
- Science experiments using household items
- Art and craft projects aligned with interests
- Nature exploration and outdoor activities
- Music and creative expression projects
- Physical activities and sports games

## Analysis Types

### Emotional Patterns
- Mood distribution and trends over time
- Emotional stability and recovery rates
- Risk factor detection (anxiety, depression, behavioral changes)
- Recommendations for story types and parental attention

### Interest Detection
- Keyword-based analysis across 13 categories
- Confidence scoring and strength assessment
- Examples from story content and character traits
- Interest emergence and evolution tracking

### Behavioral Patterns
- Social engagement through sharing and collaboration
- Creativity expression via story creation and editing
- Problem-solving through choice engagement and completion rates
- Emotional regulation and attention consistency
- Communication style and empathy development

### Story Preferences
- Preference levels: loves, likes, neutral, dislikes, avoids
- Theme, character, and setting affinity analysis
- Engagement scoring and completion rate tracking
- Personalized story recommendations

### Reading Habits
- Session frequency and duration patterns
- Time-of-day preferences and engagement levels
- Attention span analysis with variability tracking
- Interaction style assessment (passive to highly interactive)
- Skill progression in vocabulary, comprehension, creativity, and emotional intelligence

## Data Sources

The InsightsAgent analyzes data from multiple Supabase tables:
- `emotions`: Daily check-ins and real-time mood updates
- `stories`: Story content, themes, and character data
- `story_interactions`: User engagement and interaction patterns
- `characters`: Character traits and appearance data
- `libraries`: Library structure and permissions

## Privacy and Compliance

- **Data Retention**: Respects 30-day transcript deletion and 365-day emotion TTL
- **Anonymization**: Implements SHA-256 hashing for PII in logs
- **COPPA Compliance**: Enforces parental consent for under-13 users
- **GDPR Support**: Provides data export and deletion capabilities
- **Confidence Thresholds**: Filters low-confidence results to reduce false positives

## Risk Factor Detection

The system identifies concerning patterns and triggers parental notifications:

- **Emotional Risks**: Persistent sadness, elevated anger, anxiety indicators
- **Behavioral Risks**: Low completion rates, decreased engagement, social isolation
- **Social Risks**: Reduced sharing, limited collaborative activities
- **Attention Risks**: Declining focus, inconsistent session patterns

## Performance Optimization

- **Redis Caching**: 1-hour TTL for analysis results
- **Parallel Processing**: Concurrent analysis across different pattern types
- **Confidence Filtering**: Reduces processing of low-quality data
- **Incremental Analysis**: Supports time-range specific analysis

## Error Handling

- **Graceful Degradation**: Continues analysis even if some services fail
- **Confidence Adjustment**: Reduces confidence scores for partial failures
- **Logging**: Comprehensive error logging with correlation IDs
- **Retry Logic**: Implements exponential backoff for transient failures

## Testing

```bash
npm test
```

The test suite includes:
- Unit tests for all service classes
- Integration tests for database operations
- Mock implementations for external dependencies
- Pattern analysis validation tests

## Example Output

```typescript
{
  userId: "user-123",
  libraryId: "library-456",
  confidence: 0.85,
  emotionalPatterns: [
    {
      pattern: {
        dominantMood: "happy",
        moodDistribution: { happy: 0.7, neutral: 0.2, sad: 0.1 }
      },
      insights: ["Shows strong emotional resilience"],
      riskFactors: [],
      recommendations: [
        {
          type: "story_type",
          description: "Continue with adventure stories",
          priority: "medium"
        }
      ]
    }
  ],
  interestPatterns: [
    {
      category: "animals",
      strength: "strong",
      confidence: 0.8,
      keywords: ["dog", "cat", "horse", "zoo"],
      frequency: 15
    }
  ],
  behavioralPatterns: [
    {
      type: "social_engagement",
      severity: "normal",
      confidence: 0.7,
      description: "Shows moderate social engagement"
    }
  ]
}
```

## Contributing

1. Follow the existing code structure and patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure COPPA/GDPR compliance for new data processing
5. Maintain performance optimization standards

## License

This package is part of the Alexa Multi-Agent System and follows the project's licensing terms.
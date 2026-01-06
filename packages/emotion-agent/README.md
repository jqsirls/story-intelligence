# EmotionAgent

The EmotionAgent is a comprehensive mood tracking and emotional intelligence system designed for the Alexa Multi-Agent System. It provides daily emotional check-ins, real-time emotion detection, pattern analysis, and privacy-compliant parental reporting.

## Features

### 🎯 Daily Emotional Check-ins (Task 8.1)
- Once-daily check-in functionality with surface-level questions
- Mood capture system (happy, sad, scared, angry, neutral) with confidence scores
- "How was your day" tracking without providing solutions or diagnosis
- Emotion context storage with 365-day TTL and anonymization
- Scoped emotional data to specific sub-libraries for individual children

### ⚡ Real-time Emotion Updates (Task 8.2)
- Laughter detection during story creation sessions
- Emotion update system when positive signals are detected
- Mood improvement tracking and validation
- Emotion influence on story tone and recommendations

### 📊 Pattern Detection and Parental Reporting (Task 8.3)
- Emotion pattern analysis over time ranges per sub-library
- Parental reporting dashboard showing child's emotional trends
- Sentiment analysis for story interaction transcripts
- Mood-based story recommendation influence (cheer up, maintain happiness)
- Privacy-compliant emotional insights for parents

## Architecture

The EmotionAgent consists of three main services:

1. **DailyCheckinService** - Handles daily emotional check-ins
2. **EmotionDetectionService** - Real-time emotion detection and updates
3. **PatternAnalysisService** - Pattern analysis and parental reporting

## Installation

```bash
npm install @alexa-multi-agent/emotion-agent
```

## Configuration

```typescript
import { EmotionAgent } from '@alexa-multi-agent/emotion-agent';
import { createLogger } from 'winston';

const logger = createLogger({
  level: 'info',
  // ... logger configuration
});

const emotionAgent = new EmotionAgent({
  supabaseUrl: 'your-supabase-url',
  supabaseKey: 'your-supabase-key',
  redisUrl: 'redis://localhost:6379', // Optional
  logLevel: 'info'
}, logger);
```

## Usage Examples

### Daily Check-in

```typescript
const checkinResult = await emotionAgent.performDailyCheckin({
  userId: 'user-123',
  libraryId: 'lib-456',
  sessionId: 'session-789',
  responses: [
    {
      question: 'How are you feeling today?',
      answer: 'I feel really happy! I had a great day at school.'
    }
  ]
});

console.log('Mood:', checkinResult.emotion.mood);
console.log('Confidence:', checkinResult.emotion.confidence);
```

### Laughter Detection

```typescript
const laughterResult = await emotionAgent.detectLaughter({
  audioData: {
    buffer: audioBuffer,
    format: 'wav',
    sampleRate: 16000,
    duration: 2.1
  },
  userId: 'user-123',
  sessionId: 'session-789'
});

if (laughterResult.detected) {
  console.log('Laughter detected with confidence:', laughterResult.confidence);
}
```

### Emotion Pattern Analysis

```typescript
const patterns = await emotionAgent.analyzeEmotionPatterns({
  userId: 'user-123',
  libraryId: 'lib-456',
  timeRange: {
    start: '2024-01-01T00:00:00Z',
    end: '2024-01-07T23:59:59Z'
  }
});

console.log('Dominant mood:', patterns[0].dominantMood);
console.log('Mood distribution:', patterns[0].moodDistribution);
```

### Parental Report

```typescript
const report = await emotionAgent.generateParentalReport(
  'child-user-id',
  'library-id',
  {
    start: '2024-01-01T00:00:00Z',
    end: '2024-01-31T23:59:59Z'
  }
);

console.log('Emotional trends:', report.emotionalTrends);
console.log('Insights:', report.insights);
console.log('Recommendations:', report.recommendations);
```

### Story Recommendation Influence

```typescript
const influence = await emotionAgent.getStoryRecommendationInfluence('user-123');

console.log('Current mood:', influence.currentMood);
console.log('Recommended tone:', influence.recommendedTone);
console.log('Story types:', influence.storyTypes);
```

## API Reference

### EmotionAgent

#### Methods

- `performDailyCheckin(request: DailyCheckinRequest): Promise<DailyCheckinResult>`
- `detectLaughter(request: LaughterDetectionRequest): Promise<EmotionResult>`
- `updateEmotionalState(request: EmotionUpdateRequest): Promise<Emotion>`
- `analyzeEmotionPatterns(request: PatternAnalysisRequest): Promise<EmotionPattern[]>`
- `generateParentalReport(userId: string, libraryId: string, timeRange: DateRange): Promise<ParentalReport>`
- `analyzeSentiment(transcript: string): Promise<SentimentResult>`
- `getStoryRecommendationInfluence(userId: string, libraryId?: string): Promise<StoryRecommendationInfluence>`
- `getRecentEmotions(userId: string, libraryId?: string, limit?: number): Promise<Emotion[]>`
- `hasCompletedDailyCheckin(userId: string, libraryId?: string): Promise<boolean>`
- `cleanupExpiredData(): Promise<void>`
- `close(): Promise<void>`

### Types

#### DailyCheckinRequest
```typescript
interface DailyCheckinRequest {
  userId: string;
  libraryId?: string;
  sessionId?: string;
  responses: CheckinResponse[];
}
```

#### EmotionResult
```typescript
interface EmotionResult {
  detected: boolean;
  mood: Mood;
  confidence: number;
  timestamp: string;
}
```

#### ParentalReport
```typescript
interface ParentalReport {
  childId: string;
  libraryId: string;
  timeRange: DateRange;
  emotionalTrends: EmotionTrend[];
  insights: ParentalInsight[];
  recommendations: string[];
  privacyCompliant: boolean;
}
```

## Privacy and Compliance

The EmotionAgent is designed with privacy and compliance in mind:

- **COPPA Compliance**: Emotional data is scoped to sub-libraries for individual children
- **GDPR Compliance**: 365-day TTL with automatic anonymization
- **Data Minimization**: Only surface-level emotional data is collected
- **Audit Trail**: All operations are logged for compliance tracking
- **Parental Controls**: Privacy-compliant reporting for parents

## Database Schema

The EmotionAgent uses the following database tables:

### emotions
```sql
CREATE TABLE emotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  library_id UUID REFERENCES libraries,
  mood TEXT CHECK (mood IN ('happy', 'sad', 'scared', 'angry', 'neutral')) NOT NULL,
  confidence NUMERIC CHECK (confidence BETWEEN 0 AND 1) NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '365 days')
);
```

## Testing

Run the test suite:

```bash
npm test
```

Run the example:

```bash
npm run example
```

## Requirements Fulfilled

This implementation fulfills the following requirements from the Alexa Multi-Agent System specification:

- **Requirement 7.1**: Daily emotional check-ins with mood capture
- **Requirement 7.2**: Real-time emotion updates and laughter detection
- **Requirement 7.3**: Pattern detection and parental reporting
- **Requirement 7.4**: Story recommendation influence
- **Requirement 4.4**: COPPA/GDPR compliance with data retention

## Contributing

When contributing to the EmotionAgent:

1. Ensure all emotional data handling follows privacy guidelines
2. Maintain COPPA compliance for users under 13
3. Add appropriate tests for new functionality
4. Update documentation for API changes
5. Follow the established patterns for audit logging

## License

This package is part of the Alexa Multi-Agent System and follows the same licensing terms.
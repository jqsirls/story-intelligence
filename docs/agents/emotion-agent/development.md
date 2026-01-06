# Emotion Agent - Developer Documentation

**Status**: Draft  
**Audience**: Engineering  
**Last Updated**: 2025-12-13

## Technical Architecture

### Core Components

1. **EmotionAgent** (`packages/emotion-agent/src/EmotionAgent.ts`)
   - Main agent class
   - Coordinates all services
   - Public API interface

2. **DailyCheckinService** (`packages/emotion-agent/src/services/DailyCheckinService.ts`)
   - Daily emotional check-in handling
   - Mood capture and storage
   - TTL management

3. **EmotionDetectionService** (`packages/emotion-agent/src/services/EmotionDetectionService.ts`)
   - Real-time emotion detection
   - Laughter detection
   - Emotion updates

4. **PatternAnalysisService** (`packages/emotion-agent/src/services/PatternAnalysisService.ts`)
   - Pattern analysis over time
   - Sentiment analysis
   - Trend tracking

5. **Additional Services**:
   - `VoicePatternAnalyzer.ts` - Voice pattern analysis
   - `ResponseLatencyAnalyzer.ts` - Engagement analysis
   - `StoryChoicePatternAnalyzer.ts` - Choice pattern analysis
   - `LongitudinalTrendTracker.ts` - Long-term trend tracking
   - `EarlyInterventionDetector.ts` - Early intervention detection
   - `MoodBasedStoryRecommendationEngine.ts` - Story recommendations
   - `CrisisEscalationProtocol.ts` - Crisis handling

## API Reference

### Daily Check-in
```typescript
const result = await emotionAgent.performDailyCheckin({
  userId: 'user-123',
  libraryId: 'lib-456',
  sessionId: 'session-789',
  responses: [
    { question: 'How are you feeling?', answer: 'Happy!' }
  ]
});
```

### Laughter Detection
```typescript
const result = await emotionAgent.detectLaughter({
  audioData: {
    buffer: audioBuffer,
    format: 'wav',
    sampleRate: 16000,
    duration: 2.1
  },
  userId: 'user-123',
  sessionId: 'session-789'
});
```

### Pattern Analysis
```typescript
const patterns = await emotionAgent.analyzeEmotionPatterns({
  userId: 'user-123',
  libraryId: 'lib-456',
  timeRange: {
    start: '2024-01-01T00:00:00Z',
    end: '2024-01-31T23:59:59Z'
  }
});
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
```

**Code References:**
- `packages/emotion-agent/src/EmotionAgent.ts` - Complete API
- `packages/emotion-agent/README.md` - API documentation

## Configuration

### Environment Variables
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[REDACTED_SUPABASE_SERVICE_ROLE_KEY]
REDIS_URL=redis://...  # Optional
```

### Lambda Configuration
- **Runtime**: Node.js 22.x
- **Timeout**: 60 seconds
- **Memory**: 512 MB
- **Region**: us-east-1

## Testing

### Local Testing
```bash
cd packages/emotion-agent
npm test
npm run example
```

### Integration Testing
- Test against staging environment
- Verify daily check-in functionality
- Test pattern analysis

## Database Schema

### emotions Table
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

**Code References:**
- `packages/emotion-agent/README.md:210-222` - Database schema


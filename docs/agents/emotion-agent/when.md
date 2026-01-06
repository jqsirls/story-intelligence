# Emotion Agent - Usage Guidelines

**Status**: Draft  
**Audience**: Engineering | Product  
**Last Updated**: 2025-12-13

## When to Use This Agent

### Always Use Emotion Agent For:
1. **Daily Emotional Check-ins**: Once-daily check-ins with children
2. **Real-time Emotion Detection**: During story sessions and conversations
3. **Pattern Analysis**: Analyzing emotional trends over time
4. **Parental Reporting**: Generating privacy-compliant reports for parents
5. **Story Recommendations**: Mood-based story recommendations
6. **Early Intervention**: Detecting concerning emotional patterns

### Use Cases

#### Daily Check-in
**When**: Child completes daily check-in
**Emotion Agent Action**: Captures mood, stores with context, updates trends

#### Story Session
**When**: Child is creating or listening to a story
**Emotion Agent Action**: Detects laughter, updates emotional state, influences story tone

#### Parent Dashboard
**When**: Parent views emotional insights
**Emotion Agent Action**: Generates privacy-compliant report with trends and recommendations

#### Story Recommendation
**When**: System recommends stories
**Emotion Agent Action**: Provides mood-based recommendations (cheer up, maintain happiness)

## When NOT to Use It

### Direct Clinical Diagnosis
- **Not for Diagnosis**: Emotion Agent does not provide clinical diagnosis
- **Surface-Level Only**: Only captures surface-level emotional data
- **No Medical Advice**: Does not provide medical or therapeutic advice

## Integration Patterns

### Daily Check-in Integration
```typescript
const checkin = await emotionAgent.performDailyCheckin({
  userId: 'user-123',
  libraryId: 'lib-456',
  responses: [
    { question: 'How are you feeling?', answer: 'Happy!' }
  ]
});
```

### Real-time Detection
```typescript
const emotion = await emotionAgent.detectLaughter({
  audioData: audioBuffer,
  userId: 'user-123',
  sessionId: 'session-456'
});
```

### Pattern Analysis
```typescript
const patterns = await emotionAgent.analyzeEmotionPatterns({
  userId: 'user-123',
  libraryId: 'lib-456',
  timeRange: { start: '2024-01-01', end: '2024-01-31' }
});
```

## Timing Considerations

### Request Timing
- **Daily Check-in**: <500ms
- **Emotion Detection**: <300ms
- **Pattern Analysis**: <2000ms (depends on time range)
- **Parental Report**: <3000ms

### Rate Limits
- **Daily Check-in**: Once per day per user/library
- **Real-time Detection**: No limit (used during sessions)
- **Pattern Analysis**: No limit (cached for performance)

## Privacy Considerations

### Data Retention
- **TTL**: 365 days with automatic anonymization
- **Scope**: Scoped to sub-libraries for individual children
- **Anonymization**: Automatic after TTL expires

### Parental Access
- **Privacy Compliant**: Only aggregated, anonymized data
- **No Individual Data**: No individual emotional data shared
- **Trends Only**: Only trend data and recommendations

## Best Practices

1. **Respect Privacy**: Always scope data to sub-libraries
2. **No Diagnosis**: Never provide clinical diagnosis
3. **Early Intervention**: Use crisis escalation for concerning patterns
4. **Cache Results**: Cache pattern analysis for performance
5. **Respect TTL**: Honor 365-day TTL for data retention


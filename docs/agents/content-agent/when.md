# Content Agent - Usage Guidelines

**Status**: Draft  
**Audience**: Engineering | Product  
**Last Updated**: 2025-12-11

## When to Use This Agent

### Always Use Content Agent For:
1. **Story Creation**: All story creation requests
2. **Character Creation**: All character creation requests
3. **Content Moderation**: All content safety screening
4. **Asset Generation**: Image, audio, PDF, video generation
5. **Story Editing**: Voice-based story editing and adaptation

### Use Cases

#### Story Creation
**When**: User wants to create a story
**Content Agent Actions**:
- Classify story type
- Generate story using Hero's Journey
- Coordinate with Emotion, Personality, Child Safety agents
- Generate assets (images, audio)
- Save to Library Agent

#### Character Creation
**When**: User wants to create a character
**Content Agent Actions**:
- Initiate multi-turn character creation dialogue
- Collect character traits
- Coordinate with Accessibility, Child Safety agents
- Generate character assets
- Save to Library Agent

#### Content Moderation
**When**: Any content needs safety screening
**Content Agent Actions**:
- Screen content for safety
- Validate age-appropriateness
- Check for crisis indicators
- Provide alternative suggestions if needed

## When NOT to Use It

### Direct Library Access
**When**: User wants to view existing stories
**Use**: Library Agent directly (bypasses Content Agent)

### Emotional Check-Ins
**When**: User expresses emotions or needs support
**Use**: Emotion Agent directly (Content Agent may coordinate but Emotion Agent handles check-ins)

### Account Management
**When**: User wants to manage account or subscriptions
**Use**: Auth Agent or Commerce Agent (not Content Agent)

## Timing Considerations

### Story Generation Timing
- **Story Draft**: ~30-60 seconds
- **Asset Generation**: ~30-90 seconds
- **Total Time**: ~2-3 minutes per story

### Character Creation Timing
- **Character Dialogue**: ~20-40 seconds (multi-turn)
- **Character Assets**: ~30-60 seconds
- **Total Time**: ~1-2 minutes per character

### Content Moderation Timing
- **Moderation Check**: ~1-2 seconds
- **Crisis Detection**: ~2-5 seconds
- **Total Time**: ~3-7 seconds

## Best Practices

### 1. Always Coordinate with Safety Agents
```typescript
// Always screen content for safety
await childSafetyAgent.screenContent(content);

// Always validate age-appropriateness
await contentAgent.validateAgeAppropriate(content, userAge);
```

### 2. Use Emotional Context
```typescript
// Get emotional context before generating story
const emotionalContext = await emotionAgent.getEmotionalContext(userId);

// Adapt story to emotional state
const story = await contentAgent.createStory({
  ...request,
  emotionalContext,
});
```

### 3. Generate Assets Efficiently
```typescript
// Generate assets in parallel when possible
const assets = await Promise.all([
  generateImages(story),
  generateAudio(story),
  generatePDF(story),
]);
```

### 4. Handle Failures Gracefully
```typescript
// Retry asset generation on failure
try {
  const image = await generateImage(prompt);
} catch (error) {
  // Fall back to simpler image or retry
  const image = await generateImageFallback(prompt);
}
```

## Common Patterns

### Pattern 1: Simple Story Creation
```typescript
// User: "Create an adventure story"
const story = await contentAgent.createStory({
  characterId: 'char-123',
  storyType: 'ADVENTURE',
  userAge: 7,
});
```

### Pattern 2: Story with Emotional Adaptation
```typescript
// User: "Create a bedtime story" (child is anxious)
const emotionalContext = await emotionAgent.getEmotionalContext(userId);
const story = await contentAgent.createStory({
  characterId: 'char-123',
  storyType: 'BEDTIME',
  userAge: 5,
  emotionalContext, // Adapts story to calm anxious child
});
```

### Pattern 3: Character Creation with Inclusivity
```typescript
// User: "Create a character"
const character = await contentAgent.createCharacter({
  name: 'Luna',
  preferences: {
    inclusivity: true, // Ensures diverse, accessible character
  },
});
// Content Agent coordinates with Accessibility Agent automatically
```

## Anti-Patterns to Avoid

1. **Bypassing Safety Screening**: Always screen content for safety
2. **Ignoring Age**: Always consider user age for age-appropriateness
3. **Skipping Emotional Context**: Use emotional context for better stories
4. **Sequential Asset Generation**: Generate assets in parallel when possible
5. **Not Handling Failures**: Always handle asset generation failures gracefully

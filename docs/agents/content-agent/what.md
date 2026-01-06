# Content Agent - Detailed Functionality

**Status**: Draft  
**Audience**: Engineering | Product  
**Last Updated**: 2025-12-11

## Complete Feature List

### Story Type Classification
- OpenAI-powered classification into 11 story types
- Confidence scoring (0.0-1.0)
- Alternative type suggestions
- Clarification when confidence is low

**Code References:**
- `packages/content-agent/src/services/StoryTypeClassifier.ts` - Classification implementation

### Story Generation
- Hero's Journey structure (12 beats)
- Age-appropriate content (ages 3-12+)
- Interactive choose-your-adventure style
- Multi-turn story continuation
- Voice-based story editing

**Code References:**
- `packages/content-agent/src/services/StoryCreationService.ts:46-78` - Story draft creation
- `packages/content-agent/src/services/StoryCreationService.ts:83-103` - Story continuation

### Character Creation
- Multi-turn character creation dialogue
- Inclusive character design
- Character trait collection
- Character consistency management
- Character asset generation (illustration, voice, profile)

**Code References:**
- `packages/content-agent/src/services/CharacterGenerationService.ts` - Character creation
- `packages/content-agent/src/services/CharacterConsistencyManager.ts` - Consistency management

### Content Moderation
- OpenAI moderation API
- Custom child-safety filters
- Age-appropriate validation
- Story type consistency checks
- Crisis detection and intervention

**Code References:**
- `packages/content-agent/src/services/ContentModerator.ts` - Moderation implementation

### Asset Generation
- Image generation (DALL-E 3, gpt-image-1)
- Audio synthesis (AWS Polly, ElevenLabs)
- PDF generation
- Video generation (Sora-2, when available)
- Asset quality validation
- Failure handling and retry

**Code References:**
- `packages/content-agent/src/services/ArtGenerationService.ts` - Image generation
- `packages/content-agent/src/services/AssetGenerationPipeline.ts` - Asset pipeline

### Multi-Agent Coordination
- Coordinates with Emotion Agent for emotional context
- Coordinates with Personality Agent for brand voice
- Coordinates with Child Safety Agent for safety screening
- Coordinates with Localization Agent for language adaptation
- Coordinates with Accessibility Agent for inclusive design
- Coordinates with Library Agent for persistence

**Code References:**
- `docs/developer-docs/01_CORE_ARCHITECTURE/01_Multi_Agent_Orchestration_Flow.md:491-549` - Coordination patterns

## Capabilities

### Supported Story Types
1. Adventure
2. Bedtime
3. Birthday
4. Educational
5. Financial Literacy
6. Language Learning
7. Medical Bravery
8. Mental Health
9. Milestones
10. New Chapter Sequel
11. Tech Readiness

### Supported Age Groups
- Ages 3-4: Basic emotions, simple concepts
- Ages 5-6: Basic emotional complexity
- Ages 7-8: Nuanced emotional themes
- Ages 9+: Complex narratives, advanced themes

### Asset Types
- Illustrations (2-5 per story, depending on tier)
- Audio narration (AWS Polly or ElevenLabs)
- PDF story books
- Video animations (premium feature)

## Limitations

1. **Model Dependency**: Requires OpenAI API access
2. **Asset Generation Time**: Image/audio generation can take 30-60 seconds
3. **Story Length**: Stories are structured in 12-beat Hero's Journey format
4. **Language Support**: Primary language is English, localization via Localization Agent

## Technical Specifications

### Performance
- **Story Generation Time**: ~30-60 seconds
- **Character Creation Time**: ~20-40 seconds
- **Asset Generation Time**: ~30-90 seconds (depends on asset types)
- **Total Story Creation Time**: ~2-3 minutes (with assets)

### Scalability
- **Concurrent Stories**: Handles multiple concurrent story generations
- **Asset Generation**: Parallel asset generation for faster completion
- **Caching**: Caches story templates and character profiles

### Reliability
- **Retry Logic**: Automatic retry for failed asset generation
- **Fallback Assets**: Falls back to simpler assets on failure
- **Error Handling**: Comprehensive error handling and logging

## Data Models

### Story
```typescript
interface Story {
  id: string;
  characterId: string;
  storyType: StoryType;
  beats: StoryBeat[];
  choices: StoryChoice[];
  assets: Asset[];
  metadata: StoryMetadata;
}
```

### Character
```typescript
interface Character {
  id: string;
  name: string;
  traits: CharacterTrait[];
  appearance: AppearanceDescription;
  voice: VoiceProfile;
  assets: CharacterAsset[];
}
```

**Code References:**
- `packages/content-agent/src/types.ts` - Type definitions

## Request/Response Schemas

### Create Story Request
```typescript
{
  characterId: string;
  storyType: StoryType;
  userAge?: number;
  preferences?: {
    mood?: StoryMood;
    themes?: string[];
  };
}
```

### Create Story Response
```typescript
{
  story: Story;
  character: Character;
  assets: GeneratedAssets;
  success: boolean;
}
```

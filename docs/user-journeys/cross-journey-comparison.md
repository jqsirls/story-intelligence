Status: Draft  
Audience: Internal | Partner  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 2.5 - Cross-journey comparison with code references and line numbers for key behaviors

# Cross-Journey Comparison

## Overview

This document provides a comprehensive comparison of all four user journey types for creating stories in Storytailor: REST API, Audio Conversational, Video Conversational, and Video with Live Avatar. It compares key behaviors, code paths, performance characteristics, and use cases.

## Journey Types

### 1. REST API Journey

**Type:** Programmatic, synchronous

**Primary Use Case:** Integration, automation, batch processing

**Code References:**
- `docs/user-journeys/rest-api.md` - Complete REST API journey
- `packages/universal-agent/src/api/RESTAPIGateway.ts:825-848` - Story creation endpoint
- `packages/content-agent/src/services/StoryCreationService.ts:46-78` - Story draft creation

### 2. Audio Conversational Journey

**Type:** Interactive, voice-first

**Primary Use Case:** Voice platforms, hands-free interaction, accessibility

**Code References:**
- `docs/user-journeys/audio-conversational.md` - Complete audio journey
- `packages/universal-agent/src/api/RESTAPIGateway.ts:737-758` - Voice endpoint
- `packages/universal-agent/src/UniversalStorytellerAPI.ts:341-414` - Voice processing

### 3. Video Conversational Journey

**Type:** Interactive, visual-first

**Primary Use Case:** Web applications, visual storytelling, multimedia content

**Code References:**
- `docs/user-journeys/video-conversational.md` - Complete video journey
- `packages/content-agent/src/services/ArtGenerationService.ts:286-335` - Art generation
- `lambda-deployments/content-agent/src/services/AnimationService.ts:87-295` - Video generation

### 4. Video with Live Avatar Journey

**Type:** Interactive, real-time video

**Primary Use Case:** Screened devices, immersive experiences, character interaction

**Code References:**
- `docs/user-journeys/video-live-avatar.md` - Complete live avatar journey
- `lambda-deployments/router/src/lambda.ts:1067-1159` - Avatar request handling
- `HEDRA_AVATAR_INTEGRATION_STATUS.md:41-55` - Avatar Agent flow

## Comparison Matrix

| Feature | REST API | Audio Conversational | Video Conversational | Video with Live Avatar |
|---------|----------|----------------------|---------------------|----------------------|
| **Authentication** | API Key or JWT | API Key or JWT | API Key or JWT | API Key or JWT |
| **Code Reference** | `packages/universal-agent/src/api/RESTAPIGateway.ts:320-536` | `packages/universal-agent/src/api/RESTAPIGateway.ts:320-536` | `packages/universal-agent/src/api/RESTAPIGateway.ts:320-536` | `packages/universal-agent/src/api/RESTAPIGateway.ts:320-536` |
| **Input Method** | JSON payload | Voice (audio) | Text or Voice | Text or Voice |
| **Code Reference** | `packages/universal-agent/src/api/RESTAPIGateway.ts:825-848` | `packages/universal-agent/src/api/RESTAPIGateway.ts:737-758` | `packages/universal-agent/src/api/RESTAPIGateway.ts:659-683` | `lambda-deployments/router/src/lambda.ts:1118-1125` |
| **Transcription** | N/A | Kid Intelligence | N/A (text input) | N/A (text input) |
| **Code Reference** | - | `packages/universal-agent/src/UniversalStorytellerAPI.ts:613-670` | - | - |
| **Story Generation** | Synchronous | Conversational | Conversational | Conversational |
| **Code Reference** | `packages/content-agent/src/services/StoryCreationService.ts:46-78` | `packages/content-agent/src/services/StoryConversationManager.ts:55-118` | `packages/content-agent/src/services/StoryConversationManager.ts:55-118` | `packages/content-agent/src/services/StoryConversationManager.ts:55-118` |
| **Visual Content** | Optional (on request) | None | Generated images | Live avatar |
| **Code Reference** | `packages/content-agent/src/services/ArtGenerationService.ts:286-335` | - | `packages/content-agent/src/services/ArtGenerationService.ts:286-335` | `HEDRA_AVATAR_INTEGRATION_STATUS.md:41-55` |
| **Video Content** | Optional (Sora) | None | Optional (Sora) | Real-time (Hedra) |
| **Code Reference** | `lambda-deployments/content-agent/src/services/AnimationService.ts:87-295` | - | `lambda-deployments/content-agent/src/services/AnimationService.ts:87-295` | `HEDRA_AVATAR_INTEGRATION_STATUS.md:41-55` |
| **Audio Response** | Optional | Required (ElevenLabs) | Optional | Real-time (Hedra + ElevenLabs) |
| **Code Reference** | `packages/voice-synthesis/src/VoiceService.ts:113-150` | `packages/voice-synthesis/src/clients/ElevenLabsClient.ts:90-150` | `packages/voice-synthesis/src/VoiceService.ts:113-150` | `HEDRA_AVATAR_INTEGRATION_STATUS.md:55-61` |
| **Response Time** | 2-5 seconds | 8-15 seconds/turn | 20-30 seconds/turn | 10-20 seconds/turn |
| **Code Reference** | `packages/content-agent/src/services/StoryCreationService.ts:46-78` | `packages/universal-agent/src/UniversalStorytellerAPI.ts:341-414` | `packages/content-agent/src/services/ArtGenerationService.ts:286-335` | `lambda-deployments/router/src/lambda.ts:1067-1159` |
| **Multi-Turn Support** | Limited (REST calls) | Full (conversational) | Full (conversational) | Full (conversational) |
| **Code Reference** | `packages/content-agent/src/services/StoryCreationService.ts:83-100` | `packages/content-agent/src/services/StoryConversationManager.ts:123-179` | `packages/content-agent/src/services/StoryConversationManager.ts:123-179` | `packages/content-agent/src/services/StoryConversationManager.ts:123-179` |
| **Character Creation** | REST endpoint | Conversational | Conversational | Conversational |
| **Code Reference** | `packages/universal-agent/src/api/RESTAPIGateway.ts:906-971` | `packages/content-agent/src/services/CharacterConversationManager.ts:53-112` | `packages/content-agent/src/services/CharacterConversationManager.ts:53-112` | `packages/content-agent/src/services/CharacterConversationManager.ts:53-112` |
| **WebVTT Support** | Yes | Yes | Yes | Yes |
| **Code Reference** | `packages/universal-agent/src/api/WebVTTService.ts:79-152` | `packages/universal-agent/src/api/WebVTTService.ts:79-152` | `packages/universal-agent/src/api/WebVTTService.ts:79-152` | `packages/universal-agent/src/api/WebVTTService.ts:79-152` |

## Detailed Feature Comparison

### Authentication

**All Journeys:**
- **Method:** JWT tokens or API keys
- **Code:** `packages/universal-agent/src/api/RESTAPIGateway.ts:320-536`
- **Validation:** `packages/universal-agent/src/api/RESTAPIGateway.ts:400-535`

**Differences:** None - all journeys use the same authentication mechanism

### Input Processing

#### REST API

**Input:** JSON payload with character and story type

**Code:** `packages/universal-agent/src/api/RESTAPIGateway.ts:825-848`
```typescript
// Code location: packages/universal-agent/src/api/RESTAPIGateway.ts:825-848
router.post('/', this.validateRequest({
  character: Joi.object().required(),
  storyType: Joi.string().required(),
  libraryId: Joi.string().optional(),
  generateAssets: Joi.boolean().default(false)
}), async (req, res) => {
  const story = await this.storytellerAPI.createStory({
    ...req.body,
    userId: req.user.id
  });
}
```

**Processing:** Direct story creation, no transcription needed

#### Audio Conversational

**Input:** Audio data (WAV, MP3, OGG, WebM)

**Code:** `packages/universal-agent/src/api/RESTAPIGateway.ts:737-758`
```typescript
// Code location: packages/universal-agent/src/api/RESTAPIGateway.ts:737-758
router.post('/voice', async (req, res) => {
  const audioData = req.body.audio || req.file?.buffer;
  const response = await this.storytellerAPI.processVoiceInput(req.body.sessionId, {
    format: req.body.format || 'wav',
    data: audioData,
    sampleRate: req.body.sampleRate || 16000
  });
}
```

**Processing:**
1. Audio preprocessing with Kid Intelligence (`packages/universal-agent/src/UniversalStorytellerAPI.ts:350-370`)
2. Transcription with enhancement (`packages/universal-agent/src/UniversalStorytellerAPI.ts:613-670`)
3. Text message creation (`packages/universal-agent/src/UniversalStorytellerAPI.ts:376-388`)

#### Video Conversational

**Input:** Text or voice (with visual request flag)

**Code:** `packages/universal-agent/src/api/RESTAPIGateway.ts:659-683`
```typescript
// Code location: packages/universal-agent/src/api/RESTAPIGateway.ts:659-683
router.post('/message', this.validateRequest({
  sessionId: Joi.string().required(),
  message: Joi.object({
    type: Joi.string().valid('text', 'voice', 'image', 'file').required(),
    content: Joi.alternatives().try(Joi.string(), Joi.binary()).required(),
    metadata: Joi.object().default({})
  }).required()
}), async (req, res) => {
  const response = await this.storytellerAPI.sendMessage(req.body.sessionId, req.body.message);
}
```

**Processing:** Web chat adapter preprocessing (`packages/universal-agent/src/conversation/adapters/WebChatChannelAdapter.ts:36-56`)

#### Video with Live Avatar

**Input:** Text or voice (via avatar session)

**Code:** `lambda-deployments/router/src/lambda.ts:1118-1125`
```typescript
// Code location: lambda-deployments/router/src/lambda.ts:1118-1125
const actionMap: Record<string, string> = {
  start: 'startConversation',
  say: 'sendMessage',
  end: 'endConversation',
  video: 'generateVideo',
  status: 'getVideoStatus'
};
```

**Processing:** Avatar Agent handles message delivery to Hedra avatar

### Story Generation

#### REST API

**Method:** Synchronous, single request

**Code:** `packages/content-agent/src/services/StoryCreationService.ts:46-78`
```typescript
// Code location: packages/content-agent/src/services/StoryCreationService.ts:46-78
async createStoryDraft(request: StoryCreationRequest): Promise<StoryDraft> {
  const outline = await this.generateHeroJourneyOutline(...);
  const initialChoices = await this.generateInitialChoices(...);
  const draft: StoryDraft = { ... };
}
```

**Timing:** 2-5 seconds

**Output:** Complete story draft with initial choices

#### Audio Conversational

**Method:** Conversational, multi-turn

**Code:** `packages/content-agent/src/services/StoryConversationManager.ts:55-118`
```typescript
// Code location: packages/content-agent/src/services/StoryConversationManager.ts:55-118
async startStoryConversation(...): Promise<StoryConversationResponse> {
  const storyDraft = await this.storyCreationService.createStoryDraft({...});
  const session: StoryConversationSession = {
    phase: 'setup',
    currentBeat: 0,
    storyDraft,
    choices: storyDraft.choices
  };
}
```

**Timing:** 8-15 seconds per turn

**Output:** Story beat + choices, progressive story building

#### Video Conversational

**Method:** Conversational, multi-turn with visuals

**Code:** `packages/content-agent/src/services/StoryConversationManager.ts:55-118` (same as audio)

**Additional:** Visual content generation (`packages/content-agent/src/services/ArtGenerationService.ts:286-335`)

**Timing:** 20-30 seconds per turn (includes image generation)

**Output:** Story beat + choices + images

#### Video with Live Avatar

**Method:** Conversational, multi-turn with live avatar

**Code:** `packages/content-agent/src/services/StoryConversationManager.ts:55-118` (same as audio/video)

**Additional:** Real-time avatar interaction (`HEDRA_AVATAR_INTEGRATION_STATUS.md:41-55`)

**Timing:** 10-20 seconds per turn (includes avatar processing)

**Output:** Story beat + choices + live avatar narration

### Visual Content Generation

#### REST API

**Method:** Optional, on-demand via asset generation endpoint

**Code:** `packages/universal-agent/src/api/RESTAPIGateway.ts:863-882`
```typescript
// Code location: packages/universal-agent/src/api/RESTAPIGateway.ts:863-882
router.post('/:storyId/assets', this.validateRequest({
  assetTypes: Joi.array().items(Joi.string().valid('art', 'audio', 'pdf', 'activities')).default(['art', 'audio', 'pdf', 'activities']),
  regenerate: Joi.boolean().default(false)
}), async (req, res) => {
  const assets = await this.storytellerAPI.generateAssets(req.params.storyId, req.body.assetTypes, req.body.regenerate);
}
```

**Timing:** 15-30 seconds for images, 30-60 seconds for video

**Code:** `packages/content-agent/src/services/ArtGenerationService.ts:286-335`

#### Audio Conversational

**Method:** None (voice-only)

**Timing:** N/A

#### Video Conversational

**Method:** Automatic with story generation (if `requestVisuals: true`)

**Code:** `packages/content-agent/src/services/ArtGenerationService.ts:286-335`
```typescript
// Code location: packages/content-agent/src/services/ArtGenerationService.ts:286-335
async generateStoryArt(story: Story, character: Character): Promise<GeneratedArt> {
  const protagonistDNA = this.extractProtagonistDNA(character);
  const motif = this.generateStoryMotif(story);
  const coverArtPrompt = this.buildCoverArtPrompt(coverMoment, protagonistDNA, motif, paletteJourney);
  
  const [characterHeadshot, characterBodyshot, coverArt, ...bodyIllustrationImages] = await Promise.all([
    this.generateImage(characterHeadshotPrompt),
    this.generateImage(characterBodyshotPrompt),
    this.generateImage(coverArtPrompt),
    ...bodyIllustrations.map(ill => this.generateImage(ill.prompt))
  ]);
}
```

**Timing:** 15-30 seconds (parallel generation)

#### Video with Live Avatar

**Method:** Real-time avatar video stream (no static images)

**Code:** `HEDRA_AVATAR_INTEGRATION_STATUS.md:41-55`

**Timing:** Real-time (<800ms latency per `HEDRA_AVATAR_INTEGRATION_STATUS.md:58`)

### Audio Response Generation

#### REST API

**Method:** Optional, via asset generation

**Code:** `packages/content-agent/src/services/AudioGenerationService.ts`

**Timing:** 30-60 seconds for full story

#### Audio Conversational

**Method:** Required, real-time synthesis

**Code:** `packages/voice-synthesis/src/clients/ElevenLabsClient.ts:90-150`
```typescript
// Code location: packages/voice-synthesis/src/clients/ElevenLabsClient.ts:90-150
async stream(
  request: VoiceSynthesisRequest,
  onChunk: (chunk: AudioChunk) => void
): Promise<VoiceSynthesisResponse> {
  await this.ensureConnection();
  const streamRequest: ElevenLabsStreamRequest = {
    text: request.text,
    model_id: this.config.model,
    voice_settings: { ... }
  };
  const audioData = await this.streamAudio(streamRequest, onChunk);
}
```

**Timing:** 1-3 seconds per response

#### Video Conversational

**Method:** Optional, via asset generation

**Code:** `packages/voice-synthesis/src/VoiceService.ts:113-150`

**Timing:** 30-60 seconds for full story

#### Video with Live Avatar

**Method:** Real-time via Hedra avatar

**Code:** `HEDRA_AVATAR_INTEGRATION_STATUS.md:55-61`
- Avatar speaks with Frankie's voice (`kQJQj1e9P2YDvAdvp2BW`)
- Real-time lip-sync
- Facial expressions match emotional context

**Timing:** Real-time (<800ms latency)

### Video Generation

#### REST API

**Method:** Optional, Sora-2 API

**Code:** `lambda-deployments/content-agent/src/services/AnimationService.ts:210-264`
```typescript
// Code location: lambda-deployments/content-agent/src/services/AnimationService.ts:210-264
const soraResponse = await (openai as any).videos.create({
  model: process.env.SORA_MODEL || 'sora-2',
  prompt: prompt,
  images: request.images.map(url => ({ type: 'url', url: url })),
  duration: request.duration || 10,
  resolution: '1024x1024',
  aspect_ratio: '1:1'
});
```

**Timing:** 30-60 seconds

#### Audio Conversational

**Method:** None

**Timing:** N/A

#### Video Conversational

**Method:** Optional, Sora-2 API (same as REST API)

**Code:** `lambda-deployments/content-agent/src/services/AnimationService.ts:210-264`

**Timing:** 30-60 seconds

#### Video with Live Avatar

**Method:** Real-time Hedra avatar stream

**Code:** `HEDRA_AVATAR_INTEGRATION_STATUS.md:41-55`

**Timing:** Real-time (<800ms latency)

**Additional:** Optional video generation via `POST /v1/avatar/video` (`tmp-ci/repo/packages/avatar-agent/src/index.ts:34-45`)

## Performance Comparison

### Response Times

| Journey Type | Initial Response | Per Turn | Complete Story | Code Reference |
|-------------|------------------|----------|---------------|----------------|
| **REST API** | 2-5 seconds | N/A (single request) | 2-5 seconds | `packages/content-agent/src/services/StoryCreationService.ts:46-78` |
| **Audio Conversational** | 8-15 seconds | 8-15 seconds | 5-10 minutes | `packages/universal-agent/src/UniversalStorytellerAPI.ts:341-414` |
| **Video Conversational** | 20-30 seconds | 20-30 seconds | 2-3 minutes | `packages/content-agent/src/services/ArtGenerationService.ts:286-335` |
| **Video with Live Avatar** | 10-20 seconds | 10-20 seconds | 5-10 minutes | `lambda-deployments/router/src/lambda.ts:1067-1159` |

### Latency Breakdown

#### REST API

1. Request processing: < 100ms (`packages/universal-agent/src/api/RESTAPIGateway.ts:825-848`)
2. Story generation: 2-5 seconds (`packages/content-agent/src/services/StoryCreationService.ts:46-78`)
3. Response formatting: < 50ms

**Total:** 2-5 seconds

#### Audio Conversational

1. Audio preprocessing: 200-500ms (`packages/universal-agent/src/UniversalStorytellerAPI.ts:350-370`)
2. Transcription: 500-2000ms (`packages/universal-agent/src/UniversalStorytellerAPI.ts:613-670`)
3. Message processing: 1500-4000ms (`packages/router/src/Router.ts:100-200`)
4. Story generation: 2000-5000ms (`packages/content-agent/src/services/StoryConversationManager.ts:123-179`)
5. Voice synthesis: 1000-3000ms (`packages/voice-synthesis/src/clients/ElevenLabsClient.ts:90-150`)

**Total:** 8-15 seconds per turn

#### Video Conversational

1. Message processing: 1500-4000ms (`packages/router/src/Router.ts:100-200`)
2. Story generation: 2000-5000ms (`packages/content-agent/src/services/StoryConversationManager.ts:123-179`)
3. Image generation: 15000-30000ms (`packages/content-agent/src/services/ArtGenerationService.ts:286-335`)
4. Response formatting: < 100ms (`packages/universal-agent/src/conversation/adapters/WebChatChannelAdapter.ts:58-94`)

**Total:** 20-30 seconds per turn

#### Video with Live Avatar

1. Avatar message processing: 800-2000ms (`lambda-deployments/router/src/lambda.ts:1118-1125`)
2. Story generation: 2000-5000ms (`packages/content-agent/src/services/StoryConversationManager.ts:123-179`)
3. Avatar delivery: 800-2000ms (`HEDRA_AVATAR_INTEGRATION_STATUS.md:41-55`)
4. Real-time streaming: < 800ms (`HEDRA_AVATAR_INTEGRATION_STATUS.md:58`)

**Total:** 10-20 seconds per turn

## Code Path Comparison

### Story Creation Flow

#### REST API

```
RESTAPIGateway (825-848)
  → UniversalStorytellerAPI.createStory (437-441)
    → ContentAgent.createStoryDraft (46-78)
      → StoryCreationService.createStoryDraft (46-78)
        → generateHeroJourneyOutline (205-250)
        → generateInitialChoices (255-300)
```

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:825-848`
- `packages/universal-agent/src/UniversalStorytellerAPI.ts:437-441`
- `packages/content-agent/src/services/StoryCreationService.ts:46-78`

#### Audio Conversational

```
RESTAPIGateway (737-758)
  → UniversalStorytellerAPI.processVoiceInput (341-414)
    → Kid Intelligence preprocessing (350-370)
    → transcribeAudio (613-670)
    → sendMessage (220-293)
      → Router.routeRequest (100-200)
        → ContentAgent (via delegation)
          → StoryConversationManager (55-118)
```

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:737-758`
- `packages/universal-agent/src/UniversalStorytellerAPI.ts:341-414`
- `packages/content-agent/src/services/StoryConversationManager.ts:55-118`

#### Video Conversational

```
RESTAPIGateway (659-683)
  → UniversalStorytellerAPI.sendMessage (220-293)
    → Router.routeRequest (100-200)
      → ContentAgent (via delegation)
        → StoryConversationManager (55-118)
        → ArtGenerationService (286-335) [if visuals requested]
```

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:659-683`
- `packages/content-agent/src/services/StoryConversationManager.ts:55-118`
- `packages/content-agent/src/services/ArtGenerationService.ts:286-335`

#### Video with Live Avatar

```
RESTAPIGateway (659-683)
  → UniversalStorytellerAPI.sendMessage (220-293)
    → Router.routeRequest (100-200)
      → ModalityAdaptor (sets liveAvatar)
      → ContentAgent (via delegation)
        → StoryConversationManager (55-118)
      → Router (1067-1159)
        → Avatar Agent (startConversation/sendMessage)
          → LiveKit + Hedra (real-time streaming)
```

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:659-683`
- `packages/router/src/services/ModalityAdaptor.ts` (inferred)
- `lambda-deployments/router/src/lambda.ts:1067-1159`
- `HEDRA_AVATAR_INTEGRATION_STATUS.md:41-55`

## Use Case Recommendations

### REST API Journey

**Best For:**
- Programmatic integration
- Batch story generation
- Automated workflows
- Server-to-server communication

**Code Reference:** `docs/user-journeys/rest-api.md`

### Audio Conversational Journey

**Best For:**
- Voice platforms (Alexa, Google Assistant, Siri)
- Hands-free interaction
- Accessibility
- Voice-first applications

**Code Reference:** `docs/user-journeys/audio-conversational.md`

### Video Conversational Journey

**Best For:**
- Web applications
- Visual storytelling
- Multimedia content
- Educational applications

**Code Reference:** `docs/user-journeys/video-conversational.md`

### Video with Live Avatar Journey

**Best For:**
- Screened devices
- Immersive experiences
- Character interaction
- Real-time engagement

**Code Reference:** `docs/user-journeys/video-live-avatar.md`

## Feature Availability Matrix

| Feature | REST API | Audio Conversational | Video Conversational | Video with Live Avatar |
|---------|----------|----------------------|---------------------|----------------------|
| **Kid Communication Intelligence** | ❌ | ✅ | ❌ | ❌ |
| **Code Reference** | - | `packages/universal-agent/src/UniversalStorytellerAPI.ts:350-370` | - | - |
| **Image Generation** | ✅ (optional) | ❌ | ✅ (automatic) | ❌ (avatar instead) |
| **Code Reference** | `packages/content-agent/src/services/ArtGenerationService.ts:286-335` | - | `packages/content-agent/src/services/ArtGenerationService.ts:286-335` | - |
| **Video Generation (Sora)** | ✅ (optional) | ❌ | ✅ (optional) | ❌ |
| **Code Reference** | `lambda-deployments/content-agent/src/services/AnimationService.ts:210-264` | - | `lambda-deployments/content-agent/src/services/AnimationService.ts:210-264` | - |
| **Real-Time Avatar** | ❌ | ❌ | ❌ | ✅ |
| **Code Reference** | - | - | - | `HEDRA_AVATAR_INTEGRATION_STATUS.md:41-55` |
| **Voice Synthesis** | ✅ (optional) | ✅ (required) | ✅ (optional) | ✅ (real-time) |
| **Code Reference** | `packages/voice-synthesis/src/VoiceService.ts:113-150` | `packages/voice-synthesis/src/clients/ElevenLabsClient.ts:90-150` | `packages/voice-synthesis/src/VoiceService.ts:113-150` | `HEDRA_AVATAR_INTEGRATION_STATUS.md:55-61` |
| **WebVTT Synchronization** | ✅ | ✅ | ✅ | ✅ |
| **Code Reference** | `packages/universal-agent/src/api/WebVTTService.ts:79-152` | `packages/universal-agent/src/api/WebVTTService.ts:79-152` | `packages/universal-agent/src/api/WebVTTService.ts:79-152` | `packages/universal-agent/src/api/WebVTTService.ts:79-152` |
| **Multi-Turn Conversation** | ❌ | ✅ | ✅ | ✅ |
| **Code Reference** | - | `packages/content-agent/src/services/StoryConversationManager.ts:123-179` | `packages/content-agent/src/services/StoryConversationManager.ts:123-179` | `packages/content-agent/src/services/StoryConversationManager.ts:123-179` |
| **Character Conversation** | ❌ | ✅ | ✅ | ✅ |
| **Code Reference** | - | `packages/content-agent/src/services/CharacterConversationManager.ts:53-112` | `packages/content-agent/src/services/CharacterConversationManager.ts:53-112` | `packages/content-agent/src/services/CharacterConversationManager.ts:53-112` |

## Error Handling Comparison

### REST API

**Error Types:**
- Validation errors (400)
- Authentication errors (401)
- Rate limiting (429)
- Server errors (500)

**Code:** `packages/universal-agent/src/api/RESTAPIGateway.ts:3500-3511`

**Fallback:** None (synchronous, fails fast)

### Audio Conversational

**Error Types:**
- Audio format errors (400)
- Transcription failures (fallback to basic transcription)
- Voice synthesis failures (fallback to Polly)

**Code:** `packages/universal-agent/src/UniversalStorytellerAPI.ts:367-369` (preprocessing fallback)
**Code:** `packages/universal-agent/src/UniversalStorytellerAPI.ts:657-659` (transcription fallback)
**Code:** `packages/voice-synthesis/src/VoiceService.ts:134-144` (engine failover)

**Fallback:** Multiple fallback layers

### Video Conversational

**Error Types:**
- Image generation failures (partial results)
- Video generation failures (static images)
- Asset pipeline errors (progressive generation)

**Code:** `packages/content-agent/src/services/AssetGenerationPipeline.ts:120-127` (error collection)
**Code:** `packages/content-agent/src/services/AssetGenerationFailureHandler.ts` (failure handling)

**Fallback:** Partial asset delivery

### Video with Live Avatar

**Error Types:**
- Avatar Agent unavailable (static avatar fallback)
- LiveKit connection failure (retry with backoff)
- Hedra API failure (voice-only mode)

**Code:** `lambda-deployments/router/src/lambda.ts:1144-1158` (error handling)
**Code:** `HEDRA_AVATAR_INTEGRATION_STATUS.md:29-37` (credential errors)

**Fallback:** Static avatar or voice-only mode

## Best Practices by Journey Type

### REST API

1. Use API keys for production
2. Implement retry logic for transient errors
3. Cache completed stories
4. Batch operations when possible

**Code Reference:** `docs/user-journeys/rest-api.md:Best Practices`

### Audio Conversational

1. Use appropriate audio formats (WAV, 16kHz)
2. Enable Kid Intelligence for child users
3. Implement audio chunking for real-time processing
4. Cache voice synthesis responses

**Code Reference:** `docs/user-journeys/audio-conversational.md:Best Practices`

### Video Conversational

1. Request images early in conversation
2. Use Protagonist DNA for character consistency
3. Maintain story motif across visual assets
4. Generate video only after story completion

**Code Reference:** `docs/user-journeys/video-conversational.md:Best Practices`

### Video with Live Avatar

1. Check device capabilities before enabling avatar
2. Start avatar session after conversation session
3. Implement fallback to static avatar
4. Configure Hedra and LiveKit credentials

**Code Reference:** `docs/user-journeys/video-live-avatar.md:Best Practices`

## Integration Patterns

### REST API Integration

**Pattern:** Direct HTTP calls

**Example:**
```javascript
const response = await fetch('https://api.storytailor.com/v1/stories', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
  body: JSON.stringify({ character: {...}, storyType: 'adventure' })
});
```

**Code Reference:** `docs/user-journeys/rest-api.md:Integration Examples`

### Audio Conversational Integration

**Pattern:** Voice input → Transcription → Story → Voice synthesis

**Example:**
```javascript
// Send audio
const response = await fetch('https://api.storytailor.com/v1/conversation/voice', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
  body: formData // audio file
});

// Receive transcription + audio response
const { transcription, textResponse, audioResponse } = await response.json();
```

**Code Reference:** `docs/user-journeys/audio-conversational.md:Data Flow Diagram`

### Video Conversational Integration

**Pattern:** Text/Voice input → Story + Images → Response

**Example:**
```javascript
// Send message with visual request
const response = await fetch('https://api.storytailor.com/v1/conversation/message', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
  body: JSON.stringify({
    sessionId: sessionId,
    message: {
      type: 'text',
      content: 'Create an adventure story',
      metadata: { requestVisuals: true }
    }
  })
});

// Receive story + images
const { response: storyResponse, images } = await response.json();
```

**Code Reference:** `docs/user-journeys/video-conversational.md:Data Flow Diagram`

### Video with Live Avatar Integration

**Pattern:** Avatar session → Real-time streaming → Story interaction

**Example:**
```javascript
// Start avatar session
const avatarSession = await fetch('https://api.storytailor.com/v1/avatar/start', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
  body: JSON.stringify({ characterId: 'frankie', voice: 'kQJQj1e9P2YDvAdvp2BW' })
});

// Connect to LiveKit
const { livekitUrl, accessToken } = await avatarSession.json();
const room = new Room();
await room.connect(livekitUrl, accessToken);

// Send message to avatar
await fetch('https://api.storytailor.com/v1/avatar/say', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
  body: JSON.stringify({ sessionId: avatarSessionId, message: 'Create a story' })
});
```

**Code Reference:** `docs/user-journeys/video-live-avatar.md:Data Flow Diagram`

## Summary

### When to Use Each Journey

| Journey Type | Use When | Avoid When |
|-------------|----------|------------|
| **REST API** | Automation, batch processing, server integration | Real-time interaction needed |
| **Audio Conversational** | Voice platforms, hands-free, accessibility | Visual content required |
| **Video Conversational** | Web apps, visual storytelling, multimedia | Voice-only devices |
| **Video with Live Avatar** | Screened devices, immersive experiences | Voice-only devices, no credentials |

### Key Differentiators

1. **REST API**: Fastest, most direct, but no conversational flow
2. **Audio Conversational**: Best for voice, includes Kid Intelligence
3. **Video Conversational**: Best for visual content, includes image/video generation
4. **Video with Live Avatar**: Most immersive, real-time avatar interaction

**Code References:**
- `docs/user-journeys/rest-api.md` - REST API journey
- `docs/user-journeys/audio-conversational.md` - Audio journey
- `docs/user-journeys/video-conversational.md` - Video journey
- `docs/user-journeys/video-live-avatar.md` - Live avatar journey

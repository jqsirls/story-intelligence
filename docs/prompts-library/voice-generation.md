Status: Draft  
Audience: Internal  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 2.6 - Voice generation prompts extracted from code with file paths and line numbers

# Voice Generation Prompts

## Overview

This document contains all prompts and configurations used for voice synthesis and audio generation in Storytailor, including narration conversion, audio segment creation, and voice customization.

## Audio Generation Service

### Story Narration Conversion

**Location:** `packages/content-agent/src/services/AudioGenerationService.ts:74-121`

**Purpose:** Generate complete story narration audio

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/AudioGenerationService.ts:74-121
async generateStoryNarration(
  story: Story,
  character: Character,
  voiceSettings?: Partial<VoiceCustomization>
): Promise<GeneratedStoryAudio> {
  const startTime = Date.now();
  
  try {
    // Prepare voice settings
    const finalVoiceSettings = this.prepareVoiceSettings(story, character, voiceSettings);
    
    // Convert story to narration text
    const narrationText = this.convertStoryToNarration(story);
    
    // Create audio segments for better control
    const segments = this.createAudioSegments(story, finalVoiceSettings);
    
    // Generate audio for each segment
    const generatedSegments = await this.generateSegmentAudio(segments);
    
    // Generate full narration
    const fullNarrationResponse = await this.generateFullNarration(
      narrationText,
      finalVoiceSettings
    );
}
```

**Note:** The actual narration text conversion and audio generation use the VoiceService, which handles ElevenLabs and Polly integration. No explicit prompts are used for narration text conversion - it's a direct text-to-speech process.

### Voice Customization

**Location:** `packages/content-agent/src/services/AudioGenerationService.ts:23-31`

**Purpose:** Voice customization settings for narration

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/AudioGenerationService.ts:23-31
export interface VoiceCustomization {
  voiceId: string;
  stability: number; // 0-1, higher = more consistent
  similarityBoost: number; // 0-1, higher = more similar to original
  style: number; // 0-1, higher = more expressive
  useSpeakerBoost: boolean;
  speed: number; // 0.5-2.0, playback speed multiplier
  emotion: 'neutral' | 'excited' | 'calm' | 'mysterious' | 'gentle' | 'adventurous';
}
```

**Usage:**
- `packages/content-agent/src/services/AudioGenerationService.ts:83` - Prepare voice settings
- `packages/voice-synthesis/src/VoiceService.ts:113-150` - Voice synthesis with settings

## Voice Service Integration

### ElevenLabs Streaming

**Location:** `packages/voice-synthesis/src/clients/ElevenLabsClient.ts:90-150`

**Purpose:** Stream audio synthesis using ElevenLabs

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/AudioGenerationService.ts:170-181
const response = await this.config.voiceService.synthesize({
  text: segment.text,
  voiceId: segment.voiceSettings.voiceId,
  format: 'mp3',
  sessionId: `regen-${beatId}-${Date.now()}`
});
```

**Note:** Voice synthesis does not use prompts - it directly converts text to speech using voice settings (voiceId, stability, similarityBoost, style, emotion).

## Audio Segment Creation

**Location:** `packages/content-agent/src/services/AudioGenerationService.ts:33-41`

**Purpose:** Define audio segments for story narration

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/AudioGenerationService.ts:33-41
export interface StoryAudioSegment {
  id: string;
  type: 'narration' | 'character_dialogue' | 'sound_effect_cue';
  text: string;
  voiceSettings: VoiceCustomization;
  startTime?: number;
  duration?: number;
  audioUrl?: string;
}
```

**Usage:**
- `packages/content-agent/src/services/AudioGenerationService.ts:89` - Create audio segments
- `packages/content-agent/src/services/AudioGenerationService.ts:92` - Generate segment audio

## Voice Settings by Story Type

**Location:** `packages/content-agent/src/services/AudioGenerationService.ts:200-356`

**Purpose:** Default voice settings for different story types

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/AudioGenerationService.ts:200-356
private prepareVoiceSettings(
  story: Story,
  character: Character,
  customSettings?: Partial<VoiceCustomization>
): VoiceCustomization {
  // Default settings based on story type
  const defaultSettings: Record<StoryType, Partial<VoiceCustomization>> = {
    'Adventure': {
      emotion: 'adventurous',
      stability: 0.6,
      style: 0.7
    },
    'Bedtime': {
      emotion: 'calm',
      stability: 0.8,
      style: 0.3
    },
    'Educational': {
      emotion: 'neutral',
      stability: 0.7,
      style: 0.5
    },
    // ... more story types
  };
  
  return {
    voiceId: customSettings?.voiceId || this.config.defaultVoiceId,
    stability: customSettings?.stability ?? defaultSettings[story.content.type]?.stability ?? 0.7,
    similarityBoost: customSettings?.similarityBoost ?? 0.75,
    style: customSettings?.style ?? defaultSettings[story.content.type]?.style ?? 0.5,
    useSpeakerBoost: customSettings?.useSpeakerBoost ?? true,
    speed: customSettings?.speed ?? 1.0,
    emotion: customSettings?.emotion ?? defaultSettings[story.content.type]?.emotion ?? 'neutral'
  };
}
```

## Frankie Voice Configuration

**Location:** Based on `HEDRA_AVATAR_INTEGRATION_STATUS.md:24-27`

**Purpose:** Frankie's voice ID for avatar interactions

**Configuration:**
- ElevenLabs Voice ID: `kQJQj1e9P2YDvAdvp2BW`
- Character ID: `char_frankie_default`
- Usage: Live avatar conversations, real-time voice synthesis

**Code References:**
- `HEDRA_AVATAR_INTEGRATION_STATUS.md:24-27` - Default avatar config
- `HEDRA_AVATAR_INTEGRATION_STATUS.md:5` - Frankie voice ID

## Voice Synthesis Service

### VoiceService Interface

**Location:** `packages/voice-synthesis/src/VoiceService.ts:113-150`

**Purpose:** Main voice synthesis service interface

**Code Reference:**
```typescript
// Code location: packages/voice-synthesis/src/VoiceService.ts:113-150
async stream(
  request: VoiceSynthesisRequest,
  onChunk: (chunk: AudioChunk) => void
): Promise<VoiceSynthesisResponse> {
  // Stream audio synthesis
  // Uses ElevenLabs or Polly based on configuration
}
```

**Note:** Voice synthesis is a direct text-to-speech conversion process. No prompts are used - the text is sent directly to the TTS engine with voice settings.

## Audio Regeneration

**Location:** `packages/content-agent/src/services/AudioGenerationService.ts:126-199`

**Purpose:** Regenerate audio when story content changes

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/AudioGenerationService.ts:126-199
async regenerateAudio(
  originalAudio: GeneratedStoryAudio,
  regenerationRequest: AudioRegenerationRequest
): Promise<GeneratedStoryAudio> {
  // If voice settings changed, regenerate everything
  if (regenerationRequest.voiceSettings) {
    // Regenerate with new voice settings
  }
  
  // If only specific beats changed, regenerate those segments
  if (regenerationRequest.changedBeats && regenerationRequest.changedBeats.length > 0) {
    // Regenerate only changed segments
  }
}
```

## Related Prompts

- **Conversation:** See [Conversation Prompts](./conversation.md) - Frankie system prompt includes voice interaction guidelines
- **Content Generation:** See [Content Generation Prompts](./content-generation.md) - Story content that becomes narration

## Notes

Voice generation in Storytailor does not use traditional prompts. Instead:
1. **Text Input:** Story text is converted directly to narration format
2. **Voice Settings:** Voice parameters (voiceId, stability, style, emotion) are configured
3. **TTS Engine:** Text is sent to ElevenLabs or Polly for synthesis
4. **No Prompts:** The TTS engines do not use prompts - they convert text to speech based on voice settings

The only "prompt-like" elements are:
- Voice settings configuration (emotion, stability, style)
- Story type-based voice defaults
- Character-specific voice selection

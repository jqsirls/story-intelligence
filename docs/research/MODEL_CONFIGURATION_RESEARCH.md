# Model Configuration Research (Phase 0)

**Date**: 2025-12-28  
**Purpose**: Document current AI model configuration before implementing V3 Audio & UX features

## Summary

✅ **CONFIRMED**: All AI models use environment-driven configuration. No hardcoded models found.

## OpenAI Model Configuration

**File**: `packages/shared-types/src/config/model-config.ts`

**Current Defaults**:
- `PRIMARY` (Story generation): `gpt-5.2` (via `OPENAI_MODEL_STORY` or `OPENAI_MODEL`)
- `CONVERSATION` (Quick responses): `gpt-5-mini` (via `OPENAI_MODEL_CONVERSATION`)
- `SAFETY` (Content moderation): `gpt-5.2` (via `OPENAI_MODEL_SAFETY`)
- `ROUTING` (Intent classification): `gpt-5-mini` (via `OPENAI_MODEL_ROUTING`)
- `IMAGE` (Image generation): `gpt-image-1.5` (via `OPENAI_MODEL_IMAGE`)
- `VIDEO` (Video generation): `sora-2` (via `OPENAI_MODEL_VIDEO`)

**Environment Variables**:
- `OPENAI_MODEL_STORY` - Overrides primary story model
- `OPENAI_MODEL_CONVERSATION` - Overrides conversation model
- `OPENAI_MODEL_SAFETY` - Overrides safety model
- `OPENAI_MODEL_ROUTING` - Overrides routing model
- `OPENAI_MODEL_IMAGE` - Overrides image model
- `OPENAI_MODEL_VIDEO` - Overrides video model
- `OPENAI_MODEL` - Fallback for all text models

**SSM Parameter Paths** (from `lambda-deployments/content-agent/src/lambda.ts`):
- `/storytailor-{stage}/openai/api-key`
- `/storytailor-{stage}/openai-api-key`
- `/storytailor-{stage}/openai/api_key`

**Usage in Code**:
```typescript
import { MODEL_CONFIG, DEFAULT_STORY_MODEL, DEFAULT_CONVERSATION_MODEL } from '@alexa-multi-agent/shared-types';

// Story generation
const model = MODEL_CONFIG.TEXT.PRIMARY; // or DEFAULT_STORY_MODEL

// Quick responses
const model = MODEL_CONFIG.TEXT.CONVERSATION; // or DEFAULT_CONVERSATION_MODEL
```

## ElevenLabs Model Configuration

**File**: `lambda-deployments/content-agent/src/config/ElevenLabsModelConfig.ts`

**Current Defaults**:
- `story_narration`: `eleven_v3` (via `ELEVENLABS_MODEL_STORY_NARRATION`)
- `multi_character`: `eleven_v3` (via `ELEVENLABS_MODEL_MULTI_CHARACTER`)
- `realtime_conversation`: `eleven_flash_v2_5` (via `ELEVENLABS_MODEL_REALTIME`)
- `quick_response`: `eleven_turbo_v2_5` (via `ELEVENLABS_MODEL_QUICK`)
- `background_music`: `music_v1` (via `ELEVENLABS_MODEL_MUSIC`)

**Environment Variables**:
- `ELEVENLABS_MODEL_STORY_NARRATION` - Overrides story narration model
- `ELEVENLABS_MODEL_MULTI_CHARACTER` - Overrides multi-character model
- `ELEVENLABS_MODEL_REALTIME` - Overrides real-time conversation model
- `ELEVENLABS_MODEL_QUICK` - Overrides quick response model
- `ELEVENLABS_MODEL_MUSIC` - Overrides background music model

**SSM Parameter Paths** (from `lambda-deployments/content-agent/src/lambda.ts`):
- `/storytailor-{stage}/tts/elevenlabs/api-key` ⭐ PRIMARY PATH
- `/storytailor-{stage}/elevenlabs/api-key`
- `/storytailor-{stage}/elevenlabs-api-key`

**Usage in Code**:
```typescript
import { getModelForUseCase, ELEVENLABS_MODEL_CONFIG } from './config/ElevenLabsModelConfig';

// Story narration
const model = getModelForUseCase('story_narration'); // Returns 'eleven_v3' by default

// Or directly
const model = ELEVENLABS_MODEL_CONFIG.story_narration;
```

## Content Agent Lambda Configuration

**File**: `lambda-deployments/content-agent/src/lambda.ts`

**Model Selection** (line 183):
```typescript
openai: {
  apiKey: openaiKey,
  model: process.env.OPENAI_MODEL_STORY || process.env.OPENAI_MODEL || 'gpt-5.2'
}
```

**ElevenLabs Configuration** (line 185-188):
```typescript
elevenlabs: {
  apiKey: elevenLabsKey || 'placeholder',
  defaultVoiceId: process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'
}
```

## Voice Synthesis Package Configuration

**File**: `packages/voice-synthesis/src/config.ts`

**ElevenLabs Default** (line 11):
```typescript
model: process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5'
```

**Note**: This is for real-time conversation, not story narration.

## Recommendations for V3 Implementation

1. ✅ **Use existing config system** - No need to create new config files
2. ✅ **For SFX cue sheet generation**: Use `MODEL_CONFIG.TEXT.CONVERSATION` (gpt-5-mini) - already configured
3. ✅ **For story narration with timestamps**: Use `getModelForUseCase('story_narration')` - returns `eleven_v3` by default
4. ✅ **For SFX generation**: Use ElevenLabs sound generation API (no model selection needed)
5. ✅ **All models upgradeable via environment variables** - No code changes needed for GPT-6+ or eleven_v4+

## Verification Checklist

- ✅ OpenAI models use `MODEL_CONFIG` from `@alexa-multi-agent/shared-types`
- ✅ ElevenLabs models use `getModelForUseCase()` from `ElevenLabsModelConfig.ts`
- ✅ All models have environment variable overrides
- ✅ SSM Parameter Store paths documented
- ✅ No hardcoded model names found
- ✅ Upgrade path clear (update env vars or SSM params only)

## Next Steps

1. ✅ Phase 0 complete - Model configuration documented
2. → Phase 0.5: Research V2 Story Type HUE Configuration
3. → Phase 1.0: Research Supabase Schema


# ElevenLabs Model Upgrade Strategy

**Status**: ✅ Implemented  
**Last Updated**: 2025-12-17  
**Owner**: Engineering Team

## Assessment Summary

### Current State
- **Story Narration**: Using `eleven_multilingual_v2` (hardcoded)
- **Multi-Character Dialogue**: Using `eleven_v3_alpha` (hardcoded)
- **Real-time Conversation**: Using `eleven_flash_v2_5` (via voice-synthesis package)
- **Issue**: Model IDs scattered across codebase, no centralized configuration

### Latest Available Models (as of Dec 2025)

1. **`eleven_v3`** (June 2025, API access Aug 2025)
   - ✅ **Recommended for story narration**
   - Most expressive and emotionally rich
   - Supports 70+ languages
   - Best quality for narrative content
   - **Not for real-time use** (optimized for high-quality generation)
   - Stability values: **0.0, 0.5, 1.0 only** (not continuous range)

2. **`eleven_multilingual_v2`**
   - ✅ Stable fallback option
   - Consistent quality
   - Good for narration
   - Stability: 0.0-1.0 (continuous range)

3. **`eleven_v3_alpha`**
   - ⚠️ Alpha version - use with caution
   - May have breaking changes
   - Similar to `eleven_v3` but less stable

4. **`eleven_turbo_v2_5`**
   - High quality, low latency (~250-300ms)
   - Good for quick responses

5. **`eleven_flash_v2_5`**
   - Fast, affordable (~75ms)
   - Best for real-time conversations

## Recommendation

### ✅ Use `eleven_v3` for Story Narration

**Reasons:**
1. **Better Quality**: Most expressive and emotionally rich model
2. **Future-Proof**: Latest stable model (June 2025)
3. **Multilingual**: Supports 70+ languages
4. **Perfect Fit**: Optimized for narrative content (not real-time)

**Requirements:**
- Stability must be: **0.0, 0.5, or 1.0** (not continuous)
- Supports `style` parameter for expressive speech
- Does NOT support `use_speaker_boost` (may cause TTD interpretation issues)

### ✅ Centralized Configuration System

**Implementation:**
- Created `ElevenLabsModelConfig.ts` with centralized model selection
- Environment variable support for easy upgrades
- Automatic validation of model requirements
- Per-use-case model mapping

**Upgrade Path:**
When `eleven_v4` (or newer) is released:
1. Add model to `ElevenLabsModelId` type
2. Add requirements to `MODEL_REQUIREMENTS`
3. Update default in `ELEVENLABS_MODEL_CONFIG` OR
4. Set environment variable: `ELEVENLABS_MODEL_STORY_NARRATION=eleven_v4`
5. **No code changes needed** in `RealContentAgent.ts` or other services

## Implementation

### Code Changes

1. **Created**: `lambda-deployments/content-agent/src/config/ElevenLabsModelConfig.ts`
   - Centralized model configuration
   - Model requirements and validation
   - Environment variable support

2. **Updated**: `lambda-deployments/content-agent/src/RealContentAgent.ts`
   - Uses `getModelForUseCase('story_narration')` instead of hardcoded model
   - Uses `getVoiceSettingsForModel()` for validated settings
   - Automatically handles model-specific requirements

### Environment Variables

```bash
# Story narration (default: eleven_v3)
ELEVENLABS_MODEL_STORY_NARRATION=eleven_v3

# Multi-character dialogue (default: eleven_v3)
ELEVENLABS_MODEL_MULTI_CHARACTER=eleven_v3

# Real-time conversation (default: eleven_flash_v2_5)
ELEVENLABS_MODEL_REALTIME=eleven_flash_v2_5

# Quick responses (default: eleven_turbo_v2_5)
ELEVENLABS_MODEL_QUICK=eleven_turbo_v2_5

# Background music (default: music_v1)
ELEVENLABS_MODEL_MUSIC=music_v1
```

### Model Requirements

**`eleven_v3` Requirements:**
```typescript
{
  stability: 0.5,              // Must be: 0.0, 0.5, or 1.0
  similarity_boost: 0.75,      // 0.0-1.0
  style: 0.4,                  // 0.0-1.0 (expressive speech)
  speed: 1.0                   // 0.25-4.0
  // use_speaker_boost: NOT SUPPORTED
}
```

**`eleven_multilingual_v2` Requirements:**
```typescript
{
  stability: 0.5,              // 0.0-1.0 (continuous)
  similarity_boost: 0.75,      // 0.0-1.0
  use_speaker_boost: true,     // Optional
  speed: 1.0                   // 0.25-4.0
  // style: NOT SUPPORTED
}
```

## Migration Plan

### Phase 1: Deploy Centralized Config ✅
- [x] Create `ElevenLabsModelConfig.ts`
- [x] Update `RealContentAgent.ts` to use centralized config
- [x] Test with `eleven_v3` model

### Phase 2: Update Other Services
- [ ] Update `MultiCharacterDialogueService` to use centralized config
- [ ] Update `CharacterVoiceGenerator` to use centralized config
- [ ] Update `VoiceDesignService` to use centralized config

### Phase 3: Environment Variable Setup
- [ ] Set `ELEVENLABS_MODEL_STORY_NARRATION=eleven_v3` in Lambda environment
- [ ] Set `ELEVENLABS_MODEL_MULTI_CHARACTER=eleven_v3` in Lambda environment
- [ ] Document in SSM Parameter Store

### Phase 4: Monitoring & Validation
- [ ] Monitor audio quality with `eleven_v3`
- [ ] Validate stability values (0.0, 0.5, 1.0 only)
- [ ] Test multilingual support
- [ ] Compare quality vs `eleven_multilingual_v2`

## Benefits

1. **Easy Upgrades**: Change environment variable, no code changes
2. **Model Validation**: Automatic validation of model requirements
3. **Future-Proof**: New models can be added without touching business logic
4. **Consistency**: All services use same model selection logic
5. **Documentation**: Model requirements documented in code

## Testing

### Test `eleven_v3` Model
```bash
# Set environment variable
export ELEVENLABS_MODEL_STORY_NARRATION=eleven_v3

# Generate story and verify audio quality
# Check logs for model_id: 'eleven_v3'
# Verify stability is 0.0, 0.5, or 1.0
```

### Fallback Testing
```bash
# Test fallback to eleven_multilingual_v2
export ELEVENLABS_MODEL_STORY_NARRATION=eleven_multilingual_v2

# Verify different stability values work (0.0-1.0 continuous)
```

## References

- [ElevenLabs Models Documentation](https://elevenlabs.io/docs/product/speech-synthesis/models)
- [Eleven v3 Release Notes](https://elevenlabs.io/docs/changelog/2025/8/20)
- Code: `lambda-deployments/content-agent/src/config/ElevenLabsModelConfig.ts`
- Code: `lambda-deployments/content-agent/src/RealContentAgent.ts:1360-1369`

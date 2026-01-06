Status: Draft  
Audience: Internal | Partner | Auditor  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 7 - OpenAI integration documentation with privacy statement

# OpenAI Integration

## Overview

OpenAI is the primary AI service used by Storytailor for story generation, content moderation, intent classification, and image/video generation. 

⚠️ **MODEL VERSION AUDIT REQUIRED**: The codebase currently uses mixed model versions. Target models are:
- **Text:** GPT-5.1+ (or latest GPT-5.x) for primary, GPT-5.1-mini for lightweight tasks
- **Image:** `gpt-image-1` (currently using `dall-e-3` - needs update)
- **Video:** Sora-2 (or latest Sora-x)

**Never use:** GPT-3, GPT-3.5-turbo, GPT-4, GPT-4o, DALL-E 2/3

See [AI Model Version Audit](../AI_MODEL_VERSION_AUDIT.md) for complete audit and update plan.

**SSM Parameter:** `/storytailor-{ENV}/openai/api-key`
**Status:** ✅ Active

**Code References:**
- `packages/content-agent/src/ContentAgent.ts:75-77` - OpenAI client initialization
- `packages/router/src/services/IntentClassifier.ts` - Intent classification
- `packages/content-agent/src/services/ArtGenerationService.ts` - Image generation
- `lambda-deployments/content-agent/src/services/AnimationService.ts:210-264` - Video generation
- `docs/system/inventory.md:185` - Service status

## Models Used

### Text Generation

⚠️ **OUTDATED MODELS - UPDATE REQUIRED**

**Current State (Needs Update):**
- Some code uses `gpt-4` (should be `gpt-5.1`)
- Some code uses `gpt-3.5-turbo` (should be `gpt-5.1-mini`)
- Some code uses `gpt-4o` (should be `gpt-5.1`)

**Target Models:**
- **GPT-5.1** (or latest GPT-5.x): Story generation, character creation, content moderation, intent classification
- **GPT-5.1-mini** (or latest GPT-5.x-mini): Conversational responses, quick content generation, lightweight tasks

**Code References:**
- See [AI Model Version Audit](../AI_MODEL_VERSION_AUDIT.md) for complete list of locations requiring updates

**Code References:**
- `packages/content-agent/src/services/StoryCreationService.ts` - Story generation
- `packages/content-agent/src/services/CharacterGenerationService.ts` - Character creation
- `packages/router/src/services/IntentClassifier.ts` - Intent classification

### Image Generation

⚠️ **OUTDATED MODEL - UPDATE REQUIRED**

**Current State:**
- Code uses `dall-e-3` (hardcoded) - **NEEDS UPDATE**

**Target Model:**
- **gpt-image-1** (or latest gpt-image-x): Character images, story illustrations, cover art

**Required Changes:**
- Update `packages/content-agent/src/services/ArtGenerationService.ts:504` from `dall-e-3` to `gpt-image-1`
- Update `lambda-deployments/content-agent/src/services/ArtGenerationService.ts:503` from `dall-e-3` to `gpt-image-1`
- Use environment variable: `OPENAI_MODEL_IMAGE` (default: `gpt-image-1`)

**Code References:**
- `packages/content-agent/src/services/ArtGenerationService.ts:504` - Currently hardcoded `dall-e-3`
- `lambda-deployments/content-agent/src/services/ArtGenerationService.ts:503` - Currently hardcoded `dall-e-3`
- See [AI Model Version Audit](../AI_MODEL_VERSION_AUDIT.md) for update plan

### Video Generation

**Sora-2:**
- Story video generation
- Micro episodes
- Animated content

**Code References:**
- `lambda-deployments/content-agent/src/services/AnimationService.ts:210-264` - Video generation
- `docs/user-journeys/video-conversational.md:210-264` - Sora video generation

### Vision Analysis

⚠️ **MODEL VERSION UPDATE REQUIRED**

**Current State:**
- Code may use `gpt-4-vision-preview` - **NEEDS UPDATE**

**Target Model:**
- **GPT-5.1-Vision** (or latest GPT-5.x-Vision): Image analysis, character consistency checking, visual content validation

**Code References:**
- `packages/content-agent/src/services/ArtGenerationService.ts` - Vision analysis
- See [AI Model Version Audit](../AI_MODEL_VERSION_AUDIT.md) for update plan

### Content Moderation

**text-moderation-latest:**
- Content safety checks
- Inappropriate content detection
- Age-appropriate content validation

**Code References:**
- `packages/content-agent/src/services/ContentModerator.ts` - Content moderation
- `packages/child-safety-agent/src/services/InappropriateContentHandler.ts` - Inappropriate content handling

## Integration Points

### Content Agent

**Primary Usage:**
- Story generation
- Character creation
- Content moderation
- Art generation

**Code References:**
- `packages/content-agent/src/ContentAgent.ts:75-77` - OpenAI initialization
- `packages/content-agent/src/services/StoryCreationService.ts` - Story generation service

### Router

**Primary Usage:**
- Intent classification
- User request understanding

**Code References:**
- `packages/router/src/services/IntentClassifier.ts` - Intent classification

### Child Safety Agent

**Primary Usage:**
- Content moderation
- Disclosure detection
- Inappropriate content detection

**Code References:**
- `packages/child-safety-agent/src/services/InappropriateContentHandler.ts` - Content safety
- `packages/child-safety-agent/src/services/DisclosureDetectionService.ts` - Disclosure detection

## TAG: PRIVACY

### Child-Identifying Data Flow

**Data Sent to OpenAI:**
- **User Age**: Sent (for age-appropriate content generation)
- **Story Content**: Sent (for story generation and continuation)
- **Character Descriptions**: Sent (for character creation)
- **User Messages**: Sent (for intent classification and content generation)
- **Audio Transcripts**: Sent (for content generation from voice input)
- **User Preferences**: Sent (for story adaptation)
- **Emotional State**: Sent (for mood-based story recommendations)

**Data Protection Measures:**
1. **No PII in Prompts**: User names, emails, and other PII are not included in prompts sent to OpenAI
2. **Age Information Only**: Only user age (not full date of birth) is sent for age-appropriate content filtering
3. **Content Sanitization**: User messages are sanitized before sending to remove any accidental PII
4. **Purpose Limitation**: Data sent to OpenAI is limited to what's necessary for story generation and safety
5. **No Data Retention by OpenAI**: OpenAI does not use data for model training (API usage)
6. **Encrypted Transmission**: All API calls use HTTPS/TLS encryption
7. **API Key Security**: OpenAI API keys stored encrypted in AWS SSM Parameter Store

**Code References:**
- `packages/content-agent/src/services/PromptSelector.ts` - Age-appropriate prompt selection
- `packages/content-agent/src/services/ContentModerator.ts` - Content moderation
- `packages/content-safety/src/filters/PromptSanitizationFilter.ts:1-175` - Prompt sanitization

**Compliance Status:**
- ⚠️ **COPPA Considerations**: User age and story content sent to OpenAI (necessary for service functionality)
- ✅ **GDPR Compliant**: Data minimization, purpose limitation, secure transmission
- ✅ **OpenAI Data Usage**: API usage does not train OpenAI models (per OpenAI API terms)

**Privacy Risk Assessment:**
- **Risk Level**: Medium
- **Mitigation**: Content sanitization, no PII in prompts, encrypted transmission, API key security
- **Parental Consent**: Required for children under 13 before story generation

## Configuration

### SSM Parameters

**Required Parameter:**
- `/storytailor-{ENV}/openai/api-key` - OpenAI API key (SecureString)

**Code References:**
- [SSM Parameters Inventory](../system/ssm-parameters-inventory.md:78-88) - SSM parameter inventory

### Environment Variables

**Lambda Functions:**
- `OPENAI_API_KEY` - OpenAI API key (from SSM)

## Model Version Management

### Current Model Configuration

**All models updated to GPT-5.1+ and gpt-image-1 (2025-12-13)**

**Environment Variables:**
```bash
OPENAI_MODEL_STORY=gpt-5.1 (default)
OPENAI_MODEL_CONVERSATION=gpt-5.1-mini (default)
OPENAI_MODEL_SAFETY=gpt-5.1 (default)
OPENAI_MODEL_ROUTING=gpt-5.1-mini (default)
OPENAI_MODEL_IMAGE=gpt-image-1 (default)
OPENAI_MODEL_VIDEO=sora-2 (default)
```

**SSM Parameters:**
- `/storytailor-{ENV}/openai/model-story` (default: gpt-5.1)
- `/storytailor-{ENV}/openai/model-conversation` (default: gpt-5.1-mini)
- `/storytailor-{ENV}/openai/model-safety` (default: gpt-5.1)
- `/storytailor-{ENV}/openai/model-routing` (default: gpt-5.1-mini)
- `/storytailor-{ENV}/openai/model-image` (default: gpt-image-1)
- `/storytailor-{ENV}/openai/model-video` (default: sora-2)

**Code References:**
- `packages/shared-types/src/config/model-config.ts` - Centralized model configuration
- `docs/system/ssm_parameters_inventory.md:56-75` - SSM parameter documentation

### Upgrade Path

**When GPT-6+ is released:**
1. Update SSM parameters in AWS Parameter Store
2. Optionally update defaults in `packages/shared-types/src/config/model-config.ts`
3. Test all integrations
4. Deploy

**No code changes required** - all models use environment variables with defaults.

**Code References:**
- `packages/shared-types/src/config/model-config.ts:180-188` - Upgrade path documentation

### Version Policy

**Required Models:**
- **Text:** GPT-5.1+ (or latest GPT-5.x) for primary, GPT-5.1-mini for lightweight
- **Image:** gpt-image-1 (or latest gpt-image-x)
- **Video:** sora-2 (or latest sora-x)

**Never Use:**
- GPT-3, GPT-3.5-turbo, GPT-4, GPT-4o, DALL-E 2/3

**Easy Upgrades:**
- All models configurable via environment variables
- Flexible GPT-5.x versioning supported
- Validation prevents deprecated model usage

**Code References:**
- `packages/shared-types/src/config/model-config.ts:20-40` - Deprecated models list
- `packages/shared-types/src/config/model-config.ts:42-50` - Model validation

## Implementation Status

### Model Updates (2025-12-13)

**✅ All models updated to GPT-5.1+ and gpt-image-1**

**Updated Files:**
- `packages/shared-types/src/config/model-config.ts` - Centralized configuration
- `packages/content-agent/src/services/ArtGenerationService.ts` - Image model (gpt-image-1)
- `lambda-deployments/content-agent/src/services/ArtGenerationService.ts` - Image model (gpt-image-1)
- `packages/router/src/config.ts` - Default model (gpt-5.1)
- `lambda-deployments/router/src/config.ts` - Default model (gpt-5.1)
- `packages/localization-agent/src/**/*` - All files updated to gpt-5.1 (20+ files)
- `lambda-deployments/content-safety/**/*` - Updated to gpt-5.1-mini (3 files)
- `lambda-deployments/conversation-agent/src/modes/TextConversationHandler.js` - Updated to gpt-5.1
- `lambda-deployments/content-agent/src/services/TierQualityService.ts` - All tiers updated
- `packages/universal-agent/src/lambda.ts` - Updated to gpt-5.1

**Code References:**
- `docs/AI_MODEL_VERSION_AUDIT.md` - Complete audit and update status

## Related Documentation

- **AI Model Version Audit:** See [AI Model Version Audit](../AI_MODEL_VERSION_AUDIT.md) - Complete audit and update status
- **Model Configuration:** See `packages/shared-types/src/config/model-config.ts` - Centralized configuration
- **Content Agent:** See `docs/agents/content-agent.md`
- **Prompts Library:** See `docs/prompts-library/content-generation.md`
- **Content Moderation:** See `docs/prompts-library/safety.md`

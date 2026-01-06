Status: Draft  
Audience: Internal | Partner | Auditor  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 7 - Stability AI integration documentation with privacy statement

# Stability AI Integration

## Overview

⚠️ **STATUS: NOT IMPLEMENTED**

Stability AI was documented as an integration, but code analysis reveals it is **not actually implemented**. The codebase only uses OpenAI's `dall-e-3` (which should be updated to `gpt-image-1`) for image generation.

**SSM Parameter:** `/storytailor-production/stability/api-key`  
**Status:** ⚠️ **NOT IMPLEMENTED** - Documented but not actually used in code

**Evidence:**
- No Stability AI API calls found in codebase
- `ArtGenerationService.ts` only uses OpenAI `dall-e-3` (hardcoded)
- "stability" references in code are for ElevenLabs voice stability parameter, not Stability AI

**Recommendation:**
- Remove from active integrations or implement properly as fallback
- Primary image generation should use OpenAI `gpt-image-1`
- If fallback is desired, implement Stability AI integration properly

**Code References:**
- `packages/content-agent/src/services/ArtGenerationService.ts` - Art generation service
- `docs/system/inventory.md:186` - Service status

## Features

### Image Generation

**Image Generation:**
- Character art
- Story illustrations
- Consistent art style

**Code References:**
- `packages/content-agent/src/services/ArtGenerationService.ts` - Art generation
- `lambda-deployments/content-agent/src/constants/GlobalArtStyle.ts` - Art style constants

## TAG: PRIVACY

### Child-Identifying Data Flow

**Data Sent to Stability AI:**
- **Art Prompts**: Sent (character descriptions, story scenes)
- **Art Style Preferences**: Sent (age-appropriate art style)
- **User Age**: Not sent (age-appropriate style applied before prompt generation)
- **User ID**: Not sent
- **Email/Name**: Not sent
- **Story Content**: Sent (for scene descriptions in prompts)

**Data Protection Measures:**
1. **No PII in Prompts**: User names, emails, and other PII are not included in art prompts
2. **Age-Appropriate Style**: Age-appropriate art style applied before prompt generation (no age sent to Stability AI)
3. **Content Sanitization**: Story content sanitized before inclusion in prompts
4. **Encrypted Transmission**: All API calls use HTTPS/TLS encryption
5. **API Key Security**: Stability AI API keys stored encrypted in AWS SSM Parameter Store
6. **Purpose Limitation**: Only art generation prompts sent (no user data)

**Code References:**
- `packages/content-agent/src/services/ArtGenerationService.ts` - Art generation
- `lambda-deployments/content-agent/src/constants/GlobalArtStyle.ts` - Art style constants

**Compliance Status:**
- ✅ **COPPA Compliant**: No child-identifying data sent (only art prompts)
- ✅ **GDPR Compliant**: Data minimization, purpose limitation, secure transmission

**Privacy Risk Assessment:**
- **Risk Level**: Low
- **Mitigation**: No PII in prompts, age-appropriate style applied locally, encrypted transmission
- **Parental Consent**: Not required (no child-identifying data sent)

## Configuration

### SSM Parameters

**Required Parameter:**
- `/storytailor-production/stability/api-key` - Stability AI API key (SecureString)

**Code References:**
- `docs/system/ssm_parameters_inventory.md:150-160` - SSM parameter inventory

## Related Documentation

- **Content Agent:** See `docs/agents/content-agent.md`
- **Prompts Library:** See `docs/prompts-library/visual-generation.md`

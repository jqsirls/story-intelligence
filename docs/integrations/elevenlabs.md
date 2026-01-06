Status: Draft  
Audience: Internal | Partner | Auditor  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 7 - ElevenLabs integration documentation with privacy statement

# ElevenLabs Integration

## Overview

ElevenLabs provides voice synthesis and conversational AI capabilities for Storytailor, enabling natural voice narration and real-time voice conversations with children.

**SSM Parameter:** `/storytailor-{ENV}/tts/elevenlabs/api-key`
**Status:** ✅ Active

**Code References:**
- `packages/voice-synthesis/src/clients/ElevenLabsClient.ts` - ElevenLabs client
- `lambda-deployments/conversation-agent/src/ConversationAgent.js` - Conversational AI
- `lambda-deployments/conversation-agent/src/prompts/FrankieSystemPrompt.js` - Frankie system prompt
- `docs/system/inventory.md:187,196` - Service status

## Services Used

### Voice Synthesis

**Text-to-Speech (TTS):**
- Story narration
- Character voices
- Voice cloning support

**Code References:**
- `packages/voice-synthesis/src/clients/ElevenLabsClient.ts` - TTS client
- `packages/voice-synthesis/src/VoiceService.ts:25-505` - Voice service

### Conversational AI

**ElevenLabs Conversational AI:**
- Real-time voice conversations
- Frankie system prompt
- Emotion response guidance
- Age-appropriate adaptations

**Code References:**
- `lambda-deployments/conversation-agent/src/ConversationAgent.js:1-285` - Conversation agent
- `lambda-deployments/conversation-agent/src/prompts/FrankieSystemPrompt.js` - Frankie prompt
- `lambda-deployments/conversation-agent/src/prompts/EmotionResponseGuidance.js` - Emotion guidance

### Voice Cloning

**Voice Clone Manager:**
- Voice clone creation
- Clone management
- Clone optimization

**Code References:**
- `packages/voice-synthesis/src/VoiceCloneManager.ts` - Voice clone manager

## Integration Points

### Voice Synthesis Agent

**Primary Usage:**
- Story narration audio generation
- Voice synthesis orchestration

**Code References:**
- `packages/voice-synthesis/src/VoiceService.ts:1-505` - Voice service
- `packages/voice-synthesis/src/clients/ElevenLabsClient.ts` - ElevenLabs client

### Conversation Agent

**Primary Usage:**
- Real-time voice conversations
- Conversational AI interactions

**Code References:**
- `lambda-deployments/conversation-agent/src/ConversationAgent.js:1-285` - Conversation agent
- `lambda-deployments/conversation-agent/src/ElevenLabsAgentClient.js` - Agent client

## TAG: PRIVACY

### Child-Identifying Data Flow

**Data Sent to ElevenLabs:**
- **Story Text**: Sent (for voice narration)
- **User Messages**: Sent (for conversational AI)
- **Audio Input**: Sent (for real-time conversation processing)
- **User Age**: Sent (for age-appropriate voice selection)
- **Voice Preferences**: Sent (for voice customization)
- **User ID**: Not sent (only session identifiers)
- **Email/Name**: Not sent

**Data Protection Measures:**
1. **No PII in Text**: User names, emails, and other PII are not included in text sent to ElevenLabs
2. **Session-Based Identifiers**: Only session IDs used, not user IDs
3. **Audio Data Minimization**: Only necessary audio data sent for conversation processing
4. **Voice Cloning Consent**: Voice cloning requires explicit parental consent for children under 13
5. **Encrypted Transmission**: All API calls use HTTPS/TLS encryption
6. **API Key Security**: ElevenLabs API keys stored encrypted in AWS SSM Parameter Store
7. **Data Retention**: Audio transcripts retained for 30 days only (COPPA compliance)

**Code References:**
- `packages/voice-synthesis/src/VoiceService.ts:25-505` - Voice service
- `lambda-deployments/conversation-agent/src/ConversationAgent.js:1-285` - Conversation agent
- `supabase/migrations/20240101000000_initial_schema.sql:67` - 30-day transcript retention

**Compliance Status:**
- ⚠️ **COPPA Considerations**: Story text, user messages, and audio input sent to ElevenLabs (necessary for service functionality)
- ✅ **GDPR Compliant**: Data minimization, purpose limitation, secure transmission, 30-day retention
- ✅ **Voice Cloning Consent**: Parental consent required for children under 13

**Privacy Risk Assessment:**
- **Risk Level**: Medium
- **Mitigation**: No PII in text, session-based identifiers, encrypted transmission, API key security, 30-day retention
- **Parental Consent**: Required for children under 13 before voice cloning

## Configuration

### SSM Parameters

**Required Parameter:**
- `/storytailor-{ENV}/tts/elevenlabs/api-key` - ElevenLabs API key (SecureString)

**Code References:**
- `docs/system/ssm_parameters_inventory.md:150-160` - SSM parameter inventory

### Environment Variables

**Lambda Functions:**
- `ELEVENLABS_API_KEY` - ElevenLabs API key (from SSM)
- `ELEVENLABS_AGENT_ID` - ElevenLabs Conversational AI agent ID

## Related Documentation

- **Voice Synthesis Agent:** See `docs/agents/voice-synthesis.md`
- **Conversation Agent:** See `docs/agents/conversation-agent.md`
- **Prompts Library:** See `docs/prompts-library/voice-generation.md`

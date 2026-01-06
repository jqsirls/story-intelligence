Status: Draft  
Audience: Internal | Partner | Auditor  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 7 - Third-party integrations index

# Third-Party Service Integrations

## Overview

This directory contains comprehensive documentation for all third-party services integrated with Storytailor. Each integration includes technical implementation details, privacy statements, and data flow documentation.

## Integration Categories

### Smart Home Integration

1. **[Philips Hue](./philips-hue.md)**
   - OAuth 2.0 authentication
   - v2/v1 API fallback
   - Lighting orchestration
   - Multi-location support

### AI & Content Generation

2. **[OpenAI](./openai.md)**
   - Story generation (GPT-4, GPT-3.5-turbo)
   - Content moderation
   - Image generation (DALL-E 3)
   - Video generation (Sora-2)

3. **[Stability AI](./stability-ai.md)**
   - Image generation
   - Art style consistency

### Voice & Avatar Services

4. **[ElevenLabs](./elevenlabs.md)**
   - Voice synthesis
   - Conversational AI
   - Voice cloning

5. **[Hedra](./hedra.md)**
   - Avatar generation
   - Real-time avatar interaction

6. **[LiveKit](./livekit.md)**
   - Real-time video/audio streaming
   - WebRTC connections

### Payment & Commerce

7. **[Stripe](./stripe.md)**
   - Payment processing
   - Subscription management
   - Webhook handling

### Communication Services

8. **[SendGrid](./sendgrid.md)**
   - Email delivery
   - Parent notifications
   - Transactional emails

### Infrastructure Services

9. **[Supabase](./supabase.md)**
   - PostgreSQL database
   - Authentication
   - Row Level Security (RLS)

10. **[Redis](./redis.md)**
    - State caching
    - Rate limiting
    - Session management

11. **[AWS Services](./aws.md)**
    - Lambda functions
    - SSM Parameter Store
    - S3 storage
    - EventBridge

## Privacy Statements

All integration documentation includes privacy statements (TAG: PRIVACY) that specify:
- Whether child-identifying data flows to the service
- Data protection measures implemented
- Compliance with COPPA/GDPR requirements

## Production Implementation Status

**Region**: us-east-1  
**Last Verified**: 2025-12-13  
**Integration Status**: ✅ All integrations operational in production

### Integration Deployment Details

- **API Keys & Credentials**: Stored in AWS SSM Parameter Store (`/storytailor/production/`)
- **Lambda Functions**: All integrations accessible via `storytailor-universal-agent-production` (us-east-1)
- **Webhook Endpoints**: Configured in production Lambda functions
- **Rate Limiting**: Implemented via Redis caching

### Integration Guides

- **[API Integration Guide](../api-reference/02-comprehensive-integration-guide.md)** - Complete API integration guide
- **[Webhook Guide](../api-reference/)** - Webhook setup and handling
- **[Authentication Guide](../api-reference/)** - API key and JWT authentication
- **[SDK Documentation](../platform/sdks/)** - Web, iOS, Android, React Native SDKs

## Related Documentation

- **Compliance:** See [Compliance Documentation](../compliance/README.md)
- **Smart Home Agent:** See [Smart Home Agent Documentation](../agents/smart-home-agent/README.md)
- **System Inventory:** See [System Inventory](../system/inventory.md)
- **API Reference:** See [API Reference Documentation](../api-reference/README.md)
- **Platform SDKs:** See [Platform SDKs](../platform/sdks/README.md)

# Enhanced Voice Platform Support for Universal Deployment

This document describes the enhanced voice platform support implemented in the Storytailor multi-agent system, enabling universal deployment across multiple voice assistants and future platforms.

## Overview

The enhanced voice platform support provides:

1. **Third-party skill embedding** for Alexa+, Google Assistant, and Apple Siri
2. **Webhook system** for platform integrations and event handling
3. **Universal platform adapter** for future voice assistants
4. **Smart home synchronization** across all voice platforms
5. **Platform-agnostic conversation management**

## Features

### 1. Third-Party Skill Embedding

Generate embedding code and configuration for deploying Storytailor as a third-party skill/action/shortcut on various platforms.

#### Supported Platforms

- **Amazon Alexa+**: Custom skills with multi-agent SDK integration
- **Google Assistant**: Actions on Google with smart home support
- **Apple Siri**: Shortcuts with HomeKit integration
- **Microsoft Cortana**: Skills with smart home capabilities

#### Usage Example

```typescript
import { PlatformAwareRouter } from '@alexa-multi-agent/router';
import { EmbeddingConfig } from '@alexa-multi-agent/shared-types/voice-platform';

const router = new PlatformAwareRouter(config);

const embeddingConfig: EmbeddingConfig = {
  invocationName: 'Storytailor',
  description: 'Create personalized stories with immersive smart home lighting',
  category: 'education_and_reference',
  keywords: ['storytelling', 'children', 'education', 'smart home'],
  privacyPolicyUrl: 'https://storytailor.com/privacy',
  termsOfUseUrl: 'https://storytailor.com/terms',
  supportedLocales: ['en-US', 'en-GB', 'en-CA'],
  targetAudience: 'family',
  contentRating: 'everyone',
  permissions: [
    {
      name: 'alexa::profile:email:read',
      reason: 'To link your Storytailor account',
      required: true
    }
  ],
  smartHomeIntegration: {
    supportedDeviceTypes: ['LIGHT', 'SWITCH'],
    supportedCapabilities: ['OnOff', 'Brightness', 'ColorControl'],
    requiresAccountLinking: true
  }
};

// Generate Alexa skill configuration
const alexaCode = await router.generateEmbeddingCode('alexa_plus', embeddingConfig);

// Generate Google Assistant action configuration
const googleCode = await router.generateEmbeddingCode('google_assistant', embeddingConfig);

// Generate Apple Siri shortcuts configuration
const siriCode = await router.generateEmbeddingCode('apple_siri', embeddingConfig);
```

### 2. Webhook System

Comprehensive webhook system for handling platform events and integrations.

#### Supported Events

- `skill_enabled` / `skill_disabled`
- `account_linked` / `account_unlinked`
- `smart_home_discovery` / `smart_home_control`
- `conversation_started` / `conversation_ended`
- `error_occurred`

#### Usage Example

```typescript
import { WebhookConfig } from '@alexa-multi-agent/shared-types/voice-platform';

const webhookConfig: WebhookConfig = {
  url: 'https://api.storytailor.com/webhooks/platform-events',
  events: [
    { type: 'skill_enabled' },
    { type: 'account_linked' },
    { type: 'smart_home_discovery' }
  ],
  secret: process.env.WEBHOOK_SECRET,
  retryPolicy: {
    maxRetries: 3,
    backoffMultiplier: 2,
    initialDelayMs: 1000,
    maxDelayMs: 30000
  },
  authentication: {
    type: 'hmac_signature',
    credentials: {
      secret: process.env.WEBHOOK_SECRET
    }
  }
};

// Set up webhook for Alexa
const alexaWebhook = await router.setupWebhook('alexa_plus', webhookConfig);

// Handle incoming webhook
app.post('/webhooks/:platform', async (req, res) => {
  try {
    const platform = req.params.platform;
    const payload = req.body;
    const headers = req.headers;
    
    const result = await router.handleWebhook(platform, payload, headers);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 3. Universal Platform Adapter

Support for future voice platforms through configurable adapters.

#### Usage Example

```typescript
import { UniversalPlatformConfig } from '@alexa-multi-agent/shared-types/voice-platform';

const universalConfig: UniversalPlatformConfig = {
  platformName: 'custom_voice_assistant',
  version: '1.0',
  capabilities: ['smart_home', 'voice_synthesis', 'webhook_support'],
  requestFormat: 'json',
  responseFormat: 'json',
  authentication: {
    type: 'bearer_token',
    config: {
      tokenHeader: 'Authorization',
      tokenPrefix: 'Bearer '
    }
  },
  endpoints: {
    conversation: 'https://api.custom-assistant.com/conversation',
    smartHome: 'https://api.custom-assistant.com/smart-home',
    webhook: 'https://api.custom-assistant.com/webhooks'
  },
  requestMapping: {
    userId: 'user.id',
    sessionId: 'session.id',
    intent: 'request.intent.name',
    parameters: 'request.intent.parameters'
  },
  responseMapping: {
    speech: 'response.outputSpeech.text',
    shouldEndSession: 'response.shouldEndSession'
  }
};

// Register the universal platform
router.registerUniversalPlatform('custom_voice_assistant', universalConfig);

// Handle requests from the custom platform
const response = await router.handleRequest(customRequest, 'custom_voice_assistant');
```

### 4. Smart Home Synchronization

Synchronize smart home actions across all connected voice platforms.

#### Usage Example

```typescript
// Synchronize story environment across all platforms
const smartHomeAction = {
  type: 'set_story_environment',
  storyType: 'bedtime',
  userId: 'user_123',
  roomId: 'bedroom'
};

await router.synchronizeSmartHomeAcrossPlatforms('user_123', smartHomeAction);

// This will execute the action on all platforms that support smart home:
// - Alexa+ (via Smart Home Skill API)
// - Google Assistant (via Smart Home Actions)
// - Apple Siri (via HomeKit)
// - Any registered universal platforms with smart home support
```

## Database Schema

The enhanced voice platform support uses several database tables:

### webhook_registrations

Stores webhook configurations for each platform.

```sql
CREATE TABLE webhook_registrations (
  id UUID PRIMARY KEY,
  platform TEXT NOT NULL,
  config JSONB NOT NULL,
  status TEXT DEFAULT 'active',
  verification_token TEXT,
  last_delivery_timestamp TIMESTAMPTZ,
  last_delivery_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### platform_integration_events

Logs all platform integration events for monitoring and debugging.

```sql
CREATE TABLE platform_integration_events (
  id UUID PRIMARY KEY,
  platform TEXT NOT NULL,
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES users,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  processing_status TEXT DEFAULT 'processed'
);
```

### universal_platform_configs

Stores configurations for universal platform adapters.

```sql
CREATE TABLE universal_platform_configs (
  id UUID PRIMARY KEY,
  platform_name TEXT NOT NULL UNIQUE,
  version TEXT NOT NULL,
  capabilities TEXT[] DEFAULT '{}',
  authentication_config JSONB NOT NULL,
  endpoints JSONB NOT NULL,
  request_mapping JSONB NOT NULL,
  response_mapping JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);
```

### platform_embedding_configs

Stores embedding configurations for third-party deployments.

```sql
CREATE TABLE platform_embedding_configs (
  id UUID PRIMARY KEY,
  platform TEXT NOT NULL,
  invocation_name TEXT NOT NULL,
  description TEXT NOT NULL,
  permissions JSONB DEFAULT '[]',
  smart_home_integration JSONB,
  embedding_code TEXT,
  status TEXT DEFAULT 'draft'
);
```

## API Reference

### PlatformAwareRouter Methods

#### generateEmbeddingCode(platform, config)

Generate embedding code for third-party platform integration.

**Parameters:**
- `platform`: VoicePlatform - Target platform
- `config`: EmbeddingConfig - Embedding configuration

**Returns:** Promise<string> - Generated embedding code

#### setupWebhook(platform, webhookConfig)

Set up webhook for platform integration.

**Parameters:**
- `platform`: VoicePlatform - Target platform
- `webhookConfig`: WebhookConfig - Webhook configuration

**Returns:** Promise<WebhookResult> - Webhook setup result

#### handleWebhook(platform, payload, headers)

Handle incoming webhook from platform.

**Parameters:**
- `platform`: VoicePlatform - Source platform
- `payload`: WebhookPayload - Webhook payload
- `headers`: Record<string, string> - Request headers

**Returns:** Promise<any> - Processing result

#### registerUniversalPlatform(platformName, config)

Register a universal platform adapter.

**Parameters:**
- `platformName`: string - Platform name
- `config`: UniversalPlatformConfig - Platform configuration

#### synchronizeSmartHomeAcrossPlatforms(userId, action)

Synchronize smart home action across all platforms.

**Parameters:**
- `userId`: string - User ID
- `action`: SmartHomeAction - Smart home action to execute

**Returns:** Promise<void>

## Security Considerations

### Webhook Signature Validation

All webhooks are validated using platform-specific signature validation:

- **Alexa**: HMAC-SHA256 with skill secret
- **Google Assistant**: HMAC-SHA256 with action secret
- **Apple Siri**: HMAC-SHA256 with shortcut secret
- **Universal Platforms**: Configurable validation method

### Authentication

Each platform adapter supports different authentication methods:

- **Bearer Token**: For API-based platforms
- **OAuth 2.0**: For platforms requiring user consent
- **API Key**: For simple API authentication
- **HMAC Signature**: For webhook validation

### Data Privacy

All platform integrations comply with:

- **COPPA**: Enhanced protections for children under 13
- **GDPR**: Granular consent and data minimization
- **UK Children's Code**: Age-appropriate design principles

## Monitoring and Observability

### Metrics

The system tracks the following metrics:

- Webhook delivery success/failure rates
- Platform response times
- Smart home synchronization success rates
- Embedding code generation requests
- Platform-specific error rates

### Logging

All platform interactions are logged with:

- Platform name and version
- User ID (hashed for privacy)
- Request/response payloads (sanitized)
- Processing duration
- Error details (if any)

### Alerting

Alerts are configured for:

- Webhook delivery failures
- Platform authentication errors
- Smart home synchronization failures
- High error rates per platform

## Testing

### Unit Tests

Run the test suite:

```bash
npm test packages/router/src/__tests__/EnhancedVoicePlatformSupport.test.ts
```

### Integration Tests

Test with real platform endpoints:

```bash
npm run test:integration -- --testPathPattern=enhanced-voice-platform
```

### Example Usage

Run the example demonstration:

```bash
npm run example:enhanced-voice-platform
```

## Deployment

### Environment Variables

Required environment variables:

```bash
# Webhook secrets
ALEXA_WEBHOOK_SECRET=your-alexa-webhook-secret
GOOGLE_WEBHOOK_SECRET=your-google-webhook-secret
SIRI_WEBHOOK_SECRET=your-siri-webhook-secret

# Platform endpoints
ALEXA_SKILL_ENDPOINT=https://api.storytailor.com/alexa/webhook
GOOGLE_ACTIONS_WEBHOOK=https://api.storytailor.com/google/webhook
SIRI_WEBHOOK_ENDPOINT=https://api.storytailor.com/siri/webhook

# Smart home endpoints
ALEXA_SMART_HOME_ENDPOINT=https://api.storytailor.com/alexa/smarthome
GOOGLE_SMART_HOME_ENDPOINT=https://api.storytailor.com/google/smarthome
```

### Infrastructure

The enhanced voice platform support requires:

- **Database**: PostgreSQL with Supabase
- **Cache**: Redis for session management
- **Webhooks**: HTTPS endpoints for platform callbacks
- **Monitoring**: OpenTelemetry and Datadog integration

## Future Enhancements

### Planned Features

1. **Samsung Bixby** integration
2. **Amazon Echo Auto** support
3. **Google Nest Hub** visual enhancements
4. **Apple HomePod** spatial audio
5. **Microsoft Teams** integration

### Extensibility

The universal platform adapter makes it easy to add support for new voice platforms by:

1. Defining platform configuration
2. Mapping request/response formats
3. Implementing authentication
4. Setting up webhooks
5. Testing integration

## Support

For questions or issues with the enhanced voice platform support:

1. Check the [troubleshooting guide](./TROUBLESHOOTING.md)
2. Review the [API documentation](./API.md)
3. Run the example code to verify setup
4. Contact the development team

## License

This enhanced voice platform support is part of the Storytailor multi-agent system and is subject to the same licensing terms.
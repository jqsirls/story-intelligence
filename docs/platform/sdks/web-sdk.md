Status: Draft  
Audience: Partner  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 4 - Web SDK documentation with code references

# Storytailor Web SDK

## Overview

The Storytailor Web SDK provides an easy-to-use JavaScript/TypeScript interface for embedding Storytailor's storytelling capabilities into any web application.

**Package:** `packages/web-sdk/`
**Entry Point:** `packages/web-sdk/src/StorytellerWebSDK.ts`

**Code References:**
- `packages/web-sdk/src/StorytellerWebSDK.ts:1-823` - Complete SDK implementation
- `docs/storytailor/partner_integration.md:269-299` - Web SDK usage examples

## Installation

```bash
npm install @storytailor/web-sdk
```

**Code References:**
- `packages/web-sdk/package.json` - Package configuration

## Basic Usage

### Initialize SDK

```javascript
import { StorytellerWebSDK } from '@storytailor/web-sdk';

const sdk = new StorytellerWebSDK({
  apiKey: 'your-api-key',
  containerId: 'storyteller-container',
  // Production URL (us-east-1): https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws
  
  baseUrl: 'https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws', // Production URL
  voiceEnabled: true,
  smartHomeEnabled: true,
  offlineMode: true
});

await sdk.init();
```

**Code References:**
- `packages/web-sdk/src/StorytellerWebSDK.ts:80-122` - Constructor and initialization
- `packages/web-sdk/src/StorytellerWebSDK.ts:97-122` - init() method

### Send Message

```javascript
await sdk.sendMessage('Create an adventure story about a brave knight');
```

**Code References:**
- `packages/web-sdk/src/StorytellerWebSDK.ts:127-184` - sendMessage() implementation

### Voice Input

```javascript
await sdk.enableVoice();
await sdk.startVoiceRecording();
// ... user speaks ...
await sdk.stopVoiceRecording();
```

**Code References:**
- `packages/web-sdk/src/StorytellerWebSDK.ts:212-280` - Voice recording methods
- `packages/web-sdk/src/StorytellerWebSDK.ts:655-706` - Voice processing

## Configuration

### StorytellerConfig Interface

```typescript
interface StorytellerConfig {
  apiKey: string;
  baseUrl?: string;
  containerId: string;
  theme?: 'default' | 'child-friendly' | 'magical' | 'educational' | 'custom';
  voiceEnabled?: boolean;
  smartHomeEnabled?: boolean;
  offlineMode?: boolean;
  customization?: {
    colors?: {
      primary?: string;
      secondary?: string;
      accent?: string;
      background?: string;
      text?: string;
    };
    branding?: {
      logo?: string;
      name?: string;
    };
    features?: {
      showTypingIndicator?: boolean;
      showTimestamps?: boolean;
      allowFileUpload?: boolean;
      maxMessageLength?: number;
    };
  };
  parentalControls?: {
    enabled?: boolean;
    ageRestrictions?: {
      maxAge?: number;
      contentFiltering?: 'none' | 'mild' | 'strict';
      requireParentalApproval?: boolean;
    };
  };
  privacySettings?: {
    dataRetention?: 'minimal' | 'standard' | 'extended';
    consentLevel?: 'implicit' | 'explicit';
    coppaCompliant?: boolean;
  };
}
```

**Code References:**
- `packages/web-sdk/src/StorytellerWebSDK.ts:4-44` - Configuration interface

## Features

### Voice Support

**Enable Voice:**
```javascript
await sdk.enableVoice();
```

**Start Recording:**
```javascript
await sdk.startVoiceRecording();
```

**Stop Recording:**
```javascript
sdk.stopVoiceRecording();
```

**Code References:**
- `packages/web-sdk/src/StorytellerWebSDK.ts:212-280` - Voice methods
- `packages/web-sdk/src/StorytellerWebSDK.ts:625-636` - Voice initialization
- `packages/web-sdk/src/StorytellerWebSDK.ts:638-640` - Voice support detection

### Offline Mode

**Setup:**
```javascript
// Automatically enabled if offlineMode: true in config
// Messages are queued when offline and synced when online
```

**Code References:**
- `packages/web-sdk/src/StorytellerWebSDK.ts:723-769` - Offline support
- `packages/web-sdk/src/StorytellerWebSDK.ts:741-746` - Offline message queuing

### Smart Home Integration

**Configuration:**
```javascript
const sdk = new StorytellerWebSDK({
  // ...
  smartHomeEnabled: true
});
```

**Event Handling:**
```javascript
sdk.on('smartHomeAction', (actions) => {
  // Handle smart home actions
});
```

**Code References:**
- `packages/web-sdk/src/StorytellerWebSDK.ts:169-171` - Smart home action events

## Events

### Available Events

- `initialized` - SDK initialized
- `messageReceived` - Message received from storyteller
- `voiceEnabled` - Voice enabled
- `voiceDisabled` - Voice disabled
- `voiceRecordingStarted` - Voice recording started
- `voiceRecordingStopped` - Voice recording stopped
- `voiceProcessed` - Voice input processed
- `smartHomeAction` - Smart home action triggered
- `online` - Connection restored
- `offline` - Connection lost
- `error` - Error occurred
- `messagesCleared` - Messages cleared
- `destroyed` - SDK destroyed

**Code References:**
- `packages/web-sdk/src/StorytellerWebSDK.ts:66-78` - EventEmitter extension
- Various emit() calls throughout the SDK

## API Methods

### Conversation Management

- `init()` - Initialize SDK
- `sendMessage(content: string)` - Send text message
- `sendWelcomeMessage()` - Send welcome message
- `getMessages()` - Get conversation history
- `clearMessages()` - Clear conversation history
- `destroy()` - Destroy SDK instance

**Code References:**
- `packages/web-sdk/src/StorytellerWebSDK.ts:97-309` - Main API methods

### Voice Methods

- `enableVoice()` - Enable voice input/output
- `disableVoice()` - Disable voice
- `startVoiceRecording()` - Start recording
- `stopVoiceRecording()` - Stop recording

**Code References:**
- `packages/web-sdk/src/StorytellerWebSDK.ts:212-280` - Voice methods

## Integration Example

```javascript
import { StorytellerWebSDK } from '@storytailor/web-sdk';

const sdk = new StorytellerWebSDK({
  apiKey: 'your-api-key',
  containerId: 'storyteller-container',
  // Production URL (us-east-1): https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws
  
  baseUrl: 'https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws', // Production URL
  voiceEnabled: true,
  theme: 'child-friendly',
  customization: {
    colors: {
      primary: '#667eea',
      accent: '#ff6b6b'
    },
    branding: {
      name: 'My Storyteller'
    }
  }
});

await sdk.init();

sdk.on('messageReceived', (message) => {
  console.log('Message received:', message);
});

await sdk.sendMessage('Create an adventure story');
```

**Code References:**
- `packages/web-sdk/src/StorytellerWebSDK.ts:80-823` - Complete SDK implementation
- `docs/storytailor/partner_integration.md:279-295` - Integration examples

## Related Documentation

- **Partner Integration:** See [Partner Integration Guide](../../storytailor/partner_integration.md)
- **REST API:** See [REST API Documentation](./rest-api.md)
- **Widget:** See [Embeddable Widget](./widget.md)

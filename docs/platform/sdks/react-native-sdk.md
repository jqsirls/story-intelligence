Status: Draft  
Audience: Partner  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 4 - React Native SDK documentation with code references

# Storytailor React Native SDK

## Overview

The Storytailor React Native SDK provides cross-platform integration for React Native applications, enabling full access to Storytailor's storytelling capabilities on both iOS and Android.

**Package:** `packages/mobile-sdk-react-native/`
**Entry Point:** `packages/mobile-sdk-react-native/src/index.tsx`

**Code References:**
- `packages/mobile-sdk-react-native/src/index.tsx:1-650` - Complete SDK implementation
- [Partner Integration](../storytailor/partner-integration.md:356-367) - React Native SDK usage examples

## Installation

```bash
npm install @storytailor/react-native-sdk
```

**Code References:**
- `packages/mobile-sdk-react-native/package.json` - Package configuration

## Basic Usage

### Initialize SDK

```typescript
import StorytellerReactNativeSDK from '@storytailor/react-native-sdk';

const sdk = await StorytellerReactNativeSDK.initialize({
  // Production URL (us-east-1): https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws
  // Production URL (us-east-1): https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws
  apiBaseURL: 'https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws', // Production URL
  apiKey: 'your-api-key',
  enableVoice: true,
  enableOfflineMode: true,
  enablePushNotifications: true
});
```

**Code References:**
- `packages/mobile-sdk-react-native/src/index.tsx:321-331` - initialize() method
- `packages/mobile-sdk-react-native/src/index.tsx:28-34` - Configuration interface

### Start Conversation

```typescript
const session = await sdk.startConversation(
  'user-123',
  {
    enabled: true,
    ageRestrictions: {
      minimumAge: 3,
      maximumAge: 12,
      requireParentalConsent: true
    },
    contentFiltering: {
      level: 'safe',
      customFilters: []
    }
  }
);
```

**Code References:**
- `packages/mobile-sdk-react-native/src/index.tsx:418-424` - startConversation() method

### Send Message

```typescript
const response = await sdk.sendMessage('Create an adventure story');
```

**Code References:**
- `packages/mobile-sdk-react-native/src/index.tsx:429-432` - sendMessage() method

## Features

### Voice Support

**Start Recording:**
```typescript
await sdk.startVoiceRecording();
```

**Stop Recording:**
```typescript
const voiceResponse = await sdk.stopVoiceRecording();
```

**Code References:**
- `packages/mobile-sdk-react-native/src/index.tsx:445-456` - Voice recording methods
- `packages/mobile-sdk-react-native/src/index.tsx:357-385` - Permission handling

### Offline Mode

**Configuration:**
```typescript
const sdk = await StorytellerReactNativeSDK.initialize({
  // ...
  enableOfflineMode: true
});
```

**Sync Offline Data:**
```typescript
await sdk.syncOfflineData();
```

**Code References:**
- `packages/mobile-sdk-react-native/src/index.tsx:550-553` - syncOfflineData() method

### Push Notifications

**Register for Notifications:**
```typescript
await sdk.registerForPushNotifications();
```

**Code References:**
- `packages/mobile-sdk-react-native/src/index.tsx:558-561` - registerForPushNotifications() method

### Event Listeners

**Add Event Listener:**
```typescript
sdk.addEventListener('storyCompleted', (event) => {
  console.log('Story completed:', event.story);
});
```

**Available Events:**
- `storyCompleted` - Story finished
- `characterCreated` - Character created
- `voiceDetected` - Voice input detected
- `offlineSync` - Offline data synced
- `smartHomeAction` - Smart home action triggered
- `error` - Error occurred

**Code References:**
- `packages/mobile-sdk-react-native/src/index.tsx:292-298` - Event types
- `packages/mobile-sdk-react-native/src/index.tsx:397-401` - addEventListener() method

## React Hook

### useStorytellerSDK Hook

```typescript
import { useStorytellerSDK } from '@storytailor/react-native-sdk';

function MyComponent() {
  const { sdk, startConversation, sendMessage } = useStorytellerSDK();
  
  const handleSend = async () => {
    await sendMessage('Create a story');
  };
  
  return (
    // ... component JSX
  );
}
```

**Code References:**
- `packages/mobile-sdk-react-native/src/index.tsx:630-650` - useStorytellerSDK hook

## Related Documentation

- **Partner Integration:** See [Partner Integration Guide](../../storytailor/partner-integration.md)
- **iOS SDK:** See [iOS SDK Documentation](./ios-sdk.md)
- **Android SDK:** See [Android SDK Documentation](./android-sdk.md)

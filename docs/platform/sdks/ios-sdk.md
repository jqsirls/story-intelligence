Status: Draft  
Audience: Partner  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 4 - iOS SDK documentation with code references

# Storytailor iOS SDK

## Overview

The Storytailor iOS SDK provides native Swift integration for iOS applications, enabling full access to Storytailor's storytelling capabilities.

**Package:** `packages/mobile-sdk-ios/`
**Entry Point:** `packages/mobile-sdk-ios/Sources/StorytellerSDK.swift`

**Code References:**
- `packages/mobile-sdk-ios/Sources/StorytellerSDK.swift:1-363` - Complete SDK implementation
- `docs/storytailor/partner_integration.md:300-339` - iOS SDK usage examples

## Installation

### Swift Package Manager

```swift
// Package.swift
dependencies: [
    .package(url: "https://github.com/storytailor/mobile-sdk-ios", from: "1.0.0")
]
```

**Code References:**
- `packages/mobile-sdk-ios/package.json` - Package configuration

## Basic Usage

### Initialize SDK

```swift
import StorytellerSDK

let config = StorytellerSDK.Configuration(
    // Production URL (us-east-1): https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws
    // Production URL (us-east-1): https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws
    apiBaseURL: "https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws", // Production URL
    apiKey: "your-api-key",
    enableVoice: true,
    enableOfflineMode: true,
    enablePushNotifications: true
)

let sdk = StorytellerSDK(configuration: config)
try await sdk.initialize()
```

**Code References:**
- `packages/mobile-sdk-ios/Sources/StorytellerSDK.swift:25-48` - Configuration struct
- `packages/mobile-sdk-ios/Sources/StorytellerSDK.swift:64-74` - Initialization
- `packages/mobile-sdk-ios/Sources/StorytellerSDK.swift:86-95` - initialize() method

### Start Conversation

```swift
let session = try await sdk.startConversation(
    userId: "user-123",
    parentalControls: ParentalControls.default
)
```

**Code References:**
- `packages/mobile-sdk-ios/Sources/StorytellerSDK.swift:98-124` - startConversation() method

### Send Message

```swift
let response = try await sdk.sendMessage("Create an adventure story")
```

**Code References:**
- `packages/mobile-sdk-ios/Sources/StorytellerSDK.swift:127-148` - sendMessage() method

## Features

### Voice Support

**Send Voice Input:**
```swift
let audioData = // ... audio data
let voiceResponse = try await sdk.sendVoiceMessage(audioData: audioData)
```

**Code References:**
- `packages/mobile-sdk-ios/Sources/StorytellerSDK.swift:150-213` - Voice methods

### Offline Mode

**Configuration:**
```swift
let config = StorytellerSDK.Configuration(
    // ...
    enableOfflineMode: true
)
```

**Sync Offline Data:**
```swift
try await sdk.syncOfflineData()
```

**Code References:**
- `packages/mobile-sdk-ios/Sources/StorytellerSDK.swift:28-29` - Offline mode configuration

### Push Notifications

**Configuration:**
```swift
let config = StorytellerSDK.Configuration(
    // ...
    enablePushNotifications: true
)
```

**Register for Notifications:**
```swift
try await sdk.registerForPushNotifications()
```

**Code References:**
- `packages/mobile-sdk-ios/Sources/StorytellerSDK.swift:30-31` - Push notifications configuration

## API Methods

### Conversation Management

- `initialize()` - Initialize SDK
- `startConversation(userId:parentalControls:)` - Start new conversation
- `sendMessage(_:)` - Send text message
- `sendVoiceMessage(audioData:)` - Send voice input
- `endConversation()` - End conversation

**Code References:**
- `packages/mobile-sdk-ios/Sources/StorytellerSDK.swift:86-213` - Main API methods

### Story Management

- `getStories(libraryId:)` - Get user's stories
- `createStory(request:)` - Create new story

**Code References:**
- `packages/mobile-sdk-ios/Sources/StorytellerSDK.swift` - Story methods (referenced in types)

### Smart Home

- `connectSmartDevice(config:)` - Connect smart home device

**Code References:**
- `packages/mobile-sdk-ios/Sources/StorytellerSDK.swift` - Smart home methods (referenced in types)

## Related Documentation

- **Partner Integration:** See [Partner Integration Guide](../../storytailor/partner_integration.md)
- **Android SDK:** See [Android SDK Documentation](./android-sdk.md)
- **React Native SDK:** See [React Native SDK Documentation](./react-native-sdk.md)

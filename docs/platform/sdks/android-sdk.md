Status: Draft  
Audience: Partner  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 4 - Android SDK documentation with code references

# Storytailor Android SDK

## Overview

The Storytailor Android SDK provides native Kotlin integration for Android applications, enabling full access to Storytailor's storytelling capabilities.

**Package:** `packages/mobile-sdk-android/`
**Entry Point:** `packages/mobile-sdk-android/src/main/kotlin/com/storytailor/sdk/StorytellerSDK.kt`

**Code References:**
- `packages/mobile-sdk-android/` - Android SDK package
- `docs/storytailor/partner_integration.md:341-355` - Android SDK usage examples

## Installation

### Gradle

```kotlin
// build.gradle.kts
dependencies {
    implementation("com.storytailor:mobile-sdk-android:1.0.0")
}
```

**Code References:**
- `packages/mobile-sdk-android/` - Package structure

## Basic Usage

### Initialize SDK

```kotlin
import com.storytailor.sdk.StorytellerSDK

val config = StorytellerSDK.Configuration(
    // Production URL (us-east-1): https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws
    // Production URL (us-east-1): https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws
    apiBaseURL = "https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws", // Production URL
    apiKey = "your-api-key",
    enableVoice = true,
    enableOfflineMode = true,
    enablePushNotifications = true
)

val sdk = StorytellerSDK(configuration = config)
sdk.initialize()
```

**Code References:**
- `packages/mobile-sdk-android/` - SDK implementation

## Features

### Voice Support

Voice input/output support for Android applications.

**Code References:**
- `packages/mobile-sdk-android/` - Voice implementation

### Offline Mode

Offline message queuing and synchronization.

**Code References:**
- `packages/mobile-sdk-android/` - Offline mode implementation

### Push Notifications

Push notification support for Android.

**Code References:**
- `packages/mobile-sdk-android/` - Push notifications implementation

## Related Documentation

- **Partner Integration:** See [Partner Integration Guide](../../storytailor/partner_integration.md)
- **iOS SDK:** See [iOS SDK Documentation](./ios-sdk.md)
- **React Native SDK:** See [React Native SDK Documentation](./react-native-sdk.md)

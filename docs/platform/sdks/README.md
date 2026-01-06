Status: Draft  
Audience: Partner | Internal  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 4 - SDKs index with code references

# Storytailor SDKs

## Overview

Storytailor provides official SDKs for multiple platforms to simplify integration with the Storytailor platform and Story Intelligence™.

## Available SDKs

1. **[Web SDK](./web-sdk.md)** - JavaScript/TypeScript SDK for web applications
2. **[iOS SDK](./ios-sdk.md)** - Native iOS SDK (Swift)
3. **[Android SDK](./android-sdk.md)** - Native Android SDK (Kotlin)
4. **[React Native SDK](./react-native-sdk.md)** - Cross-platform mobile SDK

## Quick Links

- **Web SDK:** `packages/web-sdk/src/StorytellerWebSDK.ts`
- **iOS SDK:** `packages/mobile-sdk-ios/Sources/StorytellerSDK.swift`
- **Android SDK:** `packages/mobile-sdk-android/src/main/kotlin/com/storytailor/sdk/StorytellerSDK.kt`
- **React Native SDK:** `packages/mobile-sdk-react-native/src/index.tsx`

## Common Features

All SDKs support:
- Story creation and management
- Character creation and management
- Voice input/output
- Offline mode
- Smart home integration
- Parental controls
- Privacy settings
- Real-time streaming

## Production Status

**Region**: us-east-1  
**API Base URL**: Production API endpoints in us-east-1  
**Last Updated**: 2025-12-13

## SDK Package Locations

- **Web SDK**: `packages/web-sdk/`
- **iOS SDK**: `packages/mobile-sdk-ios/`
- **Android SDK**: `packages/mobile-sdk-android/`
- **React Native SDK**: `packages/mobile-sdk-react-native/`
- **Embed Widget**: `packages/storytailor-embed/`

## Related Documentation

- **Partner Integration:** See [Partner Integration Guide](../../storytailor/partner_integration.md)
- **REST API:** See [REST API Documentation](./rest-api.md)
- **Widget:** See [Embeddable Widget](../widget.md)
- **Package Documentation:** See [Package Documentation](../../packages/README.md)
- **API Reference:** See [API Reference Documentation](../../api-reference/README.md)

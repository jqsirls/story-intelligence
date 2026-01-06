# Storytailor SDKs - What

**Status**: ✅ Active
**Last Updated**: 2025-12-17

## Core Functionality

Storytailor SDKs provide native and web integration libraries that simplify integration with the Storytailor platform and Story Intelligence™. SDKs abstract away API complexity and provide platform-specific optimizations for developers.

## Available SDKs

1. **Web SDK** - JavaScript/TypeScript SDK for web applications
2. **iOS SDK** - Native iOS SDK (Swift)
3. **Android SDK** - Native Android SDK (Kotlin)
4. **React Native SDK** - Cross-platform mobile SDK

## Technical Architecture

### Common Architecture Across Platforms

All SDKs follow a similar architecture pattern:

- **SDK Client**: Main SDK class/object for initialization and configuration
- **API Client**: Handles HTTP requests to Storytailor REST API
- **Models**: Type-safe data models for requests and responses
- **Error Handling**: Consistent error handling across platforms
- **Authentication**: Token management and refresh
- **Caching**: Local caching for offline support
- **Event System**: Event emitters/listeners for real-time updates

### Platform-Specific Implementations

**Web SDK** (`packages/web-sdk/`):
- TypeScript/JavaScript implementation
- Browser and Node.js support
- WebSocket support for real-time updates
- LocalStorage for caching

**iOS SDK** (`packages/mobile-sdk-ios/`):
- Native Swift implementation
- CocoaPods and Swift Package Manager support
- Core Data for local storage
- URLSession for networking

**Android SDK** (`packages/mobile-sdk-android/`):
- Native Kotlin implementation
- Maven/Gradle support
- Room database for local storage
- OkHttp for networking

**React Native SDK** (`packages/mobile-sdk-react-native/`):
- TypeScript/JavaScript implementation
- React Native bridge for native modules
- AsyncStorage for local storage
- Fetch API for networking

## Key Features

### Common Features Across All SDKs

- **Story Management**: Create, read, update, and delete stories
- **Character Management**: Create and manage characters
- **Voice Input/Output**: Voice recording and playback
- **Offline Mode**: Local caching and offline support
- **Smart Home Integration**: Control smart home devices (Philips Hue, etc.)
- **Parental Controls**: Parental control configuration and management
- **Privacy Settings**: Privacy and data retention settings
- **Real-Time Streaming**: Real-time updates via WebSocket/SSE
- **Error Handling**: Comprehensive error handling with retry logic
- **Type Safety**: Type-safe APIs (TypeScript, Swift, Kotlin)

### Platform-Specific Features

**Web SDK**:
- Browser-based voice recording
- WebSocket real-time updates
- LocalStorage caching
- Service Worker support for offline

**iOS SDK**:
- Native iOS UI components
- Core Data integration
- Background task support
- Siri integration

**Android SDK**:
- Native Android UI components
- Room database integration
- Background service support
- Google Assistant integration

**React Native SDK**:
- Cross-platform UI components
- React Native bridge
- Platform-specific optimizations
- Expo support

## Code References

- **Web SDK**: `packages/web-sdk/src/StorytellerWebSDK.ts`
- **iOS SDK**: `packages/mobile-sdk-ios/Sources/StorytellerSDK.swift`
- **Android SDK**: `packages/mobile-sdk-android/src/main/kotlin/com/storytailor/sdk/StorytellerSDK.kt`
- **React Native SDK**: `packages/mobile-sdk-react-native/src/index.tsx`

## Integration Points

### Internal Systems

- **REST API**: All SDKs communicate with Storytailor REST API
- **WebSocket/SSE**: Real-time updates via WebSocket (Web) or SSE (Mobile)
- **Authentication Service**: Token management and refresh
- **Storage Service**: Local caching and offline support

### External Systems

- **Package Managers**: NPM (Web, React Native), CocoaPods/SPM (iOS), Maven/Gradle (Android)
- **CDN**: Optional CDN distribution for Web SDK
- **App Stores**: iOS App Store, Google Play Store (for SDK distribution)

## Related Documentation

- [Web SDK](./web-sdk.md) - Web SDK details
- [iOS SDK](./ios-sdk.md) - iOS SDK details
- [Android SDK](./android-sdk.md) - Android SDK details
- [React Native SDK](./react-native-sdk.md) - React Native SDK details
- [REST API](./rest-api.md) - REST API documentation

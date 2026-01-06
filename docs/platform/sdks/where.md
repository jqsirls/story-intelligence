# Storytailor SDKs - Where

**Last Updated**: 2025-12-17

## Package Locations

SDKs are distributed via standard package managers and are also available in the monorepo:

### Source Code Locations

- **Web SDK**: `packages/web-sdk/`
- **iOS SDK**: `packages/mobile-sdk-ios/`
- **Android SDK**: `packages/mobile-sdk-android/`
- **React Native SDK**: `packages/mobile-sdk-react-native/`

## Distribution Channels

### Web SDK

**NPM Package**: `@storytailor/web-sdk`

**Installation**:
```bash
npm install @storytailor/web-sdk
# or
yarn add @storytailor/web-sdk
```

**CDN** (Optional):
```html
<script src="https://cdn.storytailor.com/sdk/v1/web-sdk.js"></script>
```

**Code References:**
- `packages/web-sdk/package.json` - Package configuration
- `packages/web-sdk/src/StorytellerWebSDK.ts` - Main SDK class

### iOS SDK

**CocoaPods**:
```ruby
pod 'StorytellerSDK', '~> 1.0'
```

**Swift Package Manager**:
```swift
dependencies: [
    .package(url: "https://github.com/storytailor/mobile-sdk-ios.git", from: "1.0.0")
]
```

**Code References:**
- `packages/mobile-sdk-ios/Package.swift` - Swift Package Manager configuration
- `packages/mobile-sdk-ios/StorytellerSDK.podspec` - CocoaPods configuration

### Android SDK

**Maven**:
```xml
<dependency>
    <groupId>com.storytailor</groupId>
    <artifactId>storyteller-sdk</artifactId>
    <version>1.0.0</version>
</dependency>
```

**Gradle**:
```gradle
implementation 'com.storytailor:storyteller-sdk:1.0.0'
```

**Code References:**
- `packages/mobile-sdk-android/build.gradle` - Gradle configuration
- `packages/mobile-sdk-android/pom.xml` - Maven configuration

### React Native SDK

**NPM Package**: `@storytailor/react-native-sdk`

**Installation**:
```bash
npm install @storytailor/react-native-sdk
# or
yarn add @storytailor/react-native-sdk
```

**Code References:**
- `packages/mobile-sdk-react-native/package.json` - Package configuration
- `packages/mobile-sdk-react-native/src/index.tsx` - Main SDK entry point

## Version Management

### Semantic Versioning

All SDKs follow semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Version Compatibility

- **API Compatibility**: SDKs maintain backward compatibility within major versions
- **Platform Compatibility**: SDKs support current and previous platform versions
- **Deprecation Policy**: Breaking changes require deprecation notices and migration guides

## Deployment Targets

### Web SDK

- **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge)
- **Node.js Support**: Node.js 18+ for server-side usage
- **Framework Support**: React, Vue, Angular, vanilla JavaScript

### iOS SDK

- **iOS Version**: iOS 13.0+
- **Swift Version**: Swift 5.0+
- **Xcode Version**: Xcode 14.0+

### Android SDK

- **Android Version**: Android API 21+ (Android 5.0+)
- **Kotlin Version**: Kotlin 1.8+
- **Gradle Version**: Gradle 7.0+

### React Native SDK

- **React Native Version**: React Native 0.70+
- **Platform Support**: iOS 13.0+, Android API 21+

## CDN Locations

### Web SDK CDN (Optional)

- **Primary CDN**: `https://cdn.storytailor.com/sdk/v1/web-sdk.js`
- **Versioned**: `https://cdn.storytailor.com/sdk/v1.0.0/web-sdk.js`
- **Minified**: `https://cdn.storytailor.com/sdk/v1/web-sdk.min.js`

## Related Documentation

- [SDKs Overview](./README.md) - SDK overview
- [SDKs What](./what.md) - Detailed functionality
- [Web SDK](./web-sdk.md) - Web SDK installation and usage
- [iOS SDK](./ios-sdk.md) - iOS SDK installation and usage
- [Android SDK](./android-sdk.md) - Android SDK installation and usage
- [React Native SDK](./react-native-sdk.md) - React Native SDK installation and usage

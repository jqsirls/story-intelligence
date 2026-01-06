# Storytailor SDKs - When

**Last Updated**: 2025-12-17

## When to Use SDKs

Use SDKs when:

1. **Native App Integration**: Building native mobile apps (iOS, Android) or web applications that need deep integration with Storytailor
2. **Custom UI Requirements**: Need full control over UI/UX and want to build custom interfaces
3. **Platform-Specific Features**: Need access to platform-specific features (native UI components, background tasks, etc.)
4. **Type Safety**: Want type-safe APIs with IDE autocomplete and compile-time error checking
5. **Offline Support**: Need offline functionality with local caching
6. **Performance Optimization**: Require platform-specific performance optimizations

## When NOT to Use SDKs

Do NOT use SDKs for:

- ❌ **Quick Integration**: Use Widget instead for quick, zero-code integration
- ❌ **Simple Web Integration**: Use Widget for simple web embedding without custom UI
- ❌ **Direct API Access**: Use REST API directly for server-side integration or custom implementations
- ❌ **Testing/Prototyping**: Use Widget or REST API for quick testing and prototyping

## Integration Method Comparison

| Feature | SDKs | REST API | Widget |
|---------|------|----------|--------|
| **Use Case** | Native apps, custom UI | Server-side, custom implementation | Quick web integration |
| **Setup Complexity** | Medium (package installation) | Low (HTTP requests) | Very Low (script tag) |
| **UI Control** | Full control | No UI (API only) | Limited (theming only) |
| **Type Safety** | ✅ Yes (TypeScript, Swift, Kotlin) | ❌ No (manual types) | ❌ No (JavaScript) |
| **Offline Support** | ✅ Yes | ❌ No | ❌ No |
| **Platform Features** | ✅ Native features | ❌ No | ❌ No |
| **Performance** | ✅ Optimized | Medium | Medium |
| **Best For** | Native apps, custom UI | Server-side, automation | Quick web integration |

## Integration Scenarios

### Scenario 1: Native iOS App

**When**: Building a native iOS app that needs Storytailor integration

**How**: Use iOS SDK (Swift) via CocoaPods or Swift Package Manager

**Example**:
```swift
import StorytellerSDK

let sdk = StorytellerSDK(apiKey: "your-api-key")
await sdk.initialize()

// Create a story
let story = try await sdk.createStory(
  characterId: "char_123",
  storyType: .adventure
)
```

**Use Cases**:
- Native iOS apps with custom UI
- Apps requiring iOS-specific features (Siri, background tasks)
- Apps needing offline support

### Scenario 2: Native Android App

**When**: Building a native Android app that needs Storytailor integration

**How**: Use Android SDK (Kotlin) via Maven or Gradle

**Example**:
```kotlin
import com.storytailor.sdk.StorytellerSDK

val sdk = StorytellerSDK(apiKey = "your-api-key")
sdk.initialize()

// Create a story
val story = sdk.createStory(
  characterId = "char_123",
  storyType = StoryType.ADVENTURE
)
```

**Use Cases**:
- Native Android apps with custom UI
- Apps requiring Android-specific features (Google Assistant, background services)
- Apps needing offline support

### Scenario 3: Web Application

**When**: Building a web application (React, Vue, Angular, etc.) that needs Storytailor integration

**How**: Use Web SDK (TypeScript/JavaScript) via NPM

**Example**:
```typescript
import { StorytellerWebSDK } from '@storytailor/web-sdk';

const sdk = new StorytellerWebSDK({
  apiKey: 'your-api-key',
  apiBaseURL: 'https://api.storytailor.dev'
});

await sdk.initialize();

// Create a story
const story = await sdk.createStory({
  characterId: 'char_123',
  storyType: 'adventure'
});
```

**Use Cases**:
- Web applications with custom UI
- React, Vue, Angular applications
- Progressive Web Apps (PWAs)

### Scenario 4: Cross-Platform Mobile App

**When**: Building a cross-platform mobile app (React Native, Flutter, etc.)

**How**: Use React Native SDK for React Native apps

**Example**:
```typescript
import StorytellerSDK from '@storytailor/react-native-sdk';

const sdk = new StorytellerSDK({
  apiKey: 'your-api-key'
});

await sdk.initialize();

// Create a story
const story = await sdk.createStory({
  characterId: 'char_123',
  storyType: 'adventure'
});
```

**Use Cases**:
- React Native apps
- Cross-platform mobile development
- Shared codebase for iOS and Android

## Usage Guidelines

### Best Practices

- **Choose the Right SDK**: Select the SDK that matches your platform (iOS, Android, Web, React Native)
- **Use Type Safety**: Leverage TypeScript, Swift, or Kotlin type safety for better developer experience
- **Implement Offline Support**: Use SDK caching features for offline functionality
- **Handle Errors Gracefully**: Implement proper error handling with retry logic
- **Optimize Performance**: Use platform-specific optimizations (background tasks, caching, etc.)
- **Follow Platform Guidelines**: Respect platform-specific UI/UX guidelines (iOS Human Interface Guidelines, Material Design)

### Common Pitfalls

- **Avoid Using SDK for Simple Integration**: Use Widget for simple web embedding
- **Don't Mix Integration Methods**: Choose one integration method (SDK, REST API, or Widget) and stick with it
- **Don't Ignore Platform Guidelines**: Follow platform-specific best practices
- **Avoid Bypassing SDK Features**: Use SDK features (caching, offline support) instead of reimplementing

### Integration Checklist

Before integrating with SDKs:

- ✅ Choose the appropriate SDK for your platform
- ✅ Install SDK via package manager (NPM, CocoaPods, Maven, etc.)
- ✅ Obtain API key from Storytailor
- ✅ Initialize SDK with proper configuration
- ✅ Test basic functionality (create story, list stories)
- ✅ Implement error handling
- ✅ Test offline functionality (if needed)
- ✅ Review platform-specific documentation

## Related Documentation

- [SDKs Overview](./README.md) - SDK overview
- [SDKs What](./what.md) - Detailed functionality
- [Web SDK](./web-sdk.md) - Web SDK details
- [iOS SDK](./ios-sdk.md) - iOS SDK details
- [Android SDK](./android-sdk.md) - Android SDK details
- [React Native SDK](./react-native-sdk.md) - React Native SDK details
- [REST API](./rest-api.md) - For server-side integration
- [Widget](../widget.md) - For quick web integration

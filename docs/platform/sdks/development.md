# Storytailor SDKs - Development Guide

**Status**: ✅ Active
**Last Updated**: 2025-12-17

## Local Development Setup

1. **Clone and Install**:
   ```bash
   git clone [repository-url]
   cd Storytailor-Agent
   npm install
   ```

2. **Build All SDKs**:
   ```bash
   npm run build
   # Or build specific SDK
   cd packages/web-sdk && npm run build
   cd packages/mobile-sdk-ios && swift build
   cd packages/mobile-sdk-android && ./gradlew build
   cd packages/mobile-sdk-react-native && npm run build
   ```

3. **Run Tests**:
   ```bash
   # Web SDK
   cd packages/web-sdk && npm test
   
   # iOS SDK
   cd packages/mobile-sdk-ios && swift test
   
   # Android SDK
   cd packages/mobile-sdk-android && ./gradlew test
   
   # React Native SDK
   cd packages/mobile-sdk-react-native && npm test
   ```

## Code Structure

### Web SDK

```
packages/web-sdk/
├── src/
│   ├── StorytellerWebSDK.ts    # Main SDK class
│   ├── api/                     # API client
│   ├── models/                  # Type definitions
│   ├── cache/                   # Caching layer
│   └── __tests__/               # Test files
└── package.json
```

**Key Components**:
- **StorytellerWebSDK**: Main SDK class with initialization and configuration
- **APIClient**: HTTP client for REST API calls
- **CacheManager**: LocalStorage caching for offline support
- **WebSocketClient**: WebSocket client for real-time updates

**Code Reference**: `packages/web-sdk/src/StorytellerWebSDK.ts`

### iOS SDK

```
packages/mobile-sdk-ios/
├── Sources/
│   └── StorytellerSDK/
│       ├── StorytellerSDK.swift  # Main SDK class
│       ├── API/                  # API client
│       ├── Models/               # Data models
│       └── Cache/                # Core Data caching
└── Package.swift
```

**Key Components**:
- **StorytellerSDK**: Main SDK class
- **APIClient**: URLSession-based HTTP client
- **CacheManager**: Core Data integration for local storage
- **BackgroundTaskManager**: Background task support

**Code Reference**: `packages/mobile-sdk-ios/Sources/StorytellerSDK/StorytellerSDK.swift`

### Android SDK

```
packages/mobile-sdk-android/
├── src/main/kotlin/com/storytailor/sdk/
│   ├── StorytellerSDK.kt         # Main SDK class
│   ├── api/                      # API client
│   ├── models/                   # Data models
│   └── cache/                    # Room database caching
└── build.gradle
```

**Key Components**:
- **StorytellerSDK**: Main SDK class
- **APIClient**: OkHttp-based HTTP client
- **CacheManager**: Room database integration for local storage
- **BackgroundService**: Background service support

**Code Reference**: `packages/mobile-sdk-android/src/main/kotlin/com/storytailor/sdk/StorytellerSDK.kt`

### React Native SDK

```
packages/mobile-sdk-react-native/
├── src/
│   ├── index.tsx                 # Main SDK entry point
│   ├── api/                      # API client
│   ├── models/                   # Type definitions
│   └── __tests__/                # Test files
└── package.json
```

**Key Components**:
- **StorytellerSDK**: Main SDK class
- **APIClient**: Fetch-based HTTP client
- **CacheManager**: AsyncStorage for local caching
- **NativeBridge**: React Native bridge for native modules

**Code Reference**: `packages/mobile-sdk-react-native/src/index.tsx`

## API Reference

### Common API Methods (All SDKs)

**Initialize SDK**:
```typescript
// Web SDK
const sdk = new StorytellerWebSDK({
  apiKey: 'your-api-key',
  apiBaseURL: 'https://api.storytailor.dev'
});
await sdk.initialize();
```

**Create Story**:
```typescript
const story = await sdk.createStory({
  characterId: 'char_123',
  storyType: 'adventure'
});
```

**List Stories**:
```typescript
const stories = await sdk.listStories({
  limit: 10,
  offset: 0
});
```

**Get Story**:
```typescript
const story = await sdk.getStory('story_123');
```

**Update Story**:
```typescript
const updatedStory = await sdk.updateStory('story_123', {
  title: 'New Title'
});
```

**Delete Story**:
```typescript
await sdk.deleteStory('story_123');
```

## Testing

### Running Tests

**Web SDK**:
```bash
cd packages/web-sdk
npm test
npm run test:coverage
```

**iOS SDK**:
```bash
cd packages/mobile-sdk-ios
swift test
```

**Android SDK**:
```bash
cd packages/mobile-sdk-android
./gradlew test
```

**React Native SDK**:
```bash
cd packages/mobile-sdk-react-native
npm test
```

### Test Structure

- **Unit Tests**: Test individual SDK methods and components
- **Integration Tests**: Test SDK integration with REST API
- **E2E Tests**: Test complete workflows with actual API

## Common Workflows

### Workflow 1: Adding a New SDK Method

1. **Define Method in SDK Class**:
   ```typescript
   // Web SDK example
   async createCharacter(params: CreateCharacterParams): Promise<Character> {
     return await this.apiClient.post('/characters', params);
   }
   ```

2. **Add Type Definitions**:
   ```typescript
   interface CreateCharacterParams {
     name: string;
     age: number;
     personality: string;
   }
   ```

3. **Update All Platforms**: Implement method in iOS, Android, and React Native SDKs

4. **Add Tests**: Write unit and integration tests

5. **Update Documentation**: Add method to API reference

### Workflow 2: Testing SDK Integration

1. **Initialize SDK** with test API key
2. **Test Basic Operations**: Create, read, update, delete
3. **Test Error Handling**: Invalid requests, network errors
4. **Test Offline Mode**: Disable network, test caching
5. **Test Real-Time Updates**: WebSocket/SSE connections

## Troubleshooting

### Issue 1: SDK Initialization Failed

**Symptoms**: SDK fails to initialize

**Solution**:
- Verify API key is valid
- Check API base URL is correct
- Verify network connectivity
- Check SDK version compatibility

### Issue 2: Type Errors

**Symptoms**: TypeScript/Swift/Kotlin type errors

**Solution**:
- Update SDK to latest version
- Check type definitions are up to date
- Verify API response matches type definitions

### Issue 3: Offline Mode Not Working

**Symptoms**: Caching not working, offline requests failing

**Solution**:
- Verify caching is enabled in SDK configuration
- Check local storage permissions (browser, mobile)
- Verify cache implementation is correct

## Related Documentation

- [SDKs Overview](./README.md) - SDK overview
- [SDKs What](./what.md) - Detailed functionality
- [Web SDK](./web-sdk.md) - Web SDK details
- [iOS SDK](./ios-sdk.md) - iOS SDK details
- [Android SDK](./android-sdk.md) - Android SDK details
- [React Native SDK](./react-native-sdk.md) - React Native SDK details

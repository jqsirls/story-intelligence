# Storyteller iOS SDK

The Storyteller iOS SDK provides native iOS integration for Story Intelligence™ powered storytelling experiences. Built with Swift, it offers voice processing, offline capabilities, push notifications, and smart home integration.

## Features

- **Native Voice Processing**: Real-time speech recognition and synthesis using AVFoundation and Speech frameworks
- **Offline Story Creation**: Continue creating stories even without internet connection with automatic sync
- **Push Notifications**: Get notified when stories are completed with rich notification support
- **Smart Home Integration**: Synchronize story environments with smart lighting
- **Privacy-First Design**: COPPA, GDPR, and UK Children's Code compliant by design
- **Real-time Updates**: WebSocket-based real-time conversation updates

## Requirements

- iOS 14.0+
- Xcode 12.0+
- Swift 5.3+

## Installation

### Swift Package Manager

Add the following to your `Package.swift` file:

```swift
dependencies: [
    .package(url: "https://github.com/storyteller/ios-sdk.git", from: "1.0.0")
]
```

Or add it through Xcode:
1. File → Add Package Dependencies
2. Enter: `https://github.com/storyteller/ios-sdk.git`

### CocoaPods

Add to your `Podfile`:

```ruby
pod 'StorytellerSDK', '~> 1.0'
```

## Quick Start

### 1. Initialize the SDK

```swift
import StorytellerSDK

let configuration = StorytellerSDK.Configuration(
    apiBaseURL: "https://api.storyteller.com",
    apiKey: "your-api-key",
    enableVoice: true,
    enableOfflineMode: true,
    enablePushNotifications: true
)

let sdk = StorytellerSDK(configuration: configuration)

// Initialize in your app delegate or scene delegate
try await sdk.initialize()
```

### 2. Start a Conversation

```swift
let session = try await sdk.startConversation(
    userId: "user123",
    parentalControls: ParentalControls.default
)

print("Started conversation: \\(session.sessionId)")
```

### 3. Send Messages

```swift
// Text message
let response = try await sdk.sendMessage("Let's create a story about a dragon!")
print("Bot response: \\(response.content)")

// Voice message
try sdk.startVoiceRecording()
// ... user speaks ...
let voiceResponse = try await sdk.stopVoiceRecording()
print("Transcription: \\(voiceResponse.transcription)")
```

### 4. Stream Responses

```swift
for try await chunk in sdk.streamResponse(for: "Tell me about the character") {
    print("Chunk: \\(chunk.content)")
    if chunk.isComplete {
        print("Response complete!")
        break
    }
}
```

### 5. Handle Stories

```swift
// Get user's stories
let stories = try await sdk.getStories()
print("Found \\(stories.count) stories")

// Create a new story
let character = Character(
    id: UUID().uuidString,
    name: "Luna",
    traits: CharacterTraits(species: "unicorn"),
    appearanceUrl: nil
)

let request = StoryCreationRequest(
    character: character,
    storyType: "bedtime"
)

let story = try await sdk.createStory(request: request)
print("Created story: \\(story.title)")
```

## Voice Processing

The SDK provides comprehensive voice processing capabilities:

```swift
// Set up voice processor delegate
sdk.setVoiceProcessorDelegate(self)

extension YourViewController: VoiceProcessorDelegate {
    func voiceProcessor(_ processor: VoiceProcessor, didDetectSpeech speech: String, confidence: Float) {
        print("Detected speech: \\(speech) (confidence: \\(confidence))")
    }
    
    func voiceProcessor(_ processor: VoiceProcessor, didEncounterError error: Error) {
        print("Voice error: \\(error)")
    }
}
```

## Offline Mode

Stories can be created offline and automatically synced when connection is restored:

```swift
// Check if offline mode is enabled
if sdk.offlineManager.isEnabled {
    // Create stories offline
    let offlineResponse = try await sdk.sendMessage("Create a story about space")
    
    // Sync when online
    try await sdk.syncOfflineData()
}
```

## Push Notifications

Register for story completion notifications:

```swift
// Register for notifications
try await sdk.registerForPushNotifications()

// Handle notification events
sdk.setNotificationManagerDelegate(self)

extension YourViewController: NotificationManagerDelegate {
    func notificationManager(_ manager: NotificationManager, didReceiveStoryCompletion story: Story) {
        print("Story completed: \\(story.title)")
    }
}
```

## Smart Home Integration

Connect and control smart home devices during storytelling:

```swift
let deviceConfig = SmartDeviceConfig(
    deviceType: "philips_hue",
    userId: "user123",
    roomId: "bedroom"
)

let connection = try await sdk.connectSmartDevice(config: deviceConfig)
print("Connected device: \\(connection.deviceId)")
```

## Error Handling

The SDK provides comprehensive error handling:

```swift
do {
    let response = try await sdk.sendMessage("Hello")
} catch StorytellerError.notInitialized {
    print("SDK not initialized")
} catch StorytellerError.noActiveSession {
    print("No active conversation session")
} catch StorytellerError.voiceNotEnabled {
    print("Voice processing not enabled")
} catch StorytellerError.networkError(let error) {
    print("Network error: \\(error)")
} catch {
    print("Unknown error: \\(error)")
}
```

## Privacy and Compliance

The SDK is designed with privacy-first principles:

- **COPPA Compliance**: Automatic parental consent for users under 13
- **GDPR Compliance**: Granular consent management and data minimization
- **UK Children's Code**: Age-appropriate design and privacy-protective defaults
- **Data Encryption**: All sensitive data encrypted with AES-256-GCM
- **Automatic Cleanup**: Conversation data automatically deleted per retention policies

## Configuration Options

```swift
let configuration = StorytellerSDK.Configuration(
    apiBaseURL: "https://api.storyteller.com",
    apiKey: "your-api-key",
    enableVoice: true,
    enableOfflineMode: true,
    enablePushNotifications: true,
    customization: Customization(
        theme: Theme(
            primaryColor: "#FF6B6B",
            secondaryColor: "#4ECDC4",
            fontFamily: "Avenir",
            darkMode: false
        ),
        branding: Branding(
            logoUrl: "https://your-app.com/logo.png",
            companyName: "Your App"
        ),
        features: FeatureFlags(
            voiceEnabled: true,
            smartHomeEnabled: true,
            offlineMode: true,
            pushNotifications: true
        )
    )
)
```

## Best Practices

1. **Initialize Early**: Initialize the SDK in your app delegate for best performance
2. **Handle Permissions**: Request microphone and notification permissions appropriately
3. **Manage Sessions**: End conversations when appropriate to free resources
4. **Error Handling**: Always handle potential errors gracefully
5. **Privacy**: Respect user privacy settings and parental controls
6. **Offline Support**: Design your UI to work with offline capabilities

## Support

For support, please visit [https://docs.storyteller.com](https://docs.storyteller.com) or contact support@storyteller.com.

## License

This SDK is licensed under the MIT License. See LICENSE file for details.
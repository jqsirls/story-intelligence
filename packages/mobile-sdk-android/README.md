# Storyteller Android SDK

The Storyteller Android SDK provides native Android integration for Story Intelligence™ powered storytelling experiences. Built with Kotlin, it offers voice processing, offline capabilities, push notifications, and smart home integration.

## Features

- **Native Voice Processing**: Real-time speech recognition and synthesis using Android Speech APIs
- **Offline Story Creation**: Continue creating stories even without internet connection with automatic sync
- **Push Notifications**: Get notified when stories are completed with Firebase Cloud Messaging
- **Smart Home Integration**: Synchronize story environments with smart lighting
- **Privacy-First Design**: COPPA, GDPR, and UK Children's Code compliant by design
- **Real-time Updates**: WebSocket-based real-time conversation updates

## Requirements

- Android API level 21 (Android 5.0) or higher
- Kotlin 1.8.0 or higher
- Compile SDK version 34

## Installation

### Gradle

Add to your app's `build.gradle` file:

```kotlin
dependencies {
    implementation 'com.storyteller:mobile-sdk-android:1.0.0'
}
```

### Maven

```xml
<dependency>
    <groupId>com.storyteller</groupId>
    <artifactId>mobile-sdk-android</artifactId>
    <version>1.0.0</version>
</dependency>
```

## Quick Start

### 1. Initialize the SDK

```kotlin
import com.storyteller.sdk.StorytellerSDK

class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        
        val configuration = StorytellerSDK.Configuration(
            apiBaseURL = "https://api.storyteller.com",
            apiKey = "your-api-key",
            enableVoice = true,
            enableOfflineMode = true,
            enablePushNotifications = true
        )
        
        val sdk = StorytellerSDK.initialize(this, configuration)
        
        // Initialize SDK components
        lifecycleScope.launch {
            try {
                sdk.initialize()
                Log.d("Storyteller", "SDK initialized successfully")
            } catch (e: Exception) {
                Log.e("Storyteller", "Failed to initialize SDK", e)
            }
        }
    }
}
```

### 2. Start a Conversation

```kotlin
class MainActivity : AppCompatActivity() {
    private lateinit var sdk: StorytellerSDK
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        sdk = StorytellerSDK.getInstance()
        
        lifecycleScope.launch {
            try {
                val session = sdk.startConversation(
                    userId = "user123",
                    parentalControls = ParentalControls.default()
                )
                Log.d("Storyteller", "Started conversation: ${session.sessionId}")
            } catch (e: Exception) {
                Log.e("Storyteller", "Failed to start conversation", e)
            }
        }
    }
}
```

### 3. Send Messages

```kotlin
// Text message
lifecycleScope.launch {
    try {
        val response = sdk.sendMessage("Let's create a story about a dragon!")
        when (val content = response.content) {
            is ResponseContent.Text -> {
                Log.d("Storyteller", "Bot response: ${content.text}")
            }
            else -> {
                Log.d("Storyteller", "Received non-text response")
            }
        }
    } catch (e: Exception) {
        Log.e("Storyteller", "Failed to send message", e)
    }
}

// Voice message
lifecycleScope.launch {
    try {
        sdk.startVoiceRecording()
        // ... user speaks ...
        val voiceResponse = sdk.stopVoiceRecording()
        Log.d("Storyteller", "Transcription: ${voiceResponse.transcription}")
    } catch (e: Exception) {
        Log.e("Storyteller", "Voice recording failed", e)
    }
}
```

### 4. Stream Responses

```kotlin
lifecycleScope.launch {
    try {
        sdk.streamResponse("Tell me about the character").collect { chunk ->
            Log.d("Storyteller", "Chunk: ${chunk.content}")
            if (chunk.isComplete) {
                Log.d("Storyteller", "Response complete!")
            }
        }
    } catch (e: Exception) {
        Log.e("Storyteller", "Streaming failed", e)
    }
}
```

### 5. Handle Stories

```kotlin
// Get user's stories
lifecycleScope.launch {
    try {
        val stories = sdk.getStories()
        Log.d("Storyteller", "Found ${stories.size} stories")
    } catch (e: Exception) {
        Log.e("Storyteller", "Failed to get stories", e)
    }
}

// Create a new story
lifecycleScope.launch {
    try {
        val character = Character(
            id = UUID.randomUUID().toString(),
            name = "Luna",
            traits = CharacterTraits(species = "unicorn"),
            appearanceUrl = null
        )
        
        val request = StoryCreationRequest(
            character = character,
            storyType = "bedtime"
        )
        
        val story = sdk.createStory(request)
        Log.d("Storyteller", "Created story: ${story.title}")
    } catch (e: Exception) {
        Log.e("Storyteller", "Failed to create story", e)
    }
}
```

## Voice Processing

Set up voice processing callbacks:

```kotlin
sdk.setVoiceProcessorCallback(object : VoiceProcessor.Callback {
    override fun onSpeechDetected(speech: String, confidence: Float) {
        Log.d("Voice", "Detected speech: $speech (confidence: $confidence)")
    }
    
    override fun onError(error: Throwable) {
        Log.e("Voice", "Voice processing error", error)
    }
})
```

## Offline Mode

Stories can be created offline and automatically synced:

```kotlin
// Set up offline manager callback
sdk.setOfflineManagerCallback(object : OfflineManager.Callback {
    override fun onStoriesSynced(stories: List<Story>) {
        Log.d("Offline", "Synced ${stories.size} stories")
    }
    
    override fun onSyncFailed(error: Throwable) {
        Log.e("Offline", "Sync failed", error)
    }
})

// Sync offline data when connection is restored
lifecycleScope.launch {
    try {
        sdk.syncOfflineData()
    } catch (e: Exception) {
        Log.e("Offline", "Sync failed", e)
    }
}
```

## Push Notifications

Register for story completion notifications:

```kotlin
// Register for notifications
lifecycleScope.launch {
    try {
        sdk.registerForPushNotifications()
    } catch (e: Exception) {
        Log.e("Notifications", "Failed to register", e)
    }
}

// Handle notification events
sdk.setNotificationManagerCallback(object : NotificationManager.Callback {
    override fun onStoryCompleted(story: Story) {
        Log.d("Notifications", "Story completed: ${story.title}")
    }
    
    override fun onReminderReceived(reminder: Reminder) {
        Log.d("Notifications", "Reminder: ${reminder.message}")
    }
})
```

## Smart Home Integration

Connect and control smart home devices:

```kotlin
lifecycleScope.launch {
    try {
        val deviceConfig = SmartDeviceConfig(
            deviceType = "philips_hue",
            userId = "user123",
            roomId = "bedroom"
        )
        
        val connection = sdk.connectSmartDevice(deviceConfig)
        Log.d("SmartHome", "Connected device: ${connection.deviceId}")
    } catch (e: Exception) {
        Log.e("SmartHome", "Failed to connect device", e)
    }
}
```

## Error Handling

The SDK provides comprehensive error handling:

```kotlin
lifecycleScope.launch {
    try {
        val response = sdk.sendMessage("Hello")
    } catch (e: StorytellerException.NotInitialized) {
        Log.e("SDK", "SDK not initialized")
    } catch (e: StorytellerException.NoActiveSession) {
        Log.e("SDK", "No active conversation session")
    } catch (e: StorytellerException.VoiceNotEnabled) {
        Log.e("SDK", "Voice processing not enabled")
    } catch (e: StorytellerException.NetworkError) {
        Log.e("SDK", "Network error: ${e.message}")
    } catch (e: Exception) {
        Log.e("SDK", "Unknown error", e)
    }
}
```

## Permissions

Add required permissions to your `AndroidManifest.xml`:

```xml
<!-- Required permissions -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Voice processing (optional) -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />

<!-- Push notifications (optional) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- Smart home integration (optional) -->
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
```

## Privacy and Compliance

The SDK is designed with privacy-first principles:

- **COPPA Compliance**: Automatic parental consent for users under 13
- **GDPR Compliance**: Granular consent management and data minimization
- **UK Children's Code**: Age-appropriate design and privacy-protective defaults
- **Data Encryption**: All sensitive data encrypted using Android Security Crypto
- **Automatic Cleanup**: Conversation data automatically deleted per retention policies

## Configuration Options

```kotlin
val configuration = StorytellerSDK.Configuration(
    apiBaseURL = "https://api.storyteller.com",
    apiKey = "your-api-key",
    enableVoice = true,
    enableOfflineMode = true,
    enablePushNotifications = true,
    customization = Customization(
        theme = Theme(
            primaryColor = "#FF6B6B",
            secondaryColor = "#4ECDC4",
            fontFamily = "Roboto",
            darkMode = false
        ),
        branding = Branding(
            logoUrl = "https://your-app.com/logo.png",
            companyName = "Your App"
        ),
        features = FeatureFlags(
            voiceEnabled = true,
            smartHomeEnabled = true,
            offlineMode = true,
            pushNotifications = true
        )
    )
)
```

## ProGuard/R8

If you're using ProGuard or R8, add these rules to your `proguard-rules.pro`:

```proguard
# Storyteller SDK
-keep class com.storyteller.sdk.** { *; }
-keep class com.storyteller.sdk.models.** { *; }

# Gson (used for JSON serialization)
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }

# Retrofit (used for API calls)
-keep class retrofit2.** { *; }
-keepattributes Signature, InnerClasses, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
```

## Best Practices

1. **Initialize in Application**: Initialize the SDK in your Application class for best performance
2. **Handle Permissions**: Request microphone and notification permissions appropriately
3. **Manage Lifecycle**: Use lifecycle-aware components to manage SDK operations
4. **Error Handling**: Always handle potential errors gracefully
5. **Privacy**: Respect user privacy settings and parental controls
6. **Offline Support**: Design your UI to work with offline capabilities

## Support

For support, please visit [https://docs.storyteller.com](https://docs.storyteller.com) or contact support@storyteller.com.

## License

This SDK is licensed under the MIT License. See LICENSE file for details.
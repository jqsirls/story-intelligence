# Mobile SDK Integration Guide

Integrate Storytailor's Story Intelligence™ powered storytelling into your mobile applications with our native iOS, Android, and React Native SDKs.

## Platform Support

- **iOS**: Native Swift SDK for iOS 13.0+
- **Android**: Native Kotlin SDK for Android API 21+
- **React Native**: Cross-platform SDK for React Native 0.64+

## Quick Start

Choose your platform:

- [iOS SDK](#ios-sdk)
- [Android SDK](#android-sdk)
- [React Native SDK](#react-native-sdk)

---

## iOS SDK

### Installation

#### CocoaPods

```ruby
# Podfile
pod 'StorytellerSDK', '~> 1.0'
```

#### Swift Package Manager

```swift
dependencies: [
    .package(url: "https://github.com/storytailor/ios-sdk.git", from: "1.0.0")
]
```

#### Manual Installation

1. Download the latest release from [GitHub](https://github.com/storytailor/ios-sdk/releases)
2. Drag `StorytellerSDK.framework` into your Xcode project
3. Add to "Embedded Binaries" in your target settings

### Basic Setup

```swift
import StorytellerSDK

class ViewController: UIViewController {
    private var storyteller: StorytellerSDK!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Initialize SDK
        storyteller = StorytellerSDK(
            apiKey: "your-api-key",
            userId: "user-123"
        )
        
        // Configure callbacks
        storyteller.delegate = self
        
        // Start conversation
        storyteller.startConversation()
    }
}

// MARK: - StorytellerDelegate
extension ViewController: StorytellerDelegate {
    func storytellerDidStartConversation(_ storyteller: StorytellerSDK) {
        print("Conversation started")
    }
    
    func storyteller(_ storyteller: StorytellerSDK, didCreateCharacter character: Character) {
        print("Character created: \(character.name)")
    }
    
    func storyteller(_ storyteller: StorytellerSDK, didCompleteStory story: Story) {
        print("Story completed: \(story.title)")
        // Save story, show completion UI
    }
    
    func storyteller(_ storyteller: StorytellerSDK, didEncounterError error: StorytellerError) {
        print("Error: \(error.localizedDescription)")
    }
}
```

### Voice Integration

```swift
import AVFoundation
import Speech

class VoiceStoryViewController: UIViewController {
    private var storyteller: StorytellerSDK!
    private var voiceProcessor: VoiceProcessor!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        storyteller = StorytellerSDK(apiKey: "your-api-key")
        voiceProcessor = VoiceProcessor()
        
        // Request microphone permission
        requestMicrophonePermission()
    }
    
    private func requestMicrophonePermission() {
        AVAudioSession.sharedInstance().requestRecordPermission { granted in
            DispatchQueue.main.async {
                if granted {
                    self.setupVoiceRecognition()
                } else {
                    // Handle permission denied
                }
            }
        }
    }
    
    private func setupVoiceRecognition() {
        voiceProcessor.delegate = self
        voiceProcessor.configure(
            language: "en-US",
            continuous: true,
            partialResults: true
        )
    }
    
    @IBAction func startVoiceInput(_ sender: UIButton) {
        voiceProcessor.startRecording()
    }
    
    @IBAction func stopVoiceInput(_ sender: UIButton) {
        voiceProcessor.stopRecording()
    }
}

extension VoiceStoryViewController: VoiceProcessorDelegate {
    func voiceProcessor(_ processor: VoiceProcessor, didRecognizeText text: String, isFinal: Bool) {
        if isFinal {
            storyteller.sendMessage(text)
        }
    }
    
    func voiceProcessor(_ processor: VoiceProcessor, didEncounterError error: Error) {
        print("Voice recognition error: \(error)")
    }
}
```

### SwiftUI Integration

```swift
import SwiftUI
import StorytellerSDK

struct StorytellerView: UIViewControllerRepresentable {
    let apiKey: String
    let userId: String
    
    @Binding var currentStory: Story?
    
    func makeUIViewController(context: Context) -> StorytellerViewController {
        let controller = StorytellerViewController()
        controller.storyteller = StorytellerSDK(apiKey: apiKey, userId: userId)
        controller.storyteller.delegate = context.coordinator
        return controller
    }
    
    func updateUIViewController(_ uiViewController: StorytellerViewController, context: Context) {
        // Update if needed
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, StorytellerDelegate {
        let parent: StorytellerView
        
        init(_ parent: StorytellerView) {
            self.parent = parent
        }
        
        func storyteller(_ storyteller: StorytellerSDK, didCompleteStory story: Story) {
            parent.currentStory = story
        }
    }
}

// Usage in SwiftUI
struct ContentView: View {
    @State private var currentStory: Story?
    
    var body: some View {
        VStack {
            StorytellerView(
                apiKey: "your-api-key",
                userId: "user-123",
                currentStory: $currentStory
            )
            
            if let story = currentStory {
                Text("Completed: \(story.title)")
            }
        }
    }
}
```

### Offline Support

```swift
class OfflineStoryViewController: UIViewController {
    private var storyteller: StorytellerSDK!
    private var offlineManager: OfflineManager!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        storyteller = StorytellerSDK(apiKey: "your-api-key")
        offlineManager = OfflineManager()
        
        // Configure offline settings
        offlineManager.configure(
            maxStoredStories: 10,
            syncOnReconnect: true,
            compressionEnabled: true
        )
        
        storyteller.offlineManager = offlineManager
    }
    
    @IBAction func downloadForOffline(_ sender: UIButton) {
        offlineManager.downloadEssentialAssets { result in
            switch result {
            case .success:
                print("Assets downloaded for offline use")
            case .failure(let error):
                print("Download failed: \(error)")
            }
        }
    }
    
    private func handleNetworkChange() {
        if Reachability.isConnectedToNetwork() {
            offlineManager.syncPendingData()
        } else {
            // Switch to offline mode
            storyteller.enableOfflineMode()
        }
    }
}
```

---

## Android SDK

### Installation

#### Gradle

```kotlin
// app/build.gradle
dependencies {
    implementation 'com.storytailor:android-sdk:1.0.0'
}
```

#### Maven

```xml
<dependency>
    <groupId>com.storytailor</groupId>
    <artifactId>android-sdk</artifactId>
    <version>1.0.0</version>
</dependency>
```

### Basic Setup

```kotlin
import com.storytailor.sdk.StorytellerSDK
import com.storytailor.sdk.StorytellerListener
import com.storytailor.sdk.models.Character
import com.storytailor.sdk.models.Story

class MainActivity : AppCompatActivity(), StorytellerListener {
    private lateinit var storyteller: StorytellerSDK
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        // Initialize SDK
        storyteller = StorytellerSDK.Builder(this)
            .apiKey("your-api-key")
            .userId("user-123")
            .listener(this)
            .build()
        
        // Start conversation
        storyteller.startConversation()
    }
    
    override fun onConversationStarted() {
        Log.d("Storyteller", "Conversation started")
    }
    
    override fun onCharacterCreated(character: Character) {
        Log.d("Storyteller", "Character created: ${character.name}")
    }
    
    override fun onStoryCompleted(story: Story) {
        Log.d("Storyteller", "Story completed: ${story.title}")
        // Save story, show completion UI
    }
    
    override fun onError(error: StorytellerException) {
        Log.e("Storyteller", "Error: ${error.message}")
    }
    
    override fun onDestroy() {
        super.onDestroy()
        storyteller.cleanup()
    }
}
```

### Voice Integration

```kotlin
import android.Manifest
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class VoiceStoryActivity : AppCompatActivity() {
    private lateinit var storyteller: StorytellerSDK
    private lateinit var voiceProcessor: VoiceProcessor
    
    companion object {
        private const val RECORD_AUDIO_PERMISSION_CODE = 1001
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_voice_story)
        
        storyteller = StorytellerSDK.Builder(this)
            .apiKey("your-api-key")
            .build()
        
        voiceProcessor = VoiceProcessor(this)
        
        // Request microphone permission
        requestMicrophonePermission()
    }
    
    private fun requestMicrophonePermission() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) 
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.RECORD_AUDIO),
                RECORD_AUDIO_PERMISSION_CODE
            )
        } else {
            setupVoiceRecognition()
        }
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        
        if (requestCode == RECORD_AUDIO_PERMISSION_CODE) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                setupVoiceRecognition()
            } else {
                // Handle permission denied
            }
        }
    }
    
    private fun setupVoiceRecognition() {
        voiceProcessor.configure(
            language = "en-US",
            continuous = true,
            partialResults = true
        )
        
        voiceProcessor.setListener(object : VoiceProcessor.Listener {
            override fun onTextRecognized(text: String, isFinal: Boolean) {
                if (isFinal) {
                    storyteller.sendMessage(text)
                }
            }
            
            override fun onError(error: Exception) {
                Log.e("VoiceProcessor", "Error: ${error.message}")
            }
        })
    }
    
    fun startVoiceInput(view: View) {
        voiceProcessor.startRecording()
    }
    
    fun stopVoiceInput(view: View) {
        voiceProcessor.stopRecording()
    }
}
```

### Jetpack Compose Integration

```kotlin
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp

@Composable
fun StorytellerScreen() {
    val context = LocalContext.current
    var currentStory by remember { mutableStateOf<Story?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    
    val storyteller = remember {
        StorytellerSDK.Builder(context)
            .apiKey("your-api-key")
            .listener(object : StorytellerListener {
                override fun onStoryCompleted(story: Story) {
                    currentStory = story
                    isLoading = false
                }
                
                override fun onError(error: StorytellerException) {
                    isLoading = false
                }
            })
            .build()
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Button(
            onClick = {
                isLoading = true
                storyteller.startConversation()
            },
            enabled = !isLoading
        ) {
            if (isLoading) {
                CircularProgressIndicator(modifier = Modifier.size(16.dp))
            } else {
                Text("Start New Story")
            }
        }
        
        currentStory?.let { story ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = story.title,
                        style = MaterialTheme.typography.headlineSmall
                    )
                    Text(
                        text = story.content,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }
            }
        }
    }
}
```

---

## React Native SDK

### Installation

```bash
npm install @storytailor/react-native-sdk
# or
yarn add @storytailor/react-native-sdk
```

### iOS Setup

```bash
cd ios && pod install
```

### Android Setup

No additional setup required for Android.

### Basic Usage

```jsx
import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { StorytellerSDK } from '@storytailor/react-native-sdk';

const StoryScreen = () => {
  const [storyteller, setStoryteller] = useState(null);
  const [currentStory, setCurrentStory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const sdk = new StorytellerSDK({
      apiKey: 'your-api-key',
      userId: 'user-123',
      onStoryCompleted: (story) => {
        setCurrentStory(story);
        setIsLoading(false);
      },
      onError: (error) => {
        Alert.alert('Error', error.message);
        setIsLoading(false);
      }
    });

    setStoryteller(sdk);

    return () => {
      sdk.cleanup();
    };
  }, []);

  const startNewStory = async () => {
    if (!storyteller) return;
    
    setIsLoading(true);
    try {
      await storyteller.startConversation();
    } catch (error) {
      Alert.alert('Error', error.message);
      setIsLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Button
        title={isLoading ? "Creating Story..." : "Start New Story"}
        onPress={startNewStory}
        disabled={isLoading}
      />
      
      {currentStory && (
        <View style={{ marginTop: 16, padding: 16, backgroundColor: '#f5f5f5' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
            {currentStory.title}
          </Text>
          <Text style={{ marginTop: 8 }}>
            {currentStory.content}
          </Text>
        </View>
      )}
    </View>
  );
};

export default StoryScreen;
```

### Voice Integration

```jsx
import React, { useState, useEffect } from 'react';
import { View, Button, Text, Alert } from 'react-native';
import { StorytellerSDK, VoiceProcessor } from '@storytailor/react-native-sdk';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const VoiceStoryScreen = () => {
  const [storyteller, setStoryteller] = useState(null);
  const [voiceProcessor, setVoiceProcessor] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    requestMicrophonePermission();
    
    const sdk = new StorytellerSDK({
      apiKey: 'your-api-key',
      voiceEnabled: true
    });
    
    const processor = new VoiceProcessor({
      language: 'en-US',
      onTextRecognized: (text, isFinal) => {
        if (isFinal) {
          sdk.sendMessage(text);
        }
      },
      onError: (error) => {
        Alert.alert('Voice Error', error.message);
      }
    });

    setStoryteller(sdk);
    setVoiceProcessor(processor);

    return () => {
      sdk.cleanup();
      processor.cleanup();
    };
  }, []);

  const requestMicrophonePermission = async () => {
    const permission = Platform.OS === 'ios' 
      ? PERMISSIONS.IOS.MICROPHONE 
      : PERMISSIONS.ANDROID.RECORD_AUDIO;
    
    const result = await request(permission);
    setHasPermission(result === RESULTS.GRANTED);
  };

  const toggleRecording = async () => {
    if (!hasPermission || !voiceProcessor) return;

    if (isRecording) {
      await voiceProcessor.stopRecording();
      setIsRecording(false);
    } else {
      await voiceProcessor.startRecording();
      setIsRecording(true);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
      <Button
        title={isRecording ? "Stop Recording" : "Start Recording"}
        onPress={toggleRecording}
        disabled={!hasPermission}
      />
      
      {!hasPermission && (
        <Text style={{ textAlign: 'center', marginTop: 16, color: 'red' }}>
          Microphone permission required for voice input
        </Text>
      )}
    </View>
  );
};

export default VoiceStoryScreen;
```

### Offline Support

```jsx
import React, { useState, useEffect } from 'react';
import { View, Button, Text, Alert } from 'react-native';
import NetInfo from '@react-native-netinfo/netinfo';
import { StorytellerSDK, OfflineManager } from '@storytailor/react-native-sdk';

const OfflineStoryScreen = () => {
  const [storyteller, setStoryteller] = useState(null);
  const [offlineManager, setOfflineManager] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const sdk = new StorytellerSDK({
      apiKey: 'your-api-key',
      offlineEnabled: true
    });

    const offline = new OfflineManager({
      maxStoredStories: 10,
      syncOnReconnect: true,
      onSyncComplete: () => {
        Alert.alert('Sync Complete', 'All offline data has been synced');
      }
    });

    sdk.setOfflineManager(offline);

    setStoryteller(sdk);
    setOfflineManager(offline);

    // Monitor network status
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
      
      if (state.isConnected && offline) {
        offline.syncPendingData();
      }
    });

    return () => {
      unsubscribe();
      sdk.cleanup();
    };
  }, []);

  const downloadForOffline = async () => {
    if (!offlineManager) return;

    setIsDownloading(true);
    try {
      await offlineManager.downloadEssentialAssets();
      Alert.alert('Success', 'Assets downloaded for offline use');
    } catch (error) {
      Alert.alert('Error', 'Failed to download assets');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ textAlign: 'center', marginBottom: 16 }}>
        Status: {isOnline ? 'Online' : 'Offline'}
      </Text>
      
      <Button
        title={isDownloading ? "Downloading..." : "Download for Offline"}
        onPress={downloadForOffline}
        disabled={isDownloading || !isOnline}
      />
    </View>
  );
};

export default OfflineStoryScreen;
```

## Advanced Features

### Push Notifications

```jsx
// React Native
import PushNotification from 'react-native-push-notification';

const setupPushNotifications = (storyteller) => {
  PushNotification.configure({
    onNotification: function(notification) {
      if (notification.userInteraction) {
        // User tapped notification
        storyteller.handleNotificationTap(notification.data);
      }
    },
    requestPermissions: Platform.OS === 'ios'
  });

  // Register for story completion notifications
  storyteller.enablePushNotifications({
    storyComplete: true,
    characterCreated: true,
    dailyReminder: true
  });
};
```

### Custom UI Components

```jsx
// React Native Custom Chat Interface
import React from 'react';
import { FlatList, View, TextInput, TouchableOpacity, Text } from 'react-native';

const CustomChatInterface = ({ storyteller }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    storyteller.onMessage = (message) => {
      setMessages(prev => [...prev, message]);
    };
  }, []);

  const sendMessage = () => {
    if (inputText.trim()) {
      storyteller.sendMessage(inputText);
      setInputText('');
    }
  };

  const renderMessage = ({ item }) => (
    <View style={{
      padding: 12,
      margin: 8,
      backgroundColor: item.isUser ? '#007AFF' : '#E5E5EA',
      borderRadius: 16,
      alignSelf: item.isUser ? 'flex-end' : 'flex-start'
    }}>
      <Text style={{ color: item.isUser ? 'white' : 'black' }}>
        {item.text}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => index.toString()}
      />
      
      <View style={{ flexDirection: 'row', padding: 16 }}>
        <TextInput
          style={{ flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16 }}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type your message..."
        />
        <TouchableOpacity onPress={sendMessage} style={{ marginLeft: 8 }}>
          <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
```

## Testing and Debugging

### Debug Mode

```jsx
// Enable debug mode
const storyteller = new StorytellerSDK({
  apiKey: 'your-api-key',
  debug: true,
  debugSettings: {
    logLevel: 'verbose',
    showNetworkRequests: true,
    mockResponses: false
  }
});

// Access debug information
console.log(storyteller.getDebugInfo());
```

### Testing with Sandbox

```jsx
const storyteller = new StorytellerSDK({
  apiKey: 'sandbox-api-key',
  environment: 'sandbox',
  mockData: true // Use mock responses for testing
});
```

## Performance Optimization

### Memory Management

```jsx
// Proper cleanup
useEffect(() => {
  const storyteller = new StorytellerSDK({
    apiKey: 'your-api-key'
  });

  return () => {
    // Always cleanup to prevent memory leaks
    storyteller.cleanup();
  };
}, []);
```

### Lazy Loading

```jsx
// Load SDK only when needed
const [storyteller, setStoryteller] = useState(null);

const initializeStoryteller = async () => {
  if (!storyteller) {
    const { StorytellerSDK } = await import('@storytailor/react-native-sdk');
    const sdk = new StorytellerSDK({ apiKey: 'your-api-key' });
    setStoryteller(sdk);
  }
};
```

## Next Steps

- [Voice Platform Integration](./voice-platforms.md) - Extend to voice assistants
- [REST API Integration](./rest-api.md) - Server-to-server integration
- [API Reference](../api-reference/README.md) - Complete API documentation
- [Examples](../examples/mobile-sdk-examples.md) - More code examples
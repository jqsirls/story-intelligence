# Storyteller React Native SDK

The Storyteller React Native SDK provides cross-platform integration for Story Intelligence™ powered storytelling experiences. Built for both iOS and Android, it offers voice processing, offline capabilities, push notifications, and smart home integration.

## Features

- **Cross-Platform**: Single codebase for iOS and Android
- **Native Voice Processing**: Real-time speech recognition and synthesis
- **Offline Story Creation**: Continue creating stories without internet connection
- **Push Notifications**: Get notified when stories are completed
- **Smart Home Integration**: Synchronize story environments with smart lighting
- **Privacy-First Design**: COPPA, GDPR, and UK Children's Code compliant
- **Real-time Updates**: WebSocket-based real-time conversation updates
- **React Hooks**: Easy integration with React components

## Requirements

- React Native 0.60+
- iOS 14.0+ / Android API level 21+
- Node.js 16+

## Installation

```bash
npm install @storyteller/react-native-sdk
# or
yarn add @storyteller/react-native-sdk
```

### iOS Setup

```bash
cd ios && pod install
```

Add permissions to `ios/YourApp/Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>This app needs microphone access for voice storytelling</string>
<key>NSUserNotificationsUsageDescription</key>
<string>This app sends notifications when stories are completed</string>
```

### Android Setup

Add permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

## Quick Start

### 1. Initialize the SDK

```typescript
import StorytellerSDK, { Configuration } from '@storyteller/react-native-sdk';

const configuration: Configuration = {
  apiBaseURL: 'https://api.storyteller.com',
  apiKey: 'your-api-key',
  enableVoice: true,
  enableOfflineMode: true,
  enablePushNotifications: true,
};

// Initialize in your App component
useEffect(() => {
  const initSDK = async () => {
    try {
      const sdk = await StorytellerSDK.initialize(configuration);
      console.log('SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SDK:', error);
    }
  };
  
  initSDK();
}, []);
```

### 2. Using the Hook

```typescript
import { useStorytellerSDK } from '@storyteller/react-native-sdk';

function StoryScreen() {
  const { startConversation, sendMessage, streamResponse } = useStorytellerSDK();
  const [messages, setMessages] = useState<string[]>([]);
  
  const handleStartConversation = async () => {
    try {
      const session = await startConversation('user123');
      console.log('Started conversation:', session.sessionId);
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };
  
  const handleSendMessage = async (text: string) => {
    try {
      const response = await sendMessage(text);
      setMessages(prev => [...prev, text, response.content as string]);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };
  
  return (
    <View>
      <Button title="Start Conversation" onPress={handleStartConversation} />
      {/* Your UI components */}
    </View>
  );
}
```

### 3. Voice Processing

```typescript
import { useStorytellerSDK } from '@storyteller/react-native-sdk';

function VoiceScreen() {
  const { startVoiceRecording, stopVoiceRecording } = useStorytellerSDK();
  const [isRecording, setIsRecording] = useState(false);
  
  const handleStartRecording = async () => {
    try {
      await startVoiceRecording();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };
  
  const handleStopRecording = async () => {
    try {
      const response = await stopVoiceRecording();
      setIsRecording(false);
      console.log('Transcription:', response.transcription);
      console.log('Response:', response.textResponse);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };
  
  return (
    <View>
      <Button
        title={isRecording ? "Stop Recording" : "Start Recording"}
        onPress={isRecording ? handleStopRecording : handleStartRecording}
      />
    </View>
  );
}
```

### 4. Streaming Responses

```typescript
import { useStorytellerSDK } from '@storyteller/react-native-sdk';

function StreamingScreen() {
  const { streamResponse } = useStorytellerSDK();
  const [streamedText, setStreamedText] = useState('');
  
  const handleStreamMessage = async (message: string) => {
    try {
      setStreamedText('');
      
      for await (const chunk of streamResponse(message)) {
        setStreamedText(chunk.content);
        
        if (chunk.isComplete) {
          console.log('Streaming complete!');
          break;
        }
      }
    } catch (error) {
      console.error('Streaming failed:', error);
    }
  };
  
  return (
    <View>
      <Text>{streamedText}</Text>
      <Button
        title="Stream Response"
        onPress={() => handleStreamMessage("Tell me a story")}
      />
    </View>
  );
}
```

### 5. Story Management

```typescript
import { useStorytellerSDK, Story, Character, StoryCreationRequest } from '@storyteller/react-native-sdk';

function StoryManagementScreen() {
  const { getStories, createStory } = useStorytellerSDK();
  const [stories, setStories] = useState<Story[]>([]);
  
  const loadStories = async () => {
    try {
      const userStories = await getStories();
      setStories(userStories);
    } catch (error) {
      console.error('Failed to load stories:', error);
    }
  };
  
  const handleCreateStory = async () => {
    try {
      const character: Character = {
        id: 'char-1',
        name: 'Luna',
        traits: {
          species: 'unicorn',
          age: 8,
          appearance: { color: 'silver', mane: 'rainbow' },
          personality: ['brave', 'kind'],
          inclusivityTraits: []
        }
      };
      
      const request: StoryCreationRequest = {
        character,
        storyType: 'bedtime',
        preferences: {
          themes: ['friendship', 'adventure'],
          avoidTopics: ['scary', 'sad']
        }
      };
      
      const story = await createStory(request);
      console.log('Created story:', story.title);
      loadStories(); // Refresh the list
    } catch (error) {
      console.error('Failed to create story:', error);
    }
  };
  
  return (
    <View>
      <Button title="Load Stories" onPress={loadStories} />
      <Button title="Create Story" onPress={handleCreateStory} />
      <FlatList
        data={stories}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text>{item.title}</Text>
        )}
      />
    </View>
  );
}
```

## Event Handling

```typescript
import { useStorytellerSDK, StorytellerEvent } from '@storyteller/react-native-sdk';

function EventHandlingScreen() {
  const { addEventListener, removeEventListener } = useStorytellerSDK();
  
  useEffect(() => {
    const handleStoryCompleted = (event: StorytellerEvent) => {
      if (event.type === 'storyCompleted') {
        console.log('Story completed:', event.story.title);
        // Show notification or update UI
      }
    };
    
    const handleVoiceDetected = (event: StorytellerEvent) => {
      if (event.type === 'voiceDetected') {
        console.log('Voice detected:', event.speech);
      }
    };
    
    addEventListener('storyCompleted', handleStoryCompleted);
    addEventListener('voiceDetected', handleVoiceDetected);
    
    return () => {
      removeEventListener('storyCompleted', handleStoryCompleted);
      removeEventListener('voiceDetected', handleVoiceDetected);
    };
  }, [addEventListener, removeEventListener]);
  
  return <View>{/* Your component */}</View>;
}
```

## Offline Support

```typescript
import { useStorytellerSDK } from '@storyteller/react-native-sdk';

function OfflineScreen() {
  const { syncOfflineData, sdk } = useStorytellerSDK();
  const [isOnline, setIsOnline] = useState(true);
  
  useEffect(() => {
    const checkOnlineStatus = async () => {
      const online = await sdk.isOnline();
      setIsOnline(online);
      
      if (online) {
        // Sync offline data when connection is restored
        try {
          await syncOfflineData();
          console.log('Offline data synced successfully');
        } catch (error) {
          console.error('Failed to sync offline data:', error);
        }
      }
    };
    
    checkOnlineStatus();
    const interval = setInterval(checkOnlineStatus, 5000);
    
    return () => clearInterval(interval);
  }, [syncOfflineData, sdk]);
  
  return (
    <View>
      <Text>Status: {isOnline ? 'Online' : 'Offline'}</Text>
      {!isOnline && (
        <Text>You can still create stories offline!</Text>
      )}
    </View>
  );
}
```

## Push Notifications

```typescript
import { useStorytellerSDK } from '@storyteller/react-native-sdk';

function NotificationScreen() {
  const { registerForPushNotifications } = useStorytellerSDK();
  
  const handleRegisterNotifications = async () => {
    try {
      await registerForPushNotifications();
      console.log('Registered for push notifications');
    } catch (error) {
      console.error('Failed to register for notifications:', error);
    }
  };
  
  return (
    <View>
      <Button
        title="Enable Notifications"
        onPress={handleRegisterNotifications}
      />
    </View>
  );
}
```

## Smart Home Integration

```typescript
import { useStorytellerSDK, SmartDeviceConfig } from '@storyteller/react-native-sdk';

function SmartHomeScreen() {
  const { connectSmartDevice } = useStorytellerSDK();
  
  const handleConnectDevice = async () => {
    try {
      const config: SmartDeviceConfig = {
        deviceType: 'philips_hue',
        userId: 'user123',
        roomId: 'bedroom',
        deviceName: 'Bedroom Lights',
        capabilities: ['brightness', 'color']
      };
      
      const connection = await connectSmartDevice(config);
      console.log('Connected device:', connection.deviceId);
    } catch (error) {
      console.error('Failed to connect device:', error);
    }
  };
  
  return (
    <View>
      <Button
        title="Connect Smart Lights"
        onPress={handleConnectDevice}
      />
    </View>
  );
}
```

## Configuration Options

```typescript
import StorytellerSDK, { 
  Configuration, 
  createDefaultParentalControls,
  createChildSafePrivacySettings 
} from '@storyteller/react-native-sdk';

const configuration: Configuration = {
  apiBaseURL: 'https://api.storyteller.com',
  apiKey: 'your-api-key',
  enableVoice: true,
  enableOfflineMode: true,
  enablePushNotifications: true,
  customization: {
    theme: {
      primaryColor: '#FF6B6B',
      secondaryColor: '#4ECDC4',
      fontFamily: 'System',
      darkMode: false
    },
    branding: {
      logoUrl: 'https://your-app.com/logo.png',
      companyName: 'Your App',
      customColors: {
        accent: '#FFD93D'
      }
    },
    features: {
      voiceEnabled: true,
      smartHomeEnabled: true,
      offlineMode: true,
      pushNotifications: true
    }
  }
};
```

## Error Handling

```typescript
import { StorytellerError } from '@storyteller/react-native-sdk';

try {
  const response = await sendMessage("Hello");
} catch (error) {
  if (error instanceof StorytellerError) {
    switch (error.code) {
      case 'NOT_INITIALIZED':
        console.error('SDK not initialized');
        break;
      case 'NO_ACTIVE_SESSION':
        console.error('No active conversation session');
        break;
      case 'VOICE_NOT_ENABLED':
        console.error('Voice processing not enabled');
        break;
      default:
        console.error('Storyteller error:', error.message);
    }
  } else {
    console.error('Unknown error:', error);
  }
}
```

## TypeScript Support

The SDK is fully typed with TypeScript. Import types as needed:

```typescript
import {
  Configuration,
  ConversationSession,
  Story,
  Character,
  BotResponse,
  VoiceResponse,
  ParentalControls,
  PrivacySettings,
  StorytellerEvent
} from '@storyteller/react-native-sdk';
```

## Best Practices

1. **Initialize Early**: Initialize the SDK in your App component
2. **Handle Permissions**: Request permissions before using voice features
3. **Error Handling**: Always handle potential errors gracefully
4. **Cleanup**: Remove event listeners in component cleanup
5. **Privacy**: Use appropriate parental controls and privacy settings
6. **Offline Support**: Design your UI to work offline

## Troubleshooting

### Common Issues

1. **SDK not linking**: Make sure to run `pod install` on iOS and rebuild the app
2. **Permission denied**: Check that required permissions are added to platform manifests
3. **Network errors**: Verify API key and base URL are correct
4. **Voice not working**: Ensure microphone permissions are granted

### Debug Mode

Enable debug logging:

```typescript
// Add this before initializing the SDK
if (__DEV__) {
  console.log('Storyteller SDK debug mode enabled');
}
```

## Support

For support, please visit [https://docs.storyteller.com](https://docs.storyteller.com) or contact support@storyteller.com.

## License

This SDK is licensed under the MIT License. See LICENSE file for details.
# Code Examples

Comprehensive collection of working code examples for integrating Storytailor's Story Intelligence™ powered storytelling into your applications.

> **Product REST API note**: These examples are primarily SDK-oriented (client-side embed/SDK keys).  
> For the product REST API contract (JWT auth, `/api/v1` routes, gateway error codes/shapes), use `docs/api/REST_API_EXPERIENCE_MASTER.md`.

## 🚀 Quick Start Examples

### Web Integration (5 minutes)

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Story App</title>
    <script src="https://cdn.storytailor.com/sdk/web/v1/storytailor.min.js"></script>
</head>
<body>
    <div id="storytailor-widget"></div>
    
    <script>
        const storytailor = new StorytellerWebSDK({
            apiKey: 'pk_your_api_key_here',
            containerId: 'storytailor-widget',
            theme: 'child-friendly'
        });
        
        storytailor.initialize();
    </script>
</body>
</html>
```

### React Integration

```jsx
import React, { useEffect, useRef } from 'react';
import { StorytellerWebSDK } from '@storytailor/web-sdk';

function StorytellerWidget({ apiKey, userId }) {
  const containerRef = useRef(null);
  const sdkRef = useRef(null);

  useEffect(() => {
    if (containerRef.current && !sdkRef.current) {
      sdkRef.current = new StorytellerWebSDK({
        apiKey,
        containerId: containerRef.current.id,
        userId,
        onStoryComplete: (story) => {
          console.log('Story completed:', story);
        }
      });
      
      sdkRef.current.initialize();
    }

    return () => {
      if (sdkRef.current) {
        sdkRef.current.destroy();
      }
    };
  }, [apiKey, userId]);

  return <div ref={containerRef} id="storytailor-widget" />;
}

export default StorytellerWidget;
```

### Node.js API Client

```javascript
const { StorytellerAPI } = require('@storytailor/node-sdk');

const storytailor = new StorytellerAPI({
  apiKey: 'sk_your_secret_key_here'
});

async function createStory() {
  try {
    // Start a conversation
    const conversation = await storytailor.conversations.start({
      userId: 'user-123',
      storyType: 'adventure'
    });

    // Send a message
    const response = await storytailor.conversations.sendMessage(
      conversation.id,
      'Create a story about a brave dragon'
    );

    console.log('AI Response:', response.message);
  } catch (error) {
    console.error('Error:', error);
  }
}

createStory();
```

## 📱 Mobile Examples

### iOS Swift

```swift
import StorytellerSDK

class ViewController: UIViewController {
    private var storyteller: StorytellerSDK!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        storyteller = StorytellerSDK(
            apiKey: "your-api-key",
            userId: "user-123"
        )
        
        storyteller.delegate = self
        storyteller.startConversation()
    }
}

extension ViewController: StorytellerDelegate {
    func storyteller(_ storyteller: StorytellerSDK, didCompleteStory story: Story) {
        print("Story completed: \(story.title)")
    }
}
```

### Android Kotlin

```kotlin
class MainActivity : AppCompatActivity(), StorytellerListener {
    private lateinit var storyteller: StorytellerSDK
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        storyteller = StorytellerSDK.Builder(this)
            .apiKey("your-api-key")
            .userId("user-123")
            .listener(this)
            .build()
        
        storyteller.startConversation()
    }
    
    override fun onStoryCompleted(story: Story) {
        Log.d("Storyteller", "Story completed: ${story.title}")
    }
}
```

### React Native

```jsx
import React, { useState, useEffect } from 'react';
import { View, Button, Text } from 'react-native';
import { StorytellerSDK } from '@storytailor/react-native-sdk';

const StoryScreen = () => {
  const [storyteller, setStoryteller] = useState(null);
  const [currentStory, setCurrentStory] = useState(null);

  useEffect(() => {
    const sdk = new StorytellerSDK({
      apiKey: 'your-api-key',
      userId: 'user-123',
      onStoryCompleted: (story) => {
        setCurrentStory(story);
      }
    });

    setStoryteller(sdk);

    return () => {
      sdk.cleanup();
    };
  }, []);

  const startNewStory = async () => {
    if (storyteller) {
      await storyteller.startConversation();
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Button title="Start New Story" onPress={startNewStory} />
      
      {currentStory && (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
            {currentStory.title}
          </Text>
          <Text>{currentStory.content}</Text>
        </View>
      )}
    </View>
  );
};

export default StoryScreen;
```

## 🎙️ Voice Integration Examples

### Web Voice Integration

```javascript
// Voice-enabled web integration
const storytailor = new StorytellerWebSDK({
  apiKey: 'your-api-key',
  containerId: 'storytailor-widget',
  voiceEnabled: true,
  voiceSettings: {
    autoPlay: true,
    voiceSpeed: 1.0,
    language: 'en-US'
  }
});

// Voice controls
document.getElementById('start-voice').addEventListener('click', () => {
  storytailor.startVoiceInput();
});

document.getElementById('stop-voice').addEventListener('click', () => {
  storytailor.stopVoiceInput();
});

// Listen for voice events
storytailor.on('voiceStart', () => {
  console.log('Voice input started');
});

storytailor.on('voiceEnd', (transcript) => {
  console.log('Voice input ended:', transcript);
});
```

### Alexa Skill Integration

```javascript
// Alexa skill handler
const Alexa = require('ask-sdk-core');
const { StorytellerAPI } = require('@storytailor/node-sdk');

const storytailor = new StorytellerAPI({
  apiKey: process.env.STORYTAILOR_API_KEY
});

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  async handle(handlerInput) {
    const userId = handlerInput.requestEnvelope.session.user.userId;
    
    const conversation = await storytailor.conversations.start({
      userId,
      storyType: 'adventure',
      platform: 'alexa'
    });
    
    const speakOutput = 'Welcome to Story Time! What kind of story would you like to create today?';
    
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  }
};

const CreateStoryIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CreateStoryIntent';
  },
  async handle(handlerInput) {
    const userId = handlerInput.requestEnvelope.session.user.userId;
    const storyType = Alexa.getSlotValue(handlerInput.requestEnvelope, 'storyType');
    
    const response = await storytailor.conversations.sendMessage(
      userId,
      `Create a ${storyType} story`
    );
    
    return handlerInput.responseBuilder
      .speak(response.message)
      .reprompt('What happens next in your story?')
      .getResponse();
  }
};

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    CreateStoryIntentHandler
  )
  .lambda();
```

## 🔗 Webhook Examples

### Express.js Webhook Handler

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();

app.use(express.json());

// Webhook signature verification
const verifySignature = (payload, signature, secret) => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

// Story completed webhook
app.post('/webhooks/story-completed', (req, res) => {
  const signature = req.headers['x-storytailor-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!verifySignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Unauthorized');
  }
  
  const { storyId, title, userId, completedAt } = req.body.data;
  
  // Your business logic here
  console.log(`Story completed: ${title} by user ${userId}`);
  
  // Send notification to user
  sendNotification(userId, `Your story "${title}" is ready!`);
  
  // Update database
  updateUserStoryCount(userId);
  
  res.status(200).send('OK');
});

// Character created webhook
app.post('/webhooks/character-created', (req, res) => {
  const signature = req.headers['x-storytailor-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!verifySignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Unauthorized');
  }
  
  const { characterId, name, species, userId } = req.body.data;
  
  console.log(`Character created: ${name} (${species}) by user ${userId}`);
  
  // Save character to your database
  saveCharacterToDatabase({
    id: characterId,
    name,
    species,
    userId,
    createdAt: new Date()
  });
  
  res.status(200).send('OK');
});

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});
```

### Next.js API Route Webhook

```javascript
// pages/api/webhooks/storytailor.js
import crypto from 'crypto';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const signature = req.headers['x-storytailor-signature'];
  const payload = JSON.stringify(req.body);
  
  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { event, data } = req.body;

  switch (event) {
    case 'story.completed':
      handleStoryCompleted(data);
      break;
    case 'character.created':
      handleCharacterCreated(data);
      break;
    case 'user.registered':
      handleUserRegistered(data);
      break;
    default:
      console.log(`Unhandled event: ${event}`);
  }

  res.status(200).json({ received: true });
}

async function handleStoryCompleted(data) {
  const { storyId, title, userId } = data;
  
  // Update user's story count
  await updateUserStoryCount(userId);
  
  // Send push notification
  await sendPushNotification(userId, {
    title: 'Story Complete!',
    body: `Your story "${title}" is ready to read!`,
    data: { storyId }
  });
}
```

## 🎨 Custom UI Examples

### Custom Chat Interface

```jsx
import React, { useState, useEffect } from 'react';
import { StorytellerCore } from '@storytailor/core-sdk';

const CustomChatInterface = ({ apiKey, userId }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [storyteller, setStoryteller] = useState(null);

  useEffect(() => {
    const core = new StorytellerCore({
      apiKey,
      userId,
      onMessage: (message) => {
        setMessages(prev => [...prev, message]);
        setIsTyping(false);
      },
      onTypingStart: () => setIsTyping(true),
      onTypingEnd: () => setIsTyping(false)
    });

    setStoryteller(core);
    core.initialize();

    return () => core.cleanup();
  }, [apiKey, userId]);

  const sendMessage = async () => {
    if (!inputValue.trim() || !storyteller) return;

    const userMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    await storyteller.sendMessage(inputValue);
  };

  return (
    <div className="custom-chat-interface">
      <div className="chat-header">
        <h3>Story Creator</h3>
        <div className="status-indicator online" />
      </div>

      <div className="chat-messages">
        {messages.map(message => (
          <div
            key={message.id}
            className={`message ${message.sender}`}
          >
            <div className="message-content">
              {message.text}
            </div>
            <div className="message-time">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="message ai typing">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Tell me about your story idea..."
        />
        <button onClick={sendMessage} disabled={!inputValue.trim()}>
          Send
        </button>
      </div>
    </div>
  );
};

export default CustomChatInterface;
```

### Story Display Component

```jsx
import React from 'react';

const StoryDisplay = ({ story, onEdit, onShare, onDownload }) => {
  return (
    <div className="story-display">
      <div className="story-header">
        <h1>{story.title}</h1>
        <div className="story-meta">
          <span className="story-type">{story.storyType}</span>
          <span className="story-date">
            {new Date(story.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="story-character">
        <div className="character-avatar">
          <img src={story.character.avatarUrl} alt={story.character.name} />
        </div>
        <div className="character-info">
          <h3>{story.character.name}</h3>
          <p>{story.character.species}</p>
        </div>
      </div>

      <div className="story-content">
        {story.content.split('\n').map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      {story.assets && (
        <div className="story-assets">
          {story.assets.images && (
            <div className="story-images">
              {story.assets.images.map((image, index) => (
                <img key={index} src={image.url} alt={image.description} />
              ))}
            </div>
          )}
          
          {story.assets.audio && (
            <div className="story-audio">
              <audio controls>
                <source src={story.assets.audio.url} type="audio/mpeg" />
              </audio>
            </div>
          )}
        </div>
      )}

      <div className="story-actions">
        <button onClick={() => onEdit(story)} className="edit-button">
          Edit Story
        </button>
        <button onClick={() => onShare(story)} className="share-button">
          Share
        </button>
        <button onClick={() => onDownload(story)} className="download-button">
          Download PDF
        </button>
      </div>
    </div>
  );
};

export default StoryDisplay;
```

## 🔧 Advanced Integration Examples

### Batch Story Creation

```javascript
// Batch create multiple stories
const { StorytellerAPI } = require('@storytailor/node-sdk');

const storytailor = new StorytellerAPI({
  apiKey: 'sk_your_secret_key_here'
});

async function batchCreateStories(storyRequests) {
  const results = [];
  
  for (const request of storyRequests) {
    try {
      const story = await storytailor.stories.create({
        title: request.title,
        character: request.character,
        storyType: request.storyType,
        ageGroup: request.ageGroup,
        generateAssets: true
      });
      
      results.push({ success: true, story });
      
      // Wait between requests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      results.push({ success: false, error: error.message });
    }
  }
  
  return results;
}

// Usage
const storyRequests = [
  {
    title: 'The Brave Knight',
    character: { name: 'Sir Galahad', species: 'human' },
    storyType: 'adventure',
    ageGroup: '6-8'
  },
  {
    title: 'The Magic Garden',
    character: { name: 'Luna', species: 'fairy' },
    storyType: 'fantasy',
    ageGroup: '3-5'
  }
];

batchCreateStories(storyRequests).then(results => {
  console.log('Batch creation results:', results);
});
```

### Real-time Story Streaming

```javascript
// Real-time story streaming with Server-Sent Events
const express = require('express');
const { StorytellerAPI } = require('@storytailor/node-sdk');

const app = express();
const storytailor = new StorytellerAPI({
  apiKey: 'sk_your_secret_key_here'
});

app.get('/stream-story/:storyId', async (req, res) => {
  const { storyId } = req.params;
  
  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  try {
    // Stream story generation
    const stream = await storytailor.stories.generateStream(storyId);
    
    stream.on('chunk', (chunk) => {
      res.write(`data: ${JSON.stringify({
        type: 'story_chunk',
        content: chunk.content
      })}\n\n`);
    });
    
    stream.on('complete', (story) => {
      res.write(`data: ${JSON.stringify({
        type: 'story_complete',
        story: story
      })}\n\n`);
      res.end();
    });
    
    stream.on('error', (error) => {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: error.message
      })}\n\n`);
      res.end();
    });
    
  } catch (error) {
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: error.message
    })}\n\n`);
    res.end();
  }
});

app.listen(3000);
```

### Custom Analytics Integration

```javascript
// Custom analytics integration
const { StorytellerAPI } = require('@storytailor/node-sdk');
const analytics = require('your-analytics-service');

const storytailor = new StorytellerAPI({
  apiKey: 'sk_your_secret_key_here',
  
  // Custom event handlers
  onStoryStart: (data) => {
    analytics.track('story_started', {
      userId: data.userId,
      storyType: data.storyType,
      timestamp: new Date()
    });
  },
  
  onCharacterCreated: (data) => {
    analytics.track('character_created', {
      userId: data.userId,
      characterName: data.character.name,
      species: data.character.species,
      timestamp: new Date()
    });
  },
  
  onStoryCompleted: (data) => {
    analytics.track('story_completed', {
      userId: data.userId,
      storyId: data.storyId,
      title: data.title,
      duration: data.duration,
      timestamp: new Date()
    });
  }
});

// Custom metrics collection
async function collectCustomMetrics() {
  const metrics = await storytailor.analytics.getMetrics({
    timeframe: '7d',
    metrics: ['story_completion_rate', 'user_engagement', 'popular_characters']
  });
  
  // Send to your analytics service
  analytics.gauge('storytailor.completion_rate', metrics.completionRate);
  analytics.gauge('storytailor.engagement_score', metrics.engagementScore);
  
  return metrics;
}
```

## 📚 More Examples

### Complete Integration Examples
- [E-commerce Story Integration](./e-commerce-integration.md)
- [Educational Platform Integration](./educational-integration.md)
- [Healthcare App Integration](./healthcare-integration.md)
- [Gaming Platform Integration](./gaming-integration.md)

### Platform-Specific Examples
- [WordPress Plugin](./wordpress-plugin.md)
- [Shopify App](./shopify-app.md)
- [Discord Bot](./discord-bot.md)
- [Slack App](./slack-app.md)

### Advanced Use Cases
- [Multi-tenant SaaS Integration](./multi-tenant-saas.md)
- [White-label Implementation](./white-label-implementation.md)
- [Enterprise SSO Integration](./enterprise-sso.md)
- [Custom AI Model Integration](./custom-ai-models.md)

---

## 🔗 Related Resources

- 📖 **[Integration Guides](../integration-guides/README.md)**
- 🛠 **[Developer Tools](../tools/README.md)**
- 📚 **[API Reference](../api-reference/README.md)**
- 🧪 **[Testing Tools](../tools/testing.md)**
- 💬 **[Community Forum](https://community.storytailor.com)**

Need help with your integration? Check out our [support resources](../support/README.md) or [contact our team](../support/contact.md)!
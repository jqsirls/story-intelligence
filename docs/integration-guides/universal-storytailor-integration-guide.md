# Universal Storytailor Agent Integration Guide

## Quick Start (5 Minutes)

### 1. Web Integration

Add Storytailor to any website with just a few lines of code:

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Website with Storytailor</title>
</head>
<body>
    <!-- Your existing content -->
    
    <!-- Storytailor container -->
    <div id="storyteller-chat" style="width: 400px; height: 600px;"></div>
    
    <!-- Storytailor SDK -->
    <script src="https://cdn.storytailor.com/sdk/web/v1/storyteller.js"></script>
    <script>
        const storyteller = new StorytellerWebSDK({
            apiKey: 'your-api-key-here',
            containerId: 'storyteller-chat',
            theme: 'child-friendly',
            voiceEnabled: true,
            smartHomeEnabled: true
        });
        
        storyteller.init();
    </script>
</body>
</html>
```

### 2. Mobile Integration (iOS)

```swift
import StorytellerSDK

class ViewController: UIViewController {
    let storyteller = StorytellerMobileSDK(apiKey: "your-api-key")
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        Task {
            let session = try await storyteller.startConversation(
                config: ConversationConfig(
                    platform: .mobile,
                    voiceEnabled: true,
                    smartHomeEnabled: true
                )
            )
            
            // Start chatting
            let response = try await storyteller.sendMessage("Let's create a story!")
            print(response.content)
        }
    }
}
```

### 3. API Integration

```javascript
const { StorytellerAPI } = require('@storytailor/api-client');

const storyteller = new StorytellerAPI({
    apiKey: process.env.STORYTAILOR_API_KEY,
    baseUrl: 'https://orchestrator.storytailor.com'
});

// Start conversation
const session = await storyteller.startConversation({
    platform: 'api',
    voiceEnabled: false,
    smartHomeEnabled: false
});

// Send message
const response = await storyteller.sendMessage(session.sessionId, {
    type: 'text',
    content: 'I want to create a bedtime story about a brave little mouse'
});

console.log(response.content);
```

## Platform-Specific Integrations

### Discord Bot

```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const { StorytellerAPI } = require('@storytailor/api-client');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
const storyteller = new StorytellerAPI({ apiKey: process.env.STORYTAILOR_API_KEY });

const userSessions = new Map();

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    if (message.content.startsWith('!story')) {
        let sessionId = userSessions.get(message.author.id);
        
        if (!sessionId) {
            const session = await storyteller.startConversation({
                platform: 'discord',
                userId: message.author.id
            });
            sessionId = session.sessionId;
            userSessions.set(message.author.id, sessionId);
        }
        
        const userMessage = message.content.slice(6).trim();
        const response = await storyteller.sendMessage(sessionId, {
            type: 'text',
            content: userMessage || 'Let\'s create a story!'
        });
        
        message.reply(response.content);
    }
});

client.login(process.env.DISCORD_TOKEN);
```

### Slack App

```javascript
const { App } = require('@slack/bolt');
const { StorytellerAPI } = require('@storytailor/api-client');

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
});

const storyteller = new StorytellerAPI({ apiKey: process.env.STORYTAILOR_API_KEY });
const userSessions = new Map();

app.message(/story/i, async ({ message, say }) => {
    let sessionId = userSessions.get(message.user);
    
    if (!sessionId) {
        const session = await storyteller.startConversation({
            platform: 'slack',
            userId: message.user
        });
        sessionId = session.sessionId;
        userSessions.set(message.user, sessionId);
    }
    
    const response = await storyteller.sendMessage(sessionId, {
        type: 'text',
        content: message.text
    });
    
    await say(response.content);
});

(async () => {
    await app.start(process.env.PORT || 3000);
    console.log('⚡️ Storytailor Slack app is running!');
})();
```

### WordPress Plugin

```php
<?php
/**
 * Plugin Name: Storytailor Chat Widget
 * Description: Add AI storytelling to your WordPress site
 * Version: 1.0.0
 */

// Add settings page
add_action('admin_menu', 'storytailor_admin_menu');

function storytailor_admin_menu() {
    add_options_page(
        'Storytailor Settings',
        'Storytailor',
        'manage_options',
        'storytailor-settings',
        'storytailor_settings_page'
    );
}

function storytailor_settings_page() {
    if (isset($_POST['submit'])) {
        update_option('storytailor_api_key', sanitize_text_field($_POST['api_key']));
        update_option('storytailor_theme', sanitize_text_field($_POST['theme']));
    }
    
    $api_key = get_option('storytailor_api_key', '');
    $theme = get_option('storytailor_theme', 'child-friendly');
    
    ?>
    <div class="wrap">
        <h1>Storytailor Settings</h1>
        <form method="post">
            <table class="form-table">
                <tr>
                    <th scope="row">API Key</th>
                    <td><input type="text" name="api_key" value="<?php echo esc_attr($api_key); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th scope="row">Theme</th>
                    <td>
                        <select name="theme">
                            <option value="child-friendly" <?php selected($theme, 'child-friendly'); ?>>Child Friendly</option>
                            <option value="magical" <?php selected($theme, 'magical'); ?>>Magical</option>
                            <option value="educational" <?php selected($theme, 'educational'); ?>>Educational</option>
                        </select>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}

// Add chat widget to footer
add_action('wp_footer', 'storytailor_chat_widget');

function storytailor_chat_widget() {
    $api_key = get_option('storytailor_api_key');
    if (empty($api_key)) return;
    
    $theme = get_option('storytailor_theme', 'child-friendly');
    ?>
    <div id="storyteller-widget" style="position: fixed; bottom: 20px; right: 20px; width: 350px; height: 500px; z-index: 9999;"></div>
    
    <script src="https://cdn.storytailor.com/sdk/web/v1/storyteller.js"></script>
    <script>
        const storyteller = new StorytellerWebSDK({
            apiKey: '<?php echo esc_js($api_key); ?>',
            containerId: 'storyteller-widget',
            theme: '<?php echo esc_js($theme); ?>',
            voiceEnabled: true,
            smartHomeEnabled: false
        });
        
        storyteller.init();
    </script>
    <?php
}

// Add shortcode support
add_shortcode('storytailor', 'storytailor_shortcode');

function storytailor_shortcode($atts) {
    $atts = shortcode_atts([
        'width' => '400px',
        'height' => '600px',
        'theme' => 'child-friendly',
        'voice' => 'true'
    ], $atts);
    
    $api_key = get_option('storytailor_api_key');
    if (empty($api_key)) {
        return '<p>Storytailor API key not configured.</p>';
    }
    
    $widget_id = 'storyteller-' . uniqid();
    
    ob_start();
    ?>
    <div id="<?php echo $widget_id; ?>" style="width: <?php echo esc_attr($atts['width']); ?>; height: <?php echo esc_attr($atts['height']); ?>;"></div>
    
    <script>
        (function() {
            const storyteller = new StorytellerWebSDK({
                apiKey: '<?php echo esc_js($api_key); ?>',
                containerId: '<?php echo $widget_id; ?>',
                theme: '<?php echo esc_js($atts['theme']); ?>',
                voiceEnabled: <?php echo $atts['voice'] === 'true' ? 'true' : 'false'; ?>,
                smartHomeEnabled: false
            });
            
            storyteller.init();
        })();
    </script>
    <?php
    return ob_get_clean();
}
?>
```

## Voice Assistant Integrations

### Amazon Alexa Skill

```json
{
  "manifest": {
    "publishingInformation": {
      "locales": {
        "en-US": {
          "name": "Storytailor",
          "invocationName": "storytailor",
          "summary": "AI storytelling for children",
          "description": "Create personalized stories with AI"
        }
      }
    },
    "apis": {
      "custom": {
        "endpoint": {
          "uri": "https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging/webhook/alexa"
        }
      }
    }
  }
}
```

### Google Assistant Action

```yaml
# action.yaml
runtime: nodejs18
entryPoint: webhook

actions:
  storytailor:
    handler:
      webhookHandler: storytailor
    intent:
      - name: storytailor.create_story
        trainingPhrases:
          - "create a story"
          - "tell me a story"
          - "let's make a story"
        parameters:
          - name: story_type
            type: story_type_entity
            required: false

types:
  story_type_entity:
    synonym:
      entities:
        bedtime:
          synonyms: ["bedtime", "sleep", "night"]
        adventure:
          synonyms: ["adventure", "exciting", "action"]
        educational:
          synonyms: ["educational", "learning", "teach"]
```

### Apple Siri Shortcuts

```javascript
// Siri Shortcuts integration via iOS app
import Intents

class StorytellerIntentHandler: NSObject, CreateStoryIntentHandling {
    func handle(intent: CreateStoryIntent, completion: @escaping (CreateStoryIntentResponse) -> Void) {
        let storyteller = StorytellerMobileSDK(apiKey: "your-api-key")
        
        Task {
            let session = try await storyteller.startConversation(
                config: ConversationConfig(platform: .siri)
            )
            
            let storyType = intent.storyType?.rawValue ?? "adventure"
            let response = try await storyteller.sendMessage(
                session.sessionId,
                "Create a \(storyType) story"
            )
            
            let intentResponse = CreateStoryIntentResponse(code: .success, userActivity: nil)
            intentResponse.story = response.content
            completion(intentResponse)
        }
    }
}
```

## Advanced Integrations

### React Component

```jsx
import React, { useEffect, useRef } from 'react';

const StorytellerChat = ({ 
    apiKey, 
    theme = 'child-friendly',
    voiceEnabled = true,
    onStoryCreated,
    onError 
}) => {
    const containerRef = useRef(null);
    const storytellerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current || storytellerRef.current) return;

        const storyteller = new window.StorytellerWebSDK({
            apiKey,
            containerId: containerRef.current.id,
            theme,
            voiceEnabled,
            smartHomeEnabled: true
        });

        storyteller.on('storyCreated', onStoryCreated);
        storyteller.on('error', onError);

        storyteller.init();
        storytellerRef.current = storyteller;

        return () => {
            if (storytellerRef.current) {
                storytellerRef.current.destroy();
                storytellerRef.current = null;
            }
        };
    }, [apiKey, theme, voiceEnabled]);

    return (
        <div 
            ref={containerRef}
            id={`storyteller-${Math.random().toString(36).substr(2, 9)}`}
            style={{ width: '100%', height: '100%' }}
        />
    );
};

export default StorytellerChat;
```

### Vue.js Component

```vue
<template>
  <div :id="containerId" class="storyteller-container"></div>
</template>

<script>
export default {
  name: 'StorytellerChat',
  props: {
    apiKey: {
      type: String,
      required: true
    },
    theme: {
      type: String,
      default: 'child-friendly'
    },
    voiceEnabled: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      containerId: `storyteller-${Math.random().toString(36).substr(2, 9)}`,
      storyteller: null
    };
  },
  async mounted() {
    this.storyteller = new window.StorytellerWebSDK({
      apiKey: this.apiKey,
      containerId: this.containerId,
      theme: this.theme,
      voiceEnabled: this.voiceEnabled,
      smartHomeEnabled: true
    });

    this.storyteller.on('storyCreated', (story) => {
      this.$emit('story-created', story);
    });

    this.storyteller.on('error', (error) => {
      this.$emit('error', error);
    });

    await this.storyteller.init();
  },
  beforeUnmount() {
    if (this.storyteller) {
      this.storyteller.destroy();
    }
  }
};
</script>

<style scoped>
.storyteller-container {
  width: 100%;
  height: 100%;
}
</style>
```

### Angular Component

```typescript
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef } from '@angular/core';

declare global {
  interface Window {
    StorytellerWebSDK: any;
  }
}

@Component({
  selector: 'app-storyteller-chat',
  template: `<div [id]="containerId" class="storyteller-container"></div>`,
  styles: [`
    .storyteller-container {
      width: 100%;
      height: 100%;
    }
  `]
})
export class StorytellerChatComponent implements OnInit, OnDestroy {
  @Input() apiKey!: string;
  @Input() theme: string = 'child-friendly';
  @Input() voiceEnabled: boolean = true;
  
  @Output() storyCreated = new EventEmitter<any>();
  @Output() error = new EventEmitter<any>();

  containerId = `storyteller-${Math.random().toString(36).substr(2, 9)}`;
  private storyteller: any;

  constructor(private elementRef: ElementRef) {}

  async ngOnInit() {
    this.storyteller = new window.StorytellerWebSDK({
      apiKey: this.apiKey,
      containerId: this.containerId,
      theme: this.theme,
      voiceEnabled: this.voiceEnabled,
      smartHomeEnabled: true
    });

    this.storyteller.on('storyCreated', (story: any) => {
      this.storyCreated.emit(story);
    });

    this.storyteller.on('error', (error: any) => {
      this.error.emit(error);
    });

    await this.storyteller.init();
  }

  ngOnDestroy() {
    if (this.storyteller) {
      this.storyteller.destroy();
    }
  }
}
```

## Configuration Options

### Complete Configuration Example

```javascript
const storyteller = new StorytellerWebSDK({
  // Required
  apiKey: 'your-api-key-here',
  containerId: 'storyteller-chat',
  
  // Optional - API Configuration
  baseUrl: 'https://orchestrator.storytailor.com', // Custom API endpoint
  
  // Optional - Features
  theme: 'child-friendly', // 'default' | 'child-friendly' | 'magical' | 'educational' | 'custom'
  voiceEnabled: true,
  smartHomeEnabled: true,
  offlineMode: true,
  
  // Optional - Customization
  customization: {
    colors: {
      primary: '#667eea',
      secondary: '#764ba2',
      accent: '#ff6b6b',
      background: '#ffffff',
      text: '#333333'
    },
    branding: {
      logo: 'https://yoursite.com/logo.png',
      name: 'Your Storyteller'
    },
    features: {
      showTypingIndicator: true,
      showTimestamps: false,
      allowFileUpload: true,
      maxMessageLength: 500
    }
  },
  
  // Optional - Parental Controls
  parentalControls: {
    enabled: true,
    ageRestrictions: {
      maxAge: 12,
      contentFiltering: 'strict', // 'none' | 'mild' | 'strict'
      requireParentalApproval: true
    }
  },
  
  // Optional - Privacy Settings
  privacySettings: {
    dataRetention: 'minimal', // 'minimal' | 'standard' | 'extended'
    consentLevel: 'explicit', // 'implicit' | 'explicit'
    coppaCompliant: true
  }
});
```

### Event Handling

```javascript
// Session events
storyteller.on('initialized', () => {
  console.log('Storyteller initialized');
});

storyteller.on('sessionStarted', (session) => {
  console.log('Session started:', session.sessionId);
});

// Message events
storyteller.on('messageReceived', (message) => {
  console.log('Bot response:', message.content);
});

storyteller.on('messagesCleared', () => {
  console.log('Chat history cleared');
});

// Voice events
storyteller.on('voiceEnabled', () => {
  console.log('Voice input enabled');
});

storyteller.on('voiceRecordingStarted', () => {
  console.log('Recording started');
});

storyteller.on('voiceProcessed', (result) => {
  console.log('Voice processed:', result.transcription);
});

// Story events
storyteller.on('storyCreated', (story) => {
  console.log('Story created:', story.title);
  // Trigger celebration animation
  showCelebration();
});

storyteller.on('characterCreated', (character) => {
  console.log('Character created:', character.name);
});

// Smart home events
storyteller.on('smartHomeAction', (actions) => {
  console.log('Smart home actions:', actions);
});

// Connection events
storyteller.on('online', () => {
  console.log('Connection restored');
});

storyteller.on('offline', () => {
  console.log('Connection lost - offline mode active');
});

// Error handling
storyteller.on('error', (error) => {
  console.error('Storyteller error:', error);
  // Show user-friendly error message
});
```

## API Reference

### REST API Endpoints

```
POST /v1/conversation/start
POST /v1/conversation/message
POST /v1/conversation/stream
POST /v1/conversation/voice
POST /v1/conversation/end

GET  /v1/stories
POST /v1/stories
GET  /v1/stories/:id
PUT  /v1/stories/:id
POST /v1/stories/:id/assets

POST /v1/characters
PUT  /v1/characters/:id

POST /v1/auth/authenticate
POST /v1/auth/link

POST /v1/smarthome/connect
POST /v1/smarthome/sync
```

### WebSocket API

```javascript
// Note: WebSocket endpoint not yet implemented - use REST API
const apiEndpoint = 'https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging';

// Start conversation
ws.send(JSON.stringify({
  type: 'start_conversation',
  config: {
    platform: 'web',
    voiceEnabled: true
  }
}));

// Send message
ws.send(JSON.stringify({
  type: 'send_message',
  sessionId: 'session-id',
  message: {
    type: 'text',
    content: 'Hello!'
  }
}));

// Stream message (real-time response)
ws.send(JSON.stringify({
  type: 'stream_message',
  sessionId: 'session-id',
  message: {
    type: 'text',
    content: 'Tell me a story'
  }
}));
```

## Deployment

### CDN Hosting

The Web SDK is available via CDN for easy integration:

```html
<!-- Latest version -->
<script src="https://cdn.storytailor.com/sdk/web/v1/storyteller.js"></script>

<!-- Specific version -->
<script src="https://cdn.storytailor.com/sdk/web/v1.0.0/storyteller.js"></script>

<!-- Minified version -->
<script src="https://cdn.storytailor.com/sdk/web/v1/storyteller.min.js"></script>
```

### Self-Hosted

```bash
# Download and host yourself
wget https://cdn.storytailor.com/sdk/web/v1/storyteller.js
# Host on your own CDN or server
```

### NPM Package

```bash
npm install @storytailor/web-sdk
```

```javascript
import { StorytellerWebSDK } from '@storytailor/web-sdk';

const storyteller = new StorytellerWebSDK({
  apiKey: 'your-api-key',
  containerId: 'chat-container'
});
```

## Getting Started

1. **Sign up** at [storytailor.com/developers](https://storytailor.com/developers)
2. **Get your API key** from the developer dashboard
3. **Choose your integration** method from the examples above
4. **Test** in development mode
5. **Deploy** to production

## Support

- **Documentation**: [docs.storytailor.com](https://docs.storytailor.com)
- **API Reference**: [orchestrator.storytailor.com](https://orchestrator.storytailor.com)
- **GitHub**: [github.com/storytailor/universal-agent](https://github.com/storytailor/universal-agent)
- **Discord**: [discord.gg/storytailor](https://discord.gg/storytailor)
- **Email**: developers@storytailor.com

## License

The Storytailor Universal Agent SDK is available under the MIT License.
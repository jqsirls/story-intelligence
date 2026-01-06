# Web SDK Integration Guide

The Storytailor Web SDK enables you to embed Story Intelligence™ powered storytelling capabilities directly into your website with just a few lines of code.

## Quick Start (5 Minutes)

### 1. Include the SDK

```html
<script src="https://cdn.storytailor.com/sdk/web/v1/storytailor.min.js"></script>
```

### 2. Initialize the Widget

```html
<div id="storytailor-widget"></div>

<script>
const storytailor = new StorytellerWebSDK({
  apiKey: '[REDACTED_API_KEY]',
  containerId: 'storytailor-widget',
  theme: 'default'
});

storytailor.initialize();
</script>
```

### 3. That's it!

Your website now has a fully functional AI storytelling chat widget.

## Installation Options

### CDN (Recommended for Quick Start)

```html
<script src="https://cdn.storytailor.com/sdk/web/v1/storytailor.min.js"></script>
```

### NPM Package

```bash
npm install @storytailor/web-sdk
```

```javascript
import { StorytellerWebSDK } from '@storytailor/web-sdk';

const storytailor = new StorytellerWebSDK({
  apiKey: '[REDACTED_API_KEY]',
  containerId: 'storytailor-widget'
});
```

### ES Modules

```html
<script type="module">
import { StorytellerWebSDK } from 'https://cdn.storytailor.com/sdk/web/v1/storytailor.esm.js';
</script>
```

## Configuration Options

```javascript
const storytailor = new StorytellerWebSDK({
  // Required
  apiKey: '[REDACTED_API_KEY]',
  containerId: 'storytailor-widget',
  
  // Optional
  theme: 'default', // 'default', 'dark', 'minimal', 'colorful'
  language: 'en', // 'en', 'es', 'fr', 'de', etc.
  voiceEnabled: true,
  offlineMode: true,
  customStyles: {
    primaryColor: '#6366f1',
    fontFamily: 'Inter, sans-serif'
  },
  
  // User context
  userId: 'user-123',
  userMetadata: {
    age: 8,
    preferences: ['adventure', 'animals']
  },
  
  // Callbacks
  onStoryComplete: (story) => {
    console.log('Story completed:', story);
  },
  onError: (error) => {
    console.error('SDK Error:', error);
  }
});
```

## Voice Integration

Enable voice input and output for a more immersive experience:

```javascript
const storytailor = new StorytellerWebSDK({
  apiKey: '[REDACTED_API_KEY]',
  containerId: 'storytailor-widget',
  voiceEnabled: true,
  voiceSettings: {
    autoPlay: true,
    voiceSpeed: 1.0,
    voiceGender: 'neutral', // 'male', 'female', 'neutral'
    language: 'en-US'
  }
});

// Voice controls
storytailor.startVoiceInput();
storytailor.stopVoiceInput();
storytailor.playAudio(audioUrl);
storytailor.pauseAudio();
```

## Theming and Customization

### Built-in Themes

```javascript
// Available themes
const themes = ['default', 'dark', 'minimal', 'colorful', 'child-friendly'];

const storytailor = new StorytellerWebSDK({
  apiKey: '[REDACTED_API_KEY]',
  containerId: 'storytailor-widget',
  theme: 'child-friendly'
});
```

### Custom Styling

```javascript
const storytailor = new StorytellerWebSDK({
  apiKey: '[REDACTED_API_KEY]',
  containerId: 'storytailor-widget',
  customStyles: {
    // Colors
    primaryColor: '#6366f1',
    secondaryColor: '#f3f4f6',
    textColor: '#1f2937',
    backgroundColor: '#ffffff',
    
    // Typography
    fontFamily: 'Inter, sans-serif',
    fontSize: '14px',
    
    // Layout
    borderRadius: '12px',
    padding: '16px',
    maxWidth: '400px',
    maxHeight: '600px',
    
    // Animation
    animationDuration: '200ms',
    animationEasing: 'ease-in-out'
  }
});
```

### CSS Customization

```css
/* Override default styles */
.storytailor-widget {
  --st-primary-color: #6366f1;
  --st-secondary-color: #f3f4f6;
  --st-text-color: #1f2937;
  --st-background-color: #ffffff;
  --st-border-radius: 12px;
  --st-font-family: 'Inter', sans-serif;
}

.storytailor-chat-bubble {
  background: var(--st-primary-color);
  color: white;
  border-radius: var(--st-border-radius);
}

.storytailor-input {
  border: 2px solid var(--st-secondary-color);
  border-radius: var(--st-border-radius);
  font-family: var(--st-font-family);
}
```

## Event Handling

```javascript
const storytailor = new StorytellerWebSDK({
  apiKey: '[REDACTED_API_KEY]',
  containerId: 'storytailor-widget',
  
  // Event callbacks
  onReady: () => {
    console.log('SDK is ready');
  },
  
  onConversationStart: (conversationId) => {
    console.log('Conversation started:', conversationId);
  },
  
  onCharacterCreated: (character) => {
    console.log('Character created:', character);
    // Save character to your database
  },
  
  onStoryProgress: (progress) => {
    console.log('Story progress:', progress);
    // Update progress bar
  },
  
  onStoryComplete: (story) => {
    console.log('Story completed:', story);
    // Save story, show completion UI
  },
  
  onError: (error) => {
    console.error('Error:', error);
    // Handle errors gracefully
  },
  
  onOffline: () => {
    console.log('SDK is offline');
    // Show offline indicator
  },
  
  onOnline: () => {
    console.log('SDK is back online');
    // Hide offline indicator, sync data
  }
});

// Manual event listeners
storytailor.on('message', (message) => {
  console.log('New message:', message);
});

storytailor.on('typing', (isTyping) => {
  console.log('AI is typing:', isTyping);
});
```

## Advanced Features

### Offline Mode

```javascript
const storytailor = new StorytellerWebSDK({
  apiKey: '[REDACTED_API_KEY]',
  containerId: 'storytailor-widget',
  offlineMode: true,
  offlineSettings: {
    maxStoredStories: 10,
    syncOnReconnect: true,
    showOfflineIndicator: true
  }
});

// Check offline status
if (storytailor.isOffline()) {
  console.log('Currently offline');
}

// Manual sync
storytailor.syncOfflineData().then(() => {
  console.log('Sync complete');
});
```

### Real-time Streaming

```javascript
const storytailor = new StorytellerWebSDK({
  apiKey: '[REDACTED_API_KEY]',
  containerId: 'storytailor-widget',
  streaming: true,
  streamingSettings: {
    enableTypingIndicator: true,
    chunkSize: 50, // Characters per chunk
    delay: 100 // ms between chunks
  }
});
```

### Multi-language Support

```javascript
const storytailor = new StorytellerWebSDK({
  apiKey: '[REDACTED_API_KEY]',
  containerId: 'storytailor-widget',
  language: 'es', // Spanish
  localization: {
    welcomeMessage: '¡Hola! Vamos a crear una historia juntos.',
    inputPlaceholder: 'Escribe tu mensaje aquí...',
    voiceButtonLabel: 'Hablar'
  }
});

// Change language dynamically
storytailor.setLanguage('fr');
```

## Integration Examples

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
          // Handle story completion
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
```

### Vue.js Integration

```vue
<template>
  <div ref="storytailorContainer" id="storytailor-widget"></div>
</template>

<script>
import { StorytellerWebSDK } from '@storytailor/web-sdk';

export default {
  name: 'StorytellerWidget',
  props: ['apiKey', 'userId'],
  
  mounted() {
    this.storytailor = new StorytellerWebSDK({
      apiKey: this.apiKey,
      containerId: 'storytailor-widget',
      userId: this.userId,
      onStoryComplete: this.handleStoryComplete
    });
    
    this.storytailor.initialize();
  },
  
  beforeDestroy() {
    if (this.storytailor) {
      this.storytailor.destroy();
    }
  },
  
  methods: {
    handleStoryComplete(story) {
      this.$emit('story-complete', story);
    }
  }
};
</script>
```

### Angular Integration

```typescript
import { Component, ElementRef, Input, OnInit, OnDestroy } from '@angular/core';
import { StorytellerWebSDK } from '@storytailor/web-sdk';

@Component({
  selector: 'app-storyteller-widget',
  template: '<div #storytailorContainer id="storytailor-widget"></div>'
})
export class StorytellerWidgetComponent implements OnInit, OnDestroy {
  @Input() apiKey: string;
  @Input() userId: string;
  
  private storytailor: StorytellerWebSDK;

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    this.storytailor = new StorytellerWebSDK({
      apiKey: this.apiKey,
      containerId: 'storytailor-widget',
      userId: this.userId,
      onStoryComplete: (story) => {
        console.log('Story completed:', story);
      }
    });
    
    this.storytailor.initialize();
  }

  ngOnDestroy() {
    if (this.storytailor) {
      this.storytailor.destroy();
    }
  }
}
```

## Testing and Debugging

### Debug Mode

```javascript
const storytailor = new StorytellerWebSDK({
  apiKey: '[REDACTED_API_KEY]',
  containerId: 'storytailor-widget',
  debug: true, // Enable debug logging
  debugSettings: {
    logLevel: 'verbose', // 'error', 'warn', 'info', 'verbose'
    showNetworkRequests: true,
    showStateChanges: true
  }
});

// Access debug information
console.log(storytailor.getDebugInfo());
```

### Testing with Sandbox

```javascript
const storytailor = new StorytellerWebSDK({
  apiKey: '[REDACTED_API_KEY]',
  containerId: 'storytailor-widget',
  environment: 'sandbox', // Use sandbox environment
  mockData: true // Use mock responses for testing
});
```

## Performance Optimization

### Lazy Loading

```javascript
// Load SDK only when needed
async function loadStorytailor() {
  const { StorytellerWebSDK } = await import('@storytailor/web-sdk');
  
  const storytailor = new StorytellerWebSDK({
    apiKey: '[REDACTED_API_KEY]',
    containerId: 'storytailor-widget'
  });
  
  return storytailor;
}

// Initialize on user interaction
document.getElementById('start-story-btn').addEventListener('click', async () => {
  const storytailor = await loadStorytailor();
  storytailor.initialize();
});
```

### Preloading

```javascript
const storytailor = new StorytellerWebSDK({
  apiKey: '[REDACTED_API_KEY]',
  containerId: 'storytailor-widget',
  preload: {
    voices: true, // Preload voice models
    assets: ['common-characters', 'story-templates'],
    cacheSize: '50MB'
  }
});
```

## Security Best Practices

### API Key Management

```javascript
// ❌ Don't expose API keys in client-side code
const storytailor = new StorytellerWebSDK({
  apiKey: '[REDACTED_API_KEY]' // Never do this!
});

// ✅ Use public keys for client-side integration
const storytailor = new StorytellerWebSDK({
  apiKey: '[REDACTED_API_KEY]' // Public key is safe
});

// ✅ Or use server-side token generation
const storytailor = new StorytellerWebSDK({
  tokenEndpoint: '/api/storytailor-token', // Your server endpoint
  userId: 'user-123'
});
```

### Content Security Policy

```html
<meta http-equiv="Content-Security-Policy" content="
  script-src 'self' https://cdn.storytailor.com;
  connect-src 'self' https://api.storytailor.com wss://ws.storytailor.com;
  media-src 'self' https://assets.storytailor.com;
">
```

## Troubleshooting

### Common Issues

1. **Widget not appearing**
   - Check that the container element exists
   - Verify API key is valid
   - Check browser console for errors

2. **Voice not working**
   - Ensure HTTPS (required for microphone access)
   - Check microphone permissions
   - Verify browser compatibility

3. **Slow loading**
   - Enable preloading for better performance
   - Use CDN for faster asset delivery
   - Consider lazy loading for non-critical features

### Debug Tools

```javascript
// Check SDK status
console.log(storytailor.getStatus());

// View current configuration
console.log(storytailor.getConfig());

// Check network connectivity
console.log(storytailor.isOnline());

// View error logs
console.log(storytailor.getErrorLogs());
```

## Next Steps

- [Mobile SDK Integration](./mobile-sdk.md) - Add to mobile apps
- [Voice Platform Integration](./voice-platforms.md) - Extend to voice assistants
- [API Reference](../api-reference/README.md) - Complete API documentation
- [Examples](../examples/web-sdk-examples.md) - More code examples
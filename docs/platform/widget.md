Status: Draft  
Audience: Partner  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 4 - Embeddable widget documentation with code references

# Storytailor Embeddable Widget

## Overview

The Storytailor Embeddable Widget provides a beautiful, responsive chat/voice interface that can be embedded into any website, supporting Webflow, Framer, Wix, and custom implementations.

**Package:** `packages/storytailor-embed/`
**Entry Point:** `packages/storytailor-embed/src/index.ts`

**Code References:**
- `packages/storytailor-embed/src/index.ts:1-14` - Entry point
- `packages/storytailor-embed/src/StorytalorEmbed.ts:1-726` - Main widget class
- `docs/storytailor/partner_integration.md:368-395` - Widget usage examples

## Installation

### HTML Script Tag

```html
<script src="https://cdn.storytailor.com/embed/v1/storytailor-embed.js"></script>
```

**Code References:**
- `packages/storytailor-embed/` - Widget package

### NPM

```bash
npm install @storytailor/embed
```

## Basic Usage

### HTML Integration

```html
<div id="storytailor-container"></div>

<script>
  const embed = new StorytalorEmbed({
    apiKey: 'your-api-key',
    container: '#storytailor-container',
    // Production URL (us-east-1): https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws
    apiBaseURL: 'https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws', // Production URL
    theme: 'child-friendly',
    autoStart: true
  });

  embed.init();
</script>
```

**Code References:**
- `packages/storytailor-embed/src/StorytalorEmbed.ts:89-177` - Constructor and initialization
- `packages/storytailor-embed/src/StorytalorEmbed.ts:145-177` - init() method

### JavaScript/TypeScript Integration

```javascript
import StorytalorEmbed from '@storytailor/embed';

const embed = new StorytalorEmbed({
  apiKey: 'your-api-key',
  container: document.getElementById('storytailor-container'),
  theme: 'child-friendly',
  features: {
    voice: true,
    stories: true,
    reader: true,
    smartHome: false,
    offline: true
  }
});

await embed.init();
```

**Code References:**
- `packages/storytailor-embed/src/StorytalorEmbed.ts:18-61` - Configuration interface

## Configuration

### StorytalorEmbedConfig Interface

```typescript
interface StorytalorEmbedConfig {
  // Required
  apiKey: string;
  container: string | HTMLElement;
  
  // Theme & Appearance
  theme?: 'child-friendly' | 'educational' | 'magical' | 'custom';
  darkMode?: boolean | 'auto';
  
  // Features
  features?: {
    voice?: boolean;
    stories?: boolean;
    reader?: boolean;
    smartHome?: boolean;
    offline?: boolean;
  };
  
  // Customization
  branding?: {
    logo?: string;
    name?: string;
    colors?: {
      primary?: string;
      accent?: string;
      background?: string;
      text?: string;
    };
  };
  
  // Behavior
  autoStart?: boolean;
  welcomeMessage?: string;
  language?: string;
  
  // Privacy & Safety
  coppaMode?: boolean;
  parentalControls?: boolean;
  dataRetention?: 'minimal' | 'standard' | 'extended';
  
  // Advanced
  baseUrl?: string;
  debug?: boolean;
}
```

**Code References:**
- `packages/storytailor-embed/src/StorytalorEmbed.ts:18-61` - Configuration interface

## Features

### Chat Interface

**Send Message:**
```javascript
await embed.sendMessage('Create an adventure story');
```

**Code References:**
- `packages/storytailor-embed/src/StorytalorEmbed.ts:182-200` - sendMessage() method

### Story Reader

**Read Story:**
```javascript
await embed.readStory(storyId);
```

**Code References:**
- `packages/storytailor-embed/src/StorytalorEmbed.ts` - Story reader methods

### Voice Interface

**Enable Voice:**
```javascript
await embed.enableVoice();
```

**Code References:**
- `packages/storytailor-embed/src/StorytalorEmbed.ts` - Voice interface methods

### Story Grid

**View Stories:**
```javascript
await embed.showStoryGrid();
```

**Code References:**
- `packages/storytailor-embed/src/StorytalorEmbed.ts` - Story grid methods

## Theming

### Predefined Themes

- `child-friendly` - Child-friendly theme (default)
- `educational` - Educational theme
- `magical` - Magical theme
- `custom` - Custom theme

**Code References:**
- `packages/storytailor-embed/src/StorytalorEmbed.ts:24` - Theme options
- `packages/storytailor-embed/src/theme/DesignTokens.ts` - Design tokens

### Custom Branding

```javascript
const embed = new StorytalorEmbed({
  // ...
  branding: {
    logo: 'https://example.com/logo.png',
    name: 'My Storyteller',
    colors: {
      primary: '#667eea',
      accent: '#ff6b6b',
      background: '#ffffff',
      text: '#333333'
    }
  }
});
```

**Code References:**
- `packages/storytailor-embed/src/StorytalorEmbed.ts:37-46` - Branding configuration

## Privacy & Safety

### COPPA Mode

```javascript
const embed = new StorytalorEmbed({
  // ...
  coppaMode: true,
  parentalControls: true,
  dataRetention: 'minimal'
});
```

**Code References:**
- `packages/storytailor-embed/src/StorytalorEmbed.ts:54-56` - Privacy settings

## Events

### Available Events

- `init.start` - Initialization started
- `init.complete` - Initialization completed
- `init.error` - Initialization error
- `message.sent` - Message sent
- `message.received` - Message received
- `story.completed` - Story completed
- `error` - Error occurred

**Code References:**
- `packages/storytailor-embed/src/StorytalorEmbed.ts:89` - EventEmitter extension
- Various emit() calls throughout the widget

## API Methods

### Main Methods

- `init()` - Initialize widget
- `sendMessage(content: string)` - Send message
- `readStory(storyId: string)` - Read story
- `showStoryGrid()` - Show story grid
- `enableVoice()` - Enable voice
- `destroy()` - Destroy widget instance

**Code References:**
- `packages/storytailor-embed/src/StorytalorEmbed.ts:145-726` - Complete API implementation

## Related Documentation

- **Partner Integration:** See [Partner Integration Guide](../../storytailor/partner_integration.md)
- **Web SDK:** See [Web SDK Documentation](./sdks/web-sdk.md)
- **REST API:** See [REST API Documentation](./sdks/rest-api.md)

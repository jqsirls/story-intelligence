# Storytailor Embeddable Widget - What

**Status**: ✅ Active
**Last Updated**: 2025-12-17

## Core Functionality

The Storytailor Embeddable Widget provides a beautiful, responsive chat/voice interface that can be embedded into any website. Its primary functions include:

1. **Chat Interface**: Full conversational interface with message sending and receiving
2. **Voice Interface**: Voice input/output capabilities with browser-based recording
3. **Story Reader**: Read and display stories within the widget
4. **Story Grid**: Browse and select from available stories
5. **Theming System**: Predefined themes and custom branding support
6. **Privacy & Safety**: COPPA mode, parental controls, and configurable data retention
7. **Event System**: Comprehensive event system for integration monitoring

## Technical Architecture

### Core Components

- **StorytalorEmbed** (`packages/storytailor-embed/src/StorytalorEmbed.ts`): Main widget class handling initialization, configuration, and API interactions
- **Theme System** (`packages/storytailor-embed/src/theme/`): Theming system with design tokens and predefined themes
- **Chat Interface**: Conversational UI with message history and input handling
- **Voice Interface**: Voice recording and playback with browser APIs
- **Story Reader**: Story display and reading interface
- **Story Grid**: Story browsing and selection interface
- **Event Emitter**: Event system for integration monitoring

### Widget Configuration

**Configuration Interface**:
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
  
  // Privacy & Safety
  coppaMode?: boolean;
  parentalControls?: boolean;
  dataRetention?: 'minimal' | 'standard' | 'extended';
}
```

**Code Reference**: `packages/storytailor-embed/src/StorytalorEmbed.ts:18-61`

## Key Features

### Chat Interface

**Send Message**:
```javascript
await embed.sendMessage('Create an adventure story');
```

**Code Reference**: `packages/storytailor-embed/src/StorytalorEmbed.ts:182-200`

### Voice Interface

**Enable Voice**:
```javascript
await embed.enableVoice();
```

**Features**:
- Browser-based voice recording
- Voice playback
- Real-time voice streaming

**Code Reference**: `packages/storytailor-embed/src/StorytalorEmbed.ts` - Voice interface methods

### Story Reader

**Read Story**:
```javascript
await embed.readStory(storyId);
```

**Features**:
- Story display within widget
- Reading interface with navigation
- Story metadata display

**Code Reference**: `packages/storytailor-embed/src/StorytalorEmbed.ts` - Story reader methods

### Story Grid

**View Stories**:
```javascript
await embed.showStoryGrid();
```

**Features**:
- Browse available stories
- Story thumbnails and metadata
- Story selection interface

**Code Reference**: `packages/storytailor-embed/src/StorytalorEmbed.ts` - Story grid methods

### Theming System

**Predefined Themes**:
- `child-friendly` - Child-friendly theme (default)
- `educational` - Educational theme
- `magical` - Magical theme
- `custom` - Custom theme with branding

**Custom Branding**:
```javascript
const embed = new StorytalorEmbed({
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

**Code Reference**: `packages/storytailor-embed/src/theme/DesignTokens.ts` - Design tokens

### Privacy & Safety

**COPPA Mode**:
```javascript
const embed = new StorytalorEmbed({
  coppaMode: true,
  parentalControls: true,
  dataRetention: 'minimal'
});
```

**Features**:
- COPPA compliance mode
- Parental controls
- Configurable data retention
- Privacy-first design

**Code Reference**: `packages/storytailor-embed/src/StorytalorEmbed.ts:54-56` - Privacy settings

### Event System

**Available Events**:
- `init.start` - Initialization started
- `init.complete` - Initialization completed
- `init.error` - Initialization error
- `message.sent` - Message sent
- `message.received` - Message received
- `story.completed` - Story completed
- `error` - Error occurred

**Code Reference**: `packages/storytailor-embed/src/StorytalorEmbed.ts:89` - EventEmitter extension

## Integration Points

### Internal Systems

- **REST API**: Widget communicates with Storytailor REST API for all operations
- **WebSocket/SSE**: Real-time updates via WebSocket or SSE (if configured)
- **Authentication Service**: API key authentication for widget access

### External Systems

- **Website Platforms**: Webflow, Framer, Wix, custom websites
- **CDN**: Optional CDN distribution for widget JavaScript
- **Browser APIs**: Voice recording, LocalStorage, WebSocket

## Code References

- `packages/storytailor-embed/src/index.ts:1-14` - Entry point
- `packages/storytailor-embed/src/StorytalorEmbed.ts:1-726` - Main widget class
- `packages/storytailor-embed/src/theme/DesignTokens.ts` - Design tokens
- `docs/storytailor/partner_integration.md:368-395` - Widget usage examples

## Related Documentation

- [Widget Overview](./README.md) - Widget overview
- [Widget Documentation](../widget.md) - Complete widget documentation
- [Partner Integration Guide](../../storytailor/partner_integration.md) - Integration examples

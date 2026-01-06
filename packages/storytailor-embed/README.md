# 🌟 Storytailor Embeddable Widget

Beautiful, responsive chat/voice interface that can be embedded anywhere - Webflow, Framer, Wix, custom sites, or any web platform.

## ✨ Features

- **React Component Bundle**: Chat + voice UI, story cards, reader, modals
- **CSS-in-JS Theming**: Dark-mode ready, zero external fonts
- **Headless API**: JavaScript API for custom implementations
- **iframe Embed**: Drop-in solution for any platform
- **WebSocket Streaming**: Real-time text and audio streaming
- **Voice Commands**: Same router as Alexa/voice platforms
- **Story Reader**: Click = repeat word, long-press = phonetics, karaoke highlights
- **Progressive Web App**: Offline support, service worker caching
- **Privacy-First**: Per-library encryption, device keystore integration

## 🎨 Design System

Based on the brand design tokens:
- **Typography**: Inter Display (headings) + Inter (body)
- **Colors**: Brand blue palette with semantic accents
- **Motion**: Mercury OS-inspired cubic-bezier curves
- **Interactions**: Tatem-style card elevation, Sana.ai whitespace

## 📦 Installation

### CDN (Easiest)
```html
<script src="https://cdn.storytailor.com/embed/v1/storytailor-embed.js"></script>
```

### NPM
```bash
npm install @storytailor/embed
```

### iframe Embed
```html
<iframe 
  src="https://embed.storytailor.com/widget?key=YOUR_API_KEY&theme=magical"
  width="400" 
  height="600"
  frameborder="0">
</iframe>
```

## 🚀 Quick Start

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Site with Storytailor</title>
</head>
<body>
    <!-- Storytailor Widget Container -->
    <div id="storytailor-widget"></div>
    
    <!-- Load Storytailor Embed -->
    <script src="https://cdn.storytailor.com/embed/v1/storytailor-embed.js"></script>
    <script>
        StorytalorEmbed.init({
            apiKey: 'your-api-key',
            container: '#storytailor-widget',
            theme: 'magical',
            features: {
                voice: true,
                stories: true,
                reader: true
            }
        });
    </script>
</body>
</html>
```

## 🎯 Platform Integrations

### Webflow
1. Add Custom Code to page head:
```html
<script src="https://cdn.storytailor.com/embed/v1/storytailor-embed.js"></script>
```

2. Add HTML Embed element with:
```html
<div id="storytailor-widget" style="width: 100%; height: 600px;"></div>
<script>
StorytalorEmbed.init({
    apiKey: 'your-api-key',
    container: '#storytailor-widget',
    theme: 'child-friendly'
});
</script>
```

### Framer
1. Add Code Component
2. Paste the integration code
3. Configure via component properties

### Wix
1. Add HTML iFrame element
2. Set source to: `https://embed.storytailor.com/widget?key=YOUR_KEY`
3. Customize via URL parameters

## 📱 Responsive Design

Automatically adapts to:
- **Desktop**: Full chat interface with sidebar
- **Tablet**: Optimized touch interactions
- **Mobile**: Bottom sheet modal, voice-first
- **Smart TV**: Large text, remote navigation

## 🎮 Interactive Features

### Story Reader
- **Click word**: Repeat pronunciation
- **Long-press**: Slow phonetic breakdown
- **Follow-along**: Karaoke-style highlighting
- **Scroll-sync**: Jump ahead, reader follows
- **Keyboard navigation**: Full accessibility support

### Voice Commands
- "Show stories from today"
- "Create a bedtime story"
- "Read it again slower"
- "Show my account"
- "Change the lighting" (smart home)

### Story Management
- **Grid view**: 25/50 cards with pagination
- **Filters**: Character, date, mood, tags
- **Search**: Natural language story search
- **Collections**: Favorites, recent, shared

## 🔧 Configuration

```javascript
StorytalorEmbed.init({
    // Required
    apiKey: 'your-api-key',
    container: '#storytailor-widget',
    
    // Theme & Appearance
    theme: 'magical', // 'child-friendly' | 'educational' | 'magical' | 'custom'
    darkMode: 'auto', // true | false | 'auto'
    
    // Features
    features: {
        voice: true,
        stories: true,
        reader: true,
        smartHome: false,
        offline: true
    },
    
    // Customization
    branding: {
        logo: 'https://yoursite.com/logo.png',
        name: 'Your Storyteller',
        colors: {
            primary: '#667eea',
            accent: '#ff6b6b'
        }
    },
    
    // Behavior
    autoStart: true,
    welcomeMessage: "Hi! I'm your AI storyteller!",
    language: 'en',
    
    // Privacy & Safety
    coppaMode: true,
    parentalControls: true,
    dataRetention: 'minimal'
});
```

## 🎨 Theming

### Built-in Themes

**Child-Friendly**
- Rounded corners, bright colors
- Comic Sans typography
- Playful animations
- Large touch targets

**Magical**
- Gradient backgrounds
- Sparkle animations
- Fantasy color palette
- Whimsical interactions

**Educational**
- Clean, professional design
- High contrast colors
- Structured layouts
- Academic color scheme

**Custom**
- Full control over design tokens
- CSS custom properties
- Component-level styling
- Brand integration

### Design Tokens

```css
:root {
  /* Typography */
  --st-font-display: 'Inter Display', system-ui;
  --st-font-body: 'Inter', system-ui;
  
  /* Colors */
  --st-primary-500: #2970FF;
  --st-accent-500: #FF4438;
  --st-neutral-50: #FAFAFA;
  --st-neutral-900: #1B1D27;
  
  /* Spacing */
  --st-space-xs: 0.25rem;
  --st-space-sm: 0.5rem;
  --st-space-md: 1rem;
  --st-space-lg: 1.5rem;
  --st-space-xl: 2rem;
  
  /* Motion */
  --st-ease-out: cubic-bezier(0.16, 0.84, 0.44, 1);
  --st-duration-fast: 150ms;
  --st-duration-normal: 300ms;
}
```

## 🔌 API Integration

### Headless Mode

```javascript
import { StorytalorAPI } from '@storytailor/embed';

const storytailor = new StorytalorAPI({
    apiKey: 'your-api-key'
});

// Start conversation
const session = await storytailor.startSession();

// Send message
const response = await storytailor.sendMessage('Create a story about dragons');

// Get stories
const stories = await storytailor.getStories({ limit: 10 });

// Generate audio
const audio = await storytailor.synthesizeVoice(story.content);
```

### Event System

```javascript
StorytalorEmbed.on('story.created', (story) => {
    console.log('New story:', story.title);
    // Trigger celebration animation
    showConfetti();
});

StorytalorEmbed.on('voice.started', () => {
    // Show recording indicator
    showVoiceIndicator();
});

StorytalorEmbed.on('reader.wordClick', (word, timestamp) => {
    // Custom word interaction
    highlightWord(word);
});
```

## 📊 Analytics & Insights

```javascript
// Privacy-compliant analytics
StorytalorEmbed.on('analytics', (event) => {
    // Anonymous usage data
    gtag('event', event.type, {
        category: 'storytailor',
        action: event.action,
        value: event.duration
    });
});
```

## 🔒 Privacy & Security

- **Per-library encryption**: AES-256-GCM with device keystore
- **COPPA compliance**: Built-in parental controls
- **GDPR ready**: Data minimization, consent management
- **Content filtering**: Multi-layer safety pipeline
- **Audit logging**: Comprehensive security monitoring

## 🌐 Browser Support

- **Chrome**: 90+
- **Safari**: 14+
- **Firefox**: 88+
- **Edge**: 90+
- **Mobile**: iOS 14+, Android 10+

## 📚 Documentation

- **API Reference**: [docs.storytailor.com/embed](https://docs.storytailor.com/embed)
- **Examples**: [github.com/storytailor/embed-examples](https://github.com/storytailor/embed-examples)
- **Playground**: [embed.storytailor.com/playground](https://embed.storytailor.com/playground)

## 🆘 Support

- **Discord**: [discord.gg/storytailor](https://discord.gg/storytailor)
- **Email**: embed@storytailor.com
- **GitHub**: [github.com/storytailor/embed](https://github.com/storytailor/embed)
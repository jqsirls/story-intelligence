# Frankie Three-Modality Widget - Webflow Integration Guide

Complete guide for embedding Storytailor's therapeutic three-modality widget with Frankie into your Webflow site.

**Version**: 2.0.0 (December 24, 2025)  
**New**: Three modalities, Frankie character, live avatar, emotion detection

## 🎯 Two Integration Options

### Option 1: Full UI (Built-in Controls)
Use Storytailor's complete interface with tabs, buttons, and controls already built-in.

**Best for:** Quick integration, consistent branding, minimal custom development

**Example:** [`examples/webflow-full-ui.html`](examples/webflow-full-ui.html)

### Option 2: Custom UI (Your Design)
Use Storytailor's chat engine with your own Webflow-designed buttons and navigation.

**Best for:** Custom branding, specific design requirements, full design control

**Example:** [`examples/webflow-custom-ui.html`](examples/webflow-custom-ui.html)

---

## 📦 Option 1: Full UI Integration

### Step 1: Add Script to Page Settings

In Webflow, go to **Page Settings** → **Custom Code** → **Before </body> tag**:

```html
<script src="https://cdn.storytailor.com/embed/v1/storytailor-embed.js"></script>
```

### Step 2: Add Embed Element

1. Drag an **Embed** element onto your page
2. Paste this code:

```html
<div id="storytailor-widget" style="width: 100%; height: 600px;"></div>

<script>
  StorytalorEmbed.init({
    apiKey: 'your-api-key-here',
    container: '#storytailor-widget',
    theme: 'magical',
    features: {
      voice: true,
      stories: true,
      reader: true
    },
    autoStart: true,
    welcomeMessage: "Hi! I'm your AI storyteller. What kind of story would you like to create?"
  });
</script>
```

### Step 3: Style the Container

Wrap the embed in a Webflow div and style it:

- Set width: 100% or fixed (e.g., 400px)
- Set height: 600px minimum
- Add border-radius, shadow, etc. in Webflow

### Step 4: Get Your API Key

1. Go to https://storytailor.com/dashboard
2. Navigate to **Settings** → **API Keys**
3. Copy your API key
4. Replace `'your-api-key-here'` in the code

### Step 5: Publish

Publish your Webflow site and test!

---

## 🎨 Option 2: Custom UI Integration

### Step 1: Design Your UI in Webflow

Create your own buttons/tabs in Webflow's visual editor:

```
┌─────────────────────────────────────┐
│  [✨ Create Story] [📚 Memories] [🎭 Characters]  │
├─────────────────────────────────────┤
│                                     │
│     Storytailor Chat (Embed)        │
│                                     │
└─────────────────────────────────────┘
```

### Step 2: Add Script to Page Settings

Same as Option 1 - add the CDN script to page settings.

### Step 3: Add Chat Container

Add an **Embed** element for the chat:

```html
<div id="storytailor-chat" style="width: 100%; height: 600px;"></div>

<script>
  let storytailor;
  
  async function initStorytailor() {
    storytailor = await StorytalorEmbed.init({
      apiKey: 'your-api-key-here',
      container: '#storytailor-chat',
      theme: 'custom',  // Minimal UI
      features: {
        voice: true,
        stories: false,  // We'll handle with custom buttons
        reader: true
      },
      autoStart: true
    });
  }
  
  document.addEventListener('DOMContentLoaded', initStorytailor);
</script>
```

### Step 4: Connect Your Webflow Buttons

For each button you designed in Webflow:

1. Select the button
2. Go to **Element Settings** → **Custom Attributes**
3. Add attribute: `onclick` = `showCreateStory()`

Then add these functions to your embed:

```html
<script>
  function showCreateStory() {
    storytailor.sendMessage('I want to create a new story');
  }
  
  function showMemories() {
    storytailor.showStories();
  }
  
  function showCharacters() {
    storytailor.sendMessage('Show me my characters');
  }
</script>
```

### Step 5: Publish and Test

---

## 🎛️ Configuration Options

### Themes

```javascript
theme: 'magical'        // Purple gradient, sparkles
theme: 'child-friendly' // Bright colors, rounded
theme: 'educational'    // Clean, professional
theme: 'custom'         // Minimal UI, your styles
```

### Features

```javascript
features: {
  voice: true,        // Enable voice input/output
  stories: true,      // Show story grid
  reader: true,       // Enable story reader
  smartHome: false,   // Smart home controls
  offline: true       // Offline support
}
```

### Branding

```javascript
branding: {
  name: 'Your Brand',
  logo: 'https://yoursite.com/logo.png',
  colors: {
    primary: '#667eea',
    accent: '#764ba2'
  }
}
```

### Privacy & Safety

```javascript
coppaMode: true,          // COPPA compliance
parentalControls: true,   // Parental controls
dataRetention: 'minimal'  // Data retention policy
```

---

## 📱 Responsive Design

The widget automatically adapts to:

- **Desktop**: Full interface with sidebar
- **Tablet**: Touch-optimized controls
- **Mobile**: Bottom sheet modal, voice-first

Set breakpoints in Webflow:

```css
/* Desktop */
#storytailor-widget {
  height: 600px;
}

/* Tablet */
@media (max-width: 991px) {
  #storytailor-widget {
    height: 500px;
  }
}

/* Mobile */
@media (max-width: 767px) {
  #storytailor-widget {
    height: 400px;
    border-radius: 0;
  }
}
```

---

## 🔧 Advanced: JavaScript API

### Send Messages Programmatically

```javascript
storytailor.sendMessage('Create a story about dragons');
```

### Listen to Events

```javascript
storytailor.on('story.created', (story) => {
  console.log('New story:', story.title);
  // Update your custom UI
});

storytailor.on('voice.recording.start', () => {
  // Show recording indicator
});
```

### Get User Stories

```javascript
const stories = await storytailor.getStories({ limit: 20 });
// Build custom story grid
```

### Show Specific Story

```javascript
storytailor.showStory('story-id-123');
```

### Start Voice Recording

```javascript
storytailor.startVoiceRecording();
```

---

## 🎨 Styling Tips

### Match Your Webflow Design

1. Use `theme: 'custom'` for minimal UI
2. Wrap in a Webflow div with your styles
3. Use CSS custom properties to override colors:

```css
#storytailor-widget {
  --st-primary-500: #your-brand-color;
  --st-accent-500: #your-accent-color;
}
```

### Add Shadows and Effects

In Webflow, add effects to the container div:

- Box shadow: `0 20px 60px rgba(0, 0, 0, 0.3)`
- Border radius: `20px`
- Backdrop blur: `10px`

---

## 🚀 Performance Tips

### Lazy Load the Widget

Only load when user scrolls to it:

```javascript
const observer = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) {
    initStorytailor();
    observer.disconnect();
  }
});

observer.observe(document.getElementById('storytailor-widget'));
```

### Preconnect to CDN

Add to Webflow page settings (in `<head>`):

```html
<link rel="preconnect" href="https://cdn.storytailor.com">
<link rel="dns-prefetch" href="https://cdn.storytailor.com">
```

---

## 🐛 Troubleshooting

### Widget Not Showing

1. Check browser console for errors
2. Verify API key is correct
3. Ensure container has height set
4. Check that script loaded: `typeof StorytalorEmbed`

### Voice Not Working

1. Check browser permissions (microphone)
2. Ensure HTTPS (voice requires secure context)
3. Test in different browser

### Styling Issues

1. Use `theme: 'custom'` for full control
2. Check CSS specificity (Webflow styles may override)
3. Use `!important` if needed

---

## 📞 Support

- **Documentation**: https://docs.storytailor.com/embed
- **Examples**: https://github.com/storytailor/embed-examples
- **Email**: embed@storytailor.com
- **Discord**: https://discord.gg/storytailor

---

## 🎉 You're Done!

Your Storytailor widget is now live on Webflow. Users can:

- ✨ Create personalized stories with AI
- 🎤 Use voice input for hands-free interaction
- 📚 Browse and read their story library
- 🎭 Manage characters and preferences

**Next Steps:**
1. Test on different devices
2. Monitor usage in your dashboard
3. Customize the experience for your audience
4. Share with your community!


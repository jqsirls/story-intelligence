# Storytailor Embeddable Widget - Development Guide

**Status**: ✅ Active
**Last Updated**: 2025-12-17

## Local Development Setup

1. **Clone and Install**:
   ```bash
   git clone [repository-url]
   cd Storytailor-Agent
   npm install
   cd packages/storytailor-embed
   npm install
   ```

2. **Environment Variables**: Create `.env` file or set environment variables:
   ```bash
   STORYTAILOR_API_KEY=your-api-key
   STORYTAILOR_API_BASE_URL=https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   # Or for production build
   npm run build
   ```

4. **Run Tests**:
   ```bash
   npm test
   npm run test:coverage
   ```

## Code Structure

### Package Organization

```
packages/storytailor-embed/
├── src/
│   ├── index.ts                  # Entry point
│   ├── StorytalorEmbed.ts        # Main widget class
│   ├── theme/
│   │   └── DesignTokens.ts       # Design tokens
│   └── __tests__/                # Test files
└── package.json
```

### Key Components

- **StorytalorEmbed** (`src/StorytalorEmbed.ts`): Main widget class
  - **Key Methods**:
    - `init()`: Initialize widget
    - `sendMessage(content: string)`: Send message
    - `readStory(storyId: string)`: Read story
    - `showStoryGrid()`: Show story grid
    - `enableVoice()`: Enable voice interface
    - `destroy()`: Destroy widget instance

- **Theme System** (`src/theme/DesignTokens.ts`): Theming system
  - **Design Tokens**: Color, typography, spacing tokens
  - **Predefined Themes**: child-friendly, educational, magical
  - **Custom Branding**: Logo, colors, name customization

**Code References:**
- `packages/storytailor-embed/src/StorytalorEmbed.ts:1-726` - Main widget class
- `packages/storytailor-embed/src/theme/DesignTokens.ts` - Design tokens

## API Reference

### Initialization

**Method**: `new StorytalorEmbed(config)`

**Parameters**:
- `apiKey` (string, required): Storytailor API key
- `container` (string | HTMLElement, required): Container element or selector
- `theme` (string, optional): Theme name ('child-friendly', 'educational', 'magical', 'custom')
- `apiBaseURL` (string, optional): API base URL
- `features` (object, optional): Feature flags
- `branding` (object, optional): Custom branding
- `coppaMode` (boolean, optional): COPPA compliance mode

**Example**:
```javascript
const embed = new StorytalorEmbed({
  apiKey: 'your-api-key',
  container: '#storytailor-container',
  theme: 'child-friendly',
  autoStart: true
});

await embed.init();
```

**Code Reference**: `packages/storytailor-embed/src/StorytalorEmbed.ts:89-177`

### Send Message

**Method**: `sendMessage(content: string)`

**Example**:
```javascript
await embed.sendMessage('Create an adventure story');
```

**Code Reference**: `packages/storytailor-embed/src/StorytalorEmbed.ts:182-200`

### Read Story

**Method**: `readStory(storyId: string)`

**Example**:
```javascript
await embed.readStory('story_123');
```

**Code Reference**: `packages/storytailor-embed/src/StorytalorEmbed.ts` - Story reader methods

### Show Story Grid

**Method**: `showStoryGrid()`

**Example**:
```javascript
await embed.showStoryGrid();
```

**Code Reference**: `packages/storytailor-embed/src/StorytalorEmbed.ts` - Story grid methods

### Enable Voice

**Method**: `enableVoice()`

**Example**:
```javascript
await embed.enableVoice();
```

**Code Reference**: `packages/storytailor-embed/src/StorytalorEmbed.ts` - Voice interface methods

### Events

**Event Listening**:
```javascript
embed.on('message.received', (data) => {
  console.log('Message received:', data);
});

embed.on('story.completed', (data) => {
  console.log('Story completed:', data);
});
```

**Available Events**:
- `init.start` - Initialization started
- `init.complete` - Initialization completed
- `init.error` - Initialization error
- `message.sent` - Message sent
- `message.received` - Message received
- `story.completed` - Story completed
- `error` - Error occurred

**Code Reference**: `packages/storytailor-embed/src/StorytalorEmbed.ts:89` - EventEmitter extension

## Testing

### Running Tests

```bash
npm test
npm run test:coverage
```

### Test Structure

- Unit tests: `src/__tests__/unit/`
- Integration tests: `src/__tests__/integration/`
- E2E tests: Test widget in browser environment

### Testing Widget Locally

1. **Build Widget**:
   ```bash
   npm run build
   ```

2. **Create Test HTML**:
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <script src="./dist/storytailor-embed.js"></script>
   </head>
   <body>
     <div id="storytailor-container"></div>
     <script>
       const embed = new StorytalorEmbed({
         apiKey: 'test-api-key',
         container: '#storytailor-container'
       });
       embed.init();
     </script>
   </body>
   </html>
   ```

3. **Open in Browser**: Open HTML file in browser and test widget functionality

## Common Workflows

### Workflow 1: Adding a New Theme

1. **Define Theme in DesignTokens**:
   ```typescript
   // packages/storytailor-embed/src/theme/DesignTokens.ts
   export const themes = {
     'new-theme': {
       colors: { primary: '#...', accent: '#...' },
       typography: { ... },
       spacing: { ... }
     }
   };
   ```

2. **Update Theme Type**:
   ```typescript
   type Theme = 'child-friendly' | 'educational' | 'magical' | 'custom' | 'new-theme';
   ```

3. **Test Theme**: Test new theme in widget

### Workflow 2: Adding a New Event

1. **Emit Event in Widget**:
   ```typescript
   this.emit('new.event', { data: 'value' });
   ```

2. **Document Event**: Add event to documentation

3. **Update Type Definitions**: Add event to event type definitions

## Troubleshooting

### Issue 1: Widget Not Initializing

**Symptoms**: Widget fails to initialize

**Solution**:
- Verify API key is valid
- Check container element exists
- Verify API base URL is correct
- Check browser console for errors

### Issue 2: Theme Not Applying

**Symptoms**: Custom theme or branding not working

**Solution**:
- Verify theme name is correct
- Check branding configuration format
- Verify CSS is loading correctly
- Check browser console for CSS errors

### Issue 3: Voice Not Working

**Symptoms**: Voice recording or playback not working

**Solution**:
- Verify browser supports MediaRecorder API
- Check microphone permissions
- Verify HTTPS (required for media APIs)
- Check browser console for errors

## Related Documentation

- [Widget Overview](./README.md) - Widget overview
- [Widget What](./what.md) - Detailed functionality
- [Widget Documentation](../widget.md) - Complete widget documentation
- [Partner Integration Guide](../../storytailor/partner_integration.md) - Integration examples

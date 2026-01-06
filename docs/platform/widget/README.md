# Storytailor Embeddable Widget - Overview

**Status**: ✅ Active
**Package**: `@storytailor/embed`
**Entry Point**: `packages/storytailor-embed/src/index.ts`
**Last Updated**: 2025-12-17

## Overview

The Storytailor Embeddable Widget provides a beautiful, responsive chat/voice interface that can be embedded into any website, supporting Webflow, Framer, Wix, and custom implementations.

## Key Features

- **Chat Interface**: Full conversational interface with message sending and receiving
- **Voice Interface**: Voice input/output capabilities
- **Story Reader**: Read and display stories within the widget
- **Story Grid**: Browse and select from available stories
- **Theming**: Predefined themes (child-friendly, educational, magical) and custom branding
- **Privacy & Safety**: COPPA mode, parental controls, and configurable data retention
- **Events**: Comprehensive event system for integration monitoring

## Quick Links

- [What It Does](./what.md) - Detailed functionality and capabilities
- [Why It Exists](./why.md) - Business rationale and value proposition
- [When to Use](./when.md) - Usage guidelines and integration points
- [Where It's Deployed](./where.md) - Deployment location and configuration
- [Who Owns It](./who.md) - Team ownership and maintainers
- [Development Guide](./development.md) - Technical implementation and API reference
- [Marketing Information](./marketing.md) - Value proposition and features
- [Cost Analysis](./cost.md) - Cost per operation and economics

## Installation

### HTML Script Tag

```html
<script src="https://cdn.storytailor.com/embed/v1/storytailor-embed.js"></script>
```

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
    apiBaseURL: 'https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws',
    theme: 'child-friendly',
    autoStart: true
  });

  embed.init();
</script>
```

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

## Related Documentation

- **Full Widget Documentation**: See [Widget Documentation](../widget.md) for complete details
- **Partner Integration**: See [Partner Integration Guide](../../storytailor/partner_integration.md)
- **Web SDK**: See [Web SDK Documentation](../sdks/web-sdk.md)
- **REST API**: See [REST API Documentation](../sdks/rest-api.md)

## Code References

- `packages/storytailor-embed/src/index.ts:1-14` - Entry point
- `packages/storytailor-embed/src/StorytalorEmbed.ts:1-726` - Main widget class
- `docs/storytailor/partner_integration.md:368-395` - Widget usage examples

# Storytailor Embeddable Widget - Where

**Last Updated**: 2025-12-17

## Package Location

The widget source code is located in the monorepo:

- **Package Location**: `packages/storytailor-embed/`
- **Entry Point**: `packages/storytailor-embed/src/index.ts`
- **Main Class**: `packages/storytailor-embed/src/StorytalorEmbed.ts`

## Distribution Channels

### NPM Package

**Package Name**: `@storytailor/embed`

**Installation**:
```bash
npm install @storytailor/embed
# or
yarn add @storytailor/embed
```

**Usage**:
```javascript
import StorytalorEmbed from '@storytailor/embed';
```

**Code References:**
- `packages/storytailor-embed/package.json` - Package configuration

### CDN Distribution (Optional)

**CDN URL**: `https://cdn.storytailor.com/embed/v1/storytailor-embed.js`

**Usage**:
```html
<script src="https://cdn.storytailor.com/embed/v1/storytailor-embed.js"></script>
<script>
  const embed = new StorytalorEmbed({
    apiKey: 'your-api-key',
    container: '#storytailor-container'
  });
  embed.init();
</script>
```

**Versioned URLs**:
- Latest: `https://cdn.storytailor.com/embed/v1/storytailor-embed.js`
- Specific version: `https://cdn.storytailor.com/embed/v1.0.0/storytailor-embed.js`
- Minified: `https://cdn.storytailor.com/embed/v1/storytailor-embed.min.js`

## Deployment Targets

### Website Platforms

The widget can be embedded into:

- **Webflow**: Custom code block or embed component
- **Framer**: Custom code component
- **Wix**: HTML iframe or custom code
- **Custom Websites**: Any HTML page with JavaScript support

### Browser Support

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Mobile Browsers**: iOS Safari, Chrome Mobile, Firefox Mobile
- **Features**: Voice recording, LocalStorage, WebSocket (when available)

## API Base URL

**Production URL**: `https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws`

**Configuration**:
```javascript
const embed = new StorytalorEmbed({
  apiKey: 'your-api-key',
  apiBaseURL: 'https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws',
  container: '#storytailor-container'
});
```

**Code References:**
- `docs/platform/widget.md:51-52` - Production URL configuration

## CDN Configuration

### CDN Provider

- **Provider**: [CDN Provider Name]
- **Region**: Global (anycast)
- **SSL**: HTTPS enabled
- **Caching**: Aggressive caching with version-based invalidation

### CDN Performance

- **Edge Locations**: Global CDN edge locations for low latency
- **Compression**: Gzip/Brotli compression enabled
- **Cache Headers**: Appropriate cache headers for optimal performance

## Related Documentation

- [Widget Overview](./README.md) - Widget overview
- [Widget What](./what.md) - Detailed functionality
- [Widget Documentation](../widget.md) - Complete widget documentation

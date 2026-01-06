# Storytailor Embeddable Widget - When

**Last Updated**: 2025-12-17

## When to Use Widget

Use Widget when:

1. **Quick Integration**: Need to integrate Storytailor into a website quickly without custom development
2. **No Custom UI Needed**: Don't need full control over UI/UX and the default widget interface is sufficient
3. **Partner Websites**: Integrating into partner websites (Webflow, Framer, Wix, custom websites)
4. **Zero-Code Setup**: Want zero-code integration with just a script tag
5. **Consistent Experience**: Want consistent Storytailor experience across multiple websites
6. **Theming Only**: Need basic theming and branding customization, not full UI control

## When NOT to Use Widget

Do NOT use Widget for:

- ❌ **Custom UI Requirements**: Use SDKs instead for full UI/UX control
- ❌ **Native App Integration**: Use iOS/Android SDKs for native mobile apps
- ❌ **Server-Side Integration**: Use REST API directly for server-side integration
- ❌ **Complex Customization**: Use SDKs if you need extensive customization beyond theming

## Integration Method Comparison

| Feature | Widget | SDKs | REST API |
|---------|--------|------|----------|
| **Use Case** | Quick web integration | Native apps, custom UI | Server-side, automation |
| **Setup Complexity** | Very Low (script tag) | Medium (package installation) | Low (HTTP requests) |
| **UI Control** | Limited (theming only) | Full control | No UI (API only) |
| **Customization** | Theming and branding | Full customization | No UI |
| **Type Safety** | ❌ No (JavaScript) | ✅ Yes (TypeScript, Swift, Kotlin) | ❌ No (manual types) |
| **Offline Support** | ❌ No | ✅ Yes | ❌ No |
| **Best For** | Quick web integration | Native apps, custom UI | Server-side, automation |

## Integration Scenarios

### Scenario 1: Partner Website Integration

**When**: Partner wants to add Storytailor to their website quickly

**How**: Embed widget via script tag or NPM package

**Example**:
```html
<script src="https://cdn.storytailor.com/embed/v1/storytailor-embed.js"></script>
<script>
  const embed = new StorytalorEmbed({
    apiKey: 'your-api-key',
    container: '#storytailor-container',
    theme: 'child-friendly'
  });
  embed.init();
</script>
```

**Use Cases**:
- Partner websites (Webflow, Framer, Wix)
- Quick integration without development
- Consistent experience across sites

### Scenario 2: Custom Website Integration

**When**: Developer wants to add Storytailor to custom website with minimal setup

**How**: Use widget with custom theming

**Example**:
```javascript
import StorytalorEmbed from '@storytailor/embed';

const embed = new StorytalorEmbed({
  apiKey: 'your-api-key',
  container: document.getElementById('widget-container'),
  theme: 'custom',
  branding: {
    logo: 'https://example.com/logo.png',
    colors: {
      primary: '#667eea',
      accent: '#ff6b6b'
    }
  }
});

await embed.init();
```

**Use Cases**:
- Custom websites
- Quick integration with branding
- No need for full UI development

### Scenario 3: Testing and Prototyping

**When**: Developer wants to quickly test Storytailor integration

**How**: Use widget for rapid prototyping

**Use Cases**:
- Quick testing
- Prototyping
- Proof of concept

## Usage Guidelines

### Best Practices

- **Use for Quick Integration**: Widget is ideal for quick integration without custom development
- **Leverage Theming**: Use predefined themes or custom branding for visual customization
- **Handle Events**: Use event system for integration monitoring and analytics
- **Configure Privacy**: Set appropriate privacy settings (COPPA mode, data retention)
- **Test Across Platforms**: Test widget on different website platforms (Webflow, Framer, Wix)

### Common Pitfalls

- **Avoid Using for Complex Customization**: Use SDKs if you need extensive UI customization
- **Don't Mix Integration Methods**: Choose one integration method (Widget, SDK, or REST API)
- **Don't Ignore Privacy Settings**: Configure COPPA mode and data retention appropriately
- **Avoid Bypassing Widget Features**: Use widget features (theming, events) instead of custom workarounds

### Integration Checklist

Before integrating with Widget:

- ✅ Choose widget integration method (script tag or NPM)
- ✅ Obtain API key from Storytailor
- ✅ Select appropriate theme or configure custom branding
- ✅ Configure privacy settings (COPPA mode, data retention)
- ✅ Test widget initialization and basic functionality
- ✅ Implement event handlers for monitoring
- ✅ Test on target website platform (Webflow, Framer, Wix, etc.)

## Related Documentation

- [Widget Overview](./README.md) - Widget overview
- [Widget What](./what.md) - Detailed functionality
- [Widget Documentation](../widget.md) - Complete widget documentation
- [Web SDK](../sdks/web-sdk.md) - For custom UI needs
- [REST API](../sdks/rest-api.md) - For server-side integration

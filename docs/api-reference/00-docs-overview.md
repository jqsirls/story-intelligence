# Storytailor Universal Agent - Developer Documentation

> **🚨 IMPORTANT**: Critical age validation bug fixed (January 2025) - [See changelog](./CHANGELOG.md)

> **REST API Contract Precedence (Product REST API)**: If you are integrating via the **product REST API**, treat `docs/api/REST_API_EXPERIENCE_MASTER.md` as the canonical contract.  
> The `docs/api-reference/**` content includes legacy and multi-surface documentation and may not match the product REST gateway 1:1.

Welcome to the Storytailor Universal Agent developer documentation. This comprehensive guide will help you integrate Storytailor's Story Intelligence™ powered storytelling capabilities into your applications across multiple platforms.

## 🔄 **Latest Updates**

### **Version 4.0.0 - January 2025**
- ✅ **FIXED**: Adult registration now works (age validation 3-120)
- ✅ **NEW**: Comprehensive user type system (18 categories)
- ✅ **ENHANCED**: COPPA compliance for children under 13
- ⚠️ **BREAKING**: Registration endpoint requires new fields

**Quick Migration**: Add `firstName`, `lastName`, `age`, and `userType` to registration calls.
**Full Details**: [View Changelog](./CHANGELOG.md)

## Quick Start

- [5-Minute Web Integration](./integration-guides/web-sdk.md)
- [Mobile App Integration](./integration-guides/mobile-sdk.md)
- [Voice Platform Integration](./integration-guides/voice-platforms.md)
- [REST API Integration](./integration-guides/rest-api.md)

## Integration Guides

### Platform-Specific Guides
- [Web SDK Integration](./integration-guides/web-sdk.md) - Embed chat widgets and voice interfaces
- [iOS SDK Integration](./integration-guides/ios-sdk.md) - Native iOS app integration
- [Android SDK Integration](./integration-guides/android-sdk.md) - Native Android app integration
- [React Native Integration](./integration-guides/react-native-sdk.md) - Cross-platform mobile apps
- [Voice Platform Integration](./integration-guides/voice-platforms.md) - Alexa, Google Assistant, Siri
- [REST API Integration](./integration-guides/rest-api.md) - Server-to-server integration

### Advanced Integration
- [Webhook Integration](./integration-guides/webhooks.md) - Real-time event notifications
- [White-Label Solutions](./integration-guides/white-label.md) - Enterprise customization
- [Partner Onboarding](./integration-guides/partner-onboarding.md) - Third-party integrations

## Developer Tools

- [Interactive API Explorer](./tools/api-explorer.md) - Test APIs with live examples
- [Code Generators](./tools/code-generators.md) - Generate integration code
- [Testing Tools](./tools/testing.md) - Sandbox environment and testing utilities
- [Developer Dashboard](./tools/dashboard.md) - Manage API keys and analytics

## Reference

- [API Reference](./api-reference/README.md) - Complete API documentation
- [SDK Reference](./sdk-reference/README.md) - SDK method documentation
- [Event Reference](./event-reference/README.md) - Webhook events and payloads
- [Error Codes](./reference/error-codes.md) - Error handling guide

## Examples

- [Code Examples](./examples/README.md) - Working code samples
- [Use Cases](./examples/use-cases.md) - Common integration patterns
- [Best Practices](./examples/best-practices.md) - Recommended approaches

## Support

- [FAQ](./support/faq.md) - Frequently asked questions
- [Troubleshooting](./support/troubleshooting.md) - Common issues and solutions
- [Community](./support/community.md) - Developer community resources
- [Contact Support](./support/contact.md) - Get help from our team

---

## Getting Started

Choose your integration path:

1. **Quick Web Integration** - Add a chat widget to your website in 5 minutes
2. **Mobile App Integration** - Native iOS/Android or React Native
3. **Voice Platform** - Extend existing Alexa/Google Assistant skills
4. **API Integration** - Server-to-server REST API or GraphQL
5. **Enterprise Solutions** - White-label and custom integrations

Each path includes step-by-step guides, code examples, and testing tools to get you up and running quickly.
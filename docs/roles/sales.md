Status: Draft  
Audience: Internal  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 9 - Sales guide with verification status

# Sales Guide

## Storytailor and Story Intelligence from Sales Perspective

### What is Storytailor?

**Storytailor** is a child-focused storytelling platform that enables partners to integrate interactive, age-appropriate storytelling into their applications. It provides REST APIs, SDKs, and voice platform integrations for seamless integration.

**Key Facts (Verified):**
- Multi-agent system with 29+ specialized agents
- REST API with 60+ endpoints
- Web, iOS, Android, React Native SDKs
- Embeddable widget for quick integration
- Voice platform support (Alexa, Google Assistant)
- COPPA and GDPR compliant

**Code References:**
- `docs/storytailor/overview.md:1-200` - Storytailor overview
- `docs/storytailor/partner-integration.md:1-200` - Partner integration guide

### What is Story Intelligence™?

**Story Intelligence™** is Storytailor's proprietary AI system that powers story generation and adaptation. It ensures age-appropriate, emotionally responsive, and high-quality story content.

**Key Facts (Verified):**
- Four-pillar architecture (Narrative, Developmental, Personal, Literary Excellence)
- Age-appropriate content generation
- Emotional state adaptation
- Character consistency
- Quality assurance

**Code References:**
- `docs/story-intelligence/overview.md:1-150` - Story Intelligence overview
- `docs/story-intelligence/partner-api.md:1-200` - Partner API documentation

## Key Selling Points

### Integration Flexibility

**Multiple Integration Options:**
- REST API (60+ endpoints)
- Web SDK (JavaScript/TypeScript)
- iOS SDK (Swift)
- Android SDK (Kotlin)
- React Native SDK
- Embeddable Widget
- Voice platforms (Alexa, Google Assistant)

**Code References:**
- `docs/platform/sdks/README.md:1-100` - SDK overview
- `docs/platform/widget.md:1-100` - Widget documentation
- `docs/platform/sdks/rest-api.md:1-200` - REST API documentation

### Compliance and Safety

**Compliance:**
- COPPA compliant
- GDPR compliant
- UK Children's Code compliant
- PRIVO draft pack prepared

**Safety:**
- Crisis detection and intervention
- Disclosure detection
- Mandatory reporting
- Parent notifications

**Code References:**
- `docs/compliance/coppa.md:1-200` - COPPA compliance
- `docs/compliance/child-safety.md:1-200` - Child safety design

### Platform Capabilities

**Multi-Platform Support:**
- Web applications
- Mobile applications (iOS, Android, React Native)
- Voice assistants (Alexa, Google Assistant)
- Smart home devices (Philips Hue)

**Code References:**
- `docs/storytailor/partner-integration.md:1-200` - Partner integration
- `docs/integrations/philips-hue.md:1-200` - Smart home integration

## Where to Look

### Key Documentation

1. **Partner Integration Guide**
   - Location: `docs/storytailor/partner_integration.md`
   - Purpose: Integration capabilities and APIs
   - Verification Status: ✅ Verified against code

2. **REST API Documentation**
   - Location: `docs/platform/sdks/rest-api.md`
   - Purpose: Complete REST API reference
   - Verification Status: ✅ Verified against code

3. **SDK Documentation**
   - Location: `docs/platform/sdks/`
   - Purpose: SDK integration guides
   - Verification Status: ✅ Verified against code

4. **Compliance Documentation**
   - Location: `docs/compliance/`
   - Purpose: Compliance and safety information
   - Verification Status: ✅ Verified against code

5. **Story Intelligence Partner API**
   - Location: `docs/story-intelligence/partner_api.md`
   - Purpose: Story Intelligence™ API documentation
   - Verification Status: ✅ Verified against code

## What Not to Assume

### Pricing and Contracts

**Do Not Assume:**
- Pricing models (verify with Finance team)
- Contract terms (verify with Legal team)
- Subscription plans (verify with Product team)

**Where to Verify:**
- Finance: See [Finance Guide](./finance.md)
- Legal: Contact Legal team
- Product: See [Product Guide](./product.md)

### Technical Capabilities

**Do Not Assume:**
- Feature availability (verify with Engineering team)
- Integration complexity (verify with Engineering team)
- Performance metrics (verify with Engineering team)

**Where to Verify:**
- Engineering: See [Engineering Guide](./engineering.md)
- API Documentation: See `docs/platform/sdks/rest-api.md`

### Legal Positions

**Do Not Assume:**
- Legal compliance status (verify with Legal/Compliance team)
- Privacy policy content (verify with Legal team)
- Terms of service (verify with Legal team)

**Where to Verify:**
- Compliance: See `docs/compliance/`
- Legal: Contact Legal team

## Common Questions and Sources

### Q: How do partners integrate Storytailor?

**Answer:** Partners can integrate Storytailor via REST API, Web SDK, iOS SDK, Android SDK, React Native SDK, Embeddable Widget, or voice platforms (Alexa, Google Assistant).

**Source:** `docs/storytailor/partner_integration.md:1-200`

### Q: What APIs are available?

**Answer:** Storytailor provides 60+ REST API endpoints covering stories, characters, conversations, authentication, smart home, webhooks, analytics, and more.

**Source:** `docs/platform/sdks/rest-api.md:1-200`

### Q: Is Storytailor compliant with child privacy regulations?

**Answer:** Yes, Storytailor is COPPA compliant, GDPR compliant, and UK Children's Code compliant with comprehensive child safety measures.

**Source:** `docs/compliance/coppa.md:1-200`, `docs/compliance/gdpr.md:1-200`

### Q: What is the Story Intelligence™ Partner API?

**Answer:** The Story Intelligence™ Partner API provides access to Story Intelligence™ capabilities including story generation, character creation, and content adaptation.

**Source:** `docs/story-intelligence/partner_api.md:1-200`

## Related Documentation

- **Partner Integration:** See [Partner Integration](../storytailor/partner_integration.md)
- **REST API:** See [REST API Documentation](../platform/sdks/rest-api.md)
- **Story Intelligence Partner API:** See [Story Intelligence Partner API](../story-intelligence/partner_api.md)

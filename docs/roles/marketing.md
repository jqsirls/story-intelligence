Status: Draft  
Audience: Internal  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 9 - Marketing guide with verification status

# Marketing Guide

## Storytailor and Story Intelligence from Marketing Perspective

### What is Storytailor?

**Storytailor** is a child-focused storytelling platform that creates interactive, age-appropriate stories through voice and text conversations. It uses Story Intelligence™ to adapt stories to each child's developmental stage, interests, and emotional state.

**Key Facts (Verified):**
- Multi-agent system with 29+ specialized agents
- Supports REST API, voice (Alexa, Google Assistant), and mobile (iOS, Android, React Native)
- COPPA and GDPR compliant
- Real-time voice conversations with ElevenLabs Conversational AI
- Live avatar interactions with Hedra and LiveKit
- Smart home integration (Philips Hue)

**Code References:**
- `docs/storytailor/overview.md:1-200` - Storytailor overview
- `docs/storytailor/partner-integration.md:1-100` - Integration capabilities

### What is Story Intelligence™?

**Story Intelligence™** is Storytailor's proprietary AI system that powers story generation and adaptation. It consists of four pillars: Narrative Intelligence, Developmental Intelligence, Personal Intelligence, and Literary Excellence/Quality.

**Key Facts (Verified):**
- Four-pillar architecture (Narrative, Developmental, Personal, Literary Excellence)
- Age-appropriate content generation
- Emotional state adaptation
- Character consistency across stories
- Quality assurance for literary standards

**Code References:**
- `docs/story-intelligence/overview.md:1-150` - Story Intelligence overview
- `docs/story-intelligence/architecture.md:1-200` - Architecture details

## Key Features and Capabilities

### Core Features

**Story Generation:**
- Multiple story types (adventure, bedtime, educational, therapeutic)
- Character creation and customization
- Real-time story adaptation
- Multi-turn conversations

**Code References:**
- `docs/storytailor/overview.md:50-100` - Core features
- `docs/user-journeys/rest-api.md:1-200` - User journey documentation

### Platform Capabilities

**Integration Options:**
- REST API
- Web SDK (JavaScript/TypeScript)
- iOS SDK (Swift)
- Android SDK (Kotlin)
- React Native SDK
- Embeddable Widget
- Voice platforms (Alexa, Google Assistant)

**Code References:**
- `docs/platform/sdks/README.md:1-100` - SDK overview
- `docs/platform/widget.md:1-100` - Widget documentation
- `docs/storytailor/partner-integration.md:1-200` - Partner integration

### Safety and Compliance

**Child Safety:**
- Crisis detection and intervention
- Disclosure detection
- Mandatory reporting
- Parent notifications

**Compliance:**
- COPPA compliant
- GDPR compliant
- UK Children's Code compliant
- PRIVO draft pack prepared

**Code References:**
- `docs/compliance/child-safety.md:1-200` - Child safety design
- `docs/compliance/coppa.md:1-200` - COPPA compliance
- `docs/compliance/gdpr.md:1-200` - GDPR compliance

## Brand Guidelines

### Language Rules

**Never Use:**
- "personalized" or variants
- "AI powered", "AI-powered", "AI driven", "AI-driven", "AI led", "AI-led" or similar

**Preferred Language:**
- "Story Intelligence™" (not "AI")
- "tailored for you" (not "personalized")
- "adaptive learning" (not "machine learning")
- "story engine" (not "algorithm")

**Code References:**
- `.cursor/plans/complete_documentation_system_for_storytailor_2c376a02.plan.md:1-50` - Brand language rules

### Messaging

**Key Messages:**
- Child-focused storytelling platform
- Age-appropriate content generation
- Safety-first design
- Multi-platform integration
- Compliance with child privacy regulations

## Where to Look

### Key Documentation

1. **Storytailor Overview**
   - Location: `docs/storytailor/overview.md`
   - Purpose: High-level platform overview
   - Verification Status: ✅ Verified against code

2. **Story Intelligence Overview**
   - Location: `docs/story-intelligence/overview.md`
   - Purpose: Story Intelligence™ system overview
   - Verification Status: ✅ Verified against code

3. **Partner Integration Guide**
   - Location: `docs/storytailor/partner_integration.md`
   - Purpose: Integration capabilities and APIs
   - Verification Status: ✅ Verified against code

4. **User Journeys**
   - Location: `docs/user-journeys/`
   - Purpose: Detailed user experience flows
   - Verification Status: ✅ Verified against code

5. **Compliance Documentation**
   - Location: `docs/compliance/`
   - Purpose: COPPA, GDPR, child safety compliance
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

### Legal Positions

**Do Not Assume:**
- Legal compliance status (verify with Legal/Compliance team)
- Privacy policy content (verify with Legal team)
- Terms of service (verify with Legal team)

**Where to Verify:**
- Compliance: See `docs/compliance/`
- Legal: Contact Legal team

### Technical Capabilities

**Do Not Assume:**
- Feature availability (verify with Engineering team)
- Integration capabilities (verify with Engineering team)
- Performance metrics (verify with Engineering team)

**Where to Verify:**
- Engineering: See [Engineering Guide](./engineering.md)
- API Documentation: See `docs/platform/sdks/rest-api.md`

## Common Questions and Sources

### Q: What platforms does Storytailor support?

**Answer:** Storytailor supports REST API, Web SDK, iOS SDK, Android SDK, React Native SDK, Embeddable Widget, and voice platforms (Alexa, Google Assistant).

**Source:** `docs/platform/sdks/README.md:1-100`

### Q: Is Storytailor COPPA compliant?

**Answer:** Yes, Storytailor is COPPA compliant with automatic COPPA protection for users under 13, parental consent requirements, and data minimization.

**Source:** `docs/compliance/coppa.md:1-200`

### Q: What is Story Intelligence™?

**Answer:** Story Intelligence™ is Storytailor's proprietary AI system with four pillars: Narrative Intelligence, Developmental Intelligence, Personal Intelligence, and Literary Excellence/Quality.

**Source:** `docs/story-intelligence/overview.md:1-150`

### Q: How does Storytailor ensure child safety?

**Answer:** Storytailor implements comprehensive child safety measures including crisis detection, disclosure detection, mandatory reporting, and parent notifications.

**Source:** `docs/compliance/child-safety.md:1-200`

## Related Documentation

- **Storytailor Overview:** See [Storytailor Overview](../storytailor/overview.md)
- **Story Intelligence:** See [Story Intelligence Overview](../story-intelligence/overview.md)
- **Partner Integration:** See [Partner Integration](../storytailor/partner-integration.md)

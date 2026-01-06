Status: Draft  
Audience: Internal  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 9 - Product guide with verification status

# Product Guide

## Storytailor and Story Intelligence from Product Perspective

### What is Storytailor?

**Storytailor** is a child-focused storytelling platform that enables interactive, age-appropriate story creation through voice and text conversations. It provides multiple integration options and comprehensive safety features.

**Key Facts (Verified):**
- Multi-agent system with 29+ specialized agents
- Multiple story types (adventure, bedtime, educational, therapeutic)
- Real-time voice conversations
- Live avatar interactions
- Smart home integration
- COPPA and GDPR compliant

**Code References:**
- `docs/storytailor/overview.md:1-200` - Storytailor overview
- `docs/storytailor/internal_architecture.md:1-300` - Internal architecture

### What is Story Intelligence™?

**Story Intelligence™** is Storytailor's proprietary AI system that powers story generation and adaptation. It consists of four pillars: Narrative Intelligence, Developmental Intelligence, Personal Intelligence, and Literary Excellence/Quality.

**Key Facts (Verified):**
- Four-pillar architecture
- Age-appropriate content generation
- Emotional state adaptation
- Character consistency
- Quality assurance

**Code References:**
- `docs/story-intelligence/overview.md:1-150` - Story Intelligence overview
- `docs/story-intelligence/architecture.md:1-200` - Architecture details

## Product Features

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

### User Journeys

**Supported Journeys:**
- REST API conversations
- Audio conversational (voice input/output)
- Video conversational (video generation)
- Video with live avatar (real-time avatar interaction)

**Code References:**
- `docs/user-journeys/rest-api.md:1-200` - REST API journey
- `docs/user-journeys/audio-conversational.md:1-200` - Audio journey
- `docs/user-journeys/video-conversational.md:1-200` - Video journey
- `docs/user-journeys/video-live-avatar.md:1-200` - Live avatar journey

## Where to Look

### Key Documentation

1. **Storytailor Overview**
   - Location: `docs/storytailor/overview.md`
   - Purpose: High-level platform overview
   - Verification Status: ✅ Verified against code

2. **User Journeys**
   - Location: `docs/user-journeys/`
   - Purpose: Detailed user experience flows
   - Verification Status: ✅ Verified against code

3. **Story Intelligence Overview**
   - Location: `docs/story-intelligence/overview.md`
   - Purpose: Story Intelligence™ system overview
   - Verification Status: ✅ Verified against code

4. **Platform Documentation**
   - Location: `docs/platform/`
   - Purpose: Integration capabilities and APIs
   - Verification Status: ✅ Verified against code

5. **Agent Ecosystem**
   - Location: `docs/agents/`
   - Purpose: Agent capabilities and features
   - Verification Status: ✅ Verified against code

## What Not to Assume

### Pricing and Contracts

**Do Not Assume:**
- Pricing models (verify with Finance team)
- Contract terms (verify with Legal team)
- Subscription plans (verify with Finance team)

**Where to Verify:**
- Finance: See [Finance Guide](./finance.md)
- Legal: Contact Legal team

### Technical Implementation

**Do Not Assume:**
- Feature implementation details (verify with Engineering team)
- Performance characteristics (verify with Engineering team)
- Integration complexity (verify with Engineering team)

**Where to Verify:**
- Engineering: See [Engineering Guide](./engineering.md)
- API Documentation: See `docs/platform/sdks/rest-api.md`

### Roadmap and Features

**Do Not Assume:**
- Feature availability (verify with Engineering team)
- Roadmap timelines (verify with Product team)
- Feature priorities (verify with Product team)

**Where to Verify:**
- Engineering: See [Engineering Guide](./engineering.md)
- Product: Contact Product team

## Common Questions and Sources

### Q: What user journeys are supported?

**Answer:** Storytailor supports REST API conversations, audio conversational (voice input/output), video conversational (video generation), and video with live avatar (real-time avatar interaction).

**Source:** `docs/user-journeys/README.md:1-100`

### Q: What story types are available?

**Answer:** Storytailor supports adventure, bedtime, educational, and therapeutic story types, each with age-appropriate content and safety measures.

**Source:** `docs/storytailor/overview.md:50-100`

### Q: How does Story Intelligence™ work?

**Answer:** Story Intelligence™ uses four pillars (Narrative, Developmental, Personal, Literary Excellence) to generate age-appropriate, emotionally responsive, and high-quality stories.

**Source:** `docs/story-intelligence/overview.md:1-150`

## Related Documentation

- **Storytailor Overview:** See [Storytailor Overview](../storytailor/overview.md)
- **User Journeys:** See [User Journeys](../user-journeys/README.md)
- **Story Intelligence:** See [Story Intelligence Overview](../story-intelligence/overview.md)

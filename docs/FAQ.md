Status: ✅ Production Ready  
Audience: Internal | Partner | Customer | Developer  
Last-Updated: 2025-12-17  
Owner: Documentation Team  
Doc-ID: AUTO  

# Storytailor Comprehensive FAQ

Complete answers to questions about Storytailor, Story Intelligence™, pricing, technical platform, and integrations.

---

## Table of Contents

1. [Core Platform](#core-platform)
2. [Story Intelligence™](#story-intelligence)
3. [Pricing & Plans](#pricing--plans)
4. [Safety & Privacy](#safety--privacy)
5. [Platform & Integration](#platform--integration)
6. [Professional Use](#professional-use)
7. [Technical & Development](#technical--development)
8. [Philosophy & Approach](#philosophy--approach)

---

## Core Platform

### What is Storytailor?

Storytailor creates stories for the exact moment a child is in.

A scraped knee. A fight with a friend. A burst of silliness before bed. A long hospital wait. Stories flex to reflect how a child feels right now, helping them name emotions, laugh at worries, or hear encouragement in a way they are ready to receive.

**For different users:**
- **Parents**: Easing tough bedtimes, processing emotions
- **Grandparents**: Sparking giggles from across the country
- **Foster parents**: Building trust with children learning to feel safe
- **Teachers**: Turning classroom moments into playful lessons
- **Therapists and child-life specialists**: Helping children share heavy feelings without making them heavier

### What ages is Storytailor best for?

**Storytailor is designed for children 10 and under.**

These are the years when imagination is loud and emotions are often bigger than language. Stories give children a way to express what they feel, whether that's a toddler giggling at a silly dragon, a kindergartener working through a playground conflict, or a 10-year-old beginning to name more complex emotions.

### Do I need to download an app?

**No.**

Storytailor works on modern phones, tablets, and computers through the browser. No app required. This keeps it flexible for families, classrooms, hospitals, and shared devices.

**Available Platforms:**
- Web browser (all devices)
- Amazon Alexa (voice-first experience)
- API integration (for partners)
- Coming soon: Native mobile apps

### Can stories be created in different languages?

**Yes.**

Storytailor supports multiple languages so families and communities can create stories in the words that matter most to them. This makes it easier for bilingual households, multicultural classrooms, and caregivers to share stories in a child's native language.

**Supported Languages:**
- English
- Spanish
- French
- German
- Italian
- Portuguese
- And more (expanding continuously)

---

## Story Intelligence™

### What is Story Intelligence™?

**Story Intelligence™** is Storytailor's proprietary system that creates award-caliber stories through four distinct pillars:

1. **Narrative Intelligence** - Pulitzer-quality storytelling mastery
2. **Developmental Intelligence** - Age-appropriate content expertise
3. **Personal Intelligence** - Individual child profile and preference handling
4. **Literary Excellence** - Publishing-grade quality standards

**Code Reference:** `docs/story-intelligence/overview.md`

### How does Story Intelligence work?

Story Intelligence orchestrates multiple specialized capabilities through a sophisticated multi-agent architecture:

1. **Deep Listening**: Understanding the child's world, needs, dreams, and current emotional state
2. **Intelligent Synthesis**: Combining narrative mastery with developmental appropriateness
3. **Quality Elevation**: Applying professional editorial standards
4. **Adaptive Creation**: Dynamically adjusting based on real-time engagement
5. **Continuity Management**: Maintaining character personalities and story threads

**Technical Implementation:**
- Multi-agent orchestration system
- 35 production Lambda functions
- Real-time adaptive storytelling
- Emotion detection and response
- Developmental stage awareness

### What makes Story Intelligence different from other AI storytelling?

**Key Differentiators:**

**Quality Standards:**
- Award-caliber narrative quality (Pulitzer-level)
- Publishing-grade editorial standards
- Professional literary techniques (metaphor, symbolism, foreshadowing)
- Hero's journey structure mastery

**Developmental Expertise:**
- 11-component Kid Communication Intelligence system
- Age-specific cognitive development stages (3-4, 5-6, 7-9, 10+)
- Attention span optimization
- Therapeutic timing sensitivity

**Emotional Intelligence:**
- Daily emotional check-ins
- Pattern detection and support
- Crisis detection capabilities
- Therapeutic storytelling principles

**Code Reference:** `packages/kid-communication-intelligence/src/KidCommunicationIntelligenceService.ts`

### Is Story Intelligence™ real AI or just templates?

**Real-time AI generation**, not templates.

Every story is created dynamically in response to:
- Current emotional state
- Child's developmental stage
- Individual personality and interests
- Cultural background and context
- Real-time conversational input

**Technical Architecture:**
- GPT-5.1 for premium tiers (GPT-5.1-mini for Free tier)
- Multi-agent orchestration
- Real-time synthesis and adaptation
- Hero's journey structure generation
- Dynamic character arc development

---

## Pricing & Plans

### What subscription plans are available?

| Tier | Monthly | Annual | Stories/Month | Key Features |
|------|---------|--------|---------------|--------------|
| **Free** | $0 | $0 | 1-5 | Web only, basic features |
| **Alexa+ Starter** | $9.99 | $99.00 | 10 | Voice-first, all platforms |
| **Individual** | $12.99 | $129.00 | 30 | Full features |
| **Premium** | $19.99 | $199.00 | Unlimited | Priority queue |
| **Family** | $24.99 | $249.00 | 20 | Family sharing |
| **Professional** | $29.99 | Custom | Unlimited | API access, analytics |
| **Enterprise** | Custom | Custom | Custom | Custom solutions, SLA |

**Annual Savings:**
- Individual: Save $26.88/year
- Premium: Save $40.88/year
- Family: Save $50.88/year

**Code Reference:** `docs/business/pricing-comprehensive.md`

### Are there one-time purchase options?

**Yes - Story Packs:**

- **5 Story Pack**: $4.99 ($0.998 per story)
- **10 Story Pack**: $8.99 ($0.899 per story)
- **20 Story Pack**: $14.99 ($0.75 per story)

**Benefits:**
- Credits never expire
- Can be used across billing periods
- Available for free and paid users
- Great for trying premium quality

### What's included in each tier?

**Free Tier:**
- 1-5 stories/month
- Web platform only
- GPT-5.1-mini AI model
- 2 images per story
- Amazon Polly voice synthesis
- Standard story types

**Alexa+ Starter ($9.99/mo):**
- 10 stories/month
- All platforms (Web, Alexa, API)
- GPT-5.1 AI model
- 5 images per story
- ElevenLabs voice synthesis
- Smart home integration
- Kid Communication Intelligence

**Individual ($12.99/mo):**
- 30 stories/month
- All platforms
- All features of Alexa+ Starter
- Full story type library
- Advanced character creation

**Premium ($19.99/mo):**
- Unlimited stories
- Priority processing queue
- Video generation (Sora-2)
- Live avatar (included)
- Multiple child profiles
- All Individual features

**Family ($24.99/mo):**
- 20 stories/month
- Family sharing (up to 6 members)
- Multiple child profiles
- Premium features
- Shared library

**Professional ($29.99/mo):**
- Unlimited stories
- API access
- Advanced analytics
- White-label options
- Webhook integration
- Priority support

**Enterprise (Custom):**
- Custom story limits
- Custom integrations
- SLA guarantees
- Dedicated support
- Custom branding
- On-premise options

**Code Reference:** `lambda-deployments/content-agent/src/services/TierQualityService.ts`

### Can I try before I buy?

**Yes - Free Tier:**
- 1-5 stories per month
- No credit card required
- Full story creation experience
- Upgrade anytime

**Story Packs for Testing:**
- Buy 5 stories for $4.99
- Experience premium quality
- No subscription commitment
- Credits never expire

### What's your refund policy?

**30-Day Money-Back Guarantee:**
- Full refund within 30 days
- No questions asked
- Applies to first subscription purchase

**Prorated Refunds:**
- Downgrade: Prorated credit for remaining period
- Cancellation: Access continues through paid period
- Technical issues: Case-by-case evaluation

**Contact:** support@storytailor.com

---

## Safety & Privacy

### Is Storytailor safe for children?

**Yes. Safety is foundational.**

**Safety Commitments:**
- Never diagnoses or labels
- Never replaces caregivers or professionals
- Informed by bibliotherapy principles
- COPPA compliant
- Content moderated
- Crisis detection enabled

**What This Means:**
- Whimsy is the doorway, emotions come through
- A silly dragon helping talk about worry
- A playful fox helping feel brave
- Stories support, never lecture

### Is Storytailor therapy?

**No.**

Storytailor is not therapy and does not claim to be. It does not diagnose, treat, or replace mental health care.

**What It Is:**
- Informed by therapeutic storytelling practices
- Designed to support emotional expression
- Tool for connection and communication
- Guided by adults who know the child

**Professional Use:**
- Used by therapists as a therapeutic tool
- Complement to professional care
- Not a replacement for licensed therapy

### Do you collect or sell my child's data?

**No. We do not sell data. We do not share data.**

**Privacy Commitments:**
- COPPA compliant
- No data sales or sharing
- Adults remain in control
- Transparent data practices
- Minimal data collection

**What We Collect:**
- Account information (required for service)
- Story preferences (to improve experience)
- Usage analytics (anonymized)
- Emotional check-ins (with consent)

**What We Don't Collect:**
- Personal identifiable information beyond necessary
- Location data
- Device information beyond browser type
- Advertising identifiers

**Code Reference:** `docs/compliance/01-privacy-compliance-verification-report.md`

### How do you ensure content safety?

**Multi-Layer Safety System:**

1. **Content Moderation:**
   - Profanity filtering
   - Inappropriate content blocking
   - Age-appropriate enforcement
   - Real-time safety checks

2. **Crisis Detection:**
   - Harmful intent detection
   - Self-harm keyword monitoring
   - Automatic escalation protocols
   - Parent notification system

3. **Parental Controls:**
   - COPPA verification for under-13
   - Parent email required
   - Content sharing restrictions
   - Activity monitoring (opt-in)

4. **Professional Standards:**
   - Therapeutic principles integration
   - Developmental appropriateness
   - Cultural sensitivity review
   - Continuous safety audits

**Code Reference:** `packages/security-framework/`, `packages/child-safety-agent/`

### Can my child use Storytailor alone?

**Storytailor is designed for shared experiences.**

Adults guide the experience and remain in control. Older children may participate more independently, but Storytailor is built to strengthen connection within a child's care circle, not replace it.

**Stories work best when created together.**

---

## Platform & Integration

### What platforms does Storytailor support?

**Available Now:**
- **Web Browser**: All modern browsers on any device
- **Amazon Alexa**: Voice-first storytelling experience
- **REST API**: Developer integration
- **GraphQL API**: Advanced queries and real-time updates

**Coming Soon:**
- Native iOS app
- Native Android app
- Smart home integrations (Google Home, Apple HomeKit)
- Education platforms (Canvas, Schoology)

**Code Reference:** `docs/platform/README.md`

### Does Storytailor work with Amazon Alexa?

**Yes - Alexa+ Integration (Beta):**

**Features:**
- Voice-first story creation
- Hands-free interaction
- Smart home integration
- Multi-room audio
- Routine integration

**Availability:**
- 200+ million Prime users (partnership announced October 2025)
- "Alexa, ask Storytailor to create a bedtime story"
- Seamless account linking
- Voice profile recognition

**Plans:**
- Alexa+ Starter: $9.99/mo (voice-optimized)
- Available on all paid tiers

**Code Reference:** `docs/platform/a2a/README.md`

### Can I integrate Storytailor into my app or website?

**Yes - Multiple Integration Options:**

**1. REST API (Professional+):**
- Full story creation API
- Character management
- User management
- Webhook events
- Rate limiting: 100 req/min

**2. GraphQL API (Professional+):**
- Real-time subscriptions
- Flexible queries
- Efficient data fetching
- WebSocket support

**3. Web SDK (All Tiers):**
- Embeddable story widget
- Pre-built UI components
- Customizable theming
- Responsive design

**4. White-Label (Enterprise):**
- Custom branding
- Domain customization
- Full design control
- Dedicated infrastructure

**Code Reference:** `docs/api-reference/README.md`

### What's the API rate limiting?

**Rate Limits by Tier:**

| Tier | Requests/Minute | Requests/Hour | Concurrent |
|------|-----------------|---------------|------------|
| Free | 10 | 100 | 1 |
| Individual | 30 | 500 | 3 |
| Premium | 100 | 2000 | 5 |
| Professional | 200 | 5000 | 10 |
| Enterprise | Custom | Custom | Custom |

**Overage Handling:**
- 429 status code returned
- Retry-After header provided
- Queue system for bursts
- Contact support for increases

**Code Reference:** `docs/api-reference/02-comprehensive-integration-guide.md`

---

## Professional Use

### Is Storytailor for schools, hospitals, or professionals?

**Yes - Professional Use Cases:**

**Education:**
- Classroom storytelling
- SEL (Social Emotional Learning)
- Literacy support
- ESL/ELL instruction
- Special education

**Healthcare:**
- Children's hospitals
- Pediatric clinics
- Child-life programs
- Pre-procedure preparation
- Medical anxiety reduction

**Therapy & Counseling:**
- Play therapy
- Bibliotherapy
- Trauma-informed care
- Emotional processing
- Communication facilitation

**Foster Care & Social Services:**
- Trust building
- Transition support
- Emotional regulation
- Attachment support

**Code Reference:** `docs/operations/customer-service/README.md`

### Do you offer training for professionals?

**Yes - Professional Training Program:**

**Included:**
- Platform onboarding
- Best practices guide
- Case study examples
- Therapeutic integration
- Documentation and resources

**Available:**
- Live webinars
- Recorded training sessions
- Professional community
- Office hours support
- Custom workshops (Enterprise)

**Contact:** professional@storytailor.com

### Can I share stories with other professionals?

**Yes - Care Circle Sharing:**

Stories can be shared with trusted adults in a child's care circle:
- Teachers
- Therapists
- Counselors
- Medical professionals
- Social workers

**Privacy Controls:**
- Parent approval required
- Shared with explicit consent
- COPPA compliant sharing
- Revocable access
- Audit trail maintained

**Use Case:**
Many families use stories as a gentle way to help professionals understand what a child is working through without putting pressure on the child to explain directly.

---

## Technical & Development

### What technology powers Storytailor?

**Architecture:**
- **Cloud Platform**: AWS (us-east-1)
- **AI Models**: OpenAI GPT-5.1, GPT-5.1-mini
- **Voice Synthesis**: ElevenLabs, Amazon Polly
- **Image Generation**: DALL-E 3
- **Video Generation**: Sora-2 (Premium+)
- **Database**: Supabase (PostgreSQL)
- **Caching**: Redis
- **Functions**: AWS Lambda (35 production functions)

**Multi-Agent System:**
- Router Agent - Intent classification
- Content Agent - Story generation
- Emotion Agent - Emotional intelligence
- Personality Agent - Character consistency
- And 12+ specialized agents

**Code Reference:** `docs/system/architecture.md`

### What programming languages do you support in the API?

**Official SDKs:**
- **Node.js/TypeScript**: Full SDK
- **Python**: Full SDK
- **REST API**: Language-agnostic (cURL, any HTTP client)

**Coming Soon:**
- Ruby SDK
- PHP SDK
- Java SDK
- Go SDK

**Code Reference:** `docs/api-reference/03-integration-services-guide.md`

### Do you have a sandbox or test environment?

**Yes - Development Environment:**

**Features:**
- Separate test accounts
- No production impact
- Full API access
- Test data included
- Webhook testing

**Access:**
- Professional tier and above
- Request via support@storytailor.com
- API keys separate from production
- Rate limits apply

### Can I self-host Storytailor?

**Enterprise Only:**

Self-hosting available for Enterprise customers:
- On-premise deployment
- Private cloud hosting
- Custom infrastructure
- Dedicated support
- SLA guarantees

**Requirements:**
- Minimum infrastructure specs
- Technical expertise required
- License agreement
- Ongoing maintenance

**Contact:** enterprise@storytailor.com

---

## Philosophy & Approach

### Do you make books?

### Direct response from JQ Sirls, CEO

**No. And that choice is intentional.**

Storytailor creates stories that live in the moment. They are shaped around what a child is feeling right now and the connection they are sharing with someone in their care circle. These stories are meant to be experienced together, not archived first and understood later.

Sometimes a family falls in love with a story. When that happens, they can save it, print it, keep it, share it. That part belongs to them. We do not get in the way of that.

**But we do not sell books.**

Books are an art form. They deserve the hands, instincts, and life experience of human authors and illustrators. As a children's book author and illustrator myself, I care deeply about that craft. Print-on-demand shortcuts do not honor it.

There is something else that matters. **Nostalgia is not instant.** A child does not build lifelong emotional memory from a digital story turned into a printed object weeks later. Nostalgia comes from moments that repeat, linger, and age alongside them. A bookstore visit. A worn spine. A story that stays the same while the child changes.

**Storytailor is different by design.**

We exist for the moment when a child needs a story now. Before bedtime. In a hospital room. After a hard day. During a quiet afternoon. By the time a printed book would arrive, that moment has passed. The child has moved on, as children do.

**Books last on shelves.**  
**Storytailor lives in the moment.**

We are not here to replace books. We are here to give families something books cannot. A story that meets a child exactly where they are, exactly when they need it.

— JQ Sirls, CEO

### Can I print or save stories?

**Yes.**

Families can save stories, print them, and keep them if they choose. Storytailor does not limit how families enjoy the stories they create.

**The printed version is optional. The experience comes first.**

### How is Storytailor different from other story apps?

**Storytailor is not a reading app, a content library, or a game.**

**Key Differences:**

**Real-Time Creation:**
- Stories created in the moment
- Not pre-written content
- Not fixed stories to "complete"
- Dynamic, adaptive narratives

**Emotion-First Design:**
- Focus on emotional expression
- Connection over content
- Moments over permanence
- Guided by adults who know the child

**No Gamification:**
- No feeds to scroll
- No points to earn
- No achievement systems
- Pure storytelling experience

**Professional Quality:**
- Award-caliber narratives
- Publishing-grade standards
- Therapeutic principles
- Developmental expertise

### Is Storytailor educational?

**Storytailor supports emotional development, language, and imagination, but it is not a curriculum or lesson plan.**

**It is emotion-first. Learning happens naturally through story, play, and connection.**

**Educational Benefits:**
- Vocabulary building
- Emotional intelligence
- Language development
- Cultural awareness
- Creative thinking
- Problem-solving through narrative

**Story Types for Learning:**
- Educational stories (academic concepts)
- Language Learning stories
- Financial Literacy stories
- Tech Readiness stories

### Can Storytailor help with big emotions?

**Yes.**

Stories give children a safe way to explore feelings that are hard to talk about directly. Fear, sadness, frustration, jealousy, excitement. Storytailor meets children where they are and gives those feelings somewhere to go.

**Emotional Support Through:**
- Mental Health (Big Emotions) stories
- Medical Bravery stories
- Therapeutic adult stories (Inner Child, Child Loss, New Birth)
- Character-driven emotional exploration
- Safe processing of difficult feelings

**Therapeutic Principles:**
- Bibliotherapy-informed
- Validation of emotions
- Coping strategies
- Emotional resilience building
- Professional help portrayed positively

### What if my child just wants something silly?

**Perfect.**

Joy, nonsense, and laughter are not distractions. They are essential. Storytailor embraces absurdity, play, and pure fun. Sometimes the most important thing a child needs is to laugh with someone they trust.

**Playful Story Types:**
- Adventure (brave and silly heroes)
- Bedtime (dreamy and whimsical)
- Birthday (celebration and magic)
- All stories can include humor and joy!

---

## Additional Resources

### Contact & Support

**General Support:**  
Email: support@storytailor.com  
Instagram: @storytailorinc  
Response Time: 24-48 hours

**Professional Inquiries:**  
Email: professional@storytailor.com

**Enterprise & Partners:**  
Email: enterprise@storytailor.com

**Technical Support (API):**  
Email: api-support@storytailor.com  
Developer Discord: Coming soon

### Documentation

- **API Reference**: `docs/api-reference/README.md`
- **Story Intelligence**: `docs/story-intelligence/overview.md`
- **Integration Guides**: `docs/integration-guides/`
- **User Journeys**: `docs/user-journeys/`
- **Pricing Details**: `docs/business/pricing-comprehensive.md`

### Quick Reference

**What Storytailor Is:**
- Real-time story creation
- Emotion-first design
- Shared family experiences
- Professional support tool
- Moment-focused, not archive-focused

**What Storytailor Is Not:**
- Not therapy or diagnosis
- Not a book publisher
- Not a reading app or library
- Not a replacement for caregivers
- Not selling or sharing your data

---

*Last Updated: 2025-12-17*  
*For the most current information, visit storytailor.com or contact support@storytailor.com*

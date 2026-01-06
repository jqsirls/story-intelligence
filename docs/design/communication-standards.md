# Communication Standards

**Last Updated**: 2025-12-14  
**Audience**: Customer Service | Support | All Team Members | Partners  
**Status**: Draft

## Overview

This document provides comprehensive communication standards for Storytailor, including communication by audience (customer-facing, partner-facing, internal, investor-facing), communication channels (email, support tickets, phone, chat, in-app), response time standards, escalation procedures, communication templates, communication tone by context, crisis communication protocols, and communication training resources.

**Code References:**
- `docs/operations/customer-service/` - Customer service standards
- `docs/design/voice-and-tone.md` - Voice guidelines
- `docs/roles/customer-service.md` - Customer service context
- `docs/brand/ethical-positioning-guidelines.md` - Ethical positioning and response scripts for tough questions

## Communication by Audience

### Customer-Facing Communication

**Audience:** Parents, families, end users

**Tone:**
- Warm and empathetic
- Helpful and solution-oriented
- Clear and simple (no jargon)
- Patient and understanding

**Key Principles:**
- Always prioritize child safety and well-being
- Acknowledge concerns and show empathy
- Provide clear, actionable solutions
- Follow up to ensure resolution

**Example:**
- ✅ "I completely understand your concern about content quality. Story Intelligence ensures every story meets award-caliber standards, so you can trust that your child is getting the best. Let me help you with [specific solution]."
- ❌ "That's a known issue. We're working on it." (too dismissive, not empathetic)

**Code References:**
- `docs/design/voice-and-tone.md:47-56` - Customer support tone
- `docs/operations/customer-service/troubleshooting.md` - Troubleshooting guidelines

### Partner-Facing Communication

**Audience:** Integration partners, white-label partners, API users

**Tone:**
- Professional and collaborative
- Value-focused and solution-oriented
- Respectful and partnership-oriented
- Clear and technical (when needed)

**Key Principles:**
- Focus on partnership value
- Provide technical details when needed
- Be responsive and proactive
- Maintain professional relationships

**Example:**
- ✅ "We're excited about this partnership opportunity. Story Intelligence offers unique value for your platform - award-caliber personalized content that differentiates your offering. Let's schedule a technical integration call to discuss the details."
- ❌ "You should totally integrate our API because it's awesome!" (too casual, not professional)

**Code References:**
- `docs/storytailor/partner-integration.md` - Partner integration

### Internal Communication

**Audience:** Team members, colleagues, cross-functional teams

**Tone:**
- Professional but friendly
- Direct and efficient
- Collaborative and supportive
- Clear and actionable

**Key Principles:**
- Be clear and concise
- Provide context when needed
- Collaborate effectively
- Respect time and priorities

**Example:**
- ✅ "I need your input on [topic] for [reason]. Here's the context: [details]. Can you review by [deadline]?"
- ❌ "Hey, can you look at this thing when you get a chance?" (too vague, no context)

### Investor-Facing Communication

**Audience:** Investors, board members, advisors

**Tone:**
- Professional and confident
- Data-driven and evidence-based
- Strategic and forward-looking
- Transparent and honest

**Key Principles:**
- Lead with key metrics
- Provide context and rationale
- Be transparent about challenges
- Show growth trajectory

**Example:**
- ✅ "We're seeing strong unit economics with LTV:CAC ratios of 4:1 to 5:1, and we're on track to reach $1M ARR by end of Year 2. Our primary focus is customer acquisition through PLG, which is showing the highest efficiency."
- ❌ "Things are going great! We're growing really fast!" (too casual, not data-driven)

**Code References:**
- `docs/economics/investor-materials.md` - Investor materials
- `docs/executive/key-metrics.md` - Key metrics

## Communication Channels

### Email

**Use Cases:**
- Customer support
- Partner communications
- Internal updates
- Marketing emails
- Transactional emails

**Response Time Standards:**
- Customer support: Within 24 hours (ideally 4-6 hours)
- Partner communications: Within 24 hours
- Internal: Within 48 hours (non-urgent)
- Urgent: Within 4 hours

**Tone:** Professional, warm, clear

**Templates:** See Communication Templates section

### Support Tickets

**Use Cases:**
- Customer issues and questions
- Bug reports
- Feature requests
- Account issues

**Response Time Standards:**
- Critical (safety, security): Immediate (within 1 hour)
- High priority (functionality): Within 4 hours
- Medium priority (features): Within 24 hours
- Low priority (enhancements): Within 48 hours

**Tone:** Helpful, empathetic, solution-oriented

**Code References:**
- `docs/operations/customer-service/support-workflows.md` - Support workflows

### Phone

**Use Cases:**
- Customer support (scheduled calls)
- Partner calls
- Sales calls
- Internal meetings

**Response Time Standards:**
- Scheduled calls: On time (punctuality important)
- Callbacks: Within 24 hours (if requested)

**Tone:** Professional, warm, clear, patient

### Chat (In-App or Web)

**Use Cases:**
- Real-time customer support
- Quick questions
- Product assistance

**Response Time Standards:**
- During business hours: Within 5 minutes
- Outside business hours: Next business day

**Tone:** Friendly, helpful, concise

### In-App Communication

**Use Cases:**
- Product announcements
- Feature updates
- Educational tips
- Onboarding messages

**Response Time Standards:**
- Not applicable (one-way communication)
- Updates: As needed (product updates)

**Tone:** Helpful, encouraging, clear

## Response Time Standards

### Customer Support

**Critical Issues (Safety, Security):**
- Response: Immediate (within 1 hour)
- Resolution: Within 24 hours
- Follow-up: Daily until resolved

**High Priority (Functionality):**
- Response: Within 4 hours
- Resolution: Within 48 hours
- Follow-up: As needed

**Medium Priority (Features, Questions):**
- Response: Within 24 hours
- Resolution: Within 5 business days
- Follow-up: As needed

**Low Priority (Enhancements, Feedback):**
- Response: Within 48 hours
- Resolution: As prioritized
- Follow-up: As needed

**Code References:**
- `docs/operations/customer-service/support-workflows.md` - Support workflows

### Partner Communications

**Urgent (Integration Issues):**
- Response: Within 4 hours
- Resolution: Within 24 hours

**Standard (Partnership Questions):**
- Response: Within 24 hours
- Resolution: Within 5 business days

### Internal Communications

**Urgent:**
- Response: Within 4 hours
- Action: As needed

**Standard:**
- Response: Within 48 hours
- Action: As prioritized

## Escalation Procedures

### Customer Support Escalation

**Level 1: Support Team**
- Standard customer issues
- Common questions
- Basic troubleshooting

**Level 2: Senior Support / Technical Team**
- Complex technical issues
- Integration problems
- Advanced troubleshooting

**Level 3: Engineering / Product Team**
- Bug reports
- Feature requests
- Product issues

**Level 4: Executive / Legal**
- Safety or security concerns
- Legal issues
- Crisis situations

**Escalation Criteria:**
- Issue cannot be resolved at current level
- Requires specialized knowledge
- Safety or security concern
- Customer requests escalation

**Code References:**
- `docs/operations/customer-service/support-workflows.md` - Escalation procedures

### Partner Escalation

**Level 1: Partner Success Manager**
- Standard partnership questions
- Integration support
- Account management

**Level 2: Technical Team**
- Complex integration issues
- API problems
- Technical support

**Level 3: Executive / Business Development**
- Strategic partnership discussions
- Contract negotiations
- Major partnership issues

## Communication Templates

### Support Response Template

**Template:**
"Hi [Customer Name],

Thank you for reaching out about [issue]. I completely understand [acknowledge concern/issue].

[Provide solution or next steps]

[Additional helpful information if relevant]

If you have any other questions or concerns, please don't hesitate to reach out. We're here to help!

Best regards,
[Your Name]
Storytailor Support"

**Customization:**
- Personalize with customer name
- Acknowledge specific concern
- Provide clear solution
- Maintain warm, helpful tone

### Partner Communication Template

**Template:**
"Hi [Partner Name],

Thank you for your interest in [topic/partnership opportunity].

[Provide information or next steps]

[Technical details if relevant]

I'd be happy to schedule a call to discuss this further. Would [time] work for you?

Best regards,
[Your Name]
Storytailor Partnership Team"

**Customization:**
- Professional tone
- Value-focused messaging
- Technical details when needed
- Clear next steps

### Internal Update Template

**Template:**
"Hi Team,

[Brief context/update]

[Key information/details]

[Action items if any]

[Questions or feedback requested]

Thanks,
[Your Name]"

**Customization:**
- Clear and concise
- Provide context
- Actionable items
- Efficient communication

## Communication Tone by Context

### Customer Support Context

**Tone:** Warm, empathetic, helpful, patient

**Principles:**
- Acknowledge concerns
- Show empathy
- Provide solutions
- Follow up

**Code References:**
- `docs/design/voice-and-tone.md:47-56` - Customer support tone

### Sales Context

**Tone:** Consultative, value-focused, confident, respectful

**Principles:**
- Understand needs first
- Focus on benefits
- No pressure
- Authentic interest

**Code References:**
- `docs/design/voice-and-tone.md:57-66` - Sales tone

### Technical Context

**Tone:** Clear, precise, helpful, professional

**Principles:**
- Accurate and detailed
- Examples when helpful
- Accessible language
- Concise

**Code References:**
- `docs/design/voice-and-tone.md:67-76` - Technical documentation tone

## Crisis Communication Protocols

### Crisis Identification

**Types of Crises:**
- Safety or security incidents
- Data breaches
- Service outages
- Negative media coverage
- Legal issues

### Crisis Response Protocol

**Immediate (Within 1 Hour):**
1. Acknowledge the issue
2. Express concern and empathy
3. Commit to resolution
4. Provide contact for direct communication

**Follow-Up (Within 24 Hours):**
1. Provide status update
2. Share resolution progress
3. Apologize if appropriate
4. Communicate prevention measures

**Ongoing:**
1. Regular updates (every 4-6 hours during active crisis)
2. Transparent communication
3. Resolution and prevention sharing
4. Lessons learned communication

### Crisis Communication Principles

**Do's:**
- ✅ Respond quickly (within 1 hour)
- ✅ Be transparent and honest
- ✅ Take responsibility (if appropriate)
- ✅ Show empathy and concern
- ✅ Provide regular updates
- ✅ Communicate resolution and prevention

**Don'ts:**
- ❌ Delay response unnecessarily
- ❌ Be defensive or dismissive
- ❌ Blame others (take responsibility)
- ❌ Make promises you can't keep
- ❌ Ignore or minimize the issue

## Communication Do's and Don'ts

### Do's

**✅ Do:**
- Use appropriate tone for audience and context
- Respond within time standards
- Acknowledge concerns and show empathy
- Provide clear, actionable solutions
- Follow up to ensure resolution
- Use templates as starting points (customize)
- Maintain brand voice (warm, expert, innovative, safe)
- Be transparent and honest
- Take responsibility when appropriate
- Show appreciation and gratitude

### Don'ts

**❌ Don't:**
- Use inappropriate tone (too casual, too formal)
- Ignore or delay responses unnecessarily
- Be dismissive or defensive
- Use jargon unnecessarily
- Make promises you can't keep
- Blame others (take responsibility)
- Use templated responses without customization
- Violate privacy or confidentiality
- Engage in arguments
- Make assumptions about customer needs

## Handling Tough Questions

### Ethical and AI-Related Questions

**Common Tough Questions:**
- "What AI do you use?"
- "Is this ethical?"
- "Are you stealing from artists?"
- "How is this different from ChatGPT?"
- "Why not just hire authors?"

**Response Strategy:**
- Reference ethical positioning guidelines
- Lead with creator credentials (JQ's awards and books)
- Acknowledge complexity honestly
- Emphasize what we control
- Use provided response scripts

**Code References:**
- `docs/brand/ethical-positioning-guidelines.md` - Complete response scripts and ethical framework
- `docs/brand/creator-positioning-jq-sirls.md` - Creator credentials for credibility building

**Key Principles:**
- Don't be defensive
- Acknowledge valid concerns
- Lead with creator story
- Emphasize methodology, not technology
- Show transparency and thoughtfulness

## Communication Training Resources

### Voice and Tone Training

**Resources:**
- Voice and Tone Guidelines: `docs/design/voice-and-tone.md`
- Brand Guidelines: `docs/design/brand-guidelines.md`
- Story Intelligence Brand Guide: `docs/brand/01-story-intelligence-brand-guide.md`

**Training Topics:**
- Brand voice characteristics
- Tone variations by context
- Voice do's and don'ts
- Examples and practice

### Ethical Positioning Training

**Resources:**
- Ethical Positioning Guidelines: `docs/brand/ethical-positioning-guidelines.md`
- Creator Positioning: `docs/brand/creator-positioning-jq-sirls.md`
- Social Media Voice: `docs/marketing/social-media-uncomfortable-topics.md`

**Training Topics:**
- Response scripts for tough questions
- Ethical positioning framework
- Creator credibility story
- Handling criticism gracefully

### Messaging Training

**Resources:**
- Themes and Messaging: `docs/design/themes-and-messaging.md`
- Introduction Guidelines: `docs/design/introduction-guidelines.md`

**Training Topics:**
- Core messaging themes
- Messaging by audience
- Value proposition messaging
- Introduction techniques

### Customer Service Training

**Resources:**
- Customer Service Documentation: `docs/operations/customer-service/`
- Support Workflows: `docs/operations/customer-service/support-workflows.md`
- Troubleshooting: `docs/operations/customer-service/troubleshooting.md`

**Training Topics:**
- Customer service standards
- Support workflows
- Troubleshooting techniques
- Escalation procedures

### Crisis Communication Training

**Resources:**
- This document (Crisis Communication Protocols)
- Social Media Standards: `docs/design/social-media-standards.md` (Crisis Communication section)

**Training Topics:**
- Crisis identification
- Crisis response protocol
- Crisis communication principles
- Practice scenarios

## Related Documentation

- **Customer Service**: See [Customer Service Documentation](../operations/customer-service/README.md) - Customer service standards
- **Voice and Tone**: See [Voice and Tone](./voice-and-tone.md) - Voice guidelines
- **Introduction Guidelines**: See [Introduction Guidelines](./introduction-guidelines.md) - How to introduce Storytailor
- **Social Media Standards**: See [Social Media Standards](./social-media-standards.md) - Social media engagement
- **Customer Service Role**: See [Customer Service Role](../roles/customer-service.md) - Customer service context

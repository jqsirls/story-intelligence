# IP Attribution System Design

**Last Updated**: 2025-01-15 (Updated with Anime & International IP)  
**Audience**: Product | Engineering | Design | Legal  
**Status**: ✅ Implementation Complete

## Overview

This document outlines the design and implementation of an IP attribution system that appears naturally in the user journey as a quiet aside (like pharmaceutical side effects), not as a headline or disruptive moment. The system ensures ethical transparency without breaking the story creation experience.

**Design Principle:** Like pharmaceutical side effects in ads - present, clear, but in margins. Not hidden, but not a focus. Appears contextually when IP is detected. Does not interrupt story creation flow.

**Code References:**
- `docs/brand/ethical-positioning-guidelines.md` - IP handling framework
- `docs/brand/01-story-intelligence-brand-guide.md` - Brand positioning

## Design Principles

### Quiet Aside Positioning

**Pharmaceutical Ad Model:**
- Present and clear, but in margins
- Not hidden, but not a focus
- Available for those who seek it
- Doesn't compete with main content

**Application:**
- Attribution appears contextually
- Small, unobtrusive text
- Footer, margins, or info icon placement
- Does not interrupt story creation

**Visual Hierarchy:**
- Main content: Story creation experience (primary)
- Attribution: Quiet aside (tertiary)
- Clear but not prominent
- Accessible but not distracting

### User Journey Integration

**Seamless Integration:**
- Attribution appears naturally
- No disruptive pop-ups
- No blocking modals
- No forced acknowledgments

**Contextual Appearance:**
- When IP is detected
- During relevant moments
- In appropriate locations
- At appropriate times

## IP Detection Framework

### Character Recognition

**Detection Targets:**
- **Superheroes**: Spiderman, Batman, Superman (DC/Marvel)
- **Disney**: Elsa, Anna, Mickey Mouse, Frozen, and Disney preschool content
- **Warner Bros.**: Harry Potter, Hermione, and related characters
- **Global Kids IP (Ages 3-10)**: PAW Patrol, Bluey, SpongeBob, Peppa Pig, Masha and the Bear, Pokémon, Minecraft, Roblox, LEGO, Barbie
- **Anime & International (Ages 0-10)**: Doraemon, Naruto, One Piece, Little Witch Academia, Pocoyo, Dragon Ball
- Other recognizable copyrighted characters

**Detection Method:**
- Character name matching
- Character description matching
- Franchise identification
- Confidence scoring

**Implementation:**
- Character name database
- Franchise mapping
- Pattern recognition
- Confidence algorithms

### Franchise Identification

**Major Franchises:**

**Tier A: Global Giants (Ages 3-10)**
- Marvel (Spiderman, Iron Man, etc.)
- DC Comics (Batman, Superman, etc.)
- Disney (Elsa, Anna, Mickey, Frozen, etc.)
- LEGO (The LEGO Group)
- Barbie (Mattel)
- Minecraft (Microsoft/Mojang Studios)
- Roblox (Roblox Corporation)
- PAW Patrol (Paramount/Nickelodeon)
- Pokémon (The Pokémon Company)
- Frozen (Disney)

**Tier B: Behaviorally Huge (Ages 3-10)**
- Bluey (BBC Studios/Ludo Studio)
- SpongeBob SquarePants (Paramount/Nickelodeon)
- Peppa Pig (Entertainment One/Hasbro)
- Masha and the Bear (Animaccord)

**Anime & International (Ages 0-10)**
- Doraemon (Fujiko F. Fujio/Shogakukan) - Ages 0-10
- Naruto (Shueisha) - Ages 7-10
- One Piece (Shueisha/Eiichiro Oda) - Ages 7-10
- Little Witch Academia (Trigger/Studio Trigger) - Ages 6-10
- Pocoyo (Zinkia Entertainment) - Ages 0-5
- Dragon Ball (Shueisha) - Ages 7-10

**Other Major IP Holders**
- Warner Bros. (Harry Potter, etc.)
- Nintendo (Super Mario, The Legend of Zelda)
- Sega (Sonic the Hedgehog)

**Identification Method:**
- Character-to-franchise mapping
- Franchise-to-owner mapping
- Owner attribution database
- Legal entity identification

### Story Element Detection

**Detection Scope:**
- Character names
- Character descriptions
- Setting elements (if copyrighted)
- Plot elements (if copyrighted)
- Franchise-specific elements

**Confidence Levels:**
- High: Exact character name match
- Medium: Character description match
- Low: Possible IP, needs review

### Confidence Scoring

**Scoring System:**
- **High Confidence (90%+)**: Exact character name match
- **Medium Confidence (50-90%)**: Character description match
- **Low Confidence (<50%)**: Possible IP, review recommended

**Application:**
- High confidence: Show attribution immediately
- Medium confidence: Show attribution with note
- Low confidence: Optional attribution, user can request

## Attribution Display System

### Quiet Aside Format

**Visual Design:**
- Small, unobtrusive text
- Subtle typography
- Low visual weight
- Doesn't compete with story

**Placement Options:**
- Footer (like photo credits)
- Margins (like side notes)
- Info icon (expandable)
- Settings/About (full details)

**Language:**
- Simple and clear
- Non-alarming
- Factual, not defensive
- "Batman belongs to DC Comics"

### Placement Guidelines

**Footer Placement:**
- Bottom of story view
- Small text, subtle color
- Like photo credits
- Always visible but not prominent

**Margin Placement:**
- Side margins on story pages
- Small text, subtle styling
- Like side notes
- Contextual to content

**Info Icon:**
- Small "i" icon
- Expandable on click/tap
- Full attribution details
- Non-intrusive

**Settings/About:**
- Full IP policy
- Complete attribution info
- Legal details
- For those who seek it

### Language Standards

**Simple and Clear:**
- "Batman belongs to DC Comics"
- "Elsa and Anna are Disney characters"
- "Spiderman belongs to Marvel"
- "Note: [Character] is owned by [Owner]"

**Non-Alarming:**
- Factual, not defensive
- Informative, not warning
- Clear, not confusing
- Helpful, not restrictive

**Consistent Format:**
- "[Character] belongs to [Owner]"
- "[Character] is owned by [Owner]"
- "Note: [Character] is a [Franchise] character"

### Visual Design

**Typography:**
- Small font size (10-12px)
- Subtle color (gray, not black)
- Lower visual weight
- Readable but not prominent

**Layout:**
- Doesn't compete with story
- Clear hierarchy
- Accessible placement
- Responsive design

**Accessibility:**
- Screen reader accessible
- Keyboard navigable
- Color contrast compliant
- Clear but subtle

## User Journey Touchpoints

### Character Selection

**When IP Detected:**
- Show small note: "Note: [Character] belongs to [Owner]"
- Place in character selection area
- Small text, subtle styling
- Non-blocking, informative

**Example:**
- User selects "Batman" as character
- Small text appears: "Note: Batman belongs to DC Comics"
- Placement: Below character selection, small gray text
- Does not block or interrupt selection

### Story Generation

**During Generation:**
- No interruption
- Attribution added automatically
- No user action required
- Seamless experience

**After Generation:**
- Attribution included in story
- Appears in footer/margins
- Quiet aside format
- Always visible but not prominent

### Story Viewing

**Credit Line in Footer:**
- Like photo credits
- Small text at bottom
- "Batman belongs to DC Comics"
- Always visible but subtle

**Example Footer:**
```
---
Batman belongs to DC Comics. This story is for your family's personal enjoyment.
```

### Story Sharing

**Attribution in Share Metadata:**
- Included in share text
- Attribution automatically added
- Clear but not prominent
- Legal compliance

**Example Share Text:**
"Check out the story we created! [Story preview] Note: Batman belongs to DC Comics. Story created with Storytailor."

### Settings/About

**Full IP Policy:**
- Complete attribution information
- IP policy details
- Legal information
- For those who seek it

**Access:**
- Settings menu
- About page
- Help/Support
- Available but not required

## Technical Implementation

### Detection Algorithm/API Integration

**Detection System:**
- Character name matching
- Description pattern matching
- Franchise identification
- Confidence scoring

**API Integration:**
- Real-time detection during story creation
- Background processing
- Non-blocking implementation
- Fast response time

**Database:**
- Character name database
- Franchise mapping
- Owner attribution
- Legal entity information

### Attribution Database Structure

**Database Schema:**
- Character name
- Franchise
- Owner/Legal entity
- Attribution text
- Legal status

**Example Entry:**
```
Character: "Batman"
Franchise: "DC Comics"
Owner: "DC Comics (Warner Bros.)"
Attribution: "Batman belongs to DC Comics"
Legal Status: "Copyrighted"
```

### UI Component Design

**Quiet Aside Component:**
- Reusable component
- Configurable placement
- Responsive design
- Accessible implementation

**Component Props:**
- Attribution text
- Placement (footer, margin, icon)
- Visibility level
- Styling options

**Implementation:**
- React/Vue component
- CSS styling
- Responsive breakpoints
- Accessibility features

### Integration with Story Generation Pipeline

**Integration Points:**
- Character selection
- Story generation
- Story review
- Story display
- Story sharing

**Implementation:**
- Non-blocking detection
- Background processing
- Seamless integration
- Performance optimized

### Analytics

**Track:**
- IP usage frequency
- Attribution views
- User engagement with attribution
- Attribution click-through

**Metrics:**
- IP detection rate
- Attribution visibility
- User interaction
- Legal compliance

## Implementation Details

### Backend Services

**IP Detection Service** (`lambda-deployments/content-agent/src/services/IPDetectionService.ts`):
- Hybrid detection: Database lookup + NLP pattern matching
- Character name matching (exact, fuzzy, case-insensitive)
- Story content analysis with pattern recognition
- Confidence scoring (high/medium/low)
- Redis caching for performance (< 50ms target)
- Methods: `detectIP()`, `formatAttributionMessage()`, `formatAttributionForAPI()`

**NLP Pattern Recognition:**
- **Marvel/DC**: Web-slinging, spider-sense, Gotham City, Krypton, etc.
- **Disney**: "Let it go", ice powers, Arendelle, magic carpet, etc.
- **Global Kids IP**: "paw patrol", "adventure bay", "keepy uppy", "bikini bottom", "muddy puddles", etc.
- **Anime & International**: 
  - Doraemon: "robot cat", "fourth dimensional pocket", "anywhere door"
  - Naruto: "hidden leaf village", "ninja", "rasengan", "shadow clone", "sharingan"
  - One Piece: "straw hat", "pirate", "devil fruit", "grand line", "nakama"
  - Little Witch Academia: "luna nova", "shiny rod", "magic academy"
  - Pocoyo: Character names (Pocoyo, Pato, Elly, etc.)
  - Dragon Ball: "kamehameha", "super saiyan", "dragon balls", "shenron"

**IP Attribution Database** (`lambda-deployments/content-agent/src/data/ipAttributionDatabase.ts`):
- Character → Franchise → Owner mapping
- **Major franchises**: Marvel, DC Comics, Disney, Warner Bros., Harry Potter
- **Global kids IP (Ages 3-10)**: PAW Patrol, Bluey, SpongeBob, Peppa Pig, Masha and the Bear, Pokémon, Minecraft, Roblox, LEGO, Barbie
- **Anime & International (Ages 0-10)**: Doraemon, Naruto, One Piece, Little Witch Academia, Pocoyo, Dragon Ball
- **Variant name support** (e.g., "Spiderman" and "Spider-Man", "Pocoyo" and "Pocoyó")
- **Helper functions**: `getIPAttribution()`, `fuzzyMatchIP()`, `getCharactersByFranchise()`
- **Character coverage**: 200+ characters across 30+ franchises

**IP Dispute Service** (`lambda-deployments/content-agent/src/services/IPDisputeService.ts`):
- User reporting API endpoints
- Rights holder dispute handling
- Automatic re-detection workflow
- Manual attribution addition/removal
- Legal escalation support

**IP Audit Service** (`lambda-deployments/content-agent/src/services/IPAuditService.ts`):
- Complete audit trail logging
- Detection attempt tracking
- Attribution display logging
- Dispute tracking
- Legal protection documentation

**IP Analytics Service** (`lambda-deployments/content-agent/src/services/IPAnalyticsService.ts`):
- Detection frequency analytics
- Accuracy metrics (false positives/negatives)
- Dispute resolution metrics
- Performance monitoring
- API endpoints for dashboards

### Database Schema

**Stories Table:**
- `metadata` JSONB field stores `ipAttributions` array
- Format: `{ ipAttributions: [{ character, franchise, owner, confidence, detectedAt, attributionText, personalUseMessage, ownershipDisclaimer }] }`

**IP Disputes Table:**
- Tracks user reports and rights holder claims
- Status workflow: pending → reviewing → resolved/escalated
- Automatic re-detection on submission
- Legal escalation flag

**IP Detection Audit Table:**
- Logs all detection attempts
- Records detection method (automatic/manual/user_report/rights_holder)
- Stores detected characters and confidence scores
- Tracks attribution display timestamps
- Complete legal audit trail

### API Integration

**Story API Responses:**
- All story endpoints return `metadata.ipAttributions` when IP is detected
- JSON schema includes complete attribution structure
- No UI components - data available for any UI to consume

**Character Selection API:**
- Detects IP when character name is provided
- Returns `ipAttribution` object in response
- Format: `{ detected: boolean, character, franchise, owner, attributionText, personalUseMessage, ownershipDisclaimer, confidence }`

**Conversational Interfaces:**
- Attribution included in `speechText` responses
- Natural language format: "Note: [Character] belongs to [Owner]. This story is for your family's personal enjoyment only. We are not the owners of this character."
- Quiet aside style - appended naturally to story response

**Story Sharing:**
- Attribution automatically included in share metadata
- Available in JSON responses for any sharing mechanism
- Format ready for email, social media, or other sharing channels

### JSON Schema

**IP Attribution Object:**
```json
{
  "character": "Batman",
  "franchise": "DC Comics",
  "owner": "DC Comics (Warner Bros.)",
  "confidence": "high",
  "detectedAt": "2025-01-15T10:30:00Z",
  "attributionText": "Batman belongs to DC Comics (Warner Bros.)",
  "personalUseMessage": "This story is for your family's personal enjoyment only",
  "ownershipDisclaimer": "We are not the owners of this character"
}
```

**Story Response with IP Attribution:**
```json
{
  "id": "story-123",
  "title": "Batman Adventure",
  "content": { "text": "..." },
  "metadata": {
    "ipAttributions": [
      {
        "character": "Batman",
        "franchise": "DC Comics",
        "owner": "DC Comics (Warner Bros.)",
        "confidence": "high",
        "detectedAt": "2025-01-15T10:30:00Z",
        "attributionText": "Batman belongs to DC Comics (Warner Bros.)",
        "personalUseMessage": "This story is for your family's personal enjoyment only",
        "ownershipDisclaimer": "We are not the owners of this character"
      }
    ]
  }
}
```

**Character Selection Response:**
```json
{
  "success": true,
  "character": {
    "name": "Batman",
    "id": "char-123"
  },
  "ipAttribution": {
    "detected": true,
    "character": "Batman",
    "franchise": "DC Comics",
    "owner": "DC Comics (Warner Bros.)",
    "attributionText": "Batman belongs to DC Comics (Warner Bros.)",
    "personalUseMessage": "This story is for your family's personal enjoyment only",
    "ownershipDisclaimer": "We are not the owners of this character",
    "confidence": "high"
  }
}
```

### Developer Guide

**Using IP Detection Service:**
```typescript
import { IPDetectionService } from './services/IPDetectionService';

const ipService = new IPDetectionService({
  redis: redisClient, // Optional - for caching
  enableCache: true,
  cacheTTL: 86400, // 24 hours
});

// Detect IP in story
const characterNames = ['Batman', 'Spiderman'];
const results = await ipService.detectIP(storyContent, characterNames);

// Format for API response
const apiFormat = ipService.formatAttributionForAPI(results);

// Format for conversational response
const message = results.length > 0 
  ? ipService.formatAttributionMessage(results[0])
  : null;
```

**Storing IP Attribution in Story:**
```typescript
const ipAttributions = results.map(attr => ({
  character: attr.character,
  franchise: attr.franchise,
  owner: attr.owner,
  confidence: attr.confidence,
  detectedAt: new Date().toISOString(),
  attributionText: attr.attributionText,
  personalUseMessage: attr.personalUseMessage,
  ownershipDisclaimer: attr.ownershipDisclaimer,
}));

const storyMetadata = {
  ...existingMetadata,
  ipAttributions: ipAttributions.length > 0 ? ipAttributions : undefined,
};
```

**Submitting IP Dispute:**
```typescript
import { IPDisputeService } from './services/IPDisputeService';

const disputeService = new IPDisputeService(supabaseUrl, supabaseKey);

const dispute = await disputeService.submitDispute({
  storyId: 'story-123',
  reportedBy: 'user-123',
  disputeType: 'missed_detection',
  characterName: 'Batman',
  description: 'Batman was not attributed',
});
```

**Logging to Audit Trail:**
```typescript
import { IPAuditService } from './services/IPAuditService';

const auditService = new IPAuditService(supabaseUrl, supabaseKey);

const auditId = await auditService.logDetection({
  storyId: 'story-123',
  detectionMethod: 'automatic',
  detectedCharacters: results,
  userId: 'user-123',
  sessionId: 'session-123',
});
```

## Legal & Ethical Framework

### Personal Use Positioning

**The Analogy:**
- "Child drawing Spiderman" = personal use
- Story creation = personal use
- Private family treasure
- Not commercial distribution

**Legal Framework:**
- Fair use for personal expression
- Private use, not public
- Educational use considerations
- Transformative work elements

### Fair Use Considerations

**Fair Use Factors:**
- Purpose and character of use (personal, educational)
- Nature of copyrighted work (character, not entire work)
- Amount used (character name/description)
- Effect on market (personal use, not commercial)

**Application:**
- Personal family stories
- Not commercial distribution
- Transformative use (new stories)
- Educational value

### Terms of Use Integration

**Required Terms:**
- Personal use only
- No commercial distribution
- IP belongs to original creators
- Attribution required
- Legal compliance

**User Agreement:**
- Clear personal use restrictions
- Commercial use prohibitions
- Attribution requirements
- IP ownership acknowledgment

### Creator Credit Requirements

**Attribution Requirements:**
- Credit original creators
- Acknowledge IP ownership
- Clear attribution text
- Legal compliance

**Implementation:**
- Automatic attribution
- Clear credit text
- Legal entity identification
- Consistent format

### Commercial Use Restrictions

**What's Allowed:**
- Personal family use
- Educational use (with attribution)
- Therapeutic use (with attribution)
- Private sharing within family

**What's NOT Allowed:**
- Commercial publication
- Selling stories with IP
- Public distribution without attribution
- Commercial use of IP characters

## UX Guidelines

### When to Show Attribution

**Contextual Triggers:**
- When IP character is selected
- When IP character appears in story
- When story is viewed
- When story is shared

**Timing:**
- During character selection (if detected)
- After story generation (always)
- During story viewing (always)
- During story sharing (always)

### How to Present

**Visual Hierarchy:**
- Story content: Primary (large, prominent)
- Attribution: Tertiary (small, subtle)
- Clear but not competing
- Accessible but not distracting

**Placement:**
- Footer (primary)
- Margins (secondary)
- Info icon (tertiary)
- Settings (full details)

### What Language to Use

**Simple and Clear:**
- "Batman belongs to DC Comics"
- "Note: [Character] is owned by [Owner]"
- Factual, not defensive
- Informative, not warning

**Avoid:**
- Alarming language
- Defensive tone
- Legal jargon
- Confusing text

### Accessibility Requirements

**Screen Readers:**
- Proper ARIA labels
- Semantic HTML
- Readable text
- Clear structure

**Keyboard Navigation:**
- Keyboard accessible
- Tab order logical
- Focus indicators
- Keyboard shortcuts

**Color Contrast:**
- WCAG AA compliant
- Readable text
- Sufficient contrast
- Accessible colors

### Mobile vs. Desktop Considerations

**Mobile:**
- Smaller text acceptable
- Footer placement preferred
- Touch-friendly if interactive
- Responsive design

**Desktop:**
- Margin placement possible
- More space for attribution
- Hover states if interactive
- Larger text options

## Implementation Phases

### Phase 1: Detection System

**Tasks:**
- Build character name database
- Implement detection algorithm
- Create franchise mapping
- Develop confidence scoring

**Deliverables:**
- Detection API
- Character database
- Franchise mapping
- Confidence algorithm

### Phase 2: Attribution Database

**Tasks:**
- Build attribution database
- Map characters to owners
- Create attribution text
- Legal entity identification

**Deliverables:**
- Attribution database
- Owner mapping
- Attribution text library
- Legal compliance data

### Phase 3: UI Components

**Tasks:**
- Design quiet aside component
- Implement footer attribution
- Create margin placement
- Build info icon component

**Deliverables:**
- Reusable components
- Responsive design
- Accessibility features
- Styling system

### Phase 4: Integration

**Tasks:**
- Integrate with story generation
- Add to character selection
- Implement in story viewing
- Include in story sharing

**Deliverables:**
- Integrated system
- Seamless user experience
- Performance optimized
- Legal compliance

### Phase 5: Testing & Refinement

**Tasks:**
- User testing
- Accessibility testing
- Legal review
- Performance optimization

**Deliverables:**
- Tested system
- Refined UX
- Legal compliance verified
- Performance optimized

## Success Criteria

**Functional:**
- IP detection working accurately
- Attribution appearing contextually
- No disruption to story creation
- Legal compliance maintained

**UX:**
- Quiet aside positioning achieved
- No user complaints about disruption
- Attribution accessible but not prominent
- Seamless integration

**Legal:**
- Attribution requirements met
- Terms of use compliance
- Fair use positioning clear
- Legal risk minimized

**Technical:**
- Performance optimized
- Scalable implementation
- Maintainable code
- Analytics tracking

## API Endpoints

### Dispute Endpoints

**POST /api/stories/:storyId/ip-disputes**
- Submit IP dispute (user report or rights holder claim)
- Request body: `{ disputeType, characterName, description?, franchise?, owner? }`
- Response: `{ id, storyId, status, ... }`

**GET /api/ip-disputes/:disputeId**
- Get dispute status
- Response: `{ id, storyId, status, resolution, ... }`

**POST /api/ip-disputes/rights-holder-claim**
- Rights holder dispute submission
- Request body: `{ storyId, characterName, franchise, owner, contactInfo }`
- Response: `{ id, status: 'escalated', ... }`

### Audit Endpoints

**GET /api/stories/:storyId/ip-audit**
- Get audit trail for story
- Response: `{ records: [{ detectionTimestamp, detectionMethod, detectedCharacters, ... }] }`

**GET /api/users/:userId/ip-audit**
- Get audit trail for user
- Response: `{ records: [...] }`

### Analytics Endpoints

**GET /api/analytics/ip-detection**
- Get IP detection analytics
- Query params: `startDate?`, `endDate?`
- Response: `{ detectionFrequency, detectionAccuracy, disputeMetrics, performanceMetrics }`

**GET /api/analytics/ip-disputes**
- Get dispute analytics
- Response: `{ total, byStatus, byType, resolutionTime }`

**GET /api/analytics/ip-performance**
- Get performance metrics
- Response: `{ totalDetections, averageDetectionTime, cacheHitRate, detectionByMethod }`

## Testing

**Unit Tests:**
- `lambda-deployments/content-agent/src/services/__tests__/IPDetectionService.test.ts`
- Tests: Exact matching, variants, NLP patterns, confidence scoring, message generation

**Integration Tests:**
- `lambda-deployments/content-agent/src/__tests__/IPAttributionIntegration.test.ts`
- Tests: Story generation integration, API response format, JSON schema validation

**API Tests:**
- `lambda-deployments/content-agent/src/__tests__/IPAttributionAPI.test.ts`
- Tests: Story endpoints, character selection, dispute endpoints, audit endpoints

## Performance Optimization

**Caching:**
- Redis caching for character lookups (permanent)
- Detection result caching (24-hour TTL)
- Cache key: SHA-256 hash of story content + character names

**Performance Targets:**
- Detection time: < 50ms (with cache)
- Database lookup: < 10ms (cached)
- No impact on story generation time

**Scaling:**
- Batch processing for high volume
- Background processing for non-critical detection
- Queue system for peak periods
- Rate limiting to prevent overload

## Related Documentation

- **Ethical Positioning**: See [`docs/brand/ethical-positioning-guidelines.md`](docs/brand/ethical-positioning-guidelines.md) - IP handling framework
- **Brand Guide**: See [`docs/brand/01-story-intelligence-brand-guide.md`](docs/brand/01-story-intelligence-brand-guide.md) - Brand positioning
- **Support Workflows**: See [`docs/operations/customer-service/support-workflows.md`](docs/operations/customer-service/support-workflows.md) - IP dispute handling
- **Type Definitions**: See [`packages/shared-types/src/types/story.ts`](packages/shared-types/src/types/story.ts) - IPAttribution, StoryMetadata, IPDispute types

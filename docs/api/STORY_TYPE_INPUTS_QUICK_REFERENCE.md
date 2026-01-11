# Story Type Inputs - Quick Reference Guide

**Last Updated**: December 26, 2025  
**API Version**: v1

---

## 📖 **Overview**

All 14 story types now support type-specific input objects that customize the story generation. This guide provides quick reference for each story type's required and optional fields.

---

## 🎂 **Birthday Story**

**Required Fields**:
```json
{
  "storyType": "birthday",
  "birthday": {
    "to": "Emma",                    // REQUIRED: Birthday person's name
    "from": "Mom and Dad",           // REQUIRED: Gift giver's name
    "ageTurning": 7,                 // REQUIRED: Age they're turning (number >= 1)
    "birthdayMessage": "Happy 7th birthday!"  // REQUIRED: Personal message
  }
}
```

**Example**:
```bash
POST /api/v1/stories
{
  "storyType": "birthday",
  "birthday": {
    "to": "Emma",
    "from": "Mom and Dad",
    "ageTurning": 7,
    "birthdayMessage": "Happy 7th birthday, sweet girl! We love you!"
  },
  "characterId": "<characterId>",
  "childAge": 7
}
```

---

## 📚 **Educational Story**

**Required Fields**:
```json
{
  "storyType": "educational",
  "educational": {
    "educationalSubject": "mathematics"  // REQUIRED: One of: language-arts, mathematics, science, social-studies, art, music, physical-education, health, technology, foreign-language
  }
}
```

**Optional Fields**:
- `gradeLevel`: "K", "1st", "2nd", etc.
- `learningObjective`: Specific learning objective
- `region`: Geographic region for context

**Example**:
```bash
POST /api/v1/stories
{
  "storyType": "educational",
  "educational": {
    "educationalSubject": "mathematics",
    "gradeLevel": "2nd",
    "learningObjective": "Understanding addition and subtraction"
  },
  "characterId": "<characterId>",
  "childAge": 7
}
```

---

## 💰 **Financial Literacy Story**

**Required Fields**:
```json
{
  "storyType": "financial-literacy",
  "financialLiteracy": {
    "financialConcept": "saving"  // REQUIRED: One of: saving, spending, earning, budgeting, giving, needs-vs-wants
  }
}
```

---

## 🌍 **Language Learning Story**

**Required Fields**:
```json
{
  "storyType": "language-learning",
  "languageLearning": {
    "targetLanguage": "Spanish",        // REQUIRED: Target language (e.g., "Spanish", "French")
    "proficiencyLevel": "beginner"       // REQUIRED: One of: beginner, intermediate, advanced
  }
}
```

**Optional Fields**:
- `vocabularyWords`: ["hola", "gracias", "por favor"]

---

## 🏥 **Medical Bravery Story**

**Required Fields**:
```json
{
  "storyType": "medical-bravery",
  "medicalBravery": {
    "medicalChallenge": "surgery"  // REQUIRED: Medical challenge (e.g., "surgery", "hospital stay", "vaccination")
  }
}
```

**Optional Fields**:
- `copingStrategy`: Strategy to emphasize
- `procedureDate`: Date for preparation
- `whatToExpect`: What the child should expect

---

## 🧠 **Mental Health Story**

**Required Fields**:
```json
{
  "storyType": "mental-health",
  "mentalHealth": {
    "emotionExplored": "anxiety"  // REQUIRED: One of: anxiety, sadness, anger, fear, worry, frustration, loneliness, jealousy, guilt, shame
  }
}
```

**Optional Fields**:
- `copingMechanism`: Coping mechanism to teach
- `challengeType`: Specific challenge type

---

## 🎯 **Milestones Story**

**Required Fields**:
```json
{
  "storyType": "milestones",
  "milestones": {
    "milestoneType": "first day of school"  // REQUIRED: Milestone type (e.g., "first day of school", "moving", "new sibling")
  }
}
```

---

## 🔄 **Sequel Story**

**Required Fields**:
```json
{
  "storyType": "sequel",
  "sequel": {
    "parentStoryId": "<uuid>"  // REQUIRED: Parent story ID
  }
}
```

**Optional Fields**:
- `continuationType`: "sequel", "alternate-ending", etc.

---

## 💻 **Tech Readiness Story**

**Required Fields**:
```json
{
  "storyType": "tech-readiness",
  "techReadiness": {
    "techConcept": "screen-time"  // REQUIRED: One of: screen-time, internet-safety, coding, digital-citizenship, online-kindness, device-responsibility
  }
}
```

---

## 🧘 **Inner Child Story (Adult Therapeutic)**

**Required Fields**:
```json
{
  "storyType": "inner-child",
  "innerChild": {
    "yourName": "Sarah Johnson",                    // REQUIRED: Your name now
    "childhoodName": "Little Sarah",               // REQUIRED: Your childhood name
    "yourAgeNow": 35,                              // REQUIRED: Your age now (18+)
    "ageToReconnectWith": 7,                       // REQUIRED: Inner child age to reconnect with (1-17)
    "emotionalFocusArea": "abandonment",            // REQUIRED: See enum below
    "relationshipContext": "parent-child",          // REQUIRED: See enum below
    "wordCount": "750-1000",                        // REQUIRED: "750-1000" or "1000-1500"
    "therapeuticConsent": {                         // REQUIRED: Therapeutic consent
      "acknowledgedNotTherapy": true,
      "acknowledgedProfessionalReferral": true
    }
  }
}
```

**Emotional Focus Areas**:
`general-healing`, `abandonment`, `betrayal`, `fear`, `anger`, `guilt`, `shame`, `loneliness`, `lack-of-self-worth`, `perfectionism`, `emotional-numbness`, `overwhelm-and-anxiety`, `trust-issues`, `self-doubt`, `grief-loss`, `feeling-unseen-tolerated-undervalued`

**Relationship Contexts**:
`relationship-with-self`, `parent-child`, `parent-guardian`, `peer-relationships`, `romantic-relationships`, `marriage-partnership`, `workplace-dynamics`, `community-social`, `spiritual-faith`, `teacher-mentor`, `extended-family`, `post-separation-divorce`, `friendship-adulthood`, `no-specific-relationships`

**Optional Fields**:
- `protectivePattern`: Protective pattern to explore
- `memoryToAddress`: Specific memory to address

**Asset Generation**:
- **Default**: Cover art only (privacy-respecting)
- **Full Assets**: Pass `explicitFullAssets: true` to generate audio, scenes, PDF, activities

---

## 💔 **Child Loss Story (Adult Therapeutic)**

**Required Fields**:
```json
{
  "storyType": "child-loss",
  "childLoss": {
    "typeOfLoss": "miscarriage",                    // REQUIRED: See enum below
    "yourName": "Sarah Johnson",                    // REQUIRED: Your name
    "yourRelationship": "parent",                   // REQUIRED: See enum below
    "childName": "Emma",                            // REQUIRED: Child's name
    "childAge": "unborn",                           // REQUIRED: See enum below
    "childGender": "female",                        // REQUIRED: Child's gender
    "ethnicity": ["Chinese", "Mexican"],           // REQUIRED: Array (supports mixed-race)
    "emotionalFocusArea": "general-healing",        // REQUIRED: See enum below
    "wordCount": "750-1000",                        // REQUIRED: "750-1000" or "1000-1500"
    "therapeuticConsent": {                         // REQUIRED: Therapeutic consent
      "acknowledgedNotTherapy": true,
      "acknowledgedProfessionalReferral": true
    }
  }
}
```

**Type of Loss**:
`miscarriage`, `termination-health-risks`, `stillbirth`, `neonatal-loss`, `infant-loss`, `child-loss`, `unresolved-loss`, `foster-care-adoption-loss`, `pre-adoption-loss`, `other-unique`

**Your Relationship**:
`parent`, `guardian`, `sibling`, `grandparent`, `aunt-uncle`, `godparent`, `family-friend`, `healthcare-provider`, `teacher`, `classmate`

**Child Age**:
`unborn`, `newborn`, `infant`, `toddler`, `young-child`, `child`, `10-and-up`

**Note**: For early losses (`miscarriage`, `termination-health-risks`, `stillbirth`), `childAge` is automatically set to `'unborn'`.

**Emotional Focus Areas**:
`general-healing`, `honoring-remembering`, `peace-and-comfort`, `releasing-guilt-regret`, `processing-complex-emotions`, `supporting-family`, `navigating-milestones-birthdays`, `rebuilding-moving-forward`, `spiritual-existential-questions`, `community-connection`, `emotional-numbness`, `overwhelm-and-anxiety`, `grief-loss`

**Optional Fields**:
- `inclusivityTraits`: Array of inclusivity traits
- `personalityTraits`: Array of personality traits
- `appearance`: Physical appearance description
- `hopesOrDreams`: Hopes or dreams held for the child
- `memoriesToHighlight`: Specific memories to honor

**Asset Generation**:
- **Default**: Cover art only (privacy-respecting)
- **Full Assets**: Pass `explicitFullAssets: true` to generate audio, scenes, PDF, activities

---

## 👶 **New Birth Story**

**Required Fields**:
```json
{
  "storyType": "new-birth",
  "newBirth": {
    "mode": "therapeutic",              // REQUIRED: "therapeutic" or "celebration"
    "giftGiverName": "Aunt Sarah",      // REQUIRED: Gift giver's name
    "wordCount": "750-1000"              // REQUIRED: "750-1000" or "1000-1500"
  }
}
```

**Therapeutic Mode Additional Fields**:
```json
{
  "newBirth": {
    "mode": "therapeutic",
    "giftGiverName": "Aunt Sarah",
    "wordCount": "750-1000",
    "emotionalFocus": "joy-and-excitement",  // REQUIRED for therapeutic: See enum below
    "therapeuticConsent": {                   // REQUIRED for therapeutic
      "acknowledgedNotTherapy": true,
      "acknowledgedProfessionalReferral": true
    }
  }
}
```

**Celebration Mode Additional Fields**:
```json
{
  "newBirth": {
    "mode": "celebration",
    "giftGiverName": "Aunt Sarah",
    "wordCount": "750-1000",
    "species": "dragon",              // Optional: Imaginative species for baby shower fun
    "celebrationTheme": "wonder"      // Optional: Celebration theme
  }
}
```

**Emotional Focus (Therapeutic Mode)**:
`joy-and-excitement`, `anxiety-and-preparation`, `transformation`, `overwhelm`, `balance`

**Optional Fields (Both Modes)**:
- `babyName`: Baby's name
- `dueDate`: Due date
- `hopesAndDreams`: Hopes and dreams for the child

**Optional Fields (Therapeutic Mode)**:
- `partnerName`: Partner's name
- `birthOrder`: Birth order

**Optional Fields (Celebration Mode)**:
- `parentNames`: Parent names
- `species`: Imaginative species (e.g., "dragon", "unicorn")
- `celebrationTheme`: Celebration theme

**Asset Generation**:
- **Therapeutic Mode Default**: Cover art only
- **Celebration Mode Default**: Full assets (audio, cover, scenes, PDF, activities)
- **Override**: Pass `explicitFullAssets: true` for therapeutic mode to get full assets

---

## 🎨 **Character Creation**

**Required Fields**:
```json
{
  "name": "Maya Chen"  // REQUIRED: Full name (will be parsed into firstName/lastName)
}
```

**Optional Fields**:
```json
{
  "name": "Maya Chen",
  "gender": "female",                                    // One of: male, female, non-binary, gender-fluid, other, prefer-not-to-specify
  "ethnicity": ["Chinese", "Mexican"],                  // Array (supports mixed-race)
  "inclusivityTraits": ["wheelchair", "vitiligo"],      // Array of inclusivity traits
  "age": 8,                                             // Number (1-100)
  "species": "human",                                    // One of: human, dragon, robot, monster, alien, dinosaur, superhero, fantasy_being, elemental
  "appearance": "Long black hair, brown eyes, warm smile",
  "personality": ["brave", "curious", "kind"],          // Array of personality traits
  "libraryId": "<uuid>",                                // Optional: Library ID (uses default if not provided)
  "artPrompt": "A brave young girl with a warm smile",  // Optional: Custom art prompt
  "appearanceUrl": "https://..."                        // Optional: Existing appearance image URL
}
```

**Response Includes**:
```json
{
  "success": true,
  "data": {
    "id": "<uuid>",
    "name": "Maya Chen",
    "first_name": "Maya",
    "last_name": "Chen",
    "traits": {
      "fullName": "Maya Chen",
      "firstName": "Maya",
      "lastName": "Chen",
      "gender": "female",
      "species": "human",
      "age": 8,
      "ethnicity": ["Chinese", "Mexican"],
      "inclusivityTraits": ["wheelchair", "vitiligo"],
      "appearance": "Long black hair, brown eyes, warm smile",
      "personality": ["brave", "curious", "kind"]
    },
    "assetsStatus": {
      "referenceImages": "generating",
      "appearanceUrl": "generating"
    },
    "realtimeChannel": "characters:id=<characterId>"
  }
}
```

**Character Art Generation**:
- Automatically triggered asynchronously after character creation
- Generates headshot and bodyshot reference images
- Updates `assetsStatus` when complete
- Supports mixed-race ethnicity with equal representation

---

## 🔄 **Supabase Realtime Integration**

### **Story Updates**
```javascript
// Subscribe to story asset updates
const channel = supabase
  .channel('stories:id=<storyId>')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'stories',
    filter: 'id=eq.<storyId>'
  }, (payload) => {
    // payload.new contains updated story with new assets
    if (payload.new.cover_url) {
      // Cover art ready
    }
    if (payload.new.audio_url) {
      // Audio ready
    }
    if (payload.new.beat_images) {
      // Scene images ready
    }
  })
  .subscribe();
```

### **Character Updates**
```javascript
// Subscribe to character art updates
const channel = supabase
  .channel('characters:id=<characterId>')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'characters',
    filter: 'id=eq.<characterId>'
  }, (payload) => {
    // payload.new contains updated character
    if (payload.new.assets_status?.referenceImages === 'ready') {
      // Reference images ready
      const images = payload.new.reference_images;
      // images[0] = headshot, images[1] = bodyshot
    }
  })
  .subscribe();
```

---

## ⚠️ **Important Notes**

1. **Adult Therapeutic Stories**: Default to cover art only. Pass `explicitFullAssets: true` for full asset suite.

2. **Mixed-Race Characters**: Pass ethnicity as array with multiple values. System ensures equal representation in art.

3. **Therapeutic Consent**: Required for Inner Child, Child Loss, and New Birth (therapeutic mode). Must acknowledge:
   - `acknowledgedNotTherapy: true`
   - `acknowledgedProfessionalReferral: true`

4. **Word Count**: Adult therapeutic stories use user-specified word count (750-1000 or 1000-1500), not age-based defaults.

5. **Character Selection**: Not allowed for adult therapeutic story types. Character inputs should be part of the story generation request.

6. **Asset Status**: Use Supabase Realtime to get progressive updates as assets are generated.

---

## 📚 **Full Documentation**

- **OpenAPI Spec**: `api/openapi-specification.yaml`
- **Story Endpoints**: `docs/api-reference/protocols/rest/03-story-endpoints.md`
- **Character Endpoints**: `docs/api-reference/protocols/rest/04-character-endpoints.md`
- **REST API Contract (Product)**: `docs/api/REST_API_EXPERIENCE_MASTER.md`

---

**Last Updated**: December 26, 2025


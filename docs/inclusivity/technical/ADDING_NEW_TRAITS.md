# Adding New Traits - Expansion Framework

## Core Philosophy

**"It's always worth it if we can get a child to see themselves who otherwise couldn't."**

**Never say "39 is enough"**. Always expand for children who need it.

## When to Add a New Trait

**Always say yes if**:
- User/family requests it
- Medical advisor recommends it
- Community feedback identifies gap
- We discover a child who can't see themselves

**Never block**: If it helps even one child, add it.

## How to Add a New Trait (Step-by-Step)

### Step 1: Research (30-60 min)

**Medical accuracy**:
- Consult medical literature
- Talk to medical advisors
- Understand anatomical characteristics
- Learn respectful terminology

**Community input**:
- Disability advocacy groups
- Family perspectives
- Person-first language

### Step 2: Classify (15 min)

**Determine category**:
- **Visual**: Inherent physical manifestation (wheelchair, facial features, scars)
- **Conditional**: Variable presentation (supports user may/may not mention)
- **Abstract**: No visual manifestation (learning/cognitive differences)

**Set applicability**:
- `appliesToHeadshot`: true/false (can you see it in face/upper body?)
- `appliesToBodyshot`: true/false (need full body to see it?)

### Step 3: Write Definitions (60-90 min)

**Required fields**:
```typescript
{
  id: 'new_trait_id',
  label: 'Human-Readable Name',
  category: 'mobility' | 'neurodiversity' | 'sensory' | 'medical' | 'skin' | 'physical',
  
  visualDescription: 'Brief description',
  medicallyAccurateDescription: `Detailed medical/physical specs...`,
  gptImageSafePrompt: `Full prompt for AI...`,
  
  mandatoryVisualRequirements: ['MUST show...'],
  visualValidationChecklist: ['Is X visible?'],
  negativePrompt: `DO NOT...`,
  
  conversationalHints: ['natural language phrase 1', 'phrase 2', 'phrase 3'],
  
  personalityNuances: ['How trait shapes character'],
  strengthsFromTrait: ['Empowerment framing'],
  
  dignityFirstFraming: 'Person-first language',
  avoidStereotypes: ['NOT...'],
  
  // If bodyshot-only:
  appliesToHeadshot: false,
  appliesToBodyshot: true,
  
  // If device with filter risk:
  contextDescriptions: {
    medical: 'Imagination transformation...',
    superhero: 'Power/tech equipment...',
    fantasy: 'Magical equipment...',
    scifi: 'Advanced tech...',
    robot: 'Integrated component...'
  }
}
```

### Step 4: Test Across Species (2-4 hours)

**Test human**:
- Multiple ethnicities (at least 3-5)
- Verify trait visible and accurate

**Test creature**:
- Dragon, robot, or relevant species
- Verify species-first language works (if structural)
- Verify imagination transformation works (if device)

**Generate 6-10 test images** to prove it works.

### Step 5: Validate & Deploy (30 min)

**Run validation**:
```bash
cd lambda-deployments/content-agent && npm run build
node scripts/test-new-trait-validation.js
```

**Check**:
- All images pass filters
- Traits validated by vision model
- No "human in costume" issues
- Imagination transformations work

**Deploy**:
```bash
./scripts/deploy-universal-agent-proper.sh production
```

### Step 6: Document (30 min)

**Update**:
- TRAIT_DATABASE.md (add to list)
- Classification docs (visual/conditional/abstract)
- Testing docs (add test results)
- Sales/marketing materials (new capability)

## Traits to Consider Adding

### High Priority (User Requested)
- Quadriplegia (visual - wheelchair + positioning)
- ALS (visual - devices + positioning)
- Spina bifida (visual - often wheelchair)
- Muscular dystrophy (visual - often wheelchair/devices)

### Medium Priority (Medical Advisor Recommended)
- Osteogenesis imperfecta (visual - wheelchair, bone differences)
- Ehlers-Danlos syndrome (often invisible, conditional braces)
- Juvenile arthritis (often invisible, conditional devices)

### Ongoing (Community Feedback)
- Monitor user requests
- Track "couldn't find my condition" feedback
- Always investigate, always consider adding

## Never Say No

**If feedback**: "My child has [condition] and couldn't find it"

**Response**: "We'll add it. When can we talk to learn about [condition]?"

**Timeline**: Commit to 3-6 months (research → test → deploy)

**Philosophy**: Every child deserves to see themselves. No exceptions.

## Expansion = Competitive Advantage

**Competitors**: Stop at 5-10 showcase traits  
**Us**: Continuously expand, never say "enough"

**Result**: Strongest inclusivity moat in children's content.

---

**Last Updated**: December 22, 2025  
**Status**: Framework for continuous trait expansion established

# CRITICAL: Prompt Architecture Must Match V2 Quality

**Date**: 2025-12-28  
**Status**: 🚨 **BLOCKING PRODUCTION** - Therapeutic prompts are 95% truncated  
**Priority**: P0 - Cannot launch with current prompts

## The Problem

### Current V3 Implementation (BROKEN)

```typescript
// lambda-deployments/content-agent/src/services/PromptSelector.ts
'Child Loss': `Create therapeutic grief processing stories with:
- Gentle exploration of loss and remembrance
- Honoring the child's unique personality and impact
- Journey through grief toward healing and connection
- Safe emotional processing with grounding techniques
- Validation of complex emotions and experiences
- Symbols of enduring love and memory
- Age-appropriate language for the intended audience
- Professional therapeutic principles integrated naturally`,
```

**Length**: ~500 characters ❌  
**Dynamic Logic**: None ❌  
**Conditional Structures**: None ❌  
**Safety Handling**: None ❌  

### V2 Buildship Implementation (CORRECT)

```javascript
// V2 had ~8000+ characters with:
(function() {
  switch (ctx?.["root"]?.["inputs"]?.["childLossType"]) {
    case "Miscarriage":
      return "Acknowledge the immense hopes and dreams the family held for the child, delicately balancing grief with the enduring love they carry. Illuminate the quiet yet profound impact of their presence, using soft, nurturing imagery to reflect this unspoken connection.";
    case "Pregnancy Termination for Medical Reasons":
      return "Honor the deeply compassionate and protective reasoning behind the decision, whether for the mother's health or to prevent suffering for the child. Validate the sorrow and complexity of the choice, while celebrating the enduring love and care that continue to define the family's bond.";
    // ... 10+ more cases
  }
})() +
(function() {
  switch (ctx?.["root"]?.["inputs"]?.["childLossFocusArea"]) {
    case "Honoring and Remembering the Child":
      return "Celebrate the child's legacy through rituals, storytelling, or symbolic acts of remembrance.";
    // ... 20+ more cases
  }
})() +
// ... more conditional logic
```

**Length**: ~9000 characters ✅  
**Dynamic Logic**: 10+ loss types, 20+ focus areas, 15+ relationships ✅  
**Conditional Structures**: Switch statements, age adaptations ✅  
**Safety Handling**: Triggers to avoid, relationship-based language ✅  

## Missing Features in V3

### 1. Child-Loss Type Handling (10+ types missing)

V2 had dynamic prompts for:
- Miscarriage
- Pregnancy Termination for Medical Reasons
- Stillbirth
- Neonatal Loss
- Infant Loss
- Child Loss
- Multiple Losses
- Unresolved Loss (without closure)
- Foster Care or Adoption Loss
- Pre-Adoption Disruption
- Other/Unique Circumstances

**V3 has**: Generic 8-line prompt ❌

### 2. Emotional Focus Areas (20+ missing)

V2 adapted narrative based on:
- Honoring and Remembering the Child
- Finding Peace and Comfort
- Releasing Guilt or Regret
- Processing Complex Emotions
- Supporting Family Members
- Navigating Milestones and Anniversaries
- Rebuilding and Moving Forward
- Exploring Spiritual or Existential Questions
- Facilitating Connection with Community
- General Healing
- + 10 more

**V3 has**: None ❌

### 3. Relationship Context (15+ missing)

V2 changed language based on:
- Parent/Guardian Relationship
- Sibling Relationship (age-specific language)
- Classmate Relationship
- Peer Relationships
- Romantic Relationships
- Self-Relationship
- Imaginary Friend Relationship
- Beloved Childhood Toy
- + 7 more

**V3 has**: None ❌

### 4. Age-Appropriate Adaptations (missing)

V2 had:
```javascript
(function() {
  if (relationship === 'Sibling' || relationship === 'Classmate') {
    switch (childAge) {
      case "3-6":
        return "Use gentle, simple language with playful yet comforting imagery for children ages " + age + ". Include moments of reassurance and shared family connections.";
      case "7-9":
        return "Balance emotional depth with accessible metaphors, exploring emotions carefully for children ages " + age + ". Highlight ways the sibling was special to the child.";
      default:
        return "Provide sensitive, nuanced narratives that help older siblings process their emotions for children ages " + age + ". Offer reflective moments that validate feelings of confusion, guilt, or sadness.";
    }
  } else {
    return "Focus on reflective and healing narratives that provide emotional clarity and depth for adults.";
  }
})()
```

**V3 has**: None ❌

### 5. Narrative Structure Adaptation (missing)

V2 had different 9-step structures for each loss type:

```javascript
(function() {
  const typeOfLoss = ctx?.["root"]?.["inputs"]?.["childLossType"];
  switch (typeOfLoss) {
    case "Miscarriage":
      return "1. Establish a world filled with hopes and dreams that flourished quietly before birth.\n" +
        "2. Inciting Incident: The realization that these hopes cannot become tangible.\n" +
        "3. Rising Challenges: The protagonist grapples with longing for what never came to be, facing silent ache and unrealized moments.\n" +
        "4. Climax: In a moment of deep reflection, they confront the emptiness of unmet dreams, acknowledging the depth of love that existed nonetheless.\n" +
        "5. Resolution & Renewal: They emerge understanding that love endures even without physical presence, carrying a tender legacy forward.\n";
    // ... different 9-step structure for each type
  }
})()
```

**V3 has**: Static hero's journey ❌

### 6. Safety Measures (missing)

V2 had:
- `triggersToAvoid` parameter
- Default safety measures if not provided
- Relationship-specific safety guidelines
- Age-appropriate content filtering

**V3 has**: Basic age constraints only ❌

### 7. Inner-Child Complexity (missing)

V2 Inner-Child had:
- Wonder vs Healing branching logic (20+ focus areas)
- Whimsical vs serious relationship contexts (15+ types)
- Protector journey adaptations (different for each focus area)
- Key relational theme variations (unique per focus)
- Adult self empowerment messages (conditional)
- 9-step adapted narrative structure (wonder vs healing versions)

**V3 has**: Generic 8-line prompt ❌

## Required Architecture Fix

### Option A: TherapeuticPromptBuilder Service ✅ RECOMMENDED

```typescript
// lambda-deployments/content-agent/src/services/TherapeuticPromptBuilder.ts
export class TherapeuticPromptBuilder {
  buildChildLossPrompt(inputs: ChildLossInputs): string {
    const systemPrompt = this.buildChildLossSystemPrompt(inputs);
    const userPrompt = this.buildChildLossUserPrompt(inputs);
    return { system: systemPrompt, user: userPrompt };
  }

  private buildChildLossSystemPrompt(inputs: ChildLossInputs): string {
    // Full V2 logic with all conditionals
    let prompt = "You are a master storyteller renowned for creating deeply personal...";
    
    // Add loss type adaptation
    prompt += this.adaptToLossType(inputs.lossType);
    
    // Add emotional focus
    prompt += this.guidEmotionalFocus(inputs.focusArea);
    
    // Add relationship context
    prompt += this.adaptToRelationship(inputs.relationship, inputs.age);
    
    // Add narrative structure
    prompt += this.buildNarrativeStructure(inputs.lossType);
    
    // Add conclusion guidance
    prompt += this.buildConclusionGuidance(inputs.focusArea, inputs.lossType);
    
    return prompt;
  }

  private adaptToLossType(lossType: ChildLossType): string {
    switch (lossType) {
      case 'Miscarriage':
        return "Acknowledge the immense hopes and dreams the family held for the child, delicately balancing grief with the enduring love they carry. Illuminate the quiet yet profound impact of their presence, using soft, nurturing imagery to reflect this unspoken connection.";
      case 'Stillbirth':
        return "Recognize the profound heartbreak of meeting a beloved child whose life was too brief. Address the emotional weight of love intertwined with loss, weaving in gentle themes of beginnings and continuity, such as stars, budding leaves, or the warmth of a tender breeze.";
      // ... all 10+ cases
    }
  }

  // ... all other conditional methods
}
```

### Option B: Template-Based System

```typescript
// Store V2 templates as separate files, use variable interpolation
// Pros: Easier to maintain
// Cons: Harder to test, less type-safe
```

### Option C: Hybrid Approach ✅ ALTERNATIVE

```typescript
// Use templates for static parts, methods for dynamic parts
// Best of both worlds
```

## Implementation Plan

### Phase 1: Extract V2 Logic (2-3 hours)
1. ✅ Document all V2 conditional branches
2. ✅ Map V2 logic to TypeScript types
3. ✅ Create comprehensive test fixtures

### Phase 2: Create TherapeuticPromptBuilder (4-5 hours)
1. Create base class structure
2. Implement Child-Loss logic (all 10+ loss types)
3. Implement Inner-Child logic (all 20+ focus areas)
4. Add safety measures and triggers
5. Add age adaptations
6. Add relationship context handling

### Phase 3: Integration (1-2 hours)
1. Update PromptSelector to use TherapeuticPromptBuilder
2. Update RealContentAgent to pass full context
3. Add therapeutic input types to shared-types

### Phase 4: Testing (2-3 hours)
1. Create test cases for each loss type
2. Create test cases for each focus area
3. Create test cases for each relationship context
4. Verify prompt lengths match V2 (~8000+ chars)
5. Verify all conditional branches work

### Phase 5: Documentation (1 hour)
1. Document therapeutic prompt architecture
2. Add examples for each variant
3. Update AGENTS.md with therapeutic patterns

**Total Effort**: ~10-14 hours (1-2 days)

## Success Criteria

### Child-Loss Prompts
- ✅ System prompt: ~5000-6000 characters (currently ~500)
- ✅ User prompt: ~3000-4000 characters (currently ~100)
- ✅ Total: ~8000-10000 characters (currently ~600)
- ✅ 10+ loss type variations
- ✅ 20+ emotional focus adaptations
- ✅ 15+ relationship context changes
- ✅ Age-appropriate language switching
- ✅ Safety measures and triggers handling
- ✅ Dynamic narrative structures

### Inner-Child Prompts
- ✅ System prompt: ~4000-5000 characters (currently ~500)
- ✅ User prompt: ~3000-4000 characters (currently ~100)
- ✅ Total: ~7000-9000 characters (currently ~600)
- ✅ 20+ focus area variations (healing vs wonder)
- ✅ 15+ relationship context adaptations
- ✅ Whimsical vs serious branching
- ✅ Protector journey variations
- ✅ Adult self empowerment messages
- ✅ 9-step adapted narrative structures

### Standard Story Types (Already Good)
- ✅ Adventure, Bedtime, Birthday, etc.: ~500-1000 chars ✅
- ✅ Clear structure ✅
- ✅ Age adaptations via PromptSelector ✅

## Why This Blocks Production

1. **Therapeutic stories are core product value** - can't launch with truncated prompts
2. **Safety risk** - V2 had safety measures, V3 doesn't
3. **Quality regression** - V3 is WORSE than V2 for therapeutic types
4. **Legal/ethical risk** - Therapeutic content requires proper handling

## V2 Files for Reference

```
v2 OLD Prompt Templates/
├── Story Type Specific User Prompts/
│   ├── (Inner child and Child Loss are in V2 Buildship code, not markdown)
└── (User provided full V2 Buildship code via chat)
```

## Immediate Next Steps

1. ✅ **Create issue**: Document this architectural gap
2. ⏭️ **Create TherapeuticPromptBuilder.ts**
3. ⏭️ **Implement Child-Loss logic**
4. ⏭️ **Implement Inner-Child logic**
5. ⏭️ **Test all variations**
6. ⏭️ **Update plan** to include this work

---

**This is not a nice-to-have. This is blocking production.**  
**V3 MUST be better than V2, not worse.**  
**No shortcuts. No placeholders. Full implementation required.**


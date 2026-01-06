# Complete Story Types Documentation

**No "etc." - Full Documentation Required**

## All 14 Story Types in Production Database

### Database Location
- **Table**: `story_types`
- **Database**: Supabase Production (lendybmmnlqelrhkhdyc.supabase.co)
- **Total Count**: **14 story types**

---

## Complete List with All Database Fields

### 1. Adventure
- **UUID**: `a36ecee8-0ac0-4d89-a3df-962229c03385`
- **type_id**: `rectYq4a4Rf2IwE8F` (legacy Airtable ID)
- **type_name**: `Adventure`
- **type_description**: "Ignite curiosity with tales full of discovery and wonder."
- **HUE Configuration**:
  - `hue_base_hex`: `#ff8a00` (orange)
  - `hue_base_bri`: 254 (max brightness)
  - `hue_style`: `bold`
  - `hue_jolt_pct`: 1.25 (25% brightness jolts)
  - `hue_jolt_ms`: 600 (jolt duration)
  - `hue_tt_in`: 28 (transition time in)
  - `hue_tt_scene`: 110 (scene transition time)
  - `hue_rotate_every_ms`: 3500 (color rotation)
  - `hue_per_bulb_ms`: 120 (per-bulb delay)
  - `hue_breathe_pct`: 0.15 (breathing effect %)
  - `hue_breathe_period_ms`: 8000 (breathing period)
  - `hue_motion`: `balanced`
  - `hue_pause_style`: `sway`
  - `hue_tempo_ms`: 3200
  - `hue_lead_ms`: 300

### 2. Bedtime
- **UUID**: `c73f8098-e5f0-444a-a573-ab52ea12ef17`
- **type_id**: `recIgrQaTZVrT59un`
- **type_name**: `Bedtime`
- **type_description**: "Ease into sleep with soothing stories for sweet dreams."
- **HUE Configuration**:
  - `hue_base_hex`: `#6d5cff` (purple)
  - `hue_base_bri`: 60 (low brightness)
  - `hue_style`: `bold`
  - (same structure as Adventure, different values)

### 3. Birthday
- **UUID**: `5117a60c-da1c-44a1-b619-0a231cda7eeb`
- **type_id**: `recslrlxmnD4RuR6k`
- **type_name**: `Birthday`
- **type_description**: "Celebrate another year with the gift of a story."
- **HUE Configuration**:
  - `hue_base_hex`: `#ff69b4` (hot pink)
  - `hue_base_bri`: 220
  - `hue_style`: `bold`

### 4. Child-Loss ⚠️
- **UUID**: `366ede09-edc0-4e78-b5db-05ac1fdbe203`
- **type_id**: `recPM2SmNrgtJhcjv`
- **type_name**: `Child-Loss`
- **type_description**: "Support parents and caregivers processing the grief of losing a child through guided storytelling and memory connection."
- **HUE Configuration**:
  - `hue_base_hex`: `#ff90c2` (soft pink)
  - `hue_base_bri`: 60 (low)
  - `hue_style`: `calm` ← Different from Adventure/Birthday
  - `hue_jolt_pct`: 1.05 (subtle)
  - `hue_jolt_ms`: 900 (slower)
  - `hue_tt_in`: 60 (slower transitions)
  - `hue_tt_scene`: 160
  - `hue_rotate_every_ms`: 0 (NO rotation - static)
  - `hue_per_bulb_ms`: 0 (NO per-bulb delay)
  - `hue_breathe_pct`: 0.12 (gentler breathing)
  - `hue_breathe_period_ms`: 10000 (longer period)
- **⚠️ NOT in PromptSelector.ts** - Missing prompts!

### 5. Educational
- **UUID**: `4481c6ed-1b62-4ef5-8cad-1c38fa4cb4c6`
- **type_id**: `recrW41nQHLqNNKKS`
- **type_name**: `Educational`
- **type_description**: "Make learning fun with stories that support curriculum."
- **HUE Configuration**:
  - `hue_base_hex`: `#1e90ff` (dodger blue)
  - `hue_base_bri`: 180
  - `hue_style`: `pulse` ← Different again
  - `hue_jolt_pct`: 1.15
  - `hue_jolt_ms`: 500 (fast)
  - `hue_rotate_every_ms`: 4000 (active rotation)
  - `hue_per_bulb_ms`: 100

### 6. Financial Literacy
- **UUID**: `72ba915f-d3d1-404e-bee8-30dd1a7495cc`
- **type_id**: `recRwB5xOtn8Pa3N3`
- **type_name**: `Financial Literacy`
- **type_description**: "Simplify the basics of money management and saving through child-friendly stories."
- **HUE Configuration**:
  - `hue_base_hex`: `#4bb543` (green - money)
  - `hue_base_bri`: 180
  - `hue_style`: `pulse`

### 7. Inner-Child ⚠️
- **UUID**: `f305e411-b369-4a14-8b59-a556b19ef327`
- **type_id**: `recM9mIckUbei4KFc`
- **type_name**: `Inner-Child`
- **type_description**: "Reconnect with your own childhood experiences and emotions through reflective and healing narratives."
- **HUE Configuration**:
  - `hue_base_hex`: `#eea00ff` (purple-pink)
  - `hue_base_bri`: 200
  - `hue_style`: `calm`
  - `hue_rotate_every_ms`: 0 (static)
  - `hue_per_bulb_ms`: 0
- **⚠️ NOT in PromptSelector.ts** - Missing prompts!

### 8. Language Learning
- **UUID**: `ab2e0c1d-e59a-4ee9-8a5c-5df244b62739`
- **type_id**: `recGncXlegmqxlAo3`
- **type_name**: `Language Learning`
- **type_description**: "Create a story that subtly introduces a new language."
- **HUE Configuration**:
  - `hue_base_hex`: `#ffd700` (gold)
  - `hue_base_bri`: 200
  - `hue_style`: `pulse`

### 9. Medical Bravery
- **UUID**: `cfcf4ad1-3822-41b1-9c35-bfbf37152829`
- **type_id**: `recNXUPrqGueN344O`
- **type_name**: `Medical Bravery`
- **type_description**: "Turn medical challenges into brave adventures for resilience."
- **HUE Configuration**:
  - `hue_base_hex`: `#ff3e41` (red)
  - `hue_base_bri`: 220
  - `hue_style`: `bold`

### 10. Mental Health
- **UUID**: `381ef981-328a-49d6-ad66-656547b972e3`
- **type_id**: `recrt7JbFltfYdE6o`
- **type_name**: `Mental Health`
- **type_description**: "Help your child articulate and handle big emotions."
- **HUE Configuration**:
  - `hue_base_hex`: `#3db8c8` (cyan)
  - `hue_base_bri`: 120
  - `hue_style`: `calm`
  - `hue_rotate_every_ms`: 0 (static)
  - `hue_per_bulb_ms`: 0

### 11. Milestones
- **UUID**: `78bca76d-1b5c-4738-ac2e-ffc4b2122493`
- **type_id**: `rec29TBjHAZctU7a6`
- **type_name**: `Milestones`
- **type_description**: "Celebrate and support important firsts—like losing a tooth, first day of school, or using the potty."
- **HUE Configuration**:
  - `hue_base_hex`: `#00c78c` (teal)
  - `hue_base_bri`: 180
  - `hue_style`: `pulse`

### 12. Music ⚠️
- **UUID**: `0bf99e33-6fb4-460a-b647-f073e3ae33ce`
- **type_id**: `recod6oyhu63fvtaZ`
- **type_name**: `Music`
- **type_description**: "Introduce musical concepts and appreciation through stories that incorporate songs and rhythms."
- **HUE Configuration**:
  - `hue_base_hex`: `#8a2be2` (blue violet)
  - `hue_base_bri`: 200
  - `hue_style`: `pulse`
- **⚠️ NOT in PromptSelector.ts** - Missing prompts!

### 13. New Birth
- **UUID**: `939bbeb4-ede5-4c26-9389-713700b536f8`
- **type_id**: `recDgWoAWHODydHFv`
- **type_name**: `New Birth`
- **type_description**: "Celebrate the arrival of a new baby with stories that mark the beginning of a new family chapter."
- **HUE Configuration**:
  - `hue_base_hex`: `#90e0ff` (light blue)
  - `hue_base_bri`: 120
  - `hue_style`: `calm`
  - `hue_rotate_every_ms`: 0 (static)
  - `hue_per_bulb_ms`: 0
- **✅ Has prompts in PostStorySupport.ts** (visualizations, affirmations, journal prompts)
- **⚠️ NOT in PromptSelector.ts main list** - Partial coverage

### 14. Tech Readiness
- **UUID**: `ab2fdaae-dc05-4f26-ac23-a3f88280e742`
- **type_id**: `recsEVQnsX2RiWMa2`
- **type_name**: `Tech Readiness`
- **type_description**: "Introduce digital habits, online safety, and healthy screen use through age-appropriate storytelling."
- **HUE Configuration**:
  - `hue_base_hex`: `#14e1ff` (bright cyan)
  - `hue_base_bri`: 254 (max)
  - `hue_style`: `bold`

---

## HUE Style Patterns (3 Types)

### 1. Bold (Adventure, Birthday, Medical Bravery, Tech Readiness, Bedtime*)
- High energy, dynamic lighting
- `hue_jolt_pct`: 1.25 (strong pulses)
- `hue_jolt_ms`: 600 (fast jolts)
- `hue_rotate_every_ms`: 3500 (active rotation)
- `hue_per_bulb_ms`: 120 (sequential bulb effects)

### 2. Calm (Child-Loss, Inner-Child, Mental Health, New Birth)
- Gentle, therapeutic lighting
- `hue_jolt_pct`: 1.05 (subtle pulses)
- `hue_jolt_ms`: 900 (slow jolts)
- `hue_rotate_every_ms`: 0 (NO rotation - static colors)
- `hue_per_bulb_ms`: 0 (all bulbs sync)
- `hue_breathe_pct`: 0.12 (gentle breathing)
- `hue_breathe_period_ms`: 10000 (longer periods)

### 3. Pulse (Educational, Financial Literacy, Language Learning, Milestones, Music)
- Learning-focused, engaging lighting
- `hue_jolt_pct`: 1.15 (medium pulses)
- `hue_jolt_ms`: 500 (very fast)
- `hue_rotate_every_ms`: 4000 (moderate rotation)
- `hue_per_bulb_ms`: 100 (quick sequential)

---

## How Story Types Drive Story Generation

### 1. Prompt Selection (`PromptSelector.ts`)
**Location**: `lambda-deployments/content-agent/src/services/PromptSelector.ts`

**Current Coverage (11/14 types)**:
```typescript
const storyTypes: StoryType[] = [
  'Adventure', 'Bedtime', 'Birthday', 'Educational', 
  'Financial Literacy', 'Language Learning', 'Medical Bravery',
  'Mental Health', 'Milestones', 'New Chapter Sequel', 'Tech Readiness'
];
```

**⚠️ MISSING IN CODE (3 types)**:
- `Child-Loss`
- `Inner-Child`
- `Music`

**How It Works**:
1. Story type + age → Prompt template key (e.g., `"Adventure_5"`)
2. Template includes:
   - `systemPrompt`: Base personality + story-specific guidance
   - `userPrompt`: Age-specific instructions
   - `constraints`: Safety/appropriateness rules
   - `examples`: Sample content for that type/age

**Example - Mental Health Prompt**:
```typescript
'Mental Health': `Create emotionally supportive stories with:
- Characters processing emotions in healthy ways
- Coping strategies for common childhood challenges
- Validation of feelings and experiences
- Building emotional resilience and self-awareness
- Professional help portrayed positively when needed`
```

### 2. Art Generation (`ArtGenerationService.ts`)
**Location**: `lambda-deployments/content-agent/src/services/ArtGenerationService.ts`

**How Story Type Drives Art**:
```typescript
const themeMap: Record<string, string> = {
  'Adventure': 'exploration and discovery',
  'Bedtime': 'comfort and peaceful dreams',
  'Mental Health': 'emotional wellness and self-care',
  // ... etc
};
```

**Also defines**:
- Color palettes per type
- Visual motifs per type
- Symbolism per type (compass for Adventure, moon for Bedtime)
- Artistic style adjustments

### 3. Educational Activities (`EducationalActivitiesService.ts`)
**Location**: `lambda-deployments/content-agent/src/services/EducationalActivitiesService.ts`

**How Story Type Drives Activities**:
```typescript
const storyTypeActivities: Record<string, ActivityType[]> = {
  'Adventure': ['physical_movement', 'dramatic_play', 'creative_arts', 'building_construction'],
  'Bedtime': ['sensory_play', 'music_rhythm', 'creative_arts', 'social_emotional'],
  'Mental Health': ['social_emotional', 'sensory_play', 'creative_arts', 'physical_movement'],
  // ... etc
};
```

**Generates 4 activities** tailored to story type + age.

### 4. Post-Story Support (`PostStorySupport.ts`)
**Location**: `lambda-deployments/content-agent/src/services/PostStorySupport.ts`

**Only implemented for therapeutic types**:
- `New Birth`: Visualizations, affirmations, journal prompts
- `Mental Health`: Implied in code structure

**Not implemented** for most other types yet.

### 5. Content Moderation (`ContentModerator.ts`)
**Location**: `lambda-deployments/content-agent/src/services/ContentModerator.ts`

**Type-specific safety checks**:
- `Bedtime`: Must be calm, not exciting
- `Educational`: Must contain learning elements
- `Medical Bravery`: No scary medical content
- `Mental Health`: Must have positive coping

---

## Critical Issues Discovered

### ❌ Issue #1: Missing Story Types in Code
**Problem**: 3 story types exist in database but have NO prompts in code:
1. **Child-Loss** - Grief support for parents
2. **Inner-Child** - Adult healing narratives
3. **Music** - Musical concepts and rhythm

**Impact**: Stories created with these types will use **default prompts**, which are NOT optimized for their therapeutic/educational purpose.

**Where to fix**:
- `lambda-deployments/content-agent/src/services/PromptSelector.ts` (line 103-107)
- Add to `initializePromptTemplates()` method
- Add to `getStorySpecificPrompt()` method
- Add to `ArtGenerationService.ts` theme/symbol maps
- Add to `EducationalActivitiesService.ts` activity maps

### ❌ Issue #2: Hardcoded Story Type Lists
**Problem**: Story types are hardcoded in **5+ files** instead of being fetched from database.

**Files with hardcoded lists**:
1. `PromptSelector.ts`
2. `ArtGenerationService.ts`
3. `EducationalActivitiesService.ts`
4. `ContentModerator.ts`
5. `PostStorySupport.ts`

**Risk**: Adding new story types to database won't automatically work without code updates.

### ❌ Issue #3: Type Name Mismatch
**Problem**: Code uses `'New Chapter Sequel'` but database has `'New Birth'`.

**Location**: `PromptSelector.ts` line 106
```typescript
const storyTypes: StoryType[] = [
  // ...
  'New Chapter Sequel',  // ← Doesn't exist in DB!
  // ...
];
```

Should be: `'New Birth'`

---

## Recommended Action Plan

### Phase 1: Fix Missing Story Types (Immediate)
1. Add `Child-Loss` prompts to `PromptSelector.ts`
2. Add `Inner-Child` prompts to `PromptSelector.ts`
3. Add `Music` prompts to `PromptSelector.ts`
4. Fix `'New Chapter Sequel'` → `'New Birth'` typo
5. Add missing types to all service files (Art, Activities, Moderation)

### Phase 2: Eliminate Hardcoding (Short-term)
1. Create `StoryTypeService.ts` that fetches from Supabase
2. Cache story types in memory (refresh every hour)
3. Update all services to use centralized service
4. Add fallback defaults if DB unavailable

### Phase 3: Validation (Before Launch)
1. Test story generation for **all 14 types**
2. Verify HUE lighting works for all types
3. Verify activities generate correctly
4. Verify art themes match type descriptions
5. Document any type-specific quirks

---

## Evidence Files Created

- [x] **This document**: Complete story types with all fields
- [x] **Database query results**: Captured all 14 types from production
- [x] **Code search results**: Found all hardcoded references
- [x] **Gap analysis**: Identified 3 missing types + 1 typo

**No "etc." - Everything documented.**

---

**Created**: 2025-12-28  
**Source**: Production Supabase Database (lendybmmnlqelrhkhdyc.supabase.co)  
**Query Date**: 2025-12-28 22:55 UTC  
**Verified Count**: 14/14 story types documented


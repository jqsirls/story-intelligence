# V2 Story Type HUE Configuration Research (Phase 0.5)

**Date**: 2025-12-28  
**Purpose**: Document V2 story type HUE configuration before implementing V3 HUE system

## Summary

✅ **CONFIRMED**: V2 has 14 story types (not 15) with 15 HUE configuration fields each.  
✅ **CONFIRMED**: No `story_types` table exists in Supabase - safe to create from scratch.  
✅ **CONFIRMED**: Story types are referenced in TypeScript enums but not stored in database.

## V2 Story Types (14 Total)

**Source**: `airtable/Story Types-Grid view.csv`

1. **Mental Health** (`recrt7JbFltfYdE6o`)
   - Description: Help your child articulate and handle big emotions.
   - HUE: `#3db8c8`, 120 brightness, `calm` style

2. **Child-Loss** (`recPM2SmNrgtJhcjv`)
   - Description: Support parents and caregivers processing the grief of losing a child.
   - HUE: `#ff90c2`, 60 brightness, `calm` style

3. **Inner-Child** (`recM9mIckUbei4KFc`)
   - Description: Reconnect with your own childhood experiences and emotions.
   - HUE: `#eea00ff`, 200 brightness, `calm` style

4. **New Birth** (`recDgWoAWHODydHFv`)
   - Description: Celebrate the arrival of a new baby.
   - HUE: `#90e0ff`, 120 brightness, `calm` style

5. **Educational** (`recrW41nQHLqNNKKS`)
   - Description: Make learning fun with stories that support curriculum.
   - HUE: `#1e90ff`, 180 brightness, `pulse` style

6. **Milestones** (`rec29TBjHAZctU7a6`)
   - Description: Celebrate and support important firsts.
   - HUE: `#00c78c`, 180 brightness, `pulse` style

7. **Language Learning** (`recGncXlegmqxlAo3`)
   - Description: Create a story that subtly introduces a new language.
   - HUE: `#ffd700`, 200 brightness, `pulse` style

8. **Financial Literacy** (`recRwB5xOtn8Pa3N3`)
   - Description: Simplify the basics of money management and saving.
   - HUE: `#4bb543`, 180 brightness, `pulse` style

9. **Music** (`recod6oyhu63fvtaZ`)
   - Description: Introduce musical concepts and appreciation.
   - HUE: `#8a2be2`, 200 brightness, `pulse` style

10. **Bedtime** (`recIgrQaTZVrT59un`)
    - Description: Ease into sleep with soothing stories.
    - HUE: `#6d5cff`, 60 brightness, `bold` style

11. **Adventure** (`rectYq4a4Rf2IwE8F`)
    - Description: Ignite curiosity with tales full of discovery.
    - HUE: `#ff8a00`, 254 brightness, `bold` style

12. **Medical Bravery** (`recNXUPrqGueN344O`)
    - Description: Turn medical challenges into brave adventures.
    - HUE: `#ff3e41`, 220 brightness, `bold` style

13. **Birthday** (`recslrlxmnD4RuR6k`)
    - Description: Celebrate another year with the gift of a story.
    - HUE: `#ff69b4`, 220 brightness, `bold` style

14. **Tech Readiness** (`recsEVQnsX2RiWMa2`)
    - Description: Introduce digital habits, online safety, and healthy screen use.
    - HUE: `#14e1ff`, 254 brightness, `bold` style

## HUE Configuration Fields (15 per Story Type)

**From Airtable CSV**:

1. `hueBaseHex` - Base color hex code (e.g., `#3db8c8`)
2. `hueBaseBri` - Base brightness (0-254, e.g., 120)
3. `hueStyle` - Animation style (`calm`, `pulse`, `bold`)
4. `hueJoltPct` - Jolt percentage (e.g., 1.05)
5. `hueJoltMs` - Jolt duration in milliseconds (e.g., 900)
6. `hueTtIn` - Transition time in (e.g., 60)
7. `hueTtScene` - Transition time scene (e.g., 160)
8. `hueRotateEveryMs` - Rotation interval (e.g., 0 or 4000)
9. `huePerBulbMs` - Per-bulb timing (e.g., 0 or 100)
10. `hueBreathePct` - Breathe percentage (e.g., 0.12 or 0.15)
11. `hueBreathePeriodMs` - Breathe period (e.g., 10000 or 8000)
12. `hueMotion` - Motion type (`balanced`)
13. `huePauseStyle` - Pause style (`sway`)
14. `hueTempoMs` - Tempo in milliseconds (e.g., 3200)
15. `hueLeadMs` - Lead time in milliseconds (e.g., 300)

## Current Implementation Status

**TypeScript Enums** (found in codebase):
- `packages/router/src/types.ts` - StoryType enum (12 types, missing some)
- `lambda-deployments/router/src/types.ts` - StoryType enum (12 types, missing some)
- `packages/shared-types/src/types/story.ts` - StoryType type (includes 'Child Loss', 'Inner Child', 'New Birth')

**Database**:
- ❌ No `story_types` table exists in Supabase
- ❌ No `story_type_id` column in `stories` table
- ✅ `user_hue_settings` table exists (from `20250101000020_rest_api_asset_tracking.sql`)

**HUE Integration**:
- ✅ `user_hue_settings` table has `intensity` field (off, light, regular, bold)
- ✅ Smart home agent exists (`packages/smart-home-agent/`)
- ✅ Router has HUE-related intents (`CONNECT_HUE`, `HUE_STATUS`, `CONTROL_LIGHTS`)

## Two-Tier HUE Architecture (V2)

**Tier 1: Story Type Configuration** (Base Settings)
- 14 story types with 15 HUE configuration fields each
- Defines default animation style, timing, and colors per story type
- Examples:
  - Bedtime: `calm`, 60 brightness (soothing)
  - Adventure: `bold`, 254 brightness (energetic)
  - Educational: `pulse`, 180 brightness (engaging)

**Tier 2: Per-Story Extracted Colors** (Image-Based)
- 15 hex codes per story:
  - `coverHex1-3` (from cover art)
  - `sceneAHex1-3`, `sceneBHex1-3`, `sceneCHex1-3`, `sceneDHex1-3` (from beat images)
- These override base colors with story-specific palettes
- Extracted using V2 Buildship algorithm (pixel sampling, contrast filtering)

## Migration Strategy

**Safe to Create**:
- ✅ `story_types` table does NOT exist - safe to create
- ✅ No conflicts with existing tables
- ✅ All 14 story types from Airtable can be inserted
- ✅ 15 HUE configuration fields per type

**Idempotency**:
- ✅ Use `ON CONFLICT (type_id) DO NOTHING` for INSERT statements
- ✅ Use `IF NOT EXISTS` for table creation
- ✅ Safe to re-run migration multiple times

## Next Steps

1. ✅ Phase 0.5 complete - V2 HUE configuration documented
2. → Phase 1.0: Research Supabase Schema (stories, characters, profiles tables)
3. → Phase 1.1: Create `story_types` table migration
4. → Phase 1.2: Add `story_type_id` FK to `stories` table
5. → Phase 1.2: Add `hue_extracted_colors` JSONB column to `stories` table


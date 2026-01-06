# E2E Test Schema Alignment - December 29, 2025

## Overview

Updated E2E test suite (`scripts/test-complete-rest-api-flow.js`) to match production database schema, achieving 100% test pass rate.

## Problem

Test script was using outdated/incorrect schema assumptions that didn't match production Supabase tables, causing schema validation errors:

```
❌ Could not find the 'age' column of 'characters'
❌ Could not find the 'character_id' column of 'stories'
❌ Could not find the 'appearance' column of 'characters'
❌ null value in column "plan_id" violates not-null constraint
❌ invalid input syntax for type integer: "G"
```

## Production Schema (Actual)

### Characters Table

```typescript
{
  id: uuid,
  name: string,
  traits: jsonb,              // Contains age, personality, appearance, inclusivity_traits
  appearance_url: string?,
  library_id: uuid,
  creator_user_id: uuid,
  is_primary: boolean,
  reference_images: string[],
  color_palette: string[],
  story_id: uuid?,
  created_at: timestamp
}
```

**Key Change**: Individual columns (`age`, `appearance`, `inclusivity_traits`) → nested inside `traits` JSONB

### Stories Table

```typescript
{
  id: uuid,
  library_id: uuid,
  title: string,
  content: string,
  status: string,
  age_rating: integer,        // Not 'G'/'PG', but actual age (7, 8, etc.)
  creator_user_id: uuid,
  metadata: jsonb,            // Contains story_type, character_id, user_age
  asset_generation_status: string?,
  cover_art_url: string?,
  scene_art_urls: string[]?,
  audio_url: string?,
  webvtt_url: string?,
  pdf_url: string?,
  qr_code_url: string?,
  created_at: timestamp,
  finalized_at: timestamp?
}
```

**Key Changes**:
- No `character_id` column → moved to `metadata` JSONB
- No `story_type` column → moved to `metadata` JSONB
- `age_rating` is integer (7), not string ('G')

### Subscriptions Table

```typescript
{
  id: uuid,
  user_id: uuid,
  status: string,
  tier: string,
  plan_id: string,            // REQUIRED - cannot be null
  stripe_subscription_id: string,
  current_period_start: timestamp,
  current_period_end: timestamp
}
```

**Key Change**: `plan_id` is required

### Libraries Table

```typescript
{
  id: uuid,
  owner: uuid,                // Not 'creator_user_id'
  name: string,
  created_at: timestamp
}
```

**Key Change**: Uses `owner`, not `creator_user_id`

## Test Script Fixes

### 1. Character Creation

**Before:**
```javascript
const characterData = {
  library_id: libraries.id,
  name: 'E2E Test Character',
  age: 7,                           // ❌ No 'age' column
  species: 'human',                 // ❌ No 'species' column
  appearance: { ... },              // ❌ No 'appearance' column
  inclusivity_traits: [ ... ],      // ❌ No 'inclusivity_traits' column
  creator_user_id: user.id
};
```

**After:**
```javascript
const characterData = {
  library_id: libraries.id,
  name: 'E2E Test Character',
  traits: {                         // ✅ All nested in 'traits' JSONB
    age: 7,
    species: 'human',
    personality_traits: ['curious', 'brave'],
    likes: ['puzzles', 'stories'],
    dislikes: ['loud noises'],
    strengths: ['problem-solving'],
    weaknesses: ['impatience'],
    fears: ['dark places'],
    dreams: ['become an explorer'],
    backstory: 'A curious child who loves adventures',
    appearance: {
      skinTone: 'medium-tan',
      hairColor: 'dark-brown',
      hairTexture: 'curly',
      eyeColor: 'hazel',
      bodyType: 'average',
      height: 'average',
      distinctiveFeatures: ['freckles']
    },
    inclusivity_traits: [
      { category: 'mobility', trait: 'wheelchair_user', visibility: 'always_visible' },
      { category: 'communication', trait: 'hearing_aid_user', visibility: 'always_visible' },
      { category: 'cultural', trait: 'hijab_wearer', visibility: 'always_visible' },
      { category: 'visual', trait: 'glasses_wearer', visibility: 'always_visible' },
      { category: 'neurodiversity', trait: 'autism_spectrum', visibility: 'contextual' }
    ]
  },
  creator_user_id: user.id,
  is_primary: true
};
```

### 2. Story Creation

**Before:**
```javascript
const storyData = {
  library_id: libraries.id,
  character_id: character.id,       // ❌ No 'character_id' column
  title: `E2E Test Story - ${storyType}`,
  story_type: storyType,            // ❌ No 'story_type' column
  user_age: character.age,          // ❌ No 'user_age' column
  content: 'Generating...',
  creator_user_id: user.id
};
```

**After:**
```javascript
const storyData = {
  library_id: libraries.id,
  title: `E2E Test Story - ${storyType}`,
  content: 'Generating...',
  status: 'draft',
  age_rating: character.traits?.age || 7,  // ✅ Integer, not 'G'
  creator_user_id: user.id,
  metadata: {                               // ✅ Story metadata in JSONB
    story_type: storyType,
    user_age: character.traits?.age || 7,
    character_id: character.id
  }
};
```

### 3. Subscription Creation

**Before:**
```javascript
const subscriptionData = {
  user_id: user.id,
  status: 'active',
  tier: 'pro',
  // ❌ Missing 'plan_id'
  stripe_subscription_id: `test_sub_${Date.now()}`,
  current_period_start: new Date().toISOString(),
  current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
};
```

**After:**
```javascript
const subscriptionData = {
  user_id: user.id,
  status: 'active',
  tier: 'pro',
  plan_id: 'pro_monthly',           // ✅ Required field
  stripe_subscription_id: `test_sub_${Date.now()}`,
  current_period_start: new Date().toISOString(),
  current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
};
```

### 4. Library Query

**Before:**
```javascript
const { data: libraries } = await supabase
  .from('libraries')
  .select('id')
  .eq('creator_user_id', user.id)   // ❌ No 'creator_user_id' column
  .single();
```

**After:**
```javascript
const { data: libraries } = await supabase
  .from('libraries')
  .select('id')
  .eq('owner', user.id)             // ✅ Correct column name
  .single();
```

## Test Results

### Before Schema Alignment
```
Overall: 1/6 passed (16.67%)

❌ Failures:
   1. subscription/create_pro - null plan_id
   2. character/create_with_traits - Could not find 'age' column
   3. story/create_adventure - Could not find 'character_id' column
   4. story/create_birthday - Could not find 'character_id' column
   5. story/create_child-loss - Could not find 'character_id' column
   6. library/invite - null library reference
```

### After Schema Alignment
```
Overall: 12/12 passed (100.00%)

✅ auth: 1/1 passed
✅ subscription: 1/1 passed
✅ character: 1/1 passed
✅ story: 3/3 passed
✅ library: 3/3 passed
✅ pipeline: 3/3 passed
```

## How to Query Production Schema

To verify current production schema for any table:

```javascript
const { createClient } = require('@supabase/supabase-js');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const ssm = new SSMClient({ region: 'us-east-1' });
const getParam = async (name) => {
  const cmd = new GetParameterCommand({ Name: name, WithDecryption: true });
  const result = await ssm.send(cmd);
  return result.Parameter.Value;
};

const url = await getParam('/storytailor-prod/supabase/url');
const key = await getParam('/storytailor-prod/supabase/service_key');
const supabase = createClient(url, key);

// Get actual table schema
const { data, error } = await supabase
  .from('TABLE_NAME')
  .select('*')
  .limit(1)
  .single();

console.log('Columns:', Object.keys(data));
```

## Schema Evolution Guidelines

### When Adding New Test Cases

1. **Always check production schema first** - Use service key query above
2. **Match exact column names** - Case-sensitive, no assumptions
3. **Respect JSONB structure** - Nested fields go inside JSONB columns
4. **Verify required fields** - Check for `not null` constraints
5. **Test with real auth** - Use user tokens, not service key

### When Changing Production Schema

1. **Update migrations** - Document schema changes in `docs/database/MIGRATION_GUIDE.md`
2. **Update E2E tests** - Reflect schema changes in `scripts/test-complete-rest-api-flow.js`
3. **Update TypeScript types** - Sync `packages/shared-types/src/database.types.ts`
4. **Run full test suite** - Verify no regressions

## Related Files

- **E2E Test Script**: `scripts/test-complete-rest-api-flow.js`
- **Production Schema Query**: See "How to Query Production Schema" above
- **Database Types**: `packages/shared-types/src/database.types.ts`
- **Migration Guide**: `docs/database/MIGRATION_GUIDE.md`

## References

- Supabase JSONB Documentation: https://supabase.com/docs/guides/database/json
- PostgreSQL JSONB: https://www.postgresql.org/docs/current/datatype-json.html

---

**Date**: December 29, 2025  
**Author**: AI Agent  
**Status**: ✅ Complete - All tests passing


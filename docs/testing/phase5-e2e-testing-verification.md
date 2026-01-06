# Phase 5: Complete E2E Testing Verification

## Status: Verification Plan Ready ⏳

**Requirement**: "ALL user journeys tested end-to-end" with verification of actual database operations (not just status codes)

**Current Status**: User journeys documented, database verification plan needed

## User Journeys Defined

Based on documentation in `docs/user-journeys/`, the following journeys are defined:

### 1. Registration → Profile Setup → First Story
- **Documentation**: `docs/user-journeys/comprehensive-user-journeys.md` (Journey 1)
- **Steps**:
  1. User registration
  2. Profile setup
  3. First story creation
- **Database Tables to Verify**:
  - `users` - User record created
  - `user_profiles` - Profile data persisted
  - `stories` - Story record created
  - `story_characters` - Character associations
  - `conversations` - Conversation session created

### 2. Story Creation → Character Creation → Asset Generation
- **Documentation**: `docs/user-journeys/rest-api.md`
- **Steps**:
  1. Story creation
  2. Character creation/selection
  3. Asset generation (art, audio, video)
- **Database Tables to Verify**:
  - `stories` - Story record with all metadata
  - `characters` - Character records created
  - `story_characters` - Character-story associations
  - `story_assets` - Asset records (art, audio, video)
  - `asset_metadata` - Asset metadata persisted

### 3. Library Management → Story Sharing → Permissions
- **Documentation**: `docs/user-journeys/comprehensive-user-journeys.md`
- **Steps**:
  1. Library creation
  2. Story addition to library
  3. Story sharing
  4. Permission management
- **Database Tables to Verify**:
  - `libraries` - Library record created
  - `library_stories` - Story-library associations
  - `story_shares` - Share records
  - `story_permissions` - Permission records
  - `access_control` - RLS policy verification

### 4. Conversations → Multi-turn → Context Preservation
- **Documentation**: `docs/user-journeys/audio-conversational.md`, `docs/user-journeys/video-conversational.md`
- **Steps**:
  1. Conversation start
  2. Multi-turn message exchange
  3. Context preservation across turns
  4. Conversation end
- **Database Tables to Verify**:
  - `conversations` - Conversation session record
  - `conversation_messages` - Message history
  - `conversation_context` - Context data
  - `conversation_state` - State persistence
  - `redis` (cache) - Session state verification

### 5. Subscriptions → Payment → Tier Upgrades
- **Documentation**: `docs/user-journeys/comprehensive-user-journeys.md`
- **Steps**:
  1. Subscription creation/checkout
  2. Payment processing
  3. Tier upgrades/downgrades
- **Database Tables to Verify**:
  - `subscriptions` - Subscription records
  - `payments` - Payment records
  - `user_tiers` - Tier assignments
  - `tier_history` - Tier change history

## E2E Test Execution Plan

### Test Structure

Each E2E test should:
1. **Execute API calls** (via REST API or direct function calls)
2. **Verify HTTP status codes** (200, 201, etc.)
3. **Verify database operations** (actual data persistence)
4. **Verify data integrity** (relationships, constraints)
5. **Verify error handling** (graceful failures)

### Database Verification Queries

#### Journey 1: Registration → Profile → First Story

```sql
-- After registration API call
SELECT id, email, user_type, age, created_at 
FROM users 
WHERE email = 'test-user@example.com';

-- After profile setup
SELECT user_id, first_name, last_name, preferences 
FROM user_profiles 
WHERE user_id = '<user_id>';

-- After story creation
SELECT id, user_id, title, story_type, status, created_at 
FROM stories 
WHERE user_id = '<user_id>' 
ORDER BY created_at DESC 
LIMIT 1;

-- Verify character associations
SELECT sc.story_id, sc.character_id, c.name, c.type 
FROM story_characters sc
JOIN characters c ON sc.character_id = c.id
WHERE sc.story_id = '<story_id>';

-- Verify conversation session
SELECT id, user_id, channel, status, created_at 
FROM conversations 
WHERE user_id = '<user_id>' 
ORDER BY created_at DESC 
LIMIT 1;
```

#### Journey 2: Story → Character → Assets

```sql
-- Verify story with all metadata
SELECT id, user_id, title, content, story_type, status, metadata 
FROM stories 
WHERE id = '<story_id>';

-- Verify characters created
SELECT id, name, type, description, metadata 
FROM characters 
WHERE story_id = '<story_id>';

-- Verify story-character associations
SELECT story_id, character_id, role 
FROM story_characters 
WHERE story_id = '<story_id>';

-- Verify assets generated
SELECT id, story_id, asset_type, asset_url, metadata, created_at 
FROM story_assets 
WHERE story_id = '<story_id>' 
ORDER BY created_at;

-- Verify asset metadata
SELECT asset_id, metadata_key, metadata_value 
FROM asset_metadata 
WHERE asset_id IN (
  SELECT id FROM story_assets WHERE story_id = '<story_id>'
);
```

#### Journey 3: Library → Sharing → Permissions

```sql
-- Verify library creation
SELECT id, user_id, name, description, created_at 
FROM libraries 
WHERE user_id = '<user_id>';

-- Verify story added to library
SELECT library_id, story_id, added_at 
FROM library_stories 
WHERE library_id = '<library_id>' AND story_id = '<story_id>';

-- Verify story sharing
SELECT id, story_id, shared_by, shared_with, permission_level, created_at 
FROM story_shares 
WHERE story_id = '<story_id>';

-- Verify permissions
SELECT user_id, story_id, permission_type, granted_at 
FROM story_permissions 
WHERE story_id = '<story_id>';

-- Verify RLS policies (test query as different user)
SET ROLE authenticated;
SET request.jwt.claim.sub = '<other_user_id>';
SELECT * FROM stories WHERE id = '<story_id>'; -- Should fail if no permission
```

#### Journey 4: Conversations → Multi-turn → Context

```sql
-- Verify conversation session
SELECT id, user_id, channel, status, metadata, created_at, updated_at 
FROM conversations 
WHERE id = '<conversation_id>';

-- Verify message history
SELECT id, conversation_id, role, content, timestamp, metadata 
FROM conversation_messages 
WHERE conversation_id = '<conversation_id>' 
ORDER BY timestamp;

-- Verify context preservation
SELECT conversation_id, context_key, context_value, updated_at 
FROM conversation_context 
WHERE conversation_id = '<conversation_id>';

-- Verify state persistence
SELECT conversation_id, state_key, state_value, updated_at 
FROM conversation_state 
WHERE conversation_id = '<conversation_id>';

-- Verify Redis cache (via Redis CLI)
redis-cli GET "storytailor:conversation:<conversation_id>"
```

#### Journey 5: Subscriptions → Payment → Tier

```sql
-- Verify subscription creation
SELECT id, user_id, plan_id, status, current_period_start, current_period_end 
FROM subscriptions 
WHERE user_id = '<user_id>';

-- Verify payment records
SELECT id, subscription_id, amount, currency, status, created_at 
FROM payments 
WHERE subscription_id = '<subscription_id>' 
ORDER BY created_at DESC;

-- Verify tier assignment
SELECT user_id, tier_id, tier_name, activated_at, expires_at 
FROM user_tiers 
WHERE user_id = '<user_id>';

-- Verify tier history
SELECT user_id, from_tier, to_tier, changed_at, reason 
FROM tier_history 
WHERE user_id = '<user_id>' 
ORDER BY changed_at DESC;
```

## Test Execution Script

### Prerequisites

1. **Infrastructure Running**:
   ```bash
   npm run infrastructure:start
   ```

2. **Database Access**:
   - Supabase connection string
   - Admin/service role key for direct database queries

3. **Test Environment**:
   - Clean test database (or use test isolation)
   - Test user credentials
   - API endpoint URL

### Test Script Structure

```bash
#!/bin/bash
# Phase 5: E2E Testing with Database Verification

# Test Journey 1: Registration → Profile → First Story
test_journey_1() {
  echo "Testing Journey 1: Registration → Profile → First Story"
  
  # 1. Execute API calls
  USER_RESPONSE=$(curl -X POST "${API_URL}/api/v1/auth/register" ...)
  USER_ID=$(echo "$USER_RESPONSE" | jq -r '.data.user.id')
  ACCESS_TOKEN=$(echo "$USER_RESPONSE" | jq -r '.tokens.accessToken')
  
  # 2. Verify HTTP status
  if [ "$(echo "$USER_RESPONSE" | jq -r '.success')" != "true" ]; then
    echo "❌ Registration failed"
    return 1
  fi
  
  # 3. Verify database
  DB_USER=$(psql "$DATABASE_URL" -t -c "SELECT id FROM users WHERE id = '$USER_ID';")
  if [ -z "$DB_USER" ]; then
    echo "❌ User not found in database"
    return 1
  fi
  
  echo "✅ Journey 1: Registration verified in database"
  
  # Continue with profile and story creation...
}

# Test Journey 2: Story → Character → Assets
test_journey_2() {
  # Similar structure...
}

# ... other journeys
```

## Verification Checklist

### ✅ Journey 1: Registration → Profile → First Story
- [ ] User registration API call succeeds
- [ ] User record exists in `users` table
- [ ] Profile setup API call succeeds
- [ ] Profile data exists in `user_profiles` table
- [ ] Story creation API call succeeds
- [ ] Story record exists in `stories` table
- [ ] Character associations exist in `story_characters` table
- [ ] Conversation session exists in `conversations` table

### ✅ Journey 2: Story → Character → Assets
- [ ] Story creation API call succeeds
- [ ] Story record with metadata exists in `stories` table
- [ ] Character creation API call succeeds
- [ ] Character records exist in `characters` table
- [ ] Story-character associations exist in `story_characters` table
- [ ] Asset generation API call succeeds
- [ ] Asset records exist in `story_assets` table
- [ ] Asset metadata exists in `asset_metadata` table

### ✅ Journey 3: Library → Sharing → Permissions
- [ ] Library creation API call succeeds
- [ ] Library record exists in `libraries` table
- [ ] Story addition to library API call succeeds
- [ ] Library-story association exists in `library_stories` table
- [ ] Story sharing API call succeeds
- [ ] Share record exists in `story_shares` table
- [ ] Permission update API call succeeds
- [ ] Permission record exists in `story_permissions` table
- [ ] RLS policies verified (test as different user)

### ✅ Journey 4: Conversations → Multi-turn → Context
- [ ] Conversation start API call succeeds
- [ ] Conversation record exists in `conversations` table
- [ ] Message send API call succeeds
- [ ] Message record exists in `conversation_messages` table
- [ ] Context preservation verified in `conversation_context` table
- [ ] State persistence verified in `conversation_state` table
- [ ] Redis cache verified (session state)

### ✅ Journey 5: Subscriptions → Payment → Tier
- [ ] Subscription creation API call succeeds
- [ ] Subscription record exists in `subscriptions` table
- [ ] Payment processing API call succeeds
- [ ] Payment record exists in `payments` table
- [ ] Tier assignment verified in `user_tiers` table
- [ ] Tier history verified in `tier_history` table

## Database Operation Verification

### Key Principles

1. **Not Just Status Codes**: Verify actual data exists in database
2. **Data Integrity**: Verify relationships and foreign keys
3. **RLS Policies**: Verify Row Level Security works correctly
4. **State Persistence**: Verify data persists across requests
5. **Error Handling**: Verify graceful failures don't corrupt data

### Verification Methods

1. **Direct SQL Queries**: Use Supabase SQL editor or psql
2. **Supabase Client**: Use Supabase JavaScript client in tests
3. **Admin API**: Use Supabase Admin API for verification
4. **Redis CLI**: Verify cache state for conversations

## Next Steps

1. **Create Test Script**: Implement E2E test script with database verification
2. **Execute Tests**: Run tests with infrastructure running
3. **Document Results**: Create test results report
4. **Fix Issues**: Address any database operation failures
5. **Verify Compliance**: Confirm all journeys work end-to-end

## Plan Compliance

**Requirement** (Plan Line 827): "ALL user journeys tested end-to-end" with "verify actual database operations (not just status codes)"

**Current Status**: 
- ✅ User journeys defined and documented
- ✅ Database verification queries defined
- ⏳ Test execution pending (requires infrastructure and test script implementation)

**Compliance**: ⚠️ **PARTIAL** - Plan ready, execution pending

## Notes

- Database verification is critical - status codes alone don't prove data persistence
- RLS policies must be tested with different user contexts
- Redis cache verification ensures session state is preserved
- Error scenarios should also verify database state (no partial data, rollbacks work)

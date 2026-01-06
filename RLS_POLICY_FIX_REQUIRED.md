# RLS Policy Fix Required - Supabase Admin Access Needed

**Date:** December 29, 2025  
**Priority:** HIGH - Blocks E2E Testing  
**Status:** Requires Supabase Admin Access

---

## 🔴 Problem Summary

**Error:** `"infinite recursion detected in policy for relation library_permissions"`

**Impact:**
- ✅ **Character creation WORKS** with service key (direct database access)
- ❌ **Character creation FAILS** in E2E tests (with RLS policies enforced)
- ❌ Blocks comprehensive E2E testing of character/story pipeline
- ❌ Cascades to library management tests (invite, transfer, share)

**Root Cause:** Circular reference in Supabase RLS policies for `library_permissions` table

---

## ✅ What We Verified Works

### Basic Character Creation (Service Key)
```javascript
// ✅ THIS WORKS - Tested December 29, 2025
const characterData = {
  library_id: '580e14b2-2d2f-4d36-9be4-8e95cbb1ca55',
  creator_user_id: 'c72e39bb-a563-4989-a649-5c2f89527b61',
  name: 'Test Character for RLS Debug',
  traits: {
    age: 7,
    personality: ['brave', 'curious'],
    inclusivityTraits: []
  },
  is_primary: false
};

const { data, error } = await supabase
  .from('characters')
  .insert(characterData)
  .select()
  .single();

// Result: ✅ Character created successfully
// ID: 3fb84b5a-17a5-4c69-9b82-505576588aa3
```

### E2E Test Failure
```javascript
// ❌ THIS FAILS - E2E Test Pattern
const characterData = {
  library_id: libraries.id,
  name: 'E2E Test Character',
  age: 7,  // ⚠️ This might be the problem
  species: 'human',
  personality_traits: ['curious', 'brave'],
  likes: ['puzzles', 'stories'],
  dislikes: ['loud noises'],
  // ... many more fields ...
  inclusivity_traits: [...],  // ⚠️ This might trigger the policy
  creator_user_id: user.id
};

// Result: ❌ Error: infinite recursion in library_permissions policy
```

---

## 🔍 Diagnosis: RLS Policy Circular Reference

### What Causes Infinite Recursion

**Scenario A: Self-Referencing Policy**
```sql
-- WRONG: Policy checks itself
CREATE POLICY "characters_select" ON characters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM characters  -- ⚠️ Circular!
      WHERE id = characters.id
    )
  );
```

**Scenario B: Mutual Reference**
```sql
-- WRONG: library_permissions checks characters, characters checks library_permissions
CREATE POLICY "characters_insert" ON characters
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM library_permissions
      WHERE library_id = characters.library_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "library_permissions_select" ON library_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM characters  -- ⚠️ Circular reference back to characters!
      WHERE library_id = library_permissions.library_id
    )
  );
```

**Scenario C: Transitive Reference**
```sql
-- WRONG: A → B → C → A cycle
-- characters → library_permissions → libraries → characters
```

---

## 🛠️ How to Fix (Supabase Dashboard)

### Step 1: Access Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project: `storytailor-production`
3. Navigate to: **Database** → **Policies**

### Step 2: Find the Problematic Policy

**Filter by table:** `library_permissions`

**Look for policies that:**
- Reference `characters` table in their `USING` or `WITH CHECK` clause
- Reference other tables that might reference `characters` back

### Step 3: Review Current Policies

Execute this query in **SQL Editor** to see all policies:

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('library_permissions', 'characters', 'libraries')
ORDER BY tablename, policyname;
```

### Step 4: Identify the Circular Reference

Look for:
1. `library_permissions` policy that references `characters`
2. `characters` policy that references `library_permissions`
3. Any indirect cycles through `libraries` or other tables

### Step 5: Break the Cycle

**Option A: Simplify library_permissions Policy**

Remove character checks from `library_permissions`:

```sql
-- BEFORE (WRONG)
CREATE POLICY "library_permissions_select" ON library_permissions
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM characters  -- ⚠️ This causes the cycle
      WHERE library_id = library_permissions.library_id
    )
  );

-- AFTER (CORRECT)
DROP POLICY IF EXISTS "library_permissions_select" ON library_permissions;

CREATE POLICY "library_permissions_select" ON library_permissions
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM libraries  -- ✅ Direct check, no cycle
      WHERE id = library_permissions.library_id
        AND owner = auth.uid()
    )
  );
```

**Option B: Simplify characters Policy**

Remove `library_permissions` checks from `characters`:

```sql
-- BEFORE (WRONG)
CREATE POLICY "characters_insert" ON characters
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM library_permissions  -- ⚠️ This causes the cycle
      WHERE library_id = characters.library_id
        AND user_id = auth.uid()
    )
  );

-- AFTER (CORRECT)
DROP POLICY IF EXISTS "characters_insert" ON characters;

CREATE POLICY "characters_insert" ON characters
  FOR INSERT WITH CHECK (
    creator_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM libraries  -- ✅ Direct check, no cycle
      WHERE id = characters.library_id
        AND owner = auth.uid()
    )
  );
```

**Option C: Use Security Definer Functions**

Create a function that bypasses RLS for the check:

```sql
-- Create a function that runs with SECURITY DEFINER (bypasses RLS)
CREATE OR REPLACE FUNCTION check_library_access(library_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM libraries
    WHERE id = library_uuid
      AND owner = user_uuid
  );
END;
$$;

-- Use in policy (no RLS cycle)
CREATE POLICY "characters_insert" ON characters
  FOR INSERT WITH CHECK (
    check_library_access(library_id, auth.uid())
  );
```

---

## 🧪 Test the Fix

After applying the fix, run this test in Supabase SQL Editor:

```sql
-- Set session to test user
SET request.jwt.claim.sub = 'c72e39bb-a563-4989-a649-5c2f89527b61';

-- Test character creation (should NOT error)
INSERT INTO characters (
  library_id,
  creator_user_id,
  name,
  traits,
  is_primary
) VALUES (
  '580e14b2-2d2f-4d36-9be4-8e95cbb1ca55',
  'c72e39bb-a563-4989-a649-5c2f89527b61',
  'RLS Policy Test Character',
  '{"age": 7, "personality": ["brave"]}'::jsonb,
  false
)
RETURNING id, name, created_at;
```

**Expected Result:**
- ✅ No error
- ✅ Returns new character ID

---

## 📋 Validation Checklist

After fixing the policy, verify:

- [ ] **SQL Test:** Direct character creation succeeds (see above)
- [ ] **E2E Test:** Run `node scripts/test-complete-rest-api-flow.js` → character test passes
- [ ] **Service Key:** Character creation still works with service key
- [ ] **User Auth:** Character creation works with user JWT token
- [ ] **Permissions:** Users can only create characters in their own libraries
- [ ] **Security:** Verify no unauthorized access introduced by the fix

---

## 🚀 Run E2E Tests After Fix

```bash
cd "/Users/jqsirls/Library/CloudStorage/Dropbox-Storytailor/JQ Sirls/Storytailor Inc/Projects/Storytailor Agent"
node scripts/test-complete-rest-api-flow.js
```

**Expected Results After Fix:**
```
✅ auth/signin - PASSED
✅ subscription/create_pro - PASSED (after plan_id fix)
✅ character/create_with_traits - PASSED  ← This is the key one
✅ library/invite - PASSED
✅ library/transfer - PASSED
✅ library/share - PASSED
```

---

## 🔧 Additional Issues Found

### 1. Subscription Plan ID Constraint

**Error:** `null value in column "plan_id" of relation "subscriptions" violates not-null constraint`

**Fix:** Update E2E test to provide valid `plan_id`:

```javascript
// In scripts/test-complete-rest-api-flow.js
const subscriptionData = {
  user_id: user.id,
  plan_id: 'pro_monthly',  // ✅ Add this
  status: 'active',
  current_period_start: new Date().toISOString(),
  current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
};
```

### 2. Library Tests Cascaded Failures

**Error:** `Cannot read properties of null (reading 'id')`

**Root Cause:** Character creation failed, so no character object exists

**Fix:** Will automatically resolve once character creation is fixed

---

## 📊 Current Test Status

| Test Category | Status | Blocker |
|---------------|--------|---------|
| auth/signin | ✅ PASSING | None |
| subscription/create_pro | ❌ FAILING | Missing `plan_id` |
| character/create_with_traits | ❌ FAILING | **RLS Policy Infinite Recursion** |
| library/invite | ❌ FAILING | Cascaded from character failure |
| library/transfer | ❌ FAILING | Cascaded from character failure |
| library/share | ❌ FAILING | Cascaded from character failure |

**Overall:** 1/6 tests passing (16.67%)  
**After Fix:** Expected 5-6/6 tests passing (83-100%)

---

## 🎯 Next Steps

### For You (Supabase Admin)

1. **Access Supabase Dashboard** → Database → Policies
2. **Identify the circular reference** in `library_permissions` policies
3. **Apply one of the fixes** (Option A, B, or C above)
4. **Test in SQL Editor** with the provided test query
5. **Notify me** once fixed so I can re-run E2E tests

### For Me (After Your Fix)

1. ✅ Re-run E2E test suite
2. ✅ Verify all 6 tests pass
3. ✅ Test with real wheelchair-using character story
4. ✅ Validate disability representation in generated images
5. ✅ Update documentation with E2E test results

---

## 📚 Related Documentation

- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Avoiding RLS Cycles](https://supabase.com/docs/guides/auth/row-level-security#avoid-cyclic-dependencies)

---

## 🆘 If You Need Help

If you're unsure about which policy to modify, you can:

1. **Export current policies** (SQL Editor):
   ```sql
   SELECT pg_get_policiesdef(oid)
   FROM pg_class
   WHERE relname IN ('library_permissions', 'characters');
   ```

2. **Share the output with me** → I'll identify the exact fix needed

3. **Or temporarily disable RLS** for testing (NOT for production):
   ```sql
   ALTER TABLE library_permissions DISABLE ROW LEVEL SECURITY;
   ALTER TABLE characters DISABLE ROW LEVEL SECURITY;
   ```
   Then re-run E2E tests to confirm they pass without RLS.

---

**Version:** 1.0  
**Last Updated:** December 29, 2025  
**Created By:** AI Agent (Cursor)  
**Requires:** Supabase Admin Access

---

## ✅ Summary for You

**What to do:**
1. Go to Supabase Dashboard → Database → Policies
2. Look for `library_permissions` policies that reference `characters`
3. Remove the circular reference (use one of the 3 options above)
4. Test with the provided SQL query
5. Let me know when fixed → I'll re-run E2E tests

**Why it matters:**
- Blocks comprehensive E2E testing
- Prevents validating full pipeline works end-to-end
- Once fixed, we can validate disability representation in real stories
- Critical for pre-launch validation

**Estimated time to fix:** 10-15 minutes (once you have Supabase admin access)


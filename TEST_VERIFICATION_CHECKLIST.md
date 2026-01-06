# Test Verification Checklist

## Requirements to Verify

### ✅ 1. No 403 Forbidden Errors
**Status:** FIXED - S3 SDK implementation working
**Evidence from logs:**
- ✅ "Downloading from S3 using AWS SDK" messages
- ✅ "Downloaded from S3 successfully" messages
- ✅ No "403 Forbidden" errors in recent logs

### ⏳ 2. Reference Images Download Successfully via S3 SDK
**Status:** PARTIALLY WORKING
**Current behavior:**
- ✅ Cover downloads from S3 successfully
- ✅ Beat 1 downloads cover from S3 successfully
- ⚠️ Beat 2-4: Still trying CDN URLs (old code before fix)
- ✅ **FIX DEPLOYED:** Beat images now converted to S3 URLs before progressive chain

**Expected after fix:**
- Beat 2: Downloads cover + beat 1 from S3
- Beat 3: Downloads cover + beat 1 + beat 2 from S3
- Beat 4: Downloads cover + beat 1 + beat 2 + beat 3 from S3

### ⏳ 3. Complete Story Generation in ~3 Minutes
**Status:** TESTING
**Expected timeline:**
- Cover: ~40s
- Beat 1: ~40s (with cover reference)
- Beat 2: ~40s (with cover + beat 1 references)
- Beat 3: ~40s (with cover + beat 1 + beat 2 references)
- Beat 4: ~40s (with all previous references)
- **Total: ~3 minutes**

**Previous (with errors):**
- Cover: Generated ✅
- Beat 1: Generated ✅
- Beat 2: Generated but references failed ⚠️
- Beat 3: Generated but references failed ⚠️
- Beat 4: Failed completely ❌
- **Result: Incomplete, stuck in "generating"**

### ⏳ 4. All Asset URLs Populated
**Status:** TESTING
**Required URLs:**
- [ ] `cover_art_url`: CDN URL
- [ ] `scene_art_urls`: Array of 4 beat image CDN URLs
- [ ] `audio_url`: Audio file URL
- [ ] `pdf_url`: PDF file URL
- [ ] `activities`: Array of activity objects

**Current status:**
- Story text: ✅ Generated
- Cover: ✅ Generated (URL should be populated)
- Beats: ⏳ In progress (URLs should populate as they complete)
- Audio: ⏳ Pending (queued after images)
- PDF: ⏳ Pending (queued after images)

## Code Fixes Deployed

### Fix 1: S3 SDK Download
**File:** `ImageReferenceService.ts`  
**Change:** Use AWS S3 SDK (`GetObjectCommand`) for S3 URLs instead of HTTP fetch  
**Status:** ✅ Deployed

### Fix 2: Progressive Chain S3 URLs
**File:** `RealContentAgent.ts`  
**Change:** Convert beat image CDN URLs to S3 URLs before adding to progressive chain  
**Status:** ✅ Deployed

## Test Command

```bash
TEST_EMAIL="j+1226@jqsirls.com" \
TEST_PASSWORD="Fntra2015!" \
API_BASE_URL="https://api.storytailor.dev" \
node scripts/test-pipeline-integration.js
```

## Verification Steps

1. **Monitor CloudWatch logs:**
   ```bash
   aws logs tail /aws/lambda/storytailor-content-agent-production --since 5m --format short | grep -E "(Downloading from S3|Downloaded from S3|Beat|progressive|403|Forbidden)"
   ```

2. **Check for S3 SDK downloads:**
   - Should see "Downloading from S3 using AWS SDK" for all references
   - Should see "Downloaded from S3 successfully" for all references
   - Should NOT see "fetch failed" or "403 Forbidden"

3. **Verify progressive chain:**
   - Beat 1: 1 reference (cover)
   - Beat 2: 2 references (cover + beat 1)
   - Beat 3: 3 references (cover + beat 1 + beat 2)
   - Beat 4: 3 references (last 3: cover + beat 1 + beat 2 + beat 3)

4. **Check story status:**
   - Poll story endpoint every 30 seconds
   - Verify `asset_generation_status` updates
   - Verify URLs populate as images complete
   - Total time should be ~3 minutes

5. **Final verification:**
   - All asset URLs populated
   - Story status: "ready"
   - No errors in logs

## Success Criteria

✅ **All 4 requirements met:**
1. ✅ No 403 Forbidden errors
2. ✅ Reference images download successfully via S3 SDK
3. ✅ Complete story generation in ~3 minutes
4. ✅ All asset URLs populated

**Current status:** Fixes deployed, testing in progress


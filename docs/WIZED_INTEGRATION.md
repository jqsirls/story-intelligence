# WIZED_INTEGRATION (one-page wiring guide)

This guide is for wiring Storytailor® into Wized/Webflow.

## Goal (what “working” means)

- You can **log in**, **create a character**, **create a story**, then **show assets progressively** as they land.
- The frontend listens to **Supabase Realtime** on the `stories` table filtered by story id, and updates UI when:
  - `cover_art_url` is set
  - `scene_art_urls[0..3]` fill in
  - `audio_url`, `pdf_url`, `qr_code_url` land
  - `activities` appears

## Required endpoints (call order)

1) **Login**
- `POST /api/v1/auth/login`
- Use `tokens.accessToken` as `Authorization: Bearer <token>` for all API calls below.

2) **Create character** (returns immediately; images generate async)
- `POST /api/v1/characters`

3) **Poll character until “complete”** (or subscribe to Realtime on `characters`, optional)
- `GET /api/v1/characters/:id`
- Character is complete when:
  - `appearance_url` is non-null AND
  - `reference_images` contains both `type=headshot` and `type=bodyshot` entries with non-empty `url`

4) **Create story** (returns immediately; assets generate async)
- `POST /api/v1/stories`
- Use `generateAssets: true` to enqueue the full asset pipeline.
- Capture `data.id` as `storyId`.

5) **Subscribe to story updates (Realtime)**
- Subscribe to `stories` UPDATE where `id=eq.<storyId>` (snippet below).

6) **Optional: asset status UI / debugging**
- `GET /api/v1/stories/:id/assets/status`
- Shows per-asset status plus the underlying `asset_generation_jobs` rows.

7) **Fetch the story (initial render + polling fallback)**
- `GET /api/v1/stories/:id`

## Page bindings (Wized fields)

### Core IDs
- **storyId**: `GET /api/v1/stories/:id -> data.id`
- **characterId**: `POST /api/v1/characters -> data.id`

### Story text + beats
- **storyText**: `data.content.text`
- **beats**: `data.content.beats[]` (each beat has `id` and `content`)

### Images (progressive reveal)
- **coverImageUrl**: `data.cover_art_url`
- **scene1ImageUrl**: `data.scene_art_urls[0]`
- **scene2ImageUrl**: `data.scene_art_urls[1]`
- **scene3ImageUrl**: `data.scene_art_urls[2]`
- **scene4ImageUrl**: `data.scene_art_urls[3]`

### Audio / PDF / QR
- **audioUrl**: `data.audio_url`
- **pdfUrl**: `data.pdf_url`
- **qrPublicUrl** (destination link): `data.qr_public_url`
- **qrCodeImageUrl** (hosted PNG): `data.qr_code_url`

### Activities
- **activities[]**: `data.activities` (array)

### Hue (optional)
- **hueColors**: `data.hue_extracted_colors` (object)

## Supabase Realtime subscription snippet (stories UPDATE)

Use the same Supabase project URL + anon key your web app uses.

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = '<SUPABASE_URL>'
const supabaseAnonKey = '<SUPABASE_ANON_KEY>'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function subscribeToStory(storyId, onUpdate) {
  const channel = supabase
    .channel(`stories:id=${storyId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'stories', filter: `id=eq.${storyId}` },
      (payload) => {
        // payload.new is the updated story row
        onUpdate(payload.new, payload)
      }
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}
```

## Progressive asset reveal (recommended UX)

Start with placeholders (skeleton cards) and reveal each section when its field becomes non-null:

- **Cover**
  - show when `cover_art_url` is a non-empty string
- **Scenes**
  - show each scene as its index fills: `scene_art_urls[0]..[3]`
- **Audio**
  - show player when `audio_url` is a non-empty string
- **PDF**
  - show “Download PDF” when `pdf_url` is a non-empty string
- **QR**
  - show QR image when `qr_code_url` is a non-empty string
  - also show link button using `qr_public_url`
- **Activities**
  - show activities list when `activities.length > 0`

### Polling fallback (minimal)

Realtime is the primary UX. If a user’s network blocks websockets, add a lightweight poll:

- Every 3–5 seconds call `GET /api/v1/stories/:id`
- Stop polling once:
  - `cover_art_url` is set
  - `scene_art_urls[0..3]` are set
  - `audio_url`, `pdf_url`, `qr_code_url` are set
  - `activities.length > 0`

## Minimal error handling UX (boring, correct)

- **401/403**
  - Show “Session expired. Please sign in again.”
  - Retry action: call `POST /api/v1/auth/login` then repeat the last action.

- **402 STORY_QUOTA_EXCEEDED / CHARACTER_QUOTA_EXCEEDED**
  - Show: “You’ve used your available credits.”
  - UI: show the provided `upgradeOptions.*.checkoutUrl` CTA.
  - Retry button: after purchase/upgrade, retry the original call:
    - `POST /api/v1/characters` or `POST /api/v1/stories`

- **500 / network error**
  - Show a small inline “Retry” button next to the component that failed:
    - Story creation failed → Retry `POST /api/v1/stories`
    - Asset stalled → Retry `GET /api/v1/stories/:id/assets/status` (for debugging) or `GET /api/v1/stories/:id`
  - Do not spam retries automatically; keep it user-controlled.

## Debug page (optional but very useful)

Add a dev-only panel showing:
- `storyId`
- `asset_generation_status.overall`
- `asset_generation_status.assets.*`
- last Realtime payload received



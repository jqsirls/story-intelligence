# REALTIME_SUBSCRIPTIONS (exact filters + payload example)

This is **what the frontend should do** to get calm, incremental asset updates.

## Stories subscription (per story)

**Channel name** (any string is fine; we standardize it):

```js
const channel = supabase
  .channel(`stories:id=${storyId}`)
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'stories', filter: `id=eq.${storyId}` },
    (payload) => console.log(payload)
  )
  .subscribe()
```

## Characters subscription (per character)

```js
const channel = supabase
  .channel(`characters:id=${characterId}`)
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'characters', filter: `id=eq.${characterId}` },
    (payload) => console.log(payload)
  )
  .subscribe()
```

## What changes land on `stories`

The Content Agent writes URLs directly onto the `stories` row (this is what Realtime emits):

- `cover_art_url`: set when cover finishes
- `scene_art_urls[index]`: set per beat completion (indexes preserved)
- `pdf_url`: set when PDF finishes (CDN URL)
- `qr_public_url`: `https://storytailor.com/s/<storyId>`
- `qr_code_url`: `https://assets.storytailor.dev/stories/<storyId>/qr-....png`
- `audio_url`: `https://assets.storytailor.dev/stories/audio/<...>.mp3`

## Actual Realtime payload example (stories UPDATE when `qr_code_url` lands)

Captured from a production smoke test run (see `scripts/smoke-test.sh` output).

```json
{
  "schema": "public",
  "table": "stories",
  "commit_timestamp": "2025-12-30T08:08:25.938Z",
  "eventType": "UPDATE",
  "new": {
    "id": "5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c",
    "title": "Test Character and the Whispering Map",
    "status": "generating",
    "pdf_url": null,
    "metadata": {},
    "audio_url": null,
    "pdf_pages": null,
    "qr_public_url": "https://storytailor.com/s/5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c",
    "qr_code_url": "https://assets.storytailor.dev/stories/5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c/qr-1767082105774.png"
  },
  "old": {
    "id": "5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c"
  },
  "errors": null
}
```



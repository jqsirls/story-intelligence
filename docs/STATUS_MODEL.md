# STATUS_MODEL (stories + jobs + characters)

## Story asset status (stories.asset_generation_status)

The canonical row that UIs should listen to is `stories` (Realtime `UPDATE` by `id`).

`stories.asset_generation_status` is a JSON object:

```json
{
  "overall": "generating",
  "assets": {
    "content": { "status": "ready", "progress": 100 },
    "cover": { "status": "ready", "progress": 100, "url": "https://assets.storytailor.dev/images/..." },
    "scene_1": { "status": "ready", "progress": 100, "url": "https://assets.storytailor.dev/images/..." },
    "scene_2": { "status": "ready", "progress": 100, "url": "https://assets.storytailor.dev/images/..." },
    "scene_3": { "status": "ready", "progress": 100, "url": "https://assets.storytailor.dev/images/..." },
    "scene_4": { "status": "ready", "progress": 100, "url": "https://assets.storytailor.dev/images/..." },
    "audio": { "status": "ready", "progress": 100, "url": "https://assets.storytailor.dev/stories/audio/....mp3" },
    "pdf": { "status": "ready", "progress": 100, "url": "https://assets.storytailor.dev/pdfs/...pdf" },
    "qr": { "status": "ready", "progress": 100, "url": "https://assets.storytailor.dev/stories/<id>/qr-....png" },
    "activities": { "status": "ready", "progress": 100 }
  }
}
```

**Notes**:
- The UI should treat the URL fields on the story row (`cover_art_url`, `scene_art_urls`, `audio_url`, `pdf_url`, `qr_code_url`) as the ultimate “ready” truth.
- `asset_generation_started_at` and `asset_generation_completed_at` exist and are used for lifecycle visibility.

## Job status (asset_generation_jobs.status)

Jobs are the worker queue items. Status values used in production code:
- `queued` → waiting for Asset Worker
- `generating` → dispatched to Content Agent, in-flight
- `ready` → Content Agent finished and wrote results
- `failed` → Content Agent errored; `error_message` and `completed_at` should be set

## Character completion gate (no characters.assets_status)

Character “complete” is derived from existing schema fields:
- `appearance_url` is a non-empty string, AND
- `reference_images` contains a `headshot` URL and a `bodyshot` URL

This is the gate used in `scripts/smoke-test.sh` and the REST API logic.



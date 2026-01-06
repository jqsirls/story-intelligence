# API_CONTRACT (5 endpoints, exact shapes + curl)

All examples below were captured/validated via `scripts/smoke-test.sh` against production.

## Auth prerequisite (token)

```bash
curl -sS -X POST "https://api.storytailor.dev/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"<EMAIL>","password":"<PASSWORD>"}'
```

Response (shape):
- `tokens.accessToken` (Bearer token for REST API calls)

---

## 1) POST /api/v1/characters

### Request (example)

```bash
curl -sS -X POST "https://api.storytailor.dev/api/v1/characters" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "name": "Smoke Test Zara",
    "gender": "girl",
    "species": "human",
    "age": 7,
    "ethnicity": ["Black"],
    "inclusivityTraits": [
      { "type": "mobility", "detail": "wheelchair user", "notes": "Mobility aid is part of her adventures; do not separate." }
    ],
    "appearance": { "hair": "curly hair", "clothing": "colorful jacket", "accessories": "cool backpack" }
  }'
```

### Success response (shape)
- `success: true`
- `data.id` (character UUID)

### Error responses

- **402 CHARACTER_QUOTA_EXCEEDED** (NOT retryable without quota change):

```json
{
  "success": false,
  "error": "Character limit reached",
  "code": "CHARACTER_QUOTA_EXCEEDED",
  "quota": { "tier": "free", "used": 95, "limit": 10 }
}
```

---

## 2) GET /api/v1/characters/:id

```bash
curl -sS "https://api.storytailor.dev/api/v1/characters/<CHARACTER_ID>" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Response (shape):
- `success: true`
- `data.appearance_url`
- `data.reference_images[]` (JSON array with `type: headshot|bodyshot`, `url`)

Character complete gate:
- `appearance_url` non-empty AND `reference_images` has headshot+bodyshot URLs.

---

## 3) POST /api/v1/stories

### Request (example)

```bash
curl -sS -X POST "https://api.storytailor.dev/api/v1/stories" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "title": "Smoke Test Story (full pipeline)",
    "storyIdea": "A brave kid explores a floating library that changes colors with each page.",
    "storyType": "adventure",
    "childAge": 7,
    "characterId": "<CHARACTER_ID>",
    "generateAssets": true
  }'
```

### Success response (full JSON example)

Captured from a production smoke test run (`scripts/smoke-test.sh`):

```json
{
  "success": true,
  "data": {
    "id": "5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c",
    "creator_user_id": "c72e39bb-a563-4989-a649-5c2f89527b61",
    "status": "generating",
    "asset_generation_status": {
      "assets": {
        "audio": { "status": "pending", "progress": 0 },
        "beats": { "status": "pending", "progress": 0 },
        "cover": { "status": "pending", "progress": 0 },
        "content": { "status": "generating", "progress": 0 }
      },
      "overall": "generating"
    },
    "realtimeChannel": "stories:id=5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c",
    "subscribePattern": {
      "table": "stories",
      "filter": "id=eq.5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c",
      "event": "UPDATE"
    }
  }
}
```

---

## 4) GET /api/v1/stories/:id

```bash
curl -sS "https://api.storytailor.dev/api/v1/stories/<STORY_ID>" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Success response (full JSON example)

Captured from production via `GET /api/v1/stories/5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c`:

```json
{
  "success": true,
  "data": {
    "id": "5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c",
    "library_id": "580e14b2-2d2f-4d36-9be4-8e95cbb1ca55",
    "title": "Test Character and the Whispering Map",
    "content": {
      "text": "Test Character was seven, brave, and very curious. They lived by Pinecone Park, near tall trees. Morning air smelled like wet leaves and toast.\n\nOne windy day, Test Character found a crinkly map. It was tucked under a smooth, gray stone. The map rustled like a secret in hands.\n\nIt showed a star by Willow Creek. Test Character packed water and an apple. They told Auntie Jo where they would go. Auntie Jo nodded and smiled.\n\nTest Character walked along the crunchy path. Sunlight made bright spots on the ground. Birds chirped fast, like tiny drums.\n\nSoon, a wide puddle blocked the trail. Mud sucked at their shoes. Test Character took a slow breath. “I can solve this,” they said.\n\nThey found flat rocks near the reeds. They stepped rock to rock, steady and calm. One rock wobbled, but they held balance. They crossed, then giggled softly.\n\nAt Willow Creek, the water hummed and flashed. The map’s star pointed to a fallen log. Under it sat a small wooden box.\n\nThe box had a twisty knot and would not open. Test Character felt stuck and a little mad. Their cheeks warmed like hot cocoa.\n\nThey sat down and listened to the creek. “Try again, gently,” they whispered. They wiggled the knot, slow and patient. The knot loosened with a tiny pop.\n\nInside was a shiny compass and a note. It said, “Bravery is asking for help, too.” Test Character smiled and headed home.\n\nOn the way, they met a younger kid, Kai, who looked lost. Test Character showed the compass and the path. Together they walked back to Pinecone Park.\n\nAuntie Jo hugged them both. Test Character felt proud and steady inside. The wind sounded like clapping through the trees.",
      "beats": [
        {
          "id": "beat-1",
          "content": "Test Character was seven, brave, and very curious. They lived by Pinecone Park, near tall trees. Morning air smelled like wet leaves and toast.\n\nOne windy day, Test Character found a crinkly map. It was tucked under a smooth, gray stone. The map rustled like a secret in hands.\n\nIt showed a star by Willow Creek. Test Character packed water and an apple. They told Auntie Jo where they would go. Auntie Jo nodded and smiled."
        },
        {
          "id": "beat-2",
          "content": "Test Character walked along the crunchy path. Sunlight made bright spots on the ground. Birds chirped fast, like tiny drums.\n\nSoon, a wide puddle blocked the trail. Mud sucked at their shoes. Test Character took a slow breath. “I can solve this,” they said.\n\nThey found flat rocks near the reeds. They stepped rock to rock, steady and calm. One rock wobbled, but they held balance. They crossed, then giggled softly."
        },
        {
          "id": "beat-3",
          "content": "At Willow Creek, the water hummed and flashed. The map’s star pointed to a fallen log. Under it sat a small wooden box.\n\nThe box had a twisty knot and would not open. Test Character felt stuck and a little mad. Their cheeks warmed like hot cocoa.\n\nThey sat down and listened to the creek. “Try again, gently,” they whispered. They wiggled the knot, slow and patient. The knot loosened with a tiny pop."
        },
        {
          "id": "beat-4",
          "content": "Inside was a shiny compass and a note. It said, “Bravery is asking for help, too.” Test Character smiled and headed home.\n\nOn the way, they met a younger kid, Kai, who looked lost. Test Character showed the compass and the path. Together they walked back to Pinecone Park.\n\nAuntie Jo hugged them both. Test Character felt proud and steady inside. The wind sounded like clapping through the trees."
        }
      ],
      "audioUrl": "",
      "metadata": {
        "phase": "awaiting_cover_confirmation",
        "userAge": 7,
        "keyBeats": [
          {
            "beatNumber": 1,
            "description": "Test Character finds a crinkly map in Pinecone Park and decides to explore.",
            "emotionalTone": "happy",
            "characterState": "Physically alert and ready to move; emotionally curious and excited.",
            "visualDescription": "Morning in Pinecone Park with tall evergreen trees and dappled sunlight. Test Character kneels by a smooth gray stone, holding a crinkly paper map that curls at the edges. A small backpack lies open with an apple peeking out. Colors are fresh greens and warm golds, with leaves glistening as if still wet."
          },
          {
            "beatNumber": 2,
            "description": "A wide puddle and sticky mud block the path; Test Character chooses careful stepping stones.",
            "emotionalTone": "brave",
            "characterState": "Shoes splashed and muddy; breathing slowly; determined and calm.",
            "visualDescription": "A muddy trail with a wide puddle reflecting the sky. Test Character stands with arms out for balance, one foot on a flat rock, the other lifted to step forward. Reeds and small stones line the puddle edge. The mood is tense but hopeful, with cool blues in the water and earthy browns in the mud."
          },
          {
            "beatNumber": 3,
            "description": "At Willow Creek, the box won’t open; Test Character manages frustration and tries gently again.",
            "emotionalTone": "thoughtful",
            "characterState": "Hands steady, cheeks warm from frustration; emotionally learning patience and self-control.",
            "visualDescription": "Willow Creek sparkles in sunlight, water moving like silver ribbons. Test Character sits on a fallen log beside a small wooden box with a twisty knot. Their hands carefully work the knot while their face shows focus. Soft green willow branches hang overhead; the scene feels quiet and thoughtful."
          },
          {
            "beatNumber": 4,
            "description": "Test Character uses the compass to help Kai and returns home safely, feeling proud.",
            "emotionalTone": "triumphant",
            "characterState": "Tired but strong; emotionally proud, caring, and steady.",
            "visualDescription": "Golden afternoon light in Pinecone Park. Test Character walks beside Kai, holding a shiny compass that catches the sun. Auntie Jo waits near the trail entrance with open arms. The trees sway gently, and the colors are warm gold and deep green, creating a safe, triumphant mood."
          }
        ],
        "storyType": "adventure",
        "assetHashes": {
          "audioHash": "761ba240301532f85c1493812b0679394a89f62c69af9d5a17d8109d139dbd72",
          "coverHash": "bafdbc6ce011d4c0dbf65d00c47f7dbf0db691d69ccb2e46d7336fb9526b95d9",
          "beatHashes": [
            "3d34f7fe7be6809330f3f3c7bbf9d0faf2bf60d8086350cf918e488cb9befcc3",
            "47920e1cbc3a2ab4f4b15e15c2df77f3ccec2d9608a5f5284c27f0895937a5e3",
            "311f4e99e220046820819063d0f51450173a7d284a7e24049418b3e492a22680",
            "0aa3c9d24c97cfec4eb5ce297a750b4459f3c7369b446e7e0f5b63afc518f48a"
          ]
        },
        "assetsStatus": {
          "audio": "pending",
          "beats": [
            "pending",
            "pending",
            "pending",
            "pending"
          ],
          "cover": "pending"
        },
        "characterName": "Test Character",
        "ipAttributions": [
          {
            "owner": "Marvel Comics (Disney)",
            "character": "Park",
            "franchise": "Marvel",
            "confidence": "medium",
            "detectedAt": "2025-12-30T08:05:06.367Z",
            "attributionText": "Park belongs to Marvel Comics (Disney)",
            "personalUseMessage": "This story is for your family's personal enjoyment only",
            "ownershipDisclaimer": "We are not the owners of this character"
          },
          {
            "owner": "DC Comics (Warner Bros.)",
            "character": "The Flash",
            "franchise": "DC Comics",
            "confidence": "low",
            "detectedAt": "2025-12-30T08:05:06.367Z",
            "attributionText": "The Flash belongs to DC Comics (Warner Bros.)",
            "personalUseMessage": "This story is for your family's personal enjoyment only",
            "ownershipDisclaimer": "We are not the owners of this character"
          }
        ],
        "characterTraits": {
          "species": "human",
          "fullName": "Test Character",
          "lastName": "Character",
          "pronouns": "she/her",
          "firstName": "Test",
          "personality": "brave and curious"
        },
        "storyVersionHash": "7081f30a8645a47ad483be77b813cf176912dada1071eddc85d87dd1cc14fb4e"
      },
      "beatImages": [
        {
          "imageUrl": "https://assets.storytailor.dev/images/beat-1767082437136-1767082437137.png",
          "timestamp": 0,
          "beatNumber": 1,
          "description": "Morning in Pinecone Park with tall evergreen trees and dappled sunlight. Test Character kneels by a smooth gray stone, holding a crinkly paper map that curls at the edges. A small backpack lies open with an apple peeking out. Colors are fresh greens and warm golds, with leaves glistening as if still wet."
        },
        {
          "imageUrl": "https://assets.storytailor.dev/images/beat-1767082439103-1767082439104.png",
          "timestamp": 0,
          "beatNumber": 2,
          "description": "A muddy trail with a wide puddle reflecting the sky. Test Character stands with arms out for balance, one foot on a flat rock, the other lifted to step forward. Reeds and small stones line the puddle edge. The mood is tense but hopeful, with cool blues in the water and earthy browns in the mud."
        },
        {
          "imageUrl": "https://assets.storytailor.dev/images/beat-1767082440031-1767082440043.png",
          "timestamp": 0,
          "beatNumber": 3,
          "description": "Willow Creek sparkles in sunlight, water moving like silver ribbons. Test Character sits on a fallen log beside a small wooden box with a twisty knot. Their hands carefully work the knot while their face shows focus. Soft green willow branches hang overhead; the scene feels quiet and thoughtful."
        },
        {
          "imageUrl": "https://assets.storytailor.dev/images/beat-1767082437783-1767082437798.png",
          "timestamp": 0,
          "beatNumber": 4,
          "description": "Golden afternoon light in Pinecone Park. Test Character walks beside Kai, holding a shiny compass that catches the sun. Auntie Jo waits near the trail entrance with open arms. The trees sway gently, and the colors are warm gold and deep green, creating a safe, triumphant mood."
        }
      ],
      "coverImageUrl": "https://assets.storytailor.dev/images/cover-1767082442955-1767082442966.png"
    },
    "status": "generating",
    "age_rating": 7,
    "created_at": "2025-12-30T08:04:22.881831+00:00",
    "finalized_at": null,
    "metadata": {},
    "creator_user_id": "c72e39bb-a563-4989-a649-5c2f89527b61",
    "asset_generation_status": {
      "assets": {
        "pdf": {
          "status": "pending",
          "progress": 0
        },
        "audio": {
          "status": "pending",
          "progress": 0
        },
        "cover": {
          "url": "https://assets.storytailor.dev/images/cover-1767082442955-1767082442966.png",
          "status": "ready",
          "progress": 100
        },
        "content": {
          "status": "ready",
          "progress": 100
        },
        "scene_1": {
          "url": "https://assets.storytailor.dev/images/beat-1767082437136-1767082437137.png",
          "status": "ready",
          "progress": 100
        },
        "scene_2": {
          "url": "https://assets.storytailor.dev/images/beat-1767082439103-1767082439104.png",
          "status": "ready",
          "progress": 100
        },
        "scene_3": {
          "url": "https://assets.storytailor.dev/images/beat-1767082440031-1767082440043.png",
          "status": "ready",
          "progress": 100
        },
        "scene_4": {
          "url": "https://assets.storytailor.dev/images/beat-1767082437783-1767082437798.png",
          "status": "ready",
          "progress": 100
        },
        "activities": {
          "status": "pending",
          "progress": 0
        }
      },
      "overall": "generating"
    },
    "asset_generation_started_at": "2025-12-30T08:04:22.857+00:00",
    "asset_generation_completed_at": null,
    "audio_url": "https://assets.storytailor.dev/stories/audio/1767082446945-42rtsb.mp3",
    "webvtt_url": null,
    "audio_duration": null,
    "audio_voice_id": null,
    "cover_art_url": "https://assets.storytailor.dev/images/cover-1767082442955-1767082442966.png",
    "scene_art_urls": [
      "https://assets.storytailor.dev/images/beat-1767082437136-1767082437137.png",
      "https://assets.storytailor.dev/images/beat-1767082439103-1767082439104.png",
      "https://assets.storytailor.dev/images/beat-1767082440031-1767082440043.png",
      "https://assets.storytailor.dev/images/beat-1767082437783-1767082437798.png"
    ],
    "color_palettes": null,
    "activities": [
      {
        "id": "activity-1767082403373-thkbj7",
        "type": "creative_arts",
        "title": "Story Scene Drawing",
        "ageRange": {
          "max": 9,
          "min": 6
        },
        "duration": "15-20 minutes",
        "materials": [
          "paper",
          "crayons",
          "safe scissors"
        ],
        "parentTips": [
          "Ask open-ended questions about the drawing"
        ],
        "adaptations": {
          "older": "Add labels and short sentences describing the scene",
          "younger": "Provide tracing outlines and larger tools",
          "specialNeeds": "Offer extra time and alternative materials as needed"
        },
        "description": "Illustrate a favorite moment from the story",
        "safetyNotes": [
          "Supervise use of scissors"
        ],
        "instructions": [
          "Talk about the story together",
          "Draw Test Hero in a scene from the story",
          "Share your favorite part"
        ],
        "storyConnection": "Inspired by \"Test Character and the Whispering Map\" (undefined)",
        "learningObjectives": [
          "story recall",
          "fine motor",
          "expression"
        ]
      },
      {
        "id": "activity-1767082403373-ip5yog",
        "type": "creative_arts",
        "title": "Character Collage",
        "ageRange": {
          "max": 9,
          "min": 6
        },
        "duration": "20-25 minutes",
        "materials": [
          "paper",
          "crayons",
          "safe scissors"
        ],
        "parentTips": [
          "Ask open-ended questions about the drawing"
        ],
        "adaptations": {
          "older": "Add labels and short sentences describing the scene",
          "younger": "Provide tracing outlines and larger tools",
          "specialNeeds": "Offer extra time and alternative materials as needed"
        },
        "description": "Create a collage of Test Hero using paper shapes",
        "safetyNotes": [
          "Supervise use of scissors"
        ],
        "instructions": [
          "Talk about the story together",
          "Draw Test Hero in a scene from the story",
          "Share your favorite part"
        ],
        "storyConnection": "Inspired by \"Test Character and the Whispering Map\" (undefined)",
        "learningObjectives": [
          "story recall",
          "fine motor",
          "expression"
        ]
      },
      {
        "id": "activity-1767082403373-5qhvjf",
        "type": "creative_arts",
        "title": "Act It Out!",
        "ageRange": {
          "max": 9,
          "min": 6
        },
        "duration": "10-15 minutes",
        "materials": [
          "paper",
          "crayons",
          "safe scissors"
        ],
        "parentTips": [
          "Ask open-ended questions about the drawing"
        ],
        "adaptations": {
          "older": "Add labels and short sentences describing the scene",
          "younger": "Provide tracing outlines and larger tools",
          "specialNeeds": "Offer extra time and alternative materials as needed"
        },
        "description": "Pretend to be the character and act a scene",
        "safetyNotes": [
          "Supervise use of scissors"
        ],
        "instructions": [
          "Talk about the story together",
          "Draw Test Hero in a scene from the story",
          "Share your favorite part"
        ],
        "storyConnection": "Inspired by \"Test Character and the Whispering Map\" (undefined)",
        "learningObjectives": [
          "story recall",
          "fine motor",
          "expression"
        ]
      },
      {
        "id": "activity-1767082403373-2swn8x",
        "type": "creative_arts",
        "title": "Soundtrack Time",
        "ageRange": {
          "max": 9,
          "min": 6
        },
        "duration": "10 minutes",
        "materials": [
          "paper",
          "crayons",
          "safe scissors"
        ],
        "parentTips": [
          "Ask open-ended questions about the drawing"
        ],
        "adaptations": {
          "older": "Add labels and short sentences describing the scene",
          "younger": "Provide tracing outlines and larger tools",
          "specialNeeds": "Offer extra time and alternative materials as needed"
        },
        "description": "Make simple sound effects that match story moments",
        "safetyNotes": [
          "Supervise use of scissors"
        ],
        "instructions": [
          "Talk about the story together",
          "Draw Test Hero in a scene from the story",
          "Share your favorite part"
        ],
        "storyConnection": "Inspired by \"Test Character and the Whispering Map\" (undefined)",
        "learningObjectives": [
          "story recall",
          "fine motor",
          "expression"
        ]
      }
    ],
    "pdf_url": "https://assets.storytailor.dev/pdfs/5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c/Test_Character_and_the_Whispering_Map_Test_Hero_2025-12-30.pdf",
    "pdf_pages": 5,
    "pdf_file_size": 5247,
    "qr_code_url": "https://assets.storytailor.dev/stories/5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c/qr-1767082105774.png",
    "qr_public_url": "https://storytailor.com/s/5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c",
    "qr_scan_count": 0,
    "audio_words": [
      {
        "end": 0.24,
        "txt": "Test",
        "start": 0
      },
      {
        "end": 0.72,
        "txt": "Character",
        "start": 0.288
      },
      {
        "end": 1.04,
        "txt": "was",
        "start": 0.8
      },
      {
        "end": 1.676,
        "txt": "seven,",
        "start": 1.106
      },
      {
        "end": 2.152,
        "txt": "brave,",
        "start": 1.742
      },
      {
        "end": 2.312,
        "txt": "and",
        "start": 2.192
      },
      {
        "end": 2.712,
        "txt": "very",
        "start": 2.392
      },
      {
        "end": 3.432,
        "txt": "curious.",
        "start": 2.792
      },
      {
        "end": 3.992,
        "txt": "They",
        "start": 3.544
      },
      {
        "end": 4.232,
        "txt": "lived",
        "start": 4.032
      },
      {
        "end": 4.472,
        "txt": "by",
        "start": 4.312
      },
      {
        "end": 5.032,
        "txt": "Pinecone",
        "start": 4.552
      },
      {
        "end": 5.592,
        "txt": "Park,",
        "start": 5.128
      },
      {
        "end": 5.752,
        "txt": "near",
        "start": 5.624
      },
      {
        "end": 6.072,
        "txt": "tall",
        "start": 5.816
      },
      {
        "end": 6.71,
        "txt": "trees.",
        "start": 6.165
      },
      {
        "end": 7.43,
        "txt": "Morning",
        "start": 6.8
      },
      {
        "end": 7.83,
        "txt": "air",
        "start": 7.53
      },
      {
        "end": 8.15,
        "txt": "smelled",
        "start": 7.87
      },
      {
        "end": 8.31,
        "txt": "like",
        "start": 8.182
      },
      {
        "end": 8.63,
        "txt": "wet",
        "start": 8.39
      },
      {
        "end": 9.106,
        "txt": "leaves",
        "start": 8.698
      },
      {
        "end": 9.186,
        "txt": "and",
        "start": 9.126
      },
      {
        "end": 10.622,
        "txt": "toast.\n\nOne",
        "start": 9.292
      },
      {
        "end": 10.94,
        "txt": "windy",
        "start": 10.675
      },
      {
        "end": 11.66,
        "txt": "day,",
        "start": 11.04
      },
      {
        "end": 11.98,
        "txt": "Test",
        "start": 11.724
      },
      {
        "end": 12.38,
        "txt": "Character",
        "start": 12.02
      },
      {
        "end": 12.698,
        "txt": "found",
        "start": 12.433
      },
      {
        "end": 12.778,
        "txt": "a",
        "start": 12.738
      },
      {
        "end": 13.256,
        "txt": "crinkly",
        "start": 12.831
      },
      {
        "end": 13.976,
        "txt": "map.",
        "start": 13.376
      },
      {
        "end": 14.216,
        "txt": "It",
        "start": 14.056
      },
      {
        "end": 14.376,
        "txt": "was",
        "start": 14.256
      },
      {
        "end": 14.691,
        "txt": "tucked",
        "start": 14.421
      },
      {
        "end": 14.847,
        "txt": "under",
        "start": 14.717
      },
      {
        "end": 14.927,
        "txt": "a",
        "start": 14.887
      },
      {
        "end": 15.647,
        "txt": "smooth,",
        "start": 15.007
      },
      {
        "end": 15.807,
        "txt": "gray",
        "start": 15.679
      },
      {
        "end": 16.445,
        "txt": "stone.",
        "start": 15.9
      },
      {
        "end": 16.925,
        "txt": "The",
        "start": 16.565
      },
      {
        "end": 17.245,
        "txt": "map",
        "start": 17.005
      },
      {
        "end": 17.644,
        "txt": "rustled",
        "start": 17.293
      },
      {
        "end": 17.804,
        "txt": "like",
        "start": 17.676
      },
      {
        "end": 17.884,
        "txt": "a",
        "start": 17.844
      },
      {
        "end": 18.283,
        "txt": "secret",
        "start": 17.941
      },
      {
        "end": 18.361,
        "txt": "in",
        "start": 18.309
      },
      {
        "end": 19.557,
        "txt": "hands.\n\nIt",
        "start": 18.467
      },
      {
        "end": 19.795,
        "txt": "showed",
        "start": 19.591
      },
      {
        "end": 19.875,
        "txt": "a",
        "start": 19.835
      },
      {
        "end": 20.195,
        "txt": "star",
        "start": 19.939
      },
      {
        "end": 20.354,
        "txt": "by",
        "start": 20.248
      },
      {
        "end": 20.669,
        "txt": "Willow",
        "start": 20.399
      },
      {
        "end": 21.229,
        "txt": "Creek.",
        "start": 20.749
      },
      {
        "end": 21.869,
        "txt": "Test",
        "start": 21.357
      },
      {
        "end": 22.349,
        "txt": "Character",
        "start": 21.917
      },
      {
        "end": 22.664,
        "txt": "packed",
        "start": 22.394
      },
      {
        "end": 23.06,
        "txt": "water",
        "start": 22.73
      },
      {
        "end": 23.3,
        "txt": "and",
        "start": 23.12
      },
      {
        "end": 23.378,
        "txt": "an",
        "start": 23.326
      },
      {
        "end": 24.016,
        "txt": "apple.",
        "start": 23.471
      },
      {
        "end": 24.576,
        "txt": "They",
        "start": 24.128
      },
      {
        "end": 24.816,
        "txt": "told",
        "start": 24.624
      },
      {
        "end": 25.296,
        "txt": "Auntie",
        "start": 24.88
      },
      {
        "end": 25.455,
        "txt": "Jo",
        "start": 25.349
      },
      {
        "end": 25.611,
        "txt": "where",
        "start": 25.481
      },
      {
        "end": 25.771,
        "txt": "they",
        "start": 25.643
      },
      {
        "end": 25.927,
        "txt": "would",
        "start": 25.797
      },
      {
        "end": 26.325,
        "txt": "go.",
        "start": 26.033
      },
      {
        "end": 27.125,
        "txt": "Auntie",
        "start": 26.469
      },
      {
        "end": 27.365,
        "txt": "Jo",
        "start": 27.205
      },
      {
        "end": 27.841,
        "txt": "nodded",
        "start": 27.433
      },
      {
        "end": 28.001,
        "txt": "and",
        "start": 27.881
      },
      {
        "end": 28.718,
        "txt": "smiled.",
        "start": 28.092
      },
      {
        "end": 29.438,
        "txt": "...",
        "start": 28.898
      },
      {
        "end": 29.678,
        "txt": "Test",
        "start": 29.486
      },
      {
        "end": 30.158,
        "txt": "Character",
        "start": 29.726
      },
      {
        "end": 30.473,
        "txt": "walked",
        "start": 30.203
      },
      {
        "end": 30.713,
        "txt": "along",
        "start": 30.513
      },
      {
        "end": 30.873,
        "txt": "the",
        "start": 30.753
      },
      {
        "end": 31.273,
        "txt": "crunchy",
        "start": 30.923
      },
      {
        "end": 31.833,
        "txt": "path.",
        "start": 31.369
      },
      {
        "end": 32.713,
        "txt": "Sunlight",
        "start": 31.993
      },
      {
        "end": 32.953,
        "txt": "made",
        "start": 32.761
      },
      {
        "end": 33.268,
        "txt": "bright",
        "start": 32.998
      },
      {
        "end": 33.664,
        "txt": "spots",
        "start": 33.334
      },
      {
        "end": 33.823,
        "txt": "on",
        "start": 33.717
      },
      {
        "end": 34.103,
        "txt": "the",
        "start": 33.893
      },
      {
        "end": 34.463,
        "txt": "ground.",
        "start": 34.143
      },
      {
        "end": 35.021,
        "txt": "Birds",
        "start": 34.556
      },
      {
        "end": 35.339,
        "txt": "chirped",
        "start": 35.069
      },
      {
        "end": 35.939,
        "txt": "fast,",
        "start": 35.435
      },
      {
        "end": 36.059,
        "txt": "like",
        "start": 35.963
      },
      {
        "end": 36.459,
        "txt": "tiny",
        "start": 36.139
      },
      {
        "end": 38.295,
        "txt": "drums.\n\nSoon,",
        "start": 36.565
      },
      {
        "end": 38.375,
        "txt": "a",
        "start": 38.335
      },
      {
        "end": 38.775,
        "txt": "wide",
        "start": 38.455
      },
      {
        "end": 39.095,
        "txt": "puddle",
        "start": 38.823
      },
      {
        "end": 39.415,
        "txt": "blocked",
        "start": 39.135
      },
      {
        "end": 39.575,
        "txt": "the",
        "start": 39.455
      },
      {
        "end": 40.051,
        "txt": "trail.",
        "start": 39.641
      },
      {
        "end": 40.931,
        "txt": "Mud",
        "start": 40.271
      },
      {
        "end": 41.33,
        "txt": "sucked",
        "start": 40.988
      },
      {
        "end": 41.408,
        "txt": "at",
        "start": 41.356
      },
      {
        "end": 41.564,
        "txt": "their",
        "start": 41.434
      },
      {
        "end": 42.6,
        "txt": "shoes.",
        "start": 41.67
      },
      {
        "end": 43,
        "txt": "Test",
        "start": 42.68
      },
      {
        "end": 43.4,
        "txt": "Character",
        "start": 43.04
      },
      {
        "end": 43.64,
        "txt": "took",
        "start": 43.448
      },
      {
        "end": 43.72,
        "txt": "a",
        "start": 43.68
      },
      {
        "end": 44.04,
        "txt": "slow",
        "start": 43.784
      },
      {
        "end": 45.08,
        "txt": "breath.",
        "start": 44.12
      },
      {
        "end": 45.32,
        "txt": "“I",
        "start": 45.16
      },
      {
        "end": 45.4,
        "txt": "can",
        "start": 45.34
      },
      {
        "end": 45.796,
        "txt": "solve",
        "start": 45.466
      },
      {
        "end": 46.436,
        "txt": "this,”",
        "start": 45.876
      },
      {
        "end": 46.676,
        "txt": "they",
        "start": 46.484
      },
      {
        "end": 47.796,
        "txt": "said.\n\nThey",
        "start": 46.756
      },
      {
        "end": 48.036,
        "txt": "found",
        "start": 47.836
      },
      {
        "end": 48.436,
        "txt": "flat",
        "start": 48.116
      },
      {
        "end": 48.832,
        "txt": "rocks",
        "start": 48.502
      },
      {
        "end": 49.072,
        "txt": "near",
        "start": 48.88
      },
      {
        "end": 49.152,
        "txt": "the",
        "start": 49.092
      },
      {
        "end": 49.709,
        "txt": "reeds.",
        "start": 49.205
      },
      {
        "end": 50.109,
        "txt": "They",
        "start": 49.789
      },
      {
        "end": 50.429,
        "txt": "stepped",
        "start": 50.149
      },
      {
        "end": 50.829,
        "txt": "rock",
        "start": 50.509
      },
      {
        "end": 50.988,
        "txt": "to",
        "start": 50.882
      },
      {
        "end": 51.468,
        "txt": "rock,",
        "start": 51.068
      },
      {
        "end": 51.944,
        "txt": "steady",
        "start": 51.536
      },
      {
        "end": 52.184,
        "txt": "and",
        "start": 52.004
      },
      {
        "end": 52.744,
        "txt": "calm.",
        "start": 52.28
      },
      {
        "end": 53.464,
        "txt": "One",
        "start": 52.924
      },
      {
        "end": 53.864,
        "txt": "rock",
        "start": 53.544
      },
      {
        "end": 54.42,
        "txt": "wobbled,",
        "start": 53.904
      },
      {
        "end": 54.5,
        "txt": "but",
        "start": 54.44
      },
      {
        "end": 54.66,
        "txt": "they",
        "start": 54.532
      },
      {
        "end": 54.9,
        "txt": "held",
        "start": 54.708
      },
      {
        "end": 55.54,
        "txt": "balance.",
        "start": 54.97
      },
      {
        "end": 56.02,
        "txt": "They",
        "start": 55.636
      },
      {
        "end": 56.82,
        "txt": "crossed,",
        "start": 56.1
      },
      {
        "end": 56.98,
        "txt": "then",
        "start": 56.852
      },
      {
        "end": 57.459,
        "txt": "giggled",
        "start": 57.044
      },
      {
        "end": 58.179,
        "txt": "softly.",
        "start": 57.539
      },
      {
        "end": 58.899,
        "txt": "...",
        "start": 58.359
      },
      {
        "end": 59.058,
        "txt": "At",
        "start": 58.952
      },
      {
        "end": 59.296,
        "txt": "Willow",
        "start": 59.092
      },
      {
        "end": 59.694,
        "txt": "Creek,",
        "start": 59.349
      },
      {
        "end": 59.774,
        "txt": "the",
        "start": 59.714
      },
      {
        "end": 60.092,
        "txt": "water",
        "start": 59.827
      },
      {
        "end": 60.571,
        "txt": "hummed",
        "start": 60.172
      },
      {
        "end": 60.811,
        "txt": "and",
        "start": 60.631
      },
      {
        "end": 61.451,
        "txt": "flashed.",
        "start": 60.881
      },
      {
        "end": 61.931,
        "txt": "The",
        "start": 61.571
      },
      {
        "end": 62.331,
        "txt": "map’s",
        "start": 61.991
      },
      {
        "end": 62.731,
        "txt": "star",
        "start": 62.411
      },
      {
        "end": 63.131,
        "txt": "pointed",
        "start": 62.781
      },
      {
        "end": 63.29,
        "txt": "to",
        "start": 63.184
      },
      {
        "end": 63.37,
        "txt": "a",
        "start": 63.33
      },
      {
        "end": 63.769,
        "txt": "fallen",
        "start": 63.427
      },
      {
        "end": 64.249,
        "txt": "log.",
        "start": 63.869
      },
      {
        "end": 64.969,
        "txt": "Under",
        "start": 64.369
      },
      {
        "end": 65.209,
        "txt": "it",
        "start": 65.049
      },
      {
        "end": 65.369,
        "txt": "sat",
        "start": 65.249
      },
      {
        "end": 65.449,
        "txt": "a",
        "start": 65.409
      },
      {
        "end": 65.845,
        "txt": "small",
        "start": 65.515
      },
      {
        "end": 66.244,
        "txt": "wooden",
        "start": 65.902
      },
      {
        "end": 67.364,
        "txt": "box.\n\nThe",
        "start": 66.384
      },
      {
        "end": 67.684,
        "txt": "box",
        "start": 67.444
      },
      {
        "end": 67.844,
        "txt": "had",
        "start": 67.724
      },
      {
        "end": 67.924,
        "txt": "a",
        "start": 67.884
      },
      {
        "end": 68.322,
        "txt": "twisty",
        "start": 67.977
      },
      {
        "end": 68.642,
        "txt": "knot",
        "start": 68.386
      },
      {
        "end": 68.802,
        "txt": "and",
        "start": 68.682
      },
      {
        "end": 68.958,
        "txt": "would",
        "start": 68.828
      },
      {
        "end": 69.198,
        "txt": "not",
        "start": 69.018
      },
      {
        "end": 69.678,
        "txt": "open.",
        "start": 69.278
      },
      {
        "end": 70.398,
        "txt": "Test",
        "start": 69.822
      },
      {
        "end": 70.798,
        "txt": "Character",
        "start": 70.438
      },
      {
        "end": 71.118,
        "txt": "felt",
        "start": 70.862
      },
      {
        "end": 71.676,
        "txt": "stuck",
        "start": 71.211
      },
      {
        "end": 71.836,
        "txt": "and",
        "start": 71.716
      },
      {
        "end": 71.916,
        "txt": "a",
        "start": 71.876
      },
      {
        "end": 72.07,
        "txt": "little",
        "start": 71.938
      },
      {
        "end": 72.71,
        "txt": "mad.",
        "start": 72.21
      },
      {
        "end": 73.268,
        "txt": "Their",
        "start": 72.803
      },
      {
        "end": 73.667,
        "txt": "cheeks",
        "start": 73.325
      },
      {
        "end": 74.066,
        "txt": "warmed",
        "start": 73.724
      },
      {
        "end": 74.306,
        "txt": "like",
        "start": 74.114
      },
      {
        "end": 74.546,
        "txt": "hot",
        "start": 74.366
      },
      {
        "end": 75.63,
        "txt": "cocoa.\n\nThey",
        "start": 74.652
      },
      {
        "end": 75.63,
        "txt": "sat",
        "start": 75.63
      },
      {
        "end": 75.63,
        "txt": "down",
        "start": 75.63
      },
      {
        "end": 75.63,
        "txt": "and",
        "start": 75.63
      },
      {
        "end": 75.63,
        "txt": "listened",
        "start": 75.63
      },
      {
        "end": 75.63,
        "txt": "to",
        "start": 75.63
      },
      {
        "end": 75.63,
        "txt": "the",
        "start": 75.63
      },
      {
        "end": 75.63,
        "txt": "creek.",
        "start": 75.63
      },
      {
        "end": 75.63,
        "txt": "“Try",
        "start": 75.63
      },
      {
        "end": 75.63,
        "txt": "again,",
        "start": 75.63
      },
      {
        "end": 75.63,
        "txt": "gently,”",
        "start": 75.63
      },
      {
        "end": 75.822,
        "txt": "they",
        "start": 75.63
      },
      {
        "end": 75.822,
        "txt": "whispered.",
        "start": 75.822
      },
      {
        "end": 75.822,
        "txt": "They",
        "start": 75.822
      },
      {
        "end": 75.822,
        "txt": "wiggled",
        "start": 75.822
      },
      {
        "end": 75.822,
        "txt": "the",
        "start": 75.822
      },
      {
        "end": 75.822,
        "txt": "knot,",
        "start": 75.822
      },
      {
        "end": 75.822,
        "txt": "slow",
        "start": 75.822
      },
      {
        "end": 75.822,
        "txt": "and",
        "start": 75.822
      },
      {
        "end": 75.822,
        "txt": "patient.",
        "start": 75.822
      },
      {
        "end": 75.822,
        "txt": "The",
        "start": 75.822
      },
      {
        "end": 75.822,
        "txt": "knot",
        "start": 75.822
      },
      {
        "end": 75.822,
        "txt": "loosened",
        "start": 75.822
      },
      {
        "end": 75.822,
        "txt": "with",
        "start": 75.822
      },
      {
        "end": 75.822,
        "txt": "a",
        "start": 75.822
      },
      {
        "end": 75.822,
        "txt": "tiny",
        "start": 75.822
      },
      {
        "end": 75.822,
        "txt": "pop.",
        "start": 75.822
      },
      {
        "end": 75.822,
        "txt": "...",
        "start": 75.822
      },
      {
        "end": 75.822,
        "txt": "Inside",
        "start": 75.822
      },
      {
        "end": 75.822,
        "txt": "was",
        "start": 75.822
      },
      {
        "end": 75.822,
        "txt": "a",
        "start": 75.822
      },
      {
        "end": 75.822,
        "txt": "shiny",
        "start": 75.822
      },
      {
        "end": 75.822,
        "txt": "compass",
        "start": 75.822
      },
      {
        "end": 76.622,
        "txt": "and",
        "start": 75.822
      },
      {
        "end": 77.096,
        "txt": "a",
        "start": 77.096
      },
      {
        "end": 77.096,
        "txt": "note.",
        "start": 77.096
      },
      {
        "end": 77.096,
        "txt": "It",
        "start": 77.096
      },
      {
        "end": 77.096,
        "txt": "said,",
        "start": 77.096
      },
      {
        "end": 77.096,
        "txt": "“Bravery",
        "start": 77.096
      },
      {
        "end": 77.096,
        "txt": "is",
        "start": 77.096
      },
      {
        "end": 77.096,
        "txt": "asking",
        "start": 77.096
      },
      {
        "end": 77.096,
        "txt": "for",
        "start": 77.096
      },
      {
        "end": 77.096,
        "txt": "help,",
        "start": 77.096
      },
      {
        "end": 77.096,
        "txt": "too.”",
        "start": 77.096
      },
      {
        "end": 77.096,
        "txt": "Test",
        "start": 77.096
      },
      {
        "end": 77.096,
        "txt": "Character",
        "start": 77.096
      },
      {
        "end": 77.096,
        "txt": "smiled",
        "start": 77.096
      },
      {
        "end": 77.096,
        "txt": "and",
        "start": 77.096
      },
      {
        "end": 77.096,
        "txt": "headed",
        "start": 77.096
      },
      {
        "end": 77.096,
        "txt": "home.\n\nOn",
        "start": 77.096
      },
      {
        "end": 77.176,
        "txt": "the",
        "start": 77.116
      },
      {
        "end": 80.693,
        "txt": "way,",
        "start": 77.736
      },
      {
        "end": 80.693,
        "txt": "they",
        "start": 80.693
      },
      {
        "end": 80.693,
        "txt": "met",
        "start": 80.693
      },
      {
        "end": 80.693,
        "txt": "a",
        "start": 80.693
      },
      {
        "end": 80.693,
        "txt": "younger",
        "start": 80.693
      },
      {
        "end": 80.693,
        "txt": "kid,",
        "start": 80.693
      },
      {
        "end": 80.693,
        "txt": "Kai,",
        "start": 80.693
      },
      {
        "end": 80.693,
        "txt": "who",
        "start": 80.693
      },
      {
        "end": 80.693,
        "txt": "looked",
        "start": 80.693
      },
      {
        "end": 80.693,
        "txt": "lost.",
        "start": 80.693
      },
      {
        "end": 80.693,
        "txt": "Test",
        "start": 80.693
      },
      {
        "end": 80.693,
        "txt": "Character",
        "start": 80.693
      },
      {
        "end": 80.693,
        "txt": "showed",
        "start": 80.693
      },
      {
        "end": 80.693,
        "txt": "the",
        "start": 80.693
      },
      {
        "end": 80.693,
        "txt": "compass",
        "start": 80.693
      },
      {
        "end": 80.693,
        "txt": "and",
        "start": 80.693
      },
      {
        "end": 80.693,
        "txt": "the",
        "start": 80.693
      },
      {
        "end": 81.253,
        "txt": "path.",
        "start": 80.693
      },
      {
        "end": 81.765,
        "txt": "Together",
        "start": 81.381
      },
      {
        "end": 81.893,
        "txt": "they",
        "start": 81.765
      },
      {
        "end": 82.104,
        "txt": "walked",
        "start": 81.933
      },
      {
        "end": 82.104,
        "txt": "back",
        "start": 82.104
      },
      {
        "end": 82.104,
        "txt": "to",
        "start": 82.104
      },
      {
        "end": 82.104,
        "txt": "Pinecone",
        "start": 82.104
      },
      {
        "end": 82.104,
        "txt": "Park.\n\nAuntie",
        "start": 82.104
      },
      {
        "end": 82.104,
        "txt": "Jo",
        "start": 82.104
      },
      {
        "end": 82.21,
        "txt": "hugged",
        "start": 82.104
      },
      {
        "end": 83.33,
        "txt": "them",
        "start": 82.23
      },
      {
        "end": 83.33,
        "txt": "both.",
        "start": 83.33
      },
      {
        "end": 83.33,
        "txt": "Test",
        "start": 83.33
      },
      {
        "end": 83.33,
        "txt": "Character",
        "start": 83.33
      },
      {
        "end": 83.33,
        "txt": "felt",
        "start": 83.33
      },
      {
        "end": 83.33,
        "txt": "proud",
        "start": 83.33
      },
      {
        "end": 83.33,
        "txt": "and",
        "start": 83.33
      },
      {
        "end": 83.33,
        "txt": "steady",
        "start": 83.33
      },
      {
        "end": 84.29,
        "txt": "inside.",
        "start": 83.33
      },
      {
        "end": 84.85,
        "txt": "The",
        "start": 84.43
      },
      {
        "end": 85.45,
        "txt": "wind",
        "start": 85.45
      },
      {
        "end": 85.57,
        "txt": "sounded",
        "start": 85.45
      },
      {
        "end": 95.644,
        "txt": "like",
        "start": 85.81
      },
      {
        "end": 95.644,
        "txt": "clapping",
        "start": 95.644
      },
      {
        "end": 95.644,
        "txt": "through",
        "start": 95.644
      },
      {
        "end": 98.2,
        "txt": "the",
        "start": 97.512
      },
      {
        "end": 113.777,
        "txt": "trees.",
        "start": 100.198
      }
    ],
    "audio_blocks": {
      "a": "<span data-start=\"0.000\" data-end=\"0.240\">Test</span> <span data-start=\"0.288\" data-end=\"0.720\">Character</span> <span data-start=\"0.800\" data-end=\"1.040\">was</span> <span data-start=\"1.106\" data-end=\"1.676\">seven,</span> <span data-start=\"1.742\" data-end=\"2.152\">brave,</span> <span data-start=\"2.192\" data-end=\"2.312\">and</span> <span data-start=\"2.392\" data-end=\"2.712\">very</span> <span data-start=\"2.792\" data-end=\"3.432\">curious.</span> <span data-start=\"3.544\" data-end=\"3.992\">They</span> <span data-start=\"4.032\" data-end=\"4.232\">lived</span> <span data-start=\"4.312\" data-end=\"4.472\">by</span> <span data-start=\"4.552\" data-end=\"5.032\">Pinecone</span> <span data-start=\"5.128\" data-end=\"5.592\">Park,</span> <span data-start=\"5.624\" data-end=\"5.752\">near</span> <span data-start=\"5.816\" data-end=\"6.072\">tall</span> <span data-start=\"6.165\" data-end=\"6.710\">trees.</span> <span data-start=\"6.800\" data-end=\"7.430\">Morning</span> <span data-start=\"7.530\" data-end=\"7.830\">air</span> <span data-start=\"7.870\" data-end=\"8.150\">smelled</span> <span data-start=\"8.182\" data-end=\"8.310\">like</span> <span data-start=\"8.390\" data-end=\"8.630\">wet</span> <span data-start=\"8.698\" data-end=\"9.106\">leaves</span> <span data-start=\"9.126\" data-end=\"9.186\">and</span> <span data-start=\"9.292\" data-end=\"10.622\">toast.\n\nOne</span> <span data-start=\"28.898\" data-end=\"29.438\">...</span> <span data-start=\"58.359\" data-end=\"58.899\">...</span> <span data-start=\"75.822\" data-end=\"75.822\">...</span> <span data-start=\"77.096\" data-end=\"77.096\">Test</span> <span data-start=\"77.096\" data-end=\"77.096\">Character</span> ",
      "b": "",
      "c": "",
      "d": ""
    },
    "audio_sfx_url": null,
    "audio_sfx_cues": null,
    "profile_id": null,
    "spatial_audio_tracks": null,
    "story_type_id": null,
    "hue_extracted_colors": {},
    "character": null,
    "profile": null,
    "library": {
      "id": "580e14b2-2d2f-4d36-9be4-8e95cbb1ca55",
      "name": "My Stories",
      "owner": "c72e39bb-a563-4989-a649-5c2f89527b61"
    },
    "hue": {
      "storyType": null,
      "storyTypeId": null,
      "storyBaseHex": null,
      "storyBaseBri": null,
      "intensity": null,
      "hueJoltPct": null,
      "hueJoltMs": null,
      "hueTtIn": null,
      "hueTtScene": null,
      "hueRotateEveryMs": null,
      "huePerBulbMs": null,
      "hueBreathePct": null,
      "hueBreathePeriodMs": null,
      "hueMotion": null,
      "huePauseStyle": null,
      "hueTempoMs": null,
      "hueLeadMs": null
    },
    "stats": {
      "plays": 0,
      "completions": 0,
      "avgCompletionRate": 0,
      "totalListenTime": 0,
      "lastPlayed": null
    },
    "feedbackSummary": {
      "total": 0,
      "positive": 0,
      "neutral": 0,
      "negative": 0,
      "averageRating": 0
    },
    "realtimeChannel": "stories:id=5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c",
    "subscribePattern": {
      "table": "stories",
      "filter": "id=eq.5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c",
      "event": "UPDATE"
    }
  }
}
``````

---

## 5) GET /api/v1/stories/:id/assets/status

```bash
curl -sS "https://api.storytailor.dev/api/v1/stories/<STORY_ID>/assets/status" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Success response (full JSON example)

Captured from production via `GET /api/v1/stories/5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c/assets/status`:

```json
{
  "success": true,
  "data": {
    "overall": "generating",
    "assets": {
      "pdf": {
        "status": "pending",
        "progress": 0
      },
      "audio": {
        "status": "pending",
        "progress": 0
      },
      "cover": {
        "url": "https://assets.storytailor.dev/images/cover-1767082442955-1767082442966.png",
        "status": "ready",
        "progress": 100
      },
      "content": {
        "status": "ready",
        "progress": 100
      },
      "scene_1": {
        "url": "https://assets.storytailor.dev/images/beat-1767082437136-1767082437137.png",
        "status": "ready",
        "progress": 100
      },
      "scene_2": {
        "url": "https://assets.storytailor.dev/images/beat-1767082439103-1767082439104.png",
        "status": "ready",
        "progress": 100
      },
      "scene_3": {
        "url": "https://assets.storytailor.dev/images/beat-1767082440031-1767082440043.png",
        "status": "ready",
        "progress": 100
      },
      "scene_4": {
        "url": "https://assets.storytailor.dev/images/beat-1767082437783-1767082437798.png",
        "status": "ready",
        "progress": 100
      },
      "activities": {
        "status": "pending",
        "progress": 0
      }
    },
    "jobs": [
      {
        "id": "e89189ac-972c-45d8-a3fb-e91ec599cdd4",
        "story_id": "5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c",
        "asset_type": "audio",
        "status": "ready",
        "started_at": "2025-12-30T08:08:22.435+00:00",
        "completed_at": "2025-12-30T08:09:06.415+00:00",
        "error_message": null,
        "retry_count": 0,
        "cost": 0.05,
        "metadata": {
          "priority": "normal"
        },
        "created_at": "2025-12-30T08:04:22.917815+00:00"
      },
      {
        "id": "3615241a-b854-4d09-9dbd-b1d1317a2451",
        "story_id": "5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c",
        "asset_type": "cover",
        "status": "ready",
        "started_at": "2025-12-30T08:08:22.561+00:00",
        "completed_at": "2025-12-30T08:09:01.181+00:00",
        "error_message": null,
        "retry_count": 0,
        "cost": 0.04,
        "metadata": {
          "priority": "normal"
        },
        "created_at": "2025-12-30T08:04:22.954265+00:00"
      },
      {
        "id": "b22b0e50-fb73-45a4-98ba-0418d0ffce54",
        "story_id": "5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c",
        "asset_type": "scene_1",
        "status": "ready",
        "started_at": "2025-12-30T08:08:22.663+00:00",
        "completed_at": "2025-12-30T08:09:01.679+00:00",
        "error_message": null,
        "retry_count": 0,
        "cost": 0.04,
        "metadata": {
          "priority": "normal"
        },
        "created_at": "2025-12-30T08:04:22.98924+00:00"
      },
      {
        "id": "8eaab424-407c-48ee-a709-67522ef74604",
        "story_id": "5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c",
        "asset_type": "scene_2",
        "status": "ready",
        "started_at": "2025-12-30T08:08:22.771+00:00",
        "completed_at": "2025-12-30T08:09:01.757+00:00",
        "error_message": null,
        "retry_count": 0,
        "cost": 0.04,
        "metadata": {
          "priority": "normal"
        },
        "created_at": "2025-12-30T08:04:23.028063+00:00"
      },
      {
        "id": "fda88a6f-69b5-45ef-ab25-84e102e69767",
        "story_id": "5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c",
        "asset_type": "scene_3",
        "status": "ready",
        "started_at": "2025-12-30T08:08:22.896+00:00",
        "completed_at": "2025-12-30T08:09:01.635+00:00",
        "error_message": null,
        "retry_count": 0,
        "cost": 0.04,
        "metadata": {
          "priority": "normal"
        },
        "created_at": "2025-12-30T08:04:23.062947+00:00"
      },
      {
        "id": "5986b77d-219a-4abc-91d2-f9c42de2582d",
        "story_id": "5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c",
        "asset_type": "scene_4",
        "status": "ready",
        "started_at": "2025-12-30T08:08:22.99+00:00",
        "completed_at": "2025-12-30T08:09:00.779+00:00",
        "error_message": null,
        "retry_count": 0,
        "cost": 0.04,
        "metadata": {
          "priority": "normal"
        },
        "created_at": "2025-12-30T08:04:23.096912+00:00"
      },
      {
        "id": "6c3787f6-255c-4ddd-b110-3afaddc96b50",
        "story_id": "5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c",
        "asset_type": "pdf",
        "status": "ready",
        "started_at": "2025-12-30T08:08:23.088+00:00",
        "completed_at": "2025-12-30T08:08:26.418+00:00",
        "error_message": null,
        "retry_count": 0,
        "cost": 0.01,
        "metadata": {
          "priority": "normal"
        },
        "created_at": "2025-12-30T08:04:23.143154+00:00"
      },
      {
        "id": "cae4aa1b-2588-49e3-94f7-74ec1428a02e",
        "story_id": "5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c",
        "asset_type": "qr",
        "status": "ready",
        "started_at": "2025-12-30T08:08:23.175+00:00",
        "completed_at": "2025-12-30T08:08:25.953+00:00",
        "error_message": null,
        "retry_count": 0,
        "cost": 0,
        "metadata": {
          "priority": "normal"
        },
        "created_at": "2025-12-30T08:04:23.182323+00:00"
      },
      {
        "id": "fc80ef94-0064-4691-85d2-7e3fdcdd51c7",
        "story_id": "5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c",
        "asset_type": "activities",
        "status": "ready",
        "started_at": "2025-12-30T08:08:23.263+00:00",
        "completed_at": "2025-12-30T08:08:25.55+00:00",
        "error_message": null,
        "retry_count": 0,
        "cost": 0.02,
        "metadata": {
          "priority": "normal"
        },
        "created_at": "2025-12-30T08:04:23.216761+00:00"
      },
      {
        "id": "18accfdf-bad3-47f6-a527-92c06976a09f",
        "story_id": "5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c",
        "asset_type": "cover",
        "status": "ready",
        "started_at": "2025-12-30T08:13:22.561+00:00",
        "completed_at": "2025-12-30T08:14:03.444+00:00",
        "error_message": null,
        "retry_count": 0,
        "cost": 0.04,
        "metadata": {},
        "created_at": "2025-12-30T08:10:44.289543+00:00"
      },
      {
        "id": "cccca28d-5502-4a8e-b09f-5f39b9e9187f",
        "story_id": "5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c",
        "asset_type": "scene_1",
        "status": "ready",
        "started_at": "2025-12-30T08:13:22.697+00:00",
        "completed_at": "2025-12-30T08:13:57.619+00:00",
        "error_message": null,
        "retry_count": 0,
        "cost": 0.04,
        "metadata": {},
        "created_at": "2025-12-30T08:10:44.682253+00:00"
      },
      {
        "id": "81058715-e38d-4195-894c-497640ff86ff",
        "story_id": "5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c",
        "asset_type": "scene_2",
        "status": "ready",
        "started_at": "2025-12-30T08:13:22.8+00:00",
        "completed_at": "2025-12-30T08:13:59.462+00:00",
        "error_message": null,
        "retry_count": 0,
        "cost": 0.04,
        "metadata": {},
        "created_at": "2025-12-30T08:10:44.724788+00:00"
      },
      {
        "id": "c6769f4e-4aa5-4812-83c7-d6405bfe55f3",
        "story_id": "5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c",
        "asset_type": "scene_3",
        "status": "ready",
        "started_at": "2025-12-30T08:13:22.902+00:00",
        "completed_at": "2025-12-30T08:14:00.468+00:00",
        "error_message": null,
        "retry_count": 0,
        "cost": 0.04,
        "metadata": {},
        "created_at": "2025-12-30T08:10:44.761508+00:00"
      },
      {
        "id": "ce7b441c-daca-4fdf-abf4-9b1c6ea0581b",
        "story_id": "5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c",
        "asset_type": "scene_4",
        "status": "ready",
        "started_at": "2025-12-30T08:13:22.986+00:00",
        "completed_at": "2025-12-30T08:13:58.219+00:00",
        "error_message": null,
        "retry_count": 0,
        "cost": 0.04,
        "metadata": {},
        "created_at": "2025-12-30T08:10:44.801203+00:00"
      },
      {
        "id": "320a306a-a6d5-42de-bd96-006d4901f82e",
        "story_id": "5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c",
        "asset_type": "activities",
        "status": "ready",
        "started_at": "2025-12-30T08:13:23.073+00:00",
        "completed_at": "2025-12-30T08:13:23.403+00:00",
        "error_message": null,
        "retry_count": 0,
        "cost": 0.02,
        "metadata": {},
        "created_at": "2025-12-30T08:10:44.825299+00:00"
      },
      {
        "id": "a7821941-63f7-4f61-9053-510c525dafac",
        "story_id": "5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c",
        "asset_type": "audio",
        "status": "ready",
        "started_at": "2025-12-30T08:13:23.156+00:00",
        "completed_at": "2025-12-30T08:14:07.263+00:00",
        "error_message": null,
        "retry_count": 0,
        "cost": 0.05,
        "metadata": {},
        "created_at": "2025-12-30T08:10:44.852213+00:00"
      },
      {
        "id": "64aef399-9392-4717-ac3f-e9df9c83ac19",
        "story_id": "5a3436e7-ccc0-4a2d-926c-a7cc33c0be9c",
        "asset_type": "pdf",
        "status": "failed",
        "started_at": "2025-12-30T08:13:23.247+00:00",
        "completed_at": "2025-12-30T08:13:24.267+00:00",
        "error_message": "Failed to generate PDF: Cannot read properties of undefined (reading 'length')",
        "retry_count": 0,
        "cost": null,
        "metadata": {},
        "created_at": "2025-12-30T08:10:44.881104+00:00"
      }
    ],
    "startedAt": "2025-12-30T08:04:22.857+00:00",
    "completedAt": null
  }
}
``````

---

## Error code meanings + retryability (common)

- **401/403 auth**: NOT retryable until token/permissions fixed.
- **402 quota**: NOT retryable until subscription/credits change.
- **500**:
  - Often retryable for GETs.
  - For asset generation: prefer `/api/v1/stories/:id/assets` or job replay (see TROUBLESHOOTING).



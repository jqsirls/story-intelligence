# Lifecycle State Machines

> **Version**: 1.0  
> **Last Updated**: December 23, 2025  
> **Status**: Canonical Reference

This document defines the canonical state machines for all stateful resources in the Storytailor® platform. All implementations MUST follow these state transitions. Deviations require architecture review.

---

## 1. Story Lifecycle

### 1.1 State Diagram

```
                    ┌─────────────┐
                    │   draft     │
                    └──────┬──────┘
                           │ generate()
                           ▼
                    ┌─────────────┐
            ┌───────│  generating │───────┐
            │       └──────┬──────┘       │
            │              │              │
      fail()│              │complete()    │timeout()
            │              │              │
            ▼              ▼              ▼
     ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
     │   failed    │ │    ready    │ │   stale     │
     └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
            │              │              │
      retry()│         archive()      recover()
            │              │              │
            ▼              ▼              ▼
     ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
     │  generating │ │  archived   │ │    ready    │
     └─────────────┘ └──────┬──────┘ └─────────────┘
                           │
                     restore()
                           │
                           ▼
                    ┌─────────────┐
                    │    ready    │
                    └─────────────┘
```

### 1.2 States

| State | Description | Allowed Actions |
|-------|-------------|-----------------|
| `draft` | Story text exists, no assets generated | generate, delete |
| `generating` | Assets being created | cancel, wait |
| `ready` | All assets available | read, archive, share, regenerate |
| `failed` | Generation failed | retry, delete |
| `stale` | Generation timed out | recover, delete |
| `archived` | Soft deleted | restore (30 days) |

### 1.3 Transitions

| From | To | Trigger | Side Effects | Idempotent |
|------|-----|---------|--------------|------------|
| `draft` | `generating` | generate() | Reserve quota, start jobs | Yes |
| `generating` | `ready` | complete() | Send email, release lock | Yes |
| `generating` | `failed` | fail() | Log error, notify parent | Yes |
| `generating` | `stale` | timeout (5min) | Auto-cleanup | Yes |
| `failed` | `generating` | retry() | No new quota | Yes |
| `stale` | `ready` | recover() | Retry generation | Yes |
| `ready` | `archived` | archive() | Soft delete | Yes |
| `archived` | `ready` | restore() | Undelete | Yes |
| `archived` | (deleted) | expire (30 days) | Hard delete | N/A |

### 1.4 Story Status API

```typescript
interface StoryStatus {
  id: string;
  status: 'draft' | 'generating' | 'ready' | 'failed' | 'stale' | 'archived';
  createdAt: string;
  updatedAt: string;
  generationStartedAt?: string;
  generationCompletedAt?: string;
  failureReason?: string;
  archivedAt?: string;
  deletionScheduledAt?: string;
}
```

---

## 2. Asset Lifecycle

### 2.1 State Diagram

```
                    ┌─────────────┐
                    │   pending   │
                    └──────┬──────┘
                           │ start()
                           ▼
                    ┌─────────────┐
            ┌───────│  generating │───────┐
            │       └──────┬──────┘       │
            │              │              │
      fail()│              │complete()    │timeout()
            │              │              │
            ▼              ▼              ▼
     ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
     │   failed    │ │    ready    │ │   stale     │
     └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
            │              │              │
      retry()│       regenerate()     retry()
            │              │              │
            ▼              ▼              ▼
     ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
     │  generating │ │  generating │ │  generating │
     └─────────────┘ └─────────────┘ └─────────────┘
                           │
                           │
                           ▼
                    ┌─────────────┐
                    │    ready    │ (new version)
                    └─────────────┘
```

### 2.2 Asset Types

| Type | Description | Generation Time | Storage |
|------|-------------|-----------------|---------|
| `cover_art` | Story cover image | 10-30s | S3 |
| `chapter_art` | Per-chapter illustrations | 15-45s | S3 |
| `audio` | Full story narration | 30-120s | S3 |
| `webvtt` | Word-level sync data | 5-10s | S3 |
| `pdf` | Printable storybook | 10-30s | S3 |
| `qr_code` | Story sharing QR | <1s | S3 |
| `activities` | Educational activities | 5-15s | Database |

### 2.3 States

| State | Description | Allowed Actions |
|-------|-------------|-----------------|
| `pending` | Queued for generation | cancel |
| `generating` | Currently being created | wait |
| `ready` | Available for use | download, regenerate |
| `failed` | Generation failed | retry |
| `stale` | Timed out | retry |

### 2.4 Transitions

| From | To | Trigger | Consumes Quota | Idempotent |
|------|-----|---------|----------------|------------|
| `pending` | `generating` | start() | Reserved at pending | Yes |
| `generating` | `ready` | complete() | Confirmed | Yes |
| `generating` | `failed` | fail() | Held for retry | Yes |
| `generating` | `stale` | timeout (5min) | Held for retry | Yes |
| `failed` | `generating` | retry() | No (uses reserved) | Yes |
| `stale` | `generating` | retry() | No (uses reserved) | Yes |
| `ready` | `generating` | regenerate() | Yes (new quota) | No |

### 2.5 Asset Status API

```typescript
interface AssetStatus {
  id: string;
  storyId: string;
  type: 'cover_art' | 'chapter_art' | 'audio' | 'webvtt' | 'pdf' | 'qr_code' | 'activities';
  status: 'pending' | 'generating' | 'ready' | 'failed' | 'stale';
  url?: string;          // Presigned URL when ready
  version: number;       // Increments on regeneration
  generationAttempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;    // For presigned URLs
}
```

---

## 3. Conversation Lifecycle

### 3.1 State Diagram

```
                    ┌─────────────┐
                    │   created   │
                    └──────┬──────┘
                           │ start()
                           ▼
                    ┌─────────────┐
            ┌───────│   active    │◄──────┐
            │       └──────┬──────┘       │
            │              │              │
     pause()│              │complete()    │resume()
            │              │              │
            ▼              ▼              │
     ┌─────────────┐ ┌─────────────┐      │
     │   paused    │ │  completed  │      │
     └──────┬──────┘ └─────────────┘      │
            │                             │
            └─────────────────────────────┘
            
            │ (30min idle)
            ▼
     ┌─────────────┐
     │  abandoned  │
     └─────────────┘
```

### 3.2 States

| State | Description | Allowed Actions |
|-------|-------------|-----------------|
| `created` | Session initialized | start |
| `active` | User engaged in conversation | message, pause, complete |
| `paused` | User temporarily away | resume |
| `completed` | Story/task finished | view_summary |
| `abandoned` | Idle timeout (30min) | none (auto-closed) |

### 3.3 Transitions

| From | To | Trigger | Side Effects |
|------|-----|---------|--------------|
| `created` | `active` | start() | Begin tracking |
| `active` | `active` | message() | Update timestamp |
| `active` | `paused` | pause() | Save state |
| `active` | `completed` | complete() | Generate story, cleanup |
| `paused` | `active` | resume() | Restore context |
| `paused` | `abandoned` | idle_timeout (30min) | Cleanup, log |
| `active` | `abandoned` | idle_timeout (30min) | Save draft, cleanup |

### 3.4 Session State API

```typescript
interface ConversationSession {
  id: string;
  userId: string;
  profileId?: string;    // Child profile if applicable
  channel: 'alexa' | 'web' | 'mobile' | 'api';
  status: 'created' | 'active' | 'paused' | 'completed' | 'abandoned';
  phase: 'greeting' | 'character_creation' | 'story_building' | 'conclusion';
  context: {
    storyId?: string;
    characterId?: string;
    currentTurn: number;
    emotionState?: string;
  };
  startedAt: string;
  lastActivityAt: string;
  completedAt?: string;
  abandonedAt?: string;
}
```

---

## 4. Transfer Lifecycle

### 4.1 State Diagram

```
                    ┌─────────────┐
                    │   pending   │
                    └──────┬──────┘
                      ┌────┼────┐
                      │    │    │
              accept()│    │    │decline()
                      │    │    │
                      ▼    │    ▼
               ┌──────────┐│┌──────────┐
               │ accepted ││ declined │
               └──────────┘│└──────────┘
                           │
                     expire()│(7 days)
                           │
                           ▼
                    ┌─────────────┐
                    │   expired   │
                    └─────────────┘
```

### 4.2 States

| State | Description | Allowed Actions |
|-------|-------------|-----------------|
| `pending` | Awaiting recipient response | accept, decline |
| `accepted` | Transfer completed | none |
| `declined` | Recipient rejected | none |
| `expired` | No response (7 days) | none |

### 4.3 Transfer Types

| Type | Description | Transfers |
|------|-------------|-----------|
| `story` | Single story | Ownership |
| `character` | Single character | Ownership |
| `library_access` | Library invitation | Access rights |

---

## 5. Subscription Lifecycle

### 5.1 State Diagram

```
                    ┌─────────────┐
                    │    free     │
                    └──────┬──────┘
                           │ subscribe()
                           ▼
                    ┌─────────────┐
            ┌───────│   active    │───────┐
            │       └──────┬──────┘       │
            │              │              │
     cancel()│              │renew()       │payment_failed()
            │              │              │
            ▼              ▼              ▼
     ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
     │ cancelling  │ │   active    │ │   past_due  │
     └──────┬──────┘ └─────────────┘ └──────┬──────┘
            │                              │
     period_end()                    retry_payment()
            │                              │
            ▼                              ▼
     ┌─────────────┐               ┌─────────────┐
     │  cancelled  │               │   active    │
     └──────┬──────┘               └─────────────┘
            │
     resubscribe()
            │
            ▼
     ┌─────────────┐
     │   active    │
     └─────────────┘
```

### 5.2 States

| State | Description | Access Level |
|-------|-------------|--------------|
| `free` | No paid subscription | Free tier |
| `active` | Paid and current | Full tier access |
| `past_due` | Payment failed | Grace period (7 days) |
| `cancelling` | Pending end of period | Full until period end |
| `cancelled` | Subscription ended | Reverts to free |

---

## 6. Emotion Check-In Lifecycle

### 6.1 States

Emotion check-ins are **append-only** and don't have state transitions. However, they have visibility states:

| Visibility | Description | Who Can See |
|------------|-------------|-------------|
| `active` | Recent check-in | Parent, child (their own) |
| `aggregated` | Part of pattern analysis | Parent |
| `archived` | Older than 30 days | Deleted |

### 6.2 Crisis Escalation

When a check-in triggers crisis detection:

```
check_in → detect_crisis → create_alert → notify_parent
                               │
                               ├── acknowledged → resolved
                               │
                               └── (24h) → escalate → re_notify
```

---

## 7. Job Lifecycle (Asset Generation)

### 7.1 State Diagram

```
     ┌─────────────┐
     │   queued    │
     └──────┬──────┘
            │ pick_up()
            ▼
     ┌─────────────┐
     │  processing │
     └──────┬──────┘
       ┌────┼────┐
       │    │    │
 fail()│    │    │complete()
       │    │    │
       ▼    │    ▼
┌──────────┐│┌──────────┐
│  failed  │││ completed│
└──────────┘│└──────────┘
            │
      cancel()
            │
            ▼
     ┌─────────────┐
     │  cancelled  │
     └─────────────┘
```

### 7.2 Job Priority

| Priority | Queue | Max Wait | Examples |
|----------|-------|----------|----------|
| `critical` | Dedicated | 10s | Story generation |
| `high` | Shared | 30s | Audio generation |
| `normal` | Shared | 2min | PDF generation |
| `low` | Background | 5min | Activities, QR |

---

## 8. API Status Codes by State

### 8.1 Story Status

| State | GET | POST (generate) | DELETE |
|-------|-----|-----------------|--------|
| `draft` | 200 | 202 | 200 |
| `generating` | 200 | 409 (in progress) | 409 |
| `ready` | 200 | 200 (regenerate) | 200 |
| `failed` | 200 | 202 (retry) | 200 |
| `archived` | 404 | 409 | 200 (restore) |

### 8.2 Asset Status

| State | GET | POST (retry) | POST (regenerate) |
|-------|-----|--------------|-------------------|
| `pending` | 200 | 409 | 409 |
| `generating` | 200 | 409 | 409 |
| `ready` | 200 | 409 | 202 |
| `failed` | 200 | 202 | 409 |
| `stale` | 200 | 202 | 409 |

---

## 9. Implementation Notes

### 9.1 Atomic State Transitions

All state transitions MUST be atomic:

```typescript
// Good: Atomic update
await supabase
  .from('stories')
  .update({ status: 'generating' })
  .eq('id', storyId)
  .eq('status', 'draft'); // Only if still draft

// Bad: Non-atomic (race condition)
const story = await getStory(storyId);
if (story.status === 'draft') {
  await updateStory(storyId, { status: 'generating' });
}
```

### 9.2 State Machine Validation

Use a state machine library or validation:

```typescript
const validTransitions: Record<StoryStatus, StoryStatus[]> = {
  'draft': ['generating'],
  'generating': ['ready', 'failed', 'stale'],
  'ready': ['archived', 'generating'], // regenerate
  'failed': ['generating'], // retry
  'stale': ['generating', 'ready'],
  'archived': ['ready'], // restore
};

function canTransition(from: StoryStatus, to: StoryStatus): boolean {
  return validTransitions[from]?.includes(to) ?? false;
}
```

### 9.3 Timeout Handling

Use scheduled jobs for timeout transitions:

```typescript
// Check for stale generations every minute
cron.schedule('* * * * *', async () => {
  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 min
  
  await supabase
    .from('stories')
    .update({ status: 'stale' })
    .eq('status', 'generating')
    .lt('generation_started_at', staleThreshold.toISOString());
});
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-12-23 | Initial release |

---

*See also: [System Behavior Guarantees](./SYSTEM_BEHAVIOR_GUARANTEES.md) for retry and idempotency rules.*


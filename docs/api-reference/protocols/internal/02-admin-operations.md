# Internal — Admin Operations (Recommended)

## Goal

Provide safe operational controls for incident response and maintenance.

## Recommended endpoints

- `POST /internal/admin/cache/flush`
- `POST /internal/admin/tasks/retry`
- `POST /internal/admin/maintenance/enable`
- `POST /internal/admin/maintenance/disable`

## Example: task retry

```json
{
  "taskId": "uuid",
  "reason": "manual remediation"
}
```

Response:

```json
{
  "success": true,
  "taskId": "uuid",
  "status": "requeued"
}
```

## Security requirements

- Admin JWT scope required
- Full audit logging required

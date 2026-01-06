# REST API — Commerce Endpoints — Exhaustive

## Status (Production)

The production REST gateway (`packages/universal-agent/src/api/RESTAPIGateway.ts`) does **not** currently register `/api/v1/commerce/*` routes.

Commerce endpoints are currently defined at the **OpenAPI contract** layer:
- [`api/openapi-specification.yaml`](../../../../api/openapi-specification.yaml)

These endpoints may be served by a separate commerce service/agent or represent planned endpoints.

This document exhaustively documents the **contracted** endpoints and payloads.

## Base path

OpenAPI contract paths:
- `/v1/commerce/*`

> Note: This differs from the gateway prefix `/api/v1/*`.

## 1) List subscriptions — `GET /v1/commerce/subscriptions`

### Auth

- `Authorization: Bearer [REDACTED_JWT]

### Response

#### 200 OK

```json
{
  "subscriptions": [
    {
      "id": "sub_123",
      "status": "active",
      "plan": "monthly_premium",
      "currentPeriodEnd": "2025-12-31T00:00:00Z",
      "cancelAtPeriodEnd": false
    }
  ]
}
```

#### 401 Unauthorized

```json
{
  "success": false,
  "error": "Unauthorized",
  "code": "UNAUTHORIZED"
}
```

## 2) Create subscription — `POST /v1/commerce/subscribe`

### Request body

```json
{
  "plan": "monthly_premium|yearly_premium|family_monthly|family_yearly",
  "paymentMethodId": "string",
  "coupon": "string (optional)"
}
```

### Responses

#### 201 Created

```json
{
  "id": "sub_123",
  "status": "active",
  "plan": "monthly_premium",
  "currentPeriodEnd": "2025-12-31T00:00:00Z",
  "cancelAtPeriodEnd": false
}
```

#### 400 Bad Request

```json
{
  "success": false,
  "error": "Invalid request",
  "code": "BAD_REQUEST"
}
```

#### 402 Payment Required

```json
{
  "success": false,
  "error": "Payment required",
  "code": "PAYMENT_REQUIRED"
}
```

## Stripe Integration Notes

The OpenAPI contract references Stripe identifiers:
- `paymentMethodId`: Stripe payment method ID
- `id`: Stripe subscription ID

Implementation details depend on the commerce agent/service and are not present in the gateway code.

## Examples

### cURL — subscribe

```bash
curl -sS -X POST "https://api.storytailor.dev/v1/commerce/subscribe" \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "monthly_premium",
    "paymentMethodId": "pm_123"
  }'
```

# Internal / Admin Endpoints — Overview

This section documents internal-only operational endpoints.

## Status (Current code)

The production REST gateway primarily exposes:
- `/health`
- `/api/v1/*` customer/partner endpoints
- `/a2a/*` A2A endpoints

It does **not** currently register a separate internal-only prefix such as `/internal/*`.

Therefore, this folder defines the **recommended internal endpoint set** and how to implement it safely.

## Access controls (required)

Internal endpoints SHOULD require one or more of:
- IP allowlists
- VPN / private networking
- mutual TLS
- admin JWT scopes
- separate auth provider

## Logging and PII

Internal endpoints must not leak:
- service role keys
- customer PII
- raw tokens

## Related

- Public health endpoint: `../rest/02-health-endpoints.md`
- A2A health url field: `../a2a/02-discovery.md`

# Internal — Monitoring Endpoints (Recommended)

## Goal

Expose metrics and diagnostics to monitoring systems.

## Recommended endpoints

- `GET /internal/metrics` (Prometheus format)
- `GET /internal/logs/recent` (restricted)
- `GET /internal/traces/recent` (restricted)

## Prometheus example

```text
# HELP storytailor_requests_total Total HTTP requests
# TYPE storytailor_requests_total counter
storytailor_requests_total{route="/api/v1/stories",method="GET"} 123
```

## Security requirements

- Protect all monitoring endpoints
- Avoid exposing raw logs externally

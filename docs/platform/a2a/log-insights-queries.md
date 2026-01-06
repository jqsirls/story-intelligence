# A2A Log Insights Queries

## Failed Authentication Attempts

```sql
fields @timestamp, @message
| filter @message like /Authentication failed/ and @message like /a2a/
| sort @timestamp desc
| limit 100
```

## Task State Transitions

```sql
fields @timestamp, @message
| filter @message like /task.*state/ or @message like /Task.*state/
| parse @message /state[:\s]+(?<state>\w+)/ 
| stats count() by state
| sort count desc
```

## Router Integration Errors

```sql
fields @timestamp, @message, @logStream
| filter @message like /Router.*error/ or @message like /router.*error/
| sort @timestamp desc
| limit 50
```

## Request Rate per API Key

```sql
fields @timestamp, @message
| filter @message like /a2a/ and @message like /X-API-Key/
| parse @message /X-API-Key[:\s]+(?<apiKey>[^\s,}]+)/
| stats count() by apiKey
| sort count desc
```

## Authentication Success/Failure Rates

```sql
fields @timestamp, @message, statusCode
| filter @message like /a2a/ and (statusCode = 200 or statusCode = 401 or statusCode = 403)
| stats count() by statusCode
```

## Task Completion Rates

```sql
fields @timestamp, @message
| filter @message like /task.*completed/ or @message like /Task.*completed/
| stats count() by bin(5m)
| sort @timestamp desc
```

## Response Times for A2A Endpoints

```sql
fields @timestamp, @duration, @message
| filter @message like /a2a/
| stats avg(@duration), max(@duration), min(@duration) by bin(5m)
| sort @timestamp desc
```

## API Key Usage Anomalies

```sql
fields @timestamp, @message
| filter @message like /a2a/ and @message like /X-API-Key/
| parse @message /X-API-Key[:\s]+(?<apiKey>[^\s,}]+)/
| stats count() by apiKey, bin(1h)
| sort count desc
```

## Error Rate by Endpoint

```sql
fields @timestamp, @message, path
| filter @message like /a2a/ and (statusCode >= 400)
| parse @message /path[:\s"']+(?<path>[^"'\s}]+)/
| stats count() by path
| sort count desc
```

## Top Error Messages

```sql
fields @timestamp, @message, error
| filter @message like /a2a/ and error != ""
| stats count() by error
| sort count desc
| limit 20
```

# A2A (Agent-to-Agent) Protocol - Cost Analysis

**Last Updated**: 2025-12-17

## Overview

The A2A adapter's operational costs are shared with the Universal Agent Lambda function, as the A2A adapter is bundled with Universal Agent. Additional costs come from Supabase database storage for task state and optional Redis caching.

## Key Cost Drivers

1. **AWS Lambda (Shared with Universal Agent)**:
   - **Pricing Model**: Based on requests and compute duration (GB-seconds)
   - **Impact**: Medium - A2A endpoints are part of Universal Agent invocations
   - **Optimization**:
     - **Memory Allocation**: Currently 512 MB (shared) - monitor and optimize if needed
     - **Code Efficiency**: Ensure efficient code execution to minimize duration
     - **Caching**: Cache Agent Card and task state to reduce processing

2. **Supabase (PostgreSQL)**:
   - **Pricing Model**: Based on database size, compute resources, and API requests
   - **Impact**: Low to Medium - Used for storing A2A task state in `a2a_tasks` table
   - **Optimization**:
     - **Connection Pooling**: Use connection pooling to minimize database connections
     - **Query Optimization**: Ensure efficient database queries and indexes on frequently accessed fields (task_id, state, client_agent_id)
     - **Data Retention**: Implement data retention policies to minimize storage costs (e.g., archive completed tasks after 90 days)

3. **CloudWatch Logs**:
   - **Pricing Model**: Based on log ingestion and storage
   - **Impact**: Low - A2A operations generate moderate logs
   - **Optimization**:
     - **Log Level Management**: Use appropriate log levels (e.g., `info` in production)
     - **Log Retention**: Set appropriate log retention periods (e.g., 7-30 days)

4. **Redis (Optional)**:
   - **Pricing Model**: Based on instance size and data transfer
   - **Impact**: Low - Optional caching layer for task state
   - **Optimization**: Only enable if task volume justifies caching costs

## Cost Per Operation (Estimated)

These are rough estimates and should be continuously monitored and refined.

- **Agent Discovery** (`GET /a2a/discovery`):
  - Lambda: ~$0.000001 per invocation (512 MB, ~50ms duration, shared with Universal Agent)
  - **Total Est.**: ~$0.000001 per discovery

- **JSON-RPC Message** (`POST /a2a/message`):
  - Lambda: ~$0.000001 per invocation (512 MB, ~200ms duration, shared with Universal Agent)
  - Router Lambda: ~$0.000001 per invocation (if routing to agents)
  - **Total Est.**: ~$0.000001 - $0.000002 per message

- **Task Delegation** (`POST /a2a/task`):
  - Lambda: ~$0.000001 per invocation (512 MB, ~100ms duration, shared with Universal Agent)
  - Supabase: ~$0.000001 (task storage)
  - **Total Est.**: ~$0.000002 per task creation

- **Task Status Query** (`GET /a2a/status`):
  - Lambda: ~$0.000001 per invocation (512 MB, ~50ms duration, shared with Universal Agent)
  - Supabase: ~$0.000001 (task retrieval, cached if Redis enabled)
  - **Total Est.**: ~$0.000001 - $0.000002 per status query

- **Webhook Delivery** (outgoing):
  - Lambda: ~$0.000001 per invocation (512 MB, ~100ms duration, shared with Universal Agent)
  - **Total Est.**: ~$0.000001 per webhook delivery

## Monthly Cost Projections (Example: 10 Partner Integrations)

**Assumptions**:
- 10 active partner integrations
- Average 100 tasks per partner per day
- Average 50 status queries per task
- Average 10 messages per partner per day

**Cost Breakdown**:
- **Lambda Invocations**: 10 partners × (100 tasks + 10 messages) × 30 days × $0.000001 ≈ **$0.33**
- **Supabase**: Task storage and queries ≈ **$5 - $10**
- **CloudWatch Logs**: ~500 MB/month ≈ **$2 - $5**
- **Router Lambda** (for message routing): 10 partners × 10 messages/day × 30 days × $0.000001 ≈ **$0.003**

**Total Estimated Monthly Cost**: **~$7 - $15**

*Note: Costs are shared with Universal Agent, so actual A2A-specific costs are a portion of Universal Agent costs*

## Cost Optimization Strategies (Ongoing)

- **Task State Caching**: Use Redis to cache frequently accessed task state, reducing Supabase queries
- **Data Retention**: Implement data retention policies to archive old tasks and minimize Supabase storage
- **Connection Pooling**: Use Supabase connection pooling to minimize database connections
- **Log Level Management**: Use appropriate log levels in production to minimize CloudWatch costs
- **Task Cleanup**: Automatically clean up completed/failed tasks after retention period
- **Rate Limiting**: Current rate limiting (60/min per agent) prevents abuse and cost spikes
- **Usage Monitoring**: Implement detailed cost monitoring and alerting for AWS services

## Related Documentation

- [A2A Overview](./overview.md) - Complete protocol overview
- [A2A Where](./where.md) - Deployment details

# MCP (Model Context Protocol) - Cost Analysis

**Last Updated**: 2025-12-17

## Overview

The MCP server's operational costs are primarily driven by AWS Lambda invocations and Function URL usage. Costs are relatively low as the server is designed for AI assistant integration (development tooling) rather than high-volume production traffic.

## Key Cost Drivers

1. **AWS Lambda**:
   - **Pricing Model**: Based on requests and compute duration (GB-seconds)
   - **Impact**: Low to Medium - MCP server is invoked per tool call from AI assistants
   - **Optimization**:
     - **Memory Allocation**: Currently 512 MB - monitor and optimize if needed
     - **Code Efficiency**: Ensure efficient code execution to minimize duration
     - **Caching**: Cache router health checks and JWKS keys to reduce calls

2. **Lambda Function URL**:
   - **Pricing Model**: Based on requests (same as Lambda invocations)
   - **Impact**: Low - Included in Lambda pricing
   - **Optimization**: No additional optimization needed (included in Lambda costs)

3. **CloudWatch Logs**:
   - **Pricing Model**: Based on log ingestion and storage
   - **Impact**: Low - Tool calls are infrequent (development tooling use case)
   - **Optimization**:
     - **Log Level Management**: Use appropriate log levels (e.g., `info` in production)
     - **Log Retention**: Set appropriate log retention periods (e.g., 7-30 days)

4. **Router Lambda Invocations**:
   - **Pricing Model**: Based on router Lambda invocations (when `router.route` tool is used)
   - **Impact**: Low - Only when routing requests through MCP
   - **Optimization**: Cache router responses when possible

## Cost Per Operation (Estimated)

These are rough estimates and should be continuously monitored and refined.

- **`router.health` tool call**:
  - Lambda: ~$0.000001 per invocation (512 MB, ~100ms duration)
  - Router Lambda (if called): ~$0.000001 per invocation
  - **Total Est.**: ~$0.000001 - $0.000002 per health check

- **`router.route` tool call**:
  - Lambda: ~$0.000001 per invocation (512 MB, ~200ms duration)
  - Router Lambda: ~$0.000001 per invocation
  - **Total Est.**: ~$0.000002 per route call

- **`jwks.get` tool call**:
  - Lambda: ~$0.000001 per invocation (512 MB, ~50ms duration)
  - **Total Est.**: ~$0.000001 per JWKS retrieval

- **`content.generate` tool call**:
  - Lambda: ~$0.000001 per invocation (512 MB, ~500ms duration)
  - Content Agent Lambda: ~$0.000001 per invocation
  - **Total Est.**: ~$0.000002 per content generation

## Monthly Cost Projections (Example: 100 Active Developers)

**Assumptions**:
- 100 active developers using MCP integration
- Average 10 tool calls per developer per day
- Mix: 50% router.health, 30% router.route, 10% jwks.get, 10% content.generate

**Cost Breakdown**:
- **Lambda Invocations**: 100 developers × 10 calls/day × 30 days × $0.000001 ≈ **$0.03**
- **Router Lambda** (for router.route): 100 developers × 3 route calls/day × 30 days × $0.000001 ≈ **$0.01**
- **CloudWatch Logs**: ~100 MB/month ≈ **$0.50**
- **Function URL**: Included in Lambda pricing

**Total Estimated Monthly Cost**: **~$0.54 - $1.00**

*Note: Costs are extremely low due to the development tooling nature of MCP (not high-volume production traffic)*

## Cost Optimization Strategies (Ongoing)

- **Caching**: Implement caching for router health checks and JWKS keys to reduce Lambda invocations
- **Rate Limiting**: Current rate limiting (60/min) prevents abuse and cost spikes
- **Log Level Management**: Use appropriate log levels in production to minimize CloudWatch costs
- **Memory Optimization**: Monitor Lambda memory usage and optimize if needed (currently 512 MB)
- **Usage Monitoring**: Implement detailed cost monitoring and alerting for AWS services
- **Idle Timeout**: Consider implementing connection pooling or keep-alive for frequent tool calls

## Related Documentation

- [MCP Overview](./overview.md) - Complete technical overview
- [MCP Where](./where.md) - Deployment details

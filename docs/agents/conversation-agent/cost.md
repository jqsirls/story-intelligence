# Conversation Agent - Cost

**Last Updated**: 2025-12-14

## Cost Overview

The Conversation Agent incurs costs from multiple services: AWS Lambda, API Gateway, Redis, ElevenLabs, Supabase, and Smart Home Agent. Costs scale with usage, primarily driven by conversation minutes and concurrent connections.

## Cost Breakdown

### AWS Lambda

**Function Configuration**:
- Memory: 1024 MB
- Duration: Average 2-5 seconds per invocation
- Concurrent Executions: Auto-scales based on demand

**Cost Calculation**:
- **Compute**: $0.0000166667 per GB-second
- **Requests**: $0.20 per 1M requests
- **Example**: 1M invocations/month, 3s average, 1024 MB = ~$51.20/month

**Optimization**:
- Memory tuning based on actual usage
- Provisioned concurrency only if needed (adds ~$0.0000041667 per GB-second)
- Reserved capacity for predictable workloads

### API Gateway (WebSocket)

**WebSocket API**:
- Connection: $0.25 per million connection-minutes
- Messages: $1.00 per million messages

**Cost Calculation**:
- **Example**: 10K active connections, 10 minutes average, 20 messages/connection = ~$2.50/month (connections) + ~$2.00/month (messages) = ~$4.50/month

**Optimization**:
- Connection pooling where possible
- Message batching for efficiency
- Regional deployment for latency (may increase costs)

### Redis (ElastiCache)

**Cluster Configuration**:
- Node type: Based on usage (e.g., cache.t3.micro to cache.t3.medium)
- Storage: Based on conversation state size
- Backup: Automated daily backups

**Cost Calculation**:
- **Node**: ~$0.017/hour for cache.t3.micro = ~$12.24/month
- **Storage**: $0.125 per GB-month
- **Backup**: $0.095 per GB-month
- **Example**: 1 node, 10 GB storage = ~$12.24 + $1.25 + $0.95 = ~$14.44/month

**Optimization**:
- Right-size node type based on usage
- TTL optimization (1-hour default, adjust based on needs)
- Compression for state storage
- Multi-AZ only if needed (doubles node cost)

### ElevenLabs Conversational AI

**Pricing Model**:
- Pay-per-conversation-minute
- Varies by plan (Starter, Creator, Pro, Scale)

**Cost Calculation**:
- **Example**: 10K conversations/month, 8 minutes average = 80K minutes/month
- **Starter Plan**: ~$0.18 per minute = ~$14,400/month
- **Creator Plan**: ~$0.15 per minute = ~$12,000/month
- **Pro Plan**: ~$0.12 per minute = ~$9,600/month
- **Scale Plan**: Custom pricing (likely lower)

**Optimization**:
- Right-size plan based on usage
- Negotiate volume discounts
- Monitor conversation length (target 5-12 minutes based on age)
- Optimize system prompts to reduce unnecessary turns

### Supabase

**Database**:
- Pay-per-request or subscription plan
- Storage for conversation history

**Cost Calculation**:
- **Free Tier**: 500 MB database, 1 GB file storage, 2 GB bandwidth
- **Pro Plan**: $25/month + usage-based pricing
- **Example**: 1M requests/month = ~$25 + usage = ~$30-50/month

**Optimization**:
- Efficient query patterns
- Caching where appropriate
- Archive old conversation history
- Right-size plan based on usage

### Smart Home Agent

**Lambda Function**:
- Invoked for Hue lighting control
- Minimal cost (lightweight function)

**Cost Calculation**:
- **Example**: 100K invocations/month, 1s average, 256 MB = ~$0.42/month

**Optimization**:
- Batch lighting updates where possible
- Cache device connection status
- Graceful degradation if unavailable

## Total Cost Estimate

### Low Usage Scenario

**Assumptions**:
- 1K conversations/month
- 8 minutes average
- 100 concurrent connections peak

**Monthly Costs**:
- Lambda: ~$5.12
- API Gateway: ~$0.45
- Redis: ~$14.44
- ElevenLabs: ~$1,440 (Starter) to ~$960 (Pro)
- Supabase: ~$25-30
- Smart Home Agent: ~$0.04
- **Total**: ~$1,484-1,004/month

### Medium Usage Scenario

**Assumptions**:
- 10K conversations/month
- 8 minutes average
- 1K concurrent connections peak

**Monthly Costs**:
- Lambda: ~$51.20
- API Gateway: ~$4.50
- Redis: ~$14.44
- ElevenLabs: ~$14,400 (Starter) to ~$9,600 (Pro)
- Supabase: ~$30-50
- Smart Home Agent: ~$0.42
- **Total**: ~$14,500-9,720/month

### High Usage Scenario

**Assumptions**:
- 100K conversations/month
- 8 minutes average
- 10K concurrent connections peak

**Monthly Costs**:
- Lambda: ~$512
- API Gateway: ~$45
- Redis: ~$28.88 (larger node)
- ElevenLabs: ~$144,000 (Starter) to ~$96,000 (Pro) - **Negotiate Scale plan**
- Supabase: ~$50-100
- Smart Home Agent: ~$4.20
- **Total**: ~$144,640-96,640/month

**Note**: At high usage, ElevenLabs Scale plan pricing should be negotiated for significant cost savings.

## Cost Optimization Strategies

### Conversation Length

**Target**:
- Ages 3-4: 5-7 minutes
- Ages 5-6: 7-10 minutes
- Ages 7-9: 10-12 minutes

**Optimization**:
- Monitor average conversation length
- Optimize system prompts to reduce unnecessary turns
- Encourage natural conversation endings
- Set session timeouts based on age

### Connection Management

**Optimization**:
- Efficient connection pooling
- Automatic cleanup of idle connections
- Connection reuse where possible
- Regional deployment for latency (may reduce costs through efficiency)

### State Management

**Optimization**:
- Right-size Redis node type
- Optimize TTL (1-hour default, adjust based on needs)
- Compress state storage
- Archive old conversation history to cheaper storage

### ElevenLabs Optimization

**Critical Cost Driver**:
- ElevenLabs is the largest cost component
- Negotiate volume discounts at scale
- Optimize system prompts to reduce conversation length
- Monitor and optimize conversation quality vs. length

**Strategies**:
- Right-size plan (Starter → Creator → Pro → Scale)
- Negotiate custom pricing at high volume
- Optimize prompts for efficiency
- Monitor conversation metrics

### Infrastructure Optimization

**Lambda**:
- Right-size memory (monitor CloudWatch metrics)
- Optimize code for faster execution
- Consider provisioned concurrency only if needed

**API Gateway**:
- Efficient message handling
- Connection pooling
- Regional deployment for latency

**Redis**:
- Right-size node type
- Multi-AZ only if needed
- Optimize backup retention

## Cost Monitoring

### Key Metrics

- **Conversation Minutes**: Primary cost driver (ElevenLabs)
- **Lambda Invocations**: Function call count
- **API Gateway Messages**: WebSocket message count
- **Redis Usage**: Memory and storage usage
- **Supabase Requests**: Database query count

### Cost Alerts

- **ElevenLabs**: Alert if >$X/month (configurable)
- **Total Cost**: Alert if >$X/month (configurable)
- **Anomaly Detection**: Alert on unusual cost spikes
- **Budget Alerts**: AWS Budget alerts for Lambda, API Gateway, Redis

### Cost Reporting

**Monthly Reports**:
- Total cost by service
- Cost per conversation
- Cost trends over time
- Optimization opportunities

**Dashboards**:
- Real-time cost monitoring
- Cost per service breakdown
- Cost per user/conversation
- Budget vs. actual

## ROI Analysis

### Revenue per User

**Assumptions**:
- Premium subscription: $9.99/month
- Average 10 conversations/month per user
- 80% retention rate

**Revenue**: $9.99/user/month

### Cost per User

**Assumptions**:
- 10 conversations/month, 8 minutes average
- Medium usage scenario costs

**Cost**: ~$1.45-0.97/user/month (excluding ElevenLabs)
**ElevenLabs Cost**: ~$1.44-0.96/user/month (Starter to Pro)
**Total Cost**: ~$2.89-1.93/user/month

### Profitability

**Gross Margin**: ~$7.10-8.06/user/month (71-81% margin)

**Note**: ElevenLabs is the primary cost driver. At scale, negotiate Scale plan pricing for improved margins.

## Future Cost Considerations

### Scaling

**As Usage Grows**:
- ElevenLabs: Negotiate Scale plan for volume discounts
- Lambda: Consider provisioned concurrency for predictable workloads
- Redis: Scale node type and storage as needed
- API Gateway: Regional deployment for global users

### Cost Reduction Opportunities

**Technology**:
- Optimize system prompts for efficiency
- Implement conversation caching where appropriate
- Regional deployment for latency (may reduce costs through efficiency)
- Advanced state management optimization

**Business**:
- Negotiate volume discounts with ElevenLabs
- Right-size subscription pricing based on costs
- Implement usage-based pricing tiers
- Enterprise pricing for high-volume customers

## Cost Transparency

### For Users

**Subscription Pricing**:
- Transparent monthly/annual pricing
- No hidden fees
- Clear value proposition

### For Business

**Internal Cost Tracking**:
- Detailed cost breakdown by service
- Cost per conversation tracking
- ROI analysis and reporting
- Budget planning and forecasting

## Conclusion

The Conversation Agent's costs are primarily driven by ElevenLabs conversation minutes, making it the critical cost optimization target. At scale, negotiating ElevenLabs Scale plan pricing is essential for profitability. Other services (Lambda, API Gateway, Redis, Supabase) are relatively low-cost and can be optimized through right-sizing and efficient usage patterns.


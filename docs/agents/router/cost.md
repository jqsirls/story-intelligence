# Router Agent - Cost and Economics

**Status**: Draft  
**Audience**: Finance | Engineering  
**Last Updated**: 2025-12-11

## Cost Per Operation

### Intent Classification Cost
- **OpenAI API Call**: ~$0.001-0.002 per classification
- **Model**: gpt-5.1-mini (from SSM `/storytailor-production/openai/model-routing`)
- **Tokens**: ~500-1000 tokens per classification
- **Cost**: ~$0.001-0.002 per intent classification

**Code References:**
- `packages/router/src/config.ts:12` - Model configuration
- `docs/system/ssm_parameters_inventory.md:53` - Model routing parameter

### Agent Delegation Cost
- **HTTP Request Overhead**: Minimal (Lambda-to-Lambda or HTTP)
- **No Direct Cost**: Delegation itself has no cost
- **Cost is in Delegated Agent**: Cost occurs in the target agent (Content Agent, Library Agent, etc.)

### State Management Cost
- **Redis Operations**: ~$0.00001 per operation
- **State Read/Write**: ~2-4 operations per conversation turn
- **Cost per Turn**: ~$0.00002-0.00004

**Code References:**
- `packages/router/src/services/ConversationStateManager.ts` - Redis state management
- `docs/business/unit-economics.md:83-85` - Redis costs

### Infrastructure Costs

**Lambda Execution:**
- **Memory**: 1024 MB (from deployment inventory)
- **Timeout**: 300 seconds
- **Average Execution**: ~1-2 seconds per request
- **Cost**: ~$0.0000167 per GB-second
- **Cost per Request**: ~$0.000017-0.000033

**Code References:**
- `docs/system/deployment_inventory.md:57` - Router Lambda configuration (staging shows 1024 MB, 300s timeout)

**API Gateway** (if used):
- **Cost**: ~$0.0000035 per request
- **Per Request**: ~$0.0000035

## Total Cost Per Conversation Turn

**Breakdown:**
- Intent Classification: ~$0.001-0.002
- State Management: ~$0.00002-0.00004
- Lambda Execution: ~$0.000017-0.000033
- **Total Router Cost**: ~$0.001-0.002 per turn

**Note**: This does not include costs from delegated agents (Content Agent, Library Agent, etc.)

## Cost Optimization Strategies

1. **Caching Intent Classifications**: Cache similar intents to reduce OpenAI calls
2. **Redis Optimization**: Use Redis efficiently for state management
3. **Lambda Optimization**: Reduce execution time through code optimization
4. **Batch Processing**: Process multiple intents in parallel when possible

**Code References:**
- `packages/router/src/services/AgentDelegator.ts:106-149` - Parallel processing implementation

## Unit Economics

### Cost Per User Session
- **Average Turns per Session**: 5-10 turns
- **Router Cost per Session**: ~$0.005-0.02
- **Negligible Impact**: Router costs are minimal compared to story generation costs

### Scaling Cost Projections

**At 1,000 Users/Day:**
- **Conversation Turns**: ~5,000-10,000 turns/day
- **Router Cost**: ~$5-20/day
- **Monthly Cost**: ~$150-600/month

**At 10,000 Users/Day:**
- **Conversation Turns**: ~50,000-100,000 turns/day
- **Router Cost**: ~$50-200/day
- **Monthly Cost**: ~$1,500-6,000/month

**Note**: Router costs scale linearly with usage and remain a small fraction of total platform costs (which are dominated by story generation).

## Comparison to Alternatives

**Router vs. Simple Rule-Based Routing:**
- **Router**: ~$0.001-0.002 per turn (AI-powered)
- **Rule-Based**: ~$0.0001 per turn (no AI)
- **Trade-off**: Higher cost but much better accuracy and user experience

**Router vs. Direct Agent Calls:**
- **Router**: Adds ~$0.001-0.002 overhead
- **Benefit**: Intelligent routing, state management, failover protection
- **ROI**: High - prevents misrouted requests and improves user experience

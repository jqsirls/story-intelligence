# Auth Agent - Cost and Economics

**Status**: Draft  
**Audience**: Finance | Engineering  
**Last Updated**: 2025-12-11

## Cost Per Operation

### Database Operations Cost

**Supabase Operations**:
- **Read Operations**: ~$0.0001 per query (included in plan)
- **Write Operations**: ~$0.0001 per write (included in plan)
- **Storage**: ~$0.021 per GB/month
- **Cost per Account Link**: ~$0.0002 (2 writes: user creation + mapping)
- **Cost per Token Validation**: ~$0.0001 (1 read)

**Code References:**
- `docs/business/unit-economics.md:78-81` - Supabase costs

### Infrastructure Costs

**Lambda Execution:**
- **Memory**: 512 MB (estimated)
- **Timeout**: 30 seconds (estimated)
- **Average Execution**: ~0.3-0.5 second per request
- **Cost**: ~$0.000005-0.000008 per request

**Redis Operations:**
- **Storage**: ~$0.017 per GB/month
- **Operations**: Included in plan
- **Cost per Session**: ~$0.000001 (minimal)

**Code References:**
- [Deployment Inventory](../../system/deployment-inventory.md) - Lambda configuration

## Total Cost Per Operation

### Account Linking
- Database Writes: ~$0.0002
- Lambda Execution: ~$0.000005-0.000008
- Redis Storage: ~$0.000001
- **Total**: ~$0.0002-0.00021 per account link

### Voice Code Verification
- Database Reads: ~$0.0001
- Database Writes: ~$0.0001 (token storage)
- Lambda Execution: ~$0.000005-0.000008
- Redis Operations: ~$0.000001
- **Total**: ~$0.0002-0.00021 per verification

### Token Validation
- Database Read: ~$0.0001
- Lambda Execution: ~$0.000005-0.000008
- **Total**: ~$0.0001-0.00011 per validation

## Cost Optimization Strategies

1. **Redis Caching**: Cache token validations to reduce database reads
2. **Connection Pooling**: Reuse database connections
3. **Token Cleanup**: Regular cleanup of expired tokens
4. **Rate Limiting**: Prevent abuse and reduce unnecessary operations

## Unit Economics

### Cost Per User Session
- **Average Operations per Session**: ~2-3 operations (link + verify)
- **Auth Agent Cost per Session**: ~$0.0004-0.0006
- **Negligible Impact**: Auth Agent costs are minimal

### Scaling Cost Projections

**At 1,000 Users/Day:**
- **Operations**: ~2,000-3,000 operations/day
- **Auth Agent Cost**: ~$0.4-0.6/day
- **Monthly Cost**: ~$12-18/month

**At 10,000 Users/Day:**
- **Operations**: ~20,000-30,000 operations/day
- **Auth Agent Cost**: ~$4-6/day
- **Monthly Cost**: ~$120-180/month

**Note**: Auth Agent costs are minimal compared to story generation costs. Costs scale linearly with usage.

## Comparison to Alternatives

**Auth Agent vs. Direct Authentication:**
- **Auth Agent**: Adds ~$0.000005-0.000008 overhead per operation
- **Benefit**: Security, compliance, centralized management, reusable
- **ROI**: High - provides value beyond simple authentication

**Auth Agent vs. Third-Party Auth:**
- **Cost Savings**: ~50-70% compared to Auth0/Cognito
- **Customization**: Full control over authentication flow
- **Voice Optimization**: Optimized for voice devices

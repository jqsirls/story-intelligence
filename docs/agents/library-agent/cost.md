# Library Agent - Cost and Economics

**Status**: Draft  
**Audience**: Finance | Engineering  
**Last Updated**: 2025-12-11

## Cost Per Operation

### Database Operations Cost

**Supabase Operations**:
- **Read Operations**: ~$0.0001 per query (included in plan)
- **Write Operations**: ~$0.0001 per write (included in plan)
- **Storage**: ~$0.021 per GB/month
- **Cost per Story Save**: ~$0.0001
- **Cost per Library Retrieval**: ~$0.0001

**Code References:**
- `docs/business/unit-economics.md:78-81` - Supabase costs

### Infrastructure Costs

**Lambda Execution:**
- **Memory**: 512 MB
- **Timeout**: 30 seconds
- **Average Execution**: ~0.5-1 second per request
- **Cost**: ~$0.000008-0.000017 per request

**Code References:**
- `docs/system/deployment_inventory.md:36` - Library Agent Lambda configuration

**API Gateway** (if used):
- **Cost**: ~$0.0000035 per request

## Total Cost Per Operation

### Story Save
- Database Write: ~$0.0001
- Lambda Execution: ~$0.000008-0.000017
- **Total**: ~$0.0001-0.00012 per story save

### Library Retrieval
- Database Read: ~$0.0001
- Lambda Execution: ~$0.000008-0.000017
- **Total**: ~$0.0001-0.00012 per retrieval

### Character Save
- Database Write: ~$0.0001
- Lambda Execution: ~$0.000008-0.000017
- **Total**: ~$0.0001-0.00012 per character save

## Cost Optimization Strategies

1. **Caching**: Cache frequently accessed libraries in Redis
2. **Batch Operations**: Batch multiple operations when possible
3. **Query Optimization**: Optimize database queries for performance
4. **Connection Pooling**: Reuse database connections

## Unit Economics

### Cost Per User Session
- **Average Operations per Session**: ~5-10 operations
- **Library Agent Cost per Session**: ~$0.0005-0.0012
- **Negligible Impact**: Library Agent costs are minimal

### Scaling Cost Projections

**At 1,000 Users/Day:**
- **Operations**: ~5,000-10,000 operations/day
- **Library Agent Cost**: ~$0.5-1.2/day
- **Monthly Cost**: ~$15-36/month

**At 10,000 Users/Day:**
- **Operations**: ~50,000-100,000 operations/day
- **Library Agent Cost**: ~$5-12/day
- **Monthly Cost**: ~$150-360/month

**Note**: Library Agent costs are minimal compared to story generation costs. Costs scale linearly with usage.

## Comparison to Alternatives

**Library Agent vs. Direct Database Access:**
- **Library Agent**: Adds ~$0.000008-0.000017 overhead per operation
- **Benefit**: Abstraction, caching, organization logic, error handling
- **ROI**: High - provides value beyond simple database access

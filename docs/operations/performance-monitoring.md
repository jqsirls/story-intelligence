# Performance Monitoring Guide

**Last Updated**: 2025-12-13

## Overview

This guide describes how to monitor and optimize performance in the Storytailor system.

## Performance Targets

### Latency Targets

- **Voice Response**: <800ms (target), <1200ms (acceptable)
- **Cold Start**: <150ms (target), <300ms (acceptable)
- **API Response**: <200ms (target), <500ms (acceptable)
- **Database Query**: <50ms (target), <100ms (acceptable)

### Throughput Targets

- **Requests per Second**: 100+ RPS per Lambda
- **Concurrent Users**: 1000+ concurrent users
- **Database Connections**: Efficient connection pooling

## Monitoring Tools

### CloudWatch

**Metrics Tracked**:
- Lambda invocation count
- Lambda duration
- Lambda errors
- Lambda throttles
- API Gateway latency
- API Gateway 4xx/5xx errors

**Dashboards**:
- System overview dashboard
- Per-agent performance dashboard
- Error rate dashboard

### Custom Metrics

**Health Monitoring Package** (`packages/health-monitoring/`):
- Service health scores
- Response time tracking
- Error rate monitoring
- Uptime tracking

**Monitoring Package** (`packages/monitoring/`):
- Distributed tracing
- Metrics collection
- Log aggregation

## Performance Baselines

### Establishing Baselines

1. **Load Testing**: Run load tests with K6
2. **Measure**: Record baseline metrics
3. **Document**: Document in this guide
4. **Monitor**: Track deviations from baseline

### Baseline Metrics (To Be Established)

- **API Response Time**: TBD
- **Database Query Time**: TBD
- **Lambda Cold Start**: TBD
- **Lambda Warm Start**: TBD
- **External API Latency**: TBD

## Performance Optimization

### Lambda Optimization

1. **Bundle Size**: Minimize deployment package size
2. **Cold Start**: Optimize imports and initialization
3. **Memory**: Right-size Lambda memory allocation
4. **Concurrency**: Configure appropriate concurrency limits

### Database Optimization

1. **Connection Pooling**: Use connection pooling
2. **Query Optimization**: Optimize slow queries
3. **Indexing**: Ensure proper indexes
4. **Caching**: Use Redis for frequently accessed data

### API Optimization

1. **Response Caching**: Cache responses where appropriate
2. **Compression**: Enable response compression
3. **Pagination**: Implement pagination for large datasets
4. **Rate Limiting**: Implement rate limiting

## Performance Testing

### Load Testing

**Tool**: K6

**Scripts**: `testing/load/k6-load-tests.js`

**Scenarios**:
- Baseline load (10 VUs, 2 minutes)
- Stress test (100 VUs, 5 minutes)
- Spike test (sudden load increase)

### Performance Regression Testing

**CI Integration**: Performance tests run in CI on PRs

**Thresholds**: Fail if performance degrades >20% from baseline

## Performance Alerts

### Alert Thresholds

- **Response Time**: Alert if >2x target
- **Error Rate**: Alert if >5%
- **Availability**: Alert if <99%
- **Cold Start**: Alert if >500ms

### Alert Channels

- **Slack**: Real-time alerts
- **Email**: Daily summaries
- **PagerDuty**: Critical alerts

## Performance Analysis

### Bottleneck Identification

1. **Review Metrics**: Analyze CloudWatch metrics
2. **Trace Requests**: Use distributed tracing
3. **Profile Code**: Profile slow code paths
4. **Database Analysis**: Analyze slow queries

### Optimization Priorities

1. **High Impact, Low Effort**: Quick wins
2. **High Impact, High Effort**: Major optimizations
3. **Low Impact**: Defer or skip

## Related Documentation

- [Health Monitoring](../packages/health-monitoring/README.md) - Health monitoring package
- [Monitoring Package](../packages/monitoring/README.md) - Monitoring infrastructure

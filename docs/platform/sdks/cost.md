# Storytailor SDKs - Cost Analysis

**Last Updated**: 2025-12-17

## Overview

SDKs themselves have no direct operational costs as they are client-side libraries. However, SDK usage drives costs through API calls to Storytailor REST API, which are billed based on API usage. SDKs can help optimize costs through efficient caching and offline support.

## Key Cost Drivers

1. **REST API Usage**:
   - **Pricing Model**: Based on API request volume and data transfer
   - **Impact**: High - SDKs make API calls to Storytailor REST API
   - **Optimization**:
     - **Caching**: SDKs include local caching to reduce API calls
     - **Offline Support**: Offline mode reduces API calls when network is unavailable
     - **Batch Operations**: Use batch APIs when available to reduce request count

2. **CDN Costs** (Web SDK only, if using CDN):
   - **Pricing Model**: Based on bandwidth and requests
   - **Impact**: Low - Only if using CDN distribution
   - **Optimization**: Use NPM package instead of CDN when possible

3. **Package Distribution**:
   - **Pricing Model**: NPM, CocoaPods, Maven, Gradle (typically free for public packages)
   - **Impact**: Low - Standard package manager distribution
   - **Optimization**: No optimization needed (standard distribution)

4. **Maintenance Costs**:
   - **Pricing Model**: Engineering time for SDK maintenance and updates
   - **Impact**: Medium - Ongoing maintenance across multiple platforms
   - **Optimization**: Shared codebase and automated testing reduce maintenance burden

## Cost Per Operation (Estimated)

These are rough estimates for API costs driven by SDK usage:

- **Create Story**:
  - REST API: ~$0.00001 per story creation
  - **Total Est.**: ~$0.00001 per story (after SDK caching reduces repeat calls)

- **List Stories**:
  - REST API: ~$0.000005 per list request
  - **With Caching**: ~$0.000001 per cached request (90% cache hit rate)
  - **Total Est.**: ~$0.000001 - $0.000005 per list

- **Get Story**:
  - REST API: ~$0.000005 per story retrieval
  - **With Caching**: ~$0.000001 per cached request (95% cache hit rate)
  - **Total Est.**: ~$0.000001 - $0.000005 per story

- **Update Story**:
  - REST API: ~$0.00001 per story update
  - **Total Est.**: ~$0.00001 per update

## Monthly Cost Projections (Example: 1,000 Active SDK Users)

**Assumptions**:
- 1,000 active SDK users
- Average 10 stories created per user per month
- Average 50 story reads per user per month (with 90% cache hit rate)
- Average 5 story updates per user per month

**Cost Breakdown**:
- **Story Creation**: 1,000 users × 10 stories × $0.00001 ≈ **$0.10**
- **Story Reads**: 1,000 users × 50 reads × (10% API calls) × $0.000005 ≈ **$0.025**
- **Story Updates**: 1,000 users × 5 updates × $0.00001 ≈ **$0.05**
- **CDN** (Web SDK only): ~100 GB/month ≈ **$5 - $10**

**Total Estimated Monthly Cost**: **~$5 - $10** (primarily CDN for Web SDK)

*Note: SDKs help reduce costs through caching and offline support compared to direct REST API usage*

## Cost Optimization Strategies (Ongoing)

- **Leverage Caching**: SDKs include local caching - ensure caching is enabled and properly configured
- **Use Offline Mode**: Offline support reduces API calls when network is unavailable
- **Batch Operations**: Use batch APIs when available to reduce request count
- **Optimize Cache Policies**: Configure appropriate cache TTLs to balance freshness and API calls
- **Monitor API Usage**: Track API usage patterns and optimize based on actual usage
- **Use NPM Package**: For Web SDK, use NPM package instead of CDN to avoid CDN costs

## Related Documentation

- [SDKs Overview](./README.md) - SDK overview
- [SDKs What](./what.md) - Detailed functionality
- [SDKs Where](./where.md) - Package locations

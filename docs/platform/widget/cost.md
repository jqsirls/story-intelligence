# Storytailor Embeddable Widget - Cost Analysis

**Last Updated**: 2025-12-17

## Overview

The widget itself has no direct operational costs as it is a client-side library. However, widget usage drives costs through API calls to Storytailor REST API, which are billed based on API usage. Widget can help optimize costs through efficient API usage patterns.

## Key Cost Drivers

1. **REST API Usage**:
   - **Pricing Model**: Based on API request volume and data transfer
   - **Impact**: High - Widget makes API calls to Storytailor REST API
   - **Optimization**:
     - **Efficient API Usage**: Widget uses APIs efficiently to minimize calls
     - **Batch Operations**: Use batch APIs when available
     - **Caching**: Browser caching reduces repeat API calls

2. **CDN Costs** (if using CDN distribution):
   - **Pricing Model**: Based on bandwidth and requests
   - **Impact**: Low to Medium - CDN distribution for widget JavaScript
   - **Optimization**:
     - **Use NPM Package**: Use NPM package instead of CDN when possible
     - **CDN Caching**: Aggressive CDN caching reduces bandwidth
     - **Compression**: Gzip/Brotli compression reduces bandwidth

3. **Bandwidth Costs**:
   - **Pricing Model**: Based on data transfer
   - **Impact**: Low - Widget JavaScript is relatively small
   - **Optimization**: Minified and compressed widget reduces bandwidth

## Cost Per Operation (Estimated)

These are rough estimates for API costs driven by widget usage:

- **Widget Initialization**:
  - REST API: ~$0.000001 per initialization
  - **Total Est.**: ~$0.000001 per initialization

- **Send Message**:
  - REST API: ~$0.00001 per message
  - **Total Est.**: ~$0.00001 per message

- **Read Story**:
  - REST API: ~$0.000005 per story read
  - **With Browser Caching**: ~$0.000001 per cached read (80% cache hit rate)
  - **Total Est.**: ~$0.000001 - $0.000005 per story

- **Show Story Grid**:
  - REST API: ~$0.000005 per grid load
  - **With Browser Caching**: ~$0.000001 per cached load (70% cache hit rate)
  - **Total Est.**: ~$0.000001 - $0.000005 per grid

## Monthly Cost Projections (Example: 100 Active Widget Instances)

**Assumptions**:
- 100 active widget instances
- Average 50 messages per widget per month
- Average 20 story reads per widget per month (with 80% cache hit rate)
- Average 10 story grid loads per widget per month (with 70% cache hit rate)

**Cost Breakdown**:
- **Messages**: 100 widgets × 50 messages × $0.00001 ≈ **$0.05**
- **Story Reads**: 100 widgets × 20 reads × (20% API calls) × $0.000005 ≈ **$0.002**
- **Story Grids**: 100 widgets × 10 loads × (30% API calls) × $0.000005 ≈ **$0.0015**
- **CDN** (if using CDN): ~50 GB/month ≈ **$5 - $10**

**Total Estimated Monthly Cost**: **~$5 - $10** (primarily CDN if used)

*Note: Widget helps optimize costs through efficient API usage and browser caching*

## Cost Optimization Strategies (Ongoing)

- **Use NPM Package**: Use NPM package instead of CDN to avoid CDN costs
- **Leverage Browser Caching**: Browser caching reduces repeat API calls
- **Optimize API Usage**: Widget uses APIs efficiently - no additional optimization needed
- **Minimize Widget Size**: Minified and compressed widget reduces bandwidth
- **CDN Caching**: If using CDN, aggressive caching reduces bandwidth costs
- **Monitor API Usage**: Track API usage patterns and optimize based on actual usage

## Related Documentation

- [Widget Overview](./README.md) - Widget overview
- [Widget What](./what.md) - Detailed functionality
- [Widget Where](./where.md) - Package locations

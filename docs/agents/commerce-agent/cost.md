# Commerce Agent - Cost and Economics

**Status**: Draft  
**Audience**: Finance | Engineering  
**Last Updated**: 2025-12-13

## Cost Per Operation

### Checkout Creation Cost
- **Lambda Execution**: ~$0.0000167 per GB-second
- **Memory**: 512 MB
- **Average Execution**: ~300-500ms
- **Cost per Checkout**: ~$0.00001-0.000017
- **Stripe API Call**: ~$0.0001 per API call
- **Total**: ~$0.00011-0.000117 per checkout

**Code References:**
- `docs/system/deployment_inventory.md:47` - Lambda configuration

### Webhook Processing Cost
- **Lambda Execution**: ~$0.000008-0.000017 per webhook
- **Database Operations**: ~$0.00001 per webhook
- **Email Service**: ~$0.0001 per email (if sent)
- **Total**: ~$0.000118-0.000127 per webhook

### Subscription Management Cost
- **Lambda Execution**: ~$0.00001-0.000017 per operation
- **Stripe API Call**: ~$0.0001 per API call
- **Database Operations**: ~$0.00001 per operation
- **Total**: ~$0.00012-0.000127 per operation

## Infrastructure Costs

### Lambda Execution
- **Monthly Checkouts**: 1,000 checkouts
- **Average Duration**: 400ms
- **Memory**: 512 MB
- **Monthly Cost**: ~$0.10-0.17

### Stripe Fees
- **Transaction Fees**: 2.9% + $0.30 per transaction
- **Subscription Fees**: Included in transaction fees
- **Monthly Revenue**: Varies by subscription volume

### Database (Supabase)
- **Storage**: ~$0.10 per GB/month for subscription data
- **Operations**: Included in plan

### Email Service
- **Receipt Emails**: ~$0.0001 per email
- **Monthly Emails**: 1,000 emails (estimated)
- **Monthly Cost**: ~$0.10

## Revenue Generation

### Subscription Revenue
- **Individual Plans**: $X per month per user
- **Organization Plans**: $Y per seat per month
- **Monthly Recurring Revenue (MRR)**: Varies by subscriber count

### Discount Impact
- **Invite Discounts**: 15% first-month discount
- **Story Transfer Discounts**: 20% discount
- **Acquisition Cost**: Reduced through discounts

## Cost Optimization Strategies

1. **Efficient API Calls**: Minimize Stripe API calls
2. **Caching**: Cache subscription status for performance
3. **Batch Processing**: Batch webhook processing when possible
4. **Email Optimization**: Use SendGrid for marketing, SES for transactional

## ROI Analysis

### Revenue Impact
- **Subscription Revenue**: Primary revenue stream
- **Organization Revenue**: B2B revenue through organizations
- **Referral Growth**: Viral growth through referrals

### Operational Benefits
- **Automated Billing**: Reduces manual billing overhead
- **Scalable Pricing**: Seat-based pricing scales with organizations

**Code References:**
- `docs/business/unit-economics.md` - Unit economics
- `docs/business/path-to-scale.md` - Scaling costs


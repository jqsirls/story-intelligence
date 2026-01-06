# Finance & Pricing Guide

**Last Updated**: December 10, 2025  
**Audience**: Finance Team, Sales, Product

---

## 💰 Pricing Tiers

### Free Tier
- **Price**: $0/month
- **Features**:
  - 5 stories per month
  - Basic character creation
  - Web access only
  - Standard story types

### Family Tier
- **Price**: $9.99/month
- **Features**:
  - Unlimited stories
  - Advanced character creation
  - All platforms (web, mobile, voice)
  - All story types
  - Kid Communication Intelligence
  - Smart home integration
  - Priority support

### Professional Tier
- **Price**: $29.99/month
- **Features**:
  - Everything in Family Tier
  - Multiple child profiles
  - Advanced analytics
  - Classroom tools
  - API access
  - Webhook integrations
  - White-label options

### Enterprise Tier
- **Price**: Custom
- **Features**:
  - Everything in Professional Tier
  - Custom integrations
  - Dedicated support
  - SLA guarantees
  - Custom branding
  - Volume discounts

---

## 💳 Billing & Payments

### Payment Processing
- **Provider**: Stripe
- **Methods**: Credit card, ACH (Enterprise)
- **Billing Cycle**: Monthly or Annual
- **Currency**: USD (primary), multi-currency support planned

### Subscription Management
- **Self-Service**: Users can upgrade/downgrade/cancel
- **Proration**: Automatic proration on plan changes
- **Refunds**: Case-by-case basis
- **Invoicing**: Available for Enterprise customers

---

## 📊 Cost Structure

### Infrastructure Costs

#### AWS Services
- **Lambda**: ~$50-200/month (usage-based)
- **API Gateway**: ~$10-50/month
- **CloudWatch**: ~$20-100/month
- **SSM Parameter Store**: ~$5/month
- **Total AWS**: ~$85-355/month

#### External Services
- **Supabase**: ~$25/month (Pro plan)
- **Redis**: ~$10-50/month (usage-based)
- **SendGrid**: ~$15/month (Essentials plan)
- **Stripe**: 2.9% + $0.30 per transaction
- **OpenAI**: ~$100-500/month (usage-based)
- **ElevenLabs**: ~$22/month (Creator plan)
- **Total External**: ~$172-657/month

#### Total Monthly Infrastructure
- **Minimum**: ~$257/month
- **Average**: ~$500/month
- **Peak**: ~$1,012/month

### Cost Optimization
- ✅ **Serverless Architecture**: Pay-per-use model
- ✅ **Caching**: Redis reduces API calls
- ✅ **Rate Limiting**: Prevents abuse
- ✅ **Auto-Scaling**: Handles traffic spikes efficiently

---

## 💵 Revenue Metrics

### Key Metrics
- **MRR**: Monthly Recurring Revenue
- **ARR**: Annual Recurring Revenue
- **Churn Rate**: Monthly churn percentage
- **LTV**: Lifetime Value per customer
- **CAC**: Customer Acquisition Cost

### Revenue Projections
- **Free Tier**: $0 (acquisition funnel)
- **Family Tier**: $9.99/month = $119.88/year
- **Professional Tier**: $29.99/month = $359.88/year
- **Enterprise Tier**: Custom pricing

---

## 📈 Financial KPIs

### Current Status
- **Infrastructure Costs**: ~$500/month average
- **Break-Even**: ~50 Family Tier subscribers or ~17 Professional Tier subscribers
- **Profit Margin**: TBD (depends on customer acquisition)

### Growth Metrics
- **Customer Acquisition**: Tracked via analytics
- **Retention**: Monthly churn rate
- **Upsell Rate**: Free to paid conversion
- **Expansion Revenue**: Upgrades to higher tiers

---

## 🔍 Cost Monitoring

### Tools
- **AWS Cost Explorer**: Infrastructure costs
- **Stripe Dashboard**: Revenue and transaction fees
- **Custom Analytics**: Usage-based service costs

### Alerts
- **Cost Thresholds**: Alerts when costs exceed budget
- **Usage Spikes**: Monitor for unexpected usage
- **Service Limits**: Track approaching limits

---

## 💡 Cost Optimization Opportunities

1. **Reserved Capacity**: Consider reserved instances for predictable workloads
2. **Caching Strategy**: Expand Redis caching to reduce API calls
3. **CDN**: Consider CloudFront for static assets
4. **Database Optimization**: Query optimization to reduce Supabase costs
5. **AI Cost Management**: Optimize OpenAI usage with caching and batching

---

## 📊 Pricing Strategy

### Value-Based Pricing
- **Premium Positioning**: Award-caliber storytelling
- **Therapeutic Value**: Mental health and developmental support
- **Time Savings**: Automated story creation
- **Quality**: Pulitzer-quality content

### Competitive Analysis
- **Market Position**: Premium tier
- **Differentiation**: Story Intelligence™, therapeutic focus
- **Value Proposition**: Quality + Personalization + Safety

---

## 📞 Finance Contacts

- **Billing Questions**: billing@storytailor.com
- **Enterprise Pricing**: enterprise@storytailor.com
- **Cost Optimization**: devops@storytailor.com

---

**Last Updated**: December 10, 2025  
**Next Review**: Monthly

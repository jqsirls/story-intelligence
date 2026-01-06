# Commerce Agent

**Status**: ✅ Active  
**Package**: `@alexa-multi-agent/commerce-agent`  
**Lambda Function**: `storytailor-commerce-agent-production`  
**Region**: us-east-1  
**Last Updated**: 2025-12-13

## Overview

The Commerce Agent handles comprehensive subscription management, billing, and commerce features for the Storytailor platform. It integrates with Stripe for payment processing and provides features for individual and organization accounts, discount systems, and referral tracking.

## Quick Start

### What It Does

The Commerce Agent:
- **Stripe Integration**: Payment processing and subscription management
- **Subscription Management**: Individual and organization account management
- **Discount System**: Invite discounts, story transfer discounts, coupon management
- **Referral Tracking**: Referral tracking and rewards
- **Email Integration**: Automated invitation and receipt emails

### When to Use It

The Commerce Agent is used for:
- All payment and subscription operations
- Checkout session creation
- Webhook handling for Stripe events
- Subscription plan changes
- Organization seat management
- Discount code management

## Documentation Links

- [What It Does](./what.md) - Detailed functionality and capabilities
- [Why It Exists](./why.md) - Business rationale and value proposition
- [When to Use](./when.md) - Usage guidelines and integration points
- [Where It's Deployed](./where.md) - Deployment location and Lambda configuration
- [Who Owns It](./who.md) - Team ownership and maintainers
- [Development Guide](./development.md) - Technical implementation and API reference
- [Marketing Information](./marketing.md) - Value proposition and features
- [Cost Analysis](./cost.md) - Cost per operation and economics

## Key Features

### Stripe Integration
- Individual account checkout
- Organization account checkout (seat-based pricing)
- Webhook handling for payment events
- Subscription tracking and invoice generation

### Subscription Management
- Plan changes (upgrade/downgrade)
- Organization seat management
- Subscription transfers
- Cancellation handling

### Discount System
- User invitations (15% first-month discount)
- Story transfer invites (20% discount)
- Coupon management
- Referral tracking

## Configuration

### Environment Variables
- `STRIPE_SECRET_KEY` - From SSM Parameter Store
- `STRIPE_WEBHOOK_SECRET` - From SSM Parameter Store
- `SUPABASE_URL` - From SSM Parameter Store
- `SUPABASE_SERVICE_ROLE_KEY` - From SSM Parameter Store
- `REDIS_URL` - From SSM Parameter Store (optional)
- `SENDGRID_API_KEY` - From SSM Parameter Store (for emails)

### Lambda Configuration
- **Runtime**: Node.js 22.x
- **Timeout**: 30 seconds
- **Memory**: 512 MB
- **Region**: us-east-1

## Status

✅ **Production Ready**
- Deployed to AWS Lambda (us-east-1)
- Stripe integration active
- Subscription management operational
- Email service integrated


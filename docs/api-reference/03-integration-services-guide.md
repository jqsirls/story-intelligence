# 🔗 Integration Services Guide

> **⚡ Updated**: January 2025 - Reflects deployed age validation fixes and enhanced user type support

This document outlines all external services used by the Storytailor platform and where to configure their API keys and settings.

## 📋 **Service Overview**

| Service | Purpose | Required Keys | Configuration Location |
|---------|---------|---------------|----------------------|
| **Supabase** | Database & Auth | URL, Anon Key, Service Key | AWS SSM |
| **OpenAI** | Story Generation | API Key | AWS SSM |
| **ElevenLabs** | Voice Synthesis | API Key | AWS SSM |
| **Stripe** | Payment Processing | Secret Key, Webhook Secret | AWS SSM |
| **AWS Services** | Infrastructure | Access Key, Secret Key | Environment/IAM |
| **Alexa Skills Kit** | Voice Platform | Skill ID, Client ID/Secret | Alexa Developer Console |
| **Google Actions** | Voice Platform | Project ID, Service Account | Google Cloud Console |
| **Philips Hue** | Smart Home | Bridge IP, API Key | Runtime Discovery |
| **Twilio** | SMS/Voice | Account SID, Auth Token | AWS SSM (Optional) |

---

## 🔐 **Core Services Configuration**

### **1. Supabase (Database & Authentication)**
- **Website**: https://app.supabase.com
- **Required Keys**:
  - Project URL: `https://your-project.supabase.co`
  - Anonymous Key: `[REDACTED_JWT]
  - Service Role Key: `[REDACTED_JWT]

**SSM Parameters**:
```bash
/storytailor-staging/supabase/url          # String
/storytailor-staging/supabase/anon_key     # SecureString
/storytailor-staging/supabase/service_key  # SecureString
```

**Setup Steps**:
1. Create new project at https://app.supabase.com
2. Go to Settings → API
3. Copy Project URL and API keys
4. Run our migration scripts to set up database schema

---

### **2. OpenAI (AI Story Generation)**
- **Website**: https://platform.openai.com/api-keys
- **Required Keys**:
  - API Key: `[REDACTED_OPENAI_API_KEY]`
- **Models Used**: GPT-4, GPT-3.5-turbo
- **Usage**: Story generation, content filtering, personality adaptation

**SSM Parameters**:
```bash
/storytailor-staging/openai/api_key  # SecureString
```

**Setup Steps**:
1. Create account at https://platform.openai.com
2. Add billing information
3. Generate API key in API Keys section
4. Set usage limits for cost control

---

### **3. ElevenLabs (Voice Synthesis)**
- **Website**: https://elevenlabs.io/app/settings/api-keys
- **Required Keys**:
  - API Key: `sk_...` or similar format
- **Features Used**: Voice cloning, multi-language synthesis, emotion control

**SSM Parameters**:
```bash
/storytailor-staging/elevenlabs/api_key  # SecureString
```

**Setup Steps**:
1. Create account at https://elevenlabs.io
2. Choose subscription plan (Starter+ recommended)
3. Generate API key in Settings → API Keys
4. Test voice synthesis with sample text

---

### **4. Stripe (Payment Processing)**
- **Website**: https://dashboard.stripe.com/apikeys
- **Required Keys**:
  - Secret Key: `sk_test_...` (staging) or `sk_live_...` (production)
  - Webhook Endpoint Secret: `whsec_...`
- **Features Used**: Subscription billing, one-time payments, usage tracking

**SSM Parameters**:
```bash
/storytailor-staging/stripe/secret_key     # SecureString
/storytailor-staging/stripe/webhook_secret # SecureString
```

**Setup Steps**:
1. Create Stripe account
2. Get API keys from Dashboard → Developers → API keys
3. Set up webhook endpoints for subscription events
4. Configure products and pricing in Dashboard

---

## 🎙️ **Voice Platform Integrations**

### **5. Amazon Alexa Skills Kit**
- **Website**: https://developer.amazon.com/alexa/console/ask
- **Configuration**: Alexa Developer Console
- **Required**:
  - Skill ID
  - Client ID & Secret (for account linking)
  - Endpoint URL (our Lambda function)

**Setup Steps**:
1. Create skill in Alexa Developer Console
2. Configure interaction model (intents, slots)
3. Set endpoint to our AWS Lambda function
4. Enable account linking with our auth system
5. Submit for certification

---

### **6. Google Assistant Actions**
- **Website**: https://console.actions.google.com
- **Configuration**: Actions Console + Google Cloud
- **Required**:
  - Project ID
  - Service Account JSON
  - Webhook URL

**Setup Steps**:
1. Create Actions project
2. Set up conversational actions
3. Configure webhook to our API
4. Set up account linking
5. Submit for review

---

## 🏠 **Smart Home Integrations**

### **7. Philips Hue**
- **Discovery**: Runtime bridge discovery
- **Authentication**: Press bridge button method
- **Storage**: Local token storage per user
- **Features**: Lighting control, mood setting, story ambiance

**Configuration**:
- No API keys required
- Bridge discovery via network scan
- User-specific authentication tokens
- Stored in user preferences table

---

## 📱 **Optional Services**

### **8. Twilio (SMS/Voice - Optional)**
- **Website**: https://console.twilio.com
- **Use Case**: Parent notifications, emergency alerts
- **Required Keys**:
  - Account SID
  - Auth Token
  - Phone Number

**SSM Parameters** (if enabled):
```bash
/storytailor-staging/twilio/account_sid  # SecureString
/storytailor-staging/twilio/auth_token   # SecureString
/storytailor-staging/twilio/phone_number # String
```

---

## 🔧 **Configuration Management**

### **AWS SSM Parameter Store**
All sensitive API keys are stored in AWS Systems Manager Parameter Store:

```bash
# Check current parameters
./scripts/check-api-keys.sh staging

# Update parameters interactively
./scripts/update-api-keys.sh staging

# List all parameters
aws ssm describe-parameters --filters "Key=Name,Values=/storytailor-staging/"
```

### **Environment Variables**
Local development uses `.env` files:
```bash
# .env.local
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=[REDACTED_SUPABASE_ANON_KEY]
OPENAI_API_KEY=[REDACTED_OPENAI_API_KEY]
ELEVENLABS_API_KEY=sk_...
```

---

## 🚀 **Quick Setup Checklist**

### **Essential Services (Required)**
- [ ] **Supabase**: Database and authentication
- [ ] **OpenAI**: AI story generation
- [ ] **AWS**: Infrastructure hosting
- [ ] **JWT Secret**: Authentication tokens

### **Enhanced Features**
- [ ] **ElevenLabs**: Voice synthesis
- [ ] **Stripe**: Payment processing
- [ ] **Alexa Skills**: Voice platform
- [ ] **Google Actions**: Voice platform

### **Smart Home (Optional)**
- [ ] **Philips Hue**: Smart lighting
- [ ] **Other IoT**: Additional smart home devices

### **Notifications (Optional)**
- [ ] **Twilio**: SMS notifications
- [ ] **SendGrid**: Email notifications
- [ ] **Push Notifications**: Mobile alerts

---

## 💰 **Cost Estimates**

| Service | Staging Cost/Month | Production Cost/Month |
|---------|-------------------|----------------------|
| **Supabase** | Free tier | $25-100 |
| **OpenAI** | $10-50 | $100-500 |
| **ElevenLabs** | $5-22 | $99-330 |
| **Stripe** | 2.9% + $0.30/transaction | 2.9% + $0.30/transaction |
| **AWS** | $5-20 | $50-200 |
| **Total** | ~$20-90 | ~$275-1130 |

---

## 🔒 **Security Best Practices**

1. **API Key Rotation**: Rotate keys every 90 days
2. **Least Privilege**: Use service-specific keys with minimal permissions
3. **Environment Separation**: Different keys for staging/production
4. **Monitoring**: Set up usage alerts and anomaly detection
5. **Backup**: Store encrypted backups of configuration
6. **Audit**: Regular security audits of API key usage

---

## 🆘 **Troubleshooting**

### **Common Issues**
1. **Invalid API Keys**: Check key format and expiration
2. **Rate Limits**: Monitor usage and implement backoff
3. **Network Issues**: Configure proper timeouts and retries
4. **Cost Overruns**: Set up billing alerts and usage limits

### **Support Contacts**
- **Supabase**: https://supabase.com/support
- **OpenAI**: https://help.openai.com
- **ElevenLabs**: support@elevenlabs.io
- **Stripe**: https://support.stripe.com
- **AWS**: AWS Support Console

---

## 📚 **Additional Resources**

- [API Documentation](./api-reference/README.md)
- [Deployment Guide](../DEPLOYMENT_SUMMARY.md)
- [Security Framework](../packages/security-framework/README.md)
- [Testing Guide](../testing/README.md)
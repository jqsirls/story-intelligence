# Secrets Management

**Last Updated**: 2025-12-13

## Overview

This document describes how secrets are managed in the Storytailor system, including API keys, database credentials, and other sensitive configuration.

## Secrets Storage

### AWS Systems Manager Parameter Store

**Primary Storage**: SSM Parameter Store

**Parameter Paths**:
- `/{environment}/supabase/url` - Supabase URL
- `/{environment}/supabase/service-key` - Supabase service role key
- `/{environment}/supabase/anon-key` - Supabase anonymous key
- `/{environment}/redis-url` - Redis connection URL
- `/{environment}/openai-api-key` - OpenAI API key
- `/{environment}/elevenlabs-api-key` - ElevenLabs API key
- `/{environment}/stripe-secret-key` - Stripe secret key
- `/{environment}/sendgrid-api-key` - SendGrid API key
- And more...

**Environment Prefixes**:
- `/staging/` - Staging environment
- `/production/` - Production environment
- `/development/` - Development environment (optional)

### Local Development

**Storage**: `.env` file (gitignored)

**Template**: `.env.example` (committed, no secrets)

## Secrets Access

### Lambda Functions

Lambda functions retrieve secrets from SSM Parameter Store at runtime:

```typescript
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const ssm = new SSMClient({ region: 'us-east-1' });

async function getSecret(name: string): Promise<string> {
  const command = new GetParameterCommand({
    Name: `/${process.env.ENVIRONMENT}/${name}`,
    WithDecryption: true,
  });
  const response = await ssm.send(command);
  return response.Parameter?.Value || '';
}
```

### Local Development

Local development uses `.env` file loaded by application:

```typescript
import dotenv from 'dotenv';
dotenv.config();
```

## Secrets Rotation

### Rotation Policy

- **API Keys**: Rotate every 90 days or on compromise
- **Database Credentials**: Rotate every 180 days
- **Service Keys**: Rotate on personnel changes

### Rotation Process

1. **Generate New Secret**: Create new secret in SSM
2. **Update Parameter**: Update SSM parameter with new value
3. **Verify**: Verify system works with new secret
4. **Revoke Old**: Revoke old secret (if applicable)
5. **Document**: Document rotation in `docs/DECISIONS.md`

## Secrets Security

### Encryption

- **At Rest**: SSM Parameter Store encrypts with KMS
- **In Transit**: TLS for all connections
- **In Memory**: Secrets never logged or exposed

### Access Control

- **IAM Roles**: Lambda functions use IAM roles with minimal permissions
- **Parameter Policies**: SSM parameters have access policies
- **Audit Logging**: All secret access logged in CloudTrail

## Required Secrets

### Core Services

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `REDIS_URL` - Redis connection URL

### External APIs

- `OPENAI_API_KEY` - OpenAI API key
- `ELEVENLABS_API_KEY` - ElevenLabs API key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `SENDGRID_API_KEY` - SendGrid API key

### Optional Services

- `SLACK_WEBHOOK_URL` - Slack notifications
- `PAGERDUTY_API_KEY` - PagerDuty integration
- `TWILIO_ACCOUNT_SID` - Twilio SMS
- `TWILIO_AUTH_TOKEN` - Twilio authentication

## Environment Variables

See `.env.example` for complete list of environment variables.

## Best Practices

1. **Never Commit Secrets**: Secrets never in git
2. **Use SSM for Production**: Always use SSM Parameter Store for production
3. **Rotate Regularly**: Follow rotation policy
4. **Minimal Access**: Grant minimal access needed
5. **Audit Access**: Monitor and audit secret access
6. **Document Changes**: Document secret changes in decisions log

## Incident Response

### Secret Compromise

1. **Immediate Rotation**: Rotate compromised secret immediately
2. **Assess Impact**: Determine what was compromised
3. **Revoke Access**: Revoke access for compromised secret
4. **Notify Team**: Notify security team
5. **Investigate**: Investigate how compromise occurred
6. **Remediate**: Fix vulnerability
7. **Document**: Document incident and remediation

## Related Documentation

- [Compliance](./compliance/README.md) - Compliance requirements
- [Security Framework](../packages/security-framework/README.md) - Security utilities

Status: Published  
Audience: DevOps | Engineering  
Last-Updated: 2025-12-17  
Owner: Engineering Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  

# JWKS URL Configuration Guide

## Overview

JWKS (JSON Web Key Set) URL is required for OAuth 2.0 JWT token verification in A2A protocol. This guide explains how to configure it.

## What is JWKS?

**JWKS (JSON Web Key Set)** is a set of keys containing the public keys used to verify JSON Web Tokens (JWTs). It's typically hosted at a well-known endpoint by your OAuth provider.

**Why it's needed:**
- Verifies JWT token signatures (prevents token tampering)
- Ensures tokens are issued by trusted OAuth provider
- Required for secure OAuth 2.0 authentication

## Quick Configuration

### Option 1: Interactive Script (Recommended)

```bash
./scripts/configure-jwks-url.sh production
```

The script will:
1. Prompt for JWKS URL
2. Test URL accessibility
3. Validate JWKS format
4. Optionally configure Token Issuer and Audience
5. Store everything in SSM Parameter Store

### Option 2: Manual Configuration

```bash
# Set JWKS URL
aws ssm put-parameter \
  --name "/storytailor-production/a2a/jwks-url" \
  --type "String" \
  --value "https://your-oauth-provider.com/.well-known/jwks.json" \
  --region us-east-1 \
  --overwrite

# Set Token Issuer (optional but recommended)
aws ssm put-parameter \
  --name "/storytailor-production/a2a/token-issuer" \
  --type "String" \
  --value "https://your-oauth-provider.com" \
  --region us-east-1 \
  --overwrite

# Set Token Audience (optional but recommended)
aws ssm put-parameter \
  --name "/storytailor-production/a2a/token-audience" \
  --type "String" \
  --value "storytailor-a2a-api" \
  --region us-east-1 \
  --overwrite
```

## Finding Your JWKS URL

### Common OAuth Providers

#### Auth0
```
https://YOUR_DOMAIN.auth0.com/.well-known/jwks.json
```
Example: `https://storytailor.auth0.com/.well-known/jwks.json`

#### Okta
```
https://YOUR_DOMAIN.okta.com/oauth2/default/v1/keys
```
Or for custom authorization server:
```
https://YOUR_DOMAIN.okta.com/oauth2/AUTHORIZATION_SERVER_ID/v1/keys
```

#### Google
```
https://www.googleapis.com/oauth2/v3/certs
```

#### Microsoft Azure AD
```
https://login.microsoftonline.com/TENANT_ID/discovery/v2.0/keys
```
Replace `TENANT_ID` with your Azure AD tenant ID.

#### Custom OAuth Provider
Typically at:
```
https://your-provider.com/.well-known/jwks.json
```
Or:
```
https://your-provider.com/.well-known/openid-configuration
```
(Then extract `jwks_uri` from the OpenID configuration)

### How to Find JWKS URL

1. **Check OAuth Provider Documentation**
   - Most providers document their JWKS endpoint
   - Look for "JWKS", "JSON Web Key Set", or ".well-known/jwks.json"

2. **Check OpenID Connect Discovery**
   - Visit: `https://your-provider.com/.well-known/openid-configuration`
   - Look for `jwks_uri` field
   - Example response:
     ```json
     {
       "issuer": "https://your-provider.com",
       "jwks_uri": "https://your-provider.com/.well-known/jwks.json",
       ...
     }
     ```

3. **Test the URL**
   ```bash
   curl https://your-provider.com/.well-known/jwks.json | jq '.'
   ```
   Should return JSON with `keys` array.

## Configuration Parameters

### Required

- **JWKS URL** (`/storytailor-production/a2a/jwks-url`)
  - Full URL to JWKS endpoint
  - Must be HTTPS (for security)
  - Must return valid JWKS JSON format

### Optional (Recommended)

- **Token Issuer** (`/storytailor-production/a2a/token-issuer`)
  - The `iss` (issuer) claim in JWT tokens
  - Validates tokens are from expected issuer
  - Example: `https://storytailor.auth0.com`

- **Token Audience** (`/storytailor-production/a2a/token-audience`)
  - The `aud` (audience) claim in JWT tokens
  - Validates tokens are intended for your API
  - Example: `storytailor-a2a-api` or `api://storytailor-a2a`

## How It Works

1. **Client sends JWT token** in `Authorization: Bearer [REDACTED_JWT]
2. **A2A adapter extracts token** and decodes header to get `kid` (key ID)
3. **JWKS client fetches public key** from JWKS URL using `kid`
4. **JWT signature verified** using the public key
5. **Token payload validated** (expiration, issuer, audience, scopes)
6. **Request authenticated** if all checks pass

## Verification

### Check Configuration

```bash
# Verify JWKS URL is set
aws ssm get-parameter \
  --name "/storytailor-production/a2a/jwks-url" \
  --region us-east-1 \
  --query 'Parameter.Value' \
  --output text

# Verify Token Issuer (if set)
aws ssm get-parameter \
  --name "/storytailor-production/a2a/token-issuer" \
  --region us-east-1 \
  --query 'Parameter.Value' \
  --output text

# Verify Token Audience (if set)
aws ssm get-parameter \
  --name "/storytailor-production/a2a/token-audience" \
  --region us-east-1 \
  --query 'Parameter.Value' \
  --output text
```

### Test OAuth Authentication

```bash
# Get JWT token from your OAuth provider
# Then test A2A endpoint
curl -X POST https://storyintelligence.dev/a2a/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [REDACTED_JWT]" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "library.list",
    "params": {}
  }'
```

**Expected:** JSON-RPC response (not authentication error)

### Check Logs

```bash
# Should see JWKS client initialization
aws logs tail /aws/lambda/storytailor-universal-agent-production \
  --since 10m --region us-east-1 \
  --format short | grep -i "jwks"

# Should NOT see warnings about missing JWKS
# Bad: "JWT verification without signature check - jwksUrl not configured"
# Good: "JWKS client initialized"
```

## After Configuration

1. **Re-deploy Universal Agent:**
   ```bash
   ./scripts/deploy-universal-agent-proper.sh production
   ```

2. **Verify in logs:**
   - Check for "JWKS client initialized" message
   - No warnings about missing JWKS URL

3. **Test with OAuth token:**
   - Get JWT token from your OAuth provider
   - Test A2A message endpoint
   - Verify authentication succeeds

## Troubleshooting

### JWKS URL Not Accessible

**Error:** `fetch failed` or timeout when fetching JWKS

**Solutions:**
1. Verify URL is correct and accessible
2. Check Lambda has internet access (not in VPC without NAT)
3. Test URL from Lambda execution environment
4. Check OAuth provider status

### Invalid JWKS Format

**Error:** JWKS response doesn't contain `keys` array

**Solutions:**
1. Verify URL returns valid JWKS JSON
2. Check URL is JWKS endpoint, not OpenID config
3. Test: `curl JWKS_URL | jq '.keys'`

### Token Verification Fails

**Error:** "Token verification failed" or "Invalid token issuer"

**Solutions:**
1. Verify Token Issuer matches JWT `iss` claim
2. Verify Token Audience matches JWT `aud` claim
3. Check token expiration (`exp` claim)
4. Verify token has required scopes
5. Check JWT `kid` (key ID) exists in JWKS

### JWKS Client Not Initialized

**Error:** Logs show "JWT verification without signature check"

**Solutions:**
1. Verify JWKS URL is in SSM Parameter Store
2. Check deployment script reads from SSM correctly
3. Re-deploy Universal Agent after configuring JWKS URL
4. Check environment variable `A2A_JWKS_URL` is set (if using env var)

## Security Best Practices

1. **Always use HTTPS** for JWKS URL
2. **Configure Token Issuer** to prevent token spoofing
3. **Configure Token Audience** to ensure tokens are for your API
4. **Monitor JWKS requests** for anomalies
5. **Cache JWKS keys** (already implemented - 1 hour cache)
6. **Rate limit JWKS requests** (already implemented - 10 requests/minute)

## Related Documentation

- **Configuration Checklist:** `docs/platform/a2a/configuration-checklist.md`
- **API Reference:** `docs/platform/a2a/api-reference.md`
- **Deployment Verification:** `docs/platform/a2a/deployment-verification.md`

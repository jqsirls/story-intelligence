# Token Service Agent

JWT token service with AWS KMS integration for OAuth 2.0 and OpenID Connect support in the Storytailor platform.

## Overview

The Token Service Agent provides secure token generation, verification, and management using AWS KMS for cryptographic operations. It supports:

- JWT token generation (access, refresh, and ID tokens)
- Token verification and introspection
- Token revocation
- Key rotation with JWKS support
- PKCE for OAuth 2.0
- OpenID Connect compliance

## Features

### Token Types
- **Access Tokens**: Short-lived tokens for API access (default 1 hour)
- **Refresh Tokens**: Long-lived tokens for obtaining new access tokens (default 30 days)
- **ID Tokens**: OpenID Connect identity tokens with user claims

### Security Features
- AWS KMS for secure key storage and signing
- Automatic key rotation
- Token revocation with Redis caching
- JWKS endpoint for public key distribution
- Support for RS256 signing algorithm

### Token Management
- Token introspection (RFC 7662)
- Token revocation
- Usage tracking and analytics
- Configurable token lifetimes

## API Endpoints

### Generate Token
```
POST /token
{
  "subject": "user-id",
  "clientId": "client-id",
  "scope": "openid profile email",
  "tokenType": "access",
  "claims": {
    "custom": "value"
  }
}
```

### Verify Token
```
POST /token/verify
{
  "token": "jwt.token.here",
  "options": {
    "audience": "expected-audience"
  }
}
```

### Introspect Token
```
POST /token/introspect
{
  "token": "jwt.token.here"
}
```

### Revoke Token
```
POST /token/revoke
{
  "token": "jwt.token.here",
  "reason": "logout"
}
```

### JWKS Endpoint
```
GET /.well-known/jwks.json
```

### Rotate Keys (Admin Only)
```
POST /admin/rotate-keys
Authorization: Bearer <admin-token>
```

## Environment Variables

- `KMS_KEY_ID`: AWS KMS key ID for signing operations
- `AWS_REGION`: AWS region (default: us-east-1)
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_KEY`: Supabase service role key
- `REDIS_URL`: Redis connection URL
- `TOKEN_ISSUER`: Token issuer URL (default: https://auth.storytailor.ai)
- `TOKEN_AUDIENCE`: Comma-separated list of valid audiences

## Token Claims

### Standard Claims
- `iss`: Issuer
- `sub`: Subject (user ID)
- `aud`: Audience (client ID)
- `exp`: Expiration time
- `iat`: Issued at
- `nbf`: Not before
- `jti`: JWT ID

### Access Token Claims
- `scope`: Granted scopes
- `token_type`: "Bearer"

### ID Token Claims
- `nonce`: Client nonce for replay protection
- `auth_time`: Authentication time
- `azp`: Authorized party (client ID)

### Custom Claims
Additional claims can be included via the `claims` parameter when generating tokens.

## Security Considerations

1. **Key Rotation**: Keys should be rotated regularly (recommended every 90 days)
2. **Token Revocation**: Revoked tokens are cached in Redis for fast checking
3. **KMS Permissions**: Ensure Lambda has appropriate KMS permissions
4. **Network Security**: Use VPC endpoints for KMS and Redis access
5. **Token Storage**: Never log or store full JWT tokens

## Testing

```bash
npm test                 # Run unit tests
npm run test:coverage    # Run tests with coverage
npm run test:watch      # Run tests in watch mode
```

## Deployment

The service is deployed as an AWS Lambda function with two handlers:
- HTTP handler for API Gateway integration
- Event handler for EventBridge integration

```bash
# Build the package
npm run build

# Deploy (from project root)
./scripts/deploy-token-service.sh
```

## Integration with Other Agents

The Token Service integrates with:
- **Auth Agent**: For user authentication tokens
- **IdP Agent**: For OIDC token generation
- **Router**: For token validation on API requests
- **All Agents**: For service-to-service authentication

## Monitoring

Key metrics:
- Token generation rate
- Token verification success/failure rate
- Key rotation events
- Token revocation rate
- KMS API usage

CloudWatch alarms:
- High token generation failure rate
- KMS key access failures
- Redis connection failures
- Expired signing keys
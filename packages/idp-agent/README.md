# IdP Agent

Identity Provider Agent implementing OAuth 2.0 and OpenID Connect (OIDC) for the Storytailor platform.

## Overview

The IdP Agent provides a complete OAuth 2.0 and OIDC implementation with:

- OAuth 2.0 authorization server
- OpenID Connect provider
- PKCE (Proof Key for Code Exchange) support
- Kid-safe consent flows (COPPA compliant)
- Integration with TokenService for JWT management
- Multi-tenant client registration
- Token introspection and revocation

## Features

### OAuth 2.0 Support
- Authorization Code Flow (with PKCE)
- Refresh Token Flow
- Client Credentials Flow
- Token introspection (RFC 7662)
- Token revocation (RFC 7009)

### OpenID Connect Support
- Discovery endpoint (/.well-known/openid-configuration)
- UserInfo endpoint
- ID tokens with standard and custom claims
- Dynamic client registration
- Session management

### Security Features
- PKCE mandatory for public clients
- Consent management with parental controls
- Token binding and rotation
- Rate limiting and abuse prevention

## API Endpoints

### Discovery
```
GET /.well-known/openid-configuration
```
Returns OIDC discovery document with all supported features.

### Authorization
```
GET/POST /oauth/authorize
  ?response_type=code
  &client_id={client_id}
  &redirect_uri={redirect_uri}
  &scope={scope}
  &state={state}
  &nonce={nonce}
  &code_challenge={code_challenge}
  &code_challenge_method={method}
```

### Token Exchange
```
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code={code}
&redirect_uri={redirect_uri}
&client_id={client_id}
&code_verifier={verifier}
```

### UserInfo
```
GET/POST /oauth/userinfo
Authorization: Bearer {access_token}
```

### Token Revocation
```
POST /oauth/revoke
Content-Type: application/x-www-form-urlencoded

token={token}
&token_type_hint={hint}
```

## Supported Scopes

### Standard OIDC Scopes
- `openid` - Required for OIDC, returns sub claim
- `profile` - User profile information
- `email` - Email address and verification status
- `phone` - Phone number and verification status
- `address` - Physical address
- `offline_access` - Refresh token issuance

### Custom Storytailor Scopes
- `storytailor:characters` - Access to user's characters
- `storytailor:library` - Access to story library
- `storytailor:family` - Family management permissions

## Client Registration

Clients must be registered in the `oauth_clients` table with:

```javascript
{
  client_id: "unique-client-id",
  client_secret: "secret", // null for public clients
  client_name: "My App",
  client_type: "confidential" | "public",
  redirect_uris: ["https://app.example.com/callback"],
  allowed_grant_types: ["authorization_code", "refresh_token"],
  allowed_scopes: ["openid", "profile", "email"],
  require_pkce: true,
  requires_parental_consent: true // For kid-focused apps
}
```

## PKCE Implementation

For public clients (mobile apps, SPAs), PKCE is mandatory:

1. Generate code verifier (43-128 characters)
2. Calculate challenge: `base64url(sha256(verifier))`
3. Include in authorization request: `code_challenge` & `code_challenge_method=S256`
4. Include verifier in token request: `code_verifier`

## Kid-Safe Consent Flow

For applications requiring parental consent:

1. User under 13 triggers consent requirement
2. Parent email/verification required
3. Consent stored with audit trail
4. Periodic re-consent based on age

## Environment Variables

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_KEY`: Supabase service role key
- `REDIS_URL`: Redis connection URL
- `EVENT_BUS_NAME`: EventBridge bus name
- `TOKEN_SERVICE_URL`: TokenService endpoint
- `OIDC_ISSUER`: OIDC issuer URL
- `OIDC_AUTH_ENDPOINT`: Authorization endpoint
- `OIDC_TOKEN_ENDPOINT`: Token endpoint
- `OIDC_USERINFO_ENDPOINT`: UserInfo endpoint
- `OIDC_JWKS_URI`: JWKS endpoint
- `OIDC_REGISTRATION_ENDPOINT`: Dynamic registration endpoint

## Integration with Other Agents

The IdP Agent integrates with:
- **TokenService**: For JWT generation and validation
- **Auth Agent**: For user authentication
- **Router**: For request routing
- **Security Framework**: For security policies

## Error Handling

All OAuth errors follow RFC 6749:
- `invalid_request` - Missing or invalid parameters
- `invalid_client` - Client authentication failed
- `invalid_grant` - Invalid authorization code or refresh token
- `unauthorized_client` - Client not authorized for grant type
- `unsupported_grant_type` - Grant type not supported
- `invalid_scope` - Requested scope invalid

## Testing

```bash
npm test                 # Run unit tests
npm run test:coverage    # Run tests with coverage
npm run test:watch      # Run tests in watch mode
```

## Deployment

The agent is deployed as an AWS Lambda function:

```bash
# Build the package
npm run build

# Deploy (from project root)
./scripts/deploy-idp-agent.sh
```

## Security Considerations

1. **Client Authentication**: Use client secrets for confidential clients
2. **PKCE**: Required for all public clients
3. **Consent**: Explicit consent required, especially for minors
4. **Token Rotation**: Refresh tokens rotated on use
5. **Rate Limiting**: Prevent brute force attacks
6. **Audit Logging**: All authorization events logged

## Monitoring

Key metrics:
- Authorization success/failure rate
- Token issuance rate
- Active sessions count
- Consent approval rate
- PKCE validation failures

CloudWatch alarms:
- High authorization failure rate
- Suspicious token patterns
- Consent bypass attempts
- Client authentication failures
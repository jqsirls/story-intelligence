# Auth Agent - Usage Guidelines

**Status**: Draft  
**Audience**: Product | Engineering  
**Last Updated**: 2025-12-11

## When to Use the Auth Agent

### Primary Use Cases

1. **User Registration**
   - When a new user wants to create an account
   - When linking a voice platform account to Storytailor
   - When a parent creates an account for a child (COPPA)

2. **Account Linking**
   - When a user wants to link Alexa/Google/Apple account
   - When a user wants to access Storytailor from multiple devices
   - When migrating from guest to authenticated user

3. **Authentication**
   - When a user wants to log in
   - When validating user sessions
   - When refreshing access tokens

4. **Token Management**
   - When validating API requests
   - When refreshing expired tokens
   - When revoking tokens on logout

## When NOT to Use

### Don't Use Auth Agent For:
- **Guest Users**: Guest mode doesn't require authentication
- **Public Endpoints**: Health checks, public APIs don't need auth
- **Internal Agent Communication**: Agents use service-to-service auth

## Usage Patterns

### Pattern 1: Account Linking Flow

```typescript
// 1. User initiates account linking from voice device
const linkingResponse = await authAgent.linkAccount({
  customerEmail: 'user@example.com',
  alexaPersonId: 'amzn1.ask.person.EXAMPLE123',
  deviceType: 'voice'
});

// 2. User enters 6-digit code
const tokenResponse = await authAgent.verifyVoiceCode({
  email: 'user@example.com',
  code: '123456',
  alexaPersonId: 'amzn1.ask.person.EXAMPLE123',
  deviceType: 'voice'
});

// 3. Use tokens for authenticated requests
const session = await authAgent.validateToken(tokenResponse.accessToken);
```

### Pattern 2: Token Refresh Flow

```typescript
// When access token expires
const newTokens = await authAgent.refreshToken(refreshToken);

// Use new access token
const session = await authAgent.validateToken(newTokens.accessToken);
```

### Pattern 3: Logout Flow

```typescript
// Revoke refresh token on logout
await authAgent.revokeToken(refreshToken);
```

## Integration Points

### With Router
- Router delegates authentication requests to Auth Agent
- Router validates tokens before processing requests
- Router handles authentication errors

### With Universal Agent
- Universal Agent exposes Auth Agent via REST API
- Endpoints: `/v1/auth/register`, `/v1/auth/login`, etc.
- Universal Agent handles request/response transformation

### With Other Agents
- Other agents use Auth Agent for user validation
- Agents check user sessions before processing
- Agents handle authentication errors gracefully

## Error Handling

### Common Errors

1. **INVALID_EMAIL**: Email format is invalid
2. **VOICE_CODE_EXPIRED**: Code has expired (5 minutes)
3. **VOICE_CODE_INVALID**: Code is incorrect
4. **MAX_ATTEMPTS_EXCEEDED**: Too many failed attempts (3 max)
5. **RATE_LIMIT_EXCEEDED**: Too many requests
6. **COPPA_VIOLATION**: User under 13 without parent consent

### Error Response Format

```typescript
{
  success: false,
  error: 'Error message',
  errorCode: 'ERROR_CODE',
  metadata: {
    retryAfter: 60, // seconds
    attemptsRemaining: 2
  }
}
```

## Best Practices

1. **Always Initialize**: Call `initialize()` before using Auth Agent
2. **Handle Errors**: Always handle authentication errors gracefully
3. **Token Storage**: Store tokens securely (never in localStorage for web)
4. **Token Refresh**: Implement automatic token refresh before expiration
5. **Rate Limiting**: Respect rate limits and implement backoff
6. **COPPA Compliance**: Always check COPPA status for users under 13

## Performance Considerations

- **Redis Caching**: Use Redis for session caching
- **Connection Pooling**: Reuse database connections
- **Token Validation**: Cache token validation results
- **Batch Operations**: Batch multiple operations when possible

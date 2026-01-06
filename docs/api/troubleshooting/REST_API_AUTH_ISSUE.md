# REST API Authentication Issue - Supabase JWT Validation

**Date**: December 28, 2025  
**Status**: 🔴 BLOCKING - Prevents external REST API access  
**Priority**: HIGH  
**Impact**: Test scripts cannot authenticate, external API consumers blocked  

---

## Summary

The REST API's authentication middleware (`AuthMiddleware`) is failing to validate Supabase JWT tokens, returning `AUTH_TOKEN_INVALID` even for valid authenticated users.

**Root Cause**: The `AuthAgent.validateToken()` method is designed to validate custom JWT tokens signed with our own JWT secret, but it's receiving Supabase JWT tokens signed with Supabase's JWT secret.

---

## Error Details

### Symptom

```bash
POST /api/v1/characters → 401 Unauthorized
Response: {"success":false,"error":"Invalid or expired token","code":"AUTH_TOKEN_INVALID"}
```

### Test Case

```javascript
// Authenticate with Supabase
const { data: authData } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'password'
});

const accessToken = authData.session.access_token; // Supabase JWT

// Try to use REST API
const response = await fetch(`${API_URL}/api/v1/characters`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`, // ❌ Fails validation
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ name: 'Test Character', ... })
});

// Result: 401 Unauthorized
```

---

## Technical Analysis

### Current Flow

1. User authenticates with Supabase → gets Supabase JWT token
2. User sends request to REST API with `Authorization: Bearer <supabase-jwt>`
3. `AuthMiddleware.requireAuth()` extracts token
4. Calls `AuthAgent.validateToken(token)`
5. `AuthAgent` →  `TokenService.validateToken(token)`
6. **Problem**: `TokenService` tries to verify with custom JWT secret
   ```typescript
   // packages/auth-agent/src/services/token.ts:172
   const payload = jwt.verify(token, this.config.jwt.secret, {
     issuer: this.config.jwt.issuer,
     audience: this.config.jwt.audience,
     algorithms: ['HS256'],
   }) as JWTPayload;
   ```
7. **Failure**: Supabase JWT is signed with Supabase's secret, not `this.config.jwt.secret`
8. Returns `AUTH_TOKEN_INVALID`

### Code References

- **AuthMiddleware**: `packages/universal-agent/src/middleware/AuthMiddleware.ts:69`
  ```typescript
  const userSession = await this.authAgent.validateToken(token);
  ```

- **AuthAgent**: `packages/auth-agent/src/auth-agent.ts:394`
  ```typescript
  const payload = await this.tokenService.validateToken(token);
  ```

- **TokenService**: `packages/auth-agent/src/services/token.ts:172`
  ```typescript
  jwt.verify(token, this.config.jwt.secret, { ... })
  ```

---

## Solutions

### Option 1: Validate Supabase Tokens with Supabase Client (RECOMMENDED)

Use Supabase's `auth.getUser(token)` method to validate tokens instead of custom JWT verification.

```typescript
// In AuthMiddleware.ts
requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authorization token required',
        code: 'AUTH_TOKEN_MISSING'
      });
      return;
    }

    const token = authHeader.substring(7);
    
    // ✅ SOLUTION: Use Supabase to validate Supabase tokens
    if (this.supabase) {
      const { data: { user }, error } = await this.supabase.auth.getUser(token);
      
      if (error || !user) {
        res.status(401).json({
          success: false,
          error: 'Invalid or expired token',
          code: 'AUTH_TOKEN_INVALID'
        });
        return;
      }
      
      // Add user to request
      req.user = {
        id: user.id,
        email: user.email,
        // ... map other fields
      };
      
      next();
      return;
    }
    
    // Fallback to AuthAgent for custom tokens (if needed)
    const userSession = await this.authAgent.validateToken(token);
    // ... rest of logic
  } catch (error) {
    // ... error handling
  }
};
```

**Pros**:
- ✅ Simple and direct
- ✅ Works with existing Supabase tokens
- ✅ No changes to AuthAgent needed
- ✅ Supabase handles token expiration, refresh, etc.

**Cons**:
- Requires Supabase client to be available in AuthMiddleware
- Adds Supabase dependency to auth flow

---

### Option 2: Configure AuthAgent with Supabase JWT Secret

Update AuthAgent to use Supabase's JWT secret for token validation.

```typescript
// In RESTAPIGateway.ts initialization
const authAgentConfig = {
  jwt: {
    secret: process.env.SUPABASE_JWT_SECRET, // ✅ Use Supabase secret
    issuer: 'https://lendybmmnlqelrhkhdyc.supabase.co/auth/v1',
    audience: 'authenticated',
    expiresIn: '1h'
  },
  // ... other config
};

const authAgent = new AuthAgent(authAgentConfig);
```

**Where to get SUPABASE_JWT_SECRET**:
```bash
# From Supabase Dashboard:
# Project Settings → API → JWT Secret

# Or from environment:
export SUPABASE_JWT_SECRET="your-jwt-secret-from-supabase"
```

**Pros**:
- ✅ Uses existing AuthAgent architecture
- ✅ Centralized token validation

**Cons**:
- ⚠️ AuthAgent would be Supabase-specific
- ⚠️ Breaks compatibility with custom JWT tokens (if needed)

---

### Option 3: Dual Token Support

Support both Supabase tokens and custom tokens.

```typescript
// In TokenService.ts
async validateToken(token: string): Promise<JWTPayload> {
  // Try custom JWT first
  try {
    const payload = jwt.verify(token, this.config.jwt.secret, {
      issuer: this.config.jwt.issuer,
      audience: this.config.jwt.audience,
      algorithms: ['HS256'],
    }) as JWTPayload;
    return payload;
  } catch (customError) {
    // If custom JWT fails, try Supabase JWT
    if (this.supabase) {
      const { data: { user }, error } = await this.supabase.auth.getUser(token);
      
      if (error || !user) {
        throw new Error('Invalid token');
      }
      
      // Map Supabase user to JWTPayload
      return {
        sub: user.id,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        // ... other fields
      };
    }
    
    throw customError;
  }
}
```

**Pros**:
- ✅ Supports both custom and Supabase tokens
- ✅ Backward compatible
- ✅ Flexible for future auth methods

**Cons**:
- ⚠️ More complex
- ⚠️ Two token validation paths to maintain

---

## Recommended Implementation

**Use Option 1** (Supabase client validation) for the following reasons:
1. ✅ Simplest and most direct
2. ✅ Leverages Supabase's built-in validation
3. ✅ No risk of custom JWT secret mismatch
4. ✅ Handles token refresh and expiration automatically
5. ✅ Already have Supabase client available

### Implementation Plan

1. **Update AuthMiddleware** to use Supabase for token validation
   - File: `packages/universal-agent/src/middleware/AuthMiddleware.ts`
   - Change: Use `this.supabase.auth.getUser(token)` instead of `this.authAgent.validateToken(token)`

2. **Keep AuthAgent for custom tokens** (if needed for internal services)
   - AuthAgent can still be used for service-to-service auth
   - Or for future non-Supabase auth methods

3. **Update tests** to verify Supabase token validation works
   - File: `scripts/test-story-pipeline-complete.js`
   - Should pass after fix

4. **Deploy updated Lambda**
   - Build universal-agent
   - Deploy to staging
   - Test with real Supabase tokens
   - Deploy to production

---

## Workaround (Temporary)

Until the fix is deployed, use **direct database operations** (as in `scripts/test-story-pipeline-direct.js`):

```javascript
// Instead of REST API
const response = await fetch(`${API_URL}/api/v1/characters`, {
  headers: { 'Authorization': `Bearer ${supabaseToken}` },
  ...
});

// Use direct Supabase admin operations
const { data, error } = await supabaseAdmin
  .from('characters')
  .insert({ ... })
  .select()
  .single();
```

This bypasses the REST API authentication issue entirely.

---

## Testing Checklist

After implementing the fix:

- [ ] User can authenticate with Supabase
- [ ] User can create character via REST API
- [ ] User can create story via REST API
- [ ] User can list characters via REST API
- [ ] User can list stories via REST API
- [ ] Token expiration handled correctly
- [ ] Invalid tokens rejected with proper error
- [ ] Missing tokens rejected with proper error

---

## Related Issues

- Test script authentication failure: `scripts/test-story-pipeline-complete.js`
- External API consumers unable to authenticate
- Webflow integration will be blocked by this issue

---

## References

- Supabase JWT Verification: https://supabase.com/docs/guides/auth/server-side-auth
- JWT Verification in Node.js: https://github.com/auth0/node-jsonwebtoken
- AuthMiddleware: `packages/universal-agent/src/middleware/AuthMiddleware.ts`
- AuthAgent: `packages/auth-agent/src/auth-agent.ts`
- TokenService: `packages/auth-agent/src/services/token.ts`

---

**Last Updated**: December 28, 2025  
**Author**: AI Agent (Claude Sonnet 4.5)  
**Status**: Documented, awaiting implementation


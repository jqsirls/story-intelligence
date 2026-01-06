# Authentication Patterns

**REST API Security & Token Management**

---

## Overview

Storytailor uses JWT-based authentication with the following key features:
- Short-lived access tokens (15 minutes)
- Long-lived refresh tokens (7 days)
- Role-based access control (RBAC)
- COPPA compliance for child accounts

---

## Token Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Gateway   │────▶│   Supabase  │
└─────────────┘     └─────────────┘     └─────────────┘
      │                    │                    │
      │  1. Login request  │                    │
      │───────────────────▶│                    │
      │                    │  2. Validate creds │
      │                    │───────────────────▶│
      │                    │  3. User data      │
      │                    │◀───────────────────│
      │  4. Access + Refresh tokens             │
      │◀───────────────────│                    │
      │                    │                    │
      │  5. API request w/ Bearer token         │
      │───────────────────▶│                    │
      │                    │  6. Verify JWT     │
      │                    │  7. Execute        │
      │  8. Response       │                    │
      │◀───────────────────│                    │
```

---

## Implementation

### Login Endpoint

```typescript
// POST /api/v1/auth/login
app.post('/api/v1/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Validate input
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
  });
  
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'ERR_2001',
      details: error.details
    });
  }
  
  // Authenticate with Supabase
  const { data, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (authError) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials',
      code: 'ERR_1001'
    });
  }
  
  // Return tokens
  res.json({
    success: true,
    data: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    }
  });
});
```

### Token Refresh

```typescript
// POST /api/v1/auth/refresh
app.post('/api/v1/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken
  });
  
  if (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid refresh token',
      code: 'ERR_1003'
    });
  }
  
  res.json({
    success: true,
    data: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    }
  });
});
```

---

## Middleware

### Auth Middleware

```typescript
async function authMiddleware(
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authorization header required',
      code: 'ERR_1001'
    });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'ERR_1002'
      });
    }
    
    // Attach user to request
    req.user = user;
    req.userId = user.id;
    
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Token verification failed',
      code: 'ERR_1002'
    });
  }
}
```

### Role-Based Access

```typescript
function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', req.userId)
      .single();
    
    if (!userRole || !roles.includes(userRole.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'ERR_1004'
      });
    }
    
    req.userRole = userRole.role;
    next();
  };
}

// Usage
app.get('/api/v1/admin/users', 
  authMiddleware, 
  requireRole('admin', 'super_admin'),
  listUsersHandler
);
```

---

## COPPA Compliance

### Parent Verification

```typescript
async function requireParentVerification(
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  // Check if accessing child profile
  const profileId = req.params.profileId;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('parent_id, is_child, coppa_verified')
    .eq('id', profileId)
    .single();
  
  if (profile?.is_child) {
    // Verify parent relationship
    if (profile.parent_id !== req.userId) {
      return res.status(403).json({
        success: false,
        error: 'Parent verification required',
        code: 'ERR_1005'
      });
    }
    
    // Verify COPPA consent
    if (!profile.coppa_verified) {
      return res.status(403).json({
        success: false,
        error: 'COPPA consent required for this profile',
        code: 'ERR_1005',
        details: {
          verifyUrl: '/api/v1/consent/coppa'
        }
      });
    }
  }
  
  next();
}
```

---

## Client-Side Token Management

### Wized Integration

```javascript
// Store tokens
window.Wized.push((Wized) => {
  Wized.data.v.accessToken = response.data.accessToken;
  Wized.data.v.refreshToken = response.data.refreshToken;
  Wized.data.v.tokenExpiry = response.data.expiresAt;
});

// Auto-refresh before expiry
function scheduleTokenRefresh() {
  const expiry = new Date(Wized.data.v.tokenExpiry).getTime();
  const now = Date.now();
  const refreshTime = expiry - (2 * 60 * 1000); // 2 min before expiry
  
  if (refreshTime > now) {
    setTimeout(async () => {
      await Wized.requests.execute('refreshToken');
      scheduleTokenRefresh();
    }, refreshTime - now);
  }
}
```

---

## Security Best Practices

1. **Always use HTTPS** in production
2. **Store tokens securely** (not in localStorage for sensitive apps)
3. **Implement token rotation** on refresh
4. **Set appropriate CORS headers**
5. **Rate limit auth endpoints** (5 attempts per minute)
6. **Log authentication events** for audit
7. **Use short token lifetimes** (15 min access, 7 day refresh)

---

**Last Updated**: December 23, 2025


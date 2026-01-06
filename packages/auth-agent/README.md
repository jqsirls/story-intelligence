# AuthAgent

The AuthAgent handles OAuth 2.0 voice-forward authentication flow for the Alexa Multi-Agent System, enabling seamless account linking between Storytailor and Alexa devices.

## Features

- **Voice-First OAuth 2.0 Flow**: Optimized for voice devices with 6-digit codes
- **Multi-Device Support**: Handles both voice and screen devices with magic links
- **JWT Token Management**: Issues and validates access/refresh tokens
- **COPPA Compliance**: Built-in protection for users under 13
- **Rate Limiting**: Prevents abuse with configurable rate limits
- **Audit Logging**: Comprehensive logging for compliance and debugging
- **Redis Caching**: High-performance session and rate limit storage

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Alexa Skill   │───▶│   AuthAgent      │───▶│   Supabase      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │                         │
                              ▼                         ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │     Redis        │    │  Voice Codes    │
                       │   (Caching)      │    │  Refresh Tokens │
                       └──────────────────┘    │  Rate Limits    │
                                               └─────────────────┘
```

## Quick Start

### Installation

```bash
npm install @alexa-multi-agent/auth-agent
```

### Basic Usage

```typescript
import { AuthAgent, loadConfig } from '@alexa-multi-agent/auth-agent';

// Load configuration from environment
const config = loadConfig();

// Create and initialize AuthAgent
const authAgent = new AuthAgent(config);
await authAgent.initialize();

// Account linking from Alexa
const linkingResponse = await authAgent.linkAccount({
  customerEmail: 'parent@example.com',
  alexaPersonId: 'amzn1.ask.person.EXAMPLE123',
  deviceType: 'voice',
  locale: 'en-US',
});

// Voice code verification
const tokenResponse = await authAgent.verifyVoiceCode({
  email: 'parent@example.com',
  code: linkingResponse.voiceCode,
  alexaPersonId: 'amzn1.ask.person.EXAMPLE123',
  deviceType: 'voice',
});

// Token validation
const userSession = await authAgent.validateToken(tokenResponse.accessToken);

// Cleanup
await authAgent.shutdown();
```

## Configuration

### Environment Variables

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-at-least-32-characters
JWT_ISSUER=storytailor.com
JWT_AUDIENCE=storytailor-users
JWT_ACCESS_TOKEN_TTL=3600  # 60 minutes
JWT_REFRESH_TOKEN_TTL=1209600  # 14 days

# Voice Code Configuration
VOICE_CODE_TTL=300  # 5 minutes
VOICE_CODE_MAX_ATTEMPTS=3

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=10
RATE_LIMIT_WINDOW_MS=60000  # 1 minute

# Magic Link Configuration
MAGIC_LINK_BASE_URL=https://storytailor.com
MAGIC_LINK_TTL=900  # 15 minutes
```

### Configuration Object

```typescript
import { AuthAgentConfig } from '@alexa-multi-agent/auth-agent';

const config: AuthAgentConfig = {
  supabase: {
    url: 'https://your-project.supabase.co',
    serviceKey: 'your-service-role-key',
  },
  redis: {
    url: 'redis://localhost:6379',
  },
  jwt: {
    secret: 'your-jwt-secret-key',
    issuer: 'storytailor.com',
    audience: 'storytailor-users',
    accessTokenTtl: 3600, // 60 minutes
    refreshTokenTtl: 1209600, // 14 days
  },
  voiceCode: {
    length: 6,
    ttl: 300, // 5 minutes
    maxAttempts: 3,
  },
  rateLimit: {
    maxRequestsPerMinute: 10,
    windowMs: 60000, // 1 minute
  },
  magicLink: {
    baseUrl: 'https://storytailor.com',
    ttl: 900, // 15 minutes
  },
};
```

## API Reference

### AuthAgent Class

#### Methods

##### `initialize(): Promise<void>`
Initializes the AuthAgent, connects to Redis and validates Supabase connection.

##### `shutdown(): Promise<void>`
Gracefully shuts down the AuthAgent and closes connections.

##### `linkAccount(request: AccountLinkingRequest): Promise<AccountLinkingResponse>`
Handles account linking request from Alexa, creates provisional account and returns voice code.

**Parameters:**
- `request.customerEmail`: User's email address
- `request.alexaPersonId`: Alexa Person ID from the skill
- `request.deviceType`: 'voice' or 'screen'
- `request.locale`: Optional locale (default: 'en-US')

**Returns:**
- `success`: Boolean indicating success
- `voiceCode`: 6-digit verification code
- `magicLinkUrl`: Magic link for screen devices
- `qrCodeUrl`: QR code URL for magic link
- `expiresAt`: Expiration timestamp
- `userId`: Created user ID

##### `verifyVoiceCode(verification: VoiceCodeVerification): Promise<TokenResponse>`
Verifies voice code and returns full JWT tokens.

**Parameters:**
- `verification.email`: User's email address
- `verification.code`: 6-digit voice code
- `verification.alexaPersonId`: Alexa Person ID
- `verification.deviceType`: 'voice' or 'screen'

**Returns:**
- `success`: Boolean indicating success
- `accessToken`: JWT access token (60 minutes)
- `refreshToken`: Refresh token (14 days)
- `expiresIn`: Token expiration in seconds
- `userId`: User ID

##### `validateToken(token: string): Promise<UserSession | null>`
Validates JWT token and returns user session data.

**Returns:**
- `UserSession` object with user data or `null` if invalid

##### `refreshToken(refreshToken: string): Promise<TokenResponse>`
Refreshes access token using refresh token.

##### `revokeToken(refreshToken: string): Promise<void>`
Revokes a refresh token.

##### `getUserByAlexaPersonId(alexaPersonId: string): Promise<UserSession | null>`
Finds user by Alexa Person ID.

### Types

#### AccountLinkingRequest
```typescript
interface AccountLinkingRequest {
  customerEmail: string;
  alexaPersonId: string;
  deviceType: 'voice' | 'screen';
  locale?: string;
  correlationId?: string;
}
```

#### VoiceCodeVerification
```typescript
interface VoiceCodeVerification {
  email: string;
  code: string; // 6 digits
  alexaPersonId: string;
  deviceType: 'voice' | 'screen';
}
```

#### UserSession
```typescript
interface UserSession {
  userId: string;
  email: string;
  alexaPersonId?: string;
  isEmailConfirmed: boolean;
  age?: number;
  parentEmail?: string;
  isCoppaProtected: boolean;
  parentConsentVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
}
```

## Database Schema

The AuthAgent requires the following database tables:

### Core Tables (from existing schema)
- `users` - User profiles with Alexa integration
- `alexa_user_mappings` - Maps Alexa Person IDs to user IDs
- `voice_codes` - Temporary verification codes

### AuthAgent-Specific Tables
- `refresh_tokens` - Long-lived refresh tokens
- `auth_rate_limits` - Rate limiting data
- `auth_sessions` - Session tracking

See `supabase/migrations/20240101000003_auth_agent_tables.sql` for complete schema.

## Security Features

### Rate Limiting
- Configurable requests per minute per identifier
- Separate limits for different actions (account linking, verification)
- Redis-based storage for high performance

### Token Security
- JWT tokens signed with HS256
- Refresh tokens stored as SHA-256 hashes
- Automatic token cleanup and expiration
- Token revocation support

### COPPA Compliance
- Automatic detection of users under 13
- Parent consent verification requirements
- Enhanced audit logging for protected users

### Audit Logging
- All authentication events logged
- PII hashing for privacy protection
- Correlation IDs for request tracing
- Integration with existing audit system

## Error Handling

The AuthAgent uses structured error handling with specific error codes:

```typescript
enum AuthErrorCode {
  INVALID_EMAIL = 'INVALID_EMAIL',
  VOICE_CODE_EXPIRED = 'VOICE_CODE_EXPIRED',
  VOICE_CODE_INVALID = 'VOICE_CODE_INVALID',
  MAX_ATTEMPTS_EXCEEDED = 'MAX_ATTEMPTS_EXCEEDED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  ACCOUNT_LINKING_FAILED = 'ACCOUNT_LINKING_FAILED',
  COPPA_VIOLATION = 'COPPA_VIOLATION',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}
```

## Testing

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

## Monitoring and Observability

### Logging
The AuthAgent uses Winston for structured logging with the following levels:
- `error`: Authentication failures, system errors
- `warn`: Invalid tokens, rate limiting
- `info`: Successful operations, user actions
- `debug`: Detailed flow information

### Metrics
Key metrics to monitor:
- Account linking success rate
- Voice code verification success rate
- Token validation latency
- Rate limiting triggers
- Database connection health

### Health Checks
```typescript
// Check if AuthAgent is healthy
const isHealthy = authAgent.isInitialized;

// Check active token count for a user
const tokenCount = await supabase.rpc('get_user_active_tokens', { 
  p_user_id: userId 
});
```

## Production Deployment

### Prerequisites
- Supabase project with required migrations applied
- Redis instance (AWS ElastiCache recommended)
- Environment variables configured
- SSL/TLS certificates for HTTPS

### Performance Considerations
- Use Redis clustering for high availability
- Configure appropriate connection pooling
- Monitor token cleanup job performance
- Set up proper logging aggregation

### Security Checklist
- [ ] JWT secret is at least 32 characters and randomly generated
- [ ] Supabase RLS policies are enabled and tested
- [ ] Redis is secured with authentication
- [ ] Rate limiting is configured appropriately
- [ ] Audit logging is enabled and monitored
- [ ] HTTPS is enforced for all endpoints

## Troubleshooting

### Common Issues

#### "AuthAgent not initialized"
Ensure `initialize()` is called before using any methods.

#### "Invalid email format"
Verify email validation regex and input sanitization.

#### "Voice code expired"
Check voice code TTL configuration and user response time.

#### "Rate limit exceeded"
Review rate limiting configuration and user behavior patterns.

#### "Database connection failed"
Verify Supabase URL and service key configuration.

### Debug Mode
Enable debug logging:
```bash
LOG_LEVEL=debug npm start
```

### Database Queries
Check voice code status:
```sql
SELECT * FROM voice_codes WHERE email = 'user@example.com' ORDER BY created_at DESC;
```

Check refresh token status:
```sql
SELECT * FROM refresh_tokens WHERE user_id = 'user-id' AND revoked = false;
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
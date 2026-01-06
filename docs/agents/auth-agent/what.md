# Auth Agent - What It Does

**Status**: Draft  
**Audience**: Product | Engineering  
**Last Updated**: 2025-12-11

## Core Functionality

### 1. Account Linking

**Purpose**: Links Storytailor user accounts with voice platform accounts (Alexa, Google, Apple)

**Process**:
1. Receives account linking request from voice platform
2. Creates provisional user account in Supabase
3. Generates 6-digit voice code or magic link
4. Stores verification code in Redis with TTL
5. Returns verification code/link to voice platform

**Code References:**
- `packages/auth-agent/src/services/account-linking.ts` - Account linking service
- `packages/auth-agent/src/auth-agent.ts:150-200` - Account linking implementation

### 2. Voice Code Verification

**Purpose**: Verifies 6-digit codes entered by users on voice devices

**Process**:
1. Validates code format and expiration
2. Checks attempt count (max 3 attempts)
3. Verifies code against Redis storage
4. Confirms user account
5. Issues JWT access and refresh tokens
6. Updates user session in database

**Code References:**
- `packages/auth-agent/src/services/voice-code.ts` - Voice code service
- `packages/auth-agent/src/auth-agent.ts:200-280` - Verification implementation

### 3. Token Management

**Purpose**: Issues, validates, and refreshes JWT tokens

**Capabilities**:
- **Access Tokens**: Short-lived (60 minutes) for API access
- **Refresh Tokens**: Long-lived (14 days) for token renewal
- **Token Validation**: Validates token signature and expiration
- **Token Revocation**: Revokes refresh tokens on logout

**Code References:**
- `packages/auth-agent/src/services/token.ts` - Token service
- `packages/auth-agent/src/auth-agent.ts:280-350` - Token management

### 4. User Registration

**Purpose**: Creates new user accounts with COPPA compliance

**Features**:
- Email validation
- Age verification
- Parent consent tracking (for users under 13)
- Provisional account creation
- Email confirmation workflow

**Code References:**
- `packages/auth-agent/src/auth-agent.ts:350-450` - User registration

### 5. Session Management

**Purpose**: Manages user sessions and authentication state

**Features**:
- Session creation and tracking
- Session validation
- Session cleanup
- Redis-based session storage

## API Methods

### `linkAccount(request: AccountLinkingRequest): Promise<AccountLinkingResponse>`

Links a Storytailor account with a voice platform account.

**Input**:
- `customerEmail`: User's email address
- `alexaPersonId`: Voice platform person ID
- `deviceType`: 'voice' or 'screen'
- `locale`: Optional locale (default: 'en-US')

**Output**:
- `success`: Boolean
- `voiceCode`: 6-digit verification code
- `magicLinkUrl`: Magic link for screen devices
- `qrCodeUrl`: QR code URL
- `expiresAt`: Expiration timestamp
- `userId`: Created user ID

### `verifyVoiceCode(verification: VoiceCodeVerification): Promise<TokenResponse>`

Verifies voice code and returns JWT tokens.

**Input**:
- `email`: User's email
- `code`: 6-digit code
- `alexaPersonId`: Voice platform person ID
- `deviceType`: 'voice' or 'screen'

**Output**:
- `success`: Boolean
- `accessToken`: JWT access token
- `refreshToken`: Refresh token
- `expiresIn`: Token expiration in seconds
- `userId`: User ID

### `validateToken(token: string): Promise<UserSession | null>`

Validates JWT token and returns user session.

**Input**:
- `token`: JWT access token

**Output**:
- `UserSession` object or `null` if invalid

### `refreshToken(refreshToken: string): Promise<TokenResponse>`

Refreshes access token using refresh token.

### `revokeToken(refreshToken: string): Promise<void>`

Revokes a refresh token.

## Database Tables

### Required Tables
- `users` - User profiles
- `alexa_user_mappings` - Maps voice platform IDs to user IDs
- `voice_codes` - Temporary verification codes
- `refresh_tokens` - Long-lived refresh tokens
- `auth_rate_limits` - Rate limiting data
- `auth_sessions` - Session tracking

**Code References:**
- `supabase/migrations/20240101000003_auth_agent_tables.sql` - Database schema

## Security Features

### Rate Limiting
- Configurable requests per minute
- Separate limits for different actions
- Redis-based storage

### Token Security
- JWT tokens signed with HS256
- Refresh tokens stored as SHA-256 hashes
- Automatic token cleanup
- Token revocation support

### COPPA Compliance
- Automatic detection of users under 13
- Parent consent verification
- Enhanced audit logging

### Audit Logging
- All authentication events logged
- PII hashing for privacy
- Correlation IDs for tracing

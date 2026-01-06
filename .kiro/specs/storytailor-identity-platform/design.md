# Design Document

## Overview

The Storytailor Identity Platform extends the existing multi-agent architecture to provide a production-grade OAuth 2.1 / OpenID Connect 1.0 identity provider. The design leverages the existing Supabase database schema, COPPA compliance framework, and multi-agent communication patterns while adding new specialized agents for identity management.

The platform maintains the existing Router-based architecture, ensuring that both Alexa voice interactions and third-party application integrations flow through the same authentication and authorization mechanisms.

## Architecture

### High-Level System Architecture

```mermaid
graph TB
    subgraph "Edge Layer"
        CF[CloudFront CDN]
        LE[Lambda@Edge]
    end
    
    subgraph "Identity Platform"
        IDP[IdPAgent]
        TS[TokenService]
        FD[Family Dashboard]
        SI[SignalIngestor]
    end
    
    subgraph "Existing Multi-Agent System"
        R[Router]
        AA[AuthAgent]
        LA[LibraryAgent]
        CA[ContentAgent]
        EA[EmotionAgent]
        COM[CommerceAgent]
        IA[InsightsAgent]
    end
    
    subgraph "Data Layer"
        SB[(Supabase)]
        KMS[AWS KMS]
        REDIS[(Redis Cache)]
    end
    
    subgraph "Client Applications"
        ALEXA[Alexa Skill]
        PARTNER[Partner Ed-Tech Apps]
        MOBILE[Mobile Apps]
    end
    
    subgraph "SDK & Widgets"
        CP[Character Picker]
        AUTH[Auth Components]
    end
    
    CF --> LE
    LE --> IDP
    IDP --> TS
    IDP --> AA
    TS --> KMS
    TS --> REDIS
    
    FD --> SB
    SI --> SB
    
    AA --> R
    R --> LA
    R --> CA
    R --> EA
    R --> COM
    R --> IA
    
    PARTNER --> IDP
    ALEXA --> AA
    MOBILE --> CP
    MOBILE --> AUTH
    
    CP --> IDP
    AUTH --> IDP
```

### Integration with Existing System

The identity platform integrates with the existing system through these key touchpoints:

1. **AuthAgent Enhancement**: The existing AuthAgent becomes a facade that delegates token operations to the new IdPAgent and TokenService
2. **Shared Database Schema**: Leverages existing user, library, and permission tables with new identity-specific tables
3. **Router Compatibility**: The Router continues to receive the same JWT format, ensuring backward compatibility
4. **Agent Communication**: Uses the existing gRPC-based inter-agent communication patterns

## Components and Interfaces

### IdPAgent (agents/idp/)

**Purpose**: Implements OAuth 2.1 and OpenID Connect 1.0 endpoints with kid-safe consent flows.

**Key Endpoints**:
- `GET /.well-known/openid-configuration` - OIDC discovery
- `GET /authorize` - Authorization endpoint with parental consent
- `POST /token` - Token exchange endpoint
- `GET /userinfo` - User information endpoint
- `POST /revoke` - Token revocation endpoint

**Interface**:
```typescript
interface IdPAgent {
  // OIDC Core Endpoints
  getConfiguration(): Promise<OIDCConfiguration>;
  authorize(request: AuthorizeRequest): Promise<AuthorizeResponse>;
  exchangeToken(request: TokenRequest): Promise<TokenResponse>;
  getUserInfo(accessToken: string): Promise<UserInfo>;
  revokeToken(request: RevokeRequest): Promise<void>;
  
  // Kid-Safe Extensions
  validateParentalConsent(childId: string, clientId: string, scopes: string[]): Promise<boolean>;
  presentConsentScreen(parentId: string, childId: string, clientId: string): Promise<ConsentResponse>;
  
  // Integration with AuthAgent
  delegateToAuthAgent(request: AuthRequest): Promise<AuthResponse>;
}
```

### TokenService (agents/tokens/)

**Purpose**: Handles JWT signing, validation, and key rotation using AWS KMS.

**Key Functions**:
- JWT signing with P-256 and EdDSA algorithms
- Token introspection and validation
- Refresh token management
- Key rotation and JWK set management

**Interface**:
```typescript
interface TokenService {
  // Token Operations
  signJWT(payload: JWTPayload, keyId: string): Promise<string>;
  validateJWT(token: string): Promise<JWTPayload>;
  introspectToken(token: string): Promise<TokenIntrospection>;
  
  // Key Management
  rotateKeys(): Promise<void>;
  getJWKS(): Promise<JWKS>;
  
  // Refresh Token Management
  issueRefreshToken(userId: string, clientId: string): Promise<string>;
  validateRefreshToken(token: string): Promise<RefreshTokenPayload>;
  revokeRefreshToken(token: string): Promise<void>;
}
```

### Family Dashboard (apps/family-dashboard/)

**Purpose**: Next.js 14 web application for parental control and application management.

**Key Features**:
- Server-side rendering with Supabase auth
- Child and connected application management
- Token revocation interface
- Activity monitoring and reporting

**Architecture**:
```typescript
// App Router Structure
app/
├── layout.tsx              // Root layout with auth
├── page.tsx               // Dashboard overview
├── children/
│   ├── [childId]/
│   │   ├── page.tsx       // Child detail view
│   │   └── apps/
│   │       └── page.tsx   // Connected apps management
├── settings/
│   └── page.tsx           // Account settings
└── api/
    ├── revoke/
    │   └── route.ts       // Token revocation API
    └── children/
        └── route.ts       // Child management API
```

### SignalIngestor (agents/signals/)

**Purpose**: Normalizes partner webhooks into the existing narrative signals system.

**Key Functions**:
- Webhook authentication and validation
- Event normalization and transformation
- Integration with existing EmotionAgent and InsightsAgent

**Interface**:
```typescript
interface SignalIngestor {
  // Webhook Processing
  processLearningEvent(event: LearningEvent): Promise<void>;
  processMoodUpdate(event: MoodEvent): Promise<void>;
  processEngagementSignal(event: EngagementEvent): Promise<void>;
  
  // Normalization
  normalizeToNarrativeSignal(event: PartnerEvent): Promise<NarrativeSignal>;
  
  // Integration
  forwardToEmotionAgent(signal: EmotionSignal): Promise<void>;
  forwardToInsightsAgent(signal: InsightSignal): Promise<void>;
}
```

### Character Picker SDK (sdk/widgets/character-picker/)

**Purpose**: Cross-platform UI components for character selection with consent flow.

**Platforms**:
- React (Web/React Native)
- Unity (C#)
- iOS SwiftUI

**Interface** (React example):
```typescript
interface CharacterPickerProps {
  userId: string;
  onCharacterSelected: (characterId: string) => void;
  onConsentRequired: (consentUrl: string) => void;
  theme?: StorytalorTheme;
  allowedCharacters?: string[];
}

export const CharacterPicker: React.FC<CharacterPickerProps>;
```

## Data Models

### New Identity Tables

The identity platform adds several new tables to the existing Supabase schema:

```sql
-- OAuth clients and applications
CREATE TABLE oauth_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT UNIQUE NOT NULL,
  client_secret_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  redirect_uris TEXT[] NOT NULL,
  allowed_scopes TEXT[] NOT NULL,
  is_trusted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Authorization codes (short-lived)
CREATE TABLE authorization_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  client_id TEXT REFERENCES oauth_clients(client_id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  character_id UUID REFERENCES characters(id),
  scopes TEXT[] NOT NULL,
  redirect_uri TEXT NOT NULL,
  code_challenge TEXT,
  code_challenge_method TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refresh tokens (long-lived)
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT UNIQUE NOT NULL,
  client_id TEXT REFERENCES oauth_clients(client_id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  character_id UUID REFERENCES characters(id),
  scopes TEXT[] NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parental consent records
CREATE TABLE parental_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES users(id) NOT NULL,
  child_id UUID REFERENCES users(id) NOT NULL,
  client_id TEXT REFERENCES oauth_clients(client_id) NOT NULL,
  scopes TEXT[] NOT NULL,
  granted BOOLEAN NOT NULL,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partner webhook events and signals
CREATE TABLE narrative_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  character_id UUID REFERENCES characters(id),
  client_id TEXT REFERENCES oauth_clients(client_id),
  signal_type TEXT NOT NULL, -- 'learning', 'mood', 'engagement'
  signal_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- JWK key rotation tracking
CREATE TABLE jwk_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kid TEXT UNIQUE NOT NULL,
  kms_key_id TEXT NOT NULL,
  algorithm TEXT NOT NULL, -- 'ES256', 'EdDSA'
  public_key JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
```

### Enhanced User Model

The existing user model is extended with identity-specific fields:

```sql
-- Add identity provider fields to existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS oidc_sub TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_character_id UUID REFERENCES characters(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_version INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_consent_at TIMESTAMPTZ;
```

## Error Handling

### OAuth Error Responses

The identity provider implements standard OAuth 2.1 error responses:

```typescript
interface OAuthError {
  error: 'invalid_request' | 'unauthorized_client' | 'access_denied' | 
         'unsupported_response_type' | 'invalid_scope' | 'server_error' | 
         'temporarily_unavailable';
  error_description?: string;
  error_uri?: string;
  state?: string;
}
```

### COPPA-Specific Errors

Additional error types for child protection:

```typescript
interface COPPAError extends OAuthError {
  error: 'parental_consent_required' | 'age_verification_failed' | 
         'coppa_violation' | 'guardian_approval_pending';
  consent_url?: string;
  guardian_contact?: string;
}
```

### Error Recovery Strategies

1. **Consent Flow Errors**: Redirect to parental consent screen with clear instructions
2. **Token Validation Errors**: Implement token refresh with graceful degradation
3. **Key Rotation Errors**: Maintain multiple active keys during rotation periods
4. **Partner Integration Errors**: Dead letter queuing with exponential backoff

## Testing Strategy

### OIDC Conformance Testing

1. **OpenID Connect Conformance Suite**: Automated testing against official test suite
2. **OAuth 2.1 Security Testing**: PKCE, state parameter validation, and security best practices
3. **JWT Validation**: Token structure, signature validation, and claim verification

### COPPA Compliance Testing

1. **Age Verification**: Test age gate functionality and parental consent flows
2. **Data Minimization**: Verify only requested scopes are granted and enforced
3. **Consent Management**: Test consent granting, revocation, and expiration

### Performance Testing

1. **Cold Start Performance**: Lambda@Edge cold start time measurement
2. **OAuth Flow Performance**: End-to-end authorization code flow timing
3. **Load Testing**: Concurrent user authentication and token validation
4. **Edge Caching**: CDN cache hit rates and performance optimization

### Integration Testing

1. **AuthAgent Integration**: Verify seamless integration with existing authentication
2. **Multi-Agent Communication**: Test gRPC communication patterns
3. **Database Consistency**: Verify RLS policies and data integrity
4. **Partner SDK Testing**: Cross-platform widget functionality

### Security Testing

1. **Penetration Testing**: Third-party security assessment of identity endpoints
2. **Token Security**: JWT signing, validation, and key rotation security
3. **COPPA Compliance Audit**: Legal and technical compliance verification
4. **Data Privacy Testing**: GDPR compliance and data handling verification

## Deployment Architecture

### Edge Deployment Strategy

```mermaid
graph TB
    subgraph "Global Edge"
        CF[CloudFront Distribution]
        LE1[Lambda@Edge - US East]
        LE2[Lambda@Edge - EU West]
        LE3[Lambda@Edge - Asia Pacific]
    end
    
    subgraph "Regional Services"
        KMS1[AWS KMS - US East]
        KMS2[AWS KMS - EU West]
        KMS3[AWS KMS - Asia Pacific]
    end
    
    subgraph "Core Infrastructure"
        SB[(Supabase - Primary)]
        REDIS[(Redis - Global)]
        MONITOR[Monitoring & Alerting]
    end
    
    CF --> LE1
    CF --> LE2
    CF --> LE3
    
    LE1 --> KMS1
    LE2 --> KMS2
    LE3 --> KMS3
    
    LE1 --> SB
    LE2 --> SB
    LE3 --> SB
    
    LE1 --> REDIS
    LE2 --> REDIS
    LE3 --> REDIS
```

### Performance Optimization

1. **Edge Caching**: Cache OIDC configuration, JWKs, and static assets at CDN edge
2. **Connection Pooling**: Maintain persistent database connections across Lambda invocations
3. **Key Caching**: Cache public keys in Redis with automatic invalidation
4. **Precomputed Responses**: Cache common OAuth responses and user consent screens

### Monitoring and Observability

1. **Performance Metrics**: Cold start times, OAuth flow duration, token validation latency
2. **Business Metrics**: Consent rates, application integrations, user authentication patterns
3. **Security Metrics**: Failed authentication attempts, token abuse patterns, compliance violations
4. **Compliance Metrics**: COPPA consent tracking, data retention compliance, audit log completeness

This design ensures that the Storytailor Identity Platform integrates seamlessly with your existing multi-agent system while providing a robust, compliant, and performant identity provider for third-party integrations.
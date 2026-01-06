Status: Submission Ready  
Audience: PRIVO Auditor | Technical Reviewer  
Last-Updated: 2025-01-15  
Owner: Storytailor Compliance Team  
Verified-Against-Code: Yes  
Doc-ID: PRIVO-ARCH-2025-001

# PRIVO Architecture & Data Flow Diagrams

## Overview

This document provides comprehensive architecture and data flow diagrams for the Storytailor backend system, demonstrating COPPA compliance implementation through technical architecture.

**System Type:** Backend API Service (No User-Facing UI)  
**Infrastructure:** AWS Lambda, Supabase (PostgreSQL), Redis, SendGrid

## System Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph External["External Clients"]
        Voice[Voice Assistants<br/>Alexa, Google]
        SDK[SDK Clients]
        MCP[MCP Agents]
    end
    
    subgraph AWS["AWS Infrastructure"]
        APIGateway[API Gateway<br/>REST Endpoints]
        Router[Router Lambda<br/>Intent Classification]
        AuthAgent[Auth Agent Lambda]
        ContentAgent[Content Agent Lambda]
        SafetyAgent[Child Safety Agent Lambda]
        SSM[SSM Parameter Store<br/>Secrets Management]
        S3[S3 Buckets<br/>Asset Storage]
    end
    
    subgraph Database["Database Layer"]
        Supabase[(Supabase PostgreSQL<br/>RLS Enabled)]
        Redis[(Redis<br/>Session State)]
    end
    
    subgraph ExternalServices["External Services"]
        SendGrid[SendGrid<br/>Email Delivery]
        OpenAI[OpenAI<br/>Content Generation]
    end
    
    Voice --> APIGateway
    SDK --> APIGateway
    MCP --> APIGateway
    
    APIGateway --> Router
    Router --> AuthAgent
    Router --> ContentAgent
    Router --> SafetyAgent
    
    AuthAgent --> Supabase
    AuthAgent --> Redis
    ContentAgent --> Supabase
    SafetyAgent --> Supabase
    
    Router --> SSM
    AuthAgent --> SSM
    ContentAgent --> SSM
    
    SafetyAgent --> SendGrid
    AuthAgent --> SendGrid
    
    ContentAgent --> OpenAI
    ContentAgent --> S3
```

**Code References:**
- `docs/system/architecture.md` - Complete architecture documentation
- `lambda-deployments/router/src/lambda.ts` - Router implementation

## Data Flow: User Registration & Age Verification

### Registration Flow

```mermaid
sequenceDiagram
    participant Client
    participant APIGateway
    participant Router
    participant AuthAgent
    participant Supabase
    participant Redis

    Client->>APIGateway: POST /v1/auth/register<br/>{age, parentEmail, ...}
    APIGateway->>Router: Route to auth handler
    Router->>AuthAgent: Process registration
    AuthAgent->>Supabase: Validate age & parentEmail
    
    alt Age < 13 AND parentEmail missing
        Supabase-->>AuthAgent: Database constraint error
        AuthAgent-->>Router: Error: PARENT_EMAIL_REQUIRED
        Router-->>APIGateway: 400 Bad Request
        APIGateway-->>Client: Error response
    else Age < 13 AND parentEmail provided
        AuthAgent->>Supabase: INSERT user<br/>isCoppaProtected=true
        Supabase-->>AuthAgent: User created
        AuthAgent->>Redis: Store consent status: pending
        AuthAgent-->>Router: User created, consent required
        Router-->>APIGateway: 201 Created
        APIGateway-->>Client: {userId, isCoppaProtected: true, requiresConsent: true}
    else Age >= 13
        AuthAgent->>Supabase: INSERT user<br/>isCoppaProtected=false
        Supabase-->>AuthAgent: User created
        AuthAgent-->>Router: User created
        Router-->>APIGateway: 201 Created
        APIGateway-->>Client: {userId, isCoppaProtected: false}
    end
```

**Code References:**
- `packages/auth-agent/src/auth-agent.ts:99-100` - Registration handler
- `supabase/migrations/20240101000017_add_user_type_support.sql:76-78` - Database constraint

### Database-Level Age Verification

```mermaid
graph LR
    A[Registration Request] --> B{Database Function<br/>check_age_constraint}
    B --> C{Age < 13?}
    C -->|Yes| D{Parent Email<br/>Provided?}
    C -->|No| E[Allow Registration<br/>isCoppaProtected=false]
    D -->|Yes| F[Allow Registration<br/>isCoppaProtected=true]
    D -->|No| G[RAISE EXCEPTION<br/>Parent email required]
    
    style G fill:#ff6b6b
    style F fill:#51cf66
    style E fill:#51cf66
```

**Database Constraint:**
```sql
-- From migration 20240101000017_add_user_type_support.sql:76-78
IF p_age < 13 AND (p_parent_email IS NULL OR p_parent_email = '') THEN
  RAISE EXCEPTION 'Children under 13 require parent email for COPPA compliance';
END IF;
```

## Data Flow: Parental Consent Workflow

### Consent Request & Verification Flow

```mermaid
sequenceDiagram
    participant Parent
    participant Client
    participant Router
    participant Redis
    participant EmailService
    participant SendGrid

    Client->>Router: POST /v1/consent/request<br/>{parentEmail, childAge}
    Router->>Router: Validate email format<br/>Validate age (1-17)
    
    alt Validation fails
        Router-->>Client: 400 Bad Request
    else Validation succeeds
        Router->>Redis: Create consent request<br/>Key: parentConsent:meta:{userId}<br/>Status: pending
        Redis-->>Router: Request ID generated
        Router->>EmailService: Send consent email<br/>(if implemented)
        EmailService->>SendGrid: Send email to parent<br/>with verification link
        Router-->>Client: 201 Created<br/>{requestId, status: pending}
        
        Note over Parent: Parent receives email<br/>with verification link
        
        Parent->>Client: Click link or submit token
        Client->>Router: POST /v1/consent/verify<br/>{requestId}
        Router->>Redis: Get consent request<br/>parentConsent:meta:{userId}
        Redis-->>Router: Request metadata
        
        alt Request not found
            Router-->>Client: 404 Not Found
        else Request found
            Router->>Redis: Update status: verified<br/>Set parentConsent:{userId} = verified<br/>Record consentAt timestamp
            Router->>Redis: Increment auth:sv:{userId}<br/>(force token refresh)
            Router-->>Client: 200 OK<br/>{success: true, status: verified}
        end
    end
```

**Code References:**
- `lambda-deployments/router/src/lambda.ts:652-677` - Consent request handler
- `lambda-deployments/router/src/lambda.ts:679-698` - Consent verification handler

### Consent Status Check Flow

```mermaid
sequenceDiagram
    participant Client
    participant Router
    participant Redis

    Client->>Router: GET /v1/consent/status<br/>Authorization: Bearer <token>
    Router->>Router: Extract userId from token
    Router->>Redis: GET parentConsent:{userId}
    Redis-->>Router: Consent flag (none/pending/verified)
    Router->>Redis: GET parentConsent:meta:{userId}
    Redis-->>Router: Consent metadata (if exists)
    Router-->>Client: 200 OK<br/>{status, meta}
```

**Code References:**
- `lambda-deployments/router/src/lambda.ts:700-712` - Consent status handler

## Data Flow: Data Collection & Retention

### Data Collection Flow

```mermaid
graph TB
    A[User Interaction] --> B{Router}
    B --> C{Parent Consent<br/>Middleware}
    C -->|COPPA Protected<br/>No Consent| D[Block Request<br/>403 Forbidden]
    C -->|Consent Verified| E[Process Request]
    E --> F[Content Agent]
    E --> G[Safety Agent]
    F --> H[Collect Data]
    G --> I[Safety Check]
    H --> J[(Supabase<br/>RLS Protected)]
    I --> J
    J --> K[Audit Log]
    K --> L[Retention Policy<br/>Check]
    L --> M{Retention Period<br/>Expired?}
    M -->|Yes| N[Automated Deletion<br/>or Anonymization]
    M -->|No| O[Data Retained]
```

**Code References:**
- `packages/universal-agent/src/middleware/AuthMiddleware.ts:83-108` - Parent consent middleware
- `supabase/migrations/20240101000002_enhanced_schema_and_policies.sql:133-139` - Retention policies

### Data Retention & Deletion Flow

```mermaid
sequenceDiagram
    participant RetentionJob
    participant Supabase
    participant AuditLog

    Note over RetentionJob: Scheduled Daily<br/>EventBridge Trigger
    
    RetentionJob->>Supabase: Query expired data<br/>by retention policy
    Supabase-->>RetentionJob: List of expired records
    
    loop For each expired record
        RetentionJob->>Supabase: Check deletion strategy
        
        alt Hard Delete
            RetentionJob->>Supabase: DELETE record
            Supabase-->>RetentionJob: Deleted
        else Anonymize
            RetentionJob->>Supabase: UPDATE record<br/>Anonymize PII
            Supabase-->>RetentionJob: Anonymized
        end
        
        RetentionJob->>AuditLog: Log deletion/anonymization
    end
```

**Retention Policies:**

| Data Type | Retention | Strategy | Code Reference |
|-----------|-----------|----------|----------------|
| Audio Transcripts | 30 days | Hard delete | `supabase/migrations/20240101000002_enhanced_schema_and_policies.sql:133-139` |
| Emotions | 365 days | Anonymize | Same |
| Voice Codes | 1 day | Hard delete | Same |
| Conversation States | 24 hours | Hard delete | Same |
| Audit Logs | 7 years | Anonymize | Legal requirement |

**Code References:**
- `supabase/migrations/20240101000002_enhanced_schema_and_policies.sql:133-139` - Retention policy definitions
- `docs/compliance/gdpr.md:22-50` - Data retention documentation

## Data Flow: Parental Rights

### Data Access Flow

```mermaid
sequenceDiagram
    participant Parent
    participant Client
    participant Router
    participant AuthMiddleware
    participant Supabase
    participant RLS[Row Level Security]

    Parent->>Client: Request child data
    Client->>Router: GET /v1/parent/data?userId=<child_id><br/>Authorization: Bearer <parent_token>
    Router->>AuthMiddleware: Validate token
    AuthMiddleware->>AuthMiddleware: Extract parent userId
    AuthMiddleware->>Supabase: Verify parent-child relationship
    Supabase-->>AuthMiddleware: Relationship verified
    
    AuthMiddleware->>Supabase: Query child data<br/>SELECT * FROM ...
    Supabase->>RLS: Check RLS policies
    RLS->>RLS: Verify parent access allowed
    RLS-->>Supabase: Access granted
    Supabase-->>AuthMiddleware: Child data
    AuthMiddleware->>Supabase: Query stories, characters, emotions
    Supabase-->>AuthMiddleware: All child data
    AuthMiddleware-->>Router: Complete data set
    Router-->>Client: 200 OK<br/>{data: {...}}
    Client-->>Parent: Display data
```

**Code References:**
- `docs/compliance/gdpr.md:80-120` - Data access implementation
- `supabase/migrations/20240101000001_rls_policies.sql` - RLS policy definitions

### Data Deletion Flow

```mermaid
sequenceDiagram
    participant Parent
    participant Client
    participant Router
    participant DeletionService
    participant Supabase
    participant AuditLog
    participant EmailService

    Parent->>Client: Request child data deletion
    Client->>Router: DELETE /v1/parent/data?userId=<child_id><br/>Authorization: Bearer <parent_token>
    Router->>Router: Validate parent authorization
    Router->>DeletionService: Delete child data
    DeletionService->>Supabase: DELETE FROM stories<br/>WHERE user_id = child_id
    DeletionService->>Supabase: DELETE FROM characters<br/>WHERE user_id = child_id
    DeletionService->>Supabase: DELETE FROM emotions<br/>WHERE user_id = child_id
    DeletionService->>Supabase: DELETE FROM users<br/>WHERE id = child_id
    Supabase-->>DeletionService: All data deleted
    DeletionService->>AuditLog: Log deletion event<br/>(anonymized)
    DeletionService->>EmailService: Send confirmation email
    EmailService->>SendGrid: Send email to parent
    DeletionService-->>Router: Deletion complete
    Router-->>Client: 200 OK<br/>{success: true, deletedAt: timestamp}
    Client-->>Parent: Confirmation
```

**Code References:**
- `packages/universal-agent/src/services/DeletionService.ts` - Deletion service
- `docs/compliance/gdpr.md:121-160` - Data deletion documentation

### Data Export Flow

```mermaid
sequenceDiagram
    participant Parent
    participant Client
    participant Router
    participant ExportService
    participant Supabase
    participant S3

    Parent->>Client: Request data export
    Client->>Router: GET /v1/parent/export?userId=<child_id><br/>Authorization: Bearer <parent_token>
    Router->>Router: Validate parent authorization
    Router->>ExportService: Export child data
    ExportService->>Supabase: Query all child data<br/>(stories, characters, emotions, etc.)
    Supabase-->>ExportService: Complete data set
    ExportService->>ExportService: Format as JSON
    ExportService->>ExportService: Create ZIP archive
    ExportService->>S3: Upload export file<br/>with 7-day expiration
    S3-->>ExportService: S3 URL
    ExportService-->>Router: Export URL
    Router-->>Client: 200 OK<br/>{exportUrl, expiresAt}
    Client-->>Parent: Download link
```

**Code References:**
- `docs/compliance/gdpr.md:161-179` - Data export implementation
- `packages/universal-agent/src/api/RESTAPIGateway.ts` - Export endpoint

## Security Architecture

### Row Level Security (RLS) Flow

```mermaid
graph TB
    A[API Request] --> B[Supabase Query]
    B --> C{RLS Policy<br/>Check}
    C --> D{User Type?}
    D -->|Parent| E{Parent-Child<br/>Relationship?}
    D -->|Child| F{Own Data?}
    D -->|Service Role| G[Full Access<br/>Server Operations]
    E -->|Yes| H[Access Granted]
    E -->|No| I[Access Denied]
    F -->|Yes| H
    F -->|No| I
    G --> H
    H --> J[Return Data]
    I --> K[403 Forbidden]
    
    style I fill:#ff6b6b
    style H fill:#51cf66
    style G fill:#4dabf7
```

**RLS Policies:**
- User-based access control
- Parent access to child data
- COPPA-protected user restrictions
- Service role access for system operations

**Code References:**
- `supabase/migrations/20240101000001_rls_policies.sql` - Complete RLS policy definitions
- `docs/integrations/supabase.md:42-53` - RLS documentation

### Encryption Flow

```mermaid
graph LR
    A[Client Request] -->|HTTPS/TLS| B[API Gateway]
    B -->|HTTPS/TLS| C[Lambda Functions]
    C -->|SSL/TLS| D[(Supabase<br/>Encrypted at Rest)]
    C -->|HTTPS/TLS| E[SendGrid<br/>TLS Email]
    C -->|HTTPS/TLS| F[AWS S3<br/>Encrypted at Rest]
    C -->|KMS Encrypted| G[SSM Parameters<br/>SecureString]
    
    style D fill:#51cf66
    style F fill:#51cf66
    style G fill:#51cf66
```

**Encryption Points:**
- **In Transit:** All API calls use HTTPS/TLS
- **At Rest (Database):** Supabase database encryption
- **At Rest (Storage):** S3 bucket encryption
- **Secrets:** SSM SecureString parameters encrypted with KMS

**Code References:**
- `docs/integrations/supabase.md:100-108` - Supabase encryption
- `docs/integrations/aws.md:84-90` - AWS encryption

## Audit Trail Architecture

### Audit Logging Flow

```mermaid
sequenceDiagram
    participant Service
    participant AuditService
    participant Supabase
    participant AuditLog[(audit_log table)]

    Service->>Service: User action performed
    Service->>AuditService: Log event<br/>{action, userId, resource, metadata}
    AuditService->>AuditService: Anonymize PII<br/>(for children)
    AuditService->>Supabase: INSERT INTO audit_log<br/>{user_id, action_type, resource_type, metadata, ip_address, created_at}
    Supabase->>AuditLog: Store audit record
    AuditLog-->>AuditService: Record stored
    AuditService-->>Service: Logged
```

**Logged Events:**
- User authentication
- Consent requests and verifications
- Data access requests
- Data deletion requests
- Safety incidents
- API errors and security violations

**Code References:**
- `supabase/migrations/20240101000000_initial_schema.sql:93-102` - Audit log schema
- `packages/child-safety-agent/src/services/SafetyMonitoringService.ts` - Safety incident logging

## Third-Party Integration Points

### SendGrid Email Flow

```mermaid
sequenceDiagram
    participant Service
    participant EmailService
    participant SendGrid
    participant Parent

    Service->>EmailService: Send parent notification<br/>{parentEmail, content}
    EmailService->>EmailService: Validate parent email
    EmailService->>EmailService: Generate email content<br/>(minimize child data)
    EmailService->>SendGrid: POST /v3/mail/send<br/>{to: parentEmail, content}
    SendGrid->>SendGrid: TLS encryption
    SendGrid->>Parent: Deliver email
    SendGrid-->>EmailService: Delivery confirmation
    EmailService-->>Service: Email sent
```

**Data Minimization:**
- Only parent email addresses sent (not child emails)
- Email content limited to necessary information
- No PII in email headers
- TLS encryption for delivery

**Code References:**
- `docs/integrations/sendgrid.md:36-57` - SendGrid privacy documentation
- `packages/child-safety-agent/src/services/ParentNotificationService.ts` - Parent notification service

## Related Documentation

- **[PRIVO Certification Package](./privo-certification-package.md)** - Main certification document
- **[PRIVO API Reference](./privo-api-reference.md)** - Detailed API documentation
- **[System Architecture](../system/architecture.md)** - Complete system architecture
- **[COPPA Compliance](./coppa.md)** - COPPA compliance documentation

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-15

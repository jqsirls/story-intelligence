# PII Handling Runbook

**Last Updated**: 2025-12-13

## Overview

This runbook provides operational procedures for handling Personally Identifiable Information (PII) in the Storytailor system, ensuring COPPA and GDPR compliance.

## PII Detection

### Automated Detection

The system automatically detects PII in:
- User input (conversations, registration)
- Logs and error messages
- Database queries
- API responses

### Detection Methods

1. **Pattern Matching**: Email addresses, phone numbers, addresses
2. **Named Entity Recognition**: Names, locations, organizations
3. **Context Analysis**: Age, gender, personal details

## PII Tokenization

### Process

1. **Detection**: Identify PII in data
2. **Extraction**: Extract PII values
3. **Hashing**: SHA-256 hash of PII value
4. **Storage**: Store hash instead of original value
5. **Mapping**: Maintain secure mapping (encrypted) for authorized access only

### Implementation

```typescript
// PII is tokenized using SHA-256
const tokenized = sha256(originalPII);
// Example: sha256("john.doe@example.com") → "abc123..."
```

### Logging

- **PII in logs**: Automatically tokenized before logging
- **Error messages**: PII redacted
- **Debug logs**: PII never included

## PII Storage

### Database

- **Encryption**: PII encrypted at rest
- **Access Control**: RLS policies enforce access
- **Audit Trail**: All PII access logged

### Cache (Redis)

- **TTL**: Short TTL for cached PII
- **Encryption**: Encrypted in transit and at rest
- **No Persistence**: PII not persisted to disk

## PII Access

### Authorized Access

- **User's own data**: User can access their own PII
- **Parent/Guardian**: Can access child's PII (COPPA)
- **System operations**: Service role for system operations
- **Legal requests**: With proper authorization

### Access Logging

All PII access is logged:
- Who accessed
- What was accessed
- When accessed
- Purpose of access

## PII Deletion

### Right to be Forgotten (GDPR)

1. **Request Received**: User requests data deletion
2. **Verification**: Verify user identity
3. **Backup**: Create encrypted backup (legal retention)
4. **Deletion**: Delete from all systems
5. **Confirmation**: Confirm deletion to user

### COPPA Deletion

1. **Parent Request**: Parent requests child data deletion
2. **Verification**: Verify parent identity
3. **Immediate Deletion**: Delete immediately (no retention)
4. **Confirmation**: Confirm to parent

### Deletion Process

```typescript
// PII deletion process
1. Delete from database (with cascade)
2. Delete from cache
3. Delete from logs (if possible)
4. Delete from backups (after retention period)
5. Log deletion event
```

## PII Export

### Data Export (GDPR)

1. **Request Received**: User requests data export
2. **Verification**: Verify user identity
3. **Collection**: Collect all user data
4. **Formatting**: Format as JSON or CSV
5. **Encryption**: Encrypt export file
6. **Delivery**: Secure delivery to user

## Incident Response

### PII Breach

1. **Detection**: Detect potential breach
2. **Containment**: Contain the breach
3. **Assessment**: Assess scope and impact
4. **Notification**: Notify affected users and authorities (if required)
5. **Remediation**: Fix vulnerability
6. **Documentation**: Document incident

### Breach Notification

- **Users**: Notify within 72 hours (GDPR)
- **Authorities**: Notify within 72 hours (GDPR)
- **Parents**: Notify immediately (COPPA)

## Compliance

### COPPA

- **Parental Consent**: Required for under-13 users
- **Data Minimization**: Collect only necessary data
- **No Sharing**: Don't share with third parties without consent
- **Deletion**: Immediate deletion on request

### GDPR

- **Right to Access**: Users can request their data
- **Right to Rectification**: Users can correct their data
- **Right to Erasure**: Users can request deletion
- **Data Portability**: Users can export their data
- **Privacy by Design**: Built into system architecture

## Monitoring

### PII Access Monitoring

- Monitor all PII access
- Alert on unusual access patterns
- Review access logs regularly
- Audit access permissions

### Compliance Monitoring

- Track data retention periods
- Monitor deletion requests
- Verify consent status
- Audit data sharing

## Related Documentation

- [Compliance Documentation](./compliance/README.md) - COPPA and GDPR docs
- [Security Framework](../packages/security-framework/README.md) - Security utilities

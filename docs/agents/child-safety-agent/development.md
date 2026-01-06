# Child Safety Agent - Developer Documentation

**Status**: Draft  
**Audience**: Engineering  
**Last Updated**: 2025-12-13

## Technical Architecture

### Core Components

1. **ChildSafetyAgent** (`packages/child-safety-agent/src/ChildSafetyAgent.ts`)
   - Main agent class
   - Coordinates all safety services
   - Public API interface

2. **DisclosureDetectionService** (`packages/child-safety-agent/src/services/DisclosureDetectionService.ts`)
   - Detects abuse or trauma disclosures
   - Pattern recognition for disclosure indicators
   - Risk assessment

3. **CrisisInterventionService** (`packages/child-safety-agent/src/services/CrisisInterventionService.ts`)
   - Immediate crisis response
   - Professional escalation
   - Crisis hotline integration

4. **MandatoryReportingService** (`packages/child-safety-agent/src/services/MandatoryReportingService.ts`)
   - Mandatory reporting to authorities
   - Jurisdiction-specific protocols
   - Audit trail management

5. **DistressDetectionService** (`packages/child-safety-agent/src/services/DistressDetectionService.ts`)
   - Emotional distress monitoring
   - Mental health concern detection
   - Risk scoring

6. **InappropriateContentHandler** (`packages/child-safety-agent/src/services/InappropriateContentHandler.ts`)
   - Content filtering
   - Inappropriate request blocking
   - Age-appropriate enforcement

## API Reference

### Monitor Conversation
```typescript
const safetyResult = await childSafetyAgent.monitorConversation({
  userId: 'user-123',
  userInput: 'conversation text',
  conversationContext: context
});
```

### Detect Crisis
```typescript
const crisisResult = await childSafetyAgent.detectCrisis({
  userId: 'user-123',
  indicators: ['distress', 'abuse_disclosure']
});
```

### Initiate Intervention
```typescript
await childSafetyAgent.initiateIntervention({
  userId: 'user-123',
  riskLevel: 'high',
  indicators: ['suicidal_ideation']
});
```

**Code References:**
- `packages/child-safety-agent/README.md` - Complete API
- `docs/agents/child-safety-agent.md` - Agent documentation

## Configuration

### Environment Variables
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[REDACTED_SUPABASE_SERVICE_ROLE_KEY]
CRISIS_HOTLINE_SUICIDE=988
CRISIS_HOTLINE_CHILD_ABUSE=1-800-4-A-CHILD
```

### Lambda Configuration
- **Runtime**: Node.js 22.x
- **Timeout**: 30 seconds
- **Memory**: 256 MB
- **Region**: us-east-1

## Testing

### Local Testing
```bash
cd packages/child-safety-agent
npm test
```

### Integration Testing
- Test against staging environment
- Verify crisis detection
- Test parent notifications

## Emergency Contacts

- **National Suicide Prevention Lifeline**: 988
- **Childhelp National Child Abuse Hotline**: 1-800-4-A-CHILD (1-800-422-4453)
- **Crisis Text Line**: Text HOME to 741741


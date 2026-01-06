# Child Safety Agent - Usage Guidelines

**Status**: Draft  
**Audience**: Engineering | Product  
**Last Updated**: 2025-12-13

## When to Use This Agent

### Always Use Child Safety Agent For:
1. **All Conversation Monitoring**: Every conversation should be monitored
2. **Crisis Detection**: Real-time crisis detection during interactions
3. **Mandatory Reporting**: When reporting is legally required
4. **Parent Notifications**: When safety concerns are detected
5. **Professional Escalation**: When professional intervention is needed

### Use Cases

#### Conversation Monitoring
**When**: Child is having a conversation
**Child Safety Agent Action**: Monitors for signs of distress, abuse, or self-harm

#### Crisis Detection
**When**: Concerning patterns are detected
**Child Safety Agent Action**: Assesses risk, initiates intervention, notifies parents

#### Mandatory Reporting
**When**: Abuse is suspected and reporting is required
**Child Safety Agent Action**: Generates report, requires human review, submits to authorities

#### Parent Notification
**When**: Safety concerns are detected
**Child Safety Agent Action**: Immediately notifies parents/guardians

## When NOT to Use It

### Direct Clinical Diagnosis
- **Not for Diagnosis**: Does not provide clinical diagnosis
- **Not for Treatment**: Does not provide treatment or therapy
- **Crisis Support Only**: Provides crisis support and escalation

## Integration Patterns

### Conversation Monitoring
```typescript
const safetyResult = await childSafetyAgent.monitorConversation({
  userId: 'user-123',
  userInput: 'conversation text',
  conversationContext: context
});

if (safetyResult.requiresIntervention) {
  await childSafetyAgent.initiateIntervention(safetyResult);
}
```

### Crisis Detection
```typescript
const crisisResult = await childSafetyAgent.detectCrisis({
  userId: 'user-123',
  indicators: ['distress', 'abuse_disclosure']
});

if (crisisResult.severity === 'high') {
  await childSafetyAgent.escalateToProfessional(crisisResult);
}
```

## Timing Considerations

### Request Timing
- **Crisis Detection**: <100ms for real-time monitoring
- **Risk Assessment**: <500ms for risk scoring
- **Parent Notification**: <1s for alert delivery
- **Mandatory Reporting**: <5s for report generation

### Response Time Requirements
- **Immediate Danger**: <10s for emergency response
- **High Risk**: <60s for professional escalation
- **Medium Risk**: <5min for parent notification
- **Low Risk**: <24hrs for follow-up

## Privacy Considerations

### Data Handling
- **Minimal Data**: Only necessary data for safety assessment
- **Privacy Compliant**: COPPA and GDPR compliant
- **Secure Storage**: Encrypted storage of safety records
- **Access Control**: Restricted access to safety data

### Parent Notifications
- **Privacy Compliant**: Only aggregated, anonymized data when possible
- **Immediate Alerts**: Immediate alerts for high-risk situations
- **Follow-up**: Follow-up monitoring and support

## Best Practices

1. **Always Monitor**: Monitor all conversations
2. **Respect Privacy**: Balance safety with privacy
3. **Human Review**: Always require human review for reporting
4. **Document Everything**: Complete audit trail for compliance
5. **Professional Escalation**: Escalate to professionals when needed


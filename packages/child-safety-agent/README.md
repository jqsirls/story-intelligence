# Child Safety Agent

## Overview
The Child Safety Agent provides comprehensive crisis detection, intervention, and mandatory reporting capabilities to ensure child safety during storytelling interactions.

## Key Features
- **Crisis Detection**: Real-time monitoring for signs of distress, abuse, or self-harm
- **Mandatory Reporting**: Automated reporting to appropriate authorities when required
- **Parent Notifications**: Immediate alerts to parents/guardians for safety concerns
- **Professional Escalation**: Integration with mental health professionals and crisis services

## Crisis Intervention Protocols
1. **Immediate Safety Assessment**: Evaluate level of risk and urgency
2. **Crisis Response**: Provide immediate support and resources
3. **Professional Escalation**: Connect with trained crisis counselors
4. **Follow-up Monitoring**: Continued safety monitoring and support

## Usage
```typescript
import { ChildSafetyAgent } from '@storytailor/child-safety-agent';

const safetyAgent = new ChildSafetyAgent({
  crisisHotlines: {
    suicide: '988',
    childAbuse: '1-800-4-A-CHILD'
  },
  mandatoryReporting: {
    enabled: true,
    jurisdiction: 'US'
  }
});

// Monitor conversation for safety concerns
const safetyResult = await safetyAgent.monitorConversation({
  userId: 'user-123',
  userInput: 'conversation text',
  conversationContext: context
});

if (safetyResult.requiresIntervention) {
  await safetyAgent.initiateIntervention(safetyResult);
}
```

## Emergency Contacts
- **National Suicide Prevention Lifeline**: 988
- **Childhelp National Child Abuse Hotline**: 1-800-4-A-CHILD (1-800-422-4453)
- **Crisis Text Line**: Text HOME to 741741

## Services

### DisclosureDetectionService
Detects when children may be disclosing abuse or trauma.

### CrisisInterventionService
Provides immediate crisis response and professional escalation.

### MandatoryReportingService
Handles required reporting to authorities when abuse is suspected.

### DistressDetectionService
Monitors for signs of emotional distress or mental health concerns.

### InappropriateContentHandler
Filters and responds to inappropriate content or requests.

## Compliance
- **COPPA Compliant**: All safety measures respect children's privacy
- **HIPAA Considerations**: Health information handled with appropriate care
- **Mandatory Reporting Laws**: Complies with state and federal reporting requirements

## Configuration
```typescript
const config = {
  crisisDetection: {
    sensitivity: 'high', // 'low', 'medium', 'high'
    immediateEscalation: true
  },
  reporting: {
    jurisdiction: 'US',
    autoReport: false, // Requires human review
    reportingAgency: 'local_authorities'
  },
  notifications: {
    parentAlert: true,
    professionalEscalation: true,
    emergencyServices: false // Only for immediate danger
  }
};
```

## Testing
```bash
npm test
```

## Support
For technical support: safety-tech@storytailor.com
For crisis support: Contact emergency services (911) or crisis hotlines listed above.
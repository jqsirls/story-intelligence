# Therapeutic Agent

A comprehensive evidence-based therapeutic storytelling framework for children's emotional development and healing. This package provides specialized therapeutic pathways, crisis intervention capabilities, and healthcare provider integration for safe, effective therapeutic support.

## Features

### Evidence-Based Therapeutic Pathways
- **Anxiety Management**: CBT-based approaches with breathing techniques and gradual exposure
- **Grief Support**: Attachment-based therapy with memory preservation and connection maintenance
- **Social Skills Development**: Social learning theory-based friendship and interaction skills
- **Self-Esteem Building**: Positive psychology approaches with growth mindset development
- **Trauma-Informed Care**: Safety-first approaches with specialized adaptations
- **ADHD Support**: Attention-focused interventions with movement integration
- **Autism Adaptations**: Predictable routines with special interest incorporation

### Crisis Intervention System
- **Emotional Trigger Detection**: Voice pattern analysis and interaction monitoring
- **Risk Assessment**: Comprehensive crisis evaluation with safety planning
- **Emergency Response**: Multi-level escalation with automated alerts
- **Mandatory Reporting**: Compliant reporting protocols for child safety
- **Safety Planning**: Collaborative safety plan development with families

### Healthcare Provider Integration
- **Progress Sharing**: Secure, consent-based progress reports for providers
- **Collaborative Care**: Multi-party care coordination with shared notes
- **Therapeutic Insights**: AI-generated insights for clinical decision-making
- **Data Export**: HIPAA-compliant data export for healthcare providers
- **Professional Referrals**: Automated referral systems for specialized care

### Parent Dashboard & Insights
- **Progress Visualization**: Interactive charts and graphs of therapeutic progress
- **Milestone Tracking**: Celebration of therapeutic achievements and breakthroughs
- **Actionable Insights**: Parent-friendly recommendations and guidance
- **Follow-up Protocols**: Automated follow-up for missed sessions or concerns
- **Real-time Metrics**: Engagement, emotional wellness, and safety indicators

## Installation

```bash
npm install @storytailor/therapeutic-agent
```

## Quick Start

```typescript
import { TherapeuticAgent } from '@storytailor/therapeutic-agent';

const therapeuticAgent = new TherapeuticAgent();

// Get available therapeutic pathways
const pathways = await therapeuticAgent.getAvailablePathways('anxiety', 8);

// Create therapeutic story
const storyRequest = {
  userId: 'user-123',
  pathwayId: 'anxiety-cbt',
  sessionNumber: 1,
  currentEmotionalState: {
    mood: 'anxious',
    anxiety: 7,
    confidence: 4,
    engagement: 6,
    copingSkillsUsed: [],
    assessmentMethod: 'voice_analysis',
    timestamp: new Date()
  },
  previousProgress: [],
  clinicalGoals: ['Reduce anxiety', 'Learn coping strategies'],
  adaptations: {}
};

const therapeuticStory = await therapeuticAgent.createTherapeuticStory(storyRequest);
```

## Therapeutic Pathways

### Anxiety Management (CBT-Based)
```typescript
// Get anxiety pathways for 8-year-old
const anxietyPathways = await therapeuticAgent.getAvailablePathways('anxiety', 8);

// Create anxiety-focused therapeutic story
const anxietyStory = await therapeuticAgent.createTherapeuticStory({
  userId: 'child-123',
  pathwayId: 'anxiety-cbt',
  sessionNumber: 1,
  currentEmotionalState: emotionalAssessment,
  clinicalGoals: ['Learn breathing techniques', 'Reduce worry time'],
  adaptations: {}
});
```

### Crisis Intervention
```typescript
// Analyze voice for emotional triggers
const voiceAnalysis = await therapeuticAgent.analyzeVoiceForTriggers(audioData, 'user-123');

// Detect emotional triggers
const triggers = await therapeuticAgent.detectEmotionalTriggers(
  voiceAnalysis,
  interactionPattern,
  userInput,
  'user-123'
);

// Conduct crisis assessment if needed
if (triggers.some(t => t.severity === 'critical')) {
  const assessment = await therapeuticAgent.conductCrisisAssessment(
    crisisIndicators,
    session,
    userInput
  );
  
  const response = await therapeuticAgent.generateCrisisResponse(assessment);
  await therapeuticAgent.executeCrisisResponse(response, 'user-123', 'session-456');
}
```

### Healthcare Provider Integration
```typescript
// Register healthcare provider
const provider = await therapeuticAgent.registerHealthcareProvider({
  name: 'Dr. Sarah Johnson',
  type: 'therapist',
  credentials: ['PhD', 'Licensed Clinical Psychologist'],
  licenseNumber: 'PSY12345',
  contactInfo: {
    phone: '555-0123',
    email: 'dr.johnson@example.com'
  },
  specializations: ['Child Psychology', 'Anxiety Disorders'],
  acceptsChildren: true,
  ageRanges: [{ min: 5, max: 18 }]
});

// Request consent for progress sharing
const consent = await therapeuticAgent.requestProgressSharingConsent(
  'user-123',
  provider.id,
  'parent-456',
  'progress_sharing',
  ['session_summaries', 'emotional_trends']
);

// Generate progress report
const report = await therapeuticAgent.generateProgressReportForProvider(
  'user-123',
  provider.id,
  'weekly_summary',
  startDate,
  endDate
);
```

### Parent Dashboard
```typescript
// Generate dashboard metrics
const metrics = await therapeuticAgent.generateDashboardMetrics('user-123');

// Create progress visualizations
const visualizations = await therapeuticAgent.createProgressVisualizations('user-123');

// Generate parent insights
const insights = await therapeuticAgent.generateParentInsights('user-123');

// Get comprehensive dashboard summary
const summary = await therapeuticAgent.getParentDashboardSummary('user-123');
```

## Specialized Adaptations

### ADHD Support
```typescript
const adhdAdaptations = therapeuticAgent.getADHDAdaptations(7);
// Returns: shortened sessions, frequent breaks, visual cues, movement integration
```

### Autism Support
```typescript
const autismAdaptations = therapeuticAgent.getAutismAdaptations(['trains', 'dinosaurs']);
// Returns: predictable routines, sensory accommodations, special interests integration
```

### Trauma-Informed Care
```typescript
const traumaApproach = therapeuticAgent.getTraumaInformedApproach();
// Returns: safety-first, trustworthiness, collaboration, empowerment principles
```

## Safety & Compliance

### Crisis Detection
- Real-time emotional trigger detection
- Voice pattern analysis for distress
- Interaction pattern monitoring
- Automated risk assessment

### Emergency Response
- Multi-level escalation protocols
- Automated parent/guardian alerts
- Healthcare provider notifications
- Emergency services coordination

### Mandatory Reporting
- Automated detection of reportable situations
- Compliant reporting workflows
- Documentation and audit trails
- Professional referral systems

### Privacy Protection
- COPPA/GDPR compliant data handling
- Encrypted sensitive information
- Consent-based data sharing
- Automated data retention policies

## Testing

```bash
npm test
```

## API Reference

### Core Classes

- **TherapeuticAgent**: Main therapeutic agent with all capabilities
- **TherapeuticPathwayManager**: Evidence-based pathway management
- **CrisisInterventionSystem**: Crisis detection and response
- **HealthcareProviderIntegration**: Provider collaboration tools
- **TherapeuticInsightsDashboard**: Parent and provider dashboards

### Key Interfaces

- **TherapeuticPathway**: Structured therapeutic intervention
- **CrisisIndicator**: Safety concern detection
- **ProgressReport**: Healthcare provider progress sharing
- **ParentInsight**: Parent-friendly therapeutic insights
- **TherapeuticMilestone**: Achievement tracking

## Contributing

Please read our contributing guidelines and ensure all therapeutic content follows evidence-based practices and child safety protocols.

## License

This package is part of the Storytailor platform and follows the main project licensing.

## Support

For therapeutic content questions, consult with licensed mental health professionals. For technical support, contact the development team.
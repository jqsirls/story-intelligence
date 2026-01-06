# Analytics Intelligence Package

A comprehensive privacy-preserving analytics and intelligence platform for the Storytailor multi-agent system. This package provides advanced analytics capabilities, predictive intelligence, real-time dashboards, and compliance reporting while maintaining strict privacy standards.

## Features

### 🔒 Privacy-Preserving Analytics
- **Differential Privacy**: Implements differential privacy mechanisms to protect individual user data
- **Data Anonymization**: Automatic anonymization of sensitive data with configurable thresholds
- **Consent Management**: Granular consent tracking and purpose-based data access
- **COPPA/GDPR Compliance**: Built-in compliance with children's privacy regulations

### 🧠 Predictive Intelligence
- **User Behavior Prediction**: Predict engagement, churn, preferences, and learning outcomes
- **Content Recommendations**: Hybrid recommendation system using collaborative and content-based filtering
- **Emotional State Prediction**: Predict emotional states and provide proactive support
- **Risk Assessment**: Early detection of emotional distress, learning difficulties, and safety concerns

### 📊 Real-Time Analytics
- **Story Quality Assessment**: Automated story quality scoring across multiple dimensions
- **Emotional Impact Measurement**: Track emotional trends and positive impact
- **Learning Outcome Tracking**: Monitor educational progress and curriculum alignment
- **Parent Satisfaction Metrics**: Collect and analyze parent feedback with consent

### 🧪 A/B Testing Framework
- **Experiment Management**: Create, manage, and analyze A/B tests
- **Statistical Significance**: Proper statistical analysis with confidence intervals
- **Segmentation Support**: Target specific user segments for testing
- **Real-Time Results**: Monitor test performance in real-time

### 📈 Interactive Dashboards
- **Stakeholder-Specific Views**: Customized dashboards for parents, educators, and administrators
- **Real-Time Updates**: Live data updates with WebSocket support
- **Privacy Controls**: Configurable privacy levels (individual, aggregated, anonymized)
- **Widget System**: Flexible widget system for metrics, charts, tables, and alerts

### 📋 Compliance Reporting
- **Automated Reports**: Scheduled compliance reports for privacy and safety
- **Custom Reports**: Flexible report generation for different stakeholders
- **Real-Time Monitoring**: Continuous compliance monitoring with alerts
- **Audit Trails**: Comprehensive audit logging for regulatory compliance

## Installation

```bash
npm install @alexa-multi-agent/analytics-intelligence
```

## Quick Start

```typescript
import { AnalyticsIntelligenceAgent } from '@alexa-multi-agent/analytics-intelligence';

const config = {
  database: {
    url: process.env.SUPABASE_URL,
    apiKey: process.env.SUPABASE_ANON_KEY
  },
  redis: {
    url: process.env.REDIS_URL,
    keyPrefix: 'analytics'
  },
  privacy: {
    epsilonBudget: 1.0,
    deltaThreshold: 0.00001,
    noiseScale: 1.0,
    minGroupSize: 5,
    anonymizationThreshold: 10
  },
  analytics: {
    retentionDays: 365,
    batchSize: 100,
    aggregationInterval: 60,
    qualityScoreWeights: {
      narrativeStructure: 0.2,
      characterDevelopment: 0.15,
      ageAppropriateness: 0.15,
      educationalValue: 0.15,
      emotionalResonance: 0.15,
      creativity: 0.1,
      languageQuality: 0.1
    }
  },
  ml: {
    modelUpdateInterval: 24,
    predictionConfidenceThreshold: 0.7,
    collaborativeFilteringNeighbors: 10
  }
};

const agent = new AnalyticsIntelligenceAgent(config);
await agent.initialize();

// Collect privacy-preserving engagement metrics
const metrics = await agent.collectEngagementMetrics('7_days', 'anonymized');

// Assess story quality
const assessment = await agent.assessStoryQuality('story-id');

// Generate predictions
const prediction = await agent.predictUserBehavior('user-id', 'engagement');

// Create dashboard
const dashboardId = await agent.createDashboard({
  dashboardId: 'parent-dashboard',
  name: 'Parent Insights',
  stakeholder: 'parent',
  widgets: [/* widget configuration */],
  refreshInterval: 15,
  privacyLevel: 'individual',
  accessControl: { roles: ['parent'], permissions: ['view_child_data'] }
});

await agent.shutdown();
```

## Core Components

### AnalyticsIntelligenceAgent
The main orchestrator that coordinates all analytics services.

### PrivacyPreservingAnalyticsEngine
Handles data collection and analysis with privacy preservation techniques:
- Differential privacy noise injection
- K-anonymity enforcement
- Data minimization
- Consent validation

### StoryQualityAssessmentService
Automated story quality assessment across multiple dimensions:
- Narrative structure analysis
- Character development evaluation
- Age appropriateness checking
- Educational value measurement
- Emotional resonance scoring
- Creativity assessment
- Language quality analysis

### PredictiveIntelligenceEngine
Machine learning-powered predictions and recommendations:
- User behavior modeling
- Content recommendation algorithms
- Emotional state prediction
- Learning progress forecasting
- Risk assessment models

### RealTimeDashboard
Interactive dashboard system with real-time updates:
- Widget-based architecture
- Stakeholder-specific views
- Privacy-aware data rendering
- WebSocket-based updates

### ComplianceReporter
Automated compliance monitoring and reporting:
- COPPA compliance checking
- GDPR compliance validation
- UK Children's Code adherence
- Custom compliance rules
- Automated violation detection

## Privacy and Compliance

This package is designed with privacy-by-design principles:

- **Differential Privacy**: All analytics use differential privacy to protect individual data
- **Data Minimization**: Only collect data necessary for specific purposes
- **Consent Management**: Granular consent tracking for all data uses
- **Retention Policies**: Automatic data deletion based on retention policies
- **Anonymization**: Automatic anonymization when group sizes are too small
- **Audit Trails**: Comprehensive logging for compliance auditing

## Configuration

### Privacy Settings
```typescript
privacy: {
  epsilonBudget: 1.0,        // Differential privacy budget
  deltaThreshold: 0.00001,   // Differential privacy delta
  noiseScale: 1.0,           // Noise scaling factor
  minGroupSize: 5,           // Minimum group size for k-anonymity
  anonymizationThreshold: 10  // Threshold for anonymization
}
```

### Quality Score Weights
```typescript
qualityScoreWeights: {
  narrativeStructure: 0.2,    // Story structure importance
  characterDevelopment: 0.15, // Character development weight
  ageAppropriateness: 0.15,   // Age appropriateness factor
  educationalValue: 0.15,     // Educational content weight
  emotionalResonance: 0.15,   // Emotional impact factor
  creativity: 0.1,            // Creativity scoring weight
  languageQuality: 0.1        // Language quality importance
}
```

## API Reference

### Analytics Methods
- `collectEngagementMetrics(timeWindow, privacyLevel)` - Collect user engagement data
- `assessStoryQuality(storyId)` - Assess story quality across dimensions
- `measureEmotionalImpact(userId, libraryId, timeWindow)` - Measure emotional impact
- `trackLearningOutcomes(userId, libraryId)` - Track educational progress

### Prediction Methods
- `predictUserBehavior(userId, predictionType, timeHorizon)` - Predict user behavior
- `generateContentRecommendations(userId, recommendationType)` - Generate recommendations
- `predictEmotionalState(userId, libraryId)` - Predict emotional state
- `assessRisk(userId, riskType)` - Assess various risk factors

### Dashboard Methods
- `createDashboard(config)` - Create new dashboard
- `getDashboardData(dashboardId, userId)` - Get dashboard data
- `getSystemHealthMetrics()` - Get system health status
- `getUserEngagementAnalytics(timeWindow)` - Get engagement analytics

### A/B Testing Methods
- `createABTest(testConfig)` - Create new A/B test
- `startABTest(testId)` - Start A/B test
- `assignUserToVariant(userId, testId)` - Assign user to test variant
- `getTestResults(testId)` - Get test results

### Compliance Methods
- `generateComplianceReport(reportType, timeWindow)` - Generate compliance report
- `generateCustomReport(reportConfig)` - Generate custom report
- `checkRealTimeCompliance(eventType, eventData)` - Check real-time compliance

## Testing

```bash
npm test
```

## Examples

See the `example.ts` file for comprehensive usage examples demonstrating all features of the analytics intelligence system.

## License

This package is part of the Alexa Multi-Agent System and follows the same licensing terms.
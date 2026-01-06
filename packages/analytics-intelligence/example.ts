import { AnalyticsIntelligenceAgent } from './src/AnalyticsIntelligenceAgent';
import { AnalyticsConfig } from './src/types';

// Example configuration
const config: AnalyticsConfig = {
  database: {
    url: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
    apiKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key'
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
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

async function demonstrateAnalyticsIntelligence() {
  console.log('🚀 Starting Analytics Intelligence System Demo');

  // Initialize the analytics agent
  const agent = new AnalyticsIntelligenceAgent(config);
  await agent.initialize();

  try {
    // 1. Privacy-Preserving Analytics
    console.log('\n📊 Collecting Privacy-Preserving Engagement Metrics...');
    const engagementMetrics = await agent.collectEngagementMetrics('7_days', 'anonymized');
    console.log('Session Duration:', engagementMetrics.sessionDuration.value, 'seconds');
    console.log('Story Completion Rate:', engagementMetrics.storyCompletionRate.value * 100, '%');
    console.log('User Return Rate:', engagementMetrics.userReturnRate.value * 100, '%');

    // 2. Story Quality Assessment
    console.log('\n📝 Assessing Story Quality...');
    const storyId = 'example-story-123';
    const qualityAssessment = await agent.assessStoryQuality(storyId);
    console.log('Overall Quality Score:', qualityAssessment.overallScore);
    console.log('Narrative Structure:', qualityAssessment.dimensionScores.narrativeStructure);
    console.log('Character Development:', qualityAssessment.dimensionScores.characterDevelopment);
    console.log('Automated Feedback:', qualityAssessment.automatedFeedback);

    // 3. Emotional Impact Analysis
    console.log('\n💝 Measuring Emotional Impact...');
    const userId = 'example-user-456';
    const emotionalImpact = await agent.measureEmotionalImpact(userId, undefined, '30_days');
    console.log('Positive Impact Score:', emotionalImpact.positiveImpactScore);
    console.log('Emotional Trends:', emotionalImpact.emotionalTrends.map(t => `${t.mood}: ${t.frequency}`));
    console.log('Risk Indicators:', emotionalImpact.riskIndicators.length);

    // 4. Learning Outcome Tracking
    console.log('\n🎓 Tracking Learning Outcomes...');
    const learningOutcomes = await agent.trackLearningOutcomes(userId);
    console.log('Educational Goals:', learningOutcomes.educationalGoals.length);
    console.log('Curriculum Alignment:', learningOutcomes.curriculumAlignment.alignmentScore);

    // 5. Predictive Intelligence
    console.log('\n🔮 Generating Predictions...');
    
    // User behavior prediction
    const behaviorPrediction = await agent.predictUserBehavior(userId, 'engagement', '30_days');
    console.log('Engagement Prediction:', behaviorPrediction.prediction.value);
    console.log('Prediction Confidence:', behaviorPrediction.prediction.confidence);

    // Content recommendations
    const recommendations = await agent.generateContentRecommendations(userId, 'story_type');
    console.log('Content Recommendations:', recommendations.recommendations.length);
    console.log('Top Recommendation:', recommendations.recommendations[0]?.item);

    // Emotional state prediction
    const emotionalPrediction = await agent.predictEmotionalState(userId);
    console.log('Predicted Mood:', emotionalPrediction.predictedMood);
    console.log('Support Recommendations:', emotionalPrediction.supportRecommendations.length);

    // Risk assessment
    const riskPrediction = await agent.assessRisk(userId, 'emotional_distress');
    console.log('Risk Level:', riskPrediction.riskLevel);
    console.log('Risk Probability:', riskPrediction.probability);

    // 6. A/B Testing
    console.log('\n🧪 A/B Testing Framework...');
    
    // Create A/B test
    const abTest = await agent.createABTest({
      testName: 'Character Creation Flow Optimization',
      hypothesis: 'Simplified character creation will increase completion rates',
      variants: [
        {
          variantId: 'control',
          name: 'Current Flow',
          description: 'Existing character creation process',
          allocation: 50,
          configuration: { simplified: false }
        },
        {
          variantId: 'simplified',
          name: 'Simplified Flow',
          description: 'Streamlined character creation with fewer steps',
          allocation: 50,
          configuration: { simplified: true }
        }
      ],
      targetMetrics: [
        {
          metric: 'completion_rate',
          expectedChange: 15,
          significance: 0.95
        }
      ],
      segmentation: [
        {
          criteria: 'age',
          values: ['6', '7', '8', '9', '10']
        }
      ],
      status: 'draft',
      startDate: new Date().toISOString()
    });
    console.log('A/B Test Created:', abTest.testId);

    // Start the test
    await agent.startABTest(abTest.testId);
    console.log('A/B Test Started');

    // Assign user to variant
    const variantId = await agent.assignUserToVariant(userId, abTest.testId);
    console.log('User assigned to variant:', variantId);

    // 7. Real-Time Dashboard
    console.log('\n📈 Real-Time Dashboard...');
    
    // Create dashboard
    const dashboardId = await agent.createDashboard({
      dashboardId: 'parent-dashboard-001',
      name: 'Parent Insights Dashboard',
      stakeholder: 'parent',
      widgets: [
        {
          widgetId: 'engagement-metric',
          type: 'metric',
          title: 'Child Engagement Score',
          description: 'Overall engagement with storytelling activities',
          dataSource: 'user_engagement',
          configuration: { userId },
          refreshRate: 15,
          privacyCompliant: true
        },
        {
          widgetId: 'story-quality-chart',
          type: 'chart',
          title: 'Story Quality Over Time',
          description: 'Quality scores of created stories',
          dataSource: 'story_quality',
          configuration: { chartType: 'line', timeWindow: '30_days' },
          refreshRate: 60,
          privacyCompliant: true
        }
      ],
      refreshInterval: 15,
      privacyLevel: 'individual',
      accessControl: {
        roles: ['parent'],
        permissions: ['view_child_data']
      }
    });
    console.log('Dashboard Created:', dashboardId);

    // Get dashboard data
    const dashboardData = await agent.getDashboardData(dashboardId, userId);
    console.log('Dashboard Widgets:', dashboardData.widgets.length);

    // System health metrics
    const systemHealth = await agent.getSystemHealthMetrics();
    console.log('System Health - Agents:', systemHealth.agents.length);
    console.log('Database Query Latency:', systemHealth.infrastructure.database.queryLatency, 'ms');

    // User engagement analytics
    const engagementAnalytics = await agent.getUserEngagementAnalytics('7_days');
    console.log('Total Users:', engagementAnalytics.totalUsers);
    console.log('Active Users:', engagementAnalytics.activeUsers);
    console.log('Average Session Duration:', engagementAnalytics.sessionMetrics.averageDuration, 'minutes');

    // Story success metrics
    const storyMetrics = await agent.getStorySuccessMetrics('7_days');
    console.log('Total Stories:', storyMetrics.totalStories);
    console.log('Quality Distribution:', storyMetrics.qualityDistribution);

    // 8. Compliance Reporting
    console.log('\n📋 Compliance Reporting...');
    
    // Generate compliance report
    const complianceReport = await agent.generateComplianceReport('comprehensive', '30_days');
    console.log('Compliance Report ID:', complianceReport.reportId);
    console.log('COPPA Compliant:', complianceReport.compliance.coppa?.compliant);
    console.log('GDPR Compliant:', complianceReport.compliance.gdpr?.compliant);
    console.log('Recommendations:', complianceReport.recommendations.length);

    // Generate custom report
    const customReport = await agent.generateCustomReport({
      name: 'Monthly Parent Report',
      description: 'Comprehensive monthly report for parents',
      stakeholder: 'parent',
      parameters: {
        timeWindow: '30_days',
        filters: { userId },
        metrics: ['user_engagement', 'story_quality', 'emotional_impact'],
        groupBy: ['week']
      },
      format: 'json',
      privacyLevel: 'individual'
    });
    console.log('Custom Report ID:', customReport.reportId);

    // 9. Batch Processing
    console.log('\n⚙️ Running Batch Analytics...');
    await agent.processBatchAnalytics();
    console.log('Batch processing completed');

    // 10. Real-Time Event Processing
    console.log('\n⚡ Processing Real-Time Event...');
    await agent.processRealTimeEvent('story_completed', {
      userId,
      storyId: 'new-story-789',
      completionTime: 1200,
      qualityScore: 88.5,
      timestamp: new Date().toISOString()
    });
    console.log('Real-time event processed');

    // 11. Health Check
    console.log('\n🏥 System Health Check...');
    const healthStatus = await agent.healthCheck();
    console.log('Overall Status:', healthStatus.status);
    console.log('Service Status:', Object.entries(healthStatus.services).map(([name, status]) => `${name}: ${status}`));

    console.log('\n✅ Analytics Intelligence System Demo Completed Successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    await agent.shutdown();
  }
}

// Run the demo
if (require.main === module) {
  demonstrateAnalyticsIntelligence().catch(console.error);
}

export { demonstrateAnalyticsIntelligence };
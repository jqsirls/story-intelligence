export interface AnalyticsConfig {
  database: {
    url: string;
    apiKey: string;
  };
  redis: {
    url: string;
    keyPrefix: string;
  };
  privacy: {
    epsilonBudget: number; // Differential privacy epsilon
    deltaThreshold: number; // Differential privacy delta
    noiseScale: number;
    minGroupSize: number; // Minimum group size for aggregation
    anonymizationThreshold: number;
  };
  analytics: {
    retentionDays: number;
    batchSize: number;
    aggregationInterval: number; // minutes
    qualityScoreWeights: QualityScoreWeights;
  };
  ml: {
    modelUpdateInterval: number; // hours
    predictionConfidenceThreshold: number;
    collaborativeFilteringNeighbors: number;
  };
}

export interface QualityScoreWeights {
  narrativeStructure: number;
  characterDevelopment: number;
  ageAppropriateness: number;
  educationalValue: number;
  emotionalResonance: number;
  creativity: number;
  languageQuality: number;
}

// Privacy-preserving analytics types
export interface DifferentialPrivacyParams {
  epsilon: number;
  delta: number;
  sensitivity: number;
  noiseType: 'laplace' | 'gaussian';
}

export interface AnonymizedMetric {
  id: string;
  metricType: string;
  value: number;
  confidence: number;
  groupSize: number;
  timeWindow: string;
  privacyParams: DifferentialPrivacyParams;
  generatedAt: string;
}

export interface EngagementMetrics {
  sessionDuration: AnonymizedMetric;
  storyCompletionRate: AnonymizedMetric;
  characterCreationTime: AnonymizedMetric;
  userReturnRate: AnonymizedMetric;
  interactionFrequency: AnonymizedMetric;
  voiceEngagementScore: AnonymizedMetric;
}

export interface StoryQualityAssessment {
  storyId: string;
  overallScore: number;
  dimensionScores: {
    narrativeStructure: number;
    characterDevelopment: number;
    ageAppropriateness: number;
    educationalValue: number;
    emotionalResonance: number;
    creativity: number;
    languageQuality: number;
  };
  automatedFeedback: string[];
  improvementSuggestions: string[];
  confidenceScore: number;
  assessedAt: string;
}

export interface EmotionalImpactMeasurement {
  userId: string;
  libraryId?: string;
  timeWindow: string;
  emotionalTrends: {
    mood: string;
    frequency: number;
    confidenceScore: number;
    privacyPreserved: boolean;
  }[];
  positiveImpactScore: number;
  riskIndicators: {
    type: string;
    severity: 'low' | 'medium' | 'high';
    confidence: number;
    requiresIntervention: boolean;
  }[];
  aggregatedAcrossUsers: boolean;
  privacyCompliant: boolean;
}

export interface LearningOutcomeTracking {
  userId: string;
  libraryId?: string;
  educationalGoals: {
    goalType: string;
    targetSkill: string;
    progressScore: number;
    milestones: {
      milestone: string;
      achieved: boolean;
      achievedAt?: string;
    }[];
  }[];
  curriculumAlignment: {
    framework: string;
    gradeLevel: string;
    subjects: string[];
    alignmentScore: number;
  };
  privacyPreserved: boolean;
}

export interface ParentSatisfactionMetrics {
  userId: string;
  consentGiven: boolean;
  satisfactionScore: number;
  feedbackCategories: {
    category: string;
    rating: number;
    comments?: string;
  }[];
  recommendationLikelihood: number;
  privacyRating: number;
  featureUsage: {
    feature: string;
    usageFrequency: number;
    satisfactionRating: number;
  }[];
  collectedAt: string;
}

// Predictive intelligence types
export interface UserBehaviorPrediction {
  userId: string;
  predictionType: 'engagement' | 'churn' | 'preference' | 'learning_outcome';
  prediction: {
    value: any;
    confidence: number;
    timeHorizon: string; // e.g., "7_days", "30_days"
  };
  features: {
    feature: string;
    importance: number;
  }[];
  modelVersion: string;
  predictedAt: string;
}

export interface ContentRecommendation {
  userId: string;
  recommendationType: 'story_type' | 'character_trait' | 'educational_topic' | 'emotional_support';
  recommendations: {
    item: string;
    score: number;
    reasoning: string[];
    confidence: number;
  }[];
  collaborativeFiltering: boolean;
  contentBasedFiltering: boolean;
  hybridScore: number;
  generatedAt: string;
}

export interface EmotionalStatePrediction {
  userId: string;
  libraryId?: string;
  predictedMood: string;
  confidence: number;
  riskFactors: {
    factor: string;
    weight: number;
    description: string;
  }[];
  supportRecommendations: {
    type: 'story_recommendation' | 'activity_suggestion' | 'parental_notification';
    action: string;
    priority: 'low' | 'medium' | 'high';
  }[];
  predictedAt: string;
  validUntil: string;
}

export interface LearningProgressPrediction {
  userId: string;
  educationalGoal: string;
  predictedOutcome: {
    skillLevel: number;
    timeToMastery: number; // days
    confidence: number;
  };
  recommendedInterventions: {
    intervention: string;
    expectedImpact: number;
    difficulty: 'easy' | 'medium' | 'hard';
  }[];
  curriculumRecommendations: string[];
  predictedAt: string;
}

export interface RiskPrediction {
  userId: string;
  riskType: 'emotional_distress' | 'learning_difficulty' | 'engagement_drop' | 'safety_concern';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  probability: number;
  indicators: {
    indicator: string;
    weight: number;
    description: string;
  }[];
  recommendedActions: {
    action: string;
    urgency: 'immediate' | 'within_24h' | 'within_week';
    stakeholder: 'parent' | 'educator' | 'system' | 'healthcare';
  }[];
  predictedAt: string;
  reviewBy: string;
}

export interface ABTestFramework {
  testId: string;
  testName: string;
  hypothesis: string;
  variants: {
    variantId: string;
    name: string;
    description: string;
    allocation: number; // percentage
    configuration: Record<string, any>;
  }[];
  targetMetrics: {
    metric: string;
    expectedChange: number;
    significance: number;
  }[];
  segmentation: {
    criteria: string;
    values: string[];
  }[];
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  startDate: string;
  endDate?: string;
  results?: ABTestResults;
}

export interface ABTestResults {
  testId: string;
  variants: {
    variantId: string;
    participants: number;
    conversions: number;
    conversionRate: number;
    metrics: {
      metric: string;
      value: number;
      confidence: number;
      significantDifference: boolean;
    }[];
  }[];
  winner?: string;
  confidence: number;
  statisticalSignificance: boolean;
  recommendations: string[];
  analyzedAt: string;
}

// Dashboard and reporting types
export interface DashboardConfig {
  dashboardId: string;
  name: string;
  stakeholder: 'parent' | 'educator' | 'admin' | 'executive' | 'researcher';
  widgets: DashboardWidget[];
  refreshInterval: number; // minutes
  privacyLevel: 'individual' | 'aggregated' | 'anonymized';
  accessControl: {
    roles: string[];
    permissions: string[];
  };
}

export interface DashboardWidget {
  widgetId: string;
  type: 'metric' | 'chart' | 'table' | 'alert' | 'recommendation';
  title: string;
  description: string;
  dataSource: string;
  configuration: Record<string, any>;
  refreshRate: number; // minutes
  privacyCompliant: boolean;
}

export interface SystemHealthMetrics {
  timestamp: string;
  agents: {
    agentName: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    errorRate: number;
    throughput: number;
  }[];
  infrastructure: {
    database: {
      connectionPool: number;
      queryLatency: number;
      errorRate: number;
    };
    redis: {
      memoryUsage: number;
      hitRate: number;
      connectionCount: number;
    };
    apis: {
      service: string;
      availability: number;
      responseTime: number;
      errorRate: number;
    }[];
  };
  compliance: {
    privacyViolations: number;
    dataRetentionCompliance: number;
    consentCompliance: number;
    auditTrailIntegrity: number;
  };
}

export interface UserEngagementAnalytics {
  timeWindow: string;
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  sessionMetrics: {
    averageDuration: number;
    totalSessions: number;
    bounceRate: number;
  };
  storyMetrics: {
    storiesCreated: number;
    storiesCompleted: number;
    averageStoryLength: number;
    popularStoryTypes: {
      type: string;
      count: number;
      percentage: number;
    }[];
  };
  privacyPreserved: boolean;
}

export interface StorySuccessMetrics {
  timeWindow: string;
  totalStories: number;
  qualityDistribution: {
    excellent: number;
    good: number;
    average: number;
    needsImprovement: number;
  };
  trendingThemes: {
    theme: string;
    popularity: number;
    qualityScore: number;
  }[];
  userSatisfaction: {
    averageRating: number;
    totalRatings: number;
    distribution: Record<string, number>;
  };
  educationalImpact: {
    learningGoalsAchieved: number;
    skillImprovements: {
      skill: string;
      averageImprovement: number;
    }[];
  };
}

export interface ComplianceReport {
  reportId: string;
  reportType: 'privacy' | 'safety' | 'educational' | 'comprehensive';
  timeWindow: string;
  compliance: {
    coppa: {
      compliant: boolean;
      violations: number;
      details: string[];
    };
    gdpr: {
      compliant: boolean;
      violations: number;
      details: string[];
    };
    ukChildrensCode: {
      compliant: boolean;
      violations: number;
      details: string[];
    };
  };
  dataHandling: {
    dataMinimization: boolean;
    consentManagement: boolean;
    retentionCompliance: boolean;
    anonymizationCompliance: boolean;
  };
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    recommendation: string;
    deadline: string;
  }[];
  generatedAt: string;
  validUntil: string;
}

export interface CustomReport {
  reportId: string;
  name: string;
  description: string;
  stakeholder: string;
  parameters: {
    timeWindow: string;
    filters: Record<string, any>;
    metrics: string[];
    groupBy: string[];
  };
  format: 'json' | 'csv' | 'pdf' | 'dashboard';
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    time: string;
    recipients: string[];
  };
  privacyLevel: 'individual' | 'aggregated' | 'anonymized';
  generatedAt: string;
  data: any;
}
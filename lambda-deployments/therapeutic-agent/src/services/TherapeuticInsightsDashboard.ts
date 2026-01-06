import { 
  TherapeuticSession, 
  TherapeuticOutcome, 
  ProgressMarkerResult,
  EmotionalAssessment,
  ParentNotification
} from '../types';
import { TherapeuticInsight } from './HealthcareProviderIntegration';

export interface DashboardMetric {
  id: string;
  name: string;
  value: number | string;
  unit?: string;
  trend: 'up' | 'down' | 'stable';
  trendPercentage?: number;
  description: string;
  lastUpdated: Date;
  category: 'engagement' | 'progress' | 'emotional' | 'behavioral' | 'safety';
}

export interface ProgressVisualization {
  type: 'line_chart' | 'bar_chart' | 'pie_chart' | 'heatmap' | 'timeline';
  title: string;
  description: string;
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      color: string;
      type?: string;
    }[];
  };
  insights: string[];
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface ParentInsight {
  id: string;
  title: string;
  description: string;
  category: 'progress' | 'concern' | 'achievement' | 'recommendation' | 'milestone';
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
  actionItems?: string[];
  supportingData: {
    metric: string;
    value: string;
    context: string;
  }[];
  generatedAt: Date;
  readByParent: boolean;
  parentFeedback?: {
    helpful: boolean;
    comments: string;
    timestamp: Date;
  };
}

export interface TherapeuticMilestone {
  id: string;
  userId: string;
  milestoneType: 'first_session' | 'engagement_improvement' | 'skill_mastery' | 'emotional_breakthrough' | 'progress_goal' | 'custom';
  title: string;
  description: string;
  achievedAt: Date;
  significance: 'minor' | 'moderate' | 'major' | 'breakthrough';
  relatedSessions: string[];
  celebrationSuggestions: string[];
  shareWithProvider: boolean;
  parentNotified: boolean;
}

export interface FollowUpProtocol {
  id: string;
  userId: string;
  triggerType: 'missed_session' | 'declining_progress' | 'safety_concern' | 'milestone_achieved' | 'parent_request';
  scheduledFor: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actions: {
    type: 'parent_contact' | 'provider_notification' | 'session_adjustment' | 'resource_sharing' | 'assessment_review';
    description: string;
    dueDate: Date;
    completed: boolean;
    completedAt?: Date;
    notes?: string;
  }[];
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: Date;
  completedAt?: Date;
}

export class TherapeuticInsightsDashboard {
  private dashboardMetrics: Map<string, DashboardMetric[]> = new Map();
  private progressVisualizations: Map<string, ProgressVisualization[]> = new Map();
  private parentInsights: Map<string, ParentInsight[]> = new Map();
  private therapeuticMilestones: Map<string, TherapeuticMilestone[]> = new Map();
  private followUpProtocols: Map<string, FollowUpProtocol[]> = new Map();

  constructor() {}

  /**
   * Generate comprehensive dashboard metrics for a user
   */
  async generateDashboardMetrics(
    userId: string,
    sessions: TherapeuticSession[],
    outcomes: TherapeuticOutcome[]
  ): Promise<DashboardMetric[]> {
    const metrics: DashboardMetric[] = [];

    // Engagement metrics
    const engagementMetric = this.calculateEngagementMetric(sessions);
    metrics.push(engagementMetric);

    // Progress metrics
    const progressMetric = this.calculateProgressMetric(outcomes);
    metrics.push(progressMetric);

    // Emotional wellness metrics
    const emotionalMetrics = this.calculateEmotionalMetrics(sessions);
    metrics.push(...emotionalMetrics);

    // Behavioral metrics
    const behavioralMetrics = this.calculateBehavioralMetrics(sessions);
    metrics.push(...behavioralMetrics);

    // Safety metrics
    const safetyMetric = this.calculateSafetyMetric(sessions);
    metrics.push(safetyMetric);

    // Store metrics
    this.dashboardMetrics.set(userId, metrics);

    return metrics;
  }

  /**
   * Create progress visualizations
   */
  async createProgressVisualizations(
    userId: string,
    sessions: TherapeuticSession[],
    outcomes: TherapeuticOutcome[]
  ): Promise<ProgressVisualization[]> {
    const visualizations: ProgressVisualization[] = [];

    // Engagement over time
    const engagementViz = this.createEngagementVisualization(sessions);
    visualizations.push(engagementViz);

    // Emotional trends
    const emotionalViz = this.createEmotionalTrendsVisualization(sessions);
    visualizations.push(emotionalViz);

    // Progress outcomes
    const progressViz = this.createProgressOutcomesVisualization(outcomes);
    visualizations.push(progressViz);

    // Session completion timeline
    const timelineViz = this.createSessionTimelineVisualization(sessions);
    visualizations.push(timelineViz);

    // Store visualizations
    this.progressVisualizations.set(userId, visualizations);

    return visualizations;
  }

  /**
   * Generate parent-friendly insights
   */
  async generateParentInsights(
    userId: string,
    sessions: TherapeuticSession[],
    outcomes: TherapeuticOutcome[],
    milestones: TherapeuticMilestone[]
  ): Promise<ParentInsight[]> {
    const insights: ParentInsight[] = [];

    // Progress insights
    const progressInsights = this.generateProgressInsights(outcomes);
    insights.push(...progressInsights);

    // Achievement insights
    const achievementInsights = this.generateAchievementInsights(milestones);
    insights.push(...achievementInsights);

    // Concern insights
    const concernInsights = this.generateConcernInsights(sessions, outcomes);
    insights.push(...concernInsights);

    // Recommendation insights
    const recommendationInsights = this.generateRecommendationInsights(sessions, outcomes);
    insights.push(...recommendationInsights);

    // Store insights
    this.parentInsights.set(userId, insights);

    return insights;
  }

  /**
   * Track therapeutic milestones
   */
  async trackTherapeuticMilestones(
    userId: string,
    sessions: TherapeuticSession[],
    outcomes: TherapeuticOutcome[]
  ): Promise<TherapeuticMilestone[]> {
    const milestones: TherapeuticMilestone[] = [];
    const existingMilestones = this.therapeuticMilestones.get(userId) || [];

    // Check for new milestones
    const newMilestones = this.detectNewMilestones(userId, sessions, outcomes, existingMilestones);
    milestones.push(...newMilestones);

    // Update stored milestones
    const allMilestones = [...existingMilestones, ...newMilestones];
    this.therapeuticMilestones.set(userId, allMilestones);

    // Generate celebrations for new milestones
    for (const milestone of newMilestones) {
      await this.generateMilestoneCelebration(milestone);
    }

    return newMilestones;
  }

  /**
   * Create follow-up protocols
   */
  async createFollowUpProtocol(
    userId: string,
    triggerType: FollowUpProtocol['triggerType'],
    priority: FollowUpProtocol['priority'],
    customActions?: FollowUpProtocol['actions']
  ): Promise<FollowUpProtocol> {
    const protocol: FollowUpProtocol = {
      id: `followup-${Date.now()}`,
      userId,
      triggerType,
      scheduledFor: this.calculateFollowUpDate(triggerType, priority),
      priority,
      actions: customActions || this.generateDefaultActions(triggerType, priority),
      status: 'pending',
      createdAt: new Date()
    };

    const userProtocols = this.followUpProtocols.get(userId) || [];
    userProtocols.push(protocol);
    this.followUpProtocols.set(userId, userProtocols);

    return protocol;
  }

  /**
   * Execute follow-up protocol
   */
  async executeFollowUpProtocol(protocolId: string): Promise<void> {
    // Find protocol
    let protocol: FollowUpProtocol | undefined;
    for (const [userId, protocols] of this.followUpProtocols.entries()) {
      const found = protocols.find(p => p.id === protocolId);
      if (found) {
        protocol = found;
        break;
      }
    }

    if (!protocol) {
      throw new Error(`Follow-up protocol not found: ${protocolId}`);
    }

    protocol.status = 'in_progress';

    // Execute each action
    for (const action of protocol.actions) {
      try {
        await this.executeFollowUpAction(action, protocol.userId);
        action.completed = true;
        action.completedAt = new Date();
      } catch (error) {
        action.notes = `Failed to execute: ${error}`;
      }
    }

    // Mark protocol as completed if all actions are done
    const allCompleted = protocol.actions.every(a => a.completed);
    if (allCompleted) {
      protocol.status = 'completed';
      protocol.completedAt = new Date();
    }
  }

  /**
   * Get dashboard summary for parents
   */
  async getParentDashboardSummary(userId: string): Promise<any> {
    const metrics = this.dashboardMetrics.get(userId) || [];
    const insights = this.parentInsights.get(userId) || [];
    const milestones = this.therapeuticMilestones.get(userId) || [];
    const visualizations = this.progressVisualizations.get(userId) || [];

    // Get recent milestones (last 30 days)
    const recentMilestones = milestones.filter(m => 
      m.achievedAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    // Get high-priority insights
    const priorityInsights = insights
      .filter(i => i.priority === 'high' || i.priority === 'medium')
      .slice(0, 5);

    // Get key metrics
    const keyMetrics = metrics.filter(m => 
      m.category === 'progress' || m.category === 'engagement' || m.category === 'emotional'
    );

    return {
      summary: {
        totalSessions: this.getTotalSessions(userId),
        recentProgress: this.getRecentProgressSummary(userId),
        nextMilestone: this.getNextMilestone(userId),
        overallTrend: this.getOverallTrend(metrics)
      },
      keyMetrics,
      priorityInsights,
      recentMilestones,
      visualizations: visualizations.slice(0, 3), // Top 3 visualizations
      upcomingFollowUps: this.getUpcomingFollowUps(userId)
    };
  }

  /**
   * Export therapeutic insights for healthcare providers
   */
  async exportTherapeuticInsights(userId: string): Promise<any> {
    const metrics = this.dashboardMetrics.get(userId) || [];
    const insights = this.parentInsights.get(userId) || [];
    const milestones = this.therapeuticMilestones.get(userId) || [];
    const protocols = this.followUpProtocols.get(userId) || [];

    return {
      userId,
      exportDate: new Date().toISOString(),
      metrics: metrics.map(m => ({
        name: m.name,
        value: m.value,
        trend: m.trend,
        category: m.category,
        lastUpdated: m.lastUpdated
      })),
      insights: insights.map(i => ({
        title: i.title,
        description: i.description,
        category: i.category,
        priority: i.priority,
        actionable: i.actionable,
        generatedAt: i.generatedAt
      })),
      milestones: milestones.map(m => ({
        type: m.milestoneType,
        title: m.title,
        achievedAt: m.achievedAt,
        significance: m.significance
      })),
      followUpProtocols: protocols.map(p => ({
        triggerType: p.triggerType,
        priority: p.priority,
        status: p.status,
        createdAt: p.createdAt,
        completedAt: p.completedAt
      }))
    };
  }

  // Private helper methods

  private calculateEngagementMetric(sessions: TherapeuticSession[]): DashboardMetric {
    const totalEngagement = sessions.reduce((sum, s) => sum + s.emotionalState.pre.engagement, 0);
    const averageEngagement = sessions.length > 0 ? totalEngagement / sessions.length : 0;

    // Calculate trend
    const recentSessions = sessions.slice(-5);
    const olderSessions = sessions.slice(-10, -5);
    const recentAvg = recentSessions.reduce((sum, s) => sum + s.emotionalState.pre.engagement, 0) / recentSessions.length;
    const olderAvg = olderSessions.length > 0 ? olderSessions.reduce((sum, s) => sum + s.emotionalState.pre.engagement, 0) / olderSessions.length : recentAvg;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendPercentage = 0;

    if (recentAvg > olderAvg + 0.5) {
      trend = 'up';
      trendPercentage = Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
    } else if (recentAvg < olderAvg - 0.5) {
      trend = 'down';
      trendPercentage = Math.round(((olderAvg - recentAvg) / olderAvg) * 100);
    }

    return {
      id: 'engagement',
      name: 'Average Engagement',
      value: Math.round(averageEngagement * 10) / 10,
      unit: '/10',
      trend,
      trendPercentage,
      description: 'How actively your child participates in therapeutic sessions',
      lastUpdated: new Date(),
      category: 'engagement'
    };
  }

  private calculateProgressMetric(outcomes: TherapeuticOutcome[]): DashboardMetric {
    const improvingCount = outcomes.filter(o => 
      o.overallProgress === 'improving' || o.overallProgress === 'significant_improvement'
    ).length;
    
    const progressPercentage = outcomes.length > 0 ? (improvingCount / outcomes.length) * 100 : 0;

    return {
      id: 'progress',
      name: 'Progress Rate',
      value: Math.round(progressPercentage),
      unit: '%',
      trend: progressPercentage > 60 ? 'up' : progressPercentage < 40 ? 'down' : 'stable',
      description: 'Percentage of therapeutic goals showing improvement',
      lastUpdated: new Date(),
      category: 'progress'
    };
  }

  private calculateEmotionalMetrics(sessions: TherapeuticSession[]): DashboardMetric[] {
    if (sessions.length === 0) return [];

    const metrics: DashboardMetric[] = [];

    // Anxiety levels
    const anxietyLevels = sessions.map(s => s.emotionalState.pre.anxiety);
    const avgAnxiety = anxietyLevels.reduce((a, b) => a + b, 0) / anxietyLevels.length;
    
    metrics.push({
      id: 'anxiety',
      name: 'Anxiety Level',
      value: Math.round(avgAnxiety * 10) / 10,
      unit: '/10',
      trend: this.calculateTrend(anxietyLevels, true), // Lower is better for anxiety
      description: 'Average anxiety level during sessions',
      lastUpdated: new Date(),
      category: 'emotional'
    });

    // Confidence levels
    const confidenceLevels = sessions.map(s => s.emotionalState.pre.confidence);
    const avgConfidence = confidenceLevels.reduce((a, b) => a + b, 0) / confidenceLevels.length;
    
    metrics.push({
      id: 'confidence',
      name: 'Confidence Level',
      value: Math.round(avgConfidence * 10) / 10,
      unit: '/10',
      trend: this.calculateTrend(confidenceLevels, false), // Higher is better for confidence
      description: 'Average confidence level during sessions',
      lastUpdated: new Date(),
      category: 'emotional'
    });

    return metrics;
  }

  private calculateBehavioralMetrics(sessions: TherapeuticSession[]): DashboardMetric[] {
    const metrics: DashboardMetric[] = [];

    // Session completion rate
    const completedSessions = sessions.filter(s => s.endTime).length;
    const completionRate = sessions.length > 0 ? (completedSessions / sessions.length) * 100 : 0;

    metrics.push({
      id: 'completion_rate',
      name: 'Session Completion',
      value: Math.round(completionRate),
      unit: '%',
      trend: completionRate > 80 ? 'up' : completionRate < 60 ? 'down' : 'stable',
      description: 'Percentage of sessions completed successfully',
      lastUpdated: new Date(),
      category: 'behavioral'
    });

    return metrics;
  }

  private calculateSafetyMetric(sessions: TherapeuticSession[]): DashboardMetric {
    // Check for any safety concerns in clinical notes
    const safetyConcerns = sessions.filter(s => 
      s.clinicalNotes?.toLowerCase().includes('safety') ||
      s.clinicalNotes?.toLowerCase().includes('crisis') ||
      s.clinicalNotes?.toLowerCase().includes('harm')
    ).length;

    const safetyScore = sessions.length > 0 ? ((sessions.length - safetyConcerns) / sessions.length) * 100 : 100;

    return {
      id: 'safety',
      name: 'Safety Score',
      value: Math.round(safetyScore),
      unit: '%',
      trend: safetyScore === 100 ? 'stable' : 'down',
      description: 'Overall safety assessment based on session indicators',
      lastUpdated: new Date(),
      category: 'safety'
    };
  }

  private calculateTrend(values: number[], lowerIsBetter: boolean = false): 'up' | 'down' | 'stable' {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const improvement = lowerIsBetter ? firstAvg - secondAvg : secondAvg - firstAvg;

    if (improvement > 0.5) return 'up';
    if (improvement < -0.5) return 'down';
    return 'stable';
  }

  private createEngagementVisualization(sessions: TherapeuticSession[]): ProgressVisualization {
    const labels = sessions.map((_, index) => `Session ${index + 1}`);
    const engagementData = sessions.map(s => s.emotionalState.pre.engagement);

    return {
      type: 'line_chart',
      title: 'Engagement Over Time',
      description: 'How your child\'s engagement has changed across sessions',
      data: {
        labels,
        datasets: [{
          label: 'Engagement Level',
          data: engagementData,
          color: '#4CAF50',
          type: 'line'
        }]
      },
      insights: this.generateEngagementInsights(engagementData),
      timeRange: {
        start: sessions[0]?.startTime || new Date(),
        end: sessions[sessions.length - 1]?.startTime || new Date()
      }
    };
  }

  private createEmotionalTrendsVisualization(sessions: TherapeuticSession[]): ProgressVisualization {
    const labels = sessions.map((_, index) => `Session ${index + 1}`);
    const anxietyData = sessions.map(s => s.emotionalState.pre.anxiety);
    const confidenceData = sessions.map(s => s.emotionalState.pre.confidence);

    return {
      type: 'line_chart',
      title: 'Emotional Trends',
      description: 'Changes in anxiety and confidence levels over time',
      data: {
        labels,
        datasets: [
          {
            label: 'Anxiety',
            data: anxietyData,
            color: '#FF9800',
            type: 'line'
          },
          {
            label: 'Confidence',
            data: confidenceData,
            color: '#2196F3',
            type: 'line'
          }
        ]
      },
      insights: this.generateEmotionalInsights(anxietyData, confidenceData),
      timeRange: {
        start: sessions[0]?.startTime || new Date(),
        end: sessions[sessions.length - 1]?.startTime || new Date()
      }
    };
  }

  private createProgressOutcomesVisualization(outcomes: TherapeuticOutcome[]): ProgressVisualization {
    const progressCounts = {
      'significant_improvement': 0,
      'improving': 0,
      'stable': 0,
      'declining': 0
    };

    outcomes.forEach(outcome => {
      progressCounts[outcome.overallProgress]++;
    });

    return {
      type: 'pie_chart',
      title: 'Progress Distribution',
      description: 'Distribution of therapeutic progress outcomes',
      data: {
        labels: ['Significant Improvement', 'Improving', 'Stable', 'Declining'],
        datasets: [{
          label: 'Progress Outcomes',
          data: [
            progressCounts.significant_improvement,
            progressCounts.improving,
            progressCounts.stable,
            progressCounts.declining
          ],
          color: '#4CAF50'
        }]
      },
      insights: this.generateProgressInsights(outcomes).map(i => i.description),
      timeRange: {
        start: outcomes[0]?.measuredAt || new Date(),
        end: outcomes[outcomes.length - 1]?.measuredAt || new Date()
      }
    };
  }

  private createSessionTimelineVisualization(sessions: TherapeuticSession[]): ProgressVisualization {
    const timelineData = sessions.map(s => ({
      date: s.startTime.toISOString().split('T')[0],
      completed: s.endTime ? 1 : 0
    }));

    return {
      type: 'timeline',
      title: 'Session Timeline',
      description: 'Timeline of completed and missed sessions',
      data: {
        labels: timelineData.map(d => d.date),
        datasets: [{
          label: 'Sessions',
          data: timelineData.map(d => d.completed),
          color: '#9C27B0'
        }]
      },
      insights: [`${sessions.filter(s => s.endTime).length} of ${sessions.length} sessions completed`],
      timeRange: {
        start: sessions[0]?.startTime || new Date(),
        end: sessions[sessions.length - 1]?.startTime || new Date()
      }
    };
  }

  private generateEngagementInsights(engagementData: number[]): string[] {
    const insights: string[] = [];
    const avgEngagement = engagementData.reduce((a, b) => a + b, 0) / engagementData.length;

    if (avgEngagement > 7) {
      insights.push('Excellent engagement levels throughout therapy');
    } else if (avgEngagement > 5) {
      insights.push('Good engagement with room for improvement');
    } else {
      insights.push('Engagement levels may need attention');
    }

    return insights;
  }

  private generateEmotionalInsights(anxietyData: number[], confidenceData: number[]): string[] {
    const insights: string[] = [];
    
    const anxietyTrend = this.calculateTrend(anxietyData, true);
    const confidenceTrend = this.calculateTrend(confidenceData, false);

    if (anxietyTrend === 'up') {
      insights.push('Anxiety levels are decreasing over time');
    }
    
    if (confidenceTrend === 'up') {
      insights.push('Confidence levels are improving');
    }

    return insights;
  }

  private generateProgressInsights(outcomes: TherapeuticOutcome[]): ParentInsight[] {
    const insights: ParentInsight[] = [];

    const improvingCount = outcomes.filter(o => 
      o.overallProgress === 'improving' || o.overallProgress === 'significant_improvement'
    ).length;

    if (improvingCount > outcomes.length * 0.6) {
      insights.push({
        id: `progress-${Date.now()}`,
        title: 'Great Progress!',
        description: 'Your child is showing improvement in most therapeutic areas',
        category: 'progress',
        priority: 'medium',
        actionable: false,
        supportingData: [{
          metric: 'Improvement Rate',
          value: `${Math.round((improvingCount / outcomes.length) * 100)}%`,
          context: 'of therapeutic goals showing progress'
        }],
        generatedAt: new Date(),
        readByParent: false
      });
    }

    return insights;
  }

  private generateAchievementInsights(milestones: TherapeuticMilestone[]): ParentInsight[] {
    const recentMilestones = milestones.filter(m => 
      m.achievedAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    if (recentMilestones.length > 0) {
      return [{
        id: `achievement-${Date.now()}`,
        title: 'Recent Achievements',
        description: `Your child has reached ${recentMilestones.length} therapeutic milestone(s) this month`,
        category: 'achievement',
        priority: 'medium',
        actionable: true,
        actionItems: ['Celebrate these achievements with your child'],
        supportingData: recentMilestones.map(m => ({
          metric: 'Milestone',
          value: m.title,
          context: `Achieved on ${m.achievedAt.toDateString()}`
        })),
        generatedAt: new Date(),
        readByParent: false
      }];
    }

    return [];
  }

  private generateConcernInsights(sessions: TherapeuticSession[], outcomes: TherapeuticOutcome[]): ParentInsight[] {
    const insights: ParentInsight[] = [];

    // Check for declining engagement
    const recentSessions = sessions.slice(-5);
    const engagementTrend = this.calculateEngagementTrend(recentSessions);
    
    if (engagementTrend < -1) {
      insights.push({
        id: `concern-engagement-${Date.now()}`,
        title: 'Engagement Attention Needed',
        description: 'Your child\'s engagement in recent sessions has been declining',
        category: 'concern',
        priority: 'high',
        actionable: true,
        actionItems: [
          'Discuss with your child how they\'re feeling about therapy',
          'Consider adjusting session timing or environment',
          'Speak with the therapeutic team about modifications'
        ],
        supportingData: [{
          metric: 'Engagement Trend',
          value: 'Declining',
          context: 'Based on last 5 sessions'
        }],
        generatedAt: new Date(),
        readByParent: false
      });
    }

    return insights;
  }

  private generateRecommendationInsights(sessions: TherapeuticSession[], outcomes: TherapeuticOutcome[]): ParentInsight[] {
    const insights: ParentInsight[] = [];

    // General recommendations based on progress
    insights.push({
      id: `recommendation-${Date.now()}`,
      title: 'Continue Supporting Progress',
      description: 'Keep up the great work supporting your child\'s therapeutic journey',
      category: 'recommendation',
      priority: 'low',
      actionable: true,
      actionItems: [
        'Maintain consistent session attendance',
        'Practice therapeutic skills at home',
        'Celebrate small victories'
      ],
      supportingData: [{
        metric: 'Session Attendance',
        value: `${sessions.filter(s => s.endTime).length}/${sessions.length}`,
        context: 'sessions completed'
      }],
      generatedAt: new Date(),
      readByParent: false
    });

    return insights;
  }

  private detectNewMilestones(
    userId: string,
    sessions: TherapeuticSession[],
    outcomes: TherapeuticOutcome[],
    existingMilestones: TherapeuticMilestone[]
  ): TherapeuticMilestone[] {
    const newMilestones: TherapeuticMilestone[] = [];

    // Check for first session milestone
    if (sessions.length === 1 && !existingMilestones.some(m => m.milestoneType === 'first_session')) {
      newMilestones.push({
        id: `milestone-${Date.now()}`,
        userId,
        milestoneType: 'first_session',
        title: 'First Therapeutic Session',
        description: 'Completed their very first therapeutic session',
        achievedAt: sessions[0].startTime,
        significance: 'major',
        relatedSessions: [sessions[0].id],
        celebrationSuggestions: [
          'Praise your child for being brave and trying something new',
          'Ask them what they liked about the session',
          'Plan a small celebration activity'
        ],
        shareWithProvider: true,
        parentNotified: false
      });
    }

    // Check for engagement improvement milestone
    if (sessions.length >= 5) {
      const recentEngagement = sessions.slice(-3).reduce((sum, s) => sum + s.emotionalState.pre.engagement, 0) / 3;
      const earlierEngagement = sessions.slice(0, 3).reduce((sum, s) => sum + s.emotionalState.pre.engagement, 0) / 3;
      
      if (recentEngagement > earlierEngagement + 2 && 
          !existingMilestones.some(m => m.milestoneType === 'engagement_improvement')) {
        newMilestones.push({
          id: `milestone-${Date.now()}`,
          userId,
          milestoneType: 'engagement_improvement',
          title: 'Engagement Breakthrough',
          description: 'Showed significant improvement in session engagement',
          achievedAt: sessions[sessions.length - 1].startTime,
          significance: 'moderate',
          relatedSessions: sessions.slice(-3).map(s => s.id),
          celebrationSuggestions: [
            'Acknowledge their increased participation',
            'Ask what they enjoy most about the sessions',
            'Encourage continued engagement'
          ],
          shareWithProvider: true,
          parentNotified: false
        });
      }
    }

    return newMilestones;
  }

  private async generateMilestoneCelebration(milestone: TherapeuticMilestone): Promise<void> {
    // In real implementation, would generate celebration content
    console.log(`Generating celebration for milestone: ${milestone.title}`);
  }

  private calculateFollowUpDate(triggerType: FollowUpProtocol['triggerType'], priority: FollowUpProtocol['priority']): Date {
    const now = new Date();
    let daysToAdd = 7; // Default 1 week

    switch (priority) {
      case 'urgent':
        daysToAdd = 1;
        break;
      case 'high':
        daysToAdd = 3;
        break;
      case 'medium':
        daysToAdd = 7;
        break;
      case 'low':
        daysToAdd = 14;
        break;
    }

    return new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  }

  private generateDefaultActions(triggerType: FollowUpProtocol['triggerType'], priority: FollowUpProtocol['priority']): FollowUpProtocol['actions'] {
    const actions: FollowUpProtocol['actions'] = [];

    switch (triggerType) {
      case 'missed_session':
        actions.push({
          type: 'parent_contact',
          description: 'Contact parent about missed session and reschedule',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
          completed: false
        });
        break;

      case 'declining_progress':
        actions.push({
          type: 'assessment_review',
          description: 'Review therapeutic approach and consider adjustments',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
          completed: false
        });
        actions.push({
          type: 'provider_notification',
          description: 'Notify healthcare provider of declining progress',
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
          completed: false
        });
        break;

      case 'safety_concern':
        actions.push({
          type: 'parent_contact',
          description: 'Immediate parent contact regarding safety concern',
          dueDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          completed: false
        });
        actions.push({
          type: 'provider_notification',
          description: 'Notify healthcare provider of safety concern',
          dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
          completed: false
        });
        break;

      default:
        actions.push({
          type: 'parent_contact',
          description: 'Follow up with parent',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
          completed: false
        });
    }

    return actions;
  }

  private async executeFollowUpAction(action: FollowUpProtocol['actions'][0], userId: string): Promise<void> {
    switch (action.type) {
      case 'parent_contact':
        // In real implementation, would contact parent
        console.log(`Contacting parent for user ${userId}: ${action.description}`);
        break;
      case 'provider_notification':
        // In real implementation, would notify provider
        console.log(`Notifying provider for user ${userId}: ${action.description}`);
        break;
      case 'session_adjustment':
        // In real implementation, would adjust session parameters
        console.log(`Adjusting session for user ${userId}: ${action.description}`);
        break;
      case 'resource_sharing':
        // In real implementation, would share resources
        console.log(`Sharing resources for user ${userId}: ${action.description}`);
        break;
      case 'assessment_review':
        // In real implementation, would trigger assessment review
        console.log(`Reviewing assessment for user ${userId}: ${action.description}`);
        break;
    }
  }

  private calculateEngagementTrend(sessions: TherapeuticSession[]): number {
    if (sessions.length < 2) return 0;

    const engagementScores = sessions.map(s => s.emotionalState.pre.engagement);
    const firstHalf = engagementScores.slice(0, Math.floor(sessions.length / 2));
    const secondHalf = engagementScores.slice(Math.floor(sessions.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    return secondAvg - firstAvg;
  }

  private getTotalSessions(userId: string): number {
    // In real implementation, would query session count
    return 0;
  }

  private getRecentProgressSummary(userId: string): string {
    // In real implementation, would generate progress summary
    return 'Making steady progress';
  }

  private getNextMilestone(userId: string): string {
    // In real implementation, would determine next milestone
    return 'Engagement improvement';
  }

  private getOverallTrend(metrics: DashboardMetric[]): string {
    const upTrends = metrics.filter(m => m.trend === 'up').length;
    const downTrends = metrics.filter(m => m.trend === 'down').length;

    if (upTrends > downTrends) return 'improving';
    if (downTrends > upTrends) return 'declining';
    return 'stable';
  }

  private getUpcomingFollowUps(userId: string): FollowUpProtocol[] {
    const protocols = this.followUpProtocols.get(userId) || [];
    return protocols.filter(p => p.status === 'pending' && p.scheduledFor > new Date());
  }
}
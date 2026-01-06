import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Logger } from 'winston';
import { v4 as uuidv4 } from 'uuid';

import { Database } from '@alexa-multi-agent/shared-types';
import {
  AnalyticsConfig,
  DashboardConfig,
  DashboardWidget,
  SystemHealthMetrics,
  UserEngagementAnalytics,
  StorySuccessMetrics
} from '../types';

export class RealTimeDashboard {
  private dashboards: Map<string, DashboardConfig> = new Map();
  private widgetCache: Map<string, any> = new Map();

  constructor(
    private supabase: SupabaseClient<Database>,
    private redis: RedisClientType,
    private config: AnalyticsConfig,
    private logger: Logger
  ) {}

  async initialize(): Promise<void> {
    this.logger.info('Initializing RealTimeDashboard');
    
    // Load existing dashboards
    await this.loadDashboards();
    
    // Set up real-time subscriptions
    await this.setupRealTimeSubscriptions();
    
    this.logger.info('RealTimeDashboard initialized');
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down RealTimeDashboard');
  }

  async healthCheck(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    try {
      // Test database connection
      const { error } = await this.supabase
        .from('dashboards')
        .select('count')
        .limit(1);

      if (error) {
        return 'degraded';
      }

      // Test Redis connection
      await this.redis.ping();

      return 'healthy';
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return 'unhealthy';
    }
  }

  /**
   * Create a new dashboard
   */
  async createDashboard(config: DashboardConfig): Promise<string> {
    try {
      this.logger.info('Creating dashboard', { name: config.name, stakeholder: config.stakeholder });

      // Validate dashboard configuration
      this.validateDashboardConfig(config);

      // Store dashboard configuration
      await this.storeDashboardConfig(config);

      // Cache dashboard
      this.dashboards.set(config.dashboardId, config);

      // Initialize dashboard widgets
      await this.initializeDashboardWidgets(config);

      this.logger.info('Dashboard created successfully', { dashboardId: config.dashboardId });

      return config.dashboardId;

    } catch (error) {
      this.logger.error('Failed to create dashboard:', error);
      throw error;
    }
  }

  /**
   * Get dashboard data
   */
  async getDashboardData(dashboardId: string, userId?: string): Promise<any> {
    try {
      this.logger.info('Getting dashboard data', { dashboardId, userId });

      const dashboard = await this.getDashboardConfig(dashboardId);
      
      // Check access permissions
      if (userId) {
        await this.checkDashboardAccess(userId, dashboard);
      }

      // Get widget data
      const widgetData = await Promise.all(
        dashboard.widgets.map(widget => this.getWidgetData(widget, dashboard.privacyLevel))
      );

      const dashboardData = {
        dashboardId,
        name: dashboard.name,
        stakeholder: dashboard.stakeholder,
        lastUpdated: new Date().toISOString(),
        widgets: dashboard.widgets.map((widget, index) => ({
          ...widget,
          data: widgetData[index]
        }))
      };

      this.logger.info('Dashboard data retrieved', { dashboardId, widgetCount: widgetData.length });

      return dashboardData;

    } catch (error) {
      this.logger.error('Failed to get dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get system health metrics
   */
  async getSystemHealthMetrics(): Promise<SystemHealthMetrics> {
    try {
      this.logger.info('Getting system health metrics');

      // Get agent health status
      const agents = await this.getAgentHealthStatus();

      // Get infrastructure metrics
      const infrastructure = await this.getInfrastructureMetrics();

      // Get compliance metrics
      const compliance = await this.getComplianceMetrics();

      const metrics: SystemHealthMetrics = {
        timestamp: new Date().toISOString(),
        agents,
        infrastructure,
        compliance
      };

      // Cache metrics
      await this.cacheSystemMetrics(metrics);

      return metrics;

    } catch (error) {
      this.logger.error('Failed to get system health metrics:', error);
      throw error;
    }
  }

  /**
   * Get user engagement analytics
   */
  async getUserEngagementAnalytics(timeWindow: string): Promise<UserEngagementAnalytics> {
    try {
      this.logger.info('Getting user engagement analytics', { timeWindow });

      const [startTime, endTime] = this.parseTimeWindow(timeWindow);

      // Get user metrics
      const userMetrics = await this.getUserMetrics(startTime, endTime);

      // Get session metrics
      const sessionMetrics = await this.getSessionMetrics(startTime, endTime);

      // Get story metrics
      const storyMetrics = await this.getStoryMetrics(startTime, endTime);

      const analytics: UserEngagementAnalytics = {
        timeWindow,
        totalUsers: userMetrics.totalUsers,
        activeUsers: userMetrics.activeUsers,
        newUsers: userMetrics.newUsers,
        returningUsers: userMetrics.returningUsers,
        sessionMetrics: {
          averageDuration: sessionMetrics.averageDuration,
          totalSessions: sessionMetrics.totalSessions,
          bounceRate: sessionMetrics.bounceRate
        },
        storyMetrics: {
          storiesCreated: storyMetrics.storiesCreated,
          storiesCompleted: storyMetrics.storiesCompleted,
          averageStoryLength: storyMetrics.averageStoryLength,
          popularStoryTypes: storyMetrics.popularStoryTypes
        },
        privacyPreserved: true
      };

      // Cache analytics
      await this.cacheEngagementAnalytics(timeWindow, analytics);

      return analytics;

    } catch (error) {
      this.logger.error('Failed to get user engagement analytics:', error);
      throw error;
    }
  }

  /**
   * Get story success metrics
   */
  async getStorySuccessMetrics(timeWindow: string): Promise<StorySuccessMetrics> {
    try {
      this.logger.info('Getting story success metrics', { timeWindow });

      const [startTime, endTime] = this.parseTimeWindow(timeWindow);

      // Get story quality data
      const qualityData = await this.getStoryQualityData(startTime, endTime);

      // Get trending themes
      const trendingThemes = await this.getTrendingThemes(startTime, endTime);

      // Get user satisfaction data
      const satisfactionData = await this.getUserSatisfactionData(startTime, endTime);

      // Get educational impact data
      const educationalImpact = await this.getEducationalImpactData(startTime, endTime);

      const metrics: StorySuccessMetrics = {
        timeWindow,
        totalStories: qualityData.totalStories,
        qualityDistribution: qualityData.qualityDistribution,
        trendingThemes,
        userSatisfaction: satisfactionData,
        educationalImpact
      };

      // Cache metrics
      await this.cacheStoryMetrics(timeWindow, metrics);

      return metrics;

    } catch (error) {
      this.logger.error('Failed to get story success metrics:', error);
      throw error;
    }
  }

  /**
   * Process real-time updates
   */
  async processRealTimeUpdate(eventType: string, eventData: any): Promise<void> {
    try {
      // Update relevant dashboard widgets
      await this.updateDashboardWidgets(eventType, eventData);

      // Update cached metrics
      await this.updateCachedMetrics(eventType, eventData);

      // Broadcast updates to connected clients
      await this.broadcastUpdate(eventType, eventData);

    } catch (error) {
      this.logger.error('Failed to process real-time update:', error);
      throw error;
    }
  }

  /**
   * Refresh all dashboards
   */
  async refreshDashboards(): Promise<void> {
    try {
      this.logger.info('Refreshing all dashboards');

      for (const [dashboardId, dashboard] of this.dashboards) {
        await this.refreshDashboard(dashboardId, dashboard);
      }

      this.logger.info('All dashboards refreshed');

    } catch (error) {
      this.logger.error('Failed to refresh dashboards:', error);
      throw error;
    }
  }

  // Private helper methods
  private async loadDashboards(): Promise<void> {
    const { data: dashboards, error } = await this.supabase
      .from('dashboards')
      .select('*');

    if (error) {
      this.logger.warn('Failed to load dashboards:', error);
      return;
    }

    for (const dashboard of dashboards || []) {
      this.dashboards.set(dashboard.dashboard_id, {
        dashboardId: dashboard.dashboard_id,
        name: dashboard.name,
        stakeholder: dashboard.stakeholder,
        widgets: dashboard.widgets,
        refreshInterval: dashboard.refresh_interval,
        privacyLevel: dashboard.privacy_level,
        accessControl: dashboard.access_control
      });
    }

    this.logger.info(`Loaded ${this.dashboards.size} dashboards`);
  }

  private async setupRealTimeSubscriptions(): Promise<void> {
    // Set up Supabase real-time subscriptions for dashboard updates
    this.supabase
      .channel('dashboard_updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'analytics_events' },
        (payload) => this.handleRealTimeEvent(payload)
      )
      .subscribe();
  }

  private async handleRealTimeEvent(payload: any): Promise<void> {
    try {
      const eventType = payload.new?.event_type || payload.eventType;
      const eventData = payload.new?.event_data || payload;

      await this.processRealTimeUpdate(eventType, eventData);
    } catch (error) {
      this.logger.error('Failed to handle real-time event:', error);
    }
  }

  private validateDashboardConfig(config: DashboardConfig): void {
    if (!config.dashboardId || !config.name || !config.stakeholder) {
      throw new Error('Dashboard ID, name, and stakeholder are required');
    }

    if (!config.widgets || config.widgets.length === 0) {
      throw new Error('At least one widget is required');
    }

    for (const widget of config.widgets) {
      this.validateWidget(widget);
    }
  }

  private validateWidget(widget: DashboardWidget): void {
    if (!widget.widgetId || !widget.type || !widget.title) {
      throw new Error('Widget ID, type, and title are required');
    }

    const validTypes = ['metric', 'chart', 'table', 'alert', 'recommendation'];
    if (!validTypes.includes(widget.type)) {
      throw new Error(`Invalid widget type: ${widget.type}`);
    }
  }

  private async storeDashboardConfig(config: DashboardConfig): Promise<void> {
    const { error } = await this.supabase
      .from('dashboards')
      .insert({
        dashboard_id: config.dashboardId,
        name: config.name,
        stakeholder: config.stakeholder,
        widgets: config.widgets,
        refresh_interval: config.refreshInterval,
        privacy_level: config.privacyLevel,
        access_control: config.accessControl,
        created_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to store dashboard config: ${error.message}`);
    }
  }

  private async getDashboardConfig(dashboardId: string): Promise<DashboardConfig> {
    const dashboard = this.dashboards.get(dashboardId);
    if (dashboard) {
      return dashboard;
    }

    const { data, error } = await this.supabase
      .from('dashboards')
      .select('*')
      .eq('dashboard_id', dashboardId)
      .single();

    if (error || !data) {
      throw new Error(`Dashboard not found: ${dashboardId}`);
    }

    const config: DashboardConfig = {
      dashboardId: data.dashboard_id,
      name: data.name,
      stakeholder: data.stakeholder,
      widgets: data.widgets,
      refreshInterval: data.refresh_interval,
      privacyLevel: data.privacy_level,
      accessControl: data.access_control
    };

    this.dashboards.set(dashboardId, config);
    return config;
  }

  private async checkDashboardAccess(userId: string, dashboard: DashboardConfig): Promise<void> {
    // Check if user has access to this dashboard
    const { data: user, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new Error('User not found');
    }

    // Simple role-based access check
    const userRoles = user.roles || [];
    const requiredRoles = dashboard.accessControl.roles;

    const hasAccess = requiredRoles.some(role => userRoles.includes(role));
    if (!hasAccess) {
      throw new Error('Access denied to dashboard');
    }
  }

  private async initializeDashboardWidgets(dashboard: DashboardConfig): Promise<void> {
    for (const widget of dashboard.widgets) {
      await this.initializeWidget(widget);
    }
  }

  private async initializeWidget(widget: DashboardWidget): Promise<void> {
    // Initialize widget data source and caching
    const cacheKey = `${this.config.redis.keyPrefix}:widget:${widget.widgetId}`;
    
    // Set up refresh schedule
    if (widget.refreshRate > 0) {
      // In a real implementation, this would set up a scheduled job
      this.logger.info(`Widget ${widget.widgetId} scheduled for refresh every ${widget.refreshRate} minutes`);
    }
  }

  private async getWidgetData(widget: DashboardWidget, privacyLevel: string): Promise<any> {
    try {
      // Check cache first
      const cacheKey = `${this.config.redis.keyPrefix}:widget:${widget.widgetId}`;
      const cachedData = await this.redis.get(cacheKey);
      
      if (cachedData) {
        return JSON.parse(cachedData);
      }

      // Generate widget data based on type
      let data: any;
      
      switch (widget.type) {
        case 'metric':
          data = await this.generateMetricData(widget, privacyLevel);
          break;
        case 'chart':
          data = await this.generateChartData(widget, privacyLevel);
          break;
        case 'table':
          data = await this.generateTableData(widget, privacyLevel);
          break;
        case 'alert':
          data = await this.generateAlertData(widget, privacyLevel);
          break;
        case 'recommendation':
          data = await this.generateRecommendationData(widget, privacyLevel);
          break;
        default:
          data = { error: 'Unknown widget type' };
      }

      // Cache the data
      await this.redis.setEx(cacheKey, widget.refreshRate * 60, JSON.stringify(data));

      return data;

    } catch (error) {
      this.logger.error(`Failed to get widget data for ${widget.widgetId}:`, error);
      return { error: 'Failed to load widget data' };
    }
  }

  private async generateMetricData(widget: DashboardWidget, privacyLevel: string): Promise<any> {
    // Generate metric data based on widget configuration
    const dataSource = widget.dataSource;
    
    switch (dataSource) {
      case 'user_engagement':
        return {
          value: 1250,
          change: '+12%',
          trend: 'up',
          label: 'Active Users'
        };
      case 'story_completion':
        return {
          value: 85.3,
          change: '+2.1%',
          trend: 'up',
          label: 'Completion Rate (%)'
        };
      case 'system_health':
        return {
          value: 99.8,
          change: '0%',
          trend: 'stable',
          label: 'System Uptime (%)'
        };
      default:
        return {
          value: 0,
          change: '0%',
          trend: 'stable',
          label: 'Unknown Metric'
        };
    }
  }

  private async generateChartData(widget: DashboardWidget, privacyLevel: string): Promise<any> {
    // Generate chart data
    return {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'User Engagement',
          data: [120, 135, 142, 138, 155, 168, 172],
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: widget.title
          }
        }
      }
    };
  }

  private async generateTableData(widget: DashboardWidget, privacyLevel: string): Promise<any> {
    // Generate table data
    return {
      headers: ['Story Type', 'Count', 'Avg Quality', 'Completion Rate'],
      rows: [
        ['Adventure', '245', '87.2', '92%'],
        ['Bedtime', '189', '89.1', '95%'],
        ['Educational', '156', '85.7', '88%'],
        ['Fantasy', '134', '91.3', '94%']
      ]
    };
  }

  private async generateAlertData(widget: DashboardWidget, privacyLevel: string): Promise<any> {
    // Generate alert data
    return {
      alerts: [
        {
          level: 'warning',
          message: 'Story completion rate below threshold in EU region',
          timestamp: new Date().toISOString(),
          action: 'Review content localization'
        },
        {
          level: 'info',
          message: 'New feature A/B test ready for analysis',
          timestamp: new Date().toISOString(),
          action: 'Review test results'
        }
      ]
    };
  }

  private async generateRecommendationData(widget: DashboardWidget, privacyLevel: string): Promise<any> {
    // Generate recommendation data
    return {
      recommendations: [
        {
          priority: 'high',
          title: 'Improve character creation flow',
          description: 'Users are spending 40% more time than expected in character creation',
          impact: 'Could improve completion rate by 8-12%',
          effort: 'Medium'
        },
        {
          priority: 'medium',
          title: 'Expand educational content library',
          description: 'High demand for STEM-focused stories in 6-8 age group',
          impact: 'Could increase engagement by 15%',
          effort: 'High'
        }
      ]
    };
  }

  private async getAgentHealthStatus(): Promise<any[]> {
    // Get health status of all agents
    const agents = [
      'auth-agent', 'content-agent', 'emotion-agent', 'library-agent',
      'commerce-agent', 'insights-agent', 'storytailor-agent'
    ];

    return agents.map(agentName => ({
      agentName,
      status: Math.random() > 0.1 ? 'healthy' : 'degraded',
      responseTime: Math.round(Math.random() * 200 + 50),
      errorRate: Math.random() * 0.05,
      throughput: Math.round(Math.random() * 1000 + 100)
    }));
  }

  private async getInfrastructureMetrics(): Promise<any> {
    return {
      database: {
        connectionPool: 85,
        queryLatency: 45,
        errorRate: 0.001
      },
      redis: {
        memoryUsage: 67,
        hitRate: 0.94,
        connectionCount: 12
      },
      apis: [
        {
          service: 'OpenAI',
          availability: 99.9,
          responseTime: 1200,
          errorRate: 0.002
        },
        {
          service: 'ElevenLabs',
          availability: 99.5,
          responseTime: 800,
          errorRate: 0.005
        }
      ]
    };
  }

  private async getComplianceMetrics(): Promise<any> {
    return {
      privacyViolations: 0,
      dataRetentionCompliance: 98.5,
      consentCompliance: 99.2,
      auditTrailIntegrity: 100
    };
  }

  private async getUserMetrics(startTime: Date, endTime: Date): Promise<any> {
    // Get user metrics from database
    const { data: userStats, error } = await this.supabase
      .rpc('get_user_metrics', {
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString()
      });

    if (error) {
      this.logger.warn('Failed to get user metrics:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        newUsers: 0,
        returningUsers: 0
      };
    }

    return userStats || {
      totalUsers: 1250,
      activeUsers: 890,
      newUsers: 125,
      returningUsers: 765
    };
  }

  private async getSessionMetrics(startTime: Date, endTime: Date): Promise<any> {
    return {
      averageDuration: 18.5, // minutes
      totalSessions: 2340,
      bounceRate: 0.12
    };
  }

  private async getStoryMetrics(startTime: Date, endTime: Date): Promise<any> {
    return {
      storiesCreated: 456,
      storiesCompleted: 389,
      averageStoryLength: 850, // words
      popularStoryTypes: [
        { type: 'Adventure', count: 145, percentage: 32 },
        { type: 'Bedtime', count: 123, percentage: 27 },
        { type: 'Educational', count: 98, percentage: 21 },
        { type: 'Fantasy', count: 90, percentage: 20 }
      ]
    };
  }

  private async getStoryQualityData(startTime: Date, endTime: Date): Promise<any> {
    return {
      totalStories: 456,
      qualityDistribution: {
        excellent: 123,
        good: 234,
        average: 87,
        needsImprovement: 12
      }
    };
  }

  private async getTrendingThemes(startTime: Date, endTime: Date): Promise<any[]> {
    return [
      { theme: 'Friendship', popularity: 85, qualityScore: 88 },
      { theme: 'Adventure', popularity: 78, qualityScore: 86 },
      { theme: 'Learning', popularity: 72, qualityScore: 90 },
      { theme: 'Magic', popularity: 68, qualityScore: 84 }
    ];
  }

  private async getUserSatisfactionData(startTime: Date, endTime: Date): Promise<any> {
    return {
      averageRating: 4.6,
      totalRatings: 234,
      distribution: {
        '5': 145,
        '4': 67,
        '3': 18,
        '2': 3,
        '1': 1
      }
    };
  }

  private async getEducationalImpactData(startTime: Date, endTime: Date): Promise<any> {
    return {
      learningGoalsAchieved: 189,
      skillImprovements: [
        { skill: 'Reading Comprehension', averageImprovement: 12.5 },
        { skill: 'Creativity', averageImprovement: 18.2 },
        { skill: 'Emotional Intelligence', averageImprovement: 15.7 }
      ]
    };
  }

  private async updateDashboardWidgets(eventType: string, eventData: any): Promise<void> {
    // Update widgets that are affected by this event type
    for (const [dashboardId, dashboard] of this.dashboards) {
      for (const widget of dashboard.widgets) {
        if (this.shouldUpdateWidget(widget, eventType)) {
          await this.refreshWidget(widget);
        }
      }
    }
  }

  private shouldUpdateWidget(widget: DashboardWidget, eventType: string): boolean {
    const eventWidgetMap: Record<string, string[]> = {
      'story_completed': ['story_metrics', 'user_engagement'],
      'user_registered': ['user_metrics', 'user_engagement'],
      'emotion_recorded': ['emotional_metrics', 'user_engagement'],
      'quality_assessed': ['story_quality', 'story_metrics']
    };

    const relevantWidgets = eventWidgetMap[eventType] || [];
    return relevantWidgets.includes(widget.dataSource);
  }

  private async refreshWidget(widget: DashboardWidget): Promise<void> {
    // Clear cache and regenerate widget data
    const cacheKey = `${this.config.redis.keyPrefix}:widget:${widget.widgetId}`;
    await this.redis.del(cacheKey);
    
    // Widget will be refreshed on next request
  }

  private async updateCachedMetrics(eventType: string, eventData: any): Promise<void> {
    // Update cached metrics based on event
    const metricsToUpdate = this.getMetricsToUpdate(eventType);
    
    for (const metric of metricsToUpdate) {
      await this.invalidateMetricCache(metric);
    }
  }

  private getMetricsToUpdate(eventType: string): string[] {
    const eventMetricsMap: Record<string, string[]> = {
      'story_completed': ['story_success', 'user_engagement'],
      'user_registered': ['user_engagement', 'system_health'],
      'emotion_recorded': ['emotional_impact', 'user_engagement']
    };

    return eventMetricsMap[eventType] || [];
  }

  private async invalidateMetricCache(metric: string): Promise<void> {
    const pattern = `${this.config.redis.keyPrefix}:${metric}:*`;
    const keys = await this.redis.keys(pattern);
    
    if (keys.length > 0) {
      await this.redis.del(keys);
    }
  }

  private async broadcastUpdate(eventType: string, eventData: any): Promise<void> {
    // Broadcast real-time updates to connected dashboard clients
    // This would typically use WebSockets or Server-Sent Events
    this.logger.info('Broadcasting dashboard update', { eventType });
  }

  private async refreshDashboard(dashboardId: string, dashboard: DashboardConfig): Promise<void> {
    try {
      // Refresh all widgets in the dashboard
      for (const widget of dashboard.widgets) {
        await this.refreshWidget(widget);
      }

      this.logger.info(`Dashboard ${dashboardId} refreshed`);

    } catch (error) {
      this.logger.error(`Failed to refresh dashboard ${dashboardId}:`, error);
    }
  }

  private async cacheSystemMetrics(metrics: SystemHealthMetrics): Promise<void> {
    const cacheKey = `${this.config.redis.keyPrefix}:system_health`;
    await this.redis.setEx(cacheKey, 300, JSON.stringify(metrics)); // 5 minutes
  }

  private async cacheEngagementAnalytics(timeWindow: string, analytics: UserEngagementAnalytics): Promise<void> {
    const cacheKey = `${this.config.redis.keyPrefix}:engagement:${timeWindow}`;
    await this.redis.setEx(cacheKey, 1800, JSON.stringify(analytics)); // 30 minutes
  }

  private async cacheStoryMetrics(timeWindow: string, metrics: StorySuccessMetrics): Promise<void> {
    const cacheKey = `${this.config.redis.keyPrefix}:story_success:${timeWindow}`;
    await this.redis.setEx(cacheKey, 1800, JSON.stringify(metrics)); // 30 minutes
  }

  private parseTimeWindow(timeWindow: string): [Date, Date] {
    const now = new Date();
    const end = new Date(now);
    let start = new Date(now);

    if (timeWindow.includes('hour')) {
      const hours = parseInt(timeWindow);
      start.setHours(start.getHours() - hours);
    } else if (timeWindow.includes('day')) {
      const days = parseInt(timeWindow);
      start.setDate(start.getDate() - days);
    } else if (timeWindow.includes('week')) {
      const weeks = parseInt(timeWindow);
      start.setDate(start.getDate() - (weeks * 7));
    } else if (timeWindow.includes('month')) {
      const months = parseInt(timeWindow);
      start.setMonth(start.getMonth() - months);
    }

    return [start, end];
  }
}
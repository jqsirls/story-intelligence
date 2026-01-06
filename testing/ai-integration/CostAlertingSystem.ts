import { EventEmitter } from 'events';
import { CostOptimizationSystem, BudgetAlert, CostThreshold } from './CostOptimizationSystem';

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'console';
  config: Record<string, any>;
  enabled: boolean;
}

export interface AlertRule {
  id: string;
  name: string;
  service: string;
  operation?: string;
  condition: 'threshold_exceeded' | 'budget_limit' | 'cost_spike' | 'unusual_usage';
  threshold: number;
  timeWindow: number; // in minutes
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: string[]; // Alert channel IDs
  cooldown: number; // Minimum time between alerts in minutes
  enabled: boolean;
}

export interface Alert {
  id: string;
  ruleId: string;
  service: string;
  operation?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, any>;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}

export interface AlertingConfig {
  defaultChannels: string[];
  escalationRules: Array<{
    severity: string;
    escalateAfter: number; // minutes
    escalateTo: string[];
  }>;
  globalCooldown: number; // minutes
}

export class CostAlertingSystem extends EventEmitter {
  private costOptimizer: CostOptimizationSystem;
  private config: AlertingConfig;
  private alertChannels: Map<string, AlertChannel> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private lastAlertTimes: Map<string, Date> = new Map();
  private escalationInterval: NodeJS.Timeout | null = null;

  constructor(costOptimizer: CostOptimizationSystem, config?: Partial<AlertingConfig>) {
    super();
    
    this.costOptimizer = costOptimizer;
    this.config = {
      defaultChannels: ['console'],
      escalationRules: [
        { severity: 'high', escalateAfter: 30, escalateTo: ['email'] },
        { severity: 'critical', escalateAfter: 15, escalateTo: ['email', 'slack'] }
      ],
      globalCooldown: 5,
      ...config
    };

    this.initializeDefaultChannels();
    this.initializeDefaultRules();
    this.setupCostOptimizerListeners();
    this.startEscalationMonitoring();
  }

  /**
   * Clean up resources and stop timers
   */
  destroy(): void {
    if (this.escalationInterval) {
      clearInterval(this.escalationInterval);
      this.escalationInterval = null;
    }
    this.removeAllListeners();
  }

  /**
   * Add an alert channel
   */
  addAlertChannel(id: string, channel: AlertChannel): void {
    this.alertChannels.set(id, channel);
    this.emit('channelAdded', { id, channel });
  }

  /**
   * Add an alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    this.emit('ruleAdded', rule);
  }

  /**
   * Remove an alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    const removed = this.alertRules.delete(ruleId);
    if (removed) {
      this.emit('ruleRemoved', ruleId);
    }
    return removed;
  }

  /**
   * Update an alert rule
   */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
      this.alertRules.set(ruleId, rule);
      this.emit('ruleUpdated', { ruleId, rule });
      return true;
    }
    return false;
  }

  /**
   * Trigger an alert
   */
  async triggerAlert(
    ruleId: string,
    message: string,
    details: Record<string, any> = {}
  ): Promise<Alert | null> {
    const rule = this.alertRules.get(ruleId);
    if (!rule || !rule.enabled) {
      return null;
    }

    // Check cooldown
    const lastAlert = this.lastAlertTimes.get(ruleId);
    if (lastAlert) {
      const cooldownEnd = new Date(lastAlert.getTime() + rule.cooldown * 60 * 1000);
      if (new Date() < cooldownEnd) {
        return null; // Still in cooldown
      }
    }

    const alert: Alert = {
      id: this.generateAlertId(),
      ruleId,
      service: rule.service,
      operation: rule.operation,
      severity: rule.severity,
      message,
      details,
      timestamp: new Date(),
      acknowledged: false
    };

    // Store alert
    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.push(alert);
    this.lastAlertTimes.set(ruleId, alert.timestamp);

    // Send alert through configured channels
    await this.sendAlert(alert, rule.channels);

    this.emit('alertTriggered', alert);
    
    return alert;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert && !alert.acknowledged) {
      alert.acknowledged = true;
      alert.details.acknowledgedBy = acknowledgedBy;
      alert.details.acknowledgedAt = new Date();
      
      this.emit('alertAcknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, resolvedBy?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolvedAt = new Date();
      alert.details.resolvedBy = resolvedBy;
      
      this.activeAlerts.delete(alertId);
      this.emit('alertResolved', alert);
      return true;
    }
    return false;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(filters?: {
    service?: string;
    severity?: string;
    acknowledged?: boolean;
  }): Alert[] {
    let alerts = Array.from(this.activeAlerts.values());

    if (filters) {
      if (filters.service) {
        alerts = alerts.filter(a => a.service === filters.service);
      }
      if (filters.severity) {
        alerts = alerts.filter(a => a.severity === filters.severity);
      }
      if (filters.acknowledged !== undefined) {
        alerts = alerts.filter(a => a.acknowledged === filters.acknowledged);
      }
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get alert history
   */
  getAlertHistory(
    limit: number = 100,
    filters?: {
      service?: string;
      severity?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Alert[] {
    let alerts = [...this.alertHistory];

    if (filters) {
      if (filters.service) {
        alerts = alerts.filter(a => a.service === filters.service);
      }
      if (filters.severity) {
        alerts = alerts.filter(a => a.severity === filters.severity);
      }
      if (filters.startDate) {
        alerts = alerts.filter(a => a.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        alerts = alerts.filter(a => a.timestamp <= filters.endDate!);
      }
    }

    return alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get alerting statistics
   */
  getAlertingStatistics(period: 'daily' | 'weekly' | 'monthly' = 'daily'): {
    totalAlerts: number;
    alertsBySeverity: Record<string, number>;
    alertsByService: Record<string, number>;
    averageResolutionTime: number;
    acknowledgedRate: number;
    topAlertRules: Array<{ ruleId: string; count: number }>;
  } {
    const now = new Date();
    const startDate = this.getStartDate(now, period);
    
    const periodAlerts = this.alertHistory.filter(a => a.timestamp >= startDate);
    
    const alertsBySeverity: Record<string, number> = {};
    const alertsByService: Record<string, number> = {};
    const ruleCount: Record<string, number> = {};
    
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    let acknowledgedCount = 0;

    for (const alert of periodAlerts) {
      // Count by severity
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
      
      // Count by service
      alertsByService[alert.service] = (alertsByService[alert.service] || 0) + 1;
      
      // Count by rule
      ruleCount[alert.ruleId] = (ruleCount[alert.ruleId] || 0) + 1;
      
      // Calculate resolution time
      if (alert.resolvedAt) {
        totalResolutionTime += alert.resolvedAt.getTime() - alert.timestamp.getTime();
        resolvedCount++;
      }
      
      // Count acknowledged
      if (alert.acknowledged) {
        acknowledgedCount++;
      }
    }

    const topAlertRules = Object.entries(ruleCount)
      .map(([ruleId, count]) => ({ ruleId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalAlerts: periodAlerts.length,
      alertsBySeverity,
      alertsByService,
      averageResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
      acknowledgedRate: periodAlerts.length > 0 ? acknowledgedCount / periodAlerts.length : 0,
      topAlertRules
    };
  }

  /**
   * Test alert channel
   */
  async testAlertChannel(channelId: string): Promise<boolean> {
    const channel = this.alertChannels.get(channelId);
    if (!channel || !channel.enabled) {
      return false;
    }

    const testAlert: Alert = {
      id: 'test_' + Date.now(),
      ruleId: 'test_rule',
      service: 'test',
      severity: 'low',
      message: 'This is a test alert',
      details: { test: true },
      timestamp: new Date(),
      acknowledged: false
    };

    try {
      await this.sendAlertToChannel(testAlert, channel);
      return true;
    } catch (error) {
      console.error(`Failed to test alert channel ${channelId}:`, error);
      return false;
    }
  }

  private initializeDefaultChannels(): void {
    // Console channel
    this.addAlertChannel('console', {
      type: 'console',
      config: {},
      enabled: true
    });

    // Email channel (placeholder)
    this.addAlertChannel('email', {
      type: 'email',
      config: {
        smtpHost: process.env.SMTP_HOST || 'localhost',
        smtpPort: parseInt(process.env.SMTP_PORT || '587'),
        from: process.env.ALERT_EMAIL_FROM || 'alerts@storytailor.ai',
        to: process.env.ALERT_EMAIL_TO?.split(',') || ['admin@storytailor.ai']
      },
      enabled: !!process.env.SMTP_HOST
    });

    // Slack channel (placeholder)
    this.addAlertChannel('slack', {
      type: 'slack',
      config: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: process.env.SLACK_CHANNEL || '#alerts'
      },
      enabled: !!process.env.SLACK_WEBHOOK_URL
    });
  }

  private initializeDefaultRules(): void {
    // OpenAI cost threshold rule
    this.addAlertRule({
      id: 'openai_daily_threshold',
      name: 'OpenAI Daily Cost Threshold',
      service: 'openai',
      condition: 'threshold_exceeded',
      threshold: 80, // 80% of daily limit
      timeWindow: 60,
      severity: 'high',
      channels: this.config.defaultChannels,
      cooldown: 30,
      enabled: true
    });

    // ElevenLabs cost threshold rule
    this.addAlertRule({
      id: 'elevenlabs_daily_threshold',
      name: 'ElevenLabs Daily Cost Threshold',
      service: 'elevenlabs',
      condition: 'threshold_exceeded',
      threshold: 75, // 75% of daily limit
      timeWindow: 60,
      severity: 'high',
      channels: this.config.defaultChannels,
      cooldown: 30,
      enabled: true
    });

    // Cost spike detection rule
    this.addAlertRule({
      id: 'cost_spike_detection',
      name: 'Unusual Cost Spike Detection',
      service: 'all',
      condition: 'cost_spike',
      threshold: 200, // 200% increase from average
      timeWindow: 15,
      severity: 'critical',
      channels: ['console', 'email'],
      cooldown: 15,
      enabled: true
    });
  }

  private setupCostOptimizerListeners(): void {
    this.costOptimizer.on('thresholdExceeded', async (data) => {
      const ruleId = `${data.service}_${data.type}_threshold`;
      await this.triggerAlert(
        ruleId,
        `Cost threshold exceeded for ${data.service}`,
        {
          service: data.service,
          operation: data.operation,
          type: data.type,
          current: data.current,
          threshold: data.threshold,
          limit: data.limit,
          percentage: ((data.current / data.limit) * 100).toFixed(1)
        }
      );
    });

    this.costOptimizer.on('budgetAlert', async (alerts: BudgetAlert[]) => {
      for (const alert of alerts) {
        await this.triggerAlert(
          `budget_alert_${alert.service}`,
          `Budget alert for ${alert.service}`,
          {
            service: alert.service,
            currentCost: alert.currentCost,
            threshold: alert.threshold,
            limit: alert.limit,
            severity: alert.severity
          }
        );
      }
    });
  }

  private async sendAlert(alert: Alert, channelIds: string[]): Promise<void> {
    const promises = channelIds.map(async (channelId) => {
      const channel = this.alertChannels.get(channelId);
      if (channel && channel.enabled) {
        try {
          await this.sendAlertToChannel(alert, channel);
        } catch (error) {
          console.error(`Failed to send alert to channel ${channelId}:`, error);
        }
      }
    });

    await Promise.allSettled(promises);
  }

  private async sendAlertToChannel(alert: Alert, channel: AlertChannel): Promise<void> {
    switch (channel.type) {
      case 'console':
        this.sendConsoleAlert(alert);
        break;
      case 'email':
        await this.sendEmailAlert(alert, channel.config);
        break;
      case 'slack':
        await this.sendSlackAlert(alert, channel.config);
        break;
      case 'webhook':
        await this.sendWebhookAlert(alert, channel.config);
        break;
      default:
        throw new Error(`Unknown alert channel type: ${channel.type}`);
    }
  }

  private sendConsoleAlert(alert: Alert): void {
    const severityColors = {
      low: '\x1b[32m',      // Green
      medium: '\x1b[33m',   // Yellow
      high: '\x1b[31m',     // Red
      critical: '\x1b[35m'  // Magenta
    };
    
    const color = severityColors[alert.severity] || '\x1b[0m';
    const reset = '\x1b[0m';
    
    console.log(`${color}[ALERT ${alert.severity.toUpperCase()}]${reset} ${alert.message}`);
    console.log(`Service: ${alert.service}${alert.operation ? ` (${alert.operation})` : ''}`);
    console.log(`Time: ${alert.timestamp.toISOString()}`);
    console.log(`Details:`, JSON.stringify(alert.details, null, 2));
    console.log('---');
  }

  private async sendEmailAlert(alert: Alert, config: any): Promise<void> {
    // Email implementation would go here
    // For now, just log that we would send an email
    console.log(`Would send email alert to ${config.to}: ${alert.message}`);
  }

  private async sendSlackAlert(alert: Alert, config: any): Promise<void> {
    // Slack implementation would go here
    // For now, just log that we would send a Slack message
    console.log(`Would send Slack alert to ${config.channel}: ${alert.message}`);
  }

  private async sendWebhookAlert(alert: Alert, config: any): Promise<void> {
    // Webhook implementation would go here
    // For now, just log that we would send a webhook
    console.log(`Would send webhook alert to ${config.url}: ${alert.message}`);
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getStartDate(now: Date, period: 'daily' | 'weekly' | 'monthly'): Date {
    const start = new Date(now);
    
    switch (period) {
      case 'daily':
        start.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        start.setMonth(start.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        break;
    }
    
    return start;
  }

  private startEscalationMonitoring(): void {
    // Check for escalation every minute
    this.escalationInterval = setInterval(() => {
      const now = new Date();
      
      for (const alert of this.activeAlerts.values()) {
        if (alert.acknowledged) {
          continue;
        }
        
        const alertAge = now.getTime() - alert.timestamp.getTime();
        const alertAgeMinutes = alertAge / (1000 * 60);
        
        // Check escalation rules
        for (const rule of this.config.escalationRules) {
          if (alert.severity === rule.severity && alertAgeMinutes >= rule.escalateAfter) {
            // Escalate alert
            this.escalateAlert(alert, rule.escalateTo);
            break;
          }
        }
      }
    }, 60 * 1000); // 1 minute
  }

  private async escalateAlert(alert: Alert, escalateToChannels: string[]): Promise<void> {
    const escalatedAlert: Alert = {
      ...alert,
      id: this.generateAlertId(),
      message: `ESCALATED: ${alert.message}`,
      details: {
        ...alert.details,
        escalatedFrom: alert.id,
        escalatedAt: new Date()
      }
    };

    await this.sendAlert(escalatedAlert, escalateToChannels);
    this.emit('alertEscalated', { original: alert, escalated: escalatedAlert });
  }
}
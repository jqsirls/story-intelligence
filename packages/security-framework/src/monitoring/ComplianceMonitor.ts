import { EventEmitter } from 'events';
import { ComplianceMonitoringEvent, ZeroTrustPolicy, PolicyCondition, PolicyAction } from '../types';

// Mock Redis for simplified implementation
class MockRedis {
  private data: Map<string, string> = new Map();
  private lists: Map<string, string[]> = new Map();
  private hashes: Map<string, Map<string, string>> = new Map();

  async get(key: string): Promise<string | null> {
    return this.data.get(key) || null;
  }

  async set(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async lpush(key: string, value: string): Promise<void> {
    const list = this.lists.get(key) || [];
    list.unshift(value);
    this.lists.set(key, list);
  }

  async expire(key: string, seconds: number): Promise<void> {
    // Mock expiration - in real implementation would set TTL
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    const hash = this.hashes.get(key) || new Map();
    hash.set(field, value);
    this.hashes.set(key, hash);
  }

  async hdel(key: string, field: string): Promise<void> {
    const hash = this.hashes.get(key);
    if (hash) {
      hash.delete(field);
    }
  }

  pipeline() {
    return {
      lpush: (key: string, value: string) => this,
      expire: (key: string, seconds: number) => this,
      exec: async () => []
    };
  }

  async quit(): Promise<void> {
    // Mock quit
  }
}

const Redis = MockRedis;

export class ComplianceMonitoringService extends EventEmitter {
  private redis: MockRedis;
  private policies: Map<string, ZeroTrustPolicy> = new Map();
  private eventBuffer: ComplianceMonitoringEvent[] = [];
  private bufferSize: number = 1000;
  private flushInterval: number = 5000; // 5 seconds

  private flushTimer?: NodeJS.Timeout;

  constructor(redisUrl: string) {
    super();
    this.redis = new Redis();
    this.initializeDefaultPolicies();
    this.startEventBufferFlush();
  }

  /**
   * Records a compliance monitoring event
   */
  async recordEvent(event: Omit<ComplianceMonitoringEvent, 'eventId'>): Promise<void> {
    const fullEvent: ComplianceMonitoringEvent = {
      ...event,
      eventId: this.generateEventId()
    };

    // Add to buffer
    this.eventBuffer.push(fullEvent);

    // Check against policies
    await this.evaluatePolicies(fullEvent);

    // Emit event for real-time processing
    this.emit('complianceEvent', fullEvent);

    // Flush buffer if full
    if (this.eventBuffer.length >= this.bufferSize) {
      await this.flushEventBuffer();
    }
  }

  /**
   * Evaluates event against zero-trust policies
   */
  private async evaluatePolicies(event: ComplianceMonitoringEvent): Promise<void> {
    for (const policy of this.policies.values()) {
      if (!policy.enabled) continue;

      const matches = await this.evaluateConditions(event, policy.conditions);
      if (matches) {
        await this.executePolicyActions(event, policy.actions);
        
        // Update risk score based on policy match
        event.riskScore = Math.min(event.riskScore + (policy.priority * 0.1), 1.0);
      }
    }
  }

  /**
   * Evaluates policy conditions against an event
   */
  private async evaluateConditions(
    event: ComplianceMonitoringEvent,
    conditions: PolicyCondition[]
  ): Promise<boolean> {
    for (const condition of conditions) {
      if (!await this.evaluateCondition(event, condition)) {
        return false; // All conditions must match
      }
    }
    return true;
  }

  /**
   * Evaluates a single policy condition
   */
  private async evaluateCondition(
    event: ComplianceMonitoringEvent,
    condition: PolicyCondition
  ): Promise<boolean> {
    let eventValue: any;

    switch (condition.type) {
      case 'user_age':
        eventValue = await this.getUserAge(event.userId);
        break;
      case 'data_type':
        eventValue = event.metadata.dataType;
        break;
      case 'time_range':
        eventValue = new Date(event.timestamp).getHours();
        break;
      case 'location':
        eventValue = event.metadata.location;
        break;
      case 'device_type':
        eventValue = event.metadata.deviceType;
        break;
      default:
        return false;
    }

    return this.compareValues(eventValue, condition.operator, condition.value);
  }

  /**
   * Compares values based on operator
   */
  private compareValues(eventValue: any, operator: string, conditionValue: any): boolean {
    switch (operator) {
      case 'equals':
        return eventValue === conditionValue;
      case 'not_equals':
        return eventValue !== conditionValue;
      case 'greater_than':
        return eventValue > conditionValue;
      case 'less_than':
        return eventValue < conditionValue;
      case 'contains':
        return String(eventValue).includes(String(conditionValue));
      default:
        return false;
    }
  }

  /**
   * Executes policy actions
   */
  private async executePolicyActions(
    event: ComplianceMonitoringEvent,
    actions: PolicyAction[]
  ): Promise<void> {
    for (const action of actions) {
      try {
        await this.executeAction(event, action);
      } catch (error) {
        console.error(`Failed to execute policy action:`, error);
      }
    }
  }

  /**
   * Executes a single policy action
   */
  private async executeAction(
    event: ComplianceMonitoringEvent,
    action: PolicyAction
  ): Promise<void> {
    switch (action.type) {
      case 'allow':
        // Log allowance
        await this.logAction(event, 'allowed', action.parameters);
        break;
      
      case 'deny':
        // Block the action and log
        await this.logAction(event, 'denied', action.parameters);
        this.emit('actionDenied', { event, action });
        break;
      
      case 'encrypt':
        // Trigger encryption
        await this.logAction(event, 'encryption_triggered', action.parameters);
        this.emit('encryptionRequired', { event, action });
        break;
      
      case 'audit':
        // Enhanced audit logging
        await this.logAction(event, 'audit_triggered', action.parameters);
        await this.createAuditRecord(event, action.parameters);
        break;
      
      case 'notify':
        // Send notifications
        await this.logAction(event, 'notification_sent', action.parameters);
        this.emit('notificationRequired', { event, action });
        break;
    }
  }

  /**
   * Creates detailed audit record
   */
  private async createAuditRecord(
    event: ComplianceMonitoringEvent,
    parameters: Record<string, any>
  ): Promise<void> {
    const auditRecord = {
      eventId: event.eventId,
      userId: event.userId,
      agentId: event.agentId,
      timestamp: event.timestamp,
      eventType: event.eventType,
      complianceStatus: event.complianceStatus,
      riskScore: event.riskScore,
      metadata: event.metadata,
      auditLevel: parameters.level || 'standard',
      auditReason: parameters.reason || 'policy_triggered'
    };

    await this.redis.lpush('audit_records', JSON.stringify(auditRecord));
    await this.redis.expire('audit_records', 86400 * 365); // 1 year retention
  }

  /**
   * Logs policy action
   */
  private async logAction(
    event: ComplianceMonitoringEvent,
    actionType: string,
    parameters: Record<string, any>
  ): Promise<void> {
    const logEntry = {
      timestamp: Date.now(),
      eventId: event.eventId,
      actionType,
      parameters,
      userId: event.userId,
      agentId: event.agentId
    };

    await this.redis.lpush('policy_actions', JSON.stringify(logEntry));
  }

  /**
   * Adds or updates a zero-trust policy
   */
  async addPolicy(policy: ZeroTrustPolicy): Promise<void> {
    this.policies.set(policy.policyId, policy);
    await this.redis.hset('policies', policy.policyId, JSON.stringify(policy));
  }

  /**
   * Removes a policy
   */
  async removePolicy(policyId: string): Promise<void> {
    this.policies.delete(policyId);
    await this.redis.hdel('policies', policyId);
  }

  /**
   * Gets compliance metrics
   */
  async getComplianceMetrics(timeRange: number = 3600000): Promise<{
    totalEvents: number;
    violationCount: number;
    warningCount: number;
    averageRiskScore: number;
    topViolationTypes: Array<{ type: string; count: number }>;
  }> {
    const cutoffTime = Date.now() - timeRange;
    const recentEvents = this.eventBuffer.filter(e => e.timestamp > cutoffTime);

    const violations = recentEvents.filter(e => e.complianceStatus === 'violation');
    const warnings = recentEvents.filter(e => e.complianceStatus === 'warning');
    
    const averageRiskScore = recentEvents.length > 0 
      ? recentEvents.reduce((sum, e) => sum + e.riskScore, 0) / recentEvents.length
      : 0;

    // Count violation types
    const violationTypes = new Map<string, number>();
    violations.forEach(v => {
      const count = violationTypes.get(v.eventType) || 0;
      violationTypes.set(v.eventType, count + 1);
    });

    const topViolationTypes = Array.from(violationTypes.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalEvents: recentEvents.length,
      violationCount: violations.length,
      warningCount: warnings.length,
      averageRiskScore,
      topViolationTypes
    };
  }

  /**
   * Flushes event buffer to persistent storage
   */
  private async flushEventBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    // Store in Redis with TTL
    const pipeline = this.redis.pipeline();
    events.forEach(event => {
      pipeline.lpush('compliance_events', JSON.stringify(event));
    });
    pipeline.expire('compliance_events', 86400 * 30); // 30 days retention
    
    await pipeline.exec();
  }

  /**
   * Starts periodic event buffer flush
   */
  private startEventBufferFlush(): void {
    this.flushTimer = setInterval(async () => {
      await this.flushEventBuffer();
    }, this.flushInterval);
  }

  /**
   * Initializes default zero-trust policies
   */
  private initializeDefaultPolicies(): void {
    // Child data protection policy
    this.addPolicy({
      policyId: 'child_data_protection',
      name: 'Child Data Protection',
      description: 'Enhanced protection for users under 13',
      conditions: [
        { type: 'user_age', operator: 'less_than', value: 13 }
      ],
      actions: [
        { type: 'encrypt', parameters: { level: 'high' } },
        { type: 'audit', parameters: { level: 'enhanced', reason: 'child_data' } }
      ],
      priority: 10,
      enabled: true
    });

    // PII access policy
    this.addPolicy({
      policyId: 'pii_access_control',
      name: 'PII Access Control',
      description: 'Controls access to personally identifiable information',
      conditions: [
        { type: 'data_type', operator: 'contains', value: 'pii' }
      ],
      actions: [
        { type: 'audit', parameters: { level: 'high', reason: 'pii_access' } },
        { type: 'encrypt', parameters: { level: 'maximum' } }
      ],
      priority: 9,
      enabled: true
    });

    // Off-hours access policy
    this.addPolicy({
      policyId: 'off_hours_access',
      name: 'Off Hours Access Control',
      description: 'Enhanced monitoring for off-hours access',
      conditions: [
        { type: 'time_range', operator: 'less_than', value: 6 },
        { type: 'time_range', operator: 'greater_than', value: 22 }
      ],
      actions: [
        { type: 'audit', parameters: { level: 'enhanced', reason: 'off_hours' } },
        { type: 'notify', parameters: { recipients: ['security_team'] } }
      ],
      priority: 5,
      enabled: true
    });
  }

  /**
   * Gets user age from cache or database
   */
  private async getUserAge(userId: string): Promise<number> {
    // This would typically query the user database
    // For now, return a default value
    const cachedAge = await this.redis.get(`user_age:${userId}`);
    return cachedAge ? parseInt(cachedAge) : 18;
  }

  /**
   * Generates unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flushEventBuffer();
    await this.redis.quit();
  }
}
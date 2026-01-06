import { EventEmitter } from 'events';
import { ThreatDetectionResult } from '../threat/AIThreatDetectionEngine';
import * as crypto from 'crypto';

export interface SecurityIncident {
  incidentId: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  category: 'security_breach' | 'data_leak' | 'malware' | 'unauthorized_access' | 'system_compromise';
  source: {
    detectionId?: string;
    userId?: string;
    ipAddress?: string;
    system?: string;
  };
  timeline: Array<{
    timestamp: number;
    action: string;
    actor: 'system' | 'human' | 'external';
    details: string;
  }>;
  affectedAssets: string[];
  indicators: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  automatedActions: Array<{
    actionId: string;
    action: string;
    status: 'pending' | 'executing' | 'completed' | 'failed';
    timestamp: number;
    result?: any;
    error?: string;
  }>;
  humanActions: Array<{
    actionId: string;
    assignee: string;
    action: string;
    status: 'assigned' | 'in_progress' | 'completed';
    dueDate: number;
    completedAt?: number;
  }>;
  containmentMeasures: string[];
  recoveryActions: string[];
  lessonsLearned?: string[];
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
}

export interface ResponsePlaybook {
  playbookId: string;
  name: string;
  description: string;
  triggerConditions: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  }>;
  automatedActions: Array<{
    order: number;
    action: string;
    parameters: Record<string, any>;
    timeout: number;
    retryCount: number;
    continueOnFailure: boolean;
  }>;
  humanActions: Array<{
    order: number;
    role: string;
    action: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    sla: number; // minutes
  }>;
  escalationRules: Array<{
    condition: string;
    escalateTo: string;
    delay: number; // minutes
  }>;
  lastUpdated: number;
}

export interface SOARIntegration {
  integrationId: string;
  name: string;
  type: 'siem' | 'ticketing' | 'communication' | 'forensics' | 'threat_intel';
  endpoint: string;
  authentication: {
    type: 'api_key' | 'oauth' | 'basic' | 'certificate';
    credentials: Record<string, string>;
  };
  capabilities: string[];
  isActive: boolean;
}

export class AutomatedIncidentResponse extends EventEmitter {
  private incidents: Map<string, SecurityIncident> = new Map();
  private playbooks: Map<string, ResponsePlaybook> = new Map();
  private integrations: Map<string, SOARIntegration> = new Map();
  private responseQueue: Array<{ incidentId: string; action: any }> = [];
  private processingTimer?: NodeJS.Timeout;

  constructor() {
    super();
    this.initializePlaybooks();
    this.startResponseProcessor();
  }

  /**
   * Creates a security incident from threat detection
   */
  async createIncident(
    threatDetection: ThreatDetectionResult,
    additionalContext?: Record<string, any>
  ): Promise<SecurityIncident> {
    try {
      const incident: SecurityIncident = {
        incidentId: this.generateIncidentId(),
        title: `${threatDetection.threatType} detected`,
        description: `Threat detected: ${threatDetection.threatType} with confidence ${threatDetection.confidence}`,
        severity: threatDetection.severity,
        status: 'open',
        category: this.mapThreatToCategory(threatDetection.threatType),
        source: {
          detectionId: threatDetection.detectionId,
          userId: threatDetection.source.userId,
          ipAddress: threatDetection.source.ipAddress,
          system: 'threat_detection_engine'
        },
        timeline: [{
          timestamp: Date.now(),
          action: 'incident_created',
          actor: 'system',
          details: `Incident created from threat detection ${threatDetection.detectionId}`
        }],
        affectedAssets: this.identifyAffectedAssets(threatDetection),
        indicators: threatDetection.indicators,
        automatedActions: [],
        humanActions: [],
        containmentMeasures: [],
        recoveryActions: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      this.incidents.set(incident.incidentId, incident);

      // Trigger automated response
      await this.triggerAutomatedResponse(incident);

      this.emit('incidentCreated', incident);

      return incident;

    } catch (error) {
      this.emit('incidentCreationError', {
        threatDetection,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Triggers automated response based on playbooks
   */
  private async triggerAutomatedResponse(incident: SecurityIncident): Promise<void> {
    try {
      // Find matching playbooks
      const matchingPlaybooks = this.findMatchingPlaybooks(incident);

      for (const playbook of matchingPlaybooks) {
        await this.executePlaybook(incident.incidentId, playbook);
      }

      // Update incident status
      incident.status = 'investigating';
      incident.updatedAt = Date.now();
      incident.timeline.push({
        timestamp: Date.now(),
        action: 'automated_response_triggered',
        actor: 'system',
        details: `Triggered ${matchingPlaybooks.length} playbooks`
      });

      this.incidents.set(incident.incidentId, incident);

    } catch (error) {
      this.emit('automatedResponseError', {
        incidentId: incident.incidentId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Executes a response playbook
   */
  private async executePlaybook(incidentId: string, playbook: ResponsePlaybook): Promise<void> {
    const incident = this.incidents.get(incidentId);
    if (!incident) return;

    try {
      // Execute automated actions
      for (const action of playbook.automatedActions.sort((a, b) => a.order - b.order)) {
        const automatedAction = {
          actionId: this.generateActionId(),
          action: action.action,
          status: 'pending' as const,
          timestamp: Date.now()
        };

        incident.automatedActions.push(automatedAction);
        this.responseQueue.push({ incidentId, action: { ...action, actionId: automatedAction.actionId } });
      }

      // Create human actions
      for (const action of playbook.humanActions.sort((a, b) => a.order - b.order)) {
        const humanAction = {
          actionId: this.generateActionId(),
          assignee: this.assignToRole(action.role),
          action: action.action,
          status: 'assigned' as const,
          dueDate: Date.now() + (action.sla * 60 * 1000)
        };

        incident.humanActions.push(humanAction);
      }

      incident.timeline.push({
        timestamp: Date.now(),
        action: 'playbook_executed',
        actor: 'system',
        details: `Executed playbook: ${playbook.name}`
      });

      this.incidents.set(incidentId, incident);

      this.emit('playbookExecuted', {
        incidentId,
        playbookId: playbook.playbookId,
        automatedActions: playbook.automatedActions.length,
        humanActions: playbook.humanActions.length
      });

    } catch (error) {
      this.emit('playbookExecutionError', {
        incidentId,
        playbookId: playbook.playbookId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Processes the response queue
   */
  private startResponseProcessor(): void {
    this.processingTimer = setInterval(async () => {
      if (this.responseQueue.length === 0) return;

      const queueItem = this.responseQueue.shift();
      if (!queueItem) return;

      await this.executeAutomatedAction(queueItem.incidentId, queueItem.action);
    }, 1000); // Process every second
  }

  /**
   * Executes an automated action
   */
  private async executeAutomatedAction(incidentId: string, action: any): Promise<void> {
    const incident = this.incidents.get(incidentId);
    if (!incident) return;

    const automatedAction = incident.automatedActions.find(a => a.actionId === action.actionId);
    if (!automatedAction) return;

    try {
      automatedAction.status = 'executing';
      automatedAction.timestamp = Date.now();

      let result: any;

      switch (action.action) {
        case 'block_ip':
          result = await this.blockIPAddress(action.parameters.ipAddress);
          break;
        case 'quarantine_user':
          result = await this.quarantineUser(action.parameters.userId);
          break;
        case 'isolate_system':
          result = await this.isolateSystem(action.parameters.systemId);
          break;
        case 'collect_forensics':
          result = await this.collectForensics(action.parameters);
          break;
        case 'notify_team':
          result = await this.notifySecurityTeam(incidentId, action.parameters);
          break;
        case 'create_ticket':
          result = await this.createTicket(incidentId, action.parameters);
          break;
        case 'update_threat_intel':
          result = await this.updateThreatIntelligence(action.parameters);
          break;
        default:
          throw new Error(`Unknown action: ${action.action}`);
      }

      automatedAction.status = 'completed';
      automatedAction.result = result;

      incident.timeline.push({
        timestamp: Date.now(),
        action: `automated_action_completed`,
        actor: 'system',
        details: `Completed action: ${action.action}`
      });

      this.emit('automatedActionCompleted', {
        incidentId,
        actionId: action.actionId,
        action: action.action,
        result
      });

    } catch (error) {
      automatedAction.status = 'failed';
      automatedAction.error = error instanceof Error ? error.message : String(error);

      incident.timeline.push({
        timestamp: Date.now(),
        action: 'automated_action_failed',
        actor: 'system',
        details: `Failed action: ${action.action} - ${automatedAction.error}`
      });

      this.emit('automatedActionFailed', {
        incidentId,
        actionId: action.actionId,
        action: action.action,
        error: automatedAction.error
      });

      // Retry if configured
      if (action.retryCount > 0) {
        action.retryCount--;
        this.responseQueue.push({ incidentId, action });
      }
    }

    incident.updatedAt = Date.now();
    this.incidents.set(incidentId, incident);
  }

  /**
   * Updates incident status manually
   */
  async updateIncidentStatus(
    incidentId: string,
    status: SecurityIncident['status'],
    notes?: string
  ): Promise<void> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident not found: ${incidentId}`);
    }

    const oldStatus = incident.status;
    incident.status = status;
    incident.updatedAt = Date.now();

    if (status === 'resolved' || status === 'closed') {
      incident.resolvedAt = Date.now();
    }

    incident.timeline.push({
      timestamp: Date.now(),
      action: 'status_updated',
      actor: 'human',
      details: `Status changed from ${oldStatus} to ${status}${notes ? `: ${notes}` : ''}`
    });

    this.incidents.set(incidentId, incident);

    this.emit('incidentStatusUpdated', {
      incidentId,
      oldStatus,
      newStatus: status,
      notes
    });
  }

  /**
   * Adds lessons learned to an incident
   */
  async addLessonsLearned(incidentId: string, lessons: string[]): Promise<void> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident not found: ${incidentId}`);
    }

    incident.lessonsLearned = lessons;
    incident.updatedAt = Date.now();

    incident.timeline.push({
      timestamp: Date.now(),
      action: 'lessons_learned_added',
      actor: 'human',
      details: `Added ${lessons.length} lessons learned`
    });

    this.incidents.set(incidentId, incident);

    this.emit('lessonsLearnedAdded', {
      incidentId,
      lessons
    });
  }

  /**
   * Gets incident statistics
   */
  getIncidentStatistics(): {
    totalIncidents: number;
    incidentsBySeverity: Record<string, number>;
    incidentsByStatus: Record<string, number>;
    incidentsByCategory: Record<string, number>;
    averageResolutionTime: number;
    automationRate: number;
    topIncidentTypes: Array<{ type: string; count: number }>;
  } {
    const incidents = Array.from(this.incidents.values());
    
    const incidentsBySeverity: Record<string, number> = {};
    const incidentsByStatus: Record<string, number> = {};
    const incidentsByCategory: Record<string, number> = {};
    const incidentTypes: Record<string, number> = {};
    
    let totalResolutionTime = 0;
    let resolvedIncidents = 0;
    let automatedActions = 0;
    let totalActions = 0;

    for (const incident of incidents) {
      incidentsBySeverity[incident.severity] = (incidentsBySeverity[incident.severity] || 0) + 1;
      incidentsByStatus[incident.status] = (incidentsByStatus[incident.status] || 0) + 1;
      incidentsByCategory[incident.category] = (incidentsByCategory[incident.category] || 0) + 1;
      
      // Extract incident type from title
      const type = incident.title.split(' ')[0];
      incidentTypes[type] = (incidentTypes[type] || 0) + 1;

      if (incident.resolvedAt) {
        totalResolutionTime += incident.resolvedAt - incident.createdAt;
        resolvedIncidents++;
      }

      automatedActions += incident.automatedActions.length;
      totalActions += incident.automatedActions.length + incident.humanActions.length;
    }

    const topIncidentTypes = Object.entries(incidentTypes)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalIncidents: incidents.length,
      incidentsBySeverity,
      incidentsByStatus,
      incidentsByCategory,
      averageResolutionTime: resolvedIncidents > 0 ? totalResolutionTime / resolvedIncidents : 0,
      automationRate: totalActions > 0 ? automatedActions / totalActions : 0,
      topIncidentTypes
    };
  }

  // Helper methods for automated actions
  private async blockIPAddress(ipAddress: string): Promise<any> {
    // Integrate with firewall/WAF to block IP
    return { action: 'block_ip', ipAddress, status: 'blocked', timestamp: Date.now() };
  }

  private async quarantineUser(userId: string): Promise<any> {
    // Disable user account and revoke sessions
    return { action: 'quarantine_user', userId, status: 'quarantined', timestamp: Date.now() };
  }

  private async isolateSystem(systemId: string): Promise<any> {
    // Isolate system from network
    return { action: 'isolate_system', systemId, status: 'isolated', timestamp: Date.now() };
  }

  private async collectForensics(parameters: any): Promise<any> {
    // Collect forensic data
    return { action: 'collect_forensics', parameters, status: 'collected', timestamp: Date.now() };
  }

  private async notifySecurityTeam(incidentId: string, parameters: any): Promise<any> {
    // Send notifications to security team
    return { action: 'notify_team', incidentId, status: 'notified', timestamp: Date.now() };
  }

  private async createTicket(incidentId: string, parameters: any): Promise<any> {
    // Create ticket in external system
    return { action: 'create_ticket', incidentId, ticketId: 'TICKET-' + Date.now(), timestamp: Date.now() };
  }

  private async updateThreatIntelligence(parameters: any): Promise<any> {
    // Update threat intelligence feeds
    return { action: 'update_threat_intel', parameters, status: 'updated', timestamp: Date.now() };
  }

  // Helper methods
  private initializePlaybooks(): void {
    const playbooks: ResponsePlaybook[] = [
      {
        playbookId: 'critical_threat_response',
        name: 'Critical Threat Response',
        description: 'Automated response for critical threats',
        triggerConditions: [{
          field: 'severity',
          operator: 'equals',
          value: 'critical'
        }],
        automatedActions: [
          {
            order: 1,
            action: 'block_ip',
            parameters: { ipAddress: '${source.ipAddress}' },
            timeout: 30000,
            retryCount: 3,
            continueOnFailure: false
          },
          {
            order: 2,
            action: 'quarantine_user',
            parameters: { userId: '${source.userId}' },
            timeout: 30000,
            retryCount: 2,
            continueOnFailure: true
          },
          {
            order: 3,
            action: 'notify_team',
            parameters: { urgency: 'critical' },
            timeout: 10000,
            retryCount: 1,
            continueOnFailure: true
          }
        ],
        humanActions: [
          {
            order: 1,
            role: 'security_analyst',
            action: 'investigate_threat',
            priority: 'critical',
            sla: 15 // 15 minutes
          },
          {
            order: 2,
            role: 'incident_commander',
            action: 'coordinate_response',
            priority: 'critical',
            sla: 30 // 30 minutes
          }
        ],
        escalationRules: [
          {
            condition: 'no_response_in_15_minutes',
            escalateTo: 'security_manager',
            delay: 15
          }
        ],
        lastUpdated: Date.now()
      }
    ];

    for (const playbook of playbooks) {
      this.playbooks.set(playbook.playbookId, playbook);
    }
  }

  private findMatchingPlaybooks(incident: SecurityIncident): ResponsePlaybook[] {
    const matchingPlaybooks: ResponsePlaybook[] = [];

    for (const playbook of this.playbooks.values()) {
      let matches = true;

      for (const condition of playbook.triggerConditions) {
        const fieldValue = this.getFieldValue(incident, condition.field);
        
        switch (condition.operator) {
          case 'equals':
            if (fieldValue !== condition.value) matches = false;
            break;
          case 'contains':
            if (!String(fieldValue).includes(String(condition.value))) matches = false;
            break;
          case 'greater_than':
            if (Number(fieldValue) <= Number(condition.value)) matches = false;
            break;
          case 'less_than':
            if (Number(fieldValue) >= Number(condition.value)) matches = false;
            break;
        }

        if (!matches) break;
      }

      if (matches) {
        matchingPlaybooks.push(playbook);
      }
    }

    return matchingPlaybooks;
  }

  private getFieldValue(incident: SecurityIncident, field: string): any {
    const fields = field.split('.');
    let value: any = incident;

    for (const f of fields) {
      value = value?.[f];
    }

    return value;
  }

  private mapThreatToCategory(threatType: string): SecurityIncident['category'] {
    const mapping: Record<string, SecurityIncident['category']> = {
      'malware': 'malware',
      'phishing': 'security_breach',
      'sql_injection': 'security_breach',
      'xss': 'security_breach',
      'brute_force': 'unauthorized_access',
      'data_exfiltration': 'data_leak',
      'system_compromise': 'system_compromise'
    };

    return mapping[threatType] || 'security_breach';
  }

  private identifyAffectedAssets(threatDetection: ThreatDetectionResult): string[] {
    const assets: string[] = [];

    if (threatDetection.source.userId) {
      assets.push(`user:${threatDetection.source.userId}`);
    }

    if (threatDetection.source.ipAddress) {
      assets.push(`ip:${threatDetection.source.ipAddress}`);
    }

    if (threatDetection.source.deviceId) {
      assets.push(`device:${threatDetection.source.deviceId}`);
    }

    return assets;
  }

  private assignToRole(role: string): string {
    // In production, this would integrate with HR/identity systems
    const roleAssignments: Record<string, string> = {
      'security_analyst': 'analyst@company.com',
      'incident_commander': 'commander@company.com',
      'security_manager': 'manager@company.com'
    };

    return roleAssignments[role] || 'security@company.com';
  }

  private generateIncidentId(): string {
    return `INC-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private generateActionId(): string {
    return `ACT-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  }

  /**
   * Cleanup method
   */
  cleanup(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
    }
  }
}
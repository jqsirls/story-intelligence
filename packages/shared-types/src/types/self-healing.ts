// Self-healing types that extend existing system
import { EventType } from './events';

export interface IncidentPattern {
  id: string;
  type: 'agent_failure' | 'api_timeout' | 'database_error' | 'memory_leak' | 'rate_limit';
  errorSignature: string;
  frequency: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedAgents: string[];
  detectionRules: DetectionRule[];
}

export interface DetectionRule {
  metric: string;
  threshold: number;
  timeWindow: string; // e.g., "5m", "1h"
  operator: 'gt' | 'lt' | 'eq' | 'contains';
}

export interface HealingAction {
  id: string;
  type: 'restart_agent' | 'clear_cache' | 'retry_request' | 'switch_backup' | 'rollback_deploy';
  description: string;
  autonomyLevel: 1 | 2 | 3; // 1=immediate, 2=delayed, 3=approval_required
  safetyChecks: string[];
  rollbackPlan: string;
  estimatedImpact: 'none' | 'minimal' | 'moderate' | 'high';
}

export interface IncidentRecord {
  id: string;
  incidentType: string;
  errorPattern: Record<string, any>;
  detectedAt: string;
  resolvedAt?: string;
  healingAction?: HealingAction;
  success: boolean;
  impactedUsers: number;
  storySessionsAffected: number;
  resolutionTime: number; // milliseconds
  metadata: Record<string, any>;
}

export interface SelfHealingConfig {
  enabled: boolean;
  autonomyLevel: 1 | 2 | 3;
  maxActionsPerHour: number;
  storySessionProtection: boolean; // Never interrupt active stories
  parentNotification: boolean;
  allowedTimeWindow: {
    start: string; // "07:00"
    end: string;   // "19:00"
    timezone: string; // "America/Chicago"
  };
}

export interface HealingMetrics {
  incidentsDetected: number;
  incidentsResolved: number;
  averageResolutionTime: number;
  storySessionsProtected: number;
  parentNotificationsSent: number;
  falsePositiveRate: number;
  systemAvailability: number;
}

// Extend existing event types
export type SelfHealingEventType = 
  | 'com.storytailor.incident.detected'
  | 'com.storytailor.healing.started'
  | 'com.storytailor.healing.completed'
  | 'com.storytailor.healing.failed'
  | 'com.storytailor.circuit.opened'
  | 'com.storytailor.circuit.closed';

// Extend existing agent error context
export interface EnhancedErrorContext {
  agentName: string;
  userId?: string;
  sessionId?: string;
  storyId?: string;
  activeConversation: boolean;
  errorCount: number;
  lastOccurrence: string;
  relatedIncidents: string[];
}
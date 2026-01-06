import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Logger } from 'winston';
import { SafetyIncident } from '../types';

export class SafetyMonitoringService {
  private supabase: SupabaseClient;
  private redis: RedisClientType;
  private logger: Logger;

  constructor(supabase: SupabaseClient, redis: RedisClientType, logger: Logger) {
    this.supabase = supabase;
    this.redis = redis;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    this.logger.info('SafetyMonitoringService initialized');
  }

  async logSafetyIncident(incident: SafetyIncident): Promise<void> {
    try {
      // Store in Supabase
      const { error } = await this.supabase
        .from('safety_incidents')
        .insert([{
          id: incident.id,
          user_id: incident.userId,
          session_id: incident.sessionId,
          incident_type: incident.incidentType,
          severity: incident.severity,
          description: incident.description,
          context: incident.context,
          actions_taken: incident.actionsTaken,
          reporting_required: incident.reportingRequired,
          reporting_completed: incident.reportingCompleted,
          follow_up_required: incident.followUpRequired,
          timestamp: incident.timestamp,
          resolved_at: incident.resolvedAt
        }]);

      if (error) {
        throw error;
      }

      // Cache recent incidents in Redis for quick access
      const cacheKey = `safety_incidents:${incident.userId}`;
      await (this.redis as any).lPush(cacheKey, JSON.stringify(incident));
      await (this.redis as any).lTrim(cacheKey, 0, 99); // Keep last 100 incidents
      await this.redis.expire(cacheKey, 86400 * 30); // 30 days

      this.logger.info('Safety incident logged', {
        incidentId: incident.id,
        userId: incident.userId,
        type: incident.incidentType,
        severity: incident.severity
      });

    } catch (error) {
      this.logger.error('Failed to log safety incident', {
        error: error instanceof Error ? error.message : 'Unknown error',
        incidentId: incident.id
      });
      throw error;
    }
  }

  async getSafetyIncidents(userId: string, limit: number = 50): Promise<SafetyIncident[]> {
    try {
      // Try Redis cache first
      const cacheKey = `safety_incidents:${userId}`;
      const cachedIncidents = await (this.redis as any).lRange(cacheKey, 0, limit - 1);
      
      if (cachedIncidents.length > 0) {
        return cachedIncidents.map((incident: string) => JSON.parse(incident));
      }

      // Fallback to Supabase
      const { data, error } = await this.supabase
        .from('safety_incidents')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      // Map database format to SafetyIncident type
      const incidents: SafetyIncident[] = (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        sessionId: row.session_id,
        incidentType: row.incident_type,
        severity: row.severity,
        description: row.description,
        context: row.context,
        actionsTaken: row.actions_taken,
        reportingRequired: row.reporting_required,
        reportingCompleted: row.reporting_completed,
        followUpRequired: row.follow_up_required,
        timestamp: row.timestamp,
        resolvedAt: row.resolved_at
      }));

      return incidents;

    } catch (error) {
      this.logger.error('Failed to retrieve safety incidents', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  async getSafetyMetrics(timeRange: { start: string; end: string }): Promise<{
    totalIncidents: number;
    incidentsByType: Record<string, number>;
    incidentsBySeverity: Record<string, number>;
    mandatoryReports: number;
    crisisInterventions: number;
    parentNotifications: number;
  }> {
    try {
      // Get incidents within time range
      const { data, error } = await this.supabase
        .from('safety_incidents')
        .select('*')
        .gte('timestamp', timeRange.start)
        .lte('timestamp', timeRange.end);

      if (error) {
        throw error;
      }

      const incidents = data || [];
      
      // Calculate metrics
      const metrics = {
        totalIncidents: incidents.length,
        incidentsByType: {} as Record<string, number>,
        incidentsBySeverity: {} as Record<string, number>,
        mandatoryReports: 0,
        crisisInterventions: 0,
        parentNotifications: 0
      };

      incidents.forEach((incident: any) => {
        // Count by type
        metrics.incidentsByType[incident.incident_type] = 
          (metrics.incidentsByType[incident.incident_type] || 0) + 1;

        // Count by severity
        metrics.incidentsBySeverity[incident.severity] = 
          (metrics.incidentsBySeverity[incident.severity] || 0) + 1;

        // Count special categories
        if (incident.reporting_required) {
          metrics.mandatoryReports++;
        }

        if (['suicidal_ideation', 'self_harm', 'mental_health_crisis'].includes(incident.incident_type)) {
          metrics.crisisInterventions++;
        }

        if (['high', 'critical'].includes(incident.severity)) {
          metrics.parentNotifications++;
        }
      });

      return metrics;

    } catch (error) {
      this.logger.error('Failed to retrieve safety metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timeRange
      });
      throw error;
    }
  }

  async updateIncidentStatus(incidentId: string, updates: {
    reportingCompleted?: boolean;
    resolvedAt?: string;
    followUpRequired?: boolean;
  }): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('safety_incidents')
        .update(updates)
        .eq('id', incidentId);

      if (error) {
        throw error;
      }

      this.logger.info('Safety incident updated', {
        incidentId,
        updates
      });

    } catch (error) {
      this.logger.error('Failed to update safety incident', {
        error: error instanceof Error ? error.message : 'Unknown error',
        incidentId
      });
      throw error;
    }
  }

  async getIncidentsByUser(userId: string, incidentType?: string, severity?: string): Promise<SafetyIncident[]> {
    try {
      let query = this.supabase
        .from('safety_incidents')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (incidentType) {
        query = query.eq('incident_type', incidentType);
      }

      if (severity) {
        query = query.eq('severity', severity);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Map database format to SafetyIncident type
      const incidents: SafetyIncident[] = (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        sessionId: row.session_id,
        incidentType: row.incident_type,
        severity: row.severity,
        description: row.description,
        context: row.context,
        actionsTaken: row.actions_taken,
        reportingRequired: row.reporting_required,
        reportingCompleted: row.reporting_completed,
        followUpRequired: row.follow_up_required,
        timestamp: row.timestamp,
        resolvedAt: row.resolved_at
      }));

      return incidents;

    } catch (error) {
      this.logger.error('Failed to retrieve incidents by user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        incidentType,
        severity
      });
      throw error;
    }
  }

  async getUnresolvedIncidents(): Promise<SafetyIncident[]> {
    try {
      const { data, error } = await this.supabase
        .from('safety_incidents')
        .select('*')
        .is('resolved_at', null)
        .eq('follow_up_required', true)
        .order('timestamp', { ascending: false });

      if (error) {
        throw error;
      }

      // Map database format to SafetyIncident type
      const incidents: SafetyIncident[] = (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        sessionId: row.session_id,
        incidentType: row.incident_type,
        severity: row.severity,
        description: row.description,
        context: row.context,
        actionsTaken: row.actions_taken,
        reportingRequired: row.reporting_required,
        reportingCompleted: row.reporting_completed,
        followUpRequired: row.follow_up_required,
        timestamp: row.timestamp,
        resolvedAt: row.resolved_at
      }));

      return incidents;

    } catch (error) {
      this.logger.error('Failed to retrieve unresolved incidents', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getCriticalIncidents(timeRange?: { start: string; end: string }): Promise<SafetyIncident[]> {
    try {
      let query = this.supabase
        .from('safety_incidents')
        .select('*')
        .eq('severity', 'critical')
        .order('timestamp', { ascending: false });

      if (timeRange) {
        query = query
          .gte('timestamp', timeRange.start)
          .lte('timestamp', timeRange.end);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Map database format to SafetyIncident type
      const incidents: SafetyIncident[] = (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        sessionId: row.session_id,
        incidentType: row.incident_type,
        severity: row.severity,
        description: row.description,
        context: row.context,
        actionsTaken: row.actions_taken,
        reportingRequired: row.reporting_required,
        reportingCompleted: row.reporting_completed,
        followUpRequired: row.follow_up_required,
        timestamp: row.timestamp,
        resolvedAt: row.resolved_at
      }));

      return incidents;

    } catch (error) {
      this.logger.error('Failed to retrieve critical incidents', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timeRange
      });
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Test Supabase connection
      const { error: supabaseError } = await this.supabase
        .from('safety_incidents')
        .select('id')
        .limit(1);

      if (supabaseError) {
        throw supabaseError;
      }

      // Test Redis connection
      await this.redis.ping();

      return true;
    } catch (error) {
      this.logger.warn('SafetyMonitoringService health check failed', { error });
      return false;
    }
  }

  async cleanupOldIncidents(retentionDays: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      const cutoffTimestamp = cutoffDate.toISOString();

      // Delete old incidents from Supabase
      const { data, error } = await this.supabase
        .from('safety_incidents')
        .delete()
        .lt('timestamp', cutoffTimestamp)
        .eq('resolved_at', null) // Only delete resolved incidents
        .select('id');

      if (error) {
        throw error;
      }

      const deletedCount = data?.length || 0;

      this.logger.info('Old safety incidents cleaned up', {
        deletedCount,
        cutoffDate: cutoffTimestamp,
        retentionDays
      });

      return deletedCount;

    } catch (error) {
      this.logger.error('Failed to cleanup old incidents', {
        error: error instanceof Error ? error.message : 'Unknown error',
        retentionDays
      });
      throw error;
    }
  }
}
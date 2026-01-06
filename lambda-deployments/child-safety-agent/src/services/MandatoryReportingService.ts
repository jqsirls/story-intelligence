import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import { MandatoryReportingRecord } from '../types';

export class MandatoryReportingService {
  private reportingWebhook: string;
  private supabase: SupabaseClient;
  private logger: Logger;

  constructor(reportingWebhook: string, supabase: SupabaseClient, logger: Logger) {
    this.reportingWebhook = reportingWebhook;
    this.supabase = supabase;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    this.logger.info('MandatoryReportingService initialized');
  }

  async submitReport(record: MandatoryReportingRecord): Promise<void> {
    try {
      this.logger.warn('Mandatory reporting initiated', {
        reportId: record.id,
        userId: record.userId,
        reportType: record.reportType,
        severity: record.severity
      });

      // Store the report record in database
      await this.storeReportRecord(record);

      // Submit to appropriate authorities
      await this.submitToAuthorities(record);

      // Update status to submitted
      await this.updateReportStatus(record.id, 'submitted');

      this.logger.warn('Mandatory report submitted', {
        reportId: record.id,
        userId: record.userId,
        reportType: record.reportType
      });

    } catch (error) {
      this.logger.error('Failed to submit mandatory report', {
        error: error instanceof Error ? error.message : 'Unknown error',
        reportId: record.id,
        userId: record.userId
      });

      // Update status to failed
      try {
        await this.updateReportStatus(record.id, 'pending');
      } catch (updateError) {
        this.logger.error('Failed to update report status after submission failure', {
          error: updateError instanceof Error ? updateError.message : 'Unknown error',
          reportId: record.id
        });
      }

      throw error;
    }
  }

  async getReportStatus(reportId: string): Promise<MandatoryReportingRecord | null> {
    try {
      const { data, error } = await this.supabase
        .from('mandatory_reporting_records')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        throw error;
      }

      return this.mapDatabaseToRecord(data);

    } catch (error) {
      this.logger.error('Failed to get report status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        reportId
      });
      throw error;
    }
  }

  async getReportsByUser(userId: string): Promise<MandatoryReportingRecord[]> {
    try {
      const { data, error } = await this.supabase
        .from('mandatory_reporting_records')
        .select('*')
        .eq('user_id', userId)
        .order('reported_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map(row => this.mapDatabaseToRecord(row));

    } catch (error) {
      this.logger.error('Failed to get reports by user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  async getPendingReports(): Promise<MandatoryReportingRecord[]> {
    try {
      const { data, error } = await this.supabase
        .from('mandatory_reporting_records')
        .select('*')
        .eq('status', 'pending')
        .order('reported_at', { ascending: true }); // Oldest first

      if (error) {
        throw error;
      }

      return (data || []).map(row => this.mapDatabaseToRecord(row));

    } catch (error) {
      this.logger.error('Failed to get pending reports', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async updateReportStatus(
    reportId: string, 
    status: MandatoryReportingRecord['status'],
    reportNumber?: string
  ): Promise<void> {
    try {
      const updates: any = { status };
      
      if (reportNumber) {
        updates.report_number = reportNumber;
      }

      const { error } = await this.supabase
        .from('mandatory_reporting_records')
        .update(updates)
        .eq('id', reportId);

      if (error) {
        throw error;
      }

      this.logger.info('Report status updated', {
        reportId,
        status,
        reportNumber
      });

    } catch (error) {
      this.logger.error('Failed to update report status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        reportId,
        status
      });
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Test database connection
      const { error } = await this.supabase
        .from('mandatory_reporting_records')
        .select('id')
        .limit(1);

      if (error) {
        throw error;
      }

      // Test webhook URL format
      if (this.reportingWebhook) {
        const url = new URL(this.reportingWebhook);
        if (!url.protocol.startsWith('http')) {
          throw new Error('Invalid reporting webhook URL');
        }
      }

      return true;
    } catch (error) {
      this.logger.warn('MandatoryReportingService health check failed', { error });
      return false;
    }
  }

  private async storeReportRecord(record: MandatoryReportingRecord): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('mandatory_reporting_records')
        .insert([{
          id: record.id,
          user_id: record.userId,
          report_type: record.reportType,
          severity: record.severity,
          evidence: record.evidence,
          reporting_agency: record.reportingAgency,
          reported_at: record.reportedAt,
          report_number: record.reportNumber,
          follow_up_required: record.followUpRequired,
          status: record.status
        }]);

      if (error) {
        throw error;
      }

      this.logger.info('Report record stored', {
        reportId: record.id,
        userId: record.userId
      });

    } catch (error) {
      this.logger.error('Failed to store report record', {
        error: error instanceof Error ? error.message : 'Unknown error',
        reportId: record.id
      });
      throw error;
    }
  }

  private async submitToAuthorities(record: MandatoryReportingRecord): Promise<void> {
    try {
      // In a real implementation, this would:
      // 1. Determine the appropriate reporting agency based on location and type
      // 2. Format the report according to agency requirements
      // 3. Submit via secure channels (encrypted email, secure portal, etc.)
      // 4. Handle acknowledgments and follow-up requirements
      // 5. Maintain audit trail of all communications

      const reportPayload = {
        reportId: record.id,
        reportType: record.reportType,
        severity: record.severity,
        evidence: record.evidence,
        reportingAgency: record.reportingAgency,
        timestamp: record.reportedAt,
        userId: record.userId, // This would be anonymized in production
        followUpRequired: record.followUpRequired
      };

      // Log the report submission (in production, this would actually submit)
      this.logger.warn('Mandatory report prepared for submission', {
        reportId: record.id,
        reportType: record.reportType,
        reportingAgency: record.reportingAgency,
        payload: reportPayload
      });

      // In a real implementation:
      // if (this.reportingWebhook) {
      //   await this.sendReportWebhook(reportPayload);
      // }

      // Simulate report number assignment
      const reportNumber = `RPT-${Date.now()}-${record.id.substring(0, 8)}`;
      
      // Update with report number
      await this.updateReportStatus(record.id, 'submitted', reportNumber);

    } catch (error) {
      this.logger.error('Failed to submit to authorities', {
        error: error instanceof Error ? error.message : 'Unknown error',
        reportId: record.id
      });
      throw error;
    }
  }

  private async sendReportWebhook(payload: any): Promise<void> {
    try {
      // In a real implementation, this would make an HTTP POST to the reporting webhook
      this.logger.warn('Report webhook payload prepared', { 
        webhook: this.reportingWebhook,
        payload 
      });

      // Simulate webhook call
      // const response = await fetch(this.reportingWebhook, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${process.env.REPORTING_WEBHOOK_TOKEN}`
      //   },
      //   body: JSON.stringify(payload)
      // });

      // if (!response.ok) {
      //   throw new Error(`Webhook failed with status ${response.status}`);
      // }

    } catch (error) {
      this.logger.error('Failed to send report webhook', {
        error: error instanceof Error ? error.message : 'Unknown error',
        webhook: this.reportingWebhook
      });
      throw error;
    }
  }

  private mapDatabaseToRecord(data: any): MandatoryReportingRecord {
    return {
      id: data.id,
      userId: data.user_id,
      reportType: data.report_type,
      severity: data.severity,
      evidence: data.evidence,
      reportingAgency: data.reporting_agency,
      reportedAt: data.reported_at,
      reportNumber: data.report_number,
      followUpRequired: data.follow_up_required,
      status: data.status
    };
  }

  async getReportingMetrics(timeRange: { start: string; end: string }): Promise<{
    totalReports: number;
    reportsByType: Record<string, number>;
    reportsByStatus: Record<string, number>;
    reportsBySeverity: Record<string, number>;
    averageProcessingTime: number;
    pendingReports: number;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('mandatory_reporting_records')
        .select('*')
        .gte('reported_at', timeRange.start)
        .lte('reported_at', timeRange.end);

      if (error) {
        throw error;
      }

      const reports = data || [];
      
      const metrics = {
        totalReports: reports.length,
        reportsByType: {} as Record<string, number>,
        reportsByStatus: {} as Record<string, number>,
        reportsBySeverity: {} as Record<string, number>,
        averageProcessingTime: 0,
        pendingReports: 0
      };

      let totalProcessingTime = 0;
      let processedReports = 0;

      reports.forEach(report => {
        // Count by type
        metrics.reportsByType[report.report_type] = 
          (metrics.reportsByType[report.report_type] || 0) + 1;

        // Count by status
        metrics.reportsByStatus[report.status] = 
          (metrics.reportsByStatus[report.status] || 0) + 1;

        // Count by severity
        metrics.reportsBySeverity[report.severity] = 
          (metrics.reportsBySeverity[report.severity] || 0) + 1;

        // Count pending reports
        if (report.status === 'pending') {
          metrics.pendingReports++;
        }

        // Calculate processing time for completed reports
        if (report.status === 'resolved' && report.updated_at) {
          const reportedAt = new Date(report.reported_at).getTime();
          const resolvedAt = new Date(report.updated_at).getTime();
          totalProcessingTime += resolvedAt - reportedAt;
          processedReports++;
        }
      });

      // Calculate average processing time in hours
      if (processedReports > 0) {
        metrics.averageProcessingTime = totalProcessingTime / processedReports / (1000 * 60 * 60);
      }

      return metrics;

    } catch (error) {
      this.logger.error('Failed to get reporting metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timeRange
      });
      throw error;
    }
  }
}
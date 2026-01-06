/**
 * IP Analytics Service
 * 
 * Monitors IP detection frequency, accuracy, disputes, and performance metrics.
 * Provides analytics endpoints for dashboards and reporting.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface IPAnalytics {
  detectionFrequency: {
    character: string;
    franchise: string;
    owner: string;
    count: number;
    percentage: number;
  }[];
  detectionAccuracy: {
    totalDetections: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    falsePositives: number;
    missedDetections: number;
  };
  disputeMetrics: {
    totalDisputes: number;
    pending: number;
    resolved: number;
    escalated: number;
    byType: Record<string, number>;
  };
  performanceMetrics: {
    averageDetectionTime: number;
    cacheHitRate: number;
    totalDetections: number;
  };
}

export class IPAnalyticsService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Get IP detection analytics
   */
  async getDetectionAnalytics(startDate?: string, endDate?: string): Promise<IPAnalytics> {
    try {
      // Build date filter
      let query = this.supabase.from('ip_detection_audit').select('*');
      
      if (startDate) {
        query = query.gte('detection_timestamp', startDate);
      }
      if (endDate) {
        query = query.lte('detection_timestamp', endDate);
      }

      const { data: auditRecords, error } = await query;

      if (error) {
        throw new Error(`Failed to get detection analytics: ${error.message}`);
      }

      // Calculate detection frequency
      const characterCounts = new Map<string, { franchise: string; owner: string; count: number }>();
      let totalDetections = 0;
      let highConfidence = 0;
      let mediumConfidence = 0;
      let lowConfidence = 0;

      (auditRecords || []).forEach(record => {
        const characters = record.detected_characters || [];
        const confidenceScores = record.confidence_scores || {};

        characters.forEach((char: any) => {
          const key = `${char.character}|${char.franchise}|${char.owner}`;
          const existing = characterCounts.get(key) || { franchise: char.franchise, owner: char.owner, count: 0 };
          existing.count++;
          characterCounts.set(key, existing);
          totalDetections++;

          const confidence = confidenceScores[char.character] || 'low';
          if (confidence === 'high') highConfidence++;
          else if (confidence === 'medium') mediumConfidence++;
          else lowConfidence++;
        });
      });

      const detectionFrequency = Array.from(characterCounts.entries())
        .map(([key, data]) => {
          const [character] = key.split('|');
          return {
            character,
            franchise: data.franchise,
            owner: data.owner,
            count: data.count,
            percentage: totalDetections > 0 ? (data.count / totalDetections) * 100 : 0,
          };
        })
        .sort((a, b) => b.count - a.count);

      // Get dispute metrics
      let disputeQuery = this.supabase.from('ip_disputes').select('*');
      if (startDate) {
        disputeQuery = disputeQuery.gte('created_at', startDate);
      }
      if (endDate) {
        disputeQuery = disputeQuery.lte('created_at', endDate);
      }

      const { data: disputes, error: disputeError } = await disputeQuery;

      if (disputeError) {
        throw new Error(`Failed to get dispute metrics: ${disputeError.message}`);
      }

      const disputeMetrics = {
        totalDisputes: (disputes || []).length,
        pending: (disputes || []).filter(d => d.status === 'pending').length,
        resolved: (disputes || []).filter(d => d.status === 'resolved').length,
        escalated: (disputes || []).filter(d => d.status === 'escalated' || d.legal_escalated).length,
        byType: (disputes || []).reduce((acc: Record<string, number>, d) => {
          acc[d.dispute_type] = (acc[d.dispute_type] || 0) + 1;
          return acc;
        }, {}),
      };

      // Calculate false positives and missed detections from disputes
      const falsePositives = (disputes || []).filter(d => d.dispute_type === 'false_positive' && d.status === 'resolved').length;
      const missedDetections = (disputes || []).filter(d => d.dispute_type === 'missed_detection' && d.status === 'resolved').length;

      return {
        detectionFrequency,
        detectionAccuracy: {
          totalDetections,
          highConfidence,
          mediumConfidence,
          lowConfidence,
          falsePositives,
          missedDetections,
        },
        disputeMetrics,
        performanceMetrics: {
          averageDetectionTime: 0, // Would need to track this separately
          cacheHitRate: 0, // Would need to track this separately
          totalDetections,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get detection analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get dispute analytics
   */
  async getDisputeAnalytics(startDate?: string, endDate?: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    resolutionTime: {
      average: number;
      median: number;
    };
  }> {
    try {
      let query = this.supabase.from('ip_disputes').select('*');
      
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data: disputes, error } = await query;

      if (error) {
        throw new Error(`Failed to get dispute analytics: ${error.message}`);
      }

      const disputesList = disputes || [];
      const resolutionTimes: number[] = [];

      disputesList.forEach(dispute => {
        if (dispute.resolved_at && dispute.created_at) {
          const created = new Date(dispute.created_at).getTime();
          const resolved = new Date(dispute.resolved_at).getTime();
          const hours = (resolved - created) / (1000 * 60 * 60);
          resolutionTimes.push(hours);
        }
      });

      return {
        total: disputesList.length,
        byStatus: disputesList.reduce((acc: Record<string, number>, d) => {
          acc[d.status] = (acc[d.status] || 0) + 1;
          return acc;
        }, {}),
        byType: disputesList.reduce((acc: Record<string, number>, d) => {
          acc[d.dispute_type] = (acc[d.dispute_type] || 0) + 1;
          return acc;
        }, {}),
        resolutionTime: {
          average: resolutionTimes.length > 0
            ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
            : 0,
          median: resolutionTimes.length > 0
            ? resolutionTimes.sort((a, b) => a - b)[Math.floor(resolutionTimes.length / 2)]
            : 0,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get dispute analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(startDate?: string, endDate?: string): Promise<{
    totalDetections: number;
    averageDetectionTime: number;
    cacheHitRate: number;
    detectionByMethod: Record<string, number>;
  }> {
    try {
      let query = this.supabase.from('ip_detection_audit').select('detection_method, metadata');
      
      if (startDate) {
        query = query.gte('detection_timestamp', startDate);
      }
      if (endDate) {
        query = query.lte('detection_timestamp', endDate);
      }

      const { data: records, error } = await query;

      if (error) {
        throw new Error(`Failed to get performance metrics: ${error.message}`);
      }

      const recordsList = records || [];
      const detectionByMethod: Record<string, number> = {};
      let totalDetectionTime = 0;
      let detectionTimeCount = 0;
      let cacheHits = 0;
      let totalRequests = 0;

      recordsList.forEach(record => {
        // Count by method
        const method = record.detection_method || 'unknown';
        detectionByMethod[method] = (detectionByMethod[method] || 0) + 1;

        // Extract performance metrics from metadata
        const metadata = record.metadata || {};
        if (metadata.detectionTime) {
          totalDetectionTime += metadata.detectionTime;
          detectionTimeCount++;
        }
        if (metadata.cacheHit !== undefined) {
          totalRequests++;
          if (metadata.cacheHit) {
            cacheHits++;
          }
        }
      });

      return {
        totalDetections: recordsList.length,
        averageDetectionTime: detectionTimeCount > 0 ? totalDetectionTime / detectionTimeCount : 0,
        cacheHitRate: totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0,
        detectionByMethod,
      };
    } catch (error) {
      throw new Error(`Failed to get performance metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

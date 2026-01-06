import { EventEmitter } from 'events';
import * as crypto from 'crypto';

export interface AccessPattern {
  userId: string;
  timestamp: number;
  action: string;
  resource: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
    coordinates?: [number, number];
  };
  metadata: Record<string, any>;
}

export interface AnomalyScore {
  overall: number;
  temporal: number;
  behavioral: number;
  geographical: number;
  device: number;
  frequency: number;
}

export interface AnomalyDetectionResult {
  isAnomalous: boolean;
  anomalyScore: AnomalyScore;
  anomalyTypes: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  explanation: string[];
  recommendedActions: string[];
}

export interface UserProfile {
  userId: string;
  normalPatterns: {
    commonActions: Map<string, number>;
    commonResources: Map<string, number>;
    commonTimeRanges: Array<{ start: number; end: number; frequency: number }>;
    commonLocations: Array<{ location: string; frequency: number }>;
    commonDevices: Map<string, number>;
    averageSessionDuration: number;
    averageActionsPerSession: number;
  };
  recentActivity: AccessPattern[];
  lastUpdated: number;
  totalSessions: number;
}

export interface AnomalyDetectionConfig {
  anomalyThreshold: number;
  profileUpdateThreshold: number;
  maxRecentActivity: number;
  temporalWindowHours: number;
  geographicalThresholdKm: number;
  frequencyThresholdMultiplier: number;
}

export class AnomalyDetectionEngine extends EventEmitter {
  private userProfiles: Map<string, UserProfile> = new Map();
  private config: AnomalyDetectionConfig;
  private globalPatterns: {
    commonActions: Map<string, number>;
    commonResources: Map<string, number>;
    peakHours: Map<number, number>;
  } = {
    commonActions: new Map(),
    commonResources: new Map(),
    peakHours: new Map()
  };

  constructor(config: AnomalyDetectionConfig) {
    super();
    this.config = config;
  }

  /**
   * Analyzes an access pattern for anomalies
   */
  async detectAnomalies(pattern: AccessPattern): Promise<AnomalyDetectionResult> {
    try {
      const userProfile = await this.getUserProfile(pattern.userId);
      
      // Calculate anomaly scores for different dimensions
      const temporalScore = this.calculateTemporalAnomalyScore(pattern, userProfile);
      const behavioralScore = this.calculateBehavioralAnomalyScore(pattern, userProfile);
      const geographicalScore = this.calculateGeographicalAnomalyScore(pattern, userProfile);
      const deviceScore = this.calculateDeviceAnomalyScore(pattern, userProfile);
      const frequencyScore = this.calculateFrequencyAnomalyScore(pattern, userProfile);

      const anomalyScore: AnomalyScore = {
        overall: 0,
        temporal: temporalScore,
        behavioral: behavioralScore,
        geographical: geographicalScore,
        device: deviceScore,
        frequency: frequencyScore
      };

      // Calculate overall anomaly score (weighted average)
      anomalyScore.overall = (
        temporalScore * 0.2 +
        behavioralScore * 0.3 +
        geographicalScore * 0.2 +
        deviceScore * 0.15 +
        frequencyScore * 0.15
      );

      // Determine anomaly types and explanations
      const { anomalyTypes, explanation } = this.identifyAnomalyTypes(anomalyScore, pattern, userProfile);

      // Determine risk level and confidence
      const riskLevel = this.determineRiskLevel(anomalyScore.overall);
      const confidence = this.calculateConfidence(anomalyScore, userProfile);

      // Generate recommended actions
      const recommendedActions = this.generateRecommendedActions(anomalyScore, anomalyTypes, riskLevel);

      const result: AnomalyDetectionResult = {
        isAnomalous: anomalyScore.overall > this.config.anomalyThreshold,
        anomalyScore,
        anomalyTypes,
        riskLevel,
        confidence,
        explanation,
        recommendedActions
      };

      // Update user profile with new pattern
      await this.updateUserProfile(pattern, userProfile);

      // Emit events based on results
      if (result.isAnomalous) {
        this.emit('anomalyDetected', {
          pattern,
          result,
          userProfile
        });

        if (result.riskLevel === 'critical') {
          this.emit('criticalAnomaly', {
            pattern,
            result,
            userProfile
          });
        }
      }

      return result;
    } catch (error) {
      this.emit('detectionError', {
        pattern,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`Anomaly detection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Trains the anomaly detection model with historical data
   */
  async trainModel(historicalPatterns: AccessPattern[]): Promise<void> {
    try {
      // Group patterns by user
      const userPatterns = new Map<string, AccessPattern[]>();
      for (const pattern of historicalPatterns) {
        const patterns = userPatterns.get(pattern.userId) || [];
        patterns.push(pattern);
        userPatterns.set(pattern.userId, patterns);
      }

      // Build user profiles
      for (const [userId, patterns] of userPatterns) {
        const profile = this.buildUserProfile(userId, patterns);
        this.userProfiles.set(userId, profile);
      }

      // Build global patterns
      this.buildGlobalPatterns(historicalPatterns);

      this.emit('modelTrained', {
        userCount: userPatterns.size,
        patternCount: historicalPatterns.length
      });
    } catch (error) {
      this.emit('trainingError', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`Model training failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets or creates a user profile
   */
  private async getUserProfile(userId: string): Promise<UserProfile> {
    let profile = this.userProfiles.get(userId);
    
    if (!profile) {
      profile = {
        userId,
        normalPatterns: {
          commonActions: new Map(),
          commonResources: new Map(),
          commonTimeRanges: [],
          commonLocations: [],
          commonDevices: new Map(),
          averageSessionDuration: 0,
          averageActionsPerSession: 0
        },
        recentActivity: [],
        lastUpdated: Date.now(),
        totalSessions: 0
      };
      this.userProfiles.set(userId, profile);
    }

    return profile;
  }

  /**
   * Calculates temporal anomaly score
   */
  private calculateTemporalAnomalyScore(pattern: AccessPattern, profile: UserProfile): number {
    const hour = new Date(pattern.timestamp).getHours();
    
    // Check against user's normal time ranges
    const isInNormalTimeRange = profile.normalPatterns.commonTimeRanges.some(range => {
      return hour >= range.start && hour <= range.end;
    });

    if (isInNormalTimeRange) {
      return 0.1; // Low anomaly score for normal times
    }

    // Check against global peak hours
    const globalFrequency = this.globalPatterns.peakHours.get(hour) || 0;
    if (globalFrequency > 0.1) { // If this hour is common globally
      return 0.3; // Medium anomaly score
    }

    return 0.8; // High anomaly score for unusual times
  }

  /**
   * Calculates behavioral anomaly score
   */
  private calculateBehavioralAnomalyScore(pattern: AccessPattern, profile: UserProfile): number {
    let score = 0;

    // Check action frequency
    const actionFrequency = profile.normalPatterns.commonActions.get(pattern.action) || 0;
    if (actionFrequency < 0.1) {
      score += 0.4; // Unusual action
    }

    // Check resource frequency
    const resourceFrequency = profile.normalPatterns.commonResources.get(pattern.resource) || 0;
    if (resourceFrequency < 0.1) {
      score += 0.3; // Unusual resource
    }

    // Check for rapid successive actions
    const recentSimilarActions = profile.recentActivity.filter(a => 
      a.action === pattern.action && 
      pattern.timestamp - a.timestamp < 60000 // Within 1 minute
    );

    if (recentSimilarActions.length > 5) {
      score += 0.5; // Rapid repeated actions
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculates geographical anomaly score
   */
  private calculateGeographicalAnomalyScore(pattern: AccessPattern, profile: UserProfile): number {
    if (!pattern.location || profile.normalPatterns.commonLocations.length === 0) {
      return 0.2; // Medium score for unknown location
    }

    const currentLocation = `${pattern.location.country || ''}_${pattern.location.region || ''}_${pattern.location.city || ''}`;
    
    // Check if location is in user's common locations
    const isCommonLocation = profile.normalPatterns.commonLocations.some(loc => 
      loc.location === currentLocation && loc.frequency > 0.1
    );

    if (isCommonLocation) {
      return 0.1; // Low anomaly score for common locations
    }

    // Calculate distance from common locations if coordinates are available
    if (pattern.location.coordinates) {
      const [currentLat, currentLon] = pattern.location.coordinates;
      
      for (const commonLoc of profile.normalPatterns.commonLocations) {
        // This would require storing coordinates in common locations
        // For now, we'll use a simplified approach
        if (commonLoc.frequency > 0.2) {
          return 0.4; // Medium anomaly for new location but user has established patterns
        }
      }
    }

    return 0.7; // High anomaly score for completely new location
  }

  /**
   * Calculates device anomaly score
   */
  private calculateDeviceAnomalyScore(pattern: AccessPattern, profile: UserProfile): number {
    if (!pattern.deviceId) {
      return 0.3; // Medium score for unknown device
    }

    const deviceFrequency = profile.normalPatterns.commonDevices.get(pattern.deviceId) || 0;
    
    if (deviceFrequency > 0.2) {
      return 0.1; // Low anomaly for common device
    } else if (deviceFrequency > 0.05) {
      return 0.3; // Medium anomaly for occasionally used device
    } else {
      return 0.8; // High anomaly for new/rare device
    }
  }

  /**
   * Calculates frequency anomaly score
   */
  private calculateFrequencyAnomalyScore(pattern: AccessPattern, profile: UserProfile): number {
    const recentWindow = pattern.timestamp - (this.config.temporalWindowHours * 60 * 60 * 1000);
    const recentActions = profile.recentActivity.filter(a => a.timestamp > recentWindow);
    
    const expectedFrequency = profile.normalPatterns.averageActionsPerSession || 1;
    const actualFrequency = recentActions.length;
    
    const frequencyRatio = actualFrequency / expectedFrequency;
    
    if (frequencyRatio > this.config.frequencyThresholdMultiplier) {
      return 0.7; // High frequency anomaly
    } else if (frequencyRatio < 0.3) {
      return 0.4; // Low frequency anomaly
    } else {
      return 0.1; // Normal frequency
    }
  }

  /**
   * Identifies specific anomaly types and generates explanations
   */
  private identifyAnomalyTypes(
    scores: AnomalyScore,
    pattern: AccessPattern,
    profile: UserProfile
  ): { anomalyTypes: string[]; explanation: string[] } {
    const anomalyTypes: string[] = [];
    const explanation: string[] = [];

    if (scores.temporal > 0.5) {
      anomalyTypes.push('temporal_anomaly');
      explanation.push('Access occurred at an unusual time');
    }

    if (scores.behavioral > 0.5) {
      anomalyTypes.push('behavioral_anomaly');
      explanation.push('Unusual action or resource access pattern');
    }

    if (scores.geographical > 0.5) {
      anomalyTypes.push('geographical_anomaly');
      explanation.push('Access from an unusual location');
    }

    if (scores.device > 0.5) {
      anomalyTypes.push('device_anomaly');
      explanation.push('Access from an unusual or new device');
    }

    if (scores.frequency > 0.5) {
      anomalyTypes.push('frequency_anomaly');
      explanation.push('Unusual access frequency pattern');
    }

    return { anomalyTypes, explanation };
  }

  /**
   * Determines risk level based on overall anomaly score
   */
  private determineRiskLevel(overallScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (overallScore >= 0.8) return 'critical';
    if (overallScore >= 0.6) return 'high';
    if (overallScore >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * Calculates confidence in the anomaly detection
   */
  private calculateConfidence(scores: AnomalyScore, profile: UserProfile): number {
    // Confidence increases with more historical data
    const dataConfidence = Math.min(profile.totalSessions / 100, 1.0);
    
    // Confidence increases with consistency across different anomaly types
    const scoreVariance = this.calculateVariance([
      scores.temporal,
      scores.behavioral,
      scores.geographical,
      scores.device,
      scores.frequency
    ]);
    
    const consistencyConfidence = 1 - scoreVariance;
    
    return (dataConfidence + consistencyConfidence) / 2;
  }

  /**
   * Generates recommended actions based on anomaly detection results
   */
  private generateRecommendedActions(
    scores: AnomalyScore,
    anomalyTypes: string[],
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
  ): string[] {
    const actions: string[] = [];

    if (riskLevel === 'critical') {
      actions.push('block_access');
      actions.push('require_additional_authentication');
      actions.push('notify_security_team');
    } else if (riskLevel === 'high') {
      actions.push('require_additional_authentication');
      actions.push('increase_monitoring');
      actions.push('notify_user');
    } else if (riskLevel === 'medium') {
      actions.push('increase_monitoring');
      actions.push('log_detailed_activity');
    }

    if (anomalyTypes.includes('device_anomaly')) {
      actions.push('verify_device');
    }

    if (anomalyTypes.includes('geographical_anomaly')) {
      actions.push('verify_location');
    }

    if (anomalyTypes.includes('frequency_anomaly')) {
      actions.push('rate_limit');
    }

    return actions;
  }

  /**
   * Updates user profile with new access pattern
   */
  private async updateUserProfile(pattern: AccessPattern, profile: UserProfile): Promise<void> {
    // Add to recent activity
    profile.recentActivity.push(pattern);
    if (profile.recentActivity.length > this.config.maxRecentActivity) {
      profile.recentActivity.shift();
    }

    // Update common patterns if this is normal behavior
    const overallScore = (
      this.calculateTemporalAnomalyScore(pattern, profile) * 0.2 +
      this.calculateBehavioralAnomalyScore(pattern, profile) * 0.3 +
      this.calculateGeographicalAnomalyScore(pattern, profile) * 0.2 +
      this.calculateDeviceAnomalyScore(pattern, profile) * 0.15 +
      this.calculateFrequencyAnomalyScore(pattern, profile) * 0.15
    );

    if (overallScore < this.config.profileUpdateThreshold) {
      // Update action frequency
      const actionCount = profile.normalPatterns.commonActions.get(pattern.action) || 0;
      profile.normalPatterns.commonActions.set(pattern.action, actionCount + 1);

      // Update resource frequency
      const resourceCount = profile.normalPatterns.commonResources.get(pattern.resource) || 0;
      profile.normalPatterns.commonResources.set(pattern.resource, resourceCount + 1);

      // Update device frequency
      if (pattern.deviceId) {
        const deviceCount = profile.normalPatterns.commonDevices.get(pattern.deviceId) || 0;
        profile.normalPatterns.commonDevices.set(pattern.deviceId, deviceCount + 1);
      }

      // Update location frequency
      if (pattern.location) {
        const location = `${pattern.location.country || ''}_${pattern.location.region || ''}_${pattern.location.city || ''}`;
        const existingLocation = profile.normalPatterns.commonLocations.find(l => l.location === location);
        if (existingLocation) {
          existingLocation.frequency += 1;
        } else {
          profile.normalPatterns.commonLocations.push({ location, frequency: 1 });
        }
      }
    }

    profile.lastUpdated = Date.now();
    profile.totalSessions += 1;
  }

  /**
   * Builds a user profile from historical patterns
   */
  private buildUserProfile(userId: string, patterns: AccessPattern[]): UserProfile {
    const profile: UserProfile = {
      userId,
      normalPatterns: {
        commonActions: new Map(),
        commonResources: new Map(),
        commonTimeRanges: [],
        commonLocations: [],
        commonDevices: new Map(),
        averageSessionDuration: 0,
        averageActionsPerSession: 0
      },
      recentActivity: patterns.slice(-this.config.maxRecentActivity),
      lastUpdated: Date.now(),
      totalSessions: patterns.length
    };

    // Build action frequency map
    patterns.forEach(pattern => {
      const actionCount = profile.normalPatterns.commonActions.get(pattern.action) || 0;
      profile.normalPatterns.commonActions.set(pattern.action, actionCount + 1);

      const resourceCount = profile.normalPatterns.commonResources.get(pattern.resource) || 0;
      profile.normalPatterns.commonResources.set(pattern.resource, resourceCount + 1);

      if (pattern.deviceId) {
        const deviceCount = profile.normalPatterns.commonDevices.get(pattern.deviceId) || 0;
        profile.normalPatterns.commonDevices.set(pattern.deviceId, deviceCount + 1);
      }
    });

    // Normalize frequencies
    const totalPatterns = patterns.length;
    profile.normalPatterns.commonActions.forEach((count, action) => {
      profile.normalPatterns.commonActions.set(action, count / totalPatterns);
    });
    profile.normalPatterns.commonResources.forEach((count, resource) => {
      profile.normalPatterns.commonResources.set(resource, count / totalPatterns);
    });
    profile.normalPatterns.commonDevices.forEach((count, device) => {
      profile.normalPatterns.commonDevices.set(device, count / totalPatterns);
    });

    return profile;
  }

  /**
   * Builds global patterns from all historical data
   */
  private buildGlobalPatterns(patterns: AccessPattern[]): void {
    patterns.forEach(pattern => {
      // Update global action frequency
      const actionCount = this.globalPatterns.commonActions.get(pattern.action) || 0;
      this.globalPatterns.commonActions.set(pattern.action, actionCount + 1);

      // Update global resource frequency
      const resourceCount = this.globalPatterns.commonResources.get(pattern.resource) || 0;
      this.globalPatterns.commonResources.set(pattern.resource, resourceCount + 1);

      // Update peak hours
      const hour = new Date(pattern.timestamp).getHours();
      const hourCount = this.globalPatterns.peakHours.get(hour) || 0;
      this.globalPatterns.peakHours.set(hour, hourCount + 1);
    });

    // Normalize global frequencies
    const totalPatterns = patterns.length;
    this.globalPatterns.commonActions.forEach((count, action) => {
      this.globalPatterns.commonActions.set(action, count / totalPatterns);
    });
    this.globalPatterns.commonResources.forEach((count, resource) => {
      this.globalPatterns.commonResources.set(resource, count / totalPatterns);
    });
    this.globalPatterns.peakHours.forEach((count, hour) => {
      this.globalPatterns.peakHours.set(hour, count / totalPatterns);
    });
  }

  /**
   * Calculates variance of an array of numbers
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  /**
   * Gets system metrics and statistics
   */
  getMetrics(): {
    totalUsers: number;
    totalProfiles: number;
    averageProfileAge: number;
    anomalyDetectionRate: number;
    topAnomalyTypes: Array<{ type: string; count: number }>;
  } {
    const totalUsers = this.userProfiles.size;
    const now = Date.now();
    
    let totalProfileAge = 0;
    let anomalyCount = 0;
    const anomalyTypes = new Map<string, number>();

    this.userProfiles.forEach(profile => {
      totalProfileAge += now - profile.lastUpdated;
    });

    const averageProfileAge = totalUsers > 0 ? totalProfileAge / totalUsers : 0;

    const topAnomalyTypes = Array.from(anomalyTypes.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalUsers,
      totalProfiles: totalUsers,
      averageProfileAge,
      anomalyDetectionRate: 0, // Would need to track this over time
      topAnomalyTypes
    };
  }
}
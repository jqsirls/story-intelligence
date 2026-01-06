import { EventEmitter } from 'events';
import * as crypto from 'crypto';

export interface ThreatSignature {
  signatureId: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'malware' | 'phishing' | 'injection' | 'brute_force' | 'anomaly' | 'data_exfiltration';
  patterns: Array<{
    type: 'regex' | 'behavioral' | 'statistical' | 'ml_model';
    pattern: string | object;
    confidence: number;
  }>;
  mitigations: string[];
  lastUpdated: number;
}

export interface ThreatDetectionResult {
  detectionId: string;
  timestamp: number;
  threatType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  source: {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
    location?: string;
  };
  indicators: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  context: {
    requestData?: any;
    sessionData?: any;
    historicalData?: any;
  };
  riskScore: number;
  recommendedActions: string[];
  automaticMitigation: boolean;
}

export interface MLThreatModel {
  modelId: string;
  modelType: 'anomaly_detection' | 'classification' | 'clustering' | 'deep_learning';
  threatCategories: string[];
  features: string[];
  accuracy: number;
  lastTrained: number;
  version: string;
}

export interface ThreatIntelligence {
  source: string;
  indicators: Array<{
    type: 'ip' | 'domain' | 'hash' | 'url' | 'email';
    value: string;
    confidence: number;
    firstSeen: number;
    lastSeen: number;
    tags: string[];
  }>;
  campaigns: Array<{
    name: string;
    description: string;
    tactics: string[];
    techniques: string[];
    procedures: string[];
  }>;
  lastUpdated: number;
}

export class AIThreatDetectionEngine extends EventEmitter {
  private threatSignatures: Map<string, ThreatSignature> = new Map();
  private mlModels: Map<string, MLThreatModel> = new Map();
  private threatIntelligence: Map<string, ThreatIntelligence> = new Map();
  private detectionHistory: Map<string, ThreatDetectionResult> = new Map();
  private behavioralProfiles: Map<string, any> = new Map();
  private realTimeAnalyzer: RealTimeAnalyzer;

  constructor() {
    super();
    this.realTimeAnalyzer = new RealTimeAnalyzer();
    this.initializeSignatures();
    this.initializeMLModels();
    this.setupRealTimeMonitoring();
  }

  /**
   * Analyzes incoming request for threats using AI and ML
   */
  async analyzeRequest(
    requestData: any,
    context: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      deviceId?: string;
    }
  ): Promise<ThreatDetectionResult[]> {
    const detectionResults: ThreatDetectionResult[] = [];

    try {
      // 1. Signature-based detection
      const signatureResults = await this.performSignatureDetection(requestData, context);
      detectionResults.push(...signatureResults);

      // 2. ML-based anomaly detection
      const anomalyResults = await this.performAnomalyDetection(requestData, context);
      detectionResults.push(...anomalyResults);

      // 3. Behavioral analysis
      const behavioralResults = await this.performBehavioralAnalysis(requestData, context);
      detectionResults.push(...behavioralResults);

      // 4. Threat intelligence correlation
      const intelligenceResults = await this.correlateThreatIntelligence(requestData, context);
      detectionResults.push(...intelligenceResults);

      // 5. Deep learning analysis for advanced threats
      const deepLearningResults = await this.performDeepLearningAnalysis(requestData, context);
      detectionResults.push(...deepLearningResults);

      // Store detection results
      for (const result of detectionResults) {
        this.detectionHistory.set(result.detectionId, result);
        
        // Emit events based on severity
        if (result.severity === 'critical') {
          this.emit('criticalThreatDetected', result);
        } else if (result.severity === 'high') {
          this.emit('highThreatDetected', result);
        }
        
        this.emit('threatDetected', result);
      }

      // Update behavioral profiles
      if (context.userId) {
        await this.updateBehavioralProfile(context.userId, requestData, detectionResults);
      }

      return detectionResults;

    } catch (error) {
      this.emit('detectionError', {
        error: error instanceof Error ? error.message : String(error),
        context,
        timestamp: Date.now()
      });
      throw error;
    }
  }

  /**
   * Performs signature-based threat detection
   */
  private async performSignatureDetection(
    requestData: any,
    context: any
  ): Promise<ThreatDetectionResult[]> {
    const results: ThreatDetectionResult[] = [];

    for (const signature of this.threatSignatures.values()) {
      for (const pattern of signature.patterns) {
        let isMatch = false;
        let confidence = 0;

        switch (pattern.type) {
          case 'regex':
            isMatch = this.matchRegexPattern(requestData, pattern.pattern as string);
            confidence = isMatch ? pattern.confidence : 0;
            break;

          case 'behavioral':
            ({ isMatch, confidence } = await this.matchBehavioralPattern(
              requestData, 
              context, 
              pattern.pattern
            ));
            break;

          case 'statistical':
            ({ isMatch, confidence } = await this.matchStatisticalPattern(
              requestData, 
              context, 
              pattern.pattern
            ));
            break;
        }

        if (isMatch && confidence > 0.5) {
          const result: ThreatDetectionResult = {
            detectionId: this.generateDetectionId(),
            timestamp: Date.now(),
            threatType: signature.name,
            severity: signature.severity,
            confidence,
            source: {
              userId: context.userId,
              ipAddress: context.ipAddress,
              userAgent: context.userAgent,
              deviceId: context.deviceId
            },
            indicators: [{
              type: 'signature_match',
              value: signature.signatureId,
              confidence
            }],
            context: {
              requestData,
              sessionData: context
            },
            riskScore: this.calculateRiskScore(signature.severity, confidence),
            recommendedActions: signature.mitigations,
            automaticMitigation: signature.severity === 'critical'
          };

          results.push(result);
        }
      }
    }

    return results;
  }

  /**
   * Performs ML-based anomaly detection
   */
  private async performAnomalyDetection(
    requestData: any,
    context: any
  ): Promise<ThreatDetectionResult[]> {
    const results: ThreatDetectionResult[] = [];

    for (const model of this.mlModels.values()) {
      if (model.modelType === 'anomaly_detection') {
        const features = this.extractFeatures(requestData, context, model.features);
        const anomalyScore = await this.evaluateAnomalyModel(model, features);

        if (anomalyScore > 0.7) {
          const result: ThreatDetectionResult = {
            detectionId: this.generateDetectionId(),
            timestamp: Date.now(),
            threatType: 'anomalous_behavior',
            severity: this.scoresToSeverity(anomalyScore),
            confidence: anomalyScore,
            source: {
              userId: context.userId,
              ipAddress: context.ipAddress,
              userAgent: context.userAgent,
              deviceId: context.deviceId
            },
            indicators: [{
              type: 'ml_anomaly',
              value: model.modelId,
              confidence: anomalyScore
            }],
            context: {
              requestData,
              sessionData: context,
              features
            },
            riskScore: anomalyScore,
            recommendedActions: ['investigate_user_behavior', 'increase_monitoring'],
            automaticMitigation: anomalyScore > 0.9
          };

          results.push(result);
        }
      }
    }

    return results;
  }

  /**
   * Performs behavioral analysis
   */
  private async performBehavioralAnalysis(
    requestData: any,
    context: any
  ): Promise<ThreatDetectionResult[]> {
    const results: ThreatDetectionResult[] = [];

    if (!context.userId) return results;

    const userProfile = this.behavioralProfiles.get(context.userId);
    if (!userProfile) return results;

    // Analyze request patterns
    const currentBehavior = this.extractBehavioralFeatures(requestData, context);
    const deviationScore = this.calculateBehavioralDeviation(currentBehavior, userProfile);

    if (deviationScore > 0.6) {
      const result: ThreatDetectionResult = {
        detectionId: this.generateDetectionId(),
        timestamp: Date.now(),
        threatType: 'behavioral_anomaly',
        severity: this.scoresToSeverity(deviationScore),
        confidence: deviationScore,
        source: {
          userId: context.userId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          deviceId: context.deviceId
        },
        indicators: [{
          type: 'behavioral_deviation',
          value: `deviation_score_${deviationScore.toFixed(2)}`,
          confidence: deviationScore
        }],
        context: {
          requestData,
          sessionData: context,
          historicalData: userProfile
        },
        riskScore: deviationScore,
        recommendedActions: ['verify_user_identity', 'require_additional_authentication'],
        automaticMitigation: deviationScore > 0.8
      };

      results.push(result);
    }

    return results;
  }

  /**
   * Correlates with threat intelligence feeds
   */
  private async correlateThreatIntelligence(
    requestData: any,
    context: any
  ): Promise<ThreatDetectionResult[]> {
    const results: ThreatDetectionResult[] = [];

    // Extract indicators from request
    const indicators = this.extractIndicators(requestData, context);

    for (const intelligence of this.threatIntelligence.values()) {
      for (const indicator of indicators) {
        const match = intelligence.indicators.find(
          intel => intel.type === indicator.type && intel.value === indicator.value
        );

        if (match) {
          const result: ThreatDetectionResult = {
            detectionId: this.generateDetectionId(),
            timestamp: Date.now(),
            threatType: 'threat_intelligence_match',
            severity: this.confidenceToSeverity(match.confidence),
            confidence: match.confidence,
            source: {
              userId: context.userId,
              ipAddress: context.ipAddress,
              userAgent: context.userAgent,
              deviceId: context.deviceId
            },
            indicators: [{
              type: 'threat_intel',
              value: `${match.type}:${match.value}`,
              confidence: match.confidence
            }],
            context: {
              requestData,
              sessionData: context,
              threatIntelSource: intelligence.source
            },
            riskScore: match.confidence,
            recommendedActions: ['block_indicator', 'investigate_source'],
            automaticMitigation: match.confidence > 0.8
          };

          results.push(result);
        }
      }
    }

    return results;
  }

  /**
   * Performs deep learning analysis for advanced threats
   */
  private async performDeepLearningAnalysis(
    requestData: any,
    context: any
  ): Promise<ThreatDetectionResult[]> {
    const results: ThreatDetectionResult[] = [];

    for (const model of this.mlModels.values()) {
      if (model.modelType === 'deep_learning') {
        const features = this.extractDeepFeatures(requestData, context);
        const threatProbabilities = await this.evaluateDeepLearningModel(model, features);

        for (const [threatType, probability] of Object.entries(threatProbabilities)) {
          if (probability > 0.6) {
            const result: ThreatDetectionResult = {
              detectionId: this.generateDetectionId(),
              timestamp: Date.now(),
              threatType,
              severity: this.scoresToSeverity(probability),
              confidence: probability,
              source: {
                userId: context.userId,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                deviceId: context.deviceId
              },
              indicators: [{
                type: 'deep_learning',
                value: `${model.modelId}:${threatType}`,
                confidence: probability
              }],
              context: {
                requestData,
                sessionData: context,
                features
              },
              riskScore: probability,
              recommendedActions: this.getRecommendedActions(threatType),
              automaticMitigation: probability > 0.85
            };

            results.push(result);
          }
        }
      }
    }

    return results;
  }

  /**
   * Updates threat signatures from external sources
   */
  async updateThreatSignatures(signatures: ThreatSignature[]): Promise<void> {
    try {
      for (const signature of signatures) {
        this.threatSignatures.set(signature.signatureId, signature);
      }

      this.emit('signaturesUpdated', {
        count: signatures.length,
        timestamp: Date.now()
      });
    } catch (error) {
      this.emit('signatureUpdateError', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Updates threat intelligence feeds
   */
  async updateThreatIntelligence(intelligence: ThreatIntelligence[]): Promise<void> {
    try {
      for (const intel of intelligence) {
        this.threatIntelligence.set(intel.source, intel);
      }

      this.emit('threatIntelligenceUpdated', {
        sources: intelligence.length,
        timestamp: Date.now()
      });
    } catch (error) {
      this.emit('threatIntelligenceUpdateError', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Trains ML models with new data
   */
  async trainMLModel(
    modelId: string,
    trainingData: any[],
    labels: any[]
  ): Promise<void> {
    try {
      const model = this.mlModels.get(modelId);
      if (!model) {
        throw new Error(`Model not found: ${modelId}`);
      }

      // Simplified training process
      const accuracy = await this.performModelTraining(model, trainingData, labels);
      
      model.accuracy = accuracy;
      model.lastTrained = Date.now();
      model.version = this.incrementVersion(model.version);

      this.mlModels.set(modelId, model);

      this.emit('modelTrained', {
        modelId,
        accuracy,
        trainingDataSize: trainingData.length,
        timestamp: Date.now()
      });
    } catch (error) {
      this.emit('modelTrainingError', {
        modelId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Gets threat detection statistics
   */
  getThreatStatistics(): {
    totalDetections: number;
    detectionsBySeverity: Record<string, number>;
    detectionsByType: Record<string, number>;
    falsePositiveRate: number;
    averageResponseTime: number;
    topThreats: Array<{ type: string; count: number }>;
  } {
    const detections = Array.from(this.detectionHistory.values());
    
    const detectionsBySeverity: Record<string, number> = {};
    const detectionsByType: Record<string, number> = {};
    
    for (const detection of detections) {
      detectionsBySeverity[detection.severity] = (detectionsBySeverity[detection.severity] || 0) + 1;
      detectionsByType[detection.threatType] = (detectionsByType[detection.threatType] || 0) + 1;
    }

    const topThreats = Object.entries(detectionsByType)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalDetections: detections.length,
      detectionsBySeverity,
      detectionsByType,
      falsePositiveRate: 0.05, // Would be calculated from feedback
      averageResponseTime: 150, // Would be calculated from actual response times
      topThreats
    };
  }

  // Helper methods
  private initializeSignatures(): void {
    // Initialize with common threat signatures
    const signatures: ThreatSignature[] = [
      {
        signatureId: 'sql_injection_1',
        name: 'SQL Injection Attempt',
        description: 'Detects common SQL injection patterns',
        severity: 'high',
        category: 'injection',
        patterns: [{
          type: 'regex',
          pattern: /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDELETE\b|\bDROP\b).*(\bFROM\b|\bWHERE\b|\bOR\b|\bAND\b)/i,
          confidence: 0.8
        }],
        mitigations: ['sanitize_input', 'use_prepared_statements', 'block_request'],
        lastUpdated: Date.now()
      },
      {
        signatureId: 'xss_attempt_1',
        name: 'Cross-Site Scripting Attempt',
        description: 'Detects XSS attack patterns',
        severity: 'medium',
        category: 'injection',
        patterns: [{
          type: 'regex',
          pattern: /<script[^>]*>.*?<\/script>/i,
          confidence: 0.9
        }],
        mitigations: ['encode_output', 'validate_input', 'content_security_policy'],
        lastUpdated: Date.now()
      }
    ];

    for (const signature of signatures) {
      this.threatSignatures.set(signature.signatureId, signature);
    }
  }

  private initializeMLModels(): void {
    // Initialize ML models
    const models: MLThreatModel[] = [
      {
        modelId: 'anomaly_detector_v1',
        modelType: 'anomaly_detection',
        threatCategories: ['behavioral_anomaly', 'access_pattern_anomaly'],
        features: ['request_frequency', 'request_size', 'response_time', 'error_rate'],
        accuracy: 0.85,
        lastTrained: Date.now(),
        version: '1.0.0'
      },
      {
        modelId: 'threat_classifier_v1',
        modelType: 'classification',
        threatCategories: ['malware', 'phishing', 'injection', 'brute_force'],
        features: ['payload_entropy', 'request_headers', 'user_agent', 'referrer'],
        accuracy: 0.92,
        lastTrained: Date.now(),
        version: '1.0.0'
      }
    ];

    for (const model of models) {
      this.mlModels.set(model.modelId, model);
    }
  }

  private setupRealTimeMonitoring(): void {
    // Setup real-time monitoring
    this.realTimeAnalyzer.on('suspiciousActivity', (activity) => {
      this.emit('suspiciousActivity', activity);
    });

    this.realTimeAnalyzer.on('attackPattern', (pattern) => {
      this.emit('attackPattern', pattern);
    });
  }

  private matchRegexPattern(data: any, pattern: string): boolean {
    const regex = new RegExp(pattern, 'i');
    const dataString = JSON.stringify(data);
    return regex.test(dataString);
  }

  private async matchBehavioralPattern(data: any, context: any, pattern: any): Promise<{ isMatch: boolean; confidence: number }> {
    // Simplified behavioral pattern matching
    return { isMatch: Math.random() > 0.7, confidence: Math.random() };
  }

  private async matchStatisticalPattern(data: any, context: any, pattern: any): Promise<{ isMatch: boolean; confidence: number }> {
    // Simplified statistical pattern matching
    return { isMatch: Math.random() > 0.8, confidence: Math.random() };
  }

  private extractFeatures(data: any, context: any, featureNames: string[]): Record<string, number> {
    const features: Record<string, number> = {};
    
    for (const featureName of featureNames) {
      switch (featureName) {
        case 'request_frequency':
          features[featureName] = Math.random() * 100;
          break;
        case 'request_size':
          features[featureName] = JSON.stringify(data).length;
          break;
        case 'response_time':
          features[featureName] = Math.random() * 1000;
          break;
        case 'error_rate':
          features[featureName] = Math.random();
          break;
        default:
          features[featureName] = Math.random();
      }
    }
    
    return features;
  }

  private async evaluateAnomalyModel(model: MLThreatModel, features: Record<string, number>): Promise<number> {
    // Simplified anomaly detection
    const featureValues = Object.values(features);
    const mean = featureValues.reduce((a, b) => a + b, 0) / featureValues.length;
    const variance = featureValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / featureValues.length;
    
    // Higher variance indicates more anomalous behavior
    return Math.min(variance / 100, 1.0);
  }

  private extractBehavioralFeatures(data: any, context: any): any {
    return {
      requestTime: Date.now(),
      requestSize: JSON.stringify(data).length,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress
    };
  }

  private calculateBehavioralDeviation(current: any, profile: any): number {
    // Simplified behavioral deviation calculation
    return Math.random();
  }

  private extractIndicators(data: any, context: any): Array<{ type: string; value: string }> {
    const indicators: Array<{ type: string; value: string }> = [];
    
    if (context.ipAddress) {
      indicators.push({ type: 'ip', value: context.ipAddress });
    }
    
    // Extract URLs, domains, hashes, etc. from data
    const dataString = JSON.stringify(data);
    const urlPattern = /https?:\/\/[^\s]+/g;
    const urls = dataString.match(urlPattern) || [];
    
    for (const url of urls) {
      indicators.push({ type: 'url', value: url });
    }
    
    return indicators;
  }

  private extractDeepFeatures(data: any, context: any): number[] {
    // Extract features for deep learning model
    const features: number[] = [];
    
    // Convert data to numerical features
    const dataString = JSON.stringify(data);
    for (let i = 0; i < Math.min(dataString.length, 100); i++) {
      features.push(dataString.charCodeAt(i) / 255);
    }
    
    // Pad or truncate to fixed size
    while (features.length < 100) {
      features.push(0);
    }
    
    return features.slice(0, 100);
  }

  private async evaluateDeepLearningModel(model: MLThreatModel, features: number[]): Promise<Record<string, number>> {
    // Simplified deep learning evaluation
    const probabilities: Record<string, number> = {};
    
    for (const category of model.threatCategories) {
      probabilities[category] = Math.random();
    }
    
    return probabilities;
  }

  private async updateBehavioralProfile(userId: string, data: any, detections: ThreatDetectionResult[]): Promise<void> {
    const profile = this.behavioralProfiles.get(userId) || {
      requestHistory: [],
      averageRequestSize: 0,
      commonUserAgents: [],
      commonIPs: [],
      threatHistory: []
    };

    // Update profile with new data
    profile.requestHistory.push({
      timestamp: Date.now(),
      size: JSON.stringify(data).length,
      detections: detections.length
    });

    // Keep only recent history
    profile.requestHistory = profile.requestHistory.slice(-100);

    // Update averages
    profile.averageRequestSize = profile.requestHistory.reduce((sum, req) => sum + req.size, 0) / profile.requestHistory.length;

    this.behavioralProfiles.set(userId, profile);
  }

  private async performModelTraining(model: MLThreatModel, trainingData: any[], labels: any[]): Promise<number> {
    // Simplified model training - in production would use actual ML libraries
    return 0.8 + Math.random() * 0.2; // Return accuracy between 0.8 and 1.0
  }

  private calculateRiskScore(severity: string, confidence: number): number {
    const severityWeights = { low: 0.25, medium: 0.5, high: 0.75, critical: 1.0 };
    return (severityWeights[severity as keyof typeof severityWeights] || 0.5) * confidence;
  }

  private scoresToSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.9) return 'critical';
    if (score >= 0.7) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  }

  private confidenceToSeverity(confidence: number): 'low' | 'medium' | 'high' | 'critical' {
    return this.scoresToSeverity(confidence);
  }

  private getRecommendedActions(threatType: string): string[] {
    const actionMap: Record<string, string[]> = {
      'malware': ['quarantine_file', 'scan_system', 'update_antivirus'],
      'phishing': ['block_url', 'warn_user', 'report_to_authorities'],
      'injection': ['sanitize_input', 'block_request', 'audit_code'],
      'brute_force': ['rate_limit', 'block_ip', 'require_captcha'],
      'data_exfiltration': ['block_transfer', 'investigate_user', 'audit_access']
    };

    return actionMap[threatType] || ['investigate', 'monitor'];
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  private generateDetectionId(): string {
    return `threat_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }
}

/**
 * Real-time analyzer for continuous monitoring
 */
class RealTimeAnalyzer extends EventEmitter {
  private activityBuffer: any[] = [];
  private analysisTimer?: NodeJS.Timeout;

  constructor() {
    super();
    this.startAnalysis();
  }

  private startAnalysis(): void {
    this.analysisTimer = setInterval(() => {
      this.analyzeBuffer();
    }, 5000); // Analyze every 5 seconds
  }

  private analyzeBuffer(): void {
    if (this.activityBuffer.length === 0) return;

    // Analyze patterns in the buffer
    const suspiciousPatterns = this.detectSuspiciousPatterns(this.activityBuffer);
    
    for (const pattern of suspiciousPatterns) {
      this.emit('suspiciousActivity', pattern);
    }

    // Clear buffer
    this.activityBuffer = [];
  }

  private detectSuspiciousPatterns(activities: any[]): any[] {
    const patterns: any[] = [];

    // Detect rapid requests from same IP
    const ipCounts = new Map<string, number>();
    for (const activity of activities) {
      if (activity.ipAddress) {
        ipCounts.set(activity.ipAddress, (ipCounts.get(activity.ipAddress) || 0) + 1);
      }
    }

    for (const [ip, count] of ipCounts) {
      if (count > 100) { // More than 100 requests in 5 seconds
        patterns.push({
          type: 'rapid_requests',
          source: ip,
          count,
          severity: 'high'
        });
      }
    }

    return patterns;
  }

  addActivity(activity: any): void {
    this.activityBuffer.push({
      ...activity,
      timestamp: Date.now()
    });
  }

  cleanup(): void {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
    }
  }
}
/**
 * Performance Degradation Detector for AI Integration Load Testing
 * 
 * Detects performance degradation patterns in real-time during load testing,
 * including response time increases, throughput decreases, and error rate spikes.
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

export interface DegradationDetectorConfig {
  windowSize: number; // Number of samples to analyze
  alertThresholds: DegradationThresholds;
  analysisInterval: number; // milliseconds
  enablePredictiveAnalysis: boolean;
  enableAnomalyDetection: boolean;
}

export interface DegradationThresholds {
  responseTime: {
    warningIncrease: number; // percentage
    criticalIncrease: number; // percentage
  };
  throughput: {
    warningDecrease: number; // percentage
    criticalDecrease: number; // percentage
  };
  errorRate: {
    warningIncrease: number; // percentage
    criticalIncrease: number; // percentage
  };
  latency: {
    warningIncrease: number; // percentage
    criticalIncrease: number; // percentage
  };
}

export interface PerformanceDataPoint {
  timestamp: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
  latency: number;
  activeConnections: number;
  queueSize: number;
  cpuUsage?: number;
  memoryUsage?: number;
}

export interface DegradationAlert {
  timestamp: number;
  severity: 'warning' | 'critical';
  type: 'response_time' | 'throughput' | 'error_rate' | 'latency' | 'anomaly';
  message: string;
  currentValue: number;
  baselineValue: number;
  degradationPercentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number; // 0-1
  recommendations: string[];
  affectedMetrics: string[];
}

export interface PerformanceTrend {
  metric: string;
  direction: 'improving' | 'degrading' | 'stable';
  rate: number; // change per unit time
  confidence: number; // 0-1
  prediction: {
    nextValue: number;
    timeToThreshold: number; // milliseconds
    confidence: number;
  };
}

export interface AnomalyDetection {
  timestamp: number;
  metric: string;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export class PerformanceDegradationDetector extends EventEmitter {
  private config: DegradationDetectorConfig;
  private dataPoints: PerformanceDataPoint[] = [];
  private baseline: PerformanceDataPoint | null = null;
  private alerts: DegradationAlert[] = [];
  private anomalies: AnomalyDetection[] = [];
  private isRunning: boolean = false;
  private analysisInterval?: NodeJS.Timeout;
  private movingAverages: Map<string, number[]> = new Map();

  constructor(config: DegradationDetectorConfig) {
    super();
    this.config = config;
    this.initializeMovingAverages();
  }

  /**
   * Start performance degradation detection
   */
  start(): void {
    if (this.isRunning) {
      throw new Error('Performance degradation detector is already running');
    }

    this.isRunning = true;
    this.dataPoints = [];
    this.alerts = [];
    this.anomalies = [];
    this.baseline = null;

    console.log('Starting performance degradation detection...');

    // Start analysis loop
    this.analysisInterval = setInterval(() => {
      this.performAnalysis();
    }, this.config.analysisInterval);

    this.emit('detectionStarted');
  }

  /**
   * Stop performance degradation detection
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = undefined;
    }

    console.log('Performance degradation detection stopped');
    this.emit('detectionStopped', {
      totalDataPoints: this.dataPoints.length,
      totalAlerts: this.alerts.length,
      totalAnomalies: this.anomalies.length
    });
  }

  /**
   * Add a performance data point
   */
  addDataPoint(dataPoint: PerformanceDataPoint): void {
    this.dataPoints.push(dataPoint);

    // Set baseline from first few data points
    if (!this.baseline && this.dataPoints.length >= 10) {
      this.baseline = this.calculateBaseline();
      this.emit('baselineEstablished', this.baseline);
    }

    // Keep only the configured window size
    if (this.dataPoints.length > this.config.windowSize) {
      this.dataPoints.shift();
    }

    // Update moving averages
    this.updateMovingAverages(dataPoint);

    // Emit data point event
    this.emit('dataPointAdded', dataPoint);
  }

  /**
   * Get current performance trends
   */
  getPerformanceTrends(): PerformanceTrend[] {
    if (this.dataPoints.length < 10) {
      return [];
    }

    const trends: PerformanceTrend[] = [];

    // Analyze response time trend
    trends.push(this.analyzeTrend('responseTime', this.dataPoints.map(d => d.responseTime)));

    // Analyze throughput trend
    trends.push(this.analyzeTrend('throughput', this.dataPoints.map(d => d.throughput)));

    // Analyze error rate trend
    trends.push(this.analyzeTrend('errorRate', this.dataPoints.map(d => d.errorRate)));

    // Analyze latency trend
    trends.push(this.analyzeTrend('latency', this.dataPoints.map(d => d.latency)));

    return trends;
  }

  /**
   * Get all alerts
   */
  getAlerts(): DegradationAlert[] {
    return [...this.alerts];
  }

  /**
   * Get all anomalies
   */
  getAnomalies(): AnomalyDetection[] {
    return [...this.anomalies];
  }

  /**
   * Get current performance summary
   */
  getPerformanceSummary(): any {
    if (this.dataPoints.length === 0) {
      return null;
    }

    const latest = this.dataPoints[this.dataPoints.length - 1];
    const trends = this.getPerformanceTrends();

    return {
      current: latest,
      baseline: this.baseline,
      trends,
      alerts: this.alerts.length,
      anomalies: this.anomalies.length,
      degradationScore: this.calculateDegradationScore()
    };
  }

  /**
   * Initialize moving averages
   */
  private initializeMovingAverages(): void {
    const metrics = ['responseTime', 'throughput', 'errorRate', 'latency'];
    for (const metric of metrics) {
      this.movingAverages.set(metric, []);
    }
  }

  /**
   * Update moving averages
   */
  private updateMovingAverages(dataPoint: PerformanceDataPoint): void {
    const windowSize = Math.min(20, this.config.windowSize); // Use smaller window for moving averages

    // Update response time moving average
    this.updateMovingAverage('responseTime', dataPoint.responseTime, windowSize);

    // Update throughput moving average
    this.updateMovingAverage('throughput', dataPoint.throughput, windowSize);

    // Update error rate moving average
    this.updateMovingAverage('errorRate', dataPoint.errorRate, windowSize);

    // Update latency moving average
    this.updateMovingAverage('latency', dataPoint.latency, windowSize);
  }

  /**
   * Update a specific moving average
   */
  private updateMovingAverage(metric: string, value: number, windowSize: number): void {
    const values = this.movingAverages.get(metric) || [];
    values.push(value);

    if (values.length > windowSize) {
      values.shift();
    }

    this.movingAverages.set(metric, values);
  }

  /**
   * Calculate baseline from initial data points
   */
  private calculateBaseline(): PerformanceDataPoint {
    const initialPoints = this.dataPoints.slice(0, 10);

    return {
      timestamp: initialPoints[0].timestamp,
      responseTime: this.calculateAverage(initialPoints.map(p => p.responseTime)),
      throughput: this.calculateAverage(initialPoints.map(p => p.throughput)),
      errorRate: this.calculateAverage(initialPoints.map(p => p.errorRate)),
      latency: this.calculateAverage(initialPoints.map(p => p.latency)),
      activeConnections: this.calculateAverage(initialPoints.map(p => p.activeConnections)),
      queueSize: this.calculateAverage(initialPoints.map(p => p.queueSize)),
      cpuUsage: initialPoints[0].cpuUsage,
      memoryUsage: initialPoints[0].memoryUsage
    };
  }

  /**
   * Perform comprehensive performance analysis
   */
  private performAnalysis(): void {
    if (!this.baseline || this.dataPoints.length < 5) {
      return;
    }

    // Check for degradation patterns
    this.checkResponseTimeDegradation();
    this.checkThroughputDegradation();
    this.checkErrorRateIncrease();
    this.checkLatencyDegradation();

    // Perform anomaly detection if enabled
    if (this.config.enableAnomalyDetection) {
      this.performAnomalyDetection();
    }

    // Perform predictive analysis if enabled
    if (this.config.enablePredictiveAnalysis) {
      this.performPredictiveAnalysis();
    }
  }

  /**
   * Check for response time degradation
   */
  private checkResponseTimeDegradation(): void {
    const currentAvg = this.getMovingAverage('responseTime');
    if (!currentAvg || !this.baseline) return;

    const degradationPercentage = ((currentAvg - this.baseline.responseTime) / this.baseline.responseTime) * 100;

    if (degradationPercentage >= this.config.alertThresholds.responseTime.criticalIncrease) {
      this.createAlert({
        severity: 'critical',
        type: 'response_time',
        message: `Critical response time degradation: ${degradationPercentage.toFixed(2)}% increase`,
        currentValue: currentAvg,
        baselineValue: this.baseline.responseTime,
        degradationPercentage,
        recommendations: [
          'Implement response caching',
          'Optimize database queries',
          'Scale horizontally',
          'Add connection pooling'
        ],
        affectedMetrics: ['responseTime', 'userExperience']
      });
    } else if (degradationPercentage >= this.config.alertThresholds.responseTime.warningIncrease) {
      this.createAlert({
        severity: 'warning',
        type: 'response_time',
        message: `Response time degradation detected: ${degradationPercentage.toFixed(2)}% increase`,
        currentValue: currentAvg,
        baselineValue: this.baseline.responseTime,
        degradationPercentage,
        recommendations: [
          'Monitor response time trends',
          'Review recent code changes',
          'Check system resources'
        ],
        affectedMetrics: ['responseTime']
      });
    }
  }

  /**
   * Check for throughput degradation
   */
  private checkThroughputDegradation(): void {
    const currentAvg = this.getMovingAverage('throughput');
    if (!currentAvg || !this.baseline) return;

    const degradationPercentage = ((this.baseline.throughput - currentAvg) / this.baseline.throughput) * 100;

    if (degradationPercentage >= this.config.alertThresholds.throughput.criticalDecrease) {
      this.createAlert({
        severity: 'critical',
        type: 'throughput',
        message: `Critical throughput degradation: ${degradationPercentage.toFixed(2)}% decrease`,
        currentValue: currentAvg,
        baselineValue: this.baseline.throughput,
        degradationPercentage,
        recommendations: [
          'Scale horizontally immediately',
          'Implement load balancing',
          'Optimize request processing',
          'Add circuit breakers'
        ],
        affectedMetrics: ['throughput', 'capacity']
      });
    } else if (degradationPercentage >= this.config.alertThresholds.throughput.warningDecrease) {
      this.createAlert({
        severity: 'warning',
        type: 'throughput',
        message: `Throughput degradation detected: ${degradationPercentage.toFixed(2)}% decrease`,
        currentValue: currentAvg,
        baselineValue: this.baseline.throughput,
        degradationPercentage,
        recommendations: [
          'Monitor throughput trends',
          'Check for bottlenecks',
          'Review system capacity'
        ],
        affectedMetrics: ['throughput']
      });
    }
  }

  /**
   * Check for error rate increase
   */
  private checkErrorRateIncrease(): void {
    const currentAvg = this.getMovingAverage('errorRate');
    if (!currentAvg || !this.baseline) return;

    const increase = currentAvg - this.baseline.errorRate;
    const degradationPercentage = this.baseline.errorRate > 0 
      ? (increase / this.baseline.errorRate) * 100 
      : increase * 100; // If baseline is 0, treat as percentage points

    if (increase >= this.config.alertThresholds.errorRate.criticalIncrease) {
      this.createAlert({
        severity: 'critical',
        type: 'error_rate',
        message: `Critical error rate increase: ${increase.toFixed(2)}% points`,
        currentValue: currentAvg,
        baselineValue: this.baseline.errorRate,
        degradationPercentage,
        recommendations: [
          'Implement circuit breakers',
          'Add retry mechanisms',
          'Review error handling',
          'Check external dependencies'
        ],
        affectedMetrics: ['errorRate', 'reliability']
      });
    } else if (increase >= this.config.alertThresholds.errorRate.warningIncrease) {
      this.createAlert({
        severity: 'warning',
        type: 'error_rate',
        message: `Error rate increase detected: ${increase.toFixed(2)}% points`,
        currentValue: currentAvg,
        baselineValue: this.baseline.errorRate,
        degradationPercentage,
        recommendations: [
          'Monitor error patterns',
          'Review recent deployments',
          'Check system health'
        ],
        affectedMetrics: ['errorRate']
      });
    }
  }

  /**
   * Check for latency degradation
   */
  private checkLatencyDegradation(): void {
    const currentAvg = this.getMovingAverage('latency');
    if (!currentAvg || !this.baseline) return;

    const degradationPercentage = ((currentAvg - this.baseline.latency) / this.baseline.latency) * 100;

    if (degradationPercentage >= this.config.alertThresholds.latency.criticalIncrease) {
      this.createAlert({
        severity: 'critical',
        type: 'latency',
        message: `Critical latency degradation: ${degradationPercentage.toFixed(2)}% increase`,
        currentValue: currentAvg,
        baselineValue: this.baseline.latency,
        degradationPercentage,
        recommendations: [
          'Optimize network configuration',
          'Implement CDN',
          'Review geographic distribution',
          'Check network infrastructure'
        ],
        affectedMetrics: ['latency', 'networkPerformance']
      });
    } else if (degradationPercentage >= this.config.alertThresholds.latency.warningIncrease) {
      this.createAlert({
        severity: 'warning',
        type: 'latency',
        message: `Latency degradation detected: ${degradationPercentage.toFixed(2)}% increase`,
        currentValue: currentAvg,
        baselineValue: this.baseline.latency,
        degradationPercentage,
        recommendations: [
          'Monitor network latency',
          'Check connection quality',
          'Review routing configuration'
        ],
        affectedMetrics: ['latency']
      });
    }
  }

  /**
   * Perform anomaly detection
   */
  private performAnomalyDetection(): void {
    const metrics = ['responseTime', 'throughput', 'errorRate', 'latency'];

    for (const metric of metrics) {
      const values = this.movingAverages.get(metric);
      if (!values || values.length < 10) continue;

      const anomaly = this.detectAnomaly(metric, values);
      if (anomaly) {
        this.anomalies.push(anomaly);
        this.emit('anomalyDetected', anomaly);
      }
    }
  }

  /**
   * Detect anomaly in metric values
   */
  private detectAnomaly(metric: string, values: number[]): AnomalyDetection | null {
    if (values.length < 10) return null;

    const recent = values.slice(-5); // Last 5 values
    const historical = values.slice(0, -5); // Historical values

    const historicalMean = this.calculateAverage(historical);
    const historicalStd = this.calculateStandardDeviation(historical, historicalMean);
    const recentMean = this.calculateAverage(recent);

    // Z-score based anomaly detection
    const zScore = Math.abs((recentMean - historicalMean) / historicalStd);
    
    if (zScore > 3) { // 3 standard deviations
      return {
        timestamp: performance.now(),
        metric,
        value: recentMean,
        expectedValue: historicalMean,
        deviation: zScore,
        severity: zScore > 4 ? 'high' : zScore > 3.5 ? 'medium' : 'low',
        description: `${metric} shows anomalous behavior with z-score of ${zScore.toFixed(2)}`
      };
    }

    return null;
  }

  /**
   * Perform predictive analysis
   */
  private performPredictiveAnalysis(): void {
    const trends = this.getPerformanceTrends();
    
    for (const trend of trends) {
      if (trend.direction === 'degrading' && trend.confidence > 0.7) {
        // Predict when threshold will be reached
        const timeToThreshold = this.predictTimeToThreshold(trend);
        
        if (timeToThreshold > 0 && timeToThreshold < 300000) { // Less than 5 minutes
          this.emit('predictiveAlert', {
            metric: trend.metric,
            timeToThreshold,
            currentTrend: trend,
            message: `${trend.metric} is predicted to reach critical threshold in ${(timeToThreshold / 1000).toFixed(0)} seconds`
          });
        }
      }
    }
  }

  /**
   * Predict time to reach threshold
   */
  private predictTimeToThreshold(trend: PerformanceTrend): number {
    // Simplified linear prediction
    // In a real implementation, you might use more sophisticated models
    
    const currentValue = trend.prediction.nextValue;
    let threshold = 0;

    switch (trend.metric) {
      case 'responseTime':
        threshold = this.baseline!.responseTime * (1 + this.config.alertThresholds.responseTime.criticalIncrease / 100);
        break;
      case 'throughput':
        threshold = this.baseline!.throughput * (1 - this.config.alertThresholds.throughput.criticalDecrease / 100);
        break;
      case 'errorRate':
        threshold = this.baseline!.errorRate + this.config.alertThresholds.errorRate.criticalIncrease;
        break;
      case 'latency':
        threshold = this.baseline!.latency * (1 + this.config.alertThresholds.latency.criticalIncrease / 100);
        break;
    }

    if (trend.rate === 0) return -1;

    const timeToThreshold = (threshold - currentValue) / trend.rate;
    return timeToThreshold > 0 ? timeToThreshold * 1000 : -1; // Convert to milliseconds
  }

  /**
   * Create and emit an alert
   */
  private createAlert(alertData: Partial<DegradationAlert>): void {
    const alert: DegradationAlert = {
      timestamp: performance.now(),
      trend: this.determineTrend(alertData.type!),
      confidence: this.calculateConfidence(alertData.type!),
      ...alertData
    } as DegradationAlert;

    this.alerts.push(alert);
    this.emit('degradationAlert', alert);
  }

  /**
   * Determine trend direction for a metric
   */
  private determineTrend(type: string): 'increasing' | 'decreasing' | 'stable' {
    const values = this.movingAverages.get(type === 'response_time' ? 'responseTime' : type);
    if (!values || values.length < 5) return 'stable';

    const recent = values.slice(-3);
    const earlier = values.slice(-6, -3);

    const recentAvg = this.calculateAverage(recent);
    const earlierAvg = this.calculateAverage(earlier);

    const change = (recentAvg - earlierAvg) / earlierAvg;

    if (Math.abs(change) < 0.05) return 'stable';
    return change > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Calculate confidence level for an alert
   */
  private calculateConfidence(type: string): number {
    const values = this.movingAverages.get(type === 'response_time' ? 'responseTime' : type);
    if (!values || values.length < 5) return 0.5;

    // Calculate confidence based on data consistency and sample size
    const std = this.calculateStandardDeviation(values);
    const mean = this.calculateAverage(values);
    const cv = std / mean; // Coefficient of variation

    // Lower coefficient of variation = higher confidence
    const confidence = Math.max(0.1, Math.min(1.0, 1 - cv));
    
    // Adjust for sample size
    const sampleSizeAdjustment = Math.min(1.0, values.length / 20);
    
    return confidence * sampleSizeAdjustment;
  }

  /**
   * Get moving average for a metric
   */
  private getMovingAverage(metric: string): number | null {
    const values = this.movingAverages.get(metric);
    if (!values || values.length === 0) return null;
    
    return this.calculateAverage(values);
  }

  /**
   * Analyze trend for a metric
   */
  private analyzeTrend(metric: string, values: number[]): PerformanceTrend {
    if (values.length < 5) {
      return {
        metric,
        direction: 'stable',
        rate: 0,
        confidence: 0,
        prediction: { nextValue: 0, timeToThreshold: -1, confidence: 0 }
      };
    }

    // Linear regression
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const slope = this.calculateSlope(x, y);
    const intercept = this.calculateIntercept(x, y, slope);
    const correlation = this.calculateCorrelation(x, y);

    // Determine direction
    let direction: 'improving' | 'degrading' | 'stable';
    if (Math.abs(slope) < 0.01) {
      direction = 'stable';
    } else if (metric === 'throughput') {
      direction = slope > 0 ? 'improving' : 'degrading';
    } else {
      direction = slope > 0 ? 'degrading' : 'improving';
    }

    // Predict next value
    const nextValue = slope * n + intercept;

    return {
      metric,
      direction,
      rate: slope,
      confidence: Math.abs(correlation),
      prediction: {
        nextValue,
        timeToThreshold: -1, // Would be calculated based on specific thresholds
        confidence: Math.abs(correlation)
      }
    };
  }

  /**
   * Calculate degradation score (0-100)
   */
  private calculateDegradationScore(): number {
    if (!this.baseline || this.dataPoints.length === 0) return 0;

    const latest = this.dataPoints[this.dataPoints.length - 1];
    let score = 0;

    // Response time degradation (25% weight)
    const rtDegradation = Math.max(0, (latest.responseTime - this.baseline.responseTime) / this.baseline.responseTime * 100);
    score += Math.min(25, rtDegradation * 0.25);

    // Throughput degradation (25% weight)
    const tpDegradation = Math.max(0, (this.baseline.throughput - latest.throughput) / this.baseline.throughput * 100);
    score += Math.min(25, tpDegradation * 0.25);

    // Error rate increase (30% weight)
    const erIncrease = Math.max(0, latest.errorRate - this.baseline.errorRate);
    score += Math.min(30, erIncrease * 3);

    // Latency degradation (20% weight)
    const latDegradation = Math.max(0, (latest.latency - this.baseline.latency) / this.baseline.latency * 100);
    score += Math.min(20, latDegradation * 0.2);

    return Math.min(100, score);
  }

  /**
   * Utility functions
   */
  private calculateAverage(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateStandardDeviation(values: number[], mean?: number): number {
    const avg = mean || this.calculateAverage(values);
    const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
    return Math.sqrt(this.calculateAverage(squaredDiffs));
  }

  private calculateSlope(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private calculateIntercept(x: number[], y: number[], slope: number): number {
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    return (sumY - slope * sumX) / x.length;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
    const denomX = Math.sqrt(x.reduce((sum, xi) => sum + (xi - meanX) ** 2, 0));
    const denomY = Math.sqrt(y.reduce((sum, yi) => sum + (yi - meanY) ** 2, 0));

    return numerator / (denomX * denomY);
  }
}
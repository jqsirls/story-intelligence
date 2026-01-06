/**
 * Bottleneck Identification Tool for AI Integration Load Testing
 * 
 * Identifies performance bottlenecks in the AI integration system by analyzing
 * various metrics and correlating them to pinpoint the root cause of performance issues.
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

export interface BottleneckAnalysisConfig {
  analysisInterval: number; // milliseconds
  correlationThreshold: number; // 0-1
  bottleneckThresholds: BottleneckThresholds;
  enableRootCauseAnalysis: boolean;
  enablePredictiveBottleneckDetection: boolean;
}

export interface BottleneckThresholds {
  cpu: {
    warning: number; // percentage
    critical: number; // percentage
  };
  memory: {
    warning: number; // percentage
    critical: number; // percentage
  };
  network: {
    latencyWarning: number; // milliseconds
    latencyCritical: number; // milliseconds
    bandwidthWarning: number; // bytes per second
    bandwidthCritical: number; // bytes per second
  };
  database: {
    connectionPoolWarning: number; // percentage utilization
    connectionPoolCritical: number; // percentage utilization
    queryTimeWarning: number; // milliseconds
    queryTimeCritical: number; // milliseconds
  };
  application: {
    responseTimeWarning: number; // milliseconds
    responseTimeCritical: number; // milliseconds
    throughputWarning: number; // requests per second
    errorRateWarning: number; // percentage
  };
}

export interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    loadAverage: number[];
    processes: number;
    threads: number;
  };
  memory: {
    usage: number;
    available: number;
    swapUsage: number;
  };
  network: {
    latency: number;
    bandwidth: number;
    packetsLost: number;
    connections: number;
  };
  database: {
    connectionPoolUtilization: number;
    activeConnections: number;
    averageQueryTime: number;
    slowQueries: number;
  };
  application: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    activeRequests: number;
    queueSize: number;
  };
  aiServices: {
    openaiResponseTime: number;
    elevenlabsResponseTime: number;
    personalityAgentResponseTime: number;
    openaiErrorRate: number;
    elevenlabsErrorRate: number;
    personalityAgentErrorRate: number;
  };
}

export interface BottleneckIdentification {
  timestamp: number;
  component: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'cpu' | 'memory' | 'network' | 'database' | 'application' | 'ai_service';
  description: string;
  metrics: Record<string, number>;
  impact: BottleneckImpact;
  rootCause: RootCauseAnalysis;
  recommendations: string[];
  correlatedComponents: string[];
}

export interface BottleneckImpact {
  affectedMetrics: string[];
  performanceDegradation: number; // percentage
  estimatedUserImpact: 'low' | 'medium' | 'high' | 'critical';
  businessImpact: string;
}

export interface RootCauseAnalysis {
  primaryCause: string;
  contributingFactors: string[];
  evidenceScore: number; // 0-1
  confidence: number; // 0-1
  timeline: RootCauseEvent[];
}

export interface RootCauseEvent {
  timestamp: number;
  event: string;
  impact: string;
  correlation: number;
}

export interface BottleneckPrediction {
  component: string;
  predictedBottleneck: string;
  timeToBottleneck: number; // milliseconds
  confidence: number; // 0-1
  preventiveActions: string[];
}

export interface CorrelationAnalysis {
  metric1: string;
  metric2: string;
  correlation: number;
  significance: number;
  relationship: 'positive' | 'negative' | 'none';
}

export class BottleneckIdentificationTool extends EventEmitter {
  private config: BottleneckAnalysisConfig;
  private metricsHistory: SystemMetrics[] = [];
  private identifiedBottlenecks: BottleneckIdentification[] = [];
  private correlationMatrix: Map<string, Map<string, number>> = new Map();
  private isRunning: boolean = false;
  private analysisInterval?: NodeJS.Timeout;
  private metricExtractors: Map<string, (metrics: SystemMetrics) => number> = new Map();

  constructor(config: BottleneckAnalysisConfig) {
    super();
    this.config = config;
    this.initializeMetricExtractors();
  }

  /**
   * Start bottleneck identification
   */
  start(): void {
    if (this.isRunning) {
      throw new Error('Bottleneck identification is already running');
    }

    this.isRunning = true;
    this.metricsHistory = [];
    this.identifiedBottlenecks = [];
    this.correlationMatrix.clear();

    console.log('Starting bottleneck identification...');

    // Start analysis loop
    this.analysisInterval = setInterval(() => {
      this.performBottleneckAnalysis();
    }, this.config.analysisInterval);

    this.emit('analysisStarted');
  }

  /**
   * Stop bottleneck identification
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

    console.log('Bottleneck identification stopped');
    this.emit('analysisStopped', {
      totalMetrics: this.metricsHistory.length,
      totalBottlenecks: this.identifiedBottlenecks.length
    });
  }

  /**
   * Add system metrics for analysis
   */
  addMetrics(metrics: SystemMetrics): void {
    this.metricsHistory.push(metrics);

    // Keep only recent history (configurable window)
    const maxHistory = 1000; // Keep last 1000 data points
    if (this.metricsHistory.length > maxHistory) {
      this.metricsHistory.shift();
    }

    // Update correlation matrix
    this.updateCorrelationMatrix(metrics);

    this.emit('metricsAdded', metrics);
  }

  /**
   * Get identified bottlenecks
   */
  getBottlenecks(): BottleneckIdentification[] {
    return [...this.identifiedBottlenecks];
  }

  /**
   * Get correlation analysis
   */
  getCorrelationAnalysis(): CorrelationAnalysis[] {
    const correlations: CorrelationAnalysis[] = [];

    for (const [metric1, correlationMap] of this.correlationMatrix) {
      for (const [metric2, correlation] of correlationMap) {
        if (metric1 !== metric2 && Math.abs(correlation) >= this.config.correlationThreshold) {
          correlations.push({
            metric1,
            metric2,
            correlation,
            significance: Math.abs(correlation),
            relationship: correlation > 0 ? 'positive' : 'negative'
          });
        }
      }
    }

    return correlations.sort((a, b) => b.significance - a.significance);
  }

  /**
   * Get bottleneck predictions
   */
  getBottleneckPredictions(): BottleneckPrediction[] {
    if (!this.config.enablePredictiveBottleneckDetection || this.metricsHistory.length < 20) {
      return [];
    }

    const predictions: BottleneckPrediction[] = [];

    // Analyze trends for each component
    const components = ['cpu', 'memory', 'network', 'database', 'application'];
    
    for (const component of components) {
      const prediction = this.predictBottleneck(component);
      if (prediction) {
        predictions.push(prediction);
      }
    }

    return predictions.sort((a, b) => a.timeToBottleneck - b.timeToBottleneck);
  }

  /**
   * Initialize metric extractors
   */
  private initializeMetricExtractors(): void {
    // CPU metrics
    this.metricExtractors.set('cpu.usage', (m) => m.cpu.usage);
    this.metricExtractors.set('cpu.loadAverage', (m) => m.cpu.loadAverage[0]);
    this.metricExtractors.set('cpu.processes', (m) => m.cpu.processes);

    // Memory metrics
    this.metricExtractors.set('memory.usage', (m) => m.memory.usage);
    this.metricExtractors.set('memory.available', (m) => m.memory.available);
    this.metricExtractors.set('memory.swapUsage', (m) => m.memory.swapUsage);

    // Network metrics
    this.metricExtractors.set('network.latency', (m) => m.network.latency);
    this.metricExtractors.set('network.bandwidth', (m) => m.network.bandwidth);
    this.metricExtractors.set('network.packetsLost', (m) => m.network.packetsLost);

    // Database metrics
    this.metricExtractors.set('database.connectionPoolUtilization', (m) => m.database.connectionPoolUtilization);
    this.metricExtractors.set('database.averageQueryTime', (m) => m.database.averageQueryTime);
    this.metricExtractors.set('database.slowQueries', (m) => m.database.slowQueries);

    // Application metrics
    this.metricExtractors.set('application.responseTime', (m) => m.application.responseTime);
    this.metricExtractors.set('application.throughput', (m) => m.application.throughput);
    this.metricExtractors.set('application.errorRate', (m) => m.application.errorRate);

    // AI Service metrics
    this.metricExtractors.set('aiServices.openaiResponseTime', (m) => m.aiServices.openaiResponseTime);
    this.metricExtractors.set('aiServices.elevenlabsResponseTime', (m) => m.aiServices.elevenlabsResponseTime);
    this.metricExtractors.set('aiServices.personalityAgentResponseTime', (m) => m.aiServices.personalityAgentResponseTime);
  }

  /**
   * Perform comprehensive bottleneck analysis
   */
  private performBottleneckAnalysis(): void {
    if (this.metricsHistory.length < 5) {
      return;
    }

    const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];

    // Analyze each component for bottlenecks
    this.analyzeCpuBottlenecks(latestMetrics);
    this.analyzeMemoryBottlenecks(latestMetrics);
    this.analyzeNetworkBottlenecks(latestMetrics);
    this.analyzeDatabaseBottlenecks(latestMetrics);
    this.analyzeApplicationBottlenecks(latestMetrics);
    this.analyzeAiServiceBottlenecks(latestMetrics);

    // Perform root cause analysis if enabled
    if (this.config.enableRootCauseAnalysis) {
      this.performRootCauseAnalysis();
    }
  }

  /**
   * Analyze CPU bottlenecks
   */
  private analyzeCpuBottlenecks(metrics: SystemMetrics): void {
    const cpuUsage = metrics.cpu.usage;
    const loadAverage = metrics.cpu.loadAverage[0];

    if (cpuUsage >= this.config.bottleneckThresholds.cpu.critical) {
      this.identifyBottleneck({
        component: 'CPU',
        severity: 'critical',
        type: 'cpu',
        description: `Critical CPU usage: ${cpuUsage.toFixed(2)}%`,
        metrics: {
          usage: cpuUsage,
          loadAverage: loadAverage,
          processes: metrics.cpu.processes
        },
        impact: {
          affectedMetrics: ['responseTime', 'throughput'],
          performanceDegradation: this.calculatePerformanceDegradation('cpu', cpuUsage),
          estimatedUserImpact: 'critical',
          businessImpact: 'Severe performance degradation affecting all users'
        },
        recommendations: [
          'Scale horizontally to distribute CPU load',
          'Optimize CPU-intensive operations',
          'Implement request throttling',
          'Review and optimize algorithms'
        ]
      });
    } else if (cpuUsage >= this.config.bottleneckThresholds.cpu.warning) {
      this.identifyBottleneck({
        component: 'CPU',
        severity: 'medium',
        type: 'cpu',
        description: `High CPU usage: ${cpuUsage.toFixed(2)}%`,
        metrics: {
          usage: cpuUsage,
          loadAverage: loadAverage
        },
        impact: {
          affectedMetrics: ['responseTime'],
          performanceDegradation: this.calculatePerformanceDegradation('cpu', cpuUsage),
          estimatedUserImpact: 'medium',
          businessImpact: 'Potential performance impact during peak loads'
        },
        recommendations: [
          'Monitor CPU usage trends',
          'Consider scaling if usage continues to increase',
          'Review recent code changes for CPU optimization'
        ]
      });
    }
  }

  /**
   * Analyze memory bottlenecks
   */
  private analyzeMemoryBottlenecks(metrics: SystemMetrics): void {
    const memoryUsage = metrics.memory.usage;
    const swapUsage = metrics.memory.swapUsage;

    if (memoryUsage >= this.config.bottleneckThresholds.memory.critical || swapUsage > 50) {
      this.identifyBottleneck({
        component: 'Memory',
        severity: 'critical',
        type: 'memory',
        description: `Critical memory usage: ${memoryUsage.toFixed(2)}% (Swap: ${swapUsage.toFixed(2)}%)`,
        metrics: {
          usage: memoryUsage,
          available: metrics.memory.available,
          swapUsage: swapUsage
        },
        impact: {
          affectedMetrics: ['responseTime', 'throughput', 'errorRate'],
          performanceDegradation: this.calculatePerformanceDegradation('memory', memoryUsage),
          estimatedUserImpact: 'critical',
          businessImpact: 'System instability and potential crashes'
        },
        recommendations: [
          'Implement memory pooling',
          'Add memory-based circuit breakers',
          'Scale vertically or horizontally',
          'Review memory leaks and optimize data structures'
        ]
      });
    }
  }

  /**
   * Analyze network bottlenecks
   */
  private analyzeNetworkBottlenecks(metrics: SystemMetrics): void {
    const latency = metrics.network.latency;
    const packetsLost = metrics.network.packetsLost;

    if (latency >= this.config.bottleneckThresholds.network.latencyCritical || packetsLost > 1) {
      this.identifyBottleneck({
        component: 'Network',
        severity: 'high',
        type: 'network',
        description: `Network performance issues: ${latency.toFixed(2)}ms latency, ${packetsLost} packets lost`,
        metrics: {
          latency: latency,
          bandwidth: metrics.network.bandwidth,
          packetsLost: packetsLost,
          connections: metrics.network.connections
        },
        impact: {
          affectedMetrics: ['responseTime', 'userExperience'],
          performanceDegradation: this.calculatePerformanceDegradation('network', latency),
          estimatedUserImpact: 'high',
          businessImpact: 'Poor user experience and potential timeouts'
        },
        recommendations: [
          'Optimize network configuration',
          'Implement CDN for static assets',
          'Review geographic distribution',
          'Check network infrastructure and routing'
        ]
      });
    }
  }

  /**
   * Analyze database bottlenecks
   */
  private analyzeDatabaseBottlenecks(metrics: SystemMetrics): void {
    const connectionPoolUtilization = metrics.database.connectionPoolUtilization;
    const averageQueryTime = metrics.database.averageQueryTime;
    const slowQueries = metrics.database.slowQueries;

    if (connectionPoolUtilization >= this.config.bottleneckThresholds.database.connectionPoolCritical ||
        averageQueryTime >= this.config.bottleneckThresholds.database.queryTimeCritical ||
        slowQueries > 10) {
      
      this.identifyBottleneck({
        component: 'Database',
        severity: 'high',
        type: 'database',
        description: `Database performance issues: ${connectionPoolUtilization.toFixed(2)}% pool utilization, ${averageQueryTime.toFixed(2)}ms avg query time`,
        metrics: {
          connectionPoolUtilization: connectionPoolUtilization,
          averageQueryTime: averageQueryTime,
          slowQueries: slowQueries,
          activeConnections: metrics.database.activeConnections
        },
        impact: {
          affectedMetrics: ['responseTime', 'throughput', 'errorRate'],
          performanceDegradation: this.calculatePerformanceDegradation('database', averageQueryTime),
          estimatedUserImpact: 'high',
          businessImpact: 'Slow response times and potential data access issues'
        },
        recommendations: [
          'Optimize database queries',
          'Increase connection pool size',
          'Implement query caching',
          'Consider database scaling or sharding',
          'Review and optimize database indexes'
        ]
      });
    }
  }

  /**
   * Analyze application bottlenecks
   */
  private analyzeApplicationBottlenecks(metrics: SystemMetrics): void {
    const responseTime = metrics.application.responseTime;
    const throughput = metrics.application.throughput;
    const errorRate = metrics.application.errorRate;
    const queueSize = metrics.application.queueSize;

    if (responseTime >= this.config.bottleneckThresholds.application.responseTimeCritical ||
        throughput <= this.config.bottleneckThresholds.application.throughputWarning ||
        errorRate >= this.config.bottleneckThresholds.application.errorRateWarning ||
        queueSize > 100) {
      
      this.identifyBottleneck({
        component: 'Application',
        severity: 'high',
        type: 'application',
        description: `Application performance issues: ${responseTime.toFixed(2)}ms response time, ${throughput.toFixed(2)} RPS throughput`,
        metrics: {
          responseTime: responseTime,
          throughput: throughput,
          errorRate: errorRate,
          queueSize: queueSize,
          activeRequests: metrics.application.activeRequests
        },
        impact: {
          affectedMetrics: ['userExperience', 'businessMetrics'],
          performanceDegradation: this.calculatePerformanceDegradation('application', responseTime),
          estimatedUserImpact: 'high',
          businessImpact: 'Direct impact on user experience and business operations'
        },
        recommendations: [
          'Implement response caching',
          'Optimize application code',
          'Scale application instances',
          'Implement load balancing',
          'Review and optimize business logic'
        ]
      });
    }
  }

  /**
   * Analyze AI service bottlenecks
   */
  private analyzeAiServiceBottlenecks(metrics: SystemMetrics): void {
    const services = [
      { name: 'OpenAI', responseTime: metrics.aiServices.openaiResponseTime, errorRate: metrics.aiServices.openaiErrorRate },
      { name: 'ElevenLabs', responseTime: metrics.aiServices.elevenlabsResponseTime, errorRate: metrics.aiServices.elevenlabsErrorRate },
      { name: 'PersonalityAgent', responseTime: metrics.aiServices.personalityAgentResponseTime, errorRate: metrics.aiServices.personalityAgentErrorRate }
    ];

    for (const service of services) {
      if (service.responseTime > 5000 || service.errorRate > 5) { // 5 seconds or 5% error rate
        this.identifyBottleneck({
          component: `AI Service - ${service.name}`,
          severity: 'high',
          type: 'ai_service',
          description: `${service.name} performance issues: ${service.responseTime.toFixed(2)}ms response time, ${service.errorRate.toFixed(2)}% error rate`,
          metrics: {
            responseTime: service.responseTime,
            errorRate: service.errorRate
          },
          impact: {
            affectedMetrics: ['aiServicePerformance', 'userExperience'],
            performanceDegradation: this.calculatePerformanceDegradation('ai_service', service.responseTime),
            estimatedUserImpact: 'high',
            businessImpact: 'AI functionality degradation affecting core features'
          },
          recommendations: [
            'Implement AI service circuit breakers',
            'Add retry mechanisms with exponential backoff',
            'Consider alternative AI service providers',
            'Implement request caching for AI responses',
            'Monitor AI service provider status'
          ]
        });
      }
    }
  }

  /**
   * Identify and record a bottleneck
   */
  private identifyBottleneck(bottleneckData: Partial<BottleneckIdentification>): void {
    const bottleneck: BottleneckIdentification = {
      timestamp: performance.now(),
      rootCause: this.performComponentRootCauseAnalysis(bottleneckData.component!),
      correlatedComponents: this.findCorrelatedComponents(bottleneckData.component!),
      ...bottleneckData
    } as BottleneckIdentification;

    this.identifiedBottlenecks.push(bottleneck);
    this.emit('bottleneckIdentified', bottleneck);
  }

  /**
   * Perform root cause analysis for the entire system
   */
  private performRootCauseAnalysis(): void {
    if (this.identifiedBottlenecks.length < 2) {
      return;
    }

    // Analyze patterns in recent bottlenecks
    const recentBottlenecks = this.identifiedBottlenecks.slice(-10);
    const componentCounts = new Map<string, number>();
    
    for (const bottleneck of recentBottlenecks) {
      const count = componentCounts.get(bottleneck.component) || 0;
      componentCounts.set(bottleneck.component, count + 1);
    }

    // Find the most frequent bottleneck component
    let maxCount = 0;
    let primaryBottleneck = '';
    
    for (const [component, count] of componentCounts) {
      if (count > maxCount) {
        maxCount = count;
        primaryBottleneck = component;
      }
    }

    if (maxCount >= 3) { // At least 3 occurrences
      this.emit('rootCauseIdentified', {
        primaryBottleneck,
        frequency: maxCount,
        timeWindow: recentBottlenecks.length,
        recommendation: `Focus optimization efforts on ${primaryBottleneck} as it's the most frequent bottleneck`
      });
    }
  }

  /**
   * Perform root cause analysis for a specific component
   */
  private performComponentRootCauseAnalysis(component: string): RootCauseAnalysis {
    const timeline: RootCauseEvent[] = [];
    const contributingFactors: string[] = [];
    
    // Analyze recent metrics for this component
    const recentMetrics = this.metricsHistory.slice(-20);
    
    // Simple heuristic-based root cause analysis
    let primaryCause = 'Unknown';
    let evidenceScore = 0.5;
    let confidence = 0.5;

    switch (component.toLowerCase()) {
      case 'cpu':
        primaryCause = 'High computational load';
        contributingFactors.push('Increased request volume', 'Inefficient algorithms', 'Resource contention');
        evidenceScore = 0.8;
        confidence = 0.7;
        break;
      
      case 'memory':
        primaryCause = 'Memory leak or excessive allocation';
        contributingFactors.push('Memory leaks', 'Large object allocations', 'Insufficient garbage collection');
        evidenceScore = 0.7;
        confidence = 0.6;
        break;
      
      case 'network':
        primaryCause = 'Network congestion or latency';
        contributingFactors.push('Network congestion', 'Geographic distance', 'Infrastructure issues');
        evidenceScore = 0.6;
        confidence = 0.5;
        break;
      
      case 'database':
        primaryCause = 'Database performance degradation';
        contributingFactors.push('Unoptimized queries', 'Lock contention', 'Index fragmentation');
        evidenceScore = 0.8;
        confidence = 0.7;
        break;
      
      case 'application':
        primaryCause = 'Application logic inefficiency';
        contributingFactors.push('Inefficient code', 'Resource contention', 'External dependency issues');
        evidenceScore = 0.7;
        confidence = 0.6;
        break;
    }

    return {
      primaryCause,
      contributingFactors,
      evidenceScore,
      confidence,
      timeline
    };
  }

  /**
   * Find components correlated with the given component
   */
  private findCorrelatedComponents(component: string): string[] {
    const correlatedComponents: string[] = [];
    const componentMetrics = this.correlationMatrix.get(component);
    
    if (componentMetrics) {
      for (const [otherComponent, correlation] of componentMetrics) {
        if (Math.abs(correlation) >= this.config.correlationThreshold) {
          correlatedComponents.push(otherComponent);
        }
      }
    }

    return correlatedComponents;
  }

  /**
   * Update correlation matrix with new metrics
   */
  private updateCorrelationMatrix(metrics: SystemMetrics): void {
    if (this.metricsHistory.length < 10) {
      return; // Need sufficient data for correlation
    }

    const metricNames = Array.from(this.metricExtractors.keys());
    
    for (let i = 0; i < metricNames.length; i++) {
      for (let j = i + 1; j < metricNames.length; j++) {
        const metric1 = metricNames[i];
        const metric2 = metricNames[j];
        
        const correlation = this.calculateCorrelation(metric1, metric2);
        
        // Update correlation matrix
        if (!this.correlationMatrix.has(metric1)) {
          this.correlationMatrix.set(metric1, new Map());
        }
        if (!this.correlationMatrix.has(metric2)) {
          this.correlationMatrix.set(metric2, new Map());
        }
        
        this.correlationMatrix.get(metric1)!.set(metric2, correlation);
        this.correlationMatrix.get(metric2)!.set(metric1, correlation);
      }
    }
  }

  /**
   * Calculate correlation between two metrics
   */
  private calculateCorrelation(metric1: string, metric2: string): number {
    const extractor1 = this.metricExtractors.get(metric1);
    const extractor2 = this.metricExtractors.get(metric2);
    
    if (!extractor1 || !extractor2) {
      return 0;
    }

    const values1 = this.metricsHistory.map(extractor1);
    const values2 = this.metricsHistory.map(extractor2);

    return this.pearsonCorrelation(values1, values2);
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
    const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
    const sumXY = x.slice(0, n).reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.slice(0, n).reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.slice(0, n).reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Predict bottleneck for a component
   */
  private predictBottleneck(component: string): BottleneckPrediction | null {
    // This is a simplified prediction model
    // In a real implementation, you might use machine learning models
    
    const recentMetrics = this.metricsHistory.slice(-20);
    if (recentMetrics.length < 10) {
      return null;
    }

    // Analyze trend for component-specific metrics
    let metricName = '';
    let threshold = 0;
    
    switch (component) {
      case 'cpu':
        metricName = 'cpu.usage';
        threshold = this.config.bottleneckThresholds.cpu.critical;
        break;
      case 'memory':
        metricName = 'memory.usage';
        threshold = this.config.bottleneckThresholds.memory.critical;
        break;
      case 'network':
        metricName = 'network.latency';
        threshold = this.config.bottleneckThresholds.network.latencyCritical;
        break;
      case 'database':
        metricName = 'database.averageQueryTime';
        threshold = this.config.bottleneckThresholds.database.queryTimeCritical;
        break;
      case 'application':
        metricName = 'application.responseTime';
        threshold = this.config.bottleneckThresholds.application.responseTimeCritical;
        break;
      default:
        return null;
    }

    const extractor = this.metricExtractors.get(metricName);
    if (!extractor) {
      return null;
    }

    const values = recentMetrics.map(extractor);
    const trend = this.calculateTrend(values);
    
    if (trend.slope > 0 && trend.confidence > 0.6) {
      const currentValue = values[values.length - 1];
      const timeToBottleneck = (threshold - currentValue) / trend.slope;
      
      if (timeToBottleneck > 0 && timeToBottleneck < 600000) { // Less than 10 minutes
        return {
          component,
          predictedBottleneck: `${component} will reach critical threshold`,
          timeToBottleneck: timeToBottleneck * 1000, // Convert to milliseconds
          confidence: trend.confidence,
          preventiveActions: this.getPreventiveActions(component)
        };
      }
    }

    return null;
  }

  /**
   * Calculate trend for a series of values
   */
  private calculateTrend(values: number[]): { slope: number; confidence: number } {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Calculate R-squared for confidence
    const meanY = sumY / n;
    const ssTotal = values.reduce((sum, yi) => sum + (yi - meanY) ** 2, 0);
    const ssRes = values.reduce((sum, yi, i) => {
      const predicted = slope * i + (sumY - slope * sumX) / n;
      return sum + (yi - predicted) ** 2;
    }, 0);
    
    const rSquared = 1 - (ssRes / ssTotal);
    const confidence = Math.max(0, Math.min(1, rSquared));

    return { slope, confidence };
  }

  /**
   * Get preventive actions for a component
   */
  private getPreventiveActions(component: string): string[] {
    const actions: Record<string, string[]> = {
      cpu: [
        'Scale horizontally before reaching threshold',
        'Optimize CPU-intensive operations',
        'Implement request throttling'
      ],
      memory: [
        'Implement memory pooling',
        'Add memory-based circuit breakers',
        'Scale vertically'
      ],
      network: [
        'Optimize network configuration',
        'Implement CDN',
        'Review geographic distribution'
      ],
      database: [
        'Optimize database queries',
        'Increase connection pool size',
        'Implement query caching'
      ],
      application: [
        'Implement response caching',
        'Scale application instances',
        'Optimize application code'
      ]
    };

    return actions[component] || [];
  }

  /**
   * Calculate performance degradation percentage
   */
  private calculatePerformanceDegradation(type: string, currentValue: number): number {
    // This is a simplified calculation
    // In a real implementation, you'd have baseline values to compare against
    
    const thresholds: Record<string, number> = {
      cpu: this.config.bottleneckThresholds.cpu.warning,
      memory: this.config.bottleneckThresholds.memory.warning,
      network: this.config.bottleneckThresholds.network.latencyWarning,
      database: this.config.bottleneckThresholds.database.queryTimeWarning,
      application: this.config.bottleneckThresholds.application.responseTimeWarning,
      ai_service: 3000 // 3 seconds baseline
    };

    const threshold = thresholds[type] || 100;
    return Math.max(0, ((currentValue - threshold) / threshold) * 100);
  }
}
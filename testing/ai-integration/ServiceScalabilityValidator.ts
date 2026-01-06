/**
 * Service Scalability Validator for AI Integration Testing
 * 
 * Validates the scalability characteristics of AI services under various load conditions,
 * including horizontal scaling, vertical scaling, and auto-scaling behaviors.
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { ConcurrentRequestHandler, RequestTask, ConcurrencyMetrics } from './ConcurrentRequestHandler';

export interface ScalabilityTestConfig {
  serviceName: string;
  baseUrl: string;
  testDuration: number; // milliseconds
  scalingSteps: ScalingStep[];
  thresholds: ScalabilityThresholds;
  endpoints: ScalabilityEndpoint[];
}

export interface ScalingStep {
  name: string;
  concurrency: number;
  duration: number; // milliseconds
  expectedThroughput: number; // requests per second
  expectedResponseTime: number; // milliseconds
}

export interface ScalabilityThresholds {
  maxResponseTimeDegradation: number; // percentage
  maxThroughputDegradation: number; // percentage
  maxErrorRateIncrease: number; // percentage
  minScalingEfficiency: number; // percentage
}

export interface ScalabilityEndpoint {
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  payload?: any;
  weight: number; // percentage of total requests
  criticalPath: boolean; // whether this endpoint is critical for service functionality
}

export interface ScalabilityMetrics {
  step: string;
  concurrency: number;
  throughput: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  scalingEfficiency: number;
  resourceUtilization: ResourceUtilization;
  bottlenecks: string[];
}

export interface ResourceUtilization {
  cpu: number;
  memory: number;
  network: number;
  connections: number;
}

export interface ScalabilityTestResult {
  serviceName: string;
  testStartTime: number;
  testEndTime: number;
  overallResult: 'passed' | 'failed' | 'warning';
  scalabilityScore: number; // 0-100
  metrics: ScalabilityMetrics[];
  scalingAnalysis: ScalingAnalysis;
  recommendations: string[];
  detailedReport: string;
}

export interface ScalingAnalysis {
  linearScalingRange: { min: number; max: number };
  scalingBreakpoint: number;
  optimalConcurrency: number;
  scalingEfficiencyTrend: 'improving' | 'stable' | 'degrading';
  bottleneckComponents: string[];
}

export class ServiceScalabilityValidator extends EventEmitter {
  private config: ScalabilityTestConfig;
  private requestHandler: ConcurrentRequestHandler;
  private metrics: ScalabilityMetrics[] = [];
  private isRunning: boolean = false;

  constructor(config: ScalabilityTestConfig) {
    super();
    this.config = config;
    
    // Initialize concurrent request handler
    this.requestHandler = new ConcurrentRequestHandler({
      maxConcurrency: Math.max(...config.scalingSteps.map(s => s.concurrency)),
      connectionPoolSize: 100,
      requestTimeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      keepAlive: true,
      maxSockets: 50
    });

    this.setupRequestHandlerListeners();
  }

  /**
   * Run the scalability validation test
   */
  async runScalabilityTest(): Promise<ScalabilityTestResult> {
    if (this.isRunning) {
      throw new Error('Scalability test is already running');
    }

    this.isRunning = true;
    this.metrics = [];
    const testStartTime = performance.now();

    console.log(`Starting scalability test for ${this.config.serviceName}`);
    console.log(`Test will run ${this.config.scalingSteps.length} scaling steps`);

    try {
      // Start the request handler
      await this.requestHandler.start();

      // Execute each scaling step
      for (const step of this.config.scalingSteps) {
        console.log(`Executing scaling step: ${step.name} (${step.concurrency} concurrent requests)`);
        
        const stepMetrics = await this.executeScalingStep(step);
        this.metrics.push(stepMetrics);
        
        this.emit('stepCompleted', stepMetrics);
        
        // Brief pause between steps to allow system stabilization
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      // Stop the request handler
      await this.requestHandler.stop();

      const testEndTime = performance.now();
      const result = this.generateScalabilityResult(testStartTime, testEndTime);
      
      this.isRunning = false;
      return result;

    } catch (error) {
      this.isRunning = false;
      await this.requestHandler.stop();
      throw error;
    }
  }

  /**
   * Execute a single scaling step
   */
  private async executeScalingStep(step: ScalingStep): Promise<ScalabilityMetrics> {
    const stepStartTime = performance.now();
    const tasks: RequestTask[] = [];
    
    // Calculate request distribution based on endpoint weights
    const totalRequests = step.concurrency * (step.duration / 1000); // Rough estimate
    
    // Generate request tasks
    for (let i = 0; i < totalRequests; i++) {
      const endpoint = this.selectEndpoint();
      const task: RequestTask = {
        id: `${step.name}-${i}`,
        url: `${this.config.baseUrl}${endpoint.path}`,
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Step': step.name,
          'X-Test-Concurrency': step.concurrency.toString()
        },
        body: endpoint.payload,
        priority: endpoint.criticalPath ? 'high' : 'medium',
        expectedResponseTime: step.expectedResponseTime
      };
      
      tasks.push(task);
    }

    // Add tasks to request handler
    this.requestHandler.addRequests(tasks);

    // Monitor metrics during step execution
    const metricsCollector = this.startStepMetricsCollection(step);
    
    // Wait for step duration
    await new Promise(resolve => setTimeout(resolve, step.duration));
    
    // Stop metrics collection
    clearInterval(metricsCollector);
    
    // Get final metrics for this step
    const finalMetrics = this.requestHandler.getMetrics();
    const stepEndTime = performance.now();
    
    // Calculate scaling efficiency
    const scalingEfficiency = this.calculateScalingEfficiency(step, finalMetrics);
    
    // Detect bottlenecks
    const bottlenecks = this.detectBottlenecks(step, finalMetrics);
    
    return {
      step: step.name,
      concurrency: step.concurrency,
      throughput: finalMetrics.requestsPerSecond,
      averageResponseTime: finalMetrics.averageResponseTime,
      p95ResponseTime: 0, // Would need to be calculated from detailed response time data
      p99ResponseTime: 0, // Would need to be calculated from detailed response time data
      errorRate: finalMetrics.errorRate,
      scalingEfficiency,
      resourceUtilization: {
        cpu: 0, // Would need system monitoring integration
        memory: 0, // Would need system monitoring integration
        network: 0, // Would need system monitoring integration
        connections: finalMetrics.connectionPoolUtilization
      },
      bottlenecks
    };
  }

  /**
   * Select an endpoint based on weights
   */
  private selectEndpoint(): ScalabilityEndpoint {
    const random = Math.random() * 100;
    let cumulativeWeight = 0;

    for (const endpoint of this.config.endpoints) {
      cumulativeWeight += endpoint.weight;
      if (random <= cumulativeWeight) {
        return endpoint;
      }
    }

    return this.config.endpoints[0]; // Fallback
  }

  /**
   * Start metrics collection for a scaling step
   */
  private startStepMetricsCollection(step: ScalingStep): NodeJS.Timeout {
    return setInterval(() => {
      const metrics = this.requestHandler.getMetrics();
      
      this.emit('stepMetricsUpdate', {
        step: step.name,
        metrics,
        timestamp: performance.now()
      });

      // Check for threshold violations
      this.checkThresholdViolations(step, metrics);
      
    }, 1000); // Collect every second
  }

  /**
   * Check for threshold violations during step execution
   */
  private checkThresholdViolations(step: ScalingStep, metrics: ConcurrencyMetrics): void {
    const violations: string[] = [];

    // Check response time degradation
    if (metrics.averageResponseTime > step.expectedResponseTime * (1 + this.config.thresholds.maxResponseTimeDegradation / 100)) {
      violations.push(`Response time exceeded threshold: ${metrics.averageResponseTime}ms > ${step.expectedResponseTime}ms`);
    }

    // Check throughput degradation
    if (metrics.requestsPerSecond < step.expectedThroughput * (1 - this.config.thresholds.maxThroughputDegradation / 100)) {
      violations.push(`Throughput below threshold: ${metrics.requestsPerSecond} RPS < ${step.expectedThroughput} RPS`);
    }

    // Check error rate increase
    if (metrics.errorRate > this.config.thresholds.maxErrorRateIncrease) {
      violations.push(`Error rate exceeded threshold: ${metrics.errorRate}% > ${this.config.thresholds.maxErrorRateIncrease}%`);
    }

    if (violations.length > 0) {
      this.emit('thresholdViolations', {
        step: step.name,
        violations,
        metrics
      });
    }
  }

  /**
   * Calculate scaling efficiency for a step
   */
  private calculateScalingEfficiency(step: ScalingStep, metrics: ConcurrencyMetrics): number {
    // Find baseline metrics (first step)
    const baselineMetrics = this.metrics[0];
    if (!baselineMetrics) {
      return 100; // First step, assume 100% efficiency
    }

    // Calculate theoretical scaling
    const concurrencyRatio = step.concurrency / baselineMetrics.concurrency;
    const theoreticalThroughput = baselineMetrics.throughput * concurrencyRatio;
    
    // Calculate actual efficiency
    const actualEfficiency = (metrics.requestsPerSecond / theoreticalThroughput) * 100;
    
    return Math.min(100, Math.max(0, actualEfficiency));
  }

  /**
   * Detect bottlenecks during step execution
   */
  private detectBottlenecks(step: ScalingStep, metrics: ConcurrencyMetrics): string[] {
    const bottlenecks: string[] = [];

    // High queue size indicates processing bottleneck
    if (metrics.queuedRequests > step.concurrency * 2) {
      bottlenecks.push('Request queue bottleneck: High number of queued requests');
    }

    // High connection pool utilization
    if (metrics.connectionPoolUtilization > 80) {
      bottlenecks.push('Connection pool bottleneck: High connection pool utilization');
    }

    // Low throughput relative to concurrency
    if (metrics.requestsPerSecond < step.concurrency * 0.1) {
      bottlenecks.push('Throughput bottleneck: Low requests per second relative to concurrency');
    }

    // High error rate
    if (metrics.errorRate > 5) {
      bottlenecks.push('Error rate bottleneck: High error rate indicates system stress');
    }

    // Response time degradation
    if (metrics.averageResponseTime > step.expectedResponseTime * 2) {
      bottlenecks.push('Response time bottleneck: Significant response time degradation');
    }

    return bottlenecks;
  }

  /**
   * Generate comprehensive scalability test result
   */
  private generateScalabilityResult(testStartTime: number, testEndTime: number): ScalabilityTestResult {
    const scalingAnalysis = this.analyzeScalingBehavior();
    const scalabilityScore = this.calculateScalabilityScore();
    const overallResult = this.determineOverallResult(scalabilityScore);
    const recommendations = this.generateRecommendations(scalingAnalysis);
    const detailedReport = this.generateDetailedReport(scalingAnalysis);

    return {
      serviceName: this.config.serviceName,
      testStartTime,
      testEndTime,
      overallResult,
      scalabilityScore,
      metrics: this.metrics,
      scalingAnalysis,
      recommendations,
      detailedReport
    };
  }

  /**
   * Analyze scaling behavior across all steps
   */
  private analyzeScalingBehavior(): ScalingAnalysis {
    if (this.metrics.length < 2) {
      throw new Error('Insufficient metrics for scaling analysis');
    }

    // Find linear scaling range
    const linearScalingRange = this.findLinearScalingRange();
    
    // Find scaling breakpoint
    const scalingBreakpoint = this.findScalingBreakpoint();
    
    // Find optimal concurrency
    const optimalConcurrency = this.findOptimalConcurrency();
    
    // Analyze scaling efficiency trend
    const scalingEfficiencyTrend = this.analyzeScalingEfficiencyTrend();
    
    // Identify bottleneck components
    const bottleneckComponents = this.identifyBottleneckComponents();

    return {
      linearScalingRange,
      scalingBreakpoint,
      optimalConcurrency,
      scalingEfficiencyTrend,
      bottleneckComponents
    };
  }

  /**
   * Find the range where the service scales linearly
   */
  private findLinearScalingRange(): { min: number; max: number } {
    let linearStart = this.metrics[0].concurrency;
    let linearEnd = this.metrics[0].concurrency;

    for (let i = 1; i < this.metrics.length; i++) {
      const current = this.metrics[i];
      const previous = this.metrics[i - 1];
      
      // Check if scaling efficiency is above threshold
      if (current.scalingEfficiency >= this.config.thresholds.minScalingEfficiency) {
        linearEnd = current.concurrency;
      } else {
        break;
      }
    }

    return { min: linearStart, max: linearEnd };
  }

  /**
   * Find the concurrency level where scaling breaks down
   */
  private findScalingBreakpoint(): number {
    for (let i = 1; i < this.metrics.length; i++) {
      const current = this.metrics[i];
      
      if (current.scalingEfficiency < this.config.thresholds.minScalingEfficiency) {
        return current.concurrency;
      }
    }

    return this.metrics[this.metrics.length - 1].concurrency;
  }

  /**
   * Find the optimal concurrency level
   */
  private findOptimalConcurrency(): number {
    let optimalConcurrency = this.metrics[0].concurrency;
    let bestEfficiency = this.metrics[0].scalingEfficiency;

    for (const metric of this.metrics) {
      // Consider both efficiency and throughput
      const score = metric.scalingEfficiency * 0.7 + (metric.throughput / 100) * 0.3;
      const currentBest = bestEfficiency * 0.7 + (this.metrics.find(m => m.concurrency === optimalConcurrency)?.throughput || 0) / 100 * 0.3;
      
      if (score > currentBest && metric.errorRate < 5) {
        optimalConcurrency = metric.concurrency;
        bestEfficiency = metric.scalingEfficiency;
      }
    }

    return optimalConcurrency;
  }

  /**
   * Analyze scaling efficiency trend
   */
  private analyzeScalingEfficiencyTrend(): 'improving' | 'stable' | 'degrading' {
    if (this.metrics.length < 3) {
      return 'stable';
    }

    const firstHalf = this.metrics.slice(0, Math.floor(this.metrics.length / 2));
    const secondHalf = this.metrics.slice(Math.floor(this.metrics.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, m) => sum + m.scalingEfficiency, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, m) => sum + m.scalingEfficiency, 0) / secondHalf.length;

    const difference = secondHalfAvg - firstHalfAvg;

    if (difference > 5) return 'improving';
    if (difference < -5) return 'degrading';
    return 'stable';
  }

  /**
   * Identify bottleneck components across all steps
   */
  private identifyBottleneckComponents(): string[] {
    const bottleneckCounts = new Map<string, number>();

    for (const metric of this.metrics) {
      for (const bottleneck of metric.bottlenecks) {
        const count = bottleneckCounts.get(bottleneck) || 0;
        bottleneckCounts.set(bottleneck, count + 1);
      }
    }

    // Return bottlenecks that appeared in more than 50% of steps
    const threshold = this.metrics.length * 0.5;
    return Array.from(bottleneckCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .map(([bottleneck, _]) => bottleneck);
  }

  /**
   * Calculate overall scalability score
   */
  private calculateScalabilityScore(): number {
    let score = 100;

    // Penalize for low scaling efficiency
    const avgEfficiency = this.metrics.reduce((sum, m) => sum + m.scalingEfficiency, 0) / this.metrics.length;
    score -= (100 - avgEfficiency) * 0.4;

    // Penalize for high error rates
    const avgErrorRate = this.metrics.reduce((sum, m) => sum + m.errorRate, 0) / this.metrics.length;
    score -= avgErrorRate * 2;

    // Penalize for response time degradation
    const firstResponseTime = this.metrics[0].averageResponseTime;
    const lastResponseTime = this.metrics[this.metrics.length - 1].averageResponseTime;
    const responseTimeDegradation = ((lastResponseTime - firstResponseTime) / firstResponseTime) * 100;
    score -= Math.max(0, responseTimeDegradation - 20) * 0.5; // Allow 20% degradation

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine overall test result
   */
  private determineOverallResult(scalabilityScore: number): 'passed' | 'failed' | 'warning' {
    if (scalabilityScore >= 80) return 'passed';
    if (scalabilityScore >= 60) return 'warning';
    return 'failed';
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(analysis: ScalingAnalysis): string[] {
    const recommendations: string[] = [];

    // Scaling efficiency recommendations
    if (analysis.scalingEfficiencyTrend === 'degrading') {
      recommendations.push('Consider implementing horizontal auto-scaling to maintain efficiency');
      recommendations.push('Review resource allocation and optimize bottleneck components');
    }

    // Bottleneck-specific recommendations
    if (analysis.bottleneckComponents.includes('Connection pool bottleneck')) {
      recommendations.push('Increase connection pool size or implement connection multiplexing');
    }

    if (analysis.bottleneckComponents.includes('Request queue bottleneck')) {
      recommendations.push('Implement request prioritization and load shedding mechanisms');
    }

    if (analysis.bottleneckComponents.includes('Throughput bottleneck')) {
      recommendations.push('Optimize request processing pipeline and consider caching strategies');
    }

    // Optimal concurrency recommendations
    recommendations.push(`Consider setting optimal concurrency limit to ${analysis.optimalConcurrency} for best performance`);

    // Scaling breakpoint recommendations
    if (analysis.scalingBreakpoint < this.metrics[this.metrics.length - 1].concurrency) {
      recommendations.push(`Service scaling breaks down at ${analysis.scalingBreakpoint} concurrent requests - implement circuit breakers`);
    }

    return recommendations;
  }

  /**
   * Generate detailed report
   */
  private generateDetailedReport(analysis: ScalingAnalysis): string {
    let report = `# Scalability Test Report for ${this.config.serviceName}\n\n`;
    
    report += `## Test Summary\n`;
    report += `- Test Duration: ${this.config.testDuration}ms\n`;
    report += `- Scaling Steps: ${this.config.scalingSteps.length}\n`;
    report += `- Max Concurrency Tested: ${Math.max(...this.metrics.map(m => m.concurrency))}\n\n`;
    
    report += `## Scaling Analysis\n`;
    report += `- Linear Scaling Range: ${analysis.linearScalingRange.min} - ${analysis.linearScalingRange.max} concurrent requests\n`;
    report += `- Scaling Breakpoint: ${analysis.scalingBreakpoint} concurrent requests\n`;
    report += `- Optimal Concurrency: ${analysis.optimalConcurrency} concurrent requests\n`;
    report += `- Scaling Efficiency Trend: ${analysis.scalingEfficiencyTrend}\n\n`;
    
    report += `## Performance Metrics by Step\n`;
    for (const metric of this.metrics) {
      report += `### ${metric.step}\n`;
      report += `- Concurrency: ${metric.concurrency}\n`;
      report += `- Throughput: ${metric.throughput.toFixed(2)} RPS\n`;
      report += `- Average Response Time: ${metric.averageResponseTime.toFixed(2)}ms\n`;
      report += `- Error Rate: ${metric.errorRate.toFixed(2)}%\n`;
      report += `- Scaling Efficiency: ${metric.scalingEfficiency.toFixed(2)}%\n`;
      if (metric.bottlenecks.length > 0) {
        report += `- Bottlenecks: ${metric.bottlenecks.join(', ')}\n`;
      }
      report += `\n`;
    }
    
    return report;
  }

  /**
   * Setup request handler event listeners
   */
  private setupRequestHandlerListeners(): void {
    this.requestHandler.on('requestCompleted', (result) => {
      this.emit('requestCompleted', result);
    });

    this.requestHandler.on('bottlenecksDetected', (bottlenecks) => {
      this.emit('bottlenecksDetected', bottlenecks);
    });

    this.requestHandler.on('performanceDegradation', (data) => {
      this.emit('performanceDegradation', data);
    });
  }
}
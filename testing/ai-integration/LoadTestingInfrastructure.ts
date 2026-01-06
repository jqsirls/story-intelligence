/**
 * Load Testing Infrastructure for AI Integration Testing
 * 
 * This module provides comprehensive load testing capabilities for the Storytailor
 * AI integration system, including concurrent request handling, scalability validation,
 * resource monitoring, performance degradation detection, and bottleneck identification.
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { Worker } from 'worker_threads';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface LoadTestConfig {
  // Test configuration
  testName: string;
  duration: number; // in milliseconds
  maxConcurrentRequests: number;
  rampUpTime: number; // time to reach max concurrent requests
  rampDownTime: number; // time to scale down
  
  // Target endpoints
  endpoints: {
    openai: string;
    elevenlabs: string;
    personality: string;
    webvtt: string;
  };
  
  // Performance thresholds
  thresholds: {
    maxResponseTime: number; // ms
    maxErrorRate: number; // percentage
    maxCpuUsage: number; // percentage
    maxMemoryUsage: number; // MB
    minThroughput: number; // requests per second
  };
  
  // Test scenarios
  scenarios: LoadTestScenario[];
}

export interface LoadTestScenario {
  name: string;
  weight: number; // percentage of total requests
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  payload?: any;
  headers?: Record<string, string>;
  expectedResponseTime: number; // ms
}

export interface LoadTestMetrics {
  timestamp: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  activeConnections: number;
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
  throughput: number;
}

export interface LoadTestResult {
  testName: string;
  startTime: number;
  endTime: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  errorRate: number;
  throughput: number;
  metrics: LoadTestMetrics[];
  bottlenecks: BottleneckAnalysis[];
  recommendations: string[];
}

export interface BottleneckAnalysis {
  component: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metrics: Record<string, number>;
  recommendations: string[];
}

export interface ResourceMonitoringData {
  timestamp: number;
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  disk: {
    readBytes: number;
    writeBytes: number;
    readOps: number;
    writeOps: number;
  };
}

export class LoadTestingInfrastructure extends EventEmitter {
  private config: LoadTestConfig;
  private isRunning: boolean = false;
  private workers: Worker[] = [];
  private metrics: LoadTestMetrics[] = [];
  private resourceData: ResourceMonitoringData[] = [];
  private startTime: number = 0;
  private requestCounts: Map<string, number> = new Map();
  private responseTimes: number[] = [];
  private errors: number = 0;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(config: LoadTestConfig) {
    super();
    this.config = config;
  }

  /**
   * Start the load testing infrastructure
   */
  async startLoadTest(): Promise<LoadTestResult> {
    if (this.isRunning) {
      throw new Error('Load test is already running');
    }

    this.isRunning = true;
    this.startTime = performance.now();
    this.metrics = [];
    this.resourceData = [];
    this.requestCounts.clear();
    this.responseTimes = [];
    this.errors = 0;

    console.log(`Starting load test: ${this.config.testName}`);
    console.log(`Duration: ${this.config.duration}ms`);
    console.log(`Max concurrent requests: ${this.config.maxConcurrentRequests}`);

    // Start resource monitoring
    this.startResourceMonitoring();

    // Start metrics collection
    this.startMetricsCollection();

    try {
      // Execute load test phases
      await this.executeRampUp();
      await this.executeSustainedLoad();
      await this.executeRampDown();

      // Stop monitoring
      this.stopResourceMonitoring();

      const result = await this.generateTestResult();
      this.isRunning = false;

      return result;
    } catch (error) {
      this.isRunning = false;
      this.stopResourceMonitoring();
      throw error;
    }
  }

  /**
   * Execute ramp-up phase
   */
  private async executeRampUp(): Promise<void> {
    console.log('Starting ramp-up phase...');
    const rampUpSteps = 10;
    const stepDuration = this.config.rampUpTime / rampUpSteps;
    const requestsPerStep = this.config.maxConcurrentRequests / rampUpSteps;

    for (let step = 1; step <= rampUpSteps; step++) {
      const currentConcurrency = Math.floor(requestsPerStep * step);
      await this.executeLoadStep(currentConcurrency, stepDuration);
      
      this.emit('rampUpProgress', {
        step,
        totalSteps: rampUpSteps,
        currentConcurrency,
        progress: (step / rampUpSteps) * 100
      });
    }
  }

  /**
   * Execute sustained load phase
   */
  private async executeSustainedLoad(): Promise<void> {
    console.log('Starting sustained load phase...');
    const sustainedDuration = this.config.duration - this.config.rampUpTime - this.config.rampDownTime;
    
    await this.executeLoadStep(this.config.maxConcurrentRequests, sustainedDuration);
    
    this.emit('sustainedLoadComplete', {
      duration: sustainedDuration,
      concurrency: this.config.maxConcurrentRequests
    });
  }

  /**
   * Execute ramp-down phase
   */
  private async executeRampDown(): Promise<void> {
    console.log('Starting ramp-down phase...');
    const rampDownSteps = 5;
    const stepDuration = this.config.rampDownTime / rampDownSteps;
    const requestsPerStep = this.config.maxConcurrentRequests / rampDownSteps;

    for (let step = rampDownSteps - 1; step >= 0; step--) {
      const currentConcurrency = Math.floor(requestsPerStep * step);
      await this.executeLoadStep(currentConcurrency, stepDuration);
      
      this.emit('rampDownProgress', {
        step: rampDownSteps - step,
        totalSteps: rampDownSteps,
        currentConcurrency,
        progress: ((rampDownSteps - step) / rampDownSteps) * 100
      });
    }
  }

  /**
   * Execute a load step with specified concurrency
   */
  private async executeLoadStep(concurrency: number, duration: number): Promise<void> {
    const promises: Promise<void>[] = [];
    const stepStartTime = performance.now();

    // Create concurrent request workers
    for (let i = 0; i < concurrency; i++) {
      promises.push(this.executeRequestWorker(stepStartTime + duration));
    }

    // Wait for step duration or all requests to complete
    await Promise.race([
      Promise.all(promises),
      new Promise(resolve => setTimeout(resolve, duration))
    ]);

    // Clean up any remaining workers
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
  }

  /**
   * Execute individual request worker
   */
  private async executeRequestWorker(endTime: number): Promise<void> {
    while (performance.now() < endTime && this.isRunning) {
      try {
        const scenario = this.selectScenario();
        const requestStart = performance.now();
        
        await this.executeRequest(scenario);
        
        const responseTime = performance.now() - requestStart;
        this.responseTimes.push(responseTime);
        
        // Track request count
        const count = this.requestCounts.get(scenario.name) || 0;
        this.requestCounts.set(scenario.name, count + 1);

        // Check for performance degradation
        if (responseTime > scenario.expectedResponseTime * 2) {
          this.emit('performanceDegradation', {
            scenario: scenario.name,
            expectedTime: scenario.expectedResponseTime,
            actualTime: responseTime,
            degradationFactor: responseTime / scenario.expectedResponseTime
          });
        }

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
        
      } catch (error) {
        this.errors++;
        this.emit('requestError', error);
      }
    }
  }

  /**
   * Select a scenario based on weights
   */
  private selectScenario(): LoadTestScenario {
    const random = Math.random() * 100;
    let cumulativeWeight = 0;

    for (const scenario of this.config.scenarios) {
      cumulativeWeight += scenario.weight;
      if (random <= cumulativeWeight) {
        return scenario;
      }
    }

    return this.config.scenarios[0]; // Fallback
  }

  /**
   * Execute a single request
   */
  private async executeRequest(scenario: LoadTestScenario): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), scenario.expectedResponseTime * 3);

    try {
      const response = await fetch(scenario.endpoint, {
        method: scenario.method,
        headers: {
          'Content-Type': 'application/json',
          ...scenario.headers
        },
        body: scenario.payload ? JSON.stringify(scenario.payload) : undefined,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      await response.json(); // Consume response body
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Start resource monitoring
   */
  private startResourceMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      const resourceData = this.collectResourceData();
      this.resourceData.push(resourceData);
      
      // Check for resource bottlenecks
      this.checkResourceBottlenecks(resourceData);
      
      this.emit('resourceUpdate', resourceData);
    }, 1000); // Collect every second
  }

  /**
   * Stop resource monitoring
   */
  private stopResourceMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Collect current resource data
   */
  private collectResourceData(): ResourceMonitoringData {
    const memInfo = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      timestamp: performance.now(),
      cpu: {
        usage: this.calculateCpuUsage(cpuUsage),
        loadAverage: os.loadavg(),
        cores: os.cpus().length
      },
      memory: {
        used: memInfo.heapUsed,
        free: os.freemem(),
        total: os.totalmem(),
        percentage: (memInfo.heapUsed / os.totalmem()) * 100
      },
      network: {
        bytesIn: 0, // Would need network monitoring library
        bytesOut: 0,
        packetsIn: 0,
        packetsOut: 0
      },
      disk: {
        readBytes: 0, // Would need disk monitoring library
        writeBytes: 0,
        readOps: 0,
        writeOps: 0
      }
    };
  }

  /**
   * Calculate CPU usage percentage
   */
  private calculateCpuUsage(cpuUsage: NodeJS.CpuUsage): number {
    // Simplified CPU usage calculation
    const totalUsage = cpuUsage.user + cpuUsage.system;
    return (totalUsage / 1000000) / os.cpus().length; // Convert to percentage
  }

  /**
   * Check for resource bottlenecks
   */
  private checkResourceBottlenecks(resourceData: ResourceMonitoringData): void {
    const bottlenecks: BottleneckAnalysis[] = [];

    // CPU bottleneck
    if (resourceData.cpu.usage > this.config.thresholds.maxCpuUsage) {
      bottlenecks.push({
        component: 'CPU',
        severity: resourceData.cpu.usage > 90 ? 'critical' : 'high',
        description: `CPU usage is ${resourceData.cpu.usage.toFixed(2)}%`,
        metrics: { usage: resourceData.cpu.usage },
        recommendations: [
          'Consider scaling horizontally',
          'Optimize CPU-intensive operations',
          'Implement request queuing'
        ]
      });
    }

    // Memory bottleneck
    if (resourceData.memory.percentage > this.config.thresholds.maxMemoryUsage) {
      bottlenecks.push({
        component: 'Memory',
        severity: resourceData.memory.percentage > 90 ? 'critical' : 'high',
        description: `Memory usage is ${resourceData.memory.percentage.toFixed(2)}%`,
        metrics: { percentage: resourceData.memory.percentage },
        recommendations: [
          'Implement memory pooling',
          'Optimize data structures',
          'Add memory-based circuit breakers'
        ]
      });
    }

    if (bottlenecks.length > 0) {
      this.emit('bottleneckDetected', bottlenecks);
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      const metrics = this.calculateCurrentMetrics();
      this.metrics.push(metrics);
      this.emit('metricsUpdate', metrics);
    }, 5000); // Collect every 5 seconds
  }

  /**
   * Calculate current performance metrics
   */
  private calculateCurrentMetrics(): LoadTestMetrics {
    const now = performance.now();
    const recentResponses = this.responseTimes.slice(-100); // Last 100 responses
    const totalRequests = this.responseTimes.length;
    const timeElapsed = (now - this.startTime) / 1000; // seconds

    return {
      timestamp: now,
      requestsPerSecond: totalRequests / timeElapsed,
      averageResponseTime: recentResponses.reduce((a, b) => a + b, 0) / recentResponses.length || 0,
      p95ResponseTime: this.calculatePercentile(recentResponses, 95),
      p99ResponseTime: this.calculatePercentile(recentResponses, 99),
      errorRate: (this.errors / totalRequests) * 100 || 0,
      activeConnections: this.workers.length,
      cpuUsage: this.resourceData[this.resourceData.length - 1]?.cpu.usage || 0,
      memoryUsage: this.resourceData[this.resourceData.length - 1]?.memory.percentage || 0,
      networkLatency: 0, // Would need network latency measurement
      throughput: totalRequests / timeElapsed
    };
  }

  /**
   * Calculate percentile from array of numbers
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  /**
   * Generate comprehensive test result
   */
  private async generateTestResult(): Promise<LoadTestResult> {
    const endTime = performance.now();
    const totalRequests = this.responseTimes.length;
    const successfulRequests = totalRequests - this.errors;

    // Analyze bottlenecks
    const bottlenecks = await this.analyzeBottlenecks();
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(bottlenecks);

    const result: LoadTestResult = {
      testName: this.config.testName,
      startTime: this.startTime,
      endTime,
      totalRequests,
      successfulRequests,
      failedRequests: this.errors,
      averageResponseTime: this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length || 0,
      p95ResponseTime: this.calculatePercentile(this.responseTimes, 95),
      p99ResponseTime: this.calculatePercentile(this.responseTimes, 99),
      maxResponseTime: Math.max(...this.responseTimes) || 0,
      minResponseTime: Math.min(...this.responseTimes) || 0,
      errorRate: (this.errors / totalRequests) * 100 || 0,
      throughput: totalRequests / ((endTime - this.startTime) / 1000),
      metrics: this.metrics,
      bottlenecks,
      recommendations
    };

    // Save results to file
    await this.saveTestResults(result);

    return result;
  }

  /**
   * Analyze bottlenecks from collected data
   */
  private async analyzeBottlenecks(): Promise<BottleneckAnalysis[]> {
    const bottlenecks: BottleneckAnalysis[] = [];

    // Analyze response time trends
    const responseTimeTrend = this.analyzeResponseTimeTrend();
    if (responseTimeTrend.degradation > 50) { // 50% degradation
      bottlenecks.push({
        component: 'Response Time',
        severity: 'high',
        description: `Response time degraded by ${responseTimeTrend.degradation.toFixed(2)}%`,
        metrics: responseTimeTrend,
        recommendations: [
          'Implement response caching',
          'Optimize database queries',
          'Add connection pooling'
        ]
      });
    }

    // Analyze error rate trends
    const errorRate = (this.errors / this.responseTimes.length) * 100;
    if (errorRate > this.config.thresholds.maxErrorRate) {
      bottlenecks.push({
        component: 'Error Rate',
        severity: errorRate > 10 ? 'critical' : 'high',
        description: `Error rate is ${errorRate.toFixed(2)}%`,
        metrics: { errorRate },
        recommendations: [
          'Implement circuit breakers',
          'Add retry mechanisms',
          'Improve error handling'
        ]
      });
    }

    // Analyze throughput bottlenecks
    const currentThroughput = this.responseTimes.length / ((performance.now() - this.startTime) / 1000);
    if (currentThroughput < this.config.thresholds.minThroughput) {
      bottlenecks.push({
        component: 'Throughput',
        severity: 'medium',
        description: `Throughput is ${currentThroughput.toFixed(2)} RPS, below threshold of ${this.config.thresholds.minThroughput}`,
        metrics: { throughput: currentThroughput },
        recommendations: [
          'Scale horizontally',
          'Optimize request processing',
          'Implement load balancing'
        ]
      });
    }

    return bottlenecks;
  }

  /**
   * Analyze response time trend
   */
  private analyzeResponseTimeTrend(): any {
    if (this.responseTimes.length < 10) {
      return { degradation: 0 };
    }

    const firstQuarter = this.responseTimes.slice(0, Math.floor(this.responseTimes.length / 4));
    const lastQuarter = this.responseTimes.slice(-Math.floor(this.responseTimes.length / 4));

    const firstAvg = firstQuarter.reduce((a, b) => a + b, 0) / firstQuarter.length;
    const lastAvg = lastQuarter.reduce((a, b) => a + b, 0) / lastQuarter.length;

    const degradation = ((lastAvg - firstAvg) / firstAvg) * 100;

    return {
      degradation,
      firstQuarterAvg: firstAvg,
      lastQuarterAvg: lastAvg
    };
  }

  /**
   * Generate recommendations based on bottlenecks
   */
  private generateRecommendations(bottlenecks: BottleneckAnalysis[]): string[] {
    const recommendations = new Set<string>();

    bottlenecks.forEach(bottleneck => {
      bottleneck.recommendations.forEach(rec => recommendations.add(rec));
    });

    // Add general recommendations
    if (this.responseTimes.length > 0) {
      const avgResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
      if (avgResponseTime > this.config.thresholds.maxResponseTime) {
        recommendations.add('Consider implementing CDN for static assets');
        recommendations.add('Optimize AI model inference times');
      }
    }

    return Array.from(recommendations);
  }

  /**
   * Save test results to file
   */
  private async saveTestResults(result: LoadTestResult): Promise<void> {
    const resultsDir = path.join(process.cwd(), 'testing', 'ai-integration', 'results');
    
    try {
      await fs.mkdir(resultsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    const filename = `load-test-${result.testName}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(resultsDir, filename);

    await fs.writeFile(filepath, JSON.stringify(result, null, 2));
    console.log(`Test results saved to: ${filepath}`);
  }

  /**
   * Stop the load test
   */
  async stopLoadTest(): Promise<void> {
    this.isRunning = false;
    this.stopResourceMonitoring();
    
    // Terminate all workers
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    
    this.emit('testStopped');
  }
}
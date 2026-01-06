/**
 * Concurrent Request Handler for AI Integration Load Testing
 * 
 * Handles concurrent request execution with proper resource management,
 * connection pooling, and performance monitoring.
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import * as http from 'http';
import * as https from 'https';

export interface ConcurrentRequestConfig {
  maxConcurrency: number;
  connectionPoolSize: number;
  requestTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  keepAlive: boolean;
  maxSockets: number;
}

export interface RequestTask {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  expectedResponseTime: number;
}

export interface RequestResult {
  taskId: string;
  success: boolean;
  statusCode?: number;
  responseTime: number;
  responseSize: number;
  error?: string;
  retryCount: number;
  timestamp: number;
}

export interface ConcurrencyMetrics {
  activeRequests: number;
  queuedRequests: number;
  completedRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  connectionPoolUtilization: number;
  errorRate: number;
}

export class ConcurrentRequestHandler extends EventEmitter {
  private config: ConcurrentRequestConfig;
  private requestQueue: RequestTask[] = [];
  private activeRequests: Map<string, Promise<RequestResult>> = new Map();
  private completedRequests: RequestResult[] = [];
  private workers: Worker[] = [];
  private httpAgent: http.Agent;
  private httpsAgent: https.Agent;
  private isRunning: boolean = false;
  private startTime: number = 0;

  constructor(config: ConcurrentRequestConfig) {
    super();
    this.config = config;
    
    // Create HTTP agents with connection pooling
    this.httpAgent = new http.Agent({
      keepAlive: config.keepAlive,
      maxSockets: config.maxSockets,
      maxFreeSockets: Math.floor(config.maxSockets / 2),
      timeout: config.requestTimeout,
      scheduling: 'fifo'
    });

    this.httpsAgent = new https.Agent({
      keepAlive: config.keepAlive,
      maxSockets: config.maxSockets,
      maxFreeSockets: Math.floor(config.maxSockets / 2),
      timeout: config.requestTimeout,
      scheduling: 'fifo'
    });
  }

  /**
   * Start the concurrent request handler
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Concurrent request handler is already running');
    }

    this.isRunning = true;
    this.startTime = performance.now();
    this.completedRequests = [];
    this.activeRequests.clear();

    console.log(`Starting concurrent request handler with max concurrency: ${this.config.maxConcurrency}`);

    // Start worker threads for request processing
    await this.initializeWorkers();

    // Start request processing loop
    this.processRequestQueue();

    // Start metrics collection
    this.startMetricsCollection();
  }

  /**
   * Stop the concurrent request handler
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    // Wait for active requests to complete or timeout
    const activePromises = Array.from(this.activeRequests.values());
    if (activePromises.length > 0) {
      console.log(`Waiting for ${activePromises.length} active requests to complete...`);
      await Promise.allSettled(activePromises);
    }

    // Terminate worker threads
    await this.terminateWorkers();

    // Close HTTP agents
    this.httpAgent.destroy();
    this.httpsAgent.destroy();

    this.emit('stopped');
  }

  /**
   * Add a request task to the queue
   */
  addRequest(task: RequestTask): void {
    this.requestQueue.push(task);
    this.emit('requestQueued', task);
  }

  /**
   * Add multiple request tasks to the queue
   */
  addRequests(tasks: RequestTask[]): void {
    this.requestQueue.push(...tasks);
    this.emit('requestsQueued', tasks.length);
  }

  /**
   * Get current concurrency metrics
   */
  getMetrics(): ConcurrencyMetrics {
    const now = performance.now();
    const timeElapsed = (now - this.startTime) / 1000; // seconds
    const totalRequests = this.completedRequests.length;
    const failedRequests = this.completedRequests.filter(r => !r.success).length;
    const avgResponseTime = totalRequests > 0 
      ? this.completedRequests.reduce((sum, r) => sum + r.responseTime, 0) / totalRequests 
      : 0;

    return {
      activeRequests: this.activeRequests.size,
      queuedRequests: this.requestQueue.length,
      completedRequests: totalRequests,
      failedRequests,
      averageResponseTime: avgResponseTime,
      requestsPerSecond: timeElapsed > 0 ? totalRequests / timeElapsed : 0,
      connectionPoolUtilization: this.calculateConnectionPoolUtilization(),
      errorRate: totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0
    };
  }

  /**
   * Initialize worker threads
   */
  private async initializeWorkers(): Promise<void> {
    const workerCount = Math.min(this.config.maxConcurrency, require('os').cpus().length);
    
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(__filename, {
        workerData: {
          workerId: i,
          config: this.config
        }
      });

      worker.on('message', (result: RequestResult) => {
        this.handleRequestResult(result);
      });

      worker.on('error', (error) => {
        console.error(`Worker ${i} error:`, error);
        this.emit('workerError', { workerId: i, error });
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`Worker ${i} exited with code ${code}`);
        }
      });

      this.workers.push(worker);
    }
  }

  /**
   * Terminate worker threads
   */
  private async terminateWorkers(): Promise<void> {
    const terminationPromises = this.workers.map(worker => worker.terminate());
    await Promise.all(terminationPromises);
    this.workers = [];
  }

  /**
   * Process the request queue
   */
  private processRequestQueue(): void {
    const processInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(processInterval);
        return;
      }

      // Process requests up to max concurrency
      while (
        this.requestQueue.length > 0 && 
        this.activeRequests.size < this.config.maxConcurrency
      ) {
        const task = this.getNextPriorityTask();
        if (task) {
          this.executeRequest(task);
        }
      }
    }, 10); // Check every 10ms
  }

  /**
   * Get the next priority task from the queue
   */
  private getNextPriorityTask(): RequestTask | undefined {
    if (this.requestQueue.length === 0) {
      return undefined;
    }

    // Sort by priority: critical > high > medium > low
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    
    let highestPriorityIndex = 0;
    let highestPriority = priorityOrder[this.requestQueue[0].priority];

    for (let i = 1; i < this.requestQueue.length; i++) {
      const priority = priorityOrder[this.requestQueue[i].priority];
      if (priority > highestPriority) {
        highestPriority = priority;
        highestPriorityIndex = i;
      }
    }

    return this.requestQueue.splice(highestPriorityIndex, 1)[0];
  }

  /**
   * Execute a request task
   */
  private executeRequest(task: RequestTask): void {
    const requestPromise = this.performRequest(task);
    this.activeRequests.set(task.id, requestPromise);

    requestPromise
      .then(result => {
        this.activeRequests.delete(task.id);
        this.handleRequestResult(result);
      })
      .catch(error => {
        this.activeRequests.delete(task.id);
        this.handleRequestResult({
          taskId: task.id,
          success: false,
          responseTime: 0,
          responseSize: 0,
          error: error.message,
          retryCount: 0,
          timestamp: performance.now()
        });
      });
  }

  /**
   * Perform the actual HTTP request
   */
  private async performRequest(task: RequestTask): Promise<RequestResult> {
    const startTime = performance.now();
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount <= this.config.retryAttempts) {
      try {
        const result = await this.makeHttpRequest(task);
        const responseTime = performance.now() - startTime;

        return {
          taskId: task.id,
          success: true,
          statusCode: result.statusCode,
          responseTime,
          responseSize: result.responseSize,
          retryCount,
          timestamp: performance.now()
        };

      } catch (error) {
        lastError = error as Error;
        retryCount++;

        if (retryCount <= this.config.retryAttempts) {
          // Wait before retry with exponential backoff
          const delay = this.config.retryDelay * Math.pow(2, retryCount - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    const responseTime = performance.now() - startTime;
    return {
      taskId: task.id,
      success: false,
      responseTime,
      responseSize: 0,
      error: lastError?.message || 'Unknown error',
      retryCount,
      timestamp: performance.now()
    };
  }

  /**
   * Make HTTP request using appropriate agent
   */
  private async makeHttpRequest(task: RequestTask): Promise<{ statusCode: number; responseSize: number }> {
    return new Promise((resolve, reject) => {
      const url = new URL(task.url);
      const isHttps = url.protocol === 'https:';
      const agent = isHttps ? this.httpsAgent : this.httpAgent;
      const httpModule = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: task.method,
        headers: {
          'User-Agent': 'Storytailor-LoadTest/1.0',
          ...task.headers
        },
        agent,
        timeout: task.timeout || this.config.requestTimeout
      };

      const req = httpModule.request(options, (res) => {
        let responseSize = 0;
        
        res.on('data', (chunk) => {
          responseSize += chunk.length;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            responseSize
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      // Send request body if present
      if (task.body) {
        req.write(typeof task.body === 'string' ? task.body : JSON.stringify(task.body));
      }

      req.end();
    });
  }

  /**
   * Handle request result
   */
  private handleRequestResult(result: RequestResult): void {
    this.completedRequests.push(result);
    this.emit('requestCompleted', result);

    // Check for performance degradation
    if (result.success && result.responseTime > result.taskId.length * 1000) { // Simple heuristic
      this.emit('performanceDegradation', {
        taskId: result.taskId,
        responseTime: result.responseTime,
        expectedTime: result.taskId.length * 1000
      });
    }

    // Check for high error rates
    const recentResults = this.completedRequests.slice(-100);
    const errorRate = recentResults.filter(r => !r.success).length / recentResults.length;
    if (errorRate > 0.1) { // 10% error rate
      this.emit('highErrorRate', { errorRate, sampleSize: recentResults.length });
    }
  }

  /**
   * Calculate connection pool utilization
   */
  private calculateConnectionPoolUtilization(): number {
    // This is a simplified calculation
    // In a real implementation, you'd need to access internal agent statistics
    const totalSockets = this.config.maxSockets * 2; // HTTP + HTTPS
    const activeSockets = this.activeRequests.size;
    return (activeSockets / totalSockets) * 100;
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    const metricsInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(metricsInterval);
        return;
      }

      const metrics = this.getMetrics();
      this.emit('metricsUpdate', metrics);

      // Check for bottlenecks
      this.checkForBottlenecks(metrics);
    }, 5000); // Collect every 5 seconds
  }

  /**
   * Check for performance bottlenecks
   */
  private checkForBottlenecks(metrics: ConcurrencyMetrics): void {
    const bottlenecks: string[] = [];

    // High queue size indicates processing bottleneck
    if (metrics.queuedRequests > this.config.maxConcurrency * 2) {
      bottlenecks.push(`High queue size: ${metrics.queuedRequests} requests queued`);
    }

    // High connection pool utilization
    if (metrics.connectionPoolUtilization > 80) {
      bottlenecks.push(`High connection pool utilization: ${metrics.connectionPoolUtilization.toFixed(2)}%`);
    }

    // High error rate
    if (metrics.errorRate > 5) {
      bottlenecks.push(`High error rate: ${metrics.errorRate.toFixed(2)}%`);
    }

    // Low throughput
    if (metrics.requestsPerSecond < this.config.maxConcurrency * 0.1) {
      bottlenecks.push(`Low throughput: ${metrics.requestsPerSecond.toFixed(2)} RPS`);
    }

    if (bottlenecks.length > 0) {
      this.emit('bottlenecksDetected', bottlenecks);
    }
  }
}

// Worker thread code
if (!isMainThread && parentPort) {
  const { workerId, config } = workerData;
  
  parentPort.on('message', async (task: RequestTask) => {
    try {
      // This would contain the actual request execution logic
      // For now, we'll simulate the request
      const startTime = performance.now();
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
      
      const responseTime = performance.now() - startTime;
      const result: RequestResult = {
        taskId: task.id,
        success: Math.random() > 0.05, // 95% success rate
        statusCode: 200,
        responseTime,
        responseSize: Math.floor(Math.random() * 10000) + 1000,
        retryCount: 0,
        timestamp: performance.now()
      };
      
      parentPort!.postMessage(result);
    } catch (error) {
      const result: RequestResult = {
        taskId: task.id,
        success: false,
        responseTime: 0,
        responseSize: 0,
        error: (error as Error).message,
        retryCount: 0,
        timestamp: performance.now()
      };
      
      parentPort!.postMessage(result);
    }
  });
}
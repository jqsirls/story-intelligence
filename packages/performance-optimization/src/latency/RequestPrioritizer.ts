import { EventEmitter } from 'events';
import { OptimizationRequest } from './LatencyOptimizer';

export interface PrioritizationConfig {
  enabled: boolean;
  maxConcurrentRequests: number;
  priorityLevels: number;
}

interface QueuedRequest {
  request: OptimizationRequest;
  enqueuedAt: number;
  priority: number; // 0 = highest priority
  resolve: () => void;
  reject: (error: Error) => void;
}

export class RequestPrioritizer extends EventEmitter {
  private config: PrioritizationConfig;
  private queues: Map<number, QueuedRequest[]>;
  private activeRequests: Set<string>;
  private requestMetrics: Map<string, RequestMetrics>;

  constructor(config: PrioritizationConfig) {
    super();
    this.config = config;
    this.queues = new Map();
    this.activeRequests = new Set();
    this.requestMetrics = new Map();
    
    // Initialize priority queues
    for (let i = 0; i < config.priorityLevels; i++) {
      this.queues.set(i, []);
    }
  }

  async enqueue(request: OptimizationRequest): Promise<void> {
    if (!this.config.enabled) {
      return; // Pass through without queueing
    }

    const priority = this.calculatePriority(request);
    const queue = this.queues.get(priority);
    
    if (!queue) {
      throw new Error(`Invalid priority level: ${priority}`);
    }

    // Check if we can process immediately
    if (this.activeRequests.size < this.config.maxConcurrentRequests) {
      this.activeRequests.add(request.id);
      this.recordRequestStart(request);
      return;
    }

    // Queue the request
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        request,
        enqueuedAt: Date.now(),
        priority,
        resolve,
        reject
      };

      queue.push(queuedRequest);
      this.sortQueue(priority);
      
      this.emit('requestQueued', {
        requestId: request.id,
        priority,
        queueSize: queue.length,
        totalQueued: this.getTotalQueueSize()
      });

      // Set timeout for queued requests
      setTimeout(() => {
        this.timeoutRequest(queuedRequest);
      }, request.timeout || 30000);
    });
  }

  complete(requestId: string): void {
    if (!this.activeRequests.has(requestId)) {
      return;
    }

    this.activeRequests.delete(requestId);
    this.recordRequestComplete(requestId);
    
    // Process next request from queues
    this.processNextRequest();
    
    this.emit('requestCompleted', {
      requestId,
      activeCount: this.activeRequests.size
    });
  }

  getQueueStats(): QueueStats {
    const queueSizes = new Map<number, number>();
    let totalQueued = 0;
    let oldestRequest: number | null = null;

    for (const [priority, queue] of this.queues.entries()) {
      queueSizes.set(priority, queue.length);
      totalQueued += queue.length;
      
      if (queue.length > 0) {
        const oldest = Math.min(...queue.map(r => r.enqueuedAt));
        if (oldestRequest === null || oldest < oldestRequest) {
          oldestRequest = oldest;
        }
      }
    }

    return {
      totalQueued,
      activeRequests: this.activeRequests.size,
      queueSizes,
      oldestRequestAge: oldestRequest ? Date.now() - oldestRequest : 0,
      averageWaitTime: this.calculateAverageWaitTime()
    };
  }

  updateConfig(config: Partial<PrioritizationConfig>): void {
    const oldMaxConcurrent = this.config.maxConcurrentRequests;
    this.config = { ...this.config, ...config };

    // If max concurrent increased, process more requests
    if (config.maxConcurrentRequests && 
        config.maxConcurrentRequests > oldMaxConcurrent) {
      const additionalSlots = config.maxConcurrentRequests - oldMaxConcurrent;
      for (let i = 0; i < additionalSlots; i++) {
        this.processNextRequest();
      }
    }

    this.emit('configUpdated', this.config);
  }

  private calculatePriority(request: OptimizationRequest): number {
    // Convert string priority to numeric (0 = highest)
    const basePriority = this.getPriorityLevel(request.priority);
    
    // Adjust based on request characteristics
    let adjustedPriority = basePriority;
    
    // User context adjustments
    if (request.context?.isNewUser) {
      adjustedPriority = Math.max(0, adjustedPriority - 1); // Higher priority for new users
    }
    
    if (request.context?.isRetry) {
      adjustedPriority = Math.max(0, adjustedPriority - 1); // Higher priority for retries
    }
    
    // Request type adjustments
    if (request.type === 'conversation') {
      adjustedPriority = Math.max(0, adjustedPriority - 1); // Conversations are time-sensitive
    }
    
    // Time-based adjustments
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 19 && hour <= 21) { // Peak bedtime story hours
      adjustedPriority = Math.max(0, adjustedPriority - 1);
    }

    return Math.min(this.config.priorityLevels - 1, adjustedPriority);
  }

  private getPriorityLevel(priority: string): number {
    switch (priority) {
      case 'high': return 0;
      case 'medium': return Math.floor(this.config.priorityLevels / 2);
      case 'low': return this.config.priorityLevels - 1;
      default: return Math.floor(this.config.priorityLevels / 2);
    }
  }

  private sortQueue(priority: number): void {
    const queue = this.queues.get(priority);
    if (!queue) return;

    // Sort by enqueue time and request characteristics
    queue.sort((a, b) => {
      // First, prioritize by request urgency
      const urgencyA = this.calculateUrgency(a.request);
      const urgencyB = this.calculateUrgency(b.request);
      
      if (urgencyA !== urgencyB) {
        return urgencyB - urgencyA; // Higher urgency first
      }
      
      // Then by enqueue time (FIFO within same urgency)
      return a.enqueuedAt - b.enqueuedAt;
    });
  }

  private calculateUrgency(request: OptimizationRequest): number {
    let urgency = 0;
    
    // Conversation requests are more urgent
    if (request.type === 'conversation') urgency += 10;
    
    // Retry requests are more urgent
    if (request.context?.isRetry) urgency += 5;
    
    // New user requests are more urgent
    if (request.context?.isNewUser) urgency += 3;
    
    // Time-sensitive requests
    if (request.context?.isRealTime) urgency += 8;
    
    return urgency;
  }

  private processNextRequest(): void {
    if (this.activeRequests.size >= this.config.maxConcurrentRequests) {
      return;
    }

    // Find next request from highest priority queue
    for (let priority = 0; priority < this.config.priorityLevels; priority++) {
      const queue = this.queues.get(priority);
      if (!queue || queue.length === 0) continue;

      const queuedRequest = queue.shift();
      if (!queuedRequest) continue;

      // Check if request hasn't timed out
      if (this.hasRequestTimedOut(queuedRequest)) {
        this.timeoutRequest(queuedRequest);
        continue;
      }

      // Process the request
      this.activeRequests.add(queuedRequest.request.id);
      this.recordRequestStart(queuedRequest.request);
      queuedRequest.resolve();
      
      this.emit('requestDequeued', {
        requestId: queuedRequest.request.id,
        priority,
        waitTime: Date.now() - queuedRequest.enqueuedAt
      });
      
      return;
    }
  }

  private hasRequestTimedOut(queuedRequest: QueuedRequest): boolean {
    const timeout = queuedRequest.request.timeout || 30000;
    return Date.now() - queuedRequest.enqueuedAt > timeout;
  }

  private timeoutRequest(queuedRequest: QueuedRequest): void {
    // Remove from queue if still there
    const queue = this.queues.get(queuedRequest.priority);
    if (queue) {
      const index = queue.findIndex(r => r.request.id === queuedRequest.request.id);
      if (index >= 0) {
        queue.splice(index, 1);
      }
    }

    queuedRequest.reject(new Error(`Request ${queuedRequest.request.id} timed out in queue`));
    
    this.emit('requestTimeout', {
      requestId: queuedRequest.request.id,
      waitTime: Date.now() - queuedRequest.enqueuedAt
    });
  }

  private recordRequestStart(request: OptimizationRequest): void {
    this.requestMetrics.set(request.id, {
      startTime: Date.now(),
      type: request.type,
      priority: request.priority
    });
  }

  private recordRequestComplete(requestId: string): void {
    const metrics = this.requestMetrics.get(requestId);
    if (metrics) {
      metrics.completionTime = Date.now();
      metrics.duration = metrics.completionTime - metrics.startTime;
      
      // Keep metrics for a while for analysis
      setTimeout(() => {
        this.requestMetrics.delete(requestId);
      }, 300000); // 5 minutes
    }
  }

  private getTotalQueueSize(): number {
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.length;
    }
    return total;
  }

  private calculateAverageWaitTime(): number {
    const completedRequests = Array.from(this.requestMetrics.values())
      .filter(m => m.completionTime && m.queueTime);
    
    if (completedRequests.length === 0) return 0;
    
    const totalWaitTime = completedRequests.reduce((sum, m) => sum + (m.queueTime || 0), 0);
    return totalWaitTime / completedRequests.length;
  }
}

interface QueueStats {
  totalQueued: number;
  activeRequests: number;
  queueSizes: Map<number, number>;
  oldestRequestAge: number;
  averageWaitTime: number;
}

interface RequestMetrics {
  startTime: number;
  completionTime?: number;
  duration?: number;
  queueTime?: number;
  type: string;
  priority: string;
}
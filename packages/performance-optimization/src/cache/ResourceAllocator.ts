import { EventEmitter } from 'events';
import { ResourceAllocationConfig, CacheMetrics } from '../types';

export class ResourceAllocator extends EventEmitter {
  private config: ResourceAllocationConfig;
  private currentMetrics: CacheMetrics;
  private resourceUsage: ResourceUsage;
  private scalingState: ScalingState;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(config: ResourceAllocationConfig) {
    super();
    this.config = config;
    this.resourceUsage = {
      memoryUsage: 0,
      cpuUsage: 0,
      redisConnections: 0,
      concurrentRequests: 0,
      networkBandwidth: 0
    };
    this.scalingState = {
      isScaling: false,
      lastScaleAction: 0,
      scaleDirection: 'none'
    };
    
    this.startMonitoring();
  }

  updateMetrics(metrics: CacheMetrics): void {
    this.currentMetrics = metrics;
    this.resourceUsage.memoryUsage = metrics.memoryUsage;
    this.resourceUsage.redisConnections = metrics.redisConnections;
    
    this.evaluateScaling();
  }

  allocateResources(requestType: 'memory' | 'redis' | 'network', amount: number): boolean {
    switch (requestType) {
      case 'memory':
        return this.allocateMemory(amount);
      case 'redis':
        return this.allocateRedisConnection();
      case 'network':
        return this.allocateNetworkBandwidth(amount);
      default:
        return false;
    }
  }

  releaseResources(requestType: 'memory' | 'redis' | 'network', amount: number): void {
    switch (requestType) {
      case 'memory':
        this.releaseMemory(amount);
        break;
      case 'redis':
        this.releaseRedisConnection();
        break;
      case 'network':
        this.releaseNetworkBandwidth(amount);
        break;
    }
  }

  getResourceUsage(): ResourceUsage {
    return { ...this.resourceUsage };
  }

  getOptimalBatchSize(requestType: string): number {
    const baseSize = 10;
    const memoryFactor = Math.max(0.5, 1 - (this.resourceUsage.memoryUsage / this.config.maxMemoryUsage));
    const concurrencyFactor = Math.max(0.5, 1 - (this.resourceUsage.concurrentRequests / this.config.maxConcurrentRequests));
    
    return Math.floor(baseSize * memoryFactor * concurrencyFactor);
  }

  shouldThrottleRequest(): boolean {
    return this.resourceUsage.memoryUsage > (this.config.maxMemoryUsage * 0.9) ||
           this.resourceUsage.concurrentRequests > (this.config.maxConcurrentRequests * 0.9) ||
           this.resourceUsage.redisConnections > (this.config.maxRedisConnections * 0.9);
  }

  getThrottleDelay(): number {
    if (!this.shouldThrottleRequest()) return 0;
    
    const memoryPressure = this.resourceUsage.memoryUsage / this.config.maxMemoryUsage;
    const concurrencyPressure = this.resourceUsage.concurrentRequests / this.config.maxConcurrentRequests;
    
    const maxPressure = Math.max(memoryPressure, concurrencyPressure);
    return Math.min(5000, maxPressure * 1000); // Max 5 second delay
  }

  private allocateMemory(amount: number): boolean {
    if (this.resourceUsage.memoryUsage + amount > this.config.maxMemoryUsage) {
      this.emit('memoryAllocationFailed', { requested: amount, available: this.config.maxMemoryUsage - this.resourceUsage.memoryUsage });
      return false;
    }
    
    this.resourceUsage.memoryUsage += amount;
    this.emit('memoryAllocated', { amount, total: this.resourceUsage.memoryUsage });
    return true;
  }

  private releaseMemory(amount: number): void {
    this.resourceUsage.memoryUsage = Math.max(0, this.resourceUsage.memoryUsage - amount);
    this.emit('memoryReleased', { amount, total: this.resourceUsage.memoryUsage });
  }

  private allocateRedisConnection(): boolean {
    if (this.resourceUsage.redisConnections >= this.config.maxRedisConnections) {
      this.emit('redisConnectionFailed', { current: this.resourceUsage.redisConnections, max: this.config.maxRedisConnections });
      return false;
    }
    
    this.resourceUsage.redisConnections++;
    this.emit('redisConnectionAllocated', { total: this.resourceUsage.redisConnections });
    return true;
  }

  private releaseRedisConnection(): void {
    this.resourceUsage.redisConnections = Math.max(0, this.resourceUsage.redisConnections - 1);
    this.emit('redisConnectionReleased', { total: this.resourceUsage.redisConnections });
  }

  private allocateNetworkBandwidth(amount: number): boolean {
    // Simplified bandwidth allocation - in practice this would be more complex
    this.resourceUsage.networkBandwidth += amount;
    return true;
  }

  private releaseNetworkBandwidth(amount: number): void {
    this.resourceUsage.networkBandwidth = Math.max(0, this.resourceUsage.networkBandwidth - amount);
  }

  private evaluateScaling(): void {
    if (!this.config.adaptiveScaling.enabled || this.scalingState.isScaling) {
      return;
    }

    const now = Date.now();
    const timeSinceLastScale = now - this.scalingState.lastScaleAction;
    
    if (timeSinceLastScale < this.config.adaptiveScaling.cooldownPeriod * 1000) {
      return; // Still in cooldown period
    }

    const memoryUsagePercent = (this.resourceUsage.memoryUsage / this.config.maxMemoryUsage) * 100;
    
    if (memoryUsagePercent > this.config.adaptiveScaling.scaleUpThreshold) {
      this.scaleUp();
    } else if (memoryUsagePercent < this.config.adaptiveScaling.scaleDownThreshold) {
      this.scaleDown();
    }
  }

  private scaleUp(): void {
    if (this.scalingState.scaleDirection === 'down') {
      return; // Don't scale up immediately after scaling down
    }

    this.scalingState.isScaling = true;
    this.scalingState.scaleDirection = 'up';
    this.scalingState.lastScaleAction = Date.now();

    // Increase resource limits
    this.config.maxMemoryUsage = Math.min(
      this.config.maxMemoryUsage * 1.5,
      this.config.maxMemoryUsage * 3 // Max 3x original
    );
    
    this.config.maxConcurrentRequests = Math.min(
      this.config.maxConcurrentRequests * 1.2,
      this.config.maxConcurrentRequests * 2 // Max 2x original
    );

    this.emit('scaledUp', {
      newMemoryLimit: this.config.maxMemoryUsage,
      newConcurrencyLimit: this.config.maxConcurrentRequests
    });

    // Reset scaling state after cooldown
    setTimeout(() => {
      this.scalingState.isScaling = false;
      this.scalingState.scaleDirection = 'none';
    }, this.config.adaptiveScaling.cooldownPeriod * 1000);
  }

  private scaleDown(): void {
    if (this.scalingState.scaleDirection === 'up') {
      return; // Don't scale down immediately after scaling up
    }

    this.scalingState.isScaling = true;
    this.scalingState.scaleDirection = 'down';
    this.scalingState.lastScaleAction = Date.now();

    // Decrease resource limits (but not below original values)
    const originalMemoryLimit = this.config.maxMemoryUsage / 1.5;
    const originalConcurrencyLimit = this.config.maxConcurrentRequests / 1.2;

    this.config.maxMemoryUsage = Math.max(
      this.config.maxMemoryUsage * 0.8,
      originalMemoryLimit
    );
    
    this.config.maxConcurrentRequests = Math.max(
      this.config.maxConcurrentRequests * 0.9,
      originalConcurrencyLimit
    );

    this.emit('scaledDown', {
      newMemoryLimit: this.config.maxMemoryUsage,
      newConcurrencyLimit: this.config.maxConcurrentRequests
    });

    // Reset scaling state after cooldown
    setTimeout(() => {
      this.scalingState.isScaling = false;
      this.scalingState.scaleDirection = 'none';
    }, this.config.adaptiveScaling.cooldownPeriod * 1000);
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.updateCpuUsage();
      this.emit('resourceUpdate', this.resourceUsage);
    }, 5000); // Update every 5 seconds
  }

  private updateCpuUsage(): void {
    // Simplified CPU usage calculation
    // In practice, this would use system monitoring tools
    const usage = process.cpuUsage();
    this.resourceUsage.cpuUsage = (usage.user + usage.system) / 1000000; // Convert to seconds
  }

  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

interface ResourceUsage {
  memoryUsage: number; // MB
  cpuUsage: number; // CPU seconds
  redisConnections: number;
  concurrentRequests: number;
  networkBandwidth: number; // MB/s
}

interface ScalingState {
  isScaling: boolean;
  lastScaleAction: number;
  scaleDirection: 'up' | 'down' | 'none';
}
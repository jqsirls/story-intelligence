import { EventEmitter } from 'events';
import { 
  PredictiveLoadingConfig, 
  UsagePattern, 
  CacheKey, 
  CachePriority 
} from '../types';
import { MultiTierCacheManager } from './MultiTierCacheManager';

export class PredictiveLoader extends EventEmitter {
  private config: PredictiveLoadingConfig;
  private cacheManager: MultiTierCacheManager;
  private usagePatterns: Map<string, UsagePattern>;
  private predictionQueue: Map<string, PredictionTask>;
  private isRunning: boolean = false;

  constructor(config: PredictiveLoadingConfig, cacheManager: MultiTierCacheManager) {
    super();
    this.config = config;
    this.cacheManager = cacheManager;
    this.usagePatterns = new Map();
    this.predictionQueue = new Map();
    
    if (config.enabled) {
      this.start();
    }
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.scheduleNextPrediction();
    this.emit('started');
  }

  stop(): void {
    this.isRunning = false;
    this.predictionQueue.clear();
    this.emit('stopped');
  }

  recordAccess(userId: string, cacheKey: CacheKey, timestamp: number = Date.now()): void {
    if (!this.config.enabled) return;

    let pattern = this.usagePatterns.get(userId);
    if (!pattern) {
      pattern = {
        userId,
        accessTimes: [],
        frequentlyAccessedItems: [],
        sessionDuration: 0,
        preferredContentTypes: [],
        predictedNextAccess: []
      };
      this.usagePatterns.set(userId, pattern);
    }

    // Record access time
    pattern.accessTimes.push(timestamp);
    
    // Keep only recent access times (last 24 hours)
    const dayAgo = timestamp - (24 * 60 * 60 * 1000);
    pattern.accessTimes = pattern.accessTimes.filter(time => time > dayAgo);

    // Update frequently accessed items
    const itemKey = `${cacheKey.type}:${cacheKey.id}`;
    const existingIndex = pattern.frequentlyAccessedItems.indexOf(itemKey);
    if (existingIndex >= 0) {
      // Move to front (most recent)
      pattern.frequentlyAccessedItems.splice(existingIndex, 1);
    }
    pattern.frequentlyAccessedItems.unshift(itemKey);
    
    // Keep only top 20 items
    pattern.frequentlyAccessedItems = pattern.frequentlyAccessedItems.slice(0, 20);

    // Update preferred content types
    if (!pattern.preferredContentTypes.includes(cacheKey.type)) {
      pattern.preferredContentTypes.push(cacheKey.type);
    }

    // Generate predictions for this user
    this.generatePredictions(userId);
  }

  private generatePredictions(userId: string): void {
    const pattern = this.usagePatterns.get(userId);
    if (!pattern) return;

    const predictions: Array<{
      item: string;
      confidence: number;
      estimatedTime: number;
    }> = [];

    // Story progression predictions
    if (this.config.patterns.storyProgression) {
      predictions.push(...this.predictStoryProgression(pattern));
    }

    // User behavior predictions
    if (this.config.patterns.userBehavior) {
      predictions.push(...this.predictUserBehavior(pattern));
    }

    // Time-based predictions
    if (this.config.patterns.timeBasedAccess) {
      predictions.push(...this.predictTimeBasedAccess(pattern));
    }

    // Filter by confidence threshold and limit
    pattern.predictedNextAccess = predictions
      .filter(p => p.confidence >= this.config.confidenceThreshold)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.config.maxPredictions);

    // Schedule preloading for high-confidence predictions
    this.schedulePredictiveLoading(userId, pattern.predictedNextAccess);
  }

  private predictStoryProgression(pattern: UsagePattern): Array<{
    item: string;
    confidence: number;
    estimatedTime: number;
  }> {
    const predictions = [];
    const storyItems = pattern.frequentlyAccessedItems.filter(item => 
      item.startsWith('story:')
    );

    for (const storyItem of storyItems.slice(0, 3)) {
      const storyId = storyItem.split(':')[1];
      
      // Predict character access for this story
      predictions.push({
        item: `character:${storyId}`,
        confidence: 0.8,
        estimatedTime: Date.now() + (5 * 60 * 1000) // 5 minutes
      });

      // Predict asset access for this story
      predictions.push({
        item: `asset:${storyId}`,
        confidence: 0.7,
        estimatedTime: Date.now() + (10 * 60 * 1000) // 10 minutes
      });
    }

    return predictions;
  }

  private predictUserBehavior(pattern: UsagePattern): Array<{
    item: string;
    confidence: number;
    estimatedTime: number;
  }> {
    const predictions = [];
    
    // Predict based on frequently accessed items
    for (let i = 0; i < Math.min(5, pattern.frequentlyAccessedItems.length); i++) {
      const item = pattern.frequentlyAccessedItems[i];
      const confidence = Math.max(0.5, 1 - (i * 0.1)); // Decreasing confidence
      
      predictions.push({
        item,
        confidence,
        estimatedTime: Date.now() + (i * 2 * 60 * 1000) // Staggered timing
      });
    }

    return predictions;
  }

  private predictTimeBasedAccess(pattern: UsagePattern): Array<{
    item: string;
    confidence: number;
    estimatedTime: number;
  }> {
    const predictions = [];
    const now = new Date();
    const currentHour = now.getHours();
    
    // Analyze access patterns by hour
    const hourlyAccess = new Map<number, number>();
    pattern.accessTimes.forEach(timestamp => {
      const hour = new Date(timestamp).getHours();
      hourlyAccess.set(hour, (hourlyAccess.get(hour) || 0) + 1);
    });

    // Find peak hours
    const peakHours = Array.from(hourlyAccess.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => hour);

    // If current time is approaching a peak hour, predict access
    for (const peakHour of peakHours) {
      const hoursUntilPeak = (peakHour - currentHour + 24) % 24;
      if (hoursUntilPeak <= 2 && hoursUntilPeak > 0) {
        // Predict access to recently used items
        for (const item of pattern.frequentlyAccessedItems.slice(0, 3)) {
          predictions.push({
            item,
            confidence: 0.6,
            estimatedTime: Date.now() + (hoursUntilPeak * 60 * 60 * 1000)
          });
        }
      }
    }

    return predictions;
  }

  private schedulePredictiveLoading(userId: string, predictions: Array<{
    item: string;
    confidence: number;
    estimatedTime: number;
  }>): void {
    for (const prediction of predictions) {
      const taskId = `${userId}:${prediction.item}`;
      
      if (this.predictionQueue.has(taskId)) {
        continue; // Already scheduled
      }

      const delay = Math.max(0, prediction.estimatedTime - Date.now());
      const task: PredictionTask = {
        userId,
        item: prediction.item,
        confidence: prediction.confidence,
        scheduledTime: prediction.estimatedTime,
        timeout: setTimeout(() => {
          this.executePredictiveLoad(taskId, task);
        }, delay)
      };

      this.predictionQueue.set(taskId, task);
    }
  }

  private async executePredictiveLoad(taskId: string, task: PredictionTask): Promise<void> {
    try {
      const [type, id] = task.item.split(':');
      const cacheKey: CacheKey = {
        type: type as any,
        id,
        userId: task.userId
      };

      // Check if item is already cached
      const existing = await this.cacheManager.get(cacheKey);
      if (existing) {
        this.emit('predictiveHit', { taskId, task });
        return;
      }

      // Load from source (this would typically call the appropriate service)
      const data = await this.loadFromSource(cacheKey);
      if (data) {
        await this.cacheManager.set(cacheKey, data, 'low');
        this.emit('predictiveLoad', { taskId, task, success: true });
      }

    } catch (error) {
      this.emit('predictiveLoadError', { taskId, task, error });
    } finally {
      this.predictionQueue.delete(taskId);
    }
  }

  private async loadFromSource(cacheKey: CacheKey): Promise<any> {
    // This would be implemented to call the appropriate service
    // For now, return null to indicate no data available
    this.emit('sourceLoadRequested', { cacheKey });
    return null;
  }

  private scheduleNextPrediction(): void {
    if (!this.isRunning) return;

    setTimeout(() => {
      this.runPredictionCycle();
      this.scheduleNextPrediction();
    }, this.config.lookAheadTime * 60 * 1000); // Convert minutes to milliseconds
  }

  private runPredictionCycle(): void {
    for (const [userId] of this.usagePatterns) {
      this.generatePredictions(userId);
    }
    
    this.emit('predictionCycle', { 
      patterns: this.usagePatterns.size,
      queueSize: this.predictionQueue.size
    });
  }

  getUsagePattern(userId: string): UsagePattern | undefined {
    return this.usagePatterns.get(userId);
  }

  getPredictionQueue(): Map<string, PredictionTask> {
    return new Map(this.predictionQueue);
  }

  clearUserData(userId: string): void {
    this.usagePatterns.delete(userId);
    
    // Remove user's predictions from queue
    for (const [taskId, task] of this.predictionQueue) {
      if (task.userId === userId) {
        clearTimeout(task.timeout);
        this.predictionQueue.delete(taskId);
      }
    }
  }
}

interface PredictionTask {
  userId: string;
  item: string;
  confidence: number;
  scheduledTime: number;
  timeout: NodeJS.Timeout;
}
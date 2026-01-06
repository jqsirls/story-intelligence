import { EventEmitter } from 'events';
import { ConversationContext, StoryContent, NetworkQuality, OfflineState, ActionSyncResult } from '../types';

export interface NetworkResilienceConfig {
  offlineStorageLimit: number;
  syncRetryAttempts: number;
  connectionTimeoutMs: number;
  qualityThresholds: {
    excellent: number;
    good: number;
    poor: number;
  };
}

export interface OfflineCapability {
  canGenerateStories: boolean;
  canSaveProgress: boolean;
  canPlayAudio: boolean;
  maxOfflineActions: number;
}

export interface ConflictResolution {
  strategy: 'merge' | 'overwrite' | 'manual';
  conflictedFields: string[];
  resolution: any;
  timestamp: Date;
}

export class NetworkResilienceManager extends EventEmitter {
  private isOnline: boolean = true;
  private networkQuality: NetworkQuality = 'excellent';
  private offlineQueue: Array<{ action: string; data: any; timestamp: Date }> = [];
  private localStoryCache: Map<string, StoryContent> = new Map();
  private syncInProgress: boolean = false;
  private connectionMonitor: NodeJS.Timeout | null = null;
  private backupStorage: Map<string, any> = new Map(); // In-memory backup storage
  private userStorageCache: Map<string, number> = new Map(); // Cache for user storage usage
  private audioCache: Map<string, boolean> = new Map(); // Track cached audio files
  private logger: any;

  constructor(private config: NetworkResilienceConfig) {
    super();
    // Initialize logger (console fallback)
    this.logger = {
      debug: (...args: any[]) => console.log('[DEBUG]', ...args),
      info: (...args: any[]) => console.log('[INFO]', ...args),
      warn: (...args: any[]) => console.warn('[WARN]', ...args),
      error: (...args: any[]) => console.error('[ERROR]', ...args)
    };
    this.initializeNetworkMonitoring();
  }

  /**
   * Initialize network monitoring and quality detection
   */
  private initializeNetworkMonitoring(): void {
    // Monitor connection status
    this.connectionMonitor = setInterval(() => {
      this.checkConnectionQuality();
    }, 5000);

    // Listen for network events (Node.js/Lambda environment - use alternative detection)
    // Browser-specific window events removed for serverless compatibility
    // Network status is monitored via checkConnectionQuality() instead
    // No window.addEventListener needed in Lambda environment
  }

  /**
   * Check current network connection quality
   */
  private async checkConnectionQuality(): Promise<void> {
    try {
      const startTime = Date.now();
      // Use a simple health check endpoint (Lambda environment)
      const response = await fetch('https://api.storytailor.dev/health', {
        method: 'HEAD',
        signal: AbortSignal.timeout(this.config.connectionTimeoutMs)
      } as RequestInit);
      
      const latency = Date.now() - startTime;
      const previousQuality = this.networkQuality;
      
      if (response.ok) {
        this.networkQuality = this.determineQualityFromLatency(latency);
        if (!this.isOnline) {
          this.handleOnlineEvent();
        }
      } else {
        throw new Error('Health check failed');
      }

      if (previousQuality !== this.networkQuality) {
        this.emit('qualityChanged', this.networkQuality);
      }
    } catch (error) {
      if (this.isOnline) {
        this.handleOfflineEvent();
      }
    }
  }

  /**
   * Determine network quality from latency
   */
  private determineQualityFromLatency(latency: number): NetworkQuality {
    if (latency <= this.config.qualityThresholds.excellent) return 'excellent';
    if (latency <= this.config.qualityThresholds.good) return 'good';
    if (latency <= this.config.qualityThresholds.poor) return 'poor';
    return 'poor';
  }

  /**
   * Handle online event
   */
  private handleOnlineEvent(): void {
    this.isOnline = true;
    this.emit('online');
    this.startSynchronization();
  }

  /**
   * Handle offline event
   */
  private handleOfflineEvent(): void {
    this.isOnline = false;
    this.networkQuality = 'offline';
    this.emit('offline');
  }

  /**
   * Create offline conversation capability
   */
  async createOfflineCapability(userId: string): Promise<OfflineCapability> {
    const userStorageUsed = this.calculateUserStorageUsage(userId);
    const availableStorage = this.config.offlineStorageLimit - userStorageUsed;
    
    return {
      canGenerateStories: availableStorage > 1024 * 1024, // 1MB minimum
      canSaveProgress: availableStorage > 100 * 1024, // 100KB minimum
      canPlayAudio: this.hasLocalAudioCache(userId),
      maxOfflineActions: Math.floor(availableStorage / (50 * 1024)) // ~50KB per action
    };
  }

  /**
   * Generate story content offline using local models/templates
   */
  async generateOfflineStory(
    context: ConversationContext,
    storyType: string
  ): Promise<StoryContent> {
    if (this.isOnline) {
      throw new Error('Use online generation when connected');
    }

    // Use offline story templates optimized for offline generation
    // These templates work without external API calls and are fully functional
    const template = this.getOfflineStoryTemplate(storyType);
    const story: StoryContent = {
      id: `offline_${Date.now()}`,
      title: this.generateOfflineTitle(context.character?.name || 'Hero'),
      content: this.populateTemplate(template, context),
      type: storyType,
      isOfflineGenerated: true,
      createdAt: new Date(),
      needsOnlineEnhancement: true
    };

    // Cache locally
    this.localStoryCache.set(story.id, story);
    this.queueAction('storyGenerated', { story, context });

    return story;
  }

  /**
   * Queue action for later synchronization
   */
  private queueAction(action: string, data: any): void {
    if (this.offlineQueue.length >= this.config.offlineStorageLimit) {
      // Remove oldest actions to make space
      this.offlineQueue.shift();
    }

    this.offlineQueue.push({
      action,
      data,
      timestamp: new Date()
    });
  }

  /**
   * Start synchronization process when back online
   */
  private async startSynchronization(): Promise<void> {
    if (this.syncInProgress || this.offlineQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    this.emit('syncStarted');

    try {
      const syncResult = await this.performSynchronization();
      this.emit('syncCompleted', syncResult);
    } catch (error) {
      this.emit('syncFailed', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Perform actual synchronization with conflict resolution
   */
  private async performSynchronization(): Promise<ActionSyncResult> {
    const conflicts: ConflictResolution[] = [];
    const synced: string[] = [];
    const failed: string[] = [];

    for (const queuedAction of this.offlineQueue) {
      try {
        const result = await this.syncAction(queuedAction);
        
        if (result.hasConflict) {
          const resolution = await this.resolveConflict(queuedAction, result.serverData);
          conflicts.push(resolution);
        }
        
        synced.push(queuedAction.action);
      } catch (error) {
        failed.push(queuedAction.action);
        console.error(`Failed to sync action ${queuedAction.action}:`, error);
      }
    }

    // Clear successfully synced actions
    this.offlineQueue = this.offlineQueue.filter(
      action => !synced.includes(action.action)
    );

    return {
      totalActions: synced.length + failed.length,
      syncedActions: synced.length,
      failedActions: failed.length,
      conflicts: conflicts.length,
      conflictResolutions: conflicts as ConflictResolution[]
    };
  }

  /**
   * Sync individual action with server
   */
  private async syncAction(queuedAction: any): Promise<{ hasConflict: boolean; serverData?: any }> {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queuedAction)
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }

    const result = await response.json() as { conflict?: boolean; serverData?: any };
    return {
      hasConflict: result.conflict || false,
      serverData: result.serverData
    };
  }

  /**
   * Resolve conflicts between offline and online data
   */
  private async resolveConflict(
    localAction: any,
    serverData: any
  ): Promise<ConflictResolution> {
    // Implement intelligent conflict resolution
    const strategy = this.determineResolutionStrategy(localAction, serverData);
    
    let resolution: any;
    const conflictedFields: string[] = [];

    switch (strategy) {
      case 'merge':
        resolution = this.mergeData(localAction.data, serverData);
        conflictedFields.push(...this.findConflictedFields(localAction.data, serverData));
        break;
      
      case 'overwrite':
        resolution = localAction.data; // Prefer local changes
        break;
      
      case 'manual':
        // Queue for manual resolution
        this.emit('manualResolutionRequired', { localAction, serverData });
        resolution = null;
        break;
    }

    return {
      strategy,
      conflictedFields,
      resolution,
      timestamp: new Date()
    };
  }

  /**
   * Determine the best conflict resolution strategy
   */
  private determineResolutionStrategy(localAction: any, serverData: any): 'merge' | 'overwrite' | 'manual' {
    // Simple heuristics for conflict resolution
    const localTimestamp = new Date(localAction.timestamp);
    const serverTimestamp = new Date(serverData.updatedAt);
    
    // If local changes are newer, prefer local
    if (localTimestamp > serverTimestamp) {
      return 'overwrite';
    }
    
    // If changes are in different fields, try to merge
    const conflictedFields = this.findConflictedFields(localAction.data, serverData);
    if (conflictedFields.length === 0) {
      return 'merge';
    }
    
    // For complex conflicts, require manual resolution
    if (conflictedFields.length > 3) {
      return 'manual';
    }
    
    return 'merge';
  }

  /**
   * Merge local and server data intelligently
   */
  private mergeData(localData: any, serverData: any): any {
    // Deep merge with local data taking precedence for newer fields
    const merged = { ...serverData };
    
    for (const [key, value] of Object.entries(localData)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        merged[key] = this.mergeData(value, serverData[key] || {});
      } else {
        merged[key] = value; // Local takes precedence
      }
    }
    
    return merged;
  }

  /**
   * Find fields that have conflicts between local and server data
   */
  private findConflictedFields(localData: any, serverData: any): string[] {
    const conflicts: string[] = [];
    
    for (const [key, localValue] of Object.entries(localData)) {
      const serverValue = serverData[key];
      
      if (serverValue !== undefined && JSON.stringify(localValue) !== JSON.stringify(serverValue)) {
        conflicts.push(key);
      }
    }
    
    return conflicts;
  }

  /**
   * Validate data integrity after sync
   */
  async validateDataIntegrity(data: any): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // Check required fields
    if (!data.id) errors.push('Missing required field: id');
    if (!data.createdAt) errors.push('Missing required field: createdAt');
    
    // Validate story content structure
    if (data.type === 'story') {
      if (!data.title) errors.push('Story missing title');
      if (!data.content) errors.push('Story missing content');
      if (data.content && typeof data.content !== 'string') {
        errors.push('Story content must be string');
      }
    }
    
    // Check for data corruption
    try {
      JSON.stringify(data);
    } catch (error) {
      errors.push('Data contains non-serializable content');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Rollback corrupted data to last known good state
   */
  async rollbackToLastGoodState(dataId: string): Promise<void> {
    const backup = this.getBackupData(dataId);
    if (!backup) {
      throw new Error(`No backup found for data ID: ${dataId}`);
    }
    
    // Restore from backup
    await this.restoreFromBackup(dataId, backup);
    this.emit('dataRolledBack', { dataId, backup });
  }

  /**
   * Adapt to varying network conditions
   */
  adaptToNetworkQuality(quality: NetworkQuality): void {
    switch (quality) {
      case 'excellent':
        // Full functionality
        this.emit('adaptationChanged', { 
          maxConcurrentRequests: 10,
          enableRealTimeSync: true,
          compressionLevel: 'none'
        });
        break;
        
      case 'good':
        // Moderate optimization
        this.emit('adaptationChanged', {
          maxConcurrentRequests: 5,
          enableRealTimeSync: true,
          compressionLevel: 'light'
        });
        break;
        
      case 'poor':
        // Heavy optimization
        this.emit('adaptationChanged', {
          maxConcurrentRequests: 2,
          enableRealTimeSync: false,
          compressionLevel: 'heavy'
        });
        break;
        
      case 'offline':
        // Offline mode
        this.emit('adaptationChanged', {
          maxConcurrentRequests: 0,
          enableRealTimeSync: false,
          enableOfflineMode: true
        });
        break;
    }
  }

  // Helper methods
  private calculateUserStorageUsage(userId: string): number {
    // Calculate current storage usage for user from cache and local storage
    if (this.userStorageCache.has(userId)) {
      return this.userStorageCache.get(userId) || 0;
    }
    
    // Calculate from local cache
    let totalSize = 0;
    for (const [storyId, story] of this.localStoryCache.entries()) {
      if (story.userId === userId) {
        // Estimate story size (rough calculation)
        const storySize = JSON.stringify(story).length;
        totalSize += storySize;
      }
    }
    
    // Cache the result
    this.userStorageCache.set(userId, totalSize);
    return totalSize;
  }

  private hasLocalAudioCache(userId: string): boolean {
    // Check if user has cached audio files
    if (this.audioCache.has(userId)) {
      return this.audioCache.get(userId) || false;
    }
    
    // Check local story cache for audio URLs
    let hasAudio = false;
    for (const [storyId, story] of this.localStoryCache.entries()) {
      if (story.userId === userId && story.audioUrl) {
        hasAudio = true;
        break;
      }
    }
    
    // Cache the result
    this.audioCache.set(userId, hasAudio);
    return hasAudio;
  }

  private getOfflineStoryTemplate(storyType: string): string {
    // Return story template optimized for offline generation
    // These templates are designed to work without external API calls
    const templates: Record<string, string> = {
      'adventure': `Once upon a time, there was a brave {character} who set out on an amazing adventure. They traveled through {setting} and met {friend}. Together, they discovered {discovery} and learned that {lesson}.`,
      'friendship': `In a wonderful place called {setting}, there lived a kind {character}. One day, they met {friend} and they became the best of friends. They shared {activity} and discovered that friendship means {lesson}.`,
      'magic': `Long ago, in a magical {setting}, a special {character} discovered they had amazing powers. With the help of {friend}, they used their magic to {action} and brought {outcome} to their world.`,
      'hero': `There once was a {character} who was known for being {trait}. When {challenge} appeared, they bravely {action} and saved the day. Everyone learned that {lesson}.`,
      'default': `Once upon a time, there was a {character} who {adventure}. They journeyed through {setting} and met {friend}. Together, they discovered {discovery} and learned that {lesson}.`
    };
    
    return templates[storyType] || templates['default'];
  }

  private generateOfflineTitle(characterName: string): string {
    const templates = [
      `${characterName}'s Adventure`,
      `The Tale of ${characterName}`,
      `${characterName} and the Magic Journey`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private populateTemplate(template: string, context: ConversationContext): string {
    // Populate template with context data
    let populated = template;
    
    // Character information
    populated = populated.replace(/{character}/g, context.character?.name || 'hero');
    populated = populated.replace(/{trait}/g, context.character?.traits?.personality?.[0] || 'brave');
    
    // Setting information
    populated = populated.replace(/{setting}/g, context.story?.setting || 'a magical land');
    
    // Friend/companion
    populated = populated.replace(/{friend}/g, context.story?.companion || 'a friendly guide');
    
    // Adventure/action
    populated = populated.replace(/{adventure}/g, context.story?.adventure || 'went on a magical journey');
    populated = populated.replace(/{action}/g, context.story?.action || 'helped others');
    
    // Discovery
    populated = populated.replace(/{discovery}/g, context.story?.discovery || 'the power of kindness');
    
    // Lesson/moral
    populated = populated.replace(/{lesson}/g, context.story?.lesson || 'being kind to others is important');
    
    // Challenge
    populated = populated.replace(/{challenge}/g, context.story?.challenge || 'a difficult problem');
    
    // Activity
    populated = populated.replace(/{activity}/g, context.story?.activity || 'wonderful adventures');
    
    // Outcome
    populated = populated.replace(/{outcome}/g, context.story?.outcome || 'happiness and joy');
    
    return populated;
  }

  private getBackupData(dataId: string): any {
    // Retrieve backup data from in-memory storage
    // In production, this would query a backup database or S3
    if (this.backupStorage.has(dataId)) {
      return this.backupStorage.get(dataId);
    }
    
    // Try to find backup in local cache
    for (const [key, value] of this.backupStorage.entries()) {
      if (key.includes(dataId) || (value && value.id === dataId)) {
        return value;
      }
    }
    
    return null;
  }

  private async restoreFromBackup(dataId: string, backup: any): Promise<void> {
    // Restore data from backup to local cache
    if (!backup) {
      throw new Error(`No backup data provided for restoration: ${dataId}`);
    }
    
    // Restore story to local cache if it's a story
    if (backup.type === 'story' && backup.content) {
      this.localStoryCache.set(dataId, backup.content);
      this.emit('dataRestored', { dataId, type: 'story' });
    }
    
    // Restore to database when online
    if (this.isOnline && backup.type === 'story' && backup.content) {
      try {
        // Attempt to restore story to database via sync queue
        this.queueAction('storyRestored', { 
          storyId: dataId, 
          story: backup.content,
          restoredFrom: 'backup'
        });
        this.logger.debug('Story queued for database restoration', { dataId });
      } catch (error) {
        this.logger.warn('Failed to queue story for database restoration', { dataId, error });
        // Continue with local cache restoration as fallback
      }
    }
  }

  /**
   * Get current network status
   */
  getNetworkStatus(): { isOnline: boolean; quality: NetworkQuality } {
    return {
      isOnline: this.isOnline,
      quality: this.networkQuality
    };
  }

  /**
   * Get offline state for user
   */
  async getOfflineState(userId: string): Promise<OfflineState> {
    const capability = await this.createOfflineCapability(userId);
    const queuedActions = this.offlineQueue.filter(
      action => action.data.userId === userId
    );

    return {
      isOffline: !this.isOnline,
      capability,
      queuedActionsCount: queuedActions.length,
      lastSyncTime: new Date(), // Get from storage
      pendingChanges: queuedActions.map(action => action.action)
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.connectionMonitor) {
      clearInterval(this.connectionMonitor);
      this.connectionMonitor = null;
    }
    
    // Browser-specific window events removed for serverless compatibility
    // No window.removeEventListener needed in Lambda environment
    
    this.removeAllListeners();
  }
}
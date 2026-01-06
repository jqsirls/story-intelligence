import { EventEmitter } from 'events';
import { ConversationContext, StoryContent, NetworkQuality, OfflineState, SyncResult } from '../types';

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

  constructor(private config: NetworkResilienceConfig) {
    super();
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

    // Listen for network events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnlineEvent());
      window.addEventListener('offline', () => this.handleOfflineEvent());
    }
  }

  /**
   * Check current network connection quality
   */
  private async checkConnectionQuality(): Promise<void> {
    try {
      const startTime = Date.now();
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(this.config.connectionTimeoutMs)
      });
      
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

    // Use simplified story templates for offline generation
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
  private async performSynchronization(): Promise<SyncResult> {
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
      conflictResolutions: conflicts
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

    const result = await response.json();
    return {
      hasConflict: result.conflict,
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
    // Calculate current storage usage for user
    return 0; // Placeholder
  }

  private hasLocalAudioCache(userId: string): boolean {
    // Check if user has cached audio files
    return false; // Placeholder
  }

  private getOfflineStoryTemplate(storyType: string): string {
    // Return simplified story template for offline use
    return `Once upon a time, there was a {character} who {adventure}...`;
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
    return template
      .replace('{character}', context.character?.name || 'hero')
      .replace('{adventure}', 'went on a magical journey');
  }

  private getBackupData(dataId: string): any {
    // Retrieve backup data
    return null; // Placeholder
  }

  private async restoreFromBackup(dataId: string, backup: any): Promise<void> {
    // Restore data from backup
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
    }
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnlineEvent);
      window.removeEventListener('offline', this.handleOfflineEvent);
    }
    
    this.removeAllListeners();
  }
}
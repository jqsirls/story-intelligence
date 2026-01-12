import { Logger } from 'winston';
// @ts-ignore - Event-system is bundled at runtime, types may not be available during compilation
import { EventPublisher } from '@alexa-multi-agent/event-system';

/**
 * Cross-Channel Synchronization System
 * Manages conversation state synchronization across multiple channels
 */
export class CrossChannelSynchronizer {
  private logger: Logger;
  private eventPublisher: EventPublisher;
  private syncQueue: Map<string, SyncOperation[]> = new Map();
  private conflictResolver: ConflictResolver;
  private stateManager: StateManager;

  constructor(logger: Logger, eventPublisher: EventPublisher) {
    this.logger = logger;
    this.eventPublisher = eventPublisher;
    this.conflictResolver = new ConflictResolver(logger);
    this.stateManager = new StateManager(logger);
  }

  /**
   * Synchronize conversation state across multiple channels
   */
  async synchronizeChannels(request: ChannelSyncRequest): Promise<ChannelSyncResult> {
    const syncId = this.generateSyncId();
    const startTime = Date.now();

    try {
      this.logger.info('Starting cross-channel synchronization', {
        syncId,
        sourceChannel: request.sourceChannel,
        targetChannels: request.targetChannels,
        syncType: request.syncType
      });

      // Validate sync request
      this.validateSyncRequest(request);

      // Get source state
      const sourceState = await this.stateManager.getChannelState(
        request.sessionId,
        request.sourceChannel
      );

      if (!sourceState) {
        throw new Error(`Source channel state not found: ${request.sourceChannel}`);
      }

      // Perform synchronization for each target channel
      const syncResults: ChannelSyncOperation[] = [];
      const conflicts: SyncConflict[] = [];

      for (const targetChannel of request.targetChannels) {
        try {
          const result = await this.syncToChannel(
            request.sessionId,
            request.sourceChannel,
            targetChannel,
            sourceState,
            request.syncType,
            request.conflictResolution
          );

          syncResults.push(result);
          conflicts.push(...result.conflicts);

        } catch (error) {
          this.logger.error('Channel sync failed', {
            syncId,
            targetChannel,
            error: error instanceof Error ? error.message : String(error)
          });

          syncResults.push({
            targetChannel,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            conflicts: [],
            syncedFields: [],
            duration: 0
          });
        }
      }

      // Create final result
      const result: ChannelSyncResult = {
        syncId,
        sessionId: request.sessionId,
        sourceChannel: request.sourceChannel,
        targetChannels: request.targetChannels,
        syncType: request.syncType,
        syncedAt: new Date().toISOString(),
        success: syncResults.every(r => r.success),
        conflicts,
        operations: syncResults,
        metadata: {
          duration: Date.now() - startTime,
          conflictCount: conflicts.length,
          successfulChannels: syncResults.filter(r => r.success).length,
          failedChannels: syncResults.filter(r => !r.success).length
        }
      };

      this.logger.info('Cross-channel synchronization completed', {
        syncId,
        success: result.success,
        duration: result.metadata.duration,
        conflictCount: conflicts.length
      });

      return result;

    } catch (error) {
      this.logger.error('Cross-channel synchronization failed', {
        syncId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });

      return {
        syncId,
        sessionId: request.sessionId,
        sourceChannel: request.sourceChannel,
        targetChannels: request.targetChannels,
        syncType: request.syncType,
        syncedAt: new Date().toISOString(),
        success: false,
        conflicts: [],
        operations: [],
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          duration: Date.now() - startTime,
          conflictCount: 0,
          successfulChannels: 0,
          failedChannels: request.targetChannels.length
        }
      };
    }
  }

  /**
   * Handle real-time state changes and propagate to other channels
   */
  async propagateStateChange(change: StateChangeEvent): Promise<void> {
    try {
      this.logger.debug('Propagating state change', {
        sessionId: change.sessionId,
        sourceChannel: change.sourceChannel,
        changeType: change.changeType,
        affectedFields: change.affectedFields
      });

      // Get all active channels for this session
      const activeChannels = await this.stateManager.getActiveChannels(change.sessionId);
      const targetChannels = activeChannels.filter(channel => channel !== change.sourceChannel);

      if (targetChannels.length === 0) {
        this.logger.debug('No target channels for state propagation', {
          sessionId: change.sessionId,
          sourceChannel: change.sourceChannel
        });
        return;
      }

      // Create sync request for real-time propagation
      const syncRequest: ChannelSyncRequest = {
        sessionId: change.sessionId,
        sourceChannel: change.sourceChannel,
        targetChannels,
        syncType: 'incremental',
        conflictResolution: 'source_wins', // Real-time changes take precedence
        metadata: {
          realTime: true,
          changeType: change.changeType,
          affectedFields: change.affectedFields
        }
      };

      // Perform synchronization
      await this.synchronizeChannels(syncRequest);

    } catch (error) {
      this.logger.error('State change propagation failed', {
        error: error instanceof Error ? error.message : String(error),
        sessionId: change.sessionId,
        sourceChannel: change.sourceChannel
      });
    }
  }

  /**
   * Detect and resolve conflicts between channel states
   */
  async detectConflicts(
    sessionId: string,
    sourceChannel: string,
    targetChannel: string,
    sourceState: ChannelState,
    targetState: ChannelState
  ): Promise<SyncConflict[]> {
    const conflicts: SyncConflict[] = [];

    try {
      // Compare conversation phase
      if (sourceState.conversationPhase !== targetState.conversationPhase) {
        conflicts.push({
          field: 'conversationPhase',
          sourceValue: sourceState.conversationPhase,
          targetValue: targetState.conversationPhase,
          conflictType: 'value_mismatch',
          severity: 'high',
          resolution: 'manual_required'
        });
      }

      // Compare story state
      if (sourceState.currentStory && targetState.currentStory) {
        const storyConflicts = this.compareStoryStates(
          sourceState.currentStory,
          targetState.currentStory
        );
        conflicts.push(...storyConflicts);
      }

      // Compare character state
      if (sourceState.currentCharacter && targetState.currentCharacter) {
        const characterConflicts = this.compareCharacterStates(
          sourceState.currentCharacter,
          targetState.currentCharacter
        );
        conflicts.push(...characterConflicts);
      }

      // Compare user preferences
      if (sourceState.userPreferences && targetState.userPreferences) {
        const preferenceConflicts = this.comparePreferences(
          sourceState.userPreferences,
          targetState.userPreferences
        );
        conflicts.push(...preferenceConflicts);
      }

      // Compare interaction history
      const historyConflicts = this.compareInteractionHistory(
        sourceState.interactionHistory || [],
        targetState.interactionHistory || []
      );
      conflicts.push(...historyConflicts);

      this.logger.debug('Conflict detection completed', {
        sessionId,
        sourceChannel,
        targetChannel,
        conflictCount: conflicts.length,
        highSeverityConflicts: conflicts.filter(c => c.severity === 'high').length
      });

      return conflicts;

    } catch (error) {
      this.logger.error('Conflict detection failed', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
        sourceChannel,
        targetChannel
      });
      return [];
    }
  }

  /**
   * Queue sync operation for batch processing
   */
  async queueSyncOperation(operation: SyncOperation): Promise<void> {
    const sessionQueue = this.syncQueue.get(operation.sessionId) || [];
    sessionQueue.push(operation);
    this.syncQueue.set(operation.sessionId, sessionQueue);

    this.logger.debug('Sync operation queued', {
      sessionId: operation.sessionId,
      operationType: operation.type,
      queueSize: sessionQueue.length
    });

    // Process queue if it reaches threshold
    if (sessionQueue.length >= 5) {
      await this.processSyncQueue(operation.sessionId);
    }
  }

  /**
   * Process queued sync operations for a session
   */
  async processSyncQueue(sessionId: string): Promise<void> {
    const queue = this.syncQueue.get(sessionId);
    if (!queue || queue.length === 0) {
      return;
    }

    try {
      this.logger.info('Processing sync queue', {
        sessionId,
        operationCount: queue.length
      });

      // Group operations by target channel
      const channelOperations = new Map<string, SyncOperation[]>();
      
      for (const operation of queue) {
        for (const targetChannel of operation.targetChannels) {
          const ops = channelOperations.get(targetChannel) || [];
          ops.push(operation);
          channelOperations.set(targetChannel, ops);
        }
      }

      // Process operations for each channel
      for (const [targetChannel, operations] of channelOperations.entries()) {
        await this.processBatchOperations(sessionId, targetChannel, operations);
      }

      // Clear processed queue
      this.syncQueue.delete(sessionId);

      this.logger.info('Sync queue processed successfully', {
        sessionId,
        processedOperations: queue.length
      });

    } catch (error) {
      this.logger.error('Sync queue processing failed', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
        queueSize: queue.length
      });
    }
  }

  /**
   * Get synchronization status for a session
   */
  async getSyncStatus(sessionId: string): Promise<SyncStatus> {
    try {
      const activeChannels = await this.stateManager.getActiveChannels(sessionId);
      const channelStates = new Map<string, ChannelState>();

      // Get state for each active channel
      for (const channel of activeChannels) {
        const state = await this.stateManager.getChannelState(sessionId, channel);
        if (state) {
          channelStates.set(channel, state);
        }
      }

      // Detect conflicts between channels
      const conflicts: SyncConflict[] = [];
      const channels = Array.from(channelStates.keys());
      
      for (let i = 0; i < channels.length; i++) {
        for (let j = i + 1; j < channels.length; j++) {
          const sourceChannel = channels[i];
          const targetChannel = channels[j];
          const sourceState = channelStates.get(sourceChannel)!;
          const targetState = channelStates.get(targetChannel)!;

          const channelConflicts = await this.detectConflicts(
            sessionId,
            sourceChannel,
            targetChannel,
            sourceState,
            targetState
          );
          conflicts.push(...channelConflicts);
        }
      }

      // Calculate sync health
      const syncHealth = this.calculateSyncHealth(channelStates, conflicts);

      const status: SyncStatus = {
        sessionId,
        activeChannels,
        lastSyncTime: this.getLastSyncTime(sessionId),
        conflicts,
        syncHealth,
        queuedOperations: this.syncQueue.get(sessionId)?.length || 0,
        metadata: {
          channelCount: activeChannels.length,
          conflictCount: conflicts.length,
          highPriorityConflicts: conflicts.filter(c => c.severity === 'high').length
        }
      };

      return status;

    } catch (error) {
      this.logger.error('Failed to get sync status', {
        error: error instanceof Error ? error.message : String(error),
        sessionId
      });

      return {
        sessionId,
        activeChannels: [],
        lastSyncTime: null,
        conflicts: [],
        syncHealth: 'unknown',
        queuedOperations: 0,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          channelCount: 0,
          conflictCount: 0,
          highPriorityConflicts: 0
        }
      };
    }
  }

  // Private helper methods

  private async syncToChannel(
    sessionId: string,
    sourceChannel: string,
    targetChannel: string,
    sourceState: ChannelState,
    syncType: string,
    conflictResolution: string
  ): Promise<ChannelSyncOperation> {
    const startTime = Date.now();

    try {
      // Get target channel state
      const targetState = await this.stateManager.getChannelState(sessionId, targetChannel);

      // Detect conflicts
      const conflicts = targetState 
        ? await this.detectConflicts(sessionId, sourceChannel, targetChannel, sourceState, targetState)
        : [];

      // Resolve conflicts
      const resolvedState = await this.conflictResolver.resolveConflicts(
        sourceState,
        targetState,
        conflicts,
        conflictResolution
      );

      // Apply resolved state to target channel
      const syncedFields = await this.stateManager.updateChannelState(
        sessionId,
        targetChannel,
        resolvedState,
        syncType
      );

      return {
        targetChannel,
        success: true,
        conflicts,
        syncedFields,
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        targetChannel,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        conflicts: [],
        syncedFields: [],
        duration: Date.now() - startTime
      };
    }
  }

  private validateSyncRequest(request: ChannelSyncRequest): void {
    if (!request.sessionId) {
      throw new Error('Session ID is required');
    }

    if (!request.sourceChannel) {
      throw new Error('Source channel is required');
    }

    if (!request.targetChannels || request.targetChannels.length === 0) {
      throw new Error('Target channels are required');
    }

    if (request.targetChannels.includes(request.sourceChannel)) {
      throw new Error('Source channel cannot be in target channels');
    }

    const validSyncTypes = ['full', 'incremental', 'state', 'context'];
    if (!validSyncTypes.includes(request.syncType)) {
      throw new Error(`Invalid sync type: ${request.syncType}`);
    }

    const validResolutions = ['source_wins', 'target_wins', 'merge', 'manual'];
    if (!validResolutions.includes(request.conflictResolution)) {
      throw new Error(`Invalid conflict resolution: ${request.conflictResolution}`);
    }
  }

  private compareStoryStates(sourceStory: any, targetStory: any): SyncConflict[] {
    const conflicts: SyncConflict[] = [];

    if (sourceStory.id !== targetStory.id) {
      conflicts.push({
        field: 'story.id',
        sourceValue: sourceStory.id,
        targetValue: targetStory.id,
        conflictType: 'value_mismatch',
        severity: 'high',
        resolution: 'manual_required'
      });
    }

    if (sourceStory.title !== targetStory.title) {
      conflicts.push({
        field: 'story.title',
        sourceValue: sourceStory.title,
        targetValue: targetStory.title,
        conflictType: 'value_mismatch',
        severity: 'medium',
        resolution: 'source_wins'
      });
    }

    if (sourceStory.content !== targetStory.content) {
      conflicts.push({
        field: 'story.content',
        sourceValue: sourceStory.content,
        targetValue: targetStory.content,
        conflictType: 'content_mismatch',
        severity: 'high',
        resolution: 'merge'
      });
    }

    return conflicts;
  }

  private compareCharacterStates(sourceCharacter: any, targetCharacter: any): SyncConflict[] {
    const conflicts: SyncConflict[] = [];

    if (sourceCharacter.id !== targetCharacter.id) {
      conflicts.push({
        field: 'character.id',
        sourceValue: sourceCharacter.id,
        targetValue: targetCharacter.id,
        conflictType: 'value_mismatch',
        severity: 'high',
        resolution: 'manual_required'
      });
    }

    if (sourceCharacter.name !== targetCharacter.name) {
      conflicts.push({
        field: 'character.name',
        sourceValue: sourceCharacter.name,
        targetValue: targetCharacter.name,
        conflictType: 'value_mismatch',
        severity: 'medium',
        resolution: 'source_wins'
      });
    }

    // Compare traits
    const sourceTraits = JSON.stringify(sourceCharacter.traits || {});
    const targetTraits = JSON.stringify(targetCharacter.traits || {});
    
    if (sourceTraits !== targetTraits) {
      conflicts.push({
        field: 'character.traits',
        sourceValue: sourceCharacter.traits,
        targetValue: targetCharacter.traits,
        conflictType: 'object_mismatch',
        severity: 'medium',
        resolution: 'merge'
      });
    }

    return conflicts;
  }

  private comparePreferences(sourcePrefs: any, targetPrefs: any): SyncConflict[] {
    const conflicts: SyncConflict[] = [];

    // Compare voice settings
    if (sourcePrefs.voice && targetPrefs.voice) {
      if (JSON.stringify(sourcePrefs.voice) !== JSON.stringify(targetPrefs.voice)) {
        conflicts.push({
          field: 'preferences.voice',
          sourceValue: sourcePrefs.voice,
          targetValue: targetPrefs.voice,
          conflictType: 'object_mismatch',
          severity: 'low',
          resolution: 'target_wins' // Keep channel-specific voice preferences
        });
      }
    }

    // Compare accessibility settings
    if (sourcePrefs.accessibility && targetPrefs.accessibility) {
      if (JSON.stringify(sourcePrefs.accessibility) !== JSON.stringify(targetPrefs.accessibility)) {
        conflicts.push({
          field: 'preferences.accessibility',
          sourceValue: sourcePrefs.accessibility,
          targetValue: targetPrefs.accessibility,
          conflictType: 'object_mismatch',
          severity: 'medium',
          resolution: 'merge'
        });
      }
    }

    return conflicts;
  }

  private compareInteractionHistory(sourceHistory: any[], targetHistory: any[]): SyncConflict[] {
    const conflicts: SyncConflict[] = [];

    if (sourceHistory.length !== targetHistory.length) {
      conflicts.push({
        field: 'interactionHistory.length',
        sourceValue: sourceHistory.length,
        targetValue: targetHistory.length,
        conflictType: 'count_mismatch',
        severity: 'low',
        resolution: 'merge'
      });
    }

    // Compare recent interactions (last 5)
    const recentSource = sourceHistory.slice(-5);
    const recentTarget = targetHistory.slice(-5);

    for (let i = 0; i < Math.min(recentSource.length, recentTarget.length); i++) {
      const sourceItem = recentSource[i];
      const targetItem = recentTarget[i];

      if (sourceItem.timestamp !== targetItem.timestamp) {
        conflicts.push({
          field: `interactionHistory[${i}].timestamp`,
          sourceValue: sourceItem.timestamp,
          targetValue: targetItem.timestamp,
          conflictType: 'timestamp_mismatch',
          severity: 'low',
          resolution: 'source_wins'
        });
      }
    }

    return conflicts;
  }

  private async processBatchOperations(
    sessionId: string,
    targetChannel: string,
    operations: SyncOperation[]
  ): Promise<void> {
    try {
      // Merge operations for efficiency
      const mergedOperation = this.mergeOperations(operations);

      // Apply merged operation
      await this.applySyncOperation(sessionId, targetChannel, mergedOperation);

      this.logger.debug('Batch operations processed', {
        sessionId,
        targetChannel,
        operationCount: operations.length
      });

    } catch (error) {
      this.logger.error('Batch operation processing failed', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
        targetChannel,
        operationCount: operations.length
      });
    }
  }

  private mergeOperations(operations: SyncOperation[]): SyncOperation {
    // Merge multiple operations into a single operation
    const merged: SyncOperation = {
      id: this.generateOperationId(),
      sessionId: operations[0].sessionId,
      type: 'batch',
      sourceChannel: operations[0].sourceChannel,
      targetChannels: operations[0].targetChannels,
      changes: {},
      timestamp: new Date().toISOString(),
      priority: Math.max(...operations.map(op => op.priority || 5))
    };

    // Merge changes from all operations
    for (const operation of operations) {
      Object.assign(merged.changes, operation.changes);
    }

    return merged;
  }

  private async applySyncOperation(
    sessionId: string,
    targetChannel: string,
    operation: SyncOperation
  ): Promise<void> {
    // Apply the sync operation to the target channel
    await this.stateManager.applyChanges(sessionId, targetChannel, operation.changes);
  }

  private calculateSyncHealth(
    channelStates: Map<string, ChannelState>,
    conflicts: SyncConflict[]
  ): 'healthy' | 'degraded' | 'critical' | 'unknown' {
    if (channelStates.size === 0) {
      return 'unknown';
    }

    if (channelStates.size === 1) {
      return 'healthy'; // Single channel, no sync issues
    }

    const highPriorityConflicts = conflicts.filter(c => c.severity === 'high').length;
    const totalConflicts = conflicts.length;

    if (highPriorityConflicts > 0) {
      return 'critical';
    }

    if (totalConflicts > channelStates.size * 2) {
      return 'degraded';
    }

    return 'healthy';
  }

  private getLastSyncTime(sessionId: string): string | null {
    // Get last sync time from state manager
    return this.stateManager.getLastSyncTime(sessionId);
  }

  private generateSyncId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Helper classes

class ConflictResolver {
  constructor(private logger: Logger) {}

  async resolveConflicts(
    sourceState: ChannelState,
    targetState: ChannelState | null,
    conflicts: SyncConflict[],
    resolution: string
  ): Promise<ChannelState> {
    if (!targetState) {
      return sourceState; // No target state, use source
    }

    const resolvedState = { ...targetState };

    for (const conflict of conflicts) {
      try {
        const resolvedValue = await this.resolveConflict(
          conflict,
          sourceState,
          targetState,
          resolution
        );

        this.setNestedValue(resolvedState, conflict.field, resolvedValue);
        conflict.resolution = this.getResolutionType(resolvedValue, conflict) as any;

      } catch (error) {
        this.logger.error('Conflict resolution failed', {
          error: error instanceof Error ? error.message : String(error),
          field: conflict.field,
          conflictType: conflict.conflictType
        });
        conflict.resolution = 'manual_required';
      }
    }

    return resolvedState;
  }

  private async resolveConflict(
    conflict: SyncConflict,
    sourceState: ChannelState,
    targetState: ChannelState,
    resolution: string
  ): Promise<any> {
    switch (resolution) {
      case 'source_wins':
        return conflict.sourceValue;
      
      case 'target_wins':
        return conflict.targetValue;
      
      case 'merge':
        return this.mergeValues(conflict.sourceValue, conflict.targetValue, conflict.conflictType);
      
      default:
        throw new Error(`Unknown resolution strategy: ${resolution}`);
    }
  }

  private mergeValues(sourceValue: any, targetValue: any, conflictType: string): any {
    switch (conflictType) {
      case 'object_mismatch':
        return { ...targetValue, ...sourceValue };
      
      case 'array_mismatch':
        return [...new Set([...targetValue, ...sourceValue])];
      
      case 'content_mismatch':
        // For content, prefer the longer/more complete version
        return sourceValue.length > targetValue.length ? sourceValue : targetValue;
      
      default:
        return sourceValue; // Default to source value
    }
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  private getResolutionType(resolvedValue: any, conflict: SyncConflict): string {
    if (JSON.stringify(resolvedValue) === JSON.stringify(conflict.sourceValue)) {
      return 'source';
    } else if (JSON.stringify(resolvedValue) === JSON.stringify(conflict.targetValue)) {
      return 'target';
    } else {
      return 'merged';
    }
  }
}

class StateManager {
  constructor(private logger: Logger) {}

  async getChannelState(sessionId: string, channel: string): Promise<ChannelState | null> {
    // Implementation would retrieve state from storage
    // This is a placeholder
    return null;
  }

  async updateChannelState(
    sessionId: string,
    channel: string,
    state: ChannelState,
    syncType: string
  ): Promise<string[]> {
    // Implementation would update state in storage
    // Return list of updated fields
    return [];
  }

  async getActiveChannels(sessionId: string): Promise<string[]> {
    // Implementation would return list of active channels for session
    return [];
  }

  async applyChanges(sessionId: string, channel: string, changes: any): Promise<void> {
    // Implementation would apply changes to channel state
  }

  getLastSyncTime(sessionId: string): string | null {
    // Implementation would return last sync time
    return null;
  }
}

// Type definitions
export interface ChannelSyncRequest {
  sessionId: string;
  sourceChannel: string;
  targetChannels: string[];
  syncType: 'full' | 'incremental' | 'state' | 'context';
  conflictResolution: 'source_wins' | 'target_wins' | 'merge' | 'manual';
  metadata?: {
    realTime?: boolean;
    changeType?: string;
    affectedFields?: string[];
  };
}

export interface ChannelSyncResult {
  syncId: string;
  sessionId: string;
  sourceChannel: string;
  targetChannels: string[];
  syncType: string;
  syncedAt: string;
  success: boolean;
  conflicts: SyncConflict[];
  operations: ChannelSyncOperation[];
  error?: string;
  metadata: {
    duration: number;
    conflictCount: number;
    successfulChannels: number;
    failedChannels: number;
  };
}

export interface SyncConflict {
  field: string;
  sourceValue: any;
  targetValue: any;
  conflictType: 'value_mismatch' | 'object_mismatch' | 'array_mismatch' | 'content_mismatch' | 'timestamp_mismatch' | 'count_mismatch';
  severity: 'low' | 'medium' | 'high';
  resolution: 'source_wins' | 'target_wins' | 'merge' | 'manual' | 'source' | 'target' | 'merged' | 'manual_required';
}

interface ChannelSyncOperation {
  targetChannel: string;
  success: boolean;
  conflicts: SyncConflict[];
  syncedFields: string[];
  duration: number;
  error?: string;
}

interface StateChangeEvent {
  sessionId: string;
  sourceChannel: string;
  changeType: string;
  affectedFields: string[];
  timestamp: string;
}

interface SyncOperation {
  id: string;
  sessionId: string;
  type: string;
  sourceChannel: string;
  targetChannels: string[];
  changes: any;
  timestamp: string;
  priority?: number;
}

interface ChannelState {
  conversationPhase: string;
  currentStory?: any;
  currentCharacter?: any;
  userPreferences?: any;
  interactionHistory?: any[];
  lastUpdated: string;
}

interface SyncStatus {
  sessionId: string;
  activeChannels: string[];
  lastSyncTime: string | null;
  conflicts: SyncConflict[];
  syncHealth: 'healthy' | 'degraded' | 'critical' | 'unknown';
  queuedOperations: number;
  error?: string;
  metadata: {
    channelCount: number;
    conflictCount: number;
    highPriorityConflicts: number;
  };
}
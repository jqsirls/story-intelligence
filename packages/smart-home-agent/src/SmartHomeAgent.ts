import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createClient as createRedisClient, RedisClientType } from 'redis';
import { Database } from '@alexa-multi-agent/shared-types';
import { Logger } from 'winston';
import * as winston from 'winston';

import { 
  SmartHomeAgentConfig,
  EnvironmentProfile,
  DeviceDiscoveryResult,
  LightingCommand,
  NarrativeSync,
  SmartHomeMetrics,
  DeviceHealthCheck,
  RoomConfiguration
} from './types';

import {
  DeviceType,
  DeviceConnectionConfig,
  LightingProfile,
  LightingState,
  NarrativeEvent,
  DeviceConnection
} from '@alexa-multi-agent/shared-types';

import { SmartHomeTokenManager } from './token/TokenManager';
import { PhilipsHueManager } from './devices/PhilipsHueManager';
import { IoTPrivacyController } from './privacy/IoTPrivacyController';
import { LightingOrchestrator } from './lighting/LightingOrchestrator';

export class SmartHomeAgent {
  private supabase: SupabaseClient<Database>;
  private redis: RedisClientType;
  private logger: Logger;
  private tokenManager: SmartHomeTokenManager;
  private privacyController: IoTPrivacyController;
  private lightingOrchestrator: LightingOrchestrator;
  private deviceManagers: Map<DeviceType, any> = new Map();
  private isInitialized = false;

  constructor(private config: SmartHomeAgentConfig) {
    this.logger = this.setupLogger();
    
    this.supabase = createClient<Database>(
      config.database.url,
      config.database.apiKey
    );
    
    this.redis = createRedisClient({ url: config.redis.url });
    
    // Initialize core services
    this.tokenManager = new SmartHomeTokenManager(this.supabase, this.redis, config);
    this.privacyController = new IoTPrivacyController(this.supabase, this.redis, config);
    this.lightingOrchestrator = new LightingOrchestrator(this.supabase, this.redis, config);
    
    // Register device managers
    this.deviceManagers.set('philips_hue', new PhilipsHueManager(this.tokenManager, config));
  }

  async initialize(): Promise<void> {
    try {
      await this.redis.connect();
      
      // Test database connection
      const { error } = await this.supabase.from('users').select('id').limit(1);
      if (error) {
        throw new Error(`Database connection failed: ${error.message}`);
      }

      // Initialize services
      await this.tokenManager.initialize();
      await this.privacyController.initialize();
      await this.lightingOrchestrator.initialize();

      this.isInitialized = true;
      this.logger.info('SmartHomeAgent initialized successfully');

      // Start background tasks
      this.startBackgroundTasks();

    } catch (error) {
      this.logger.error('Failed to initialize SmartHomeAgent', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.redis.disconnect();
      this.logger.info('SmartHomeAgent shutdown completed');
    } catch (error) {
      this.logger.error('Error during SmartHomeAgent shutdown', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Connect a smart home device for a user
   */
  async connectDevice(deviceConfig: DeviceConnectionConfig): Promise<DeviceConnection> {
    this.ensureInitialized();

    try {
      this.logger.info('Connecting smart home device', {
        userId: deviceConfig.userId,
        deviceType: deviceConfig.deviceType,
        roomId: deviceConfig.roomId,
        platform: deviceConfig.platform
      });

      // Validate privacy consent
      const privacyValidation = await this.privacyController.validateDeviceConnection(deviceConfig);
      if (!privacyValidation.consentValid) {
        throw new Error('Privacy consent required for device connection');
      }

      // Get device manager
      const deviceManager = this.deviceManagers.get(deviceConfig.deviceType);
      if (!deviceManager) {
        throw new Error(`Unsupported device type: ${deviceConfig.deviceType}`);
      }

      // Discover and authenticate device
      const devices = await deviceManager.discoverDevices();
      if (devices.length === 0) {
        throw new Error('No devices found for connection');
      }

      // For now, connect to the first discovered device
      const device = devices[0];
      const tokenData = await deviceManager.authenticateDevice({
        deviceId: device.id,
        roomId: deviceConfig.roomId
      });

      // Store device connection
      const { data: deviceRecord, error } = await this.supabase
        .from('smart_home_devices')
        .insert({
          user_id: deviceConfig.userId,
          device_type: deviceConfig.deviceType,
          device_id_hash: this.hashDeviceId(device.id),
          device_name: device.name || `${deviceConfig.deviceType} Device`,
          room_id: deviceConfig.roomId,
          room_name: deviceConfig.roomId, // Could be enhanced with actual room names
          platform: deviceConfig.platform,
          connection_status: 'connected',
          consent_given: true,
          consent_scope: deviceConfig.consentScope,
          device_metadata: { capabilities: device.capabilities },
          connected_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
          token_expires_at: tokenData.expiresAt
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to store device connection: ${error.message}`);
      }

      // Store encrypted token
      await this.tokenManager.storeDeviceToken(
        deviceConfig.userId,
        deviceConfig.deviceType,
        tokenData
      );

      // Log the connection
      await this.logSmartHomeAction(
        deviceConfig.userId,
        deviceRecord.id,
        'device_connected',
        true,
        deviceConfig.platform
      );

      this.logger.info('Device connected successfully', {
        userId: deviceConfig.userId,
        deviceId: deviceRecord.id,
        deviceType: deviceConfig.deviceType
      });

      return {
        deviceId: deviceRecord.id,
        deviceType: deviceConfig.deviceType,
        roomId: deviceConfig.roomId,
        status: 'connected',
        lastConnected: deviceRecord.connected_at
      };

    } catch (error) {
      this.logger.error('Device connection failed', {
        error: error instanceof Error ? error.message : String(error),
        userId: deviceConfig.userId,
        deviceType: deviceConfig.deviceType
      });
      throw error;
    }
  }

  /**
   * Create story environment with appropriate lighting
   */
  async createStoryEnvironment(storyType: string, userId: string, roomId?: string): Promise<EnvironmentProfile> {
    this.ensureInitialized();

    try {
      this.logger.info('Creating story environment', {
        userId,
        storyType,
        roomId
      });

      // Get user's connected devices
      const connectedDevices = await this.getConnectedDevices(userId);
      if (connectedDevices.length === 0) {
        this.logger.info('No connected devices found for user', { userId });
        return this.createDefaultEnvironmentProfile(storyType, roomId || 'default');
      }

      // Use specified room or first available room
      const targetRoomId = roomId || connectedDevices[0].roomId;
      const roomDevices = connectedDevices.filter(d => d.roomId === targetRoomId);

      if (roomDevices.length === 0) {
        throw new Error(`No devices found in room: ${targetRoomId}`);
      }

      // Get story lighting profile
      const lightingProfile = await this.lightingOrchestrator.getStoryLightingProfile(storyType, userId);

      // Apply lighting to all devices in room
      await Promise.all(
        roomDevices.map(device => 
          this.applyLightingToDevice(userId, device.deviceId, lightingProfile)
        )
      );

      // Log the environment creation
      await Promise.all(
        roomDevices.map(device =>
          this.logSmartHomeAction(
            userId,
            device.deviceId,
            'story_environment_created',
            true,
            'system',
            undefined,
            `Story type: ${storyType}`
          )
        )
      );

      const environmentProfile: EnvironmentProfile = {
        roomId: targetRoomId,
        storyType,
        lightingProfile,
        environmentalCues: this.generateEnvironmentalCues(storyType),
        ageRestrictions: await this.getAgeRestrictions(userId)
      };

      this.logger.info('Story environment created successfully', {
        userId,
        storyType,
        roomId: targetRoomId,
        devicesAffected: roomDevices.length
      });

      return environmentProfile;

    } catch (error) {
      this.logger.error('Failed to create story environment', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        storyType,
        roomId
      });
      throw error;
    }
  }

  /**
   * Synchronize lighting with narrative events
   */
  async synchronizeWithNarrative(narrativeEvents: NarrativeEvent[], userId?: string): Promise<void> {
    this.ensureInitialized();

    if (!userId) {
      this.logger.warn('No userId provided for narrative synchronization');
      return;
    }

    try {
      this.logger.info('Synchronizing narrative events', {
        userId,
        eventCount: narrativeEvents.length
      });

      const connectedDevices = await this.getConnectedDevices(userId);
      if (connectedDevices.length === 0) {
        return; // No devices to synchronize
      }

      // Process each narrative event
      for (const event of narrativeEvents) {
        const lightingTransition = await this.lightingOrchestrator.getNarrativeEventLighting(event);
        
        if (lightingTransition) {
          // Apply to all connected devices
          await Promise.all(
            connectedDevices.map(device =>
              this.applyLightingTransition(userId, device.deviceId, lightingTransition)
            )
          );

          // Log the synchronization
          await Promise.all(
            connectedDevices.map(device =>
              this.logSmartHomeAction(
                userId,
                device.deviceId,
                'narrative_sync',
                true,
                'system',
                undefined,
                `Event: ${event.type}, Intensity: ${event.intensity}`
              )
            )
          );
        }
      }

      this.logger.info('Narrative synchronization completed', {
        userId,
        eventsProcessed: narrativeEvents.length,
        devicesAffected: connectedDevices.length
      });

    } catch (error) {
      this.logger.error('Narrative synchronization failed', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        eventCount: narrativeEvents.length
      });
      // Don't throw error - narrative sync failures shouldn't break story flow
    }
  }

  /**
   * Restore default lighting after story ends
   */
  async restoreDefaultLighting(roomId: string, userId?: string): Promise<void> {
    this.ensureInitialized();

    if (!userId) {
      this.logger.warn('No userId provided for lighting restoration');
      return;
    }

    try {
      this.logger.info('Restoring default lighting', { userId, roomId });

      const connectedDevices = await this.getConnectedDevices(userId);
      const roomDevices = connectedDevices.filter(d => d.roomId === roomId);

      if (roomDevices.length === 0) {
        return; // No devices in room
      }

      // Get default lighting profile
      const defaultProfile: LightingProfile = {
        brightness: 80,
        color: '#FFFFFF',
        saturation: 0,
        transitionDuration: 5000 // 5 second fade
      };

      // Apply default lighting to all devices in room
      await Promise.all(
        roomDevices.map(device =>
          this.applyLightingToDevice(userId, device.deviceId, defaultProfile)
        )
      );

      // Log the restoration
      await Promise.all(
        roomDevices.map(device =>
          this.logSmartHomeAction(
            userId,
            device.deviceId,
            'default_lighting_restored',
            true,
            'system'
          )
        )
      );

      this.logger.info('Default lighting restored', {
        userId,
        roomId,
        devicesAffected: roomDevices.length
      });

    } catch (error) {
      this.logger.error('Failed to restore default lighting', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        roomId
      });
      // Don't throw error - lighting restoration failures shouldn't break flow
    }
  }

  /**
   * Disconnect a smart home device
   */
  async disconnectDevice(userId: string, deviceId: string): Promise<void> {
    this.ensureInitialized();

    try {
      this.logger.info('Disconnecting smart home device', { userId, deviceId });

      // Get device record
      const { data: device, error: fetchError } = await this.supabase
        .from('smart_home_devices')
        .select('*')
        .eq('id', deviceId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !device) {
        throw new Error('Device not found or access denied');
      }

      // Update device status
      const { error: updateError } = await this.supabase
        .from('smart_home_devices')
        .update({
          connection_status: 'disconnected',
          updated_at: new Date().toISOString()
        })
        .eq('id', deviceId);

      if (updateError) {
        throw new Error(`Failed to disconnect device: ${updateError.message}`);
      }

      // Revoke device tokens
      await this.tokenManager.revokeDeviceTokens(userId, device.device_type, deviceId);

      // Log the disconnection
      await this.logSmartHomeAction(
        userId,
        deviceId,
        'device_disconnected',
        true,
        'user'
      );

      this.logger.info('Device disconnected successfully', { userId, deviceId });

    } catch (error) {
      this.logger.error('Device disconnection failed', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        deviceId
      });
      throw error;
    }
  }

  /**
   * Get metrics for smart home usage
   */
  async getMetrics(userId: string): Promise<SmartHomeMetrics> {
    this.ensureInitialized();

    try {
      // Get connected devices count
      const { data: devices, error: devicesError } = await this.supabase
        .from('smart_home_devices')
        .select('id, room_id')
        .eq('user_id', userId)
        .eq('connection_status', 'connected');

      if (devicesError) {
        throw new Error(`Failed to fetch devices: ${devicesError.message}`);
      }

      const connectedDevices = devices?.length || 0;
      const activeRooms = new Set(devices?.map(d => d.room_id) || []).size;

      // Get daily command count
      const { data: logs, error: logsError } = await this.supabase
        .from('device_connection_logs')
        .select('id')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .in('action', ['lighting_change', 'story_environment_created', 'narrative_sync']);

      if (logsError) {
        throw new Error(`Failed to fetch logs: ${logsError.message}`);
      }

      const dailyCommands = logs?.length || 0;

      return {
        connectedDevices,
        activeRooms,
        dailyCommands,
        averageResponseTime: 150, // Would be calculated from actual metrics
        errorRate: 0.02 // Would be calculated from error logs
      };

    } catch (error) {
      this.logger.error('Failed to get smart home metrics', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      throw error;
    }
  }

  // Private helper methods

  private async getConnectedDevices(userId: string): Promise<any[]> {
    const { data: devices, error } = await this.supabase
      .from('smart_home_devices')
      .select('*')
      .eq('user_id', userId)
      .eq('connection_status', 'connected');

    if (error) {
      throw new Error(`Failed to fetch connected devices: ${error.message}`);
    }

    return devices || [];
  }

  private async applyLightingToDevice(
    userId: string,
    deviceId: string,
    lightingProfile: LightingProfile
  ): Promise<void> {
    // Get device record
    const { data: device, error } = await this.supabase
      .from('smart_home_devices')
      .select('*')
      .eq('id', deviceId)
      .eq('user_id', userId)
      .single();

    if (error || !device) {
      throw new Error('Device not found');
    }

    // Get device manager
    const deviceManager = this.deviceManagers.get(device.device_type as DeviceType);
    if (!deviceManager) {
      throw new Error(`No manager for device type: ${device.device_type}`);
    }

    // Apply lighting
    await deviceManager.setRoomLighting(userId, device.room_id, lightingProfile);

    // Update last used timestamp
    await this.supabase
      .from('smart_home_devices')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', deviceId);
  }

  private async applyLightingTransition(
    userId: string,
    deviceId: string,
    transition: any
  ): Promise<void> {
    const lightingProfile: LightingProfile = {
      brightness: transition.brightness || 50,
      color: transition.color || '#FFFFFF',
      saturation: transition.saturation || 50,
      transitionDuration: transition.transition || 1000
    };

    await this.applyLightingToDevice(userId, deviceId, lightingProfile);
  }

  private generateEnvironmentalCues(storyType: string): any[] {
    // Generate environmental cues based on story type
    const cueMap: Record<string, any[]> = {
      'Bedtime': [
        { type: 'lighting', action: 'dim', duration: 10000 },
        { type: 'lighting', action: 'warm_color', duration: 5000 }
      ],
      'Adventure': [
        { type: 'lighting', action: 'brighten', duration: 1000 },
        { type: 'lighting', action: 'dynamic_color', duration: 2000 }
      ],
      'Educational': [
        { type: 'lighting', action: 'focus_lighting', duration: 1500 }
      ]
    };

    return cueMap[storyType] || [];
  }

  private async getAgeRestrictions(userId: string): Promise<any> {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('age, is_coppa_protected')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return null;
    }

    if (user.is_coppa_protected || (user.age && user.age < 13)) {
      return {
        maxBrightness: 30,
        allowedColors: ['#FFFFFF', '#FFB347', '#87CEEB', '#98FB98'],
        forbiddenColors: ['#FF0000', '#FF4500'],
        maxTransitionSpeed: 3000,
        requiresParentalApproval: true
      };
    }

    return null;
  }

  private createDefaultEnvironmentProfile(storyType: string, roomId: string): EnvironmentProfile {
    return {
      roomId,
      storyType,
      lightingProfile: {
        brightness: 50,
        color: '#FFFFFF',
        saturation: 0,
        transitionDuration: 1000
      },
      environmentalCues: []
    };
  }

  private hashDeviceId(deviceId: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(deviceId).digest('hex');
  }

  private async logSmartHomeAction(
    userId: string,
    deviceId: string,
    action: string,
    success: boolean,
    platform?: string,
    sessionId?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await this.supabase.rpc('log_smart_home_action', {
        p_user_id: userId,
        p_device_id: deviceId,
        p_action: action,
        p_success: success,
        p_platform: platform,
        p_session_id: sessionId,
        p_error_message: errorMessage
      });
    } catch (error) {
      this.logger.error('Failed to log smart home action', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        deviceId,
        action
      });
    }
  }

  private setupLogger(): Logger {
    return winston.createLogger({
      level: this.config.logging.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'smart-home-agent' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
      ],
    });
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('SmartHomeAgent not initialized. Call initialize() first.');
    }
  }

  private startBackgroundTasks(): void {
    // Health check for connected devices every 5 minutes
    setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        this.logger.error('Health check failed', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, 5 * 60 * 1000);

    // Cleanup expired data every hour
    setInterval(async () => {
      try {
        await this.cleanupExpiredData();
      } catch (error) {
        this.logger.error('Cleanup failed', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, 60 * 60 * 1000);
  }

  private async performHealthChecks(): Promise<void> {
    // Implementation would check device connectivity
    this.logger.debug('Performing device health checks');
  }

  private async cleanupExpiredData(): Promise<void> {
    // Implementation would clean up expired tokens and logs
    this.logger.debug('Cleaning up expired data');
  }
}
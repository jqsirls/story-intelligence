import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@alexa-multi-agent/shared-types';
import { Logger } from 'winston';

import {
  SmartHomeAction,
  VoicePlatform,
  ConnectedDevice
} from '@alexa-multi-agent/shared-types';

import { SmartHomeAgent } from '@alexa-multi-agent/smart-home-agent';
import { RouterConfig } from '../config';

export class SmartHomeIntegrator {
  private smartHomeAgent: SmartHomeAgent;
  private supabase: SupabaseClient<Database>;
  private logger: Logger;

  constructor(private config: RouterConfig) {
    const winston = require('winston');
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'smart-home-integrator' },
      transports: [new winston.transports.Console()]
    });

    // Initialize Supabase client
    this.supabase = require('@supabase/supabase-js').createClient(
      config.database?.url || process.env.SUPABASE_URL,
      config.database?.apiKey || process.env.SUPABASE_ANON_KEY
    );

    // Initialize SmartHomeAgent
    this.smartHomeAgent = new SmartHomeAgent({
      database: {
        url: config.database?.url || process.env.SUPABASE_URL || '',
        apiKey: config.database?.apiKey || process.env.SUPABASE_ANON_KEY || ''
      },
      redis: {
        url: config.redis?.url || process.env.REDIS_URL || 'redis://localhost:6379',
        keyPrefix: 'smart-home'
      },
      encryption: {
        algorithm: 'aes-256-gcm',
        keyRotationInterval: 30 * 24 * 60 * 60 * 1000 // 30 days
      },
      tokenRefresh: {
        refreshBeforeExpiry: 5, // 5 minutes
        maxRetryAttempts: 3,
        retryBackoffMs: 1000
      },
      privacy: {
        dataRetentionHours: 24,
        enableUsageAnalytics: false,
        requireParentalConsent: true
      },
      devices: {
        philipsHue: {
          discoveryTimeout: 30000,
          maxBridgesPerUser: 3
        },
        nanoleaf: {
          authTimeout: 60000
        }
      },
      logging: {
        level: 'info',
        enableAuditLog: true
      }
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.smartHomeAgent.initialize();
      this.logger.info('SmartHomeIntegrator initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize SmartHomeIntegrator', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Execute smart home action
   */
  async executeAction(
    userId: string,
    action: SmartHomeAction,
    platform: VoicePlatform
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.logger.info('Executing smart home action', {
        userId,
        actionType: action.type,
        platform
      });

      // Check if user has connected smart home devices
      const connectedDevices = await this.getConnectedDevices(userId);

      if (connectedDevices.length === 0) {
        this.logger.info('No connected devices found for user', { userId });
        return { success: true }; // No devices connected, but not an error
      }

      switch (action.type) {
        case 'set_story_environment':
          await this.handleStoryEnvironment(userId, action, connectedDevices);
          break;

        case 'sync_narrative_lighting':
          await this.handleNarrativeSync(userId, action, connectedDevices);
          break;

        case 'restore_default_lighting':
          await this.handleDefaultLighting(userId, action, connectedDevices);
          break;

        case 'device_control':
          await this.handleDeviceControl(userId, action, platform);
          break;

        default:
          this.logger.warn('Unknown smart home action type', {
            actionType: action.type,
            userId
          });
      }

      this.logger.info('Smart home action executed successfully', {
        userId,
        actionType: action.type,
        devicesAffected: connectedDevices.length
      });

      return { success: true };

    } catch (error) {
      this.logger.error('Smart home action execution failed', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        actionType: action.type,
        platform
      });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Handle story start event
   */
  async handleStoryStart(storyType: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const connectedDevices = await this.getConnectedDevices(userId);
      if (connectedDevices.length > 0) {
        await this.smartHomeAgent.createStoryEnvironment(
          storyType,
          userId,
          connectedDevices[0].roomId
        );
      }
      return { success: true };
    } catch (error) {
      this.logger.error('Story start handling failed', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        storyType
      });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Handle narrative event
   */
  async handleNarrativeEvent(event: any, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const connectedDevices = await this.getConnectedDevices(userId);
      if (connectedDevices.length > 0) {
        const agentAny = this.smartHomeAgent as unknown as { synchronizeWithNarrative?: (events: any[], userId: string) => Promise<void> };
        if (agentAny.synchronizeWithNarrative) {
          await agentAny.synchronizeWithNarrative([event], userId);
        } else {
          this.logger.info('SmartHomeAgent.synchronizeWithNarrative not available; skipping', { userId });
        }
      }
      return { success: true };
    } catch (error) {
      this.logger.error('Narrative event handling failed', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        eventType: event.type
      });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Handle story end event
   */
  async handleStoryEnd(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const connectedDevices = await this.getConnectedDevices(userId);
      if (connectedDevices.length > 0) {
        const room = (connectedDevices[0] as any)?.roomId || (connectedDevices[0] as any)?.room || 'default_room';
        await this.smartHomeAgent.restoreDefaultLighting(room, userId);
      }
      return { success: true };
    } catch (error) {
      this.logger.error('Story end handling failed', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Private helper methods

  private async getConnectedDevices(userId: string): Promise<ConnectedDevice[]> {
    try {
      const { data: devices, error } = await this.supabase
        .from('smart_home_devices')
        .select('*')
        .eq('user_id', userId)
        .eq('connection_status', 'connected');

      if (error) {
        throw new Error(`Failed to get connected devices: ${error.message}`);
      }

      return (devices || []).map(device => ({
        deviceId: device.id,
        deviceType: device.device_type,
        roomId: device.room_id,
        status: device.connection_status as 'connected' | 'disconnected' | 'error',
        capabilities: device.device_metadata?.capabilities || [],
        lastUsed: device.last_used_at
      }));

    } catch (error) {
      this.logger.error('Failed to get connected devices', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      return [];
    }
  }

  private async handleStoryEnvironment(
    userId: string,
    action: SmartHomeAction,
    connectedDevices: ConnectedDevice[]
  ): Promise<void> {
    if (!action.storyType) {
      this.logger.warn('Story type not provided for environment action', { userId });
      return;
    }

    const roomId = action.roomId || connectedDevices[0]?.roomId;
    if (!roomId) {
      this.logger.warn('No room ID available for story environment', { userId });
      return;
    }

    await this.smartHomeAgent.createStoryEnvironment(
      action.storyType,
      userId,
      roomId
    );
  }

  private async handleNarrativeSync(
    userId: string,
    action: SmartHomeAction,
    connectedDevices: ConnectedDevice[]
  ): Promise<void> {
    if (!action.narrativeEvent) {
      this.logger.warn('Narrative event not provided for sync action', { userId });
      return;
    }

    const agentAny = this.smartHomeAgent as unknown as { synchronizeWithNarrative?: (events: any[], userId: string) => Promise<void> };
    if (agentAny.synchronizeWithNarrative) {
      await agentAny.synchronizeWithNarrative([action.narrativeEvent], userId);
    } else {
      this.logger.info('SmartHomeAgent.synchronizeWithNarrative not available; skipping narrative sync', { userId });
    }
  }

  private async handleDefaultLighting(
    userId: string,
    action: SmartHomeAction,
    connectedDevices: ConnectedDevice[]
  ): Promise<void> {
    const roomId = action.roomId || connectedDevices[0]?.roomId;
    if (!roomId) {
      this.logger.warn('No room ID available for default lighting', { userId });
      return;
    }

    await this.smartHomeAgent.restoreDefaultLighting(roomId, userId);
  }

  private async handleDeviceControl(
    userId: string,
    action: SmartHomeAction,
    platform: VoicePlatform
  ): Promise<void> {
    const parameters = action.parameters || {};

    // Handle different device control intents
    if (parameters.intent === 'ConnectSmartHomeDevice') {
      await this.handleDeviceConnection(userId, parameters, platform);
    } else if (parameters.intent === 'DisconnectSmartHomeDevice') {
      await this.handleDeviceDisconnection(userId, parameters);
    } else if (parameters.intent === 'SetRoomLighting') {
      await this.handleLightingControl(userId, parameters);
    } else if (parameters.intent === 'DiscoverDevices') {
      await this.handleDiscoverDevices(userId, parameters);
    } else if (parameters.intent === 'AddDevice') {
      await this.handleAddDevice(userId, parameters);
    } else if (parameters.intent === 'UpdateDevice') {
      await this.handleUpdateDevice(userId, parameters);
    } else if (parameters.intent === 'RemoveDevice') {
      await this.handleRemoveDevice(userId, parameters);
    } else if (parameters.intent === 'GetUserDevices') {
      await this.handleGetUserDevices(userId);
    } else if (parameters.intent === 'RegisterDeviceKey') {
      await this.handleRegisterDeviceKey(userId, parameters);
    } else if (parameters.intent === 'GetDeviceKey') {
      await this.handleGetDeviceKey(userId, parameters);
    }
  }

  private async handleDeviceConnection(
    userId: string,
    parameters: any,
    platform: VoicePlatform
  ): Promise<void> {
    const deviceType = parameters.deviceType || 'philips_hue';
    const roomId = parameters.roomId || 'default_room';

    const deviceConfig = {
      deviceType,
      userId,
      roomId,
      platform,
      dataMinimization: {
        collectOnlyLighting: true,
        excludeUsagePatterns: true,
        excludeDeviceMetadata: true
      },
      consentScope: {
        lightingControl: true,
        ambientResponse: true,
        narrativeSynchronization: true
      },
      retentionPolicy: {
        connectionLogs: '24_hours',
        lightingHistory: 'none',
        errorLogs: '30_days'
      }
    };

    const agentAny = this.smartHomeAgent as unknown as { connectDevice?: (config: any) => Promise<void> };
    if (agentAny.connectDevice) {
      await agentAny.connectDevice(deviceConfig);
    } else {
      this.logger.info('SmartHomeAgent.connectDevice not available; relying on Supabase rows only', { userId });
    }
  }

  private async handleDeviceDisconnection(
    userId: string,
    parameters: any
  ): Promise<void> {
    const deviceId = parameters.deviceId;
    if (!deviceId) {
      this.logger.warn('Device ID not provided for disconnection', { userId });
      return;
    }

    const agentAny = this.smartHomeAgent as unknown as { disconnectDevice?: (userId: string, deviceId: string) => Promise<void> };
    if (agentAny.disconnectDevice) {
      await agentAny.disconnectDevice(userId, deviceId);
    } else {
      this.logger.info('SmartHomeAgent.disconnectDevice not available; relying on Supabase delete only', { userId, deviceId });
    }
  }

  private async handleLightingControl(
    userId: string,
    parameters: any
  ): Promise<void> {
    // This would handle manual lighting control requests
    // For now, just log the request
    this.logger.info('Manual lighting control requested', {
      userId,
      parameters
    });
  }

  private async handleDiscoverDevices(
    userId: string,
    parameters: any
  ): Promise<void> {
    const platforms = parameters.platforms || ['philips_hue', 'nanoleaf', 'govee'];
    await (this.smartHomeAgent as unknown as { discoverDevices: (opts: { userId: string; platforms: string[] }) => Promise<any> }).discoverDevices({ userId, platforms });
  }

  private async handleAddDevice(
    userId: string,
    parameters: any
  ): Promise<void> {
    const { deviceType, roomId, metadata } = parameters;
    const { error } = await this.supabase
      .from('smart_home_devices')
      .insert({
        user_id: userId,
        device_type: deviceType,
        room_id: roomId || null,
        connection_status: 'connected',
        device_metadata: metadata || {}
      });
    if (error) throw new Error(`Add device failed: ${error.message}`);
  }

  private async handleUpdateDevice(
    userId: string,
    parameters: any
  ): Promise<void> {
    const { deviceId, roomId, metadata, connectionStatus } = parameters;
    if (!deviceId) throw new Error('deviceId is required for UpdateDevice');
    const { error } = await this.supabase
      .from('smart_home_devices')
      .update({
        room_id: roomId || undefined,
        device_metadata: metadata || undefined,
        connection_status: connectionStatus || undefined
      })
      .eq('id', deviceId)
      .eq('user_id', userId);
    if (error) throw new Error(`Update device failed: ${error.message}`);
  }

  private async handleRemoveDevice(
    userId: string,
    parameters: any
  ): Promise<void> {
    const { deviceId } = parameters;
    if (!deviceId) throw new Error('deviceId is required for RemoveDevice');
    const { error } = await this.supabase
      .from('smart_home_devices')
      .delete()
      .eq('id', deviceId)
      .eq('user_id', userId);
    if (error) throw new Error(`Remove device failed: ${error.message}`);
  }

  private async handleGetUserDevices(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('smart_home_devices')
      .select('*')
      .eq('user_id', userId);
    if (error) throw new Error(`Get user devices failed: ${error.message}`);
  }

  private async handleRegisterDeviceKey(
    userId: string,
    parameters: any
  ): Promise<void> {
    const { deviceType, key, label } = parameters;
    if (!deviceType || !key) throw new Error('deviceType and key are required for RegisterDeviceKey');
    const { error } = await this.supabase
      .from('smart_home_device_keys')
      .insert({
        user_id: userId,
        device_type: deviceType,
        key_label: label || null,
        encrypted_key: key
      });
    if (error) throw new Error(`Register device key failed: ${error.message}`);
  }

  private async handleGetDeviceKey(
    userId: string,
    parameters: any
  ): Promise<void> {
    const { deviceType } = parameters;
    if (!deviceType) throw new Error('deviceType is required for GetDeviceKey');
    const { error } = await this.supabase
      .from('smart_home_device_keys')
      .select('encrypted_key')
      .eq('user_id', userId)
      .eq('device_type', deviceType)
      .single();
    if (error) throw new Error(`Get device key failed: ${error.message}`);
  }

  /**
   * Shutdown the integrator and cleanup resources
   * @public
   */
  public async shutdown(): Promise<void> {
    try {
      await this.smartHomeAgent.shutdown();
      this.logger.info('SmartHomeIntegrator shutdown completed');
    } catch (error) {
      this.logger.error('Error during SmartHomeIntegrator shutdown', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
import { Logger } from 'winston';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@alexa-multi-agent/shared-types';

import {
  VoicePlatform,
  WebhookPayload,
  WebhookConfig,
  WebhookResult,
  WebhookEvent,
  VoicePlatformAdapter
} from '@alexa-multi-agent/shared-types';

import { PlatformAwareRouter } from '../PlatformAwareRouter';
import { RouterConfig } from '../config';

export interface WebhookRegistration {
  id: string;
  platform: VoicePlatform;
  config: WebhookConfig;
  status: 'active' | 'inactive' | 'error';
  createdAt: Date;
  lastDelivery?: {
    timestamp: Date;
    status: 'success' | 'failed';
    responseCode?: number;
    error?: string;
  };
}

export class WebhookHandler {
  private logger: Logger;
  private supabase: SupabaseClient<Database>;
  private registrations: Map<string, WebhookRegistration> = new Map();
  private platformRouter: PlatformAwareRouter;

  constructor(private config: RouterConfig) {
    const winston = require('winston');
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'webhook-handler' },
      transports: [new winston.transports.Console()]
    });

    this.supabase = require('@supabase/supabase-js').createClient(
      config.database?.url || process.env.SUPABASE_URL,
      config.database?.apiKey || process.env.SUPABASE_ANON_KEY
    );

    this.platformRouter = new PlatformAwareRouter(config);
  }

  /**
   * Register a webhook for a platform
   */
  async registerWebhook(
    platform: VoicePlatform,
    webhookConfig: WebhookConfig
  ): Promise<WebhookResult> {
    try {
      this.logger.info('Registering webhook', {
        platform,
        url: webhookConfig.url,
        events: webhookConfig.events.map(e => e.type)
      });

      // Get platform adapter
      const adapter = this.platformRouter['platformAdapters'].get(platform);
      if (!adapter) {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      // Set up webhook with platform
      const result = await adapter.setupWebhook!(webhookConfig);

      // Store registration
      const registration: WebhookRegistration = {
        id: result.webhookId,
        platform,
        config: webhookConfig,
        status: result.status,
        createdAt: new Date()
      };

      this.registrations.set(result.webhookId, registration);

      // Store in database
      await this.storeWebhookRegistration(registration);

      this.logger.info('Webhook registered successfully', {
        webhookId: result.webhookId,
        platform,
        status: result.status
      });

      return result;

    } catch (error) {
      this.logger.error('Failed to register webhook', {
        error: error instanceof Error ? error.message : String(error),
        platform
      });
      throw error;
    }
  }

  /**
   * Handle incoming webhook payload
   */
  async handleWebhook(
    platform: VoicePlatform,
    payload: any,
    headers: Record<string, string>
  ): Promise<any> {
    const startTime = Date.now();

    try {
      this.logger.info('Handling webhook', {
        platform,
        eventType: payload.eventType || 'unknown',
        userId: payload.userId || 'anonymous'
      });

      // Validate webhook signature if configured
      await this.validateWebhookSignature(platform, payload, headers);

      // Process webhook based on event type
      const response = await this.processWebhookEvent(platform, payload);

      const duration = Date.now() - startTime;
      this.logger.info('Webhook handled successfully', {
        platform,
        eventType: payload.eventType,
        duration
      });

      // Update delivery status
      await this.updateDeliveryStatus(platform, 'success', 200);

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Webhook handling failed', {
        error: error instanceof Error ? error.message : String(error),
        platform,
        duration
      });

      // Update delivery status
      await this.updateDeliveryStatus(platform, 'failed', 500, error instanceof Error ? error.message : String(error));

      throw error;
    }
  }

  /**
   * Process webhook event based on type
   */
  private async processWebhookEvent(
    platform: VoicePlatform,
    payload: WebhookPayload
  ): Promise<any> {
    switch (payload.eventType) {
      case 'skill_enabled':
        return await this.handleSkillEnabled(platform, payload);

      case 'skill_disabled':
        return await this.handleSkillDisabled(platform, payload);

      case 'account_linked':
        return await this.handleAccountLinked(platform, payload);

      case 'account_unlinked':
        return await this.handleAccountUnlinked(platform, payload);

      case 'smart_home_discovery':
        return await this.handleSmartHomeDiscovery(platform, payload);

      case 'smart_home_control':
        return await this.handleSmartHomeControl(platform, payload);

      case 'conversation_started':
        return await this.handleConversationStarted(platform, payload);

      case 'conversation_ended':
        return await this.handleConversationEnded(platform, payload);

      case 'error_occurred':
        return await this.handleErrorOccurred(platform, payload);

      default:
        this.logger.warn('Unknown webhook event type', {
          eventType: payload.eventType,
          platform
        });
        return { status: 'ignored' };
    }
  }

  /**
   * Handle skill enabled event
   */
  private async handleSkillEnabled(
    platform: VoicePlatform,
    payload: WebhookPayload
  ): Promise<any> {
    this.logger.info('Skill enabled', {
      platform,
      userId: payload.userId
    });

    // Initialize user preferences for the platform
    if (payload.userId) {
      await this.initializeUserPreferences(payload.userId, platform);
    }

    return { status: 'processed' };
  }

  /**
   * Handle skill disabled event
   */
  private async handleSkillDisabled(
    platform: VoicePlatform,
    payload: WebhookPayload
  ): Promise<any> {
    this.logger.info('Skill disabled', {
      platform,
      userId: payload.userId
    });

    // Clean up user data if required
    if (payload.userId) {
      await this.cleanupUserData(payload.userId, platform);
    }

    return { status: 'processed' };
  }

  /**
   * Handle account linked event
   */
  private async handleAccountLinked(
    platform: VoicePlatform,
    payload: WebhookPayload
  ): Promise<any> {
    this.logger.info('Account linked', {
      platform,
      userId: payload.userId
    });

    // Update user account linking status
    if (payload.userId) {
      await this.updateAccountLinkingStatus(payload.userId, platform, true);
    }

    return { status: 'processed' };
  }

  /**
   * Handle account unlinked event
   */
  private async handleAccountUnlinked(
    platform: VoicePlatform,
    payload: WebhookPayload
  ): Promise<any> {
    this.logger.info('Account unlinked', {
      platform,
      userId: payload.userId
    });

    // Update user account linking status and clean up data
    if (payload.userId) {
      await this.updateAccountLinkingStatus(payload.userId, platform, false);
      await this.cleanupUserData(payload.userId, platform);
    }

    return { status: 'processed' };
  }

  /**
   * Handle smart home discovery event
   */
  private async handleSmartHomeDiscovery(
    platform: VoicePlatform,
    payload: WebhookPayload
  ): Promise<any> {
    this.logger.info('Smart home discovery requested', {
      platform,
      userId: payload.userId
    });

    if (!payload.userId) {
      return { status: 'error', message: 'User ID required for smart home discovery' };
    }

    // Get user's connected smart home devices
    const devices = await this.getUserSmartHomeDevices(payload.userId);

    // Format devices for the platform
    const platformDevices = await this.formatDevicesForPlatform(devices, platform);

    return {
      status: 'processed',
      devices: platformDevices
    };
  }

  /**
   * Handle smart home control event
   */
  private async handleSmartHomeControl(
    platform: VoicePlatform,
    payload: WebhookPayload
  ): Promise<any> {
    this.logger.info('Smart home control requested', {
      platform,
      userId: payload.userId,
      deviceId: payload.data.deviceId,
      action: payload.data.action
    });

    if (!payload.userId) {
      return { status: 'error', message: 'User ID required for smart home control' };
    }

    // Execute smart home control through the router
    const controlResult = await this.platformRouter['smartHomeIntegrator'].executeAction(
      payload.userId,
      {
        type: 'device_control',
        userId: payload.userId,
        deviceId: payload.data.deviceId,
        parameters: payload.data
      },
      platform
    );

    return {
      status: 'processed',
      result: controlResult
    };
  }

  /**
   * Handle conversation started event
   */
  private async handleConversationStarted(
    platform: VoicePlatform,
    payload: WebhookPayload
  ): Promise<any> {
    this.logger.info('Conversation started', {
      platform,
      userId: payload.userId,
      sessionId: payload.sessionId
    });

    // Initialize conversation context
    if (payload.userId && payload.sessionId) {
      await this.initializeConversationContext(payload.userId, payload.sessionId, platform);
    }

    return { status: 'processed' };
  }

  /**
   * Handle conversation ended event
   */
  private async handleConversationEnded(
    platform: VoicePlatform,
    payload: WebhookPayload
  ): Promise<any> {
    this.logger.info('Conversation ended', {
      platform,
      userId: payload.userId,
      sessionId: payload.sessionId
    });

    // Clean up conversation context
    if (payload.userId && payload.sessionId) {
      await this.cleanupConversationContext(payload.userId, payload.sessionId, platform);
    }

    return { status: 'processed' };
  }

  /**
   * Handle error occurred event
   */
  private async handleErrorOccurred(
    platform: VoicePlatform,
    payload: WebhookPayload
  ): Promise<any> {
    this.logger.error('Platform error reported', {
      platform,
      error: payload.data.error,
      userId: payload.userId,
      sessionId: payload.sessionId
    });

    // Log error for monitoring and debugging
    await this.logPlatformError(platform, payload);

    return { status: 'processed' };
  }

  /**
   * Validate webhook signature
   */
  private async validateWebhookSignature(
    platform: VoicePlatform,
    payload: any,
    headers: Record<string, string>
  ): Promise<void> {
    const adapter = this.platformRouter['platformAdapters'].get(platform);
    if (!adapter || !adapter.validateWebhookSignature) {
      return; // Skip validation if not supported
    }

    const signature = headers['x-signature'] || headers['signature'] || '';
    const secret = process.env[`${platform.toUpperCase()}_WEBHOOK_SECRET`] || '';

    if (!secret) {
      this.logger.warn('Webhook secret not configured', { platform });
      return;
    }

    const isValid = adapter.validateWebhookSignature(
      JSON.stringify(payload),
      signature,
      secret
    );

    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }
  }

  // Helper methods

  private async storeWebhookRegistration(registration: WebhookRegistration): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('webhook_registrations')
        .insert({
          id: registration.id,
          platform: registration.platform,
          config: registration.config,
          status: registration.status,
          created_at: registration.createdAt.toISOString()
        });

      if (error) {
        this.logger.error('Failed to store webhook registration', { error: error.message });
      }
    } catch (error) {
      this.logger.error('Database error storing webhook registration', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async updateDeliveryStatus(
    platform: VoicePlatform,
    status: 'success' | 'failed',
    responseCode?: number,
    error?: string
  ): Promise<void> {
    // Update delivery status for all registrations of this platform
    this.registrations.forEach((registration, id) => {
      if (registration.platform === platform) {
        registration.lastDelivery = {
          timestamp: new Date(),
          status,
          responseCode,
          error
        };
      }
    });
  }

  private async initializeUserPreferences(userId: string, platform: VoicePlatform): Promise<void> {
    // Initialize default user preferences for the platform
    this.logger.debug('Initializing user preferences', { userId, platform });
  }

  private async cleanupUserData(userId: string, platform: VoicePlatform): Promise<void> {
    // Clean up user data when skill is disabled or account unlinked
    this.logger.debug('Cleaning up user data', { userId, platform });
  }

  private async updateAccountLinkingStatus(
    userId: string,
    platform: VoicePlatform,
    linked: boolean
  ): Promise<void> {
    // Update account linking status in database
    this.logger.debug('Updating account linking status', { userId, platform, linked });
  }

  private async getUserSmartHomeDevices(userId: string): Promise<any[]> {
    try {
      const { data: devices, error } = await this.supabase
        .from('smart_home_devices')
        .select('*')
        .eq('user_id', userId)
        .eq('connection_status', 'connected');

      if (error) {
        throw new Error(`Failed to get smart home devices: ${error.message}`);
      }

      return devices || [];
    } catch (error) {
      this.logger.error('Failed to get user smart home devices', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      return [];
    }
  }

  private async formatDevicesForPlatform(devices: any[], platform: VoicePlatform): Promise<any[]> {
    // Format devices according to platform requirements
    return devices.map(device => ({
      id: device.id,
      name: device.device_name,
      type: device.device_type,
      room: device.room_name,
      capabilities: device.device_metadata?.capabilities || []
    }));
  }

  private async initializeConversationContext(
    userId: string,
    sessionId: string,
    platform: VoicePlatform
  ): Promise<void> {
    // Initialize conversation context
    this.logger.debug('Initializing conversation context', { userId, sessionId, platform });
  }

  private async cleanupConversationContext(
    userId: string,
    sessionId: string,
    platform: VoicePlatform
  ): Promise<void> {
    // Clean up conversation context
    this.logger.debug('Cleaning up conversation context', { userId, sessionId, platform });
  }

  private async logPlatformError(platform: VoicePlatform, payload: WebhookPayload): Promise<void> {
    // Log platform error for monitoring
    this.logger.error('Platform error logged', {
      platform,
      error: payload.data.error,
      userId: payload.userId,
      timestamp: payload.timestamp
    });
  }

  /**
   * Get webhook registration status
   */
  getWebhookStatus(webhookId: string): WebhookRegistration | undefined {
    return this.registrations.get(webhookId);
  }

  /**
   * List all webhook registrations
   */
  listWebhooks(): WebhookRegistration[] {
    return Array.from(this.registrations.values());
  }

  /**
   * Unregister a webhook
   */
  async unregisterWebhook(webhookId: string): Promise<void> {
    const registration = this.registrations.get(webhookId);
    if (!registration) {
      throw new Error(`Webhook not found: ${webhookId}`);
    }

    this.registrations.delete(webhookId);

    // Remove from database
    try {
      const { error } = await this.supabase
        .from('webhook_registrations')
        .delete()
        .eq('id', webhookId);

      if (error) {
        this.logger.error('Failed to remove webhook registration from database', {
          error: error.message,
          webhookId
        });
      }
    } catch (error) {
      this.logger.error('Database error removing webhook registration', {
        error: error instanceof Error ? error.message : String(error),
        webhookId
      });
    }

    this.logger.info('Webhook unregistered', {
      webhookId,
      platform: registration.platform
    });
  }
}
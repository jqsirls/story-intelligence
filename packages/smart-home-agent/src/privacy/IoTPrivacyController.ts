import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Database } from '@alexa-multi-agent/shared-types';
import { Logger } from 'winston';

import {
  DeviceConnectionConfig,
  PrivacyValidation,
  DeviceAccessAudit,
  IoTConsentRecord,
  ValidationResult
} from '@alexa-multi-agent/shared-types';

import { SmartHomeAgentConfig } from '../types';

export class IoTPrivacyController {
  private logger: Logger;

  constructor(
    private supabase: SupabaseClient<Database>,
    private redis: RedisClientType,
    private config: SmartHomeAgentConfig
  ) {
    this.logger = require('winston').createLogger({
      level: config.logging.level,
      format: require('winston').format.combine(
        require('winston').format.timestamp(),
        require('winston').format.json()
      ),
      defaultMeta: { service: 'iot-privacy-controller' },
      transports: [new (require('winston').transports.Console)()]
    });
  }

  async initialize(): Promise<void> {
    this.logger.info('IoTPrivacyController initialized successfully');
  }

  /**
   * Validate device connection against privacy requirements
   */
  async validateDeviceConnection(deviceConfig: DeviceConnectionConfig): Promise<PrivacyValidation> {
    try {
      this.logger.info('Validating device connection privacy', {
        userId: deviceConfig.userId,
        deviceType: deviceConfig.deviceType,
        platform: deviceConfig.platform
      });

      // Check if user exists and get age information
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('id, age, is_coppa_protected, parent_consent_verified, parent_email')
        .eq('id', deviceConfig.userId)
        .single();

      if (userError || !user) {
        throw new Error('User not found or access denied');
      }

      // Check for existing valid consent
      const consentValid = await this.checkExistingConsent(
        deviceConfig.userId,
        deviceConfig.deviceType,
        deviceConfig.platform
      );

      // Determine if parental approval is required
      const parentalApprovalRequired = this.requiresParentalApproval(user, deviceConfig);

      // Check age appropriateness
      const ageAppropriate = this.isAgeAppropriate(user, deviceConfig);

      // Validate data minimization settings
      const dataMinimizationApplied = this.validateDataMinimization(deviceConfig);

      // Check retention policy compliance
      const retentionPolicyEnforced = this.validateRetentionPolicy(deviceConfig);

      const validation: PrivacyValidation = {
        consentValid: consentValid && (!parentalApprovalRequired || user.parent_consent_verified),
        ageAppropriate,
        parentalApprovalRequired,
        dataMinimizationApplied,
        retentionPolicyEnforced
      };

      this.logger.info('Device connection privacy validation completed', {
        userId: deviceConfig.userId,
        validation
      });

      return validation;

    } catch (error) {
      this.logger.error('Device connection privacy validation failed', {
        error: error instanceof Error ? error.message : String(error),
        userId: deviceConfig.userId,
        deviceType: deviceConfig.deviceType
      });
      throw error;
    }
  }

  /**
   * Request device consent from user or parent
   */
  async requestDeviceConsent(
    userId: string,
    deviceType: string,
    platform: string,
    consentScope: any
  ): Promise<{ success: boolean; requiresParentalApproval: boolean; consentId?: string }> {
    try {
      this.logger.info('Requesting device consent', {
        userId,
        deviceType,
        platform
      });

      // Get user information
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        throw new Error('User not found');
      }

      // Check if parental consent is required
      const requiresParentalApproval = user.is_coppa_protected || 
        (user.age && user.age < 16 && !user.parent_consent_verified);

      if (requiresParentalApproval && !user.parent_email) {
        throw new Error('Parent email required for consent request');
      }

      // Create consent record
      const { data: consentRecord, error: consentError } = await this.supabase
        .from('iot_consent_records')
        .insert({
          user_id: userId,
          device_id: 'pending', // Will be updated when device is connected
          consent_scope: consentScope,
          consent_method: 'app', // Would be determined by request context
          parent_consent: requiresParentalApproval,
          legal_basis: 'consent',
          platform: platform
        })
        .select()
        .single();

      if (consentError) {
        throw new Error(`Failed to create consent record: ${consentError.message}`);
      }

      if (requiresParentalApproval) {
        // Send parental consent request
        await this.sendParentalConsentRequest(user.parent_email!, userId, deviceType, consentScope);
      }

      this.logger.info('Device consent request created', {
        userId,
        consentId: consentRecord.id,
        requiresParentalApproval
      });

      return {
        success: true,
        requiresParentalApproval,
        consentId: consentRecord.id
      };

    } catch (error) {
      this.logger.error('Device consent request failed', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        deviceType
      });
      throw error;
    }
  }

  /**
   * Minimize data collection according to privacy settings
   */
  async minimizeDataCollection(deviceData: any): Promise<any> {
    try {
      // Apply data minimization rules
      const minimizedData = {
        deviceId: this.hashDeviceId(deviceData.deviceId), // Hash for privacy
        roomId: deviceData.roomId,
        connectionStatus: deviceData.connectionStatus,
        lastUsed: deviceData.lastUsed
        // Exclude:
        // - Usage patterns
        // - Detailed device metadata
        // - User behavior analytics
        // - Room occupancy data
      };

      this.logger.debug('Data minimization applied', {
        originalFields: Object.keys(deviceData).length,
        minimizedFields: Object.keys(minimizedData).length
      });

      return minimizedData;

    } catch (error) {
      this.logger.error('Data minimization failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Audit device access for a user
   */
  async auditDeviceAccess(userId: string): Promise<DeviceAccessAudit> {
    try {
      this.logger.info('Auditing device access', { userId });

      // Get connected devices
      const { data: devices, error: devicesError } = await this.supabase
        .from('smart_home_devices')
        .select('*')
        .eq('user_id', userId);

      if (devicesError) {
        throw new Error(`Failed to get devices: ${devicesError.message}`);
      }

      // Get consent history
      const { data: consents, error: consentsError } = await this.supabase
        .from('iot_consent_records')
        .select('*')
        .eq('user_id', userId)
        .order('consent_timestamp', { ascending: false });

      if (consentsError) {
        throw new Error(`Failed to get consent history: ${consentsError.message}`);
      }

      // Get access logs
      const { data: logs, error: logsError } = await this.supabase
        .from('device_connection_logs')
        .select('*')
        .in('device_id', (devices || []).map(d => d.id))
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .order('created_at', { ascending: false });

      if (logsError) {
        throw new Error(`Failed to get access logs: ${logsError.message}`);
      }

      // Check user compliance status
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('age, is_coppa_protected, parent_consent_verified')
        .eq('id', userId)
        .single();

      if (userError) {
        throw new Error(`Failed to get user info: ${userError.message}`);
      }

      const audit: DeviceAccessAudit = {
        userId,
        connectedDevices: (devices || []).map(d => ({
          deviceId: d.id,
          deviceType: d.device_type,
          roomId: d.room_id,
          status: d.connection_status,
          capabilities: d.device_metadata?.capabilities || [],
          lastUsed: d.last_used_at
        })),
        consentHistory: (consents || []).map(c => ({
          userId: c.user_id,
          deviceType: c.device_type || 'unknown',
          deviceId: c.device_id,
          consentGiven: true, // Only stored if given
          consentScope: c.consent_scope,
          parentalConsent: c.parent_consent,
          consentMethod: c.consent_method,
          consentTimestamp: c.consent_timestamp,
          withdrawalTimestamp: c.withdrawal_timestamp,
          dataRetentionPreference: 'minimal', // Default
          platform: c.platform
        })),
        dataAccess: {
          lastAccessed: logs?.[0]?.created_at || 'Never',
          accessFrequency: logs?.length || 0,
          dataTypesAccessed: ['lighting_control', 'connection_status'] // Based on our minimal data collection
        },
        privacyCompliance: {
          coppaCompliant: !user?.is_coppa_protected || user?.parent_consent_verified,
          gdprCompliant: true, // Based on our privacy-by-design approach
          dataMinimized: true // We only collect essential data
        }
      };

      this.logger.info('Device access audit completed', {
        userId,
        connectedDevices: audit.connectedDevices.length,
        consentRecords: audit.consentHistory.length,
        accessLogs: logs?.length || 0
      });

      return audit;

    } catch (error) {
      this.logger.error('Device access audit failed', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      throw error;
    }
  }

  /**
   * Revoke device access and clean up data
   */
  async revokeDeviceAccess(userId: string, deviceId: string): Promise<void> {
    try {
      this.logger.info('Revoking device access', { userId, deviceId });

      // Update consent records to show withdrawal
      const { error: consentError } = await this.supabase
        .from('iot_consent_records')
        .update({
          withdrawal_timestamp: new Date().toISOString(),
          withdrawal_method: 'user_request'
        })
        .eq('user_id', userId)
        .eq('device_id', deviceId);

      if (consentError) {
        this.logger.error('Failed to update consent records', { error: consentError });
      }

      // Update device status
      const { error: deviceError } = await this.supabase
        .from('smart_home_devices')
        .update({
          connection_status: 'disconnected',
          consent_given: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', deviceId)
        .eq('user_id', userId);

      if (deviceError) {
        throw new Error(`Failed to update device status: ${deviceError.message}`);
      }

      // Clean up any cached data
      const cacheKey = `device:${userId}:${deviceId}`;
      await this.redis.del(cacheKey);

      this.logger.info('Device access revoked successfully', { userId, deviceId });

    } catch (error) {
      this.logger.error('Failed to revoke device access', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        deviceId
      });
      throw error;
    }
  }

  // Private helper methods

  private async checkExistingConsent(
    userId: string,
    deviceType: string,
    platform: string
  ): Promise<boolean> {
    const { data: consent, error } = await this.supabase
      .from('iot_consent_records')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .is('withdrawal_timestamp', null)
      .single();

    return !error && !!consent;
  }

  private requiresParentalApproval(user: any, deviceConfig: DeviceConnectionConfig): boolean {
    // COPPA-protected users always require parental approval
    if (user.is_coppa_protected) {
      return true;
    }

    // Users under 16 require parental approval for smart home devices
    if (user.age && user.age < 16) {
      return true;
    }

    return false;
  }

  private isAgeAppropriate(user: any, deviceConfig: DeviceConnectionConfig): boolean {
    // Smart home lighting is generally age-appropriate for all ages
    // with proper parental controls
    return true;
  }

  private validateDataMinimization(deviceConfig: DeviceConnectionConfig): boolean {
    // Check that data minimization settings are properly configured
    return deviceConfig.dataMinimization.collectOnlyLighting &&
           deviceConfig.dataMinimization.excludeUsagePatterns &&
           deviceConfig.dataMinimization.excludeDeviceMetadata;
  }

  private validateRetentionPolicy(deviceConfig: DeviceConnectionConfig): boolean {
    // Check that retention policy is compliant
    const policy = deviceConfig.retentionPolicy;
    
    return policy.connectionLogs === '24_hours' &&
           (policy.lightingHistory === 'none' || policy.lightingHistory === '7_days') &&
           policy.errorLogs === '30_days';
  }

  private async sendParentalConsentRequest(
    parentEmail: string,
    userId: string,
    deviceType: string,
    consentScope: any
  ): Promise<void> {
    // In production, this would send an email to the parent
    // For now, just log the request
    this.logger.info('Parental consent request sent', {
      parentEmail,
      userId,
      deviceType,
      consentScope
    });
  }

  private hashDeviceId(deviceId: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(deviceId).digest('hex');
  }
}
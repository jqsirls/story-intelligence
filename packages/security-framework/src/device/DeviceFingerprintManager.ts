import * as crypto from 'crypto';
import { EventEmitter } from 'events';

export interface DeviceFingerprint {
  deviceId: string;
  userId?: string;
  fingerprint: string;
  attributes: {
    userAgent?: string;
    screenResolution?: string;
    timezone?: string;
    language?: string;
    platform?: string;
    hardwareConcurrency?: number;
    deviceMemory?: number;
    colorDepth?: number;
    pixelRatio?: number;
    touchSupport?: boolean;
    audioFingerprint?: string;
    canvasFingerprint?: string;
    webglFingerprint?: string;
  };
  riskScore: number;
  trustLevel: 'trusted' | 'suspicious' | 'blocked';
  firstSeen: number;
  lastSeen: number;
  accessCount: number;
  anomalies: string[];
}

export interface DeviceValidationResult {
  isValid: boolean;
  deviceId: string;
  trustLevel: 'trusted' | 'suspicious' | 'blocked';
  riskScore: number;
  anomalies: string[];
  isNewDevice: boolean;
  requiresVerification: boolean;
}

export interface DeviceFingerprintConfig {
  trustThreshold: number;
  suspiciousThreshold: number;
  maxDevicesPerUser: number;
  anomalyThreshold: number;
  newDeviceVerificationRequired: boolean;
}

export class DeviceFingerprintManager extends EventEmitter {
  private devices: Map<string, DeviceFingerprint> = new Map();
  private userDevices: Map<string, Set<string>> = new Map();
  private config: DeviceFingerprintConfig;
  private blockedDevices: Set<string> = new Set();

  constructor(config: DeviceFingerprintConfig) {
    super();
    this.config = config;
  }

  /**
   * Generates and validates a device fingerprint
   */
  async validateDevice(
    deviceAttributes: Partial<DeviceFingerprint['attributes']>,
    userId?: string,
    metadata: Record<string, any> = {}
  ): Promise<DeviceValidationResult> {
    try {
      const fingerprint = this.generateFingerprint(deviceAttributes);
      const deviceId = this.generateDeviceId(fingerprint);

      let existingDevice = this.devices.get(deviceId);
      const isNewDevice = !existingDevice;

      if (isNewDevice) {
        existingDevice = this.createNewDevice(deviceId, fingerprint, deviceAttributes, userId);
      } else {
        existingDevice = this.updateExistingDevice(existingDevice, deviceAttributes, userId);
      }

      // Detect anomalies
      const anomalies = this.detectDeviceAnomalies(existingDevice, deviceAttributes);
      existingDevice.anomalies = anomalies;

      // Calculate risk score
      const riskScore = this.calculateDeviceRiskScore(existingDevice, anomalies, isNewDevice);
      existingDevice.riskScore = riskScore;

      // Determine trust level
      const trustLevel = this.determineTrustLevel(riskScore, anomalies, existingDevice.accessCount);
      existingDevice.trustLevel = trustLevel;

      // Check if device is blocked
      const isBlocked = this.blockedDevices.has(deviceId) || trustLevel === 'blocked';

      // Update device record
      this.devices.set(deviceId, existingDevice);

      // Update user-device mapping
      if (userId) {
        this.updateUserDeviceMapping(userId, deviceId);
      }

      const result: DeviceValidationResult = {
        isValid: !isBlocked && trustLevel !== 'blocked',
        deviceId,
        trustLevel,
        riskScore,
        anomalies,
        isNewDevice,
        requiresVerification: isNewDevice && this.config.newDeviceVerificationRequired
      };

      this.emit('deviceValidated', {
        result,
        device: existingDevice,
        userId,
        metadata
      });

      return result;
    } catch (error) {
      this.emit('validationError', {
        userId,
        error: error instanceof Error ? error.message : String(error),
        metadata
      });
      throw new Error(`Device validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Blocks a device from accessing the system
   */
  async blockDevice(deviceId: string, reason: string, metadata: Record<string, any> = {}): Promise<void> {
    this.blockedDevices.add(deviceId);
    
    const device = this.devices.get(deviceId);
    if (device) {
      device.trustLevel = 'blocked';
      device.riskScore = 1.0;
      device.anomalies.push(`blocked_${reason}`);
      this.devices.set(deviceId, device);
    }

    this.emit('deviceBlocked', {
      deviceId,
      reason,
      device,
      metadata
    });
  }

  /**
   * Unblocks a previously blocked device
   */
  async unblockDevice(deviceId: string, metadata: Record<string, any> = {}): Promise<void> {
    this.blockedDevices.delete(deviceId);
    
    const device = this.devices.get(deviceId);
    if (device) {
      device.trustLevel = 'suspicious'; // Start as suspicious, not trusted
      device.riskScore = 0.5;
      device.anomalies = device.anomalies.filter(a => !a.startsWith('blocked_'));
      this.devices.set(deviceId, device);
    }

    this.emit('deviceUnblocked', {
      deviceId,
      device,
      metadata
    });
  }

  /**
   * Gets all devices for a user
   */
  getUserDevices(userId: string): DeviceFingerprint[] {
    const deviceIds = this.userDevices.get(userId) || new Set();
    return Array.from(deviceIds)
      .map(deviceId => this.devices.get(deviceId))
      .filter((device): device is DeviceFingerprint => device !== undefined);
  }

  /**
   * Removes a device from a user's trusted devices
   */
  async removeUserDevice(userId: string, deviceId: string): Promise<void> {
    const userDeviceSet = this.userDevices.get(userId);
    if (userDeviceSet) {
      userDeviceSet.delete(deviceId);
      if (userDeviceSet.size === 0) {
        this.userDevices.delete(userId);
      }
    }

    const device = this.devices.get(deviceId);
    if (device && device.userId === userId) {
      device.userId = undefined;
      this.devices.set(deviceId, device);
    }

    this.emit('deviceRemoved', {
      userId,
      deviceId,
      device
    });
  }

  /**
   * Gets device analytics and statistics
   */
  getDeviceAnalytics(): {
    totalDevices: number;
    trustedDevices: number;
    suspiciousDevices: number;
    blockedDevices: number;
    averageRiskScore: number;
    topAnomalies: Array<{ anomaly: string; count: number }>;
  } {
    const devices = Array.from(this.devices.values());
    const totalDevices = devices.length;
    
    const trustedDevices = devices.filter(d => d.trustLevel === 'trusted').length;
    const suspiciousDevices = devices.filter(d => d.trustLevel === 'suspicious').length;
    const blockedDevices = devices.filter(d => d.trustLevel === 'blocked').length;
    
    const averageRiskScore = devices.length > 0 ? 
      devices.reduce((sum, d) => sum + d.riskScore, 0) / devices.length : 0;

    // Count anomalies
    const anomalyCount = new Map<string, number>();
    devices.forEach(device => {
      device.anomalies.forEach(anomaly => {
        anomalyCount.set(anomaly, (anomalyCount.get(anomaly) || 0) + 1);
      });
    });

    const topAnomalies = Array.from(anomalyCount.entries())
      .map(([anomaly, count]) => ({ anomaly, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalDevices,
      trustedDevices,
      suspiciousDevices,
      blockedDevices,
      averageRiskScore,
      topAnomalies
    };
  }

  /**
   * Generates a unique fingerprint from device attributes
   */
  private generateFingerprint(attributes: Partial<DeviceFingerprint['attributes']>): string {
    const fingerprintData = {
      userAgent: attributes.userAgent || '',
      screenResolution: attributes.screenResolution || '',
      timezone: attributes.timezone || '',
      language: attributes.language || '',
      platform: attributes.platform || '',
      hardwareConcurrency: attributes.hardwareConcurrency || 0,
      deviceMemory: attributes.deviceMemory || 0,
      colorDepth: attributes.colorDepth || 0,
      pixelRatio: attributes.pixelRatio || 0,
      touchSupport: attributes.touchSupport || false,
      audioFingerprint: attributes.audioFingerprint || '',
      canvasFingerprint: attributes.canvasFingerprint || '',
      webglFingerprint: attributes.webglFingerprint || ''
    };

    const fingerprintString = JSON.stringify(fingerprintData);
    return crypto.createHash('sha256').update(fingerprintString).digest('hex');
  }

  /**
   * Generates a device ID from fingerprint
   */
  private generateDeviceId(fingerprint: string): string {
    return `device_${fingerprint.substring(0, 16)}`;
  }

  /**
   * Creates a new device record
   */
  private createNewDevice(
    deviceId: string,
    fingerprint: string,
    attributes: Partial<DeviceFingerprint['attributes']>,
    userId?: string
  ): DeviceFingerprint {
    const now = Date.now();
    
    return {
      deviceId,
      userId,
      fingerprint,
      attributes: { ...attributes },
      riskScore: 0.5, // New devices start with medium risk
      trustLevel: 'suspicious', // New devices are suspicious until proven trustworthy
      firstSeen: now,
      lastSeen: now,
      accessCount: 1,
      anomalies: []
    };
  }

  /**
   * Updates an existing device record
   */
  private updateExistingDevice(
    device: DeviceFingerprint,
    attributes: Partial<DeviceFingerprint['attributes']>,
    userId?: string
  ): DeviceFingerprint {
    const updatedDevice = {
      ...device,
      lastSeen: Date.now(),
      accessCount: device.accessCount + 1,
      attributes: { ...device.attributes, ...attributes }
    };

    // Update user association if provided
    if (userId && !device.userId) {
      updatedDevice.userId = userId;
    }

    return updatedDevice;
  }

  /**
   * Detects anomalies in device behavior
   */
  private detectDeviceAnomalies(
    device: DeviceFingerprint,
    currentAttributes: Partial<DeviceFingerprint['attributes']>
  ): string[] {
    const anomalies: string[] = [];

    // Check for significant changes in device attributes
    if (device.attributes.userAgent && currentAttributes.userAgent &&
        device.attributes.userAgent !== currentAttributes.userAgent) {
      anomalies.push('user_agent_change');
    }

    if (device.attributes.screenResolution && currentAttributes.screenResolution &&
        device.attributes.screenResolution !== currentAttributes.screenResolution) {
      anomalies.push('screen_resolution_change');
    }

    if (device.attributes.timezone && currentAttributes.timezone &&
        device.attributes.timezone !== currentAttributes.timezone) {
      anomalies.push('timezone_change');
    }

    if (device.attributes.platform && currentAttributes.platform &&
        device.attributes.platform !== currentAttributes.platform) {
      anomalies.push('platform_change');
    }

    // Check for suspicious access patterns
    const timeSinceLastAccess = Date.now() - device.lastSeen;
    if (timeSinceLastAccess < 1000) { // Less than 1 second
      anomalies.push('rapid_access');
    }

    // Check for hardware inconsistencies
    if (device.attributes.hardwareConcurrency && currentAttributes.hardwareConcurrency &&
        Math.abs(device.attributes.hardwareConcurrency - currentAttributes.hardwareConcurrency) > 0) {
      anomalies.push('hardware_inconsistency');
    }

    return anomalies;
  }

  /**
   * Calculates risk score for a device
   */
  private calculateDeviceRiskScore(
    device: DeviceFingerprint,
    anomalies: string[],
    isNewDevice: boolean
  ): number {
    let riskScore = 0;

    // Base risk for new devices
    if (isNewDevice) {
      riskScore += 0.3;
    }

    // Risk from anomalies
    riskScore += anomalies.length * 0.2;

    // Risk from low access count (less familiar devices)
    if (device.accessCount < 5) {
      riskScore += 0.2;
    }

    // Risk from time since last access
    const daysSinceLastAccess = (Date.now() - device.lastSeen) / (1000 * 60 * 60 * 24);
    if (daysSinceLastAccess > 30) {
      riskScore += 0.1;
    }

    // Risk from missing key attributes
    const keyAttributes = ['userAgent', 'platform', 'screenResolution'];
    const missingAttributes = keyAttributes.filter(attr => !device.attributes[attr as keyof DeviceFingerprint['attributes']]);
    riskScore += missingAttributes.length * 0.1;

    return Math.min(riskScore, 1.0); // Cap at 1.0
  }

  /**
   * Determines trust level based on risk score and other factors
   */
  private determineTrustLevel(
    riskScore: number,
    anomalies: string[],
    accessCount: number
  ): 'trusted' | 'suspicious' | 'blocked' {
    // Block devices with critical anomalies
    const criticalAnomalies = ['platform_change', 'hardware_inconsistency'];
    if (anomalies.some(a => criticalAnomalies.includes(a))) {
      return 'blocked';
    }

    // Trust devices with low risk and high access count
    if (riskScore < this.config.trustThreshold && accessCount >= 10) {
      return 'trusted';
    }

    // Block devices with very high risk
    if (riskScore > 0.8) {
      return 'blocked';
    }

    // Suspicious for everything else
    if (riskScore > this.config.suspiciousThreshold) {
      return 'suspicious';
    }

    return 'trusted';
  }

  /**
   * Updates user-device mapping
   */
  private updateUserDeviceMapping(userId: string, deviceId: string): void {
    let userDeviceSet = this.userDevices.get(userId);
    if (!userDeviceSet) {
      userDeviceSet = new Set();
      this.userDevices.set(userId, userDeviceSet);
    }

    // Check device limit per user
    if (userDeviceSet.size >= this.config.maxDevicesPerUser && !userDeviceSet.has(deviceId)) {
      this.emit('deviceLimitExceeded', {
        userId,
        deviceId,
        currentDeviceCount: userDeviceSet.size,
        maxDevices: this.config.maxDevicesPerUser
      });
      return;
    }

    userDeviceSet.add(deviceId);
  }

  /**
   * Cleanup old devices and data
   */
  async cleanup(maxAge: number = 90 * 24 * 60 * 60 * 1000): Promise<void> {
    const now = Date.now();
    const devicesToRemove: string[] = [];

    for (const [deviceId, device] of this.devices) {
      if (now - device.lastSeen > maxAge) {
        devicesToRemove.push(deviceId);
      }
    }

    for (const deviceId of devicesToRemove) {
      const device = this.devices.get(deviceId);
      this.devices.delete(deviceId);
      this.blockedDevices.delete(deviceId);

      // Remove from user mappings
      if (device?.userId) {
        const userDeviceSet = this.userDevices.get(device.userId);
        if (userDeviceSet) {
          userDeviceSet.delete(deviceId);
          if (userDeviceSet.size === 0) {
            this.userDevices.delete(device.userId);
          }
        }
      }
    }

    this.emit('devicesCleanedUp', {
      removedCount: devicesToRemove.length,
      maxAge
    });
  }
}
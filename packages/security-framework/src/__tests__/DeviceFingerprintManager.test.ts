import { DeviceFingerprintManager, DeviceFingerprintConfig } from '../device/DeviceFingerprintManager';

describe('DeviceFingerprintManager', () => {
  let manager: DeviceFingerprintManager;
  let config: DeviceFingerprintConfig;

  beforeEach(() => {
    config = {
      trustThreshold: 0.3,
      suspiciousThreshold: 0.6,
      maxDevicesPerUser: 5,
      anomalyThreshold: 0.4,
      newDeviceVerificationRequired: true
    };

    manager = new DeviceFingerprintManager(config);
  });

  describe('validateDevice', () => {
    it('should validate a new device', async () => {
      const deviceAttributes = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        screenResolution: '1920x1080',
        timezone: 'America/New_York',
        language: 'en-US',
        platform: 'Win32',
        hardwareConcurrency: 8,
        deviceMemory: 8,
        colorDepth: 24
      };
      const userId = 'user123';

      const result = await manager.validateDevice(deviceAttributes, userId);

      expect(result).toBeDefined();
      expect(typeof result.deviceId).toBe('string');
      expect(result.isNewDevice).toBe(true);
      expect(result.requiresVerification).toBe(true);
      expect(['trusted', 'suspicious', 'blocked']).toContain(result.trustLevel);
      expect(typeof result.riskScore).toBe('number');
      expect(Array.isArray(result.anomalies)).toBe(true);
    });

    it('should recognize returning device', async () => {
      const deviceAttributes = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        screenResolution: '1920x1080',
        timezone: 'America/New_York',
        language: 'en-US'
      };
      const userId = 'user123';

      // First validation - new device
      const firstResult = await manager.validateDevice(deviceAttributes, userId);
      expect(firstResult.isNewDevice).toBe(true);

      // Second validation - returning device
      const secondResult = await manager.validateDevice(deviceAttributes, userId);
      expect(secondResult.isNewDevice).toBe(false);
      expect(secondResult.deviceId).toBe(firstResult.deviceId);
    });

    it('should detect device anomalies', async () => {
      const originalAttributes = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        screenResolution: '1920x1080',
        timezone: 'America/New_York',
        platform: 'Win32'
      };
      const userId = 'user123';

      // First validation with original attributes
      await manager.validateDevice(originalAttributes, userId);

      // Second validation with changed attributes
      const changedAttributes = {
        ...originalAttributes,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', // Changed
        platform: 'MacIntel' // Changed
      };

      const result = await manager.validateDevice(changedAttributes, userId);

      expect(result.anomalies.length).toBeGreaterThan(0);
      expect(result.anomalies).toContain('user_agent_change');
      expect(result.anomalies).toContain('platform_change');
      expect(result.riskScore).toBeGreaterThan(0.5);
    });

    it('should emit device validation event', async () => {
      const deviceAttributes = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        screenResolution: '1920x1080'
      };
      const userId = 'user123';
      let eventEmitted = false;

      manager.on('deviceValidated', (event) => {
        expect(event.result).toBeDefined();
        expect(event.device).toBeDefined();
        expect(event.userId).toBe(userId);
        eventEmitted = true;
      });

      await manager.validateDevice(deviceAttributes, userId);
      expect(eventEmitted).toBe(true);
    });

    it('should handle device limit exceeded', async () => {
      const userId = 'user123';
      let limitExceededEmitted = false;

      manager.on('deviceLimitExceeded', (event) => {
        expect(event.userId).toBe(userId);
        expect(event.currentDeviceCount).toBe(config.maxDevicesPerUser);
        limitExceededEmitted = true;
      });

      // Register maximum number of devices
      for (let i = 0; i < config.maxDevicesPerUser; i++) {
        const deviceAttributes = {
          userAgent: `Browser ${i}`,
          screenResolution: `${1920 + i}x1080`
        };
        await manager.validateDevice(deviceAttributes, userId);
      }

      // Try to register one more device
      const extraDeviceAttributes = {
        userAgent: 'Extra Browser',
        screenResolution: '2560x1440'
      };
      await manager.validateDevice(extraDeviceAttributes, userId);

      expect(limitExceededEmitted).toBe(true);
    });
  });

  describe('blockDevice', () => {
    it('should block a device', async () => {
      const deviceAttributes = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        screenResolution: '1920x1080'
      };
      const userId = 'user123';

      // First validate to create device
      const result = await manager.validateDevice(deviceAttributes, userId);
      const deviceId = result.deviceId;

      // Then block it
      await manager.blockDevice(deviceId, 'suspicious_activity');

      // Validate again - should be blocked
      const blockedResult = await manager.validateDevice(deviceAttributes, userId);
      expect(blockedResult.trustLevel).toBe('blocked');
      expect(blockedResult.isValid).toBe(false);
    });

    it('should emit device blocked event', async () => {
      const deviceAttributes = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        screenResolution: '1920x1080'
      };
      const userId = 'user123';

      const result = await manager.validateDevice(deviceAttributes, userId);
      const deviceId = result.deviceId;

      let eventEmitted = false;
      manager.on('deviceBlocked', (event) => {
        expect(event.deviceId).toBe(deviceId);
        expect(event.reason).toBe('test_block');
        eventEmitted = true;
      });

      await manager.blockDevice(deviceId, 'test_block');
      expect(eventEmitted).toBe(true);
    });
  });

  describe('unblockDevice', () => {
    it('should unblock a previously blocked device', async () => {
      const deviceAttributes = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        screenResolution: '1920x1080'
      };
      const userId = 'user123';

      // Create and block device
      const result = await manager.validateDevice(deviceAttributes, userId);
      const deviceId = result.deviceId;
      await manager.blockDevice(deviceId, 'test_block');

      // Unblock device
      await manager.unblockDevice(deviceId);

      // Validate again - should be suspicious (not trusted immediately)
      const unblockedResult = await manager.validateDevice(deviceAttributes, userId);
      expect(unblockedResult.trustLevel).toBe('suspicious');
      expect(unblockedResult.isValid).toBe(true);
    });

    it('should emit device unblocked event', async () => {
      const deviceAttributes = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        screenResolution: '1920x1080'
      };
      const userId = 'user123';

      const result = await manager.validateDevice(deviceAttributes, userId);
      const deviceId = result.deviceId;
      await manager.blockDevice(deviceId, 'test_block');

      let eventEmitted = false;
      manager.on('deviceUnblocked', (event) => {
        expect(event.deviceId).toBe(deviceId);
        eventEmitted = true;
      });

      await manager.unblockDevice(deviceId);
      expect(eventEmitted).toBe(true);
    });
  });

  describe('getUserDevices', () => {
    it('should return all devices for a user', async () => {
      const userId = 'user123';
      const device1Attributes = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        screenResolution: '1920x1080'
      };
      const device2Attributes = {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        screenResolution: '2560x1600'
      };

      await manager.validateDevice(device1Attributes, userId);
      await manager.validateDevice(device2Attributes, userId);

      const userDevices = manager.getUserDevices(userId);

      expect(userDevices).toHaveLength(2);
      expect(userDevices[0].userId).toBe(userId);
      expect(userDevices[1].userId).toBe(userId);
    });

    it('should return empty array for user with no devices', () => {
      const userDevices = manager.getUserDevices('non-existent-user');
      expect(userDevices).toHaveLength(0);
    });
  });

  describe('removeUserDevice', () => {
    it('should remove a device from user\'s trusted devices', async () => {
      const userId = 'user123';
      const deviceAttributes = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        screenResolution: '1920x1080'
      };

      const result = await manager.validateDevice(deviceAttributes, userId);
      const deviceId = result.deviceId;

      // Verify device is associated with user
      let userDevices = manager.getUserDevices(userId);
      expect(userDevices).toHaveLength(1);

      // Remove device
      await manager.removeUserDevice(userId, deviceId);

      // Verify device is no longer associated with user
      userDevices = manager.getUserDevices(userId);
      expect(userDevices).toHaveLength(0);
    });

    it('should emit device removed event', async () => {
      const userId = 'user123';
      const deviceAttributes = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        screenResolution: '1920x1080'
      };

      const result = await manager.validateDevice(deviceAttributes, userId);
      const deviceId = result.deviceId;

      let eventEmitted = false;
      manager.on('deviceRemoved', (event) => {
        expect(event.userId).toBe(userId);
        expect(event.deviceId).toBe(deviceId);
        eventEmitted = true;
      });

      await manager.removeUserDevice(userId, deviceId);
      expect(eventEmitted).toBe(true);
    });
  });

  describe('getDeviceAnalytics', () => {
    beforeEach(async () => {
      // Create test devices with different trust levels
      const trustedDevice = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        screenResolution: '1920x1080'
      };
      const suspiciousDevice = {
        userAgent: 'Suspicious Browser',
        screenResolution: '1x1'
      };

      // Create trusted device (access multiple times to build trust)
      const trustedResult = await manager.validateDevice(trustedDevice, 'user1');
      for (let i = 0; i < 15; i++) {
        await manager.validateDevice(trustedDevice, 'user1');
      }

      // Create suspicious device
      await manager.validateDevice(suspiciousDevice, 'user2');

      // Block one device
      await manager.blockDevice(trustedResult.deviceId, 'test_block');
    });

    it('should return device analytics', () => {
      const analytics = manager.getDeviceAnalytics();

      expect(analytics).toBeDefined();
      expect(typeof analytics.totalDevices).toBe('number');
      expect(typeof analytics.trustedDevices).toBe('number');
      expect(typeof analytics.suspiciousDevices).toBe('number');
      expect(typeof analytics.blockedDevices).toBe('number');
      expect(typeof analytics.averageRiskScore).toBe('number');
      expect(Array.isArray(analytics.topAnomalies)).toBe(true);

      expect(analytics.totalDevices).toBeGreaterThan(0);
      expect(analytics.blockedDevices).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    it('should clean up old devices', async () => {
      const deviceAttributes = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        screenResolution: '1920x1080'
      };
      const userId = 'user123';

      await manager.validateDevice(deviceAttributes, userId);

      let eventEmitted = false;
      manager.on('devicesCleanedUp', (event) => {
        expect(typeof event.removedCount).toBe('number');
        expect(typeof event.maxAge).toBe('number');
        eventEmitted = true;
      });

      // Clean up devices older than 1ms (should clean up all)
      await manager.cleanup(1);
      expect(eventEmitted).toBe(true);
    });
  });
});
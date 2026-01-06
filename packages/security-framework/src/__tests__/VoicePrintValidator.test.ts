import { VoicePrintValidator, BiometricConfig } from '../biometric/VoicePrintValidator';

describe('VoicePrintValidator', () => {
  let validator: VoicePrintValidator;
  let config: BiometricConfig;

  beforeEach(() => {
    config = {
      confidenceThreshold: 0.8,
      maxProfiles: 1000,
      updateThreshold: 0.7,
      anomalyThreshold: 0.3
    };

    validator = new VoicePrintValidator(config);
  });

  describe('enrollVoicePrint', () => {
    it('should enroll a new voice print successfully', async () => {
      const userId = 'user123';
      const audioBuffer = Buffer.from('test voice data');

      const profile = await validator.enrollVoicePrint(userId, audioBuffer);

      expect(profile).toBeDefined();
      expect(profile.userId).toBe(userId);
      expect(profile.voicePrintHash).toBeTruthy();
      expect(profile.features).toBeDefined();
      expect(profile.features.pitch).toHaveLength(10);
      expect(profile.features.formants).toHaveLength(5);
      expect(profile.features.spectralCentroid).toHaveLength(8);
      expect(profile.features.mfcc).toHaveLength(13);
      expect(profile.confidence).toBe(1.0);
    });

    it('should emit enrollment event', async () => {
      const userId = 'user123';
      const audioBuffer = Buffer.from('test voice data');
      let eventEmitted = false;

      validator.on('voicePrintEnrolled', (event) => {
        expect(event.userId).toBe(userId);
        expect(event.profile).toBeDefined();
        eventEmitted = true;
      });

      await validator.enrollVoicePrint(userId, audioBuffer);
      expect(eventEmitted).toBe(true);
    });

    it('should handle enrollment errors', async () => {
      const userId = 'user123';
      const invalidBuffer = null as any;

      await expect(
        validator.enrollVoicePrint(userId, invalidBuffer)
      ).rejects.toThrow('Voice print enrollment failed');
    });
  });

  describe('validateVoicePrint', () => {
    beforeEach(async () => {
      // Enroll a voice print first
      const audioBuffer = Buffer.from('enrollment voice data');
      await validator.enrollVoicePrint('user123', audioBuffer);
    });

    it('should validate voice print successfully for enrolled user', async () => {
      const audioBuffer = Buffer.from('validation voice data');
      const claimedUserId = 'user123';

      const result = await validator.validateVoicePrint(audioBuffer, claimedUserId);

      expect(result).toBeDefined();
      expect(result.userId).toBe(claimedUserId);
      expect(typeof result.confidence).toBe('number');
      expect(typeof result.riskScore).toBe('number');
      expect(Array.isArray(result.anomalies)).toBe(true);
    });

    it('should search all profiles when no user ID is claimed', async () => {
      const audioBuffer = Buffer.from('validation voice data');

      const result = await validator.validateVoicePrint(audioBuffer);

      expect(result).toBeDefined();
      expect(typeof result.confidence).toBe('number');
      expect(typeof result.riskScore).toBe('number');
    });

    it('should detect anomalies in voice patterns', async () => {
      // Enroll with one pattern
      const enrollmentBuffer = Buffer.from('consistent voice pattern');
      await validator.enrollVoicePrint('user456', enrollmentBuffer);

      // Validate with very different pattern
      const differentBuffer = Buffer.from('completely different voice pattern that should trigger anomalies');
      const result = await validator.validateVoicePrint(differentBuffer, 'user456');

      expect(result.anomalies.length).toBeGreaterThan(0);
      expect(result.riskScore).toBeGreaterThan(0.3);
    });

    it('should emit validation event', async () => {
      const audioBuffer = Buffer.from('validation voice data');
      const claimedUserId = 'user123';
      let eventEmitted = false;

      validator.on('voicePrintValidated', (event) => {
        expect(event.result).toBeDefined();
        expect(event.claimedUserId).toBe(claimedUserId);
        eventEmitted = true;
      });

      await validator.validateVoicePrint(audioBuffer, claimedUserId);
      expect(eventEmitted).toBe(true);
    });
  });

  describe('updateVoicePrint', () => {
    beforeEach(async () => {
      // Enroll a voice print first
      const audioBuffer = Buffer.from('initial enrollment data');
      await validator.enrollVoicePrint('user123', audioBuffer);
    });

    it('should update existing voice print', async () => {
      const userId = 'user123';
      const updateBuffer = Buffer.from('updated voice data');

      const updatedProfile = await validator.updateVoicePrint(userId, updateBuffer);

      expect(updatedProfile).toBeDefined();
      expect(updatedProfile.userId).toBe(userId);
      expect(updatedProfile.lastUpdated).toBeGreaterThan(updatedProfile.createdAt);
    });

    it('should reject updates that are too different', async () => {
      const userId = 'user123';
      const veryDifferentBuffer = Buffer.from('extremely different voice pattern that should be rejected');

      await expect(
        validator.updateVoicePrint(userId, veryDifferentBuffer)
      ).rejects.toThrow('too different from existing profile');
    });

    it('should emit update event', async () => {
      const userId = 'user123';
      const updateBuffer = Buffer.from('updated voice data');
      let eventEmitted = false;

      validator.on('voicePrintUpdated', (event) => {
        expect(event.userId).toBe(userId);
        expect(event.profile).toBeDefined();
        expect(typeof event.similarity).toBe('number');
        eventEmitted = true;
      });

      await validator.updateVoicePrint(userId, updateBuffer);
      expect(eventEmitted).toBe(true);
    });
  });

  describe('removeVoicePrint', () => {
    beforeEach(async () => {
      // Enroll a voice print first
      const audioBuffer = Buffer.from('enrollment data');
      await validator.enrollVoicePrint('user123', audioBuffer);
    });

    it('should remove voice print successfully', async () => {
      const userId = 'user123';

      await validator.removeVoicePrint(userId);

      const stats = validator.getValidationStats(userId);
      expect(stats.profile).toBeUndefined();
    });

    it('should emit removal event', async () => {
      const userId = 'user123';
      let eventEmitted = false;

      validator.on('voicePrintRemoved', (event) => {
        expect(event.userId).toBe(userId);
        expect(event.profile).toBeDefined();
        eventEmitted = true;
      });

      await validator.removeVoicePrint(userId);
      expect(eventEmitted).toBe(true);
    });
  });

  describe('getValidationStats', () => {
    beforeEach(async () => {
      // Enroll and validate multiple times
      const audioBuffer = Buffer.from('enrollment data');
      await validator.enrollVoicePrint('user123', audioBuffer);
      
      // Perform multiple validations
      for (let i = 0; i < 5; i++) {
        const validationBuffer = Buffer.from(`validation data ${i}`);
        await validator.validateVoicePrint(validationBuffer, 'user123');
      }
    });

    it('should return validation statistics', () => {
      const stats = validator.getValidationStats('user123');

      expect(stats).toBeDefined();
      expect(stats.totalValidations).toBe(5);
      expect(typeof stats.averageConfidence).toBe('number');
      expect(Array.isArray(stats.recentConfidences)).toBe(true);
      expect(stats.recentConfidences).toHaveLength(5);
      expect(stats.profile).toBeDefined();
    });

    it('should return empty stats for non-existent user', () => {
      const stats = validator.getValidationStats('non-existent-user');

      expect(stats.totalValidations).toBe(0);
      expect(stats.averageConfidence).toBe(0);
      expect(stats.recentConfidences).toHaveLength(0);
      expect(stats.profile).toBeUndefined();
    });
  });

  describe('getMetrics', () => {
    beforeEach(async () => {
      // Create some test data
      const audioBuffer1 = Buffer.from('user1 voice data');
      const audioBuffer2 = Buffer.from('user2 voice data');
      
      await validator.enrollVoicePrint('user1', audioBuffer1);
      await validator.enrollVoicePrint('user2', audioBuffer2);
      
      await validator.validateVoicePrint(audioBuffer1, 'user1');
      await validator.validateVoicePrint(audioBuffer2, 'user2');
    });

    it('should return system metrics', () => {
      const metrics = validator.getMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.totalProfiles).toBe(2);
      expect(metrics.totalValidations).toBe(2);
      expect(typeof metrics.averageConfidence).toBe('number');
      expect(typeof metrics.anomalyRate).toBe('number');
    });
  });
});
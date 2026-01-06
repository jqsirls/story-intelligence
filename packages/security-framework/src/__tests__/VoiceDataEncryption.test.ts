import { VoiceDataEncryptionService } from '../encryption/VoiceDataEncryption';
import { EncryptionConfig } from '../types';

describe('VoiceDataEncryptionService', () => {
  let encryptionService: VoiceDataEncryptionService;
  let config: EncryptionConfig;

  beforeEach(() => {
    config = {
      algorithm: 'AES-256-GCM',
      keyRotationInterval: 3600000, // 1 hour
      keyDerivationRounds: 100000
    };
    encryptionService = new VoiceDataEncryptionService(config);
  });

  afterEach(() => {
    encryptionService.cleanup();
  });

  describe('encryptVoiceData', () => {
    it('should encrypt audio buffer successfully', async () => {
      const audioBuffer = Buffer.from('test audio data');

      const result = await encryptionService.encryptVoiceData(audioBuffer);

      expect(result).toBeDefined();
      expect(result.encryptedData).toBeTruthy();
      expect(result.iv).toBeTruthy();
      expect(result.authTag).toBeTruthy();
      expect(result.keyId).toBeTruthy();
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should produce different encrypted data for same input', async () => {
      const audioBuffer = Buffer.from('test audio data');

      const result1 = await encryptionService.encryptVoiceData(audioBuffer);
      const result2 = await encryptionService.encryptVoiceData(audioBuffer);

      expect(result1.encryptedData).not.toBe(result2.encryptedData);
      expect(result1.iv).not.toBe(result2.iv);
    });

    it('should handle empty buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);

      const result = await encryptionService.encryptVoiceData(emptyBuffer);

      expect(result).toBeDefined();
      expect(result.encryptedData).toBeTruthy();
    });
  });

  describe('decryptVoiceData', () => {
    it('should decrypt data encrypted by the same service', async () => {
      const originalData = Buffer.from('test audio data for decryption');

      const encrypted = await encryptionService.encryptVoiceData(originalData);
      const decrypted = await encryptionService.decryptVoiceData(encrypted);

      expect(decrypted).toEqual(originalData);
    });

    it('should fail with invalid key ID', async () => {
      const originalData = Buffer.from('test audio data');
      const encrypted = await encryptionService.encryptVoiceData(originalData);
      
      // Corrupt the key ID
      encrypted.keyId = 'invalid_key_id';

      await expect(encryptionService.decryptVoiceData(encrypted))
        .rejects.toThrow('Encryption key not found');
    });

    it('should fail with corrupted encrypted data', async () => {
      const originalData = Buffer.from('test audio data');
      const encrypted = await encryptionService.encryptVoiceData(originalData);
      
      // Corrupt the encrypted data
      encrypted.encryptedData = 'corrupted_data';

      await expect(encryptionService.decryptVoiceData(encrypted))
        .rejects.toThrow('Voice data decryption failed');
    });
  });

  describe('getMetrics', () => {
    it('should return encryption metrics', () => {
      const metrics = encryptionService.getMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.activeKeys).toBe('number');
      expect(typeof metrics.currentKeyId).toBe('string');
      expect(metrics.activeKeys).toBeGreaterThan(0);
      expect(metrics.currentKeyId).toBeTruthy();
    });
  });
});
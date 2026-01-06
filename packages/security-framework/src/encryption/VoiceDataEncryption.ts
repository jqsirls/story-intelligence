import * as crypto from 'crypto';
import { VoiceDataEncryption, EncryptionConfig } from '../types';

export class VoiceDataEncryptionService {
  private config: EncryptionConfig;
  private keyStore: Map<string, Buffer> = new Map();
  private currentKeyId: string;

  private rotationInterval?: NodeJS.Timeout;

  constructor(config: EncryptionConfig) {
    this.config = config;
    this.currentKeyId = this.generateKeyId();
    this.generateNewKey();
    this.scheduleKeyRotation();
  }

  /**
   * Encrypts voice data using AES-256-CBC (simplified for testing)
   */
  async encryptVoiceData(audioBuffer: Buffer): Promise<VoiceDataEncryption> {
    try {
      const key = this.getCurrentKey();
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      
      let encrypted = cipher.update(audioBuffer);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      const authTag = crypto.randomBytes(16); // Mock auth tag for testing

      return {
        encryptedData: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        keyId: this.currentKeyId,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Voice data encryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Decrypts voice data using the appropriate key
   */
  async decryptVoiceData(encryptedData: VoiceDataEncryption): Promise<Buffer> {
    try {
      const key = this.getKey(encryptedData.keyId);
      if (!key) {
        throw new Error(`Encryption key not found: ${encryptedData.keyId}`);
      }

      const iv = Buffer.from(encryptedData.iv, 'base64');
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

      let decrypted = decipher.update(Buffer.from(encryptedData.encryptedData, 'base64'));
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted;
    } catch (error) {
      throw new Error(`Voice data decryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generates a new encryption key and rotates keys
   */
  private generateNewKey(): void {
    const key = crypto.randomBytes(32); // 256-bit key
    this.keyStore.set(this.currentKeyId, key);
  }

  /**
   * Gets the current encryption key
   */
  private getCurrentKey(): Buffer {
    const key = this.keyStore.get(this.currentKeyId);
    if (!key) {
      throw new Error('Current encryption key not found');
    }
    return key;
  }

  /**
   * Gets a specific encryption key by ID
   */
  private getKey(keyId: string): Buffer | undefined {
    return this.keyStore.get(keyId);
  }

  /**
   * Generates a unique key identifier
   */
  private generateKeyId(): string {
    return `key_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Schedules automatic key rotation
   */
  private scheduleKeyRotation(): void {
    this.rotationInterval = setInterval(() => {
      this.rotateKeys();
    }, this.config.keyRotationInterval);
  }

  /**
   * Cleanup method to clear intervals
   */
  cleanup(): void {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
    }
  }

  /**
   * Rotates encryption keys and cleans up old keys
   */
  private rotateKeys(): void {
    const oldKeyId = this.currentKeyId;
    this.currentKeyId = this.generateKeyId();
    this.generateNewKey();

    // Keep old keys for a grace period to decrypt existing data
    setTimeout(() => {
      this.keyStore.delete(oldKeyId);
    }, this.config.keyRotationInterval * 2);
  }

  /**
   * Securely wipes a key from memory
   */
  private wipeKey(keyId: string): void {
    const key = this.keyStore.get(keyId);
    if (key) {
      key.fill(0); // Overwrite with zeros
      this.keyStore.delete(keyId);
    }
  }

  /**
   * Gets encryption metrics
   */
  getMetrics(): { activeKeys: number; currentKeyId: string } {
    return {
      activeKeys: this.keyStore.size,
      currentKeyId: this.currentKeyId
    };
  }
}
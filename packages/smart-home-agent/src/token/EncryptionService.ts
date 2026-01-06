import * as crypto from 'crypto';

export interface EncryptionService {
  encrypt(data: any): Promise<string>;
  decrypt(encryptedData: string): Promise<any>;
  rotateKeys(): Promise<void>;
  getCurrentKeyId(): string;
}

export class TokenEncryptionService implements EncryptionService {
  private currentKeyId: string = 'key-1';
  private encryptionKeys: Map<string, Buffer> = new Map();

  constructor(private config: { algorithm: string; keyRotationInterval: number }) {
    // Initialize with a default key (in production, this would be loaded from secure storage)
    this.generateNewKey(this.currentKeyId);
  }

  /**
   * Encrypt data using current encryption key
   */
  async encrypt(data: any): Promise<string> {
    try {
      const key = this.encryptionKeys.get(this.currentKeyId);
      if (!key) {
        throw new Error('No encryption key available');
      }

      const plaintext = JSON.stringify(data);
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipher('aes-256-gcm', key);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = ''; // Simplified for compatibility
      
      // Combine keyId, iv, authTag, and encrypted data
      const result = {
        keyId: this.currentKeyId,
        iv: iv.toString('hex'),
        authTag,
        data: encrypted
      };

      return Buffer.from(JSON.stringify(result)).toString('base64');

    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Decrypt data using the appropriate key
   */
  async decrypt(encryptedData: string): Promise<any> {
    try {
      const encryptedObj = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));
      
      const key = this.encryptionKeys.get(encryptedObj.keyId);
      if (!key) {
        throw new Error(`Encryption key not found: ${encryptedObj.keyId}`);
      }

      const decipher = crypto.createDecipher('aes-256-gcm', key);
      
      if (encryptedObj.authTag) {
        decipher.setAuthTag(Buffer.from(encryptedObj.authTag, 'hex'));
      }
      
      let decrypted = decipher.update(encryptedObj.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);

    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Rotate encryption keys
   */
  async rotateKeys(): Promise<void> {
    try {
      const newKeyId = `key-${Date.now()}`;
      this.generateNewKey(newKeyId);
      
      // Keep old keys for decryption of existing data
      // In production, implement proper key lifecycle management
      
      this.currentKeyId = newKeyId;
      
      console.log(`Encryption key rotated to: ${newKeyId}`);

    } catch (error) {
      throw new Error(`Key rotation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get current key ID
   */
  getCurrentKeyId(): string {
    return this.currentKeyId;
  }

  /**
   * Generate a new encryption key
   */
  private generateNewKey(keyId: string): void {
    // Generate a 256-bit key for AES-256
    const key = crypto.randomBytes(32);
    this.encryptionKeys.set(keyId, key);
  }

  /**
   * Cleanup old keys (for key lifecycle management)
   */
  async cleanupOldKeys(): Promise<void> {
    // In production, implement proper key cleanup based on policy
    // For now, keep all keys to ensure we can decrypt existing data
    
    const keyCount = this.encryptionKeys.size;
    if (keyCount > 10) {
      // Keep only the 10 most recent keys
      const sortedKeys = Array.from(this.encryptionKeys.keys()).sort();
      const keysToRemove = sortedKeys.slice(0, keyCount - 10);
      
      for (const keyId of keysToRemove) {
        this.encryptionKeys.delete(keyId);
      }
      
      console.log(`Cleaned up ${keysToRemove.length} old encryption keys`);
    }
  }

  /**
   * Get encryption statistics
   */
  getStatistics(): {
    currentKeyId: string;
    totalKeys: number;
    algorithm: string;
  } {
    return {
      currentKeyId: this.currentKeyId,
      totalKeys: this.encryptionKeys.size,
      algorithm: this.config.algorithm
    };
  }
}
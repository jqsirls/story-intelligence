import crypto from 'crypto';
import { Logger } from '../utils/Logger';

/**
 * Per-Library AES-256-GCM Encryption for Phase 1
 * Extends existing smart home encryption patterns to story blobs
 * Requirement: Per-library AES-256-GCM encryption with device keystore integration
 */
export class PerLibraryEncryption {
  private logger: Logger;
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly KEY_LENGTH = 32; // 256 bits
  private readonly IV_LENGTH = 16; // 128 bits
  private readonly TAG_LENGTH = 16; // 128 bits

  constructor() {
    this.logger = new Logger('PerLibraryEncryption');
  }

  /**
   * Generate a new encryption key for a library
   * Keys are stored in device keystore and rotated on ownership change
   */
  async generateLibraryKey(libraryId: string, userId: string): Promise<LibraryEncryptionKey> {
    this.logger.info('Generating new library encryption key', { libraryId, userId });

    const key = crypto.randomBytes(this.KEY_LENGTH);
    const keyId = crypto.randomUUID();
    
    const libraryKey: LibraryEncryptionKey = {
      keyId,
      libraryId,
      userId,
      key: key.toString('base64'),
      algorithm: this.ALGORITHM,
      createdAt: new Date(),
      rotatedAt: new Date(),
      version: 1,
      isActive: true
    };

    // Store in device keystore (extends existing smart home pattern)
    await this.storeInDeviceKeystore(libraryKey);
    
    this.logger.info('Library encryption key generated and stored', { 
      keyId, 
      libraryId, 
      userId 
    });

    return libraryKey;
  }

  /**
   * Encrypt story blob with per-library key
   * Server never sees plaintext (Phase 1 requirement)
   */
  async encryptStoryBlob(
    storyBlob: string, 
    libraryId: string, 
    userId: string
  ): Promise<EncryptedStoryBlob> {
    const startTime = Date.now();
    
    try {
      // Get library encryption key
      const libraryKey = await this.getLibraryKey(libraryId, userId);
      
      if (!libraryKey) {
        throw new Error(`No encryption key found for library ${libraryId}`);
      }

      // Generate random IV for this encryption
      const iv = crypto.randomBytes(this.IV_LENGTH);
      
      // Create cipher
      const cipher = crypto.createCipher(this.ALGORITHM, Buffer.from(libraryKey.key, 'base64'));
      cipher.setAAD(Buffer.from(`${libraryId}:${userId}`)); // Additional authenticated data
      
      // Encrypt the story blob
      let encrypted = cipher.update(storyBlob, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      // Get authentication tag
      const tag = cipher.getAuthTag();
      
      const encryptedBlob: EncryptedStoryBlob = {
        encryptedData: encrypted,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        keyId: libraryKey.keyId,
        libraryId,
        userId,
        algorithm: this.ALGORITHM,
        encryptedAt: new Date(),
        version: 1
      };

      const processingTime = Date.now() - startTime;
      
      this.logger.info('Story blob encrypted successfully', {
        libraryId,
        userId,
        keyId: libraryKey.keyId,
        processingTime,
        originalSize: storyBlob.length,
        encryptedSize: encrypted.length
      });

      return encryptedBlob;

    } catch (error) {
      this.logger.error('Story blob encryption failed', { 
        libraryId, 
        userId, 
        error: error.message 
      });
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt story blob with per-library key
   * Only accessible to library owner
   */
  async decryptStoryBlob(
    encryptedBlob: EncryptedStoryBlob, 
    userId: string
  ): Promise<string> {
    const startTime = Date.now();
    
    try {
      // Verify user has access to this library
      if (encryptedBlob.userId !== userId) {
        throw new Error('Access denied: User does not own this library');
      }

      // Get library encryption key
      const libraryKey = await this.getLibraryKey(encryptedBlob.libraryId, userId);
      
      if (!libraryKey || libraryKey.keyId !== encryptedBlob.keyId) {
        throw new Error('Decryption key not found or key mismatch');
      }

      // Create decipher
      const decipher = crypto.createDecipher(
        encryptedBlob.algorithm, 
        Buffer.from(libraryKey.key, 'base64')
      );
      
      // Set IV and auth tag
      decipher.setAAD(Buffer.from(`${encryptedBlob.libraryId}:${encryptedBlob.userId}`));
      decipher.setAuthTag(Buffer.from(encryptedBlob.tag, 'base64'));
      
      // Decrypt the story blob
      let decrypted = decipher.update(encryptedBlob.encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      const processingTime = Date.now() - startTime;
      
      this.logger.info('Story blob decrypted successfully', {
        libraryId: encryptedBlob.libraryId,
        userId,
        keyId: encryptedBlob.keyId,
        processingTime,
        decryptedSize: decrypted.length
      });

      return decrypted;

    } catch (error) {
      this.logger.error('Story blob decryption failed', { 
        libraryId: encryptedBlob.libraryId, 
        userId, 
        error: error.message 
      });
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Rotate library encryption key on ownership change
   * Phase 1 requirement: Key rotation on ownership change
   */
  async rotateLibraryKey(
    libraryId: string, 
    oldUserId: string, 
    newUserId: string
  ): Promise<LibraryEncryptionKey> {
    this.logger.info('Rotating library encryption key', { 
      libraryId, 
      oldUserId, 
      newUserId 
    });

    try {
      // Get current key
      const oldKey = await this.getLibraryKey(libraryId, oldUserId);
      
      if (!oldKey) {
        throw new Error(`No existing key found for library ${libraryId}`);
      }

      // Mark old key as inactive
      await this.deactivateLibraryKey(oldKey.keyId);
      
      // Generate new key for new owner
      const newKey = await this.generateLibraryKey(libraryId, newUserId);
      
      // Re-encrypt all stories in this library with new key
      await this.reencryptLibraryStories(libraryId, oldKey, newKey);
      
      this.logger.info('Library key rotation completed', {
        libraryId,
        oldKeyId: oldKey.keyId,
        newKeyId: newKey.keyId,
        oldUserId,
        newUserId
      });

      return newKey;

    } catch (error) {
      this.logger.error('Library key rotation failed', { 
        libraryId, 
        oldUserId, 
        newUserId, 
        error: error.message 
      });
      throw new Error(`Key rotation failed: ${error.message}`);
    }
  }

  /**
   * Validate encryption integrity
   * Ensures encrypted data hasn't been tampered with
   */
  async validateEncryptionIntegrity(encryptedBlob: EncryptedStoryBlob): Promise<boolean> {
    try {
      // Attempt to decrypt (this will fail if tampered)
      const decrypted = await this.decryptStoryBlob(encryptedBlob, encryptedBlob.userId);
      
      // If decryption succeeds, integrity is valid
      return decrypted.length > 0;
      
    } catch (error) {
      this.logger.warn('Encryption integrity validation failed', { 
        libraryId: encryptedBlob.libraryId,
        keyId: encryptedBlob.keyId,
        error: error.message 
      });
      return false;
    }
  }

  /**
   * Get library encryption key from device keystore
   * Extends existing smart home token storage pattern
   */
  private async getLibraryKey(libraryId: string, userId: string): Promise<LibraryEncryptionKey | null> {
    try {
      // In production, this would query the device keystore
      // For now, simulate keystore lookup
      const keyId = `lib_${libraryId}_${userId}`;
      
      // This would be replaced with actual keystore integration
      const storedKey = await this.retrieveFromDeviceKeystore(keyId);
      
      return storedKey;
      
    } catch (error) {
      this.logger.error('Failed to retrieve library key', { libraryId, userId, error });
      return null;
    }
  }

  /**
   * Store encryption key in device keystore
   * Uses same pattern as existing smart home token storage
   */
  private async storeInDeviceKeystore(libraryKey: LibraryEncryptionKey): Promise<void> {
    try {
      // In production, this would use platform-specific keystore APIs
      // iOS: Keychain Services
      // Android: Android Keystore
      // Web: Web Crypto API with IndexedDB
      
      const keyId = `lib_${libraryKey.libraryId}_${libraryKey.userId}`;
      
      // Simulate keystore storage
      this.logger.info('Storing library key in device keystore', { 
        keyId: libraryKey.keyId,
        libraryId: libraryKey.libraryId 
      });
      
      // This would be replaced with actual keystore integration
      await this.simulateKeystoreStorage(keyId, libraryKey);
      
    } catch (error) {
      this.logger.error('Failed to store library key in keystore', { 
        libraryKey: libraryKey.keyId, 
        error 
      });
      throw error;
    }
  }

  /**
   * Retrieve encryption key from device keystore
   */
  private async retrieveFromDeviceKeystore(keyId: string): Promise<LibraryEncryptionKey | null> {
    // Simulate keystore retrieval
    // In production, this would use actual keystore APIs
    return null;
  }

  /**
   * Simulate keystore storage for development
   */
  private async simulateKeystoreStorage(keyId: string, libraryKey: LibraryEncryptionKey): Promise<void> {
    // This is a simulation - in production, use actual keystore
    this.logger.debug('Simulated keystore storage', { keyId });
  }

  /**
   * Deactivate old encryption key
   */
  private async deactivateLibraryKey(keyId: string): Promise<void> {
    this.logger.info('Deactivating library key', { keyId });
    // Implementation would mark key as inactive in keystore
  }

  /**
   * Re-encrypt all stories in library with new key
   */
  private async reencryptLibraryStories(
    libraryId: string, 
    oldKey: LibraryEncryptionKey, 
    newKey: LibraryEncryptionKey
  ): Promise<void> {
    this.logger.info('Re-encrypting library stories with new key', { 
      libraryId, 
      oldKeyId: oldKey.keyId, 
      newKeyId: newKey.keyId 
    });
    
    // Implementation would:
    // 1. Query all encrypted stories for this library
    // 2. Decrypt with old key
    // 3. Re-encrypt with new key
    // 4. Update database records
  }
}

// Type definitions
export interface LibraryEncryptionKey {
  keyId: string;
  libraryId: string;
  userId: string;
  key: string; // Base64 encoded key
  algorithm: string;
  createdAt: Date;
  rotatedAt: Date;
  version: number;
  isActive: boolean;
}

export interface EncryptedStoryBlob {
  encryptedData: string; // Base64 encoded encrypted content
  iv: string; // Base64 encoded initialization vector
  tag: string; // Base64 encoded authentication tag
  keyId: string;
  libraryId: string;
  userId: string;
  algorithm: string;
  encryptedAt: Date;
  version: number;
}

export interface EncryptionMetrics {
  libraryId: string;
  keyId: string;
  encryptionTime: number;
  decryptionTime: number;
  dataSize: number;
  encryptedSize: number;
  compressionRatio: number;
}

export default PerLibraryEncryption;
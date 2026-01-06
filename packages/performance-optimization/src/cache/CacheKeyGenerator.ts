import { createHash } from 'crypto';
import { CacheKey } from '../types';

export class CacheKeyGenerator {
  private keyPrefix: string;

  constructor(keyPrefix: string = 'st') {
    this.keyPrefix = keyPrefix;
  }

  generate(cacheKey: CacheKey): string {
    const parts = [
      this.keyPrefix,
      cacheKey.type,
      cacheKey.id
    ];

    if (cacheKey.version) {
      parts.push(`v${cacheKey.version}`);
    }

    if (cacheKey.userId) {
      parts.push(`u${this.hashUserId(cacheKey.userId)}`);
    }

    if (cacheKey.metadata) {
      const metadataHash = this.hashMetadata(cacheKey.metadata);
      parts.push(`m${metadataHash}`);
    }

    return parts.join(':');
  }

  generatePattern(type: string, userId?: string): string {
    const parts = [this.keyPrefix, type];
    
    if (userId) {
      parts.push(`u${this.hashUserId(userId)}`);
    }

    return parts.join(':') + '*';
  }

  generateUserPattern(userId: string): string {
    return `${this.keyPrefix}:*:u${this.hashUserId(userId)}:*`;
  }

  generateTypePattern(type: string): string {
    return `${this.keyPrefix}:${type}:*`;
  }

  private hashUserId(userId: string): string {
    return createHash('sha256')
      .update(userId)
      .digest('hex')
      .substring(0, 8); // Use first 8 characters for brevity
  }

  private hashMetadata(metadata: Record<string, any>): string {
    const sortedKeys = Object.keys(metadata).sort();
    const metadataString = sortedKeys
      .map(key => `${key}=${JSON.stringify(metadata[key])}`)
      .join('&');
    
    return createHash('sha256')
      .update(metadataString)
      .digest('hex')
      .substring(0, 8);
  }

  extractComponents(key: string): Partial<CacheKey> {
    const parts = key.split(':');
    const result: Partial<CacheKey> = {};

    if (parts.length >= 3) {
      result.type = parts[1] as any;
      result.id = parts[2];
    }

    // Extract version if present
    const versionPart = parts.find(part => part.startsWith('v'));
    if (versionPart) {
      result.version = versionPart.substring(1);
    }

    return result;
  }
}
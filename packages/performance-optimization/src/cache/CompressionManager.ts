import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export class CompressionManager {
  private compressionLevel: number;
  private compressionThreshold: number; // bytes

  constructor(compressionLevel: number = 6, compressionThreshold: number = 1024) {
    this.compressionLevel = compressionLevel;
    this.compressionThreshold = compressionThreshold;
  }

  async compress(data: Buffer): Promise<Buffer> {
    if (data.length < this.compressionThreshold) {
      return data;
    }

    try {
      return await gzipAsync(data, { level: this.compressionLevel });
    } catch (error) {
      console.error('Compression error:', error);
      return data; // Return original data if compression fails
    }
  }

  async decompress(data: Buffer): Promise<Buffer> {
    try {
      // Check if data is gzipped by looking at magic number
      if (data.length >= 2 && data[0] === 0x1f && data[1] === 0x8b) {
        return await gunzipAsync(data);
      }
      return data; // Return as-is if not compressed
    } catch (error) {
      console.error('Decompression error:', error);
      return data; // Return original data if decompression fails
    }
  }

  getCompressionRatio(originalSize: number, compressedSize: number): number {
    return originalSize > 0 ? compressedSize / originalSize : 1;
  }

  shouldCompress(dataSize: number): boolean {
    return dataSize >= this.compressionThreshold;
  }
}
/**
 * Image Reference Service
 * Downloads reference image URLs as OpenAI File objects for use with images.edit() API
 * 
 * Matches Buildship's downloadImageAsOpenAIFile() approach
 */

import OpenAI, { toFile } from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class ImageReferenceService {
  private openai: OpenAI;
  private logger: any;

  constructor(openai: OpenAI, logger: any) {
    this.openai = openai;
    this.logger = logger;
  }

  /**
   * Download image URL as OpenAI File object for use with images.edit()
   * Matches Buildship's downloadImageAsOpenAIFile()
   */
  async downloadAsOpenAIFile(url: string): Promise<File | null> {
    if (typeof url !== 'string') {
      this.logger.warn('Invalid URL type provided', { urlType: typeof url });
      return null;
    }

    const trimmed = url.trim();
    if (!trimmed) {
      this.logger.warn('Empty URL provided');
      return null;
    }

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      this.logger.error('Invalid reference image URL protocol', { url: trimmed.substring(0, 100) });
      throw new Error(`Invalid reference image URL: "${trimmed}"`);
    }

    try {
      this.logger.info('Downloading reference image', {
        url: trimmed.substring(0, 100)
      });

      const res = await fetch(trimmed);
      if (!res.ok) {
        throw new Error(
          `Failed to fetch reference image "${trimmed.substring(0, 100)}": ${res.status} ${res.statusText}`
        );
      }

      const contentType = res.headers.get('content-type') || 'image/png';
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Determine file extension from content type
      const lower = contentType.toLowerCase();
      let ext = '.png';
      if (lower.includes('jpeg') || lower.includes('jpg')) ext = '.jpg';
      else if (lower.includes('webp')) ext = '.webp';

      // Create temporary file
      const tmpName = `st-ref-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}${ext}`;
      const tmpPath = path.join(os.tmpdir(), tmpName);

      await fs.promises.writeFile(tmpPath, buffer);

      // Convert to OpenAI File object
      const file = await toFile(fs.createReadStream(tmpPath), path.basename(tmpPath), {
        type: contentType,
      });

      this.logger.info('Reference image downloaded successfully', {
        url: trimmed.substring(0, 100),
        sizeKB: (buffer.length / 1024).toFixed(2),
        contentType,
        tmpPath
      });

      return file;
    } catch (error: any) {
      this.logger.error('Failed to download reference image', {
        url: trimmed.substring(0, 100),
        error: error.message,
        stack: error.stack
      });
      return null;
    }
  }

  /**
   * Download multiple reference images as OpenAI File objects
   * Limits to 5 references max (API constraint)
   */
  async downloadMultipleAsOpenAIFiles(urls: string[]): Promise<File[]> {
    const cleanUrls = urls
      .filter(url => typeof url === 'string' && url.trim())
      .slice(0, 5); // Max 5 references per OpenAI API constraints
    
    if (cleanUrls.length === 0) {
      this.logger.warn('No valid reference image URLs provided');
      return [];
    }

    this.logger.info('Downloading multiple reference images', {
      requestedCount: urls.length,
      validCount: cleanUrls.length
    });

    const results = await Promise.all(
      cleanUrls.map(url => this.downloadAsOpenAIFile(url))
    );
    
    const files = results.filter(Boolean) as File[];
    
    this.logger.info('Reference images download complete', {
      requested: cleanUrls.length,
      successful: files.length,
      failed: cleanUrls.length - files.length
    });

    if (files.length === 0 && cleanUrls.length > 0) {
      this.logger.error('All reference image downloads failed', {
        attemptedCount: cleanUrls.length
      });
      throw new Error('Failed to download any reference images');
    }
    
    return files;
  }

  /**
   * Validate reference image file
   */
  async validateReferenceFile(file: File): Promise<boolean> {
    try {
      // Basic validation
      if (!file || !file.name) {
        this.logger.warn('Invalid file object');
        return false;
      }

      // Check file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (file.type && !validTypes.includes(file.type.toLowerCase())) {
        this.logger.warn('Invalid file type', { type: file.type });
        return false;
      }

      return true;
    } catch (error: any) {
      this.logger.error('File validation failed', { error: error.message });
      return false;
    }
  }

  /**
   * Convert buffer to OpenAI File object for use with images.edit()
   * Critical for bodyshot generation using headshot as reference
   */
  async convertBufferToFile(buffer: Buffer, filename: string): Promise<File> {
    const tmpPath = path.join(os.tmpdir(), filename);
    
    try {
      await fs.promises.writeFile(tmpPath, buffer);
      
      const file = await toFile(fs.createReadStream(tmpPath), filename, {
        type: 'image/png'
      });
      
      this.logger.info('Buffer converted to File object', {
        filename,
        sizeKB: (buffer.length / 1024).toFixed(2),
        tmpPath
      });
      
      return file;
    } catch (error: any) {
      this.logger.error('Failed to convert buffer to File', {
        filename,
        error: error.message
      });
      throw error;
    }
  }
}

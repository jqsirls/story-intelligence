"use strict";
/**
 * Image Reference Service
 * Downloads reference image URLs as OpenAI File objects for use with images.edit() API
 *
 * Matches Buildship's downloadImageAsOpenAIFile() approach
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageReferenceService = void 0;
const openai_1 = require("openai");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
class ImageReferenceService {
    constructor(openai, logger) {
        this.openai = openai;
        this.logger = logger;
    }
    /**
     * Download image URL as OpenAI File object for use with images.edit()
     * Matches Buildship's downloadImageAsOpenAIFile()
     *
     * @param url - Can be CDN URL or reference object with s3Url field
     */
    async downloadAsOpenAIFile(url) {
        // Handle reference object with s3Url field
        let downloadUrl;
        if (typeof url === 'object' && url !== null) {
            // Prefer S3 URL for internal downloads (avoids CDN domain resolution)
            downloadUrl = url.s3Url || url.url;
            this.logger.info('Using reference object', {
                hasS3Url: !!url.s3Url,
                usingUrl: downloadUrl.substring(0, 60)
            });
        }
        else if (typeof url === 'string') {
            downloadUrl = url;
        }
        else {
            this.logger.warn('Invalid URL type provided', { urlType: typeof url });
            return null;
        }
        const trimmed = downloadUrl.trim();
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
            let buffer;
            let contentType = 'image/png';
            // Check if this is an S3 URL - use AWS SDK instead of HTTP
            if (trimmed.includes('s3.amazonaws.com') || trimmed.includes('.s3.')) {
                // Extract bucket and key from S3 URL
                const s3Match = trimmed.match(/https?:\/\/([^.]+)\.s3[.-]?([^.]+)?\.amazonaws\.com\/(.+)$/i);
                if (s3Match) {
                    const bucketName = s3Match[1];
                    const s3Key = decodeURIComponent(s3Match[3]);
                    this.logger.info('Downloading from S3 using AWS SDK', {
                        bucket: bucketName,
                        key: s3Key.substring(0, 100)
                    });
                    // Use AWS S3 SDK to download
                    const { S3Client, GetObjectCommand } = await Promise.resolve().then(() => __importStar(require('@aws-sdk/client-s3')));
                    const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
                    const command = new GetObjectCommand({
                        Bucket: bucketName,
                        Key: s3Key
                    });
                    const s3Response = await s3Client.send(command);
                    if (!s3Response.Body) {
                        throw new Error(`S3 object body is empty for ${s3Key}`);
                    }
                    // Convert stream to buffer
                    const chunks = [];
                    for await (const chunk of s3Response.Body) {
                        chunks.push(chunk);
                    }
                    buffer = Buffer.concat(chunks);
                    // Get content type from S3 response
                    contentType = s3Response.ContentType || 'image/png';
                    this.logger.info('Downloaded from S3 successfully', {
                        bucket: bucketName,
                        key: s3Key.substring(0, 100),
                        sizeKB: (buffer.length / 1024).toFixed(2),
                        contentType
                    });
                }
                else {
                    throw new Error(`Could not parse S3 URL: ${trimmed}`);
                }
            }
            else {
                // Regular HTTP/HTTPS URL - use fetch
                const res = await fetch(trimmed);
                if (!res.ok) {
                    throw new Error(`Failed to fetch reference image "${trimmed.substring(0, 100)}": ${res.status} ${res.statusText}`);
                }
                contentType = res.headers.get('content-type') || 'image/png';
                const arrayBuffer = await res.arrayBuffer();
                buffer = Buffer.from(arrayBuffer);
            }
            // Determine file extension from content type
            const lower = contentType.toLowerCase();
            let ext = '.png';
            if (lower.includes('jpeg') || lower.includes('jpg'))
                ext = '.jpg';
            else if (lower.includes('webp'))
                ext = '.webp';
            // Create temporary file
            const tmpName = `st-ref-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}${ext}`;
            const tmpPath = path.join(os.tmpdir(), tmpName);
            await fs.promises.writeFile(tmpPath, buffer);
            // Convert to OpenAI File object
            const file = await (0, openai_1.toFile)(fs.createReadStream(tmpPath), path.basename(tmpPath), {
                type: contentType,
            });
            this.logger.info('Reference image downloaded successfully', {
                url: trimmed.substring(0, 100),
                sizeKB: (buffer.length / 1024).toFixed(2),
                contentType,
                tmpPath
            });
            return file;
        }
        catch (error) {
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
    async downloadMultipleAsOpenAIFiles(urls) {
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
        const results = await Promise.all(cleanUrls.map(url => this.downloadAsOpenAIFile(url)));
        const files = results.filter(Boolean);
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
    async validateReferenceFile(file) {
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
        }
        catch (error) {
            this.logger.error('File validation failed', { error: error.message });
            return false;
        }
    }
    /**
     * Convert buffer to OpenAI File object for use with images.edit()
     * Critical for bodyshot generation using headshot as reference
     */
    async convertBufferToFile(buffer, filename) {
        const tmpPath = path.join(os.tmpdir(), filename);
        try {
            await fs.promises.writeFile(tmpPath, buffer);
            const file = await (0, openai_1.toFile)(fs.createReadStream(tmpPath), filename, {
                type: 'image/png'
            });
            this.logger.info('Buffer converted to File object', {
                filename,
                sizeKB: (buffer.length / 1024).toFixed(2),
                tmpPath
            });
            return file;
        }
        catch (error) {
            this.logger.error('Failed to convert buffer to File', {
                filename,
                error: error.message
            });
            throw error;
        }
    }
}
exports.ImageReferenceService = ImageReferenceService;

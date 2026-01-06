"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColorExtractionService = void 0;
// lambda-deployments/content-agent/src/services/ColorExtractionService.ts
const jimp_1 = __importDefault(require("jimp"));
class ColorExtractionService {
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Extract 3 deep contrasting hex colors from image
     * Uses V2 Buildship algorithm: pixel sampling + contrast filtering + Euclidean distance
     * ~100-200ms per image with jimp
     */
    async extractDeepContrastingColors(imageUrl) {
        try {
            // 1. Fetch and decode image with jimp
            this.logger.info('Fetching image for color extraction', { url: imageUrl.substring(0, 50) });
            let image;
            // Handle S3 URLs with AWS SDK
            if (imageUrl.includes('.s3.amazonaws.com/')) {
                const { S3Client, GetObjectCommand } = await Promise.resolve().then(() => __importStar(require('@aws-sdk/client-s3')));
                const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
                const s3UrlParts = imageUrl.match(/https:\/\/(.+?)\.s3\.amazonaws\.com\/(.+)/);
                if (!s3UrlParts)
                    throw new Error(`Invalid S3 URL: ${imageUrl}`);
                const bucket = s3UrlParts[1];
                const key = decodeURIComponent(s3UrlParts[2]);
                const { Body } = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
                if (!Body)
                    throw new Error('S3 GetObjectCommand returned empty body');
                const buffer = Buffer.from(await Body.transformToByteArray());
                image = await jimp_1.default.read(buffer);
            }
            else {
                // Use jimp's built-in URL fetching for CDN URLs
                image = await jimp_1.default.read(imageUrl);
            }
            // 2. Sample pixels (max 1000 samples for performance)
            const width = image.bitmap.width;
            const height = image.bitmap.height;
            const totalPixels = width * height;
            const sampleSize = Math.min(1000, totalPixels);
            const step = Math.max(1, Math.floor(totalPixels / sampleSize));
            const colors = [];
            for (let i = 0; i < totalPixels; i += step) {
                const x = i % width;
                const y = Math.floor(i / width);
                if (y >= height)
                    break;
                const pixelColor = image.getPixelColor(x, y);
                const rgba = jimp_1.default.intToRGBA(pixelColor);
                // Filter: visible pixels (alpha > 128), not too dark/bright
                const sum = rgba.r + rgba.g + rgba.b;
                if (rgba.a > 128 && sum > 60 && sum < 600) {
                    colors.push({ r: rgba.r, g: rgba.g, b: rgba.b });
                }
            }
            if (colors.length === 0) {
                this.logger.warn('No valid colors found, returning fallback', { imageUrl: imageUrl.substring(0, 50) });
                return this.getFallbackColors();
            }
            // 3. Filter for deep colors (average brightness < 150)
            const deepColors = colors.filter(color => {
                const brightness = (color.r + color.g + color.b) / 3;
                return brightness < 150;
            });
            if (deepColors.length === 0) {
                this.logger.warn('No deep colors found, returning grayscale fallback', {
                    imageUrl: imageUrl.substring(0, 50),
                    totalColors: colors.length
                });
                return {
                    primary: '#000000',
                    secondary: '#404040',
                    tertiary: '#808080'
                };
            }
            // 4. Select 3 contrasting colors (min 80-point Euclidean distance)
            const selectedColors = [];
            selectedColors.push(deepColors[0]);
            for (const color of deepColors) {
                if (selectedColors.length >= 3)
                    break;
                let isContrasting = true;
                for (const selected of selectedColors) {
                    const distance = Math.sqrt(Math.pow(color.r - selected.r, 2) +
                        Math.pow(color.g - selected.g, 2) +
                        Math.pow(color.b - selected.b, 2));
                    if (distance < 80) {
                        isContrasting = false;
                        break;
                    }
                }
                if (isContrasting) {
                    selectedColors.push(color);
                }
            }
            // 5. Fill remaining slots if needed (fallback to random deep colors)
            while (selectedColors.length < 3 && deepColors.length > 0) {
                const randomIndex = Math.floor(Math.random() * deepColors.length);
                const randomDeep = deepColors[randomIndex];
                selectedColors.push(randomDeep);
            }
            // Edge case: If still not enough, use grayscale
            while (selectedColors.length < 3) {
                const gray = Math.floor(Math.random() * 128); // 0-127 for dark grays
                selectedColors.push({ r: gray, g: gray, b: gray });
            }
            // 6. Convert to hex
            const hexColors = selectedColors.slice(0, 3).map(color => {
                const toHex = (n) => Math.min(255, Math.max(0, Math.floor(n))).toString(16).padStart(2, '0').toUpperCase();
                return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
            });
            const result = {
                primary: hexColors[0],
                secondary: hexColors[1],
                tertiary: hexColors[2]
            };
            this.logger.info('Extracted contrasting colors successfully', {
                imageUrl: imageUrl.substring(0, 50),
                result,
                sampledColors: colors.length,
                deepColors: deepColors.length
            });
            return result;
        }
        catch (error) {
            this.logger.error('Color extraction failed', {
                error: error.message,
                stack: error.stack,
                imageUrl: imageUrl.substring(0, 50)
            });
            return this.getFallbackColors();
        }
    }
    /**
     * V3 ENHANCEMENT: Extract colors with character consistency
     * Blends character.color_palette with extracted environment colors
     *
     * Strategy:
     * - If character palette exists: Use character's primary color + extracted secondary/tertiary
     * - This creates visual continuity across stories featuring the same character
     */
    async extractWithCharacterConsistency(imageUrl, characterPalette) {
        const extracted = await this.extractDeepContrastingColors(imageUrl);
        // If no character palette, return extracted colors as-is
        if (!characterPalette || characterPalette.length === 0) {
            return extracted;
        }
        // Blend: Use character's primary color + extracted environment colors
        // This maintains character identity ("Emma's colors") while adapting to scene context
        const result = {
            primary: characterPalette[0], // Character signature color
            secondary: extracted.primary, // Extracted scene color 1
            tertiary: extracted.secondary // Extracted scene color 2
        };
        this.logger.info('Applied character consistency to color extraction', {
            characterPrimary: characterPalette[0],
            scenePrimary: extracted.primary,
            sceneSecondary: extracted.secondary,
            imageUrl: imageUrl.substring(0, 50)
        });
        return result;
    }
    /**
     * V3 ENHANCEMENT: Parallel extraction for 5 images (cover + 4 beats)
     * ~100-200ms total (vs V2's 500ms-1s sequential)
     *
     * Returns V2-compatible structure:
     * {
     *   coverHex1, coverHex2, coverHex3,
     *   sceneAHex1, sceneAHex2, sceneAHex3,
     *   sceneBHex1, sceneBHex2, sceneBHex3,
     *   sceneCHex1, sceneCHex2, sceneCHex3,
     *   sceneDHex1, sceneDHex2, sceneDHex3
     * }
     */
    async extractStoryPalette(images) {
        const palette = {};
        try {
            this.logger.info('Starting parallel story palette extraction', {
                coverUrl: images.coverUrl.substring(0, 50),
                beatCount: images.beatUrls.length,
                hasCharacterPalette: !!images.characterPalette
            });
            // PARALLEL EXTRACTION (V3 enhancement - all images extracted simultaneously)
            const extractionPromises = [
                // Cover with character consistency (if available)
                this.extractWithCharacterConsistency(images.coverUrl, images.characterPalette),
                // Beat images (parallel extraction)
                ...images.beatUrls.slice(0, 4).map(url => this.extractDeepContrastingColors(url))
            ];
            const results = await Promise.all(extractionPromises);
            // Map results to V2-compatible structure (15 hex codes)
            const coverColors = results[0];
            palette.coverHex1 = coverColors.primary;
            palette.coverHex2 = coverColors.secondary;
            palette.coverHex3 = coverColors.tertiary;
            const sceneKeys = ['sceneA', 'sceneB', 'sceneC', 'sceneD'];
            for (let i = 0; i < Math.min(4, images.beatUrls.length); i++) {
                const beatColors = results[i + 1];
                const sceneKey = sceneKeys[i];
                palette[`${sceneKey}Hex1`] = beatColors.primary;
                palette[`${sceneKey}Hex2`] = beatColors.secondary;
                palette[`${sceneKey}Hex3`] = beatColors.tertiary;
            }
            // Fill missing scenes with fallback colors if less than 4 beats
            for (let i = images.beatUrls.length; i < 4; i++) {
                const fallback = this.getFallbackColors();
                const sceneKey = sceneKeys[i];
                palette[`${sceneKey}Hex1`] = fallback.primary;
                palette[`${sceneKey}Hex2`] = fallback.secondary;
                palette[`${sceneKey}Hex3`] = fallback.tertiary;
            }
            this.logger.info('Extracted full story palette successfully', {
                imageCount: 1 + images.beatUrls.length,
                hasCharacterConsistency: !!images.characterPalette,
                extractionTimeMs: '~100-200ms' // Parallel extraction
            });
        }
        catch (error) {
            this.logger.error('Story palette extraction failed', {
                error: error.message,
                stack: error.stack
            });
            // Return complete fallback palette (15 colors)
            const fallback = this.getFallbackColors();
            palette.coverHex1 = fallback.primary;
            palette.coverHex2 = fallback.secondary;
            palette.coverHex3 = fallback.tertiary;
            const sceneKeys = ['sceneA', 'sceneB', 'sceneC', 'sceneD'];
            for (const sceneKey of sceneKeys) {
                palette[`${sceneKey}Hex1`] = fallback.primary;
                palette[`${sceneKey}Hex2`] = fallback.secondary;
                palette[`${sceneKey}Hex3`] = fallback.tertiary;
            }
        }
        return palette;
    }
    /**
     * Fallback colors (dark, contrasting)
     */
    getFallbackColors() {
        return {
            primary: '#1A1A1A', // Near black
            secondary: '#8B0000', // Dark red
            tertiary: '#191970' // Midnight blue
        };
    }
}
exports.ColorExtractionService = ColorExtractionService;

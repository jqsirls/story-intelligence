"use strict";
/**
 * CDN URL Helper
 *
 * Converts S3 keys to branded CDN URLs using assets.storytailor.dev
 * Always uses CDN URL for branding consistency (CloudFront will serve from S3)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCdnBaseUrl = getCdnBaseUrl;
exports.getS3Url = getS3Url;
exports.getCdnUrl = getCdnUrl;
exports.convertS3UrlToCdn = convertS3UrlToCdn;
exports.getAssetBucketName = getAssetBucketName;
/**
 * Get CDN base URL from environment variable
 * Defaults to assets.storytailor.dev for production
 *
 * Set ASSET_CDN_URL in SSM Parameter Store:
 * /storytailor-production/asset-cdn-url = https://assets.storytailor.dev
 */
function getCdnBaseUrl() {
    // Check environment variable first (from SSM Parameter Store)
    if (process.env.ASSET_CDN_URL) {
        return process.env.ASSET_CDN_URL;
    }
    // Fallback to CDN_BASE_URL if set
    if (process.env.CDN_BASE_URL) {
        return process.env.CDN_BASE_URL;
    }
    // Default to branded vanity URL
    // This will work once CloudFront is configured
    return 'https://assets.storytailor.dev';
}
/**
 * Get S3 URL for internal use (reference downloads, inter-service)
 *
 * @param s3Key - S3 object key
 * @param bucketName - Optional bucket name (defaults to asset bucket)
 * @returns S3 URL
 */
function getS3Url(s3Key, bucketName) {
    const bucket = bucketName || getAssetBucketName();
    const cleanKey = s3Key.startsWith('/') ? s3Key.substring(1) : s3Key;
    return `https://${bucket}.s3.amazonaws.com/${cleanKey}`;
}
/**
 * Convert S3 key to CDN URL
 *
 * @param s3Key - S3 object key (e.g., "characters/abc123/headshot-123.png")
 * @param forInternalUse - If true, returns S3 URL for internal downloads; if false, returns CDN URL for frontend
 * @returns CDN URL or S3 URL depending on use case
 */
function getCdnUrl(s3Key, forInternalUse = false) {
    // For internal use (reference downloads between services), use S3 URL directly
    // This avoids CDN domain resolution issues for Lambda-to-Lambda communication
    if (forInternalUse) {
        return getS3Url(s3Key);
    }
    // For frontend responses, use branded CDN URL
    const cdnBase = getCdnBaseUrl();
    // Remove leading slash if present
    const cleanKey = s3Key.startsWith('/') ? s3Key.substring(1) : s3Key;
    return `${cdnBase}/${cleanKey}`;
}
/**
 * Convert S3 URL to CDN URL
 *
 * @param s3Url - Full S3 URL (e.g., "https://bucket.s3.amazonaws.com/key")
 * @returns CDN URL (e.g., "https://assets.storytailor.dev/key")
 */
function convertS3UrlToCdn(s3Url) {
    // If already a CDN URL, return as-is
    if (s3Url.includes('assets.storytailor.dev') || s3Url.includes('cdn.storytailor')) {
        return s3Url;
    }
    // Extract key from S3 URL
    const match = s3Url.match(/s3[.-]?[a-z0-9-]*\.amazonaws\.com\/(.+)$/i);
    if (match && match[1]) {
        return getCdnUrl(match[1]);
    }
    // If we can't parse it, return original (fallback)
    return s3Url;
}
/**
 * Get the correct S3 bucket name for assets
 */
function getAssetBucketName() {
    return process.env.ASSET_BUCKET ||
        process.env.S3_BUCKET_NAME ||
        'storytailor-assets-production';
}

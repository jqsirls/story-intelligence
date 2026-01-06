"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateConfig = validateConfig;
exports.validateSynthesisText = validateSynthesisText;
exports.validateLanguageCode = validateLanguageCode;
exports.validateVoiceId = validateVoiceId;
exports.validateAudioFormat = validateAudioFormat;
exports.validateSampleRate = validateSampleRate;
exports.validateEmotion = validateEmotion;
exports.validateUserId = validateUserId;
exports.validateSessionId = validateSessionId;
exports.sanitizeTextForLogging = sanitizeTextForLogging;
exports.validateBase64Audio = validateBase64Audio;
const types_1 = require("../types");
/**
 * Validate voice engine configuration
 */
function validateConfig(config) {
    const errors = [];
    // ElevenLabs validation
    if (!config.elevenlabs.apiKey) {
        errors.push('ElevenLabs API key is required');
    }
    if (!config.elevenlabs.baseUrl) {
        errors.push('ElevenLabs base URL is required');
    }
    if (!config.elevenlabs.websocketUrl) {
        errors.push('ElevenLabs WebSocket URL is required');
    }
    if (!config.elevenlabs.voiceId) {
        errors.push('ElevenLabs voice ID is required');
    }
    if (config.elevenlabs.stability < 0 || config.elevenlabs.stability > 1) {
        errors.push('ElevenLabs stability must be between 0 and 1');
    }
    if (config.elevenlabs.similarityBoost < 0 || config.elevenlabs.similarityBoost > 1) {
        errors.push('ElevenLabs similarity boost must be between 0 and 1');
    }
    if (config.elevenlabs.style < 0 || config.elevenlabs.style > 1) {
        errors.push('ElevenLabs style must be between 0 and 1');
    }
    if (config.elevenlabs.timeoutMs < 1000) {
        errors.push('ElevenLabs timeout must be at least 1000ms');
    }
    // Polly validation
    if (!config.polly.region) {
        errors.push('Polly region is required');
    }
    if (!config.polly.voiceId) {
        errors.push('Polly voice ID is required');
    }
    if (!['neural', 'standard'].includes(config.polly.engine)) {
        errors.push('Polly engine must be "neural" or "standard"');
    }
    if (!['pcm', 'mp3'].includes(config.polly.outputFormat)) {
        errors.push('Polly output format must be "pcm" or "mp3"');
    }
    if (!['text', 'ssml'].includes(config.polly.textType)) {
        errors.push('Polly text type must be "text" or "ssml"');
    }
    if (config.polly.timeoutMs < 1000) {
        errors.push('Polly timeout must be at least 1000ms');
    }
    // Failover validation
    if (config.failover.latencyThresholdMs < 100) {
        errors.push('Failover latency threshold must be at least 100ms');
    }
    if (config.failover.errorThresholdCount < 1) {
        errors.push('Failover error threshold must be at least 1');
    }
    if (config.failover.cooldownMs < 10000) {
        errors.push('Failover cooldown must be at least 10 seconds');
    }
    // Cost validation
    if (config.cost.maxCostPerRequest <= 0) {
        errors.push('Max cost per request must be greater than 0');
    }
    if (config.cost.dailyBudgetLimit <= 0) {
        errors.push('Daily budget limit must be greater than 0');
    }
    // Redis validation
    if (!config.redis.url) {
        errors.push('Redis URL is required');
    }
    if (!config.redis.keyPrefix) {
        errors.push('Redis key prefix is required');
    }
    if (config.redis.metricsRetentionMs < 3600000) {
        errors.push('Metrics retention must be at least 1 hour');
    }
    if (errors.length > 0) {
        throw new types_1.VoiceError(types_1.VoiceErrorCode.INVALID_REQUEST, `Configuration validation failed:\n${errors.join('\n')}`, undefined, { errors });
    }
}
/**
 * Validate text input for synthesis
 */
function validateSynthesisText(text) {
    if (!text || text.trim().length === 0) {
        throw new types_1.VoiceError(types_1.VoiceErrorCode.INVALID_REQUEST, 'Text cannot be empty', undefined);
    }
    if (text.length > 4000) {
        throw new types_1.VoiceError(types_1.VoiceErrorCode.TEXT_TOO_LONG, 'Text exceeds maximum length of 4000 characters', undefined);
    }
    // Check for potentially harmful content
    const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /data:text\/html/i,
        /vbscript:/i,
    ];
    for (const pattern of suspiciousPatterns) {
        if (pattern.test(text)) {
            throw new types_1.VoiceError(types_1.VoiceErrorCode.INVALID_REQUEST, 'Text contains potentially harmful content', undefined);
        }
    }
}
/**
 * Validate language code
 */
function validateLanguageCode(language) {
    const supportedLanguages = [
        'en-US', 'en-GB', 'es-ES', 'es-MX', 'fr-FR', 'de-DE',
        'it-IT', 'pt-BR', 'ja-JP', 'ko-KR', 'zh-CN', 'ar-SA',
        'hi-IN', 'nl-NL', 'pl-PL', 'ru-RU', 'sv-SE', 'tr-TR'
    ];
    if (!supportedLanguages.includes(language)) {
        throw new types_1.VoiceError(types_1.VoiceErrorCode.UNSUPPORTED_LANGUAGE, `Unsupported language: ${language}. Supported languages: ${supportedLanguages.join(', ')}`, undefined);
    }
}
/**
 * Validate voice ID format
 */
function validateVoiceId(voiceId) {
    // ElevenLabs voice IDs are typically UUIDs
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    // Polly voice IDs are predefined names
    const pollyVoices = [
        'Joanna', 'Matthew', 'Ivy', 'Justin', 'Kendra', 'Kimberly', 'Salli', 'Joey',
        'Amy', 'Brian', 'Emma', 'Russell', 'Nicole', 'Olivia', 'Aria', 'Ayanda',
        'Aditi', 'Raveena', 'Seoyeon', 'Takumi', 'Mizuki', 'Zhiyu', 'Bianca',
        'Carla', 'Giorgio', 'Marlene', 'Vicki', 'Hans', 'Lea', 'Mathieu',
        'Celine', 'Chantal', 'Penelope', 'Miguel', 'Enrique', 'Conchita',
        'Lucia', 'Mia', 'Vitoria', 'Ricardo', 'Camila', 'Lupe', 'Geraint',
        'Gwyneth', 'Mads', 'Naja', 'Ruben', 'Lotte', 'Liv', 'Maja',
        'Jan', 'Jacek', 'Ewa', 'Tatyana', 'Maxim', 'Astrid', 'Filiz'
    ];
    if (!uuidPattern.test(voiceId) && !pollyVoices.includes(voiceId)) {
        throw new types_1.VoiceError(types_1.VoiceErrorCode.VOICE_NOT_FOUND, `Invalid voice ID format: ${voiceId}`, undefined);
    }
}
/**
 * Validate audio format
 */
function validateAudioFormat(format) {
    const supportedFormats = ['pcm', 'mp3', 'wav'];
    if (!supportedFormats.includes(format)) {
        throw new types_1.VoiceError(types_1.VoiceErrorCode.INVALID_REQUEST, `Unsupported audio format: ${format}. Supported formats: ${supportedFormats.join(', ')}`, undefined);
    }
}
/**
 * Validate sample rate
 */
function validateSampleRate(sampleRate) {
    const supportedRates = [8000, 16000, 22050, 24000, 44100, 48000];
    if (!supportedRates.includes(sampleRate)) {
        throw new types_1.VoiceError(types_1.VoiceErrorCode.INVALID_REQUEST, `Unsupported sample rate: ${sampleRate}. Supported rates: ${supportedRates.join(', ')}`, undefined);
    }
}
/**
 * Validate emotion parameter
 */
function validateEmotion(emotion) {
    const supportedEmotions = ['neutral', 'happy', 'sad', 'excited', 'calm', 'dramatic'];
    if (!supportedEmotions.includes(emotion)) {
        throw new types_1.VoiceError(types_1.VoiceErrorCode.INVALID_REQUEST, `Unsupported emotion: ${emotion}. Supported emotions: ${supportedEmotions.join(', ')}`, undefined);
    }
}
/**
 * Validate user ID format
 */
function validateUserId(userId) {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(userId)) {
        throw new types_1.VoiceError(types_1.VoiceErrorCode.INVALID_REQUEST, `Invalid user ID format: ${userId}`, undefined);
    }
}
/**
 * Validate session ID format
 */
function validateSessionId(sessionId) {
    if (!sessionId || sessionId.length < 10 || sessionId.length > 100) {
        throw new types_1.VoiceError(types_1.VoiceErrorCode.INVALID_REQUEST, 'Session ID must be between 10 and 100 characters', undefined);
    }
    // Check for valid characters (alphanumeric, hyphens, underscores)
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validPattern.test(sessionId)) {
        throw new types_1.VoiceError(types_1.VoiceErrorCode.INVALID_REQUEST, 'Session ID contains invalid characters', undefined);
    }
}
/**
 * Sanitize text for logging (remove PII)
 */
function sanitizeTextForLogging(text) {
    // Remove potential PII patterns
    return text
        .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]') // SSN
        .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]') // Credit card
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]') // Email
        .replace(/\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g, '[PHONE]') // Phone
        .substring(0, 200); // Truncate for logging
}
/**
 * Validate base64 audio data
 */
function validateBase64Audio(audioData) {
    if (!audioData) {
        throw new types_1.VoiceError(types_1.VoiceErrorCode.INVALID_REQUEST, 'Audio data cannot be empty', undefined);
    }
    // Check if it's valid base64
    const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Pattern.test(audioData)) {
        throw new types_1.VoiceError(types_1.VoiceErrorCode.INVALID_REQUEST, 'Invalid base64 audio data', undefined);
    }
    // Check size (max 10MB per sample)
    const sizeBytes = (audioData.length * 3) / 4;
    if (sizeBytes > 10 * 1024 * 1024) {
        throw new types_1.VoiceError(types_1.VoiceErrorCode.INVALID_REQUEST, 'Audio sample too large (max 10MB)', undefined);
    }
}
//# sourceMappingURL=validation.js.map
import { VoiceEngineConfig } from '../types';
/**
 * Validate voice engine configuration
 */
export declare function validateConfig(config: VoiceEngineConfig): void;
/**
 * Validate text input for synthesis
 */
export declare function validateSynthesisText(text: string): void;
/**
 * Validate language code
 */
export declare function validateLanguageCode(language: string): void;
/**
 * Validate voice ID format
 */
export declare function validateVoiceId(voiceId: string): void;
/**
 * Validate audio format
 */
export declare function validateAudioFormat(format: string): void;
/**
 * Validate sample rate
 */
export declare function validateSampleRate(sampleRate: number): void;
/**
 * Validate emotion parameter
 */
export declare function validateEmotion(emotion: string): void;
/**
 * Validate user ID format
 */
export declare function validateUserId(userId: string): void;
/**
 * Validate session ID format
 */
export declare function validateSessionId(sessionId: string): void;
/**
 * Sanitize text for logging (remove PII)
 */
export declare function sanitizeTextForLogging(text: string): string;
/**
 * Validate base64 audio data
 */
export declare function validateBase64Audio(audioData: string): void;
//# sourceMappingURL=validation.d.ts.map
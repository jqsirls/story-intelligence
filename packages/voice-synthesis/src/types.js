"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceError = exports.VoiceErrorCode = exports.VoiceCloneRequestSchema = exports.VoiceSynthesisRequestSchema = void 0;
const zod_1 = require("zod");
// Voice synthesis request schema
exports.VoiceSynthesisRequestSchema = zod_1.z.object({
    text: zod_1.z.string().min(1).max(4000),
    language: zod_1.z.string().default('en-US'),
    emotion: zod_1.z.enum(['neutral', 'happy', 'sad', 'excited', 'calm', 'dramatic']).default('neutral'),
    voiceId: zod_1.z.string().optional(),
    userId: zod_1.z.string().uuid().optional(),
    sessionId: zod_1.z.string().uuid().optional(),
    priority: zod_1.z.enum(['low', 'normal', 'high']).default('normal'),
    format: zod_1.z.enum(['pcm', 'mp3', 'wav']).default('pcm'),
    sampleRate: zod_1.z.number().default(16000),
    streaming: zod_1.z.boolean().default(true),
});
// Voice clone management
exports.VoiceCloneRequestSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    parentConsentId: zod_1.z.string().uuid(),
    audioSamples: zod_1.z.array(zod_1.z.string()).min(15).max(15), // Base64 encoded audio
    voiceName: zod_1.z.string().min(1).max(50),
    description: zod_1.z.string().max(200).optional(),
});
// Error types
var VoiceErrorCode;
(function (VoiceErrorCode) {
    VoiceErrorCode["INVALID_REQUEST"] = "INVALID_REQUEST";
    VoiceErrorCode["ENGINE_UNAVAILABLE"] = "ENGINE_UNAVAILABLE";
    VoiceErrorCode["QUOTA_EXCEEDED"] = "QUOTA_EXCEEDED";
    VoiceErrorCode["AUTHENTICATION_FAILED"] = "AUTHENTICATION_FAILED";
    VoiceErrorCode["RATE_LIMITED"] = "RATE_LIMITED";
    VoiceErrorCode["TIMEOUT"] = "TIMEOUT";
    VoiceErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
    VoiceErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
    VoiceErrorCode["VOICE_NOT_FOUND"] = "VOICE_NOT_FOUND";
    VoiceErrorCode["TEXT_TOO_LONG"] = "TEXT_TOO_LONG";
    VoiceErrorCode["UNSUPPORTED_LANGUAGE"] = "UNSUPPORTED_LANGUAGE";
})(VoiceErrorCode || (exports.VoiceErrorCode = VoiceErrorCode = {}));
class VoiceError extends Error {
    constructor(code, message, engine, details) {
        super(message);
        this.code = code;
        this.engine = engine;
        this.details = details;
        this.name = 'VoiceError';
    }
}
exports.VoiceError = VoiceError;
//# sourceMappingURL=types.js.map
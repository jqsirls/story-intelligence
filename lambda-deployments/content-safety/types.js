"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentSafetyResultSchema = exports.ContentSafetyRequestSchema = exports.BiasType = void 0;
const zod_1 = require("zod");
var BiasType;
(function (BiasType) {
    BiasType["GENDER"] = "gender";
    BiasType["RACIAL"] = "racial";
    BiasType["CULTURAL"] = "cultural";
    BiasType["RELIGIOUS"] = "religious";
    BiasType["SOCIOECONOMIC"] = "socioeconomic";
    BiasType["DISABILITY"] = "disability";
    BiasType["AGE"] = "age";
    BiasType["APPEARANCE"] = "appearance";
})(BiasType || (exports.BiasType = BiasType = {}));
// Validation schemas
exports.ContentSafetyRequestSchema = zod_1.z.object({
    content: zod_1.z.string(),
    contentType: zod_1.z.enum(['story', 'character', 'dialogue', 'description', 'prompt', 'activity']),
    userId: zod_1.z.string(),
    sessionId: zod_1.z.string(),
    userAge: zod_1.z.number().optional(),
    context: zod_1.z.record(zod_1.z.any()).optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
exports.ContentSafetyResultSchema = zod_1.z.object({
    approved: zod_1.z.boolean(),
    confidence: zod_1.z.number().min(0).max(1),
    riskLevel: zod_1.z.enum(['low', 'medium', 'high', 'critical']),
    flaggedCategories: zod_1.z.array(zod_1.z.string()),
    detailedFlags: zod_1.z.array(zod_1.z.object({
        category: zod_1.z.string(),
        severity: zod_1.z.number().min(0).max(1),
        description: zod_1.z.string(),
        suggestedFix: zod_1.z.string()
    })),
    humanReviewRequired: zod_1.z.boolean(),
    processingTime: zod_1.z.number(),
    alternativeContent: zod_1.z.string().optional(),
    metadata: zod_1.z.object({
        timestamp: zod_1.z.string(),
        version: zod_1.z.string(),
        pipeline: zod_1.z.array(zod_1.z.string())
    })
});
//# sourceMappingURL=types.js.map
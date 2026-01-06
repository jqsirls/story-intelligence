"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRedisClient = createRedisClient;
exports.createSupabaseClient = createSupabaseClient;
exports.createLogger = createLogger;
const supabase_js_1 = require("@supabase/supabase-js");
const ioredis_1 = require("ioredis");
const winston_1 = __importDefault(require("winston"));
function createRedisClient(config) {
    const useTls = config.url.includes('rediss:') || config.url.includes('aws') || config.url.includes('redis') || config.url.includes(':6380');
    return useTls ? new ioredis_1.Redis(config.url, { tls: {} }) : new ioredis_1.Redis(config.url);
}
function createSupabaseClient(url, key) {
    return (0, supabase_js_1.createClient)(url, key);
}
function createLogger(service) {
    return winston_1.default.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
        defaultMeta: { service },
        transports: [
            new winston_1.default.transports.Console({
                format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
            })
        ]
    });
}
//# sourceMappingURL=shared.js.map
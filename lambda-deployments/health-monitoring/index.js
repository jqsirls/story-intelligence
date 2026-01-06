"use strict";
/**
 * @storytailor/health-monitoring
 * Comprehensive health monitoring for Storytailor platform
 * Powered by Story Intelligence™
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_HEALTH_CONFIG = exports.HealthMonitoringOrchestrator = void 0;
var HealthMonitoringOrchestrator_1 = require("./HealthMonitoringOrchestrator");
Object.defineProperty(exports, "HealthMonitoringOrchestrator", { enumerable: true, get: function () { return HealthMonitoringOrchestrator_1.HealthMonitoringOrchestrator; } });
__exportStar(require("./HealthMonitoringOrchestrator"), exports);
// Default configuration
exports.DEFAULT_HEALTH_CONFIG = {
    services: [
        'storytailor-api-staging',
        'storytailor-knowledge-base-staging',
        'supabase',
        'openai',
        'elevenlabs'
    ],
    checkInterval: 30000, // 30 seconds
    alertThresholds: {
        responseTime: 5000, // 5 seconds
        errorRate: 0.1, // 10%
        uptime: 99.0 // 99%
    },
    notifications: {}
};

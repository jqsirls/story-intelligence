"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenizePII = exports.validateCloudEvent = exports.isSmartHomeEvent = exports.isStoryEvent = exports.isPrivacyEvent = exports.isSystemEvent = exports.createCorrelationId = exports.createEventId = exports.MetricsCollector = exports.OpenTelemetryTracer = exports.EventStore = exports.EventSubscriber = exports.EventPublisher = exports.EventSystem = void 0;
// Main exports for the event system package
var EventSystem_1 = require("./EventSystem");
Object.defineProperty(exports, "EventSystem", { enumerable: true, get: function () { return EventSystem_1.EventSystem; } });
var EventPublisher_1 = require("./EventPublisher");
Object.defineProperty(exports, "EventPublisher", { enumerable: true, get: function () { return EventPublisher_1.EventPublisher; } });
var EventSubscriber_1 = require("./EventSubscriber");
Object.defineProperty(exports, "EventSubscriber", { enumerable: true, get: function () { return EventSubscriber_1.EventSubscriber; } });
var EventStore_1 = require("./EventStore");
Object.defineProperty(exports, "EventStore", { enumerable: true, get: function () { return EventStore_1.EventStore; } });
// Monitoring
var OpenTelemetryTracer_1 = require("./monitoring/OpenTelemetryTracer");
Object.defineProperty(exports, "OpenTelemetryTracer", { enumerable: true, get: function () { return OpenTelemetryTracer_1.OpenTelemetryTracer; } });
var MetricsCollector_1 = require("./monitoring/MetricsCollector");
Object.defineProperty(exports, "MetricsCollector", { enumerable: true, get: function () { return MetricsCollector_1.MetricsCollector; } });
// Utility functions
const createEventId = () => require('uuid').v4();
exports.createEventId = createEventId;
const createCorrelationId = () => require('uuid').v4();
exports.createCorrelationId = createCorrelationId;
// Event type helpers
const isSystemEvent = (eventType) => {
    return eventType.startsWith('com.storytailor.system.');
};
exports.isSystemEvent = isSystemEvent;
const isPrivacyEvent = (eventType) => {
    return eventType.startsWith('com.storytailor.privacy.');
};
exports.isPrivacyEvent = isPrivacyEvent;
const isStoryEvent = (eventType) => {
    return eventType.startsWith('com.storytailor.story.');
};
exports.isStoryEvent = isStoryEvent;
const isSmartHomeEvent = (eventType) => {
    return eventType.startsWith('com.storytailor.smarthome.');
};
exports.isSmartHomeEvent = isSmartHomeEvent;
// Event validation helpers
const validateCloudEvent = (event) => {
    return (event &&
        typeof event === 'object' &&
        event.specversion === '1.0' &&
        typeof event.type === 'string' &&
        typeof event.source === 'string' &&
        typeof event.id === 'string' &&
        typeof event.time === 'string');
};
exports.validateCloudEvent = validateCloudEvent;
// PII tokenization helper for logging
const tokenizePII = (data) => {
    if (!data || typeof data !== 'object') {
        return data;
    }
    const tokenized = { ...data };
    const piiFields = ['email', 'phone', 'address', 'ssn', 'creditCard'];
    for (const field of piiFields) {
        if (tokenized[field]) {
            const crypto = require('crypto');
            tokenized[field] = crypto.createHash('sha256').update(String(tokenized[field])).digest('hex');
        }
    }
    return tokenized;
};
exports.tokenizePII = tokenizePII;

import type { EventType, CloudEvent } from './types';

// Main exports for the event system package
export { EventSystem } from './EventSystem';
export type { EventSystemConfig } from './EventSystem';
export { EventPublisher } from './EventPublisher';
export { EventSubscriber } from './EventSubscriber';
export { EventStore } from './EventStore';

// Types
export type {
  CloudEvent,
  EventType,
  EventSource,
  EventPublisherConfig,
  EventSubscription,
  EventHandler,
  EventReplayConfig,
  EventCorrelation,
  EventMetrics,
  EventStore as IEventStore,
  EventQueryCriteria,
  EventDebugInfo,
  EventProcessingStep,
  EventError,
  EventPerformanceMetrics,
  EventValidationSchema
} from './types';

// Monitoring
export { OpenTelemetryTracer } from './monitoring/OpenTelemetryTracer';
export type { TracingConfig } from './monitoring/OpenTelemetryTracer';
export { MetricsCollector } from './monitoring/MetricsCollector';
export type { MetricsConfig, SystemMetrics, AlertRule } from './monitoring/MetricsCollector';

// Utility functions
export const createEventId = () => require('uuid').v4();
export const createCorrelationId = () => require('uuid').v4();

// Event type helpers
export const isSystemEvent = (eventType: EventType): boolean => {
  return eventType.startsWith('com.storytailor.system.');
};

export const isPrivacyEvent = (eventType: EventType): boolean => {
  return eventType.startsWith('com.storytailor.privacy.');
};

export const isStoryEvent = (eventType: EventType): boolean => {
  return eventType.startsWith('com.storytailor.story.');
};

export const isSmartHomeEvent = (eventType: EventType): boolean => {
  return eventType.startsWith('com.storytailor.smarthome.');
};

// Event validation helpers
export const validateCloudEvent = (event: any): event is CloudEvent => {
  return (
    event &&
    typeof event === 'object' &&
    event.specversion === '1.0' &&
    typeof event.type === 'string' &&
    typeof event.source === 'string' &&
    typeof event.id === 'string' &&
    typeof event.time === 'string'
  );
};

// PII tokenization helper for logging
export const tokenizePII = (data: any): any => {
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
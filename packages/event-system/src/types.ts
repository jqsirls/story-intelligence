import { EventBridgeClient } from '@aws-sdk/client-eventbridge';

// CloudEvents specification v1.0 compliant event structure
export interface CloudEvent {
  specversion: '1.0';
  type: string;
  source: string;
  id: string;
  time: string;
  datacontenttype?: string;
  dataschema?: string;
  subject?: string;
  data?: any;
  // Extension attributes
  correlationid?: string;
  userid?: string;
  sessionid?: string;
  agentname?: string;
  platform?: string;
}

// Event types for the Alexa Multi-Agent System
export type EventType = 
  // Authentication events
  | 'com.storytailor.auth.account-linked'
  | 'com.storytailor.auth.verification-completed'
  | 'com.storytailor.auth.login-attempted'
  | 'com.storytailor.auth.password-reset'
  
  // Story creation events
  | 'com.storytailor.story.creation-started'
  | 'com.storytailor.story.character-created'
  | 'com.storytailor.story.story-generated'
  | 'com.storytailor.story.assets-generated'
  | 'com.storytailor.story.story-finalized'
  
  // Smart home events
  | 'com.storytailor.smarthome.device-connected'
  | 'com.storytailor.smarthome.lighting-changed'
  | 'com.storytailor.smarthome.narrative-sync'
  | 'com.storytailor.smarthome.device-disconnected'
  
  // Privacy compliance events
  | 'com.storytailor.privacy.consent-given'
  | 'com.storytailor.privacy.consent-withdrawn'
  | 'com.storytailor.privacy.data-deleted'
  | 'com.storytailor.privacy.parental-verification'
  
  // Emotion tracking events
  | 'com.storytailor.emotion.checkin-completed'
  | 'com.storytailor.emotion.pattern-detected'
  | 'com.storytailor.emotion.mood-updated'
  
  // System events
  | 'com.storytailor.system.agent-started'
  | 'com.storytailor.system.agent-stopped'
  | 'com.storytailor.system.error-occurred'
  | 'com.storytailor.system.health-check'
  
  // Commerce events
  | 'com.storytailor.commerce.subscription-created'
  | 'com.storytailor.commerce.payment-processed'
  | 'com.storytailor.commerce.subscription-cancelled';

// Event sources (agents that can publish events)
export type EventSource = 
  | 'com.storytailor.auth-agent'
  | 'com.storytailor.content-agent'
  | 'com.storytailor.library-agent'
  | 'com.storytailor.emotion-agent'
  | 'com.storytailor.commerce-agent'
  | 'com.storytailor.smarthome-agent'
  | 'com.storytailor.router'
  | 'com.storytailor.storytailor-agent'
  | 'com.storytailor.system';

// Event publishing configuration
export interface EventPublisherConfig {
  eventBusName: string;
  region: string;
  source: EventSource;
  enableReplay?: boolean;
  enableDeadLetterQueue?: boolean;
  retryAttempts?: number;
  batchSize?: number;
  maxBatchWaitTime?: number;
}

// Event subscription configuration
export interface EventSubscription {
  eventTypes: EventType[];
  source?: EventSource;
  handler: EventHandler;
  filterPattern?: Record<string, any>;
  deadLetterQueue?: string;
  retryPolicy?: {
    maximumRetryAttempts: number;
    maximumEventAge: number;
  };
}

// Event handler interface
export interface EventHandler {
  handle(event: CloudEvent): Promise<void>;
}

// Event replay configuration
export interface EventReplayConfig {
  replayName: string;
  eventSourceArn: string;
  startTime: Date;
  endTime: Date;
  destination: string;
  description?: string;
}

// Event correlation tracking
export interface EventCorrelation {
  correlationId: string;
  rootEventId: string;
  parentEventId?: string;
  causedBy?: string;
  relatedEvents: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Event metrics for monitoring
export interface EventMetrics {
  eventType: EventType;
  source: EventSource;
  count: number;
  averageProcessingTime: number;
  errorRate: number;
  lastProcessed: Date;
}

// Event debugging information
export interface EventDebugInfo {
  eventId: string;
  correlationId?: string;
  processingSteps: EventProcessingStep[];
  errors: EventError[];
  performance: EventPerformanceMetrics;
}

export interface EventProcessingStep {
  step: string;
  timestamp: Date;
  duration: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface EventError {
  step: string;
  error: string;
  timestamp: Date;
  retryable: boolean;
  metadata?: Record<string, any>;
}

export interface EventPerformanceMetrics {
  totalProcessingTime: number;
  queueTime: number;
  handlerTime: number;
  networkTime: number;
  retryCount: number;
}

// Event store interface for replay and debugging
export interface EventStore {
  store(event: CloudEvent): Promise<void>;
  retrieve(eventId: string): Promise<CloudEvent | null>;
  query(criteria: EventQueryCriteria): Promise<CloudEvent[]>;
  replay(config: EventReplayConfig): Promise<string>;
  getCorrelation(correlationId: string): Promise<EventCorrelation | null>;
  updateCorrelation(correlation: EventCorrelation): Promise<void>;
}

export interface EventQueryCriteria {
  eventTypes?: EventType[];
  sources?: EventSource[];
  startTime?: Date;
  endTime?: Date;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  limit?: number;
  offset?: number;
}

// Event validation schema
export interface EventValidationSchema {
  eventType: EventType;
  requiredFields: string[];
  dataSchema?: any; // JSON Schema for event data
  maxSize?: number;
  allowedSources?: EventSource[];
}
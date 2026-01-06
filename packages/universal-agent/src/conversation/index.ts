// Universal Conversation System - Channel-agnostic conversation management

export { UniversalConversationEngine } from './UniversalConversationEngine';
export type {
  ConversationChannel,
  MessageType,
  ResponseType,
  ChannelCapabilities,
  ConversationRequest,
  UniversalMessage,
  ConversationResponse,
  UniversalResponse,
  ConversationContext,
  ConversationState,
  ConversationAction,
  ConversationSession,
  ConversationStartRequest,
  ConversationResponseChunk,
  ChannelSwitchContext,
  ChannelSwitchResult,
  ChannelSyncRequest,
  ChannelSyncResult,
  SyncConflict,
  ChannelAdapter
} from './UniversalConversationEngine';

export { UniversalConversationManager } from './UniversalConversationManager';
export type {
  ConversationMetrics,
  HealthCheckResult
} from './UniversalConversationManager';

// Channel Adapters
export { AlexaChannelAdapter } from './adapters/AlexaChannelAdapter';
export { WebChatChannelAdapter } from './adapters/WebChatChannelAdapter';
export { MobileVoiceChannelAdapter } from './adapters/MobileVoiceChannelAdapter';
export { APIChannelAdapter } from './adapters/APIChannelAdapter';

// Utility functions for creating conversation requests
export const createConversationRequest = (
  userId: string,
  sessionId: string,
  channel: ConversationChannel,
  message: string | any,
  messageType: MessageType = 'text'
): ConversationRequest => {
  return {
    userId,
    sessionId,
    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    channel,
    message: {
      type: messageType,
      content: message,
      metadata: {
        timestamp: new Date().toISOString()
      }
    },
    timestamp: new Date().toISOString(),
    locale: 'en-US',
    metadata: {}
  };
};

export const createConversationStartRequest = (
  userId: string,
  channel: ConversationChannel,
  sessionId?: string,
  initialContext?: Record<string, any>
): ConversationStartRequest => {
  return {
    userId,
    channel,
    sessionId,
    initialContext,
    sessionDuration: 24 * 60 * 60 * 1000 // 24 hours default
  };
};

// Channel capability presets
export const CHANNEL_CAPABILITIES = {
  ALEXA_PLUS: {
    supportsText: false,
    supportsVoice: true,
    supportsImages: false,
    supportsFiles: false,
    supportsCards: true,
    supportsActions: true,
    supportsStreaming: false,
    supportsRealtime: false,
    supportsSmartHome: true,
    supportsOffline: false,
    maxResponseTime: 800,
    maxContentLength: 8000
  },
  
  WEB_CHAT: {
    supportsText: true,
    supportsVoice: true,
    supportsImages: true,
    supportsFiles: true,
    supportsCards: true,
    supportsActions: true,
    supportsStreaming: true,
    supportsRealtime: true,
    supportsSmartHome: true,
    supportsOffline: false,
    maxResponseTime: 3000,
    maxContentLength: 10000,
    maxFileSize: 10 * 1024 * 1024,
    supportedImageFormats: ['jpg', 'png', 'gif', 'webp'],
    supportedAudioFormats: ['mp3', 'wav', 'ogg'],
    supportedFileTypes: ['pdf', 'doc', 'txt']
  },
  
  MOBILE_VOICE: {
    supportsText: true,
    supportsVoice: true,
    supportsImages: true,
    supportsFiles: true,
    supportsCards: true,
    supportsActions: true,
    supportsStreaming: false,
    supportsRealtime: false,
    supportsSmartHome: true,
    supportsOffline: true,
    maxResponseTime: 2000,
    maxContentLength: 5000,
    maxFileSize: 5 * 1024 * 1024,
    supportedImageFormats: ['jpg', 'png'],
    supportedAudioFormats: ['mp3', 'wav']
  },
  
  API_DIRECT: {
    supportsText: true,
    supportsVoice: false,
    supportsImages: true,
    supportsFiles: true,
    supportsCards: false,
    supportsActions: true,
    supportsStreaming: true,
    supportsRealtime: false,
    supportsSmartHome: false,
    supportsOffline: false,
    maxResponseTime: 10000,
    maxContentLength: 50000,
    maxFileSize: 50 * 1024 * 1024,
    supportedImageFormats: ['jpg', 'png', 'gif', 'webp', 'svg'],
    supportedFileTypes: ['pdf', 'doc', 'docx', 'txt', 'json', 'xml']
  },
  
  MINIMAL: {
    supportsText: true,
    supportsVoice: false,
    supportsImages: false,
    supportsFiles: false,
    supportsCards: false,
    supportsActions: false,
    supportsStreaming: false,
    supportsRealtime: false,
    supportsSmartHome: false,
    supportsOffline: false,
    maxResponseTime: 5000,
    maxContentLength: 2000
  }
} as const;

// Error classes
export class ConversationError extends Error {
  constructor(
    message: string,
    public code: string,
    public sessionId?: string,
    public channel?: ConversationChannel
  ) {
    super(message);
    this.name = 'ConversationError';
  }
}

export class ChannelNotSupportedError extends ConversationError {
  constructor(channel: ConversationChannel, sessionId?: string) {
    super(
      `Channel ${channel} is not supported`,
      'CHANNEL_NOT_SUPPORTED',
      sessionId,
      channel
    );
    this.name = 'ChannelNotSupportedError';
  }
}

export class SessionNotFoundError extends ConversationError {
  constructor(sessionId: string) {
    super(
      `Session ${sessionId} not found`,
      'SESSION_NOT_FOUND',
      sessionId
    );
    this.name = 'SessionNotFoundError';
  }
}

export class SessionExpiredError extends ConversationError {
  constructor(sessionId: string) {
    super(
      `Session ${sessionId} has expired`,
      'SESSION_EXPIRED',
      sessionId
    );
    this.name = 'SessionExpiredError';
  }
}

export class ChannelSwitchError extends ConversationError {
  constructor(
    fromChannel: ConversationChannel,
    toChannel: ConversationChannel,
    sessionId: string,
    reason: string
  ) {
    super(
      `Failed to switch from ${fromChannel} to ${toChannel}: ${reason}`,
      'CHANNEL_SWITCH_FAILED',
      sessionId
    );
    this.name = 'ChannelSwitchError';
  }
}

// Import types for re-export
import type {
  ConversationChannel,
  MessageType,
  ConversationRequest,
  ConversationStartRequest
} from './UniversalConversationEngine';

// Validation utilities
export const validateConversationRequest = (request: ConversationRequest): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!request.userId) {
    errors.push('userId is required');
  }
  
  if (!request.sessionId) {
    errors.push('sessionId is required');
  }
  
  if (!request.channel) {
    errors.push('channel is required');
  }
  
  if (!request.message) {
    errors.push('message is required');
  } else {
    if (!request.message.type) {
      errors.push('message.type is required');
    }
    
    if (!request.message.content) {
      errors.push('message.content is required');
    }
  }
  
  if (!request.timestamp) {
    errors.push('timestamp is required');
  }
  
  if (!request.locale) {
    errors.push('locale is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export const validateChannelCapabilities = (capabilities: import('./UniversalConversationEngine').ChannelCapabilities): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  const requiredFields = [
    'supportsText',
    'supportsVoice',
    'supportsImages',
    'supportsFiles',
    'supportsCards',
    'supportsActions',
    'supportsStreaming',
    'supportsRealtime',
    'supportsSmartHome',
    'supportsOffline',
    'maxResponseTime',
    'maxContentLength'
  ];
  
  for (const field of requiredFields) {
    if (capabilities[field as keyof import('./UniversalConversationEngine').ChannelCapabilities] === undefined) {
      errors.push(`${field} is required`);
    }
  }
  
  if (capabilities.maxResponseTime <= 0) {
    errors.push('maxResponseTime must be positive');
  }
  
  if (capabilities.maxContentLength <= 0) {
    errors.push('maxContentLength must be positive');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Helper functions for common operations
export const isVoiceChannel = (channel: ConversationChannel): boolean => {
  return ['alexa_plus', 'google_assistant', 'apple_siri', 'mobile_voice'].includes(channel);
};

export const isTextChannel = (channel: ConversationChannel): boolean => {
  return ['web_chat', 'api_direct', 'webhook'].includes(channel);
};

export const isMultimodalChannel = (channel: ConversationChannel): boolean => {
  return ['web_chat', 'mobile_app'].includes(channel);
};

export const getOptimalChannel = (
  supportedChannels: ConversationChannel[],
  requirements: {
    needsVoice?: boolean;
    needsImages?: boolean;
    needsFiles?: boolean;
    needsRealtime?: boolean;
    needsOffline?: boolean;
    maxLatency?: number;
  }
): ConversationChannel | null => {
  // Score each channel based on requirements
  const channelScores: Array<{ channel: ConversationChannel; score: number }> = [];
  
  for (const channel of supportedChannels) {
    let score = 0;
    const capabilities = CHANNEL_CAPABILITIES[channel.toUpperCase() as keyof typeof CHANNEL_CAPABILITIES];
    
    if (!capabilities) continue;
    
    // Score based on requirements
    if (requirements.needsVoice && capabilities.supportsVoice) score += 10;
    if (requirements.needsImages && capabilities.supportsImages) score += 5;
    if (requirements.needsFiles && capabilities.supportsFiles) score += 5;
    if (requirements.needsRealtime && capabilities.supportsRealtime) score += 8;
    if (requirements.needsOffline && capabilities.supportsOffline) score += 7;
    
    // Penalize if latency requirement not met
    if (requirements.maxLatency && capabilities.maxResponseTime > requirements.maxLatency) {
      score -= 5;
    }
    
    // Bonus for more capabilities
    score += Object.values(capabilities).filter(Boolean).length;
    
    channelScores.push({ channel, score });
  }
  
  // Return channel with highest score
  channelScores.sort((a, b) => b.score - a.score);
  return channelScores.length > 0 ? channelScores[0].channel : null;
};

// Constants
export const DEFAULT_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
export const DEFAULT_RESPONSE_TIMEOUT = 30000; // 30 seconds
export const DEFAULT_LOCALE = 'en-US';
export const MAX_MESSAGE_HISTORY = 50;
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Version information
export const VERSION = '1.0.0';
export const API_VERSION = 'v1';
/**
 * Message Handler
 * 
 * Processes messages between agents per A2A protocol specification.
 * Supports message parts (TextPart, FilePart, DataPart) and multi-turn conversations.
 */

import { Message, Part, TextPart, FilePart, DataPart } from './types';
import { Logger } from 'winston';
import { v4 as uuidv4 } from 'uuid';

export class MessageHandler {
  private messageHistory: Map<string, Message[]> = new Map();

  constructor(private logger: Logger) {}

  /**
   * Process incoming message
   */
  async processMessage(
    message: {
      role: 'user' | 'agent';
      parts: Part[];
      correlationId?: string;
      sessionId?: string;
    }
  ): Promise<Message> {
    // Validate message
    this.validateMessage(message);

    // Create message object
    const a2aMessage: Message = {
      id: uuidv4(),
      role: message.role,
      parts: message.parts,
      timestamp: new Date().toISOString(),
      correlationId: message.correlationId
    };

    // Store in history if session ID provided
    if (message.sessionId) {
      this.addToHistory(message.sessionId, a2aMessage);
    }

    this.logger.info('Message processed', {
      messageId: a2aMessage.id,
      role: a2aMessage.role,
      partsCount: a2aMessage.parts.length,
      sessionId: message.sessionId
    });

    return a2aMessage;
  }

  /**
   * Validate message structure
   */
  private validateMessage(message: { role: 'user' | 'agent'; parts: Part[] }): void {
    if (!message.role || (message.role !== 'user' && message.role !== 'agent')) {
      throw new Error('Invalid message role: must be "user" or "agent"');
    }

    if (!Array.isArray(message.parts) || message.parts.length === 0) {
      throw new Error('Message must have at least one part');
    }

    // Validate each part
    for (const part of message.parts) {
      this.validatePart(part);
    }
  }

  /**
   * Validate message part
   */
  private validatePart(part: Part): void {
    if (part.type === 'text') {
      const textPart = part as TextPart;
      if (typeof textPart.text !== 'string') {
        throw new Error('TextPart must have text property of type string');
      }
    } else if (part.type === 'file') {
      const filePart = part as FilePart;
      if (typeof filePart.url !== 'string' || !filePart.url) {
        throw new Error('FilePart must have url property of type string');
      }
      if (typeof filePart.mimeType !== 'string' || !filePart.mimeType) {
        throw new Error('FilePart must have mimeType property of type string');
      }
    } else if (part.type === 'data') {
      const dataPart = part as DataPart;
      if (!dataPart.data || typeof dataPart.data !== 'object') {
        throw new Error('DataPart must have data property of type object');
      }
    } else {
      throw new Error(`Invalid part type: ${(part as Part).type}`);
    }
  }

  /**
   * Get message history for a session
   */
  getMessageHistory(sessionId: string): Message[] {
    return this.messageHistory.get(sessionId) || [];
  }

  /**
   * Add message to history
   */
  private addToHistory(sessionId: string, message: Message): void {
    if (!this.messageHistory.has(sessionId)) {
      this.messageHistory.set(sessionId, []);
    }
    const history = this.messageHistory.get(sessionId);
    if (history) {
      history.push(message);
      // Keep only last 100 messages per session
      if (history.length > 100) {
        history.shift();
      }
    }
  }

  /**
   * Clear message history for a session
   */
  clearHistory(sessionId: string): void {
    this.messageHistory.delete(sessionId);
  }

  /**
   * Extract text from message parts
   */
  extractText(message: Message): string {
    const textParts = message.parts.filter((p): p is TextPart => p.type === 'text');
    return textParts.map(p => p.text).join(' ');
  }

  /**
   * Extract files from message parts
   */
  extractFiles(message: Message): FilePart[] {
    return message.parts.filter((p): p is FilePart => p.type === 'file');
  }

  /**
   * Extract data from message parts
   */
  extractData(message: Message): DataPart[] {
    return message.parts.filter((p): p is DataPart => p.type === 'data');
  }
}

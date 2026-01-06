/**
 * JSON-RPC 2.0 Handler
 * 
 * Handles JSON-RPC 2.0 requests and responses per JSON-RPC 2.0 specification.
 * Supports all standard error codes and A2A-specific error codes.
 */

import {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  JsonRpcStandardErrorCode,
  A2AErrorCode,
  A2AError,
  toJsonRpcError
} from './types';
import { Logger } from 'winston';

export class JsonRpcHandler {
  private methodHandlers: Map<string, (params: Record<string, unknown>) => Promise<unknown>> = new Map();

  constructor(private logger: Logger) {}

  /**
   * Register a method handler
   */
  registerMethod(
    method: string,
    handler: (params: Record<string, unknown>) => Promise<unknown>
  ): void {
    this.methodHandlers.set(method, handler);
  }

  /**
   * Handle JSON-RPC 2.0 request
   */
  async handleRequest(request: unknown): Promise<JsonRpcResponse> {
    try {
      // Validate request structure
      const jsonRpcRequest = this.validateRequest(request);
      
      // Handle the request
      const result = await this.executeMethod(jsonRpcRequest);
      
      return {
        jsonrpc: '2.0',
        id: jsonRpcRequest.id,
        result
      };
    } catch (error) {
      return this.createErrorResponse(error, this.extractRequestId(request));
    }
  }

  /**
   * Validate JSON-RPC 2.0 request structure
   */
  private validateRequest(request: unknown): JsonRpcRequest {
    if (!request || typeof request !== 'object') {
      throw new A2AError(
        JsonRpcStandardErrorCode.PARSE_ERROR,
        'Invalid JSON-RPC request: request must be an object'
      );
    }

    const req = request as Record<string, unknown>;

    // Validate jsonrpc version
    if (req.jsonrpc !== '2.0') {
      throw new A2AError(
        JsonRpcStandardErrorCode.INVALID_REQUEST,
        'Invalid JSON-RPC version: must be "2.0"'
      );
    }

    // Validate method
    if (typeof req.method !== 'string' || req.method.length === 0) {
      throw new A2AError(
        JsonRpcStandardErrorCode.INVALID_REQUEST,
        'Invalid JSON-RPC request: method must be a non-empty string'
      );
    }

    // Validate id (can be string, number, or null)
    if (req.id !== null && typeof req.id !== 'string' && typeof req.id !== 'number') {
      throw new A2AError(
        JsonRpcStandardErrorCode.INVALID_REQUEST,
        'Invalid JSON-RPC request: id must be string, number, or null'
      );
    }

    return {
      jsonrpc: '2.0',
      id: req.id as string | number | null,
      method: req.method as string,
      params: req.params as Record<string, unknown> | unknown[] | undefined
    };
  }

  /**
   * Execute method handler
   */
  private async executeMethod(request: JsonRpcRequest): Promise<unknown> {
    const handler = this.methodHandlers.get(request.method);
    
    if (!handler) {
      throw new A2AError(
        JsonRpcStandardErrorCode.METHOD_NOT_FOUND,
        `Method not found: ${request.method}`
      );
    }

    try {
      // Convert params to Record<string, unknown> if it's an array
      const params = Array.isArray(request.params)
        ? this.arrayToRecord(request.params)
        : (request.params as Record<string, unknown> | undefined) || {};

      return await handler(params);
    } catch (error) {
      if (error instanceof A2AError) {
        throw error;
      }
      
      // Validate params if handler throws non-A2A error
      if (error instanceof Error && error.message.includes('params')) {
        throw new A2AError(
          JsonRpcStandardErrorCode.INVALID_PARAMS,
          `Invalid params: ${error.message}`
        );
      }
      
      throw new A2AError(
        JsonRpcStandardErrorCode.INTERNAL_ERROR,
        `Internal error executing method ${request.method}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Convert array params to record (for methods that expect object params)
   */
  private arrayToRecord(params: unknown[]): Record<string, unknown> {
    const record: Record<string, unknown> = {};
    params.forEach((value, index) => {
      record[index.toString()] = value;
    });
    return record;
  }

  /**
   * Create error response
   */
  private createErrorResponse(error: unknown, requestId: string | number | null): JsonRpcResponse {
    const jsonRpcError = toJsonRpcError(
      error instanceof A2AError ? error : new Error(error instanceof Error ? error.message : String(error))
    );

    this.logger.error('JSON-RPC error', {
      code: jsonRpcError.code,
      message: jsonRpcError.message,
      requestId
    });

    return {
      jsonrpc: '2.0',
      id: requestId,
      error: jsonRpcError
    };
  }

  /**
   * Extract request ID from unknown request
   */
  private extractRequestId(request: unknown): string | number | null {
    if (request && typeof request === 'object') {
      const req = request as Record<string, unknown>;
      if (req.id !== undefined) {
        return req.id as string | number | null;
      }
    }
    return null;
  }
}

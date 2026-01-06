/**
 * JsonRpcHandler Tests
 */

import { JsonRpcHandler } from '../JsonRpcHandler';
import { JsonRpcRequest, JsonRpcStandardErrorCode } from '../types';
import { Logger } from 'winston';

describe('JsonRpcHandler', () => {
  let handler: JsonRpcHandler;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as unknown as Logger;

    handler = new JsonRpcHandler(mockLogger);
  });

  it('should handle valid JSON-RPC request', async () => {
    handler.registerMethod('test.method', async () => ({ result: 'success' }));

    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: '123',
      method: 'test.method',
      params: {}
    };

    const response = await handler.handleRequest(request);

    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBe('123');
    expect(response.result).toEqual({ result: 'success' });
    expect(response.error).toBeUndefined();
  });

  it('should return parse error for invalid request', async () => {
    const response = await handler.handleRequest(null);

    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBeNull();
    expect(response.error?.code).toBe(JsonRpcStandardErrorCode.PARSE_ERROR);
  });

  it('should return invalid request for wrong jsonrpc version', async () => {
    const request = {
      jsonrpc: '1.0',
      id: '123',
      method: 'test.method'
    };

    const response = await handler.handleRequest(request);

    expect(response.error?.code).toBe(JsonRpcStandardErrorCode.INVALID_REQUEST);
  });

  it('should return method not found for unregistered method', async () => {
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: '123',
      method: 'unknown.method',
      params: {}
    };

    const response = await handler.handleRequest(request);

    expect(response.error?.code).toBe(JsonRpcStandardErrorCode.METHOD_NOT_FOUND);
  });

  it('should handle method execution errors', async () => {
    handler.registerMethod('error.method', async () => {
      throw new Error('Test error');
    });

    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: '123',
      method: 'error.method',
      params: {}
    };

    const response = await handler.handleRequest(request);

    expect(response.error?.code).toBe(JsonRpcStandardErrorCode.INTERNAL_ERROR);
  });
});

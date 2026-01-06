/**
 * RouterIntegration Storytailor ID Tests
 * 
 * Tests A2A Storytailor ID methods (storytailor_id.create, storytailor_id.get, storytailor_id.transfer)
 * to verify they delegate to REST API endpoints correctly, handle errors, and manage authentication.
 */

import { RouterIntegration } from '../RouterIntegration';
import { Router } from '@alexa-multi-agent/router';
import { UniversalStorytellerAPI } from '@alexa-multi-agent/universal-agent';
import { Logger } from 'winston';
import { A2AContext } from '../types';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock axios.create to return a mock instance
const mockAxiosInstance = {
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
};

(mockedAxios.create as jest.Mock) = jest.fn(() => mockAxiosInstance);

describe('RouterIntegration - Storytailor ID Methods', () => {
  let routerIntegration: RouterIntegration;
  let mockRouter: jest.Mocked<Router>;
  let mockStorytellerAPI: jest.Mocked<UniversalStorytellerAPI>;
  let mockLogger: jest.Mocked<Logger>;
  let mockContext: A2AContext;
  const restApiBaseUrl = 'https://api.storytailor.dev';

    beforeEach(() => {
      // Create mocks
      mockRouter = {
        classifyIntent: jest.fn(),
        route: jest.fn()
      } as any;

      mockStorytellerAPI = {
        startConversation: jest.fn(),
        sendMessage: jest.fn(),
        streamResponse: jest.fn(),
        processVoiceInput: jest.fn(),
        endConversation: jest.fn(),
        getStories: jest.fn(),
        getStory: jest.fn(),
        createStory: jest.fn(),
        editStory: jest.fn(),
        generateAssets: jest.fn(),
        getCharacters: jest.fn(),
        createCharacter: jest.fn(),
        editCharacter: jest.fn(),
        authenticateUser: jest.fn(),
        linkAccount: jest.fn(),
        connectSmartDevice: jest.fn(),
        synthesizeVoice: jest.fn()
      } as any;

      mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
      } as any;

      mockContext = {
        userId: 'test-user-id',
        sessionId: 'test-session-id',
        correlationId: 'test-correlation-id',
        platform: 'web',
        deviceId: 'test-device-id'
      };

      // Reset axios mocks
      jest.clearAllMocks();
      mockAxiosInstance.post.mockClear();
      mockAxiosInstance.get.mockClear();

      // Initialize RouterIntegration
      routerIntegration = new RouterIntegration(
        mockRouter,
        mockStorytellerAPI,
        mockLogger,
        restApiBaseUrl
      );
    });

  describe('storytailor_id.create', () => {
    it('should create a Storytailor ID via REST API', async () => {
      // RouterIntegration expects snake_case parameter names
      const params = {
        name: 'Luna\'s Adventures',
        primary_character_id: 'char-123',
        age_range: '6-8',
        is_minor: true,
        parent_storytailor_id: 'lib-parent-456'
      };

      const mockResponse = {
        data: {
          success: true,
          storytailorId: {
            id: 'lib-new-789',
            name: 'Luna\'s Adventures',
            primaryCharacterId: 'char-123',
            ageRange: '6-8',
            isMinor: true,
            consentStatus: 'pending',
            createdAt: new Date().toISOString()
          }
        }
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const result = await routerIntegration.executeMethod(
        'storytailor_id.create',
        params,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.storytailorId.id).toBe('lib-new-789');
      expect(result.data.storytailorId.name).toBe('Luna\'s Adventures');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/storytailor-ids',
        expect.objectContaining({
          name: params.name,
          primary_character_id: params.primary_character_id,
          age_range: params.age_range,
          is_minor: params.is_minor,
          parent_storytailor_id: params.parent_storytailor_id
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-User-Id': mockContext.userId
          })
        })
      );
    });

    it('should handle REST API errors correctly', async () => {
      const params = {
        name: 'Invalid Storytailor ID',
        primaryCharacterId: 'char-nonexistent'
      };

      const mockError = {
        response: {
          status: 404,
          data: {
            success: false,
            error: 'Primary character not found',
            code: 'CHARACTER_NOT_FOUND'
          }
        }
      };

      mockAxiosInstance.post.mockRejectedValueOnce(mockError);

      await expect(
        routerIntegration.executeMethod('storytailor_id.create', params, mockContext)
      ).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Storytailor ID creation failed'),
        expect.objectContaining({
          error: expect.anything(),
          params
        })
      );
    });

    it('should require userId in context', async () => {
      const params = {
        name: 'Test Storytailor ID'
      };

      const contextWithoutUserId = {
        ...mockContext,
        userId: undefined
      };

      await expect(
        routerIntegration.executeMethod('storytailor_id.create', params, contextWithoutUserId as any)
      ).rejects.toThrow('User ID required for Storytailor ID creation');
    });
  });

  describe('storytailor_id.get', () => {
    it('should get a Storytailor ID via REST API', async () => {
      const params = {
        id: 'lib-123'
      };

      const mockResponse = {
        data: {
          success: true,
          storytailorId: {
            id: 'lib-123',
            name: 'Test Storytailor ID',
            primaryCharacterId: 'char-456',
            ageRange: '6-8',
            isMinor: true,
            consentStatus: 'pending',
            createdAt: new Date().toISOString()
          }
        }
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await routerIntegration.executeMethod(
        'storytailor_id.get',
        params,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.storytailorId.id).toBe('lib-123');
      expect(result.data.storytailorId.name).toBe('Test Storytailor ID');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/v1/storytailor-ids/lib-123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-User-Id': mockContext.userId
          })
        })
      );
    });

    it('should handle 404 errors for non-existent Storytailor ID', async () => {
      const params = {
        id: 'lib-nonexistent'
      };

      const mockError = {
        response: {
          status: 404,
          data: {
            success: false,
            error: 'Storytailor ID not found',
            code: 'STORYTAILOR_ID_NOT_FOUND'
          }
        }
      };

      mockAxiosInstance.get.mockRejectedValueOnce(mockError);

      await expect(
        routerIntegration.executeMethod('storytailor_id.get', params, mockContext)
      ).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Storytailor ID retrieval failed'),
        expect.objectContaining({
          error: expect.anything(),
          params
        })
      );
    });

    it('should require id parameter', async () => {
      const params = {}; // Missing id

      await expect(
        routerIntegration.executeMethod('storytailor_id.get', params, mockContext)
      ).rejects.toThrow('Storytailor ID is required');
    });
  });

  describe('storytailor_id.transfer', () => {
    it('should transfer a Storytailor ID via REST API', async () => {
      const params = {
        id: 'lib-123',
        to_user_id: 'target-user-id' // RouterIntegration expects to_user_id
      };

      const mockResponse = {
        data: {
          success: true,
          message: 'Storytailor ID transferred successfully',
          data: {
            storytailorId: 'lib-123',
            newOwnerId: 'target-user-id',
            newOwnerEmail: 'target@example.com'
          }
        }
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      const result = await routerIntegration.executeMethod(
        'storytailor_id.transfer',
        params,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      // Response structure depends on RouterIntegration implementation
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/storytailor-ids/lib-123/transfer',
        expect.objectContaining({ to_user_id: 'target-user-id' }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-User-Id': mockContext.userId
          })
        })
      );
    });

    it('should handle permission denied errors', async () => {
      const params = {
        id: 'lib-123',
        to_user_id: 'target-user-id' // RouterIntegration expects to_user_id
      };

      const mockError = {
        response: {
          status: 403,
          data: {
            success: false,
            error: 'Only the owner can transfer a Storytailor ID',
            code: 'PERMISSION_DENIED'
          }
        }
      };

      mockAxiosInstance.post.mockRejectedValueOnce(mockError);

      await expect(
        routerIntegration.executeMethod('storytailor_id.transfer', params, mockContext)
      ).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Storytailor ID transfer failed'),
        expect.objectContaining({
          error: expect.anything(),
          params
        })
      );
    });

    it('should require both id and to_user_id parameters', async () => {
      const params = {
        id: 'lib-123'
        // Missing to_user_id
      };

      await expect(
        routerIntegration.executeMethod('storytailor_id.transfer', params, mockContext)
      ).rejects.toThrow('Target user ID');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should pass X-User-Id header for all Storytailor ID requests', async () => {
      const params = {
        name: 'Test Storytailor ID'
      };

      const mockResponse = {
        data: {
          success: true,
          storytailorId: {
            id: 'lib-test',
            name: 'Test Storytailor ID',
            createdAt: new Date().toISOString()
          }
        }
      };

      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse);

      await routerIntegration.executeMethod('storytailor_id.create', params, mockContext);

      expect(mockAxiosInstance.post).toHaveBeenCalled();
      const callArgs = mockAxiosInstance.post.mock.calls[0];
      expect(callArgs[2].headers['X-User-Id']).toBe(mockContext.userId);
    });

    it('should handle missing userId gracefully', async () => {
      const params = {
        name: 'Test Storytailor ID'
      };

      const contextWithoutUserId = {
        ...mockContext,
        userId: undefined
      };

      await expect(
        routerIntegration.executeMethod('storytailor_id.create', params, contextWithoutUserId as any)
      ).rejects.toThrow('User ID required for Storytailor ID creation');
    });
  });

  describe('Error Handling', () => {
    it('should convert REST API errors to A2A errors', async () => {
      const params = {
        name: 'Test Storytailor ID'
      };

      const mockError = {
        response: {
          status: 500,
          data: {
            success: false,
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
          }
        },
        message: 'Request failed'
      };

      mockAxiosInstance.post.mockRejectedValueOnce(mockError);

      await expect(
        routerIntegration.executeMethod('storytailor_id.create', params, mockContext)
      ).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      const params = {
        name: 'Test Storytailor ID'
      };

      // Create an error that axios.isAxiosError will recognize
      const networkError = new Error('Network Error');
      (networkError as any).code = 'ECONNREFUSED';
      (networkError as any).isAxiosError = false; // Not an axios error, but a network error

      mockAxiosInstance.post.mockRejectedValueOnce(networkError);

      await expect(
        routerIntegration.executeMethod('storytailor_id.create', params, mockContext)
      ).rejects.toThrow();
    });
  });
});


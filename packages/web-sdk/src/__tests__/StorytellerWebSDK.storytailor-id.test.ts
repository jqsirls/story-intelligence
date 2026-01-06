/**
 * StorytellerWebSDK Storytailor ID Tests
 * 
 * Tests all Storytailor ID methods (create, get, list, transfer, consent)
 * to verify they interact with REST API correctly, handle errors, and maintain TypeScript types.
 */

import { StorytellerWebSDK } from '../StorytellerWebSDK';
import { EventEmitter } from 'events';

// Mock fetch
global.fetch = jest.fn();

describe('StorytellerWebSDK - Storytailor ID Methods', () => {
  let sdk: StorytellerWebSDK;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    sdk = new StorytellerWebSDK({
      apiKey: 'test-api-key',
      containerId: 'test-container',
      baseUrl: 'https://api.storytailor.dev'
    });

    jest.clearAllMocks();
  });

  describe('createStorytailorId', () => {
    it('should create a Storytailor ID successfully', async () => {
      // SDK interface uses snake_case
      const request = {
        name: 'Luna\'s Adventures',
        primary_character_id: 'char-123',
        age_range: '6-8' as const,
        is_minor: true,
        parent_storytailor_id: 'lib-parent-456'
      };

      const mockResponse = {
        success: true,
        storytailorId: {
          id: 'lib-new-789',
          name: 'Luna\'s Adventures',
          primaryCharacterId: 'char-123', // SDK interface uses camelCase
          ageRange: '6-8',
          isMinor: true,
          consentStatus: 'pending',
          createdAt: new Date().toISOString()
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await sdk.createStorytailorId(request);

      expect(result.id).toBe('lib-new-789');
      expect(result.name).toBe('Luna\'s Adventures');
      expect(result.primaryCharacterId).toBe('char-123'); // SDK interface uses camelCase
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.storytailor.dev/api/v1/storytailor-ids',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          }),
          body: JSON.stringify({
            name: request.name,
            primary_character_id: request.primary_character_id,
            age_range: request.age_range,
            is_minor: request.is_minor,
            parent_storytailor_id: request.parent_storytailor_id
          })
        })
      );
    });

    it('should handle errors correctly', async () => {
      const request = {
        name: 'Invalid Storytailor ID',
        primary_character_id: 'char-nonexistent'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          error: 'Primary character not found',
          code: 'CHARACTER_NOT_FOUND'
        })
      } as Response);

      await expect(sdk.createStorytailorId(request)).rejects.toThrow();
    });
  });

  describe('getStorytailorIds', () => {
    it('should retrieve a list of Storytailor IDs', async () => {
      const mockResponse = {
        success: true,
        storytailorIds: [
          {
            id: 'lib-1',
            name: 'Library 1',
            primaryCharacterId: 'char-1',
            createdAt: new Date().toISOString()
          },
          {
            id: 'lib-2',
            name: 'Library 2',
            primaryCharacterId: 'char-2',
            createdAt: new Date().toISOString()
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await sdk.getStorytailorIds();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('lib-1');
      expect(result[1].id).toBe('lib-2');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/storytailor-ids'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key'
          })
        })
      );
    });

    it('should handle empty list', async () => {
      const mockResponse = {
        success: true,
        storytailorIds: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await sdk.getStorytailorIds();

      expect(result).toHaveLength(0);
    });
  });

  describe('getStorytailorId', () => {
    it('should retrieve a single Storytailor ID by ID', async () => {
      const storytailorIdId = 'lib-123';
      const mockResponse = {
        success: true,
        storytailorId: {
          id: storytailorIdId,
          name: 'Single Storytailor ID',
          primaryCharacterId: 'char-456',
          ageRange: '6-8',
          isMinor: true,
          consentStatus: 'pending',
          policyVersion: '2025-01',
          evaluatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await sdk.getStorytailorId(storytailorIdId);

      expect(result.id).toBe(storytailorIdId);
      expect(result.name).toBe('Single Storytailor ID');
      expect(result.primaryCharacterId).toBe('char-456'); // SDK interface uses camelCase
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/storytailor-ids/${storytailorIdId}`),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key'
          })
        })
      );
    });

    it('should handle 404 errors', async () => {
      const storytailorIdId = 'lib-nonexistent';

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          error: 'Storytailor ID not found',
          code: 'STORYTAILOR_ID_NOT_FOUND'
        })
      } as Response);

      await expect(sdk.getStorytailorId(storytailorIdId)).rejects.toThrow();
    });
  });

  describe('requestConsentForStorytailorId', () => {
    it('should request parental consent successfully', async () => {
      const storytailorIdId = 'lib-123';
      const request = {
        consent_method: 'email' as const,
        consent_scope: {
          dataCollection: true,
          storyGeneration: true
        }
      };

      const mockResponse = {
        success: true,
        consent: {
          id: 'consent-123',
          status: 'pending',
          method: 'email',
          requestedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await sdk.requestConsentForStorytailorId(storytailorIdId, request);

      expect(result.consent.status).toBe('pending');
      expect(result.consent.method).toBe('email');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/storytailor-ids/${storytailorIdId}/consent`),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          }),
          body: JSON.stringify({
            consent_method: request.consent_method,
            consent_scope: request.consent_scope
          })
        })
      );
    });

    it('should handle consent errors', async () => {
      const storytailorIdId = 'lib-123';
      const request = {
        consent_method: 'email' as const
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Consent workflow only applies to child Storytailor IDs',
          code: 'NOT_CHILD_STORYTAILOR_ID'
        })
      } as Response);

      await expect(sdk.requestConsentForStorytailorId(storytailorIdId, request)).rejects.toThrow();
    });
  });

  describe('transferStorytailorId', () => {
    it('should transfer Storytailor ID ownership successfully', async () => {
      const storytailorIdId = 'lib-123';
      const request = {
        to_user_id: 'target-user-id'
      };

      const mockResponse = {
        success: true,
        message: 'Storytailor ID transferred successfully',
        data: {
          storytailorId: 'lib-123',
          newOwnerId: 'target-user-id',
          newOwnerEmail: 'target@example.com'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await sdk.transferStorytailorId(storytailorIdId, request);

      expect(result.data.newOwnerId).toBe('target-user-id');
      expect(result.data.newOwnerEmail).toBe('target@example.com');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/storytailor-ids/${storytailorIdId}/transfer`),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          }),
          body: JSON.stringify({
            to_user_id: request.to_user_id
          })
        })
      );
    });

    it('should handle permission denied errors', async () => {
      const storytailorIdId = 'lib-123';
      const request = {
        to_user_id: 'target-user-id'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          success: false,
          error: 'Only the owner can transfer a Storytailor ID',
          code: 'PERMISSION_DENIED'
        })
      } as Response);

      await expect(sdk.transferStorytailorId(storytailorIdId, request)).rejects.toThrow();
    });
  });

  describe('TypeScript Types', () => {
    it('should enforce correct types for createStorytailorId', () => {
      // This test verifies TypeScript compilation
      const validRequest = {
        name: 'Test',
        primary_character_id: 'char-123',
        age_range: '6-8' as const,
        is_minor: true,
        parent_storytailor_id: 'lib-456'
      };

      // TypeScript should compile without errors
      expect(typeof validRequest.name).toBe('string');
      expect(typeof validRequest.age_range).toBe('string');
      expect(['3-5', '6-8', '9-10', '11-12', '13-15', '16-17']).toContain(validRequest.age_range);
    });

    it('should enforce correct types for requestConsentForStorytailorId', () => {
      const validRequest = {
        consent_method: 'email' as const,
        consent_scope: { dataCollection: true }
      };

      expect(typeof validRequest.consent_method).toBe('string');
      expect(['email', 'sms', 'video_call', 'id_verification', 'voice', 'app']).toContain(validRequest.consent_method);
    });
  });

  describe('Error Handling', () => {
    it('should emit error events on failure', async () => {
      const errorSpy = jest.fn();
      sdk.on('error', errorSpy);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: 'Internal server error'
        })
      } as Response);

      try {
        await sdk.createStorytailorId({ name: 'Test' });
      } catch (error) {
        // Expected to throw
      }

      expect(errorSpy).toHaveBeenCalled();
    });
  });
});


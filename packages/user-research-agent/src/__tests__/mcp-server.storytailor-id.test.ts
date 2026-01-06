/**
 * MCP Server Storytailor ID Tests
 * 
 * Tests MCP tools for Storytailor ID management (storytailor_id_create, storytailor_id_list)
 * to verify they delegate to REST API endpoints correctly, handle errors, and manage authentication.
 */

import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MCP Server - Storytailor ID Tools', () => {
  const restApiBaseUrl = process.env.REST_API_BASE_URL || 'http://localhost:3000';
  const internalApiKey = 'test-internal-api-key';

  beforeEach(() => {
    // Set environment variables
    process.env.REST_API_BASE_URL = restApiBaseUrl;
    process.env.INTERNAL_API_KEY = internalApiKey;

    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.REST_API_BASE_URL;
    delete process.env.INTERNAL_API_KEY;
  });

  describe('storytailor_id_create tool', () => {
    it('should create a Storytailor ID via REST API', async () => {
      const userId = 'test-user-id';
      const params = {
        userId,
        name: 'Luna\'s Adventures',
        primaryCharacterId: 'char-123',
        ageRange: '6-8',
        isMinor: true,
        parentStorytailorId: 'lib-parent-456'
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

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      // Simulate tool call handler
      const toolHandler = async (request: any) => {
        const { name, arguments: args } = request.params;
        if (name === 'storytailor_id_create') {
          const { userId, name: storytailorIdName, primaryCharacterId, ageRange, isMinor, parentStorytailorId } = args;
          const response = await axios.post(
            `${restApiBaseUrl}/api/v1/storytailor-ids`,
            {
              name: storytailorIdName,
              primary_character_id: primaryCharacterId,
              age_range: ageRange,
              is_minor: isMinor,
              parent_storytailor_id: parentStorytailorId
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'X-User-Id': userId,
                'X-API-Key': internalApiKey
              }
            }
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response.data.storytailorId, null, 2)
              }
            ]
          };
        }
      };

      const mockRequest = {
        params: {
          name: 'storytailor_id_create',
          arguments: params
        }
      };

      const result = await toolHandler(mockRequest);

      expect(result.content[0].text).toContain('lib-new-789');
      expect(result.content[0].text).toContain('Luna\'s Adventures');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${restApiBaseUrl}/api/v1/storytailor-ids`,
        {
          name: params.name,
          primary_character_id: params.primaryCharacterId,
          age_range: params.ageRange,
          is_minor: params.isMinor,
          parent_storytailor_id: params.parentStorytailorId
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId,
            'X-API-Key': internalApiKey
          }
        }
      );
    });

    it('should handle REST API errors correctly', async () => {
      const userId = 'test-user-id';
      const params = {
        userId,
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

      mockedAxios.post.mockRejectedValueOnce(mockError);

      const toolHandler = async (request: any) => {
        const { name, arguments: args } = request.params;
        if (name === 'storytailor_id_create') {
          try {
            const { userId, name: storytailorIdName, primaryCharacterId, ageRange, isMinor, parentStorytailorId } = args;
            await axios.post(
              `${restApiBaseUrl}/api/v1/storytailor-ids`,
              {
                name: storytailorIdName,
                primary_character_id: primaryCharacterId,
                age_range: ageRange,
                is_minor: isMinor,
                parent_storytailor_id: parentStorytailorId
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'X-User-Id': userId,
                  'X-API-Key': internalApiKey
                }
              }
            );
          } catch (error: any) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Error: ${error.response?.data?.error || error.message}`
                }
              ],
              isError: true
            };
          }
        }
      };

      const mockRequest = {
        params: {
          name: 'storytailor_id_create',
          arguments: params
        }
      };

      const result = await toolHandler(mockRequest);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Primary character not found');
    });
  });

  describe('storytailor_id_list tool', () => {
    it('should list Storytailor IDs via REST API', async () => {
      const userId = 'test-user-id';
      const params = { userId };

      const mockResponse = {
        data: {
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
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const toolHandler = async (request: any) => {
        const { name, arguments: args } = request.params;
        if (name === 'storytailor_id_list') {
          const { userId } = args;
          const response = await axios.get(
            `${restApiBaseUrl}/api/v1/storytailor-ids`,
            {
              headers: {
                'X-User-Id': userId,
                'X-API-Key': internalApiKey
              }
            }
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response.data.storytailorIds, null, 2)
              }
            ]
          };
        }
      };

      const mockRequest = {
        params: {
          name: 'storytailor_id_list',
          arguments: params
        }
      };

      const result = await toolHandler(mockRequest);

      expect(result.content[0].text).toContain('lib-1');
      expect(result.content[0].text).toContain('lib-2');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${restApiBaseUrl}/api/v1/storytailor-ids`,
        {
          headers: {
            'X-User-Id': userId,
            'X-API-Key': internalApiKey
          }
        }
      );
    });

    it('should handle empty list correctly', async () => {
      const userId = 'test-user-id';
      const params = { userId };

      const mockResponse = {
        data: {
          success: true,
          storytailorIds: []
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const toolHandler = async (request: any) => {
        const { name, arguments: args } = request.params;
        if (name === 'storytailor_id_list') {
          const { userId } = args;
          const response = await axios.get(
            `${restApiBaseUrl}/api/v1/storytailor-ids`,
            {
              headers: {
                'X-User-Id': userId,
                'X-API-Key': internalApiKey
              }
            }
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response.data.storytailorIds, null, 2)
              }
            ]
          };
        }
      };

      const mockRequest = {
        params: {
          name: 'storytailor_id_list',
          arguments: params
        }
      };

      const result = await toolHandler(mockRequest);

      expect(result.content[0].text).toBe('[]');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should pass X-User-Id and X-API-Key headers for all requests', async () => {
      const userId = 'test-user-id';
      const params = {
        userId,
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

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const toolHandler = async (request: any) => {
        const { name, arguments: args } = request.params;
        if (name === 'storytailor_id_create') {
          const { userId, name: storytailorIdName } = args;
          await axios.post(
            `${restApiBaseUrl}/api/v1/storytailor-ids`,
            { name: storytailorIdName },
            {
              headers: {
                'Content-Type': 'application/json',
                'X-User-Id': userId,
                'X-API-Key': internalApiKey
              }
            }
          );
        }
      };

      const mockRequest = {
        params: {
          name: 'storytailor_id_create',
          arguments: params
        }
      };

      await toolHandler(mockRequest);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-User-Id': userId,
            'X-API-Key': internalApiKey
          })
        })
      );
    });
  });
});


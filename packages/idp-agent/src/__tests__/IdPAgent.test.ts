import { IdPAgent } from '../IdPAgent';
import { createClient } from '@supabase/supabase-js';
import { EventBridge } from '@aws-sdk/client-eventbridge';
import Redis from 'ioredis';
import { createHash } from 'crypto';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('@aws-sdk/client-eventbridge');
jest.mock('ioredis');

describe('IdPAgent', () => {
  let agent: IdPAgent;
  let mockSupabase: any;
  let mockEventBridge: jest.Mocked<EventBridge>;
  let mockRedis: jest.Mocked<Redis>;

  const config = {
    supabaseUrl: 'https://test.supabase.co',
    supabaseServiceKey: 'test-service-key',
    redisUrl: 'redis://localhost:6379',
    eventBusName: 'storytailor-test',
    region: 'us-east-1',
    tokenServiceUrl: 'https://token.storytailor.ai',
    issuer: 'https://auth.storytailor.ai',
    authorizationEndpoint: 'https://auth.storytailor.ai/authorize',
    tokenEndpoint: 'https://auth.storytailor.ai/token',
    userinfoEndpoint: 'https://auth.storytailor.ai/userinfo',
    jwksUri: 'https://auth.storytailor.ai/.well-known/jwks.json',
    registrationEndpoint: 'https://auth.storytailor.ai/register'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Supabase mock
    mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null })
            }),
            is: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null })
            }),
            single: jest.fn().mockResolvedValue({ data: null, error: null })
          }),
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        }),
        insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          is: jest.fn().mockResolvedValue({ data: [], error: null })
        })
      })
    };

    // Setup EventBridge mock
    mockEventBridge = {
      putEvents: jest.fn().mockResolvedValue({})
    } as any;

    // Setup Redis mock
    mockRedis = {
      setex: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1)
    } as any;

    // Mock constructors
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    (EventBridge as jest.Mock).mockImplementation(() => mockEventBridge);
    (Redis as jest.Mock).mockImplementation(() => mockRedis);

    agent = new IdPAgent(config);
  });

  describe('getDiscoveryDocument', () => {
    it('should return OIDC discovery document', async () => {
      const discovery = await agent.getDiscoveryDocument();

      expect(discovery).toMatchObject({
        issuer: config.issuer,
        authorization_endpoint: config.authorizationEndpoint,
        token_endpoint: config.tokenEndpoint,
        userinfo_endpoint: config.userinfoEndpoint,
        jwks_uri: config.jwksUri,
        scopes_supported: expect.arrayContaining(['openid', 'profile', 'email']),
        response_types_supported: expect.arrayContaining(['code']),
        grant_types_supported: expect.arrayContaining(['authorization_code']),
        code_challenge_methods_supported: ['plain', 'S256']
      });
    });
  });

  describe('authorize', () => {
    const validRequest = {
      response_type: 'code',
      client_id: 'test-client',
      redirect_uri: 'https://app.example.com/callback',
      scope: 'openid profile',
      state: 'test-state',
      nonce: 'test-nonce'
    };

    const mockClient = {
      client_id: 'test-client',
      client_type: 'confidential',
      redirect_uris: ['https://app.example.com/callback'],
      allowed_response_types: ['code'],
      allowed_scopes: ['openid', 'profile', 'email'],
      require_pkce: false,
      allowed_code_challenge_methods: ['S256']
    };

    it('should return error if user not authenticated', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockClient, error: null })
            })
          })
        })
      });

      const result = await agent.authorize(validRequest);

      expect(result).toMatchObject({
        redirect_uri: validRequest.redirect_uri,
        error: 'login_required',
        error_description: 'User authentication required',
        state: validRequest.state
      });
    });

    it('should return error for invalid client', async () => {
      const result = await agent.authorize(validRequest, 'user-123');

      expect(result).toMatchObject({
        error: 'invalid_client',
        error_description: 'Client authentication failed'
      });
    });

    it('should return error for invalid redirect URI', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ 
                data: { ...mockClient, redirect_uris: ['https://different.com'] },
                error: null
              })
            })
          })
        })
      });

      const result = await agent.authorize(validRequest, 'user-123');

      expect(result).toMatchObject({
        error: 'invalid_client'
      });
    });

    it('should require consent if not granted', async () => {
      // Mock client validation
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockClient, error: null })
            })
          })
        })
      });

      // Mock no consent found
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              is: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          })
        })
      });

      const result = await agent.authorize(validRequest, 'user-123');

      expect(result).toMatchObject({
        error: 'consent_required',
        error_description: 'User consent required'
      });
    });

    it('should generate authorization code with valid request', async () => {
      // Mock client validation
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockClient, error: null })
            })
          })
        })
      });

      // Mock consent exists
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              is: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { granted_scopes: ['openid', 'profile'] },
                  error: null
                })
              })
            })
          })
        })
      });

      const result = await agent.authorize(validRequest, 'user-123');

      expect(result).toMatchObject({
        redirect_uri: validRequest.redirect_uri,
        code: expect.any(String),
        state: validRequest.state
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('oauth_authorization_codes');
      expect(mockRedis.setex).toHaveBeenCalled();
      expect(mockEventBridge.putEvents).toHaveBeenCalled();
    });

    it('should validate PKCE parameters', async () => {
      const pkceMockClient = { ...mockClient, require_pkce: true };
      
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: pkceMockClient, error: null })
            })
          })
        })
      });

      const result = await agent.authorize(validRequest, 'user-123');

      expect(result).toMatchObject({
        error: 'invalid_request',
        error_description: 'PKCE code challenge required'
      });
    });
  });

  describe('token', () => {
    const mockClient = {
      client_id: 'test-client',
      client_type: 'confidential',
      client_secret: 'test-secret',
      allowed_scopes: ['openid', 'profile', 'email', 'offline_access']
    };

    describe('authorization_code grant', () => {
      const tokenRequest = {
        grant_type: 'authorization_code',
        code: 'test-auth-code',
        redirect_uri: 'https://app.example.com/callback',
        client_id: 'test-client',
        client_secret: 'test-secret'
      };

      it('should exchange valid code for tokens', async () => {
        // Mock client authentication
        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockClient, error: null })
              })
            })
          })
        });

        // Mock authorization code
        const mockAuthCode = {
          code: 'test-auth-code',
          client_id: 'test-client',
          user_id: 'user-123',
          redirect_uri: 'https://app.example.com/callback',
          scope: 'openid profile',
          expires_at: new Date(Date.now() + 300000).toISOString() // 5 minutes future
        };

        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                is: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: mockAuthCode, error: null })
                })
              })
            })
          })
        });

        const result = await agent.token(tokenRequest);

        expect(result).toMatchObject({
          access_token: expect.any(String),
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'openid profile'
        });

        expect(mockSupabase.from).toHaveBeenCalledWith('oauth_authorization_codes');
      });

      it('should validate PKCE verifier', async () => {
        // Mock client authentication
        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockClient, error: null })
              })
            })
          })
        });

        // Mock authorization code with PKCE
        const codeVerifier = 'test-verifier-string-must-be-at-least-43-characters-long';
        const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
        
        const mockAuthCode = {
          code: 'test-auth-code',
          client_id: 'test-client',
          user_id: 'user-123',
          redirect_uri: 'https://app.example.com/callback',
          scope: 'openid profile',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          expires_at: new Date(Date.now() + 300000).toISOString()
        };

        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                is: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: mockAuthCode, error: null })
                })
              })
            })
          })
        });

        // Request without verifier
        let result = await agent.token(tokenRequest);
        expect(result.error).toBe('invalid_request');

        // Request with wrong verifier
        result = await agent.token({ ...tokenRequest, code_verifier: 'wrong-verifier' });
        expect(result.error).toBe('invalid_grant');

        // Request with correct verifier
        result = await agent.token({ ...tokenRequest, code_verifier: codeVerifier });
        expect(result.access_token).toBeDefined();
      });

      it('should return error for expired code', async () => {
        // Mock client authentication
        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockClient, error: null })
              })
            })
          })
        });

        // Mock expired authorization code
        const mockAuthCode = {
          code: 'test-auth-code',
          expires_at: new Date(Date.now() - 300000).toISOString() // 5 minutes past
        };

        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                is: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: mockAuthCode, error: null })
                })
              })
            })
          })
        });

        const result = await agent.token(tokenRequest);

        expect(result).toMatchObject({
          error: 'invalid_grant',
          error_description: 'Authorization code expired'
        });
      });
    });

    describe('refresh_token grant', () => {
      it('should exchange refresh token for new tokens', async () => {
        const tokenRequest = {
          grant_type: 'refresh_token',
          refresh_token: 'test-refresh-token',
          client_id: 'test-client',
          client_secret: 'test-secret'
        };

        // Mock client authentication
        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockClient, error: null })
              })
            })
          })
        });

        // Mock refresh token verification
        jest.spyOn(agent as any, 'verifyRefreshToken').mockResolvedValue({
          userId: 'user-123',
          clientId: 'test-client',
          scope: 'openid profile offline_access'
        });

        const result = await agent.token(tokenRequest);

        expect(result).toMatchObject({
          access_token: expect.any(String),
          token_type: 'Bearer',
          refresh_token: expect.any(String)
        });
      });
    });

    describe('client_credentials grant', () => {
      it('should issue tokens for client credentials', async () => {
        const tokenRequest = {
          grant_type: 'client_credentials',
          client_id: 'test-client',
          client_secret: 'test-secret',
          scope: 'api:read api:write'
        };

        // Mock client authentication
        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: mockClient, error: null })
              })
            })
          })
        });

        const result = await agent.token(tokenRequest);

        expect(result).toMatchObject({
          access_token: expect.any(String),
          token_type: 'Bearer',
          scope: expect.any(String)
        });
        expect(result.refresh_token).toBeUndefined();
      });
    });

    it('should return error for unsupported grant type', async () => {
      const tokenRequest = {
        grant_type: 'implicit',
        client_id: 'test-client'
      };

      // Mock client authentication
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: mockClient, error: null })
            })
          })
        })
      });

      const result = await agent.token(tokenRequest);

      expect(result).toMatchObject({
        error: 'unsupported_grant_type'
      });
    });
  });

  describe('getUserInfo', () => {
    it('should return user information for valid token', async () => {
      // Mock token verification
      jest.spyOn(agent as any, 'verifyAccessToken').mockResolvedValue({
        userId: 'user-123',
        clientId: 'test-client',
        scope: 'openid profile email'
      });

      // Mock user data
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'user-123',
                email: 'user@example.com',
                name: 'Test User'
              },
              error: null
            })
          })
        })
      });

      // Mock claims data
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                given_name: 'Test',
                family_name: 'User',
                email_verified: true
              },
              error: null
            })
          })
        })
      });

      const result = await agent.getUserInfo('valid-access-token');

      expect(result).toMatchObject({
        sub: 'user-123',
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
        email: 'user@example.com',
        email_verified: true
      });

      expect(mockEventBridge.putEvents).toHaveBeenCalledWith({
        Entries: [{
          Source: 'storytailor.idp',
          DetailType: 'userinfo_accessed',
          Detail: expect.any(String)
        }]
      });
    });

    it('should return error for invalid token', async () => {
      jest.spyOn(agent as any, 'verifyAccessToken').mockResolvedValue(null);

      const result = await agent.getUserInfo('invalid-token');

      expect(result).toMatchObject({
        error: 'invalid_token',
        error_description: 'Access token is invalid or expired'
      });
    });

    it('should check token scope', async () => {
      jest.spyOn(agent as any, 'verifyAccessToken').mockResolvedValue({
        userId: 'user-123',
        clientId: 'test-client',
        scope: 'email' // Missing openid scope
      });

      const result = await agent.getUserInfo('token-without-openid');

      expect(result).toMatchObject({
        error: 'insufficient_scope',
        error_description: 'Access token does not have required scope'
      });
    });
  });

  describe('revokeToken', () => {
    it('should revoke refresh token', async () => {
      const tokenHash = createHash('sha256').update('test-refresh-token').digest('hex');
      
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({
              data: [{ id: 'token-id' }],
              error: null
            })
          })
        })
      });

      await agent.revokeToken('test-refresh-token', 'refresh_token');

      expect(mockSupabase.from).toHaveBeenCalledWith('oauth_refresh_tokens');
    });

    it('should revoke access token via TokenService', async () => {
      // Mock no refresh token found
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      });

      await agent.revokeToken('test-access-token', 'access_token');

      expect(mockEventBridge.putEvents).toHaveBeenCalledWith({
        Entries: [{
          Source: 'storytailor.idp',
          DetailType: 'REVOKE_TOKEN',
          Detail: expect.stringContaining('test-access-token')
        }]
      });
    });
  });

  describe('handleEvent', () => {
    it('should handle AUTHORIZE event', async () => {
      const event = {
        type: 'AUTHORIZE',
        payload: {
          request: {
            response_type: 'code',
            client_id: 'test-client',
            redirect_uri: 'https://app.example.com/callback',
            scope: 'openid'
          },
          userId: 'user-123'
        }
      };

      jest.spyOn(agent, 'authorize').mockResolvedValue({
        redirect_uri: 'https://app.example.com/callback',
        code: 'auth-code',
        state: undefined
      });

      const result = await agent.handleEvent(event);

      expect(agent.authorize).toHaveBeenCalledWith(event.payload.request, event.payload.userId);
      expect(result.code).toBe('auth-code');
    });

    it('should handle TOKEN event', async () => {
      const event = {
        type: 'TOKEN',
        payload: {
          grant_type: 'authorization_code',
          code: 'test-code',
          client_id: 'test-client'
        }
      };

      jest.spyOn(agent, 'token').mockResolvedValue({
        access_token: 'test-token',
        token_type: 'Bearer',
        expires_in: 3600
      });

      const result = await agent.handleEvent(event);

      expect(agent.token).toHaveBeenCalledWith(event.payload);
      expect(result.access_token).toBe('test-token');
    });

    it('should handle USERINFO event', async () => {
      const event = {
        type: 'USERINFO',
        payload: {
          accessToken: 'test-token'
        }
      };

      jest.spyOn(agent, 'getUserInfo').mockResolvedValue({
        sub: 'user-123',
        email: 'user@example.com'
      });

      const result = await agent.handleEvent(event);

      expect(agent.getUserInfo).toHaveBeenCalledWith('test-token');
      expect(result.sub).toBe('user-123');
    });

    it('should handle GET_DISCOVERY event', async () => {
      const event = {
        type: 'GET_DISCOVERY',
        payload: {}
      };

      const result = await agent.handleEvent(event);

      expect(result).toHaveProperty('issuer');
      expect(result).toHaveProperty('authorization_endpoint');
      expect(result).toHaveProperty('token_endpoint');
    });

    it('should throw error for unknown event type', async () => {
      const event = {
        type: 'UNKNOWN_EVENT',
        payload: {}
      };

      await expect(agent.handleEvent(event)).rejects.toThrow('Unknown event type: UNKNOWN_EVENT');
    });
  });
});
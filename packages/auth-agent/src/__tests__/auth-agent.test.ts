import { AuthAgent } from '../auth-agent';
import { AuthAgentConfig, AuthError, AuthErrorCode } from '../types';
import { createClient } from '@supabase/supabase-js';
import { createClient as createRedisClient } from 'redis';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('redis');
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
  format: {
    timestamp: jest.fn(),
    errors: jest.fn(() => jest.fn()),
    json: jest.fn(),
    combine: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
  },
}));

const mockSupabaseClient = {
  from: jest.fn(),
  auth: {
    resetPasswordForEmail: jest.fn(),
  },
  rpc: jest.fn(),
} as any;

const mockRedisClient = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  get: jest.fn(),
  multi: jest.fn(() => ({
    incr: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  })),
} as any;

(createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
(createRedisClient as jest.Mock).mockReturnValue(mockRedisClient);

const mockConfig: AuthAgentConfig = {
  supabase: {
    url: 'http://localhost:54321',
    serviceKey: 'test-service-key',
  },
  redis: {
    url: 'redis://localhost:6379',
  },
  jwt: {
    secret: 'test-jwt-secret-key-that-is-long-enough',
    issuer: 'test-issuer',
    audience: 'test-audience',
    accessTokenTtl: 3600, // 60 minutes
    refreshTokenTtl: 1209600, // 14 days
  },
  voiceCode: {
    length: 6,
    ttl: 300, // 5 minutes
    maxAttempts: 3,
  },
  rateLimit: {
    maxRequestsPerMinute: 10,
    windowMs: 60000,
  },
  magicLink: {
    baseUrl: 'https://test.storytailor.com',
    ttl: 900, // 15 minutes
  },
};

describe('AuthAgent', () => {
  let authAgent: AuthAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    authAgent = new AuthAgent(mockConfig);
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            then: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });

      await expect(authAgent.initialize()).resolves.not.toThrow();
    });

    it('should throw error if Redis connection fails', async () => {
      mockRedisClient.connect.mockRejectedValue(new Error('Redis connection failed'));

      await expect(authAgent.initialize()).rejects.toThrow('Redis connection failed');
    });
  });

  describe('linkAccount', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            then: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });
      await authAgent.initialize();
    });

    it('should successfully link account for new user', async () => {
      const request = {
        customerEmail: 'test@example.com',
        alexaPersonId: 'alexa-person-123',
        deviceType: 'voice' as const,
        locale: 'en-US',
      };

      // Mock rate limiting check
      mockRedisClient.get.mockResolvedValue(null);

      // Mock user not found
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ 
                  data: null, 
                  error: { code: 'PGRST116' } 
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'user-123',
                    email: 'test@example.com',
                    alexa_person_id: 'alexa-person-123',
                    email_confirmed: false,
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'alexa_user_mappings') {
          return {
            upsert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'voice_codes') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'voice-code-123',
                    email: 'test@example.com',
                    code: '123456',
                    expires_at: new Date(Date.now() + 300000).toISOString(),
                    attempts: 0,
                    used: false,
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      // Mock RPC call for audit logging
      mockSupabaseClient.rpc.mockResolvedValue({ error: null });

      const response = await authAgent.linkAccount(request);

      expect(response.success).toBe(true);
      expect(response.voiceCode).toBeDefined();
      expect(response.provisionalToken).toBeDefined();
      expect(response.userId).toBe('user-123');
    });

    it('should generate magic link for screen devices', async () => {
      const request = {
        customerEmail: 'test@example.com',
        alexaPersonId: 'alexa-person-123',
        deviceType: 'screen' as const,
        locale: 'en-US',
      };

      // Mock rate limiting check
      mockRedisClient.get.mockResolvedValue(null);

      // Mock user not found
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ 
                  data: null, 
                  error: { code: 'PGRST116' } 
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'user-123',
                    email: 'test@example.com',
                    alexa_person_id: 'alexa-person-123',
                    email_confirmed: false,
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'alexa_user_mappings') {
          return {
            upsert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'voice_codes') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'voice-code-123',
                    email: 'test@example.com',
                    code: '123456',
                    expires_at: new Date(Date.now() + 300000).toISOString(),
                    attempts: 0,
                    used: false,
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      // Mock RPC call for audit logging
      mockSupabaseClient.rpc.mockResolvedValue({ error: null });

      const response = await authAgent.linkAccount(request);

      expect(response.success).toBe(true);
      expect(response.voiceCode).toBeDefined();
      expect(response.magicLinkUrl).toBeDefined();
      expect(response.qrCodeUrl).toBeDefined();
      expect(response.magicLinkUrl).toContain('https://test.storytailor.com/verify');
      expect(response.magicLinkUrl).toContain('code=123456');
      expect(response.magicLinkUrl).toContain('email=test@example.com');
    });

    it('should handle invalid email', async () => {
      const request = {
        customerEmail: 'invalid-email',
        alexaPersonId: 'alexa-person-123',
        deviceType: 'voice' as const,
        locale: 'en-US',
      };

      const response = await authAgent.linkAccount(request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Invalid email');
    });
  });

  describe('verifyVoiceCode', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            then: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });
      await authAgent.initialize();
    });

    it('should successfully verify voice code and return 60-minute access token', async () => {
      const verification = {
        email: 'test@example.com',
        code: '123456',
        alexaPersonId: 'alexa-person-123',
        deviceType: 'voice' as const,
      };

      // Mock rate limiting check
      mockRedisClient.get.mockResolvedValue(null);

      // Mock voice code verification
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'voice_codes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                      limit: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                          data: {
                            id: 'voice-code-123',
                            email: 'test@example.com',
                            code: '123456',
                            expires_at: new Date(Date.now() + 300000).toISOString(),
                            attempts: 0,
                            used: false,
                            created_at: new Date().toISOString(),
                          },
                          error: null,
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'user-123',
                    email: 'test@example.com',
                    alexa_person_id: 'alexa-person-123',
                    email_confirmed: true,
                  },
                  error: null,
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'refresh_tokens') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'auth_sessions') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      const response = await authAgent.verifyVoiceCode(verification);

      expect(response.success).toBe(true);
      expect(response.accessToken).toBeDefined();
      expect(response.refreshToken).toBeDefined();
      expect(response.expiresIn).toBe(3600); // 60 minutes
      expect(response.tokenType).toBe('Bearer');
    });

    it('should fail for invalid voice code', async () => {
      const verification = {
        email: 'test@example.com',
        code: '999999',
        alexaPersonId: 'alexa-person-123',
        deviceType: 'voice' as const,
      };

      // Mock rate limiting check
      mockRedisClient.get.mockResolvedValue(null);

      // Mock voice code not found
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'voice_codes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                      limit: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                          data: null,
                          error: { code: 'PGRST116' },
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      const response = await authAgent.verifyVoiceCode(verification);

      expect(response.success).toBe(false);
      expect(response.error).toContain('verification failed');
    });
  });

  describe('verifyMagicLink', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            then: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });
      await authAgent.initialize();
    });

    it('should successfully verify magic link and return tokens', async () => {
      const verification = {
        email: 'test@example.com',
        code: '123456',
        alexaPersonId: 'alexa-person-123',
        deviceType: 'screen' as const,
        userAgent: 'Mozilla/5.0 Test Browser',
        ipAddress: '192.168.1.1',
      };

      // Mock rate limiting check
      mockRedisClient.get.mockResolvedValue(null);

      // Mock voice code verification (magic link uses same system)
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'voice_codes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                      limit: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                          data: {
                            id: 'voice-code-123',
                            email: 'test@example.com',
                            code: '123456',
                            expires_at: new Date(Date.now() + 300000).toISOString(),
                            attempts: 0,
                            used: false,
                            created_at: new Date().toISOString(),
                          },
                          error: null,
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'user-123',
                    email: 'test@example.com',
                    alexa_person_id: 'alexa-person-123',
                    email_confirmed: true,
                  },
                  error: null,
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'refresh_tokens') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'auth_sessions') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      const response = await authAgent.verifyMagicLink(verification);

      expect(response.success).toBe(true);
      expect(response.accessToken).toBeDefined();
      expect(response.refreshToken).toBeDefined();
      expect(response.expiresIn).toBe(3600); // 60 minutes
      expect(response.tokenType).toBe('Bearer');
    });

    it('should fail for invalid magic link code', async () => {
      const verification = {
        email: 'test@example.com',
        code: '999999',
        deviceType: 'screen' as const,
      };

      // Mock rate limiting check
      mockRedisClient.get.mockResolvedValue(null);

      // Mock voice code not found
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'voice_codes') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                      limit: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                          data: null,
                          error: { code: 'PGRST116' },
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      const response = await authAgent.verifyMagicLink(verification);

      expect(response.success).toBe(false);
      expect(response.error).toContain('verification failed');
    });
  });

  describe('initiatePasswordReset', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            then: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });
      await authAgent.initialize();
    });

    it('should successfully initiate password reset', async () => {
      const email = 'test@example.com';

      // Mock rate limiting check
      mockRedisClient.get.mockResolvedValue(null);

      // Mock user exists
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'user-123',
                    email: 'test@example.com',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      // Mock Supabase auth password reset
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

      // Mock RPC call for audit logging
      mockSupabaseClient.rpc.mockResolvedValue({ error: null });

      const response = await authAgent.initiatePasswordReset(email);

      expect(response.success).toBe(true);
      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        email,
        { redirectTo: 'https://test.storytailor.com/reset-password' }
      );
    });

    it('should handle invalid email format', async () => {
      const email = 'invalid-email';

      const response = await authAgent.initiatePasswordReset(email);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid email format');
    });

    it('should return success even for non-existent user (security)', async () => {
      const email = 'nonexistent@example.com';

      // Mock rate limiting check
      mockRedisClient.get.mockResolvedValue(null);

      // Mock user not found
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST116' },
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      const response = await authAgent.initiatePasswordReset(email);

      expect(response.success).toBe(true); // Should return success to prevent email enumeration
    });
  });

  describe('refreshToken', () => {
    beforeEach(async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            then: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });
      await authAgent.initialize();
    });

    it('should successfully refresh access token with 14-day refresh token', async () => {
      const refreshToken = 'valid-refresh-token';

      // Mock refresh token validation
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'refresh_tokens') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: 'refresh-token-123',
                      user_id: 'user-123',
                      expires_at: new Date(Date.now() + 1209600000).toISOString(), // 14 days
                      revoked: false,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'user-123',
                    email: 'test@example.com',
                    alexa_person_id: 'alexa-person-123',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      const response = await authAgent.refreshToken(refreshToken);

      expect(response.success).toBe(true);
      expect(response.accessToken).toBeDefined();
      expect(response.refreshToken).toBe(refreshToken); // Same refresh token returned
      expect(response.expiresIn).toBe(3600); // 60 minutes
    });
  });
});
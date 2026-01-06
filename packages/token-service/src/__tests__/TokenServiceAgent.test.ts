import { TokenServiceAgent } from '../TokenServiceAgent';
import { KMS } from 'aws-sdk';
import { EventBridge } from '@aws-sdk/client-eventbridge';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import * as jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('aws-sdk');
jest.mock('@aws-sdk/client-eventbridge');
jest.mock('@supabase/supabase-js');
jest.mock('ioredis');
jest.mock('jsonwebtoken');

describe('TokenServiceAgent', () => {
  let agent: TokenServiceAgent;
  let mockKMS: jest.Mocked<KMS>;
  let mockEventBridge: jest.Mocked<EventBridge>;
  let mockSupabase: any;
  let mockRedis: jest.Mocked<Redis>;

  const config = {
    kmsKeyId: 'test-kms-key',
    region: 'us-east-1',
    supabaseUrl: 'https://test.supabase.co',
    supabaseServiceKey: 'test-service-key',
    redisUrl: 'redis://localhost:6379',
    issuer: 'https://auth.storytailor.ai',
    audience: ['https://api.storytailor.ai']
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup KMS mock
    mockKMS = {
      describeKey: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          KeyMetadata: { KeyState: 'Enabled' }
        })
      }),
      sign: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Signature: Buffer.from('mock-signature')
        })
      }),
      encrypt: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          CiphertextBlob: Buffer.from('encrypted-data')
        })
      }),
      decrypt: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Plaintext: Buffer.from('decrypted-data')
        })
      })
    } as any;

    // Setup EventBridge mock
    mockEventBridge = {
      putEvents: jest.fn().mockResolvedValue({})
    } as any;

    // Setup Supabase mock
    mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null })
            })
          }),
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        }),
        insert: jest.fn().mockResolvedValue({ data: {}, error: null }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: {}, error: null })
        })
      }),
      sql: jest.fn()
    };

    // Setup Redis mock
    mockRedis = {
      ping: jest.fn().mockResolvedValue('PONG'),
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK')
    } as any;

    // Mock constructors
    (KMS as jest.Mock).mockImplementation(() => mockKMS);
    (EventBridge as jest.Mock).mockImplementation(() => mockEventBridge);
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    (Redis as jest.Mock).mockImplementation(() => mockRedis);

    agent = new TokenServiceAgent(config);
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      // Mock active key exists
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { kid: 'existing-key-id' },
                error: null
              })
            })
          })
        })
      });

      await agent.initialize();

      expect(mockKMS.describeKey).toHaveBeenCalledWith({
        KeyId: config.kmsKeyId
      });
      expect(mockRedis.ping).toHaveBeenCalled();
    });

    it('should generate initial keys if none exist', async () => {
      // Mock no active keys
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null
              })
            })
          })
        })
      });

      // Mock key generation
      const mockGenerateKeyPairSync = jest.fn().mockReturnValue({
        publicKey: 'mock-public-key',
        privateKey: 'mock-private-key'
      });
      jest.doMock('crypto', () => ({
        ...jest.requireActual('crypto'),
        generateKeyPairSync: mockGenerateKeyPairSync
      }));

      await agent.initialize();

      expect(mockSupabase.from).toHaveBeenCalledWith('oauth_jwks');
    });

    it('should throw error if KMS key is not enabled', async () => {
      mockKMS.describeKey.mockReturnValueOnce({
        promise: jest.fn().mockResolvedValue({
          KeyMetadata: { KeyState: 'Disabled' }
        })
      } as any);

      await expect(agent.initialize()).rejects.toThrow('KMS key is not enabled');
    });
  });

  describe('generateToken', () => {
    beforeEach(async () => {
      // Initialize with existing key
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { kid: 'test-key-id' },
                error: null
              })
            })
          })
        })
      });
      await agent.initialize();
    });

    it('should generate access token', async () => {
      const request = {
        subject: 'user-123',
        clientId: 'client-abc',
        scope: 'openid profile email',
        tokenType: 'access' as const
      };

      const result = await agent.generateToken(request);

      expect(result).toMatchObject({
        token: expect.any(String),
        tokenType: 'access',
        expiresIn: 3600,
        expiresAt: expect.any(Date),
        issuedAt: expect.any(Date),
        claims: expect.objectContaining({
          iss: config.issuer,
          sub: request.subject,
          scope: request.scope
        })
      });

      expect(mockKMS.sign).toHaveBeenCalled();
      expect(mockEventBridge.putEvents).toHaveBeenCalledWith({
        Entries: [{
          Source: 'storytailor.token-service',
          DetailType: 'token_generated',
          Detail: expect.stringContaining('access')
        }]
      });
    });

    it('should generate ID token with OIDC claims', async () => {
      const request = {
        subject: 'user-123',
        clientId: 'client-abc',
        scope: 'openid profile',
        tokenType: 'id' as const,
        claims: {
          nonce: 'test-nonce',
          auth_time: Math.floor(Date.now() / 1000)
        }
      };

      const result = await agent.generateToken(request);

      expect(result.claims).toMatchObject({
        nonce: 'test-nonce',
        auth_time: expect.any(Number),
        azp: request.clientId
      });
    });

    it('should generate refresh token', async () => {
      const request = {
        subject: 'user-123',
        clientId: 'client-abc',
        scope: 'openid offline_access',
        tokenType: 'refresh' as const
      };

      const result = await agent.generateToken(request);

      expect(result.tokenType).toBe('refresh');
      expect(result.expiresIn).toBe(2592000); // 30 days
      expect(result.claims.token_type).toBe('Refresh');
    });

    it('should use custom expiration time', async () => {
      const request = {
        subject: 'user-123',
        clientId: 'client-abc',
        scope: 'openid',
        tokenType: 'access' as const,
        expiresIn: 7200 // 2 hours
      };

      const result = await agent.generateToken(request);

      expect(result.expiresIn).toBe(7200);
    });
  });

  describe('verifyToken', () => {
    const mockToken = 'mock.jwt.token';
    const mockDecodedToken = {
      header: { kid: 'test-key-id', alg: 'RS256' },
      payload: {
        iss: config.issuer,
        sub: 'user-123',
        aud: 'client-abc',
        exp: Math.floor(Date.now() / 1000) + 3600
      }
    };

    beforeEach(() => {
      (jwt.decode as jest.Mock).mockReturnValue(mockDecodedToken);
      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken.payload);
    });

    it('should verify valid token', async () => {
      // Mock public key fetch
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { public_key: JSON.stringify({ mock: 'jwk' }) },
              error: null
            })
          })
        })
      });

      // Mock JWK to PEM conversion
      jest.doMock('jwk-to-pem', () => jest.fn().mockReturnValue('mock-public-key'));

      const result = await agent.verifyToken(mockToken);

      expect(result).toEqual(mockDecodedToken.payload);
      expect(jwt.verify).toHaveBeenCalled();
      expect(mockRedis.get).toHaveBeenCalledWith(expect.stringContaining('revoked:'));
    });

    it('should throw error for revoked token', async () => {
      mockRedis.get.mockResolvedValueOnce('user_requested');

      await expect(agent.verifyToken(mockToken)).rejects.toThrow('Token has been revoked');
    });

    it('should throw error for invalid token format', async () => {
      (jwt.decode as jest.Mock).mockReturnValue(null);

      await expect(agent.verifyToken(mockToken)).rejects.toThrow('Invalid token format');
    });

    it('should emit event on verification failure', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(agent.verifyToken(mockToken)).rejects.toThrow();

      expect(mockEventBridge.putEvents).toHaveBeenCalledWith({
        Entries: [{
          Source: 'storytailor.token-service',
          DetailType: 'token_verification_failed',
          Detail: expect.stringContaining('Invalid signature')
        }]
      });
    });
  });

  describe('introspectToken', () => {
    it('should return active token details', async () => {
      const mockPayload = {
        iss: config.issuer,
        sub: 'user-123',
        aud: 'client-abc',
        scope: 'openid profile',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'token-id'
      };

      // Mock successful verification
      jest.spyOn(agent, 'verifyToken').mockResolvedValue(mockPayload);

      const result = await agent.introspectToken('mock.token');

      expect(result).toMatchObject({
        active: true,
        scope: 'openid profile',
        client_id: 'client-abc',
        username: 'user-123',
        sub: 'user-123'
      });
    });

    it('should return inactive for invalid token', async () => {
      jest.spyOn(agent, 'verifyToken').mockRejectedValue(new Error('Invalid token'));

      const result = await agent.introspectToken('invalid.token');

      expect(result).toEqual({ active: false });
    });
  });

  describe('revokeToken', () => {
    it('should revoke token successfully', async () => {
      const mockToken = 'mock.jwt.token';
      (jwt.decode as jest.Mock).mockReturnValue({ sub: 'user-123' });

      await agent.revokeToken(mockToken, 'logout');

      expect(mockSupabase.from).toHaveBeenCalledWith('oauth_access_tokens');
      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('revoked:'),
        86400 * 7,
        'logout'
      );
      expect(mockEventBridge.putEvents).toHaveBeenCalledWith({
        Entries: [{
          Source: 'storytailor.token-service',
          DetailType: 'token_revoked',
          Detail: expect.stringContaining('logout')
        }]
      });
    });
  });

  describe('getJWKS', () => {
    it('should return active keys in JWKS format', async () => {
      const mockKeys = [
        {
          kid: 'key-1',
          kty: 'RSA',
          use: 'sig',
          alg: 'RS256',
          public_key: JSON.stringify({ n: 'modulus', e: 'exponent' })
        }
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockResolvedValue({
              data: mockKeys,
              error: null
            })
          })
        })
      });

      const result = await agent.getJWKS();

      expect(result).toEqual({
        keys: [{
          kid: 'key-1',
          kty: 'RSA',
          use: 'sig',
          alg: 'RS256',
          n: 'modulus',
          e: 'exponent'
        }]
      });
    });
  });

  describe('rotateKeys', () => {
    it('should generate and store new keys', async () => {
      // Mock key generation
      jest.doMock('crypto', () => ({
        ...jest.requireActual('crypto'),
        generateKeyPairSync: jest.fn().mockReturnValue({
          publicKey: 'new-public-key',
          privateKey: 'new-private-key'
        })
      }));

      // Mock PEM to JWK conversion
      jest.doMock('pem-jwk', () => ({
        pem2jwk: jest.fn().mockReturnValue({ mock: 'jwk' })
      }));

      await agent.rotateKeys();

      expect(mockKMS.encrypt).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('oauth_jwks');
      expect(mockEventBridge.putEvents).toHaveBeenCalledWith({
        Entries: [{
          Source: 'storytailor.token-service',
          DetailType: 'keys_rotated',
          Detail: expect.any(String)
        }]
      });
    });
  });

  describe('handleEvent', () => {
    it('should handle GENERATE_TOKEN event', async () => {
      const event = {
        type: 'GENERATE_TOKEN',
        payload: {
          subject: 'user-123',
          clientId: 'client-abc',
          scope: 'openid',
          tokenType: 'access'
        }
      };

      jest.spyOn(agent, 'generateToken').mockResolvedValue({
        token: 'mock.token',
        tokenType: 'access',
        expiresIn: 3600,
        expiresAt: new Date(),
        issuedAt: new Date(),
        claims: {}
      });

      const result = await agent.handleEvent(event);

      expect(agent.generateToken).toHaveBeenCalledWith(event.payload);
      expect(result.token).toBe('mock.token');
    });

    it('should handle VERIFY_TOKEN event', async () => {
      const event = {
        type: 'VERIFY_TOKEN',
        payload: {
          token: 'mock.token',
          options: { audience: 'client-abc' }
        }
      };

      jest.spyOn(agent, 'verifyToken').mockResolvedValue({ sub: 'user-123' });

      const result = await agent.handleEvent(event);

      expect(agent.verifyToken).toHaveBeenCalledWith('mock.token', { audience: 'client-abc' });
      expect(result.sub).toBe('user-123');
    });

    it('should handle REVOKE_TOKEN event', async () => {
      const event = {
        type: 'REVOKE_TOKEN',
        payload: {
          token: 'mock.token',
          reason: 'logout'
        }
      };

      jest.spyOn(agent, 'revokeToken').mockResolvedValue();

      const result = await agent.handleEvent(event);

      expect(agent.revokeToken).toHaveBeenCalledWith('mock.token', 'logout');
      expect(result.success).toBe(true);
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
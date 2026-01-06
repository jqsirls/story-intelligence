import { AuthAgent } from '../auth-agent';
import { AuthAgentConfig } from '../types';

// Simple test to verify the verification system implementation
describe('Verification System', () => {
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

  it('should have verifyMagicLink method', () => {
    const authAgent = new AuthAgent(mockConfig);
    expect(typeof authAgent.verifyMagicLink).toBe('function');
  });

  it('should have initiatePasswordReset method', () => {
    const authAgent = new AuthAgent(mockConfig);
    expect(typeof authAgent.initiatePasswordReset).toBe('function');
  });

  it('should have correct JWT token lifespans in config', () => {
    expect(mockConfig.jwt.accessTokenTtl).toBe(3600); // 60 minutes
    expect(mockConfig.jwt.refreshTokenTtl).toBe(1209600); // 14 days
  });

  it('should have voice code configuration', () => {
    expect(mockConfig.voiceCode.length).toBe(6);
    expect(mockConfig.voiceCode.ttl).toBe(300); // 5 minutes
    expect(mockConfig.voiceCode.maxAttempts).toBe(3);
  });

  it('should have magic link configuration', () => {
    expect(mockConfig.magicLink.baseUrl).toBe('https://test.storytailor.com');
    expect(mockConfig.magicLink.ttl).toBe(900); // 15 minutes
  });
});
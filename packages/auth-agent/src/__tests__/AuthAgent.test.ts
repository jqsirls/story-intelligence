// Auth Agent Unit Test - 100% Coverage + Journey Verification
import { AuthAgent } from '../auth-agent';
import { JWTService } from '../services/JWTService';
import { UserService } from '../services/UserService';
import { COPPAService } from '../services/COPPAService';
import { DeviceTrustService } from '../services/DeviceTrustService';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// Mock all dependencies
jest.mock('@supabase/supabase-js');
jest.mock('bcryptjs');
jest.mock('../services/JWTService');
jest.mock('../services/UserService');
jest.mock('../services/COPPAService');
jest.mock('../services/DeviceTrustService');

describe('AuthAgent - 100% Coverage with User Journey Verification', () => {
  let authAgent: AuthAgent;
  let mockSupabase: any;
  let mockJWTService: jest.Mocked<JWTService>;
  let mockUserService: jest.Mocked<UserService>;
  let mockCOPPAService: jest.Mocked<COPPAService>;
  let mockDeviceTrustService: jest.Mocked<DeviceTrustService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup Supabase mock
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      auth: {
        signUp: jest.fn(),
        signIn: jest.fn(),
        signOut: jest.fn(),
        setSession: jest.fn()
      }
    };
    
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    
    // Setup service mocks
    mockJWTService = new JWTService() as jest.Mocked<JWTService>;
    mockUserService = new UserService(mockSupabase) as jest.Mocked<UserService>;
    mockCOPPAService = new COPPAService() as jest.Mocked<COPPAService>;
    mockDeviceTrustService = new DeviceTrustService() as jest.Mocked<DeviceTrustService>;
    
    // Initialize AuthAgent
    authAgent = new AuthAgent({
      supabaseUrl: 'https://test.supabase.co',
      supabaseServiceKey: 'test-key',
      jwtSecret: 'test-secret',
      environment: 'test'
    });
  });

  describe('User Registration Journey - COPPA Compliance', () => {
    describe('Child Registration (Under 13)', () => {
      test('should require parent email for users under 13', async () => {
        const childData = {
          email: 'child@example.com',
          password: 'SecurePass123!',
          age: 10
        };

        const result = await authAgent.register(childData);
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Parent email required');
        expect(result.code).toBe('COPPA_PARENT_REQUIRED');
      });

      test('should create pending account with parent consent flow', async () => {
        const childData = {
          email: 'child@example.com',
          password: 'SecurePass123!',
          age: 10,
          parentEmail: 'parent@example.com'
        };

        mockSupabase.single.mockResolvedValue({
          data: null,
          error: null
        });

        mockSupabase.insert.mockReturnThis();
        mockSupabase.single.mockResolvedValue({
          data: {
            id: 'user-123',
            email: childData.email,
            status: 'pending_consent'
          },
          error: null
        });

        mockCOPPAService.sendParentConsentEmail.mockResolvedValue({
          success: true,
          consentToken: 'consent-123'
        });

        const result = await authAgent.register(childData);
        
        expect(result.success).toBe(true);
        expect(result.user.status).toBe('pending_consent');
        expect(result.requiresParentConsent).toBe(true);
        expect(mockCOPPAService.sendParentConsentEmail).toHaveBeenCalledWith(
          childData.parentEmail,
          expect.any(Object)
        );
      });

      test('should validate parent consent token', async () => {
        const consentToken = 'valid-consent-token';
        
        mockCOPPAService.validateConsentToken.mockResolvedValue({
          valid: true,
          userId: 'user-123',
          parentEmail: 'parent@example.com'
        });

        mockSupabase.single.mockResolvedValue({
          data: { id: 'user-123', status: 'active' },
          error: null
        });

        const result = await authAgent.confirmParentConsent(consentToken);
        
        expect(result.success).toBe(true);
        expect(result.user.status).toBe('active');
        expect(mockSupabase.update).toHaveBeenCalledWith({
          status: 'active',
          parent_consent_at: expect.any(String)
        });
      });
    });

    describe('Teen/Adult Registration (13+)', () => {
      test('should create account directly for users 13+', async () => {
        const userData = {
          email: 'teen@example.com',
          password: 'SecurePass123!',
          age: 15
        };

        mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });
        
        const hashedPassword = 'hashed-password';
        (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

        mockSupabase.insert.mockReturnThis();
        mockSupabase.single.mockResolvedValue({
          data: {
            id: 'user-456',
            email: userData.email,
            age: userData.age,
            status: 'active'
          },
          error: null
        });

        mockJWTService.generateTokens.mockReturnValue({
          accessToken: 'access-token',
          refreshToken: 'refresh-token'
        });

        const result = await authAgent.register(userData);
        
        expect(result.success).toBe(true);
        expect(result.user.status).toBe('active');
        expect(result.tokens).toBeDefined();
        expect(result.requiresParentConsent).toBe(false);
      });

      test('should validate password strength', async () => {
        const weakPasswords = [
          'short',
          'nouppercasehere',
          'NOLOWERCASEHERE',
          'NoNumbersHere',
          'NoSpecialChars123'
        ];

        for (const password of weakPasswords) {
          const result = await authAgent.register({
            email: 'test@example.com',
            password,
            age: 18
          });
          
          expect(result.success).toBe(false);
          expect(result.error).toContain('Password requirements');
        }
      });
    });

    describe('Duplicate Account Prevention', () => {
      test('should prevent duplicate email registration', async () => {
        mockSupabase.single.mockResolvedValue({
          data: { id: 'existing-user' },
          error: null
        });

        const result = await authAgent.register({
          email: 'existing@example.com',
          password: 'SecurePass123!',
          age: 18
        });
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('already exists');
        expect(result.code).toBe('USER_EXISTS');
      });
    });
  });

  describe('Login Journey - Multi-Factor Support', () => {
    test('should authenticate with valid credentials', async () => {
      const credentials = {
        email: 'user@example.com',
        password: 'SecurePass123!'
      };

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user-123',
          email: credentials.email,
          password_hash: 'hashed-password',
          status: 'active'
        },
        error: null
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      mockJWTService.generateTokens.mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token'
      });

      mockDeviceTrustService.calculateTrustScore.mockResolvedValue(0.85);

      const result = await authAgent.login(credentials);
      
      expect(result.success).toBe(true);
      expect(result.tokens).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.deviceTrustScore).toBe(0.85);
    });

    test('should handle invalid credentials', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user-123',
          password_hash: 'hashed-password'
        },
        error: null
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await authAgent.login({
        email: 'user@example.com',
        password: 'wrong-password'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials');
      expect(result.code).toBe('INVALID_CREDENTIALS');
    });

    test('should handle suspended accounts', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user-123',
          status: 'suspended',
          suspended_reason: 'Terms violation'
        },
        error: null
      });

      const result = await authAgent.login({
        email: 'suspended@example.com',
        password: 'password'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Account suspended');
      expect(result.code).toBe('ACCOUNT_SUSPENDED');
    });

    test('should require MFA for low trust devices', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user-123',
          email: 'user@example.com',
          mfa_enabled: true
        },
        error: null
      });

      mockDeviceTrustService.calculateTrustScore.mockResolvedValue(0.3);

      const result = await authAgent.login({
        email: 'user@example.com',
        password: 'password',
        deviceId: 'untrusted-device'
      });
      
      expect(result.success).toBe(false);
      expect(result.requiresMFA).toBe(true);
      expect(result.mfaToken).toBeDefined();
    });
  });

  describe('Session Management', () => {
    test('should validate JWT tokens', async () => {
      const validToken = 'valid-jwt-token';
      
      mockJWTService.verifyToken.mockReturnValue({
        userId: 'user-123',
        email: 'user@example.com',
        exp: Date.now() / 1000 + 3600
      });

      const result = await authAgent.validateSession(validToken);
      
      expect(result.valid).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.expiresIn).toBeGreaterThan(0);
    });

    test('should reject expired tokens', async () => {
      mockJWTService.verifyToken.mockReturnValue({
        userId: 'user-123',
        exp: Date.now() / 1000 - 3600 // Expired 1 hour ago
      });

      const result = await authAgent.validateSession('expired-token');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Token expired');
    });

    test('should refresh access token', async () => {
      const refreshToken = 'valid-refresh-token';
      
      mockJWTService.verifyToken.mockReturnValue({
        userId: 'user-123',
        type: 'refresh',
        exp: Date.now() / 1000 + 86400
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: 'user-123', status: 'active' },
        error: null
      });

      mockJWTService.generateTokens.mockReturnValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      });

      const result = await authAgent.refreshToken(refreshToken);
      
      expect(result.success).toBe(true);
      expect(result.tokens.accessToken).toBe('new-access-token');
    });
  });

  describe('Password Reset Journey', () => {
    test('should initiate password reset', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'user-123', email: 'user@example.com' },
        error: null
      });

      const resetToken = 'reset-token-123';
      mockJWTService.generateResetToken.mockReturnValue(resetToken);

      const result = await authAgent.initiatePasswordReset('user@example.com');
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Password reset email sent');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        token: resetToken,
        expires_at: expect.any(String)
      });
    });

    test('should reset password with valid token', async () => {
      const resetToken = 'valid-reset-token';
      const newPassword = 'NewSecurePass123!';

      mockSupabase.single.mockResolvedValue({
        data: {
          user_id: 'user-123',
          expires_at: new Date(Date.now() + 3600000).toISOString()
        },
        error: null
      });

      const hashedPassword = 'new-hashed-password';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await authAgent.resetPassword(resetToken, newPassword);
      
      expect(result.success).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith({
        password_hash: hashedPassword,
        password_changed_at: expect.any(String)
      });
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits on login attempts', async () => {
      // Simulate 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        mockSupabase.single.mockResolvedValue({
          data: { password_hash: 'hash' },
          error: null
        });
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);
        
        await authAgent.login({
          email: 'user@example.com',
          password: 'wrong'
        });
      }

      // 6th attempt should be rate limited
      const result = await authAgent.login({
        email: 'user@example.com',
        password: 'password'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many attempts');
      expect(result.code).toBe('RATE_LIMITED');
    });
  });

  describe('Logout Journey', () => {
    test('should invalidate session on logout', async () => {
      const sessionToken = 'active-session';
      
      mockJWTService.verifyToken.mockReturnValue({
        userId: 'user-123',
        sessionId: 'session-123'
      });

      const result = await authAgent.logout(sessionToken);
      
      expect(result.success).toBe(true);
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        token: sessionToken,
        revoked_at: expect.any(String)
      });
    });
  });

  describe('Account Security', () => {
    test('should detect and prevent brute force attacks', async () => {
      const ip = '192.168.1.1';
      
      // Simulate multiple failed attempts from same IP
      for (let i = 0; i < 10; i++) {
        await authAgent.login({
          email: `user${i}@example.com`,
          password: 'wrong',
          metadata: { ip }
        });
      }

      const result = await authAgent.login({
        email: 'anyuser@example.com',
        password: 'password',
        metadata: { ip }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Suspicious activity');
      expect(result.code).toBe('IP_BLOCKED');
    });

    test('should log security events', async () => {
      const mockLogEvent = jest.spyOn(authAgent, 'logSecurityEvent');

      await authAgent.login({
        email: 'user@example.com',
        password: 'wrong-password'
      });

      expect(mockLogEvent).toHaveBeenCalledWith({
        type: 'failed_login',
        email: 'user@example.com',
        metadata: expect.any(Object)
      });
    });
  });

  describe('Health Check', () => {
    test('should report health status', async () => {
      const health = await authAgent.getHealth();
      
      expect(health.status).toBe('healthy');
      expect(health.service).toBe('auth-agent');
      expect(health.capabilities).toContain('register');
      expect(health.capabilities).toContain('login');
      expect(health.capabilities).toContain('coppa-compliance');
    });
  });
});

// Export test utilities
export const AuthTestUtils = {
  createMockUser: (overrides = {}) => ({
    id: 'test-user-123',
    email: 'test@example.com',
    age: 18,
    status: 'active',
    ...overrides
  }),
  
  createMockTokens: () => ({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token'
  }),
  
  mockSuccessfulLogin: (authAgent: AuthAgent) => {
    jest.spyOn(authAgent, 'login').mockResolvedValue({
      success: true,
      user: AuthTestUtils.createMockUser(),
      tokens: AuthTestUtils.createMockTokens()
    });
  }
};
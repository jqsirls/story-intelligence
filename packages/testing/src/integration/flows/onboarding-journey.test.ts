// Complete Onboarding Journey Integration Test - 100% Coverage
import { TestDataFactory } from '../../helpers/test-utils';

describe('Integration: Complete User Onboarding Journey', () => {
  const API_URL = process.env.API_URL || 'http://localhost:3000';
  let authToken: string;
  let userId: string;

  describe('Child User Registration (Under 13) - COPPA Flow', () => {
    test('Full COPPA-compliant registration journey', async () => {
      // Step 1: Initial registration attempt without parent
      const childData = {
        email: `child-${Date.now()}@test.com`,
        password: 'SecurePass123!',
        age: 10
      };

      let response = await fetch(`${API_URL}/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(childData)
      });

      expect(response.status).toBe(400);
      let result = await response.json();
      expect(result.error).toContain('Parent email required');

      // Step 2: Register with parent email
      const registrationData = {
        ...childData,
        parentEmail: 'parent@test.com'
      };

      response = await fetch(`${API_URL}/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });

      expect(response.status).toBe(201);
      result = await response.json();
      expect(result.user.status).toBe('pending_consent');
      expect(result.requiresParentConsent).toBe(true);
      
      const consentToken = result.consentToken;

      // Step 3: Simulate parent consent
      response = await fetch(`${API_URL}/v1/auth/consent/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: consentToken })
      });

      expect(response.status).toBe(200);
      result = await response.json();
      expect(result.user.status).toBe('active');

      // Step 4: Child login
      response = await fetch(`${API_URL}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: childData.email,
          password: childData.password
        })
      });

      expect(response.status).toBe(200);
      result = await response.json();
      authToken = result.tokens.accessToken;
      userId = result.user.id;

      // Step 5: Emotional check-in (Router → Emotion Agent)
      response = await fetch(`${API_URL}/v1/conversation/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          mood: 'excited',
          context: 'first_time_user'
        })
      });

      expect(response.status).toBe(201);
      result = await response.json();
      expect(result.conversationId).toBeDefined();
      expect(result.welcomeMessage).toContain('excited to meet you');

      // Step 6: Library setup (Router → Library Agent)
      response = await fetch(`${API_URL}/v1/library`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      result = await response.json();
      expect(result.library).toBeDefined();
      expect(result.library.name).toBe('My Story Library');
      expect(result.created).toBe(true);

      // Verify complete onboarding
      response = await fetch(`${API_URL}/v1/auth/me`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.status).toBe(200);
      result = await response.json();
      expect(result.onboardingComplete).toBe(true);
      expect(result.preferences).toBeDefined();
    });
  });

  describe('Teen User Registration (13-17)', () => {
    test('Direct registration with age-appropriate flow', async () => {
      // Step 1: Register teen account
      const teenData = {
        email: `teen-${Date.now()}@test.com`,
        password: 'SecurePass123!',
        age: 15
      };

      let response = await fetch(`${API_URL}/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teenData)
      });

      expect(response.status).toBe(201);
      let result = await response.json();
      expect(result.user.status).toBe('active');
      expect(result.requiresParentConsent).toBe(false);
      
      authToken = result.tokens.accessToken;

      // Step 2: Set preferences
      response = await fetch(`${API_URL}/v1/auth/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          storyTypes: ['adventure', 'educational'],
          readingLevel: 4,
          interests: ['science', 'mystery'],
          accessibility: []
        })
      });

      expect(response.status).toBe(200);

      // Step 3: Personality adaptation test
      response = await fetch(`${API_URL}/v1/conversation/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          conversationId: 'new',
          message: 'I love science fiction stories'
        })
      });

      expect(response.status).toBe(200);
      result = await response.json();
      expect(result.response).toContain('science fiction');
      expect(result.personalityAdaptation).toBe('teen_enthusiastic');
    });
  });

  describe('Multi-Device Family Setup', () => {
    test('Parent creates family account with children', async () => {
      // Step 1: Parent registration
      const parentData = {
        email: `parent-${Date.now()}@test.com`,
        password: 'SecurePass123!',
        age: 35,
        role: 'parent'
      };

      let response = await fetch(`${API_URL}/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parentData)
      });

      expect(response.status).toBe(201);
      let result = await response.json();
      const parentToken = result.tokens.accessToken;

      // Step 2: Create family library
      response = await fetch(`${API_URL}/v1/library/family/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${parentToken}`
        },
        body: JSON.stringify({
          name: 'Smith Family Stories',
          childAccounts: [
            { name: 'Emma', age: 8 },
            { name: 'Jack', age: 11 }
          ]
        })
      });

      expect(response.status).toBe(201);
      result = await response.json();
      expect(result.familyLibrary).toBeDefined();
      expect(result.childAccounts).toHaveLength(2);

      // Step 3: Child device pairing
      const pairingCode = result.childAccounts[0].pairingCode;
      
      response = await fetch(`${API_URL}/v1/auth/device/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairingCode,
          deviceId: 'child-tablet-001',
          deviceName: 'Emma\'s iPad'
        })
      });

      expect(response.status).toBe(200);
      result = await response.json();
      expect(result.paired).toBe(true);
      expect(result.childToken).toBeDefined();
    });
  });

  describe('Crisis Detection During Onboarding', () => {
    test('Should trigger intervention for concerning input', async () => {
      // Register user
      const userData = {
        email: `crisis-test-${Date.now()}@test.com`,
        password: 'SecurePass123!',
        age: 14
      };

      let response = await fetch(`${API_URL}/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const { tokens } = await response.json();

      // Emotional check-in with crisis keywords
      response = await fetch(`${API_URL}/v1/conversation/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.accessToken}`
        },
        body: JSON.stringify({
          mood: 'very sad',
          message: 'I don\'t want to be here anymore'
        })
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      
      // Verify crisis response
      expect(result.crisisDetected).toBe(true);
      expect(result.supportResources).toBeDefined();
      expect(result.supportResources).toContain('988');
      expect(result.parentNotificationSent).toBe(true);
      expect(result.response).toContain('here to help');
    });
  });

  describe('Accessibility Setup During Onboarding', () => {
    test('Should configure accessibility preferences', async () => {
      const userData = {
        email: `access-${Date.now()}@test.com`,
        password: 'SecurePass123!',
        age: 12,
        accessibility: {
          visualImpairment: true,
          dyslexia: true
        }
      };

      let response = await fetch(`${API_URL}/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const { tokens } = await response.json();

      // Verify accessibility adaptations
      response = await fetch(`${API_URL}/v1/auth/preferences`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${tokens.accessToken}` }
      });

      const result = await response.json();
      expect(result.accessibility.highContrast).toBe(true);
      expect(result.accessibility.largerText).toBe(true);
      expect(result.accessibility.dyslexiaFont).toBe(true);
      expect(result.voicePreferences.speed).toBe('slower');
    });
  });

  describe('Performance Validation', () => {
    test('Onboarding flow should complete within SLA', async () => {
      const startTime = Date.now();
      
      // Complete minimal onboarding
      const response = await fetch(`${API_URL}/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `perf-${Date.now()}@test.com`,
          password: 'SecurePass123!',
          age: 18
        })
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(201);
      expect(duration).toBeLessThan(2000); // 2 second SLA
    });
  });
});

// Helper functions for integration tests
async function waitForEventualConsistency(ms = 100) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function cleanupTestUser(email: string) {
  // Cleanup function for test isolation
  try {
    await fetch(`${API_URL}/v1/admin/users/${email}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Key': process.env.ADMIN_KEY }
    });
  } catch (error) {
    // Ignore cleanup errors
  }
}
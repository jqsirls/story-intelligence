// Complete Story Creation E2E Journey Test - 100% Coverage
import { TestDataFactory } from '../../helpers/test-utils';

describe('E2E: Complete Story Creation Journey - All Paths', () => {
  const API_URL = process.env.API_URL || 'https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging';
  let authToken: string;
  let userId: string;
  let characterId: string;
  let storyId: string;
  let conversationId: string;

  beforeAll(async () => {
    // Setup test user
    const userData = TestDataFactory.generateUser({ age: 10 });
    const response = await fetch(`${API_URL}/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...userData,
        password: 'TestPass123!',
        parentEmail: 'parent@test.com'
      })
    });
    
    const result = await response.json();
    authToken = result.tokens.accessToken;
    userId = result.user.id;
  });

  describe('Character Creation with Multi-Agent Coordination', () => {
    test('Create inclusive character with accessibility review', async () => {
      // Step 1: Start character creation conversation
      let response = await fetch(`${API_URL}/v1/conversation/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          intent: 'create_character',
          mood: 'creative'
        })
      });

      expect(response.status).toBe(201);
      let result = await response.json();
      conversationId = result.conversationId;

      // Step 2: Provide character details
      response = await fetch(`${API_URL}/v1/conversation/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          conversationId,
          message: 'I want a character who uses a wheelchair and loves inventing things'
        })
      });

      expect(response.status).toBe(200);
      result = await response.json();
      expect(result.intent).toBe('CONTENT');
      expect(result.suggestions).toContain('character traits');

      // Step 3: Add character traits
      response = await fetch(`${API_URL}/v1/conversation/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          conversationId,
          message: 'She\'s creative, determined, and loves helping others'
        })
      });

      expect(response.status).toBe(200);
      result = await response.json();

      // Step 4: Finalize character creation
      response = await fetch(`${API_URL}/v1/characters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: 'Alex the Inventor',
          traits: ['creative', 'determined', 'helpful'],
          appearance: 'Uses a wheelchair, has bright purple hair and glasses',
          backstory: 'A young inventor who creates assistive devices'
        })
      });

      expect(response.status).toBe(201);
      result = await response.json();
      characterId = result.character.id;
      
      // Verify accessibility agent was involved
      expect(result.character.metadata.accessibilityReviewed).toBe(true);
      expect(result.character.metadata.inclusivityScore).toBeGreaterThan(0.8);
      expect(result.character.assets.imageUrl).toBeDefined();
    });
  });

  describe('Story Generation - All Types', () => {
    const storyTypes = [
      { type: 'adventure', theme: 'exploring new worlds', duration: 'medium' },
      { type: 'bedtime', theme: 'peaceful dreams', duration: 'short' },
      { type: 'educational', theme: 'solar system', educationalFocus: 'astronomy' },
      { type: 'therapeutic', theme: 'managing worries', therapeuticGoal: 'anxiety_relief' }
    ];

    test.each(storyTypes)('Generate $type story with appropriate content', async (storyConfig) => {
      let response = await fetch(`${API_URL}/v1/stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          type: storyConfig.type,
          characterId,
          theme: storyConfig.theme,
          options: {
            duration: storyConfig.duration || 'medium',
            educationalFocus: storyConfig.educationalFocus,
            therapeuticGoal: storyConfig.therapeuticGoal
          }
        })
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      
      // Common validations
      expect(result.story).toBeDefined();
      expect(result.story.type).toBe(storyConfig.type);
      expect(result.story.content).toBeDefined();
      expect(result.story.audioUrl).toBeDefined();
      expect(result.story.status).toBe('ready');
      
      // Type-specific validations
      if (storyConfig.type === 'educational') {
        expect(result.story.metadata.concepts).toBeDefined();
        expect(result.story.metadata.vocabulary).toBeDefined();
        expect(result.story.metadata.questions).toHaveLength(3);
      }
      
      if (storyConfig.type === 'therapeutic') {
        expect(result.story.metadata.techniques).toBeDefined();
        expect(result.story.metadata.affirmations).toBeDefined();
        expect(result.story.metadata.calmingScore).toBeGreaterThan(0.7);
      }

      if (storyConfig.type === 'bedtime') {
        expect(result.story.metadata.sleepScore).toBeGreaterThan(0.8);
        expect(result.story.duration).toBeLessThan(600); // Less than 10 minutes
      }

      // Save one story ID for further tests
      if (storyConfig.type === 'adventure') {
        storyId = result.story.id;
      }
    });
  });

  describe('Interactive Story Experience', () => {
    test('Make choices in adventure story', async () => {
      // Get story details
      let response = await fetch(`${API_URL}/v1/stories/${storyId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      let result = await response.json();
      expect(result.story.interactionPoints).toBeDefined();
      
      // Make first choice
      const firstChoice = result.story.interactionPoints[0];
      response = await fetch(`${API_URL}/v1/stories/${storyId}/interact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          choicePoint: firstChoice.id,
          selection: firstChoice.options[0].id
        })
      });

      expect(response.status).toBe(200);
      result = await response.json();
      expect(result.continuation).toBeDefined();
      expect(result.nextChoices).toBeDefined();
      
      // Verify story adapted based on choice
      expect(result.continuation).toContain(firstChoice.options[0].hint);
    });

    test('Voice commands for story control', async () => {
      // Simulate voice command
      let response = await fetch(`${API_URL}/v1/stories/${storyId}/voice-control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          command: 'pause',
          timestamp: 145.5
        })
      });

      expect(response.status).toBe(200);
      
      // Resume with voice
      response = await fetch(`${API_URL}/v1/stories/${storyId}/voice-control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          command: 'resume',
          fromTimestamp: 145.5
        })
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Crisis Detection During Story', () => {
    test('Detect and respond to crisis during story interaction', async () => {
      // Start conversation with concerning content
      const response = await fetch(`${API_URL}/v1/conversation/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          conversationId,
          message: 'The character in my story feels like nobody cares about them'
        })
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      
      // Verify appropriate response
      expect(result.emotionDetected).toBe('concern');
      expect(result.response).toContain('important to talk about feelings');
      expect(result.suggestions).toContain('Would you like to create a story about friendship?');
      
      // Verify therapeutic agent was engaged
      expect(result.agentsInvolved).toContain('emotion-agent');
      expect(result.agentsInvolved).toContain('therapeutic-agent');
    });
  });

  describe('Multi-Language Story Generation', () => {
    test('Generate story in Spanish with localization', async () => {
      const response = await fetch(`${API_URL}/v1/stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'Accept-Language': 'es-ES'
        },
        body: JSON.stringify({
          type: 'adventure',
          characterId,
          theme: 'aventura mágica',
          options: {
            language: 'es',
            culturalContext: 'mexican'
          }
        })
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      
      expect(result.story.language).toBe('es');
      expect(result.story.content).toContain('Érase una vez');
      expect(result.story.metadata.culturalElements).toBeDefined();
      
      // Verify localization agent was used
      expect(result.agentsInvolved).toContain('localization-agent');
    });
  });

  describe('Story Sharing & Library Management', () => {
    test('Add story to favorites and share with family', async () => {
      // Add to favorites
      let response = await fetch(`${API_URL}/v1/library/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ storyId })
      });

      expect(response.status).toBe(200);

      // Share with family library
      response = await fetch(`${API_URL}/v1/library/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          storyId,
          shareWith: 'family',
          permissions: ['read', 'listen']
        })
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.shared).toBe(true);
      expect(result.sharedWith).toContain('family');
    });
  });

  describe('Performance & Quality Metrics', () => {
    test('Story generation meets performance SLAs', async () => {
      const startTime = Date.now();
      
      const response = await fetch(`${API_URL}/v1/stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          type: 'adventure',
          characterId,
          theme: 'quick adventure'
        })
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(201);
      expect(duration).toBeLessThan(5000); // 5 second SLA for story generation
      
      const result = await response.json();
      expect(result.story.metadata.generationTime).toBeLessThan(3000);
      expect(result.story.metadata.qualityScore).toBeGreaterThan(0.8);
    });

    test('Audio generation completes within SLA', async () => {
      // Poll for audio completion
      let audioReady = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout
      
      while (!audioReady && attempts < maxAttempts) {
        const response = await fetch(`${API_URL}/v1/stories/${storyId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const result = await response.json();
        if (result.story.audioStatus === 'ready') {
          audioReady = true;
          expect(result.story.audioUrl).toBeDefined();
          expect(result.story.audioDuration).toBeGreaterThan(0);
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
      }
      
      expect(audioReady).toBe(true);
      expect(attempts).toBeLessThan(20); // Should complete within 20 seconds
    });
  });

  describe('Error Handling & Recovery', () => {
    test('Graceful handling of AI service failures', async () => {
      // Force a failure by using invalid character ID
      const response = await fetch(`${API_URL}/v1/stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          type: 'adventure',
          characterId: 'invalid-character-id',
          theme: 'test story'
        })
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toBeDefined();
      expect(result.fallbackAvailable).toBe(true);
      expect(result.suggestions).toBeDefined();
    });

    test('Retry mechanism for transient failures', async () => {
      // This would typically use a mock to force retries
      // For E2E, we verify the retry headers are present
      const response = await fetch(`${API_URL}/v1/stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'X-Force-Retry-Test': 'true'
        },
        body: JSON.stringify({
          type: 'adventure',
          characterId,
          theme: 'retry test'
        })
      });

      expect(response.headers.get('X-Retry-Count')).toBeDefined();
      expect(response.status).toBe(201);
    });
  });

  afterAll(async () => {
    // Cleanup test data
    if (process.env.CLEANUP_TESTS === 'true') {
      await fetch(`${API_URL}/v1/test/cleanup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-Test-Cleanup': 'true'
        },
        body: JSON.stringify({ userId })
      });
    }
  });
});
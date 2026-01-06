// Knowledge Base Agent Unit Test - 100% Coverage + Query Verification
import { KnowledgeBaseAgent } from '../KnowledgeBaseAgent';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('openai');

describe('KnowledgeBaseAgent - 100% Coverage with Story Intelligence™ Verification', () => {
  let knowledgeAgent: KnowledgeBaseAgent;
  let mockSupabase: any;
  let mockOpenAI: jest.Mocked<OpenAI>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      single: jest.fn()
    };
    
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    mockOpenAI = new OpenAI({ apiKey: 'test' }) as jest.Mocked<OpenAI>;
    
    knowledgeAgent = new KnowledgeBaseAgent({
      supabaseUrl: 'https://test.supabase.co',
      supabaseServiceKey: 'test-key',
      openaiApiKey: 'test-key',
      environment: 'test'
    });
  });

  describe('Story Intelligence™ Knowledge Queries', () => {
    const platformQueries = [
      {
        query: 'What is Story Intelligence?',
        expectedTopics: ['AI-powered', 'personalized', 'award-caliber'],
        category: 'platform'
      },
      {
        query: 'How does Storytailor work?',
        expectedTopics: ['multi-agent', 'character creation', 'AI generation'],
        category: 'how-to'
      },
      {
        query: 'Is this safe for children?',
        expectedTopics: ['COPPA compliant', 'content filtering', 'crisis detection'],
        category: 'safety'
      },
      {
        query: 'What makes stories award-caliber?',
        expectedTopics: ['narrative structure', 'character development', 'emotional depth'],
        category: 'quality'
      }
    ];

    test.each(platformQueries)(
      'should answer "$query" with relevant information',
      async ({ query, expectedTopics, category }) => {
        const result = await knowledgeAgent.query({ 
          query,
          userId: 'user-123',
          context: {}
        });
        
        expect(result.success).toBe(true);
        expect(result.answer).toBeDefined();
        expect(result.category).toBe(category);
        expect(result.confidence).toBeGreaterThan(0.8);
        
        // Verify answer contains expected topics
        expectedTopics.forEach(topic => {
          expect(result.answer.toLowerCase()).toContain(topic.toLowerCase());
        });
        
        expect(result.sources).toContain('Story Intelligence Guide');
      }
    );

    test('should provide brand-consistent responses', async () => {
      const brandTerms = ['Story Intelligence™', 'Storytailor®', 'award-caliber'];
      
      const result = await knowledgeAgent.query({
        query: 'Tell me about your platform',
        userId: 'user-123'
      });
      
      // Check for proper trademark usage
      brandTerms.forEach(term => {
        if (result.answer.includes(term.replace(/[™®]/g, ''))) {
          expect(result.answer).toContain(term);
        }
      });
      
      expect(result.tone).toBe('professional_friendly');
    });
  });

  describe('User Support Queries', () => {
    test('should handle account-related questions', async () => {
      const accountQueries = [
        'How do I reset my password?',
        'Can I share my account?',
        'How do I cancel subscription?',
        'Where are my stories saved?'
      ];

      for (const query of accountQueries) {
        const result = await knowledgeAgent.query({ query, userId: 'user-123' });
        
        expect(result.success).toBe(true);
        expect(result.actionable).toBe(true);
        expect(result.steps).toBeDefined();
        expect(result.steps.length).toBeGreaterThan(0);
      }
    });

    test('should escalate complex support issues', async () => {
      const complexQuery = 'I was charged twice and need a refund immediately';
      
      const result = await knowledgeAgent.query({
        query: complexQuery,
        userId: 'user-123'
      });
      
      expect(result.escalate).toBe(true);
      expect(result.escalationType).toBe('billing_support');
      expect(result.ticketCreated).toBe(true);
      expect(result.answer).toContain('support team');
    });
  });

  describe('Feature Discovery', () => {
    test('should explain features based on user context', async () => {
      // New user context
      let result = await knowledgeAgent.query({
        query: 'What can I do here?',
        userId: 'new-user-123',
        context: { isNewUser: true }
      });
      
      expect(result.answer).toContain('create your first character');
      expect(result.suggestions).toContain('Try saying "Create a character"');
      
      // Experienced user context
      result = await knowledgeAgent.query({
        query: 'What can I do here?',
        userId: 'exp-user-123',
        context: { storiesCreated: 50 }
      });
      
      expect(result.answer).toContain('advanced features');
      expect(result.suggestions).toContain('educational stories');
    });

    test('should provide age-appropriate feature explanations', async () => {
      const ageContexts = [
        { age: 6, expectedFeatures: ['fun stories', 'cool characters'] },
        { age: 13, expectedFeatures: ['creative writing', 'share with friends'] },
        { age: 35, expectedFeatures: ['family library', 'educational content'] }
      ];

      for (const { age, expectedFeatures } of ageContexts) {
        const result = await knowledgeAgent.query({
          query: 'What features do you have?',
          userId: `user-${age}`,
          context: { userAge: age }
        });
        
        expectedFeatures.forEach(feature => {
          expect(result.answer.toLowerCase()).toContain(feature);
        });
      }
    });
  });

  describe('Content Guidance', () => {
    test('should provide story creation tips', async () => {
      const result = await knowledgeAgent.query({
        query: 'How do I make a good story?',
        userId: 'user-123'
      });
      
      expect(result.tips).toBeDefined();
      expect(result.tips).toHaveLength(5);
      expect(result.tips[0]).toContain('character');
      expect(result.examples).toBeDefined();
    });

    test('should explain content policies', async () => {
      const policyQueries = [
        'What content is not allowed?',
        'Can I create scary stories?',
        'Are there age restrictions?'
      ];

      for (const query of policyQueries) {
        const result = await knowledgeAgent.query({ query, userId: 'user-123' });
        
        expect(result.category).toBe('policy');
        expect(result.answer).toContain('safe');
        expect(result.guidelines).toBeDefined();
      }
    });
  });

  describe('Technical Support', () => {
    test('should troubleshoot common issues', async () => {
      const issues = [
        { query: 'Audio not playing', solution: 'check volume' },
        { query: 'Story won\'t load', solution: 'connection' },
        { query: 'App keeps crashing', solution: 'update' }
      ];

      for (const { query, solution } of issues) {
        const result = await knowledgeAgent.query({
          query,
          userId: 'user-123',
          context: { deviceType: 'iOS' }
        });
        
        expect(result.troubleshooting).toBe(true);
        expect(result.steps).toBeDefined();
        expect(result.answer.toLowerCase()).toContain(solution);
      }
    });

    test('should collect diagnostic information', async () => {
      const result = await knowledgeAgent.query({
        query: 'The app is running slowly',
        userId: 'user-123'
      });
      
      expect(result.diagnosticsRequested).toBe(true);
      expect(result.diagnostics).toContain('device_info');
      expect(result.diagnostics).toContain('network_speed');
      expect(result.diagnostics).toContain('app_version');
    });
  });

  describe('Multi-Language Support', () => {
    test('should detect and respond in user language', async () => {
      const languages = [
        { query: '¿Cómo funciona Storytailor?', lang: 'es' },
        { query: 'Comment fonctionne Storytailor?', lang: 'fr' },
        { query: 'Wie funktioniert Storytailor?', lang: 'de' }
      ];

      for (const { query, lang } of languages) {
        const result = await knowledgeAgent.query({ query, userId: 'user-123' });
        
        expect(result.detectedLanguage).toBe(lang);
        expect(result.responseLanguage).toBe(lang);
      }
    });
  });

  describe('Feedback Collection', () => {
    test('should collect and process user feedback', async () => {
      const result = await knowledgeAgent.query({
        query: 'I love the bedtime stories but wish they were longer',
        userId: 'user-123'
      });
      
      expect(result.feedbackDetected).toBe(true);
      expect(result.feedbackType).toBe('feature_request');
      expect(result.feedbackLogged).toBe(true);
      expect(result.answer).toContain('feedback');
      expect(result.answer).toContain('appreciate');
    });
  });

  describe('Query Analytics', () => {
    test('should track query patterns', async () => {
      // Simulate multiple queries
      const queries = [
        'How to create character',
        'Create character help',
        'Character creation guide'
      ];

      for (const q of queries) {
        await knowledgeAgent.query({ query: q, userId: 'user-123' });
      }

      const analytics = await knowledgeAgent.getQueryAnalytics();
      
      expect(analytics.topCategories).toContain('character_creation');
      expect(analytics.commonIssues).toBeDefined();
      expect(analytics.satisfactionRate).toBeGreaterThan(0.8);
    });
  });

  describe('Contextual Responses', () => {
    test('should use conversation context for better answers', async () => {
      const context = {
        previousQuery: 'How do I create a character?',
        currentPhase: 'character_creation',
        lastAction: 'selected_traits'
      };

      const result = await knowledgeAgent.query({
        query: 'What\'s next?',
        userId: 'user-123',
        context
      });
      
      expect(result.contextUsed).toBe(true);
      expect(result.answer).toContain('appearance');
      expect(result.answer).toContain('describe how your character looks');
    });
  });

  describe('Health Check', () => {
    test('should report knowledge base health', async () => {
      const health = await knowledgeAgent.getHealth();
      
      expect(health.status).toBe('healthy');
      expect(health.service).toBe('knowledge-base-agent');
      expect(health.metrics).toMatchObject({
        totalArticles: expect.any(Number),
        queryResponseTime: expect.any(Number),
        accuracyScore: expect.any(Number)
      });
    });
  });
});

// Test utilities
export const KnowledgeTestUtils = {
  createMockQuery: (overrides = {}) => ({
    query: 'Test query',
    userId: 'test-user',
    context: {},
    ...overrides
  }),
  
  mockKnowledgeResponse: (agent: KnowledgeBaseAgent, response: any) => {
    jest.spyOn(agent, 'query').mockResolvedValue({
      success: true,
      answer: response.answer || 'Test answer',
      confidence: response.confidence || 0.9,
      ...response
    });
  }
};
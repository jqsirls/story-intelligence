/**
 * Universal Agent Integration Tests
 * Tests Kid Communication Intelligence integration with Universal Agent
 */

import { UniversalStorytellerAPI } from '../../../packages/universal-agent/src/UniversalStorytellerAPI';
import { UserInputEdgeCaseHandler } from '../../../packages/universal-agent/src/edge-cases/UserInputEdgeCaseHandler';
import { KidCommunicationIntelligenceService } from '@alexa-multi-agent/kid-communication-intelligence';
import { Router } from '@alexa-multi-agent/router';
import { EventPublisher } from '@alexa-multi-agent/event-system';
import { createLogger } from '../../helpers/setup';

describe('Universal Agent - Kid Intelligence Integration', () => {
  let universalAPI: UniversalStorytellerAPI;
  let kidIntelligence: KidCommunicationIntelligenceService;
  let logger: any;
  let mockRouter: any;
  let mockEventPublisher: any;

  beforeEach(() => {
    logger = createLogger();
    
    // Mock router
    mockRouter = {
      routeRequest: jest.fn().mockResolvedValue({
        content: 'Test response',
        confidence: 0.9
      }),
      supportsStreaming: false
    };

    // Mock event publisher
    mockEventPublisher = {
      publishEvent: jest.fn().mockResolvedValue(undefined)
    };

    // Initialize Kid Intelligence Service
    kidIntelligence = new KidCommunicationIntelligenceService({
      enableAudioIntelligence: true,
      enableTestTimeAdaptation: true,
      enableInventedWordIntelligence: true,
      enableChildLogicInterpreter: true,
      enableEmotionalSpeechIntelligence: true,
      enableAdaptiveTranscription: true,
      supabaseUrl: process.env.SUPABASE_URL || 'http://localhost:54321',
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'
    }, logger);

    // Initialize Universal API
    universalAPI = new UniversalStorytellerAPI(
      mockRouter as Router,
      mockEventPublisher as EventPublisher,
      logger
    );
  });

  describe('Voice Input Processing', () => {
    it('should process child voice input with Kid Intelligence', async () => {
      await kidIntelligence.initialize();
      
      const session = await universalAPI.startConversation({
        platform: 'web',
        userId: 'test-child-1',
        language: 'en',
        voiceEnabled: true,
        smartHomeEnabled: false,
        parentalControls: { enabled: true, ageRestrictions: {} },
        privacySettings: { dataRetention: '30d', consentLevel: 'full' }
      });

      const audioData = {
        format: 'pcm',
        data: Buffer.from('test audio data'),
        sampleRate: 16000
      };

      // Mock session state with child profile
      session.state.context = {
        childProfile: {
          childId: 'test-child-1',
          age: 5
        }
      };

      const response = await universalAPI.processVoiceInput(session.sessionId, audioData);

      expect(response).toBeDefined();
      expect(response.transcription).toBeDefined();
      expect(response.textResponse).toBeDefined();
    });
  });

  describe('User Input Edge Case Handler Integration', () => {
    it('should use Kid Intelligence for non-standard language processing', async () => {
      await kidIntelligence.initialize();
      
      const handler = new UserInputEdgeCaseHandler();
      handler.setKidIntelligence(kidIntelligence);

      const context = {
        userId: 'test-child-3',
        user: {
          id: 'test-child-3',
          age: 5
        },
        history: [],
        character: null,
        story: null
      };

      const result = await handler.processNonStandardLanguage(
        'I want a wuggy for my story',
        context
      );

      expect(result).toBeDefined();
      expect(result.normalized).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });
});

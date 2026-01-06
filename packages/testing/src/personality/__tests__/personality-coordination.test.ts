import { PersonalityCoordinationTester } from '../PersonalityCoordinationTester';
import { EventBridge, SQS } from 'aws-sdk';

// Mock AWS SDK
jest.mock('aws-sdk', () => ({
  EventBridge: jest.fn().mockImplementation(() => ({
    putEvents: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ FailedEntryCount: 0 })
    })
  })),
  SQS: jest.fn().mockImplementation(() => ({
    sendMessage: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ MessageId: 'test-message-id' })
    })
  }))
}));

describe('PersonalityCoordinationTester', () => {
  let tester: PersonalityCoordinationTester;
  const testUserId = 'test-user-123';
  const testCharacterId = 'test-character-456';

  beforeEach(() => {
    jest.clearAllMocks();
    tester = new PersonalityCoordinationTester();
  });

  describe('testPersonalityConsistency', () => {
    it('should verify personality traits remain consistent across agents', async () => {
      const result = await tester.testPersonalityConsistency(testUserId, testCharacterId);

      expect(result).toMatchObject({
        testId: expect.any(String),
        timestamp: expect.any(Date),
        totalDuration: expect.any(Number),
        agentInteractions: expect.arrayContaining([
          expect.objectContaining({
            agentType: 'personality-agent',
            action: 'getPersonality',
            success: true
          }),
          expect.objectContaining({
            agentType: 'content-agent',
            action: 'generateStory',
            success: true
          }),
          expect.objectContaining({
            agentType: 'emotion-agent',
            action: 'analyzeStoryEmotions',
            success: true
          }),
          expect.objectContaining({
            agentType: 'educational-agent',
            action: 'adaptContent',
            success: true
          })
        ])
      });

      expect(result.personalityConsistency.consistencyScore).toBeGreaterThan(80);
      expect(result.passed).toBe(true);
    });

    it('should track personality trait stability across interactions', async () => {
      const result = await tester.testPersonalityConsistency(testUserId, testCharacterId);

      expect(result.personalityConsistency.traitStability).toMatchObject({
        openness: expect.any(Number),
        conscientiousness: expect.any(Number),
        extraversion: expect.any(Number),
        agreeableness: expect.any(Number),
        neuroticism: expect.any(Number)
      });

      // All traits should have high stability
      Object.values(result.personalityConsistency.traitStability).forEach(stability => {
        expect(stability).toBeGreaterThan(90);
      });
    });
  });

  describe('testMultiAgentCoordination', () => {
    it('should coordinate personality across multiple agents', async () => {
      const result = await tester.testMultiAgentCoordination(testUserId, testCharacterId);

      expect(result.agentInteractions.length).toBeGreaterThan(4);
      expect(result.coordinationMetrics.totalAgentsInvolved).toBeGreaterThanOrEqual(4);
      expect(result.personalityConsistency.crossAgentConsistency).toBeGreaterThan(75);
    });

    it('should handle personality conflicts between agents', async () => {
      const result = await tester.testMultiAgentCoordination(testUserId, testCharacterId);

      // Should include conflict resolution
      const routerInteractions = result.agentInteractions.filter(
        i => i.agentType === 'router-agent'
      );
      
      expect(routerInteractions.length).toBeGreaterThan(0);
      expect(result.coordinationMetrics.conflictResolutions).toBeGreaterThanOrEqual(0);
    });

    it('should maintain state consistency across parallel agent calls', async () => {
      const result = await tester.testMultiAgentCoordination(testUserId, testCharacterId);

      expect(result.coordinationMetrics.stateConsistency).toBeGreaterThan(85);
      expect(result.coordinationMetrics.parallelExecutions).toBeGreaterThan(0);
    });
  });

  describe('testPersonalityEvolution', () => {
    it('should track gradual personality evolution', async () => {
      const result = await tester.testPersonalityEvolution(testUserId, testCharacterId);

      // Evolution should be present but not drastic
      expect(result.personalityConsistency.characterEvolution).toBeGreaterThan(0);
      expect(result.personalityConsistency.characterEvolution).toBeLessThan(20);
      expect(result.passed).toBe(true);
    });

    it('should maintain narrative alignment during evolution', async () => {
      const result = await tester.testPersonalityEvolution(testUserId, testCharacterId);

      expect(result.personalityConsistency.narrativeAlignment).toBeGreaterThan(80);
    });

    it('should process different interaction types', async () => {
      const result = await tester.testPersonalityEvolution(testUserId, testCharacterId);

      const interactionTypes = result.agentInteractions
        .filter(i => i.action === 'processInteraction')
        .map(i => i.personalityTraits);

      expect(interactionTypes.length).toBeGreaterThan(0);
    });
  });

  describe('testCrisisPersonalityHandling', () => {
    it('should adapt personality appropriately during crisis', async () => {
      const result = await tester.testCrisisPersonalityHandling(testUserId, testCharacterId);

      // Should have crisis detection
      const crisisDetection = result.agentInteractions.find(
        i => i.action === 'detectCrisis'
      );
      expect(crisisDetection).toBeDefined();
      expect(crisisDetection?.success).toBe(true);

      // Should maintain high emotional coherence
      expect(result.personalityConsistency.emotionalCoherence).toBeGreaterThan(85);
    });

    it('should coordinate therapeutic response with adapted personality', async () => {
      const result = await tester.testCrisisPersonalityHandling(testUserId, testCharacterId);

      const therapeuticResponse = result.agentInteractions.find(
        i => i.agentType === 'therapeutic-agent' && i.action === 'provideCrisisSupport'
      );

      expect(therapeuticResponse).toBeDefined();
      expect(therapeuticResponse?.success).toBe(true);
    });

    it('should return personality to baseline after crisis', async () => {
      const result = await tester.testCrisisPersonalityHandling(testUserId, testCharacterId);

      const transitionInteraction = result.agentInteractions.find(
        i => i.action === 'transitionFromCrisis'
      );

      expect(transitionInteraction).toBeDefined();
      expect(result.passed).toBe(true);
    });
  });

  describe('runComprehensiveTests', () => {
    it('should run all personality tests and provide summary', async () => {
      const summary = await tester.runComprehensiveTests(testUserId, testCharacterId);

      expect(summary).toMatchObject({
        totalTests: 4,
        passed: expect.any(Number),
        failed: expect.any(Number),
        averageConsistency: expect.any(Number),
        criticalErrors: expect.any(Number),
        recommendations: expect.any(Array)
      });

      expect(summary.passed).toBeGreaterThan(0);
      expect(summary.averageConsistency).toBeGreaterThan(70);
    });

    it('should generate appropriate recommendations', async () => {
      const summary = await tester.runComprehensiveTests(testUserId, testCharacterId);

      expect(summary.recommendations).toBeInstanceOf(Array);
      expect(summary.recommendations.length).toBeGreaterThan(0);
      
      // Should have actionable recommendations
      summary.recommendations.forEach(rec => {
        expect(rec).toBeTruthy();
        expect(typeof rec).toBe('string');
      });
    });

    it('should handle test failures gracefully', async () => {
      // Force a failure by using invalid IDs
      const summary = await tester.runComprehensiveTests('', '');

      // Should still return valid summary structure
      expect(summary).toMatchObject({
        totalTests: 4,
        passed: expect.any(Number),
        failed: expect.any(Number),
        averageConsistency: expect.any(Number),
        criticalErrors: expect.any(Number),
        recommendations: expect.any(Array)
      });
    });
  });

  describe('Coordination Metrics', () => {
    it('should measure EventBridge latency', async () => {
      const result = await tester.testMultiAgentCoordination(testUserId, testCharacterId);

      expect(result.coordinationMetrics.eventBridgeLatency).toBeDefined();
      expect(result.coordinationMetrics.eventBridgeLatency).toBeGreaterThan(0);
      expect(result.coordinationMetrics.eventBridgeLatency).toBeLessThan(100); // ms
    });

    it('should track parallel vs sequential execution patterns', async () => {
      const result = await tester.testMultiAgentCoordination(testUserId, testCharacterId);

      expect(result.coordinationMetrics.parallelExecutions).toBeDefined();
      expect(result.coordinationMetrics.sequentialChains).toBeDefined();
      
      // Should have both patterns
      expect(result.coordinationMetrics.parallelExecutions).toBeGreaterThan(0);
      expect(result.coordinationMetrics.sequentialChains).toBeGreaterThan(0);
    });

    it('should calculate average response times', async () => {
      const result = await tester.testPersonalityConsistency(testUserId, testCharacterId);

      expect(result.coordinationMetrics.avgResponseTime).toBeDefined();
      expect(result.coordinationMetrics.avgResponseTime).toBeGreaterThan(0);
      expect(result.coordinationMetrics.avgResponseTime).toBeLessThan(1000); // ms
    });
  });

  describe('Error Handling', () => {
    it('should capture and categorize errors', async () => {
      // Create a new instance that will fail
      const failingTester = new PersonalityCoordinationTester();
      
      // Mock to force failure
      jest.spyOn(failingTester as any, 'invokeAgent').mockRejectedValueOnce(
        new Error('Agent timeout')
      );

      const result = await failingTester.testPersonalityConsistency(testUserId, testCharacterId);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toMatchObject({
        timestamp: expect.any(Date),
        agentId: expect.any(String),
        errorType: expect.any(String),
        message: expect.stringContaining('Agent timeout'),
        severity: expect.stringMatching(/low|medium|high|critical/)
      });
      expect(result.passed).toBe(false);
    });

    it('should continue testing despite individual agent failures', async () => {
      const result = await tester.testMultiAgentCoordination(testUserId, testCharacterId);

      // Even with potential failures, should complete test
      expect(result.timestamp).toBeDefined();
      expect(result.totalDuration).toBeGreaterThan(0);
    });
  });

  describe('Personality Metrics Validation', () => {
    it('should validate all personality metrics are within valid ranges', async () => {
      const result = await tester.testPersonalityConsistency(testUserId, testCharacterId);

      // All scores should be 0-100
      expect(result.personalityConsistency.consistencyScore).toBeGreaterThanOrEqual(0);
      expect(result.personalityConsistency.consistencyScore).toBeLessThanOrEqual(100);
      expect(result.personalityConsistency.emotionalCoherence).toBeGreaterThanOrEqual(0);
      expect(result.personalityConsistency.emotionalCoherence).toBeLessThanOrEqual(100);
      expect(result.personalityConsistency.narrativeAlignment).toBeGreaterThanOrEqual(0);
      expect(result.personalityConsistency.narrativeAlignment).toBeLessThanOrEqual(100);
    });

    it('should calculate trait-specific stability scores', async () => {
      const result = await tester.testPersonalityConsistency(testUserId, testCharacterId);

      const traits = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
      
      traits.forEach(trait => {
        expect(result.personalityConsistency.traitStability[trait]).toBeDefined();
        expect(result.personalityConsistency.traitStability[trait]).toBeGreaterThanOrEqual(0);
        expect(result.personalityConsistency.traitStability[trait]).toBeLessThanOrEqual(100);
      });
    });
  });
});
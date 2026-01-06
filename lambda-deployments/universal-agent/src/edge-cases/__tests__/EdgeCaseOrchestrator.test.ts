import { EdgeCaseOrchestrator } from '../EdgeCaseOrchestrator';
import { ConversationContext, UserInput, EdgeCaseType } from '../../types';

describe('EdgeCaseOrchestrator', () => {
  let orchestrator: EdgeCaseOrchestrator;
  let mockContext: ConversationContext;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      networkResilience: {
        offlineStorageLimit: 10 * 1024 * 1024, // 10MB
        syncRetryAttempts: 3,
        connectionTimeoutMs: 5000,
        qualityThresholds: {
          excellent: 100,
          good: 300,
          poor: 1000
        }
      },
      userInputHandling: {
        maxContradictionHistory: 10,
        distressAlertThreshold: 0.8,
        multiUserTimeoutMs: 5000
      },
      systemFailure: {
        healthCheckIntervalMs: 30000,
        maxFailureHistory: 50,
        degradationThresholds: {
          minimal: 1,
          moderate: 3,
          severe: 5
        }
      },
      conversationFlow: {
        maxTangentDepth: 3,
        attentionLossThreshold: 0.7,
        abandonmentTimeoutMs: 300000,
        contextBackupLimit: 5
      }
    };

    mockContext = {
      userId: 'test-user-123',
      sessionId: 'test-session-456',
      phase: 'story_building',
      currentTopic: 'adventure',
      character: {
        name: 'Luna',
        species: 'unicorn',
        age: 8,
        traits: { brave: true, magical: true }
      },
      story: {
        id: 'story-123',
        title: 'Luna\'s Adventure',
        content: 'Once upon a time...',
        type: 'adventure'
      },
      user: {
        age: 7,
        preferences: { storyType: 'adventure' }
      },
      timestamp: new Date()
    };

    orchestrator = new EdgeCaseOrchestrator(mockConfig);
  });

  afterEach(() => {
    orchestrator.destroy();
  });

  describe('Initialization', () => {
    it('should initialize all edge case handlers', () => {
      expect(orchestrator).toBeDefined();
      expect(orchestrator.getSystemHealth()).toBeDefined();
    });

    it('should initialize without errors', () => {
      const newOrchestrator = new EdgeCaseOrchestrator(mockConfig);
      expect(newOrchestrator).toBeDefined();
      newOrchestrator.destroy();
    });
  });

  describe('Network Failure Handling', () => {
    it('should handle offline network failure', async () => {
      const response = await orchestrator.handleEdgeCase(
        'network_failure',
        mockContext,
        { storyType: 'adventure', isOffline: true }
      );

      expect(response.success).toBe(true);
      expect(response.type).toBe('network_failure');
      expect(response.message).toBeDefined();
      expect(response.fallbackUsed).toBeDefined();
    });

    it('should handle poor network quality', async () => {
      const response = await orchestrator.handleEdgeCase(
        'network_failure',
        mockContext,
        { networkQuality: 'poor' }
      );

      expect(response.success).toBe(true);
      expect(response.type).toBe('network_failure');
      expect(response.action).toBe('quality_adaptation');
    });
  });

  describe('User Input Conflict Handling', () => {
    it('should handle contradictory input', async () => {
      const mockInput: UserInput = {
        text: 'Luna is a dragon',
        characterTraits: { species: 'dragon' },
        timestamp: new Date()
      };

      const response = await orchestrator.handleEdgeCase(
        'user_input_conflict',
        mockContext,
        { input: mockInput, conflictType: 'contradictory_input' }
      );

      expect(response.success).toBe(true);
      expect(response.type).toBe('user_input_conflict');
      expect(response.action).toBe('contradiction_resolved');
    });

    it('should handle ambiguous input', async () => {
      const mockInput: UserInput = {
        text: 'Make it big',
        timestamp: new Date()
      };

      const response = await orchestrator.handleEdgeCase(
        'user_input_conflict',
        mockContext,
        { input: mockInput, conflictType: 'ambiguous_input' }
      );

      expect(response.type).toBe('user_input_conflict');
      expect(response.message).toBeDefined();
      expect(response.fallbackUsed).toBeDefined();
    });

    it('should handle inappropriate content', async () => {
      const mockInput: UserInput = {
        text: 'Luna fights with a sword',
        timestamp: new Date()
      };

      const response = await orchestrator.handleEdgeCase(
        'user_input_conflict',
        mockContext,
        { input: mockInput, conflictType: 'inappropriate_content' }
      );

      expect(response.success).toBe(true);
      expect(response.type).toBe('user_input_conflict');
      expect(response.action).toBe('content_redirected');
    });
  });

  describe('System Failure Handling', () => {
    it('should handle service failure with fallback', async () => {
      const response = await orchestrator.handleEdgeCase(
        'system_failure',
        mockContext,
        { 
          serviceName: 'openai_api',
          error: new Error('API timeout')
        }
      );

      expect(response.type).toBe('system_failure');
      expect(response.action).toBe('service_recovery');
      expect(response.data.fallbackUsed).toBeDefined();
    });

    it('should handle critical system failure', async () => {
      const response = await orchestrator.handleEdgeCase(
        'system_failure',
        mockContext,
        { 
          serviceName: 'supabase_db',
          error: new Error('Database connection failed')
        }
      );

      expect(response.type).toBe('system_failure');
      expect(response.message).toBeDefined();
    });
  });

  describe('Conversation Interruption Handling', () => {
    it('should handle minor interruption', async () => {
      const response = await orchestrator.handleEdgeCase(
        'conversation_interruption',
        mockContext,
        { 
          interruptionSignal: {
            source: 'user_command',
            severity: 'minor',
            duration: 5000
          }
        }
      );

      expect(response.success).toBe(true);
      expect(response.type).toBe('conversation_interruption');
      expect(response.action).toBe('graceful_pause');
    });

    it('should handle critical interruption', async () => {
      const response = await orchestrator.handleEdgeCase(
        'conversation_interruption',
        mockContext,
        { 
          interruptionSignal: {
            source: 'system_error',
            severity: 'critical',
            duration: 300000
          }
        }
      );

      expect(response.success).toBe(true);
      expect(response.type).toBe('conversation_interruption');
      expect(response.data).toBeDefined();
    });
  });

  describe('Data Corruption Handling', () => {
    it('should handle data corruption with recovery', async () => {
      const corruptedData = {
        character: null,
        story: 'invalid_data',
        userId: undefined
      };

      const response = await orchestrator.handleEdgeCase(
        'data_corruption',
        mockContext,
        { corruptedData }
      );

      expect(response.type).toBe('data_corruption');
      expect(response.action).toBe('data_recovery');
      expect(response.data.recoveryMethod).toBeDefined();
    });
  });

  describe('Resource Constraint Handling', () => {
    it('should handle resource constraints with optimization', async () => {
      const constraints = [
        {
          resourceType: 'memory',
          currentUsage: 900,
          limit: 1000,
          utilizationPercent: 90,
          criticalThreshold: 80
        }
      ];

      const response = await orchestrator.handleEdgeCase(
        'resource_constraint',
        mockContext,
        { constraints }
      );

      expect(response.success).toBe(true);
      expect(response.type).toBe('resource_constraint');
      expect(response.action).toBe('resource_optimization');
      expect(response.data.prioritizedOperations).toBeDefined();
    });
  });

  describe('Multi-User Conflict Handling', () => {
    it('should handle multi-user conflict with queue resolution', async () => {
      const users = ['user1', 'user2', 'user3'];
      const inputs: UserInput[] = [
        { text: 'Make Luna fly', timestamp: new Date() },
        { text: 'Make Luna swim', timestamp: new Date() },
        { text: 'Make Luna run', timestamp: new Date() }
      ];

      const response = await orchestrator.handleEdgeCase(
        'multi_user_conflict',
        mockContext,
        { users, inputs }
      );

      expect(response.success).toBe(true);
      expect(response.type).toBe('multi_user_conflict');
      expect(response.action).toBe('conflict_resolution');
      expect(response.message).toBeDefined();
    });
  });

  describe('Attention Loss Handling', () => {
    it('should handle attention loss with recovery strategy', async () => {
      const behaviorSignals = [
        { type: 'delayed_response', confidence: 0.8 },
        { type: 'short_responses', confidence: 0.6 }
      ];

      const response = await orchestrator.handleEdgeCase(
        'attention_loss',
        mockContext,
        { behaviorSignals }
      );

      expect(response.success).toBe(true);
      expect(response.type).toBe('attention_loss');
      expect(response.action).toBe('attention_recovery');
      expect(response.data.attentionLoss).toBeDefined();
    });

    it('should handle no attention loss detected', async () => {
      const behaviorSignals: any[] = [];

      const response = await orchestrator.handleEdgeCase(
        'attention_loss',
        mockContext,
        { behaviorSignals }
      );

      expect(response.success).toBe(true);
      expect(response.action).toBe('no_attention_loss');
      expect(response.data.attentionLevel).toBe('normal');
    });
  });

  describe('Generic Edge Case Handling', () => {
    it('should handle unknown edge case types', async () => {
      const response = await orchestrator.handleEdgeCase(
        'generic' as EdgeCaseType,
        mockContext,
        { unknownData: 'test' }
      );

      expect(response.success).toBe(true);
      expect(response.type).toBe('generic');
      expect(response.action).toBe('generic_handling');
      expect(response.fallbackUsed).toBe('generic_fallback');
    });
  });

  describe('Conversation Resumption', () => {
    it('should resume conversation after interruption', async () => {
      // First create an interruption
      await orchestrator.handleEdgeCase(
        'conversation_interruption',
        mockContext,
        { 
          interruptionSignal: {
            source: 'user_command',
            severity: 'minor'
          }
        }
      );

      // Then resume
      const resumption = await orchestrator.resumeConversation(
        mockContext.userId,
        mockContext
      );

      expect(resumption.resumptionPrompt).toBeDefined();
      expect(typeof resumption.contextRestored).toBe('boolean');
    });
  });

  describe('Session Management', () => {
    it('should detect abandoned sessions', () => {
      const hasAbandoned = orchestrator.hasAbandonedSession('non-existent-user');
      expect(hasAbandoned).toBe(false);
    });

    it('should get resumption prompt for abandoned session', () => {
      const prompt = orchestrator.getResumptionPrompt('non-existent-user');
      expect(prompt).toBeNull();
    });
  });

  describe('System Health and Metrics', () => {
    it('should return system health status', () => {
      const health = orchestrator.getSystemHealth();
      
      expect(health).toBeDefined();
      expect(health.network).toBeDefined();
      expect(health.systemHealth).toBeDefined();
    });

    it('should return edge case metrics', () => {
      const metrics = orchestrator.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics.networkIssues).toBe('number');
      expect(typeof metrics.userInputConflicts).toBe('number');
      expect(typeof metrics.systemFailures).toBe('number');
      expect(typeof metrics.conversationInterruptions).toBe('number');
      expect(typeof metrics.totalRecoveries).toBe('number');
      expect(typeof metrics.successRate).toBe('number');
    });

    it('should return user-specific edge case history', () => {
      const history = orchestrator.getUserEdgeCaseHistory(mockContext.userId);
      
      expect(history).toBeDefined();
      expect(history.contradictions).toBeDefined();
      expect(history.distressPatterns).toBeDefined();
      expect(history.tangentHistory).toBeDefined();
      expect(history.attentionPatterns).toBeDefined();
    });

    it('should perform comprehensive health check', async () => {
      const healthCheck = await orchestrator.performHealthCheck();
      
      expect(healthCheck.overall).toMatch(/healthy|degraded|critical/);
      expect(healthCheck.components).toBeDefined();
      expect(Array.isArray(healthCheck.recommendations)).toBe(true);
    });
  });

  describe('Data Privacy and Cleanup', () => {
    it('should clear user data for privacy compliance', () => {
      orchestrator.clearUserData(mockContext.userId);
      
      const history = orchestrator.getUserEdgeCaseHistory(mockContext.userId);
      expect(history.contradictions).toHaveLength(0);
      expect(history.distressPatterns).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', () => {
      const invalidConfig = null as any;
      
      expect(() => {
        new EdgeCaseOrchestrator(invalidConfig);
      }).toThrow();
    });

    it('should return fallback response on handler failure', async () => {
      // Mock a handler failure by passing invalid data
      const response = await orchestrator.handleEdgeCase(
        'system_failure',
        mockContext,
        null // Invalid data that should cause an error
      );

      expect(response.success).toBe(false);
      expect(response.action).toBe('fallback');
      expect(response.fallbackUsed).toBe('emergency_fallback');
    });
  });

  describe('Event Emission', () => {
    it('should emit events for edge case handling', (done) => {
      orchestrator.on('edgeCaseHandled', (event) => {
        expect(event.type).toBe('network_failure');
        expect(event.success).toBe(true);
        expect(typeof event.duration).toBe('number');
        done();
      });

      orchestrator.handleEdgeCase(
        'network_failure',
        mockContext,
        { storyType: 'adventure' }
      );
    });

    it('should emit network status change events', (done) => {
      orchestrator.on('networkStatusChanged', (event) => {
        expect(event.status).toMatch(/online|offline/);
        done();
      });

      // Trigger a network event (this would normally come from the network manager)
      // For testing, we'll emit it directly
      orchestrator.emit('networkStatusChanged', { status: 'online' });
    });
  });

  describe('Age-Appropriate Responses', () => {
    it('should provide age-appropriate messages for young children', async () => {
      const youngChildContext = {
        ...mockContext,
        user: { age: 4 }
      };

      const response = await orchestrator.handleEdgeCase(
        'system_failure',
        youngChildContext,
        { 
          serviceName: 'openai_api',
          error: new Error('API timeout')
        }
      );

      expect(response.message).toBeDefined();
      // Young children should get simpler, more reassuring messages
      expect(response.message.length).toBeLessThan(100);
    });

    it('should provide age-appropriate messages for older children', async () => {
      const olderChildContext = {
        ...mockContext,
        user: { age: 10 }
      };

      const response = await orchestrator.handleEdgeCase(
        'system_failure',
        olderChildContext,
        { 
          serviceName: 'openai_api',
          error: new Error('API timeout')
        }
      );

      expect(response.message).toBeDefined();
      // Older children can handle more detailed explanations
    });
  });

  describe('Concurrent Edge Case Handling', () => {
    it('should handle multiple edge cases concurrently', async () => {
      const promises = [
        orchestrator.handleEdgeCase('network_failure', mockContext, { storyType: 'adventure' }),
        orchestrator.handleEdgeCase('attention_loss', mockContext, { behaviorSignals: [] }),
        orchestrator.handleEdgeCase('generic', mockContext, { test: 'data' })
      ];

      const responses = await Promise.all(promises);
      
      expect(responses).toHaveLength(3);
      responses.forEach(response => {
        expect(response.success).toBe(true);
        expect(response.type).toBeDefined();
      });
    });
  });

  describe('Resource Cleanup', () => {
    it('should clean up resources on destroy', () => {
      const spy = jest.spyOn(orchestrator, 'removeAllListeners');
      
      orchestrator.destroy();
      
      expect(spy).toHaveBeenCalled();
    });
  });
});
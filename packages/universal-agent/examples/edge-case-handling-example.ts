import { EdgeCaseOrchestrator, EdgeCaseConfig } from '../src/edge-cases';
import { ConversationContext, UserInput } from '../src/types';

/**
 * Example: Comprehensive Edge Case Handling in Storytailor
 * 
 * This example demonstrates how to use the EdgeCaseOrchestrator to handle
 * various edge cases that can occur during storytelling conversations.
 */

// Configuration for edge case handling
const edgeCaseConfig: EdgeCaseConfig = {
  networkResilience: {
    offlineStorageLimit: 50 * 1024 * 1024, // 50MB
    syncRetryAttempts: 3,
    connectionTimeoutMs: 5000,
    qualityThresholds: {
      excellent: 100,   // <100ms latency
      good: 300,        // <300ms latency
      poor: 1000        // <1000ms latency
    }
  },
  userInputHandling: {
    maxContradictionHistory: 20,
    distressAlertThreshold: 0.8,
    multiUserTimeoutMs: 5000
  },
  systemFailure: {
    healthCheckIntervalMs: 30000,
    maxFailureHistory: 100,
    degradationThresholds: {
      minimal: 1,
      moderate: 3,
      severe: 5
    }
  },
  conversationFlow: {
    maxTangentDepth: 3,
    attentionLossThreshold: 0.7,
    abandonmentTimeoutMs: 300000, // 5 minutes
    contextBackupLimit: 10
  }
};

// Initialize the orchestrator
const orchestrator = new EdgeCaseOrchestrator(edgeCaseConfig);

// Example conversation context
const conversationContext: ConversationContext = {
  userId: 'child-user-123',
  sessionId: 'story-session-456',
  phase: 'character_creation',
  currentTopic: 'magical_unicorn',
  character: {
    name: 'Sparkle',
    species: 'unicorn',
    age: 6,
    traits: { magical: true, kind: true, brave: false }
  },
  story: {
    id: 'story-789',
    title: 'Sparkle\'s Magical Adventure',
    content: 'Once upon a time, there was a young unicorn named Sparkle...',
    type: 'bedtime'
  },
  user: {
    age: 5,
    preferences: { storyType: 'bedtime', voiceSpeed: 'slow' }
  },
  timestamp: new Date()
};

/**
 * Example 1: Handling Network Failures
 */
async function handleNetworkFailureExample() {
  console.log('=== Network Failure Handling Example ===');
  
  try {
    // Simulate network failure
    const response = await orchestrator.handleEdgeCase(
      'network_failure',
      conversationContext,
      { 
        storyType: 'bedtime',
        isOffline: true,
        lastKnownQuality: 'poor'
      }
    );

    console.log('Network failure handled:', {
      success: response.success,
      action: response.action,
      message: response.message,
      fallbackUsed: response.fallbackUsed
    });

    // Check if offline story generation is available
    if (response.data?.story) {
      console.log('Offline story generated:', response.data.story.title);
    }

  } catch (error) {
    console.error('Network failure handling failed:', error);
  }
}

/**
 * Example 2: Handling Contradictory User Input
 */
async function handleContradictoryInputExample() {
  console.log('\n=== Contradictory Input Handling Example ===');
  
  // User previously said unicorn, now says dragon
  const contradictoryInput: UserInput = {
    text: 'Actually, Sparkle is a dragon, not a unicorn',
    characterTraits: { species: 'dragon' },
    timestamp: new Date()
  };

  try {
    const response = await orchestrator.handleEdgeCase(
      'user_input_conflict',
      conversationContext,
      { 
        input: contradictoryInput,
        conflictType: 'contradictory_input'
      }
    );

    console.log('Contradiction handled:', {
      success: response.success,
      message: response.message,
      strategy: response.data?.resolution?.strategy
    });

  } catch (error) {
    console.error('Contradiction handling failed:', error);
  }
}

/**
 * Example 3: Handling System Failures with Graceful Degradation
 */
async function handleSystemFailureExample() {
  console.log('\n=== System Failure Handling Example ===');
  
  try {
    // Simulate OpenAI API failure
    const response = await orchestrator.handleEdgeCase(
      'system_failure',
      conversationContext,
      {
        serviceName: 'openai_api',
        error: new Error('API rate limit exceeded')
      }
    );

    console.log('System failure handled:', {
      success: response.success,
      message: response.message,
      fallbackUsed: response.fallbackUsed,
      degradedCapabilities: response.data?.degradedCapabilities
    });

  } catch (error) {
    console.error('System failure handling failed:', error);
  }
}

/**
 * Example 4: Handling Conversation Interruptions
 */
async function handleConversationInterruptionExample() {
  console.log('\n=== Conversation Interruption Handling Example ===');
  
  try {
    // Simulate external interruption (doorbell, phone call, etc.)
    const response = await orchestrator.handleEdgeCase(
      'conversation_interruption',
      conversationContext,
      {
        interruptionSignal: {
          source: 'external_event',
          severity: 'moderate',
          duration: 30000, // 30 seconds
          type: 'doorbell'
        }
      }
    );

    console.log('Interruption handled:', {
      success: response.success,
      message: response.message,
      canResume: response.data?.canResume
    });

    // Later, resume the conversation
    if (response.data?.canResume) {
      const resumption = await orchestrator.resumeConversation(
        conversationContext.userId,
        conversationContext
      );
      
      console.log('Conversation resumed:', {
        prompt: resumption.resumptionPrompt,
        contextRestored: resumption.contextRestored
      });
    }

  } catch (error) {
    console.error('Interruption handling failed:', error);
  }
}

/**
 * Example 5: Handling Attention Loss
 */
async function handleAttentionLossExample() {
  console.log('\n=== Attention Loss Handling Example ===');
  
  try {
    // Simulate attention loss signals
    const behaviorSignals = [
      { type: 'delayed_response', confidence: 0.8, duration: 15000 },
      { type: 'short_responses', confidence: 0.6, pattern: 'yes', 'no', 'ok' },
      { type: 'distraction_words', confidence: 0.7, words: ['toy', 'outside'] }
    ];

    const response = await orchestrator.handleEdgeCase(
      'attention_loss',
      conversationContext,
      { behaviorSignals }
    );

    console.log('Attention loss handled:', {
      success: response.success,
      message: response.message,
      recoveryStrategy: response.data?.attentionLoss?.recoveryStrategy
    });

  } catch (error) {
    console.error('Attention loss handling failed:', error);
  }
}

/**
 * Example 6: Handling Multi-User Conflicts
 */
async function handleMultiUserConflictExample() {
  console.log('\n=== Multi-User Conflict Handling Example ===');
  
  try {
    // Simulate multiple children trying to control the story
    const users = ['child1', 'child2', 'child3'];
    const inputs: UserInput[] = [
      { text: 'Make Sparkle fly to the moon!', timestamp: new Date() },
      { text: 'No, make Sparkle swim in the ocean!', timestamp: new Date() },
      { text: 'Sparkle should find treasure!', timestamp: new Date() }
    ];

    const response = await orchestrator.handleEdgeCase(
      'multi_user_conflict',
      conversationContext,
      { users, inputs }
    );

    console.log('Multi-user conflict handled:', {
      success: response.success,
      message: response.message,
      resolution: response.data?.conflict?.resolution
    });

  } catch (error) {
    console.error('Multi-user conflict handling failed:', error);
  }
}

/**
 * Example 7: Handling Inappropriate Content
 */
async function handleInappropriateContentExample() {
  console.log('\n=== Inappropriate Content Handling Example ===');
  
  try {
    const inappropriateInput: UserInput = {
      text: 'Sparkle should fight the monster with a sword and hurt it badly',
      timestamp: new Date()
    };

    const response = await orchestrator.handleEdgeCase(
      'user_input_conflict',
      conversationContext,
      {
        input: inappropriateInput,
        conflictType: 'inappropriate_content'
      }
    );

    console.log('Inappropriate content handled:', {
      success: response.success,
      message: response.message,
      alternativeContent: response.data?.alternativeContent?.text
    });

  } catch (error) {
    console.error('Inappropriate content handling failed:', error);
  }
}

/**
 * Example 8: Monitoring System Health
 */
async function monitorSystemHealthExample() {
  console.log('\n=== System Health Monitoring Example ===');
  
  try {
    // Get current system health
    const health = orchestrator.getSystemHealth();
    console.log('Current system health:', {
      network: health.network,
      degradationLevel: health.degradationLevel,
      activeFailures: health.activeFailures?.length || 0
    });

    // Perform comprehensive health check
    const healthCheck = await orchestrator.performHealthCheck();
    console.log('Health check results:', {
      overall: healthCheck.overall,
      components: healthCheck.components,
      recommendations: healthCheck.recommendations
    });

    // Get edge case metrics
    const metrics = orchestrator.getMetrics();
    console.log('Edge case metrics:', {
      totalRecoveries: metrics.totalRecoveries,
      successRate: `${(metrics.successRate * 100).toFixed(1)}%`,
      networkIssues: metrics.networkIssues,
      userInputConflicts: metrics.userInputConflicts
    });

  } catch (error) {
    console.error('Health monitoring failed:', error);
  }
}

/**
 * Example 9: Event Handling
 */
function setupEventHandlingExample() {
  console.log('\n=== Event Handling Setup Example ===');
  
  // Listen for various edge case events
  orchestrator.on('networkStatusChanged', (event) => {
    console.log(`Network status changed to: ${event.status}`);
  });

  orchestrator.on('emotionalDistressDetected', (event) => {
    console.log(`Emotional distress detected for user ${event.userId}`);
    console.log(`Severity: ${event.signal.severity}`);
    // Could trigger parental notification here
  });

  orchestrator.on('conversationAbandoned', (event) => {
    console.log(`Conversation abandoned by user ${event.userId}`);
    console.log(`Type: ${event.abandonment.abandonmentType}`);
  });

  orchestrator.on('systemDegradationChanged', (event) => {
    console.log(`System degradation level: ${event.level}`);
    console.log(`Available capabilities: ${event.capabilities.join(', ')}`);
  });

  orchestrator.on('edgeCaseHandled', (event) => {
    console.log(`Edge case handled: ${event.type} (${event.success ? 'success' : 'failed'})`);
    console.log(`Duration: ${event.duration}ms`);
  });

  console.log('Event listeners set up successfully');
}

/**
 * Example 10: Privacy-Compliant Data Management
 */
function privacyComplianceExample() {
  console.log('\n=== Privacy Compliance Example ===');
  
  const userId = conversationContext.userId;
  
  // Get user's edge case history
  const userHistory = orchestrator.getUserEdgeCaseHistory(userId);
  console.log('User edge case history:', {
    contradictions: userHistory.contradictions.length,
    distressPatterns: userHistory.distressPatterns.length,
    tangentHistory: userHistory.tangentHistory.length,
    attentionPatterns: userHistory.attentionPatterns.length
  });

  // Clear user data for privacy compliance (e.g., when user deletes account)
  orchestrator.clearUserData(userId);
  console.log('User data cleared for privacy compliance');

  // Verify data is cleared
  const clearedHistory = orchestrator.getUserEdgeCaseHistory(userId);
  console.log('Verified data cleared:', {
    contradictions: clearedHistory.contradictions.length,
    distressPatterns: clearedHistory.distressPatterns.length
  });
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('🎭 Storytailor Edge Case Handling Examples\n');
  
  // Setup event handling first
  setupEventHandlingExample();
  
  // Run edge case handling examples
  await handleNetworkFailureExample();
  await handleContradictoryInputExample();
  await handleSystemFailureExample();
  await handleConversationInterruptionExample();
  await handleAttentionLossExample();
  await handleMultiUserConflictExample();
  await handleInappropriateContentExample();
  
  // Monitor system health
  await monitorSystemHealthExample();
  
  // Demonstrate privacy compliance
  privacyComplianceExample();
  
  console.log('\n✅ All edge case handling examples completed!');
  
  // Clean up
  orchestrator.destroy();
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  runAllExamples,
  handleNetworkFailureExample,
  handleContradictoryInputExample,
  handleSystemFailureExample,
  handleConversationInterruptionExample,
  handleAttentionLossExample,
  handleMultiUserConflictExample,
  handleInappropriateContentExample,
  monitorSystemHealthExample,
  setupEventHandlingExample,
  privacyComplianceExample
};
import { Router } from '../src/Router';
import { ConversationInterruptionHandler, InterruptionType } from '../src/services/ConversationInterruptionHandler';
import { ConversationPhase, IntentType, StoryType } from '../src/types';
import { createLogger } from 'winston';

/**
 * Example demonstrating conversation interruption handling and recovery
 */
async function demonstrateConversationInterruption() {
  const logger = createLogger({
    level: 'info',
    format: require('winston').format.simple(),
    transports: [new (require('winston').transports.Console)()],
  });

  // Mock configuration
  const config = {
    openai: {
      apiKey: 'mock-key',
      model: 'gpt-4',
      maxTokens: 1000,
      temperature: 0.7,
    },
    redis: {
      url: 'redis://localhost:6379',
      keyPrefix: 'storytailor',
      defaultTtl: 3600,
    },
    agents: {
      content: {
        endpoint: 'http://localhost:3001',
        timeout: 5000,
        retries: 3,
      },
      auth: {
        endpoint: 'http://localhost:3002',
        timeout: 5000,
        retries: 3,
      },
    },
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 60000,
      monitoringPeriod: 300000,
    },
    fallback: {
      enabled: true,
      defaultResponse: 'I\'m having trouble right now. Please try again.',
      maxRetries: 3,
    },
  };

  const router = new Router(config, logger);

  try {
    console.log('🚀 Initializing Router with interruption handling...');
    await router.initialize();

    // Simulate a conversation in progress
    console.log('\n📖 Starting story creation conversation...');
    const turnContext1 = {
      userId: 'user-123',
      sessionId: 'session-456',
      requestId: 'req-1',
      userInput: 'Let\'s create a bedtime story about a unicorn',
      channel: 'alexa' as const,
      locale: 'en-US',
      timestamp: new Date().toISOString(),
      conversationPhase: ConversationPhase.CHARACTER_CREATION,
    };

    // Process first turn (would normally call router.route)
    console.log('User:', turnContext1.userInput);
    console.log('Agent: Great! Let\'s create a magical bedtime story. What\'s your unicorn\'s name?');

    // Create a checkpoint at this critical moment
    console.log('\n💾 Creating checkpoint at character creation phase...');
    await router.createCheckpoint(
      turnContext1.userId,
      turnContext1.sessionId,
      {
        deviceId: 'echo-dot-123',
        deviceType: 'voice',
        capabilities: ['voice'],
      }
    );

    // Simulate an interruption (user stops conversation)
    console.log('\n⚠️  Conversation interrupted - user stopped...');
    const interruption = await router.handleInterruption(
      turnContext1.sessionId,
      turnContext1.userId,
      InterruptionType.USER_STOP,
      {
        lastUserInput: 'Her name is Luna',
        partialResponse: 'Luna is a beautiful name! What color is...',
      }
    );

    console.log('Interruption handled:', {
      interruptionId: interruption.interruptionId,
      type: interruption.interruptionType,
      resumptionPrompt: interruption.resumptionPrompt.substring(0, 100) + '...',
    });

    // Simulate user returning later
    console.log('\n🔄 User returns - attempting recovery...');
    const returnContext = {
      userId: 'user-123',
      sessionId: 'session-789', // New session
      requestId: 'req-2',
      userInput: 'Continue my story',
      channel: 'alexa' as const,
      locale: 'en-US',
      timestamp: new Date().toISOString(),
    };

    const recovery = await router.recoverFromInterruption(
      interruption.interruptionId,
      returnContext
    );

    if (recovery.success) {
      console.log('✅ Recovery successful!');
      console.log('Resumption prompt:', recovery.customerResponse?.message);
      console.log('Conversation phase:', recovery.customerResponse?.conversationPhase);
    } else {
      console.log('❌ Recovery failed:', recovery.error);
    }

    // Demonstrate multi-user context separation
    console.log('\n👥 Demonstrating multi-user context separation...');
    
    const userContexts = {
      'user-123': {
        personalContext: {
          conversationPhase: ConversationPhase.STORY_BUILDING,
          currentStoryId: 'story-luna-unicorn',
          storyType: StoryType.BEDTIME,
        },
        storyPreferences: { genre: 'fantasy', mood: 'calm' },
        emotionalState: { mood: 'happy', energy: 'low' },
      },
      'user-456': {
        personalContext: {
          conversationPhase: ConversationPhase.CHARACTER_CREATION,
          storyType: StoryType.ADVENTURE,
        },
        storyPreferences: { genre: 'adventure', mood: 'exciting' },
        emotionalState: { mood: 'excited', energy: 'high' },
      },
    };

    await router.separateUserContext(
      'shared-session-789',
      'user-123',
      ['user-123', 'user-456'],
      userContexts
    );

    console.log('User contexts separated for shared device');

    // Demonstrate user context switching
    console.log('\n🔄 Switching from user-123 to user-456...');
    
    // This would normally come from the conversation state manager
    const mockMemoryState = {
      userId: 'user-123',
      sessionId: 'shared-session-789',
      conversationPhase: ConversationPhase.STORY_BUILDING,
      currentStoryId: 'story-luna-unicorn',
      storyType: StoryType.BEDTIME,
      lastIntent: IntentType.CONTINUE_STORY,
      context: {
        activeUsers: ['user-123', 'user-456'],
        userSeparation: userContexts,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
    };

    const switchResult = await router.switchUserContext(
      'shared-session-789',
      'user-123',
      'user-456'
    );

    if (switchResult.success) {
      console.log('✅ User context switched successfully!');
      console.log('New user message:', switchResult.customerResponse?.message);
      console.log('New conversation phase:', switchResult.customerResponse?.conversationPhase);
    } else {
      console.log('❌ User context switch failed:', switchResult.error);
    }

    console.log('\n🎉 Conversation interruption handling demonstration complete!');

  } catch (error) {
    console.error('❌ Error during demonstration:', error);
  } finally {
    console.log('\n🛑 Shutting down router...');
    await router.shutdown();
  }
}

/**
 * Example of handling different interruption types
 */
async function demonstrateInterruptionTypes() {
  console.log('\n📋 Demonstrating different interruption types...');

  const interruptionTypes = [
    {
      type: InterruptionType.DEVICE_SWITCH,
      description: 'User switches from Echo Dot to Echo Show',
      context: { fromDevice: 'echo-dot', toDevice: 'echo-show' },
    },
    {
      type: InterruptionType.NETWORK_LOSS,
      description: 'Network connection lost during story creation',
      context: { connectionLost: true, duration: 30000 },
    },
    {
      type: InterruptionType.SYSTEM_ERROR,
      description: 'System error during asset generation',
      context: { errorType: 'asset_generation_failed', retryable: true },
    },
    {
      type: InterruptionType.TIMEOUT,
      description: 'User inactive for extended period',
      context: { inactivityDuration: 300000 },
    },
    {
      type: InterruptionType.MULTI_USER_SWITCH,
      description: 'Different family member takes over conversation',
      context: { fromUser: 'parent', toUser: 'child' },
    },
  ];

  interruptionTypes.forEach((interruption, index) => {
    console.log(`${index + 1}. ${interruption.type.toUpperCase()}`);
    console.log(`   Description: ${interruption.description}`);
    console.log(`   Context: ${JSON.stringify(interruption.context)}`);
    console.log('');
  });
}

// Run the demonstration
if (require.main === module) {
  demonstrateConversationInterruption()
    .then(() => demonstrateInterruptionTypes())
    .catch(console.error);
}

export {
  demonstrateConversationInterruption,
  demonstrateInterruptionTypes,
};
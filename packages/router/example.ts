/**
 * Router Example
 * Demonstrates intent classification and agent delegation for storytelling conversations
 */

import { Router, createDefaultConfig, TurnContext, IntentType, ConversationPhase } from './src';
import * as winston from 'winston';

// Create logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [new winston.transports.Console()],
});

async function main() {
  console.log('🤖 Router Example - Storytailor Multi-Agent Platform\n');

  try {
    // Load configuration
    const config = createDefaultConfig();
    
    // Create router
    const router = new Router(config, logger);

    // Set up event listeners
    router.on('turn_completed', (data) => {
      console.log(`✅ Turn completed: ${data.intent.type} → ${data.agentResponse.agentName} (${data.processingTime}ms)`);
    });

    router.on('turn_failed', (data) => {
      console.log(`❌ Turn failed: ${data.error.message} (${data.processingTime}ms)`);
    });

    // Initialize the router
    console.log('Initializing router...');
    await router.initialize();
    console.log('✅ Router initialized successfully\n');

    // Example 1: Story creation intent
    console.log('📚 Example 1: Story Creation Intent');
    console.log('=' .repeat(50));
    
    const storyCreationTurn: TurnContext = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      sessionId: 'alexa_session_001',
      requestId: 'req_001',
      userInput: "Let's create a bedtime story about a magical unicorn!",
      channel: 'alexa',
      locale: 'en-US',
      deviceType: 'voice',
      timestamp: new Date().toISOString(),
    };

    const storyResponse = await router.route(storyCreationTurn);
    
    console.log('📊 Story Creation Response:');
    console.log(`   Success: ${storyResponse.success}`);
    console.log(`   Message: ${storyResponse.message}`);
    console.log(`   Phase: ${storyResponse.conversationPhase}`);
    console.log(`   Next Input: ${storyResponse.nextExpectedInput}`);
    console.log(`   Should End: ${storyResponse.shouldEndSession}\n`);

    // Example 2: Character creation follow-up
    console.log('👤 Example 2: Character Creation Follow-up');
    console.log('=' .repeat(50));

    const characterTurn: TurnContext = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      sessionId: 'alexa_session_001',
      requestId: 'req_002',
      userInput: "The unicorn's name is Luna and she has a silver horn and purple mane",
      channel: 'alexa',
      locale: 'en-US',
      deviceType: 'voice',
      timestamp: new Date().toISOString(),
      conversationPhase: ConversationPhase.CHARACTER_CREATION,
    };

    const characterResponse = await router.route(characterTurn);
    
    console.log('📊 Character Creation Response:');
    console.log(`   Success: ${characterResponse.success}`);
    console.log(`   Message: ${characterResponse.message}`);
    console.log(`   Phase: ${characterResponse.conversationPhase}`);
    console.log(`   Next Input: ${characterResponse.nextExpectedInput}\n`);

    // Example 3: Library access (requires auth)
    console.log('📖 Example 3: Library Access (Auth Required)');
    console.log('=' .repeat(50));

    const libraryTurn: TurnContext = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      sessionId: 'alexa_session_002',
      requestId: 'req_003',
      userInput: "Show me my story library",
      channel: 'alexa',
      locale: 'en-US',
      deviceType: 'voice',
      timestamp: new Date().toISOString(),
    };

    const libraryResponse = await router.route(libraryTurn);
    
    console.log('📊 Library Access Response:');
    console.log(`   Success: ${libraryResponse.success}`);
    console.log(`   Message: ${libraryResponse.message}`);
    console.log(`   Error: ${libraryResponse.error || 'None'}`);
    console.log(`   Should End: ${libraryResponse.shouldEndSession}\n`);

    // Example 4: Unknown intent handling
    console.log('❓ Example 4: Unknown Intent Handling');
    console.log('=' .repeat(50));

    const unknownTurn: TurnContext = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      sessionId: 'alexa_session_003',
      requestId: 'req_004',
      userInput: "What's the weather like today?",
      channel: 'alexa',
      locale: 'en-US',
      deviceType: 'voice',
      timestamp: new Date().toISOString(),
    };

    const unknownResponse = await router.route(unknownTurn);
    
    console.log('📊 Unknown Intent Response:');
    console.log(`   Success: ${unknownResponse.success}`);
    console.log(`   Message: ${unknownResponse.message}`);
    console.log(`   Phase: ${unknownResponse.conversationPhase}`);
    console.log(`   Metadata: ${JSON.stringify(unknownResponse.metadata, null, 2)}\n`);

    // Example 5: Multi-channel support
    console.log('📱 Example 5: Multi-channel Support');
    console.log('=' .repeat(50));

    const webTurn: TurnContext = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      sessionId: 'web_session_001',
      requestId: 'req_005',
      userInput: "I want to create an educational story about space",
      channel: 'web',
      locale: 'en-US',
      deviceType: 'web',
      timestamp: new Date().toISOString(),
    };

    const webResponse = await router.route(webTurn);
    
    console.log('📊 Web Channel Response:');
    console.log(`   Success: ${webResponse.success}`);
    console.log(`   Message: ${webResponse.message}`);
    console.log(`   Display Text: ${webResponse.displayText || 'Same as message'}`);
    console.log(`   Visual Elements: ${webResponse.visualElements ? 'Present' : 'None'}\n`);

    // Example 6: Health monitoring
    console.log('🏥 Example 6: Health Monitoring');
    console.log('=' .repeat(50));

    const health = await router.getHealthStatus();
    console.log(`   Overall Status: ${getStatusEmoji(health.status)} ${health.status.toUpperCase()}`);
    console.log(`   Uptime: ${Math.floor(health.uptime)}s`);
    console.log(`   Memory Usage: ${Math.round(health.memoryUsage.heapUsed / 1024 / 1024)}MB`);
    
    console.log('   Agent Health:');
    Object.entries(health.agents).forEach(([agentName, state]) => {
      const status = (state as any).isOpen ? '🔴 CIRCUIT OPEN' : '🟢 HEALTHY';
      const failures = (state as any).failureCount || 0;
      console.log(`     ${agentName}: ${status} (${failures} failures)`);
    });

    // Example 7: Conversation summary
    console.log('\n💬 Example 7: Conversation Summary');
    console.log('=' .repeat(50));

    const summary = await router.getConversationSummary(
      '123e4567-e89b-12d3-a456-426614174000',
      'alexa_session_001'
    );

    if (summary) {
      console.log(`   Current Phase: ${summary.phase}`);
      console.log(`   Last Intent: ${summary.lastIntent}`);
      console.log(`   Duration: ${Math.floor(summary.duration / 1000)}s`);
      console.log(`   Story ID: ${summary.storyId || 'None'}`);
      console.log(`   Character ID: ${summary.characterId || 'None'}`);
    } else {
      console.log('   No active conversation found');
    }

    // Shutdown gracefully
    console.log('\n🔄 Shutting down router...');
    await router.shutdown();
    console.log('✅ Router shutdown completed');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'healthy':
      return '🟢';
    case 'degraded':
      return '🟡';
    case 'unhealthy':
      return '🔴';
    default:
      return '⚪';
  }
}

// Example of different story types and intents
async function storyTypeExamples() {
  console.log('\n📖 Story Type Classification Examples');
  console.log('=' .repeat(50));

  const config = createDefaultConfig();
  const router = new Router(config, logger);
  await router.initialize();

  const storyExamples = [
    {
      input: "I want to go on a treasure hunt adventure!",
      expectedType: "adventure",
    },
    {
      input: "Tell me a calm story to help me sleep",
      expectedType: "bedtime",
    },
    {
      input: "It's my birthday today! Can we make a party story?",
      expectedType: "birthday",
    },
    {
      input: "I want to learn about dinosaurs through a story",
      expectedType: "educational",
    },
    {
      input: "Can you teach me about saving money?",
      expectedType: "financial_literacy",
    },
    {
      input: "I'm going to the doctor tomorrow and I'm scared",
      expectedType: "medical_bravery",
    },
  ];

  for (const example of storyExamples) {
    const turnContext: TurnContext = {
      userId: 'demo-user',
      sessionId: 'demo-session',
      requestId: `demo-${Date.now()}`,
      userInput: example.input,
      channel: 'alexa',
      locale: 'en-US',
      timestamp: new Date().toISOString(),
    };

    const response = await router.route(turnContext);
    
    console.log(`Input: "${example.input}"`);
    console.log(`Expected: ${example.expectedType}`);
    console.log(`Response: ${response.message.substring(0, 80)}...`);
    console.log(`Success: ${response.success}\n`);
  }

  await router.shutdown();
}

// Run examples
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n🎉 Main examples completed successfully!');
      return storyTypeExamples();
    })
    .then(() => {
      console.log('\n✨ Router examples finished!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Example failed:', error);
      process.exit(1);
    });
}

export { main, storyTypeExamples };
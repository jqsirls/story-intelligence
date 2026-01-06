import { ContentAgent } from './src/ContentAgent';
import { ContentAgentConfig } from './src/types';

/**
 * Example demonstrating voice-driven story creation with hero's journey structure
 */
async function demonstrateStoryCreation() {
  // Initialize ContentAgent
  const config: ContentAgentConfig = {
    openaiApiKey: process.env.OPENAI_API_KEY || 'your-openai-key',
    supabaseUrl: process.env.SUPABASE_URL || 'your-supabase-url',
    supabaseKey: process.env.SUPABASE_KEY || 'your-supabase-key',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    moderationEnabled: true,
    logLevel: 'info'
  };

  const contentAgent = new ContentAgent(config);
  await contentAgent.initialize();

  try {
    console.log('🎭 Voice-Driven Story Creation Demo');
    console.log('=====================================\n');

    // 1. Start a story conversation
    console.log('1. Starting story conversation...');
    const storySession = await contentAgent.startStoryConversation(
      'user-123',
      'library-456',
      'character-789',
      'Adventure',
      6 // Age context
    );

    console.log(`✅ Story session started: ${storySession.sessionId}`);
    console.log(`📝 Agent response: "${storySession.agentResponse}"`);
    console.log(`🎯 Available choices: ${storySession.choices.length}`);
    storySession.choices.forEach((choice, index) => {
      console.log(`   ${index + 1}. ${choice.text}`);
    });
    console.log();

    // 2. Continue with user choice
    console.log('2. User selects first choice...');
    const continueResponse1 = await contentAgent.continueStoryConversation(
      storySession.sessionId,
      'I want to explore the magical forest!',
      6
    );

    console.log(`📝 Agent response: "${continueResponse1.agentResponse}"`);
    console.log(`🎯 New choices: ${continueResponse1.choices.length}`);
    continueResponse1.choices.forEach((choice, index) => {
      console.log(`   ${index + 1}. ${choice.text}`);
    });
    console.log();

    // 3. Continue story progression
    console.log('3. User makes another choice...');
    const continueResponse2 = await contentAgent.continueStoryConversation(
      storySession.sessionId,
      'Follow the sparkling lights!',
      6
    );

    console.log(`📝 Agent response: "${continueResponse2.agentResponse}"`);
    console.log(`🎯 Phase: ${continueResponse2.phase}`);
    console.log();

    // 4. Demonstrate voice editing
    console.log('4. User wants to edit the story...');
    const editResponse = await contentAgent.continueStoryConversation(
      storySession.sessionId,
      'Actually, can we make the character fly instead of walk?',
      6
    );

    console.log(`📝 Agent response: "${editResponse.agentResponse}"`);
    console.log(`🔧 Needs confirmation: ${editResponse.needsConfirmation}`);
    console.log(`🔧 Confirmation type: ${editResponse.confirmationType}`);
    console.log();

    // 5. Create a story draft directly
    console.log('5. Creating story draft with hero\'s journey...');
    const storyDraft = await contentAgent.createStoryDraft({
      characterId: 'character-789',
      storyType: 'Bedtime',
      userAge: 5,
      preferences: {
        themes: ['friendship', 'courage'],
        avoidTopics: ['scary', 'violence']
      }
    });

    console.log(`✅ Story draft created: ${storyDraft.id}`);
    console.log(`📖 Story type: ${storyDraft.storyType}`);
    console.log(`📝 Outline preview: ${storyDraft.outline.substring(0, 200)}...`);
    console.log(`🎯 Initial choices: ${storyDraft.choices.length}`);
    console.log();

    // 6. Continue story beat
    console.log('6. Continuing story beat...');
    const beatResult = await contentAgent.continueStoryBeat({
      storyId: storyDraft.id,
      userChoice: 'Let\'s meet friendly animals!',
      voiceInput: 'I want to find some animal friends in the story'
    });

    console.log(`📖 Story beat: "${beatResult.beat.content}"`);
    console.log(`🎭 Emotional tone: ${beatResult.beat.emotionalTone}`);
    console.log(`🎯 Next choices: ${beatResult.choices.length}`);
    console.log(`✅ Story complete: ${beatResult.isComplete}`);
    console.log();

    // 7. Demonstrate character change adaptation
    console.log('7. Adapting story for character changes...');
    const characterChanges = {
      characterId: 'character-789',
      from: { species: 'human', hands: true },
      to: { species: 'dog', paws: true }
    };

    const adaptationResult = await contentAgent.adaptStoryForCharacterChange(
      storyDraft.id,
      characterChanges
    );

    console.log(`🔄 Updated beats: ${adaptationResult.updatedBeats.length}`);
    console.log(`👥 Affected characters: ${adaptationResult.affectedCharacters.length}`);
    console.log(`📝 Narrative changes:`);
    adaptationResult.narrativeChanges.forEach(change => {
      console.log(`   - ${change}`);
    });
    console.log();

    // 8. Voice editing
    console.log('8. Editing story via voice command...');
    const voiceEditResult = await contentAgent.editStoryViaVoice({
      storyId: storyDraft.id,
      voiceCommand: 'Make the forest more magical with glowing flowers',
      targetBeat: 2
    });

    console.log(`🔧 Narrative changes:`);
    voiceEditResult.narrativeChanges.forEach(change => {
      console.log(`   - ${change}`);
    });
    console.log();

    // 9. Finalize story
    console.log('9. Finalizing story...');
    const finalStory = await contentAgent.finalizeStory(storyDraft.id, true);

    console.log(`✅ Story finalized: ${finalStory.id}`);
    console.log(`📚 Title: ${finalStory.title}`);
    console.log(`📊 Status: ${finalStory.status}`);
    console.log(`🎯 Age rating: ${finalStory.ageRating}`);
    console.log(`🏗️ Hero's journey structure: ${finalStory.content.heroJourneyStructure.length} beats`);
    console.log();

    // 10. Get conversation statistics
    console.log('10. Getting conversation statistics...');
    const stats = await contentAgent.getStoryConversationStats();
    console.log(`📊 Active sessions: ${stats.activeSessions}`);
    console.log(`💬 Total turns: ${stats.totalTurns}`);
    console.log(`📏 Average session length: ${stats.averageSessionLength.toFixed(1)} turns`);
    console.log();

    // Clean up
    await contentAgent.endStoryConversationSession(storySession.sessionId);
    console.log('🧹 Session cleaned up');

  } catch (error) {
    console.error('❌ Error during story creation demo:', error);
  } finally {
    await contentAgent.shutdown();
    console.log('👋 ContentAgent shutdown complete');
  }
}

/**
 * Example of hero's journey structure in story creation
 */
function demonstrateHeroJourneyStructure() {
  console.log('\n🏛️ Hero\'s Journey Structure for Children\'s Stories');
  console.log('====================================================');
  
  const heroJourneyBeats = [
    { stage: 'ordinary_world', description: 'Character\'s normal, everyday life' },
    { stage: 'call_to_adventure', description: 'Something exciting happens that starts the adventure' },
    { stage: 'refusal_of_call', description: 'Character feels scared or unsure about the adventure' },
    { stage: 'meeting_mentor', description: 'A wise friend or helper appears to guide them' },
    { stage: 'crossing_threshold', description: 'Character decides to begin the adventure' },
    { stage: 'tests_allies_enemies', description: 'Character faces challenges and meets friends and foes' },
    { stage: 'approach_inmost_cave', description: 'Character prepares for the biggest challenge' },
    { stage: 'ordeal', description: 'The most difficult and exciting part of the adventure' },
    { stage: 'reward', description: 'Character succeeds and gains something valuable' },
    { stage: 'road_back', description: 'Character begins the journey home' },
    { stage: 'resurrection', description: 'Character faces one final test and grows stronger' },
    { stage: 'return_elixir', description: 'Character returns home changed and wiser' }
  ];

  heroJourneyBeats.forEach((beat, index) => {
    console.log(`${index + 1:2}. ${beat.stage.replace(/_/g, ' ').toUpperCase()}`);
    console.log(`    ${beat.description}`);
  });

  console.log('\n💡 This structure ensures every story has:');
  console.log('   • A relatable beginning');
  console.log('   • Meaningful challenges');
  console.log('   • Character growth');
  console.log('   • A satisfying conclusion');
  console.log('   • Award-winning narrative quality');
}

/**
 * Example of voice conversation flow
 */
function demonstrateVoiceConversationFlow() {
  console.log('\n🎤 Voice Conversation Flow Example');
  console.log('===================================');
  
  const conversationExample = [
    {
      speaker: 'Agent',
      text: 'Hi there, amazing storyteller! I\'m so excited to create an adventure story with you! I can see you\'ve created an amazing character. Let\'s start our adventure! Here are some ways we could begin our story. Which one sounds most exciting to you?',
      choices: [
        'Explore the magical forest',
        'Meet friendly animals', 
        'Find hidden treasure'
      ]
    },
    {
      speaker: 'Child',
      text: 'I want to explore the magical forest!',
      choice_selected: 1
    },
    {
      speaker: 'Agent',
      text: 'As you step into the magical forest, you see sparkling lights dancing between the ancient trees. The air smells like flowers and adventure! Suddenly, you hear a gentle rustling in the bushes nearby. What would you like to do next?',
      choices: [
        'Follow the sparkling lights',
        'Investigate the rustling bushes',
        'Call out "Hello, is anyone there?"'
      ]
    },
    {
      speaker: 'Child',
      text: 'Actually, can we make my character fly instead of walk?',
      edit_request: true
    },
    {
      speaker: 'Agent',
      text: 'Perfect! I\'ve made those changes to your story! Now your character can fly through the magical forest with beautiful wings. How does that sound? Should we continue with the story, or would you like to make any other changes?',
      confirmation_needed: true
    },
    {
      speaker: 'Child',
      text: 'That\'s perfect! Let\'s continue!',
      confirmed: true
    }
  ];

  conversationExample.forEach((turn, index) => {
    console.log(`\n${index + 1}. ${turn.speaker}:`);
    console.log(`   "${turn.text}"`);
    
    if (turn.choices) {
      console.log('   Choices:');
      turn.choices.forEach((choice, i) => {
        console.log(`     ${i + 1}. ${choice}`);
      });
    }
    
    if (turn.choice_selected) {
      console.log(`   [Selected choice ${turn.choice_selected}]`);
    }
    
    if (turn.edit_request) {
      console.log('   [Edit request detected]');
    }
    
    if (turn.confirmation_needed) {
      console.log('   [Confirmation needed]');
    }
    
    if (turn.confirmed) {
      console.log('   [Confirmed - continuing story]');
    }
  });

  console.log('\n💡 Key Features:');
  console.log('   • Natural voice interaction');
  console.log('   • Real-time story adaptation');
  console.log('   • Choose-your-adventure style');
  console.log('   • Voice-based editing');
  console.log('   • Age-appropriate language');
  console.log('   • Confirmation-based finalization');
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateHeroJourneyStructure();
  demonstrateVoiceConversationFlow();
  
  // Uncomment to run the full demo (requires valid API keys)
  // demonstrateStoryCreation().catch(console.error);
}

export {
  demonstrateStoryCreation,
  demonstrateHeroJourneyStructure,
  demonstrateVoiceConversationFlow
};
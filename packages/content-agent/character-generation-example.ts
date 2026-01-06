/**
 * Example usage of the voice-driven character generation system
 * This demonstrates the complete flow from conversation to character creation
 */

import { ContentAgent } from './src/ContentAgent';
import { ContentAgentConfig } from './src/types';

// Example configuration
const config: ContentAgentConfig = {
  openaiApiKey: process.env.OPENAI_API_KEY || 'your-openai-key',
  supabaseUrl: process.env.SUPABASE_URL || 'your-supabase-url',
  supabaseKey: process.env.SUPABASE_ANON_KEY || 'your-supabase-key',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  moderationEnabled: true,
  logLevel: 'info'
};

async function demonstrateCharacterGeneration() {
  const contentAgent = new ContentAgent(config);
  await contentAgent.initialize();

  console.log('🎭 Voice-Driven Character Generation Demo\n');

  try {
    // 1. Start a character conversation
    console.log('1. Starting character conversation...');
    const conversationStart = await contentAgent.startCharacterConversation(
      'user_123',
      'library_456',
      8 // Child's age context
    );
    
    console.log(`Assistant: ${conversationStart.response}`);
    console.log(`Phase: ${conversationStart.phase}`);
    console.log(`Suggested questions: ${conversationStart.suggestedQuestions?.join(', ')}\n`);

    // 2. Simulate user providing character name and age
    console.log('2. User provides character name and age...');
    const nameResponse = await contentAgent.continueCharacterConversation(
      conversationStart.sessionId,
      "I want to create a character named Luna who is 7 years old",
      8
    );
    
    console.log(`Assistant: ${nameResponse.response}`);
    console.log(`Phase: ${nameResponse.phase}`);
    console.log(`Extracted traits so far:`, JSON.stringify(nameResponse, null, 2));
    console.log();

    // 3. Simulate user selecting species
    console.log('3. User selects character species...');
    const speciesResponse = await contentAgent.continueCharacterConversation(
      conversationStart.sessionId,
      "Luna is a magical unicorn with a silver coat",
      8
    );
    
    console.log(`Assistant: ${speciesResponse.response}`);
    console.log(`Phase: ${speciesResponse.phase}\n`);

    // 4. Simulate user describing appearance
    console.log('4. User describes character appearance...');
    const appearanceResponse = await contentAgent.continueCharacterConversation(
      conversationStart.sessionId,
      "She has sparkly blue eyes, a flowing silver mane, and a golden horn. She wears a flower crown",
      8
    );
    
    console.log(`Assistant: ${appearanceResponse.response}`);
    console.log(`Phase: ${appearanceResponse.phase}\n`);

    // 5. Simulate user describing personality
    console.log('5. User describes character personality...');
    const personalityResponse = await contentAgent.continueCharacterConversation(
      conversationStart.sessionId,
      "Luna is very kind and brave. She loves helping other forest creatures and is always curious about new things",
      8
    );
    
    console.log(`Assistant: ${personalityResponse.response}`);
    console.log(`Phase: ${personalityResponse.phase}\n`);

    // 6. Simulate user adding inclusivity traits (optional)
    console.log('6. User adds inclusivity traits...');
    const inclusivityResponse = await contentAgent.continueCharacterConversation(
      conversationStart.sessionId,
      "Luna is really good at noticing patterns and details that others miss, kind of like kids with autism",
      8
    );
    
    console.log(`Assistant: ${inclusivityResponse.response}`);
    console.log(`Phase: ${inclusivityResponse.phase}\n`);

    // 7. Character validation and confirmation
    console.log('7. Character validation and confirmation...');
    const validationResponse = await contentAgent.continueCharacterConversation(
      conversationStart.sessionId,
      "That sounds perfect!",
      8
    );
    
    console.log(`Assistant: ${validationResponse.response}`);
    console.log(`Phase: ${validationResponse.phase}`);
    
    if (validationResponse.character) {
      console.log('\n✅ Character created successfully!');
      console.log('Character details:', JSON.stringify(validationResponse.character, null, 2));
    }

    // 8. Demonstrate character CRUD operations
    console.log('\n8. Demonstrating character CRUD operations...');
    
    // Get all characters in the library
    const libraryCharacters = await contentAgent.getLibraryCharacters('library_456');
    console.log(`Found ${libraryCharacters.length} characters in library`);

    if (libraryCharacters.length > 0) {
      const character = libraryCharacters[0];
      
      // Update character
      console.log('\nUpdating character appearance...');
      const updatedCharacter = await contentAgent.updateCharacter(character.id, {
        appearanceUrl: 'https://example.com/luna-unicorn.jpg'
      });
      console.log('Character updated with appearance URL');

      // Search characters
      console.log('\nSearching for magical creatures...');
      const magicalCharacters = await contentAgent.searchCharacters({
        libraryId: 'library_456',
        species: 'magical_creature',
        limit: 10
      });
      console.log(`Found ${magicalCharacters.length} magical creatures`);

      // Get character statistics
      console.log('\nLibrary character statistics...');
      const stats = await contentAgent.getLibraryCharacterStats('library_456');
      console.log('Stats:', JSON.stringify(stats, null, 2));

      // Validate character
      console.log('\nValidating character...');
      const validation = await contentAgent.validateCharacter(character.traits, 8);
      console.log('Validation result:', JSON.stringify(validation, null, 2));
    }

    // 9. Demonstrate species and inclusivity options
    console.log('\n9. Available character options...');
    
    const speciesOptions = contentAgent.getCharacterSpeciesOptions();
    console.log('Species options:', speciesOptions.map(s => s.label).join(', '));
    
    const inclusivityOptions = contentAgent.getCharacterInclusivityOptions();
    console.log('Inclusivity options:', inclusivityOptions.map(i => i.label).join(', '));

    // 10. Get conversation statistics
    console.log('\n10. Conversation statistics...');
    const conversationStats = await contentAgent.getCharacterConversationStats();
    console.log('Conversation stats:', JSON.stringify(conversationStats, null, 2));

    // Clean up
    await contentAgent.endCharacterConversationSession(conversationStart.sessionId);
    console.log('\n✅ Character generation demo completed successfully!');

  } catch (error) {
    console.error('❌ Error during character generation demo:', error);
  } finally {
    await contentAgent.shutdown();
  }
}

async function demonstrateCharacterValidation() {
  const contentAgent = new ContentAgent(config);
  await contentAgent.initialize();

  console.log('\n🔍 Character Validation Demo\n');

  try {
    // Test valid character
    console.log('1. Testing valid character...');
    const validCharacter = {
      name: 'Friendly Robot',
      age: 10,
      species: 'robot',
      appearance: {
        eyeColor: 'blue',
        hairColor: 'none',
        clothing: 'shiny metal suit'
      },
      personality: ['helpful', 'kind', 'curious'],
      interests: ['helping friends', 'learning new things']
    };

    const validValidation = await contentAgent.validateCharacter(validCharacter, 8);
    console.log('Valid character result:', JSON.stringify(validValidation, null, 2));

    // Test invalid character (age inappropriate)
    console.log('\n2. Testing age-inappropriate character...');
    const invalidCharacter = {
      name: 'Adult Character',
      age: 25, // Too old for 8-year-old user
      species: 'human',
      personality: ['violent', 'scary'], // Inappropriate traits
      interests: ['fighting', 'being mean']
    };

    const invalidValidation = await contentAgent.validateCharacter(invalidCharacter, 8);
    console.log('Invalid character result:', JSON.stringify(invalidValidation, null, 2));

    // Test incomplete character
    console.log('\n3. Testing incomplete character...');
    const incompleteCharacter = {
      appearance: {
        eyeColor: 'green'
      }
      // Missing name, age, species
    };

    const incompleteValidation = await contentAgent.validateCharacter(incompleteCharacter, 8);
    console.log('Incomplete character result:', JSON.stringify(incompleteValidation, null, 2));

  } catch (error) {
    console.error('❌ Error during validation demo:', error);
  } finally {
    await contentAgent.shutdown();
  }
}

async function demonstrateInclusivitySupport() {
  const contentAgent = new ContentAgent(config);
  await contentAgent.initialize();

  console.log('\n🌈 Inclusivity Support Demo\n');

  try {
    // Create character with inclusivity traits
    console.log('1. Creating character with inclusivity traits...');
    
    const inclusiveCharacter = await contentAgent.createCharacterFromConversation(
      {
        name: 'Alex',
        age: 9,
        species: 'human',
        race: ['mixed'],
        ethnicity: ['African American', 'Hispanic'],
        appearance: {
          eyeColor: 'brown',
          hairColor: 'curly black',
          clothing: 'colorful t-shirt and jeans',
          devices: ['hearing aid']
        },
        personality: ['creative', 'determined', 'funny'],
        interests: ['art', 'music', 'dancing'],
        inclusivityTraits: [
          {
            type: 'autism',
            description: 'Sees patterns and details others miss',
            storyIntegration: 'Uses unique perspective to solve creative problems'
          },
          {
            type: 'prosthetic',
            description: 'Has a colorful prosthetic leg',
            storyIntegration: 'Shows that differences make us special and strong'
          }
        ]
      },
      'library_456',
      'user_123'
    );

    console.log('Inclusive character created:', JSON.stringify(inclusiveCharacter, null, 2));

    // Demonstrate multi-racial support
    console.log('\n2. Multi-racial character example...');
    const multiRacialTraits = {
      name: 'Maya',
      age: 7,
      species: 'human',
      race: ['Asian', 'White'],
      ethnicity: ['Japanese', 'Irish'],
      appearance: {
        eyeColor: 'hazel',
        hairColor: 'dark brown with red highlights',
        clothing: 'school uniform'
      },
      personality: ['bilingual', 'curious', 'bridge-builder'],
      interests: ['languages', 'cultural festivals', 'cooking']
    };

    console.log('Multi-racial character traits:', JSON.stringify(multiRacialTraits, null, 2));

    // Show species-specific adaptations
    console.log('\n3. Species-specific trait adaptations...');
    const animalCharacter = {
      name: 'Benny',
      age: 5,
      species: 'animal',
      appearance: {
        eyeColor: 'golden',
        furColor: 'brown and white',
        clothing: 'red bandana'
      },
      personality: ['loyal', 'playful', 'protective'],
      interests: ['fetching sticks', 'swimming', 'helping friends'],
      inclusivityTraits: [
        {
          type: 'other',
          description: 'Service dog who helps children with anxiety',
          storyIntegration: 'Provides comfort and support to friends who feel worried'
        }
      ]
    };

    console.log('Animal character with service role:', JSON.stringify(animalCharacter, null, 2));

  } catch (error) {
    console.error('❌ Error during inclusivity demo:', error);
  } finally {
    await contentAgent.shutdown();
  }
}

// Run the demos
if (require.main === module) {
  console.log('🚀 Starting Character Generation System Demo\n');
  
  demonstrateCharacterGeneration()
    .then(() => demonstrateCharacterValidation())
    .then(() => demonstrateInclusivitySupport())
    .then(() => {
      console.log('\n🎉 All demos completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Demo failed:', error);
      process.exit(1);
    });
}

export {
  demonstrateCharacterGeneration,
  demonstrateCharacterValidation,
  demonstrateInclusivitySupport
};
// Mock OpenAI for tests
class MockOpenAI {
  chat = {
    completions: {
      create: jest.fn().mockImplementation((params) => {
        console.log('[MOCK] OpenAI create called with:', JSON.stringify(params, null, 2));
        
        // Default response for intent classification
        const functionCallArgs = {
          intent_type: 'create_story',
          confidence: 0.95,
          story_type: 'bedtime',
          parameters: {},
          conversation_phase: 'character_creation'
        };

        // Parse user input to provide appropriate responses
        const userInput = params?.messages?.[params.messages.length - 1]?.content || '';
        
        // Check if current phase is provided in the user message
        const currentPhaseMatch = userInput.match(/Current Conversation Phase: (\w+)/);
        const currentPhase = currentPhaseMatch ? currentPhaseMatch[1] : undefined;
        
        if (userInput.toLowerCase().includes('bedtime')) {
          functionCallArgs.story_type = 'bedtime';
        } else if (userInput.toLowerCase().includes('adventure')) {
          functionCallArgs.story_type = 'adventure';
        } else if (userInput.toLowerCase().includes('invalid')) {
          functionCallArgs.intent_type = 'unknown';
          functionCallArgs.confidence = 0.3;
        } else if (userInput.toLowerCase().includes('resume')) {
          functionCallArgs.intent_type = 'greeting';
          functionCallArgs.parameters = { resuming: true };
        } else if (userInput.toLowerCase().includes('charlie')) {
          // Character creation/update for Charlie
          functionCallArgs.intent_type = 'create_character';
          functionCallArgs.parameters = { character_name: 'Charlie' };
          functionCallArgs.conversation_phase = 'character_creation';
        } else if (userInput.toLowerCase().includes('forest')) {
          // Story building with forest setting
          functionCallArgs.intent_type = 'continue_story';
          functionCallArgs.conversation_phase = 'story_building';
        } else if (userInput.toLowerCase().includes('finish') || userInput.toLowerCase().includes('done')) {
          // Story completion
          functionCallArgs.intent_type = 'finish_story';
          functionCallArgs.conversation_phase = 'completion';
        } else if (userInput.toLowerCase().includes('story')) {
          // Generic story creation
          functionCallArgs.intent_type = 'create_story';
          functionCallArgs.story_type = 'adventure';
        }
        
        // If we're in story_building phase and it's not already set
        if (currentPhase === 'story_building' && !userInput.toLowerCase().includes('charlie')) {
          functionCallArgs.conversation_phase = 'story_building';
        }

        const response = {
          choices: [{
            message: {
              content: JSON.stringify(functionCallArgs),
              function_call: {
                name: 'classify_intent',
                arguments: JSON.stringify(functionCallArgs)
              }
            }
          }]
        };
        
        console.log('[MOCK] Returning response:', JSON.stringify(response, null, 2));
        return Promise.resolve(response);
      })
    }
  };

  constructor(config?: any) {
    console.log('[MOCK] MockOpenAI constructor called with config:', config);
    // Constructor accepts config but doesn't need to do anything with it
  }
}

// Export the mock class as default and named export
export default MockOpenAI;
export { MockOpenAI as OpenAI };
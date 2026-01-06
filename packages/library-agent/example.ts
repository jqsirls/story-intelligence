import { LibraryAgent, LibraryAgentConfig } from './src';

// Example usage of the LibraryAgent
async function main() {
  // Configuration
  const config: LibraryAgentConfig = {
    supabaseUrl: process.env.SUPABASE_URL || 'http://localhost:54321',
    supabaseKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key',
    enableInsights: true,
    insightsUpdateInterval: 60 // minutes
  };

  // Initialize the agent
  const libraryAgent = new LibraryAgent(config);

  // Example operation context
  const context = {
    user_id: 'user-123',
    session_id: 'session-456',
    correlation_id: 'corr-789',
    ip_address: '192.168.1.1',
    user_agent: 'LibraryAgent-Example/1.0'
  };

  try {
    // Create a main library
    const mainLibrary = await libraryAgent.createLibrary(
      { name: 'My Family Stories' },
      context
    );
    console.log('Created main library:', mainLibrary);

    // Create a sub-library for a child with avatar
    const childLibrary = await libraryAgent.createSubLibrary(
      mainLibrary.id,
      { 
        name: 'Emma\'s Stories',
        avatar_type: 'animal',
        avatar_data: {
          animal: 'unicorn',
          color: 'rainbow',
          accessories: ['crown', 'wings']
        }
      },
      context
    );
    console.log('Created child sub-library:', childLibrary);

    // Grant permission to another user
    await libraryAgent.grantPermission(
      mainLibrary.id,
      {
        user_id: 'teacher-456',
        role: 'Editor'
      },
      context
    );
    console.log('Granted editor permission to teacher');

    // Record an emotional check-in for the sub-library
    const emotionalCheckin = await libraryAgent.recordEmotionalCheckin(
      childLibrary.id,
      'happy',
      0.9,
      context,
      {
        activity: 'story_creation',
        notes: 'Child was excited about creating a unicorn character'
      }
    );
    console.log('Recorded emotional check-in:', emotionalCheckin);

    // Get emotional patterns for the sub-library
    const emotionalPatterns = await libraryAgent.getSubLibraryEmotionalPatterns(
      childLibrary.id,
      30, // last 30 days
      context
    );
    console.log('Emotional patterns:', emotionalPatterns);

    // Get hierarchical stories (from main library and all sub-libraries)
    const allStories = await libraryAgent.getHierarchicalLibraryStories(
      mainLibrary.id,
      context
    );
    console.log('All stories in library hierarchy:', allStories);

    // Get library insights
    const insights = await libraryAgent.getLibraryInsights(
      mainLibrary.id,
      context
    );
    console.log('Library insights:', insights);

    // Search stories across accessible libraries
    const searchResults = await libraryAgent.searchStories(
      'unicorn',
      [mainLibrary.id, childLibrary.id],
      context
    );
    console.log('Story search results:', searchResults);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Example of story transfer workflow
async function storyTransferExample() {
  const config: LibraryAgentConfig = {
    supabaseUrl: process.env.SUPABASE_URL || 'http://localhost:54321',
    supabaseKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key',
    enableInsights: false,
    insightsUpdateInterval: 60
  };

  const libraryAgent = new LibraryAgent(config);
  
  const context = {
    user_id: 'user-123',
    session_id: 'session-456'
  };

  try {
    // Request story transfer
    const transferResponse = await libraryAgent.transferStory(
      {
        story_id: 'story-123',
        target_library_id: 'library-456',
        transfer_message: 'Would you like to add this story to your library?'
      },
      context
    );
    console.log('Transfer request created:', transferResponse);

    // Respond to transfer (as the target library owner)
    await libraryAgent.respondToStoryTransfer(
      transferResponse.transfer_id,
      'accepted',
      context,
      'Thank you for sharing this wonderful story!'
    );
    console.log('Transfer accepted');

    // Get transfer requests for a library
    const transferRequests = await libraryAgent.getStoryTransferRequests(
      'library-456',
      context
    );
    console.log('Transfer requests:', transferRequests);

  } catch (error) {
    console.error('Transfer error:', error);
  }
}

// Example of character sharing
async function characterSharingExample() {
  const config: LibraryAgentConfig = {
    supabaseUrl: process.env.SUPABASE_URL || 'http://localhost:54321',
    supabaseKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key',
    enableInsights: false,
    insightsUpdateInterval: 60
  };

  const libraryAgent = new LibraryAgent(config);
  
  const context = {
    user_id: 'user-123',
    session_id: 'session-456'
  };

  try {
    // Share character as a copy
    const sharedCharacter = await libraryAgent.shareCharacter(
      {
        character_id: 'character-123',
        target_library_id: 'library-456',
        share_type: 'copy'
      },
      context
    );
    console.log('Character shared:', sharedCharacter);

    // Search characters by traits
    const unicornCharacters = await libraryAgent.searchCharacters(
      'unicorn',
      ['library-123', 'library-456'],
      context
    );
    console.log('Unicorn characters found:', unicornCharacters);

  } catch (error) {
    console.error('Character sharing error:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  console.log('Running LibraryAgent examples...');
  main()
    .then(() => console.log('Main example completed'))
    .catch(console.error);
}

export { main, storyTransferExample, characterSharingExample };
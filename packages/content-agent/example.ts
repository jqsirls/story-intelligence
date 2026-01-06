import { ContentAgent } from './src/ContentAgent';
import { createConfig } from './src/config';

async function main() {
  // Create configuration
  const config = createConfig();
  
  // Initialize ContentAgent
  const contentAgent = new ContentAgent(config);
  await contentAgent.initialize();

  try {
    // Example 1: Classify story intent
    console.log('=== Story Classification Example ===');
    const classificationResult = await contentAgent.classifyStoryIntent({
      userInput: 'I want to create an exciting adventure story about a brave knight',
      userId: 'user123',
      sessionId: 'session456',
      context: {
        currentPhase: 'story',
        userAge: 7,
        emotionalState: 'excited'
      }
    });
    
    console.log('Classification Result:', classificationResult);

    // Example 2: Route story type with clarification
    console.log('\n=== Story Type Routing Example ===');
    const routingResult = await contentAgent.routeStoryType({
      userInput: 'Tell me something fun',
      userId: 'user123',
      sessionId: 'session456'
    });
    
    console.log('Routing Result:', routingResult);

    // Example 3: Get prompt template
    console.log('\n=== Prompt Template Example ===');
    const promptTemplate = contentAgent.selectPromptTemplate('Adventure', 7);
    console.log('Prompt Template:', {
      storyType: promptTemplate.storyType,
      ageGroup: promptTemplate.ageGroup,
      constraintsCount: promptTemplate.constraints.length
    });

    // Example 4: Content moderation
    console.log('\n=== Content Moderation Example ===');
    const moderationResult = await contentAgent.moderateContent({
      content: 'Once upon a time, there was a brave princess who went on an adventure',
      contentType: 'story',
      userAge: 6,
      storyType: 'Adventure'
    });
    
    console.log('Moderation Result:', moderationResult);

    // Example 5: Get available story types
    console.log('\n=== Available Story Types ===');
    const storyTypes = contentAgent.getAvailableStoryTypes();
    console.log('Story Types:', storyTypes);

    // Example 6: Generate story type options for user
    console.log('\n=== Story Type Options for Age 5 ===');
    const options = contentAgent.generateStoryTypeOptions(5);
    options.forEach(option => {
      console.log(`${option.type}: ${option.description} (Age appropriate: ${option.ageAppropriate})`);
    });

    // Example 7: Therapeutic Story Classification
    console.log('\n=== Therapeutic Story Classification ===');
    const therapeuticResult = await contentAgent.classifyTherapeuticStory({
      userInput: 'I need help processing the loss of my child',
      userId: 'user123',
      sessionId: 'session789',
      therapeuticFocus: 'grief_processing',
      currentEmotionalState: 'vulnerable',
      traumaHistory: ['child_loss'],
      context: {
        currentPhase: 'greeting',
        userAge: 35,
        emotionalState: 'grieving'
      }
    });
    
    console.log('Therapeutic Classification:', {
      storyType: therapeuticResult.storyType,
      audience: therapeuticResult.audience,
      complexity: therapeuticResult.complexity,
      safetyConsiderations: therapeuticResult.safetyConsiderations.length,
      postSupportAvailable: !!therapeuticResult.postStorySupport
    });

    // Example 8: Post-Story Support Analysis
    console.log('\n=== Post-Story Support Analysis ===');
    const postStoryAnalysis = await contentAgent.analyzePostStoryResponse({
      storyId: 'story_123',
      storyType: 'Child Loss',
      storyContent: 'A therapeutic story about remembering and honoring a beloved child...',
      userReaction: {
        userId: 'user123',
        storyId: 'story_123',
        timestamp: new Date().toISOString(),
        emotionalResponse: {
          felt: ['sadness', 'love', 'longing'],
          intensity: 7,
          triggered: false,
          overwhelmed: false,
          comforted: true,
          empowered: false,
          processing: true,
          needsSpace: false
        },
        needsSupport: true,
        supportRequested: ['breathing', 'affirmation'],
        followUpNeeded: true
      }
    });
    
    console.log('Post-Story Analysis:', {
      urgencyLevel: postStoryAnalysis.urgencyLevel,
      followUpNeeded: postStoryAnalysis.followUpNeeded,
      supportActionsCount: postStoryAnalysis.recommendedSupport.recommendedActions?.length || 0,
      visualizationsAvailable: postStoryAnalysis.recommendedSupport.visualizations?.length || 0
    });

    // Example 9: Support Session Creation
    console.log('\n=== Support Session Creation ===');
    const supportSession = await contentAgent.createSupportSession({
      userId: 'user123',
      storyId: 'story_123',
      emotionalState: {
        felt: ['processing', 'tender'],
        intensity: 6,
        processing: true
      },
      preferredSupport: ['breathing', 'visualization'],
      timeAvailable: '15 minutes',
      voiceGuidancePreferred: true
    });
    
    console.log('Support Session Plan:', {
      sessionId: supportSession.sessionId,
      duration: supportSession.duration,
      phasesCount: supportSession.phases.length,
      voiceGuidanceAvailable: !!supportSession.voiceScript
    });

    // Example 10: Immediate Support Generation
    console.log('\n=== Immediate Support Generation ===');
    const immediateSupport = await contentAgent.generateImmediateSupport(
      8, // High emotional intensity
      'Inner Child',
      ['abandonment', 'self_worth']
    );
    
    console.log('Immediate Support:', {
      urgencyLevel: immediateSupport.urgencyLevel,
      groundingTechniques: immediateSupport.groundingTechniques.length,
      visualizations: immediateSupport.visualizations.length,
      affirmations: immediateSupport.affirmations.length
    });

    // Example 11: Enhanced Story Type Options
    console.log('\n=== Enhanced Story Type Options ===');
    const enhancedOptions = contentAgent.generateEnhancedStoryTypeOptions(
      35, // Adult age
      ['grief_processing', 'healing', 'self_compassion']
    );
    
    console.log('Enhanced Options Sample:');
    enhancedOptions.slice(0, 3).forEach(option => {
      console.log(`${option.type}: ${option.description}`);
      console.log(`  Audience: ${option.audience}, Safety: ${option.safetyLevel}`);
      console.log(`  Therapeutic Match: ${option.therapeuticMatch || 'N/A'}`);
    });

    // Example 12: Privacy-Focused Story Storage
    console.log('\n=== Privacy-Focused Story Storage ===');
    const storyContent = "Once upon a time, there was a brave child who learned to cope with loss...";
    const sanitizedStory = contentAgent.sanitizeStoryForStorage(storyContent, 'Child Loss');
    
    console.log('Sanitized Story:', {
      wordCount: sanitizedStory.metadata.wordCount,
      containsTherapeuticElements: sanitizedStory.metadata.containsTherapeuticElements,
      contentPreview: sanitizedStory.sanitizedContent.substring(0, 100) + '...'
    });

    // Example 13: Therapeutic Data Statistics
    console.log('\n=== Therapeutic Data Statistics ===');
    const therapeuticStats = await contentAgent.getTherapeuticDataStats();
    console.log('Ephemeral Data Stats:', {
      totalRecords: therapeuticStats.totalEphemeralRecords,
      byType: therapeuticStats.byDataType,
      oldestRecord: therapeuticStats.oldestRecord,
      newestRecord: therapeuticStats.newestRecord
    });

    // Example 14: Privacy Cleanup
    console.log('\n=== Privacy Data Cleanup ===');
    const cleanupResult = await contentAgent.runTherapeuticDataCleanup();
    console.log('Cleanup Result:', {
      recordsCleaned: cleanupResult.cleaned,
      errors: cleanupResult.errors
    });

    // Example 15: Session Data Purge (GDPR Compliance)
    console.log('\n=== GDPR Compliance - Session Data Purge ===');
    await contentAgent.purgeSessionTherapeuticData('session456', 'user123');
    console.log('Session therapeutic data purged for privacy compliance');

    // Example 16: Voice-Driven Character Creation
    console.log('\n=== Voice-Driven Character Creation ===');
    
    // Start character conversation
    const charConversation = await contentAgent.startCharacterConversation(
      'user123',
      'library456',
      7 // Child's age
    );
    
    console.log('Character Conversation Started:', {
      sessionId: charConversation.sessionId,
      phase: charConversation.phase,
      response: charConversation.response.substring(0, 100) + '...'
    });

    // Continue conversation with user input
    const charResponse1 = await contentAgent.continueCharacterConversation(
      charConversation.sessionId,
      "I want to create a brave princess named Aria who is 8 years old",
      7
    );
    
    console.log('Character Response 1:', {
      phase: charResponse1.phase,
      response: charResponse1.response.substring(0, 100) + '...',
      isComplete: charResponse1.isComplete
    });

    // Continue with species selection
    const charResponse2 = await contentAgent.continueCharacterConversation(
      charConversation.sessionId,
      "She's a human princess with magical powers",
      7
    );
    
    console.log('Character Response 2:', {
      phase: charResponse2.phase,
      response: charResponse2.response.substring(0, 100) + '...',
      needsValidation: charResponse2.needsValidation
    });

    // Example 17: Character Species and Inclusivity Options
    console.log('\n=== Character Creation Options ===');
    const speciesOptions = contentAgent.getCharacterSpeciesOptions();
    const inclusivityOptions = contentAgent.getCharacterInclusivityOptions();
    
    console.log('Species Options:', speciesOptions.slice(0, 3).map(s => ({
      value: s.value,
      label: s.label,
      description: s.description
    })));
    
    console.log('Inclusivity Options:', inclusivityOptions.slice(0, 3).map(i => ({
      type: i.type,
      label: i.label,
      description: i.description
    })));

    // Example 18: Character Conversation Statistics
    console.log('\n=== Character Conversation Statistics ===');
    const charStats = await contentAgent.getCharacterConversationStats();
    console.log('Conversation Stats:', {
      totalSessions: charStats.totalSessions,
      activeSessions: charStats.activeSessions,
      completedSessions: charStats.completedSessions,
      averageLength: Math.round(charStats.averageConversationLength * 100) / 100
    });

    // Example 19: Health check
    console.log('\n=== Health Check ===');
    const health = await contentAgent.healthCheck();
    console.log('Health Status:', health);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Cleanup
    await contentAgent.shutdown();
  }
}

// Run example if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main };
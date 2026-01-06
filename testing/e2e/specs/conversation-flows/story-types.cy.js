describe('Story Type Conversation Flows', () => {
  const storyTypes = [
    'adventure', 'bedtime', 'birthday', 'educational', 
    'financial-literacy', 'language-learning', 'medical-bravery',
    'mental-health', 'milestones', 'new-chapter-sequel', 'tech-readiness'
  ];

  beforeEach(() => {
    cy.loginAsChild(8);
    cy.visit('/');
  });

  storyTypes.forEach(storyType => {
    describe(`${storyType} story flow`, () => {
      it('should complete full conversation flow', () => {
        cy.startStoryConversation(storyType, 'web');
        
        // Verify initial greeting and emotion check
        cy.get('@lastResponse').then(response => {
          expect(response.responseType).to.eq('greeting_and_emotion_check');
          expect(response.response).to.include('excited');
        });
        
        // Complete character creation
        cy.completeCharacterCreation({
          name: 'TestCharacter',
          species: storyType === 'tech-readiness' ? 'robot' : 'human',
          personality: ['brave', 'kind']
        });
        
        // Verify character art generation trigger
        cy.get('@lastResponse').then(response => {
          expect(response.responseType).to.eq('character_confirmation');
          expect(response.assetGeneration.triggered).to.be.true;
          expect(response.assetGeneration.types).to.include('character_art');
        });
        
        // Complete story creation with type-specific choices
        const storyChoices = getStoryTypeChoices(storyType);
        cy.completeStoryCreation(storyChoices);
        
        // Verify story finalization and asset generation
        cy.get('@lastResponse').then(response => {
          expect(response.responseType).to.eq('story_finalization');
          expect(response.assetGeneration.triggered).to.be.true;
          expect(response.assetGeneration.types).to.include.members([
            'story_audio', 'story_pdf', 'activities', 'cover_art'
          ]);
        });
        
        // Verify story quality meets requirements
        cy.request({
          method: 'GET',
          url: `${Cypress.env('apiUrl')}/story/${response.storyId}`,
          headers: {
            'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
          }
        }).then(storyResponse => {
          expect(storyResponse.body.story.type).to.eq(storyType);
          expect(storyResponse.body.story.structure).to.have.property('heroJourney');
          expect(storyResponse.body.story.qualityScore).to.be.greaterThan(0.8);
        });
        
        // Test response time requirement
        cy.measureResponseTime(800);
      });
      
      it('should handle mid-story character changes', () => {
        cy.startStoryConversation(storyType, 'web');
        cy.completeCharacterCreation();
        
        // Start story
        cy.sendConversationMessage('Let\'s begin the story');
        
        // Mid-story character change
        cy.sendConversationMessage('Actually, can my character have wings?');
        
        cy.get('@lastResponse').then(response => {
          expect(response.responseType).to.eq('character_modification');
          expect(response.storyAdaptation.triggered).to.be.true;
        });
        
        // Continue story with adapted character
        cy.sendConversationMessage('Yes, add wings please');
        
        cy.get('@lastResponse').then(response => {
          expect(response.response).to.include('wings');
          expect(response.characterConsistency.maintained).to.be.true;
        });
      });
      
      it('should maintain story quality standards', () => {
        cy.startStoryConversation(storyType, 'web');
        cy.completeCharacterCreation();
        cy.completeStoryCreation();
        
        cy.get('@sessionId').then(sessionId => {
          cy.request({
            method: 'GET',
            url: `${Cypress.env('apiUrl')}/story/quality-assessment/${sessionId}`,
            headers: {
              'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
            }
          }).then(response => {
            const quality = response.body.qualityMetrics;
            
            // Pulitzer-quality storytelling requirements
            expect(quality.narrativeStructure).to.be.greaterThan(0.8);
            expect(quality.characterDevelopment).to.be.greaterThan(0.7);
            expect(quality.ageAppropriateness).to.be.greaterThan(0.9);
            expect(quality.engagement).to.be.greaterThan(0.8);
            expect(quality.educationalValue).to.be.greaterThan(0.6);
          });
        });
      });
    });
  });
  
  function getStoryTypeChoices(storyType) {
    const choices = {
      'adventure': ['Explore the mysterious cave', 'Climb the tall mountain', 'Cross the rushing river'],
      'bedtime': ['Follow the sleepy moonbeam', 'Visit the dream garden', 'Float on a cloud'],
      'educational': ['Learn about the solar system', 'Discover how plants grow', 'Explore the ocean depths'],
      'financial-literacy': ['Start a lemonade stand', 'Save coins in a piggy bank', 'Learn about spending wisely'],
      'medical-bravery': ['Visit the friendly doctor', 'Get a brave bandage', 'Take medicine like a hero'],
      'mental-health': ['Talk about feelings', 'Practice deep breathing', 'Find a safe space']
    };
    
    return choices[storyType] || ['Make a choice', 'Try something new', 'Be brave'];
  }
});
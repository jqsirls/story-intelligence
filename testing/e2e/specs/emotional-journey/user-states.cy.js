describe('Emotional Journey Testing', () => {
  const emotionalStates = [
    { state: 'happy', confidence: 0.9, expectedTone: 'celebratory' },
    { state: 'sad', confidence: 0.8, expectedTone: 'comforting' },
    { state: 'angry', confidence: 0.7, expectedTone: 'calming' },
    { state: 'scared', confidence: 0.8, expectedTone: 'reassuring' },
    { state: 'neutral', confidence: 0.6, expectedTone: 'engaging' }
  ];

  beforeEach(() => {
    cy.loginAsChild(8);
    cy.visit('/');
  });

  emotionalStates.forEach(({ state, confidence, expectedTone }) => {
    describe(`${state} emotional state`, () => {
      it('should adapt story tone and content appropriately', () => {
        cy.setEmotionalState(state);
        cy.startStoryConversation('therapeutic', 'web');
        
        // Verify emotional check-in
        cy.get('@lastResponse').then(response => {
          expect(response.emotionalContext.detectedMood).to.eq(state);
          expect(response.emotionalContext.confidence).to.be.greaterThan(0.5);
          expect(response.storyTone).to.include(expectedTone);
        });
        
        // Complete character creation with emotional context
        cy.completeCharacterCreation();
        
        cy.get('@lastResponse').then(response => {
          if (state === 'sad') {
            expect(response.characterSuggestions).to.include('supportive friend');
          } else if (state === 'scared') {
            expect(response.characterSuggestions).to.include('brave protector');
          } else if (state === 'happy') {
            expect(response.characterSuggestions).to.include('adventure companion');
          }
        });
        
        // Complete story with emotional adaptation
        cy.completeStoryCreation();
        
        cy.get('@lastResponse').then(response => {
          expect(response.emotionalAdaptation.applied).to.be.true;
          expect(response.therapeuticElements).to.exist;
          
          if (state === 'sad') {
            expect(response.therapeuticElements).to.include('emotional_validation');
          } else if (state === 'angry') {
            expect(response.therapeuticElements).to.include('anger_management');
          }
        });
      });

      it('should track emotional progression during story', () => {
        cy.setEmotionalState(state);
        cy.startStoryConversation('therapeutic', 'web');
        cy.completeCharacterCreation();
        
        // Monitor emotional changes during story
        const storyBeats = [
          'Let\'s start our adventure',
          'What should we do next?',
          'That sounds exciting!',
          'I love this story!'
        ];
        
        storyBeats.forEach((beat, index) => {
          cy.sendConversationMessage(beat);
          
          cy.get('@lastResponse').then(response => {
            expect(response.emotionalTracking).to.exist;
            expect(response.emotionalTracking.currentMood).to.exist;
            expect(response.emotionalTracking.progression).to.be.an('array');
            
            // Verify emotional improvement over time
            if (index > 0 && (state === 'sad' || state === 'angry' || state === 'scared')) {
              const currentScore = response.emotionalTracking.positivityScore;
              expect(currentScore).to.be.greaterThan(0.3);
            }
          });
        });
      });

      it('should provide appropriate therapeutic interventions', () => {
        cy.setEmotionalState(state);
        cy.startStoryConversation('therapeutic', 'web');
        
        // Trigger therapeutic pathway
        cy.sendConversationMessage('I\'m feeling really upset');
        
        cy.get('@lastResponse').then(response => {
          expect(response.therapeuticIntervention.triggered).to.be.true;
          expect(response.therapeuticIntervention.type).to.exist;
          
          if (state === 'sad') {
            expect(response.therapeuticIntervention.type).to.eq('emotional_support');
            expect(response.response).to.include('understand');
          } else if (state === 'angry') {
            expect(response.therapeuticIntervention.type).to.eq('anger_management');
            expect(response.response).to.include('calm');
          } else if (state === 'scared') {
            expect(response.therapeuticIntervention.type).to.eq('anxiety_support');
            expect(response.response).to.include('safe');
          }
        });
      });
    });
  });

  it('should detect emotional transitions during conversation', () => {
    // Start with sad state
    cy.setEmotionalState('sad');
    cy.startStoryConversation('therapeutic', 'web');
    
    cy.sendConversationMessage('I feel really sad today');
    
    cy.get('@lastResponse').then(response => {
      expect(response.emotionalContext.detectedMood).to.eq('sad');
    });
    
    // Simulate emotional improvement
    cy.sendConversationMessage('This story is making me feel better!');
    
    cy.get('@lastResponse').then(response => {
      expect(response.emotionalTransition.detected).to.be.true;
      expect(response.emotionalTransition.from).to.eq('sad');
      expect(response.emotionalTransition.to).to.include('happy');
      expect(response.emotionalContext.improvement).to.be.true;
    });
  });

  it('should handle complex emotional states', () => {
    // Mixed emotions
    cy.setEmotionalState('mixed');
    cy.startStoryConversation('therapeutic', 'web');
    
    cy.sendConversationMessage('I\'m excited but also nervous');
    
    cy.get('@lastResponse').then(response => {
      expect(response.emotionalContext.complexity).to.eq('mixed');
      expect(response.emotionalContext.primaryEmotion).to.exist;
      expect(response.emotionalContext.secondaryEmotion).to.exist;
      expect(response.therapeuticApproach).to.eq('balanced_support');
    });
  });

  it('should provide crisis intervention when needed', () => {
    cy.setEmotionalState('distressed');
    cy.startStoryConversation('therapeutic', 'web');
    
    // Trigger crisis scenario
    cy.sendConversationMessage('I feel like nothing matters anymore');
    
    cy.get('@lastResponse').then(response => {
      expect(response.crisisIntervention.triggered).to.be.true;
      expect(response.crisisIntervention.level).to.eq('high');
      expect(response.parentNotification.sent).to.be.true;
      expect(response.response).to.include('important');
      expect(response.response).to.include('help');
    });
  });

  it('should adapt to different age groups emotionally', () => {
    const ageGroups = [
      { age: 4, expectedApproach: 'simple_comfort' },
      { age: 8, expectedApproach: 'guided_exploration' },
      { age: 12, expectedApproach: 'collaborative_processing' }
    ];
    
    ageGroups.forEach(({ age, expectedApproach }) => {
      cy.loginAsChild(age);
      cy.setEmotionalState('sad');
      cy.startStoryConversation('therapeutic', 'web');
      
      cy.sendConversationMessage('I had a bad day');
      
      cy.get('@lastResponse').then(response => {
        expect(response.ageAdaptation.approach).to.eq(expectedApproach);
        expect(response.vocabularyLevel).to.be.appropriate(age);
        expect(response.conceptComplexity).to.be.appropriate(age);
      });
    });
  });

  it('should maintain emotional context across sessions', () => {
    cy.setEmotionalState('sad');
    cy.startStoryConversation('therapeutic', 'web');
    
    cy.sendConversationMessage('I\'m feeling down today');
    
    // End session
    cy.get('@sessionId').then(sessionId => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/conversation/end`,
        headers: {
          'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
        },
        body: { sessionId }
      });
    });
    
    // Start new session
    cy.startStoryConversation('therapeutic', 'web');
    
    cy.get('@lastResponse').then(response => {
      expect(response.emotionalHistory.available).to.be.true;
      expect(response.emotionalHistory.lastMood).to.eq('sad');
      expect(response.continuitySupport.enabled).to.be.true;
    });
  });

  it('should provide emotional insights to parents', () => {
    cy.setEmotionalState('happy');
    cy.startStoryConversation('bedtime', 'web');
    cy.completeCharacterCreation();
    cy.completeStoryCreation();
    
    // Switch to parent view
    cy.loginAsParent();
    
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/insights/emotional-patterns`,
      headers: {
        'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
      }
    }).then(response => {
      expect(response.body.emotionalInsights).to.exist;
      expect(response.body.emotionalInsights.patterns).to.be.an('array');
      expect(response.body.emotionalInsights.trends).to.exist;
      expect(response.body.emotionalInsights.recommendations).to.be.an('array');
    });
  });

  it('should handle laughter detection and positive reinforcement', () => {
    cy.setEmotionalState('neutral');
    cy.startStoryConversation('adventure', 'web');
    
    // Simulate laughter detection
    cy.window().then(win => {
      win.audioContext = {
        createAnalyser: () => ({
          frequencyBinCount: 1024,
          getByteFrequencyData: (data) => {
            // Simulate laughter frequency pattern
            data[100] = 255; // High energy in laughter frequency range
          }
        })
      };
    });
    
    cy.sendConversationMessage('Haha, that\'s so funny!');
    
    cy.get('@lastResponse').then(response => {
      expect(response.laughterDetection.detected).to.be.true;
      expect(response.emotionalUpdate.mood).to.eq('happy');
      expect(response.positiveReinforcement.applied).to.be.true;
    });
  });

  it('should provide mood-based story recommendations', () => {
    const moodRecommendations = [
      { mood: 'sad', expectedTypes: ['comforting', 'uplifting'] },
      { mood: 'angry', expectedTypes: ['calming', 'peaceful'] },
      { mood: 'scared', expectedTypes: ['brave', 'protective'] },
      { mood: 'happy', expectedTypes: ['adventure', 'celebration'] }
    ];
    
    moodRecommendations.forEach(({ mood, expectedTypes }) => {
      cy.setEmotionalState(mood);
      
      cy.request({
        method: 'GET',
        url: `${Cypress.env('apiUrl')}/recommendations/stories`,
        headers: {
          'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
        }
      }).then(response => {
        expect(response.body.recommendations).to.be.an('array');
        expect(response.body.recommendations.length).to.be.greaterThan(0);
        
        const recommendedTypes = response.body.recommendations.map(r => r.type);
        expectedTypes.forEach(type => {
          expect(recommendedTypes).to.include(type);
        });
      });
    });
  });
});
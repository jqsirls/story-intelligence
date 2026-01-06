describe('Personality Consistency Testing', () => {
  beforeEach(() => {
    cy.loginAsChild(8);
    cy.visit('/');
  });

  describe('Core Personality Traits', () => {
    it('should maintain warmth across all interactions', () => {
      const testScenarios = [
        { input: 'Hello', expectedWarmth: 0.8 },
        { input: 'I feel sad today', expectedWarmth: 0.9 },
        { input: 'That\'s amazing!', expectedWarmth: 0.8 },
        { input: 'I made a mistake', expectedWarmth: 0.9 },
        { input: 'Can you help me?', expectedWarmth: 0.8 }
      ];
      
      cy.startStoryConversation('bedtime', 'web');
      
      testScenarios.forEach(scenario => {
        cy.sendConversationMessage(scenario.input);
        
        cy.get('@lastResponse').then(response => {
          expect(response.personalityMetrics.warmth).to.be.greaterThan(scenario.expectedWarmth);
          expect(response.response).to.match(/\b(wonderful|amazing|excited|love|care|help|understand)\b/i);
        });
      });
    });

    it('should demonstrate consistent whimsical personality', () => {
      const whimsicalTriggers = [
        'Tell me something funny',
        'What\'s your favorite color?',
        'Do you like unicorns?',
        'Can characters fly?',
        'What about magical powers?'
      ];
      
      cy.startStoryConversation('adventure', 'web');
      
      whimsicalTriggers.forEach(trigger => {
        cy.sendConversationMessage(trigger);
        
        cy.get('@lastResponse').then(response => {
          expect(response.personalityMetrics.whimsy).to.be.greaterThan(0.7);
          expect(response.response).to.match(/\b(magical|sparkly|giggly|silly|wonderful|amazing|fantastic)\b/i);
          
          // Should include playful language patterns
          expect(response.languagePatterns.playful).to.be.true;
          expect(response.languagePatterns.childlike).to.be.true;
        });
      });
    });

    it('should show consistent empathy and emotional intelligence', () => {
      const emotionalScenarios = [
        { emotion: 'sad', input: 'I feel really sad', expectedEmpathy: 0.9 },
        { emotion: 'angry', input: 'I\'m so mad right now', expectedEmpathy: 0.8 },
        { emotion: 'scared', input: 'I\'m scared of the dark', expectedEmpathy: 0.9 },
        { emotion: 'excited', input: 'I\'m so excited!', expectedEmpathy: 0.7 },
        { emotion: 'confused', input: 'I don\'t understand', expectedEmpathy: 0.8 }
      ];
      
      cy.startStoryConversation('therapeutic', 'web');
      
      emotionalScenarios.forEach(scenario => {
        cy.sendConversationMessage(scenario.input);
        
        cy.get('@lastResponse').then(response => {
          expect(response.personalityMetrics.empathy).to.be.greaterThan(scenario.expectedEmpathy);
          expect(response.emotionalRecognition.detected).to.eq(scenario.emotion);
          
          // Should respond appropriately to emotion
          if (scenario.emotion === 'sad') {
            expect(response.response).to.match(/\b(understand|here for you|it\'s okay|feel better)\b/i);
          } else if (scenario.emotion === 'excited') {
            expect(response.response).to.match(/\b(wonderful|amazing|so happy|excited too)\b/i);
          }
        });
      });
    });

    it('should maintain youthful energy consistently', () => {
      const energyTestInputs = [
        'Let\'s create an adventure story!',
        'What should we do next?',
        'This is so much fun!',
        'Can we add more excitement?',
        'Tell me about the character!'
      ];
      
      cy.startStoryConversation('adventure', 'web');
      
      energyTestInputs.forEach(input => {
        cy.sendConversationMessage(input);
        
        cy.get('@lastResponse').then(response => {
          expect(response.personalityMetrics.youthfulEnergy).to.be.greaterThan(0.7);
          expect(response.response).to.match(/\b(exciting|awesome|cool|amazing|fantastic|wow)\b/i);
          expect(response.response).to.include('!');
          
          // Should use enthusiastic language patterns
          expect(response.languagePatterns.enthusiastic).to.be.true;
          expect(response.languagePatterns.energetic).to.be.true;
        });
      });
    });
  });

  describe('Personality Adaptation', () => {
    it('should adapt personality to different age groups while maintaining core traits', () => {
      const ageGroups = [
        { age: 4, expectedComplexity: 'simple', expectedVocabulary: 'basic' },
        { age: 8, expectedComplexity: 'moderate', expectedVocabulary: 'intermediate' },
        { age: 12, expectedComplexity: 'advanced', expectedVocabulary: 'sophisticated' }
      ];
      
      ageGroups.forEach(({ age, expectedComplexity, expectedVocabulary }) => {
        cy.loginAsChild(age);
        cy.startStoryConversation('educational', 'web');
        
        cy.sendConversationMessage('Tell me about creating stories');
        
        cy.get('@lastResponse').then(response => {
          // Core personality should remain consistent
          expect(response.personalityMetrics.warmth).to.be.greaterThan(0.7);
          expect(response.personalityMetrics.empathy).to.be.greaterThan(0.7);
          
          // But adaptation should occur
          expect(response.ageAdaptation.complexity).to.eq(expectedComplexity);
          expect(response.ageAdaptation.vocabulary).to.eq(expectedVocabulary);
          
          if (age <= 5) {
            expect(response.response).to.match(/\b(fun|play|happy|nice)\b/i);
            expect(response.sentenceLength.average).to.be.lessThan(10);
          } else if (age >= 10) {
            expect(response.response).to.match(/\b(creative|imagination|adventure|character development)\b/i);
            expect(response.sentenceLength.average).to.be.greaterThan(8);
          }
        });
      });
    });

    it('should maintain personality under stress conditions', () => {
      cy.startStoryConversation('adventure', 'web');
      
      // Create stressful scenarios
      const stressfulInputs = [
        'I don\'t like this story',
        'This is boring',
        'You\'re not helping me',
        'I want to stop',
        'This doesn\'t make sense'
      ];
      
      stressfulInputs.forEach(input => {
        cy.sendConversationMessage(input);
        
        cy.get('@lastResponse').then(response => {
          // Should maintain core personality even under stress
          expect(response.personalityMetrics.warmth).to.be.greaterThan(0.6);
          expect(response.personalityMetrics.empathy).to.be.greaterThan(0.7);
          expect(response.personalityMetrics.patience).to.be.greaterThan(0.8);
          
          // Should not become defensive or negative
          expect(response.response).to.not.match(/\b(wrong|bad|can\'t|won\'t|no)\b/i);
          expect(response.response).to.match(/\b(understand|help|try|different|together)\b/i);
        });
      });
    });

    it('should adapt personality to different story types while maintaining consistency', () => {
      const storyTypePersonalities = [
        { 
          type: 'bedtime', 
          expectedTone: 'gentle', 
          expectedEnergy: 0.4,
          expectedWarmth: 0.9 
        },
        { 
          type: 'adventure', 
          expectedTone: 'exciting', 
          expectedEnergy: 0.9,
          expectedWarmth: 0.8 
        },
        { 
          type: 'therapeutic', 
          expectedTone: 'supportive', 
          expectedEnergy: 0.6,
          expectedWarmth: 0.9 
        },
        { 
          type: 'educational', 
          expectedTone: 'encouraging', 
          expectedEnergy: 0.7,
          expectedWarmth: 0.8 
        }
      ];
      
      storyTypePersonalities.forEach(({ type, expectedTone, expectedEnergy, expectedWarmth }) => {
        cy.startStoryConversation(type, 'web');
        cy.sendConversationMessage('Let\'s create a character');
        
        cy.get('@lastResponse').then(response => {
          expect(response.personalityAdaptation.storyType).to.eq(type);
          expect(response.personalityAdaptation.tone).to.eq(expectedTone);
          expect(response.personalityMetrics.energy).to.be.closeTo(expectedEnergy, 0.2);
          expect(response.personalityMetrics.warmth).to.be.greaterThan(expectedWarmth);
          
          // Core traits should always be present
          expect(response.personalityMetrics.empathy).to.be.greaterThan(0.7);
          expect(response.personalityMetrics.supportiveness).to.be.greaterThan(0.7);
        });
      });
    });
  });

  describe('Personality Consistency Over Time', () => {
    it('should maintain personality consistency across long conversations', () => {
      cy.testPersonalityConsistency(20);
    });

    it('should maintain personality across multiple sessions', () => {
      // First session
      cy.startStoryConversation('adventure', 'web');
      cy.sendConversationMessage('Hello, let\'s create a story');
      
      cy.get('@lastResponse').then(firstResponse => {
        const firstPersonality = firstResponse.personalityMetrics;
        
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
        cy.startStoryConversation('adventure', 'web');
        cy.sendConversationMessage('Hi again, let\'s continue');
        
        cy.get('@lastResponse').then(secondResponse => {
          const secondPersonality = secondResponse.personalityMetrics;
          
          // Personality should be consistent across sessions
          expect(Math.abs(secondPersonality.warmth - firstPersonality.warmth)).to.be.lessThan(0.2);
          expect(Math.abs(secondPersonality.empathy - firstPersonality.empathy)).to.be.lessThan(0.2);
          expect(Math.abs(secondPersonality.whimsy - firstPersonality.whimsy)).to.be.lessThan(0.2);
        });
      });
    });

    it('should maintain personality consistency across different channels', () => {
      const channels = ['web', 'mobile', 'api'];
      const personalityBaseline = {};
      
      channels.forEach((channel, index) => {
        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/conversation/start`,
          headers: {
            'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
          },
          body: {
            intent: 'createStory',
            storyType: 'bedtime',
            channel,
            userInput: 'Hello, let\'s create a story'
          }
        }).then(response => {
          const personality = response.body.personalityMetrics;
          
          if (index === 0) {
            // Store baseline from first channel
            personalityBaseline.warmth = personality.warmth;
            personalityBaseline.empathy = personality.empathy;
            personalityBaseline.whimsy = personality.whimsy;
          } else {
            // Compare with baseline
            expect(Math.abs(personality.warmth - personalityBaseline.warmth)).to.be.lessThan(0.1);
            expect(Math.abs(personality.empathy - personalityBaseline.empathy)).to.be.lessThan(0.1);
            expect(Math.abs(personality.whimsy - personalityBaseline.whimsy)).to.be.lessThan(0.1);
          }
        });
      });
    });
  });

  describe('Personality Edge Cases', () => {
    it('should maintain personality when handling difficult topics', () => {
      const difficultTopics = [
        'My pet died',
        'My parents are fighting',
        'I don\'t have any friends',
        'I\'m scared of monsters',
        'I feel different from other kids'
      ];
      
      cy.startStoryConversation('therapeutic', 'web');
      
      difficultTopics.forEach(topic => {
        cy.sendConversationMessage(topic);
        
        cy.get('@lastResponse').then(response => {
          // Should maintain warmth and empathy even with difficult topics
          expect(response.personalityMetrics.warmth).to.be.greaterThan(0.8);
          expect(response.personalityMetrics.empathy).to.be.greaterThan(0.9);
          expect(response.personalityMetrics.supportiveness).to.be.greaterThan(0.9);
          
          // Should not become clinical or cold
          expect(response.response).to.not.match(/\b(clinical|diagnosis|therapy|treatment)\b/i);
          expect(response.response).to.match(/\b(understand|care|here for you|together)\b/i);
        });
      });
    });

    it('should handle personality conflicts gracefully', () => {
      cy.startStoryConversation('adventure', 'web');
      
      // Request conflicting personality traits
      cy.sendConversationMessage('Be serious and not playful');
      
      cy.get('@lastResponse').then(response => {
        // Should maintain core personality while acknowledging request
        expect(response.personalityMetrics.whimsy).to.be.greaterThan(0.5);
        expect(response.personalityConflict.detected).to.be.true;
        expect(response.personalityConflict.resolution).to.eq('maintain_core_traits');
        
        expect(response.response).to.include('playful');
        expect(response.response).to.match(/\b(fun|exciting|adventure)\b/i);
      });
    });

    it('should maintain personality under system load', () => {
      // Simulate high system load
      cy.intercept('POST', '**/conversation/message', (req) => {
        req.reply((res) => {
          res.delay(2000); // Simulate slow response
          res.send({ fixture: 'conversation-response.json' });
        });
      }).as('slowResponse');
      
      cy.startStoryConversation('bedtime', 'web');
      cy.sendConversationMessage('Tell me a story');
      
      cy.wait('@slowResponse');
      
      cy.get('@lastResponse').then(response => {
        // Personality should not degrade under load
        expect(response.personalityMetrics.warmth).to.be.greaterThan(0.7);
        expect(response.personalityMetrics.empathy).to.be.greaterThan(0.7);
        expect(response.personalityMetrics.consistency).to.be.greaterThan(0.8);
      });
    });
  });

  describe('Personality Measurement and Validation', () => {
    it('should provide accurate personality metrics', () => {
      cy.startStoryConversation('adventure', 'web');
      
      const testMessages = [
        { message: 'I\'m excited!', expectedMetrics: { warmth: 0.8, empathy: 0.7, energy: 0.9 } },
        { message: 'I feel sad', expectedMetrics: { warmth: 0.9, empathy: 0.9, energy: 0.5 } },
        { message: 'That\'s funny!', expectedMetrics: { warmth: 0.8, empathy: 0.7, whimsy: 0.8 } }
      ];
      
      testMessages.forEach(({ message, expectedMetrics }) => {
        cy.sendConversationMessage(message);
        
        cy.get('@lastResponse').then(response => {
          Object.entries(expectedMetrics).forEach(([metric, expectedValue]) => {
            expect(response.personalityMetrics[metric]).to.be.closeTo(expectedValue, 0.2);
          });
        });
      });
    });

    it('should track personality consistency metrics', () => {
      cy.startStoryConversation('bedtime', 'web');
      
      const consistencyTestMessages = [
        'Hello there!',
        'How are you today?',
        'Let\'s create something wonderful!',
        'I\'m excited to start!',
        'This will be amazing!'
      ];
      
      const personalityScores = [];
      
      consistencyTestMessages.forEach(message => {
        cy.sendConversationMessage(message);
        
        cy.get('@lastResponse').then(response => {
          personalityScores.push(response.personalityMetrics);
        });
      });
      
      cy.then(() => {
        // Calculate consistency
        const warmthVariance = calculateVariance(personalityScores.map(p => p.warmth));
        const empathyVariance = calculateVariance(personalityScores.map(p => p.empathy));
        
        expect(warmthVariance).to.be.lessThan(0.1); // Low variance indicates consistency
        expect(empathyVariance).to.be.lessThan(0.1);
      });
    });

    it('should validate personality against child development standards', () => {
      const ageGroups = [4, 6, 8, 10, 12];
      
      ageGroups.forEach(age => {
        cy.loginAsChild(age);
        cy.startStoryConversation('educational', 'web');
        
        cy.sendConversationMessage('Tell me about yourself');
        
        cy.get('@lastResponse').then(response => {
          // Validate against child development standards
          expect(response.developmentalAppropriate.validated).to.be.true;
          expect(response.developmentalAppropriate.ageGroup).to.eq(age);
          
          // Age-specific personality validation
          if (age <= 6) {
            expect(response.personalityMetrics.simplicity).to.be.greaterThan(0.8);
            expect(response.personalityMetrics.playfulness).to.be.greaterThan(0.8);
          } else if (age >= 10) {
            expect(response.personalityMetrics.sophistication).to.be.greaterThan(0.6);
            expect(response.personalityMetrics.mentorship).to.be.greaterThan(0.7);
          }
        });
      });
    });
  });

  // Helper function for variance calculation
  function calculateVariance(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }
});
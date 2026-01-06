describe('Multi-Language Conversation Flows', () => {
  const supportedLanguages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'ar', name: 'Arabic' }
  ];

  beforeEach(() => {
    cy.loginAsChild(8);
    cy.visit('/');
  });

  supportedLanguages.forEach(language => {
    describe(`${language.name} (${language.code}) conversation flow`, () => {
      it('should complete story creation in target language', () => {
        cy.switchLanguage(language.code);
        cy.startStoryConversation('bedtime', 'web');
        
        // Verify response is in correct language
        cy.get('@lastResponse').then(response => {
          expect(response.language).to.eq(language.code);
          expect(response.response).to.not.be.empty;
          
          // Language-specific validation
          if (language.code === 'es') {
            expect(response.response).to.match(/¡|¿|ñ/);
          } else if (language.code === 'fr') {
            expect(response.response).to.match(/à|é|è|ç/);
          } else if (language.code === 'de') {
            expect(response.response).to.match(/ä|ö|ü|ß/);
          }
        });
        
        // Complete character creation with language-appropriate names
        const characterNames = {
          'en': 'Emma',
          'es': 'Sofia',
          'fr': 'Marie',
          'de': 'Anna',
          'it': 'Giulia',
          'pt': 'Ana',
          'zh': '小明',
          'ja': 'さくら',
          'ko': '민수',
          'ar': 'فاطمة'
        };
        
        cy.completeCharacterCreation({
          name: characterNames[language.code] || 'Test'
        });
        
        // Verify character creation response in target language
        cy.get('@lastResponse').then(response => {
          expect(response.language).to.eq(language.code);
          expect(response.responseType).to.eq('character_confirmation');
        });
        
        cy.completeStoryCreation();
        
        // Verify final story is in correct language
        cy.get('@lastResponse').then(response => {
          expect(response.language).to.eq(language.code);
          expect(response.responseType).to.eq('story_finalization');
        });
      });

      it('should handle cultural context appropriately', () => {
        cy.switchLanguage(language.code);
        cy.startStoryConversation('educational', 'web');
        
        // Request culturally relevant story elements
        cy.sendConversationMessage('Tell me about local traditions');
        
        cy.get('@lastResponse').then(response => {
          expect(response.culturalContext).to.exist;
          expect(response.culturalContext.region).to.exist;
          
          // Verify cultural appropriateness
          if (language.code === 'ar') {
            expect(response.culturalContext.considerations).to.include('islamic_values');
          } else if (language.code === 'zh') {
            expect(response.culturalContext.considerations).to.include('confucian_values');
          } else if (language.code === 'ja') {
            expect(response.culturalContext.considerations).to.include('respect_harmony');
          }
        });
      });

      it('should maintain personality consistency across languages', () => {
        cy.switchLanguage(language.code);
        cy.startStoryConversation('adventure', 'web');
        
        // Test personality traits in target language
        const personalityTests = [
          'Tell me something funny',
          'I feel sad today',
          'Can you help me?',
          'That\'s amazing!'
        ];
        
        personalityTests.forEach(message => {
          cy.sendConversationMessage(message);
          
          cy.get('@lastResponse').then(response => {
            expect(response.personalityMetrics).to.exist;
            expect(response.personalityMetrics.warmth).to.be.greaterThan(0.7);
            expect(response.personalityMetrics.empathy).to.be.greaterThan(0.7);
            expect(response.personalityMetrics.whimsy).to.be.greaterThan(0.6);
          });
        });
      });
    });
  });

  it('should support dynamic language switching mid-conversation', () => {
    cy.startStoryConversation('bedtime', 'web');
    cy.sendConversationMessage('Hello, let\'s create a story');
    
    // Switch language mid-conversation
    cy.switchLanguage('es');
    cy.sendConversationMessage('Hola, quiero continuar mi historia');
    
    cy.get('@lastResponse').then(response => {
      expect(response.language).to.eq('es');
      expect(response.conversationContinuity.maintained).to.be.true;
      expect(response.response).to.include('historia');
    });
    
    // Switch back to English
    cy.switchLanguage('en');
    cy.sendConversationMessage('Let\'s finish in English');
    
    cy.get('@lastResponse').then(response => {
      expect(response.language).to.eq('en');
      expect(response.conversationContinuity.maintained).to.be.true;
    });
  });

  it('should handle mixed-language input gracefully', () => {
    cy.startStoryConversation('educational', 'web');
    
    // Send mixed English-Spanish input
    cy.sendConversationMessage('I want a story about una princesa brave');
    
    cy.get('@lastResponse').then(response => {
      expect(response.languageDetection.mixed).to.be.true;
      expect(response.languageDetection.primary).to.eq('en');
      expect(response.languageDetection.secondary).to.eq('es');
      expect(response.response).to.not.be.empty;
    });
  });

  it('should provide appropriate translations for story elements', () => {
    const testLanguages = ['es', 'fr', 'de'];
    
    testLanguages.forEach(lang => {
      cy.switchLanguage(lang);
      cy.startStoryConversation('adventure', 'web');
      cy.completeCharacterCreation();
      cy.completeStoryCreation();
      
      // Check story translation quality
      cy.get('@sessionId').then(sessionId => {
        cy.request({
          method: 'GET',
          url: `${Cypress.env('apiUrl')}/story/translation-quality/${sessionId}`,
          headers: {
            'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
          }
        }).then(response => {
          const quality = response.body.translationQuality;
          
          expect(quality.accuracy).to.be.greaterThan(0.8);
          expect(quality.fluency).to.be.greaterThan(0.8);
          expect(quality.culturalAdaptation).to.be.greaterThan(0.7);
          expect(quality.ageAppropriateness).to.be.greaterThan(0.9);
        });
      });
    });
  });

  it('should support right-to-left languages', () => {
    cy.switchLanguage('ar');
    cy.startStoryConversation('bedtime', 'web');
    
    // Check RTL layout
    cy.get('body').should('have.attr', 'dir', 'rtl');
    cy.get('[data-testid="conversation-container"]').should('have.css', 'direction', 'rtl');
    
    // Test Arabic text input and display
    cy.sendConversationMessage('مرحبا، أريد إنشاء قصة');
    
    cy.get('@lastResponse').then(response => {
      expect(response.language).to.eq('ar');
      expect(response.response).to.match(/[\u0600-\u06FF]/); // Arabic Unicode range
    });
    
    // Verify text alignment
    cy.get('[data-testid="conversation-message"]').should('have.css', 'text-align', 'right');
  });

  it('should handle language-specific character encoding', () => {
    const encodingTests = [
      { lang: 'zh', text: '你好，我想创建一个故事', encoding: 'UTF-8' },
      { lang: 'ja', text: 'こんにちは、物語を作りたいです', encoding: 'UTF-8' },
      { lang: 'ko', text: '안녕하세요, 이야기를 만들고 싶어요', encoding: 'UTF-8' },
      { lang: 'ru', text: 'Привет, я хочу создать историю', encoding: 'UTF-8' }
    ];
    
    encodingTests.forEach(test => {
      cy.switchLanguage(test.lang);
      cy.startStoryConversation('educational', 'web');
      
      cy.sendConversationMessage(test.text);
      
      cy.get('@lastResponse').then(response => {
        expect(response.language).to.eq(test.lang);
        expect(response.response).to.not.be.empty;
        
        // Verify proper character encoding
        expect(response.response).to.not.include('�'); // No replacement characters
      });
    });
  });

  it('should provide localized error messages', () => {
    cy.switchLanguage('es');
    cy.startStoryConversation('bedtime', 'web');
    
    // Trigger an error scenario
    cy.intercept('POST', '**/conversation/message', { statusCode: 500 }).as('serverError');
    cy.sendConversationMessage('Test message');
    cy.wait('@serverError');
    
    // Verify error message is in Spanish
    cy.get('[data-testid="error-message"]').should('contain', 'Error');
    cy.get('[data-testid="error-message"]').should('match', /[ñáéíóú]/);
  });

  it('should support voice input in multiple languages', () => {
    const voiceLanguages = ['en-US', 'es-ES', 'fr-FR', 'de-DE'];
    
    voiceLanguages.forEach(voiceLang => {
      const langCode = voiceLang.split('-')[0];
      cy.switchLanguage(langCode);
      cy.startStoryConversation('adventure', 'web');
      
      // Test voice input configuration
      cy.get('[data-testid="voice-input-button"]').click();
      
      cy.window().then(win => {
        if (win.SpeechRecognition) {
          const recognition = new win.SpeechRecognition();
          expect(recognition.lang).to.eq(voiceLang);
        }
      });
    });
  });
});
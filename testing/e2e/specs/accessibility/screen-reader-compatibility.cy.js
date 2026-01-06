describe('Screen Reader Compatibility', () => {
  beforeEach(() => {
    cy.loginAsChild(8);
    cy.visit('/');
  });

  it('should provide comprehensive ARIA support', () => {
    cy.startStoryConversation('bedtime', 'web');
    
    // Check main conversation interface
    cy.get('[role="main"]').should('exist');
    cy.get('[role="dialog"]').should('exist');
    cy.get('[aria-live="polite"]').should('exist');
    
    // Check conversation messages have proper labels
    cy.get('[data-testid="conversation-message"]').each($message => {
      cy.wrap($message).should('have.attr', 'aria-label');
      cy.wrap($message).should('have.attr', 'role', 'article');
    });
    
    // Check input controls
    cy.get('[data-testid="message-input"]')
      .should('have.attr', 'aria-label')
      .should('have.attr', 'aria-describedby');
    
    cy.get('[data-testid="send-button"]')
      .should('have.attr', 'aria-label')
      .should('not.have.attr', 'aria-disabled', 'true');
  });

  it('should support keyboard navigation', () => {
    cy.startStoryConversation('adventure', 'web');
    
    // Test tab navigation
    cy.get('body').tab();
    cy.focused().should('have.attr', 'data-testid', 'message-input');
    
    cy.focused().tab();
    cy.focused().should('have.attr', 'data-testid', 'send-button');
    
    cy.focused().tab();
    cy.focused().should('have.attr', 'data-testid', 'voice-input-button');
    
    // Test keyboard shortcuts
    cy.get('[data-testid="message-input"]').type('Hello{enter}');
    
    cy.get('@lastResponse').should('exist');
  });

  it('should provide audio descriptions for visual content', () => {
    cy.startStoryConversation('bedtime', 'web');
    cy.completeCharacterCreation();
    
    // Wait for character art generation
    cy.wait(3000);
    
    cy.get('[data-testid="character-image"]').should($img => {
      expect($img).to.have.attr('alt');
      expect($img.attr('alt')).to.not.be.empty;
      expect($img.attr('alt')).to.include('character');
    });
    
    // Check for audio description availability
    cy.get('[data-testid="audio-description-button"]').should('exist');
    cy.get('[data-testid="audio-description-button"]').click();
    
    cy.get('[data-testid="audio-description"]').should('be.visible');
  });

  it('should support voice input for users with motor disabilities', () => {
    cy.startStoryConversation('educational', 'web');
    
    // Test voice input activation
    cy.get('[data-testid="voice-input-button"]')
      .should('have.attr', 'aria-label')
      .click();
    
    cy.get('[data-testid="voice-input-indicator"]').should('be.visible');
    
    // Simulate voice input (in real test, this would use Web Speech API)
    cy.window().then(win => {
      const mockSpeechRecognition = {
        start: cy.stub(),
        stop: cy.stub(),
        onresult: null,
        onerror: null
      };
      
      win.SpeechRecognition = () => mockSpeechRecognition;
      
      // Simulate speech recognition result
      if (mockSpeechRecognition.onresult) {
        mockSpeechRecognition.onresult({
          results: [{
            0: { transcript: 'My character is a brave knight' }
          }]
        });
      }
    });
    
    cy.get('[data-testid="message-input"]').should('have.value', 'My character is a brave knight');
  });

  it('should provide high contrast mode support', () => {
    cy.startStoryConversation('adventure', 'web');
    
    // Enable high contrast mode
    cy.get('[data-testid="accessibility-menu"]').click();
    cy.get('[data-testid="high-contrast-toggle"]').click();
    
    // Verify high contrast styles
    cy.get('body').should('have.class', 'high-contrast');
    
    // Check contrast ratios meet WCAG AA standards
    cy.get('[data-testid="conversation-message"]').should($messages => {
      $messages.each((index, message) => {
        const styles = window.getComputedStyle(message);
        const backgroundColor = styles.backgroundColor;
        const color = styles.color;
        
        // This would need a proper contrast ratio calculation
        expect(backgroundColor).to.not.equal(color);
      });
    });
  });

  it('should support screen reader announcements for story progression', () => {
    cy.startStoryConversation('bedtime', 'web');
    cy.completeCharacterCreation();
    
    // Check live region updates
    cy.get('[aria-live="polite"]').should('contain', 'Character created');
    
    cy.sendConversationMessage('Let\'s start the story');
    
    cy.get('[aria-live="polite"]').should('contain', 'Story beginning');
    
    // Test story beat announcements
    cy.sendConversationMessage('Go to the forest');
    
    cy.get('[aria-live="polite"]').should('contain', 'Story continues');
  });

  it('should provide alternative text for all generated images', () => {
    cy.startStoryConversation('adventure', 'web');
    cy.completeCharacterCreation();
    cy.completeStoryCreation();
    
    // Wait for all assets to generate
    cy.wait(5000);
    
    // Check character images
    cy.get('[data-testid="character-headshot"]').should($img => {
      expect($img).to.have.attr('alt');
      expect($img.attr('alt')).to.include('character');
      expect($img.attr('alt').length).to.be.greaterThan(10);
    });
    
    // Check story illustrations
    cy.get('[data-testid="story-illustration"]').each($img => {
      cy.wrap($img).should('have.attr', 'alt');
      cy.wrap($img).should($el => {
        expect($el.attr('alt')).to.not.be.empty;
        expect($el.attr('alt').length).to.be.greaterThan(15);
      });
    });
    
    // Check cover art
    cy.get('[data-testid="cover-art"]').should($img => {
      expect($img).to.have.attr('alt');
      expect($img.attr('alt')).to.include('cover');
    });
  });

  it('should support assistive technology integration', () => {
    cy.testAssistiveTechnology();
    
    cy.startStoryConversation('educational', 'web');
    
    // Test with simulated screen reader
    cy.window().then(win => {
      // Mock screen reader API
      win.speechSynthesis = {
        speak: cy.stub().as('speechSpeak'),
        cancel: cy.stub(),
        getVoices: cy.stub().returns([
          { name: 'Test Voice', lang: 'en-US' }
        ])
      };
    });
    
    cy.get('[data-testid="read-aloud-button"]').click();
    
    cy.get('@speechSpeak').should('have.been.called');
  });

  it('should meet WCAG 2.1 AA compliance standards', () => {
    cy.startStoryConversation('bedtime', 'web');
    
    // Run comprehensive accessibility audit
    cy.checkAccessibility({
      rules: {
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true },
        'focus-management': { enabled: true },
        'aria-labels': { enabled: true },
        'heading-structure': { enabled: true },
        'landmark-roles': { enabled: true }
      }
    });
    
    // Test specific WCAG criteria
    cy.get('h1, h2, h3, h4, h5, h6').should('exist'); // Heading structure
    cy.get('[role="main"]').should('exist'); // Main landmark
    cy.get('[role="navigation"]').should('exist'); // Navigation landmark
    
    // Test focus indicators
    cy.get('button, input, [tabindex]').each($el => {
      cy.wrap($el).focus();
      cy.wrap($el).should('have.css', 'outline-width').and('not.equal', '0px');
    });
  });
});
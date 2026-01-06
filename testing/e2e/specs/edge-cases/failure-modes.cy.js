describe('Edge Case Failure Modes', () => {
  beforeEach(() => {
    cy.loginAsChild(8);
    cy.visit('/');
  });

  describe('Network and Connectivity Issues', () => {
    it('should handle network interruptions gracefully', () => {
      cy.startStoryConversation('adventure', 'web');
      cy.sendConversationMessage('Let\'s create a character');
      
      // Simulate network interruption
      cy.testEdgeCaseScenario('network_interruption');
      
      // Verify graceful handling
      cy.get('[data-testid="connection-status"]').should('contain', 'Reconnecting');
      
      // Restore connection
      cy.intercept('POST', '**/conversation/message', { fixture: 'conversation-response.json' }).as('restored');
      
      cy.sendConversationMessage('Are we back online?');
      cy.wait('@restored');
      
      cy.get('@lastResponse').then(response => {
        expect(response.connectionRecovery.successful).to.be.true;
        expect(response.conversationState.preserved).to.be.true;
      });
    });

    it('should handle slow network conditions', () => {
      // Simulate slow network (3G conditions)
      cy.intercept('POST', '**/conversation/message', (req) => {
        req.reply((res) => {
          res.delay(5000); // 5 second delay
          res.send({ fixture: 'conversation-response.json' });
        });
      }).as('slowNetwork');
      
      cy.startStoryConversation('bedtime', 'web');
      cy.sendConversationMessage('Test slow network');
      
      // Verify loading state
      cy.get('[data-testid="loading-indicator"]').should('be.visible');
      cy.get('[data-testid="slow-connection-warning"]').should('be.visible');
      
      cy.wait('@slowNetwork');
      
      // Verify eventual success
      cy.get('@lastResponse').should('exist');
      cy.get('[data-testid="loading-indicator"]').should('not.exist');
    });

    it('should handle WebSocket connection failures', () => {
      cy.window().then(win => {
        // Mock WebSocket failure
        const originalWebSocket = win.WebSocket;
        win.WebSocket = function() {
          throw new Error('WebSocket connection failed');
        };
        
        cy.startStoryConversation('educational', 'web');
        
        // Should fallback to HTTP polling
        cy.get('[data-testid="connection-mode"]').should('contain', 'HTTP Polling');
        
        cy.sendConversationMessage('Testing fallback mode');
        
        cy.get('@lastResponse').then(response => {
          expect(response.connectionMode).to.eq('http_polling');
          expect(response.response).to.not.be.empty;
        });
        
        // Restore WebSocket
        win.WebSocket = originalWebSocket;
      });
    });
  });

  describe('Content and Input Edge Cases', () => {
    it('should handle inappropriate content attempts', () => {
      cy.testEdgeCaseScenario('inappropriate_content');
    });

    it('should handle extremely long input', () => {
      const longInput = 'A'.repeat(10000); // 10k character input
      
      cy.startStoryConversation('adventure', 'web');
      cy.sendConversationMessage(longInput);
      
      cy.get('@lastResponse').then(response => {
        expect(response.inputValidation.truncated).to.be.true;
        expect(response.inputValidation.originalLength).to.eq(10000);
        expect(response.inputValidation.processedLength).to.be.lessThan(1000);
        expect(response.response).to.include('shorter message');
      });
    });

    it('should handle special characters and emojis', () => {
      const specialInputs = [
        '🦄✨🌟 My character is magical! 🎭🎪',
        'Héllö wörld with àccénts',
        '中文字符测试',
        'العربية اختبار',
        '🤖💻📱 Tech story with emojis',
        '<script>alert("xss")</script>',
        'SQL injection \'; DROP TABLE users; --'
      ];
      
      specialInputs.forEach(input => {
        cy.startStoryConversation('educational', 'web');
        cy.sendConversationMessage(input);
        
        cy.get('@lastResponse').then(response => {
          expect(response.inputSanitization.applied).to.be.true;
          expect(response.response).to.not.include(['<script>', 'DROP TABLE']);
          expect(response.response).to.not.be.empty;
        });
      });
    });

    it('should handle contradictory character information', () => {
      cy.testEdgeCaseScenario('character_contradiction');
    });

    it('should handle rapid-fire messages', () => {
      cy.startStoryConversation('adventure', 'web');
      
      // Send multiple messages rapidly
      const rapidMessages = [
        'Quick message 1',
        'Quick message 2',
        'Quick message 3',
        'Quick message 4',
        'Quick message 5'
      ];
      
      rapidMessages.forEach((message, index) => {
        cy.sendConversationMessage(message);
        
        if (index > 2) {
          // Should implement rate limiting
          cy.get('@lastResponse').then(response => {
            expect(response.rateLimiting.applied).to.be.true;
            expect(response.rateLimiting.waitTime).to.be.greaterThan(0);
          });
        }
      });
    });
  });

  describe('Conversation State Edge Cases', () => {
    it('should handle conversation abandonment and resumption', () => {
      cy.testEdgeCaseScenario('conversation_abandonment');
    });

    it('should handle multiple browser tabs/sessions', () => {
      cy.startStoryConversation('bedtime', 'web');
      cy.sendConversationMessage('Starting in tab 1');
      
      // Simulate second tab
      cy.window().then(win => {
        const sessionId = win.localStorage.getItem('currentSessionId');
        
        // Open "second tab" by making direct API call
        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/conversation/message`,
          headers: {
            'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
          },
          body: {
            sessionId,
            message: 'Message from tab 2',
            tabId: 'tab_2'
          }
        }).then(response => {
          expect(response.body.sessionConflict.detected).to.be.true;
          expect(response.body.sessionConflict.resolution).to.eq('merge_contexts');
        });
      });
    });

    it('should handle session timeout and recovery', () => {
      cy.startStoryConversation('educational', 'web');
      cy.sendConversationMessage('Initial message');
      
      // Simulate session timeout
      cy.wait(30000); // Wait for session timeout
      
      cy.sendConversationMessage('Message after timeout');
      
      cy.get('@lastResponse').then(response => {
        expect(response.sessionRecovery.attempted).to.be.true;
        expect(response.sessionRecovery.successful).to.be.true;
        expect(response.conversationContext.restored).to.be.true;
      });
    });

    it('should handle corrupted conversation state', () => {
      cy.startStoryConversation('adventure', 'web');
      
      // Corrupt local storage
      cy.window().then(win => {
        win.localStorage.setItem('conversationState', 'corrupted-data');
      });
      
      cy.sendConversationMessage('Test with corrupted state');
      
      cy.get('@lastResponse').then(response => {
        expect(response.stateRecovery.corruptionDetected).to.be.true;
        expect(response.stateRecovery.fallbackApplied).to.be.true;
        expect(response.response).to.not.be.empty;
      });
    });
  });

  describe('External Service Failures', () => {
    it('should handle OpenAI API failures', () => {
      cy.intercept('POST', '**/openai/**', { statusCode: 503 }).as('openaiFailure');
      
      cy.startStoryConversation('bedtime', 'web');
      cy.sendConversationMessage('Create a story');
      
      cy.get('@lastResponse').then(response => {
        expect(response.fallbackMode.activated).to.be.true;
        expect(response.fallbackMode.provider).to.eq('local_model');
        expect(response.response).to.include('experiencing high demand');
      });
    });

    it('should handle ElevenLabs voice synthesis failures', () => {
      cy.intercept('POST', '**/elevenlabs/**', { statusCode: 429 }).as('voiceFailure');
      
      cy.startStoryConversation('adventure', 'web');
      cy.get('[data-testid="enable-voice"]').click();
      
      cy.sendConversationMessage('Test voice synthesis');
      
      cy.get('@lastResponse').then(response => {
        expect(response.voiceFallback.applied).to.be.true;
        expect(response.voiceFallback.method).to.eq('browser_tts');
        expect(response.audioGeneration.fallbackUsed).to.be.true;
      });
    });

    it('should handle image generation service failures', () => {
      cy.startStoryConversation('bedtime', 'web');
      cy.completeCharacterCreation();
      
      // Mock image generation failure
      cy.intercept('POST', '**/image-generation/**', { statusCode: 500 }).as('imageFailure');
      
      cy.sendConversationMessage('That sounds perfect!'); // Trigger art generation
      
      cy.get('@lastResponse').then(response => {
        expect(response.assetGeneration.imageGeneration.failed).to.be.true;
        expect(response.assetGeneration.fallback.applied).to.be.true;
        expect(response.assetGeneration.fallback.type).to.eq('placeholder_image');
      });
    });

    it('should handle database connection issues', () => {
      cy.intercept('POST', '**/api/**', { statusCode: 503 }).as('dbFailure');
      
      cy.startStoryConversation('educational', 'web');
      cy.sendConversationMessage('Test database failure');
      
      cy.get('[data-testid="error-message"]').should('contain', 'temporarily unavailable');
      cy.get('[data-testid="retry-button"]').should('be.visible');
      
      // Test retry mechanism
      cy.intercept('POST', '**/api/**', { fixture: 'conversation-response.json' }).as('dbRecovered');
      cy.get('[data-testid="retry-button"]').click();
      
      cy.wait('@dbRecovered');
      cy.get('@lastResponse').should('exist');
    });
  });

  describe('Device and Browser Edge Cases', () => {
    it('should handle low memory conditions', () => {
      cy.window().then(win => {
        // Simulate low memory by creating large objects
        const memoryHog = [];
        for (let i = 0; i < 1000; i++) {
          memoryHog.push(new Array(10000).fill('memory-test'));
        }
        
        cy.startStoryConversation('adventure', 'web');
        cy.sendConversationMessage('Test low memory');
        
        cy.get('@lastResponse').then(response => {
          expect(response.performanceOptimization.lowMemoryMode).to.be.true;
          expect(response.response).to.not.be.empty;
        });
      });
    });

    it('should handle browser compatibility issues', () => {
      cy.window().then(win => {
        // Mock older browser (remove modern APIs)
        delete win.fetch;
        delete win.WebSocket;
        delete win.SpeechRecognition;
        
        cy.startStoryConversation('bedtime', 'web');
        
        cy.get('[data-testid="browser-compatibility-warning"]').should('be.visible');
        cy.get('[data-testid="fallback-mode-indicator"]').should('be.visible');
        
        cy.sendConversationMessage('Test compatibility mode');
        
        cy.get('@lastResponse').then(response => {
          expect(response.compatibilityMode.enabled).to.be.true;
          expect(response.compatibilityMode.features.disabled).to.include('voice_input');
        });
      });
    });

    it('should handle mobile device constraints', () => {
      cy.viewport('iphone-x');
      
      cy.startStoryConversation('educational', 'web');
      
      // Test touch interactions
      cy.get('[data-testid="message-input"]').type('Mobile test message');
      cy.get('[data-testid="send-button"]').click();
      
      cy.get('@lastResponse').then(response => {
        expect(response.deviceOptimization.mobile).to.be.true;
        expect(response.deviceOptimization.touchOptimized).to.be.true;
      });
      
      // Test orientation change
      cy.viewport('iphone-x', 'landscape');
      
      cy.get('[data-testid="conversation-container"]').should('be.visible');
      cy.get('[data-testid="orientation-adapted"]').should('exist');
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle potential XSS attacks', () => {
      const xssAttempts = [
        '<img src="x" onerror="alert(1)">',
        '<script>document.cookie="hacked"</script>',
        'javascript:alert("xss")',
        '<iframe src="javascript:alert(1)"></iframe>'
      ];
      
      xssAttempts.forEach(xssPayload => {
        cy.startStoryConversation('adventure', 'web');
        cy.sendConversationMessage(xssPayload);
        
        cy.get('@lastResponse').then(response => {
          expect(response.securityFiltering.xssBlocked).to.be.true;
          expect(response.response).to.not.include(['<script>', 'javascript:', 'onerror']);
        });
      });
    });

    it('should handle CSRF attempts', () => {
      // Attempt request without proper CSRF token
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/conversation/start`,
        headers: {
          'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
          // Missing CSRF token
        },
        body: {
          intent: 'createStory',
          storyType: 'adventure'
        },
        failOnStatusCode: false
      }).then(response => {
        expect(response.status).to.eq(403);
        expect(response.body.error).to.include('CSRF');
      });
    });

    it('should handle token manipulation attempts', () => {
      const manipulatedToken = '[REDACTED_JWT]';
      
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/conversation/start`,
        headers: {
          'Authorization': `Bearer ${manipulatedToken}`
        },
        body: {
          intent: 'createStory',
          storyType: 'adventure'
        },
        failOnStatusCode: false
      }).then(response => {
        expect(response.status).to.eq(401);
        expect(response.body.error).to.include('Invalid token');
      });
    });
  });

  describe('Data Consistency Edge Cases', () => {
    it('should handle concurrent story modifications', () => {
      cy.startStoryConversation('adventure', 'web');
      cy.completeCharacterCreation();
      
      // Simulate concurrent modifications
      const modifications = [
        { field: 'character.name', value: 'NewName1' },
        { field: 'character.name', value: 'NewName2' },
        { field: 'character.species', value: 'dragon' }
      ];
      
      const modificationPromises = modifications.map(mod => {
        return cy.request({
          method: 'PATCH',
          url: `${Cypress.env('apiUrl')}/story/modify`,
          headers: {
            'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
          },
          body: mod
        });
      });
      
      Promise.all(modificationPromises).then(responses => {
        // Should handle conflicts gracefully
        const conflictResponse = responses.find(r => r.body.conflict);
        expect(conflictResponse).to.exist;
        expect(conflictResponse.body.conflict.resolution).to.eq('last_write_wins');
      });
    });

    it('should handle partial data corruption', () => {
      cy.startStoryConversation('bedtime', 'web');
      cy.completeCharacterCreation();
      
      // Simulate partial data corruption
      cy.window().then(win => {
        const corruptedState = {
          character: { name: 'Test' }, // Missing required fields
          story: null, // Null story object
          session: { id: 'invalid-session-id' }
        };
        
        win.localStorage.setItem('conversationState', JSON.stringify(corruptedState));
      });
      
      cy.sendConversationMessage('Continue with corrupted data');
      
      cy.get('@lastResponse').then(response => {
        expect(response.dataRecovery.corruptionDetected).to.be.true;
        expect(response.dataRecovery.recoveryMethod).to.eq('server_state_restore');
        expect(response.conversationState.valid).to.be.true;
      });
    });
  });

  describe('Performance Edge Cases', () => {
    it('should handle memory leaks in long conversations', () => {
      cy.startStoryConversation('adventure', 'web');
      
      // Simulate very long conversation
      for (let i = 0; i < 100; i++) {
        cy.sendConversationMessage(`Message ${i + 1}`);
        
        if (i % 20 === 0) {
          // Check memory usage periodically
          cy.window().then(win => {
            if (win.performance && win.performance.memory) {
              const memoryUsage = win.performance.memory.usedJSHeapSize;
              cy.log(`Memory usage at message ${i + 1}: ${memoryUsage} bytes`);
              
              // Should not exceed reasonable memory limits
              expect(memoryUsage).to.be.lessThan(100 * 1024 * 1024); // 100MB limit
            }
          });
        }
      }
    });

    it('should handle CPU-intensive operations', () => {
      cy.startStoryConversation('educational', 'web');
      
      // Trigger CPU-intensive operation (complex story generation)
      cy.sendConversationMessage('Create a very complex story with multiple characters and intricate plot');
      
      const startTime = Date.now();
      
      cy.get('@lastResponse').then(response => {
        const processingTime = Date.now() - startTime;
        
        expect(processingTime).to.be.lessThan(10000); // Should complete within 10 seconds
        expect(response.performanceMetrics.cpuOptimization).to.be.true;
        expect(response.response).to.not.be.empty;
      });
    });
  });
});
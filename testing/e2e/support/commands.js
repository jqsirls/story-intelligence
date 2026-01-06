// Custom Cypress commands for Storytailor testing

// Authentication commands
Cypress.Commands.add('loginAsParent', (email = Cypress.env('testParentEmail')) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/login`,
    body: {
      email,
      password: 'test-password',
      userType: 'parent'
    }
  }).then((response) => {
    window.localStorage.setItem('authToken', response.body.token);
    window.localStorage.setItem('userType', 'parent');
  });
});

Cypress.Commands.add('loginAsChild', (age = 8, parentEmail = Cypress.env('testParentEmail')) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/child-login`,
    body: {
      age,
      parentEmail,
      parentalConsent: true
    }
  }).then((response) => {
    window.localStorage.setItem('authToken', response.body.token);
    window.localStorage.setItem('userType', 'child');
    window.localStorage.setItem('childAge', age.toString());
  });
});

Cypress.Commands.add('loginAsEducator', (email = 'educator@school.edu') => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/educator-login`,
    body: {
      email,
      password: 'educator-password',
      institutionId: 'test-school-123'
    }
  }).then((response) => {
    window.localStorage.setItem('authToken', response.body.token);
    window.localStorage.setItem('userType', 'educator');
  });
});

// Conversation flow commands
Cypress.Commands.add('startStoryConversation', (storyType = 'bedtime', channel = 'web') => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/conversation/start`,
    headers: {
      'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
    },
    body: {
      intent: 'createStory',
      storyType,
      channel,
      userInput: `Let's create a ${storyType} story`
    }
  }).then((response) => {
    cy.wrap(response.body.sessionId).as('sessionId');
    cy.wrap(response.body.conversationState).as('conversationState');
  });
});

Cypress.Commands.add('sendConversationMessage', (message, expectedResponseType = null) => {
  cy.get('@sessionId').then((sessionId) => {
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/conversation/message`,
      headers: {
        'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
      },
      body: {
        sessionId,
        message,
        timestamp: new Date().toISOString()
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('response');
      expect(response.body.response.length).to.be.greaterThan(0);
      
      if (expectedResponseType) {
        expect(response.body.responseType).to.eq(expectedResponseType);
      }
      
      // Check response time requirement (<800ms)
      expect(response.duration).to.be.lessThan(800);
      
      cy.wrap(response.body).as('lastResponse');
    });
  });
});

Cypress.Commands.add('completeCharacterCreation', (characterTraits = {}) => {
  const defaultTraits = {
    name: 'Luna',
    species: 'unicorn',
    age: 'young',
    appearance: {
      color: 'silver',
      eyeColor: 'blue',
      specialFeatures: 'sparkly horn'
    },
    personality: ['kind', 'brave', 'curious'],
    ...characterTraits
  };
  
  // Name
  cy.sendConversationMessage(defaultTraits.name, 'character_trait_collection');
  
  // Species
  cy.sendConversationMessage(defaultTraits.species, 'character_trait_collection');
  
  // Age
  cy.sendConversationMessage(defaultTraits.age, 'character_trait_collection');
  
  // Appearance details
  Object.entries(defaultTraits.appearance).forEach(([key, value]) => {
    cy.sendConversationMessage(value, 'character_trait_collection');
  });
  
  // Personality traits
  defaultTraits.personality.forEach(trait => {
    cy.sendConversationMessage(trait, 'character_trait_collection');
  });
  
  // Confirm character
  cy.sendConversationMessage('That sounds perfect!', 'character_confirmation');
});

Cypress.Commands.add('completeStoryCreation', (storyChoices = []) => {
  const defaultChoices = [
    'Go into the magical forest',
    'Help the lost fairy',
    'Find the hidden treasure',
    'Return home safely',
    ...storyChoices
  ];
  
  defaultChoices.forEach((choice, index) => {
    cy.sendConversationMessage(choice, 'story_progression');
    
    // Wait for story beat generation
    cy.wait(1000);
  });
  
  // Finalize story
  cy.sendConversationMessage('I love this story!', 'story_finalization');
});

// Accessibility testing commands
Cypress.Commands.add('checkAccessibility', (options = {}) => {
  if (Cypress.env('enableAccessibilityTesting')) {
    cy.checkA11y(null, {
      rules: {
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true },
        'screen-reader': { enabled: true },
        'focus-management': { enabled: true },
        ...options.rules
      }
    }, (violations) => {
      if (violations.length > 0) {
        cy.log('Accessibility violations found:', violations);
      }
    });
  }
});

Cypress.Commands.add('testScreenReaderCompatibility', () => {
  // Test ARIA labels and roles
  cy.get('[role]').should('exist');
  cy.get('[aria-label]').should('exist');
  
  // Test keyboard navigation
  cy.get('body').tab();
  cy.focused().should('be.visible');
  
  // Test skip links
  cy.get('a[href="#main-content"]').should('exist');
});

Cypress.Commands.add('testAssistiveTechnology', () => {
  // Simulate screen reader interaction
  cy.window().then((win) => {
    const speechSynthesis = win.speechSynthesis;
    if (speechSynthesis) {
      expect(speechSynthesis.getVoices().length).to.be.greaterThan(0);
    }
  });
  
  // Test high contrast mode
  cy.get('body').should('have.css', 'background-color');
  cy.get('body').should('have.css', 'color');
});

// Multi-language testing commands
Cypress.Commands.add('switchLanguage', (language) => {
  cy.task('setLanguage', language);
  
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/user/language`,
    headers: {
      'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
    },
    body: { language }
  });
  
  cy.reload();
});

Cypress.Commands.add('testMultiLanguageConversation', (languages = ['en', 'es', 'fr']) => {
  languages.forEach(lang => {
    cy.switchLanguage(lang);
    cy.startStoryConversation('bedtime', 'web');
    cy.sendConversationMessage('Hello', 'greeting');
    
    cy.get('@lastResponse').then(response => {
      expect(response.language).to.eq(lang);
      expect(response.response).to.not.be.empty;
    });
  });
});

// Emotional journey testing commands
Cypress.Commands.add('setEmotionalState', (state) => {
  cy.task('setEmotionalState', state);
  
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/emotion/checkin`,
    headers: {
      'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
    },
    body: {
      mood: state,
      confidence: 0.9,
      context: 'test_scenario'
    }
  });
});

Cypress.Commands.add('testEmotionalJourney', (emotionalStates = ['sad', 'neutral', 'happy']) => {
  emotionalStates.forEach((state, index) => {
    cy.setEmotionalState(state);
    cy.startStoryConversation('therapeutic', 'web');
    
    cy.sendConversationMessage('I want to create a story', 'story_initiation');
    
    cy.get('@lastResponse').then(response => {
      // Verify story tone matches emotional state
      if (state === 'sad') {
        expect(response.storyTone).to.include('comforting');
      } else if (state === 'happy') {
        expect(response.storyTone).to.include('celebratory');
      }
    });
  });
});

// Classroom testing commands
Cypress.Commands.add('setupClassroomEnvironment', (studentCount = 5) => {
  cy.task('simulateClassroomEnvironment', { userCount: studentCount }).then((result) => {
    cy.wrap(result.sessionIds).as('classroomSessions');
  });
});

Cypress.Commands.add('testConcurrentUsers', (userCount = 5) => {
  const userPromises = [];
  
  for (let i = 0; i < userCount; i++) {
    const userPromise = cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/conversation/start`,
      headers: {
        'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
      },
      body: {
        intent: 'createStory',
        storyType: 'educational',
        channel: 'web',
        userId: `student_${i}`,
        userInput: 'Let\'s create an educational story'
      }
    });
    
    userPromises.push(userPromise);
  }
  
  // Verify all users can start conversations simultaneously
  Promise.all(userPromises).then(responses => {
    responses.forEach(response => {
      expect(response.status).to.eq(200);
      expect(response.duration).to.be.lessThan(800);
    });
  });
});

// Therapeutic pathway testing commands
Cypress.Commands.add('testTherapeuticPathway', (pathway) => {
  cy.task('validateTherapeuticPathway', pathway).then((validation) => {
    expect(validation.isValid).to.be.true;
    expect(validation.clinicalScore).to.be.greaterThan(70);
  });
  
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/therapeutic/pathway`,
    headers: {
      'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
    },
    body: {
      pathwayType: pathway,
      childAge: 8,
      therapeuticGoals: ['emotional_regulation', 'social_skills']
    }
  }).then((response) => {
    expect(response.status).to.eq(200);
    expect(response.body.pathway).to.have.property('steps');
    expect(response.body.pathway.steps.length).to.be.greaterThan(0);
  });
});

// Edge case testing commands
Cypress.Commands.add('testEdgeCaseScenario', (scenario) => {
  const edgeCases = {
    network_interruption: () => {
      cy.intercept('POST', '**/conversation/message', { forceNetworkError: true }).as('networkError');
      cy.sendConversationMessage('Test message');
      cy.wait('@networkError');
      
      // Should gracefully handle network errors
      cy.contains('Connection lost').should('be.visible');
    },
    
    inappropriate_content: () => {
      cy.sendConversationMessage('inappropriate content here');
      cy.get('@lastResponse').then(response => {
        expect(response.contentFiltered).to.be.true;
        expect(response.response).to.not.contain('inappropriate');
      });
    },
    
    character_contradiction: () => {
      cy.sendConversationMessage('My character is a dog');
      cy.sendConversationMessage('Actually, my character is a cat');
      
      cy.get('@lastResponse').then(response => {
        expect(response.responseType).to.eq('clarification_request');
      });
    },
    
    conversation_abandonment: () => {
      cy.startStoryConversation('adventure');
      cy.sendConversationMessage('Let\'s start');
      
      // Simulate abandonment (no response for 5 minutes)
      cy.wait(5000);
      
      cy.sendConversationMessage('I\'m back');
      cy.get('@lastResponse').then(response => {
        expect(response.responseType).to.eq('conversation_resumption');
      });
    }
  };
  
  if (edgeCases[scenario]) {
    edgeCases[scenario]();
  } else {
    throw new Error(`Unknown edge case scenario: ${scenario}`);
  }
});

// Personality consistency testing commands
Cypress.Commands.add('testPersonalityConsistency', (interactionCount = 10) => {
  const interactions = [];
  
  for (let i = 0; i < interactionCount; i++) {
    cy.sendConversationMessage(`Test interaction ${i + 1}`);
    
    cy.get('@lastResponse').then(response => {
      interactions.push({
        message: response.response,
        personalityScore: response.personalityMetrics?.consistency || Math.random(),
        warmth: response.personalityMetrics?.warmth || Math.random(),
        whimsy: response.personalityMetrics?.whimsy || Math.random(),
        empathy: response.personalityMetrics?.empathy || Math.random()
      });
    });
  }
  
  cy.then(() => {
    cy.task('checkPersonalityConsistency', interactions).then((result) => {
      expect(result.isConsistent).to.be.true;
      expect(result.consistencyScore).to.be.greaterThan(0.8);
      
      if (result.deviations.length > 0) {
        cy.log('Personality deviations detected:', result.deviations);
      }
    });
  });
});

// Performance testing commands
Cypress.Commands.add('measureResponseTime', (expectedMaxTime = 800) => {
  const startTime = Date.now();
  
  cy.sendConversationMessage('Performance test message').then(() => {
    const responseTime = Date.now() - startTime;
    expect(responseTime).to.be.lessThan(expectedMaxTime);
    cy.log(`Response time: ${responseTime}ms`);
  });
});

Cypress.Commands.add('testVoiceProcessingLatency', () => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/voice/process`,
    headers: {
      'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
    },
    body: {
      audioData: 'base64-encoded-audio-data',
      format: 'wav'
    }
  }).then((response) => {
    expect(response.status).to.eq(200);
    expect(response.duration).to.be.lessThan(500); // Voice processing should be under 500ms
    expect(response.body).to.have.property('transcription');
  });
});
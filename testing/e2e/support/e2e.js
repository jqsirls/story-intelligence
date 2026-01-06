// Import Cypress commands
import './commands';
import 'cypress-axe';

// Global test configuration
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing on uncaught exceptions
  // that are expected in our testing scenarios
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  return true;
});

// Setup accessibility testing
beforeEach(() => {
  if (Cypress.env('enableAccessibilityTesting')) {
    cy.injectAxe();
  }
});

// Setup emotional state tracking
beforeEach(() => {
  cy.task('setEmotionalState', 'neutral');
});

// Setup multi-language testing
beforeEach(() => {
  const testLanguage = Cypress.env('TEST_LANGUAGE') || 'en';
  cy.task('setLanguage', testLanguage);
});

// Global error handling for conversation flows
Cypress.on('fail', (error, runnable) => {
  // Log conversation state for debugging
  cy.window().then((win) => {
    if (win.conversationState) {
      console.log('Conversation State at Failure:', win.conversationState);
    }
  });
  
  throw error;
});

// Performance monitoring
beforeEach(() => {
  cy.window().then((win) => {
    win.performance.mark('test-start');
  });
});

afterEach(() => {
  cy.window().then((win) => {
    win.performance.mark('test-end');
    win.performance.measure('test-duration', 'test-start', 'test-end');
    
    const measures = win.performance.getEntriesByType('measure');
    const testDuration = measures.find(m => m.name === 'test-duration');
    
    if (testDuration && testDuration.duration > 30000) {
      cy.log(`Warning: Test took ${testDuration.duration}ms - exceeding 30s threshold`);
    }
  });
});
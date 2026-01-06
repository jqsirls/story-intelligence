const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:3000',
    supportFile: 'testing/e2e/support/e2e.js',
    specPattern: 'testing/e2e/specs/**/*.cy.js',
    fixturesFolder: 'testing/e2e/fixtures',
    screenshotsFolder: 'testing/e2e/screenshots',
    videosFolder: 'testing/e2e/videos',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 30000,
    responseTimeout: 30000,
    pageLoadTimeout: 60000,
    experimentalStudio: true,
    experimentalWebKitSupport: true,
    env: {
      apiUrl: process.env.API_BASE_URL || 'http://localhost:3000/api',
      apiKey: process.env.API_KEY || 'test-api-key',
      alexaSimulatorUrl: process.env.ALEXA_SIMULATOR_URL || 'http://localhost:4000',
      testUserEmail: process.env.TEST_USER_EMAIL || 'test@storytailor.com',
      testParentEmail: process.env.TEST_PARENT_EMAIL || 'parent@storytailor.com',
      enableAccessibilityTesting: true,
      enableMultiLanguageTesting: true,
      enableEmotionalJourneyTesting: true,
      enableClassroomTesting: true,
      enableTherapeuticTesting: true,
      enablePersonalityTesting: true
    },
    setupNodeEvents(on, config) {
      // Accessibility testing plugin
      require('cypress-axe/src/index.js')(on, config);
      
      // Multi-language testing support
      on('task', {
        setLanguage(lang) {
          process.env.TEST_LANGUAGE = lang;
          return null;
        },
        
        getEmotionalState() {
          return process.env.TEST_EMOTIONAL_STATE || 'neutral';
        },
        
        setEmotionalState(state) {
          process.env.TEST_EMOTIONAL_STATE = state;
          return null;
        },
        
        simulateClassroomEnvironment(config) {
          // Setup multiple concurrent user sessions
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({ sessionIds: config.userCount });
            }, 1000);
          });
        },
        
        validateTherapeuticPathway(pathway) {
          // Clinical validation simulation
          return {
            isValid: true,
            clinicalScore: Math.random() * 100,
            recommendations: ['Continue pathway', 'Monitor progress']
          };
        },
        
        checkPersonalityConsistency(interactions) {
          // Personality consistency analysis
          const consistency = interactions.reduce((acc, interaction) => {
            return acc + (interaction.personalityScore || 0);
          }, 0) / interactions.length;
          
          return {
            consistencyScore: consistency,
            isConsistent: consistency > 0.8,
            deviations: interactions.filter(i => i.personalityScore < 0.7)
          };
        }
      });
      
      return config;
    }
  },
  
  component: {
    devServer: {
      framework: 'react',
      bundler: 'webpack'
    },
    specPattern: 'testing/e2e/component/**/*.cy.js'
  }
});
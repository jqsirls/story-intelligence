module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages', '<rootDir>/testing'],
  testMatch: [
    '**/integration/**/*.test.ts',
    '**/integration/**/*.spec.ts',
    '**/?(*.)+(integration).test.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/*.test.ts',
    '!packages/*/src/**/*.spec.ts',
  ],
  coverageDirectory: 'integration-coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.js'],
  moduleNameMapping: {
    '^@alexa-multi-agent/shared-types$': '<rootDir>/packages/shared-types/src',
  },
  testTimeout: 30000, // 30 seconds for integration tests
  maxWorkers: 1, // Run integration tests sequentially
  verbose: true,
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '.',
      outputName: 'integration-test-results.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],
  globalSetup: '<rootDir>/testing/integration/global-setup.js',
  globalTeardown: '<rootDir>/testing/integration/global-teardown.js'
};
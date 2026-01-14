// Jest setup file for universal-agent package

// Keep real console output for receipt-grade failures and debugging.

// Use real timers for supertest/Express integration tests.
// Fake timers can cause requests/promises to stall and produce non-actionable failures.
jest.useRealTimers();

// Setup test environment
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {});
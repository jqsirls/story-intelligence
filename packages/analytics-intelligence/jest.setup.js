// Jest setup for analytics-intelligence package
process.env.NODE_ENV = 'test';

// Mock external dependencies
jest.mock('@supabase/supabase-js');
jest.mock('redis');
jest.mock('winston');
// Jest setup file for commerce-agent
// This file is run before each test file

// Mock environment variables
process.env.STRIPE_SECRET_KEY = 'sk_test_123';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_key';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.FRONTEND_URL = 'https://test.storytailor.com';
process.env.STRIPE_PRO_INDIVIDUAL_PRICE_ID = 'price_individual_123';
process.env.STRIPE_PRO_ORGANIZATION_PRICE_ID = 'price_org_123';

// Global test timeout
jest.setTimeout(10000);
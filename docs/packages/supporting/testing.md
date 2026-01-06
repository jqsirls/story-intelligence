# @storytailor/testing

**Package**: `@storytailor/testing`  
**Location**: `packages/testing/`  
**Version**: 1.0.0

## Overview

Comprehensive testing framework for Storytailor with 100/100 coverage requirement. Provides testing utilities, helpers, and infrastructure for unit, integration, and E2E tests.

## Features

- **Jest Configuration**: Complete Jest setup
- **Test Utilities**: Helpers for common testing patterns
- **Mock Services**: Supabase, AWS, and external service mocks
- **Coverage Tools**: Coverage reporting and thresholds

## Installation

```bash
npm install @storytailor/testing
```

## Usage

```typescript
import { 
  createTestUser,
  createTestStory,
  mockSupabaseClient,
  mockLambdaContext
} from '@storytailor/testing';

// Create test fixtures
const user = await createTestUser({ age: 8 });
const story = await createTestStory({ userId: user.id });

// Mock services
const supabase = mockSupabaseClient();
const context = mockLambdaContext();
```

## Test Commands

```bash
# Run all tests
npm run test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

## Related Documentation

- **Testing Guide**: See [Testing Documentation](../../testing/README.md)
- **Testing and Quality**: See [Testing and Quality](../../testing/testing-and-quality.md)


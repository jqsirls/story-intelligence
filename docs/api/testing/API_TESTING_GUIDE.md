# API Testing Guide

**Comprehensive Testing for REST APIs**

---

## Overview

Storytailor maintains 90%+ test coverage through:
- Unit tests for individual functions
- Integration tests for API endpoints
- Contract tests for API specifications
- Load tests for performance
- Security tests for vulnerabilities

---

## Test Structure

```
packages/universal-agent/
├── src/
│   └── api/
│       └── RESTAPIGateway.ts
└── __tests__/
    ├── unit/
    │   ├── handlers/
    │   │   ├── storyHandlers.test.ts
    │   │   ├── authHandlers.test.ts
    │   │   └── transferHandlers.test.ts
    │   └── middleware/
    │       ├── auth.test.ts
    │       ├── rateLimit.test.ts
    │       └── validation.test.ts
    ├── integration/
    │   ├── stories.integration.test.ts
    │   ├── transfers.integration.test.ts
    │   └── auth.integration.test.ts
    ├── contract/
    │   └── openapi.contract.test.ts
    └── fixtures/
        ├── users.ts
        ├── stories.ts
        └── characters.ts
```

---

## Unit Testing

### Handler Tests

```typescript
// __tests__/unit/handlers/storyHandlers.test.ts
import { createStoryHandler } from '../../../src/api/handlers/storyHandlers';
import { mockSupabase, mockRequest, mockResponse } from '../../helpers/mocks';

jest.mock('../../../src/services/supabase', () => ({
  getSupabaseClient: () => mockSupabase
}));

describe('Story Handlers', () => {
  describe('createStoryHandler', () => {
    it('should create a story with valid input', async () => {
      const req = mockRequest({
        params: { libraryId: 'library-uuid' },
        body: {
          title: 'Test Story',
          characterId: 'char-uuid',
          storyType: 'bedtime'
        },
        userId: 'user-uuid'
      });
      const res = mockResponse();
      
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'story-uuid', title: 'Test Story' },
              error: null
            })
          })
        })
      });
      
      await createStoryHandler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'story-uuid',
          title: 'Test Story'
        })
      });
    });
    
    it('should return 400 for missing required fields', async () => {
      const req = mockRequest({
        params: { libraryId: 'library-uuid' },
        body: { title: 'Test Story' }, // Missing characterId
        userId: 'user-uuid'
      });
      const res = mockResponse();
      
      await createStoryHandler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.any(String),
        code: 'ERR_2001'
      });
    });
    
    it('should return 403 when user lacks library access', async () => {
      const req = mockRequest({
        params: { libraryId: 'other-library-uuid' },
        body: {
          title: 'Test Story',
          characterId: 'char-uuid',
          storyType: 'bedtime'
        },
        userId: 'user-uuid'
      });
      const res = mockResponse();
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' }
            })
          })
        })
      });
      
      await createStoryHandler(req, res);
      
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
```

### Middleware Tests

```typescript
// __tests__/unit/middleware/auth.test.ts
import { authMiddleware } from '../../../src/api/middleware/auth';
import { mockRequest, mockResponse, mockNext } from '../../helpers/mocks';

describe('Auth Middleware', () => {
  it('should pass with valid Bearer token', async () => {
    const req = mockRequest({
      headers: { authorization: 'Bearer valid-token' }
    });
    const res = mockResponse();
    const next = mockNext();
    
    // Mock Supabase getUser
    jest.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: { id: 'user-uuid', email: 'test@example.com' } },
      error: null
    });
    
    await authMiddleware(req, res, next);
    
    expect(req.userId).toBe('user-uuid');
    expect(next).toHaveBeenCalled();
  });
  
  it('should return 401 without authorization header', async () => {
    const req = mockRequest({ headers: {} });
    const res = mockResponse();
    const next = mockNext();
    
    await authMiddleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
  
  it('should return 401 with expired token', async () => {
    const req = mockRequest({
      headers: { authorization: 'Bearer expired-token' }
    });
    const res = mockResponse();
    const next = mockNext();
    
    jest.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: null },
      error: { message: 'Token expired' }
    });
    
    await authMiddleware(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'ERR_1003' })
    );
  });
});
```

---

## Integration Testing

### API Integration Tests

```typescript
// __tests__/integration/stories.integration.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { createTestUser, createTestLibrary, cleanupTestData } from '../helpers/testData';

describe('Stories API Integration', () => {
  let authToken: string;
  let userId: string;
  let libraryId: string;
  
  beforeAll(async () => {
    const { token, id } = await createTestUser();
    authToken = token;
    userId = id;
    libraryId = await createTestLibrary(userId);
  });
  
  afterAll(async () => {
    await cleanupTestData(userId);
  });
  
  describe('POST /api/v1/libraries/:libraryId/stories', () => {
    it('should create a story and return 201', async () => {
      const response = await request(app)
        .post(`/api/v1/libraries/${libraryId}/stories`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Integration Test Story',
          characterId: 'test-char-uuid',
          storyType: 'adventure'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        title: 'Integration Test Story',
        storyType: 'adventure'
      });
      expect(response.headers['x-correlation-id']).toBeDefined();
    });
    
    it('should return paginated stories', async () => {
      // Create multiple stories
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post(`/api/v1/libraries/${libraryId}/stories`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: `Story ${i}`,
            characterId: 'test-char-uuid',
            storyType: 'bedtime'
          });
      }
      
      const response = await request(app)
        .get(`/api/v1/libraries/${libraryId}/stories?page=1&limit=3`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data.items).toHaveLength(3);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 3,
        hasNext: true
      });
    });
  });
  
  describe('Rate Limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      const requests = [];
      
      // Make 35 requests (limit is 30/min for free tier)
      for (let i = 0; i < 35; i++) {
        requests.push(
          request(app)
            .get(`/api/v1/libraries/${libraryId}/stories`)
            .set('Authorization', `Bearer ${authToken}`)
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
      expect(rateLimited[0].body.code).toBe('ERR_4001');
    });
  });
});
```

---

## Contract Testing

### OpenAPI Contract Tests

```typescript
// __tests__/contract/openapi.contract.test.ts
import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import request from 'supertest';
import { app } from '../../src/app';
import spec from '../../api/storytailor-api.yaml';

describe('OpenAPI Contract Tests', () => {
  let api: any;
  let ajv: Ajv;
  
  beforeAll(async () => {
    api = await SwaggerParser.dereference(spec);
    ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
  });
  
  describe('GET /api/v1/stories/{storyId}', () => {
    it('should match OpenAPI response schema', async () => {
      const response = await request(app)
        .get('/api/v1/libraries/test-lib/stories/test-story')
        .set('Authorization', 'Bearer test-token');
      
      const schema = api.paths['/libraries/{libraryId}/stories/{storyId}']
        .get.responses['200'].content['application/json'].schema;
      
      const validate = ajv.compile(schema);
      const valid = validate(response.body);
      
      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }
      
      expect(valid).toBe(true);
    });
  });
  
  describe('All documented endpoints', () => {
    const endpoints = Object.entries(api.paths).flatMap(([path, methods]) =>
      Object.entries(methods as Record<string, any>)
        .filter(([method]) => ['get', 'post', 'put', 'patch', 'delete'].includes(method))
        .map(([method, config]) => ({
          path: path.replace(/{(\w+)}/g, 'test-$1'),
          method: method.toUpperCase(),
          operationId: config.operationId
        }))
    );
    
    it.each(endpoints)('$method $path should return documented status', async ({ path, method }) => {
      const response = await request(app)
        [method.toLowerCase()](path.replace('/api/v1', ''))
        .set('Authorization', 'Bearer test-token');
      
      // Should return a documented status code
      const pathConfig = api.paths[path.replace('/test-', '/{')]?.[method.toLowerCase()];
      const documentedStatuses = Object.keys(pathConfig?.responses || {});
      
      expect(documentedStatuses).toContain(response.status.toString());
    });
  });
});
```

---

## Load Testing

### k6 Load Test Script

```javascript
// tests/load/api-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const requests = new Counter('requests');

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up
    { duration: '1m', target: 50 },    // Hold
    { duration: '30s', target: 100 },  // Peak
    { duration: '1m', target: 100 },   // Hold peak
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN;

export default function () {
  const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
  };
  
  // List stories
  const listRes = http.get(`${BASE_URL}/api/v1/libraries/test-lib/stories`, { headers });
  check(listRes, {
    'list status is 200': (r) => r.status === 200,
    'list duration < 500ms': (r) => r.timings.duration < 500,
  });
  requests.add(1);
  errorRate.add(listRes.status !== 200);
  
  // Get single story
  const getRes = http.get(`${BASE_URL}/api/v1/libraries/test-lib/stories/test-story`, { headers });
  check(getRes, {
    'get status is 200': (r) => r.status === 200,
  });
  requests.add(1);
  errorRate.add(getRes.status !== 200);
  
  // Create story
  const createRes = http.post(
    `${BASE_URL}/api/v1/libraries/test-lib/stories`,
    JSON.stringify({
      title: `Load Test Story ${Date.now()}`,
      characterId: 'test-char',
      storyType: 'adventure'
    }),
    { headers }
  );
  check(createRes, {
    'create status is 201': (r) => r.status === 201,
    'create duration < 1000ms': (r) => r.timings.duration < 1000,
  });
  requests.add(1);
  errorRate.add(createRes.status !== 201);
  
  sleep(1);
}
```

---

## Security Testing

### OWASP ZAP Integration

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  zap-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Start API
        run: |
          docker-compose up -d
          sleep 30
      
      - name: ZAP API Scan
        uses: zaproxy/action-api-scan@v0.5.0
        with:
          target: 'http://localhost:3000/api/v1/'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'
      
      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: zap-report
          path: report_html.html
```

---

## Test Helpers

```typescript
// __tests__/helpers/mocks.ts
import { Request, Response, NextFunction } from 'express';

export function mockRequest(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
    query: {},
    body: {},
    headers: {},
    userId: undefined,
    correlationId: 'test-correlation-id',
    ...overrides
  } as Request;
}

export function mockResponse(): Response {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res as Response;
}

export function mockNext(): NextFunction {
  return jest.fn();
}

// Test data factory
export async function createTestUser(overrides = {}) {
  const { data } = await supabase.auth.signUp({
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!'
  });
  
  return {
    id: data.user!.id,
    email: data.user!.email,
    token: data.session!.access_token
  };
}
```

---

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- stories.test.ts

# Run integration tests
npm run test:integration

# Run load tests
npm run test:load
```

---

**Last Updated**: December 23, 2025


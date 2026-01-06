// Comprehensive test utilities - NO SHORTCUTS
import { jest } from '@jest/globals';

export interface TestUser {
  id: string;
  email: string;
  age: number;
  role: 'child' | 'parent' | 'educator';
}

export interface TestCharacter {
  id: string;
  name: string;
  traits: string[];
  userId: string;
}

export interface TestStory {
  id: string;
  title: string;
  type: 'adventure' | 'bedtime' | 'educational' | 'therapeutic';
  characterId: string;
  userId: string;
}

export class TestDataFactory {
  static generateUser(overrides?: Partial<TestUser>): TestUser {
    return {
      id: `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email: `test-${Date.now()}@storytailor.ai`,
      age: 10,
      role: 'child',
      ...overrides
    };
  }

  static generateCharacter(userId: string, overrides?: Partial<TestCharacter>): TestCharacter {
    return {
      id: `test-char-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: 'Test Hero',
      traits: ['brave', 'kind', 'curious'],
      userId,
      ...overrides
    };
  }

  static generateStory(userId: string, characterId: string, overrides?: Partial<TestStory>): TestStory {
    return {
      id: `test-story-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Test Adventure',
      type: 'adventure',
      characterId,
      userId,
      ...overrides
    };
  }
}

export class AgentTestHelper {
  static mockLambdaInvoke(responsePayload: any) {
    return jest.fn().mockResolvedValue({
      Payload: JSON.stringify(responsePayload)
    });
  }

  static mockEventBridgePublish() {
    return jest.fn().mockResolvedValue({
      FailedEntryCount: 0,
      Entries: [{ EventId: 'test-event-id' }]
    });
  }

  static mockSupabaseQuery(data: any[], error?: any) {
    return {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: data[0], error }),
      then: jest.fn().mockResolvedValue({ data, error })
    };
  }
}

export async function validateAgentResponse(response: any) {
  expect(response).toBeDefined();
  expect(response.statusCode).toBeDefined();
  expect(response.body).toBeDefined();
  
  const body = JSON.parse(response.body);
  expect(body.success).toBeDefined();
  
  if (response.statusCode === 200) {
    expect(body.success).toBe(true);
  }
  
  return body;
}

export function measureExecutionTime<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const start = Date.now();
  return fn().then(result => [result, Date.now() - start]);
}

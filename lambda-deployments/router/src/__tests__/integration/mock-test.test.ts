// Test to verify OpenAI mock is loaded
import OpenAI from 'openai';

describe('Mock Verification', () => {
  it('should use the mock OpenAI', () => {
    // Create an instance
    const openai = new OpenAI({ apiKey: 'test-key' });
    
    // Verify it's our mock
    expect(openai.chat).toBeDefined();
    expect(openai.chat.completions).toBeDefined();
    expect(openai.chat.completions.create).toBeDefined();
    expect(jest.isMockFunction(openai.chat.completions.create)).toBe(true);
  });

  it('should return mocked response', async () => {
    const openai = new OpenAI({ apiKey: 'test-key' });
    
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5',
      messages: [{ role: 'user', content: 'I want a bedtime story' }]
    });

    expect(response.choices[0].message.function_call).toBeDefined();
    expect(response.choices[0].message.function_call.name).toBe('classify_intent');
    
    const args = JSON.parse(response.choices[0].message.function_call.arguments);
    expect(args.intent_type).toBe('create_story');
    expect(args.story_type).toBe('bedtime');
  });
});
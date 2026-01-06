/**
 * AgentCard Tests
 */

import { AgentCardGenerator } from '../AgentCard';
import { A2AConfig } from '../types';

describe('AgentCardGenerator', () => {
  const mockConfig: A2AConfig = {
    baseUrl: 'https://storyintelligence.dev',
    webhookUrl: 'https://storyintelligence.dev/a2a/webhook',
    healthUrl: 'https://storyintelligence.dev/health',
    agentId: 'storytailor-agent',
    agentName: 'Storytailor Agent',
    agentVersion: '1.0.0',
    capabilities: ['storytelling', 'emotional-check-in', 'crisis-detection']
  };

  it('should generate valid agent card', async () => {
    const generator = new AgentCardGenerator(mockConfig);
    const card = await generator.generate();

    expect(card.id).toBe('storytailor-agent');
    expect(card.name).toBe('Storytailor Agent');
    expect(card.version).toBe('1.0.0');
    expect(card.capabilities).toEqual(['storytelling', 'emotional-check-in', 'crisis-detection']);
    expect(card.endpoints.service).toBe('https://storyintelligence.dev');
    expect(card.endpoints.webhook).toBe('https://storyintelligence.dev/a2a/webhook');
    expect(card.endpoints.health).toBe('https://storyintelligence.dev/health');
  });

  it('should validate required capabilities', async () => {
    const invalidConfig = {
      ...mockConfig,
      capabilities: ['storytelling'] // Missing required capabilities
    };

    const generator = new AgentCardGenerator(invalidConfig);
    await expect(generator.generate()).rejects.toThrow('Agent Card missing required capability');
  });

  it('should validate required fields', async () => {
    const invalidConfig = {
      ...mockConfig,
      agentId: ''
    };

    const generator = new AgentCardGenerator(invalidConfig);
    await expect(generator.generate()).rejects.toThrow('Agent Card missing required fields');
  });
});

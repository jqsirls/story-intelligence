/**
 * Agent Card Generator
 * 
 * Generates Storytailor Agent Card per A2A protocol specification.
 * Must match documentation: docs/platform/a2a/overview.md:88-105
 */

import { AgentCard, A2AConfig } from './types';
import { readFileSync } from 'fs';
import { join } from 'path';

export class AgentCardGenerator {
  constructor(private config: A2AConfig) {}

  /**
   * Generate Storytailor Agent Card
   * Must match A2A specification exactly
   */
  async generate(): Promise<AgentCard> {
    const version = this.getPackageVersion();
    
    const agentCard: AgentCard = {
      id: this.config.agentId,
      name: this.config.agentName,
      version: version,
      description: 'Storytailor Agent - Therapeutic storytelling for children with emotional intelligence and crisis detection',
      capabilities: this.config.capabilities,
      endpoints: {
        service: this.config.baseUrl,
        webhook: this.config.webhookUrl,
        health: this.config.healthUrl
      },
      authentication: {
        schemes: [
          {
            type: 'apiKey',
            name: 'X-API-Key',
            in: 'header',
            description: 'API key authentication'
          },
          {
            type: 'oauth2',
            name: 'OAuth2',
            in: 'header',
            description: 'OAuth 2.0 Bearer token authentication',
            flows: {
              clientCredentials: {
                tokenUrl: `${this.config.baseUrl}/api/v1/auth/token`,
                scopes: {
                  'a2a:read': 'Read access to A2A endpoints',
                  'a2a:write': 'Write access to A2A endpoints',
                  'a2a:admin': 'Admin access to A2A endpoints'
                }
              }
            }
          }
        ]
      },
      modalities: ['text', 'audio', 'video'],
      metadata: {
        provider: 'Storytailor Inc',
        documentation: 'https://docs.storytailor.com/a2a',
        support: 'support@storytailor.com'
      }
    };

    this.validateAgentCard(agentCard);
    return agentCard;
  }

  private getPackageVersion(): string {
    try {
      const packagePath = join(__dirname, '../../package.json');
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
      return packageJson.version || '1.0.0';
    } catch {
      return this.config.agentVersion || '1.0.0';
    }
  }

  private validateAgentCard(card: AgentCard): void {
    if (!card.id || !card.name || !card.version) {
      throw new Error('Agent Card missing required fields: id, name, version');
    }
    if (!card.endpoints.service) {
      throw new Error('Agent Card missing service endpoint');
    }
    if (!Array.isArray(card.capabilities) || card.capabilities.length === 0) {
      throw new Error('Agent Card must have at least one capability');
    }
    
    // Validate capabilities match documentation
    const requiredCapabilities = ['storytelling', 'emotional-check-in', 'crisis-detection'];
    for (const required of requiredCapabilities) {
      if (!card.capabilities.includes(required)) {
        throw new Error(`Agent Card missing required capability: ${required}`);
      }
    }
  }
}

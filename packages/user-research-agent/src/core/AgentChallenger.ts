/**
 * Agent Challenger - Interrogates other agents with data-backed challenges
 * Research agent can demand justification from any other agent
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { AgentChallenge, Evidence, Tension } from '../types';
import { Logger } from '../utils/logger';
import { ModelOrchestrator } from './ModelOrchestrator';

export class AgentChallenger {
  private supabase: SupabaseClient;
  private logger: Logger;
  private modelOrchestrator: ModelOrchestrator;
  private agentEndpoints: Map<string, string> = new Map();

  constructor(supabase: SupabaseClient, modelOrchestrator: ModelOrchestrator) {
    this.supabase = supabase;
    this.modelOrchestrator = modelOrchestrator;
    this.logger = new Logger('AgentChallenger');
    this.loadAgentEndpoints();
  }

  /**
   * Load agent endpoints from environment variables
   * Matches router's agent endpoint configuration pattern
   */
  private loadAgentEndpoints(): void {
    // Map agent names to environment variable names
    const agentEndpointMap: Record<string, string> = {
      'auth-agent': process.env.AUTH_AGENT_ENDPOINT || '',
      'content-agent': process.env.CONTENT_AGENT_ENDPOINT || '',
      'library-agent': process.env.LIBRARY_AGENT_ENDPOINT || '',
      'emotion-agent': process.env.EMOTION_AGENT_ENDPOINT || '',
      'commerce-agent': process.env.COMMERCE_AGENT_ENDPOINT || '',
      'insights-agent': process.env.INSIGHTS_AGENT_ENDPOINT || '',
      'smart-home-agent': process.env.SMART_HOME_AGENT_ENDPOINT || process.env.SMARTHOME_AGENT_ENDPOINT || '',
      'personality-agent': process.env.PERSONALITY_AGENT_ENDPOINT || '',
      'therapeutic-agent': process.env.THERAPEUTIC_AGENT_ENDPOINT || '',
      'knowledge-base-agent': process.env.KNOWLEDGE_BASE_AGENT_ENDPOINT || '',
      'localization-agent': process.env.LOCALIZATION_AGENT_ENDPOINT || '',
      'accessibility-agent': process.env.ACCESSIBILITY_AGENT_ENDPOINT || '',
      'child-safety-agent': process.env.CHILD_SAFETY_AGENT_ENDPOINT || '',
    };

    // Store endpoints in map
    Object.entries(agentEndpointMap).forEach(([agentName, endpoint]) => {
      if (endpoint) {
        this.agentEndpoints.set(agentName, endpoint);
        this.logger.debug(`Loaded endpoint for ${agentName}: ${endpoint.substring(0, 50)}...`);
      }
    });

    if (this.agentEndpoints.size === 0) {
      this.logger.warn('No agent endpoints configured. AgentChallenger will not be able to call agents.');
    } else {
      this.logger.info(`Loaded ${this.agentEndpoints.size} agent endpoints`);
    }
  }

  /**
   * Challenge another agent with data-backed question
   */
  async challengeAgent(
    tenantId: string,
    agentName: string,
    question: string,
    dataBacking: Evidence[]
  ): Promise<AgentChallenge> {
    this.logger.info(`Challenging ${agentName}: ${question}`);

    // Call the agent via HTTP (matching router's AgentDelegator pattern)
    const agentResponse = await this.callAgentViaHTTP(agentName, question);
    const synthesis = await this.synthesizeChallenge(question, dataBacking, agentResponse);

    const challenge: AgentChallenge = {
      id: crypto.randomUUID(),
      tenantId,
      challengedAgent: agentName,
      question,
      dataBacking,
      agentResponse,
      synthesis,
      actionable: this.isActionable(synthesis),
      createdAt: new Date()
    };

    // Save to database
    await this.supabase
      .from('research_agent_challenges')
      .insert([{
        tenant_id: challenge.tenantId,
        challenged_agent: challenge.challengedAgent,
        question: challenge.question,
        data_backing: challenge.dataBacking,
        agent_response: challenge.agentResponse,
        synthesis: challenge.synthesis,
        actionable: challenge.actionable
      }]);

    return challenge;
  }

  /**
   * Call agent via HTTP endpoint (matching router's AgentDelegator pattern)
   * Agents are accessed via Lambda Function URLs or API Gateway endpoints
   */
  private async callAgentViaHTTP(agentName: string, question: string): Promise<string> {
    const endpoint = this.agentEndpoints.get(agentName);
    
    if (!endpoint) {
      this.logger.warn(`No endpoint configured for agent: ${agentName}. Returning placeholder response.`);
      return `[Agent ${agentName} endpoint not configured. Cannot challenge agent.]`;
    }

    try {
      // Create a challenge request payload
      // Note: This is a simplified challenge format. In production, agents might need
      // a specific challenge endpoint or we might need to adapt the request format
      const payload = {
        challenge: {
          question,
          source: 'fieldnotes-research-agent',
          timestamp: new Date().toISOString(),
        },
      };

      this.logger.info(`Calling ${agentName} at ${endpoint.substring(0, 50)}...`);

      // Make HTTP request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Fieldnotes-AgentChallenger/1.0.0',
            'X-Challenge-Source': 'fieldnotes',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          this.logger.warn(`Agent ${agentName} returned HTTP ${response.status}: ${response.statusText}`);
          return `[Agent ${agentName} returned error: HTTP ${response.status}]`;
        }

        const responseData: any = await response.json();
        
        // Extract response text from agent response
        // Agents may return different formats, so we try to extract meaningful text
        if (typeof responseData === 'string') {
          return responseData;
        } else if (responseData?.data?.message) {
          return responseData.data.message;
        } else if (responseData?.message) {
          return responseData.message;
        } else if (responseData?.response) {
          return responseData.response;
        } else {
          // Fallback: stringify the response
          return JSON.stringify(responseData, null, 2);
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          this.logger.warn(`Agent ${agentName} request timed out`);
          return `[Agent ${agentName} request timed out after 10 seconds]`;
        }
        
        throw fetchError;
      }
    } catch (error: any) {
      this.logger.error(`Failed to call agent ${agentName}`, {
        error: error.message,
        endpoint: endpoint.substring(0, 50),
      });
      return `[Failed to call agent ${agentName}: ${error.message}]`;
    }
  }

  /**
   * Synthesize challenge and response into insight
   */
  private async synthesizeChallenge(
    question: string,
    dataBacking: Evidence[],
    agentResponse: string
  ): Promise<string> {
    const prompt = `
You are synthesizing a research challenge to an AI agent.

Question asked: ${question}

Data backing the question:
${dataBacking.map(e => `- ${e.metric}: ${e.value}`).join('\n')}

Agent's response: ${agentResponse}

Synthesize this into a clear, actionable insight for the product team.
Focus on:
1. What the data reveals
2. What the agent's justification is
3. Whether the agent's logic holds up
4. What action should be taken

Be direct. No fluff.
`;

    const result = await this.modelOrchestrator.complete(
      'adversarialCritique',
      prompt,
      { maxTokens: 500 }
    );

    return result.response;
  }

  /**
   * Determine if synthesis is actionable
   */
  private isActionable(synthesis: string): boolean {
    const actionWords = [
      'should',
      'must',
      'recommend',
      'fix',
      'change',
      'remove',
      'add',
      'improve'
    ];

    const synthesisLower = synthesis.toLowerCase();
    return actionWords.some(word => synthesisLower.includes(word));
  }

  /**
   * Generate challenge questions based on patterns
   */
  async generateChallengesFromPatterns(
    tenantId: string,
    patterns: any[]
  ): Promise<AgentChallenge[]> {
    const challenges: AgentChallenge[] = [];

    for (const pattern of patterns) {
      // Generate challenge for concerning patterns
      if (pattern.frequency > 100 && pattern.confidence > 0.8) {
        const agent = this.identifyResponsibleAgent(pattern.type);
        
        if (agent) {
          const challenge = await this.challengeAgent(
            tenantId,
            agent,
            `Why is ${pattern.type} occurring ${pattern.frequency} times? This affects user experience.`,
            [{
              metric: pattern.type,
              value: pattern.frequency,
              source: 'pattern_detection'
            }]
          );
          
          challenges.push(challenge);
        }
      }
    }

    return challenges;
  }

  /**
   * Identify which agent is responsible for a pattern
   */
  private identifyResponsibleAgent(patternType: string): string | null {
    const patternLower = patternType.toLowerCase();

    if (patternLower.includes('story') || patternLower.includes('character')) {
      return 'content-agent';
    }
    if (patternLower.includes('payment') || patternLower.includes('subscription')) {
      return 'commerce-agent';
    }
    if (patternLower.includes('library') || patternLower.includes('favorite')) {
      return 'library-agent';
    }
    if (patternLower.includes('emotion') || patternLower.includes('mood')) {
      return 'emotion-agent';
    }
    if (patternLower.includes('auth') || patternLower.includes('login')) {
      return 'auth-agent';
    }

    return null;
  }

  /**
   * Format all tensions for brief
   */
  formatTensionsForBrief(tensions: Tension[]): string {
    if (tensions.length === 0) {
      return 'No major tensions detected this week.';
    }

    const prioritized = tensions.sort((a, b) => 
      a.forceChoiceBy.getTime() - b.forceChoiceBy.getTime()
    );

    return prioritized
      .slice(0, 3) // Top 3 tensions
      .map((t, i) => this.formatSingleTension(t, i + 1))
      .join('\n\n---\n\n');
  }

  /**
   * Format single tension
   */
  private formatSingleTension(tension: Tension, index: number): string {
    const daysUntilChoice = Math.ceil(
      (tension.forceChoiceBy.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );

    return `
### Tension ${index}: ${tension.description}

**Conflicting Priorities:**
${tension.conflictingPriorities.map(p => `- ${p}`).join('\n')}

**Force Choice By:** ${tension.forceChoiceBy.toDateString()} (${daysUntilChoice} days from now)

**Cost of Inaction:** ${tension.costOfInaction}
`.trim();
  }
}

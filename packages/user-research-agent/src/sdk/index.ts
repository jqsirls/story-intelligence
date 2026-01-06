/**
 * Fieldnotes Client SDK
 * TypeScript SDK for programmatic access to research intelligence
 */

import fetch from 'node-fetch';
import {
  AnalysisRequest,
  AnalysisResult,
  Feature,
  PreLaunchMemo,
  Brief,
  AgentChallenge,
  APIResponse
} from '../types';

export interface FieldnotesClientConfig {
  apiUrl: string;
  apiKey: string;
  timeout?: number;
}

export class FieldnotesClient {
  private config: FieldnotesClientConfig;

  constructor(config: FieldnotesClientConfig) {
    this.config = {
      ...config,
      timeout: config.timeout || 30000
    };
  }

  /**
   * Analyze behavior on-demand
   */
  async analyze(request: Partial<AnalysisRequest>): Promise<AnalysisResult> {
    const response = await this.request<AnalysisResult>('/api/v1/analyze', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'storytailor',
        timeframe: '7 days',
        ...request
      })
    });

    return response;
  }

  /**
   * Generate pre-launch memo for a feature
   */
  async preLaunchMemo(feature: Feature): Promise<PreLaunchMemo> {
    const response = await this.request<PreLaunchMemo>('/api/v1/pre-mortem', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: 'storytailor',
        feature
      })
    });

    return response;
  }

  /**
   * Get latest research brief
   */
  async getLatestBrief(tenantId: string = 'storytailor'): Promise<Brief | null> {
    const response = await this.request<{ brief: Brief | null }>('/api/v1/briefs/latest', {
      method: 'GET',
      query: { tenantId }
    });

    return response.brief;
  }

  /**
   * Configure webhook delivery
   */
  async configureWebhook(
    url: string,
    events?: string[],
    tenantId: string = 'storytailor'
  ): Promise<void> {
    await this.request('/api/v1/webhooks/configure', {
      method: 'POST',
      body: JSON.stringify({ tenantId, url, events })
    });
  }

  /**
   * Get usage and cost statistics
   */
  async getUsage(tenantId: string = 'storytailor'): Promise<any> {
    const response = await this.request<{ usage: any }>(`/api/v1/tenants/${tenantId}/usage`, {
      method: 'GET'
    });

    return response.usage;
  }

  /**
   * Challenge another agent
   */
  async challengeAgent(
    agentName: string,
    question: string,
    tenantId: string = 'storytailor'
  ): Promise<AgentChallenge> {
    const response = await this.request<AgentChallenge>('/api/v1/challenges', {
      method: 'POST',
      body: JSON.stringify({ tenantId, agentName, question })
    });

    return response;
  }

  /**
   * Make HTTP request to API
   */
  private async request<T = any>(
    path: string,
    options: {
      method: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: string;
      query?: Record<string, any>;
    }
  ): Promise<T> {
    const url = new URL(path, this.config.apiUrl);
    
    if (options.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey
        },
        body: options.body,
        signal: controller.signal
      });

      clearTimeout(timeout);

      const json = await response.json() as APIResponse<T>;

      if (!response.ok || !json.success) {
        throw new Error(json.error || `API error: ${response.status}`);
      }

      return json.data as T;
    } catch (error: any) {
      clearTimeout(timeout);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout}ms`);
      }
      
      throw error;
    }
  }
}

// Export convenience methods
export async function createClient(config: FieldnotesClientConfig): Promise<FieldnotesClient> {
  return new FieldnotesClient(config);
}

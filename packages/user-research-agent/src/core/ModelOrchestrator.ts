/**
 * Model Orchestrator - Intelligent LLM routing for cost optimization
 * Routes tasks to cheapest model that can handle them effectively
 */

import OpenAI from 'openai';
// @ts-ignore - Anthropic SDK types
import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '../utils/logger';

export type ModelType = 'gpt-4o-mini' | 'claude-haiku' | 'claude-sonnet' | 'gpt-4o';
export type TaskType = 'dataAggregation' | 'patternDetection' | 'adversarialCritique' | 'strategicSynthesis';

interface ModelCosts {
  input: number; // per 1M tokens
  output: number; // per 1M tokens
}

const MODEL_COSTS: Record<ModelType, ModelCosts> = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'claude-haiku': { input: 0.25, output: 1.25 },
  'claude-sonnet': { input: 3.00, output: 15.00 }
};

const TASK_MODEL_MAP: Record<TaskType, ModelType> = {
  dataAggregation: 'gpt-4o-mini',
  patternDetection: 'gpt-4o-mini',
  adversarialCritique: 'claude-haiku',
  strategicSynthesis: 'claude-sonnet'
};

export class ModelOrchestrator {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private logger: Logger;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.logger = new Logger('ModelOrchestrator');
  }

  /**
   * Complete a task using the appropriate model
   */
  async complete(
    taskType: TaskType,
    prompt: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<{ response: string; tokensUsed: number; cost: number }> {
    const model = TASK_MODEL_MAP[taskType];
    this.logger.info(`Routing ${taskType} to ${model}`);

    if (model.startsWith('gpt-')) {
      return this.completeOpenAI(model, prompt, options);
    } else {
      return this.completeAnthropic(model, prompt, options);
    }
  }

  /**
   * Complete using OpenAI
   */
  private async completeOpenAI(
    model: ModelType,
    prompt: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<{ response: string; tokensUsed: number; cost: number }> {
    const startTime = Date.now();

    const response = await this.openai.chat.completions.create({
      model: model === 'gpt-4o-mini' ? 'gpt-4o-mini' : 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options?.maxTokens || 4000,
      temperature: options?.temperature || 0.7
    });

    const tokensUsed = response.usage?.total_tokens || 0;
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;

    const costs = MODEL_COSTS[model];
    const cost = (inputTokens / 1000000 * costs.input) + 
                 (outputTokens / 1000000 * costs.output);

    const duration = Date.now() - startTime;
    this.logger.info(`OpenAI completion: ${tokensUsed} tokens, $${cost.toFixed(4)}, ${duration}ms`);

    return {
      response: response.choices[0]?.message?.content || '',
      tokensUsed,
      cost
    };
  }

  /**
   * Complete using Anthropic
   */
  private async completeAnthropic(
    model: ModelType,
    prompt: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<{ response: string; tokensUsed: number; cost: number }> {
    const startTime = Date.now();

    const modelName = model === 'claude-haiku' ? 'claude-3-haiku-20240307' : 'claude-3-5-sonnet-20241022';

    const response = await this.anthropic.messages.create({
      model: modelName,
      max_tokens: options?.maxTokens || 4000,
      temperature: options?.temperature || 0.7,
      messages: [{ role: 'user', content: prompt }]
    });

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const tokensUsed = inputTokens + outputTokens;

    const costs = MODEL_COSTS[model];
    const cost = (inputTokens / 1000000 * costs.input) + 
                 (outputTokens / 1000000 * costs.output);

    const duration = Date.now() - startTime;
    this.logger.info(`Anthropic completion: ${tokensUsed} tokens, $${cost.toFixed(4)}, ${duration}ms`);

    const textContent = response.content.find((c: any) => c.type === 'text');
    const responseText = textContent && textContent.type === 'text' ? textContent.text : '';

    return {
      response: responseText,
      tokensUsed,
      cost
    };
  }

  /**
   * Estimate cost for a prompt
   */
  estimateCost(taskType: TaskType, promptLength: number, expectedOutputLength: number = 1000): number {
    const model = TASK_MODEL_MAP[taskType];
    const costs = MODEL_COSTS[model];

    // Rough estimation: 4 chars per token
    const inputTokens = promptLength / 4;
    const outputTokens = expectedOutputLength / 4;

    return (inputTokens / 1000000 * costs.input) + 
           (outputTokens / 1000000 * costs.output);
  }

  /**
   * Get cheapest model for a task type
   */
  getModelForTask(taskType: TaskType): ModelType {
    return TASK_MODEL_MAP[taskType];
  }
}

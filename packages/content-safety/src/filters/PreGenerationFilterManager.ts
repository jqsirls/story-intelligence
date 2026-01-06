import OpenAI from 'openai';
import { Logger } from 'winston';
import {
  ContentSafetyRequest,
  PreGenerationFilter,
  PreFilterResult
} from '../types';
import { PromptSanitizationFilter } from './PromptSanitizationFilter';
import { RiskAssessmentFilter } from './RiskAssessmentFilter';
import { AgeAppropriatenessFilter } from './AgeAppropriatenessFilter';
import { ProfanityFilter } from './ProfanityFilter';
import { PersonalInfoFilter } from './PersonalInfoFilter';

export class PreGenerationFilterManager {
  private filters: PreGenerationFilter[] = [];
  private openai: OpenAI;
  private logger: Logger;

  constructor(openai: OpenAI, logger: Logger) {
    this.openai = openai;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    // Initialize all pre-generation filters
    this.filters = [
      new PromptSanitizationFilter(this.openai, this.logger),
      new RiskAssessmentFilter(this.openai, this.logger),
      new AgeAppropriatenessFilter(this.logger),
      new ProfanityFilter(this.logger),
      new PersonalInfoFilter(this.logger)
    ];

    // Sort by priority (higher priority first)
    this.filters.sort((a, b) => b.priority - a.priority);

    this.logger.info('PreGenerationFilterManager initialized', {
      filterCount: this.filters.length,
      filters: this.filters.map(f => ({ name: f.name, priority: f.priority, enabled: f.enabled }))
    });
  }

  async runFilters(request: ContentSafetyRequest): Promise<PreFilterResult> {
    this.logger.debug('Running pre-generation filters', {
      contentType: request.contentType,
      filterCount: this.filters.filter(f => f.enabled).length
    });

    let currentContent = request.content;
    const allWarnings: string[] = [];
    const allModifications: string[] = [];
    let highestRiskLevel: 'low' | 'medium' | 'high' = 'low';

    for (const filter of this.filters) {
      if (!filter.enabled) {
        continue;
      }

      try {
        const filterRequest = { ...request, content: currentContent };
        const result = await filter.filter(filterRequest);

        if (!result.allowed) {
          this.logger.warn('Content blocked by pre-generation filter', {
            filterName: filter.name,
            riskLevel: result.riskLevel,
            warnings: result.warnings
          });

          return {
            allowed: false,
            riskLevel: result.riskLevel,
            warnings: result.warnings,
            modifications: result.modifications
          };
        }

        // Accumulate warnings and modifications
        allWarnings.push(...result.warnings);
        allModifications.push(...result.modifications);

        // Update content if sanitized
        if (result.sanitizedPrompt) {
          currentContent = result.sanitizedPrompt;
        }

        // Track highest risk level
        if (result.riskLevel === 'high' || 
           (result.riskLevel === 'medium' && highestRiskLevel === 'low')) {
          highestRiskLevel = result.riskLevel;
        }

      } catch (error) {
        this.logger.error('Error in pre-generation filter', {
          filterName: filter.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Fail-safe: block content on filter error
        return {
          allowed: false,
          riskLevel: 'high',
          warnings: [`Filter ${filter.name} encountered an error`],
          modifications: []
        };
      }
    }

    return {
      allowed: true,
      riskLevel: highestRiskLevel,
      sanitizedPrompt: currentContent !== request.content ? currentContent : undefined,
      warnings: [...new Set(allWarnings)],
      modifications: [...new Set(allModifications)]
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Test with a simple, safe prompt
      const testRequest: ContentSafetyRequest = {
        content: 'Tell me a story about a friendly cat',
        contentType: 'story',
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'health_check',
          requestId: 'health_check'
        }
      };

      const result = await this.runFilters(testRequest);
      return result.allowed;
    } catch (error) {
      this.logger.error('PreGenerationFilterManager health check failed', { error });
      return false;
    }
  }

  getFilterStatus(): Array<{
    name: string;
    enabled: boolean;
    priority: number;
  }> {
    return this.filters.map(filter => ({
      name: filter.name,
      enabled: filter.enabled,
      priority: filter.priority
    }));
  }

  enableFilter(filterName: string): void {
    const filter = this.filters.find(f => f.name === filterName);
    if (filter) {
      filter.enabled = true;
      this.logger.info('Filter enabled', { filterName });
    }
  }

  disableFilter(filterName: string): void {
    const filter = this.filters.find(f => f.name === filterName);
    if (filter) {
      filter.enabled = false;
      this.logger.info('Filter disabled', { filterName });
    }
  }
}
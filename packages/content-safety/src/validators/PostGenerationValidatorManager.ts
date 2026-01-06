import OpenAI from 'openai';
import { Logger } from 'winston';
import {
  ContentSafetyRequest,
  PostGenerationValidator,
  ValidationResult
} from '../types';

export class PostGenerationValidatorManager {
  private validators: PostGenerationValidator[] = [];
  private openai: OpenAI;
  private logger: Logger;

  constructor(openai: OpenAI, logger: Logger) {
    this.openai = openai;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    // Initialize post-generation validators
    // In a full implementation, these would be separate classes
    this.logger.info('PostGenerationValidatorManager initialized');
  }

  async runValidators(
    content: string,
    request: ContentSafetyRequest
  ): Promise<ValidationResult[]> {
    this.logger.debug('Running post-generation validators', {
      contentType: request.contentType,
      validatorCount: this.validators.length
    });

    // Simple validation for now - in production this would use actual validators
    const results: ValidationResult[] = [];

    // Basic content validation
    const basicValidation = await this.validateBasicContent(content, request);
    results.push(basicValidation);

    // OpenAI moderation validation
    const moderationValidation = await this.validateWithOpenAI(content);
    results.push(moderationValidation);

    return results;
  }

  private async validateBasicContent(
    content: string,
    request: ContentSafetyRequest
  ): Promise<ValidationResult> {
    const issues: Array<{
      category: string;
      severity: number;
      description: string;
      location?: string;
    }> = [];

    // Check content length
    if (content.length < 10) {
      issues.push({
        category: 'content_length',
        severity: 0.8,
        description: 'Content is too short to be meaningful'
      });
    }

    // Check for completeness
    if (!content.trim().endsWith('.') && !content.trim().endsWith('!') && !content.trim().endsWith('?')) {
      issues.push({
        category: 'completeness',
        severity: 0.3,
        description: 'Content appears incomplete'
      });
    }

    return {
      valid: issues.length === 0,
      confidence: issues.length === 0 ? 0.9 : Math.max(0.1, 0.9 - issues.length * 0.2),
      issues,
      suggestions: issues.map(issue => `Address ${issue.category}: ${issue.description}`)
    };
  }

  private async validateWithOpenAI(content: string): Promise<ValidationResult> {
    try {
      const moderationResult = await this.openai.moderations.create({
        input: content,
        model: 'text-moderation-latest'
      });

      const flagged = moderationResult.results[0].flagged;
      const categories = moderationResult.results[0].categories;

      const issues: Array<{
        category: string;
        severity: number;
        description: string;
      }> = [];

      if (flagged) {
        Object.entries(categories).forEach(([category, isFlagged]) => {
          if (isFlagged) {
            issues.push({
              category: `openai_${category}`,
              severity: 0.9,
              description: `Content flagged for ${category}`
            });
          }
        });
      }

      return {
        valid: !flagged,
        confidence: flagged ? 0.1 : 0.95,
        issues,
        suggestions: flagged ? ['Content requires revision to meet safety standards'] : []
      };

    } catch (error) {
      this.logger.error('OpenAI validation failed', { error });
      return {
        valid: false,
        confidence: 0.0,
        issues: [{
          category: 'validation_error',
          severity: 1.0,
          description: 'Unable to validate content with OpenAI'
        }],
        suggestions: ['Content validation failed - manual review required']
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const testContent = 'This is a test message for validation.';
      const testRequest: ContentSafetyRequest = {
        content: testContent,
        contentType: 'story',
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'health_check',
          requestId: 'health_check'
        }
      };

      const results = await this.runValidators(testContent, testRequest);
      return results.length > 0;
    } catch (error) {
      this.logger.error('PostGenerationValidatorManager health check failed', { error });
      return false;
    }
  }
}
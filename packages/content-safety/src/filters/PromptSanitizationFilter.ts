import OpenAI from 'openai';
import { Logger } from 'winston';
import {
  ContentSafetyRequest,
  PreGenerationFilter,
  PreFilterResult
} from '../types';

export class PromptSanitizationFilter implements PreGenerationFilter {
  name = 'prompt_sanitization';
  priority = 100;
  enabled = true;

  private openai: OpenAI;
  private logger: Logger;

  constructor(openai: OpenAI, logger: Logger) {
    this.openai = openai;
    this.logger = logger;
  }

  async filter(request: ContentSafetyRequest): Promise<PreFilterResult> {
    this.logger.debug('Running prompt sanitization filter', {
      contentType: request.contentType,
      contentLength: request.content.length
    });

    const warnings: string[] = [];
    const modifications: string[] = [];
    let sanitizedContent = request.content;
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    try {
      // Check for injection attempts
      const injectionPatterns = [
        /ignore\s+previous\s+instructions/i,
        /forget\s+everything/i,
        /system\s*:\s*/i,
        /assistant\s*:\s*/i,
        /human\s*:\s*/i,
        /<\|.*?\|>/g,
        /\[INST\].*?\[\/INST\]/g,
        /###\s*instruction/i
      ];

      let hasInjection = false;
      for (const pattern of injectionPatterns) {
        if (pattern.test(request.content)) {
          hasInjection = true;
          sanitizedContent = sanitizedContent.replace(pattern, '');
          warnings.push('Removed potential prompt injection attempt');
          modifications.push('Sanitized prompt injection patterns');
          riskLevel = 'high';
        }
      }

      // Check for attempts to bypass safety measures
      const bypassPatterns = [
        /jailbreak/i,
        /DAN\s+mode/i,
        /developer\s+mode/i,
        /unrestricted/i,
        /no\s+filter/i,
        /bypass\s+safety/i
      ];

      for (const pattern of bypassPatterns) {
        if (pattern.test(request.content)) {
          sanitizedContent = sanitizedContent.replace(pattern, '');
          warnings.push('Removed safety bypass attempt');
          modifications.push('Removed safety bypass language');
          riskLevel = 'high';
        }
      }

      // Check for inappropriate content requests
      const inappropriatePatterns = [
        /generate\s+.*?(violent|sexual|harmful)/i,
        /create\s+.*?(inappropriate|adult|mature)/i,
        /write\s+.*?(disturbing|graphic|explicit)/i
      ];

      for (const pattern of inappropriatePatterns) {
        if (pattern.test(request.content)) {
          warnings.push('Request contains inappropriate content directive');
          riskLevel = 'high';
        }
      }

      // Age-specific sanitization
      if (request.userAge && request.userAge < 13) {
        const childUnsafePatterns = [
          /scary/i,
          /frightening/i,
          /nightmare/i,
          /monster/i,
          /ghost/i,
          /death/i,
          /die/i,
          /kill/i
        ];

        for (const pattern of childUnsafePatterns) {
          if (pattern.test(sanitizedContent)) {
            sanitizedContent = sanitizedContent.replace(pattern, 'adventure');
            warnings.push('Replaced potentially scary content for child user');
            modifications.push('Age-appropriate content substitution');
            riskLevel = riskLevel === 'high' ? 'high' : 'medium';
          }
        }
      }

      // Clean up excessive punctuation or formatting
      sanitizedContent = sanitizedContent
        .replace(/[!]{3,}/g, '!')
        .replace(/[?]{3,}/g, '?')
        .replace(/[.]{4,}/g, '...')
        .replace(/\s{3,}/g, ' ')
        .trim();

      if (sanitizedContent !== request.content) {
        modifications.push('Cleaned formatting and punctuation');
      }

      // Use OpenAI moderation as additional check
      const moderationResult = await this.openai.moderations.create({
        input: sanitizedContent,
        model: 'text-moderation-latest'
      });

      if (moderationResult.results[0].flagged) {
        const flaggedCategories = Object.entries(moderationResult.results[0].categories)
          .filter(([_, flagged]) => flagged)
          .map(([category, _]) => category);

        warnings.push(`OpenAI moderation flagged: ${flaggedCategories.join(', ')}`);
        riskLevel = 'high';

        return {
          allowed: false,
          riskLevel,
          warnings,
          modifications
        };
      }

      this.logger.debug('Prompt sanitization completed', {
        originalLength: request.content.length,
        sanitizedLength: sanitizedContent.length,
        riskLevel,
        warningCount: warnings.length
      });

      return {
        allowed: true,
        riskLevel,
        sanitizedPrompt: sanitizedContent !== request.content ? sanitizedContent : undefined,
        warnings,
        modifications
      };

    } catch (error) {
      this.logger.error('Error in prompt sanitization filter', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        allowed: false,
        riskLevel: 'high',
        warnings: ['Prompt sanitization failed'],
        modifications: []
      };
    }
  }
}
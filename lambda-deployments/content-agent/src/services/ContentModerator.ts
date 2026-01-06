import OpenAI from 'openai';
import { StoryType } from '@alexa-multi-agent/shared-types';
import { ModerationRequest, ModerationResult } from '../types';
import { Logger } from 'winston';

export class ContentModerator {
  private openai: OpenAI;
  private logger: Logger;
  private enabled: boolean;

  constructor(openai: OpenAI, logger: Logger, enabled: boolean = true) {
    this.openai = openai;
    this.logger = logger;
    this.enabled = enabled;
  }

  /**
   * Moderate content using OpenAI moderation API and custom filters
   */
  async moderateContent(request: ModerationRequest): Promise<ModerationResult> {
    if (!this.enabled) {
      this.logger.debug('Content moderation disabled, approving content');
      return {
        approved: true,
        flaggedCategories: [],
        severity: 'low'
      };
    }

    this.logger.info('Moderating content', { 
      contentType: request.contentType,
      contentLength: request.content.length,
      userAge: request.userAge 
    });

    try {
      // Run OpenAI moderation
      const openaiResult = await this.runOpenAIModeration(request.content);
      
      // Run custom child-safety filters
      const customResult = await this.runCustomModeration(request);
      
      // Combine results
      const combinedResult = this.combineResults(openaiResult, customResult, request);
      
      this.logger.info('Content moderation completed', {
        approved: combinedResult.approved,
        flaggedCategories: combinedResult.flaggedCategories,
        severity: combinedResult.severity
      });

      return combinedResult;
    } catch (error) {
      this.logger.error('Error during content moderation', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      // Fail safe - reject content on moderation error
      return {
        approved: false,
        flaggedCategories: ['moderation_error'],
        severity: 'high',
        suggestedModifications: ['Content could not be verified for safety']
      };
    }
  }

  private async runOpenAIModeration(content: string): Promise<OpenAI.Moderations.ModerationCreateResponse> {
    return await this.openai.moderations.create({
      input: content,
      model: 'text-moderation-latest'
    });
  }

  private async runCustomModeration(request: ModerationRequest): Promise<{
    flagged: boolean;
    categories: string[];
    severity: 'low' | 'medium' | 'high';
    suggestions: string[];
  }> {
    const flaggedCategories: string[] = [];
    const suggestions: string[] = [];
    let severity: 'low' | 'medium' | 'high' = 'low';

    // Age-specific content checks
    if (request.userAge) {
      const ageIssues = this.checkAgeAppropriate(request.content, request.userAge);
      if (ageIssues.length > 0) {
        flaggedCategories.push('age_inappropriate');
        suggestions.push(...ageIssues);
        severity = 'medium';
      }
    }

    // Story type specific checks
    if (request.storyType) {
      const storyTypeIssues = this.checkStoryTypeAppropriate(request.content, request.storyType);
      if (storyTypeIssues.length > 0) {
        flaggedCategories.push('story_type_mismatch');
        suggestions.push(...storyTypeIssues);
      }
    }

    // Child-specific safety checks
    const safetyIssues = this.checkChildSafety(request.content);
    if (safetyIssues.length > 0) {
      flaggedCategories.push('child_safety');
      suggestions.push(...safetyIssues);
      severity = 'high';
    }

    // Educational value checks
    const educationalIssues = this.checkEducationalValue(request.content, request.contentType);
    if (educationalIssues.length > 0) {
      flaggedCategories.push('educational_concern');
      suggestions.push(...educationalIssues);
    }

    return {
      flagged: flaggedCategories.length > 0,
      categories: flaggedCategories,
      severity,
      suggestions
    };
  }

  private checkAgeAppropriate(content: string, age: number): string[] {
    const issues: string[] = [];
    const lowerContent = content.toLowerCase();

    // Vocabulary complexity check
    if (age <= 5) {
      const complexWords = this.findComplexWords(content);
      if (complexWords.length > 0) {
        issues.push(`Simplify vocabulary: ${complexWords.slice(0, 3).join(', ')}`);
      }
    }

    // Sentence length check
    const sentences = content.split(/[.!?]+/);
    const avgWordsPerSentence = sentences.reduce((acc, sentence) => 
      acc + sentence.trim().split(/\s+/).length, 0) / sentences.length;

    if (age <= 6 && avgWordsPerSentence > 10) {
      issues.push('Use shorter sentences for better comprehension');
    }

    // Emotional complexity check
    if (age <= 7) {
      const complexEmotions = ['anxiety', 'depression', 'existential', 'mortality', 'divorce'];
      const foundComplex = complexEmotions.filter(emotion => lowerContent.includes(emotion));
      if (foundComplex.length > 0) {
        issues.push(`Avoid complex emotional themes: ${foundComplex.join(', ')}`);
      }
    }

    return issues;
  }

  private checkStoryTypeAppropriate(content: string, storyType: StoryType): string[] {
    const issues: string[] = [];
    const lowerContent = content.toLowerCase();

    switch (storyType) {
      case 'Bedtime':
        if (this.containsExcitingElements(lowerContent)) {
          issues.push('Bedtime stories should be calm and soothing, not exciting');
        }
        break;
      
      case 'Educational':
        if (!this.containsLearningElements(lowerContent)) {
          issues.push('Educational stories should include clear learning objectives');
        }
        break;
      
      case 'Medical Bravery':
        if (this.containsScaryMedicalContent(lowerContent)) {
          issues.push('Medical stories should be supportive, not frightening');
        }
        break;
      
      case 'Mental Health':
        if (!this.containsPositiveCoping(lowerContent)) {
          issues.push('Mental health stories should include positive coping strategies');
        }
        break;
    }

    return issues;
  }

  private checkChildSafety(content: string): string[] {
    const issues: string[] = [];
    const lowerContent = content.toLowerCase();

    // Violence indicators
    const violenceWords = ['fight', 'hit', 'hurt', 'blood', 'weapon', 'kill', 'die', 'death'];
    const foundViolence = violenceWords.filter(word => lowerContent.includes(word));
    if (foundViolence.length > 0) {
      issues.push(`Remove violent content: ${foundViolence.join(', ')}`);
    }

    // Scary content indicators
    const scaryWords = ['monster', 'ghost', 'scary', 'frightening', 'nightmare', 'dark', 'alone'];
    const foundScary = scaryWords.filter(word => lowerContent.includes(word));
    if (foundScary.length > 2) { // Allow some mild scary elements
      issues.push('Reduce scary or frightening elements');
    }

    // Inappropriate themes
    const inappropriateThemes = ['adult', 'mature', 'sexual', 'drug', 'alcohol', 'smoking'];
    const foundInappropriate = inappropriateThemes.filter(theme => lowerContent.includes(theme));
    if (foundInappropriate.length > 0) {
      issues.push(`Remove inappropriate themes: ${foundInappropriate.join(', ')}`);
    }

    return issues;
  }

  private checkEducationalValue(content: string, contentType: string): string[] {
    const issues: string[] = [];

    if (contentType === 'story') {
      // Check for positive messages
      if (!this.containsPositiveMessage(content)) {
        issues.push('Include positive moral lessons or values');
      }

      // Check for character growth
      if (!this.containsCharacterGrowth(content)) {
        issues.push('Show character learning or growing through the story');
      }
    }

    return issues;
  }

  private combineResults(
    openaiResult: OpenAI.Moderations.ModerationCreateResponse,
    customResult: { flagged: boolean; categories: string[]; severity: 'low' | 'medium' | 'high'; suggestions: string[] },
    request: ModerationRequest
  ): ModerationResult {
    const openaiFlags = openaiResult.results[0];
    const allCategories = [...customResult.categories];
    
    // Add OpenAI flagged categories
    if (openaiFlags.flagged) {
      Object.entries(openaiFlags.categories).forEach(([category, flagged]) => {
        if (flagged) {
          allCategories.push(`openai_${category}`);
        }
      });
    }

    // Determine overall approval
    const approved = !openaiFlags.flagged && !customResult.flagged;
    
    // Determine severity
    let severity = customResult.severity;
    if (openaiFlags.flagged) {
      severity = 'high'; // OpenAI flags are always high severity
    }

    const result: ModerationResult = {
      approved,
      flaggedCategories: allCategories,
      severity,
      suggestedModifications: customResult.suggestions
    };

    // Generate alternative content if not approved
    if (!approved) {
      result.alternativeContent = this.generateAlternativeContent(request, allCategories);
    }

    return result;
  }

  private generateAlternativeContent(request: ModerationRequest, flaggedCategories: string[]): string {
    // This would typically use AI to generate safer alternative content
    // For now, providing generic safe alternatives
    
    if (request.contentType === 'story') {
      return 'Once upon a time, there was a kind character who went on a gentle adventure and learned something wonderful about friendship.';
    }
    
    if (request.contentType === 'character') {
      return 'A friendly character with a warm smile and a kind heart.';
    }
    
    return 'Safe, age-appropriate content';
  }

  // Helper methods for content analysis
  private findComplexWords(content: string): string[] {
    const words = (content.toLowerCase().match(/\b\w+\b/g) || []) as string[];
    return words.filter(word => 
      word.length > 8 || // Long words
      word.includes('tion') || // Complex suffixes
      word.includes('sion') ||
      word.includes('ment')
    ).slice(0, 5); // Limit to first 5 found
  }

  private containsExcitingElements(content: string): boolean {
    const excitingWords = ['adventure', 'exciting', 'thrilling', 'action', 'fast', 'run', 'chase'];
    return excitingWords.some(word => content.includes(word));
  }

  private containsLearningElements(content: string): boolean {
    const learningWords = ['learn', 'discover', 'understand', 'teach', 'lesson', 'knowledge'];
    return learningWords.some(word => content.includes(word));
  }

  private containsScaryMedicalContent(content: string): boolean {
    const scaryMedical = ['pain', 'hurt', 'needle', 'shot', 'surgery', 'operation', 'blood'];
    return scaryMedical.some(word => content.includes(word));
  }

  private containsPositiveCoping(content: string): boolean {
    const copingWords = ['breathe', 'calm', 'help', 'support', 'better', 'cope', 'manage'];
    return copingWords.some(word => content.includes(word));
  }

  private containsPositiveMessage(content: string): boolean {
    const positiveWords = ['kind', 'friend', 'help', 'share', 'care', 'love', 'good', 'nice'];
    return positiveWords.some(word => content.includes(word));
  }

  private containsCharacterGrowth(content: string): boolean {
    const growthWords = ['learned', 'grew', 'became', 'realized', 'understood', 'changed'];
    return growthWords.some(word => content.includes(word));
  }

  /**
   * Batch moderate multiple pieces of content
   */
  async batchModerate(requests: ModerationRequest[]): Promise<ModerationResult[]> {
    this.logger.info('Starting batch moderation', { count: requests.length });
    
    const results = await Promise.all(
      requests.map(request => this.moderateContent(request))
    );
    
    this.logger.info('Batch moderation completed', { 
      total: results.length,
      approved: results.filter(r => r.approved).length,
      rejected: results.filter(r => !r.approved).length
    });
    
    return results;
  }

  /**
   * Check if content needs re-moderation after edits
   */
  needsRemoderation(originalContent: string, newContent: string): boolean {
    // Simple heuristic - if content changed significantly, re-moderate
    const similarity = this.calculateSimilarity(originalContent, newContent);
    return similarity < 0.8; // Re-moderate if less than 80% similar
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
}
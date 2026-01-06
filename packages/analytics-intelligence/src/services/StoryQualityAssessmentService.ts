import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Logger } from 'winston';
import { v4 as uuidv4 } from 'uuid';

import { Database } from '@alexa-multi-agent/shared-types';
import { AnalyticsConfig, StoryQualityAssessment, QualityScoreWeights } from '../types';

export class StoryQualityAssessmentService {
  constructor(
    private supabase: SupabaseClient<Database>,
    private redis: RedisClientType,
    private config: AnalyticsConfig,
    private logger: Logger
  ) {}

  async initialize(): Promise<void> {
    this.logger.info('Initializing StoryQualityAssessmentService');
    
    // Initialize quality assessment models
    await this.initializeQualityModels();
    
    this.logger.info('StoryQualityAssessmentService initialized');
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down StoryQualityAssessmentService');
  }

  async healthCheck(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    try {
      // Test database connection
      const { error } = await this.supabase
        .from('stories')
        .select('count')
        .limit(1);

      if (error) {
        return 'degraded';
      }

      return 'healthy';
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return 'unhealthy';
    }
  }

  /**
   * Assess the quality of a story using automated scoring
   */
  async assessStoryQuality(storyId: string): Promise<StoryQualityAssessment> {
    try {
      this.logger.info('Assessing story quality', { storyId });

      // Fetch story data
      const { data: story, error } = await this.supabase
        .from('stories')
        .select('*')
        .eq('id', storyId)
        .single();

      if (error || !story) {
        throw new Error(`Story not found: ${storyId}`);
      }

      // Check cache first
      const cacheKey = `${this.config.redis.keyPrefix}:quality:${storyId}`;
      const cachedAssessment = await this.getCachedAssessment(cacheKey);
      if (cachedAssessment) {
        return cachedAssessment;
      }

      // Perform quality assessment
      const assessment = await this.performQualityAssessment(story);

      // Cache the result
      await this.cacheAssessment(cacheKey, assessment);

      // Store in database
      await this.storeQualityAssessment(assessment);

      this.logger.info('Story quality assessment completed', {
        storyId,
        overallScore: assessment.overallScore
      });

      return assessment;

    } catch (error) {
      this.logger.error('Failed to assess story quality:', error);
      throw error;
    }
  }

  /**
   * Batch assess multiple stories
   */
  async batchAssessStoryQuality(storyIds: string[]): Promise<StoryQualityAssessment[]> {
    const assessments: StoryQualityAssessment[] = [];
    const batchSize = this.config.analytics.batchSize;

    for (let i = 0; i < storyIds.length; i += batchSize) {
      const batch = storyIds.slice(i, i + batchSize);
      const batchAssessments = await Promise.all(
        batch.map(storyId => this.assessStoryQuality(storyId))
      );
      assessments.push(...batchAssessments);
    }

    return assessments;
  }

  /**
   * Get quality trends over time
   */
  async getQualityTrends(timeWindow: string): Promise<{
    averageScore: number;
    trendDirection: 'improving' | 'declining' | 'stable';
    dimensionTrends: Record<string, number>;
    totalAssessments: number;
  }> {
    try {
      const [startTime, endTime] = this.parseTimeWindow(timeWindow);

      const { data: assessments, error } = await this.supabase
        .from('story_quality_assessments')
        .select('*')
        .gte('assessed_at', startTime.toISOString())
        .lte('assessed_at', endTime.toISOString())
        .order('assessed_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch quality assessments: ${error.message}`);
      }

      if (!assessments || assessments.length === 0) {
        return {
          averageScore: 0,
          trendDirection: 'stable',
          dimensionTrends: {},
          totalAssessments: 0
        };
      }

      // Calculate average score
      const averageScore = assessments.reduce((sum, a) => sum + a.overall_score, 0) / assessments.length;

      // Calculate trend direction
      const firstHalf = assessments.slice(0, Math.floor(assessments.length / 2));
      const secondHalf = assessments.slice(Math.floor(assessments.length / 2));
      
      const firstHalfAvg = firstHalf.reduce((sum, a) => sum + a.overall_score, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, a) => sum + a.overall_score, 0) / secondHalf.length;
      
      let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';
      const trendThreshold = 5; // 5 point difference
      
      if (secondHalfAvg - firstHalfAvg > trendThreshold) {
        trendDirection = 'improving';
      } else if (firstHalfAvg - secondHalfAvg > trendThreshold) {
        trendDirection = 'declining';
      }

      // Calculate dimension trends
      const dimensionTrends: Record<string, number> = {};
      const dimensions = ['narrative_structure', 'character_development', 'age_appropriateness', 
                         'educational_value', 'emotional_resonance', 'creativity', 'language_quality'];

      dimensions.forEach(dimension => {
        const scores = assessments.map(a => a.dimension_scores[dimension]).filter(s => s !== undefined);
        if (scores.length > 0) {
          dimensionTrends[dimension] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        }
      });

      return {
        averageScore,
        trendDirection,
        dimensionTrends,
        totalAssessments: assessments.length
      };

    } catch (error) {
      this.logger.error('Failed to get quality trends:', error);
      throw error;
    }
  }

  private async initializeQualityModels(): Promise<void> {
    // Initialize NLP models and quality assessment algorithms
    // This would typically load pre-trained models for:
    // - Narrative structure analysis
    // - Character development assessment
    // - Age appropriateness checking
    // - Educational value measurement
    // - Emotional resonance analysis
    // - Creativity scoring
    // - Language quality assessment
    
    this.logger.info('Quality assessment models initialized');
  }

  private async performQualityAssessment(story: any): Promise<StoryQualityAssessment> {
    const storyContent = story.content;
    const storyText = this.extractStoryText(storyContent);
    
    // Assess each dimension
    const dimensionScores = {
      narrativeStructure: await this.assessNarrativeStructure(storyText, storyContent),
      characterDevelopment: await this.assessCharacterDevelopment(storyText, storyContent),
      ageAppropriateness: await this.assessAgeAppropriateness(storyText, story.age_rating),
      educationalValue: await this.assessEducationalValue(storyText, storyContent),
      emotionalResonance: await this.assessEmotionalResonance(storyText, storyContent),
      creativity: await this.assessCreativity(storyText, storyContent),
      languageQuality: await this.assessLanguageQuality(storyText)
    };

    // Calculate overall score using weighted average
    const weights = this.config.analytics.qualityScoreWeights;
    const overallScore = (
      dimensionScores.narrativeStructure * weights.narrativeStructure +
      dimensionScores.characterDevelopment * weights.characterDevelopment +
      dimensionScores.ageAppropriateness * weights.ageAppropriateness +
      dimensionScores.educationalValue * weights.educationalValue +
      dimensionScores.emotionalResonance * weights.emotionalResonance +
      dimensionScores.creativity * weights.creativity +
      dimensionScores.languageQuality * weights.languageQuality
    ) / Object.values(weights).reduce((sum, weight) => sum + weight, 0);

    // Generate automated feedback
    const automatedFeedback = this.generateAutomatedFeedback(dimensionScores);
    const improvementSuggestions = this.generateImprovementSuggestions(dimensionScores);

    // Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore(dimensionScores, storyText.length);

    return {
      storyId: story.id,
      overallScore: Math.round(overallScore * 100) / 100,
      dimensionScores,
      automatedFeedback,
      improvementSuggestions,
      confidenceScore,
      assessedAt: new Date().toISOString()
    };
  }

  private extractStoryText(storyContent: any): string {
    // Extract text from story content structure
    if (typeof storyContent === 'string') {
      return storyContent;
    }

    if (storyContent.text) {
      return storyContent.text;
    }

    if (storyContent.chapters && Array.isArray(storyContent.chapters)) {
      return storyContent.chapters.map((chapter: any) => chapter.text || '').join(' ');
    }

    if (storyContent.beats && Array.isArray(storyContent.beats)) {
      return storyContent.beats.map((beat: any) => beat.text || '').join(' ');
    }

    return JSON.stringify(storyContent);
  }

  private async assessNarrativeStructure(text: string, content: any): Promise<number> {
    // Assess story structure using hero's journey framework
    let score = 50; // Base score

    // Check for story beats/structure
    if (content.beats && Array.isArray(content.beats)) {
      const beatCount = content.beats.length;
      if (beatCount >= 5) score += 20; // Good structure
      if (beatCount >= 8) score += 10; // Excellent structure
    }

    // Check for beginning, middle, end
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length >= 10) {
      score += 15; // Sufficient length for structure
    }

    // Check for conflict and resolution patterns
    const conflictWords = ['problem', 'challenge', 'difficulty', 'trouble', 'conflict'];
    const resolutionWords = ['solved', 'resolved', 'overcome', 'succeeded', 'victory'];
    
    const hasConflict = conflictWords.some(word => text.toLowerCase().includes(word));
    const hasResolution = resolutionWords.some(word => text.toLowerCase().includes(word));
    
    if (hasConflict) score += 10;
    if (hasResolution) score += 10;
    if (hasConflict && hasResolution) score += 5; // Bonus for complete arc

    return Math.min(100, Math.max(0, score));
  }

  private async assessCharacterDevelopment(text: string, content: any): Promise<number> {
    let score = 40; // Base score

    // Check for character information
    if (content.characters && Array.isArray(content.characters)) {
      const characterCount = content.characters.length;
      score += Math.min(30, characterCount * 10); // Up to 30 points for characters

      // Check for character traits
      content.characters.forEach((character: any) => {
        if (character.traits && Object.keys(character.traits).length > 0) {
          score += 5; // Bonus for detailed characters
        }
      });
    }

    // Check for character names in text
    const namePattern = /[A-Z][a-z]+/g;
    const names = text.match(namePattern) || [];
    const uniqueNames = [...new Set(names)];
    
    if (uniqueNames.length > 0) {
      score += Math.min(20, uniqueNames.length * 5);
    }

    // Check for character development words
    const developmentWords = ['learned', 'grew', 'changed', 'realized', 'discovered', 'became'];
    const hasDevelopment = developmentWords.some(word => text.toLowerCase().includes(word));
    
    if (hasDevelopment) score += 15;

    return Math.min(100, Math.max(0, score));
  }

  private async assessAgeAppropriateness(text: string, ageRating: number): Promise<number> {
    let score = 80; // Start high, deduct for issues

    // Check vocabulary complexity
    const words = text.toLowerCase().split(/\s+/);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    
    // Age-appropriate word length thresholds
    const expectedWordLength = Math.min(6, 3 + (ageRating / 3));
    const wordLengthDiff = Math.abs(avgWordLength - expectedWordLength);
    
    if (wordLengthDiff > 1) {
      score -= Math.min(20, wordLengthDiff * 5);
    }

    // Check sentence complexity
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = words.length / sentences.length;
    
    const expectedSentenceLength = Math.min(15, 5 + ageRating);
    const sentenceLengthDiff = Math.abs(avgSentenceLength - expectedSentenceLength);
    
    if (sentenceLengthDiff > 3) {
      score -= Math.min(15, sentenceLengthDiff * 2);
    }

    // Check for inappropriate content (basic keyword check)
    const inappropriateWords = ['violence', 'scary', 'frightening', 'death', 'kill'];
    const hasInappropriate = inappropriateWords.some(word => text.toLowerCase().includes(word));
    
    if (hasInappropriate && ageRating < 8) {
      score -= 25;
    }

    return Math.min(100, Math.max(0, score));
  }

  private async assessEducationalValue(text: string, content: any): Promise<number> {
    let score = 30; // Base score

    // Check for educational themes
    const educationalThemes = [
      'friendship', 'kindness', 'sharing', 'helping', 'learning', 'school',
      'nature', 'animals', 'science', 'math', 'reading', 'writing',
      'problem-solving', 'creativity', 'imagination', 'cooperation'
    ];

    const presentThemes = educationalThemes.filter(theme => 
      text.toLowerCase().includes(theme)
    );

    score += Math.min(40, presentThemes.length * 5);

    // Check for moral lessons
    const moralWords = ['right', 'wrong', 'good', 'bad', 'should', 'important', 'lesson'];
    const hasMoral = moralWords.some(word => text.toLowerCase().includes(word));
    
    if (hasMoral) score += 15;

    // Check for questions that encourage thinking
    const questionCount = (text.match(/\?/g) || []).length;
    if (questionCount > 0) {
      score += Math.min(15, questionCount * 3);
    }

    return Math.min(100, Math.max(0, score));
  }

  private async assessEmotionalResonance(text: string, content: any): Promise<number> {
    let score = 40; // Base score

    // Check for emotional words
    const emotionalWords = [
      'happy', 'sad', 'excited', 'worried', 'proud', 'scared', 'brave',
      'love', 'care', 'feel', 'heart', 'smile', 'laugh', 'cry', 'hug'
    ];

    const presentEmotions = emotionalWords.filter(emotion => 
      text.toLowerCase().includes(emotion)
    );

    score += Math.min(30, presentEmotions.length * 3);

    // Check for emotional variety
    const positiveEmotions = ['happy', 'excited', 'proud', 'love', 'smile', 'laugh'];
    const negativeEmotions = ['sad', 'worried', 'scared', 'cry'];
    
    const hasPositive = positiveEmotions.some(emotion => text.toLowerCase().includes(emotion));
    const hasNegative = negativeEmotions.some(emotion => text.toLowerCase().includes(emotion));
    
    if (hasPositive) score += 10;
    if (hasNegative) score += 5; // Some negative emotions add depth
    if (hasPositive && hasNegative) score += 10; // Emotional range bonus

    // Check for sensory details
    const sensoryWords = ['see', 'hear', 'feel', 'smell', 'taste', 'touch', 'sound', 'color'];
    const hasSensory = sensoryWords.some(word => text.toLowerCase().includes(word));
    
    if (hasSensory) score += 15;

    return Math.min(100, Math.max(0, score));
  }

  private async assessCreativity(text: string, content: any): Promise<number> {
    let score = 50; // Base score

    // Check for imaginative elements
    const imaginativeWords = [
      'magic', 'magical', 'fantasy', 'dragon', 'fairy', 'wizard', 'unicorn',
      'adventure', 'explore', 'discover', 'mysterious', 'wonder', 'amazing',
      'incredible', 'extraordinary', 'special', 'unique'
    ];

    const presentImaginative = imaginativeWords.filter(word => 
      text.toLowerCase().includes(word)
    );

    score += Math.min(25, presentImaginative.length * 3);

    // Check for creative character types
    if (content.characters) {
      const creativeSpecies = ['dragon', 'fairy', 'robot', 'alien', 'monster', 'superhero'];
      const hasCreativeCharacter = content.characters.some((char: any) => 
        creativeSpecies.some(species => 
          char.species?.toLowerCase().includes(species) ||
          char.type?.toLowerCase().includes(species)
        )
      );
      
      if (hasCreativeCharacter) score += 15;
    }

    // Check for unique plot elements
    const uniqueWords = [...new Set(text.toLowerCase().split(/\s+/))];
    const vocabularyRichness = uniqueWords.length / text.split(/\s+/).length;
    
    if (vocabularyRichness > 0.6) score += 10; // Rich vocabulary indicates creativity

    return Math.min(100, Math.max(0, score));
  }

  private async assessLanguageQuality(text: string): Promise<number> {
    let score = 70; // Start with good score

    // Check for basic grammar issues (simplified)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Check for sentence variety
    const avgSentenceLength = text.split(/\s+/).length / sentences.length;
    const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
    const lengthVariance = this.calculateVariance(sentenceLengths);
    
    if (lengthVariance > 10) score += 10; // Good sentence variety
    if (avgSentenceLength > 20) score -= 10; // Too complex
    if (avgSentenceLength < 5) score -= 10; // Too simple

    // Check for repetitive words
    const words = text.toLowerCase().split(/\s+/);
    const wordCounts: Record<string, number> = {};
    
    words.forEach(word => {
      if (word.length > 3) { // Only count significant words
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });

    const repetitiveWords = Object.entries(wordCounts).filter(([_, count]) => count > 5);
    if (repetitiveWords.length > 0) {
      score -= Math.min(15, repetitiveWords.length * 3);
    }

    // Check for proper capitalization (basic)
    const capitalizedSentences = sentences.filter(s => /^[A-Z]/.test(s.trim()));
    const capitalizationRate = capitalizedSentences.length / sentences.length;
    
    if (capitalizationRate < 0.8) score -= 10;

    return Math.min(100, Math.max(0, score));
  }

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  private generateAutomatedFeedback(dimensionScores: any): string[] {
    const feedback: string[] = [];

    if (dimensionScores.narrativeStructure >= 80) {
      feedback.push("Excellent story structure with clear beginning, middle, and end.");
    } else if (dimensionScores.narrativeStructure < 60) {
      feedback.push("Story structure could be improved with clearer plot progression.");
    }

    if (dimensionScores.characterDevelopment >= 80) {
      feedback.push("Characters are well-developed with clear traits and growth.");
    } else if (dimensionScores.characterDevelopment < 60) {
      feedback.push("Characters could benefit from more detailed development and personality.");
    }

    if (dimensionScores.creativity >= 80) {
      feedback.push("Highly creative story with imaginative elements and unique ideas.");
    } else if (dimensionScores.creativity < 60) {
      feedback.push("Story could benefit from more creative and imaginative elements.");
    }

    if (dimensionScores.educationalValue >= 80) {
      feedback.push("Strong educational value with meaningful lessons and themes.");
    } else if (dimensionScores.educationalValue < 60) {
      feedback.push("Consider adding more educational themes or moral lessons.");
    }

    return feedback;
  }

  private generateImprovementSuggestions(dimensionScores: any): string[] {
    const suggestions: string[] = [];

    if (dimensionScores.narrativeStructure < 70) {
      suggestions.push("Add more story beats to create a stronger narrative arc.");
      suggestions.push("Include a clear conflict and resolution in the story.");
    }

    if (dimensionScores.characterDevelopment < 70) {
      suggestions.push("Develop character personalities with more specific traits.");
      suggestions.push("Show character growth or learning throughout the story.");
    }

    if (dimensionScores.emotionalResonance < 70) {
      suggestions.push("Include more emotional moments and feelings in the story.");
      suggestions.push("Add sensory details to help readers connect with the story.");
    }

    if (dimensionScores.creativity < 70) {
      suggestions.push("Consider adding magical or fantastical elements to spark imagination.");
      suggestions.push("Introduce unique characters or settings to make the story more memorable.");
    }

    if (dimensionScores.languageQuality < 70) {
      suggestions.push("Vary sentence length and structure for better flow.");
      suggestions.push("Use more descriptive and varied vocabulary.");
    }

    return suggestions;
  }

  private calculateConfidenceScore(dimensionScores: any, textLength: number): number {
    // Base confidence on text length and score consistency
    let confidence = 0.7; // Base confidence

    // Adjust for text length
    if (textLength > 500) confidence += 0.1;
    if (textLength > 1000) confidence += 0.1;
    if (textLength < 100) confidence -= 0.2;

    // Adjust for score consistency
    const scores = Object.values(dimensionScores) as number[];
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
    
    if (variance < 100) confidence += 0.1; // Consistent scores
    if (variance > 400) confidence -= 0.1; // Inconsistent scores

    return Math.min(1, Math.max(0, confidence));
  }

  private async getCachedAssessment(cacheKey: string): Promise<StoryQualityAssessment | null> {
    try {
      const cached = await this.redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.warn('Failed to get cached assessment:', error);
      return null;
    }
  }

  private async cacheAssessment(cacheKey: string, assessment: StoryQualityAssessment): Promise<void> {
    try {
      // Cache for 24 hours
      await this.redis.setEx(cacheKey, 86400, JSON.stringify(assessment));
    } catch (error) {
      this.logger.warn('Failed to cache assessment:', error);
    }
  }

  private async storeQualityAssessment(assessment: StoryQualityAssessment): Promise<void> {
    const { error } = await this.supabase
      .from('story_quality_assessments')
      .insert({
        story_id: assessment.storyId,
        overall_score: assessment.overallScore,
        dimension_scores: assessment.dimensionScores,
        automated_feedback: assessment.automatedFeedback,
        improvement_suggestions: assessment.improvementSuggestions,
        confidence_score: assessment.confidenceScore,
        assessed_at: assessment.assessedAt
      });

    if (error) {
      throw new Error(`Failed to store quality assessment: ${error.message}`);
    }
  }

  private parseTimeWindow(timeWindow: string): [Date, Date] {
    const now = new Date();
    const end = new Date(now);
    let start = new Date(now);

    if (timeWindow.includes('hour')) {
      const hours = parseInt(timeWindow);
      start.setHours(start.getHours() - hours);
    } else if (timeWindow.includes('day')) {
      const days = parseInt(timeWindow);
      start.setDate(start.getDate() - days);
    } else if (timeWindow.includes('week')) {
      const weeks = parseInt(timeWindow);
      start.setDate(start.getDate() - (weeks * 7));
    } else if (timeWindow.includes('month')) {
      const months = parseInt(timeWindow);
      start.setMonth(start.getMonth() - months);
    }

    return [start, end];
  }
}
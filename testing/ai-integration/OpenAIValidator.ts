/**
 * OpenAI Integration Test Suite
 * Validates story generation, content quality, age-appropriateness, and safety
 */

import OpenAI from 'openai';
import { TestResult } from './TestOrchestrator';

export interface StoryGenerationRequest {
  prompt: string;
  ageRange: '3-5' | '6-8' | '9-12';
  mood: string;
  length: 'short' | 'medium' | 'long';
  themes?: string[];
}

export interface ContentQualityMetrics {
  readabilityScore: number;
  vocabularyLevel: number;
  sentenceComplexity: number;
  narrativeStructure: number;
  ageAppropriateness: number;
}

export interface SafetyValidationResult {
  passed: boolean;
  flaggedContent: string[];
  safetyScore: number;
  moderationFlags: string[];
}

export interface OpenAITestResult extends TestResult {
  storyContent?: string;
  qualityMetrics?: ContentQualityMetrics;
  safetyResult?: SafetyValidationResult;
  costMetrics?: {
    tokensUsed: number;
    estimatedCost: number;
  };
}

export class OpenAIValidator {
  private openai: OpenAI;
  private rateLimitTracker: Map<string, number[]>;
  private costTracker: { totalTokens: number; totalCost: number };

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    });
    this.rateLimitTracker = new Map();
    this.costTracker = { totalTokens: 0, totalCost: 0 };
  }

  /**
   * Validate story generation with quality assessment
   */
  async validateStoryGeneration(request: StoryGenerationRequest): Promise<OpenAITestResult> {
    const startTime = Date.now();
    
    try {
      // Generate story using OpenAI
      const story = await this.generateStory(request);
      
      // Assess content quality
      const qualityMetrics = await this.assessContentQuality(story, request.ageRange);
      
      // Validate safety
      const safetyResult = await this.validateContentSafety(story);
      
      // Calculate cost metrics
      const costMetrics = this.calculateCostMetrics(story);
      
      // Determine if test passed
      const passed = this.evaluateTestSuccess(qualityMetrics, safetyResult, request.ageRange);
      
      return {
        testId: `openai-story-${Date.now()}`,
        passed,
        duration: Date.now() - startTime,
        storyContent: story,
        qualityMetrics,
        safetyResult,
        costMetrics,
        metadata: {
          request,
          wordCount: story.split(' ').length,
          generationTime: Date.now() - startTime
        }
      };
      
    } catch (error) {
      return {
        testId: `openai-story-${Date.now()}`,
        passed: false,
        duration: Date.now() - startTime,
        error: `Story generation failed: ${error.message}`
      };
    }
  }

  /**
   * Generate story using OpenAI GPT-4
   */
  private async generateStory(request: StoryGenerationRequest): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(request);
    const userPrompt = this.buildUserPrompt(request);
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: this.getMaxTokensForLength(request.length),
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    if (!response.choices[0]?.message?.content) {
      throw new Error('No story content generated');
    }

    // Track usage for cost optimization
    this.trackUsage(response.usage);
    
    return response.choices[0].message.content;
  }

  /**
   * Assess content quality with readability scoring
   */
  private async assessContentQuality(story: string, ageRange: string): Promise<ContentQualityMetrics> {
    const words = story.split(' ');
    const sentences = story.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Calculate readability metrics
    const readabilityScore = this.calculateFleschKincaidScore(story);
    const vocabularyLevel = this.assessVocabularyLevel(words, ageRange);
    const sentenceComplexity = this.calculateSentenceComplexity(sentences);
    const narrativeStructure = await this.assessNarrativeStructure(story);
    const ageAppropriateness = this.validateAgeAppropriateness(story, ageRange);
    
    return {
      readabilityScore,
      vocabularyLevel,
      sentenceComplexity,
      narrativeStructure,
      ageAppropriateness
    };
  }

  /**
   * Validate content safety using OpenAI moderation
   */
  private async validateContentSafety(story: string): Promise<SafetyValidationResult> {
    try {
      const moderation = await this.openai.moderations.create({
        input: story
      });
      
      const result = moderation.results[0];
      const flaggedCategories = Object.entries(result.categories)
        .filter(([_, flagged]) => flagged)
        .map(([category, _]) => category);
      
      const safetyScore = this.calculateSafetyScore(result.category_scores);
      
      return {
        passed: !result.flagged && safetyScore >= 0.95,
        flaggedContent: flaggedCategories,
        safetyScore,
        moderationFlags: flaggedCategories
      };
      
    } catch (error) {
      return {
        passed: false,
        flaggedContent: ['moderation_error'],
        safetyScore: 0,
        moderationFlags: [`Error: ${error.message}`]
      };
    }
  }

  /**
   * Calculate Flesch-Kincaid readability score
   */
  private calculateFleschKincaidScore(text: string): number {
    const words = text.split(' ').length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const syllables = this.countSyllables(text);
    
    if (sentences === 0 || words === 0) return 0;
    
    const avgWordsPerSentence = words / sentences;
    const avgSyllablesPerWord = syllables / words;
    
    return 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
  }

  /**
   * Count syllables in text (simplified algorithm)
   */
  private countSyllables(text: string): number {
    const words = text.toLowerCase().split(' ');
    let totalSyllables = 0;
    
    for (const word of words) {
      const vowels = word.match(/[aeiouy]+/g);
      let syllables = vowels ? vowels.length : 1;
      
      // Adjust for silent 'e'
      if (word.endsWith('e') && syllables > 1) {
        syllables--;
      }
      
      totalSyllables += Math.max(1, syllables);
    }
    
    return totalSyllables;
  }

  /**
   * Assess vocabulary level for age range
   */
  private assessVocabularyLevel(words: string[], ageRange: string): number {
    const complexWords = words.filter(word => {
      return word.length > this.getMaxWordLengthForAge(ageRange) ||
             this.isComplexWord(word, ageRange);
    });
    
    const complexityRatio = complexWords.length / words.length;
    return Math.max(0, 1 - complexityRatio);
  }

  /**
   * Calculate sentence complexity
   */
  private calculateSentenceComplexity(sentences: string[]): number {
    const avgWordsPerSentence = sentences.reduce((sum, sentence) => {
      return sum + sentence.split(' ').length;
    }, 0) / sentences.length;
    
    // Ideal sentence length varies by age
    const idealLength = 8; // Average for children's stories
    const deviation = Math.abs(avgWordsPerSentence - idealLength);
    
    return Math.max(0, 1 - (deviation / idealLength));
  }

  /**
   * Assess narrative structure using AI
   */
  private async assessNarrativeStructure(story: string): Promise<number> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: `Analyze this children's story for narrative structure. Rate from 0-1 how well it follows a clear beginning, middle, and end with character development and conflict resolution. Return only a number between 0 and 1.\n\nStory: ${story}`
        }],
        max_tokens: 10,
        temperature: 0.1
      });
      
      const rating = parseFloat(response.choices[0]?.message?.content || '0.5');
      return Math.max(0, Math.min(1, rating));
      
    } catch (error) {
      console.warn('Narrative structure assessment failed:', error);
      return 0.5; // Default neutral score
    }
  }

  /**
   * Validate age appropriateness
   */
  private validateAgeAppropriateness(story: string, ageRange: string): number {
    const inappropriateTopics = this.getInappropriateTopicsForAge(ageRange);
    const storyLower = story.toLowerCase();
    
    let violations = 0;
    for (const topic of inappropriateTopics) {
      if (storyLower.includes(topic.toLowerCase())) {
        violations++;
      }
    }
    
    return Math.max(0, 1 - (violations / inappropriateTopics.length));
  }

  /**
   * Calculate safety score from moderation results
   */
  private calculateSafetyScore(categoryScores: Record<string, number>): number {
    const maxScore = Math.max(...Object.values(categoryScores));
    return Math.max(0, 1 - maxScore);
  }

  /**
   * Calculate cost metrics
   */
  private calculateCostMetrics(story: string): { tokensUsed: number; estimatedCost: number } {
    // Rough estimation: ~4 characters per token
    const tokensUsed = Math.ceil(story.length / 4);
    const estimatedCost = tokensUsed * 0.00003; // GPT-4 pricing estimate
    
    this.costTracker.totalTokens += tokensUsed;
    this.costTracker.totalCost += estimatedCost;
    
    return { tokensUsed, estimatedCost };
  }

  /**
   * Evaluate overall test success
   */
  private evaluateTestSuccess(
    quality: ContentQualityMetrics,
    safety: SafetyValidationResult,
    ageRange: string
  ): boolean {
    const qualityThreshold = 0.7;
    const safetyThreshold = 0.95;
    
    const qualityScore = (
      quality.readabilityScore * 0.2 +
      quality.vocabularyLevel * 0.2 +
      quality.sentenceComplexity * 0.2 +
      quality.narrativeStructure * 0.2 +
      quality.ageAppropriateness * 0.2
    ) / 5;
    
    return qualityScore >= qualityThreshold && 
           safety.passed && 
           safety.safetyScore >= safetyThreshold;
  }

  /**
   * Build system prompt for story generation
   */
  private buildSystemPrompt(request: StoryGenerationRequest): string {
    return `You are a professional children's story writer. Create engaging, age-appropriate stories for children aged ${request.ageRange}. 
    
Guidelines:
- Use vocabulary appropriate for ${request.ageRange} year olds
- Include positive themes and moral lessons
- Ensure content is completely safe and appropriate
- Create engaging characters and clear narrative structure
- Match the requested mood: ${request.mood}
- Story length should be ${request.length}`;
  }

  /**
   * Build user prompt for story generation
   */
  private buildUserPrompt(request: StoryGenerationRequest): string {
    let prompt = `Write a ${request.length} ${request.mood} story for children aged ${request.ageRange} about: ${request.prompt}`;
    
    if (request.themes && request.themes.length > 0) {
      prompt += `\n\nInclude these themes: ${request.themes.join(', ')}`;
    }
    
    return prompt;
  }

  /**
   * Get max tokens based on story length
   */
  private getMaxTokensForLength(length: string): number {
    switch (length) {
      case 'short': return 300;
      case 'medium': return 600;
      case 'long': return 1000;
      default: return 600;
    }
  }

  /**
   * Get max word length for age range
   */
  private getMaxWordLengthForAge(ageRange: string): number {
    switch (ageRange) {
      case '3-5': return 6;
      case '6-8': return 8;
      case '9-12': return 10;
      default: return 8;
    }
  }

  /**
   * Check if word is complex for age range
   */
  private isComplexWord(word: string, ageRange: string): boolean {
    const complexWords = {
      '3-5': ['difficult', 'complicated', 'extraordinary', 'magnificent'],
      '6-8': ['extraordinary', 'magnificent', 'tremendous', 'spectacular'],
      '9-12': ['incomprehensible', 'extraordinary', 'magnificent']
    };
    
    return complexWords[ageRange]?.includes(word.toLowerCase()) || false;
  }

  /**
   * Get inappropriate topics for age range
   */
  private getInappropriateTopicsForAge(ageRange: string): string[] {
    const baseInappropriate = ['violence', 'death', 'scary', 'nightmare', 'monster'];
    
    switch (ageRange) {
      case '3-5': 
        return [...baseInappropriate, 'lost', 'alone', 'dark', 'afraid'];
      case '6-8':
        return [...baseInappropriate, 'danger', 'fight'];
      case '9-12':
        return baseInappropriate;
      default:
        return baseInappropriate;
    }
  }

  /**
   * Track API usage for cost optimization
   */
  private trackUsage(usage: any): void {
    if (usage) {
      this.costTracker.totalTokens += usage.total_tokens || 0;
      this.costTracker.totalCost += (usage.total_tokens || 0) * 0.00003;
    }
  }

  /**
   * Get cost tracking summary
   */
  getCostSummary(): { totalTokens: number; totalCost: number } {
    return { ...this.costTracker };
  }

  /**
   * Test rate limiting behavior
   */
  async testRateLimiting(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const requests = Array(10).fill(null).map((_, i) => 
        this.generateStory({
          prompt: `Test story ${i}`,
          ageRange: '6-8',
          mood: 'happy',
          length: 'short'
        })
      );
      
      const results = await Promise.allSettled(requests);
      const failures = results.filter(r => r.status === 'rejected').length;
      
      return {
        testId: 'openai-rate-limit-test',
        passed: failures === 0,
        duration: Date.now() - startTime,
        metadata: {
          totalRequests: requests.length,
          failures,
          successRate: (requests.length - failures) / requests.length
        }
      };
      
    } catch (error) {
      return {
        testId: 'openai-rate-limit-test',
        passed: false,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }
}
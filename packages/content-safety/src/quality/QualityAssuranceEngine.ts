import OpenAI from 'openai';
import { Logger } from 'winston';
import {
  ContentSafetyRequest,
  QualityAssessmentResult
} from '../types';

export class QualityAssuranceEngine {
  private openai: OpenAI;
  private logger: Logger;

  constructor(openai: OpenAI, logger: Logger) {
    this.openai = openai;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    this.logger.info('QualityAssuranceEngine initialized');
  }

  async assessQuality(
    content: string,
    request: ContentSafetyRequest
  ): Promise<QualityAssessmentResult> {
    this.logger.debug('Assessing content quality', {
      contentType: request.contentType,
      contentLength: content.length,
      userAge: request.userAge
    });

    try {
      // Run multiple quality assessments in parallel
      const [
        narrativeCoherence,
        ageAppropriateness,
        educationalValue,
        emotionalResonance,
        creativity,
        parentRatingPrediction
      ] = await Promise.all([
        this.assessNarrativeCoherence(content, request),
        this.assessAgeAppropriateness(content, request),
        this.assessEducationalValue(content, request),
        this.assessEmotionalResonance(content, request),
        this.assessCreativity(content, request),
        this.predictParentRating(content, request)
      ]);

      // Calculate overall quality score
      const overallQuality = this.calculateOverallQuality({
        narrativeCoherence,
        ageAppropriateness,
        educationalValue,
        emotionalResonance,
        creativity
      });

      // Generate assessment details
      const assessmentDetails = this.generateAssessmentDetails({
        narrativeCoherence,
        ageAppropriateness,
        educationalValue,
        emotionalResonance,
        creativity
      }, content, request);

      this.logger.debug('Quality assessment completed', {
        overallQuality,
        narrativeCoherence,
        ageAppropriateness,
        educationalValue,
        emotionalResonance,
        creativity,
        parentRatingPrediction
      });

      return {
        overallQuality,
        narrativeCoherence,
        ageAppropriateness,
        educationalValue,
        emotionalResonance,
        creativity,
        assessmentDetails,
        parentRatingPrediction
      };

    } catch (error) {
      this.logger.error('Error in quality assessment', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Return neutral scores on error
      return {
        overallQuality: 0.5,
        narrativeCoherence: 0.5,
        ageAppropriateness: 0.5,
        educationalValue: 0.5,
        emotionalResonance: 0.5,
        creativity: 0.5,
        assessmentDetails: {
          strengths: [],
          weaknesses: ['Quality assessment failed'],
          suggestions: ['Content could not be properly evaluated']
        }
      };
    }
  }

  private async assessNarrativeCoherence(
    content: string,
    request: ContentSafetyRequest
  ): Promise<number> {
    // Assess story structure, flow, and logical consistency
    let score = 0.5; // Base score

    if (request.contentType === 'story') {
      // Check for story elements
      const hasBeginning = this.hasStoryBeginning(content);
      const hasMiddle = this.hasStoryMiddle(content);
      const hasEnd = this.hasStoryEnd(content);
      const hasCharacterDevelopment = this.hasCharacterDevelopment(content);
      const hasLogicalFlow = this.hasLogicalFlow(content);

      score = (
        (hasBeginning ? 0.2 : 0) +
        (hasMiddle ? 0.2 : 0) +
        (hasEnd ? 0.2 : 0) +
        (hasCharacterDevelopment ? 0.2 : 0) +
        (hasLogicalFlow ? 0.2 : 0)
      );

      // Bonus for well-structured narrative
      if (score >= 0.8) {
        score = Math.min(1, score + 0.1);
      }
    } else {
      // For non-story content, assess logical structure
      const hasIntroduction = this.hasIntroduction(content);
      const hasMainContent = this.hasMainContent(content);
      const hasConclusion = this.hasConclusion(content);
      const hasCoherentFlow = this.hasCoherentFlow(content);

      score = (
        (hasIntroduction ? 0.25 : 0) +
        (hasMainContent ? 0.5 : 0) +
        (hasConclusion ? 0.25 : 0)
      ) * (hasCoherentFlow ? 1 : 0.7);
    }

    return Math.max(0, Math.min(1, score));
  }

  private async assessAgeAppropriateness(
    content: string,
    request: ContentSafetyRequest
  ): Promise<number> {
    if (!request.userAge) {
      return 0.7; // Neutral score if age unknown
    }

    let score = 1.0; // Start with perfect score and deduct

    const age = request.userAge;
    const lowerContent = content.toLowerCase();

    // Vocabulary complexity check
    const vocabularyScore = this.assessVocabularyComplexity(content, age);
    score *= vocabularyScore;

    // Sentence complexity check
    const sentenceScore = this.assessSentenceComplexity(content, age);
    score *= sentenceScore;

    // Theme appropriateness check
    const themeScore = this.assessThemeAppropriateness(content, age);
    score *= themeScore;

    // Length appropriateness check
    const lengthScore = this.assessLengthAppropriateness(content, age);
    score *= lengthScore;

    return Math.max(0, Math.min(1, score));
  }

  private async assessEducationalValue(
    content: string,
    request: ContentSafetyRequest
  ): Promise<number> {
    let score = 0;

    // Check for educational elements
    const hasLearningObjective = this.hasLearningObjective(content);
    const hasPositiveValues = this.hasPositiveValues(content);
    const hasProblemSolving = this.hasProblemSolving(content);
    const hasCharacterGrowth = this.hasCharacterGrowth(content);
    const hasRealWorldConnection = this.hasRealWorldConnection(content);
    const encouragesCriticalThinking = this.encouragesCriticalThinking(content);

    score = (
      (hasLearningObjective ? 0.2 : 0) +
      (hasPositiveValues ? 0.2 : 0) +
      (hasProblemSolving ? 0.15 : 0) +
      (hasCharacterGrowth ? 0.15 : 0) +
      (hasRealWorldConnection ? 0.15 : 0) +
      (encouragesCriticalThinking ? 0.15 : 0)
    );

    // Bonus for explicitly educational content
    if (request.contentType === 'activity' || 
        request.context?.userPreferences?.educational) {
      score = Math.min(1, score + 0.1);
    }

    return Math.max(0, Math.min(1, score));
  }

  private async assessEmotionalResonance(
    content: string,
    request: ContentSafetyRequest
  ): Promise<number> {
    let score = 0;

    // Check for emotional engagement elements
    const hasEmotionalDepth = this.hasEmotionalDepth(content);
    const hasRelatableCharacters = this.hasRelatableCharacters(content);
    const hasEmotionalJourney = this.hasEmotionalJourney(content);
    const hasEmpathyBuilding = this.hasEmpathyBuilding(content);
    const hasEmotionalResolution = this.hasEmotionalResolution(content);

    score = (
      (hasEmotionalDepth ? 0.25 : 0) +
      (hasRelatableCharacters ? 0.2 : 0) +
      (hasEmotionalJourney ? 0.2 : 0) +
      (hasEmpathyBuilding ? 0.2 : 0) +
      (hasEmotionalResolution ? 0.15 : 0)
    );

    // Age-appropriate emotional complexity
    if (request.userAge) {
      const ageMultiplier = this.getEmotionalComplexityMultiplier(request.userAge);
      score *= ageMultiplier;
    }

    return Math.max(0, Math.min(1, score));
  }

  private async assessCreativity(
    content: string,
    request: ContentSafetyRequest
  ): Promise<number> {
    let score = 0;

    // Check for creative elements
    const hasOriginalIdeas = this.hasOriginalIdeas(content);
    const hasImaginativeElements = this.hasImaginativeElements(content);
    const hasUnexpectedTwists = this.hasUnexpectedTwists(content);
    const hasCreativeLanguage = this.hasCreativeLanguage(content);
    const hasUniqueCharacters = this.hasUniqueCharacters(content);

    score = (
      (hasOriginalIdeas ? 0.25 : 0) +
      (hasImaginativeElements ? 0.2 : 0) +
      (hasUnexpectedTwists ? 0.2 : 0) +
      (hasCreativeLanguage ? 0.2 : 0) +
      (hasUniqueCharacters ? 0.15 : 0)
    );

    // Bonus for creative content types
    if (request.contentType === 'story' || request.contentType === 'character') {
      score = Math.min(1, score + 0.1);
    }

    return Math.max(0, Math.min(1, score));
  }

  private async predictParentRating(
    content: string,
    request: ContentSafetyRequest
  ): Promise<number> {
    // Predict parent satisfaction rating (1-5 scale)
    let rating = 3.0; // Base neutral rating

    // Factors that increase parent satisfaction
    const safetyScore = this.assessContentSafety(content);
    const educationalScore = await this.assessEducationalValue(content, request);
    const ageAppropriateScore = await this.assessAgeAppropriateness(content, request);
    const positiveValuesScore = this.assessPositiveValues(content);

    // Weighted combination
    rating = 1 + (
      safetyScore * 1.2 +
      educationalScore * 1.0 +
      ageAppropriateScore * 1.2 +
      positiveValuesScore * 0.6
    );

    return Math.max(1, Math.min(5, rating));
  }

  // Helper methods for narrative coherence
  private hasStoryBeginning(content: string): boolean {
    const beginningIndicators = [
      'once upon a time', 'long ago', 'in a', 'there was', 'there lived',
      'it was', 'one day', 'many years ago', 'in the beginning'
    ];
    const lowerContent = content.toLowerCase();
    return beginningIndicators.some(indicator => lowerContent.includes(indicator));
  }

  private hasStoryMiddle(content: string): boolean {
    const middleIndicators = [
      'then', 'next', 'after', 'suddenly', 'meanwhile', 'however',
      'but', 'so', 'because', 'when', 'while', 'during'
    ];
    const lowerContent = content.toLowerCase();
    const indicatorCount = middleIndicators.reduce((count, indicator) => 
      count + (lowerContent.includes(indicator) ? 1 : 0), 0);
    return indicatorCount >= 2; // Need multiple transition words
  }

  private hasStoryEnd(content: string): boolean {
    const endingIndicators = [
      'the end', 'finally', 'at last', 'in the end', 'ever after',
      'and so', 'from that day', 'and they', 'happily', 'forever'
    ];
    const lowerContent = content.toLowerCase();
    return endingIndicators.some(indicator => lowerContent.includes(indicator));
  }

  private hasCharacterDevelopment(content: string): boolean {
    const developmentIndicators = [
      'learned', 'grew', 'became', 'realized', 'understood', 'changed',
      'discovered', 'found out', 'decided', 'chose', 'overcame'
    ];
    const lowerContent = content.toLowerCase();
    return developmentIndicators.some(indicator => lowerContent.includes(indicator));
  }

  private hasLogicalFlow(content: string): boolean {
    // Simple heuristic: check for logical connectors
    const connectors = [
      'because', 'so', 'therefore', 'since', 'as a result', 'consequently',
      'first', 'second', 'then', 'next', 'finally', 'meanwhile'
    ];
    const lowerContent = content.toLowerCase();
    const connectorCount = connectors.reduce((count, connector) => 
      count + (lowerContent.includes(connector) ? 1 : 0), 0);
    return connectorCount >= 2;
  }

  // Helper methods for age appropriateness
  private assessVocabularyComplexity(content: string, age: number): number {
    const words = content.split(/\s+/);
    const complexWords = words.filter(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      return this.isComplexWord(cleanWord, age);
    });

    const complexityRatio = complexWords.length / words.length;
    const maxComplexityRatio = this.getMaxComplexityRatio(age);

    return complexityRatio <= maxComplexityRatio ? 1 : 
           Math.max(0.3, 1 - (complexityRatio - maxComplexityRatio) * 2);
  }

  private assessSentenceComplexity(content: string, age: number): number {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = sentences.reduce((acc, sentence) => 
      acc + sentence.trim().split(/\s+/).length, 0) / sentences.length;

    const maxWordsPerSentence = this.getMaxWordsPerSentence(age);

    return avgWordsPerSentence <= maxWordsPerSentence ? 1 :
           Math.max(0.3, 1 - (avgWordsPerSentence - maxWordsPerSentence) / 10);
  }

  private assessThemeAppropriateness(content: string, age: number): number {
    const lowerContent = content.toLowerCase();
    let score = 1.0;

    // Age-specific inappropriate themes
    const inappropriateThemes = this.getInappropriateThemes(age);
    
    for (const theme of inappropriateThemes) {
      if (lowerContent.includes(theme.toLowerCase())) {
        score -= 0.2; // Deduct for each inappropriate theme
      }
    }

    return Math.max(0, score);
  }

  private assessLengthAppropriateness(content: string, age: number): number {
    const wordCount = content.split(/\s+/).length;
    const idealRange = this.getIdealWordCount(age);

    if (wordCount >= idealRange.min && wordCount <= idealRange.max) {
      return 1.0;
    } else if (wordCount < idealRange.min) {
      return Math.max(0.5, wordCount / idealRange.min);
    } else {
      return Math.max(0.5, idealRange.max / wordCount);
    }
  }

  // Helper methods for educational value
  private hasLearningObjective(content: string): boolean {
    const learningIndicators = [
      'learn', 'teach', 'show', 'discover', 'find out', 'understand',
      'know', 'remember', 'practice', 'try', 'explore'
    ];
    const lowerContent = content.toLowerCase();
    return learningIndicators.some(indicator => lowerContent.includes(indicator));
  }

  private hasPositiveValues(content: string): boolean {
    const positiveValues = [
      'kind', 'helpful', 'honest', 'brave', 'caring', 'sharing',
      'friendship', 'love', 'respect', 'patience', 'forgiveness',
      'cooperation', 'teamwork', 'empathy', 'compassion'
    ];
    const lowerContent = content.toLowerCase();
    const valueCount = positiveValues.reduce((count, value) => 
      count + (lowerContent.includes(value) ? 1 : 0), 0);
    return valueCount >= 2;
  }

  private hasProblemSolving(content: string): boolean {
    const problemSolvingIndicators = [
      'problem', 'solve', 'solution', 'figure out', 'work out',
      'challenge', 'overcome', 'fix', 'help', 'find a way'
    ];
    const lowerContent = content.toLowerCase();
    return problemSolvingIndicators.some(indicator => lowerContent.includes(indicator));
  }

  private hasCharacterGrowth(content: string): boolean {
    const growthIndicators = [
      'learned', 'grew', 'became better', 'improved', 'changed',
      'realized', 'understood', 'matured', 'developed'
    ];
    const lowerContent = content.toLowerCase();
    return growthIndicators.some(indicator => lowerContent.includes(indicator));
  }

  private hasRealWorldConnection(content: string): boolean {
    const realWorldIndicators = [
      'school', 'family', 'friends', 'home', 'community', 'neighborhood',
      'everyday', 'real life', 'like you', 'just like', 'similar to'
    ];
    const lowerContent = content.toLowerCase();
    return realWorldIndicators.some(indicator => lowerContent.includes(indicator));
  }

  private encouragesCriticalThinking(content: string): boolean {
    const thinkingIndicators = [
      'why', 'how', 'what if', 'imagine', 'think about', 'consider',
      'wonder', 'question', 'curious', 'explore', 'investigate'
    ];
    const lowerContent = content.toLowerCase();
    const thinkingCount = thinkingIndicators.reduce((count, indicator) => 
      count + (lowerContent.includes(indicator) ? 1 : 0), 0);
    return thinkingCount >= 2;
  }

  // Helper methods for emotional resonance
  private hasEmotionalDepth(content: string): boolean {
    const emotionalWords = [
      'happy', 'sad', 'excited', 'worried', 'proud', 'scared',
      'angry', 'surprised', 'disappointed', 'grateful', 'hopeful'
    ];
    const lowerContent = content.toLowerCase();
    const emotionCount = emotionalWords.reduce((count, emotion) => 
      count + (lowerContent.includes(emotion) ? 1 : 0), 0);
    return emotionCount >= 3;
  }

  private hasRelatableCharacters(content: string): boolean {
    const relatabilityIndicators = [
      'just like you', 'similar to', 'reminded', 'felt the same',
      'understood', 'could relate', 'had experienced', 'knew how'
    ];
    const lowerContent = content.toLowerCase();
    return relatabilityIndicators.some(indicator => lowerContent.includes(indicator));
  }

  private hasEmotionalJourney(content: string): boolean {
    // Check for emotional progression
    const emotionalProgression = [
      'at first', 'then felt', 'began to', 'started to feel',
      'gradually', 'slowly', 'eventually', 'in the end felt'
    ];
    const lowerContent = content.toLowerCase();
    return emotionalProgression.some(indicator => lowerContent.includes(indicator));
  }

  private hasEmpathyBuilding(content: string): boolean {
    const empathyIndicators = [
      'understand how', 'felt sorry for', 'cared about', 'worried about',
      'wanted to help', 'put themselves in', 'imagined how', 'sympathized'
    ];
    const lowerContent = content.toLowerCase();
    return empathyIndicators.some(indicator => lowerContent.includes(indicator));
  }

  private hasEmotionalResolution(content: string): boolean {
    const resolutionIndicators = [
      'felt better', 'was happy', 'felt proud', 'was relieved',
      'felt satisfied', 'was content', 'felt peaceful', 'was grateful'
    ];
    const lowerContent = content.toLowerCase();
    return resolutionIndicators.some(indicator => lowerContent.includes(indicator));
  }

  // Helper methods for creativity
  private hasOriginalIdeas(content: string): boolean {
    const originalityIndicators = [
      'unique', 'special', 'different', 'unusual', 'creative',
      'original', 'new', 'innovative', 'imaginative', 'inventive'
    ];
    const lowerContent = content.toLowerCase();
    return originalityIndicators.some(indicator => lowerContent.includes(indicator));
  }

  private hasImaginativeElements(content: string): boolean {
    const imaginativeElements = [
      'magic', 'fantasy', 'dream', 'imagine', 'pretend', 'make-believe',
      'fairy', 'dragon', 'wizard', 'enchanted', 'mystical', 'adventure'
    ];
    const lowerContent = content.toLowerCase();
    return imaginativeElements.some(element => lowerContent.includes(element));
  }

  private hasUnexpectedTwists(content: string): boolean {
    const twistIndicators = [
      'suddenly', 'unexpectedly', 'surprise', 'twist', 'plot twist',
      'didn\'t expect', 'shocking', 'amazing', 'incredible', 'unbelievable'
    ];
    const lowerContent = content.toLowerCase();
    return twistIndicators.some(indicator => lowerContent.includes(indicator));
  }

  private hasCreativeLanguage(content: string): boolean {
    const creativeLanguage = [
      'metaphor', 'simile', 'like a', 'as if', 'seemed like',
      'reminded of', 'looked like', 'sounded like', 'felt like'
    ];
    const lowerContent = content.toLowerCase();
    return creativeLanguage.some(language => lowerContent.includes(language));
  }

  private hasUniqueCharacters(content: string): boolean {
    const uniqueCharacterIndicators = [
      'unusual', 'special', 'different', 'unique', 'extraordinary',
      'remarkable', 'one-of-a-kind', 'distinctive', 'memorable'
    ];
    const lowerContent = content.toLowerCase();
    return uniqueCharacterIndicators.some(indicator => lowerContent.includes(indicator));
  }

  // Utility methods
  private calculateOverallQuality(scores: {
    narrativeCoherence: number;
    ageAppropriateness: number;
    educationalValue: number;
    emotionalResonance: number;
    creativity: number;
  }): number {
    // Weighted average based on importance
    const weights = {
      narrativeCoherence: 0.25,
      ageAppropriateness: 0.25,
      educationalValue: 0.2,
      emotionalResonance: 0.15,
      creativity: 0.15
    };

    return Object.entries(scores).reduce((total, [category, score]) => {
      const weight = weights[category as keyof typeof weights] || 0;
      return total + (score * weight);
    }, 0);
  }

  private generateAssessmentDetails(
    scores: {
      narrativeCoherence: number;
      ageAppropriateness: number;
      educationalValue: number;
      emotionalResonance: number;
      creativity: number;
    },
    content: string,
    request: ContentSafetyRequest
  ): {
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
  } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const suggestions: string[] = [];

    // Analyze each score
    Object.entries(scores).forEach(([category, score]) => {
      if (score >= 0.8) {
        strengths.push(this.getStrengthMessage(category, score));
      } else if (score < 0.5) {
        weaknesses.push(this.getWeaknessMessage(category, score));
        suggestions.push(this.getSuggestionMessage(category, request));
      }
    });

    // Add general suggestions if no specific ones
    if (suggestions.length === 0) {
      suggestions.push('Content meets quality standards with room for minor improvements');
    }

    return { strengths, weaknesses, suggestions };
  }

  private getStrengthMessage(category: string, score: number): string {
    const messages: Record<string, string> = {
      narrativeCoherence: 'Excellent story structure and logical flow',
      ageAppropriateness: 'Perfect age-appropriate content and language',
      educationalValue: 'Strong educational content with clear learning objectives',
      emotionalResonance: 'Engaging emotional depth and character development',
      creativity: 'Highly creative and imaginative content'
    };
    return messages[category] || `Strong ${category}`;
  }

  private getWeaknessMessage(category: string, score: number): string {
    const messages: Record<string, string> = {
      narrativeCoherence: 'Story structure could be improved',
      ageAppropriateness: 'Content may not be suitable for target age group',
      educationalValue: 'Limited educational value or learning objectives',
      emotionalResonance: 'Could benefit from more emotional depth',
      creativity: 'Content could be more creative and imaginative'
    };
    return messages[category] || `Needs improvement in ${category}`;
  }

  private getSuggestionMessage(category: string, request: ContentSafetyRequest): string {
    const suggestions: Record<string, string> = {
      narrativeCoherence: 'Add clear beginning, middle, and end with logical transitions',
      ageAppropriateness: 'Simplify vocabulary and themes for target age group',
      educationalValue: 'Include learning objectives and positive values',
      emotionalResonance: 'Develop characters and emotional journey',
      creativity: 'Add imaginative elements and unique story elements'
    };
    return suggestions[category] || `Improve ${category}`;
  }

  // Age-specific helper methods
  private isComplexWord(word: string, age: number): boolean {
    if (age < 5) return word.length > 6;
    if (age < 8) return word.length > 8;
    if (age < 13) return word.length > 10;
    return word.length > 12;
  }

  private getMaxComplexityRatio(age: number): number {
    if (age < 5) return 0.05;
    if (age < 8) return 0.1;
    if (age < 13) return 0.15;
    return 0.2;
  }

  private getMaxWordsPerSentence(age: number): number {
    if (age < 5) return 8;
    if (age < 8) return 12;
    if (age < 13) return 15;
    return 20;
  }

  private getInappropriateThemes(age: number): string[] {
    if (age < 5) {
      return ['death', 'violence', 'scary', 'frightening', 'monster', 'ghost'];
    } else if (age < 8) {
      return ['death', 'violence', 'blood', 'weapon', 'fight', 'war'];
    } else if (age < 13) {
      return ['sexual', 'romantic', 'alcohol', 'drugs', 'suicide', 'abuse'];
    }
    return ['explicit', 'graphic', 'mature', 'adult'];
  }

  private getIdealWordCount(age: number): { min: number; max: number } {
    if (age < 5) return { min: 50, max: 200 };
    if (age < 8) return { min: 100, max: 400 };
    if (age < 13) return { min: 200, max: 800 };
    return { min: 300, max: 1200 };
  }

  private getEmotionalComplexityMultiplier(age: number): number {
    if (age < 5) return 0.7; // Simpler emotions
    if (age < 8) return 0.8;
    if (age < 13) return 0.9;
    return 1.0; // Full emotional complexity
  }

  private assessContentSafety(content: string): number {
    // Simple safety assessment
    const unsafeWords = [
      'violence', 'fight', 'hurt', 'scary', 'frightening',
      'dangerous', 'weapon', 'blood', 'death', 'kill'
    ];
    
    const lowerContent = content.toLowerCase();
    const unsafeCount = unsafeWords.reduce((count, word) => 
      count + (lowerContent.includes(word) ? 1 : 0), 0);
    
    return Math.max(0, 1 - (unsafeCount * 0.2));
  }

  private assessPositiveValues(content: string): number {
    const positiveWords = [
      'kind', 'helpful', 'caring', 'sharing', 'love', 'friendship',
      'honest', 'brave', 'respectful', 'patient', 'forgiving'
    ];
    
    const lowerContent = content.toLowerCase();
    const positiveCount = positiveWords.reduce((count, word) => 
      count + (lowerContent.includes(word) ? 1 : 0), 0);
    
    return Math.min(1, positiveCount * 0.2);
  }

  // Non-story content helpers
  private hasIntroduction(content: string): boolean {
    const sentences = content.split(/[.!?]+/);
    return sentences.length > 0 && sentences[0].trim().length > 10;
  }

  private hasMainContent(content: string): boolean {
    const sentences = content.split(/[.!?]+/);
    return sentences.length >= 3; // At least 3 sentences for main content
  }

  private hasConclusion(content: string): boolean {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return false;
    
    const lastSentence = sentences[sentences.length - 1].toLowerCase();
    const conclusionIndicators = [
      'in conclusion', 'finally', 'to summarize', 'in summary',
      'therefore', 'as a result', 'in the end'
    ];
    
    return conclusionIndicators.some(indicator => lastSentence.includes(indicator));
  }

  private hasCoherentFlow(content: string): boolean {
    const flowIndicators = [
      'first', 'second', 'then', 'next', 'after', 'finally',
      'however', 'therefore', 'because', 'since', 'although'
    ];
    
    const lowerContent = content.toLowerCase();
    const flowCount = flowIndicators.reduce((count, indicator) => 
      count + (lowerContent.includes(indicator) ? 1 : 0), 0);
    
    return flowCount >= 2;
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Test with simple content
      const testContent = 'Once upon a time, there was a kind character who learned to be helpful and made many friends. The end.';
      const testRequest: ContentSafetyRequest = {
        content: testContent,
        contentType: 'story',
        userAge: 8,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'health_check',
          requestId: 'health_check'
        }
      };

      const result = await this.assessQuality(testContent, testRequest);
      return result.overallQuality > 0; // Should return a valid quality score
    } catch (error) {
      this.logger.error('QualityAssuranceEngine health check failed', { error });
      return false;
    }
  }
}
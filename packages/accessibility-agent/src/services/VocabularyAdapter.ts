import { SupabaseClient } from '@supabase/supabase-js';
import {
  AccessibilityProfile,
  VocabularyAdaptation,
  AdaptationError,
} from '../types';

export class VocabularyAdapter {
  private vocabularyCache: Map<string, VocabularyAdaptation[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(private supabase: SupabaseClient) {}

  async adaptText(
    text: string,
    profile: AccessibilityProfile,
    context?: string
  ): Promise<string> {
    try {
      if (profile.vocabularyLevel === 'standard' && !profile.simplifiedLanguageMode) {
        return text; // No adaptation needed
      }

      const ageGroup = this.determineAgeGroup(profile);
      const adaptations = await this.getVocabularyAdaptations(profile.vocabularyLevel, ageGroup);
      
      let adaptedText = text;

      // Apply vocabulary adaptations
      for (const adaptation of adaptations) {
        const regex = new RegExp(`\\b${adaptation.originalWord}\\b`, 'gi');
        adaptedText = adaptedText.replace(regex, adaptation.simplifiedWord);
      }

      // Apply custom vocabulary terms from profile
      for (const term of profile.customVocabularyTerms) {
        const [original, simplified] = term.split(':');
        if (original && simplified) {
          const regex = new RegExp(`\\b${original}\\b`, 'gi');
          adaptedText = adaptedText.replace(regex, simplified);
        }
      }

      // Log usage for learning
      await this.logVocabularyUsage(profile.userId, adaptations, context);

      return adaptedText;
    } catch (error) {
      throw new AdaptationError(`Failed to adapt vocabulary: ${error.message}`, { text, profile: profile.id });
    }
  }

  async learnPreference(
    userId: string,
    originalWord: string,
    preferredWord: string,
    context: string
  ): Promise<void> {
    try {
      // Check if this preference already exists
      const { data: existing } = await this.supabase
        .from('vocabulary_adaptations')
        .select('*')
        .eq('originalWord', originalWord.toLowerCase())
        .eq('simplifiedWord', preferredWord.toLowerCase())
        .single();

      if (existing) {
        // Update usage count and effectiveness
        await this.supabase
          .from('vocabulary_adaptations')
          .update({
            usage_count: existing.usage_count + 1,
            effectiveness: Math.min(existing.effectiveness + 0.1, 1.0),
          })
          .eq('id', existing.id);
      } else {
        // Create new vocabulary adaptation
        const ageGroup = await this.getUserAgeGroup(userId);
        await this.supabase
          .from('vocabulary_adaptations')
          .insert({
            originalWord: originalWord.toLowerCase(),
            simplifiedWord: preferredWord.toLowerCase(),
            context,
            ageGroup,
            vocabularyLevel: 'simple',
            usage_count: 1,
            effectiveness: 0.7,
          });
      }

      // Clear cache to force refresh
      this.vocabularyCache.clear();
      this.cacheExpiry.clear();
    } catch (error) {
      throw new AdaptationError(`Failed to learn vocabulary preference: ${error.message}`, { userId, originalWord, preferredWord });
    }
  }

  async getVocabularyStats(userId: string): Promise<{
    totalAdaptations: number;
    mostUsedWords: Array<{ word: string; count: number }>;
    effectivenessScore: number;
  }> {
    try {
      const { data: adaptations, error } = await this.supabase
        .from('vocabulary_usage_log')
        .select('*')
        .eq('userId', userId);

      if (error) throw error;

      const totalAdaptations = adaptations?.length || 0;
      
      // Calculate most used words
      const wordCounts: Record<string, number> = {};
      let totalEffectiveness = 0;
      let effectivenessCount = 0;

      for (const adaptation of adaptations || []) {
        wordCounts[adaptation.originalWord] = (wordCounts[adaptation.originalWord] || 0) + 1;
        if (adaptation.effectiveness !== null) {
          totalEffectiveness += adaptation.effectiveness;
          effectivenessCount++;
        }
      }

      const mostUsedWords = Object.entries(wordCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }));

      const effectivenessScore = effectivenessCount > 0 ? totalEffectiveness / effectivenessCount : 0;

      return {
        totalAdaptations,
        mostUsedWords,
        effectivenessScore,
      };
    } catch (error) {
      throw new AdaptationError(`Failed to get vocabulary stats: ${error.message}`, { userId });
    }
  }

  private async getVocabularyAdaptations(
    vocabularyLevel: 'simple' | 'standard' | 'advanced',
    ageGroup: string
  ): Promise<VocabularyAdaptation[]> {
    const cacheKey = `${vocabularyLevel}-${ageGroup}`;
    const now = Date.now();

    // Check cache first
    if (this.vocabularyCache.has(cacheKey) && 
        this.cacheExpiry.has(cacheKey) && 
        this.cacheExpiry.get(cacheKey)! > now) {
      return this.vocabularyCache.get(cacheKey)!;
    }

    try {
      const { data, error } = await this.supabase
        .from('vocabulary_adaptations')
        .select('*')
        .eq('vocabularyLevel', vocabularyLevel)
        .eq('ageGroup', ageGroup)
        .order('effectiveness', { ascending: false });

      if (error) throw error;

      const adaptations = data || [];
      
      // Cache the results
      this.vocabularyCache.set(cacheKey, adaptations);
      this.cacheExpiry.set(cacheKey, now + this.CACHE_DURATION);

      return adaptations;
    } catch (error) {
      throw new AdaptationError(`Failed to get vocabulary adaptations: ${error.message}`, { vocabularyLevel, ageGroup });
    }
  }

  private determineAgeGroup(profile: AccessibilityProfile): string {
    // This would typically come from user profile data
    // For now, we'll use vocabulary level as a proxy
    switch (profile.vocabularyLevel) {
      case 'simple':
        return '3-5';
      case 'standard':
        return '6-8';
      case 'advanced':
        return '9-11';
      default:
        return '6-8';
    }
  }

  private async getUserAgeGroup(userId: string): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('age')
        .eq('id', userId)
        .single();

      if (error || !data?.age) return '6-8'; // Default age group

      const age = data.age;
      if (age <= 5) return '3-5';
      if (age <= 8) return '6-8';
      if (age <= 11) return '9-11';
      return '12+';
    } catch (error) {
      return '6-8'; // Default fallback
    }
  }

  private async logVocabularyUsage(
    userId: string,
    adaptations: VocabularyAdaptation[],
    context?: string
  ): Promise<void> {
    try {
      const usageRecords = adaptations.map(adaptation => ({
        userId,
        originalWord: adaptation.originalWord,
        simplifiedWord: adaptation.simplifiedWord,
        context: context || '',
        timestamp: new Date(),
        effectiveness: adaptation.effectiveness,
      }));

      if (usageRecords.length > 0) {
        await this.supabase
          .from('vocabulary_usage_log')
          .insert(usageRecords);
      }
    } catch (error) {
      // Log error but don't throw - usage logging shouldn't break the main flow
      console.error('Failed to log vocabulary usage:', error);
    }
  }

  // Predefined vocabulary adaptations for common words
  private getDefaultVocabularyAdaptations(): VocabularyAdaptation[] {
    return [
      {
        originalWord: 'magnificent',
        simplifiedWord: 'great',
        context: 'general',
        ageGroup: '3-5',
        vocabularyLevel: 'simple',
        usage_count: 0,
        effectiveness: 0.8,
      },
      {
        originalWord: 'extraordinary',
        simplifiedWord: 'amazing',
        context: 'general',
        ageGroup: '3-5',
        vocabularyLevel: 'simple',
        usage_count: 0,
        effectiveness: 0.8,
      },
      {
        originalWord: 'tremendous',
        simplifiedWord: 'big',
        context: 'size',
        ageGroup: '3-5',
        vocabularyLevel: 'simple',
        usage_count: 0,
        effectiveness: 0.9,
      },
      {
        originalWord: 'fascinating',
        simplifiedWord: 'cool',
        context: 'general',
        ageGroup: '3-5',
        vocabularyLevel: 'simple',
        usage_count: 0,
        effectiveness: 0.8,
      },
      {
        originalWord: 'adventure',
        simplifiedWord: 'trip',
        context: 'story',
        ageGroup: '3-5',
        vocabularyLevel: 'simple',
        usage_count: 0,
        effectiveness: 0.7,
      },
      {
        originalWord: 'discover',
        simplifiedWord: 'find',
        context: 'action',
        ageGroup: '3-5',
        vocabularyLevel: 'simple',
        usage_count: 0,
        effectiveness: 0.9,
      },
      {
        originalWord: 'mysterious',
        simplifiedWord: 'strange',
        context: 'description',
        ageGroup: '3-5',
        vocabularyLevel: 'simple',
        usage_count: 0,
        effectiveness: 0.8,
      },
      {
        originalWord: 'enormous',
        simplifiedWord: 'very big',
        context: 'size',
        ageGroup: '3-5',
        vocabularyLevel: 'simple',
        usage_count: 0,
        effectiveness: 0.9,
      },
    ];
  }
}
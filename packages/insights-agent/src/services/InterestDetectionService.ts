import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Database } from '@alexa-multi-agent/shared-types';
import { 
  InterestDetectionService as IInterestDetectionService,
  InterestPattern,
  InterestCategory,
  InterestExample,
  DateRange,
  InsightsConfig
} from '../types';

export class InterestDetectionService implements IInterestDetectionService {
  private interestKeywords: Record<InterestCategory, string[]> = {
    sports: ['soccer', 'football', 'basketball', 'baseball', 'tennis', 'swimming', 'running', 'cycling', 'hockey', 'volleyball', 'golf', 'track', 'field', 'athletics', 'competition', 'team', 'game', 'match', 'tournament', 'coach', 'player', 'sport'],
    animals: ['dog', 'cat', 'horse', 'elephant', 'lion', 'tiger', 'bear', 'rabbit', 'bird', 'fish', 'dolphin', 'whale', 'monkey', 'giraffe', 'zebra', 'pet', 'zoo', 'farm', 'wild', 'animal', 'creature', 'mammal', 'reptile', 'insect'],
    science: ['experiment', 'laboratory', 'chemistry', 'physics', 'biology', 'space', 'planet', 'star', 'rocket', 'astronaut', 'scientist', 'discovery', 'invention', 'research', 'microscope', 'telescope', 'DNA', 'molecule', 'atom', 'energy', 'gravity', 'evolution'],
    art: ['painting', 'drawing', 'sculpture', 'color', 'brush', 'canvas', 'artist', 'museum', 'gallery', 'creative', 'design', 'sketch', 'portrait', 'landscape', 'abstract', 'masterpiece', 'palette', 'easel', 'art', 'artistic', 'creativity', 'imagination'],
    music: ['song', 'singing', 'instrument', 'piano', 'guitar', 'violin', 'drums', 'music', 'melody', 'rhythm', 'beat', 'concert', 'band', 'orchestra', 'musician', 'composer', 'note', 'harmony', 'dance', 'performance', 'stage', 'audience'],
    technology: ['computer', 'robot', 'coding', 'programming', 'internet', 'website', 'app', 'software', 'hardware', 'digital', 'electronic', 'gadget', 'device', 'innovation', 'artificial intelligence', 'AI', 'machine', 'automation', 'tech', 'cyber', 'virtual', 'online'],
    nature: ['tree', 'forest', 'mountain', 'river', 'ocean', 'beach', 'flower', 'garden', 'plant', 'leaf', 'grass', 'sky', 'cloud', 'rain', 'sun', 'moon', 'star', 'weather', 'season', 'environment', 'earth', 'natural', 'outdoor', 'hiking', 'camping'],
    adventure: ['adventure', 'explore', 'journey', 'quest', 'treasure', 'map', 'discovery', 'expedition', 'travel', 'voyage', 'mystery', 'secret', 'hidden', 'unknown', 'brave', 'courage', 'hero', 'challenge', 'exciting', 'thrilling', 'dangerous', 'rescue'],
    fantasy: ['magic', 'wizard', 'fairy', 'dragon', 'unicorn', 'castle', 'kingdom', 'princess', 'prince', 'knight', 'sword', 'spell', 'potion', 'enchanted', 'magical', 'fantasy', 'mythical', 'legend', 'tale', 'story', 'imagination', 'dream'],
    friendship: ['friend', 'friendship', 'buddy', 'companion', 'together', 'share', 'help', 'support', 'care', 'kind', 'loyal', 'trust', 'play', 'fun', 'laugh', 'smile', 'happy', 'team', 'group', 'social', 'community', 'belonging'],
    family: ['family', 'mother', 'father', 'parent', 'sibling', 'brother', 'sister', 'grandparent', 'grandmother', 'grandfather', 'cousin', 'aunt', 'uncle', 'home', 'love', 'care', 'protect', 'support', 'together', 'bond', 'relationship', 'relative'],
    learning: ['learn', 'study', 'school', 'teacher', 'student', 'education', 'knowledge', 'book', 'read', 'write', 'math', 'science', 'history', 'geography', 'language', 'skill', 'practice', 'homework', 'test', 'grade', 'achievement', 'success'],
    creativity: ['create', 'make', 'build', 'design', 'imagine', 'invent', 'craft', 'artistic', 'original', 'unique', 'creative', 'innovation', 'idea', 'inspiration', 'expression', 'talent', 'skill', 'project', 'masterpiece', 'beautiful', 'amazing', 'wonderful']
  };

  constructor(
    private supabase: SupabaseClient<Database>,
    private redis: RedisClientType,
    private config: InsightsConfig
  ) {}

  async detectInterests(
    userId: string, 
    libraryId?: string, 
    timeRange?: DateRange
  ): Promise<InterestPattern[]> {
    const range = timeRange || this.getDefaultTimeRange();
    
    // Get story content and interactions
    const stories = await this.getStoryData(userId, libraryId, range);
    const interactions = await this.getStoryInteractions(userId, libraryId, range);
    const characters = await this.getCharacterData(userId, libraryId, range);
    
    // Extract text content for analysis
    const textContent = this.extractTextContent(stories, interactions, characters);
    
    // Detect interests from text content
    const interestPatterns = await this.analyzeTextForInterests(textContent, range);
    
    // Enhance with interaction patterns
    const enhancedPatterns = this.enhanceWithInteractionPatterns(interestPatterns, interactions);
    
    // Filter and rank by confidence
    return enhancedPatterns
      .filter(pattern => pattern.confidence >= this.config.analysis.confidenceThreshold)
      .sort((a, b) => b.confidence - a.confidence);
  }

  async categorizeInterests(interests: InterestPattern[]): Promise<Map<InterestCategory, InterestPattern[]>> {
    const categorized = new Map<InterestCategory, InterestPattern[]>();
    
    // Initialize all categories
    Object.keys(this.interestKeywords).forEach(category => {
      categorized.set(category as InterestCategory, []);
    });
    
    // Categorize each interest pattern
    for (const interest of interests) {
      const category = interest.category;
      const existing = categorized.get(category) || [];
      existing.push(interest);
      categorized.set(category, existing);
    }
    
    return categorized;
  }

  private async getStoryData(userId: string, libraryId?: string, timeRange: DateRange) {
    let query = this.supabase
      .from('stories')
      .select(`
        *,
        libraries!inner(owner)
      `)
      .eq('libraries.owner', userId)
      .gte('created_at', timeRange.start)
      .lte('created_at', timeRange.end);

    if (libraryId) {
      query = query.eq('library_id', libraryId);
    }

    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch story data: ${error.message}`);
    }

    return data || [];
  }

  private async getStoryInteractions(userId: string, libraryId?: string, timeRange: DateRange) {
    let query = this.supabase
      .from('story_interactions')
      .select(`
        *,
        stories!inner(
          library_id,
          content,
          libraries!inner(owner)
        )
      `)
      .eq('user_id', userId)
      .eq('stories.libraries.owner', userId)
      .gte('created_at', timeRange.start)
      .lte('created_at', timeRange.end);

    if (libraryId) {
      query = query.eq('stories.library_id', libraryId);
    }

    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch story interactions: ${error.message}`);
    }

    return data || [];
  }

  private async getCharacterData(userId: string, libraryId?: string, timeRange: DateRange) {
    let query = this.supabase
      .from('characters')
      .select(`
        *,
        stories!inner(
          library_id,
          libraries!inner(owner)
        )
      `)
      .eq('stories.libraries.owner', userId)
      .gte('created_at', timeRange.start)
      .lte('created_at', timeRange.end);

    if (libraryId) {
      query = query.eq('stories.library_id', libraryId);
    }

    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch character data: ${error.message}`);
    }

    return data || [];
  }

  private extractTextContent(stories: any[], interactions: any[], characters: any[]): string[] {
    const textContent: string[] = [];
    
    // Extract from story content
    for (const story of stories) {
      if (story.content) {
        // Extract text from story beats
        if (story.content.beats) {
          for (const beat of story.content.beats) {
            if (beat.content) {
              textContent.push(beat.content);
            }
          }
        }
        
        // Extract theme and setting
        if (story.content.theme) {
          textContent.push(story.content.theme);
        }
        if (story.content.setting) {
          textContent.push(story.content.setting);
        }
        
        // Extract from hero journey structure
        if (story.content.heroJourneyStructure) {
          for (const beat of story.content.heroJourneyStructure) {
            if (beat.content) {
              textContent.push(beat.content);
            }
          }
        }
      }
      
      // Extract title
      if (story.title) {
        textContent.push(story.title);
      }
    }
    
    // Extract from character traits
    for (const character of characters) {
      if (character.traits) {
        // Convert traits object to searchable text
        const traitsText = JSON.stringify(character.traits).toLowerCase();
        textContent.push(traitsText);
      }
      if (character.name) {
        textContent.push(character.name);
      }
    }
    
    // Extract from interaction data
    for (const interaction of interactions) {
      if (interaction.interaction_data) {
        const interactionText = JSON.stringify(interaction.interaction_data).toLowerCase();
        textContent.push(interactionText);
      }
    }
    
    return textContent;
  }

  private async analyzeTextForInterests(textContent: string[], timeRange: DateRange): Promise<InterestPattern[]> {
    const interestPatterns: InterestPattern[] = [];
    const combinedText = textContent.join(' ').toLowerCase();
    
    // Analyze each interest category
    for (const [category, keywords] of Object.entries(this.interestKeywords)) {
      const matchedKeywords: string[] = [];
      const examples: InterestExample[] = [];
      let totalMatches = 0;
      
      // Count keyword matches
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = combinedText.match(regex);
        
        if (matches) {
          matchedKeywords.push(keyword);
          totalMatches += matches.length;
          
          // Find examples in original content
          for (let i = 0; i < textContent.length; i++) {
            const content = textContent[i];
            if (content.toLowerCase().includes(keyword)) {
              examples.push({
                source: this.determineSource(content),
                content: this.extractRelevantSnippet(content, keyword),
                timestamp: new Date().toISOString(), // Would be actual timestamp in real implementation
                relevanceScore: matches.length / content.split(' ').length
              });
            }
          }
        }
      }
      
      // Calculate confidence and strength
      if (matchedKeywords.length > 0) {
        const confidence = Math.min(totalMatches / 100, 1); // Normalize to 0-1
        const strength = this.determineInterestStrength(totalMatches, matchedKeywords.length);
        
        interestPatterns.push({
          category: category as InterestCategory,
          keywords: matchedKeywords,
          confidence,
          frequency: totalMatches,
          firstDetected: timeRange.start,
          lastDetected: timeRange.end,
          strength,
          examples: examples.slice(0, 5) // Limit to top 5 examples
        });
      }
    }
    
    return interestPatterns;
  }

  private determineSource(content: string): 'story_content' | 'character_traits' | 'story_choices' | 'conversation' {
    // Simple heuristic to determine source type
    if (content.includes('{') && content.includes('}')) {
      return 'character_traits';
    } else if (content.includes('choice') || content.includes('option')) {
      return 'story_choices';
    } else if (content.length < 100) {
      return 'conversation';
    } else {
      return 'story_content';
    }
  }

  private extractRelevantSnippet(content: string, keyword: string): string {
    const words = content.split(' ');
    const keywordIndex = words.findIndex(word => 
      word.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (keywordIndex === -1) return content.substring(0, 100);
    
    // Extract 10 words before and after the keyword
    const start = Math.max(0, keywordIndex - 10);
    const end = Math.min(words.length, keywordIndex + 11);
    
    return words.slice(start, end).join(' ');
  }

  private determineInterestStrength(frequency: number, keywordVariety: number): 'emerging' | 'moderate' | 'strong' | 'passionate' {
    const score = frequency * 0.7 + keywordVariety * 0.3;
    
    if (score >= 20) return 'passionate';
    if (score >= 10) return 'strong';
    if (score >= 5) return 'moderate';
    return 'emerging';
  }

  private enhanceWithInteractionPatterns(
    interestPatterns: InterestPattern[], 
    interactions: any[]
  ): InterestPattern[] {
    // Analyze interaction patterns to enhance interest detection
    const interactionsByStoryType = this.groupInteractionsByStoryType(interactions);
    
    for (const pattern of interestPatterns) {
      // Find related story types
      const relatedStoryTypes = this.findRelatedStoryTypes(pattern.category);
      
      // Calculate engagement with related story types
      let totalEngagement = 0;
      let relatedInteractions = 0;
      
      for (const storyType of relatedStoryTypes) {
        const typeInteractions = interactionsByStoryType[storyType] || [];
        relatedInteractions += typeInteractions.length;
        
        // Calculate engagement score for this story type
        const engagementScore = this.calculateStoryTypeEngagement(typeInteractions);
        totalEngagement += engagementScore;
      }
      
      // Adjust confidence based on interaction patterns
      if (relatedInteractions > 0) {
        const interactionBoost = Math.min(totalEngagement / relatedInteractions, 0.3);
        pattern.confidence = Math.min(pattern.confidence + interactionBoost, 1);
      }
    }
    
    return interestPatterns;
  }

  private groupInteractionsByStoryType(interactions: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};
    
    for (const interaction of interactions) {
      const storyType = interaction.stories?.content?.type || 'unknown';
      if (!grouped[storyType]) {
        grouped[storyType] = [];
      }
      grouped[storyType].push(interaction);
    }
    
    return grouped;
  }

  private findRelatedStoryTypes(category: InterestCategory): string[] {
    const storyTypeMapping: Record<InterestCategory, string[]> = {
      sports: ['Adventure', 'Educational'],
      animals: ['Adventure', 'Educational', 'Bedtime'],
      science: ['Educational', 'Tech Readiness', 'Adventure'],
      art: ['Educational', 'Milestones'],
      music: ['Educational', 'Milestones', 'Birthday'],
      technology: ['Tech Readiness', 'Educational', 'Adventure'],
      nature: ['Adventure', 'Educational', 'Bedtime'],
      adventure: ['Adventure'],
      fantasy: ['Adventure', 'Bedtime'],
      friendship: ['Adventure', 'Educational', 'Mental Health'],
      family: ['Milestones', 'Mental Health', 'Bedtime'],
      learning: ['Educational', 'Language Learning', 'Financial Literacy'],
      creativity: ['Educational', 'Milestones', 'Adventure']
    };
    
    return storyTypeMapping[category] || [];
  }

  private calculateStoryTypeEngagement(interactions: any[]): number {
    if (interactions.length === 0) return 0;
    
    let score = 0;
    for (const interaction of interactions) {
      switch (interaction.interaction_type) {
        case 'completed':
          score += 3;
          break;
        case 'created':
          score += 2;
          break;
        case 'edited':
          score += 2;
          break;
        case 'shared':
          score += 1;
          break;
        case 'viewed':
          score += 0.5;
          break;
      }
    }
    
    return score / interactions.length;
  }

  private getDefaultTimeRange(): DateRange {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - this.config.analysis.defaultTimeRange);

    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  }
}
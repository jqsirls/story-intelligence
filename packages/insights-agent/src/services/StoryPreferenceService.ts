import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Database, StoryType } from '@alexa-multi-agent/shared-types';
import { 
  StoryPreferenceService as IStoryPreferenceService,
  StoryPreferencePattern,
  ThemePreference,
  CharacterPreference,
  SettingPreference,
  DateRange,
  InsightsConfig
} from '../types';

export class StoryPreferenceService implements IStoryPreferenceService {
  private storyTypes: StoryType[] = [
    'Adventure', 'Bedtime', 'Birthday', 'Educational', 'Financial Literacy',
    'Language Learning', 'Medical Bravery', 'Mental Health', 'Milestones',
    'New Chapter Sequel', 'Tech Readiness'
  ];

  constructor(
    private supabase: SupabaseClient<Database>,
    private redis: RedisClientType,
    private config: InsightsConfig
  ) {}

  async analyzeStoryPreferences(
    userId: string, 
    libraryId?: string, 
    timeRange?: DateRange
  ): Promise<StoryPreferencePattern[]> {
    const range = timeRange || this.getDefaultTimeRange();
    
    // Get story and interaction data
    const stories = await this.getStoryData(userId, libraryId, range);
    const interactions = await this.getStoryInteractions(userId, libraryId, range);
    const characters = await this.getCharacterData(userId, libraryId, range);
    
    const preferences: StoryPreferencePattern[] = [];
    
    // Analyze preferences for each story type
    for (const storyType of this.storyTypes) {
      const typeStories = stories.filter(s => s.content?.type === storyType);
      const typeInteractions = interactions.filter(i => 
        i.stories?.content?.type === storyType
      );
      
      if (typeStories.length > 0 || typeInteractions.length > 0) {
        const preference = await this.analyzeStoryTypePreference(
          storyType,
          typeStories,
          typeInteractions,
          characters
        );
        preferences.push(preference);
      }
    }
    
    // Sort by engagement score
    return preferences.sort((a, b) => b.engagementScore - a.engagementScore);
  }

  async predictStoryRecommendations(preferences: StoryPreferencePattern[]): Promise<string[]> {
    const recommendations: string[] = [];
    
    // Get top preferred story types
    const topPreferences = preferences
      .filter(p => p.preference === 'loves' || p.preference === 'likes')
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 3);
    
    for (const pref of topPreferences) {
      // Generate specific recommendations based on themes and characters
      const storyRecommendations = this.generateStoryRecommendations(pref);
      recommendations.push(...storyRecommendations);
    }
    
    // If no strong preferences, recommend diverse story types
    if (recommendations.length === 0) {
      recommendations.push(
        'Try adventure stories with problem-solving elements',
        'Explore educational stories about science or nature',
        'Consider bedtime stories with calming themes'
      );
    }
    
    return recommendations.slice(0, 5); // Limit to top 5 recommendations
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
          content,
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

  private async analyzeStoryTypePreference(
    storyType: string,
    stories: any[],
    interactions: any[],
    allCharacters: any[]
  ): Promise<StoryPreferencePattern> {
    // Calculate basic metrics
    const frequency = stories.length;
    const completionRate = this.calculateCompletionRate(stories, interactions);
    const engagementScore = this.calculateEngagementScore(interactions);
    
    // Determine preference level
    const preference = this.determinePreferenceLevel(frequency, completionRate, engagementScore);
    
    // Analyze themes
    const themes = this.analyzeThemes(stories);
    
    // Analyze characters for this story type
    const typeCharacters = allCharacters.filter(c => 
      stories.some(s => s.id === c.story_id)
    );
    const characters = this.analyzeCharacters(typeCharacters);
    
    // Analyze settings
    const settings = this.analyzeSettings(stories);
    
    return {
      storyType,
      preference,
      frequency,
      completionRate,
      engagementScore,
      themes,
      characters,
      settings
    };
  }

  private calculateCompletionRate(stories: any[], interactions: any[]): number {
    if (stories.length === 0) return 0;
    
    const completedStories = interactions.filter(i => 
      i.interaction_type === 'completed'
    ).length;
    
    return completedStories / stories.length;
  }

  private calculateEngagementScore(interactions: any[]): number {
    if (interactions.length === 0) return 0;
    
    let score = 0;
    const weights = {
      'created': 3,
      'completed': 2,
      'edited': 2,
      'shared': 1,
      'viewed': 0.5
    };
    
    for (const interaction of interactions) {
      const weight = weights[interaction.interaction_type as keyof typeof weights] || 0;
      score += weight;
    }
    
    return score / interactions.length;
  }

  private determinePreferenceLevel(
    frequency: number, 
    completionRate: number, 
    engagementScore: number
  ): 'loves' | 'likes' | 'neutral' | 'dislikes' | 'avoids' {
    const combinedScore = (frequency * 0.3) + (completionRate * 0.4) + (engagementScore * 0.3);
    
    if (combinedScore >= 2.5 && completionRate >= 0.8) return 'loves';
    if (combinedScore >= 1.5 && completionRate >= 0.6) return 'likes';
    if (combinedScore >= 0.8 && completionRate >= 0.4) return 'neutral';
    if (combinedScore >= 0.3) return 'dislikes';
    return 'avoids';
  }

  private analyzeThemes(stories: any[]): ThemePreference[] {
    const themeMap = new Map<string, { count: number, examples: string[] }>();
    
    for (const story of stories) {
      if (story.content?.theme) {
        const theme = story.content.theme.toLowerCase();
        const existing = themeMap.get(theme) || { count: 0, examples: [] };
        existing.count++;
        existing.examples.push(story.title || 'Untitled Story');
        themeMap.set(theme, existing);
      }
      
      // Also extract themes from story beats
      if (story.content?.beats) {
        const extractedThemes = this.extractThemesFromBeats(story.content.beats);
        for (const theme of extractedThemes) {
          const existing = themeMap.get(theme) || { count: 0, examples: [] };
          existing.count++;
          existing.examples.push(story.title || 'Untitled Story');
          themeMap.set(theme, existing);
        }
      }
    }
    
    const themes: ThemePreference[] = [];
    const totalStories = stories.length;
    
    for (const [theme, data] of themeMap.entries()) {
      const affinity = (data.count / totalStories) * 2 - 1; // Scale to -1 to 1
      themes.push({
        theme,
        affinity: Math.max(-1, Math.min(1, affinity)),
        examples: data.examples.slice(0, 3) // Limit examples
      });
    }
    
    return themes.sort((a, b) => b.affinity - a.affinity);
  }

  private extractThemesFromBeats(beats: any[]): string[] {
    const themes: string[] = [];
    const themeKeywords = {
      'friendship': ['friend', 'buddy', 'companion', 'together'],
      'adventure': ['explore', 'journey', 'quest', 'discover'],
      'family': ['family', 'parent', 'sibling', 'home'],
      'courage': ['brave', 'courage', 'fearless', 'bold'],
      'kindness': ['kind', 'gentle', 'caring', 'help'],
      'learning': ['learn', 'discover', 'understand', 'knowledge'],
      'magic': ['magic', 'spell', 'enchanted', 'wizard'],
      'nature': ['forest', 'ocean', 'mountain', 'animal'],
      'problem-solving': ['solve', 'figure out', 'solution', 'puzzle']
    };
    
    const combinedText = beats.map(b => b.content || '').join(' ').toLowerCase();
    
    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      for (const keyword of keywords) {
        if (combinedText.includes(keyword)) {
          themes.push(theme);
          break; // Only add theme once
        }
      }
    }
    
    return themes;
  }

  private analyzeCharacters(characters: any[]): CharacterPreference[] {
    const characterTypeMap = new Map<string, { count: number, traits: string[], examples: string[] }>();
    
    for (const character of characters) {
      if (character.traits) {
        const characterType = this.determineCharacterType(character.traits);
        const traits = this.extractCharacterTraits(character.traits);
        
        const existing = characterTypeMap.get(characterType) || { 
          count: 0, 
          traits: [], 
          examples: [] 
        };
        existing.count++;
        existing.traits.push(...traits);
        existing.examples.push(character.name || 'Unnamed Character');
        characterTypeMap.set(characterType, existing);
      }
    }
    
    const characterPreferences: CharacterPreference[] = [];
    const totalCharacters = characters.length;
    
    for (const [characterType, data] of characterTypeMap.entries()) {
      const affinity = (data.count / totalCharacters) * 2 - 1; // Scale to -1 to 1
      const uniqueTraits = [...new Set(data.traits)];
      
      characterPreferences.push({
        characterType,
        traits: uniqueTraits.slice(0, 5), // Limit traits
        affinity: Math.max(-1, Math.min(1, affinity)),
        examples: data.examples.slice(0, 3) // Limit examples
      });
    }
    
    return characterPreferences.sort((a, b) => b.affinity - a.affinity);
  }

  private determineCharacterType(traits: any): string {
    if (traits.species) {
      return traits.species;
    }
    
    // Fallback to analyzing traits
    const traitString = JSON.stringify(traits).toLowerCase();
    
    if (traitString.includes('animal') || traitString.includes('pet')) return 'animal';
    if (traitString.includes('magic') || traitString.includes('wizard')) return 'magical';
    if (traitString.includes('robot') || traitString.includes('machine')) return 'robot';
    if (traitString.includes('superhero') || traitString.includes('power')) return 'superhero';
    
    return 'human';
  }

  private extractCharacterTraits(traits: any): string[] {
    const extractedTraits: string[] = [];
    
    // Extract specific trait categories
    if (traits.personality) {
      if (Array.isArray(traits.personality)) {
        extractedTraits.push(...traits.personality);
      } else if (typeof traits.personality === 'string') {
        extractedTraits.push(traits.personality);
      }
    }
    
    if (traits.inclusivityTraits) {
      extractedTraits.push(...traits.inclusivityTraits.map((t: any) => t.type || t));
    }
    
    if (traits.appearance) {
      Object.values(traits.appearance).forEach(value => {
        if (typeof value === 'string') {
          extractedTraits.push(value);
        }
      });
    }
    
    return extractedTraits.filter(trait => typeof trait === 'string' && trait.length > 0);
  }

  private analyzeSettings(stories: any[]): SettingPreference[] {
    const settingMap = new Map<string, { count: number, examples: string[] }>();
    
    for (const story of stories) {
      if (story.content?.setting) {
        const setting = story.content.setting.toLowerCase();
        const existing = settingMap.get(setting) || { count: 0, examples: [] };
        existing.count++;
        existing.examples.push(story.title || 'Untitled Story');
        settingMap.set(setting, existing);
      }
      
      // Extract settings from story content
      const extractedSettings = this.extractSettingsFromContent(story.content);
      for (const setting of extractedSettings) {
        const existing = settingMap.get(setting) || { count: 0, examples: [] };
        existing.count++;
        existing.examples.push(story.title || 'Untitled Story');
        settingMap.set(setting, existing);
      }
    }
    
    const settings: SettingPreference[] = [];
    const totalStories = stories.length;
    
    for (const [setting, data] of settingMap.entries()) {
      const affinity = (data.count / totalStories) * 2 - 1; // Scale to -1 to 1
      settings.push({
        setting,
        affinity: Math.max(-1, Math.min(1, affinity)),
        examples: data.examples.slice(0, 3) // Limit examples
      });
    }
    
    return settings.sort((a, b) => b.affinity - a.affinity);
  }

  private extractSettingsFromContent(content: any): string[] {
    if (!content) return [];
    
    const settings: string[] = [];
    const settingKeywords = {
      'forest': ['forest', 'woods', 'trees', 'woodland'],
      'ocean': ['ocean', 'sea', 'beach', 'underwater'],
      'city': ['city', 'town', 'urban', 'street'],
      'home': ['home', 'house', 'bedroom', 'kitchen'],
      'school': ['school', 'classroom', 'playground', 'library'],
      'castle': ['castle', 'palace', 'kingdom', 'throne'],
      'space': ['space', 'planet', 'spaceship', 'stars'],
      'farm': ['farm', 'barn', 'field', 'countryside'],
      'mountain': ['mountain', 'hill', 'peak', 'valley'],
      'magical': ['magical', 'enchanted', 'fairy', 'wonderland']
    };
    
    const combinedText = JSON.stringify(content).toLowerCase();
    
    for (const [setting, keywords] of Object.entries(settingKeywords)) {
      for (const keyword of keywords) {
        if (combinedText.includes(keyword)) {
          settings.push(setting);
          break; // Only add setting once
        }
      }
    }
    
    return settings;
  }

  private generateStoryRecommendations(preference: StoryPreferencePattern): string[] {
    const recommendations: string[] = [];
    
    // Base recommendation on story type
    const baseRecommendation = this.getBaseRecommendation(preference.storyType);
    
    // Enhance with preferred themes
    const topThemes = preference.themes
      .filter(t => t.affinity > 0)
      .slice(0, 2)
      .map(t => t.theme);
    
    // Enhance with preferred characters
    const topCharacters = preference.characters
      .filter(c => c.affinity > 0)
      .slice(0, 2)
      .map(c => c.characterType);
    
    // Enhance with preferred settings
    const topSettings = preference.settings
      .filter(s => s.affinity > 0)
      .slice(0, 2)
      .map(s => s.setting);
    
    // Generate specific recommendations
    if (topThemes.length > 0 && topCharacters.length > 0) {
      recommendations.push(
        `Create ${preference.storyType.toLowerCase()} stories featuring ${topCharacters[0]} characters with ${topThemes[0]} themes`
      );
    }
    
    if (topSettings.length > 0) {
      recommendations.push(
        `Try ${preference.storyType.toLowerCase()} stories set in ${topSettings[0]} environments`
      );
    }
    
    // Add base recommendation if no specific ones generated
    if (recommendations.length === 0) {
      recommendations.push(baseRecommendation);
    }
    
    return recommendations;
  }

  private getBaseRecommendation(storyType: string): string {
    const recommendations: Record<string, string> = {
      'Adventure': 'Create exciting adventure stories with exploration and discovery',
      'Bedtime': 'Develop calming bedtime stories with peaceful themes',
      'Birthday': 'Make celebratory birthday stories with joy and friendship',
      'Educational': 'Build educational stories that combine learning with fun',
      'Financial Literacy': 'Create stories that teach money management and financial concepts',
      'Language Learning': 'Develop stories that incorporate new vocabulary and language skills',
      'Medical Bravery': 'Make supportive stories about medical experiences and courage',
      'Mental Health': 'Create stories that support emotional well-being and coping skills',
      'Milestones': 'Develop stories celebrating achievements and personal growth',
      'New Chapter Sequel': 'Continue favorite story themes with new adventures',
      'Tech Readiness': 'Create stories about technology and digital literacy'
    };
    
    return recommendations[storyType] || `Create more ${storyType.toLowerCase()} stories`;
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
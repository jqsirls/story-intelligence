import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import {
  CulturalContext,
  LanguageProfile,
  StorytellingTradition,
  CulturalSensitivityFilter,
  FamilyStructure
} from '../types';

export class CulturalContextEngine {
  constructor(
    private supabase: SupabaseClient,
    private openai: OpenAI
  ) {}

  async getCulturalContext(userId: string): Promise<CulturalContext | null> {
    try {
      const { data, error } = await this.supabase
        .from('cultural_contexts')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        primaryLanguage: data.primary_language,
        secondaryLanguages: data.secondary_languages || [],
        culturalBackground: data.cultural_background || [],
        religiousConsiderations: data.religious_considerations || [],
        familyStructure: data.family_structure || this.getDefaultFamilyStructure(),
        celebrationsAndHolidays: data.celebrations_and_holidays || [],
        storytellingTraditions: data.storytelling_traditions || [],
        tabooTopics: data.taboo_topics || [],
        preferredNarrativeStyles: data.preferred_narrative_styles || []
      };
    } catch (error) {
      console.error('Error fetching cultural context:', error);
      return null;
    }
  }

  async updateCulturalContext(userId: string, context: Partial<CulturalContext>): Promise<CulturalContext> {
    try {
      const { data, error } = await this.supabase
        .from('cultural_contexts')
        .upsert({
          user_id: userId,
          primary_language: context.primaryLanguage,
          secondary_languages: context.secondaryLanguages,
          cultural_background: context.culturalBackground,
          religious_considerations: context.religiousConsiderations,
          family_structure: context.familyStructure,
          celebrations_and_holidays: context.celebrationsAndHolidays,
          storytelling_traditions: context.storytellingTraditions,
          taboo_topics: context.tabooTopics,
          preferred_narrative_styles: context.preferredNarrativeStyles,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update cultural context: ${error.message}`);
      }

      return {
        primaryLanguage: data.primary_language,
        secondaryLanguages: data.secondary_languages || [],
        culturalBackground: data.cultural_background || [],
        religiousConsiderations: data.religious_considerations || [],
        familyStructure: data.family_structure || this.getDefaultFamilyStructure(),
        celebrationsAndHolidays: data.celebrations_and_holidays || [],
        storytellingTraditions: data.storytelling_traditions || [],
        tabooTopics: data.taboo_topics || [],
        preferredNarrativeStyles: data.preferred_narrative_styles || []
      };
    } catch (error) {
      console.error('Error updating cultural context:', error);
      throw error;
    }
  }

  async getSupportedLanguages(): Promise<LanguageProfile[]> {
    // Return comprehensive list of supported languages
    return [
      { code: 'en', name: 'English', nativeName: 'English', rtl: false, formality: 'mixed', proficiencyLevel: 'native' },
      { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false, formality: 'mixed', proficiencyLevel: 'native' },
      { code: 'fr', name: 'French', nativeName: 'Français', rtl: false, formality: 'formal', proficiencyLevel: 'native' },
      { code: 'de', name: 'German', nativeName: 'Deutsch', rtl: false, formality: 'formal', proficiencyLevel: 'native' },
      { code: 'it', name: 'Italian', nativeName: 'Italiano', rtl: false, formality: 'mixed', proficiencyLevel: 'native' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português', rtl: false, formality: 'mixed', proficiencyLevel: 'native' },
      { code: 'ru', name: 'Russian', nativeName: 'Русский', rtl: false, formality: 'formal', proficiencyLevel: 'native' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語', rtl: false, formality: 'formal', proficiencyLevel: 'native' },
      { code: 'ko', name: 'Korean', nativeName: '한국어', rtl: false, formality: 'formal', proficiencyLevel: 'native' },
      { code: 'zh', name: 'Chinese', nativeName: '中文', rtl: false, formality: 'formal', proficiencyLevel: 'native' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true, formality: 'formal', proficiencyLevel: 'native' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', rtl: false, formality: 'formal', proficiencyLevel: 'native' },
      { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', rtl: false, formality: 'mixed', proficiencyLevel: 'native' },
      { code: 'ur', name: 'Urdu', nativeName: 'اردو', rtl: true, formality: 'formal', proficiencyLevel: 'native' },
      { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', rtl: false, formality: 'mixed', proficiencyLevel: 'native' },
      { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', rtl: false, formality: 'mixed', proficiencyLevel: 'native' },
      { code: 'sv', name: 'Swedish', nativeName: 'Svenska', rtl: false, formality: 'mixed', proficiencyLevel: 'native' },
      { code: 'no', name: 'Norwegian', nativeName: 'Norsk', rtl: false, formality: 'mixed', proficiencyLevel: 'native' },
      { code: 'da', name: 'Danish', nativeName: 'Dansk', rtl: false, formality: 'mixed', proficiencyLevel: 'native' },
      { code: 'fi', name: 'Finnish', nativeName: 'Suomi', rtl: false, formality: 'mixed', proficiencyLevel: 'native' }
    ];
  }

  async getStorytellingTraditions(culturalBackground: string[]): Promise<StorytellingTradition[]> {
    const traditions: StorytellingTradition[] = [];

    for (const culture of culturalBackground) {
      const tradition = await this.getStorytellingTraditionForCulture(culture);
      if (tradition) {
        traditions.push(tradition);
      }
    }

    return traditions;
  }

  async getCulturalSensitivityFilters(culturalContext: string[]): Promise<CulturalSensitivityFilter[]> {
    const filters: CulturalSensitivityFilter[] = [];

    for (const culture of culturalContext) {
      const filter = await this.getCulturalSensitivityFilterForCulture(culture);
      if (filter) {
        filters.push(filter);
      }
    }

    return filters;
  }

  private async getStorytellingTraditionForCulture(culture: string): Promise<StorytellingTradition | null> {
    // This would typically query a database, but for now we'll use predefined traditions
    const traditions: { [key: string]: StorytellingTradition } = {
      'western': {
        name: 'Western Storytelling',
        culturalOrigin: ['European', 'American'],
        narrativeStructure: 'Three-act structure with hero\'s journey',
        commonThemes: ['good vs evil', 'personal growth', 'friendship', 'courage'],
        characterArchetypes: ['hero', 'mentor', 'villain', 'sidekick'],
        moralFramework: 'Individual responsibility and moral choice',
        adaptationGuidelines: ['Focus on individual agency', 'Clear moral distinctions', 'Happy endings preferred']
      },
      'east_asian': {
        name: 'East Asian Storytelling',
        culturalOrigin: ['Chinese', 'Japanese', 'Korean'],
        narrativeStructure: 'Cyclical narrative with emphasis on harmony',
        commonThemes: ['harmony', 'respect for elders', 'collective good', 'balance'],
        characterArchetypes: ['wise elder', 'dutiful child', 'harmonious community'],
        moralFramework: 'Collective responsibility and social harmony',
        adaptationGuidelines: ['Emphasize community over individual', 'Respect for tradition', 'Subtle moral lessons']
      },
      'african': {
        name: 'African Storytelling',
        culturalOrigin: ['Various African cultures'],
        narrativeStructure: 'Oral tradition with call-and-response elements',
        commonThemes: ['community wisdom', 'connection to nature', 'ancestral guidance', 'survival'],
        characterArchetypes: ['wise griot', 'trickster', 'community elder', 'animal spirits'],
        moralFramework: 'Community wisdom and ancestral guidance',
        adaptationGuidelines: ['Include community participation', 'Nature as teacher', 'Oral storytelling elements']
      },
      'indigenous': {
        name: 'Indigenous Storytelling',
        culturalOrigin: ['Native American', 'Aboriginal', 'First Nations'],
        narrativeStructure: 'Circular narrative with spiritual elements',
        commonThemes: ['connection to land', 'spiritual guidance', 'respect for all beings', 'traditional knowledge'],
        characterArchetypes: ['spirit guide', 'animal teacher', 'wise elder', 'nature guardian'],
        moralFramework: 'Respect for all living beings and natural balance',
        adaptationGuidelines: ['Honor spiritual elements', 'Respect for nature', 'Traditional knowledge preservation']
      },
      'middle_eastern': {
        name: 'Middle Eastern Storytelling',
        culturalOrigin: ['Arabic', 'Persian', 'Turkish'],
        narrativeStructure: 'Nested narratives with moral lessons',
        commonThemes: ['hospitality', 'wisdom', 'divine providence', 'family honor'],
        characterArchetypes: ['wise sultan', 'clever merchant', 'devoted family member', 'divine messenger'],
        moralFramework: 'Divine guidance and family honor',
        adaptationGuidelines: ['Emphasize hospitality', 'Respect for wisdom', 'Family-centered values']
      }
    };

    return traditions[culture.toLowerCase().replace(/\s+/g, '_')] || null;
  }

  private async getCulturalSensitivityFilterForCulture(culture: string): Promise<CulturalSensitivityFilter | null> {
    // This would typically query a database, but for now we'll use predefined filters
    const filters: { [key: string]: CulturalSensitivityFilter } = {
      'islamic': {
        culturalContext: 'Islamic',
        sensitiveTopics: ['pork', 'alcohol', 'gambling', 'inappropriate clothing'],
        appropriateAlternatives: {
          'pork': ['chicken', 'beef', 'lamb'],
          'alcohol': ['juice', 'water', 'tea'],
          'gambling': ['games', 'puzzles', 'sports']
        },
        respectfulLanguage: {
          'greetings': ['As-salamu alaikum', 'Peace be upon you'],
          'gratitude': ['Alhamdulillah', 'Thanks to Allah']
        },
        avoidancePatterns: ['pig', 'wine', 'beer', 'casino', 'lottery']
      },
      'jewish': {
        culturalContext: 'Jewish',
        sensitiveTopics: ['non-kosher food', 'sabbath violations', 'religious imagery'],
        appropriateAlternatives: {
          'non-kosher': ['kosher alternatives', 'vegetables', 'fruits'],
          'sabbath work': ['rest', 'family time', 'prayer']
        },
        respectfulLanguage: {
          'greetings': ['Shalom', 'Good Sabbath'],
          'celebrations': ['Mazel tov', 'Happy holidays']
        },
        avoidancePatterns: ['pork', 'shellfish', 'mixing meat and dairy']
      },
      'hindu': {
        culturalContext: 'Hindu',
        sensitiveTopics: ['beef', 'leather', 'disrespect to animals'],
        appropriateAlternatives: {
          'beef': ['chicken', 'vegetables', 'lentils'],
          'leather': ['cloth', 'synthetic materials']
        },
        respectfulLanguage: {
          'greetings': ['Namaste', 'Namaskar'],
          'respect': ['ji', 'sahib', 'mata ji']
        },
        avoidancePatterns: ['cow meat', 'beef', 'leather shoes']
      }
    };

    return filters[culture.toLowerCase()] || null;
  }

  private getDefaultFamilyStructure(): FamilyStructure {
    return {
      type: 'nuclear',
      parentTerms: {
        mother: ['mom', 'mama', 'mother', 'mommy'],
        father: ['dad', 'papa', 'father', 'daddy'],
        parent: ['parent', 'guardian']
      },
      siblingTerms: {
        brother: ['brother', 'bro'],
        sister: ['sister', 'sis'],
        sibling: ['sibling', 'brother or sister']
      },
      extendedFamilyTerms: {
        grandmother: ['grandma', 'grandmother', 'nana', 'granny'],
        grandfather: ['grandpa', 'grandfather', 'papa', 'gramps'],
        aunt: ['aunt', 'auntie'],
        uncle: ['uncle'],
        cousin: ['cousin']
      }
    };
  }
}
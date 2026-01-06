import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import {
  CulturalContext,
  StorytellingTradition,
  CulturalSensitivityFilter
} from '../types';

export interface CulturalSymbol {
  symbol: string;
  culturalOrigin: string[];
  meaning: string;
  appropriateContexts: string[];
  inappropriateContexts: string[];
  respectfulUsage: string[];
  modernAdaptations: string[];
}

export interface CulturalArchetype {
  name: string;
  culturalOrigin: string[];
  characteristics: string[];
  modernInterpretations: string[];
  respectfulPortrayal: string[];
  avoidStereotypes: string[];
  positiveTraits: string[];
  culturalSignificance: string;
}

export interface StoryElementAnalysis {
  element: string;
  culturalAppropriateness: {
    [culture: string]: {
      appropriate: boolean;
      concerns: string[];
      suggestions: string[];
      alternatives: string[];
    };
  };
  universalThemes: string[];
  culturalSpecificAdaptations: {
    [culture: string]: string;
  };
}

export interface CulturalCelebration {
  name: string;
  culturalOrigin: string[];
  date: string | 'variable';
  significance: string;
  traditionalElements: string[];
  modernCelebrations: string[];
  childFriendlyActivities: string[];
  storyThemes: string[];
  respectfulInclusion: string[];
}

export interface CrossCulturalInteraction {
  cultures: string[];
  interactionType: 'friendship' | 'learning' | 'celebration' | 'conflict_resolution' | 'collaboration';
  commonGround: string[];
  culturalDifferences: string[];
  bridgingElements: string[];
  learningOpportunities: string[];
  respectfulExchange: string[];
}

export class CulturalIntelligenceEngine {
  constructor(
    private supabase: SupabaseClient,
    private openai: OpenAI
  ) {}

  /**
   * Analyze story elements for cultural appropriateness
   */
  async analyzeStoryElements(
    elements: string[],
    targetCultures: string[],
    storyContext: any
  ): Promise<StoryElementAnalysis[]> {
    const analyses: StoryElementAnalysis[] = [];

    for (const element of elements) {
      const analysis = await this.analyzeIndividualElement(element, targetCultures, storyContext);
      analyses.push(analysis);
    }

    return analyses;
  }

  /**
   * Get cultural symbols for integration
   */
  async getCulturalSymbols(culturalBackground: string[]): Promise<CulturalSymbol[]> {
    const symbols: CulturalSymbol[] = [];

    for (const culture of culturalBackground) {
      const cultureSymbols = await this.getSymbolsForCulture(culture);
      symbols.push(...cultureSymbols);
    }

    return symbols;
  }

  /**
   * Get cultural archetypes for character development
   */
  async getCulturalArchetypes(culturalBackground: string[]): Promise<CulturalArchetype[]> {
    const archetypes: CulturalArchetype[] = [];

    for (const culture of culturalBackground) {
      const cultureArchetypes = await this.getArchetypesForCulture(culture);
      archetypes.push(...cultureArchetypes);
    }

    return archetypes;
  }

  /**
   * Integrate storytelling traditions into modern narratives
   */
  async integrateStorytellingTraditions(
    traditions: StorytellingTradition[],
    modernStoryContext: any,
    targetAudience: { age: number; culturalBackground: string[] }
  ): Promise<{
    integratedNarrative: any;
    traditionalElements: string[];
    modernAdaptations: string[];
    culturalRespect: string[];
  }> {
    const prompt = this.buildTraditionIntegrationPrompt(traditions, modernStoryContext, targetAudience);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a cultural storytelling expert specializing in respectfully integrating traditional storytelling elements into modern children's narratives. Your goal is to honor cultural traditions while creating engaging, age-appropriate stories that celebrate diversity and promote cultural understanding.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');
    return response;
  }

  /**
   * Get cultural celebrations and holidays
   */
  async getCulturalCelebrations(
    culturalBackground: string[],
    timeframe?: { start: Date; end: Date }
  ): Promise<CulturalCelebration[]> {
    const celebrations: CulturalCelebration[] = [];

    for (const culture of culturalBackground) {
      const cultureCelebrations = await this.getCelebrationsForCulture(culture, timeframe);
      celebrations.push(...cultureCelebrations);
    }

    return celebrations;
  }

  /**
   * Generate cross-cultural interaction scenarios
   */
  async generateCrossCulturalInteraction(
    cultures: string[],
    interactionType: CrossCulturalInteraction['interactionType'],
    storyContext: any,
    ageGroup: string
  ): Promise<CrossCulturalInteraction> {
    const prompt = this.buildCrossCulturalInteractionPrompt(cultures, interactionType, storyContext, ageGroup);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert in cross-cultural communication and children's storytelling. Create meaningful, respectful interactions between characters from different cultural backgrounds that promote understanding, empathy, and celebration of diversity.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');
    return response;
  }

  /**
   * Create culturally sensitive religious content filters
   */
  async createReligiousSensitivityEngine(
    religiousContexts: string[],
    customFilters?: any
  ): Promise<{
    filters: CulturalSensitivityFilter[];
    guidelines: string[];
    respectfulAlternatives: { [topic: string]: string[] };
  }> {
    const filters: CulturalSensitivityFilter[] = [];
    const guidelines: string[] = [];
    const respectfulAlternatives: { [topic: string]: string[] } = {};

    for (const context of religiousContexts) {
      const filter = await this.createReligiousFilter(context, customFilters);
      if (filter) {
        filters.push(filter);
        guidelines.push(...this.getReligiousGuidelines(context));
        Object.assign(respectfulAlternatives, filter.appropriateAlternatives);
      }
    }

    return { filters, guidelines, respectfulAlternatives };
  }

  /**
   * Analyze cultural context for story appropriateness
   */
  async analyzeCulturalContext(
    storyContent: any,
    targetCultures: string[],
    sensitivityLevel: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<{
    overallAppropriateness: boolean;
    culturalAnalysis: { [culture: string]: any };
    recommendations: string[];
    requiredAdaptations: string[];
  }> {
    const prompt = this.buildCulturalAnalysisPrompt(storyContent, targetCultures, sensitivityLevel);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a cultural sensitivity expert specializing in children's content. Analyze story content for cultural appropriateness, identify potential issues, and provide respectful recommendations for improvement.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');
    return response;
  }

  private async analyzeIndividualElement(
    element: string,
    targetCultures: string[],
    storyContext: any
  ): Promise<StoryElementAnalysis> {
    const prompt = `
Analyze the following story element for cultural appropriateness:

Element: "${element}"
Target Cultures: ${targetCultures.join(', ')}
Story Context: ${JSON.stringify(storyContext, null, 2)}

Please provide analysis for each target culture including:
1. Whether the element is culturally appropriate
2. Any concerns or sensitivities
3. Suggestions for respectful inclusion
4. Alternative approaches if needed
5. Universal themes that can bridge cultures
6. Culture-specific adaptations

Respond in JSON format with the structure:
{
  "element": "${element}",
  "culturalAppropriateness": {
    "culture_name": {
      "appropriate": boolean,
      "concerns": ["concern1", "concern2"],
      "suggestions": ["suggestion1", "suggestion2"],
      "alternatives": ["alternative1", "alternative2"]
    }
  },
  "universalThemes": ["theme1", "theme2"],
  "culturalSpecificAdaptations": {
    "culture_name": "adaptation_description"
  }
}
    `;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a cultural sensitivity expert for children\'s storytelling.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  }

  private async getSymbolsForCulture(culture: string): Promise<CulturalSymbol[]> {
    // This would typically query a comprehensive cultural symbols database
    const symbolDatabase: { [key: string]: CulturalSymbol[] } = {
      'chinese': [
        {
          symbol: 'Dragon',
          culturalOrigin: ['Chinese'],
          meaning: 'Power, strength, good fortune, wisdom',
          appropriateContexts: ['celebration', 'protection', 'wisdom stories'],
          inappropriateContexts: ['evil villain', 'destructive force'],
          respectfulUsage: ['Benevolent guardian', 'Wise mentor', 'Symbol of good luck'],
          modernAdaptations: ['Friendly dragon character', 'Dragon dance celebration', 'Dragon as protector']
        },
        {
          symbol: 'Lotus Flower',
          culturalOrigin: ['Chinese', 'Buddhist'],
          meaning: 'Purity, enlightenment, rebirth, beauty from adversity',
          appropriateContexts: ['growth stories', 'overcoming challenges', 'spiritual themes'],
          inappropriateContexts: ['decoration only', 'without cultural context'],
          respectfulUsage: ['Symbol of personal growth', 'Beauty emerging from difficulty'],
          modernAdaptations: ['Character who grows stronger through challenges', 'Garden of personal development']
        }
      ],
      'japanese': [
        {
          symbol: 'Cherry Blossom (Sakura)',
          culturalOrigin: ['Japanese'],
          meaning: 'Beauty of life, impermanence, renewal, spring',
          appropriateContexts: ['seasonal stories', 'life cycles', 'appreciation of beauty'],
          inappropriateContexts: ['permanent decoration', 'without seasonal context'],
          respectfulUsage: ['Seasonal celebration', 'Appreciating fleeting beauty', 'Spring renewal'],
          modernAdaptations: ['Spring festival story', 'Appreciating moments', 'Seasonal change narrative']
        }
      ],
      'indian': [
        {
          symbol: 'Elephant (Ganesha)',
          culturalOrigin: ['Indian', 'Hindu'],
          meaning: 'Wisdom, remover of obstacles, good fortune, new beginnings',
          appropriateContexts: ['wisdom stories', 'overcoming challenges', 'new adventures'],
          inappropriateContexts: ['without cultural respect', 'purely decorative'],
          respectfulUsage: ['Wise guide character', 'Helper in difficult times', 'Symbol of good beginnings'],
          modernAdaptations: ['Wise elephant friend', 'Problem-solving companion', 'Good luck charm']
        }
      ],
      'african': [
        {
          symbol: 'Baobab Tree',
          culturalOrigin: ['African'],
          meaning: 'Life, endurance, community gathering, ancestral wisdom',
          appropriateContexts: ['community stories', 'wisdom tales', 'connection to nature'],
          inappropriateContexts: ['without community context', 'individual focus only'],
          respectfulUsage: ['Community meeting place', 'Source of wisdom', 'Connection to ancestors'],
          modernAdaptations: ['Community center tree', 'Wise old tree character', 'Family gathering place']
        }
      ]
    };

    return symbolDatabase[culture.toLowerCase()] || [];
  }

  private async getArchetypesForCulture(culture: string): Promise<CulturalArchetype[]> {
    // This would typically query a comprehensive cultural archetypes database
    const archetypeDatabase: { [key: string]: CulturalArchetype[] } = {
      'chinese': [
        {
          name: 'Wise Elder',
          culturalOrigin: ['Chinese', 'Confucian'],
          characteristics: ['Knowledgeable', 'Patient', 'Respected', 'Guiding'],
          modernInterpretations: ['Grandparent figure', 'Teacher', 'Mentor', 'Community leader'],
          respectfulPortrayal: ['Shows wisdom through experience', 'Guides without controlling', 'Respected by community'],
          avoidStereotypes: ['Not frail or helpless', 'Not overly mystical', 'Not one-dimensional'],
          positiveTraits: ['Wisdom', 'Patience', 'Kindness', 'Cultural knowledge'],
          culturalSignificance: 'Represents the Confucian value of respecting elders and their wisdom'
        }
      ],
      'native_american': [
        {
          name: 'Animal Spirit Guide',
          culturalOrigin: ['Native American', 'Indigenous'],
          characteristics: ['Wise', 'Connected to nature', 'Protective', 'Teaching through example'],
          modernInterpretations: ['Animal friend', 'Nature teacher', 'Environmental guide'],
          respectfulPortrayal: ['Treats animals with reverence', 'Shows connection to nature', 'Teaches respect for all beings'],
          avoidStereotypes: ['Not mystical without context', 'Not overly spiritual', 'Not generic "Indian" imagery'],
          positiveTraits: ['Wisdom', 'Environmental awareness', 'Respect for life', 'Teaching ability'],
          culturalSignificance: 'Represents the indigenous understanding of connection between all living beings'
        }
      ],
      'african': [
        {
          name: 'Griot (Storyteller)',
          culturalOrigin: ['West African'],
          characteristics: ['Knowledgeable', 'Entertaining', 'Community-focused', 'Preserving history'],
          modernInterpretations: ['Community storyteller', 'History keeper', 'Cultural teacher'],
          respectfulPortrayal: ['Valued community member', 'Keeper of traditions', 'Engaging storyteller'],
          avoidStereotypes: ['Not primitive', 'Not uneducated', 'Not exotic'],
          positiveTraits: ['Storytelling ability', 'Cultural knowledge', 'Community connection', 'Entertainment skills'],
          culturalSignificance: 'Represents the African tradition of oral history and community storytelling'
        }
      ]
    };

    return archetypeDatabase[culture.toLowerCase()] || [];
  }

  private async getCelebrationsForCulture(
    culture: string,
    timeframe?: { start: Date; end: Date }
  ): Promise<CulturalCelebration[]> {
    // This would typically query a comprehensive celebrations database
    const celebrationDatabase: { [key: string]: CulturalCelebration[] } = {
      'chinese': [
        {
          name: 'Chinese New Year',
          culturalOrigin: ['Chinese'],
          date: 'variable', // Lunar calendar
          significance: 'New beginnings, family reunion, good fortune',
          traditionalElements: ['Red decorations', 'Dragon dance', 'Fireworks', 'Family feast'],
          modernCelebrations: ['Parades', 'Cultural performances', 'Special foods', 'Gift giving'],
          childFriendlyActivities: ['Making paper lanterns', 'Learning about zodiac animals', 'Dragon dance', 'Red envelope tradition'],
          storyThemes: ['New beginnings', 'Family togetherness', 'Good luck', 'Cultural pride'],
          respectfulInclusion: ['Explain cultural significance', 'Show family importance', 'Respect traditions']
        }
      ],
      'indian': [
        {
          name: 'Diwali',
          culturalOrigin: ['Indian', 'Hindu'],
          date: 'variable', // Lunar calendar
          significance: 'Festival of lights, victory of good over evil, new beginnings',
          traditionalElements: ['Oil lamps (diyas)', 'Rangoli patterns', 'Sweets', 'Fireworks'],
          modernCelebrations: ['Light displays', 'Community gatherings', 'Cultural programs', 'Gift exchange'],
          childFriendlyActivities: ['Making rangoli patterns', 'Lighting diyas', 'Sharing sweets', 'Learning about light symbolism'],
          storyThemes: ['Light overcoming darkness', 'Good vs evil', 'Family celebration', 'New beginnings'],
          respectfulInclusion: ['Explain religious significance', 'Show community aspect', 'Respect sacred elements']
        }
      ],
      'mexican': [
        {
          name: 'Día de los Muertos',
          culturalOrigin: ['Mexican'],
          date: 'November 1-2',
          significance: 'Honoring deceased loved ones, celebrating life and death',
          traditionalElements: ['Altars (ofrendas)', 'Marigold flowers', 'Sugar skulls', 'Photos of deceased'],
          modernCelebrations: ['Community festivals', 'Art exhibitions', 'Cultural education', 'Family gatherings'],
          childFriendlyActivities: ['Making paper flowers', 'Decorating sugar skulls', 'Sharing family stories', 'Creating memory books'],
          storyThemes: ['Remembering loved ones', 'Celebrating life', 'Family connections', 'Cultural traditions'],
          respectfulInclusion: ['Explain cultural context', 'Show respect for deceased', 'Avoid Halloween confusion']
        }
      ]
    };

    return celebrationDatabase[culture.toLowerCase()] || [];
  }

  private async createReligiousFilter(
    religiousContext: string,
    customFilters?: any
  ): Promise<CulturalSensitivityFilter | null> {
    // Enhanced religious sensitivity filters
    const religiousFilters: { [key: string]: CulturalSensitivityFilter } = {
      'islamic': {
        culturalContext: 'Islamic',
        sensitiveTopics: ['pork', 'alcohol', 'gambling', 'inappropriate clothing', 'religious imagery', 'prayer interruption'],
        appropriateAlternatives: {
          'pork': ['chicken', 'beef', 'lamb', 'vegetables'],
          'alcohol': ['juice', 'water', 'tea', 'milk'],
          'gambling': ['games', 'puzzles', 'sports', 'educational activities'],
          'inappropriate clothing': ['modest clothing', 'cultural dress', 'comfortable attire'],
          'religious imagery': ['respectful symbols', 'nature imagery', 'geometric patterns']
        },
        respectfulLanguage: {
          'greetings': ['As-salamu alaikum', 'Peace be upon you', 'Hello'],
          'gratitude': ['Alhamdulillah', 'Thanks to Allah', 'Thank you'],
          'farewell': ['Ma\'a salama', 'Go in peace', 'Goodbye']
        },
        avoidancePatterns: ['pig', 'wine', 'beer', 'casino', 'lottery', 'revealing clothing', 'disrespectful religious references']
      },
      'jewish': {
        culturalContext: 'Jewish',
        sensitiveTopics: ['non-kosher food', 'sabbath violations', 'religious imagery', 'Holocaust references', 'antisemitic stereotypes'],
        appropriateAlternatives: {
          'non-kosher': ['kosher alternatives', 'vegetables', 'fruits', 'dairy'],
          'sabbath work': ['rest', 'family time', 'prayer', 'study'],
          'religious imagery': ['respectful symbols', 'cultural elements', 'nature themes']
        },
        respectfulLanguage: {
          'greetings': ['Shalom', 'Good Sabbath', 'Hello'],
          'celebrations': ['Mazel tov', 'Happy holidays', 'Congratulations'],
          'gratitude': ['Baruch Hashem', 'Thank God', 'Thank you']
        },
        avoidancePatterns: ['pork', 'shellfish', 'mixing meat and dairy', 'work on sabbath', 'antisemitic imagery']
      },
      'christian': {
        culturalContext: 'Christian',
        sensitiveTopics: ['blasphemy', 'disrespectful religious references', 'inappropriate use of sacred symbols'],
        appropriateAlternatives: {
          'blasphemy': ['respectful language', 'positive expressions', 'kind words'],
          'sacred symbols': ['respectful imagery', 'nature symbols', 'positive symbols']
        },
        respectfulLanguage: {
          'greetings': ['God bless', 'Peace be with you', 'Hello'],
          'gratitude': ['Thank God', 'Blessed', 'Thank you'],
          'celebrations': ['Merry Christmas', 'Happy Easter', 'God bless']
        },
        avoidancePatterns: ['taking Lord\'s name in vain', 'disrespectful cross usage', 'mocking religious practices']
      },
      'hindu': {
        culturalContext: 'Hindu',
        sensitiveTopics: ['beef', 'leather', 'disrespect to animals', 'sacred symbols misuse', 'caste references'],
        appropriateAlternatives: {
          'beef': ['chicken', 'vegetables', 'lentils', 'dairy'],
          'leather': ['cloth', 'synthetic materials', 'plant-based materials'],
          'animal disrespect': ['animal respect', 'nature appreciation', 'kindness to animals']
        },
        respectfulLanguage: {
          'greetings': ['Namaste', 'Namaskar', 'Hello'],
          'respect': ['ji', 'sahib', 'mata ji'],
          'gratitude': ['Dhanyawad', 'Thank you', 'Blessed']
        },
        avoidancePatterns: ['cow meat', 'beef', 'leather shoes', 'animal cruelty', 'caste discrimination']
      },
      'buddhist': {
        culturalContext: 'Buddhist',
        sensitiveTopics: ['violence', 'animal harm', 'disrespect to Buddha imagery', 'attachment to material things'],
        appropriateAlternatives: {
          'violence': ['peaceful resolution', 'understanding', 'compassion'],
          'animal harm': ['animal protection', 'kindness', 'respect for life'],
          'materialism': ['contentment', 'gratitude', 'inner peace']
        },
        respectfulLanguage: {
          'greetings': ['Namaste', 'Peace', 'Hello'],
          'wisdom': ['Buddha taught', 'Ancient wisdom', 'Peaceful way'],
          'gratitude': ['Thank you', 'Grateful', 'Blessed']
        },
        avoidancePatterns: ['violence', 'animal cruelty', 'excessive materialism', 'disrespectful Buddha imagery']
      }
    };

    const baseFilter = religiousFilters[religiousContext.toLowerCase()];
    if (!baseFilter) return null;

    // Apply custom filters if provided
    if (customFilters) {
      return {
        ...baseFilter,
        sensitiveTopics: [...baseFilter.sensitiveTopics, ...(customFilters.additionalSensitiveTopics || [])],
        appropriateAlternatives: { ...baseFilter.appropriateAlternatives, ...customFilters.additionalAlternatives },
        avoidancePatterns: [...baseFilter.avoidancePatterns, ...(customFilters.additionalAvoidancePatterns || [])]
      };
    }

    return baseFilter;
  }

  private getReligiousGuidelines(religiousContext: string): string[] {
    const guidelines: { [key: string]: string[] } = {
      'islamic': [
        'Always show respect for Islamic practices and beliefs',
        'Avoid depicting prohibited items (pork, alcohol) in positive light',
        'Respect prayer times and religious observances',
        'Use appropriate greetings and expressions',
        'Show family and community values',
        'Respect modesty in clothing and behavior'
      ],
      'jewish': [
        'Respect Jewish traditions and customs',
        'Be mindful of kosher dietary laws',
        'Honor the Sabbath and religious holidays',
        'Avoid antisemitic stereotypes or imagery',
        'Show respect for religious symbols and practices',
        'Emphasize family and community values'
      ],
      'christian': [
        'Show respect for Christian beliefs and practices',
        'Use religious language appropriately and respectfully',
        'Honor religious holidays and traditions',
        'Avoid blasphemous or disrespectful content',
        'Emphasize values of love, kindness, and forgiveness',
        'Respect sacred symbols and imagery'
      ],
      'hindu': [
        'Show respect for Hindu beliefs and practices',
        'Be mindful of dietary restrictions (especially beef)',
        'Respect sacred animals and nature',
        'Avoid caste-based discrimination or references',
        'Honor religious festivals and traditions',
        'Show respect for elders and family values'
      ],
      'buddhist': [
        'Emphasize compassion and non-violence',
        'Respect all living beings',
        'Show mindfulness and peaceful resolution',
        'Avoid excessive materialism',
        'Honor Buddhist teachings and imagery respectfully',
        'Emphasize inner peace and wisdom'
      ]
    };

    return guidelines[religiousContext.toLowerCase()] || [];
  }

  private buildTraditionIntegrationPrompt(
    traditions: StorytellingTradition[],
    modernStoryContext: any,
    targetAudience: { age: number; culturalBackground: string[] }
  ): string {
    return `
Integrate the following storytelling traditions into a modern children's narrative:

Traditions: ${JSON.stringify(traditions, null, 2)}
Modern Story Context: ${JSON.stringify(modernStoryContext, null, 2)}
Target Audience: Age ${targetAudience.age}, Cultural Background: ${targetAudience.culturalBackground.join(', ')}

Please create an integrated narrative that:
1. Respectfully incorporates traditional storytelling elements
2. Adapts them for modern children while preserving cultural significance
3. Creates engaging, age-appropriate content
4. Promotes cultural understanding and respect
5. Maintains the essence of the original traditions

Respond with JSON format:
{
  "integratedNarrative": {
    "story": "narrative content",
    "characters": ["character descriptions"],
    "themes": ["main themes"],
    "structure": "narrative structure"
  },
  "traditionalElements": ["traditional elements incorporated"],
  "modernAdaptations": ["how traditions were adapted for modern audience"],
  "culturalRespect": ["ways cultural respect was maintained"]
}
    `;
  }

  private buildCrossCulturalInteractionPrompt(
    cultures: string[],
    interactionType: CrossCulturalInteraction['interactionType'],
    storyContext: any,
    ageGroup: string
  ): string {
    return `
Create a cross-cultural interaction scenario between characters from different cultures:

Cultures: ${cultures.join(', ')}
Interaction Type: ${interactionType}
Story Context: ${JSON.stringify(storyContext, null, 2)}
Age Group: ${ageGroup}

Please create a scenario that:
1. Shows respectful interaction between cultures
2. Highlights both similarities and differences
3. Promotes understanding and empathy
4. Provides learning opportunities
5. Avoids stereotypes and promotes positive representation

Respond with JSON format:
{
  "cultures": ${JSON.stringify(cultures)},
  "interactionType": "${interactionType}",
  "commonGround": ["shared values or interests"],
  "culturalDifferences": ["respectful differences to explore"],
  "bridgingElements": ["ways characters connect across cultures"],
  "learningOpportunities": ["what children can learn"],
  "respectfulExchange": ["examples of respectful cultural exchange"]
}
    `;
  }

  private buildCulturalAnalysisPrompt(
    storyContent: any,
    targetCultures: string[],
    sensitivityLevel: 'high' | 'medium' | 'low'
  ): string {
    return `
Analyze the following story content for cultural appropriateness:

Story Content: ${JSON.stringify(storyContent, null, 2)}
Target Cultures: ${targetCultures.join(', ')}
Sensitivity Level: ${sensitivityLevel}

Please analyze for:
1. Overall cultural appropriateness
2. Specific concerns for each target culture
3. Recommendations for improvement
4. Required adaptations for cultural sensitivity
5. Positive cultural elements to highlight

Respond with JSON format:
{
  "overallAppropriateness": boolean,
  "culturalAnalysis": {
    "culture_name": {
      "appropriate": boolean,
      "concerns": ["concern1", "concern2"],
      "positiveElements": ["positive1", "positive2"],
      "suggestions": ["suggestion1", "suggestion2"]
    }
  },
  "recommendations": ["overall recommendations"],
  "requiredAdaptations": ["necessary changes for cultural sensitivity"]
}
    `;
  }
}
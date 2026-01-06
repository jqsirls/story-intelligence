import OpenAI from 'openai';
import { SupabaseClient } from '@supabase/supabase-js';
import { HolidayStoryMode, CulturalCelebrationTemplate } from './GlobalStorytellingEngine';

export interface HolidayStoryRequest {
  userId: string;
  holiday: string;
  culturalContext: string[];
  userAge: number;
  storyPreferences: {
    length: 'short' | 'medium' | 'long';
    interactivity: 'low' | 'medium' | 'high';
    educationalFocus: 'cultural' | 'historical' | 'values' | 'traditions';
  };
}

export interface HolidayStoryResponse {
  story: {
    title: string;
    content: string;
    culturalElements: string[];
    educationalNotes: string[];
    interactiveElements: string[];
  };
  activities: Array<{
    name: string;
    description: string;
    materials: string[];
    culturalSignificance: string;
  }>;
  learningObjectives: string[];
  familyDiscussionPoints: string[];
}

export interface SeasonalStoryCalendar {
  month: string;
  holidays: Array<{
    name: string;
    cultures: string[];
    storyThemes: string[];
    ageAppropriate: boolean;
  }>;
}

export class HolidayStoryModeManager {
  constructor(
    private supabase: SupabaseClient,
    private openai: OpenAI
  ) {}

  /**
   * Create holiday-specific story
   */
  async createHolidayStory(request: HolidayStoryRequest): Promise<HolidayStoryResponse> {
    try {
      const holidayMode = await this.getHolidayMode(request.holiday, request.culturalContext, request.userAge);
      const storyPrompt = this.buildHolidayStoryPrompt(request, holidayMode);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in creating culturally authentic holiday stories for children. Create engaging, educational, and respectful stories that celebrate cultural diversity while being accessible to all children.'
          },
          {
            role: 'user',
            content: storyPrompt
          }
        ],
        temperature: 0.4
      });

      return JSON.parse(completion.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Holiday story creation error:', error);
      throw new Error('Failed to create holiday story');
    }
  }

  /**
   * Get seasonal story calendar
   */
  async getSeasonalStoryCalendar(culturalContexts: string[]): Promise<SeasonalStoryCalendar[]> {
    const calendar: SeasonalStoryCalendar[] = [];

    const monthlyHolidays = await this.getMonthlyHolidays(culturalContexts);
    
    for (const [month, holidays] of Object.entries(monthlyHolidays)) {
      calendar.push({
        month,
        holidays: holidays.map(holiday => ({
          name: holiday.name,
          cultures: holiday.cultures,
          storyThemes: holiday.storyThemes,
          ageAppropriate: holiday.ageAppropriate
        }))
      });
    }

    return calendar;
  }

  /**
   * Get holiday story suggestions based on current date and cultural context
   */
  async getHolidayStorySuggestions(
    culturalContext: string[],
    currentDate: Date,
    userAge: number
  ): Promise<Array<{
    holiday: string;
    urgency: 'immediate' | 'upcoming' | 'seasonal';
    culturalRelevance: number;
    storyIdeas: string[];
    educationalValue: string[];
  }>> {
    try {
      const suggestionPrompt = this.buildHolidaySuggestionPrompt(culturalContext, currentDate, userAge);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in global holiday traditions and cultural celebrations. Provide timely and culturally relevant holiday story suggestions for children.'
          },
          {
            role: 'user',
            content: suggestionPrompt
          }
        ],
        temperature: 0.3
      });

      return JSON.parse(completion.choices[0].message.content || '[]');
    } catch (error) {
      console.error('Holiday suggestion error:', error);
      return [];
    }
  }

  /**
   * Create multicultural holiday story combining multiple traditions
   */
  async createMulticulturalHolidayStory(
    holidays: string[],
    culturalContexts: string[],
    userAge: number,
    theme: string
  ): Promise<HolidayStoryResponse> {
    try {
      const multiculturalPrompt = this.buildMulticulturalHolidayPrompt(holidays, culturalContexts, userAge, theme);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in creating inclusive multicultural stories that celebrate multiple holiday traditions simultaneously while promoting understanding and unity among diverse cultures.'
          },
          {
            role: 'user',
            content: multiculturalPrompt
          }
        ],
        temperature: 0.4
      });

      return JSON.parse(completion.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Multicultural holiday story creation error:', error);
      throw new Error('Failed to create multicultural holiday story');
    }
  }

  /**
   * Generate holiday-themed character variations
   */
  async generateHolidayCharacterVariations(
    baseCharacter: any,
    holiday: string,
    culturalContext: string[]
  ): Promise<Array<{
    variation: string;
    culturalElements: string[];
    holidaySpecificTraits: string[];
    respectfulAdaptations: string[];
  }>> {
    try {
      const characterPrompt = this.buildHolidayCharacterPrompt(baseCharacter, holiday, culturalContext);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in adapting characters for holiday-themed stories while maintaining cultural authenticity and respect.'
          },
          {
            role: 'user',
            content: characterPrompt
          }
        ],
        temperature: 0.4
      });

      return JSON.parse(completion.choices[0].message.content || '[]');
    } catch (error) {
      console.error('Holiday character variation error:', error);
      return [];
    }
  }

  /**
   * Create holiday story activities and crafts
   */
  async createHolidayActivities(
    holiday: string,
    culturalContext: string[],
    userAge: number,
    storyTheme: string
  ): Promise<Array<{
    activity: string;
    type: 'craft' | 'game' | 'cooking' | 'storytelling' | 'music' | 'dance';
    materials: string[];
    instructions: string[];
    culturalSignificance: string;
    safetyNotes: string[];
    adaptations: { [ageGroup: string]: string[] };
  }>> {
    try {
      const activityPrompt = this.buildHolidayActivityPrompt(holiday, culturalContext, userAge, storyTheme);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in creating culturally authentic and age-appropriate holiday activities that complement storytelling experiences.'
          },
          {
            role: 'user',
            content: activityPrompt
          }
        ],
        temperature: 0.4
      });

      return JSON.parse(completion.choices[0].message.content || '[]');
    } catch (error) {
      console.error('Holiday activity creation error:', error);
      return [];
    }
  }

  private async getHolidayMode(holiday: string, culturalContext: string[], userAge: number): Promise<HolidayStoryMode> {
    // This would typically query the database for holiday modes
    // For now, return a basic structure
    return {
      holiday,
      culturalContext,
      storyThemes: ['celebration', 'family', 'tradition', 'joy'],
      characterTypes: ['family members', 'community members', 'traditional figures'],
      settingElements: ['festive decorations', 'traditional foods', 'gathering spaces'],
      traditionalElements: ['customs', 'rituals', 'symbols', 'stories'],
      modernAdaptations: ['contemporary celebrations', 'virtual gatherings', 'fusion traditions'],
      ageAppropriateActivities: ['crafts', 'games', 'songs', 'stories']
    };
  }

  private async getMonthlyHolidays(culturalContexts: string[]): Promise<{ [month: string]: any[] }> {
    // This would typically query a comprehensive holiday database
    return {
      'January': [
        { name: 'New Year', cultures: ['Global'], storyThemes: ['new beginnings', 'resolutions'], ageAppropriate: true },
        { name: 'Lunar New Year', cultures: ['Chinese', 'Vietnamese', 'Korean'], storyThemes: ['family reunion', 'prosperity'], ageAppropriate: true }
      ],
      'February': [
        { name: 'Valentine\'s Day', cultures: ['Western'], storyThemes: ['love', 'friendship'], ageAppropriate: true },
        { name: 'Black History Month', cultures: ['African American'], storyThemes: ['heritage', 'achievement'], ageAppropriate: true }
      ],
      'March': [
        { name: 'Holi', cultures: ['Hindu', 'Indian'], storyThemes: ['colors', 'spring', 'joy'], ageAppropriate: true },
        { name: 'St. Patrick\'s Day', cultures: ['Irish'], storyThemes: ['luck', 'heritage'], ageAppropriate: true }
      ],
      'April': [
        { name: 'Easter', cultures: ['Christian'], storyThemes: ['renewal', 'spring', 'hope'], ageAppropriate: true },
        { name: 'Passover', cultures: ['Jewish'], storyThemes: ['freedom', 'family', 'tradition'], ageAppropriate: true }
      ],
      'May': [
        { name: 'Mother\'s Day', cultures: ['Global'], storyThemes: ['family', 'appreciation'], ageAppropriate: true },
        { name: 'Cinco de Mayo', cultures: ['Mexican'], storyThemes: ['heritage', 'celebration'], ageAppropriate: true }
      ],
      'June': [
        { name: 'Father\'s Day', cultures: ['Global'], storyThemes: ['family', 'appreciation'], ageAppropriate: true },
        { name: 'Juneteenth', cultures: ['African American'], storyThemes: ['freedom', 'history'], ageAppropriate: true }
      ],
      'July': [
        { name: 'Independence Day', cultures: ['American'], storyThemes: ['freedom', 'patriotism'], ageAppropriate: true }
      ],
      'August': [
        { name: 'Raksha Bandhan', cultures: ['Hindu', 'Indian'], storyThemes: ['sibling love', 'protection'], ageAppropriate: true }
      ],
      'September': [
        { name: 'Rosh Hashanah', cultures: ['Jewish'], storyThemes: ['new year', 'reflection'], ageAppropriate: true },
        { name: 'Mid-Autumn Festival', cultures: ['Chinese'], storyThemes: ['family reunion', 'harvest'], ageAppropriate: true }
      ],
      'October': [
        { name: 'Halloween', cultures: ['Western'], storyThemes: ['fun', 'imagination'], ageAppropriate: true },
        { name: 'Diwali', cultures: ['Hindu', 'Indian'], storyThemes: ['light over darkness', 'prosperity'], ageAppropriate: true },
        { name: 'Day of the Dead', cultures: ['Mexican'], storyThemes: ['family memory', 'celebration of life'], ageAppropriate: true }
      ],
      'November': [
        { name: 'Thanksgiving', cultures: ['American'], storyThemes: ['gratitude', 'family'], ageAppropriate: true }
      ],
      'December': [
        { name: 'Christmas', cultures: ['Christian'], storyThemes: ['giving', 'family', 'joy'], ageAppropriate: true },
        { name: 'Hanukkah', cultures: ['Jewish'], storyThemes: ['miracles', 'perseverance'], ageAppropriate: true },
        { name: 'Kwanzaa', cultures: ['African American'], storyThemes: ['heritage', 'community'], ageAppropriate: true }
      ]
    };
  }

  private buildHolidayStoryPrompt(request: HolidayStoryRequest, holidayMode: HolidayStoryMode): string {
    return `
Create a holiday story based on these requirements:

Holiday: ${request.holiday}
Cultural Context: ${request.culturalContext.join(', ')}
User Age: ${request.userAge}
Story Preferences: ${JSON.stringify(request.storyPreferences, null, 2)}
Holiday Mode: ${JSON.stringify(holidayMode, null, 2)}

Requirements:
1. Create an engaging story appropriate for age ${request.userAge}
2. Include authentic cultural elements respectfully
3. Incorporate educational content about the holiday
4. Add interactive elements based on preference level
5. Ensure the story is inclusive and welcoming to all children
6. Include family discussion points and activities

Please respond with a JSON object containing:
{
  "story": {
    "title": "engaging holiday story title",
    "content": "full story content with cultural elements",
    "culturalElements": ["cultural elements included in the story"],
    "educationalNotes": ["educational information about the holiday"],
    "interactiveElements": ["interactive parts of the story"]
  },
  "activities": [
    {
      "name": "activity name",
      "description": "activity description",
      "materials": ["materials needed"],
      "culturalSignificance": "why this activity is culturally significant"
    }
  ],
  "learningObjectives": ["what children will learn from this story"],
  "familyDiscussionPoints": ["questions and topics for family discussion"]
}
    `;
  }

  private buildHolidaySuggestionPrompt(culturalContext: string[], currentDate: Date, userAge: number): string {
    return `
Provide holiday story suggestions based on:

Cultural Context: ${culturalContext.join(', ')}
Current Date: ${currentDate.toISOString().split('T')[0]}
User Age: ${userAge}

Requirements:
1. Consider holidays coming up in the next 2 months
2. Include culturally relevant holidays for the user's context
3. Prioritize by urgency (immediate, upcoming, seasonal)
4. Rate cultural relevance (0-1 scale)
5. Provide specific story ideas and educational value
6. Ensure age-appropriate suggestions

Please respond with a JSON array of holiday suggestions:
[
  {
    "holiday": "holiday name",
    "urgency": "immediate|upcoming|seasonal",
    "culturalRelevance": 0.95,
    "storyIdeas": ["specific story ideas for this holiday"],
    "educationalValue": ["what children will learn"]
  }
]
    `;
  }

  private buildMulticulturalHolidayPrompt(holidays: string[], culturalContexts: string[], userAge: number, theme: string): string {
    return `
Create a multicultural holiday story that celebrates multiple traditions:

Holidays: ${holidays.join(', ')}
Cultural Contexts: ${culturalContexts.join(', ')}
User Age: ${userAge}
Theme: ${theme}

Requirements:
1. Respectfully combine elements from multiple holiday traditions
2. Show how different cultures can celebrate together
3. Highlight common values across traditions
4. Create characters from different cultural backgrounds
5. Include educational content about each tradition
6. Promote understanding and unity

Please respond with the same JSON structure as a regular holiday story, but incorporating multiple cultural traditions.
    `;
  }

  private buildHolidayCharacterPrompt(baseCharacter: any, holiday: string, culturalContext: string[]): string {
    return `
Create holiday-themed variations of this character:

Base Character: ${JSON.stringify(baseCharacter, null, 2)}
Holiday: ${holiday}
Cultural Context: ${culturalContext.join(', ')}

Requirements:
1. Maintain the character's core personality and traits
2. Add holiday-specific elements respectfully
3. Include culturally appropriate adaptations
4. Ensure the variations feel authentic and natural
5. Avoid stereotypes while celebrating cultural elements

Please respond with a JSON array of character variations:
[
  {
    "variation": "description of the character variation",
    "culturalElements": ["cultural elements added"],
    "holidaySpecificTraits": ["holiday-specific traits or behaviors"],
    "respectfulAdaptations": ["how the character respectfully participates in the holiday"]
  }
]
    `;
  }

  private buildHolidayActivityPrompt(holiday: string, culturalContext: string[], userAge: number, storyTheme: string): string {
    return `
Create holiday activities that complement the story:

Holiday: ${holiday}
Cultural Context: ${culturalContext.join(', ')}
User Age: ${userAge}
Story Theme: ${storyTheme}

Requirements:
1. Create age-appropriate activities
2. Include culturally authentic elements
3. Provide clear, safe instructions
4. Explain cultural significance
5. Offer adaptations for different ages
6. Include necessary safety notes

Please respond with a JSON array of activities:
[
  {
    "activity": "activity name",
    "type": "craft|game|cooking|storytelling|music|dance",
    "materials": ["materials needed"],
    "instructions": ["step-by-step instructions"],
    "culturalSignificance": "why this activity is culturally significant",
    "safetyNotes": ["important safety considerations"],
    "adaptations": {
      "3-5": ["adaptations for younger children"],
      "6-8": ["adaptations for middle children"],
      "9-12": ["adaptations for older children"]
    }
  }
]
    `;
  }
}
import OpenAI from 'openai';
import { SupabaseClient } from '@supabase/supabase-js';
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
export declare class HolidayStoryModeManager {
    private supabase;
    private openai;
    constructor(supabase: SupabaseClient, openai: OpenAI);
    /**
     * Create holiday-specific story
     */
    createHolidayStory(request: HolidayStoryRequest): Promise<HolidayStoryResponse>;
    /**
     * Get seasonal story calendar
     */
    getSeasonalStoryCalendar(culturalContexts: string[]): Promise<SeasonalStoryCalendar[]>;
    /**
     * Get holiday story suggestions based on current date and cultural context
     */
    getHolidayStorySuggestions(culturalContext: string[], currentDate: Date, userAge: number): Promise<Array<{
        holiday: string;
        urgency: 'immediate' | 'upcoming' | 'seasonal';
        culturalRelevance: number;
        storyIdeas: string[];
        educationalValue: string[];
    }>>;
    /**
     * Create multicultural holiday story combining multiple traditions
     */
    createMulticulturalHolidayStory(holidays: string[], culturalContexts: string[], userAge: number, theme: string): Promise<HolidayStoryResponse>;
    /**
     * Generate holiday-themed character variations
     */
    generateHolidayCharacterVariations(baseCharacter: any, holiday: string, culturalContext: string[]): Promise<Array<{
        variation: string;
        culturalElements: string[];
        holidaySpecificTraits: string[];
        respectfulAdaptations: string[];
    }>>;
    /**
     * Create holiday story activities and crafts
     */
    createHolidayActivities(holiday: string, culturalContext: string[], userAge: number, storyTheme: string): Promise<Array<{
        activity: string;
        type: 'craft' | 'game' | 'cooking' | 'storytelling' | 'music' | 'dance';
        materials: string[];
        instructions: string[];
        culturalSignificance: string;
        safetyNotes: string[];
        adaptations: {
            [ageGroup: string]: string[];
        };
    }>>;
    private getHolidayMode;
    private getMonthlyHolidays;
    private buildHolidayStoryPrompt;
    private buildHolidaySuggestionPrompt;
    private buildMulticulturalHolidayPrompt;
    private buildHolidayCharacterPrompt;
    private buildHolidayActivityPrompt;
}
//# sourceMappingURL=HolidayStoryModeManager.d.ts.map
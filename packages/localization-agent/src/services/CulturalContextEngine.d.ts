import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { CulturalContext, LanguageProfile, StorytellingTradition, CulturalSensitivityFilter } from '../types';
export declare class CulturalContextEngine {
    private supabase;
    private openai;
    constructor(supabase: SupabaseClient, openai: OpenAI);
    getCulturalContext(userId: string): Promise<CulturalContext | null>;
    updateCulturalContext(userId: string, context: Partial<CulturalContext>): Promise<CulturalContext>;
    getSupportedLanguages(): Promise<LanguageProfile[]>;
    getStorytellingTraditions(culturalBackground: string[]): Promise<StorytellingTradition[]>;
    getCulturalSensitivityFilters(culturalContext: string[]): Promise<CulturalSensitivityFilter[]>;
    private getStorytellingTraditionForCulture;
    private getCulturalSensitivityFilterForCulture;
    private getDefaultFamilyStructure;
}
//# sourceMappingURL=CulturalContextEngine.d.ts.map
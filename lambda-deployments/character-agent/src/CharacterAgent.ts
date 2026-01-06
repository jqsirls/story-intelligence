/**
 * CharacterAgent - Dedicated agent for inclusive character creation
 * Mission: ALL kids see themselves represented
 */

import OpenAI from 'openai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConversationalCharacterCreator, CharacterTraits } from './services/ConversationalCharacterCreator';
import { CharacterDNAGenerator, CharacterDNA } from './services/CharacterDNAGenerator';
import { HeadshotGenerator } from './services/HeadshotGenerator';

export interface CharacterAgentConfig {
  openaiApiKey: string;
  supabaseUrl: string;
  supabaseKey: string;
}

export class CharacterAgent {
  private openai: OpenAI;
  private supabase: SupabaseClient;
  private conversationalCreator: ConversationalCharacterCreator;
  private dnaGenerator: CharacterDNAGenerator;
  private headshotGenerator: HeadshotGenerator;
  private sessions: Map<string, any> = new Map();

  constructor(config: CharacterAgentConfig) {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.conversationalCreator = new ConversationalCharacterCreator(config.openaiApiKey);
    this.dnaGenerator = new CharacterDNAGenerator();
    this.headshotGenerator = new HeadshotGenerator(config.openaiApiKey);
  }

  /**
   * Start conversational character creation
   */
  async startConversation(userId: string, userProfile?: any): Promise<{
    sessionId: string;
    question: string;
  }> {
    const { question, sessionId } = await this.conversationalCreator.startConversation(userId, userProfile);
    
    // Initialize session
    this.sessions.set(sessionId, {
      userId,
      gatheredTraits: {},
      currentPhase: 'name',
      turns: []
    });
    
    return { sessionId, question };
  }

  /**
   * Process conversational turn
   */
  async processConversationTurn(
    sessionId: string,
    userResponse: string
  ): Promise<{
    question?: string;
    complete: boolean;
    character?: CharacterWithDNA;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Process response
    const result = await this.conversationalCreator.processResponse(
      sessionId,
      userResponse,
      session.currentPhase,
      session.gatheredTraits,
      session.userProfile
    );

    // Update session
    session.gatheredTraits = { ...session.gatheredTraits, ...result.extractedData };
    session.currentPhase = result.nextPhase;
    session.turns.push({ question: result.question, response: userResponse });

    if (result.complete) {
      // Auto-fill missing details
      const completeTraits = await this.conversationalCreator.autoFillMissingDetails(session.gatheredTraits);
      
      // Generate DNA and headshot
      const character = await this.createCharacterWithDNA(completeTraits, session.userId);
      
      // Clean up session
      this.sessions.delete(sessionId);
      
      return {
        complete: true,
        character
      };
    }

    return {
      question: result.question,
      complete: false
    };
  }

  /**
   * Create character directly (API mode)
   */
  async createCharacterDirect(traits: CharacterTraits, userId: string): Promise<CharacterWithDNA> {
    // Auto-fill any missing details
    const completeTraits = await this.conversationalCreator.autoFillMissingDetails(traits);
    
    return this.createCharacterWithDNA(completeTraits, userId);
  }

  /**
   * Create character with DNA and headshot
   */
  private async createCharacterWithDNA(
    traits: CharacterTraits,
    userId: string
  ): Promise<CharacterWithDNA> {
    // Generate DNA
    const dna = this.dnaGenerator.generate(traits);
    
    // Generate headshot
    const { headshotUrl, prompt } = await this.headshotGenerator.generateHeadshot(traits, dna);
    
    // Save to database
    const character = await this.saveCharacter(traits, dna, headshotUrl, userId);
    
    return {
      ...character,
      dna,
      headshotUrl,
      headshotPrompt: prompt
    };
  }

  /**
   * Get character DNA (for story image consistency)
   */
  async getCharacterDNA(characterId: string): Promise<CharacterDNA> {
    const { data, error } = await (this.supabase as any)
      .from('characters')
      .select('dna')
      .eq('id', characterId)
      .single();

    if (error || !data) {
      throw new Error('Character not found');
    }

    return data.dna;
  }

  /**
   * Save character to database
   */
  private async saveCharacter(
    traits: CharacterTraits,
    dna: CharacterDNA,
    headshotUrl: string,
    userId: string
  ): Promise<any> {
    const character = {
      id: dna.characterId,
      user_id: userId,
      name: traits.name,
      last_name: traits.lastName,
      age: traits.age,
      species: traits.species,
      gender: traits.gender,
      ethnicity: traits.ethnicity,
      inclusivity_traits: traits.inclusivityTraits,
      dna: dna,
      headshot_url: headshotUrl,
      appearance_summary: dna.appearanceSummary,
      personality_quirks: dna.personalityQuirks,
      created_at: new Date().toISOString()
    };

    const { data, error } = await (this.supabase as any)
      .from('characters')
      .insert(character)
      .select()
      .single();

    if (error) {
      console.error('Error saving character:', error);
      throw error;
    }

    return data;
  }

  /**
   * List user's characters
   */
  async listCharacters(userId: string): Promise<any[]> {
    const { data, error } = await (this.supabase as any)
      .from('characters')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error listing characters:', error);
      throw error;
    }

    return data || [];
  }
}

export interface CharacterWithDNA {
  id: string;
  name: string;
  headshotUrl: string;
  dna: CharacterDNA;
  traits: CharacterTraits;
}


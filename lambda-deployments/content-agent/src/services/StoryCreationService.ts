import OpenAI from 'openai';
import { Logger } from 'winston';
import { 
  Story, StoryContent, StoryBeat, StoryChoice, StoryDraft, 
  HeroJourneyBeat, StoryType, StoryMood, StoryAudience, StoryComplexity
} from '@alexa-multi-agent/shared-types';

export interface StoryCreationRequest {
  characterId: string;
  storyType: StoryType;
  userAge?: number;
  preferences?: {
    mood?: StoryMood;
    themes?: string[];
    avoidTopics?: string[];
  };
}

export interface StoryBeatRequest {
  storyId: string;
  userChoice?: string;
  voiceInput?: string;
}

export interface StoryEditRequest {
  storyId: string;
  voiceCommand: string;
  targetBeat?: number;
}

export interface StoryUpdate {
  updatedBeats: StoryBeat[];
  affectedCharacters: string[];
  narrativeChanges: string[];
}

export class StoryCreationService {
  constructor(
    private openai: OpenAI,
    private logger: Logger
  ) {}

  /**
   * Create a new story draft with hero's journey structure
   */
  async createStoryDraft(request: StoryCreationRequest): Promise<StoryDraft> {
    this.logger.info('Creating story draft', { 
      characterId: request.characterId,
      storyType: request.storyType 
    });

    // Generate story outline using hero's journey structure
    const outline = await this.generateHeroJourneyOutline(
      request.storyType,
      request.characterId,
      request.userAge,
      request.preferences
    );

    // Create initial story choices for the first beat
    const initialChoices = await this.generateInitialChoices(
      request.storyType,
      outline,
      request.userAge
    );

    const draft: StoryDraft = {
      id: this.generateId(),
      characterId: request.characterId,
      storyType: request.storyType,
      outline,
      currentBeat: 0,
      choices: initialChoices
    };

    this.logger.info('Story draft created', { draftId: draft.id });
    return draft;
  }

  /**
   * Continue story with user choice in choose-your-adventure style
   */
  async continueStoryBeat(request: StoryBeatRequest): Promise<{
    beat: StoryBeat;
    choices: StoryChoice[];
    isComplete: boolean;
  }> {
    this.logger.info('Continuing story beat', { storyId: request.storyId });

    // Generate next story beat based on user choice
    const beat = await this.generateNextBeat(
      request.storyId,
      request.userChoice,
      request.voiceInput
    );

    const isComplete = beat.sequence >= 12 || beat.content.includes('[STORY_END]');

    // Generate choices for the next beat (unless story is complete)
    const choices = isComplete ? [] : await this.generateChoicesForBeat(request.storyId, beat);

    return { beat, choices, isComplete };
  }

  /**
   * Edit story via voice commands
   */
  async editStoryViaVoice(request: StoryEditRequest): Promise<StoryUpdate> {
    this.logger.info('Editing story via voice', { 
      storyId: request.storyId,
      command: request.voiceCommand 
    });

    // Parse voice command to understand the edit intent
    const editIntent = await this.parseVoiceEditCommand(request.voiceCommand);

    // Apply the edit based on intent
    const update = await this.applyStoryEdit(
      request.storyId,
      editIntent,
      request.targetBeat
    );

    this.logger.info('Story edit applied', { 
      storyId: request.storyId,
      affectedBeats: update.updatedBeats.length 
    });

    return update;
  }

  /**
   * Adapt story for character changes mid-story
   */
  async adaptStoryForCharacterChange(
    storyId: string,
    characterChanges: any
  ): Promise<StoryUpdate> {
    this.logger.info('Adapting story for character changes', { 
      storyId,
      changes: Object.keys(characterChanges) 
    });

    // Analyze how character changes affect the story
    const impactAnalysis = await this.analyzeCharacterChangeImpact(
      storyId,
      characterChanges
    );

    // Generate updated story beats
    const updatedBeats = await this.regenerateAffectedBeats(
      storyId,
      impactAnalysis
    );

    const update: StoryUpdate = {
      updatedBeats,
      affectedCharacters: [characterChanges.characterId],
      narrativeChanges: impactAnalysis.narrativeChanges
    };

    this.logger.info('Story adapted for character changes', {
      storyId,
      updatedBeats: updatedBeats.length
    });

    return update;
  }

  /**
   * Finalize story and prepare for asset generation
   */
  async finalizeStory(storyId: string, confirmed: boolean): Promise<Story> {
    this.logger.info('Finalizing story', { storyId, confirmed });

    if (!confirmed) {
      throw new Error('Story finalization requires user confirmation');
    }

    // Get story draft and convert to final story
    const draft = await this.getStoryDraft(storyId);
    const finalStory = await this.convertDraftToFinalStory(draft);

    // Generate final story content with all beats
    const content = await this.generateFinalStoryContent(finalStory);

    const story: Story = {
      id: storyId,
      libraryId: finalStory.libraryId,
      title: finalStory.title,
      content,
      status: 'final',
      ageRating: finalStory.ageRating,
      createdAt: new Date().toISOString(),
      finalizedAt: new Date().toISOString()
    };

    this.logger.info('Story finalized', { storyId });
    return story;
  }

  /**
   * Generate hero's journey outline for Pulitzer-quality storytelling
   */
  private async generateHeroJourneyOutline(
    storyType: StoryType,
    characterId: string,
    userAge?: number,
    preferences?: any
  ): Promise<string> {
    const prompt = `Create a hero's journey outline for a ${storyType} story suitable for age ${userAge || 5}.

The story should follow these 12 beats:
1. Ordinary World - Character's normal life
2. Call to Adventure - The inciting incident
3. Refusal of the Call - Initial hesitation
4. Meeting the Mentor - Guidance appears
5. Crossing the Threshold - Entering the adventure
6. Tests, Allies, and Enemies - Challenges and relationships
7. Approach to the Inmost Cave - Preparing for the main challenge
8. Ordeal - The climactic challenge
9. Reward - Success and what's gained
10. The Road Back - Beginning the return journey
11. Resurrection - Final test and transformation
12. Return with the Elixir - How the character has changed

Character ID: ${characterId}
Story Type: ${storyType}
Preferences: ${JSON.stringify(preferences || {})}

Create an engaging, age-appropriate outline that follows award-winning children's literature standards.`;

    const response = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_STORY || 'gpt-5',
      messages: [
        {
          role: 'system',
          content: 'You are an expert children\'s story writer specializing in Pulitzer-quality storytelling using the hero\'s journey structure.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 1500
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Generate initial story choices for choose-your-adventure
   */
  private async generateInitialChoices(
    storyType: StoryType,
    outline: string,
    userAge?: number
  ): Promise<StoryChoice[]> {
    const prompt = `Based on this story outline, create 3 engaging choices for how the story should begin:

Outline: ${outline}
Story Type: ${storyType}
Age: ${userAge || 5}

Each choice should:
- Be age-appropriate and engaging
- Lead to different story paths
- Be phrased as something a child would say
- Be 1-2 sentences maximum

Format as JSON array with: { "id", "text", "consequence" }`;

    const response = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_STORY || 'gpt-5',
      messages: [
        {
          role: 'system',
          content: 'You create engaging story choices for children that lead to meaningful narrative branches.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.9,
      max_tokens: 800
    });

    try {
      const choices = JSON.parse(response.choices[0]?.message?.content || '[]');
      return choices.map((choice: any, index: number) => ({
        id: `choice_${index + 1}`,
        text: choice.text,
        consequence: choice.consequence,
        nextBeatId: undefined // Will be set when choice is selected
      }));
    } catch (error) {
      this.logger.error('Failed to parse initial choices', { error });
      return this.getDefaultChoices();
    }
  }

  /**
   * Generate next story beat based on user choice
   */
  private async generateNextBeat(
    storyId: string,
    userChoice?: string,
    voiceInput?: string
  ): Promise<StoryBeat> {
    // This would typically fetch the current story state
    // For now, generating a sample beat
    const beatContent = await this.generateBeatContent(
      storyId,
      userChoice,
      voiceInput
    );

    return {
      id: this.generateId(),
      sequence: 1, // Would be calculated based on current story state
      content: beatContent,
      choices: [],
      emotionalTone: this.determineBeatEmotionalTone(beatContent)
    };
  }

  /**
   * Generate content for a story beat
   */
  private async generateBeatContent(
    storyId: string,
    userChoice?: string,
    voiceInput?: string
  ): Promise<string> {
    const prompt = `Continue the story based on the user's choice: "${userChoice || voiceInput}"

Create an engaging story beat that:
- Follows naturally from the user's choice
- Advances the plot meaningfully
- Maintains age-appropriate content
- Uses vivid, engaging language
- Is 2-3 paragraphs long
- Ends with a natural pause for the next choice

Voice input from child: ${voiceInput || 'None'}
Selected choice: ${userChoice || 'None'}`;

    const response = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_STORY || 'gpt-5',
      messages: [
        {
          role: 'system',
          content: 'You are a master storyteller creating engaging, age-appropriate story content that responds to children\'s choices.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 600
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Generate choices for the next story beat
   */
  private async generateChoicesForBeat(
    storyId: string,
    beat: StoryBeat
  ): Promise<StoryChoice[]> {
    const prompt = `Based on this story beat, create 3 choices for what happens next:

Story Beat: ${beat.content}

Each choice should:
- Be natural responses a child might make
- Lead to different story directions
- Be engaging and age-appropriate
- Be phrased as direct speech ("I want to...")

Format as JSON array with: { "id", "text", "consequence" }`;

    const response = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_STORY || 'gpt-5',
      messages: [
        {
          role: 'system',
          content: 'You create engaging story choices that give children meaningful agency in the narrative.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.9,
      max_tokens: 600
    });

    try {
      const choices = JSON.parse(response.choices[0]?.message?.content || '[]');
      return choices.map((choice: any, index: number) => ({
        id: `choice_${beat.id}_${index + 1}`,
        text: choice.text,
        consequence: choice.consequence,
        nextBeatId: undefined
      }));
    } catch (error) {
      this.logger.error('Failed to parse beat choices', { error });
      return this.getDefaultChoices();
    }
  }

  /**
   * Parse voice edit command to understand intent
   */
  private async parseVoiceEditCommand(voiceCommand: string): Promise<{
    type: 'character_change' | 'plot_change' | 'tone_change' | 'add_element' | 'remove_element';
    target: string;
    change: string;
  }> {
    const prompt = `Parse this voice command to understand what the user wants to edit in their story:

Voice Command: "${voiceCommand}"

Determine:
1. Type of edit (character_change, plot_change, tone_change, add_element, remove_element)
2. What specifically they want to target
3. What change they want to make

Format as JSON: { "type", "target", "change" }`;

    const response = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_CONVERSATION || process.env.OPENAI_MODEL_STORY || 'gpt-5',
      messages: [
        {
          role: 'system',
          content: 'You parse children\'s voice commands to understand their story editing intentions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    try {
      return JSON.parse(response.choices[0]?.message?.content || '{}');
    } catch (error) {
      this.logger.error('Failed to parse voice edit command', { error });
      return {
        type: 'plot_change',
        target: 'story',
        change: voiceCommand
      };
    }
  }

  /**
   * Apply story edit based on parsed intent
   */
  private async applyStoryEdit(
    storyId: string,
    editIntent: any,
    targetBeat?: number
  ): Promise<StoryUpdate> {
    // This would apply the actual edit to the story
    // For now, returning a mock update
    return {
      updatedBeats: [],
      affectedCharacters: [],
      narrativeChanges: [`Applied ${editIntent.type}: ${editIntent.change}`]
    };
  }

  /**
   * Analyze how character changes impact the story
   */
  private async analyzeCharacterChangeImpact(
    storyId: string,
    characterChanges: any
  ): Promise<{
    affectedBeats: number[];
    narrativeChanges: string[];
    requiredUpdates: string[];
  }> {
    const prompt = `Analyze how these character changes affect the story:

Character Changes: ${JSON.stringify(characterChanges)}

Identify:
1. Which story beats need updating
2. What narrative elements need to change
3. What specific updates are required

Example: If character changes from human to dog, then:
- "hands" becomes "paws"
- "walked" becomes "bounded"
- "grasped" becomes "picked up with mouth"

Format as JSON: { "affectedBeats", "narrativeChanges", "requiredUpdates" }`;

    const response = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL_STORY || 'gpt-5',
      messages: [
        {
          role: 'system',
          content: 'You analyze story consistency and identify necessary changes when characters are modified.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 800
    });

    try {
      return JSON.parse(response.choices[0]?.message?.content || '{}');
    } catch (error) {
      this.logger.error('Failed to analyze character change impact', { error });
      return {
        affectedBeats: [],
        narrativeChanges: [],
        requiredUpdates: []
      };
    }
  }

  /**
   * Regenerate story beats affected by character changes
   */
  private async regenerateAffectedBeats(
    storyId: string,
    impactAnalysis: any
  ): Promise<StoryBeat[]> {
    // This would regenerate the affected beats
    // For now, returning empty array
    return [];
  }

  /**
   * Convert story draft to final story structure
   */
  private async convertDraftToFinalStory(draft: StoryDraft): Promise<any> {
    // This would convert the draft to a final story structure
    // For now, returning a mock structure
    return {
      libraryId: 'mock-library-id',
      title: 'Generated Story',
      ageRating: 5
    };
  }

  /**
   * Generate final story content with all beats
   */
  private async generateFinalStoryContent(story: any): Promise<StoryContent> {
    const heroJourneyBeats: HeroJourneyBeat[] = [
      { stage: 'ordinary_world', content: '', completed: true },
      { stage: 'call_to_adventure', content: '', completed: true },
      { stage: 'refusal_of_call', content: '', completed: true },
      { stage: 'meeting_mentor', content: '', completed: true },
      { stage: 'crossing_threshold', content: '', completed: true },
      { stage: 'tests_allies_enemies', content: '', completed: true },
      { stage: 'approach_inmost_cave', content: '', completed: true },
      { stage: 'ordeal', content: '', completed: true },
      { stage: 'reward', content: '', completed: true },
      { stage: 'road_back', content: '', completed: true },
      { stage: 'resurrection', content: '', completed: true },
      { stage: 'return_elixir', content: '', completed: true }
    ];

    return {
      type: 'Adventure',
      audience: 'child',
      complexity: 'simple',
      beats: [],
      characters: [],
      theme: 'Adventure and growth',
      setting: 'Magical forest',
      mood: 'adventurous',
      heroJourneyStructure: heroJourneyBeats
    };
  }

  /**
   * Get story draft (mock implementation)
   */
  private async getStoryDraft(storyId: string): Promise<StoryDraft> {
    // This would fetch from database
    return {
      id: storyId,
      characterId: 'mock-character-id',
      storyType: 'Adventure',
      outline: 'Mock outline',
      currentBeat: 0,
      choices: []
    };
  }

  /**
   * Determine emotional tone of a story beat
   */
  private determineBeatEmotionalTone(content: string): string {
    // Simple keyword-based tone detection
    const tones = {
      'excited': ['exciting', 'amazing', 'wonderful', 'fantastic'],
      'calm': ['peaceful', 'quiet', 'gentle', 'soft'],
      'mysterious': ['strange', 'mysterious', 'unknown', 'hidden'],
      'adventurous': ['adventure', 'journey', 'explore', 'discover']
    };

    for (const [tone, keywords] of Object.entries(tones)) {
      if (keywords.some(keyword => content.toLowerCase().includes(keyword))) {
        return tone;
      }
    }

    return 'neutral';
  }

  /**
   * Get default choices when generation fails
   */
  private getDefaultChoices(): StoryChoice[] {
    return [
      {
        id: 'default_1',
        text: 'Let\'s explore what happens next!',
        consequence: 'The story continues with an adventure.',
        nextBeatId: undefined
      },
      {
        id: 'default_2',
        text: 'I want to help the character!',
        consequence: 'You decide to help the main character.',
        nextBeatId: undefined
      },
      {
        id: 'default_3',
        text: 'Tell me more about this place!',
        consequence: 'You learn more about the story setting.',
        nextBeatId: undefined
      }
    ];
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
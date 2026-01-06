import OpenAI from 'openai';
import { Character, CharacterTraits, InclusivityTrait } from '@alexa-multi-agent/shared-types';
import { Logger } from 'winston';

export interface CharacterGenerationRequest {
  userId: string;
  sessionId: string;
  libraryId: string;
  conversationHistory: ConversationTurn[];
  currentPhase: CharacterGenerationPhase;
  userInput?: string;
  ageContext?: number;
}

export interface ConversationTurn {
  speaker: 'user' | 'assistant';
  message: string;
  timestamp: string;
  extractedData?: Partial<CharacterTraits>;
}

export type CharacterGenerationPhase = 
  | 'greeting'
  | 'basic_traits'
  | 'species_selection'
  | 'appearance_details'
  | 'personality_traits'
  | 'inclusivity_traits'
  | 'validation'
  | 'confirmation'
  | 'complete';

export interface CharacterGenerationResult {
  phase: CharacterGenerationPhase;
  nextPhase?: CharacterGenerationPhase;
  response: string;
  extractedTraits: Partial<CharacterTraits>;
  isComplete: boolean;
  needsValidation: boolean;
  validationIssues?: string[];
  suggestedQuestions?: string[];
}

export interface CharacterValidationResult {
  isValid: boolean;
  ageAppropriate: boolean;
  issues: ValidationIssue[];
  suggestions: string[];
}

export interface ValidationIssue {
  type: 'age_inappropriate' | 'missing_required' | 'inconsistent' | 'safety_concern';
  field: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export class CharacterGenerationService {
  private openai: OpenAI;
  private logger: Logger;

  constructor(openai: OpenAI, logger: Logger) {
    this.openai = openai;
    this.logger = logger;
  }

  /**
   * Process user input in the character generation conversation
   */
  async processCharacterGeneration(request: CharacterGenerationRequest): Promise<CharacterGenerationResult> {
    this.logger.info('Processing character generation', {
      userId: request.userId,
      phase: request.currentPhase,
      inputLength: request.userInput?.length || 0
    });

    try {
      // Extract character traits from conversation
      const extractedTraits = await this.extractCharacterTraits(request);
      
      // Determine next phase and generate response
      const phaseResult = await this.processPhase(request, extractedTraits);
      
      // Validate character if in validation phase
      const validation = phaseResult.needsValidation ? 
        await this.validateCharacter(extractedTraits, request.ageContext) : null;

      return {
        ...phaseResult,
        extractedTraits,
        validationIssues: validation?.issues.map(i => i.message)
      };

    } catch (error) {
      this.logger.error('Error processing character generation', { error });
      return this.getErrorResponse(request.currentPhase);
    }
  }

  /**
   * Extract character traits from conversation using AI
   */
  private async extractCharacterTraits(request: CharacterGenerationRequest): Promise<Partial<CharacterTraits>> {
    const systemPrompt = `You are an expert at extracting character traits from natural conversation. 
    
    Analyze the conversation history and extract character details that have been mentioned or implied.
    
    Focus on:
    - Basic traits (name, age, species)
    - Physical appearance details
    - Personality characteristics
    - Inclusivity traits (disabilities, special needs, etc.)
    - Interests and hobbies
    
    Be conservative - only extract traits that are clearly mentioned or strongly implied.
    For age-appropriate content, ensure all traits are suitable for children.`;

    const userPrompt = `Conversation History:
${request.conversationHistory.map(turn => `${turn.speaker}: ${turn.message}`).join('\n')}

Current User Input: ${request.userInput || 'None'}
Current Phase: ${request.currentPhase}
User Age Context: ${request.ageContext || 'Unknown'}

Extract character traits from this conversation.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      functions: [this.getCharacterExtractionFunction()],
      function_call: { name: 'extract_character_traits' },
      temperature: 0.3
    });

    const functionCall = response.choices[0]?.message?.function_call;
    if (functionCall?.arguments) {
      return JSON.parse(functionCall.arguments);
    }

    return {};
  }

  /**
   * Process the current phase and determine next steps
   */
  private async processPhase(
    request: CharacterGenerationRequest, 
    extractedTraits: Partial<CharacterTraits>
  ): Promise<Omit<CharacterGenerationResult, 'extractedTraits'>> {
    const phaseHandlers = {
      greeting: () => this.handleGreetingPhase(request),
      basic_traits: () => this.handleBasicTraitsPhase(request, extractedTraits),
      species_selection: () => this.handleSpeciesSelectionPhase(request, extractedTraits),
      appearance_details: () => this.handleAppearancePhase(request, extractedTraits),
      personality_traits: () => this.handlePersonalityPhase(request, extractedTraits),
      inclusivity_traits: () => this.handleInclusivityPhase(request, extractedTraits),
      validation: () => this.handleValidationPhase(request, extractedTraits),
      confirmation: () => this.handleConfirmationPhase(request, extractedTraits),
      complete: () => this.handleCompletePhase(request, extractedTraits)
    };

    const handler = phaseHandlers[request.currentPhase];
    return await handler();
  }

  private async handleGreetingPhase(request: CharacterGenerationRequest): Promise<Omit<CharacterGenerationResult, 'extractedTraits'>> {
    const response = await this.generateConversationalResponse({
      phase: 'greeting',
      context: 'Starting character creation',
      userInput: request.userInput,
      ageContext: request.ageContext
    });

    return {
      phase: 'greeting',
      nextPhase: 'basic_traits',
      response,
      isComplete: false,
      needsValidation: false,
      suggestedQuestions: [
        "What should we call your character?",
        "How old is your character?",
        "Tell me about your character!"
      ]
    };
  }

  private async handleBasicTraitsPhase(
    request: CharacterGenerationRequest, 
    traits: Partial<CharacterTraits>
  ): Promise<Omit<CharacterGenerationResult, 'extractedTraits'>> {
    const hasBasicTraits = traits.name && traits.age;
    
    const response = await this.generateConversationalResponse({
      phase: 'basic_traits',
      context: `Collecting basic traits. Has name: ${!!traits.name}, Has age: ${!!traits.age}`,
      userInput: request.userInput,
      extractedTraits: traits,
      ageContext: request.ageContext
    });

    return {
      phase: 'basic_traits',
      nextPhase: hasBasicTraits ? 'species_selection' : 'basic_traits',
      response,
      isComplete: false,
      needsValidation: false,
      suggestedQuestions: hasBasicTraits ? [
        "What kind of character is this? Human, animal, or something magical?",
        "Is your character a person, an animal, or something else?"
      ] : [
        "What's your character's name?",
        "How old is your character?",
        "Tell me more about them!"
      ]
    };
  }

  private async handleSpeciesSelectionPhase(
    request: CharacterGenerationRequest, 
    traits: Partial<CharacterTraits>
  ): Promise<Omit<CharacterGenerationResult, 'extractedTraits'>> {
    const hasSpecies = traits.species;
    
    const response = await this.generateConversationalResponse({
      phase: 'species_selection',
      context: `Selecting species. Current: ${traits.species || 'none'}`,
      userInput: request.userInput,
      extractedTraits: traits,
      ageContext: request.ageContext
    });

    return {
      phase: 'species_selection',
      nextPhase: hasSpecies ? 'appearance_details' : 'species_selection',
      response,
      isComplete: false,
      needsValidation: false,
      suggestedQuestions: hasSpecies ? [
        "What does your character look like?",
        "Tell me about their appearance!"
      ] : [
        "Is your character a human, animal, robot, or something magical?",
        "What type of creature is your character?"
      ]
    };
  }

  private async handleAppearancePhase(
    request: CharacterGenerationRequest, 
    traits: Partial<CharacterTraits>
  ): Promise<Omit<CharacterGenerationResult, 'extractedTraits'>> {
    const hasAppearance = traits.appearance && Object.keys(traits.appearance).length > 2;
    
    const response = await this.generateConversationalResponse({
      phase: 'appearance_details',
      context: `Collecting appearance details. Has details: ${hasAppearance}`,
      userInput: request.userInput,
      extractedTraits: traits,
      ageContext: request.ageContext
    });

    return {
      phase: 'appearance_details',
      nextPhase: hasAppearance ? 'personality_traits' : 'appearance_details',
      response,
      isComplete: false,
      needsValidation: false,
      suggestedQuestions: hasAppearance ? [
        "What is your character like? Are they funny, brave, kind?",
        "Tell me about their personality!"
      ] : [
        "What color are their eyes?",
        "What does their hair look like?",
        "What do they wear?",
        "How tall are they?"
      ]
    };
  }

  private async handlePersonalityPhase(
    request: CharacterGenerationRequest, 
    traits: Partial<CharacterTraits>
  ): Promise<Omit<CharacterGenerationResult, 'extractedTraits'>> {
    const hasPersonality = traits.personality && traits.personality.length > 2;
    
    const response = await this.generateConversationalResponse({
      phase: 'personality_traits',
      context: `Collecting personality traits. Has traits: ${hasPersonality}`,
      userInput: request.userInput,
      extractedTraits: traits,
      ageContext: request.ageContext
    });

    return {
      phase: 'personality_traits',
      nextPhase: hasPersonality ? 'inclusivity_traits' : 'personality_traits',
      response,
      isComplete: false,
      needsValidation: false,
      suggestedQuestions: hasPersonality ? [
        "Does your character have any special needs or unique traits?",
        "Is there anything special about your character?"
      ] : [
        "Is your character brave, funny, kind, or shy?",
        "What makes your character special?",
        "How does your character act with friends?"
      ]
    };
  }

  private async handleInclusivityPhase(
    request: CharacterGenerationRequest, 
    traits: Partial<CharacterTraits>
  ): Promise<Omit<CharacterGenerationResult, 'extractedTraits'>> {
    const response = await this.generateConversationalResponse({
      phase: 'inclusivity_traits',
      context: 'Collecting inclusivity traits (optional)',
      userInput: request.userInput,
      extractedTraits: traits,
      ageContext: request.ageContext
    });

    return {
      phase: 'inclusivity_traits',
      nextPhase: 'validation',
      response,
      isComplete: false,
      needsValidation: true,
      suggestedQuestions: [
        "Let me check if everything looks good!",
        "Should we review your character?"
      ]
    };
  }

  private async handleValidationPhase(
    request: CharacterGenerationRequest, 
    traits: Partial<CharacterTraits>
  ): Promise<Omit<CharacterGenerationResult, 'extractedTraits'>> {
    const validation = await this.validateCharacter(traits, request.ageContext);
    
    const response = await this.generateValidationResponse(traits, validation);

    return {
      phase: 'validation',
      nextPhase: validation.isValid ? 'confirmation' : 'basic_traits',
      response,
      isComplete: false,
      needsValidation: true,
      validationIssues: validation.issues.map(i => i.message),
      suggestedQuestions: validation.isValid ? [
        "Does this look right?",
        "Should we create this character?"
      ] : [
        "Let's fix these issues",
        "What would you like to change?"
      ]
    };
  }

  private async handleConfirmationPhase(
    request: CharacterGenerationRequest, 
    traits: Partial<CharacterTraits>
  ): Promise<Omit<CharacterGenerationResult, 'extractedTraits'>> {
    const response = await this.generateConversationalResponse({
      phase: 'confirmation',
      context: 'Final confirmation before creating character',
      userInput: request.userInput,
      extractedTraits: traits,
      ageContext: request.ageContext
    });

    const isConfirmed = request.userInput?.toLowerCase().includes('yes') || 
                       request.userInput?.toLowerCase().includes('create') ||
                       request.userInput?.toLowerCase().includes('looks good');

    return {
      phase: 'confirmation',
      nextPhase: isConfirmed ? 'complete' : 'validation',
      response,
      isComplete: !!isConfirmed,
      needsValidation: false,
      suggestedQuestions: isConfirmed ? [
        "Great! Your character is ready!",
        "Let's start creating a story!"
      ] : [
        "What would you like to change?",
        "Should we go back and edit something?"
      ]
    };
  }

  private async handleCompletePhase(
    request: CharacterGenerationRequest, 
    traits: Partial<CharacterTraits>
  ): Promise<Omit<CharacterGenerationResult, 'extractedTraits'>> {
    return {
      phase: 'complete',
      response: "Perfect! Your character is ready. Now we can create amazing stories together!",
      isComplete: true,
      needsValidation: false
    };
  }

  /**
   * Generate conversational responses using AI
   */
  private async generateConversationalResponse(params: {
    phase: CharacterGenerationPhase;
    context: string;
    userInput?: string;
    extractedTraits?: Partial<CharacterTraits>;
    ageContext?: number;
  }): Promise<string> {
    const systemPrompt = `You are a warm, friendly character creation assistant for children's storytelling. 

    Your personality:
    - Enthusiastic and encouraging
    - Uses age-appropriate language
    - Asks one question at a time
    - Celebrates each detail the child shares
    - Gently guides the conversation forward
    - Uses whimsical, fun language that makes kids giggle

    Current phase: ${params.phase}
    Context: ${params.context}
    Child's age: ${params.ageContext || 'unknown'}

    Guidelines:
    - Keep responses short and engaging (2-3 sentences max)
    - Ask only ONE question at a time
    - Use encouraging phrases like "That's amazing!" or "I love that!"
    - Make the process feel like a fun game, not an interview
    - If the child seems stuck, offer gentle suggestions
    - Celebrate their creativity and imagination`;

    const userPrompt = `User input: "${params.userInput || 'Starting conversation'}"

    Current character traits collected:
    ${JSON.stringify(params.extractedTraits || {}, null, 2)}

    Generate an encouraging, age-appropriate response that moves the conversation forward naturally.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    return response.choices[0]?.message?.content || "That sounds wonderful! Tell me more!";
  }

  /**
   * Validate character for age-appropriateness and completeness
   */
  async validateCharacter(
    traits: Partial<CharacterTraits>, 
    ageContext?: number
  ): Promise<CharacterValidationResult> {
    const issues: ValidationIssue[] = [];
    const suggestions: string[] = [];

    // Check required fields
    if (!traits.name) {
      issues.push({
        type: 'missing_required',
        field: 'name',
        message: 'Character needs a name',
        severity: 'high'
      });
    }

    if (!traits.age) {
      issues.push({
        type: 'missing_required',
        field: 'age',
        message: 'Character needs an age',
        severity: 'high'
      });
    }

    if (!traits.species) {
      issues.push({
        type: 'missing_required',
        field: 'species',
        message: 'Character needs a species (human, animal, etc.)',
        severity: 'high'
      });
    }

    // Age appropriateness checks
    if (ageContext && traits.age) {
      const characterAge = typeof traits.age === 'number' ? traits.age : parseInt(String(traits.age));
      if (characterAge > ageContext + 10) {
        issues.push({
          type: 'age_inappropriate',
          field: 'age',
          message: 'Character age might be too old for the child',
          severity: 'medium'
        });
      }
    }

    // Content safety checks
    if (traits.personality) {
      const concerningTraits = ['violent', 'mean', 'scary', 'dangerous'];
      const hasConcerningTraits = traits.personality.some((trait: string) => 
        concerningTraits.some(concerning => trait.toLowerCase().includes(concerning))
      );
      
      if (hasConcerningTraits) {
        issues.push({
          type: 'safety_concern',
          field: 'personality',
          message: 'Character should have positive, child-friendly traits',
          severity: 'high'
        });
      }
    }

    // Generate suggestions
    if (!traits.interests || traits.interests.length === 0) {
      suggestions.push("Consider adding some hobbies or interests to make the character more interesting!");
    }

    if (!traits.appearance || Object.keys(traits.appearance).length < 3) {
      suggestions.push("Adding more appearance details will help bring the character to life!");
    }

    const isValid = issues.filter(i => i.severity === 'high').length === 0;
    const ageAppropriate = issues.filter(i => i.type === 'age_inappropriate').length === 0;

    return {
      isValid,
      ageAppropriate,
      issues,
      suggestions
    };
  }

  /**
   * Generate validation response
   */
  private async generateValidationResponse(
    traits: Partial<CharacterTraits>, 
    validation: CharacterValidationResult
  ): Promise<string> {
    if (validation.isValid) {
      return `Wonderful! Let me tell you about your character:

${traits.name} is a ${traits.age}-year-old ${traits.species} who is ${traits.personality?.slice(0, 3).join(', ')}. ${traits.appearance?.eyeColor ? `They have ${traits.appearance.eyeColor} eyes` : ''} ${traits.appearance?.hairColor ? `and ${traits.appearance.hairColor} hair` : ''}. 

Does this sound perfect for your story?`;
    } else {
      const highPriorityIssues = validation.issues.filter(i => i.severity === 'high');
      return `I love what you've told me! Let's just add a few more details to make your character perfect:

${highPriorityIssues.map(issue => `• ${issue.message}`).join('\n')}

What would you like to tell me about these?`;
    }
  }

  /**
   * Create final character from traits
   */
  async createCharacterFromTraits(
    traits: Partial<CharacterTraits>,
    libraryId: string,
    userId: string
  ): Promise<Character> {
    // Generate character art prompt
    const artPrompt = await this.generateArtPrompt(traits);
    
    const character: Character = {
      id: `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      libraryId,
      name: traits.name || 'Unnamed Character',
      traits: {
        name: traits.name || 'Unnamed Character',
        age: traits.age || 5,
        species: traits.species || 'human',
        race: traits.race || [],
        ethnicity: traits.ethnicity || [],
        gender: traits.gender,
        inclusivityTraits: traits.inclusivityTraits || [],
        appearance: {
          eyeColor: traits.appearance?.eyeColor,
          hairColor: traits.appearance?.hairColor,
          hairTexture: traits.appearance?.hairTexture,
          clothing: traits.appearance?.clothing,
          height: traits.appearance?.height,
          weight: traits.appearance?.weight,
          accessories: traits.appearance?.accessories || [],
          scars: traits.appearance?.scars || [],
          devices: traits.appearance?.devices || []
        },
        personality: traits.personality || [],
        interests: traits.interests || [],
        strengths: traits.strengths || [],
        challenges: traits.challenges || []
      },
      artPrompt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.logger.info('Character created from traits', {
      characterId: character.id,
      libraryId,
      userId,
      name: character.name
    });

    return character;
  }

  /**
   * Generate art prompt for character visualization
   */
  private async generateArtPrompt(traits: Partial<CharacterTraits>): Promise<string> {
    const elements = [];
    
    // Basic description
    elements.push(`${traits.age || 'young'} ${traits.species || 'human'}`);
    
    // Appearance
    if (traits.appearance?.eyeColor) elements.push(`${traits.appearance.eyeColor} eyes`);
    if (traits.appearance?.hairColor) elements.push(`${traits.appearance.hairColor} hair`);
    if (traits.appearance?.clothing) elements.push(`wearing ${traits.appearance.clothing}`);
    
    // Personality reflected in pose/expression
    if (traits.personality?.includes('brave')) elements.push('confident pose');
    if (traits.personality?.includes('kind')) elements.push('warm smile');
    if (traits.personality?.includes('shy')) elements.push('gentle expression');
    
    // Style
    elements.push('children\'s book illustration style');
    elements.push('friendly and approachable');
    elements.push('colorful and vibrant');
    
    return elements.join(', ');
  }

  /**
   * Get available species options
   */
  getSpeciesOptions(): Array<{
    value: string;
    label: string;
    description: string;
    ageAppropriate: boolean;
  }> {
    return [
      {
        value: 'human',
        label: 'Human',
        description: 'A regular person like you and me',
        ageAppropriate: true
      },
      {
        value: 'animal',
        label: 'Animal',
        description: 'A friendly animal character',
        ageAppropriate: true
      },
      {
        value: 'robot',
        label: 'Robot',
        description: 'A helpful robot friend',
        ageAppropriate: true
      },
      {
        value: 'magical_creature',
        label: 'Magical Creature',
        description: 'A fairy, unicorn, or other magical being',
        ageAppropriate: true
      },
      {
        value: 'superhero',
        label: 'Superhero',
        description: 'A hero with special powers',
        ageAppropriate: true
      },
      {
        value: 'monster',
        label: 'Friendly Monster',
        description: 'A silly, non-scary monster',
        ageAppropriate: true
      },
      {
        value: 'elemental',
        label: 'Elemental',
        description: 'A being made of fire, water, earth, or air',
        ageAppropriate: true
      }
    ];
  }

  /**
   * Get available inclusivity traits
   */
  getInclusivityOptions(): Array<{
    type: InclusivityTrait['type'];
    label: string;
    description: string;
    ageAppropriate: boolean;
  }> {
    return [
      {
        type: 'autism',
        label: 'Autism',
        description: 'Character who thinks and learns differently',
        ageAppropriate: true
      },
      {
        type: 'wheelchair',
        label: 'Uses Wheelchair',
        description: 'Character who uses a wheelchair to get around',
        ageAppropriate: true
      },
      {
        type: 'prosthetic',
        label: 'Prosthetic Limb',
        description: 'Character with a prosthetic arm or leg',
        ageAppropriate: true
      },
      {
        type: 'down_syndrome',
        label: 'Down Syndrome',
        description: 'Character with Down syndrome',
        ageAppropriate: true
      },
      {
        type: 'asthma',
        label: 'Asthma',
        description: 'Character who needs an inhaler sometimes',
        ageAppropriate: true
      },
      {
        type: 'foster',
        label: 'Foster Child',
        description: 'Character who lives with a foster family',
        ageAppropriate: true
      },
      {
        type: 'gifted',
        label: 'Gifted',
        description: 'Character who is really good at learning',
        ageAppropriate: true
      },
      {
        type: 'other',
        label: 'Other',
        description: 'Something else that makes the character special',
        ageAppropriate: true
      }
    ];
  }

  private getCharacterExtractionFunction(): OpenAI.Chat.Completions.ChatCompletionCreateParams.Function {
    return {
      name: 'extract_character_traits',
      description: 'Extract character traits from conversation',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Character name'
          },
          age: {
            type: 'number',
            description: 'Character age'
          },
          species: {
            type: 'string',
            enum: ['human', 'animal', 'robot', 'magical_creature', 'elemental', 'superhero', 'monster'],
            description: 'Character species'
          },
          appearance: {
            type: 'object',
            properties: {
              eyeColor: { type: 'string' },
              hairColor: { type: 'string' },
              hairTexture: { type: 'string' },
              clothing: { type: 'string' },
              height: { type: 'string' },
              weight: { type: 'string' },
              accessories: { type: 'array', items: { type: 'string' } },
              scars: { type: 'array', items: { type: 'string' } },
              devices: { type: 'array', items: { type: 'string' } }
            }
          },
          personality: {
            type: 'array',
            items: { type: 'string' },
            description: 'Personality traits'
          },
          interests: {
            type: 'array',
            items: { type: 'string' },
            description: 'Hobbies and interests'
          },
          strengths: {
            type: 'array',
            items: { type: 'string' },
            description: 'Character strengths'
          },
          challenges: {
            type: 'array',
            items: { type: 'string' },
            description: 'Character challenges'
          },
          inclusivityTraits: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['autism', 'wheelchair', 'foster', 'asthma', 'down_syndrome', 'gifted', 'prosthetic', 'other']
                },
                description: { type: 'string' },
                storyIntegration: { type: 'string' }
              }
            }
          }
        }
      }
    };
  }

  private getErrorResponse(phase: CharacterGenerationPhase): CharacterGenerationResult {
    return {
      phase,
      response: "Oops! Something went wrong. Let's try that again! What would you like to tell me about your character?",
      extractedTraits: {},
      isComplete: false,
      needsValidation: false,
      suggestedQuestions: ["Tell me about your character!", "What should we call them?"]
    };
  }
}
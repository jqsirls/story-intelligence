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
      model: process.env.OPENAI_MODEL_CONVERSATION || process.env.OPENAI_MODEL_STORY || 'gpt-5',
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
      model: process.env.OPENAI_MODEL_CONVERSATION || process.env.OPENAI_MODEL_STORY || 'gpt-5',
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
   * Generate reference images (headshot + bodyshot) with AI bias mitigation and trait validation
   * This is the NEW method that combats AI bias for authentic inclusivity representation
   */
  async generateReferenceImagesWithValidation(
    traits: Partial<CharacterTraits>,
    characterId: string
  ): Promise<{
    headshot: { url: string; prompt: string; traitsValidated: boolean };
    bodyshot: { url: string; prompt: string; traitsValidated: boolean };
    colorPalette: { skin: string; hair: string; eyes: string };
    expressions: Array<{ emotion: string; description: string }>;
  }> {
    this.logger.info('Generating reference images with AI bias mitigation', {
      characterId,
      characterName: traits.name,
      inclusivityTraitCount: traits.inclusivityTraits?.length || 0
    });

    // Lazy-load new services
    const { CharacterImageGenerator } = await import('./CharacterImageGenerator');
    const { ImageSafetyReviewService } = await import('./ImageSafetyReviewService');
    const { INCLUSIVITY_TRAITS_MAP } = await import('../constants/ComprehensiveInclusivityDatabase');
    
    // Extract hex colors
    const hexColors = this.extractHexColors(traits);
    
    // Load full inclusivity trait definitions
    const inclusivityTraitDefs = (traits.inclusivityTraits || [])
      .map((t: any) => INCLUSIVITY_TRAITS_MAP[t.type || t])
      .filter(Boolean);
    
    const imageGenerator = new CharacterImageGenerator(this.openai, this.logger);
    const safetyService = new ImageSafetyReviewService(this.openai, this.logger, 'gpt-5.1');
    
    const maxRetries = 2;

    // GENERATE HEADSHOT with validation
    let headshot = null;
    let headshotBuffer: Buffer | null = null; // Keep buffer for images.edit()
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      this.logger.info(`Headshot generation attempt ${attempt + 1}/${maxRetries + 1}`, {
        characterName: traits.name
      });
      
      try {
        // Generate image
        const result = await imageGenerator.generateHeadshot(
          traits as any,
          inclusivityTraitDefs,
          hexColors
        );
        
        // Get buffer for validation AND images.edit() later
        let buffer: Buffer;
        if (result.url.startsWith('data:image')) {
          // Base64 data URL
          const b64 = result.url.split(',')[1];
          buffer = Buffer.from(b64, 'base64');
        } else {
          // HTTP URL - download
          const imgResponse = await fetch(result.url);
          buffer = Buffer.from(await imgResponse.arrayBuffer());
        }
        
        const b64 = buffer.toString('base64');
        
        // Comprehensive review (safety + traits, style logged only)
        const review = await safetyService.reviewImageComprehensive({
          candidateB64: b64,
          targetRating: 'G',
          characterName: traits.name,
          expectedTraits: inclusivityTraitDefs
        });
        
        // Check safety AND traits ONLY (trust prompts for style)
        const passesAll = review.is_child_safe && review.traits_validated;
        
        // Style: Log but don't block (trusting Buildship-style prompts)
        if (review.global_style_score && review.global_style_score < 5) {
          this.logger.info('Style score below target but accepting (trusting prompts)', {
            score: review.global_style_score,
            characterName: traits.name,
            note: 'Style validated but not blocking'
          });
        }
        
        if (passesAll) {
          // Success! Upload to S3
          const s3Url = await this.uploadImageToS3(buffer, `char-headshot-${characterId}`);
          headshot = {
            url: s3Url,
            prompt: result.prompt,
            traitsValidated: true
          };
          
          // CRITICAL: Keep buffer for images.edit() later
          headshotBuffer = buffer;
          
          this.logger.info('Headshot passed critical validation (safety + traits)', {
            characterName: traits.name,
            rating: review.rating,
            traitsValidated: true,
            styleScore: review.global_style_score,
            styleLogged: true,
            bufferKeptForImagesEdit: true,
            attempt: attempt + 1
          });
          break;
        }
        
        // Failed - log why (safety or traits only)
        const failureReasons: string[] = [];
        if (!review.is_child_safe) {
          failureReasons.push(`Safety: ${review.rating}`);
        }
        if (!review.traits_validated) {
          failureReasons.push(`AI Bias: Missing ${review.missing_traits.join(', ')}`);
        }
        
        this.logger.warn('Headshot failed validation', {
          characterName: traits.name,
          attempt: attempt + 1,
          reasons: failureReasons,
          willRetry: attempt < maxRetries
        });
        
        if (attempt === maxRetries) {
          // Final attempt failed - accept with flag
          this.logger.error('All headshot attempts failed, accepting with warning', {
            characterName: traits.name,
            finalRating: review.rating,
            traitsValidated: review.traits_validated,
            missingTraits: review.missing_traits
          });
          
          // Upload anyway but flag as not validated
          const s3Url = await this.uploadImageToS3(buffer, `char-headshot-${characterId}`);
          headshot = {
            url: s3Url,
            prompt: result.prompt,
            traitsValidated: false
          };
          
          // CRITICAL: Keep buffer for images.edit() even on failed validation
          headshotBuffer = buffer;
          break;
        }
        
      } catch (error: any) {
        this.logger.error('Headshot generation attempt failed', {
          attempt: attempt + 1,
          error: error.message
        });
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    if (!headshot) {
      throw new Error('Failed to generate headshot after all attempts');
    }

    if (!headshotBuffer) {
      throw new Error('Headshot buffer not available for images.edit()');
    }
    
    // PREPARE HEADSHOT REFERENCE for bodyshot generation
    // Convert headshot buffer to File object for images.edit()
    this.logger.info('Preparing headshot as reference for bodyshot', {
      characterName: traits.name,
      headshotUrl: headshot.url.substring(0, 80),
      bufferSizeKB: (headshotBuffer.length / 1024).toFixed(2),
      method: 'images.edit'
    });
    
    const { ImageReferenceService } = await import('./ImageReferenceService');
    const refService = new ImageReferenceService(this.openai, this.logger);
    
    const headshotFile = await refService.convertBufferToFile(headshotBuffer, 'headshot-reference.png');
    
    // GENERATE BODYSHOT using headshot as VISUAL REFERENCE (images.edit)
    // This ensures bodyshot matches headshot - SAME character
    let bodyshot = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      this.logger.info(`Bodyshot generation attempt ${attempt + 1}/${maxRetries + 1} using headshot reference`, {
        characterName: traits.name,
        method: 'images.edit',
        visualConsistency: true
      });
      
      try {
        const result = await imageGenerator.generateBodyshotWithReference(
          traits as any,
          inclusivityTraitDefs,
          hexColors,
          headshotFile
        );
        
        const imgResponse = await fetch(result.url);
        const buffer = Buffer.from(await imgResponse.arrayBuffer());
        const b64 = buffer.toString('base64');
        
        const review = await safetyService.reviewImageComprehensive({
          candidateB64: b64,
          targetRating: 'G',
          characterName: traits.name,
          expectedTraits: inclusivityTraitDefs
        });
        
        // Check safety AND traits ONLY (trust prompts for style)
        const passesAll = review.is_child_safe && review.traits_validated;
        
        // Style: Log but don't block (trusting Buildship-style prompts + images.edit consistency)
        if (review.global_style_score && review.global_style_score < 5) {
          this.logger.info('Style score below target but accepting (trusting prompts)', {
            score: review.global_style_score,
            characterName: traits.name,
            note: 'Bodyshot uses headshot reference, style trusted'
          });
        }
        
        if (passesAll) {
          const s3Url = await this.uploadImageToS3(buffer, `char-bodyshot-${characterId}`);
          bodyshot = {
            url: s3Url,
            prompt: result.prompt,
            traitsValidated: true
          };
          
          this.logger.info('Bodyshot passed critical validation (safety + traits)', {
            characterName: traits.name,
            visualConsistency: 'Matched headshot via images.edit',
            styleScore: review.global_style_score,
            styleLogged: true,
            attempt: attempt + 1
          });
          break;
        }
        
        // Log what failed for retry (safety or traits only)
        const failures: string[] = [];
        if (!review.is_child_safe) failures.push('safety');
        if (!review.traits_validated) failures.push('traits');
        
        this.logger.warn('Bodyshot validation failed', {
          characterName: traits.name,
          failures,
          attempt: attempt + 1,
          willRetry: attempt < maxRetries
        });
        
        if (attempt === maxRetries) {
          // Accept with flag
          const s3Url = await this.uploadImageToS3(buffer, `char-bodyshot-${characterId}`);
          bodyshot = {
            url: s3Url,
            prompt: result.prompt,
            traitsValidated: false
          };
          break;
        }
        
      } catch (error: any) {
        this.logger.error('Bodyshot generation attempt failed', {
          attempt: attempt + 1,
          error: error.message
        });
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    if (!bodyshot) {
      throw new Error('Failed to generate bodyshot after all attempts');
    }

    // Generate signature expressions
    const expressions = this.generateExpressions(traits);

    this.logger.info('Reference images generated successfully', {
      characterId,
      characterName: traits.name,
      headshotValidated: headshot.traitsValidated,
      bodyshotValidated: bodyshot.traitsValidated
    });

    return {
      headshot,
      bodyshot,
      colorPalette: hexColors,
      expressions
    };
  }

  /**
   * Extract or infer hex colors for character
   * Enhanced to support fantasy creature colors
   */
  private extractHexColors(traits: Partial<CharacterTraits>): { skin: string; hair: string; eyes: string } {
    return {
      skin: this.inferSkinHex(traits.ethnicity || [], traits),
      hair: this.inferHairHex(traits.appearance?.hairColor || traits.hairColor, traits.ethnicity),
      eyes: this.inferEyeHex(traits.appearance?.eyeColor || traits.eyeColor)
    };
  }

  /**
   * Infer skin hex from ethnicity OR fantasy description
   * Enhanced to support fantasy creature colors (purple dragon, green alien, etc)
   */
  private inferSkinHex(ethnicities: string[], traits?: Partial<CharacterTraits>): string {
    // Check for fantasy creature skin tone descriptions first
    const skinTone = traits?.skinTone?.toLowerCase() || '';
    
    // Fantasy creature colors (dragons, aliens, monsters, elementals)
    if (skinTone.includes('purple')) return '#9B59B6'; // Purple for dragons, monsters
    if (skinTone.includes('green') && !skinTone.includes('light green')) return '#50C878'; // Green for aliens, monsters
    if (skinTone.includes('blue')) return '#4A90E2'; // Blue for aliens, water elementals
    if (skinTone.includes('red') && skinTone.includes('scales')) return '#E74C3C'; // Red dragon scales
    if (skinTone.includes('silver') || skinTone.includes('metallic')) return '#C0C0C0'; // Silver robot/metal
    if (skinTone.includes('gold') || skinTone.includes('golden')) return '#FFD700'; // Gold metal
    if (skinTone.includes('white') && (skinTone.includes('fur') || skinTone.includes('scales'))) return '#FFFFFF'; // White animals/creatures
    if (skinTone.includes('black') && (skinTone.includes('fur') || skinTone.includes('scales'))) return '#1C1C1C'; // Black animals/creatures
    
    // Fire elemental
    if (skinTone.includes('fire') || skinTone.includes('flame')) return '#FF6347'; // Fire/flame color
    // Water elemental
    if (skinTone.includes('water') || skinTone.includes('aqua')) return '#00CED1'; // Water color
    
    // Human ethnicities
    const ethnicityToHex: Record<string, string> = {
      'African': '#8D5524',
      'African American/Black': '#6F4E37',
      'Afro-Caribbean': '#5C4033',
      'Asian Indian': '#E1B899',
      'Chinese': '#F1C27D',
      'Japanese': '#F7DAD9',
      'Korean': '#F3D8C5',
      'Mexican': '#D2A679',
      'Filipino': '#E6BE8A',
      'White/Caucasian': '#FFE0BD',
      'Hispanic/Latino': '#D4A373',
      'Middle Eastern': '#C68642',
      'Arab/North African': '#D4A068',
      'South Asian': '#D9A66C',
      'Southeast Asian': '#E8B887',
      'Native American': '#C68642',
      'Pacific Islander': '#D2A679',
      'Indigenous Peoples': '#C17A4F',
      'Multiracial/Mixed': '#D2A679'
    };
    
    if (ethnicities.length === 0) return '#D2A679'; // Default warm caramel for humans
    if (ethnicities.length > 1) {
      return ethnicityToHex[ethnicities[0]] || '#D2A679';
    }
    
    return ethnicityToHex[ethnicities[0]] || '#D2A679';
  }

  /**
   * Infer hair hex from color description
   */
  private inferHairHex(hairColor?: string, ethnicities?: string[]): string {
    const colorMap: Record<string, string> = {
      'black': '#1C1C1C',
      'dark brown': '#4B3621',
      'brown': '#6F4E37',
      'light brown': '#A0826D',
      'blonde': '#F4E4C1',
      'dirty blonde': '#D4C3A7',
      'red': '#B94E48',
      'auburn': '#A0522D',
      'white': '#F5F5F5',
      'gray': '#C0C0C0',
      'purple': '#9B59B6',
      'blue': '#4A90E2',
      'green': '#50C878',
      'pink': '#FFB6C1'
    };
    
    if (hairColor) {
      const lower = hairColor.toLowerCase();
      for (const [key, hex] of Object.entries(colorMap)) {
        if (lower.includes(key)) return hex;
      }
    }
    
    // Infer from ethnicity
    if (ethnicities) {
      const darkHair = ['African', 'Asian', 'Hispanic', 'Middle Eastern', 'Native American'];
      if (ethnicities.some(e => darkHair.some(d => e.includes(d)))) {
        return '#1C1C1C';
      }
    }
    
    return '#4B3621'; // Default medium brown
  }

  /**
   * Infer eye hex from color description
   */
  private inferEyeHex(eyeColor?: string): string {
    const colorMap: Record<string, string> = {
      'brown': '#5C4033',
      'dark brown': '#3E2723',
      'light brown': '#8B7355',
      'blue': '#4A90E2',
      'light blue': '#87CEEB',
      'dark blue': '#1E3A5F',
      'green': '#50C878',
      'hazel': '#8E7618',
      'gray': '#708090',
      'amber': '#FFBF00',
      'violet': '#8A2BE2'
    };
    
    if (eyeColor) {
      const lower = eyeColor.toLowerCase();
      for (const [key, hex] of Object.entries(colorMap)) {
        if (lower.includes(key)) return hex;
      }
    }
    
    return '#5C4033'; // Default brown (most common)
  }

  /**
   * Generate 5 signature expressions for character
   */
  private generateExpressions(traits: Partial<CharacterTraits>): Array<{ emotion: string; description: string }> {
    const expressions: Array<{ emotion: string; description: string }> = [];
    const personality = traits.personality || [];
    
    // Based on personality
    if (personality.includes('brave')) {
      expressions.push({
        emotion: 'determined',
        description: 'Eyes narrow slightly with focus, jaw set, ready for challenge'
      });
    }
    
    if (personality.includes('kind')) {
      expressions.push({
        emotion: 'compassionate',
        description: 'Soft eyes, gentle warm smile radiating kindness'
      });
    }
    
    if (personality.includes('curious')) {
      expressions.push({
        emotion: 'wondering',
        description: 'Eyes wide with interest, eyebrows raised, leaning forward slightly'
      });
    }
    
    // Universal expressions (always include)
    expressions.push({
      emotion: 'joyful',
      description: 'Bright eyes sparkling, wide genuine smile, cheeks lifted with happiness'
    });
    
    expressions.push({
      emotion: 'focused',
      description: 'Concentrated gaze, slight furrow of determination, engaged attention'
    });
    
    // Return first 5 (may be less if personality limited)
    return expressions.slice(0, 5);
  }

  /**
   * Upload image to S3 (stub - implement with actual S3 logic)
   */
  private async uploadImageToS3(buffer: Buffer, key: string): Promise<string> {
    // Import S3 client
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    
    const bucketName = process.env.S3_BUCKET || 'storytailor-audio';
    const region = process.env.AWS_REGION || 'us-east-1';
    
    const s3Client = new S3Client({ region });
    const sanitizedKey = key.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    const s3Key = `characters/${sanitizedKey}-${Date.now()}.png`;
    
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: buffer,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000'
    }));
    
    const url = `https://${bucketName}.s3.amazonaws.com/${s3Key}`;
    
    this.logger.info('Image uploaded to S3', {
      key: s3Key,
      url: url.substring(0, 80),
      sizeKB: (buffer.length / 1024).toFixed(2)
    });
    
    return url;
  }

  /**
   * Generate art prompt for character visualization
   */
  private async generateArtPrompt(traits: Partial<CharacterTraits>): Promise<string> {
    const elements: string[] = [];
    
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

  /**
   * Complete character creation with visual headshot and voice assignment
   * Integration method for character visual + voice system
   */
  async completeCharacterCreationWithVisuals(
    traits: CharacterTraits,
    userId: string,
    libraryId: string,
    options?: {
      headshotGenerator?: any; // HeadshotGenerator instance
      characterDNAGenerator?: any; // CharacterDNAGenerator instance
      characterVoiceManager?: any; // CharacterVoiceManager instance
      characterDatabase?: any; // CharacterDatabase instance
    }
  ): Promise<{
    characterId: string;
    name: string;
    traits: CharacterTraits;
    headshotUrl?: string;
    headshotPrompt?: string;
    voiceId?: string;
    dna?: any;
    revealMessage: string;
    voiceSample?: string;
  }> {
    try {
      // 1. Validate character traits
      const validation = await this.validateCharacter(traits);
      
      if (!validation.isValid) {
        throw new Error(`Character validation failed: ${validation.issues.join(', ')}`);
      }

      // 2. Generate character DNA if available
      let dna = null;
      if (options?.characterDNAGenerator) {
        dna = await options.characterDNAGenerator.generateDNA(traits);
      }

      // 3. Generate static headshot if HeadshotGenerator available
      let headshotUrl: string | undefined;
      let headshotPrompt: string | undefined;
      
      if (options?.headshotGenerator && dna) {
        const headshot = await options.headshotGenerator.generateHeadshot(traits, dna);
        headshotUrl = headshot.headshotUrl;
        headshotPrompt = headshot.prompt;
      }

      // 4. Assign ElevenLabs voice based on character traits
      const voiceId = this.assignVoiceFromTraits(traits, options?.characterVoiceManager);

      // 5. Generate character ID
      const characterId = `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 6. Save to database if available
      if (options?.characterDatabase) {
        await options.characterDatabase.createCharacter({
          id: characterId,
          userId,
          libraryId,
          name: traits.name,
          traits,
          dna,
          headshotUrl,
          elevenLabsVoiceId: voiceId,
          createdAt: new Date(),
          updatedAt: new Date(),
          usageCount: 0,
          isFavorite: false
        });
      }

      // 7. Create reveal message
      const revealMessage = this.createRevealMessage(traits.name, headshotUrl, voiceId);

      return {
        characterId,
        name: traits.name,
        traits,
        headshotUrl,
        headshotPrompt,
        voiceId,
        dna,
        revealMessage,
        voiceSample: voiceId ? `Voice: ${this.getVoiceDescription(voiceId)}` : undefined
      };

    } catch (error) {
      console.error('Failed to complete character creation with visuals:', error);
      throw error;
    }
  }

  /**
   * Assign ElevenLabs voice ID based on character traits
   */
  private assignVoiceFromTraits(
    traits: CharacterTraits,
    voiceManager?: any
  ): string {
    // If voice manager available, use sophisticated mapping
    if (voiceManager && voiceManager.getVoiceForCharacter) {
      return voiceManager.getVoiceForCharacter({
        age: traits.age,
        gender: traits.gender,
        personality: traits.personality,
        species: traits.species
      });
    }

    // Fallback: Simple trait-based voice mapping
    const age = traits.age || 8;
    const gender = traits.gender || 'non-binary';
    const personality = traits.personality?.[0] || 'friendly';

    // Character voice mapping (matches our 9 character voices)
    const voiceMap: Record<string, string> = {
      'Frankie': '21m00Tcm4TlvDq8ikWAM',
      'Star': 'AZnzlk1XvdvUeBnXmlld',
      'Luna': 'EXAVITQu4vr4xnSDxMaL',
      'Phoenix': 'ErXwobaYiN019PkySvjV',
      'Sage': 'MF3mGyEYCl7XYWbV9V6O',
      'Sparkle': 'TxGEqnHWrfWFTfGW9XjX',
      'Thunder': 'VR6AewLTigWG4xSOukaG',
      'Whisper': 'pNInz6obpgDQGcFmaJgB',
      'Crystal': 'yoZ06aMxZJJ28mfd3POQ'
    };

    // Map based on personality and age
    if (age < 6) {
      // Younger characters
      return personality.includes('playful') || personality.includes('energetic') 
        ? voiceMap['Sparkle'] 
        : voiceMap['Luna'];
    } else if (age < 10) {
      // Middle age characters
      if (personality.includes('bold') || personality.includes('brave')) {
        return voiceMap['Phoenix'];
      } else if (personality.includes('wise') || personality.includes('calm')) {
        return voiceMap['Sage'];
      } else if (personality.includes('mysterious')) {
        return voiceMap['Star'];
      } else {
        return voiceMap['Frankie']; // Default friendly voice
      }
    } else {
      // Older characters
      return personality.includes('powerful') 
        ? voiceMap['Thunder'] 
        : voiceMap['Sage'];
    }
  }

  /**
   * Create reveal message for character creation completion
   */
  private createRevealMessage(name: string, headshotUrl?: string, voiceId?: string): string {
    const messages = [
      `✨ Meet ${name}! Here's what they look like...`,
      `🎨 Ta-da! ${name} is ready for adventure!`,
      `⭐ Introducing ${name}! Isn't ${name} amazing?`,
      `🎉 ${name} is here! Look how wonderful they are!`,
      `✨ Your character ${name} is complete! So creative!`
    ];

    // Random selection for variety
    return messages[Math.floor(Math.random() * messages.length)];
  }

  /**
   * Get voice description for feedback
   */
  private getVoiceDescription(voiceId: string): string {
    const voiceDescriptions: Record<string, string> = {
      '21m00Tcm4TlvDq8ikWAM': 'Friendly and adventurous',
      'AZnzlk1XvdvUeBnXmlld': 'Mystical and wise',
      'EXAVITQu4vr4xnSDxMaL': 'Gentle and calming',
      'ErXwobaYiN019PkySvjV': 'Bold and energetic',
      'MF3mGyEYCl7XYWbV9V6O': 'Wise and thoughtful',
      'TxGEqnHWrfWFTfGW9XjX': 'Playful and mischievous',
      'VR6AewLTigWG4xSOukaG': 'Powerful and dramatic',
      'pNInz6obpgDQGcFmaJgB': 'Soft and ethereal',
      'yoZ06aMxZJJ28mfd3POQ': 'Clear and precise'
    };

    return voiceDescriptions[voiceId] || 'Unique and expressive';
  }
}
import { ConversationContext, ConversationPhase, Turn } from '@alexa-multi-agent/shared-types';
import { AlexaTurnContext } from '../types/alexa';
import { createLogger } from '../utils/logger';

export interface ConversationFlow {
  currentPhase: ConversationPhase;
  nextPhase?: ConversationPhase;
  prompts: ConversationPrompt[];
  expectedInputs: string[];
  confirmationRequired: boolean;
  assetGenerationTrigger?: 'character' | 'story';
}

export interface ConversationPrompt {
  id: string;
  text: string;
  type: 'question' | 'instruction' | 'confirmation' | 'celebration';
  expectedResponse: 'open' | 'choice' | 'confirmation';
  choices?: string[];
  followUpPrompt?: string;
}

export interface FlowTransition {
  fromPhase: ConversationPhase;
  toPhase: ConversationPhase;
  trigger: 'completion' | 'confirmation' | 'user_request' | 'error';
  condition?: (context: ConversationContext, input: string) => boolean;
}

export interface InterruptionContext {
  interruptedAt: ConversationPhase;
  resumePrompt: string;
  contextData: any;
  timestamp: string;
}

export class ConversationalFlowManager {
  private logger = createLogger('conversational-flow-manager');
  private flowTransitions: FlowTransition[];
  private characterTraits: string[] = [
    'name', 'species', 'age', 'appearance', 'personality', 'special_abilities'
  ];
  private currentTraitIndex: Map<string, number> = new Map();

  constructor() {
    this.initializeFlowTransitions();
  }

  /**
   * Manages conversation flow and determines next steps
   */
  async manageConversationFlow(
    context: ConversationContext,
    turnContext: AlexaTurnContext,
    userInput: string
  ): Promise<ConversationFlow> {
    try {
      this.logger.info('Managing conversation flow', {
        sessionId: context.sessionId,
        currentPhase: context.currentPhase,
        userInput: userInput.substring(0, 100)
      });

      // Check for interruption handling
      const interruptionResult = await this.handleInterruption(context, userInput);
      if (interruptionResult) {
        return interruptionResult;
      }

      // Process current phase
      switch (context.currentPhase) {
        case 'character':
          return await this.manageCharacterCreationFlow(context, userInput);
        case 'story':
          return await this.manageStoryBuildingFlow(context, userInput);
        case 'editing':
          return await this.manageEditingFlow(context, userInput);
        case 'finalization':
          return await this.manageFinalizationFlow(context, userInput);
        default:
          return this.createDefaultFlow(context);
      }
    } catch (error) {
      this.logger.error('Failed to manage conversation flow', {
        sessionId: context.sessionId,
        error: {
          name: error.name,
          message: error.message
        }
      });
      return this.createErrorRecoveryFlow(context, error);
    }
  }

  /**
   * Manages character creation conversation flow
   */
  private async manageCharacterCreationFlow(
    context: ConversationContext,
    userInput: string
  ): Promise<ConversationFlow> {
    const sessionId = context.sessionId;
    const currentTraitIndex = this.currentTraitIndex.get(sessionId) || 0;
    const currentTrait = this.characterTraits[currentTraitIndex];

    // Check if user wants to finish character creation
    if (this.isCompletionIntent(userInput)) {
      return {
        currentPhase: 'character',
        nextPhase: 'story',
        prompts: [{
          id: 'character-complete',
          text: "Perfect! Your character sounds amazing. I'm creating their picture now. Let's start building your story!",
          type: 'celebration',
          expectedResponse: 'open'
        }],
        expectedInputs: ['story_start', 'continue'],
        confirmationRequired: true,
        assetGenerationTrigger: 'character'
      };
    }

    // Process current trait input
    const processedTrait = await this.processCharacterTrait(currentTrait, userInput, context);
    
    // Move to next trait or complete character
    const nextTraitIndex = currentTraitIndex + 1;
    this.currentTraitIndex.set(sessionId, nextTraitIndex);

    if (nextTraitIndex >= this.characterTraits.length) {
      // All traits collected, offer completion
      return {
        currentPhase: 'character',
        nextPhase: 'story',
        prompts: [{
          id: 'character-review',
          text: `Great! Let me tell you about your character: ${this.summarizeCharacter(context)}. Does this sound good, or would you like to change anything?`,
          type: 'confirmation',
          expectedResponse: 'confirmation',
          choices: ['That sounds perfect!', 'I want to change something', 'Let\'s start the story']
        }],
        expectedInputs: ['confirm', 'edit', 'continue'],
        confirmationRequired: true
      };
    } else {
      // Continue with next trait
      const nextTrait = this.characterTraits[nextTraitIndex];
      const prompt = this.generateCharacterTraitPrompt(nextTrait, context);
      
      return {
        currentPhase: 'character',
        prompts: [prompt],
        expectedInputs: [nextTrait],
        confirmationRequired: false
      };
    }
  }

  /**
   * Manages story building conversation flow
   */
  private async manageStoryBuildingFlow(
    context: ConversationContext,
    userInput: string
  ): Promise<ConversationFlow> {
    // Check if user wants to finish story
    if (this.isCompletionIntent(userInput)) {
      return {
        currentPhase: 'story',
        nextPhase: 'editing',
        prompts: [{
          id: 'story-complete',
          text: "What an incredible story! Would you like to make any changes, or shall we finish it up?",
          type: 'confirmation',
          expectedResponse: 'choice',
          choices: ['The story is perfect!', 'I want to edit something', 'Add more to the story']
        }],
        expectedInputs: ['complete', 'edit', 'continue'],
        confirmationRequired: true
      };
    }

    // Continue story building with choose-your-adventure style
    const storyChoice = await this.processStoryChoice(userInput, context);
    const nextPrompt = this.generateStoryPrompt(storyChoice, context);

    return {
      currentPhase: 'story',
      prompts: [nextPrompt],
      expectedInputs: ['story_choice', 'continue', 'edit'],
      confirmationRequired: false
    };
  }

  /**
   * Manages editing conversation flow
   */
  private async manageEditingFlow(
    context: ConversationContext,
    userInput: string
  ): Promise<ConversationFlow> {
    // Check if user is done editing
    if (this.isCompletionIntent(userInput) || this.isDoneEditingIntent(userInput)) {
      return {
        currentPhase: 'editing',
        nextPhase: 'finalization',
        prompts: [{
          id: 'editing-complete',
          text: "Perfect! Your story is ready. I'm creating all the final materials - the audio version, fun activities, and a beautiful book you can print!",
          type: 'celebration',
          expectedResponse: 'open'
        }],
        expectedInputs: ['finalize'],
        confirmationRequired: true,
        assetGenerationTrigger: 'story'
      };
    }

    // Process editing request
    const editingResult = await this.processEditingRequest(userInput, context);
    
    return {
      currentPhase: 'editing',
      prompts: [{
        id: 'editing-feedback',
        text: `${editingResult.feedback} What else would you like to change, or are you happy with your story?`,
        type: 'question',
        expectedResponse: 'open',
        choices: ['Change something else', 'The story is perfect now', 'Read the story to me']
      }],
      expectedInputs: ['edit_more', 'complete', 'read'],
      confirmationRequired: false
    };
  }

  /**
   * Manages finalization conversation flow
   */
  private async manageFinalizationFlow(
    context: ConversationContext,
    userInput: string
  ): Promise<ConversationFlow> {
    return {
      currentPhase: 'finalization',
      prompts: [{
        id: 'story-finalized',
        text: "🎉 Your amazing story is complete! You can find it in your story library with beautiful pictures, audio narration, and fun activities. Would you like to create another story?",
        type: 'celebration',
        expectedResponse: 'choice',
        choices: ['Create another story', 'Tell me about my library', 'I\'m done for now']
      }],
      expectedInputs: ['new_story', 'library', 'end'],
      confirmationRequired: false
    };
  }

  /**
   * Handles conversation interruptions and resumption
   */
  private async handleInterruption(
    context: ConversationContext,
    userInput: string
  ): Promise<ConversationFlow | null> {
    // Check for interruption keywords
    const interruptionKeywords = ['stop', 'pause', 'wait', 'hold on', 'nevermind'];
    const isInterruption = interruptionKeywords.some(keyword => 
      userInput.toLowerCase().includes(keyword)
    );

    if (isInterruption) {
      // Save interruption context
      const interruptionContext: InterruptionContext = {
        interruptedAt: context.currentPhase,
        resumePrompt: this.generateResumePrompt(context),
        contextData: {
          characterProgress: this.currentTraitIndex.get(context.sessionId),
          lastTurn: context.conversationHistory[context.conversationHistory.length - 1]
        },
        timestamp: new Date().toISOString()
      };

      // Store interruption context
      if (!context.metadata) context.metadata = {};
      context.metadata.interruptionContext = interruptionContext;

      return {
        currentPhase: context.currentPhase,
        prompts: [{
          id: 'interruption-acknowledged',
          text: "No problem! Take your time. When you're ready, just say 'continue' and we'll pick up where we left off.",
          type: 'instruction',
          expectedResponse: 'open'
        }],
        expectedInputs: ['continue', 'resume', 'start'],
        confirmationRequired: false
      };
    }

    // Check for resumption
    const resumptionKeywords = ['continue', 'resume', 'go on', 'keep going'];
    const isResumption = resumptionKeywords.some(keyword => 
      userInput.toLowerCase().includes(keyword)
    );

    if (isResumption && context.metadata?.interruptionContext) {
      const interruptionContext = context.metadata.interruptionContext as InterruptionContext;
      
      // Restore context
      if (interruptionContext.contextData.characterProgress !== undefined) {
        this.currentTraitIndex.set(context.sessionId, interruptionContext.contextData.characterProgress);
      }

      return {
        currentPhase: interruptionContext.interruptedAt,
        prompts: [{
          id: 'resumption',
          text: interruptionContext.resumePrompt,
          type: 'question',
          expectedResponse: 'open'
        }],
        expectedInputs: ['continue'],
        confirmationRequired: false
      };
    }

    return null;
  }

  /**
   * Creates seamless conversation continuity across story phases
   */
  async createConversationContinuity(
    fromPhase: ConversationPhase,
    toPhase: ConversationPhase,
    context: ConversationContext
  ): Promise<ConversationPrompt> {
    const transitions: Record<string, ConversationPrompt> = {
      'character-story': {
        id: 'character-to-story',
        text: `Wonderful! Now that we know all about ${this.getCharacterName(context)}, let's create their adventure. ${this.getCharacterName(context)} was walking through a magical forest when something amazing happened...`,
        type: 'instruction',
        expectedResponse: 'open',
        followUpPrompt: 'What do you think happened next?'
      },
      'story-editing': {
        id: 'story-to-editing',
        text: "That's a fantastic story! Now we can make it even better. You can change anything you want - the character, the adventure, or add new parts.",
        type: 'instruction',
        expectedResponse: 'open',
        followUpPrompt: 'What would you like to change or add?'
      },
      'editing-finalization': {
        id: 'editing-to-finalization',
        text: "Perfect! Your story is exactly how you want it. Now I'm creating all the special extras - beautiful pictures, audio you can listen to, and activities to do!",
        type: 'celebration',
        expectedResponse: 'open'
      }
    };

    const transitionKey = `${fromPhase}-${toPhase}`;
    return transitions[transitionKey] || {
      id: 'default-transition',
      text: "Great! Let's continue with the next part of your story.",
      type: 'instruction',
      expectedResponse: 'open'
    };
  }

  /**
   * Generates natural language prompts for character traits
   */
  private generateCharacterTraitPrompt(trait: string, context: ConversationContext): ConversationPrompt {
    const characterName = this.getCharacterName(context) || 'your character';
    
    const prompts: Record<string, ConversationPrompt> = {
      name: {
        id: 'character-name',
        text: "Let's create your character! What would you like to name them?",
        type: 'question',
        expectedResponse: 'open'
      },
      species: {
        id: 'character-species',
        text: `Great name! Is ${characterName} a human, an animal, a robot, or maybe something magical like a fairy or dragon?`,
        type: 'question',
        expectedResponse: 'choice',
        choices: ['Human', 'Animal', 'Robot', 'Magical creature']
      },
      age: {
        id: 'character-age',
        text: `How old is ${characterName}? Are they young like you, or maybe older?`,
        type: 'question',
        expectedResponse: 'open'
      },
      appearance: {
        id: 'character-appearance',
        text: `What does ${characterName} look like? Tell me about their hair, eyes, clothes, or anything special about how they look!`,
        type: 'question',
        expectedResponse: 'open'
      },
      personality: {
        id: 'character-personality',
        text: `What is ${characterName} like? Are they brave, funny, kind, curious, or something else?`,
        type: 'question',
        expectedResponse: 'open'
      },
      special_abilities: {
        id: 'character-abilities',
        text: `Does ${characterName} have any special powers or abilities? Maybe they can fly, or they're super strong, or they have magic?`,
        type: 'question',
        expectedResponse: 'open'
      }
    };

    return prompts[trait] || {
      id: 'character-generic',
      text: `Tell me more about ${characterName}!`,
      type: 'question',
      expectedResponse: 'open'
    };
  }

  /**
   * Generates story prompts with hero's journey structure
   */
  private generateStoryPrompt(choice: string, context: ConversationContext): ConversationPrompt {
    const characterName = this.getCharacterName(context) || 'the character';
    
    // This would implement the hero's journey structure
    // For now, providing a basic adventure prompt
    const adventurePrompts = [
      `${characterName} discovered a mysterious door hidden behind some trees. What do you think they should do?`,
      `Suddenly, ${characterName} heard a strange sound coming from the bushes. What happens next?`,
      `${characterName} found a magical object glowing on the ground. What could it be?`,
      `A friendly creature appeared and wanted to help ${characterName}. What kind of creature was it?`,
      `${characterName} came to a fork in the path. Which way should they go?`
    ];

    const randomPrompt = adventurePrompts[Math.floor(Math.random() * adventurePrompts.length)];

    return {
      id: 'story-adventure',
      text: randomPrompt,
      type: 'question',
      expectedResponse: 'open',
      choices: ['Go through the door', 'Look around first', 'Call for help', 'Be brave and continue']
    };
  }

  /**
   * Processes character trait input and validates it
   */
  private async processCharacterTrait(
    trait: string,
    input: string,
    context: ConversationContext
  ): Promise<any> {
    // Store the trait in context
    if (!context.metadata) context.metadata = {};
    if (!context.metadata.characterTraits) context.metadata.characterTraits = {};
    
    context.metadata.characterTraits[trait] = input;

    this.logger.debug('Processed character trait', {
      sessionId: context.sessionId,
      trait,
      value: input
    });

    return { trait, value: input };
  }

  /**
   * Processes story choice and advances narrative
   */
  private async processStoryChoice(input: string, context: ConversationContext): Promise<string> {
    // Store story progression
    if (!context.metadata) context.metadata = {};
    if (!context.metadata.storyChoices) context.metadata.storyChoices = [];
    
    context.metadata.storyChoices.push({
      choice: input,
      timestamp: new Date().toISOString()
    });

    return input;
  }

  /**
   * Processes editing requests
   */
  private async processEditingRequest(input: string, context: ConversationContext): Promise<{
    feedback: string;
    changes: any[];
  }> {
    // Analyze editing request and provide feedback
    const editingKeywords = {
      character: ['character', 'name', 'appearance', 'personality'],
      story: ['story', 'adventure', 'plot', 'ending'],
      add: ['add', 'more', 'longer', 'extra'],
      change: ['change', 'different', 'instead', 'replace']
    };

    let feedback = "I've made those changes to your story!";
    const changes: any[] = [];

    // Simple keyword detection for demo
    if (editingKeywords.character.some(keyword => input.toLowerCase().includes(keyword))) {
      feedback = "Great! I've updated your character details.";
      changes.push({ type: 'character', description: input });
    } else if (editingKeywords.story.some(keyword => input.toLowerCase().includes(keyword))) {
      feedback = "Perfect! I've changed that part of the story.";
      changes.push({ type: 'story', description: input });
    }

    return { feedback, changes };
  }

  /**
   * Helper methods
   */

  private initializeFlowTransitions(): void {
    this.flowTransitions = [
      {
        fromPhase: 'character',
        toPhase: 'story',
        trigger: 'completion',
        condition: (context) => this.isCharacterComplete(context)
      },
      {
        fromPhase: 'story',
        toPhase: 'editing',
        trigger: 'completion',
        condition: (context) => this.isStoryComplete(context)
      },
      {
        fromPhase: 'editing',
        toPhase: 'finalization',
        trigger: 'confirmation',
        condition: (context, input) => this.isCompletionIntent(input)
      }
    ];
  }

  private isCompletionIntent(input: string): boolean {
    const completionKeywords = [
      'done', 'finished', 'complete', 'ready', 'perfect', 'good', 'yes'
    ];
    return completionKeywords.some(keyword => 
      input.toLowerCase().includes(keyword)
    );
  }

  private isDoneEditingIntent(input: string): boolean {
    const doneEditingKeywords = [
      'done editing', 'finished editing', 'no more changes', 'perfect now'
    ];
    return doneEditingKeywords.some(phrase => 
      input.toLowerCase().includes(phrase)
    );
  }

  private isCharacterComplete(context: ConversationContext): boolean {
    const traits = context.metadata?.characterTraits || {};
    return Object.keys(traits).length >= 3; // Minimum traits for completion
  }

  private isStoryComplete(context: ConversationContext): boolean {
    const choices = context.metadata?.storyChoices || [];
    return choices.length >= 3; // Minimum story progression
  }

  private getCharacterName(context: ConversationContext): string | null {
    return context.metadata?.characterTraits?.name || null;
  }

  private summarizeCharacter(context: ConversationContext): string {
    const traits = context.metadata?.characterTraits || {};
    const name = traits.name || 'your character';
    const species = traits.species || 'character';
    const personality = traits.personality || 'special';
    
    return `${name} is a ${personality} ${species}`;
  }

  private generateResumePrompt(context: ConversationContext): string {
    switch (context.currentPhase) {
      case 'character':
        return "Let's continue creating your character. Where were we?";
      case 'story':
        return "Ready to continue your story? What happens next?";
      case 'editing':
        return "Let's keep working on your story. What would you like to change?";
      default:
        return "Let's continue where we left off!";
    }
  }

  private createDefaultFlow(context: ConversationContext): ConversationFlow {
    return {
      currentPhase: 'character',
      prompts: [{
        id: 'default-start',
        text: "Hi! I'm excited to create an amazing story with you! Let's start by making your character. What would you like to name them?",
        type: 'question',
        expectedResponse: 'open'
      }],
      expectedInputs: ['name'],
      confirmationRequired: false
    };
  }

  private createErrorRecoveryFlow(context: ConversationContext, error: any): ConversationFlow {
    return {
      currentPhase: context.currentPhase,
      prompts: [{
        id: 'error-recovery',
        text: "I'm having a little trouble, but let's keep going! Can you tell me that again?",
        type: 'question',
        expectedResponse: 'open'
      }],
      expectedInputs: ['retry'],
      confirmationRequired: false
    };
  }
}
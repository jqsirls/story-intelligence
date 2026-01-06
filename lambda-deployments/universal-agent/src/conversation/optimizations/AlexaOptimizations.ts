import { Logger } from 'winston';

/**
 * Alexa-specific optimizations for voice-first interactions
 */
export class AlexaOptimizations {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Optimize content for Alexa voice delivery
   */
  optimizeForVoiceDelivery(content: string, context: AlexaContext): string {
    let optimized = content;

    // Apply voice-specific optimizations
    optimized = this.addNaturalPauses(optimized);
    optimized = this.emphasizeKeyWords(optimized);
    optimized = this.adjustPacingForNames(optimized);
    optimized = this.addEmotionalInflection(optimized, context);
    optimized = this.optimizeForChildAudience(optimized, context);

    this.logger.debug('Content optimized for Alexa voice delivery', {
      originalLength: content.length,
      optimizedLength: optimized.length,
      hasEmphasis: optimized.includes('<emphasis>'),
      hasProsody: optimized.includes('<prosody>')
    });

    return optimized;
  }

  /**
   * Create APL (Alexa Presentation Language) directives for Echo Show devices
   */
  createAPLDirective(content: string, context: AlexaContext): any {
    const directive = {
      type: 'Alexa.Presentation.APL.RenderDocument',
      version: '1.8',
      document: {
        type: 'APL',
        version: '1.8',
        theme: 'dark',
        import: [
          {
            name: 'alexa-layouts',
            version: '1.3.0'
          }
        ],
        mainTemplate: {
          parameters: ['payload'],
          items: this.createAPLLayout(content, context)
        }
      },
      datasources: {
        storytailorData: this.createAPLDatasource(content, context)
      }
    };

    this.logger.debug('APL directive created', {
      hasVisualElements: directive.document.mainTemplate.items.length > 0,
      theme: directive.document.theme
    });

    return directive;
  }

  /**
   * Optimize response timing for Alexa's 8-second limit
   */
  optimizeResponseTiming(content: string, maxDuration: number = 8000): string {
    const estimatedDuration = this.estimateSpeechDuration(content);
    
    if (estimatedDuration <= maxDuration) {
      return content;
    }

    // Truncate and add continuation prompt
    const wordsPerSecond = 2.5; // Average speaking rate
    const maxWords = Math.floor((maxDuration / 1000) * wordsPerSecond * 0.9); // 90% buffer
    const words = content.split(' ');
    
    if (words.length > maxWords) {
      const truncated = words.slice(0, maxWords).join(' ');
      return `${truncated}... Would you like me to continue?`;
    }

    return content;
  }

  /**
   * Create session attributes for conversation continuity
   */
  createSessionAttributes(conversationState: any, context: AlexaContext): Record<string, any> {
    return {
      conversationPhase: conversationState.phase,
      storyType: conversationState.currentStory?.type,
      characterName: conversationState.currentCharacter?.name,
      lastInteraction: new Date().toISOString(),
      voiceSettings: context.voiceSettings,
      userPreferences: {
        storyLength: context.userPreferences?.storyLength || 'medium',
        interactionStyle: context.userPreferences?.interactionStyle || 'guided'
      },
      sessionMetadata: {
        totalInteractions: conversationState.context?.totalInteractions || 0,
        sessionStartTime: context.sessionStartTime,
        deviceType: context.deviceType
      }
    };
  }

  /**
   * Handle Alexa-specific intents and slots
   */
  processAlexaIntent(intent: AlexaIntent, slots: Record<string, any>): ProcessedIntent {
    const processed: ProcessedIntent = {
      action: this.mapIntentToAction(intent.name),
      parameters: this.extractSlotValues(slots),
      confidence: intent.confirmationStatus === 'CONFIRMED' ? 1.0 : 0.8,
      requiresConfirmation: this.requiresConfirmation(intent.name),
      metadata: {
        originalIntent: intent.name,
        confirmationStatus: intent.confirmationStatus,
        dialogState: intent.dialogState
      }
    };

    this.logger.debug('Alexa intent processed', {
      intentName: intent.name,
      action: processed.action,
      parameterCount: Object.keys(processed.parameters).length,
      confidence: processed.confidence
    });

    return processed;
  }

  /**
   * Generate reprompt for better conversation flow
   */
  generateReprompt(context: AlexaContext, conversationPhase: string): string {
    const reprompts = {
      greeting: [
        "You can say 'create a story' or 'make a character'",
        "Try saying 'I want to make a bedtime story' or 'create an adventure'",
        "What kind of story would you like to create today?"
      ],
      character_creation: [
        "You can describe your character or say 'yes' or 'no'",
        "Tell me more about your character, or say 'that sounds good'",
        "What would you like to change about your character?"
      ],
      story_building: [
        "You can say 'continue', 'change that', or 'that's perfect'",
        "What happens next in your story?",
        "Would you like to edit something or keep going?"
      ],
      editing: [
        "You can say 'change the character', 'edit the story', or 'I'm done'",
        "What would you like to modify?",
        "Say 'finish' when you're happy with your story"
      ]
    };

    const phaseReprompts = reprompts[conversationPhase as keyof typeof reprompts] || reprompts.greeting;
    const randomIndex = Math.floor(Math.random() * phaseReprompts.length);
    
    return phaseReprompts[randomIndex];
  }

  /**
   * Handle progressive response for long content
   */
  createProgressiveResponse(content: string, context: AlexaContext): ProgressiveResponse {
    const chunks = this.splitIntoChunks(content, 6000); // 6 second chunks
    
    return {
      initialResponse: chunks[0],
      followUpChunks: chunks.slice(1),
      hasMore: chunks.length > 1,
      progressiveToken: this.generateProgressiveToken(),
      metadata: {
        totalChunks: chunks.length,
        estimatedTotalDuration: this.estimateSpeechDuration(content)
      }
    };
  }

  // Private helper methods

  private addNaturalPauses(content: string): string {
    return content
      .replace(/\. /g, '. <break time="0.5s"/> ')
      .replace(/\? /g, '? <break time="0.3s"/> ')
      .replace(/! /g, '! <break time="0.3s"/> ')
      .replace(/\, /g, ', <break time="0.2s"/> ');
  }

  private emphasizeKeyWords(content: string): string {
    return content
      .replace(/\b(amazing|wonderful|exciting|magical|incredible|fantastic)\b/gi, '<emphasis level="moderate">$1</emphasis>')
      .replace(/\b(very|really|super|extremely)\s+(\w+)/gi, '<emphasis level="strong">$1 $2</emphasis>')
      .replace(/\b(yes|no|perfect|great|awesome)\b/gi, '<emphasis level="moderate">$1</emphasis>');
  }

  private adjustPacingForNames(content: string): string {
    // Slow down for character names and important terms
    return content
      .replace(/\b([A-Z][a-z]+)\b/g, '<prosody rate="90%">$1</prosody>')
      .replace(/\b(character|story|adventure|bedtime|birthday)\b/gi, '<prosody rate="95%">$1</prosody>');
  }

  private addEmotionalInflection(content: string, context: AlexaContext): string {
    const emotion = context.voiceSettings?.emotion || 'warm';
    
    switch (emotion) {
      case 'excited':
        return content
          .replace(/\b(happy|joy|excited|fun|play)\b/gi, '<prosody pitch="+15%" rate="110%">$1</prosody>')
          .replace(/!/g, '<prosody pitch="+10%">!</prosody>');
      
      case 'calm':
        return content
          .replace(/\b(peaceful|calm|gentle|soft|quiet)\b/gi, '<prosody pitch="-5%" rate="90%">$1</prosody>');
      
      case 'mysterious':
        return content
          .replace(/\b(mystery|secret|hidden|magic|mysterious)\b/gi, '<prosody pitch="-10%" rate="85%">$1</prosody>');
      
      default:
        return content;
    }
  }

  private optimizeForChildAudience(content: string, context: AlexaContext): string {
    const age = context.userAge || 7;
    
    if (age <= 5) {
      // Slower pace, simpler words, more enthusiasm
      return `<prosody rate="85%" pitch="+5%">${content}</prosody>`;
    } else if (age <= 8) {
      // Moderate pace, clear pronunciation
      return `<prosody rate="95%">${content}</prosody>`;
    }
    
    return content; // Normal pace for older children
  }

  private createAPLLayout(content: string, context: AlexaContext): any[] {
    const items = [];

    // Header
    items.push({
      type: 'AlexaHeader',
      headerTitle: this.getHeaderTitle(context),
      headerSubtitle: 'Storytailor',
      headerBackButton: false,
      headerDivider: true
    });

    // Main content area
    items.push({
      type: 'Container',
      direction: 'column',
      paddingLeft: '40dp',
      paddingRight: '40dp',
      paddingTop: '20dp',
      items: [
        {
          type: 'Text',
          text: this.stripSSML(content),
          fontSize: '28dp',
          fontWeight: '300',
          textAlign: 'center',
          color: 'white',
          maxLines: 4
        }
      ]
    });

    // Add character image if available
    if (context.currentCharacter?.imageUrl) {
      items.push({
        type: 'Image',
        source: context.currentCharacter.imageUrl,
        scale: 'best-fit',
        width: '200dp',
        height: '200dp',
        borderRadius: '100dp',
        align: 'center'
      });
    }

    // Add story progress if in story building phase
    if (context.conversationPhase === 'story_building' && context.storyProgress) {
      items.push({
        type: 'Container',
        direction: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '20dp',
        items: [
          {
            type: 'Text',
            text: 'Story Progress:',
            fontSize: '20dp',
            color: 'white'
          },
          {
            type: 'Frame',
            backgroundColor: '#333333',
            borderRadius: '10dp',
            paddingLeft: '10dp',
            paddingRight: '10dp',
            paddingTop: '5dp',
            paddingBottom: '5dp',
            item: {
              type: 'Text',
              text: `${context.storyProgress}%`,
              fontSize: '18dp',
              color: '#00ff00'
            }
          }
        ]
      });
    }

    return items;
  }

  private createAPLDatasource(content: string, context: AlexaContext): any {
    return {
      title: this.getHeaderTitle(context),
      content: this.stripSSML(content),
      character: context.currentCharacter || null,
      story: context.currentStory || null,
      progress: context.storyProgress || 0,
      phase: context.conversationPhase || 'greeting'
    };
  }

  private getHeaderTitle(context: AlexaContext): string {
    switch (context.conversationPhase) {
      case 'character_creation':
        return context.currentCharacter?.name 
          ? `Creating ${context.currentCharacter.name}`
          : 'Creating Your Character';
      case 'story_building':
        return context.currentStory?.title || 'Building Your Story';
      case 'editing':
        return 'Editing Your Story';
      default:
        return 'Storytailor';
    }
  }

  private stripSSML(content: string): string {
    return content
      .replace(/<speak>/g, '')
      .replace(/<\/speak>/g, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  private estimateSpeechDuration(content: string): number {
    const words = this.stripSSML(content).split(' ').length;
    const wordsPerMinute = 150; // Average speaking rate
    return (words / wordsPerMinute) * 60 * 1000; // Convert to milliseconds
  }

  private mapIntentToAction(intentName: string): string {
    const intentMap: Record<string, string> = {
      'CreateStoryIntent': 'create_story',
      'CreateCharacterIntent': 'create_character',
      'EditStoryIntent': 'edit_story',
      'EditCharacterIntent': 'edit_character',
      'ContinueStoryIntent': 'continue_story',
      'FinishStoryIntent': 'finish_story',
      'AMAZON.YesIntent': 'confirm',
      'AMAZON.NoIntent': 'deny',
      'AMAZON.StopIntent': 'stop',
      'AMAZON.CancelIntent': 'cancel',
      'AMAZON.HelpIntent': 'help',
      'AMAZON.RepeatIntent': 'repeat'
    };

    return intentMap[intentName] || 'unknown';
  }

  private extractSlotValues(slots: Record<string, any>): Record<string, any> {
    const values: Record<string, any> = {};

    for (const [slotName, slotData] of Object.entries(slots)) {
      if (slotData && slotData.value) {
        values[slotName.toLowerCase()] = {
          value: slotData.value,
          id: slotData.resolutions?.resolutionsPerAuthority?.[0]?.values?.[0]?.value?.id,
          confidence: slotData.resolutions?.resolutionsPerAuthority?.[0]?.status?.code === 'ER_SUCCESS_MATCH' ? 1.0 : 0.7
        };
      }
    }

    return values;
  }

  private requiresConfirmation(intentName: string): boolean {
    const confirmationIntents = [
      'FinishStoryIntent',
      'DeleteStoryIntent',
      'StartOverIntent'
    ];

    return confirmationIntents.includes(intentName);
  }

  private splitIntoChunks(content: string, maxDurationMs: number): string[] {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const testChunk = currentChunk + (currentChunk ? '. ' : '') + sentence.trim();
      
      if (this.estimateSpeechDuration(testChunk) <= maxDurationMs) {
        currentChunk = testChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk + '.');
          currentChunk = sentence.trim();
        } else {
          // Single sentence is too long, split by words
          const words = sentence.trim().split(' ');
          let wordChunk = '';
          
          for (const word of words) {
            const testWordChunk = wordChunk + (wordChunk ? ' ' : '') + word;
            
            if (this.estimateSpeechDuration(testWordChunk) <= maxDurationMs) {
              wordChunk = testWordChunk;
            } else {
              if (wordChunk) {
                chunks.push(wordChunk + '...');
                wordChunk = word;
              } else {
                chunks.push(word); // Single word is too long, but include it anyway
              }
            }
          }
          
          if (wordChunk) {
            currentChunk = wordChunk;
          }
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk + '.');
    }

    return chunks;
  }

  private generateProgressiveToken(): string {
    return `prog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Type definitions
interface AlexaContext {
  sessionStartTime: string;
  deviceType: 'echo' | 'echo_show' | 'echo_dot' | 'echo_auto';
  voiceSettings?: {
    voice: string;
    speed: number;
    emotion: 'excited' | 'calm' | 'mysterious' | 'warm';
  };
  userAge?: number;
  userPreferences?: {
    storyLength: 'short' | 'medium' | 'long';
    interactionStyle: 'guided' | 'free_form';
  };
  conversationPhase: string;
  currentCharacter?: {
    name: string;
    imageUrl?: string;
  };
  currentStory?: {
    title: string;
    type: string;
  };
  storyProgress?: number;
}

interface AlexaIntent {
  name: string;
  confirmationStatus: 'NONE' | 'CONFIRMED' | 'DENIED';
  dialogState: 'STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

interface ProcessedIntent {
  action: string;
  parameters: Record<string, any>;
  confidence: number;
  requiresConfirmation: boolean;
  metadata: {
    originalIntent: string;
    confirmationStatus: string;
    dialogState: string;
  };
}

interface ProgressiveResponse {
  initialResponse: string;
  followUpChunks: string[];
  hasMore: boolean;
  progressiveToken: string;
  metadata: {
    totalChunks: number;
    estimatedTotalDuration: number;
  };
}
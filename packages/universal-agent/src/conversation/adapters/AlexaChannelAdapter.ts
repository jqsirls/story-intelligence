import { ChannelAdapter, UniversalMessage, UniversalResponse, ConversationSession, ChannelSwitchContext } from '../UniversalConversationEngine';
import { Logger } from 'winston';

/**
 * Alexa+ Channel Adapter - Handles Alexa-specific conversation optimizations
 */
export class AlexaChannelAdapter extends ChannelAdapter {
  private logger: Logger;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  async initializeSession(session: ConversationSession): Promise<void> {
    this.logger.debug('Initializing Alexa session', {
      sessionId: session.sessionId,
      userId: session.userId
    });

    // Initialize Alexa-specific session state
    session.state.channelStates['alexa_plus'] = {
      sessionAttributes: {},
      shouldEndSession: false,
      cardType: 'simple',
      voiceSettings: {
        voice: session.preferences?.voice?.voice || 'storyteller',
        speed: session.preferences?.voice?.speed || 1.0,
        emotion: session.preferences?.voice?.emotion || 'warm'
      }
    };
  }

  async preprocessMessage(message: UniversalMessage, session: ConversationSession): Promise<UniversalMessage> {
    // Alexa messages are typically voice-based, ensure proper handling
    if (message.type === 'voice' && typeof message.content === 'string') {
      // Voice content is already transcribed by Alexa
      return {
        ...message,
        metadata: {
          ...message.metadata,
          alexaProcessed: true,
          originalVoice: true
        }
      };
    }

    // Handle Alexa intents and slots
    if (message.metadata && (message.metadata as any).alexaIntent) {
      const alexaMetadata = message.metadata as any;
      return {
        ...message,
        content: this.extractIntentContent(alexaMetadata.alexaIntent, alexaMetadata.slots),
        metadata: {
          ...message.metadata,
          processedIntent: alexaMetadata.alexaIntent.name,
          extractedSlots: alexaMetadata.slots
        }
      };
    }

    return message;
  }

  async postprocessResponse(response: UniversalResponse, session: ConversationSession): Promise<UniversalResponse> {
    // Optimize response for voice delivery
    if (response.type === 'text') {
      const optimizedContent = this.optimizeForVoice(response.content.toString());
      
      return {
        ...response,
        type: 'voice',
        content: optimizedContent,
        metadata: {
          ...response.metadata,
          optimizedForVoice: true,
          originalContent: response.content
        }
      };
    }

    // Ensure voice responses are properly formatted
    if (response.type === 'voice') {
      return {
        ...response,
        content: this.addSSMLTags(response.content.toString(), session),
        metadata: {
          ...response.metadata,
          ssmlEnhanced: true
        }
      };
    }

    return response;
  }

  async adaptResponse(response: UniversalResponse, session: ConversationSession): Promise<any> {
    const alexaState = session.state.channelStates['alexa_plus'] || {};

    // Create Alexa-specific response format
    const alexaResponse = {
      version: '1.0',
      sessionAttributes: alexaState.sessionAttributes || {},
      response: {
        outputSpeech: this.createOutputSpeech(response),
        shouldEndSession: !response.requiresInput,
        directives: []
      }
    };

    // Add card if appropriate
    if (this.shouldIncludeCard(response, session)) {
      alexaResponse.response.card = this.createCard(response, session);
    }

    // Add reprompt if needed
    if (response.requiresInput && response.suggestions && response.suggestions.length > 0) {
      alexaResponse.response.reprompt = {
        outputSpeech: {
          type: 'PlainText',
          text: `You can say: ${response.suggestions.slice(0, 3).join(', ')}`
        }
      };
    }

    // Add APL directive for Echo Show devices
    if (session.capabilities.supportsCards && this.hasVisualContent(response)) {
      alexaResponse.response.directives.push(this.createAPLDirective(response, session));
    }

    this.logger.debug('Alexa response adapted', {
      sessionId: session.sessionId,
      hasCard: !!alexaResponse.response.card,
      hasAPL: alexaResponse.response.directives.length > 0,
      shouldEndSession: alexaResponse.response.shouldEndSession
    });

    return alexaResponse;
  }

  async exportState(session: ConversationSession): Promise<any> {
    const alexaState = session.state.channelStates['alexa_plus'] || {};
    
    return {
      sessionAttributes: alexaState.sessionAttributes,
      voiceSettings: alexaState.voiceSettings,
      cardPreferences: alexaState.cardPreferences,
      conversationPhase: session.state.phase,
      lastInteraction: session.state.context.lastInteraction,
      storyContext: {
        currentStory: session.state.currentStory,
        currentCharacter: session.state.currentCharacter
      }
    };
  }

  async importState(session: ConversationSession, state: any, context?: ChannelSwitchContext): Promise<void> {
    if (!state) return;

    // Import Alexa-specific state
    session.state.channelStates['alexa_plus'] = {
      sessionAttributes: state.sessionAttributes || {},
      voiceSettings: state.voiceSettings || {},
      cardPreferences: state.cardPreferences || {}
    };

    // Import general conversation state
    if (state.conversationPhase) {
      session.state.phase = state.conversationPhase;
    }

    if (state.storyContext) {
      session.state.currentStory = state.storyContext.currentStory;
      session.state.currentCharacter = state.storyContext.currentCharacter;
    }

    this.logger.debug('Alexa state imported', {
      sessionId: session.sessionId,
      importedPhase: state.conversationPhase,
      hasStoryContext: !!state.storyContext,
      preserveState: context?.preserveState
    });
  }

  async cleanupSession(session: ConversationSession): Promise<void> {
    // Clean up Alexa-specific resources
    delete session.state.channelStates['alexa_plus'];
    
    this.logger.debug('Alexa session cleaned up', {
      sessionId: session.sessionId,
      userId: session.userId
    });
  }

  // Private helper methods

  private extractIntentContent(intent: any, slots: any): string {
    // Convert Alexa intent and slots to natural language
    const intentName = intent.name;
    
    switch (intentName) {
      case 'CreateStoryIntent':
        const storyType = slots?.StoryType?.value || 'story';
        return `I want to create a ${storyType}`;
      
      case 'CreateCharacterIntent':
        const characterName = slots?.CharacterName?.value || '';
        return characterName ? `Create a character named ${characterName}` : 'Create a character';
      
      case 'EditStoryIntent':
        const editType = slots?.EditType?.value || 'change';
        return `I want to ${editType} the story`;
      
      case 'AMAZON.YesIntent':
        return 'Yes';
      
      case 'AMAZON.NoIntent':
        return 'No';
      
      case 'AMAZON.StopIntent':
      case 'AMAZON.CancelIntent':
        return 'Stop';
      
      default:
        // Fallback to slot values or intent name
        const slotValues = Object.values(slots || {})
          .map((slot: any) => slot.value)
          .filter(Boolean)
          .join(' ');
        
        return slotValues || intentName.replace(/Intent$/, '').toLowerCase();
    }
  }

  private optimizeForVoice(text: string): string {
    // Optimize text for voice delivery
    return text
      // Add natural pauses
      .replace(/\. /g, '. <break time="0.5s"/> ')
      .replace(/\? /g, '? <break time="0.3s"/> ')
      .replace(/! /g, '! <break time="0.3s"/> ')
      // Emphasize important words
      .replace(/\b(amazing|wonderful|exciting|magical)\b/gi, '<emphasis level="moderate">$1</emphasis>')
      // Slow down for character names
      .replace(/\b([A-Z][a-z]+)\b/g, '<prosody rate="90%">$1</prosody>')
      // Add emotional inflection
      .replace(/\b(happy|joy|excited)\b/gi, '<prosody pitch="+10%">$1</prosody>')
      .replace(/\b(sad|worried|scared)\b/gi, '<prosody pitch="-10%">$1</prosody>');
  }

  private addSSMLTags(content: string, session: ConversationSession): string {
    const alexaState = session.state.channelStates['alexa_plus'] || {};
    const voiceSettings = alexaState.voiceSettings || {};

    // Wrap in SSML speak tags
    let ssml = `<speak>`;

    // Add voice settings
    if (voiceSettings.voice && voiceSettings.voice !== 'default') {
      ssml += `<voice name="${voiceSettings.voice}">`;
    }

    // Add prosody for speed and emotion
    const prosodyAttrs = [];
    if (voiceSettings.speed && voiceSettings.speed !== 1.0) {
      prosodyAttrs.push(`rate="${Math.round(voiceSettings.speed * 100)}%"`);
    }
    
    if (voiceSettings.emotion === 'excited') {
      prosodyAttrs.push('pitch="+5%"');
    } else if (voiceSettings.emotion === 'calm') {
      prosodyAttrs.push('pitch="-5%"');
    }

    if (prosodyAttrs.length > 0) {
      ssml += `<prosody ${prosodyAttrs.join(' ')}>`;
    }

    // Add the content (already optimized)
    ssml += content;

    // Close tags
    if (prosodyAttrs.length > 0) {
      ssml += '</prosody>';
    }
    
    if (voiceSettings.voice && voiceSettings.voice !== 'default') {
      ssml += '</voice>';
    }
    
    ssml += '</speak>';

    return ssml;
  }

  private createOutputSpeech(response: UniversalResponse): any {
    const content = response.content.toString();
    
    // Check if content already contains SSML
    if (content.includes('<speak>') || content.includes('<prosody>') || content.includes('<emphasis>')) {
      return {
        type: 'SSML',
        ssml: content.startsWith('<speak>') ? content : `<speak>${content}</speak>`
      };
    }

    return {
      type: 'PlainText',
      text: content
    };
  }

  private shouldIncludeCard(response: UniversalResponse, session: ConversationSession): boolean {
    // Include card for story creation, character details, or important information
    const content = response.content.toString().toLowerCase();
    
    return (
      content.includes('character') ||
      content.includes('story') ||
      content.includes('created') ||
      content.includes('finished') ||
      session.state.phase === 'character_creation' ||
      session.state.phase === 'story_creation'
    );
  }

  private createCard(response: UniversalResponse, session: ConversationSession): any {
    const content = response.content.toString();
    
    // Create simple card by default
    const card = {
      type: 'Simple',
      title: this.getCardTitle(session),
      content: this.stripSSML(content)
    };

    // Add image if we have character or story art
    if (session.state.currentCharacter?.appearance_url || session.state.currentStory?.cover_url) {
      return {
        type: 'Standard',
        title: card.title,
        text: card.content,
        image: {
          smallImageUrl: session.state.currentCharacter?.appearance_url || session.state.currentStory?.cover_url,
          largeImageUrl: session.state.currentCharacter?.appearance_url || session.state.currentStory?.cover_url
        }
      };
    }

    return card;
  }

  private getCardTitle(session: ConversationSession): string {
    switch (session.state.phase) {
      case 'character_creation':
        return session.state.currentCharacter?.name 
          ? `Character: ${session.state.currentCharacter.name}`
          : 'Creating Your Character';
      
      case 'story_creation':
        return session.state.currentStory?.title 
          ? `Story: ${session.state.currentStory.title}`
          : 'Creating Your Story';
      
      case 'editing':
        return 'Editing Your Story';
      
      default:
        return 'Storytailor';
    }
  }

  private hasVisualContent(response: UniversalResponse): boolean {
    // Check if response would benefit from visual elements
    const content = response.content.toString().toLowerCase();
    
    return (
      content.includes('character') ||
      content.includes('story') ||
      content.includes('picture') ||
      content.includes('image') ||
      response.type === 'card'
    );
  }

  private createAPLDirective(response: UniversalResponse, session: ConversationSession): any {
    // Create APL directive for Echo Show devices
    return {
      type: 'Alexa.Presentation.APL.RenderDocument',
      version: '1.3',
      document: {
        type: 'APL',
        version: '1.3',
        theme: 'dark',
        import: [
          {
            name: 'alexa-layouts',
            version: '1.2.0'
          }
        ],
        mainTemplate: {
          parameters: ['payload'],
          items: [
            {
              type: 'AlexaHeader',
              headerTitle: this.getCardTitle(session),
              headerSubtitle: 'Storytailor'
            },
            {
              type: 'Container',
              direction: 'column',
              items: [
                {
                  type: 'Text',
                  text: this.stripSSML(response.content.toString()),
                  fontSize: '24dp',
                  textAlign: 'center',
                  color: 'white'
                }
              ]
            }
          ]
        }
      },
      datasources: {
        payload: {
          title: this.getCardTitle(session),
          content: this.stripSSML(response.content.toString())
        }
      }
    };
  }

  private stripSSML(content: string): string {
    return content
      .replace(/<speak>/g, '')
      .replace(/<\/speak>/g, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  }
}
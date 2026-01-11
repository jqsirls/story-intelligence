type WebChatResponseShape = {
  id: string;
  type: string;
  timestamp: string;
  content: any;
  metadata: {
    confidence: number;
    agentsUsed: string[];
    responseTime: number;
  };
  ui: {
    showAvatar: boolean;
    showTimestamp: boolean;
    allowCopy: boolean;
    allowShare: boolean;
    theme: any;
  };
  quickReplies?: Array<{ id: string; text: string; payload: string }>;
  expectsReply?: boolean;
  inputHints?: any;
  richContent?: any;
  voicePlayback?: any;
};
import { ChannelAdapter, UniversalMessage, UniversalResponse, ConversationSession, ChannelSwitchContext } from '../UniversalConversationEngine';
import { Logger } from 'winston';
type WebChatState = {
  showTimestamps?: boolean;
  theme?: string;
  voiceEnabled?: boolean;
  chatHistory?: unknown[];
  autoScroll?: boolean;
  scrollPosition?: number;
  expandedMessages?: unknown[];
  temporaryFiles?: unknown[];
};

/**
 * Web Chat Channel Adapter - Handles web-based chat optimizations
 */
export class WebChatChannelAdapter extends ChannelAdapter {
  private logger: Logger;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  async initializeSession(session: ConversationSession): Promise<void> {
    this.logger.debug('Initializing web chat session', {
      sessionId: session.sessionId,
      userId: session.userId
    });

    // Initialize web chat-specific session state
    const theme =
      (session.preferences as any)?.customization?.theme ||
      'default';
    session.state.channelStates['web_chat'] = {
      chatHistory: [],
      typingIndicator: false,
      streamingEnabled: session.capabilities.supportsStreaming,
      voiceEnabled: session.capabilities.supportsVoice,
      fileUploadEnabled: session.capabilities.supportsFiles,
      theme,
      messageFormat: 'markdown',
      autoScroll: true,
      showTimestamps: true,
      showTypingIndicator: true
    };
  }

  async preprocessMessage(message: UniversalMessage, session: ConversationSession): Promise<UniversalMessage> {
    const webChatState: WebChatState = (session.state.channelStates['web_chat'] as WebChatState) || {};

    // Handle different message types
    switch (message.type) {
      case 'text':
        return this.preprocessTextMessage(message, session);
      
      case 'voice':
        return this.preprocessVoiceMessage(message, session);
      
      case 'image':
        return this.preprocessImageMessage(message, session);
      
      case 'file':
        return this.preprocessFileMessage(message, session);
      
      default:
        return message;
    }
  }

  async postprocessResponse(response: UniversalResponse, session: ConversationSession): Promise<UniversalResponse> {
    const webChatState: WebChatState = (session.state.channelStates['web_chat'] as WebChatState) || {};

    // Format response for web display
    if (response.type === 'text') {
      return {
        ...response,
        content: this.formatTextForWeb(response.content.toString()),
        metadata: {
          confidence: response.metadata.confidence,
          generationTime: response.metadata.generationTime,
          agentsUsed: response.metadata.agentsUsed,
          adaptedForChannel: true
        }
      };
    }

    // Handle voice responses in web chat
    if (response.type === 'voice' && webChatState.voiceEnabled) {
      return {
        ...response,
        alternatives: [
          {
            type: 'text',
            content: this.stripSSML(response.content.toString()),
            condition: 'voice_disabled',
            priority: 1
          }
        ],
        metadata: {
          confidence: response.metadata.confidence,
          generationTime: response.metadata.generationTime,
          agentsUsed: response.metadata.agentsUsed,
          adaptedForChannel: true
        }
      };
    }

    return response;
  }

  async adaptResponse(response: UniversalResponse, session: ConversationSession): Promise<any> {
    const webChatState: WebChatState = (session.state.channelStates['web_chat'] as WebChatState) || {};

    // Create web chat-specific response format
    const webResponse: WebChatResponseShape = {
      id: this.generateMessageId(),
      type: 'bot_message',
      timestamp: new Date().toISOString(),
      content: this.adaptContentForWeb(response),
      metadata: {
        confidence: response.metadata.confidence,
        agentsUsed: response.metadata.agentsUsed,
        responseTime: response.metadata.generationTime
      },
      ui: {
        showAvatar: true,
        showTimestamp: webChatState.showTimestamps ?? true,
        allowCopy: true,
        allowShare: true,
        theme: webChatState.theme
      }
    };

    // Add suggestions as quick reply buttons
    if (response.suggestions && response.suggestions.length > 0) {
      webResponse.quickReplies = response.suggestions.map(suggestion => ({
        id: this.generateQuickReplyId(),
        text: suggestion,
        payload: suggestion
      }));
    }

    // Add typing indicator if response requires input
    if (response.requiresInput) {
      webResponse.expectsReply = true;
      webResponse.inputHints = this.generateInputHints(response, session);
    }

    // Add rich content if available
    if (this.hasRichContent(response, session)) {
      webResponse.richContent = this.createRichContent(response, session);
    }

    // Add voice playback option if supported
    if (webChatState.voiceEnabled && (response.type === 'voice' || response.alternatives?.some(alt => alt.type === 'voice'))) {
      webResponse.voicePlayback = {
        enabled: true,
        autoPlay: false,
        audioUrl: this.getAudioUrl(response),
        transcript: this.stripSSML(response.content.toString())
      };
    }

    this.logger.debug('Web chat response adapted', {
      sessionId: session.sessionId,
      messageId: webResponse.id,
      hasQuickReplies: !!webResponse.quickReplies,
      hasRichContent: !!webResponse.richContent,
      hasVoicePlayback: !!webResponse.voicePlayback
    });

    return webResponse;
  }

  async exportState(session: ConversationSession): Promise<any> {
    const webChatState: WebChatState = (session.state.channelStates['web_chat'] as WebChatState) || {};
    
    return {
      chatHistory: webChatState.chatHistory?.slice(-20) || [], // Keep last 20 messages
      preferences: {
        theme: webChatState.theme,
        voiceEnabled: webChatState.voiceEnabled,
        showTimestamps: webChatState.showTimestamps,
        autoScroll: webChatState.autoScroll
      },
      conversationPhase: session.state.phase,
      lastInteraction: session.state.context.lastInteraction,
      storyContext: {
        currentStory: session.state.currentStory,
        currentCharacter: session.state.currentCharacter
      },
      uiState: {
        scrollPosition: webChatState.scrollPosition,
        expandedMessages: webChatState.expandedMessages || []
      }
    };
  }

  async importState(session: ConversationSession, state: any, context?: ChannelSwitchContext): Promise<void> {
    if (!state) return;

    // Import web chat-specific state
    session.state.channelStates['web_chat'] = {
      chatHistory: state.chatHistory || [],
      ...state.preferences,
      ...state.uiState,
      streamingEnabled: session.capabilities.supportsStreaming,
      fileUploadEnabled: session.capabilities.supportsFiles
    };

    // Import general conversation state
    if (state.conversationPhase) {
      session.state.phase = state.conversationPhase;
    }

    if (state.storyContext) {
      session.state.currentStory = state.storyContext.currentStory;
      session.state.currentCharacter = state.storyContext.currentCharacter;
    }

    this.logger.debug('Web chat state imported', {
      sessionId: session.sessionId,
      importedMessages: state.chatHistory?.length || 0,
      importedPhase: state.conversationPhase,
      preserveState: context?.preserveState
    });
  }

  async cleanupSession(session: ConversationSession): Promise<void> {
    // Clean up web chat-specific resources
    const webChatState = session.state.channelStates['web_chat'];
    if (webChatState) {
      // Clear any temporary files or uploads
      if (webChatState.temporaryFiles) {
        // TODO: Clean up temporary files
      }
      
      delete session.state.channelStates['web_chat'];
    }
    
    this.logger.debug('Web chat session cleaned up', {
      sessionId: session.sessionId,
      userId: session.userId
    });
  }

  // Private helper methods

  private preprocessTextMessage(message: UniversalMessage, session: ConversationSession): UniversalMessage {
    const content = message.content.toString();
    
    // Handle markdown formatting
    const processedContent = this.processMarkdown(content);
    
    // Detect and extract mentions, hashtags, etc.
    return {
      ...message,
      content: processedContent,
      metadata: message.metadata
    };
  }

  private preprocessVoiceMessage(message: UniversalMessage, session: ConversationSession): UniversalMessage {
    // Voice messages in web chat are typically audio files that need transcription
    return message;
  }

  private preprocessImageMessage(message: UniversalMessage, session: ConversationSession): UniversalMessage {
    // Handle image uploads - extract metadata, validate format, etc.
    void session;
    return message;
  }

  private preprocessFileMessage(message: UniversalMessage, session: ConversationSession): UniversalMessage {
    // Handle file uploads - validate type, size, extract content if needed
    void session;
    return message;
  }

  private formatTextForWeb(text: string): string {
    // Format text for web display with markdown support
    return text
      // Convert emphasis to markdown
      .replace(/\*\*(.*?)\*\*/g, '**$1**')
      .replace(/\*(.*?)\*/g, '*$1*')
      // Convert line breaks
      .replace(/\n/g, '\n\n')
      // Add emoji support
      .replace(/:smile:/g, '😊')
      .replace(/:heart:/g, '❤️')
      .replace(/:star:/g, '⭐')
      // Format character names
      .replace(/\b([A-Z][a-z]+)\b/g, '**$1**')
      // Add story formatting
      .replace(/^(Chapter \d+|Once upon a time|The End)/gm, '### $1');
  }

  private adaptContentForWeb(response: UniversalResponse): any {
    const content = response.content.toString();
    
    // Create rich content structure
    const adaptedContent = {
      text: content,
      format: 'markdown',
      elements: []
    };

    // Add interactive elements based on content
    if (content.includes('character') && response.requiresInput) {
      adaptedContent.elements.push({
        type: 'character_builder',
        interactive: true
      });
    }

    if (content.includes('story') && response.requiresInput) {
      adaptedContent.elements.push({
        type: 'story_builder',
        interactive: true
      });
    }

    return adaptedContent;
  }

  private generateInputHints(response: UniversalResponse, session: ConversationSession): any {
    const hints = {
      placeholder: 'Type your message...',
      suggestions: response.suggestions || [],
      inputType: 'text'
    };

    // Customize based on conversation phase
    switch (session.state.phase) {
      case 'character_creation':
        hints.placeholder = 'Describe your character...';
        hints.inputType = 'text';
        break;
      
      case 'story_building':
        hints.placeholder = 'What happens next?';
        hints.inputType = 'text';
        break;
      
      case 'editing':
        hints.placeholder = 'What would you like to change?';
        hints.inputType = 'text';
        break;
    }

    return hints;
  }

  private hasRichContent(response: UniversalResponse, session: ConversationSession): boolean {
    return (
      session.state.currentCharacter?.appearance_url ||
      session.state.currentStory?.cover_url ||
      response.type === 'card' ||
      response.content.toString().includes('image') ||
      response.content.toString().includes('picture')
    );
  }

  private createRichContent(response: UniversalResponse, session: ConversationSession): any {
    const richContent = {
      type: 'rich_message',
      elements: []
    };

    // Add character image if available
    if (session.state.currentCharacter?.appearance_url) {
      richContent.elements.push({
        type: 'image',
        url: session.state.currentCharacter.appearance_url,
        alt: `Character: ${session.state.currentCharacter.name}`,
        caption: session.state.currentCharacter.name
      });
    }

    // Add story cover if available
    if (session.state.currentStory?.cover_url) {
      richContent.elements.push({
        type: 'image',
        url: session.state.currentStory.cover_url,
        alt: `Story: ${session.state.currentStory.title}`,
        caption: session.state.currentStory.title
      });
    }

    // Add interactive elements
    if (session.state.phase === 'character_creation') {
      richContent.elements.push({
        type: 'character_preview',
        character: session.state.currentCharacter,
        editable: true
      });
    }

    if (session.state.phase === 'story_building') {
      richContent.elements.push({
        type: 'story_progress',
        story: session.state.currentStory,
        interactive: true
      });
    }

    return richContent;
  }

  private processMarkdown(content: string): string {
    // Basic markdown processing for web chat
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  private extractEntities(content: string): any[] {
    const entities = [];
    
    // Extract mentions (@username)
    const mentions = content.match(/@\w+/g);
    if (mentions) {
      entities.push(...mentions.map(mention => ({
        type: 'mention',
        value: mention,
        start: content.indexOf(mention),
        end: content.indexOf(mention) + mention.length
      })));
    }

    // Extract hashtags (#tag)
    const hashtags = content.match(/#\w+/g);
    if (hashtags) {
      entities.push(...hashtags.map(hashtag => ({
        type: 'hashtag',
        value: hashtag,
        start: content.indexOf(hashtag),
        end: content.indexOf(hashtag) + hashtag.length
      })));
    }

    // Extract URLs
    const urls = content.match(/https?:\/\/[^\s]+/g);
    if (urls) {
      entities.push(...urls.map(url => ({
        type: 'url',
        value: url,
        start: content.indexOf(url),
        end: content.indexOf(url) + url.length
      })));
    }

    return entities;
  }

  private requiresFileProcessing(fileType: string): boolean {
    const processableTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    return processableTypes.includes(fileType);
  }

  private stripSSML(content: string): string {
    return content
      .replace(/<speak>/g, '')
      .replace(/<\/speak>/g, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  private getAudioUrl(response: UniversalResponse): string | undefined {
    // Extract audio URL from voice response or alternatives
    if (response.type === 'voice' && typeof response.content === 'object') {
      return (response.content as any).url;
    }

    const voiceAlternative = response.alternatives?.find(alt => alt.type === 'voice');
    if (voiceAlternative && typeof voiceAlternative.content === 'object') {
      return (voiceAlternative.content as any).url;
    }

    return undefined;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateQuickReplyId(): string {
    return `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
import { Logger } from 'winston';

/**
 * Web Chat-specific optimizations for rich text and multimedia interactions
 */
export class WebChatOptimizations {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Optimize content for web chat display with rich formatting
   */
  optimizeForWebDisplay(content: string, context: WebChatContext): WebChatContent {
    const optimized: WebChatContent = {
      text: this.formatTextForWeb(content, context),
      html: this.generateHTML(content, context),
      markdown: this.generateMarkdown(content, context),
      elements: this.createInteractiveElements(content, context),
      metadata: {
        hasRichContent: this.hasRichContent(content, context),
        hasInteractiveElements: this.hasInteractiveElements(content, context),
        estimatedReadTime: this.estimateReadTime(content)
      }
    };

    this.logger.debug('Content optimized for web chat', {
      hasHTML: !!optimized.html,
      hasMarkdown: !!optimized.markdown,
      elementCount: optimized.elements.length,
      hasRichContent: optimized.metadata.hasRichContent
    });

    return optimized;
  }

  /**
   * Create streaming response chunks for real-time typing effect
   */
  createStreamingChunks(content: string, context: WebChatContext): StreamingChunk[] {
    const chunks: StreamingChunk[] = [];
    const streamingMode = context.preferences?.streamingMode || 'word';

    switch (streamingMode) {
      case 'character':
        chunks.push(...this.createCharacterChunks(content));
        break;
      case 'word':
        chunks.push(...this.createWordChunks(content));
        break;
      case 'sentence':
        chunks.push(...this.createSentenceChunks(content));
        break;
      default:
        chunks.push(...this.createWordChunks(content));
    }

    // Add typing indicators
    chunks.unshift({
      type: 'typing_start',
      content: '',
      delay: 0,
      isComplete: false,
      metadata: { indicator: true }
    });

    chunks.push({
      type: 'typing_end',
      content: content,
      delay: 100,
      isComplete: true,
      metadata: { indicator: false }
    });

    this.logger.debug('Streaming chunks created', {
      chunkCount: chunks.length,
      streamingMode,
      totalDelay: chunks.reduce((sum, chunk) => sum + chunk.delay, 0)
    });

    return chunks;
  }

  /**
   * Generate quick reply buttons based on conversation context
   */
  generateQuickReplies(context: WebChatContext, suggestions?: string[]): QuickReply[] {
    const quickReplies: QuickReply[] = [];

    // Add context-specific quick replies
    switch (context.conversationPhase) {
      case 'greeting':
        quickReplies.push(
          { id: 'create_story', text: '📖 Create Story', payload: 'I want to create a story' },
          { id: 'create_character', text: '👤 Create Character', payload: 'I want to create a character' },
          { id: 'view_library', text: '📚 My Stories', payload: 'Show me my stories' }
        );
        break;

      case 'character_creation':
        quickReplies.push(
          { id: 'yes', text: '✅ Yes', payload: 'Yes' },
          { id: 'no', text: '❌ No', payload: 'No' },
          { id: 'change', text: '✏️ Change', payload: 'I want to change that' },
          { id: 'more_details', text: '➕ Add Details', payload: 'Add more details' }
        );
        break;

      case 'story_building':
        quickReplies.push(
          { id: 'continue', text: '➡️ Continue', payload: 'Continue the story' },
          { id: 'edit', text: '✏️ Edit', payload: 'I want to edit something' },
          { id: 'finish', text: '🏁 Finish', payload: 'Finish the story' },
          { id: 'add_chapter', text: '📄 New Chapter', payload: 'Add a new chapter' }
        );
        break;

      case 'editing':
        quickReplies.push(
          { id: 'save', text: '💾 Save', payload: 'Save changes' },
          { id: 'undo', text: '↩️ Undo', payload: 'Undo last change' },
          { id: 'preview', text: '👁️ Preview', payload: 'Preview story' }
        );
        break;
    }

    // Add suggestions as quick replies
    if (suggestions) {
      quickReplies.push(...suggestions.map((suggestion, index) => ({
        id: `suggestion_${index}`,
        text: suggestion,
        payload: suggestion
      })));
    }

    // Limit to 8 quick replies for better UX
    return quickReplies.slice(0, 8);
  }

  /**
   * Create rich media cards for stories and characters
   */
  createRichMediaCard(context: WebChatContext): RichMediaCard | null {
    if (context.currentCharacter && context.conversationPhase === 'character_creation') {
      return this.createCharacterCard(context.currentCharacter, context);
    }

    if (context.currentStory && context.conversationPhase === 'story_building') {
      return this.createStoryCard(context.currentStory, context);
    }

    return null;
  }

  /**
   * Generate file upload configuration based on conversation context
   */
  generateFileUploadConfig(context: WebChatContext): FileUploadConfig {
    const baseConfig: FileUploadConfig = {
      enabled: context.capabilities?.supportsFiles || false,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: [],
      multiple: false,
      dragAndDrop: true,
      preview: true
    };

    // Customize based on conversation phase
    switch (context.conversationPhase) {
      case 'character_creation':
        baseConfig.allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        baseConfig.maxFileSize = 5 * 1024 * 1024; // 5MB for images
        baseConfig.preview = true;
        break;

      case 'story_building':
        baseConfig.allowedTypes = ['image/jpeg', 'image/png', 'text/plain', 'application/pdf'];
        baseConfig.multiple = true;
        break;

      case 'editing':
        baseConfig.allowedTypes = ['text/plain', 'application/pdf', 'application/msword'];
        break;

      default:
        baseConfig.allowedTypes = ['image/jpeg', 'image/png', 'text/plain'];
    }

    return baseConfig;
  }

  /**
   * Create voice input configuration for web chat
   */
  createVoiceInputConfig(context: WebChatContext): VoiceInputConfig {
    return {
      enabled: context.capabilities?.supportsVoice || false,
      continuous: false,
      interimResults: true,
      language: context.locale || 'en-US',
      maxDuration: 30000, // 30 seconds
      visualFeedback: true,
      waveformDisplay: true,
      noiseReduction: true,
      autoStart: false,
      hotwordDetection: false,
      transcriptionDisplay: true
    };
  }

  /**
   * Generate accessibility enhancements
   */
  generateAccessibilityEnhancements(context: WebChatContext): AccessibilityConfig {
    const userPrefs = (context.userPreferences?.accessibility || {}) as any;

    return {
      screenReader: {
        enabled: userPrefs.screenReader || false,
        announceMessages: true,
        announceTyping: false,
        skipRepeatedContent: true
      },
      keyboard: {
        enabled: true,
        shortcuts: this.generateKeyboardShortcuts(context),
        focusManagement: true,
        skipLinks: true
      },
      visual: {
        highContrast: userPrefs.highContrast || false,
        largeText: userPrefs.largeText || false,
        reducedMotion: userPrefs.reducedMotion || false,
        colorBlindFriendly: userPrefs.colorBlindFriendly || false
      },
      audio: {
        textToSpeech: userPrefs.textToSpeech || false,
        soundEffects: !userPrefs.reducedAudio,
        voiceSpeed: userPrefs.voiceSpeed || 1.0
      }
    };
  }

  /**
   * Create responsive layout configuration
   */
  createResponsiveLayout(context: WebChatContext): ResponsiveLayoutConfig {
    const deviceType = this.detectDeviceType(context);

    return {
      deviceType,
      breakpoints: {
        mobile: 768,
        tablet: 1024,
        desktop: 1200
      },
      layout: {
        mobile: {
          chatWidth: '100%',
          messageMaxWidth: '85%',
          showSidebar: false,
          compactMode: true,
          quickRepliesPerRow: 2
        },
        tablet: {
          chatWidth: '80%',
          messageMaxWidth: '75%',
          showSidebar: true,
          compactMode: false,
          quickRepliesPerRow: 3
        },
        desktop: {
          chatWidth: '60%',
          messageMaxWidth: '70%',
          showSidebar: true,
          compactMode: false,
          quickRepliesPerRow: 4
        }
      },
      adaptiveFeatures: {
        autoHideElements: deviceType === 'mobile',
        collapsibleSections: true,
        touchOptimized: deviceType !== 'desktop',
        hoverEffects: deviceType === 'desktop'
      }
    };
  }

  // Private helper methods

  private formatTextForWeb(content: string, context: WebChatContext): string {
    let formatted = content;

    // Convert emphasis to HTML
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Convert line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    // Add emoji support
    formatted = this.addEmojiSupport(formatted);

    // Format character names
    formatted = formatted.replace(/\b([A-Z][a-z]+)\b/g, '<span class="character-name">$1</span>');

    // Add story formatting
    formatted = formatted.replace(/^(Chapter \d+|Once upon a time|The End)/gm, '<h3>$1</h3>');

    return formatted;
  }

  private generateHTML(content: string, context: WebChatContext): string {
    const formattedText = this.formatTextForWeb(content, context);
    
    return `
      <div class="storytailor-message">
        <div class="message-content">
          ${formattedText}
        </div>
        ${this.generateHTMLExtras(context)}
      </div>
    `;
  }

  private generateMarkdown(content: string, context: WebChatContext): string {
    let markdown = content;

    // Convert character names to bold
    markdown = markdown.replace(/\b([A-Z][a-z]+)\b/g, '**$1**');

    // Add story structure
    markdown = markdown.replace(/^(Chapter \d+|Once upon a time|The End)/gm, '### $1');

    // Add emphasis for important words
    markdown = markdown.replace(/\b(amazing|wonderful|exciting|magical)\b/gi, '*$1*');

    return markdown;
  }

  private createInteractiveElements(content: string, context: WebChatContext): InteractiveElement[] {
    const elements: InteractiveElement[] = [];

    // Add character builder if in character creation
    if (context.conversationPhase === 'character_creation') {
      elements.push({
        type: 'character_builder',
        id: 'character_builder_1',
        data: context.currentCharacter || {},
        interactive: true,
        position: 'inline'
      });
    }

    // Add story progress if in story building
    if (context.conversationPhase === 'story_building' && context.storyProgress) {
      elements.push({
        type: 'progress_bar',
        id: 'story_progress_1',
        data: {
          progress: context.storyProgress,
          label: 'Story Progress',
          color: '#4CAF50'
        },
        interactive: false,
        position: 'bottom'
      });
    }

    // Add image gallery if there are images
    if (context.currentStory?.images && context.currentStory.images.length > 0) {
      elements.push({
        type: 'image_gallery',
        id: 'story_images_1',
        data: {
          images: context.currentStory.images,
          layout: 'grid',
          lightbox: true
        },
        interactive: true,
        position: 'inline'
      });
    }

    return elements;
  }

  private createCharacterCard(character: any, context: WebChatContext): RichMediaCard {
    return {
      type: 'character_card',
      title: character.name || 'Your Character',
      subtitle: character.species || 'Character',
      image: character.imageUrl,
      description: this.generateCharacterDescription(character),
      actions: [
        { type: 'button', label: 'Edit Character', payload: 'edit character' },
        { type: 'button', label: 'Create Story', payload: 'create story with this character' }
      ],
      metadata: {
        characterId: character.id,
        createdAt: character.createdAt,
        traits: character.traits
      }
    };
  }

  private createStoryCard(story: any, context: WebChatContext): RichMediaCard {
    return {
      type: 'story_card',
      title: story.title || 'Your Story',
      subtitle: story.type || 'Story',
      image: story.coverUrl,
      description: story.summary || 'A wonderful story in progress...',
      actions: [
        { type: 'button', label: 'Continue Story', payload: 'continue story' },
        { type: 'button', label: 'Edit Story', payload: 'edit story' },
        { type: 'button', label: 'Preview', payload: 'preview story' }
      ],
      metadata: {
        storyId: story.id,
        progress: story.progress,
        wordCount: story.wordCount,
        chapters: story.chapters?.length || 0
      }
    };
  }

  private generateCharacterDescription(character: any): string {
    const traits = [];
    
    if (character.age) traits.push(`${character.age} years old`);
    if (character.species) traits.push(character.species);
    if (character.appearance?.hairColor) traits.push(`${character.appearance.hairColor} hair`);
    if (character.appearance?.eyeColor) traits.push(`${character.appearance.eyeColor} eyes`);
    
    return traits.length > 0 ? traits.join(', ') : 'A unique character';
  }

  private addEmojiSupport(content: string): string {
    return content
      .replace(/:smile:/g, '😊')
      .replace(/:heart:/g, '❤️')
      .replace(/:star:/g, '⭐')
      .replace(/:magic:/g, '✨')
      .replace(/:book:/g, '📖')
      .replace(/:character:/g, '👤')
      .replace(/:story:/g, '📚');
  }

  private generateHTMLExtras(context: WebChatContext): string {
    let extras = '';

    // Add timestamp if enabled
    if (context.preferences?.showTimestamps) {
      extras += `<div class="message-timestamp">${new Date().toLocaleTimeString()}</div>`;
    }

    // Add read receipt if enabled
    if (context.preferences?.showReadReceipts) {
      extras += `<div class="message-status">✓</div>`;
    }

    return extras;
  }

  private hasRichContent(content: string, context: WebChatContext): boolean {
    return !!(
      context.currentCharacter?.imageUrl ||
      context.currentStory?.coverUrl ||
      content.includes('**') ||
      content.includes('*') ||
      content.includes('###')
    );
  }

  private hasInteractiveElements(content: string, context: WebChatContext): boolean {
    return !!(
      context.conversationPhase === 'character_creation' ||
      context.conversationPhase === 'story_building' ||
      context.currentStory?.images
    );
  }

  private estimateReadTime(content: string): number {
    const wordsPerMinute = 200;
    const words = content.split(' ').length;
    return Math.ceil(words / wordsPerMinute);
  }

  private createCharacterChunks(content: string): StreamingChunk[] {
    const chunks: StreamingChunk[] = [];
    const characters = content.split('');
    
    characters.forEach((char, index) => {
      chunks.push({
        type: 'text_chunk',
        content: content.substring(0, index + 1),
        delay: 50, // 50ms per character
        isComplete: index === characters.length - 1,
        metadata: { chunkIndex: index, totalChunks: characters.length }
      });
    });

    return chunks;
  }

  private createWordChunks(content: string): StreamingChunk[] {
    const chunks: StreamingChunk[] = [];
    const words = content.split(' ');
    
    words.forEach((word, index) => {
      const partialContent = words.slice(0, index + 1).join(' ');
      chunks.push({
        type: 'text_chunk',
        content: partialContent,
        delay: 150, // 150ms per word
        isComplete: index === words.length - 1,
        metadata: { chunkIndex: index, totalChunks: words.length }
      });
    });

    return chunks;
  }

  private createSentenceChunks(content: string): StreamingChunk[] {
    const chunks: StreamingChunk[] = [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    sentences.forEach((sentence, index) => {
      const partialContent = sentences.slice(0, index + 1).join('. ') + (index < sentences.length - 1 ? '.' : '');
      chunks.push({
        type: 'text_chunk',
        content: partialContent,
        delay: 800, // 800ms per sentence
        isComplete: index === sentences.length - 1,
        metadata: { chunkIndex: index, totalChunks: sentences.length }
      });
    });

    return chunks;
  }

  private generateKeyboardShortcuts(context: WebChatContext): KeyboardShortcut[] {
    return [
      { key: 'Enter', action: 'send_message', description: 'Send message' },
      { key: 'Shift+Enter', action: 'new_line', description: 'New line' },
      { key: 'Escape', action: 'cancel_input', description: 'Cancel input' },
      { key: 'Ctrl+/', action: 'show_shortcuts', description: 'Show shortcuts' },
      { key: 'Ctrl+K', action: 'focus_input', description: 'Focus input' },
      { key: 'Ctrl+L', action: 'clear_chat', description: 'Clear chat' }
    ];
  }

  private detectDeviceType(context: WebChatContext): 'mobile' | 'tablet' | 'desktop' {
    const userAgent = context.userAgent || '';
    const screenWidth = context.screenWidth || 1024;

    if (screenWidth < 768 || /Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return 'mobile';
    } else if (screenWidth < 1024) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }
}

// Type definitions
interface WebChatContext {
  conversationPhase: string;
  currentCharacter?: any;
  currentStory?: any;
  storyProgress?: number;
  capabilities?: {
    supportsFiles: boolean;
    supportsVoice: boolean;
  };
  preferences?: {
    streamingMode: 'character' | 'word' | 'sentence';
    showTimestamps: boolean;
    showReadReceipts: boolean;
  };
  userPreferences?: {
    accessibility?: {
      screenReader: boolean;
      highContrast: boolean;
      largeText: boolean;
      reducedMotion: boolean;
      colorBlindFriendly: boolean;
      textToSpeech: boolean;
      reducedAudio: boolean;
      voiceSpeed: number;
    };
  };
  locale?: string;
  userAgent?: string;
  screenWidth?: number;
}

interface WebChatContent {
  text: string;
  html: string;
  markdown: string;
  elements: InteractiveElement[];
  metadata: {
    hasRichContent: boolean;
    hasInteractiveElements: boolean;
    estimatedReadTime: number;
  };
}

interface StreamingChunk {
  type: 'typing_start' | 'typing_end' | 'text_chunk';
  content: string;
  delay: number;
  isComplete: boolean;
  metadata: any;
}

interface QuickReply {
  id: string;
  text: string;
  payload: string;
}

interface RichMediaCard {
  type: string;
  title: string;
  subtitle: string;
  image?: string;
  description: string;
  actions: Array<{
    type: string;
    label: string;
    payload: string;
  }>;
  metadata: any;
}

interface InteractiveElement {
  type: string;
  id: string;
  data: any;
  interactive: boolean;
  position: 'inline' | 'bottom' | 'top';
}

interface FileUploadConfig {
  enabled: boolean;
  maxFileSize: number;
  allowedTypes: string[];
  multiple: boolean;
  dragAndDrop: boolean;
  preview: boolean;
}

interface VoiceInputConfig {
  enabled: boolean;
  continuous: boolean;
  interimResults: boolean;
  language: string;
  maxDuration: number;
  visualFeedback: boolean;
  waveformDisplay: boolean;
  noiseReduction: boolean;
  autoStart: boolean;
  hotwordDetection: boolean;
  transcriptionDisplay: boolean;
}

interface AccessibilityConfig {
  screenReader: {
    enabled: boolean;
    announceMessages: boolean;
    announceTyping: boolean;
    skipRepeatedContent: boolean;
  };
  keyboard: {
    enabled: boolean;
    shortcuts: KeyboardShortcut[];
    focusManagement: boolean;
    skipLinks: boolean;
  };
  visual: {
    highContrast: boolean;
    largeText: boolean;
    reducedMotion: boolean;
    colorBlindFriendly: boolean;
  };
  audio: {
    textToSpeech: boolean;
    soundEffects: boolean;
    voiceSpeed: number;
  };
}

interface KeyboardShortcut {
  key: string;
  action: string;
  description: string;
}

interface ResponsiveLayoutConfig {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  layout: {
    mobile: LayoutSettings;
    tablet: LayoutSettings;
    desktop: LayoutSettings;
  };
  adaptiveFeatures: {
    autoHideElements: boolean;
    collapsibleSections: boolean;
    touchOptimized: boolean;
    hoverEffects: boolean;
  };
}

interface LayoutSettings {
  chatWidth: string;
  messageMaxWidth: string;
  showSidebar: boolean;
  compactMode: boolean;
  quickRepliesPerRow: number;
}
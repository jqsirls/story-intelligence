/**
 * Storytailor Embeddable Widget
 * Beautiful, responsive chat/voice interface for any website
 * Supports Webflow, Framer, Wix, and custom implementations
 */

import { EventEmitter } from 'eventemitter3';
import { StoryReader } from './components/StoryReader';
import { VoiceInterface } from './components/VoiceInterface';
import { StoryGrid } from './components/StoryGrid';
import { ChatInterface } from './components/ChatInterface';
import { DesignTokens } from './theme/DesignTokens';
import { ThemeManager } from './theme/ThemeManager';
import { APIClient } from './api/APIClient';
import { OfflineManager } from './offline/OfflineManager';
import { PrivacyManager } from './privacy/PrivacyManager';

export interface StorytalorEmbedConfig {
  // Required
  apiKey: string;
  container: string | HTMLElement;
  
  // Theme & Appearance
  theme?: 'child-friendly' | 'educational' | 'magical' | 'custom';
  darkMode?: boolean | 'auto';
  
  // Features
  features?: {
    voice?: boolean;
    stories?: boolean;
    reader?: boolean;
    smartHome?: boolean;
    offline?: boolean;
  };
  
  // Customization
  branding?: {
    logo?: string;
    name?: string;
    colors?: {
      primary?: string;
      accent?: string;
      background?: string;
      text?: string;
    };
  };
  
  // Behavior
  autoStart?: boolean;
  welcomeMessage?: string;
  language?: string;
  
  // Privacy & Safety
  coppaMode?: boolean;
  parentalControls?: boolean;
  dataRetention?: 'minimal' | 'standard' | 'extended';
  
  // Advanced
  baseUrl?: string;
  debug?: boolean;
}

export interface Story {
  id: string;
  title: string;
  content: string;
  audioUrl?: string;
  webvttUrl?: string;
  thumbnailUrl?: string;
  characters: string[];
  mood: string;
  ageRange: string;
  createdAt: string;
  tags: string[];
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    storyId?: string;
    audioUrl?: string;
    confidence?: number;
  };
}

export class StorytalorEmbed extends EventEmitter {
  private config: Required<StorytalorEmbedConfig>;
  private container: HTMLElement;
  private apiClient: APIClient;
  private themeManager: ThemeManager;
  private offlineManager: OfflineManager;
  private privacyManager: PrivacyManager;
  
  // Components
  private chatInterface: ChatInterface;
  private storyReader: StoryReader;
  private voiceInterface: VoiceInterface;
  private storyGrid: StoryGrid;
  
  // State
  private isInitialized = false;
  private currentView: 'chat' | 'stories' | 'reader' = 'chat';
  private currentStory: Story | null = null;
  private sessionId: string | null = null;
  
  constructor(config: StorytalorEmbedConfig) {
    super();
    
    // Set defaults
    this.config = {
      theme: 'child-friendly',
      darkMode: 'auto',
      features: {
        voice: true,
        stories: true,
        reader: true,
        smartHome: false,
        offline: true
      },
      branding: {
        name: 'Storytailor'
      },
      autoStart: true,
      welcomeMessage: "Hi! I'm your AI storyteller! 🌟",
      language: 'en',
      coppaMode: true,
      parentalControls: true,
      dataRetention: 'minimal',
      baseUrl: 'https://orchestrator.storytailor.com',
      debug: false,
      ...config
    } as Required<StorytalorEmbedConfig>;
    
    this.validateConfig();
    this.setupContainer();
    this.initializeServices();
  }

  /**
   * Initialize the embed widget
   */
  async init(): Promise<void> {
    try {
      this.emit('init.start');
      
      // Initialize services
      await this.apiClient.initialize();
      await this.offlineManager.initialize();
      await this.privacyManager.initialize();
      
      // Apply theme
      this.themeManager.applyTheme(this.config.theme, this.config.branding);
      
      // Create UI
      this.createInterface();
      this.setupEventListeners();
      
      // Start session if auto-start enabled
      if (this.config.autoStart) {
        await this.startSession();
      }
      
      this.isInitialized = true;
      this.emit('init.complete');
      
      if (this.config.debug) {
        console.log('🌟 Storytailor Embed initialized successfully');
      }
      
    } catch (error) {
      this.emit('init.error', error);
      throw error;
    }
  }

  /**
   * Send a message to the AI storyteller
   */
  async sendMessage(content: string): Promise<ChatMessage> {
    this.ensureInitialized();
    
    try {
      const userMessage: ChatMessage = {
        id: this.generateId(),
        type: 'user',
        content,
        timestamp: new Date()
      };
      
      this.chatInterface.addMessage(userMessage);
      this.emit('message.sent', userMessage);
      
      // Show typing indicator
      this.chatInterface.showTypingIndicator();
      
      // Send to API
      const response = await this.apiClient.sendMessage(this.sessionId!, content);
      
      const assistantMessage: ChatMessage = {
        id: this.generateId(),
        type: 'assistant',
        content: response.content,
        timestamp: new Date(),
        metadata: response.metadata
      };
      
      this.chatInterface.hideTypingIndicator();
      this.chatInterface.addMessage(assistantMessage);
      
      this.emit('message.received', assistantMessage);
      
      // Handle special responses
      if (response.metadata?.storyId) {
        this.handleStoryCreated(response.metadata.storyId);
      }
      
      return assistantMessage;
      
    } catch (error) {
      this.chatInterface.hideTypingIndicator();
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Start voice recording
   */
  async startVoiceRecording(): Promise<void> {
    this.ensureInitialized();
    
    if (!this.config.features.voice) {
      throw new Error('Voice feature not enabled');
    }
    
    try {
      await this.voiceInterface.startRecording();
      this.emit('voice.recording.start');
    } catch (error) {
      this.emit('voice.error', error);
      throw error;
    }
  }

  /**
   * Stop voice recording
   */
  async stopVoiceRecording(): Promise<void> {
    this.ensureInitialized();
    
    try {
      const audioBlob = await this.voiceInterface.stopRecording();
      this.emit('voice.recording.stop');
      
      // Process voice input
      const transcript = await this.apiClient.processVoice(audioBlob);
      await this.sendMessage(transcript);
      
    } catch (error) {
      this.emit('voice.error', error);
      throw error;
    }
  }

  /**
   * Show stories grid
   */
  async showStories(filters?: { mood?: string; character?: string; tags?: string[] }): Promise<void> {
    this.ensureInitialized();
    
    try {
      this.currentView = 'stories';
      this.updateView();
      
      const stories = await this.apiClient.getStories(filters);
      this.storyGrid.displayStories(stories);
      
      this.emit('stories.shown', stories);
      
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Open story reader
   */
  async openStory(storyId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      const story = await this.apiClient.getStory(storyId);
      this.currentStory = story;
      this.currentView = 'reader';
      this.updateView();
      
      await this.storyReader.loadStory(story);
      this.emit('story.opened', story);
      
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Close story reader and return to previous view
   */
  closeStory(): void {
    this.currentStory = null;
    this.currentView = 'chat';
    this.updateView();
    this.emit('story.closed');
  }

  /**
   * Toggle dark mode
   */
  toggleDarkMode(): void {
    const isDark = this.themeManager.toggleDarkMode();
    this.emit('theme.changed', { darkMode: isDark });
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<StorytalorEmbedConfig>): void {
    Object.assign(this.config, updates);
    
    if (updates.theme || updates.branding) {
      this.themeManager.applyTheme(this.config.theme, this.config.branding);
    }
    
    this.emit('config.updated', updates);
  }

  /**
   * Get current stories
   */
  async getStories(filters?: any): Promise<Story[]> {
    this.ensureInitialized();
    return this.apiClient.getStories(filters);
  }

  /**
   * Destroy the embed widget
   */
  destroy(): void {
    try {
      // Clean up components
      this.chatInterface?.destroy();
      this.storyReader?.destroy();
      this.voiceInterface?.destroy();
      this.storyGrid?.destroy();
      
      // Clean up services
      this.offlineManager?.destroy();
      this.privacyManager?.destroy();
      
      // Clear container
      this.container.innerHTML = '';
      
      // Remove event listeners
      this.removeAllListeners();
      
      this.isInitialized = false;
      this.emit('destroyed');
      
    } catch (error) {
      console.error('Error destroying Storytailor Embed:', error);
    }
  }

  // Private methods

  private validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error('API key is required');
    }
    
    if (!this.config.container) {
      throw new Error('Container is required');
    }
  }

  private setupContainer(): void {
    if (typeof this.config.container === 'string') {
      const element = document.querySelector(this.config.container);
      if (!element) {
        throw new Error(`Container element not found: ${this.config.container}`);
      }
      this.container = element as HTMLElement;
    } else {
      this.container = this.config.container;
    }
    
    // Add base classes
    this.container.classList.add('storytailor-embed');
    this.container.setAttribute('data-theme', this.config.theme);
  }

  private initializeServices(): void {
    this.apiClient = new APIClient({
      apiKey: this.config.apiKey,
      baseUrl: this.config.baseUrl,
      debug: this.config.debug
    });
    
    this.themeManager = new ThemeManager(this.container);
    
    this.offlineManager = new OfflineManager({
      enabled: this.config.features.offline!,
      storageKey: `storytailor-${this.config.apiKey.slice(-8)}`
    });
    
    this.privacyManager = new PrivacyManager({
      coppaMode: this.config.coppaMode,
      dataRetention: this.config.dataRetention,
      parentalControls: this.config.parentalControls
    });
  }

  private createInterface(): void {
    // Create main container structure
    this.container.innerHTML = `
      <div class="st-embed-container">
        <div class="st-embed-header">
          <div class="st-embed-branding">
            ${this.config.branding.logo ? 
              `<img src="${this.config.branding.logo}" alt="Logo" class="st-embed-logo">` : 
              '<div class="st-embed-icon">🌟</div>'
            }
            <span class="st-embed-title">${this.config.branding.name}</span>
          </div>
          <div class="st-embed-controls">
            <button class="st-embed-btn st-embed-btn-icon" data-action="toggle-dark">
              <span class="st-icon-theme"></span>
            </button>
            <button class="st-embed-btn st-embed-btn-icon" data-action="show-stories">
              <span class="st-icon-stories"></span>
            </button>
          </div>
        </div>
        
        <div class="st-embed-content">
          <div class="st-embed-view st-embed-view-chat" data-view="chat">
            <div class="st-chat-container"></div>
          </div>
          
          <div class="st-embed-view st-embed-view-stories" data-view="stories">
            <div class="st-stories-container"></div>
          </div>
          
          <div class="st-embed-view st-embed-view-reader" data-view="reader">
            <div class="st-reader-container"></div>
          </div>
        </div>
      </div>
    `;
    
    // Initialize components
    this.chatInterface = new ChatInterface(
      this.container.querySelector('.st-chat-container')!,
      {
        voiceEnabled: this.config.features.voice!,
        welcomeMessage: this.config.welcomeMessage,
        onMessage: (content) => this.sendMessage(content),
        onVoiceStart: () => this.startVoiceRecording(),
        onVoiceStop: () => this.stopVoiceRecording()
      }
    );
    
    if (this.config.features.stories) {
      this.storyGrid = new StoryGrid(
        this.container.querySelector('.st-stories-container')!,
        {
          onStorySelect: (storyId) => this.openStory(storyId),
          onBackToChat: () => this.showChat()
        }
      );
    }
    
    if (this.config.features.reader) {
      this.storyReader = new StoryReader(
        this.container.querySelector('.st-reader-container')!,
        {
          onClose: () => this.closeStory(),
          onWordClick: (word, timestamp) => this.emit('reader.word.click', { word, timestamp }),
          onWordLongPress: (word) => this.emit('reader.word.longpress', { word })
        }
      );
    }
    
    if (this.config.features.voice) {
      this.voiceInterface = new VoiceInterface({
        onTranscript: (transcript) => this.emit('voice.transcript', transcript),
        onError: (error) => this.emit('voice.error', error)
      });
    }
  }

  private setupEventListeners(): void {
    // Header controls
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.closest('[data-action]')?.getAttribute('data-action');
      
      switch (action) {
        case 'toggle-dark':
          this.toggleDarkMode();
          break;
        case 'show-stories':
          this.showStories();
          break;
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (!this.container.contains(document.activeElement)) return;
      
      if (e.key === 'Escape') {
        if (this.currentView === 'reader') {
          this.closeStory();
        } else if (this.currentView === 'stories') {
          this.showChat();
        }
      }
    });
    
    // Voice commands
    this.on('voice.transcript', (transcript) => {
      this.handleVoiceCommand(transcript);
    });
    
    // Offline/online events
    window.addEventListener('online', () => {
      this.emit('connection.online');
      this.offlineManager.syncWhenOnline();
    });
    
    window.addEventListener('offline', () => {
      this.emit('connection.offline');
    });
  }

  private updateView(): void {
    const views = this.container.querySelectorAll('.st-embed-view');
    views.forEach(view => {
      const viewType = view.getAttribute('data-view');
      view.classList.toggle('st-embed-view-active', viewType === this.currentView);
    });
    
    this.emit('view.changed', this.currentView);
  }

  private showChat(): void {
    this.currentView = 'chat';
    this.updateView();
  }

  private async startSession(): Promise<void> {
    try {
      const session = await this.apiClient.startSession({
        language: this.config.language,
        features: this.config.features,
        privacy: {
          coppaMode: this.config.coppaMode,
          dataRetention: this.config.dataRetention
        }
      });
      
      this.sessionId = session.sessionId;
      this.emit('session.started', session);
      
      // Send welcome message if configured
      if (this.config.welcomeMessage && this.config.autoStart) {
        setTimeout(() => {
          this.chatInterface.addMessage({
            id: this.generateId(),
            type: 'assistant',
            content: this.config.welcomeMessage,
            timestamp: new Date()
          });
        }, 500);
      }
      
    } catch (error) {
      this.emit('session.error', error);
      throw error;
    }
  }

  private handleStoryCreated(storyId: string): void {
    // Show celebration animation
    this.showCelebration();
    
    // Offer to open the story
    setTimeout(() => {
      this.chatInterface.addMessage({
        id: this.generateId(),
        type: 'assistant',
        content: "🎉 Your story is ready! Would you like to read it together?",
        timestamp: new Date(),
        metadata: { storyId }
      });
    }, 1000);
    
    this.emit('story.created', { storyId });
  }

  private showCelebration(): void {
    const celebration = document.createElement('div');
    celebration.className = 'st-celebration';
    celebration.innerHTML = '🎉✨🌟✨🎉';
    
    this.container.appendChild(celebration);
    
    // Animate and remove
    setTimeout(() => {
      celebration.classList.add('st-celebration-animate');
    }, 100);
    
    setTimeout(() => {
      celebration.remove();
    }, 3000);
  }

  private handleVoiceCommand(transcript: string): void {
    const command = transcript.toLowerCase().trim();
    
    // Voice navigation commands
    if (command.includes('show stories') || command.includes('my stories')) {
      this.showStories();
    } else if (command.includes('go back') || command.includes('close')) {
      if (this.currentView === 'reader') {
        this.closeStory();
      } else if (this.currentView === 'stories') {
        this.showChat();
      }
    } else if (command.includes('read slower') && this.currentView === 'reader') {
      this.storyReader.setReadingSpeed(0.8);
    } else if (command.includes('read faster') && this.currentView === 'reader') {
      this.storyReader.setReadingSpeed(1.2);
    } else {
      // Regular message
      this.sendMessage(transcript);
    }
  }

  private handleError(error: any): void {
    console.error('Storytailor Embed Error:', error);
    
    const errorMessage: ChatMessage = {
      id: this.generateId(),
      type: 'system',
      content: "I'm having trouble right now. Please try again in a moment! 🤖",
      timestamp: new Date()
    };
    
    this.chatInterface.addMessage(errorMessage);
    this.emit('error', error);
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Storytailor Embed not initialized. Call init() first.');
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

// Global initialization function
declare global {
  interface Window {
    StorytalorEmbed: {
      init: (config: StorytalorEmbedConfig) => Promise<StorytalorEmbed>;
      create: (config: StorytalorEmbedConfig) => StorytalorEmbed;
    };
  }
}

// Auto-initialize if config is provided via data attributes
document.addEventListener('DOMContentLoaded', () => {
  const containers = document.querySelectorAll('[data-storytailor-key]');
  
  containers.forEach(async (container) => {
    const config: StorytalorEmbedConfig = {
      apiKey: container.getAttribute('data-storytailor-key')!,
      container: container as HTMLElement,
      theme: (container.getAttribute('data-storytailor-theme') as any) || 'child-friendly',
      features: {
        voice: container.getAttribute('data-storytailor-voice') !== 'false',
        stories: container.getAttribute('data-storytailor-stories') !== 'false',
        reader: container.getAttribute('data-storytailor-reader') !== 'false'
      }
    };
    
    const embed = new StorytalorEmbed(config);
    await embed.init();
  });
});

// Export for module systems
export default StorytalorEmbed;

// Global API
if (typeof window !== 'undefined') {
  window.StorytalorEmbed = {
    init: async (config: StorytalorEmbedConfig) => {
      const embed = new StorytalorEmbed(config);
      await embed.init();
      return embed;
    },
    create: (config: StorytalorEmbedConfig) => {
      return new StorytalorEmbed(config);
    }
  };
}
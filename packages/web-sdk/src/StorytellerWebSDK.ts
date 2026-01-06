// Storyteller Web SDK - Easy embedding for any website
import { EventEmitter } from 'eventemitter3';

export interface StorytellerConfig {
  apiKey: string;
  baseUrl?: string;
  containerId: string;
  theme?: 'default' | 'child-friendly' | 'magical' | 'educational' | 'custom';
  voiceEnabled?: boolean;
  smartHomeEnabled?: boolean;
  offlineMode?: boolean;
  customization?: {
    colors?: {
      primary?: string;
      secondary?: string;
      accent?: string;
      background?: string;
      text?: string;
    };
    branding?: {
      logo?: string;
      name?: string;
    };
    features?: {
      showTypingIndicator?: boolean;
      showTimestamps?: boolean;
      allowFileUpload?: boolean;
      maxMessageLength?: number;
    };
  };
  parentalControls?: {
    enabled?: boolean;
    ageRestrictions?: {
      maxAge?: number;
      contentFiltering?: 'none' | 'mild' | 'strict';
      requireParentalApproval?: boolean;
    };
  };
  privacySettings?: {
    dataRetention?: 'minimal' | 'standard' | 'extended';
    consentLevel?: 'implicit' | 'explicit';
    coppaCompliant?: boolean;
  };
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  metadata?: {
    confidence?: number;
    agentsUsed?: string[];
    responseTime?: number;
  };
}

export interface VoiceConfig {
  enabled: boolean;
  autoStart?: boolean;
  language?: string;
  voice?: string;
  speed?: number;
}

export class StorytellerWebSDK extends EventEmitter {
  private config: StorytellerConfig;
  private container: HTMLElement;
  private chatContainer: HTMLElement;
  private inputContainer: HTMLElement;
  private sessionId: string | null = null;
  private messages: ChatMessage[] = [];
  private isVoiceEnabled = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private isTyping = false;
  private offlineQueue: any[] = [];

  constructor(config: StorytellerConfig) {
    super();
    this.config = {
      baseUrl: 'https://orchestrator.storytailor.com',
      theme: 'child-friendly',
      voiceEnabled: false,
      smartHomeEnabled: false,
      offlineMode: false,
      ...config
    };

    this.validateConfig();
  }

  /**
   * Initialize the SDK and create the chat interface
   */
  async init(): Promise<void> {
    try {
      this.container = document.getElementById(this.config.containerId);
      if (!this.container) {
        throw new Error(`Container with ID '${this.config.containerId}' not found`);
      }

      this.createChatInterface();
      this.setupEventListeners();
      
      if (this.config.voiceEnabled) {
        await this.initializeVoice();
      }

      if (this.config.offlineMode) {
        this.setupOfflineSupport();
      }

      await this.startConversation();
      
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Send a message to the storyteller
   */
  async sendMessage(content: string): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active session. Call init() first.');
    }

    const userMessage: ChatMessage = {
      id: this.generateId(),
      type: 'user',
      content,
      timestamp: new Date()
    };

    this.addMessage(userMessage);
    this.showTypingIndicator();

    try {
      const response = await this.makeRequest('/v1/conversation/message', {
        sessionId: this.sessionId,
        message: {
          type: 'text',
          content,
          metadata: {
            timestamp: new Date().toISOString(),
            platform: 'web'
          }
        }
      });

      const botMessage: ChatMessage = {
        id: this.generateId(),
        type: 'bot',
        content: response.content,
        timestamp: new Date(),
        metadata: response.metadata
      };

      this.hideTypingIndicator();
      this.addMessage(botMessage);

      this.emit('messageReceived', botMessage);

      // Handle smart home actions if any
      if (response.smartHomeActions && response.smartHomeActions.length > 0) {
        this.emit('smartHomeAction', response.smartHomeActions);
      }

    } catch (error) {
      this.hideTypingIndicator();
      
      if (this.config.offlineMode && !navigator.onLine) {
        this.queueOfflineMessage(content);
        this.showOfflineMessage();
      } else {
        this.showErrorMessage('Sorry, I encountered an error. Please try again.');
        this.emit('error', error);
      }
    }
  }

  /**
   * Send welcome message
   */
  async sendWelcomeMessage(): Promise<void> {
    const welcomeMessages = [
      "Hi there! I'm your AI storyteller! 🌟",
      "I love creating magical stories with children. What's your name?",
      "Would you like to create a bedtime story, an adventure, or maybe something educational?"
    ];

    for (let i = 0; i < welcomeMessages.length; i++) {
      setTimeout(() => {
        const message: ChatMessage = {
          id: this.generateId(),
          type: 'bot',
          content: welcomeMessages[i],
          timestamp: new Date()
        };
        this.addMessage(message);
      }, i * 1500);
    }
  }

  /**
   * Enable voice input/output
   */
  async enableVoice(): Promise<void> {
    if (!this.isVoiceSupported()) {
      throw new Error('Voice not supported in this browser');
    }

    try {
      await this.initializeVoice();
      this.isVoiceEnabled = true;
      this.updateVoiceButton();
      this.emit('voiceEnabled');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Disable voice input/output
   */
  disableVoice(): void {
    this.isVoiceEnabled = false;
    if (this.mediaRecorder && this.isRecording) {
      this.stopRecording();
    }
    this.updateVoiceButton();
    this.emit('voiceDisabled');
  }

  /**
   * Start voice recording
   */
  async startVoiceRecording(): Promise<void> {
    if (!this.isVoiceEnabled || this.isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        await this.processVoiceInput(audioBlob);
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      this.updateVoiceButton();
      this.emit('voiceRecordingStarted');

    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * Stop voice recording
   */
  stopVoiceRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.updateVoiceButton();
      this.emit('voiceRecordingStopped');
    }
  }

  /**
   * Get conversation history
   */
  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  /**
   * Clear conversation history
   */
  clearMessages(): void {
    this.messages = [];
    this.chatContainer.innerHTML = '';
    this.emit('messagesCleared');
  }

  /**
   * Destroy the SDK and clean up
   */
  destroy(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
    }
    
    this.container.innerHTML = '';
    this.removeAllListeners();
    this.emit('destroyed');
  }

  // Private methods

  private validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error('API key is required');
    }
    if (!this.config.containerId) {
      throw new Error('Container ID is required');
    }
  }

  private createChatInterface(): void {
    const theme = this.getThemeStyles();
    
    this.container.innerHTML = `
      <div class="storyteller-widget" style="${theme.widget}">
        <div class="storyteller-header" style="${theme.header}">
          <div class="storyteller-title">
            ${this.config.customization?.branding?.logo ? 
              `<img src="${this.config.customization.branding.logo}" alt="Logo" style="height: 24px; margin-right: 8px;">` : 
              '🌟'
            }
            ${this.config.customization?.branding?.name || 'Storyteller'}
          </div>
          <div class="storyteller-status" id="storyteller-status">
            <span class="status-dot" style="${theme.statusDot}"></span>
            Online
          </div>
        </div>
        <div class="storyteller-chat" id="storyteller-chat" style="${theme.chat}">
          <!-- Messages will be added here -->
        </div>
        <div class="storyteller-input" style="${theme.inputContainer}">
          <input 
            type="text" 
            id="storyteller-input" 
            placeholder="Type your message..." 
            style="${theme.input}"
            maxlength="${this.config.customization?.features?.maxMessageLength || 500}"
          >
          <button id="storyteller-send" style="${theme.sendButton}">Send</button>
          ${this.config.voiceEnabled ? `
            <button id="storyteller-voice" style="${theme.voiceButton}" title="Voice input">
              🎤
            </button>
          ` : ''}
        </div>
        ${this.config.customization?.features?.allowFileUpload ? `
          <input type="file" id="storyteller-file" style="display: none;" accept="image/*">
        ` : ''}
      </div>
    `;

    this.chatContainer = document.getElementById('storyteller-chat')!;
    this.inputContainer = this.container.querySelector('.storyteller-input')!;
  }

  private getThemeStyles(): Record<string, string> {
    const colors = this.config.customization?.colors || {};
    const primary = colors.primary || '#667eea';
    const secondary = colors.secondary || '#764ba2';
    const accent = colors.accent || '#ff6b6b';
    const background = colors.background || '#ffffff';
    const text = colors.text || '#333333';

    return {
      widget: `
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        font-family: 'Comic Sans MS', cursive, sans-serif;
        border-radius: 15px;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        background: ${background};
      `,
      header: `
        background: linear-gradient(135deg, ${primary}, ${secondary});
        color: white;
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: bold;
      `,
      statusDot: `
        width: 8px;
        height: 8px;
        background: #4ade80;
        border-radius: 50%;
        display: inline-block;
        margin-right: 4px;
      `,
      chat: `
        flex: 1;
        padding: 1rem;
        overflow-y: auto;
        background: #f8f9fa;
      `,
      inputContainer: `
        padding: 1rem;
        display: flex;
        gap: 0.5rem;
        background: ${background};
        border-top: 1px solid #e5e7eb;
      `,
      input: `
        flex: 1;
        padding: 0.75rem;
        border: 2px solid #e5e7eb;
        border-radius: 25px;
        font-size: 1rem;
        outline: none;
        font-family: inherit;
      `,
      sendButton: `
        background: linear-gradient(45deg, ${accent}, #ffa500);
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 25px;
        font-weight: bold;
        cursor: pointer;
        transition: transform 0.2s;
      `,
      voiceButton: `
        background: ${primary};
        color: white;
        border: none;
        padding: 0.75rem;
        border-radius: 50%;
        cursor: pointer;
        font-size: 1.2rem;
        transition: all 0.2s;
      `
    };
  }

  private setupEventListeners(): void {
    const input = document.getElementById('storyteller-input') as HTMLInputElement;
    const sendButton = document.getElementById('storyteller-send') as HTMLButtonElement;
    const voiceButton = document.getElementById('storyteller-voice') as HTMLButtonElement;

    // Send message on Enter or button click
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSendMessage();
      }
    });

    sendButton.addEventListener('click', () => {
      this.handleSendMessage();
    });

    // Voice button
    if (voiceButton) {
      voiceButton.addEventListener('click', () => {
        if (this.isRecording) {
          this.stopVoiceRecording();
        } else {
          this.startVoiceRecording();
        }
      });
    }

    // File upload
    const fileInput = document.getElementById('storyteller-file') as HTMLInputElement;
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          this.handleFileUpload(file);
        }
      });
    }

    // Online/offline detection
    window.addEventListener('online', () => {
      this.handleOnline();
    });

    window.addEventListener('offline', () => {
      this.handleOffline();
    });
  }

  private async handleSendMessage(): Promise<void> {
    const input = document.getElementById('storyteller-input') as HTMLInputElement;
    const message = input.value.trim();
    
    if (message) {
      input.value = '';
      await this.sendMessage(message);
    }
  }

  private addMessage(message: ChatMessage): void {
    this.messages.push(message);
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.type}-message`;
    messageElement.style.cssText = `
      margin-bottom: 1rem;
      display: flex;
      ${message.type === 'user' ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
    `;

    const bubble = document.createElement('div');
    bubble.style.cssText = `
      max-width: 70%;
      padding: 0.75rem 1rem;
      border-radius: 18px;
      ${message.type === 'user' ? 
        'background: linear-gradient(45deg, #667eea, #764ba2); color: white; margin-left: auto;' :
        'background: white; color: #333; box-shadow: 0 2px 8px rgba(0,0,0,0.1);'
      }
      font-size: 0.95rem;
      line-height: 1.4;
    `;

    bubble.textContent = message.content;

    if (this.config.customization?.features?.showTimestamps) {
      const timestamp = document.createElement('div');
      timestamp.style.cssText = `
        font-size: 0.75rem;
        opacity: 0.7;
        margin-top: 0.25rem;
        ${message.type === 'user' ? 'text-align: right;' : 'text-align: left;'}
      `;
      timestamp.textContent = message.timestamp.toLocaleTimeString();
      bubble.appendChild(timestamp);
    }

    messageElement.appendChild(bubble);
    this.chatContainer.appendChild(messageElement);
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  }

  private showTypingIndicator(): void {
    if (this.isTyping) return;
    
    this.isTyping = true;
    const indicator = document.createElement('div');
    indicator.id = 'typing-indicator';
    indicator.style.cssText = `
      display: flex;
      align-items: center;
      margin-bottom: 1rem;
      opacity: 0.7;
    `;
    
    indicator.innerHTML = `
      <div style="
        background: white;
        padding: 0.75rem 1rem;
        border-radius: 18px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      ">
        <div style="display: flex; gap: 4px;">
          <div class="typing-dot" style="width: 8px; height: 8px; background: #667eea; border-radius: 50%; animation: typing 1.4s infinite;"></div>
          <div class="typing-dot" style="width: 8px; height: 8px; background: #667eea; border-radius: 50%; animation: typing 1.4s infinite 0.2s;"></div>
          <div class="typing-dot" style="width: 8px; height: 8px; background: #667eea; border-radius: 50%; animation: typing 1.4s infinite 0.4s;"></div>
        </div>
      </div>
    `;

    // Add CSS animation
    if (!document.getElementById('typing-animation')) {
      const style = document.createElement('style');
      style.id = 'typing-animation';
      style.textContent = `
        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-10px); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    this.chatContainer.appendChild(indicator);
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  }

  private hideTypingIndicator(): void {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.remove();
      this.isTyping = false;
    }
  }

  private showErrorMessage(message: string): void {
    const errorMessage: ChatMessage = {
      id: this.generateId(),
      type: 'bot',
      content: message,
      timestamp: new Date()
    };
    this.addMessage(errorMessage);
  }

  private showOfflineMessage(): void {
    const offlineMessage: ChatMessage = {
      id: this.generateId(),
      type: 'bot',
      content: "I'm offline right now, but I'll remember your message and respond when I'm back online! 📱",
      timestamp: new Date()
    };
    this.addMessage(offlineMessage);
  }

  private async initializeVoice(): Promise<void> {
    if (!this.isVoiceSupported()) {
      throw new Error('Voice not supported');
    }

    // Request microphone permission
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      throw new Error('Microphone permission denied');
    }
  }

  private isVoiceSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  }

  private updateVoiceButton(): void {
    const voiceButton = document.getElementById('storyteller-voice') as HTMLButtonElement;
    if (voiceButton) {
      if (this.isRecording) {
        voiceButton.textContent = '⏹️';
        voiceButton.style.background = '#ef4444';
      } else {
        voiceButton.textContent = '🎤';
        voiceButton.style.background = this.config.customization?.colors?.primary || '#667eea';
      }
    }
  }

  private async processVoiceInput(audioBlob: Blob): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('sessionId', this.sessionId!);
      formData.append('format', 'wav');

      const response = await fetch(`${this.config.baseUrl}/v1/conversation/voice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Voice processing failed');
      }

      const result = await response.json();
      
      // Add transcribed message as user message
      const userMessage: ChatMessage = {
        id: this.generateId(),
        type: 'user',
        content: result.transcription,
        timestamp: new Date()
      };
      this.addMessage(userMessage);

      // Add bot response
      const botMessage: ChatMessage = {
        id: this.generateId(),
        type: 'bot',
        content: result.textResponse,
        timestamp: new Date(),
        metadata: result.metadata
      };
      this.addMessage(botMessage);

      // Play audio response if available
      if (result.audioResponse) {
        await this.playAudioResponse(result.audioResponse);
      }

      this.emit('voiceProcessed', result);

    } catch (error) {
      this.showErrorMessage('Sorry, I had trouble understanding your voice. Please try again.');
      this.emit('error', error);
    }
  }

  private async playAudioResponse(audioData: any): Promise<void> {
    try {
      const audio = new Audio();
      audio.src = `data:audio/wav;base64,${audioData.data}`;
      await audio.play();
    } catch (error) {
      console.warn('Could not play audio response:', error);
    }
  }

  private async handleFileUpload(file: File): Promise<void> {
    // Implementation for file upload
    this.emit('fileUploaded', file);
  }

  private setupOfflineSupport(): void {
    // Store messages locally when offline
    this.on('messageReceived', (message) => {
      localStorage.setItem('storyteller-messages', JSON.stringify(this.messages));
    });

    // Load stored messages on init
    const storedMessages = localStorage.getItem('storyteller-messages');
    if (storedMessages) {
      try {
        this.messages = JSON.parse(storedMessages);
        this.messages.forEach(message => this.addMessage(message));
      } catch (error) {
        console.warn('Could not load stored messages:', error);
      }
    }
  }

  private queueOfflineMessage(content: string): void {
    this.offlineQueue.push({
      content,
      timestamp: new Date().toISOString()
    });
  }

  private async handleOnline(): Promise<void> {
    const statusElement = document.getElementById('storyteller-status');
    if (statusElement) {
      statusElement.innerHTML = '<span class="status-dot" style="width: 8px; height: 8px; background: #4ade80; border-radius: 50%; display: inline-block; margin-right: 4px;"></span>Online';
    }

    // Process offline queue
    while (this.offlineQueue.length > 0) {
      const queuedMessage = this.offlineQueue.shift();
      await this.sendMessage(queuedMessage.content);
    }

    this.emit('online');
  }

  private handleOffline(): void {
    const statusElement = document.getElementById('storyteller-status');
    if (statusElement) {
      statusElement.innerHTML = '<span class="status-dot" style="width: 8px; height: 8px; background: #ef4444; border-radius: 50%; display: inline-block; margin-right: 4px;"></span>Offline';
    }
    this.emit('offline');
  }

  private async startConversation(): Promise<void> {
    try {
      const response = await this.makeRequest('/v1/conversation/start', {
        platform: 'web',
        language: 'en',
        voiceEnabled: this.config.voiceEnabled,
        smartHomeEnabled: this.config.smartHomeEnabled,
        parentalControls: this.config.parentalControls,
        privacySettings: this.config.privacySettings
      });

      this.sessionId = response.sessionId;
      this.emit('sessionStarted', response);

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async makeRequest(endpoint: string, data: any): Promise<any> {
    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

// Make it available globally for easy embedding
declare global {
  interface Window {
    StorytellerWebSDK: typeof StorytellerWebSDK;
  }
}

if (typeof window !== 'undefined') {
  window.StorytellerWebSDK = StorytellerWebSDK;
}
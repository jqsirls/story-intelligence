/**
 * Chat Interface Component
 * Handles the conversational UI with typing indicators, message bubbles, and voice controls
 */

import { ChatMessage } from '../StorytalorEmbed';

export interface ChatInterfaceConfig {
  voiceEnabled: boolean;
  welcomeMessage: string;
  onMessage: (content: string) => Promise<void>;
  onVoiceStart: () => Promise<void>;
  onVoiceStop: () => Promise<void>;
}

export class ChatInterface {
  private container: HTMLElement;
  private config: ChatInterfaceConfig;
  private messagesContainer: HTMLElement;
  private inputContainer: HTMLElement;
  private messageInput: HTMLInputElement;
  private sendButton: HTMLButtonElement;
  private voiceButton?: HTMLButtonElement;
  private isTyping = false;
  private isRecording = false;

  constructor(container: HTMLElement, config: ChatInterfaceConfig) {
    this.container = container;
    this.config = config;
    this.createInterface();
    this.setupEventListeners();
  }

  /**
   * Add a message to the chat
   */
  addMessage(message: ChatMessage): void {
    const messageElement = this.createMessageElement(message);
    this.messagesContainer.appendChild(messageElement);
    this.scrollToBottom();
    
    // Animate message in
    requestAnimationFrame(() => {
      messageElement.classList.add('st-message-animate-in');
    });
  }

  /**
   * Show typing indicator
   */
  showTypingIndicator(): void {
    if (this.isTyping) return;
    
    this.isTyping = true;
    const indicator = document.createElement('div');
    indicator.className = 'st-typing-indicator';
    indicator.id = 'st-typing-indicator';
    
    indicator.innerHTML = `
      <div class="st-message st-message-assistant">
        <div class="st-message-avatar">
          <div class="st-avatar st-avatar-bot">🌟</div>
        </div>
        <div class="st-message-content">
          <div class="st-message-bubble st-message-bubble-assistant">
            <div class="st-typing-dots">
              <div class="st-typing-dot"></div>
              <div class="st-typing-dot"></div>
              <div class="st-typing-dot"></div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.messagesContainer.appendChild(indicator);
    this.scrollToBottom();
  }

  /**
   * Hide typing indicator
   */
  hideTypingIndicator(): void {
    const indicator = document.getElementById('st-typing-indicator');
    if (indicator) {
      indicator.remove();
      this.isTyping = false;
    }
  }

  /**
   * Clear all messages
   */
  clearMessages(): void {
    this.messagesContainer.innerHTML = '';
  }

  /**
   * Set voice recording state
   */
  setVoiceRecording(recording: boolean): void {
    this.isRecording = recording;
    if (this.voiceButton) {
      this.voiceButton.classList.toggle('st-voice-recording', recording);
      this.voiceButton.innerHTML = recording ? 
        '<span class="st-icon-stop"></span>' : 
        '<span class="st-icon-mic"></span>';
    }
  }

  /**
   * Destroy the component
   */
  destroy(): void {
    // Remove event listeners and clean up
    this.container.innerHTML = '';
  }

  // Private methods

  private createInterface(): void {
    this.container.innerHTML = `
      <div class="st-chat-interface">
        <div class="st-messages-container">
          <div class="st-messages" id="st-messages">
            <!-- Messages will be added here -->
          </div>
        </div>
        
        <div class="st-input-container">
          <div class="st-input-wrapper">
            <input 
              type="text" 
              class="st-message-input" 
              placeholder="Type your message..." 
              maxlength="500"
              id="st-message-input"
            >
            <button class="st-btn st-btn-send" id="st-send-button">
              <span class="st-icon-send"></span>
            </button>
            ${this.config.voiceEnabled ? `
              <button class="st-btn st-btn-voice" id="st-voice-button">
                <span class="st-icon-mic"></span>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
    
    // Get references
    this.messagesContainer = this.container.querySelector('#st-messages')!;
    this.inputContainer = this.container.querySelector('.st-input-container')!;
    this.messageInput = this.container.querySelector('#st-message-input')!;
    this.sendButton = this.container.querySelector('#st-send-button')!;
    
    if (this.config.voiceEnabled) {
      this.voiceButton = this.container.querySelector('#st-voice-button')!;
    }
  }

  private setupEventListeners(): void {
    // Send message on Enter key
    this.messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSendMessage();
      }
    });
    
    // Send button click
    this.sendButton.addEventListener('click', () => {
      this.handleSendMessage();
    });
    
    // Voice button click
    if (this.voiceButton) {
      this.voiceButton.addEventListener('click', () => {
        this.handleVoiceToggle();
      });
    }
    
    // Auto-resize input
    this.messageInput.addEventListener('input', () => {
      this.updateSendButtonState();
    });
    
    // Initial button state
    this.updateSendButtonState();
  }

  private async handleSendMessage(): Promise<void> {
    const content = this.messageInput.value.trim();
    if (!content) return;
    
    // Clear input
    this.messageInput.value = '';
    this.updateSendButtonState();
    
    try {
      await this.config.onMessage(content);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Show error state
      this.showErrorMessage('Failed to send message. Please try again.');
    }
  }

  private async handleVoiceToggle(): Promise<void> {
    if (!this.voiceButton) return;
    
    try {
      if (this.isRecording) {
        await this.config.onVoiceStop();
      } else {
        await this.config.onVoiceStart();
      }
    } catch (error) {
      console.error('Voice operation failed:', error);
      this.showErrorMessage('Voice feature is not available right now.');
    }
  }

  private createMessageElement(message: ChatMessage): HTMLElement {
    const messageEl = document.createElement('div');
    messageEl.className = `st-message st-message-${message.type}`;
    messageEl.setAttribute('data-message-id', message.id);
    
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';
    
    messageEl.innerHTML = `
      <div class="st-message-avatar">
        <div class="st-avatar ${isUser ? 'st-avatar-user' : 'st-avatar-bot'}">
          ${isUser ? '👤' : isSystem ? '🤖' : '🌟'}
        </div>
      </div>
      <div class="st-message-content">
        <div class="st-message-bubble st-message-bubble-${message.type}">
          <div class="st-message-text">${this.formatMessageContent(message.content)}</div>
          ${message.metadata?.storyId ? this.createStoryActions(message.metadata.storyId) : ''}
          <div class="st-message-time">
            ${this.formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    `;
    
    return messageEl;
  }

  private formatMessageContent(content: string): string {
    // Basic markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  private createStoryActions(storyId: string): string {
    return `
      <div class="st-message-actions">
        <button class="st-btn st-btn-sm st-btn-primary" data-action="read-story" data-story-id="${storyId}">
          📖 Read Story
        </button>
        <button class="st-btn st-btn-sm st-btn-secondary" data-action="listen-story" data-story-id="${storyId}">
          🎧 Listen
        </button>
      </div>
    `;
  }

  private formatTime(timestamp: Date): string {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  private updateSendButtonState(): void {
    const hasContent = this.messageInput.value.trim().length > 0;
    this.sendButton.disabled = !hasContent;
    this.sendButton.classList.toggle('st-btn-disabled', !hasContent);
  }

  private showErrorMessage(message: string): void {
    const errorMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'system',
      content: message,
      timestamp: new Date()
    };
    
    this.addMessage(errorMessage);
  }

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    });
  }
}
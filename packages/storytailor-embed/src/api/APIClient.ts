/**
 * API Client
 * Handles communication with Storytailor backend
 */

export interface APIClientConfig {
  apiKey: string;
  baseUrl: string;
  debug: boolean;
}

export interface SessionResponse {
  sessionId: string;
  userId: string;
}

export interface MessageResponse {
  content: string;
  metadata?: {
    storyId?: string;
    audioUrl?: string;
    confidence?: number;
  };
}

export class APIClient {
  private config: APIClientConfig;
  private sessionId: string | null = null;

  constructor(config: APIClientConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Validate API key format
    if (!this.config.apiKey || this.config.apiKey.length < 10) {
      throw new Error('Invalid API key');
    }
  }

  async startSession(options: any): Promise<SessionResponse> {
    const response = await this.request('/api/v1/sessions', {
      method: 'POST',
      body: JSON.stringify(options)
    });

    return response;
  }

  async sendMessage(sessionId: string, content: string): Promise<MessageResponse> {
    const response = await this.request('/api/v1/chat/message', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        content,
        timestamp: new Date().toISOString()
      })
    });

    return response;
  }

  async processVoice(audioBlob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');

    const response = await this.request('/api/v1/voice/transcribe', {
      method: 'POST',
      body: formData
    });

    return response.transcript;
  }

  async getStories(filters?: any): Promise<any[]> {
    const params = new URLSearchParams(filters || {});
    const response = await this.request(`/api/v1/stories?${params}`);
    return response.stories || [];
  }

  async getStory(storyId: string): Promise<any> {
    const response = await this.request(`/api/v1/stories/${storyId}`);
    return response.story;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json'
    };

    // Don't set Content-Type for FormData
    if (options.body instanceof FormData) {
      delete defaultHeaders['Content-Type'];
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }
}
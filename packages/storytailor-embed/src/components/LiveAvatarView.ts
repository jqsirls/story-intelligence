/**
 * Live Avatar View
 * Manages live Frankie avatar using Hedra/LiveKit for video modalities
 */

// Note: LiveKit client will be loaded dynamically to keep bundle size down
// or included as peer dependency

export interface LiveAvatarConfig {
  characterId: string;
  voiceId: string;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

export class LiveAvatarView {
  private container: HTMLElement;
  private config: LiveAvatarConfig;
  private videoElement: HTMLVideoElement | null = null;
  private sessionActive = false;
  private roomUrl: string | null = null;
  private token: string | null = null;

  constructor(container: HTMLElement, config: LiveAvatarConfig) {
    this.container = container;
    this.config = config;
    this.createVideoElement();
  }

  /**
   * Start avatar session and connect to video stream
   */
  async startSession(apiBaseUrl: string, apiKey: string): Promise<void> {
    try {
      // Call avatar start endpoint
      const response = await fetch(`${apiBaseUrl}/v1/avatar/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          characterId: this.config.characterId,
          voiceId: this.config.voiceId
        })
      });

      if (!response.ok) {
        throw new Error(`Avatar session failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle different response formats
      if (data.data) {
        this.roomUrl = data.data.livekitUrl || data.data.roomUrl;
        this.token = data.data.token || data.data.accessToken;
      } else {
        this.roomUrl = data.livekitUrl || data.roomUrl;
        this.token = data.token || data.accessToken;
      }
      
      // If LiveKit client is available, connect
      if (this.isLiveKitAvailable()) {
        await this.connectToLiveKit();
      } else {
        // Fallback: Show static avatar image
        this.showStaticAvatar();
      }
      
      this.sessionActive = true;
      this.config.onReady?.();
      
    } catch (error) {
      console.error('Failed to start avatar session:', error);
      this.config.onError?.(error as Error);
      // Fallback to static avatar
      this.showStaticAvatar();
    }
  }

  /**
   * Send message to avatar (for lip-sync)
   */
  async sendMessage(apiBaseUrl: string, apiKey: string, message: string): Promise<void> {
    if (!this.sessionActive) return;
    
    try {
      await fetch(`${apiBaseUrl}/v1/avatar/say`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          emotion: 'friendly'
        })
      });
    } catch (error) {
      console.error('Failed to send message to avatar:', error);
    }
  }

  /**
   * End avatar session
   */
  async endSession(apiBaseUrl: string, apiKey: string): Promise<void> {
    if (!this.sessionActive) return;
    
    try {
      await fetch(`${apiBaseUrl}/v1/avatar/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      this.sessionActive = false;
      
      // Disconnect LiveKit if connected
      if ((window as any).LiveKit) {
        // Cleanup LiveKit connection
      }
      
    } catch (error) {
      console.error('Failed to end avatar session:', error);
    }
  }

  /**
   * Destroy the component
   */
  destroy(): void {
    this.sessionActive = false;
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.src = '';
    }
    this.container.innerHTML = '';
  }

  // Private methods

  private createVideoElement(): void {
    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;
    this.videoElement.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
    `;
    
    this.container.appendChild(this.videoElement);
  }

  private isLiveKitAvailable(): boolean {
    // Check if LiveKit SDK is loaded
    return typeof (window as any).LiveKit !== 'undefined';
  }

  private async connectToLiveKit(): Promise<void> {
    if (!this.roomUrl || !this.token) {
      throw new Error('Missing LiveKit credentials');
    }

    try {
      const LiveKit = (window as any).LiveKit;
      const room = new LiveKit.Room();
      
      // Listen for avatar video track
      room.on(LiveKit.RoomEvent.TrackSubscribed, (track: any, publication: any, participant: any) => {
        if (participant.identity === 'hedra-avatar-agent' || participant.identity.includes('frankie')) {
          track.attach(this.videoElement);
        }
      });
      
      await room.connect(this.roomUrl, this.token);
      
    } catch (error) {
      console.error('LiveKit connection failed:', error);
      throw error;
    }
  }

  private showStaticAvatar(): void {
    // Show static Frankie image as fallback
    const img = document.createElement('img');
    img.src = 'https://storytailor-audio.s3.us-east-1.amazonaws.com/characters/frankie-official-avatar.png';
    img.alt = 'Frankie';
    img.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
    `;
    
    this.container.innerHTML = '';
    this.container.appendChild(img);
  }
}


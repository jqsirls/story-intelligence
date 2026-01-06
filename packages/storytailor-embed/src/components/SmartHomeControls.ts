/**
 * Smart Home Controls
 * Philips Hue integration controls
 */

export interface SmartHomeConfig {
  onConnectHue: () => Promise<void>;
  onDisconnectHue: () => Promise<void>;
  onToggleSync: (enabled: boolean) => Promise<void>;
  onSelectRoom: (roomId: string) => Promise<void>;
}

export class SmartHomeControls {
  private container: HTMLElement;
  private config: SmartHomeConfig;
  private hueConnected = false;
  private storySyncEnabled = false;
  private rooms: any[] = [];

  constructor(container: HTMLElement, config: SmartHomeConfig) {
    this.container = container;
    this.config = config;
  }

  /**
   * Render smart home controls
   */
  render(hueConnected: boolean, rooms: any[], storySyncEnabled: boolean): void {
    this.hueConnected = hueConnected;
    this.rooms = rooms;
    this.storySyncEnabled = storySyncEnabled;

    this.container.innerHTML = `
      <div class="st-smarthome-controls">
        <h3>🏠 Smart Home</h3>
        <p>Sync Philips Hue lights with your stories for an immersive experience</p>
        
        ${this.hueConnected ? this.renderConnectedState() : this.renderDisconnectedState()}
      </div>
    `;

    this.setupEventListeners();
  }

  private renderDisconnectedState(): string {
    return `
      <div class="st-hue-disconnected">
        <div class="st-hue-icon">💡</div>
        <p>Connect your Philips Hue lights to bring stories to life!</p>
        <button class="st-btn st-btn-primary" id="st-connect-hue-btn">
          Connect Philips Hue
        </button>
      </div>
    `;
  }

  private renderConnectedState(): string {
    return `
      <div class="st-hue-connected">
        <div class="st-hue-status-card">
          <span class="st-status-indicator connected">✅ Philips Hue Connected</span>
          <button class="st-btn st-btn-secondary st-btn-sm" id="st-disconnect-hue-btn">
            Disconnect
          </button>
        </div>
        
        <div class="st-hue-settings">
          <div class="st-setting-row">
            <label class="st-switch-label">
              <input 
                type="checkbox" 
                id="st-story-sync-toggle"
                ${this.storySyncEnabled ? 'checked' : ''}
              />
              <span class="st-switch"></span>
              <span class="st-switch-text">Sync lights during stories</span>
            </label>
          </div>
          
          ${this.rooms.length > 0 ? `
            <div class="st-setting-row">
              <label>Room:</label>
              <select id="st-room-select" class="st-room-dropdown">
                ${this.rooms.map(room => `
                  <option value="${room.id}">${room.name}</option>
                `).join('')}
              </select>
            </div>
          ` : ''}
        </div>
        
        <div class="st-hue-preview">
          <h4>Story Lighting Preview</h4>
          <div class="st-lighting-examples">
            <div class="st-lighting-example">
              <div class="st-lighting-circle" style="background: linear-gradient(135deg, #ff6b6b, #ffa500)"></div>
              <span>Adventure</span>
            </div>
            <div class="st-lighting-example">
              <div class="st-lighting-circle" style="background: linear-gradient(135deg, #4ecdc4, #44a8f2)"></div>
              <span>Calm</span>
            </div>
            <div class="st-lighting-example">
              <div class="st-lighting-circle" style="background: linear-gradient(135deg, #a8dadc, #f1faee)"></div>
              <span>Bedtime</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private setupEventListeners(): void {
    // Connect Hue
    const connectBtn = this.container.querySelector('#st-connect-hue-btn');
    connectBtn?.addEventListener('click', () => this.config.onConnectHue());

    // Disconnect Hue
    const disconnectBtn = this.container.querySelector('#st-disconnect-hue-btn');
    disconnectBtn?.addEventListener('click', () => this.config.onDisconnectHue());

    // Toggle sync
    const syncToggle = this.container.querySelector('#st-story-sync-toggle') as HTMLInputElement;
    syncToggle?.addEventListener('change', (e) => {
      this.config.onToggleSync((e.target as HTMLInputElement).checked);
    });

    // Select room
    const roomSelect = this.container.querySelector('#st-room-select') as HTMLSelectElement;
    roomSelect?.addEventListener('change', (e) => {
      this.config.onSelectRoom((e.target as HTMLSelectElement).value);
    });
  }

  destroy(): void {
    this.container.innerHTML = '';
  }
}


/**
 * Parent Dashboard
 * Complete parental monitoring and control interface
 */

export interface ChildActivity {
  childId: string;
  childName: string;
  childAge: number;
  childAvatar?: string;
  storiesCreated: number;
  charactersCreated: number;
  totalSessions: number;
  lastActive: string;
  accountCreated: string;
}

export interface EmotionRecord {
  id: string;
  emotion: string;
  tier: number;
  timestamp: string;
  context?: string;
}

export interface SafetyAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'urgent';
  message: string;
  timestamp: string;
  actionTaken: string;
  resolved: boolean;
}

export interface ParentDashboardConfig {
  onExportData: () => void;
  onManageConsent: () => void;
  onManageSettings: () => void;
  onRevokeConsent: () => void;
  onDeleteAccount: () => void;
}

export class ParentDashboard {
  private container: HTMLElement;
  private config: ParentDashboardConfig;
  private childActivity: ChildActivity | null = null;
  private emotionHistory: EmotionRecord[] = [];
  private safetyAlerts: SafetyAlert[] = [];

  constructor(container: HTMLElement, config: ParentDashboardConfig) {
    this.container = container;
    this.config = config;
  }

  /**
   * Render complete parent dashboard
   */
  render(activity: ChildActivity, emotions: EmotionRecord[], alerts: SafetyAlert[]): void {
    this.childActivity = activity;
    this.emotionHistory = emotions;
    this.safetyAlerts = alerts;

    this.container.innerHTML = `
      <div class="st-parent-dashboard">
        ${this.renderHeader()}
        ${this.renderActivitySummary()}
        ${this.renderEmotionTracking()}
        ${this.renderSafetyAlerts()}
        ${this.renderParentControls()}
      </div>
    `;

    this.setupEventListeners();
  }

  /**
   * Render dashboard header with child info
   */
  private renderHeader(): string {
    if (!this.childActivity) return '';

    return `
      <div class="st-parent-header">
        <div class="st-child-info-card">
          <div class="st-child-avatar">
            ${this.childActivity.childAvatar ? 
              `<img src="${this.childActivity.childAvatar}" alt="${this.childActivity.childName}" />` :
              `<div class="st-avatar-placeholder">${this.childActivity.childName.charAt(0)}</div>`
            }
          </div>
          <div class="st-child-details">
            <h2>${this.childActivity.childName}</h2>
            <div class="st-child-meta">
              <span>Age ${this.childActivity.childAge}</span>
              <span>•</span>
              <span>Active since ${new Date(this.childActivity.accountCreated).toLocaleDateString()}</span>
            </div>
            <div class="st-child-status">
              <span class="st-status-dot active"></span>
              Last active: ${this.formatRelativeTime(this.childActivity.lastActive)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render activity summary stats
   */
  private renderActivitySummary(): string {
    if (!this.childActivity) return '';

    return `
      <div class="st-activity-summary">
        <h3>Activity Overview</h3>
        <div class="st-stats-grid">
          <div class="st-stat-card">
            <div class="st-stat-icon">📖</div>
            <div class="st-stat-number">${this.childActivity.storiesCreated}</div>
            <div class="st-stat-label">Stories Created</div>
          </div>
          <div class="st-stat-card">
            <div class="st-stat-icon">🎭</div>
            <div class="st-stat-number">${this.childActivity.charactersCreated}</div>
            <div class="st-stat-label">Characters</div>
          </div>
          <div class="st-stat-card">
            <div class="st-stat-icon">⭐</div>
            <div class="st-stat-number">${this.childActivity.totalSessions}</div>
            <div class="st-stat-label">Sessions</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render emotion tracking (3-tier system)
   */
  private renderEmotionTracking(): string {
    if (this.emotionHistory.length === 0) {
      return `
        <div class="st-emotion-tracking">
          <h3>Emotional Check-ins</h3>
          <div class="st-empty-state">
            <p>No emotional check-ins yet</p>
          </div>
        </div>
      `;
    }

    return `
      <div class="st-emotion-tracking">
        <h3>Recent Emotional Check-ins</h3>
        <div class="st-emotion-timeline">
          ${this.emotionHistory.slice(0, 10).map(record => this.renderEmotionRecord(record)).join('')}
        </div>
        ${this.emotionHistory.length > 10 ? 
          `<button class="st-link-btn" onclick="widget.showAllEmotions()">View All (${this.emotionHistory.length})</button>` : 
          ''
        }
      </div>
    `;
  }

  /**
   * Render individual emotion record
   */
  private renderEmotionRecord(record: EmotionRecord): string {
    const tierLabels = {
      1: { label: 'Everyday Feeling', color: '#22c55e' },
      2: { label: 'Big Feeling', color: '#f59e0b' },
      3: { label: 'Needs Support', color: '#ef4444' }
    };

    const tierInfo = tierLabels[record.tier as 1 | 2 | 3] || { label: 'Unknown', color: '#9ca3af' };

    return `
      <div class="st-emotion-record" data-tier="${record.tier}">
        <div class="st-emotion-indicator" style="background: ${tierInfo.color}"></div>
        <div class="st-emotion-content">
          <div class="st-emotion-header">
            <span class="st-emotion-name">${record.emotion}</span>
            <span class="st-emotion-tier" style="color: ${tierInfo.color}">${tierInfo.label}</span>
          </div>
          <div class="st-emotion-time">${this.formatRelativeTime(record.timestamp)}</div>
          ${record.context ? `<div class="st-emotion-context">${record.context}</div>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render safety alerts
   */
  private renderSafetyAlerts(): string {
    const unresolvedAlerts = this.safetyAlerts.filter(a => !a.resolved);

    if (unresolvedAlerts.length === 0 && this.safetyAlerts.length === 0) {
      return `
        <div class="st-safety-alerts">
          <h3>Safety Notifications</h3>
          <div class="st-empty-state success">
            <div class="st-success-icon">✅</div>
            <p>No safety concerns detected</p>
          </div>
        </div>
      `;
    }

    return `
      <div class="st-safety-alerts">
        <h3>Safety Notifications ${unresolvedAlerts.length > 0 ? `<span class="st-alert-badge">${unresolvedAlerts.length}</span>` : ''}</h3>
        
        ${unresolvedAlerts.length > 0 ? `
          <div class="st-alerts-unresolved">
            <h4>Needs Attention</h4>
            ${unresolvedAlerts.map(alert => this.renderSafetyAlert(alert)).join('')}
          </div>
        ` : ''}
        
        ${this.safetyAlerts.filter(a => a.resolved).length > 0 ? `
          <div class="st-alerts-resolved">
            <h4>Resolved</h4>
            ${this.safetyAlerts.filter(a => a.resolved).slice(0, 5).map(alert => this.renderSafetyAlert(alert)).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render individual safety alert
   */
  private renderSafetyAlert(alert: SafetyAlert): string {
    const severityColors = {
      low: '#22c55e',
      medium: '#f59e0b',
      high: '#f97316',
      urgent: '#ef4444'
    };

    return `
      <div class="st-safety-alert ${alert.resolved ? 'resolved' : ''}" data-severity="${alert.severity}">
        <div class="st-alert-indicator" style="background: ${severityColors[alert.severity]}"></div>
        <div class="st-alert-content">
          <div class="st-alert-header">
            <span class="st-alert-type">${alert.type}</span>
            <span class="st-alert-severity" style="color: ${severityColors[alert.severity]}">${alert.severity.toUpperCase()}</span>
          </div>
          <div class="st-alert-message">${alert.message}</div>
          <div class="st-alert-time">${this.formatRelativeTime(alert.timestamp)}</div>
          ${alert.actionTaken ? `<div class="st-alert-action">Action taken: ${alert.actionTaken}</div>` : ''}
          ${!alert.resolved ? `
            <button class="st-btn st-btn-sm" onclick="widget.resolveAlert('${alert.id}')">Mark Resolved</button>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render parent controls
   */
  private renderParentControls(): string {
    return `
      <div class="st-parent-controls">
        <h3>Parental Controls</h3>
        <div class="st-controls-grid">
          <button class="st-control-btn" data-action="export-data">
            <span class="st-control-icon">📥</span>
            <span class="st-control-label">Download All Data</span>
            <span class="st-control-desc">Export child's data (GDPR)</span>
          </button>
          
          <button class="st-control-btn" data-action="manage-consent">
            <span class="st-control-icon">📋</span>
            <span class="st-control-label">Manage Consent</span>
            <span class="st-control-desc">View or revoke consent</span>
          </button>
          
          <button class="st-control-btn" data-action="manage-settings">
            <span class="st-control-icon">⚙️</span>
            <span class="st-control-label">Account Settings</span>
            <span class="st-control-desc">Privacy & preferences</span>
          </button>
          
          <button class="st-control-btn danger" data-action="delete-account">
            <span class="st-control-icon">🗑️</span>
            <span class="st-control-label">Delete Account</span>
            <span class="st-control-desc">Permanent removal</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('[data-action]');
      if (!btn) return;

      const action = btn.getAttribute('data-action');
      
      switch (action) {
        case 'export-data':
          this.config.onExportData();
          break;
        case 'manage-consent':
          this.config.onManageConsent();
          break;
        case 'manage-settings':
          this.config.onManageSettings();
          break;
        case 'delete-account':
          this.config.onDeleteAccount();
          break;
      }
    });
  }

  /**
   * Format relative time
   */
  private formatRelativeTime(timestamp: string): string {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diff = now - then;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    return new Date(timestamp).toLocaleDateString();
  }

  /**
   * Destroy component
   */
  destroy(): void {
    this.container.innerHTML = '';
  }
}


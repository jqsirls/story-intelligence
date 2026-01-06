/**
 * COPPA Manager
 * Consent status display and management for COPPA compliance
 */

export interface COPPAStatus {
  isChild: boolean;
  consentRequired: boolean;
  consentStatus: 'approved' | 'pending' | 'expired' | 'revoked';
  parentEmail: string;
  approvalDate?: string;
  expirationDate?: string;
}

export interface COPPAManagerConfig {
  onResendConsent: () => Promise<void>;
  onContactParent: () => void;
  onRevokeConsent: () => Promise<void>;
  onDeleteData: () => Promise<void>;
}

export class COPPAManager {
  private container: HTMLElement;
  private config: COPPAManagerConfig;
  private status: COPPAStatus | null = null;

  constructor(container: HTMLElement, config: COPPAManagerConfig) {
    this.container = container;
    this.config = config;
  }

  /**
   * Render COPPA status and controls
   */
  render(status: COPPAStatus): void {
    this.status = status;

    if (!status.isChild || !status.consentRequired) {
      this.container.innerHTML = `
        <div class="st-coppa-not-required">
          <p>COPPA parental consent not required for this account.</p>
        </div>
      `;
      return;
    }

    this.container.innerHTML = `
      <div class="st-coppa-manager">
        ${this.renderConsentStatus()}
        ${this.renderConsentActions()}
      </div>
    `;

    this.setupEventListeners();
  }

  /**
   * Render consent status display
   */
  private renderConsentStatus(): string {
    if (!this.status) return '';

    const statusConfig = {
      approved: {
        icon: '✅',
        label: 'Parent Approved',
        color: '#22c55e',
        message: `Your parent approved your account on ${new Date(this.status.approvalDate!).toLocaleDateString()}`
      },
      pending: {
        icon: '⏳',
        label: 'Waiting for Parent',
        color: '#f59e0b',
        message: `We sent an approval email to ${this.status.parentEmail}. Once they approve, you can start creating stories!`
      },
      expired: {
        icon: '⚠️',
        label: 'Consent Expired',
        color: '#ef4444',
        message: 'Your parent needs to renew consent to continue using Storytailor.'
      },
      revoked: {
        icon: '🚫',
        label: 'Consent Revoked',
        color: '#ef4444',
        message: 'Your parent has revoked consent. Contact them to restore access.'
      }
    };

    const config = statusConfig[this.status.consentStatus];

    return `
      <div class="st-coppa-status-card" data-status="${this.status.consentStatus}">
        <div class="st-consent-badge-large" style="border-color: ${config.color}">
          <span class="st-consent-icon">${config.icon}</span>
          <span class="st-consent-label" style="color: ${config.color}">${config.label}</span>
        </div>
        
        <div class="st-consent-message">
          <p>${config.message}</p>
        </div>
        
        <div class="st-parent-info">
          <div class="st-info-row">
            <span class="st-label">Parent Email:</span>
            <span class="st-value">${this.status.parentEmail}</span>
          </div>
          ${this.status.approvalDate ? `
            <div class="st-info-row">
              <span class="st-label">Approved:</span>
              <span class="st-value">${new Date(this.status.approvalDate).toLocaleDateString()}</span>
            </div>
          ` : ''}
          ${this.status.expirationDate ? `
            <div class="st-info-row">
              <span class="st-label">Expires:</span>
              <span class="st-value">${new Date(this.status.expirationDate).toLocaleDateString()}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render consent actions
   */
  private renderConsentActions(): string {
    if (!this.status) return '';

    if (this.status.consentStatus === 'pending') {
      return `
        <div class="st-consent-actions">
          <button class="st-btn st-btn-primary" id="st-resend-consent-btn">
            Resend Approval Email
          </button>
          <button class="st-btn st-btn-secondary" id="st-contact-parent-btn">
            Contact Parent
          </button>
        </div>
      `;
    }

    if (this.status.consentStatus === 'approved') {
      return `
        <div class="st-consent-actions">
          <p class="st-consent-note">
            If your parent wants to manage your consent, they can do so from their parent dashboard.
          </p>
        </div>
      `;
    }

    if (this.status.consentStatus === 'expired' || this.status.consentStatus === 'revoked') {
      return `
        <div class="st-consent-actions">
          <button class="st-btn st-btn-primary" id="st-contact-parent-btn">
            Contact Parent
          </button>
        </div>
      `;
    }

    return '';
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    const resendBtn = this.container.querySelector('#st-resend-consent-btn');
    resendBtn?.addEventListener('click', () => this.config.onResendConsent());

    const contactBtn = this.container.querySelector('#st-contact-parent-btn');
    contactBtn?.addEventListener('click', () => this.config.onContactParent());
  }

  /**
   * Destroy component
   */
  destroy(): void {
    this.container.innerHTML = '';
  }
}


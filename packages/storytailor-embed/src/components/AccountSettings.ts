/**
 * Account Settings
 * Complete account management, privacy, and subscription controls
 */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  age: number;
  isChild: boolean;
  parentEmail?: string;
  consentStatus?: string;
  createdAt: string;
}

export interface AccountSettingsConfig {
  onSave: (updates: Partial<UserProfile>) => Promise<void>;
  onExportData: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  onManageSubscription: () => void;
}

export class AccountSettings {
  private container: HTMLElement;
  private config: AccountSettingsConfig;
  private userProfile: UserProfile | null = null;
  private tierInfo: any | null = null;

  constructor(container: HTMLElement, config: AccountSettingsConfig) {
    this.container = container;
    this.config = config;
  }

  /**
   * Render complete settings interface
   */
  render(userProfile: UserProfile, tierInfo: any): void {
    this.userProfile = userProfile;
    this.tierInfo = tierInfo;

    this.container.innerHTML = `
      <div class="st-account-settings">
        <h2>Account Settings</h2>
        
        ${this.renderProfileSection()}
        ${this.renderSubscriptionSection()}
        ${this.renderPrivacySection()}
        ${userProfile.isChild ? this.renderParentInfoSection() : ''}
      </div>
    `;

    this.setupEventListeners();
  }

  /**
   * Render profile section
   */
  private renderProfileSection(): string {
    if (!this.userProfile) return '';

    return `
      <section class="st-settings-section">
        <h3>Profile Information</h3>
        
        <div class="st-form-field">
          <label>Name</label>
          <input type="text" id="st-profile-name" value="${this.userProfile.name}" />
        </div>
        
        <div class="st-form-field">
          <label>Email</label>
          <input type="email" id="st-profile-email" value="${this.userProfile.email}" />
          <div class="st-field-hint">Used for account recovery and notifications</div>
        </div>
        
        <div class="st-form-field">
          <label>Age</label>
          <input type="number" id="st-profile-age" value="${this.userProfile.age}" min="3" max="120" />
        </div>
        
        <div class="st-form-actions">
          <button class="st-btn st-btn-primary" id="st-save-profile-btn">
            Save Changes
          </button>
          <button class="st-btn st-btn-secondary" id="st-cancel-profile-btn">
            Cancel
          </button>
        </div>
      </section>
    `;
  }

  /**
   * Render subscription section
   */
  private renderSubscriptionSection(): string {
    if (!this.tierInfo) return '';

    const tierLabels = {
      free: '⭐ Free Tier',
      family: '👑 Family Tier',
      professional: '💼 Professional Tier',
      enterprise: '🏢 Enterprise Tier'
    };

    return `
      <section class="st-settings-section">
        <h3>Subscription</h3>
        
        <div class="st-subscription-card">
          <div class="st-subscription-header">
            <span class="st-tier-badge-large" data-tier="${this.tierInfo.tier}">
              ${tierLabels[this.tierInfo.tier as keyof typeof tierLabels]}
            </span>
          </div>
          
          <div class="st-subscription-details">
            ${this.tierInfo.storiesLimit === -1 ? `
              <div class="st-subscription-feature">
                <span class="st-feature-icon">✨</span>
                <span>Unlimited stories per month</span>
              </div>
            ` : `
              <div class="st-subscription-usage">
                <span>Stories this month: ${this.tierInfo.storiesUsed} / ${this.tierInfo.storiesLimit}</span>
                <div class="st-usage-bar">
                  <div class="st-usage-fill" style="width: ${(this.tierInfo.storiesUsed / this.tierInfo.storiesLimit) * 100}%"></div>
                </div>
              </div>
            `}
            
            ${this.tierInfo.renewalDate ? `
              <div class="st-subscription-renewal">
                <span>Renews: ${new Date(this.tierInfo.renewalDate).toLocaleDateString()}</span>
              </div>
            ` : ''}
          </div>
          
          <div class="st-subscription-actions">
            ${this.tierInfo.tier === 'free' ? `
              <button class="st-btn st-btn-primary" onclick="widget.showUpgradePlans()">
                Upgrade to Unlimited
              </button>
            ` : `
              <button class="st-btn st-btn-secondary" id="st-manage-subscription-btn">
                Manage Subscription
              </button>
            `}
          </div>
        </div>
      </section>
    `;
  }

  /**
   * Render privacy & data section
   */
  private renderPrivacySection(): string {
    return `
      <section class="st-settings-section">
        <h3>Privacy & Data</h3>
        
        <div class="st-privacy-options">
          <div class="st-privacy-option">
            <div class="st-option-info">
              <h4>📥 Download Your Data</h4>
              <p>Get a complete copy of all your stories, characters, and activity (GDPR)</p>
            </div>
            <button class="st-btn st-btn-secondary" id="st-export-data-btn">
              Export Data
            </button>
          </div>
          
          <div class="st-privacy-option danger">
            <div class="st-option-info">
              <h4>🗑️ Delete Account</h4>
              <p>Permanently remove your account and all data (30-day grace period)</p>
            </div>
            <button class="st-btn st-btn-danger" id="st-delete-account-btn">
              Delete Account
            </button>
          </div>
        </div>
      </section>
    `;
  }

  /**
   * Render parent info section (for child accounts)
   */
  private renderParentInfoSection(): string {
    if (!this.userProfile) return '';

    return `
      <section class="st-settings-section">
        <h3>Parent Information</h3>
        
        <div class="st-parent-info-card">
          <div class="st-info-row">
            <span class="st-info-label">Parent Email:</span>
            <span class="st-info-value">${this.userProfile.parentEmail || 'Not set'}</span>
          </div>
          
          <div class="st-info-row">
            <span class="st-info-label">Consent Status:</span>
            <span class="st-consent-badge ${this.userProfile.consentStatus}">
              ${this.userProfile.consentStatus === 'approved' ? '✅ Approved' : '⏳ Pending'}
            </span>
          </div>
          
          <div class="st-parent-actions">
            <button class="st-btn st-btn-secondary" id="st-contact-parent-btn">
              Contact Parent
            </button>
            ${this.userProfile.consentStatus === 'pending' ? `
              <button class="st-btn st-btn-secondary" id="st-resend-consent-btn">
                Resend Approval Email
              </button>
            ` : ''}
          </div>
        </div>
      </section>
    `;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Save profile
    const saveBtn = this.container.querySelector('#st-save-profile-btn');
    saveBtn?.addEventListener('click', () => this.saveProfile());

    // Export data
    const exportBtn = this.container.querySelector('#st-export-data-btn');
    exportBtn?.addEventListener('click', () => this.config.onExportData());

    // Delete account
    const deleteBtn = this.container.querySelector('#st-delete-account-btn');
    deleteBtn?.addEventListener('click', () => this.config.onDeleteAccount());

    // Manage subscription
    const manageSubBtn = this.container.querySelector('#st-manage-subscription-btn');
    manageSubBtn?.addEventListener('click', () => this.config.onManageSubscription());
  }

  /**
   * Save profile changes
   */
  private async saveProfile(): Promise<void> {
    const nameInput = this.container.querySelector('#st-profile-name') as HTMLInputElement;
    const emailInput = this.container.querySelector('#st-profile-email') as HTMLInputElement;
    const ageInput = this.container.querySelector('#st-profile-age') as HTMLInputElement;

    const updates: Partial<UserProfile> = {
      name: nameInput?.value,
      email: emailInput?.value,
      age: ageInput ? parseInt(ageInput.value) : undefined
    };

    try {
      await this.config.onSave(updates);
      this.showSuccess('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to save profile:', error);
      this.showError('Failed to save changes. Please try again.');
    }
  }

  /**
   * Show success message
   */
  private showSuccess(message: string): void {
    const alert = document.createElement('div');
    alert.className = 'st-alert st-alert-success';
    alert.textContent = message;
    this.container.insertBefore(alert, this.container.firstChild);
    
    setTimeout(() => alert.remove(), 3000);
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    const alert = document.createElement('div');
    alert.className = 'st-alert st-alert-error';
    alert.textContent = message;
    this.container.insertBefore(alert, this.container.firstChild);
    
    setTimeout(() => alert.remove(), 5000);
  }

  /**
   * Destroy component
   */
  destroy(): void {
    this.container.innerHTML = '';
  }
}


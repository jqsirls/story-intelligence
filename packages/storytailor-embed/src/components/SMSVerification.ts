/**
 * SMS Verification
 * Phone number verification for parent notifications
 */

export interface SMSConfig {
  onVerified: (phoneNumber: string) => void;
  onError: (error: Error) => void;
}

export class SMSVerification {
  private container: HTMLElement;
  private config: SMSConfig;
  private apiClient: any;
  private phoneNumber: string | null = null;
  private verificationStep: 'input' | 'code' | 'verified' = 'input';

  constructor(container: HTMLElement, config: SMSConfig, apiClient: any) {
    this.container = container;
    this.config = config;
    this.apiClient = apiClient;
  }

  /**
   * Render SMS verification UI
   */
  render(): void {
    this.container.innerHTML = `
      <div class="st-sms-verification">
        <h3>SMS Notifications</h3>
        <p>Get urgent safety alerts via text message (Tier 3 emotions only)</p>
        
        ${this.renderCurrentStep()}
      </div>
    `;

    this.setupEventListeners();
  }

  /**
   * Render current verification step
   */
  private renderCurrentStep(): string {
    switch (this.verificationStep) {
      case 'input':
        return this.renderPhoneInput();
      case 'code':
        return this.renderCodeInput();
      case 'verified':
        return this.renderVerifiedStatus();
      default:
        return '';
    }
  }

  /**
   * Render phone number input
   */
  private renderPhoneInput(): string {
    return `
      <div class="st-sms-step-input">
        <div class="st-form-field">
          <label>Parent Phone Number</label>
          <input 
            type="tel" 
            id="st-phone-input"
            placeholder="+1 (555) 555-5555"
            pattern="[+]?[0-9]{1,}[0-9\\s()-]*"
          />
          <div class="st-field-hint">
            Format: +1 (555) 555-5555 or 555-555-5555
          </div>
        </div>
        
        <div class="st-sms-preferences">
          <label class="st-checkbox-label">
            <input type="checkbox" id="st-sms-tier3" checked />
            <span>Urgent safety alerts (Tier 3 emotions)</span>
          </label>
          <label class="st-checkbox-label">
            <input type="checkbox" id="st-sms-stories" />
            <span>New story notifications (optional)</span>
          </label>
        </div>
        
        <button class="st-btn st-btn-primary" id="st-send-code-btn">
          Send Verification Code
        </button>
      </div>
    `;
  }

  /**
   * Render verification code input
   */
  private renderCodeInput(): string {
    return `
      <div class="st-sms-step-code">
        <div class="st-verification-sent">
          <div class="st-check-icon">✓</div>
          <p>Verification code sent to ${this.phoneNumber}</p>
        </div>
        
        <div class="st-form-field">
          <label>Enter 6-digit code</label>
          <input 
            type="text" 
            id="st-verification-code"
            placeholder="000000"
            maxlength="6"
            pattern="[0-9]{6}"
            inputmode="numeric"
          />
        </div>
        
        <div class="st-verification-actions">
          <button class="st-btn st-btn-primary" id="st-verify-code-btn">
            Verify Code
          </button>
          <button class="st-link-btn" id="st-resend-code-btn">
            Resend code
          </button>
        </div>
        
        <button class="st-link-btn" id="st-change-number-btn">
          Change phone number
        </button>
      </div>
    `;
  }

  /**
   * Render verified status
   */
  private renderVerifiedStatus(): string {
    return `
      <div class="st-sms-step-verified">
        <div class="st-verified-badge">
          <div class="st-success-icon">✅</div>
          <h4>Phone Verified!</h4>
          <p>${this.phoneNumber}</p>
        </div>
        
        <div class="st-sms-status">
          <p>You'll receive SMS alerts for:</p>
          <ul>
            <li>✅ Urgent safety concerns (Tier 3)</li>
            <li>📖 New story notifications (if enabled)</li>
          </ul>
        </div>
        
        <button class="st-btn st-btn-secondary" id="st-change-phone-btn">
          Change Phone Number
        </button>
      </div>
    `;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Send verification code
    const sendCodeBtn = this.container.querySelector('#st-send-code-btn');
    sendCodeBtn?.addEventListener('click', () => this.sendVerificationCode());

    // Verify code
    const verifyCodeBtn = this.container.querySelector('#st-verify-code-btn');
    verifyCodeBtn?.addEventListener('click', () => this.verifyCode());

    // Resend code
    const resendCodeBtn = this.container.querySelector('#st-resend-code-btn');
    resendCodeBtn?.addEventListener('click', () => this.resendCode());

    // Change number
    const changeNumberBtns = this.container.querySelectorAll('#st-change-number-btn, #st-change-phone-btn');
    changeNumberBtns.forEach(btn => {
      btn.addEventListener('click', () => this.changePhoneNumber());
    });
  }

  /**
   * Send verification code
   */
  private async sendVerificationCode(): Promise<void> {
    const input = this.container.querySelector('#st-phone-input') as HTMLInputElement;
    const phoneNumber = input?.value.trim();

    if (!phoneNumber) {
      alert('Please enter a phone number');
      return;
    }

    try {
      await this.apiClient.request('/api/v1/parental/sms/verify', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber })
      });

      this.phoneNumber = phoneNumber;
      this.verificationStep = 'code';
      this.render();

    } catch (error) {
      console.error('Failed to send verification code:', error);
      this.config.onError(error as Error);
      alert('Failed to send verification code. Please try again.');
    }
  }

  /**
   * Verify code
   */
  private async verifyCode(): Promise<void> {
    const input = this.container.querySelector('#st-verification-code') as HTMLInputElement;
    const code = input?.value.trim();

    if (!code || code.length !== 6) {
      alert('Please enter a 6-digit code');
      return;
    }

    try {
      const response = await this.apiClient.request('/api/v1/parental/sms/confirm', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: this.phoneNumber,
          code
        })
      });

      if (response.verified) {
        this.verificationStep = 'verified';
        this.render();
        this.config.onVerified(this.phoneNumber!);
      } else {
        alert('Invalid verification code. Please try again.');
      }

    } catch (error) {
      console.error('Failed to verify code:', error);
      this.config.onError(error as Error);
      alert('Verification failed. Please try again.');
    }
  }

  /**
   * Resend verification code
   */
  private async resendCode(): Promise<void> {
    if (!this.phoneNumber) return;

    try {
      await this.apiClient.request('/api/v1/parental/sms/verify', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: this.phoneNumber })
      });

      alert('Verification code resent!');
    } catch (error) {
      console.error('Failed to resend code:', error);
      this.config.onError(error as Error);
      alert('Failed to resend code. Please try again.');
    }
  }

  /**
   * Change phone number
   */
  private changePhoneNumber(): void {
    this.phoneNumber = null;
    this.verificationStep = 'input';
    this.render();
  }

  /**
   * Destroy component
   */
  destroy(): void {
    this.container.innerHTML = '';
  }
}


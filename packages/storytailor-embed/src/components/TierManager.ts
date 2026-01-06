/**
 * Tier Manager
 * Handles subscription tier display, usage limits, and upgrade prompts
 */

export interface TierInfo {
  tier: 'free' | 'family' | 'professional' | 'enterprise';
  storiesUsed: number;
  storiesLimit: number;
  features: string[];
  renewalDate?: string;
  canUpgrade: boolean;
}

export interface UpgradePromptConfig {
  title: string;
  message: string;
  cta: string;
  dismissible: boolean;
}

export class TierManager {
  private container: HTMLElement;
  private tierInfo: TierInfo | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Display tier badge in header
   */
  renderTierBadge(tierInfo: TierInfo): string {
    const tierLabels = {
      free: '⭐ Free',
      family: '👑 Family',
      professional: '💼 Professional',
      enterprise: '🏢 Enterprise'
    };

    return `
      <div class="st-tier-badge" data-tier="${tierInfo.tier}">
        ${tierLabels[tierInfo.tier]}
      </div>
    `;
  }

  /**
   * Display usage meter
   */
  renderUsageMeter(tierInfo: TierInfo): string {
    if (tierInfo.storiesLimit === -1) {
      return `<div class="st-usage-meter unlimited">✨ Unlimited Stories</div>`;
    }

    const percentage = (tierInfo.storiesUsed / tierInfo.storiesLimit) * 100;
    const isWarning = percentage >= 80;
    const isDanger = percentage >= 100;

    return `
      <div class="st-usage-meter ${isWarning ? 'warning' : ''} ${isDanger ? 'danger' : ''}">
        <div class="st-usage-progress" style="width: ${Math.min(percentage, 100)}%"></div>
        <span class="st-usage-text">${tierInfo.storiesUsed} / ${tierInfo.storiesLimit} stories this month</span>
      </div>
    `;
  }

  /**
   * Check if upgrade prompt should be shown
   */
  shouldShowUpgradePrompt(tierInfo: TierInfo): boolean {
    if (tierInfo.tier !== 'free') return false;
    if (tierInfo.storiesLimit === -1) return false;
    
    const percentage = tierInfo.storiesUsed / tierInfo.storiesLimit;
    return percentage >= 0.8;
  }

  /**
   * Check if user is blocked (limit reached)
   */
  isBlocked(tierInfo: TierInfo): boolean {
    if (tierInfo.storiesLimit === -1) return false;
    return tierInfo.storiesUsed >= tierInfo.storiesLimit;
  }

  /**
   * Show upgrade prompt (80% warning)
   */
  showUpgradePrompt(tierInfo: TierInfo, onUpgrade: () => void, onDismiss: () => void): void {
    const prompt = document.createElement('div');
    prompt.className = 'st-upgrade-prompt';
    prompt.innerHTML = `
      <div class="st-upgrade-prompt-content">
        <button class="st-close-btn" data-action="dismiss">×</button>
        <h3>You're almost at your limit!</h3>
        <p>You've created ${tierInfo.storiesUsed} of ${tierInfo.storiesLimit} stories this month.</p>
        <p>Upgrade for unlimited stories!</p>
        <div class="st-upgrade-actions">
          <button class="st-btn st-btn-primary" data-action="upgrade">View Plans</button>
          <button class="st-btn st-btn-secondary" data-action="dismiss">Maybe Later</button>
        </div>
      </div>
    `;

    prompt.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.getAttribute('data-action');
      
      if (action === 'upgrade') {
        onUpgrade();
        prompt.remove();
      } else if (action === 'dismiss') {
        onDismiss();
        prompt.remove();
      }
    });

    document.body.appendChild(prompt);
  }

  /**
   * Show upgrade blocker (limit reached)
   */
  showUpgradeBlocker(tierInfo: TierInfo, onAction: (action: string) => void): void {
    const blocker = document.createElement('div');
    blocker.className = 'st-upgrade-blocker-overlay';
    blocker.innerHTML = `
      <div class="st-upgrade-blocker">
        <h2>Story Limit Reached</h2>
        <p>You've created all ${tierInfo.storiesLimit} stories for this month!</p>
        
        <div class="st-upgrade-options">
          <div class="st-upgrade-option recommended">
            <div class="st-badge">Best Value</div>
            <h3>Family Subscription</h3>
            <div class="st-price">$9.99<span>/month</span></div>
            <ul>
              <li>✅ Unlimited stories</li>
              <li>✅ All platforms (web, mobile, voice)</li>
              <li>✅ Premium quality</li>
              <li>✅ Smart home sync</li>
            </ul>
            <button class="st-btn st-btn-primary" data-action="upgrade-family">Subscribe Now</button>
          </div>
          
          <div class="st-upgrade-option">
            <h3>5-Story Pack</h3>
            <div class="st-price">$9.99<span>/one-time</span></div>
            <ul>
              <li>✅ 5 more stories</li>
              <li>✅ Available immediately</li>
              <li>✅ No subscription</li>
            </ul>
            <button class="st-btn st-btn-secondary" data-action="buy-pack-5">Buy Pack</button>
          </div>
          
          <div class="st-upgrade-option">
            <h3>Single Story</h3>
            <div class="st-price">$2.99<span>/story</span></div>
            <ul>
              <li>✅ 1 more story</li>
              <li>✅ Quick solution</li>
            </ul>
            <button class="st-btn st-btn-secondary" data-action="buy-pack-1">Buy Now</button>
          </div>
        </div>
        
        <button class="st-link-btn" data-action="wait">Wait until next month</button>
      </div>
    `;

    blocker.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.getAttribute('data-action');
      
      if (action) {
        onAction(action);
        if (action === 'wait') {
          blocker.remove();
        }
      }
    });

    document.body.appendChild(blocker);
  }

  /**
   * Update tier info
   */
  updateTierInfo(tierInfo: TierInfo): void {
    this.tierInfo = tierInfo;
  }

  /**
   * Get current tier info
   */
  getTierInfo(): TierInfo | null {
    return this.tierInfo;
  }
}


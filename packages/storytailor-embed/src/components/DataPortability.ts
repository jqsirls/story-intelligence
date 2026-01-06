/**
 * Data Portability
 * GDPR-compliant data export and account deletion
 */

export interface DataPortabilityConfig {
  apiClient: any;
  userName: string;
  onExportComplete: () => void;
  onDeletionScheduled: (date: string) => void;
}

export class DataPortability {
  private config: DataPortabilityConfig;

  constructor(config: DataPortabilityConfig) {
    this.config = config;
  }

  /**
   * Export all user data (GDPR)
   */
  async exportData(): Promise<void> {
    try {
      const response = await this.config.apiClient.request('/api/v1/account/export');
      
      // Create downloadable JSON file
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `storytailor-${this.config.userName}-${Date.now()}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      
      this.config.onExportComplete();
      alert('Your data has been downloaded successfully!');
      
    } catch (error) {
      console.error('Data export failed:', error);
      alert('Failed to export data. Please try again or contact support.');
      throw error;
    }
  }

  /**
   * Request account deletion with 30-day grace period
   */
  async requestDeletion(reason?: string): Promise<void> {
    // Show confirmation dialog
    const confirmed = await this.showDeletionConfirmation();
    if (!confirmed) return;

    try {
      const response = await this.config.apiClient.request('/api/v1/account/delete', {
        method: 'POST',
        body: JSON.stringify({
          immediate: false,
          reason: reason || 'User requested via widget'
        })
      });

      this.config.onDeletionScheduled(response.scheduledDeletionAt);
      
      this.showDeletionScheduled(response.scheduledDeletionAt);
      
    } catch (error) {
      console.error('Deletion request failed:', error);
      alert('Failed to schedule deletion. Please try again or contact support.');
      throw error;
    }
  }

  /**
   * Show deletion confirmation dialog
   */
  private showDeletionConfirmation(): Promise<boolean> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'st-confirm-overlay';
      overlay.innerHTML = `
        <div class="st-confirm-dialog">
          <h3>Delete Account?</h3>
          <div class="st-confirm-message">
            <p><strong>This will delete:</strong></p>
            <ul>
              <li>All your stories</li>
              <li>All your characters</li>
              <li>All your account data</li>
            </ul>
            <p><strong>You will have 30 days to cancel.</strong></p>
            <p>We'll send you reminder emails at 30 days, 7 days, and 1 day before deletion.</p>
          </div>
          <div class="st-confirm-actions">
            <button class="st-btn st-btn-danger" id="st-confirm-delete">
              Yes, Delete My Account
            </button>
            <button class="st-btn st-btn-secondary" id="st-cancel-delete">
              Cancel
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      overlay.querySelector('#st-confirm-delete')?.addEventListener('click', () => {
        overlay.remove();
        resolve(true);
      });

      overlay.querySelector('#st-cancel-delete')?.addEventListener('click', () => {
        overlay.remove();
        resolve(false);
      });
    });
  }

  /**
   * Show deletion scheduled confirmation
   */
  private showDeletionScheduled(scheduledDate: string): void {
    const overlay = document.createElement('div');
    overlay.className = 'st-info-overlay';
    overlay.innerHTML = `
      <div class="st-info-dialog">
        <div class="st-info-icon">🗓️</div>
        <h3>Deletion Scheduled</h3>
        <div class="st-info-message">
          <p>Your account will be deleted on:</p>
          <p class="st-deletion-date">${new Date(scheduledDate).toLocaleDateString()}</p>
          <p>We've sent you an email with:</p>
          <ul>
            <li>Confirmation of your deletion request</li>
            <li>Link to cancel deletion</li>
            <li>Instructions to download your data</li>
          </ul>
          <p class="st-info-note">You can cancel anytime before ${new Date(scheduledDate).toLocaleDateString()}</p>
        </div>
        <button class="st-btn st-btn-primary" id="st-close-info">
          I Understand
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#st-close-info')?.addEventListener('click', () => {
      overlay.remove();
    });
  }
}


/**
 * Offline Manager
 * Handles offline functionality and data caching
 */

export interface OfflineManagerConfig {
  enabled: boolean;
  storageKey: string;
}

export class OfflineManager {
  private config: OfflineManagerConfig;
  private isOnline = navigator.onLine;

  constructor(config: OfflineManagerConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) return;

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  async syncWhenOnline(): Promise<void> {
    if (!this.isOnline || !this.config.enabled) return;

    // Sync cached data when coming back online
    const cachedData = this.getCachedData();
    if (cachedData.length > 0) {
      // Process cached messages/actions
      console.log('Syncing cached data:', cachedData);
    }
  }

  cacheData(data: any): void {
    if (!this.config.enabled) return;

    const cached = this.getCachedData();
    cached.push({
      ...data,
      timestamp: Date.now()
    });

    localStorage.setItem(this.config.storageKey, JSON.stringify(cached));
  }

  private getCachedData(): any[] {
    try {
      const data = localStorage.getItem(this.config.storageKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  destroy(): void {
    // Cleanup if needed
  }
}
import type Redis from 'ioredis';
import type { Logger } from 'winston';

export interface ConsentStatus {
  verified: boolean;
  meta?: {
    id?: string;
    method?: string;
    consent_at?: string;
    revoked_at?: string;
    revoke_reason?: string;
  };
}

export class ParentConsentHandler {
  constructor(private redis: Redis, private logger: Logger) {}

  async getConsentStatus(userId: string): Promise<ConsentStatus> {
    try {
      const [flag, metaRaw] = await Promise.all([
        this.redis.get(`parentConsent:${userId}`),
        this.redis.get(`parentConsent:meta:${userId}`)
      ]);

      const status: ConsentStatus = {
        verified: flag === 'verified'
      };
      if (metaRaw) {
        try {
          status.meta = JSON.parse(metaRaw);
        } catch (e) {
          this.logger.warn('Failed to parse consent meta', { userId, error: (e as any)?.message });
        }
      }
      return status;
    } catch (error) {
      this.logger.warn('Consent status lookup failed; defaulting to unverified', {
        userId,
        error: (error as any)?.message || String(error)
      });
      return { verified: false };
    }
  }
}


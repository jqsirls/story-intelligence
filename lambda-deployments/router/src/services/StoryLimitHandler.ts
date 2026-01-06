/**
 * Story Limit Handler
 * Detects when users hit limits and triggers adult verification
 * Integrates SMS verification for child-safe upgrade flow
 */

// Using inline verification for now to avoid cross-package dependencies
import { VoiceParentFlowManager } from './VoiceParentFlowManager';

// Simple SMS Service stub to avoid cross-package dependencies
class SMSVerificationService {
  constructor(
    private accountSid?: string,
    private authToken?: string,
    private phoneNumber?: string
  ) {}

  async sendVerificationSMS(
    parentPhone: string, 
    childUserId: string, 
    verificationCode: string, 
    sessionId: string
  ): Promise<{ sent: boolean; message?: string }> {
    console.log(`SMS Verification Code: ${verificationCode} would be sent to ${parentPhone} for child ${childUserId}`);
    // TODO: Integrate with actual Twilio service
    return { sent: true };
  }
}

export interface LimitCheckResult {
  limitReached: boolean;
  remainingStories: number;
  tier: string;
  upgradeRequired: boolean;
  message?: string;
}

export interface AdultVerificationFlow {
  requiresAdult: boolean;
  childMessage: string;
  smsTriggered: boolean;
  sessionId: string;
}

export class StoryLimitHandler {
  private smsService: SMSVerificationService;
  private voiceFlow: VoiceParentFlowManager;

  constructor(
    twilioConfig?: {
      accountSid: string;
      authToken: string;
      phoneNumber: string;
    }
  ) {
    this.smsService = new SMSVerificationService(
      twilioConfig?.accountSid,
      twilioConfig?.authToken,
      twilioConfig?.phoneNumber
    );
    this.voiceFlow = new VoiceParentFlowManager();
  }

  /**
   * Check if user has reached story limit
   */
  async checkStoryLimit(
    userId: string,
    tier: string,
    storiesUsedThisMonth: number
  ): Promise<LimitCheckResult> {
    const limits: Record<string, number> = {
      'free': 1,
      'alexa_free': 2,
      'alexa_starter': 10,
      'individual': 30,
      'family': 20,
      'premium': -1 // Unlimited
    };

    const limit = limits[tier] || 0;
    const unlimited = limit === -1;

    if (unlimited) {
      return {
        limitReached: false,
        remainingStories: -1,
        tier,
        upgradeRequired: false
      };
    }

    const remaining = limit - storiesUsedThisMonth;
    const limitReached = remaining <= 0;

    // Soft cap warning at 80%
    const softCapWarning = remaining <= Math.ceil(limit * 0.2) && remaining > 0;

    return {
      limitReached,
      remainingStories: Math.max(0, remaining),
      tier,
      upgradeRequired: limitReached,
      message: softCapWarning 
        ? `You have ${remaining} ${remaining === 1 ? 'story' : 'stories'} left this month!`
        : undefined
    };
  }

  /**
   * Handle limit reached - trigger SMS verification
   */
  async handleLimitReached(
    userId: string,
    sessionId: string,
    childName: string,
    parentPhone: string,
    channel: 'alexa' | 'google' | 'web' | 'mobile'
  ): Promise<AdultVerificationFlow> {
    // Generate child-safe message
    const childMessage = this.voiceFlow.generateLimitReachedMessage(childName);

    // Trigger SMS to parent
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const smsResult = await this.smsService.sendVerificationSMS(
      parentPhone,
      userId,
      verificationCode,
      sessionId
    );

    return {
      requiresAdult: true,
      childMessage: childMessage.plainText,
      smsTriggered: smsResult.sent,
      sessionId
    };
  }

  /**
   * Generate upgrade options for parent (after verification)
   */
  async generateUpgradeOptions(
    tier: string,
    insights: any,
    channel: 'alexa' | 'google' | 'web' | 'mobile'
  ): Promise<any> {
    if (channel === 'alexa' || channel === 'google') {
      // Voice-only flow
      return this.voiceFlow.generateVoiceUpgradeOptions({
        childName: insights.childName,
        storiesCreated: insights.storiesCreated,
        insights: insights,
        upgradeOptions: {},
        returnChannel: channel
      });
    } else {
      // Visual flow (web/mobile)
      return {
        type: 'visual',
        insights: insights,
        options: [
          {
            type: 'subscription',
            plan: 'family',
            price: 9.99,
            features: ['20 stories/month', 'Up to 5 children', 'Full insights']
          },
          {
            type: 'subscription',
            plan: 'premium',
            price: 19.99,
            features: ['Unlimited stories', 'Unlimited avatar time', 'All features']
          },
          {
            type: 'story_pack',
            pack: '5_stories',
            price: 4.99,
            features: ['5 stories', 'Unlocks library forever']
          }
        ]
      };
    }
  }

  /**
   * Handle soft cap warning (approaching limit)
   */
  generateSoftCapWarning(remaining: number, childName: string): string {
    if (remaining === 1) {
      return `Great job, ${childName}! You have one more story this month, then we'll need a grown-up's help to create more.`;
    } else {
      return `Amazing, ${childName}! You have ${remaining} more stories this month!`;
    }
  }

  /**
   * Check if user needs welcome bonus
   */
  async checkWelcomeBonus(userId: string, tier: string): Promise<{
    eligible: boolean;
    bonusStories: number;
  }> {
    // Check if user has created any stories
    // Would query database for user's story count
    
    const welcomeBonuses: Record<string, number> = {
      'free': 3,
      'alexa_free': 5,
      'alexa_starter': 0,
      'individual': 0,
      'family': 0,
      'premium': 0
    };

    return {
      eligible: true, // Would check database
      bonusStories: welcomeBonuses[tier] || 0
    };
  }
}


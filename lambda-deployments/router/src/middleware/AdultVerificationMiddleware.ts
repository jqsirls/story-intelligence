/**
 * Adult Verification Middleware
 * Protects parent dashboard and purchase flows
 * NEVER shows pricing/payments to children
 */

import { Request, Response, NextFunction } from 'express';

export interface VerificationChallenge {
  type: 'math' | 'birth_year' | 'pin' | 'all';
  question?: string;
  correctAnswer?: string | number;
}

export class AdultVerificationMiddleware {
  private sessions: Map<string, { verified: boolean; timestamp: number }> = new Map();
  
  /**
   * Generate verification challenge
   */
  generateChallenge(type: 'math' | 'birth_year' | 'pin' | 'all' = 'all'): VerificationChallenge[] {
    const challenges: VerificationChallenge[] = [];

    if (type === 'math' || type === 'all') {
      const a = Math.floor(Math.random() * 10) + 5; // 5-14
      const b = Math.floor(Math.random() * 10) + 5; // 5-14
      challenges.push({
        type: 'math',
        question: `What is ${a} + ${b}?`,
        correctAnswer: a + b
      });
    }

    if (type === 'birth_year' || type === 'all') {
      const currentYear = new Date().getFullYear();
      const minYear = currentYear - 100; // 100 years old max
      const maxYear = currentYear - 18; // Must be 18+
      
      challenges.push({
        type: 'birth_year',
        question: 'What year were you born? (Must be 18+)',
        correctAnswer: `${minYear}-${maxYear}` // Range
      });
    }

    if (type === 'pin' || type === 'all') {
      challenges.push({
        type: 'pin',
        question: 'Enter your 4-digit parent PIN',
        correctAnswer: 'stored_in_user_profile' // Would retrieve from user
      });
    }

    return challenges;
  }

  /**
   * Verify adult responses
   */
  verifyResponses(
    challenges: VerificationChallenge[],
    responses: { [key: string]: string | number },
    userPin?: string
  ): { verified: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const challenge of challenges) {
      const response = responses[challenge.type];

      if (challenge.type === 'math') {
        if (Number(response) !== challenge.correctAnswer) {
          errors.push('Math answer incorrect');
        }
      }

      if (challenge.type === 'birth_year') {
        const year = Number(response);
        const currentYear = new Date().getFullYear();
        const age = currentYear - year;
        
        if (age < 18 || age > 100) {
          errors.push('Must be 18 or older');
        }
      }

      if (challenge.type === 'pin') {
        if (response !== userPin) {
          errors.push('PIN incorrect');
        }
      }
    }

    return {
      verified: errors.length === 0,
      errors
    };
  }

  /**
   * Express middleware for adult-only routes
   */
  requireAdultVerification() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const sessionId = req.headers['x-session-id'] as string;
      const cached = this.sessions.get(sessionId);

      // Check if recently verified (15 minute window)
      if (cached && cached.verified && (Date.now() - cached.timestamp < 900000)) {
        return next();
      }

      // Check verification header
      const verificationToken = req.headers['x-adult-verified'];
      
      if (!verificationToken) {
        return res.status(403).json({
          success: false,
          error: 'Adult verification required',
          challenge: this.generateChallenge('all')
        });
      }

      // Verify token (would decode JWT with challenges)
      // For now, simple check
      const verified = this.verifyToken(verificationToken as string);

      if (!verified) {
        return res.status(403).json({
          success: false,
          error: 'Verification failed',
          challenge: this.generateChallenge('all')
        });
      }

      // Cache verification
      this.sessions.set(sessionId, {
        verified: true,
        timestamp: Date.now()
      });

      next();
    };
  }

  /**
   * Generate child-safe message when limit reached
   */
  generateChildFriendlyLimitMessage(childName?: string): {
    message: string;
    action: 'get_adult' | 'read_library' | 'play_game';
    adultRequired: boolean;
  } {
    const messages = [
      {
        message: `${childName ? childName + ', you' : 'You'}'ve created something amazing! Want to make more? Let's get a grown-up to help!`,
        action: 'get_adult' as const
      },
      {
        message: "Time for a grown-up! Can you find Mom, Dad, or another adult?",
        action: 'get_adult' as const
      },
      {
        message: "Let's pause here and get a grown-up. They'll help us create more magic!",
        action: 'get_adult' as const
      }
    ];

    const selected = messages[Math.floor(Math.random() * messages.length)];

    return {
      ...selected,
      adultRequired: true
    };
  }

  /**
   * Generate parent view after verification
   */
  generateParentView(childInsights: any, pricingOptions: any): any {
    return {
      type: 'parent_dashboard',
      insights: {
        summary: childInsights.summary,
        highlights: childInsights.highlights,
        recommendations: childInsights.recommendations
      },
      upgradeOptions: pricingOptions,
      message: `Your child wants to create more stories! Here's what we've learned about their emotional journey this ${childInsights.timeframe}...`
    };
  }

  private verifyToken(token: string): boolean {
    // Would decode JWT and verify challenge responses
    // For now, placeholder
    return token.startsWith('verified_');
  }

  /**
   * Clear old verification sessions (cleanup)
   */
  cleanupSessions(): void {
    const now = Date.now();
    const fifteenMinutes = 900000;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.timestamp > fifteenMinutes) {
        this.sessions.delete(sessionId);
      }
    }
  }
}


import { AuthAgent } from '@alexa-multi-agent/auth-agent';
import { AlexaTurnContext } from '../types/alexa';
import { ConversationContext } from '@alexa-multi-agent/shared-types';
import { createLogger } from '../utils/logger';

export interface AccountLinkingResult {
  isAuthenticated: boolean;
  userId?: string;
  requiresLinking: boolean;
  linkingInstructions?: string;
  voiceCode?: string;
  magicLinkUrl?: string;
  qrCodeUrl?: string;
  expiresAt?: string;
}

export interface AuthenticationContext {
  userId: string;
  email: string;
  alexaPersonId: string;
  isEmailConfirmed: boolean;
  isCoppaProtected: boolean;
  parentConsentVerified: boolean;
}

export class AccountLinkingIntegration {
  private logger = createLogger('account-linking-integration');
  private authAgent: AuthAgent;

  constructor(authAgent: AuthAgent) {
    this.authAgent = authAgent;
  }

  /**
   * Handles account linking consent flow for Alexa users
   */
  async handleAccountLinking(
    turnContext: AlexaTurnContext,
    conversationContext: ConversationContext
  ): Promise<AccountLinkingResult> {
    try {
      this.logger.info('Processing account linking', {
        sessionId: turnContext.sessionId,
        alexaPersonId: turnContext.alexaPersonId,
        hasCustomerEmail: !!turnContext.customerEmail,
        deviceType: turnContext.deviceType
      });

      // Check if user is already authenticated
      const existingAuth = await this.checkExistingAuthentication(turnContext);
      if (existingAuth.isAuthenticated) {
        return existingAuth;
      }

      // If no customer email, request account linking permission
      if (!turnContext.customerEmail) {
        return {
          isAuthenticated: false,
          requiresLinking: true,
          linkingInstructions: this.generateLinkingInstructions(turnContext.deviceType)
        };
      }

      // Process account linking with customer email
      const linkingResult = await this.processAccountLinking(turnContext);
      
      // Store linking context in conversation
      if (linkingResult.voiceCode) {
        conversationContext.metadata = conversationContext.metadata || {};
        conversationContext.metadata.accountLinking = {
          voiceCode: linkingResult.voiceCode,
          expiresAt: linkingResult.expiresAt,
          customerEmail: turnContext.customerEmail,
          deviceType: turnContext.deviceType
        };
      }

      return linkingResult;

    } catch (error) {
      this.logger.error('Account linking failed', {
        sessionId: turnContext.sessionId,
        error: {
          name: error.name,
          message: error.message
        }
      });

      return {
        isAuthenticated: false,
        requiresLinking: true,
        linkingInstructions: "I'm having trouble with account linking right now. Please try again in a moment."
      };
    }
  }

  /**
   * Manages session state between Alexa and internal systems
   */
  async manageSessionState(
    turnContext: AlexaTurnContext,
    conversationContext: ConversationContext
  ): Promise<void> {
    try {
      // Update session metadata with authentication info
      if (!conversationContext.metadata) {
        conversationContext.metadata = {};
      }

      conversationContext.metadata.alexaSession = {
        alexaPersonId: turnContext.alexaPersonId,
        customerEmail: turnContext.customerEmail,
        deviceType: turnContext.deviceType,
        locale: turnContext.locale,
        lastActivity: new Date().toISOString()
      };

      // Check for authentication state changes
      const authResult = await this.checkExistingAuthentication(turnContext);
      if (authResult.isAuthenticated && authResult.userId) {
        conversationContext.userId = authResult.userId;
        conversationContext.metadata.authenticationContext = {
          userId: authResult.userId,
          authenticatedAt: new Date().toISOString(),
          authMethod: 'alexa_account_linking'
        };
      }

      this.logger.debug('Session state updated', {
        sessionId: turnContext.sessionId,
        userId: conversationContext.userId,
        isAuthenticated: authResult.isAuthenticated
      });

    } catch (error) {
      this.logger.error('Failed to manage session state', {
        sessionId: turnContext.sessionId,
        error: {
          name: error.name,
          message: error.message
        }
      });
    }
  }

  /**
   * Processes voice code verification during conversation
   */
  async processVoiceCodeVerification(
    voiceCode: string,
    turnContext: AlexaTurnContext,
    conversationContext: ConversationContext
  ): Promise<AccountLinkingResult> {
    try {
      this.logger.info('Processing voice code verification', {
        sessionId: turnContext.sessionId,
        voiceCode: voiceCode.substring(0, 2) + '****'
      });

      // Get stored linking context
      const linkingContext = conversationContext.metadata?.accountLinking;
      if (!linkingContext || !linkingContext.customerEmail) {
        return {
          isAuthenticated: false,
          requiresLinking: true,
          linkingInstructions: "I don't have your account linking information. Let's start over with account linking."
        };
      }

      // Verify voice code with AuthAgent
      const verificationResult = await this.authAgent.verifyVoiceCode({
        email: linkingContext.customerEmail,
        code: voiceCode,
        alexaPersonId: turnContext.alexaPersonId,
        deviceType: turnContext.deviceType
      });

      if (!verificationResult.success) {
        return {
          isAuthenticated: false,
          requiresLinking: false,
          linkingInstructions: `That code didn't work. ${verificationResult.error || 'Please try again.'}`
        };
      }

      // Update conversation context with authentication
      const userSession = await this.authAgent.validateToken(verificationResult.accessToken || '');
      if (userSession) {
        conversationContext.userId = userSession.userId;
        conversationContext.metadata = conversationContext.metadata || {};
        conversationContext.metadata.authenticationContext = {
          userId: userSession.userId,
          email: userSession.email,
          alexaPersonId: userSession.alexaPersonId,
          isEmailConfirmed: userSession.isEmailConfirmed,
          isCoppaProtected: userSession.isCoppaProtected,
          parentConsentVerified: userSession.parentConsentVerified,
          authenticatedAt: new Date().toISOString(),
          authMethod: 'voice_code_verification'
        };

        // Clear account linking context
        delete conversationContext.metadata.accountLinking;
      }

      this.logger.info('Voice code verification successful', {
        sessionId: turnContext.sessionId,
        userId: userSession?.userId
      });

      return {
        isAuthenticated: true,
        userId: userSession?.userId,
        requiresLinking: false
      };

    } catch (error) {
      this.logger.error('Voice code verification failed', {
        sessionId: turnContext.sessionId,
        error: {
          name: error.name,
          message: error.message
        }
      });

      return {
        isAuthenticated: false,
        requiresLinking: false,
        linkingInstructions: "There was a problem verifying your code. Please try again."
      };
    }
  }

  /**
   * Handles COPPA compliance for child accounts
   */
  async handleCoppaCompliance(
    authContext: AuthenticationContext,
    childAge?: number
  ): Promise<{
    isCompliant: boolean;
    requiresParentConsent: boolean;
    instructions?: string;
  }> {
    try {
      // Check if child is under 13 (COPPA protected)
      const isUnder13 = childAge && childAge < 13;
      
      if (isUnder13 || authContext.isCoppaProtected) {
        if (!authContext.parentConsentVerified) {
          return {
            isCompliant: false,
            requiresParentConsent: true,
            instructions: "Since you're under 13, we need a parent or guardian to give permission before we can save your stories. Please ask a parent to help set up your account."
          };
        }
      }

      return {
        isCompliant: true,
        requiresParentConsent: false
      };

    } catch (error) {
      this.logger.error('COPPA compliance check failed', {
        userId: authContext.userId,
        error: {
          name: error.name,
          message: error.message
        }
      });

      // Default to requiring parent consent for safety
      return {
        isCompliant: false,
        requiresParentConsent: true,
        instructions: "We need to verify parental permission before we can continue. Please ask a parent to help."
      };
    }
  }

  /**
   * Gets authentication context for current session
   */
  async getAuthenticationContext(
    conversationContext: ConversationContext
  ): Promise<AuthenticationContext | null> {
    try {
      const authContext = conversationContext.metadata?.authenticationContext;
      if (!authContext || !authContext.userId) {
        return null;
      }

      return {
        userId: authContext.userId,
        email: authContext.email || '',
        alexaPersonId: authContext.alexaPersonId || '',
        isEmailConfirmed: authContext.isEmailConfirmed || false,
        isCoppaProtected: authContext.isCoppaProtected || false,
        parentConsentVerified: authContext.parentConsentVerified || false
      };

    } catch (error) {
      this.logger.error('Failed to get authentication context', {
        sessionId: conversationContext.sessionId,
        error: {
          name: error.name,
          message: error.message
        }
      });
      return null;
    }
  }

  /**
   * Private helper methods
   */

  private async checkExistingAuthentication(
    turnContext: AlexaTurnContext
  ): Promise<AccountLinkingResult> {
    try {
      // Check if user exists by Alexa Person ID
      const userSession = await this.authAgent.getUserByAlexaPersonId(turnContext.alexaPersonId);
      
      if (userSession) {
        return {
          isAuthenticated: true,
          userId: userSession.userId,
          requiresLinking: false
        };
      }

      return {
        isAuthenticated: false,
        requiresLinking: true
      };

    } catch (error) {
      this.logger.warn('Failed to check existing authentication', {
        alexaPersonId: turnContext.alexaPersonId,
        error: error.message
      });

      return {
        isAuthenticated: false,
        requiresLinking: true
      };
    }
  }

  private async processAccountLinking(
    turnContext: AlexaTurnContext
  ): Promise<AccountLinkingResult> {
    try {
      const linkingResult = await this.authAgent.linkAccount({
        customerEmail: turnContext.customerEmail!,
        alexaPersonId: turnContext.alexaPersonId,
        deviceType: turnContext.deviceType,
        correlationId: `alexa-${turnContext.sessionId}-${Date.now()}`
      });

      if (!linkingResult.success) {
        return {
          isAuthenticated: false,
          requiresLinking: true,
          linkingInstructions: linkingResult.error || 'Account linking failed. Please try again.'
        };
      }

      const instructions = this.generateVerificationInstructions(
        turnContext.deviceType,
        linkingResult.voiceCode!
      );

      return {
        isAuthenticated: false,
        requiresLinking: false,
        linkingInstructions: instructions,
        voiceCode: linkingResult.voiceCode,
        magicLinkUrl: linkingResult.magicLinkUrl,
        qrCodeUrl: linkingResult.qrCodeUrl,
        expiresAt: linkingResult.expiresAt
      };

    } catch (error) {
      this.logger.error('Account linking processing failed', {
        sessionId: turnContext.sessionId,
        error: error.message
      });

      return {
        isAuthenticated: false,
        requiresLinking: true,
        linkingInstructions: 'There was a problem linking your account. Please try again.'
      };
    }
  }

  private generateLinkingInstructions(deviceType: 'voice' | 'screen'): string {
    if (deviceType === 'screen') {
      return "To save your stories, I need to connect to your Storytailor account. Please check your screen for account linking options, or say 'link my account' to get started.";
    } else {
      return "To save your stories, I need to connect to your Storytailor account. Please say 'link my account' and I'll help you get set up.";
    }
  }

  private generateVerificationInstructions(
    deviceType: 'voice' | 'screen',
    voiceCode: string
  ): string {
    if (deviceType === 'screen') {
      return `Great! I've sent you a verification code. You can either say the code "${voiceCode}" out loud, or tap the magic link on your screen to verify your account.`;
    } else {
      return `Perfect! I've created a verification code for you. Please say the code "${voiceCode}" to verify your account and start saving your stories.`;
    }
  }
}
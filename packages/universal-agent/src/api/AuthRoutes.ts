// Authentication routes for the Universal API Server
import { Router } from 'express';
import { AuthAgent } from '@alexa-multi-agent/auth-agent';
import { Logger } from 'winston';
import * as Joi from 'joi';

import { EmailService } from '../services/EmailService';

export class AuthRoutes {
  private router: Router;
  private authAgent: AuthAgent;
  private logger: Logger;
  private emailService?: EmailService;

  constructor(authAgent: AuthAgent, logger: Logger, emailService?: EmailService) {
    this.authAgent = authAgent;
    this.logger = logger;
    this.emailService = emailService;
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // User Registration
    this.router.post('/register', this.validateRequest(Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required(),
      age: Joi.number().integer().min(3).max(120).required(),
      userType: Joi.string().valid(
        'child', 'parent', 'guardian', 'grandparent', 'aunt_uncle', 
        'older_sibling', 'foster_caregiver', 'teacher', 'librarian', 
        'afterschool_leader', 'childcare_provider', 'nanny', 
        'child_life_specialist', 'therapist', 'medical_professional', 
        'coach_mentor', 'enthusiast', 'other'
      ).required(),
      parentEmail: Joi.string().email().when('age', {
        is: Joi.number().less(13),
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      firstName: Joi.string().max(50).required(),
      lastName: Joi.string().max(50).required()
    })), async (req, res) => {
      try {
        const { email, password, age, userType, parentEmail, firstName, lastName } = req.body;

        // Create user account
        const result = await this.createUserAccount({
          email,
          password,
          age,
          userType,
          parentEmail,
          firstName,
          lastName
        });

        if (!result.success) {
          return res.status(400).json({
            success: false,
            error: result.error
          });
        }

        // Generate tokens
        const tokenResponse = await this.authAgent.generateAuthTokens(result.userId);

        res.status(201).json({
          success: true,
          user: {
            id: result.userId,
            email,
            firstName,
            lastName,
            age,
            userType,
            isCoppaProtected: age && age < 13,
            parentConsentRequired: age && age < 13 && !result.parentConsentVerified
          },
          tokens: {
            accessToken: tokenResponse.accessToken,
            refreshToken: tokenResponse.refreshToken,
            expiresIn: tokenResponse.expiresIn
          }
        });

      } catch (error) {
        this.logger.error('Registration failed', {
          error: error instanceof Error ? error.message : String(error),
          email: req.body.email
        });

        res.status(500).json({
          success: false,
          error: 'Registration failed'
        });
      }
    });

    // User Login
    this.router.post('/login', this.validateRequest(Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required()
    })), async (req, res) => {
      try {
        const { email, password } = req.body;

        // Authenticate user
        const authResult = await this.authenticateUser(email, password);

        if (!authResult.success) {
          return res.status(401).json({
            success: false,
            error: authResult.error
          });
        }

        // Generate tokens
        const tokenResponse = await this.authAgent.generateAuthTokens(authResult.user.id);

        res.json({
          success: true,
          user: {
            id: authResult.user.id,
            email: authResult.user.email,
            firstName: authResult.user.firstName,
            lastName: authResult.user.lastName,
            age: authResult.user.age,
            isCoppaProtected: authResult.user.isCoppaProtected,
            parentConsentVerified: authResult.user.parentConsentVerified,
            lastLoginAt: new Date().toISOString()
          },
          tokens: {
            accessToken: tokenResponse.accessToken,
            refreshToken: tokenResponse.refreshToken,
            expiresIn: tokenResponse.expiresIn
          }
        });

      } catch (error) {
        this.logger.error('Login failed', {
          error: error instanceof Error ? error.message : String(error),
          email: req.body.email
        });

        res.status(500).json({
          success: false,
          error: 'Login failed'
        });
      }
    });

    // Token Refresh
    this.router.post('/refresh', this.validateRequest(Joi.object({
      refreshToken: Joi.string().required()
    })), async (req, res) => {
      try {
        const { refreshToken } = req.body;

        const tokenResponse = await this.authAgent.refreshToken(refreshToken);

        if (!tokenResponse.success) {
          return res.status(401).json({
            success: false,
            error: tokenResponse.error
          });
        }

        res.json({
          success: true,
          tokens: {
            accessToken: tokenResponse.accessToken,
            refreshToken: tokenResponse.refreshToken,
            expiresIn: tokenResponse.expiresIn
          }
        });

      } catch (error) {
        this.logger.error('Token refresh failed', {
          error: error instanceof Error ? error.message : String(error)
        });

        res.status(500).json({
          success: false,
          error: 'Token refresh failed'
        });
      }
    });

    // Logout (revoke refresh token)
    this.router.post('/logout', this.validateRequest(Joi.object({
      refreshToken: Joi.string().required()
    })), async (req, res) => {
      try {
        const { refreshToken } = req.body;

        await this.authAgent.revokeToken(refreshToken);

        res.json({
          success: true,
          message: 'Logged out successfully'
        });

      } catch (error) {
        this.logger.error('Logout failed', {
          error: error instanceof Error ? error.message : String(error)
        });

        res.status(500).json({
          success: false,
          error: 'Logout failed'
        });
      }
    });

    // Get current user profile
    this.router.get('/me', async (req, res) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            success: false,
            error: 'Authorization token required'
          });
        }

        const token = authHeader.substring(7);
        const userSession = await this.authAgent.validateToken(token);

        if (!userSession) {
          return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
          });
        }

        res.json({
          success: true,
          user: {
            id: userSession.userId,
            email: userSession.email,
            age: userSession.age,
            isCoppaProtected: userSession.isCoppaProtected,
            parentConsentVerified: userSession.parentConsentVerified,
            isEmailConfirmed: userSession.isEmailConfirmed,
            lastLoginAt: userSession.lastLoginAt,
            createdAt: userSession.createdAt
          }
        });

      } catch (error) {
        this.logger.error('Get user profile failed', {
          error: error instanceof Error ? error.message : String(error)
        });

        res.status(500).json({
          success: false,
          error: 'Failed to get user profile'
        });
      }
    });

    // Password Reset Request
    this.router.post('/forgot-password', this.validateRequest(Joi.object({
      email: Joi.string().email().required()
    })), async (req, res) => {
      try {
        const { email } = req.body;

        await this.authAgent.initiatePasswordReset(email);

        // Always return success to prevent email enumeration
        res.json({
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.'
        });

      } catch (error) {
        this.logger.error('Password reset request failed', {
          error: error instanceof Error ? error.message : String(error),
          email: req.body.email
        });

        res.json({
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.'
        });
      }
    });
  }

  private validateRequest(schema: Joi.ObjectSchema) {
    return (req: any, res: any, next: any) => {
      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: error.details[0].message
        });
      }
      req.body = value;
      next();
    };
  }

  private async createUserAccount(userData: {
    email: string;
    password: string;
    age: number;
    userType: string;
    parentEmail?: string;
    firstName: string;
    lastName: string;
  }): Promise<{ success: boolean; userId?: string; error?: string; parentConsentVerified?: boolean }> {
    try {
      // Use Supabase Auth to create the user
      const { data, error } = await this.authAgent.getSupabaseClient().auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            age: userData.age,
            user_type: userData.userType,
            parent_email: userData.parentEmail,
            is_coppa_protected: userData.age < 13
          }
        }
      });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'Failed to create user account'
        };
      }

      // For COPPA-protected users, initiate parent consent process
      let parentConsentVerified = true;
      if (userData.age < 13 && userData.parentEmail) {
        parentConsentVerified = false;
        // TODO: Initiate parent consent email process
        this.logger.info('COPPA-protected user created, parent consent required', {
          userId: data.user.id,
          parentEmail: userData.parentEmail
        });
      }

      // Send welcome email
      if (this.emailService) {
        try {
          const userName = userData.firstName && userData.lastName
            ? `${userData.firstName} ${userData.lastName}`
            : undefined;
          
          await this.emailService.sendWelcomeEmail(
            userData.email,
            data.user.id,
            userName
          );
        } catch (error) {
          this.logger.warn('Failed to send welcome email', {
            error: error instanceof Error ? error.message : String(error),
            userId: data.user.id,
            email: userData.email
          });
          // Don't fail account creation if email fails
        }
      }

      return {
        success: true,
        userId: data.user.id,
        parentConsentVerified
      };

    } catch (error) {
      this.logger.error('User account creation failed', {
        error: error instanceof Error ? error.message : String(error),
        email: userData.email
      });

      return {
        success: false,
        error: 'Failed to create user account'
      };
    }
  }

  private async authenticateUser(email: string, password: string): Promise<{
    success: boolean;
    user?: any;
    error?: string;
  }> {
    try {
      // Use Supabase Auth to authenticate
      const { data, error } = await this.authAgent.getSupabaseClient().auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'Authentication failed'
        };
      }

      // Get additional user data from our users table
      const { data: userData, error: userError } = await this.authAgent.getSupabaseClient()
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      const safeUserData = (userData as any) || null;
      
      if (userError || !safeUserData) {
        // Create user record if it doesn't exist
        const { error: insertError } = await (this.authAgent.getSupabaseClient()
          .from('users') as any)
          .insert({
            id: data.user.id,
            email: data.user.email,
            first_name: data.user.user_metadata?.first_name,
            last_name: data.user.user_metadata?.last_name,
            age: data.user.user_metadata?.age,
            parent_email: data.user.user_metadata?.parent_email,
            is_coppa_protected: data.user.user_metadata?.is_coppa_protected || false,
            email_confirmed: data.user.email_confirmed_at !== null,
            last_login_at: new Date().toISOString()
          });

        if (insertError) {
          this.logger.error('Failed to create user record', {
            error: insertError.message,
            userId: data.user.id
          });
        }
      } else {
        // Update last login time
        await (this.authAgent.getSupabaseClient()
          .from('users') as any)
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.user.id);
      }

      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          firstName: (safeUserData ? safeUserData.first_name : data.user.user_metadata?.first_name) ?? '',
          lastName: (safeUserData ? safeUserData.last_name : data.user.user_metadata?.last_name) ?? '',
          age: (safeUserData ? safeUserData.age : data.user.user_metadata?.age) ?? 0,
          isCoppaProtected: (safeUserData ? safeUserData.is_coppa_protected : data.user.user_metadata?.is_coppa_protected) ?? false,
          parentConsentVerified: (safeUserData ? safeUserData.parent_consent_verified : false) ?? false
        }
      };

    } catch (error) {
      this.logger.error('User authentication failed', {
        error: error instanceof Error ? error.message : String(error),
        email
      });

      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
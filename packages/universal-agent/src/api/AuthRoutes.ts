// Authentication routes for the Universal API Server
import { Router } from 'express';
import { AuthAgent } from '@alexa-multi-agent/auth-agent';
import { Logger } from 'winston';
import * as Joi from 'joi';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@alexa-multi-agent/shared-types';

import { EmailService } from '../services/EmailService';

type UserRow = Database['public']['Tables']['users']['Row'];

export class AuthRoutes {
  private router: Router;
  private authAgent: AuthAgent;
  private logger: Logger;
  private emailService?: EmailService;
  private supabase: SupabaseClient<Database>;

  constructor(authAgent: AuthAgent, supabase: SupabaseClient<Database>, logger: Logger, emailService?: EmailService) {
    this.authAgent = authAgent;
    this.supabase = supabase;
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

        const tokens = result.tokens
          ? {
              accessToken: result.tokens.accessToken,
              refreshToken: result.tokens.refreshToken,
              expiresIn: result.tokens.expiresIn
            }
          : null;

        res.status(201).json({
          success: true,
          user: {
            id: result.userId,
            email,
            firstName,
            lastName,
            userType,
            isCoppaProtected: result.isCoppaProtected,
            parentConsentVerified: result.parentConsentVerified ?? false,
            isMinor: result.isMinor
          },
          tokens
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

        res.json({
          success: true,
          user: {
            id: authResult.user.id,
            email: authResult.user.email,
            firstName: authResult.user.firstName,
            lastName: authResult.user.lastName,
            isCoppaProtected: authResult.user.isCoppaProtected,
            parentConsentVerified: authResult.user.parentConsentVerified,
            isMinor: authResult.user.isMinor,
            lastLoginAt: new Date().toISOString()
          },
          tokens: authResult.tokens
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
            isCoppaProtected: userSession.isCoppaProtected,
            parentConsentVerified: userSession.parentConsentVerified,
            isEmailConfirmed: userSession.isEmailConfirmed,
            isMinor: userSession.isMinor,
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
  }): Promise<{
    success: boolean;
    userId?: string;
    error?: string;
    parentConsentVerified?: boolean;
    isCoppaProtected?: boolean;
    isMinor?: boolean;
    tokens?: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    } | null;
  }> {
    try {
      const isCoppaProtected = userData.age < 13;
      const isMinor = userData.age < 18;

      // Use Supabase Auth to create the user
      const { data, error } = await this.supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            user_type: userData.userType,
            parent_email: userData.parentEmail,
            is_coppa_protected: isCoppaProtected,
            is_minor: isMinor
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
      if (isCoppaProtected && userData.parentEmail) {
        parentConsentVerified = false;
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
        parentConsentVerified,
        isCoppaProtected,
        isMinor,
        tokens: data.session
          ? {
              accessToken: data.session.access_token,
              refreshToken: data.session.refresh_token,
              expiresIn: data.session.expires_in
            }
          : null
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
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      isCoppaProtected: boolean;
      parentConsentVerified: boolean;
      isMinor: boolean;
    };
    tokens?: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    } | null;
    error?: string;
  }> {
    try {
      // Use Supabase Auth to authenticate
      const { data, error } = await this.supabase.auth.signInWithPassword({
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
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single<UserRow>();

      const safeUserData = userData || null;
      
      if (userError || !safeUserData) {
        // Create user record if it doesn't exist
        const { error: insertError } = await this.supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email,
            first_name: data.user.user_metadata?.first_name,
            last_name: data.user.user_metadata?.last_name,
            parent_email: data.user.user_metadata?.parent_email,
            is_coppa_protected: data.user.user_metadata?.is_coppa_protected || false,
            is_minor: data.user.user_metadata?.is_minor ?? false,
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
        await this.supabase
          .from('users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.user.id);
      }

      const userRow = safeUserData as UserRow | null;

      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          firstName: (safeUserData ? safeUserData.first_name : data.user.user_metadata?.first_name) ?? '',
          lastName: (safeUserData ? safeUserData.last_name : data.user.user_metadata?.last_name) ?? '',
          isCoppaProtected: (userRow ? userRow.is_coppa_protected : data.user.user_metadata?.is_coppa_protected) ?? false,
          parentConsentVerified: (userRow ? userRow.parent_consent_verified : false) ?? false,
          isMinor: (userRow ? userRow.is_minor : data.user.user_metadata?.is_minor) ?? false
        },
        tokens: data.session
          ? {
              accessToken: data.session.access_token,
              refreshToken: data.session.refresh_token,
              expiresIn: data.session.expires_in
            }
          : null
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
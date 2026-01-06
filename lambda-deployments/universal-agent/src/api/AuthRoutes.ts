// Authentication routes for the Universal API Server
import { Router } from 'express';
import { AuthAgent } from '@alexa-multi-agent/auth-agent';
import { Logger } from 'winston';
import * as Joi from 'joi';
import { SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

import { EmailService } from '../services/EmailService';
import { JurisdictionService } from '../services/JurisdictionService';

export class AuthRoutes {
  private router: Router;
  private authAgent: AuthAgent;
  private logger: Logger;
  private emailService?: EmailService;
  private supabase?: SupabaseClient;

  constructor(authAgent: AuthAgent, logger: Logger, emailService?: EmailService, supabase?: SupabaseClient) {
    this.authAgent = authAgent;
    this.logger = logger;
    this.emailService = emailService;
    this.supabase = supabase;
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // User Registration (Adult-only, COPPA/GDPR-K compliant)
    this.router.post('/register', this.validateRequest(Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required(),
      // REMOVED: age, userType: 'child', parentEmail
      userType: Joi.string().valid(
        'parent', 'guardian', 'grandparent', 'aunt_uncle', 
        'older_sibling', 'foster_caregiver', 'teacher', 'librarian', 
        'afterschool_leader', 'childcare_provider', 'nanny', 
        'child_life_specialist', 'therapist', 'medical_professional', 
        'coach_mentor', 'enthusiast', 'other'
        // REMOVED: 'child'
      ).required(),
      // ADD: country (required, ISO-3166-1 alpha-2)
      country: Joi.string().length(2).uppercase().required()
        .messages({
          'string.length': 'Country must be a 2-letter ISO code (e.g., US, GB, FR)',
          'any.required': 'Country is required for jurisdiction-aware age verification'
        }),
      // ADD: locale (optional)
      locale: Joi.string().pattern(/^[a-z]{2}-[A-Z]{2}$/).optional()
        .messages({
          'string.pattern': 'Locale must be in format "en-US" or "fr-FR"'
        }),
      // ADD: ageVerification (required)
      ageVerification: Joi.object({
        method: Joi.string().valid('confirmation', 'birthYear', 'ageRange').required(),
        value: Joi.when('method', {
          switch: [
            { is: 'birthYear', then: Joi.number().integer().min(1900).max(new Date().getFullYear()).required() },
            { is: 'ageRange', then: Joi.string().pattern(/^\d+-\d+$/).required().messages({ 'string.pattern': 'Age range must be in format "6-8" or "9-10"' }) },
            { is: 'confirmation', then: Joi.any().optional() }
          ]
        })
      }).required(),
      firstName: Joi.string().max(50).required(),
      lastName: Joi.string().max(50).required(),
      inviteCode: Joi.string().optional()  // Optional invite code for referral credits
    })), async (req, res) => {
      try {
        const { email, password, userType, country, locale, ageVerification, firstName, lastName, inviteCode } = req.body;

        // Initialize JurisdictionService
        const jurisdictionService = new JurisdictionService();
        
        // Evaluate minor status
        const evaluation = jurisdictionService.evaluateMinorStatus(
          country || 'UNKNOWN',
          ageVerification,
          '2025-01' // Current policy version
        );

        // HARD-BLOCK: If minor, reject registration immediately
        if (evaluation.isMinor === true) {
          this.logger.warn('Registration blocked: minor detected', {
            email,
            country,
            method: ageVerification.method,
            threshold: evaluation.minorThreshold
          });
          
          // Log to age verification audit (even though registration was blocked)
          if (this.supabase) {
            try {
              await this.supabase.from('age_verification_audit').insert({
                user_id: null, // NULL because registration was blocked
                verification_method: ageVerification.method,
                verification_attestation: false,
                derived_bucket: 'minor_detected',
                country,
                policy_version: evaluation.policyVersion,
                evaluated_threshold: evaluation.minorThreshold
              });
            } catch (auditError) {
              // Log but don't fail - audit logging failure shouldn't block error response
              this.logger.error('Failed to log age verification audit', {
                error: auditError instanceof Error ? auditError.message : String(auditError)
              });
            }
          }
          
          return res.status(403).json({
            success: false,
            error: 'ADULT_REQUIRED',
            message: 'Registration is restricted to adults only. Users must meet the minimum age requirement in their country.',
            code: 'ADULT_REQUIRED',
            details: {
              country,
              minorThreshold: evaluation.minorThreshold,
              applicableFramework: evaluation.applicableFramework
            }
          });
          // DO NOT create user, DO NOT issue tokens
        }

        // Create user account with jurisdiction fields
        const result = await this.createUserAccount({
          email,
          password,
          userType,
          country,
          locale,
          firstName,
          lastName,
          isMinor: false, // Always false for adults (enforced by CHECK constraint)
          policyVersion: evaluation.policyVersion,
          evaluatedAt: evaluation.evaluatedAt,
          minorThreshold: evaluation.minorThreshold,
          applicableFramework: evaluation.applicableFramework,
          ageVerification
        });

        if (!result.success) {
          return res.status(400).json({
            success: false,
            error: result.error
          });
        }

        // Log age verification audit
        if (this.supabase) {
          try {
            const derivedBucket = ageVerification.method === 'confirmation' 
              ? 'adult_confirmed' 
              : ageVerification.method === 'birthYear'
              ? 'adult_birthyear'
              : 'adult_agerange';
            
            await this.supabase.from('age_verification_audit').insert({
              user_id: result.userId,
              verification_method: ageVerification.method,
              verification_attestation: true,
              derived_bucket: derivedBucket,
              country,
              policy_version: evaluation.policyVersion,
              evaluated_threshold: evaluation.minorThreshold
            });
          } catch (auditError) {
            // Log but don't fail - audit logging failure shouldn't block registration
            this.logger.error('Failed to log age verification audit', {
              error: auditError instanceof Error ? auditError.message : String(auditError),
              userId: result.userId
            });
          }
        }

        // Generate tokens
        const tokenResponse = await this.authAgent.generateAuthTokens(result.userId);

        // Auto-create default Storytailor ID (library)
        let defaultStorytailorId = null;
        if (this.supabase && result.userId) {
          try {
            const { data: libraryData, error: libraryError } = await this.supabase
              .rpc('create_default_storytailor_id_for_user', {
                p_user_id: result.userId
              });

            if (!libraryError && libraryData) {
              const { data: library } = await this.supabase
                .from('libraries')
                .select('id, name')
                .eq('id', libraryData)
                .single();

              if (library) {
                defaultStorytailorId = {
                  id: library.id,
                  name: library.name
                };
              }
            }
          } catch (libraryError) {
            // Log but don't fail - library creation failure shouldn't block registration
            this.logger.error('Failed to create default Storytailor ID', {
              error: libraryError instanceof Error ? libraryError.message : String(libraryError),
              userId: result.userId
            });
          }
        }

        // Handle invite code and award credits to inviter
        if (inviteCode && this.supabase && result.userId) {
          try {
            // Find the inviter via invite_discounts or referral_tracking
            const { data: inviteDiscount } = await this.supabase
              .from('invite_discounts')
              .select('created_by, id')
              .eq('code', inviteCode)
              .eq('status', 'active')
              .single();

            if (inviteDiscount && inviteDiscount.created_by) {
              const inviterId = inviteDiscount.created_by;

              // Award +1 credit to inviter
              const { data: inviter } = await this.supabase
                .from('users')
                .select('available_story_credits')
                .eq('id', inviterId)
                .single();

              if (inviter) {
                await this.supabase.from('users').update({
                  available_story_credits: (inviter.available_story_credits || 0) + 1.0
                }).eq('id', inviterId);

                await this.supabase.from('story_credits_ledger').insert({
                  user_id: inviterId,
                  credit_type: 'referral_accepted',
                  amount: 1.0,
                  source_id: inviteDiscount.id,
                  notes: `Friend ${email} signed up via invite`
                });

                // Update referral tracking if exists
                await this.supabase
                  .from('referral_tracking')
                  .update({
                    referee_id: result.userId,
                    status: 'completed',
                    completed_at: new Date().toISOString()
                  })
                  .eq('discount_code', inviteCode)
                  .eq('referrer_id', inviterId)
                  .is('referee_id', null);
              }
            }
          } catch (inviteError) {
            // Log but don't fail - invite credit failure shouldn't block registration
            this.logger.error('Failed to process invite code', {
              error: inviteError instanceof Error ? inviteError.message : String(inviteError),
              userId: result.userId,
              inviteCode
            });
          }
        }

        // Auto-accept pending transfers for this email
        if (this.supabase && result.userId && email) {
          try {
            // Find pending magic links for this email
            const { data: magicLinks } = await this.supabase
              .from('pending_transfer_magic_links')
              .select('magic_token, transfer_id')
              .eq('recipient_email', email)
              .is('used_at', null)
              .gt('expires_at', new Date().toISOString());

            if (magicLinks && magicLinks.length > 0) {
              for (const link of magicLinks) {
                try {
                  // Accept transfer via magic link
                  const { data: acceptResult, error: acceptError } = await this.supabase
                    .rpc('accept_transfer_via_magic_link', {
                      p_token: link.magic_token,
                      p_user_id: result.userId
                    });

                  if (acceptError) {
                    this.logger.warn('Failed to auto-accept transfer', {
                      userId: result.userId,
                      transferId: link.transfer_id,
                      error: acceptError
                    });
                  } else {
                    this.logger.info('Auto-accepted pending transfer', {
                      userId: result.userId,
                      transferId: link.transfer_id
                    });
                  }
                } catch (transferError) {
                  this.logger.warn('Error accepting transfer', {
                    userId: result.userId,
                    transferId: link.transfer_id,
                    error: transferError
                  });
                }
              }
            }
          } catch (transferError) {
            // Log but don't fail - transfer auto-accept failure shouldn't block registration
            this.logger.error('Failed to auto-accept pending transfers', {
              error: transferError instanceof Error ? transferError.message : String(transferError),
              userId: result.userId,
              email
            });
          }
        }

        res.status(201).json({
          success: true,
          user: {
            id: result.userId,
            email,
            firstName,
            lastName,
            userType,
            country,
            locale,
            isMinor: false,
            minorThreshold: evaluation.minorThreshold,
            applicableFramework: evaluation.applicableFramework
          },
          defaultStorytailorId,
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

        // Get full user data including user_type, country, locale from database
        let userType: string | undefined;
        let firstName: string | undefined;
        let lastName: string | undefined;
        let country: string | undefined;
        let locale: string | undefined;
        
        if (this.supabase) {
          try {
            const { data: userData } = await this.supabase
              .from('users')
              .select('user_type, first_name, last_name, country, locale')
              .eq('id', userSession.userId)
              .single();
            
            if (userData) {
              userType = userData.user_type || undefined;
              firstName = userData.first_name || undefined;
              lastName = userData.last_name || undefined;
              country = userData.country || undefined;
              locale = userData.locale || undefined;
            }
          } catch (error) {
            // Log but don't fail - userType may not be set for existing users
            this.logger.warn('Failed to fetch user data from database', {
              userId: userSession.userId,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
        
        res.json({
          success: true,
          data: {
            id: userSession.userId,
            email: userSession.email,
            firstName: firstName,
            lastName: lastName,
            userType: userType,
            country: country,
            locale: locale,
            isMinor: false, // Always false for adults
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
    userType: string;
    country: string;
    locale?: string;
    firstName: string;
    lastName: string;
    isMinor: boolean;
    policyVersion: string;
    evaluatedAt: Date;
    minorThreshold: number;
    applicableFramework: string;
    ageVerification: { method: string; value?: number | string };
  }): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      // Use Supabase Auth to create the user
      const { data, error } = await this.authAgent.getSupabaseClient().auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            user_type: userData.userType,
            country: userData.country,
            locale: userData.locale
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

      // Create or update user record in users table
      // This is critical - AuthAgent.generateAuthTokens needs the user in the users table
      const { Database } = require('@alexa-multi-agent/shared-types');
      
      // Build user record object - only include fields that exist in schema
      // Handle schema differences gracefully (first_name vs firstName, etc.)
      const userRecord: any = {
        id: data.user.id,
        email: userData.email,
        user_type: userData.userType,
        country: userData.country,
        locale: userData.locale || null,
        is_minor: userData.isMinor, // Always false for adults (enforced by CHECK constraint)
        policy_version: userData.policyVersion,
        evaluated_at: userData.evaluatedAt.toISOString(),
        minor_threshold: userData.minorThreshold,
        applicable_framework: userData.applicableFramework,
        email_confirmed: data.user.email_confirmed_at !== null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Add first_name and last_name if they exist in schema
      // Try both snake_case and camelCase to handle schema variations
      if (userData.firstName) {
        userRecord.first_name = userData.firstName;
        // Also try camelCase in case schema uses that
        userRecord.firstName = userData.firstName;
      }
      if (userData.lastName) {
        userRecord.last_name = userData.lastName;
        // Also try camelCase in case schema uses that
        userRecord.lastName = userData.lastName;
      }
      
      const { error: userInsertError } = await (this.authAgent.getSupabaseClient()
        .from('users') as any)
        .upsert(userRecord as any, {
          onConflict: 'id'
        });

      if (userInsertError) {
        // If error is about first_name column, try without it (schema may not have it yet)
        if (userInsertError.message && userInsertError.message.includes("first_name")) {
          this.logger.warn('first_name column not found, attempting upsert without it', {
            userId: data.user.id,
            email: userData.email
          });
          
          // Retry without first_name/last_name columns
          const userRecordFallback: any = {
            id: data.user.id,
            email: userData.email,
            user_type: userData.userType,
            country: userData.country,
            locale: userData.locale || null,
            is_minor: userData.isMinor,
            policy_version: userData.policyVersion,
            evaluated_at: userData.evaluatedAt.toISOString(),
            minor_threshold: userData.minorThreshold,
            applicable_framework: userData.applicableFramework,
            email_confirmed: data.user.email_confirmed_at !== null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          const { error: fallbackError } = await (this.authAgent.getSupabaseClient()
            .from('users') as any)
            .upsert(userRecordFallback as any, {
              onConflict: 'id'
            });
          
          if (fallbackError) {
            this.logger.error('Failed to create user record in users table (fallback also failed)', {
              error: fallbackError.message,
              userId: data.user.id,
              email: userData.email
            });
            // Don't fail registration, but log the error
          } else {
            this.logger.info('User record created in users table (without first_name/last_name)', {
              userId: data.user.id
            });
          }
        } else {
          this.logger.error('Failed to create user record in users table', {
            error: userInsertError.message,
            userId: data.user.id,
            email: userData.email
          });
          // Don't fail registration, but log the error
        }
      } else {
        this.logger.info('User record created in users table', {
          userId: data.user.id,
          email: userData.email
        });
      }

      // Note: Parent consent is no longer handled here
      // Child Storytailor IDs are created separately via POST /storytailor-ids endpoint
      // with consent workflow handled via POST /storytailor-ids/:id/consent

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
        userId: data.user.id
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
      // Ensure AuthAgent is initialized (lazy initialization)
      // AuthAgent.getSupabaseClient() requires initialization, but we can initialize lazily
      try {
        // Try to initialize if not already initialized
        // Check if Redis connection exists (indicator of initialization)
        if (this.authAgent && typeof (this.authAgent as any).initialize === 'function') {
          try {
            await (this.authAgent as any).initialize();
          } catch (initError: any) {
            // If initialization fails (e.g., Redis unavailable), we can still use Supabase Auth directly
            // by accessing the Supabase client directly
            this.logger.warn('AuthAgent initialization failed, using Supabase Auth directly', {
              error: initError?.message
            });
          }
        }
      } catch (checkError) {
        // Ignore initialization check errors
      }
      
      // Use Supabase Auth to authenticate
      // getSupabaseClient() will throw if not initialized, so we'll catch and use direct Supabase client
      let supabaseClient;
      try {
        supabaseClient = this.authAgent.getSupabaseClient();
      } catch (e) {
        // If getSupabaseClient fails, create Supabase client directly
        const { createClient } = require('@supabase/supabase-js');
        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
        supabaseClient = createClient(supabaseUrl, supabaseKey);
      }
      
      const { data, error } = await supabaseClient.auth.signInWithPassword({
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
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      const safeUserData = (userData as any) || null;
      
      if (userError || !safeUserData) {
        // Create user record if it doesn't exist
        const { error: insertError } = await (supabaseClient
          .from('users') as any)
          .insert({
            id: data.user.id,
            email: data.user.email,
            // Handle first_name/last_name gracefully - only include if metadata has them
            ...(data.user.user_metadata?.first_name ? { first_name: data.user.user_metadata.first_name } : {}),
            ...(data.user.user_metadata?.last_name ? { last_name: data.user.user_metadata.last_name } : {}),
            country: data.user.user_metadata?.country,
            locale: data.user.user_metadata?.locale,
            is_minor: false, // Always false for adults
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
        await (supabaseClient
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
          country: (safeUserData ? safeUserData.country : data.user.user_metadata?.country) ?? '',
          locale: (safeUserData ? safeUserData.locale : data.user.user_metadata?.locale) ?? '',
          isMinor: false, // Always false for adults
          minorThreshold: (safeUserData ? safeUserData.minor_threshold : null) ?? null,
          applicableFramework: (safeUserData ? safeUserData.applicable_framework : null) ?? null
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
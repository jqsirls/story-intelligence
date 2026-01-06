// JWT Authentication Middleware
import { Request, Response, NextFunction } from 'express';
import { AuthAgent } from '@alexa-multi-agent/auth-agent';
import { Logger } from 'winston';
import { SupabaseClient } from '@supabase/supabase-js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    age?: number;
    isCoppaProtected: boolean;
    parentConsentVerified: boolean;
    isEmailConfirmed: boolean;
  };
}

export class AuthMiddleware {
  private authAgent: AuthAgent;
  private logger: Logger;
  private supabase: SupabaseClient | null = null;

  constructor(authAgent: AuthAgent, logger: Logger, supabase?: SupabaseClient) {
    this.authAgent = authAgent;
    this.logger = logger;
    this.supabase = supabase || null;
  }

  /**
   * Middleware to require authentication
   */
  requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: 'Authorization token required',
          code: 'AUTH_TOKEN_MISSING'
        });
        return;
      }

      const token = authHeader.substring(7);
      
      // Use Supabase to validate tokens (supports Supabase JWT tokens)
      if (this.supabase) {
        const { data: { user }, error } = await this.supabase.auth.getUser(token);
        
        if (error || !user) {
          this.logger.warn('Supabase token validation failed', {
            error: error?.message,
            path: req.path
          });

          // Fallback: accept AuthAgent-issued tokens (used by /api/v1/auth/login)
          try {
            const userSession = await this.authAgent.validateToken(token);
            if (userSession) {
              req.user = {
                id: userSession.userId,
                email: userSession.email,
                age: userSession.age,
                isCoppaProtected: userSession.isCoppaProtected,
                parentConsentVerified: userSession.parentConsentVerified,
                isEmailConfirmed: userSession.isEmailConfirmed
              };

              this.logger.info('User authenticated via AuthAgent fallback', {
                userId: userSession.userId,
                path: req.path
              });

              next();
              return;
            }
          } catch (authError) {
            this.logger.error('AuthAgent fallback validation failed', {
              error: authError instanceof Error ? authError.message : String(authError),
              path: req.path
            });
          }

          res.status(401).json({
            success: false,
            error: 'Invalid or expired token',
            code: 'AUTH_TOKEN_INVALID'
          });
          return;
        }
        
        // Get additional user metadata from database
        const { data: userProfile } = await this.supabase
          .from('users')
          .select('age, subscription_tier')
          .eq('id', user.id)
          .single();
        
        // Add user to request object
        req.user = {
          id: user.id,
          email: user.email || '',
          age: userProfile?.age,
          isCoppaProtected: userProfile?.age ? userProfile.age < 13 : false,
          parentConsentVerified: true, // Set based on your COPPA logic
          isEmailConfirmed: user.email_confirmed_at !== null
        };
        
        this.logger.info('User authenticated via Supabase', {
          userId: user.id,
          email: user.email,
          path: req.path
        });
      } else {
        // Fallback to AuthAgent for custom tokens (if Supabase not available)
        this.logger.warn('Supabase client not available, falling back to AuthAgent');
        
        try {
          const userSession = await this.authAgent.validateToken(token);

          if (!userSession) {
            res.status(401).json({
              success: false,
              error: 'Invalid or expired token',
              code: 'AUTH_TOKEN_INVALID'
            });
            return;
          }

          // Add user to request object
          req.user = {
            id: userSession.userId,
            email: userSession.email,
            age: userSession.age,
            isCoppaProtected: userSession.isCoppaProtected,
            parentConsentVerified: userSession.parentConsentVerified,
            isEmailConfirmed: userSession.isEmailConfirmed
          };
        } catch (authError) {
          this.logger.error('AuthAgent validation failed', {
            error: authError instanceof Error ? authError.message : String(authError)
          });
          
          res.status(401).json({
            success: false,
            error: 'Invalid or expired token',
            code: 'AUTH_TOKEN_INVALID'
          });
          return;
        }
      }

      next();

    } catch (error) {
      this.logger.error('Authentication middleware error', {
        error: error instanceof Error ? error.message : String(error),
        path: req.path
      });

      res.status(500).json({
        success: false,
        error: 'Authentication error',
        code: 'AUTH_ERROR'
      });
    }
  };

  /**
   * Middleware to require parent consent for COPPA-protected users
   */
  requireParentConsent = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    if (req.user.isCoppaProtected && !req.user.parentConsentVerified) {
      res.status(403).json({
        success: false,
        error: 'Parent consent required for this action',
        code: 'PARENT_CONSENT_REQUIRED',
        details: {
          isCoppaProtected: true,
          parentConsentVerified: false,
          message: 'This account requires parent consent before accessing this feature.'
        }
      });
      return;
    }

    next();
  };

  /**
   * Middleware to require email verification
   */
  requireEmailVerification = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    if (!req.user.isEmailConfirmed) {
      res.status(403).json({
        success: false,
        error: 'Email verification required',
        code: 'EMAIL_VERIFICATION_REQUIRED',
        details: {
          isEmailConfirmed: false,
          message: 'Please verify your email address before accessing this feature.'
        }
      });
      return;
    }

    next();
  };

  /**
   * Optional authentication - adds user to request if token is valid, but doesn't require it
   */
  optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No token provided, continue without user
        next();
        return;
      }

      const token = authHeader.substring(7);
      const userSession = await this.authAgent.validateToken(token);

      if (userSession) {
        // Valid token, add user to request
        req.user = {
          id: userSession.userId,
          email: userSession.email,
          age: userSession.age,
          isCoppaProtected: userSession.isCoppaProtected,
          parentConsentVerified: userSession.parentConsentVerified,
          isEmailConfirmed: userSession.isEmailConfirmed
        };
      }

      next();

    } catch (error) {
      this.logger.warn('Optional auth middleware error', {
        error: error instanceof Error ? error.message : String(error),
        path: req.path
      });

      // Continue without user on error
      next();
    }
  };

  /**
   * Middleware to check if user has specific permissions
   */
  requirePermission = (permission: string) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        return;
      }

      // Check user permissions based on permission type
      const hasPermission = await this.checkUserPermission(req.user.id, permission);
      
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: `Permission denied: ${permission} required`,
          code: 'PERMISSION_DENIED'
        });
        return;
      }

      next();
    };
  };

  /**
   * Middleware to rate limit based on user
   */
  userRateLimit = (maxRequests: number = 100, windowMs: number = 60000) => {
    const userRequestCounts = new Map<string, { count: number; resetTime: number }>();

    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      const userId = req.user?.id || req.ip;
      const now = Date.now();

      // Clean up expired entries
      for (const [key, value] of userRequestCounts.entries()) {
        if (now > value.resetTime) {
          userRequestCounts.delete(key);
        }
      }

      // Get or create user request count
      let userRequests = userRequestCounts.get(userId);
      if (!userRequests || now > userRequests.resetTime) {
        userRequests = {
          count: 0,
          resetTime: now + windowMs
        };
        userRequestCounts.set(userId, userRequests);
      }

      // Check rate limit
      if (userRequests.count >= maxRequests) {
        res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          details: {
            maxRequests,
            windowMs,
            resetTime: userRequests.resetTime
          }
        });
        return;
      }

      // Increment count
      userRequests.count++;

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - userRequests.count));
      res.setHeader('X-RateLimit-Reset', Math.ceil(userRequests.resetTime / 1000));

      next();
    };
  };

  /**
   * Check if user has a specific permission
   */
  private async checkUserPermission(userId: string, permission: string): Promise<boolean> {
    try {
      // If no Supabase client, allow all authenticated users (backward compatibility)
      if (!this.supabase) {
        this.logger.warn('Permission check skipped - Supabase client not available', { userId, permission });
        return true;
      }

      // Get user information
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('id, email, age, is_coppa_protected, parent_consent_verified, email_confirmed')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        this.logger.warn('User not found for permission check', { userId, permission, error: userError });
        return false;
      }

      // Check COPPA-protected user restrictions
      if (user.is_coppa_protected && !user.parent_consent_verified) {
        // COPPA-protected users without parent consent have limited permissions
        const allowedPermissions = ['view_own_data', 'create_story', 'view_library'];
        if (!allowedPermissions.includes(permission)) {
          this.logger.info('Permission denied for COPPA-protected user without parent consent', { userId, permission });
          return false;
        }
      }

      // Check library-specific permissions
      if (permission.startsWith('library:')) {
        const libraryId = permission.split(':')[1];
        if (libraryId) {
          const { data: libraryPermission } = await this.supabase
            .from('library_permissions')
            .select('role')
            .eq('library_id', libraryId)
            .eq('user_id', userId)
            .single();

          if (libraryPermission) {
            const role = libraryPermission.role;
            // Map roles to permissions
            const rolePermissions: Record<string, string[]> = {
              'Owner': ['read', 'write', 'delete', 'admin'],
              'Admin': ['read', 'write', 'delete'],
              'Editor': ['read', 'write'],
              'Viewer': ['read']
            };
            
            const permissionAction = permission.split(':')[2] || 'read';
            const allowedActions = rolePermissions[role] || [];
            return allowedActions.includes(permissionAction);
          }
        }
      }

      // Check general API permissions based on user type
      // All authenticated users have basic API access
      // This can be extended with a user_permissions table if needed
      const generalPermissions = [
        'create_story',
        'view_own_data',
        'update_own_data',
        'delete_own_data',
        'view_library',
        'create_conversation'
      ];

      if (generalPermissions.includes(permission)) {
        return true;
      }

      // Admin-only permissions (could be extended with user roles table)
      const adminPermissions = [
        'delete_any_data',
        'view_any_data',
        'manage_users',
        'system_admin'
      ];

      if (adminPermissions.includes(permission)) {
        // Admin permissions require role-based access control
        // Currently, admin permissions are denied until proper role system is implemented
        // This would typically come from a user_roles table
        this.logger.warn('Admin permission check requires role system', { userId, permission });
        return false; // Deny admin permissions until proper role system is implemented
      }

      // Default: deny unknown permissions
      this.logger.warn('Unknown permission requested', { userId, permission });
      return false;
    } catch (error: any) {
      this.logger.error('Error checking user permission', { userId, permission, error: error.message });
      return false; // Fail secure - deny on error
    }
  }
}
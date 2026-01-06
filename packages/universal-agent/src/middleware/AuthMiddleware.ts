// JWT Authentication Middleware
import { Request, Response, NextFunction } from 'express';
import { AuthAgent } from '@alexa-multi-agent/auth-agent';
import { Logger } from 'winston';

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

  constructor(authAgent: AuthAgent, logger: Logger) {
    this.authAgent = authAgent;
    this.logger = logger;
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

      // TODO: Implement permission checking logic
      // For now, all authenticated users have all permissions
      // In the future, this would check against user roles/permissions

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
}
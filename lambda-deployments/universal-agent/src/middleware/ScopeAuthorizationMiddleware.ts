/**
 * Scope Authorization Middleware
 * 
 * Enforces endpoint access based on user scopes (capabilities).
 * Scopes are derived from user role, subscription tier, and context.
 * 
 * Scope Categories:
 *   - child-facing: Safe for child tokens
 *   - parent-facing: Requires adult/parent token
 *   - educator-facing: Requires educator role
 *   - admin-facing: Requires admin role
 *   - internal-only: Requires service/internal token
 * 
 * Usage:
 *   app.get('/emotions/patterns', requireScope('parent-facing'), handler);
 *   app.get('/stories', requireScope('child-safe'), handler);
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from 'winston';

/**
 * Available scopes for endpoint access control
 */
export type EndpointScope = 
  | 'child-safe'        // Safe for child tokens (read-only, no PII)
  | 'parent-facing'     // Requires parent/guardian token
  | 'educator-facing'   // Requires educator role
  | 'org-admin'         // Requires organization admin role
  | 'platform-admin'    // Requires Storytailor admin role
  | 'internal-only'     // Service-to-service only
  | 'public';           // No authentication required

/**
 * User roles that map to scopes
 */
export type UserRole = 
  | 'child'
  | 'parent'
  | 'guardian'
  | 'educator'
  | 'therapist'
  | 'org_admin'
  | 'platform_admin'
  | 'service';

/**
 * Subscription tiers that affect scope permissions
 */
export type SubscriptionTier = 
  | 'free'
  | 'plus'
  | 'pro'
  | 'enterprise';

/**
 * Extended request with user context
 */
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role: UserRole;
    tier?: SubscriptionTier;
    profileId?: string;      // Child profile being accessed
    organizationId?: string; // Organization context
    scopes?: string[];       // Explicitly granted scopes
  };
}

/**
 * Scope hierarchy - higher scopes include lower ones
 */
const scopeHierarchy: Record<EndpointScope, EndpointScope[]> = {
  'public': [],
  'child-safe': ['public'],
  'parent-facing': ['child-safe', 'public'],
  'educator-facing': ['child-safe', 'public'],
  'org-admin': ['educator-facing', 'parent-facing', 'child-safe', 'public'],
  'platform-admin': ['org-admin', 'educator-facing', 'parent-facing', 'child-safe', 'public'],
  'internal-only': ['platform-admin', 'org-admin', 'educator-facing', 'parent-facing', 'child-safe', 'public'],
};

/**
 * Map user roles to their base scopes
 */
const roleScopeMapping: Record<UserRole, EndpointScope[]> = {
  'child': ['child-safe', 'public'],
  'parent': ['parent-facing', 'child-safe', 'public'],
  'guardian': ['parent-facing', 'child-safe', 'public'],
  'educator': ['educator-facing', 'child-safe', 'public'],
  'therapist': ['educator-facing', 'parent-facing', 'child-safe', 'public'],
  'org_admin': ['org-admin', 'educator-facing', 'parent-facing', 'child-safe', 'public'],
  'platform_admin': ['platform-admin', 'org-admin', 'educator-facing', 'parent-facing', 'child-safe', 'public'],
  'service': ['internal-only', 'platform-admin', 'org-admin', 'educator-facing', 'parent-facing', 'child-safe', 'public'],
};

// Logger instance
let logger: Logger | null = null;

/**
 * Initialize the scope middleware with a logger
 */
export function initializeScopeMiddleware(loggerInstance: Logger): void {
  logger = loggerInstance;
}

/**
 * Check if a user has access to a given scope
 */
function hasScope(user: AuthenticatedRequest['user'], requiredScope: EndpointScope): boolean {
  if (!user) {
    return requiredScope === 'public';
  }

  // Check explicit scopes first
  if (user.scopes?.includes(requiredScope)) {
    return true;
  }

  // Get scopes from role
  const roleScopes = roleScopeMapping[user.role] || [];
  
  // Check if required scope is in role scopes or is inherited
  if (roleScopes.includes(requiredScope)) {
    return true;
  }

  // Check scope hierarchy
  for (const scope of roleScopes) {
    const inheritedScopes = scopeHierarchy[scope as EndpointScope] || [];
    if (inheritedScopes.includes(requiredScope)) {
      return true;
    }
  }

  return false;
}

/**
 * Create scope enforcement middleware
 * 
 * @param requiredScope - The scope required to access this endpoint
 * @param options - Additional options
 */
export function requireScope(
  requiredScope: EndpointScope,
  options: {
    allowServiceOverride?: boolean;  // Allow service tokens to bypass
    logDenials?: boolean;            // Log access denials
    customMessage?: string;          // Custom error message
  } = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const { 
    allowServiceOverride = true, 
    logDenials = true,
    customMessage,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    
    // Public endpoints don't need auth
    if (requiredScope === 'public') {
      next();
      return;
    }

    // Check if user is authenticated
    if (!authReq.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    // Service tokens can bypass scope checks if allowed
    if (allowServiceOverride && authReq.user.role === 'service') {
      next();
      return;
    }

    // Check scope
    if (hasScope(authReq.user, requiredScope)) {
      next();
      return;
    }

    // Access denied
    if (logDenials && logger) {
      logger.warn('Scope access denied', {
        userId: authReq.user.id,
        userRole: authReq.user.role,
        requiredScope,
        endpoint: `${req.method} ${req.path}`,
      });
    }

    res.status(403).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_SCOPE',
        message: customMessage || `This endpoint requires ${requiredScope} access`,
        details: {
          requiredScope,
          userRole: authReq.user.role,
          hint: getScopeHint(authReq.user.role, requiredScope),
        },
      },
    });
  };
}

/**
 * Get a helpful hint for scope denial
 */
function getScopeHint(userRole: UserRole, requiredScope: EndpointScope): string {
  switch (requiredScope) {
    case 'parent-facing':
      if (userRole === 'child') {
        return 'This feature is only available to parents or guardians.';
      }
      return 'Please sign in with a parent or guardian account.';
    
    case 'educator-facing':
      return 'This feature requires an educator account.';
    
    case 'org-admin':
      return 'This feature requires organization administrator access.';
    
    case 'platform-admin':
      return 'This feature is restricted to Storytailor administrators.';
    
    case 'internal-only':
      return 'This endpoint is for internal service use only.';
    
    default:
      return 'Please contact support if you believe you should have access.';
  }
}

/**
 * Require multiple scopes (AND logic)
 */
export function requireAllScopes(
  scopes: EndpointScope[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    for (const scope of scopes) {
      if (!hasScope(authReq.user, scope)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_SCOPE',
            message: `This endpoint requires all of: ${scopes.join(', ')}`,
            details: {
              requiredScopes: scopes,
              missingScope: scope,
              userRole: authReq.user?.role,
            },
          },
        });
        return;
      }
    }

    next();
  };
}

/**
 * Require any of the scopes (OR logic)
 */
export function requireAnyScope(
  scopes: EndpointScope[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    for (const scope of scopes) {
      if (hasScope(authReq.user, scope)) {
        next();
        return;
      }
    }

    res.status(403).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_SCOPE',
        message: `This endpoint requires one of: ${scopes.join(', ')}`,
        details: {
          requiredScopes: scopes,
          userRole: authReq.user?.role,
        },
      },
    });
  };
}

/**
 * Child-safe endpoint wrapper
 * Ensures endpoint is safe for child tokens
 */
export function childSafe(): (req: Request, res: Response, next: NextFunction) => void {
  return requireScope('child-safe', {
    customMessage: 'This content is available for family members.',
  });
}

/**
 * Parent-only endpoint wrapper
 */
export function parentOnly(): (req: Request, res: Response, next: NextFunction) => void {
  return requireScope('parent-facing', {
    customMessage: 'This feature is only available to parents and guardians.',
  });
}

/**
 * Educator endpoint wrapper
 */
export function educatorOnly(): (req: Request, res: Response, next: NextFunction) => void {
  return requireScope('educator-facing', {
    customMessage: 'This feature is only available to educators.',
  });
}

/**
 * Admin endpoint wrapper
 */
export function adminOnly(): (req: Request, res: Response, next: NextFunction) => void {
  return requireScope('platform-admin', {
    customMessage: 'This feature requires administrator access.',
  });
}

/**
 * Internal service endpoint wrapper
 */
export function internalOnly(): (req: Request, res: Response, next: NextFunction) => void {
  return requireScope('internal-only', {
    allowServiceOverride: false, // Must explicitly have internal scope
    customMessage: 'This endpoint is for internal service use only.',
  });
}

/**
 * Get user's effective scopes
 */
export function getUserScopes(user: AuthenticatedRequest['user']): EndpointScope[] {
  if (!user) {
    return ['public'];
  }

  const baseScopes = new Set<EndpointScope>(roleScopeMapping[user.role] || []);
  
  // Add explicit scopes
  if (user.scopes) {
    user.scopes.forEach(scope => {
      if (isValidScope(scope)) {
        baseScopes.add(scope as EndpointScope);
      }
    });
  }

  // Add inherited scopes
  const allScopes = new Set<EndpointScope>(baseScopes);
  baseScopes.forEach(scope => {
    const inherited = scopeHierarchy[scope];
    inherited?.forEach(s => allScopes.add(s));
  });

  return Array.from(allScopes);
}

/**
 * Validate if a string is a valid scope
 */
function isValidScope(scope: string): scope is EndpointScope {
  return [
    'child-safe',
    'parent-facing',
    'educator-facing',
    'org-admin',
    'platform-admin',
    'internal-only',
    'public',
  ].includes(scope);
}

/**
 * Endpoint scope documentation for OpenAPI
 */
export const ScopeDescriptions: Record<EndpointScope, string> = {
  'public': 'No authentication required. Available to all.',
  'child-safe': 'Safe for child tokens. Read-only access to own content.',
  'parent-facing': 'Requires parent/guardian authentication. Full family access.',
  'educator-facing': 'Requires educator role. Aggregated view of classroom data.',
  'org-admin': 'Requires organization administrator role. Manages org settings and members.',
  'platform-admin': 'Storytailor internal administrators only.',
  'internal-only': 'Service-to-service communication only. Not for external use.',
};

/**
 * Example endpoint scope annotations for documentation
 */
export const EndpointScopeExamples = {
  // Child-safe endpoints
  '/stories': 'child-safe',
  '/stories/:id': 'child-safe',
  '/characters': 'child-safe',
  '/audio/play': 'child-safe',
  '/emotions/check-in': 'child-safe',
  
  // Parent-facing endpoints
  '/emotions/patterns': 'parent-facing',
  '/emotions/crisis-alerts': 'parent-facing',
  '/profiles': 'parent-facing',
  '/profiles/:id': 'parent-facing',
  '/transfers': 'parent-facing',
  '/library/permissions': 'parent-facing',
  '/subscriptions': 'parent-facing',
  
  // Educator endpoints
  '/classroom/overview': 'educator-facing',
  '/classroom/students': 'educator-facing',
  '/reports/emotion-summary': 'educator-facing',
  
  // Org admin endpoints
  '/organizations/:id/members': 'org-admin',
  '/organizations/:id/settings': 'org-admin',
  '/organizations/:id/billing': 'org-admin',
  
  // Platform admin endpoints
  '/admin/users': 'platform-admin',
  '/admin/content-moderation': 'platform-admin',
  '/admin/system-health': 'platform-admin',
  
  // Internal endpoints
  '/internal/metrics': 'internal-only',
  '/internal/cache-invalidate': 'internal-only',
  '/internal/job-status': 'internal-only',
} as const;


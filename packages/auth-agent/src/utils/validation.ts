/**
 * Validation utilities for AuthAgent
 */

/**
 * Validate email format using RFC 5322 compliant regex
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

/**
 * Validate voice code format (6 digits)
 */
export function validateVoiceCode(code: string): boolean {
  const codeRegex = /^[0-9]{6}$/;
  return codeRegex.test(code);
}

/**
 * Validate Alexa Person ID format
 */
export function validateAlexaPersonId(personId: string): boolean {
  // Alexa Person IDs are typically UUIDs or similar format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(personId) || (personId.length > 10 && personId.length < 100);
}

/**
 * Validate JWT token format
 */
export function validateJWTFormat(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 3 && parts.every(part => part.length > 0);
}

/**
 * Sanitize email for logging (mask domain)
 */
export function sanitizeEmailForLogging(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!domain) return email;
  
  const maskedLocal = localPart.length > 2 
    ? localPart.substring(0, 2) + '*'.repeat(localPart.length - 2)
    : localPart;
  
  const domainParts = domain.split('.');
  const maskedDomain = domainParts.length > 1
    ? domainParts[0].substring(0, 1) + '*'.repeat(Math.max(0, domainParts[0].length - 1)) + '.' + domainParts.slice(1).join('.')
    : domain;
  
  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Validate device type
 */
export function validateDeviceType(deviceType: string): deviceType is 'voice' | 'screen' {
  return deviceType === 'voice' || deviceType === 'screen';
}

/**
 * Validate locale format
 */
export function validateLocale(locale: string): boolean {
  const localeRegex = /^[a-z]{2}(-[A-Z]{2})?$/;
  return localeRegex.test(locale);
}

/**
 * Rate limiting key generator
 */
export function generateRateLimitKey(identifier: string, action: string): string {
  return `rate_limit:${action}:${identifier}`;
}

/**
 * Validate password strength (for future use)
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return `auth_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}
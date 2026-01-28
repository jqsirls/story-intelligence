import { z } from 'zod';

// Account linking request from Alexa
export const AccountLinkingRequestSchema = z.object({
  customerEmail: z.string().email(),
  alexaPersonId: z.string(),
  deviceType: z.enum(['voice', 'screen']),
  locale: z.string().optional().default('en-US'),
  correlationId: z.string().optional(),
});

export type AccountLinkingRequest = z.infer<typeof AccountLinkingRequestSchema>;

// Account linking response
export const AccountLinkingResponseSchema = z.object({
  success: z.boolean(),
  provisionalToken: z.string().optional(),
  voiceCode: z.string().optional(),
  magicLinkUrl: z.string().optional(),
  qrCodeUrl: z.string().optional(),
  expiresAt: z.string().datetime(),
  userId: z.string().uuid().optional(),
  error: z.string().optional(),
});

export type AccountLinkingResponse = z.infer<typeof AccountLinkingResponseSchema>;

// Voice code verification request
export const VoiceCodeVerificationSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  alexaPersonId: z.string(),
  deviceType: z.enum(['voice', 'screen']),
});

export type VoiceCodeVerification = z.infer<typeof VoiceCodeVerificationSchema>;

// Magic link verification request
export const MagicLinkVerificationSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  alexaPersonId: z.string().optional(),
  deviceType: z.enum(['voice', 'screen']).default('screen'),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
});

export type MagicLinkVerification = z.infer<typeof MagicLinkVerificationSchema>;

// Token response
export const TokenResponseSchema = z.object({
  success: z.boolean(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresIn: z.number().optional(),
  tokenType: z.string().default('Bearer'),
  userId: z.string().uuid().optional(),
  error: z.string().optional(),
});

export type TokenResponse = z.infer<typeof TokenResponseSchema>;

// User session data
export const UserSessionSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  alexaPersonId: z.string().optional(),
  isEmailConfirmed: z.boolean(),
  isMinor: z.boolean().optional(),
  isCoppaProtected: z.boolean(),
  parentConsentVerified: z.boolean(),
  lastLoginAt: z.string().datetime().optional(),
  createdAt: z.string().datetime().optional(),
});

export type UserSession = z.infer<typeof UserSessionSchema>;

// Voice code data
export interface VoiceCodeData {
  id: string;
  email: string;
  code: string;
  expiresAt: Date;
  attempts: number;
  used: boolean;
  alexaPersonId: string;
  deviceType: 'voice' | 'screen';
  createdAt: Date;
}

// JWT payload
export interface JWTPayload {
  sub: string; // user ID
  email: string;
  alexaPersonId?: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  jti: string; // JWT ID for revocation
}

// Refresh token payload
export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  expiresAt: Date;
  createdAt: Date;
}

// Auth errors
export enum AuthErrorCode {
  INVALID_EMAIL = 'INVALID_EMAIL',
  VOICE_CODE_EXPIRED = 'VOICE_CODE_EXPIRED',
  VOICE_CODE_INVALID = 'VOICE_CODE_INVALID',
  MAX_ATTEMPTS_EXCEEDED = 'MAX_ATTEMPTS_EXCEEDED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  ACCOUNT_LINKING_FAILED = 'ACCOUNT_LINKING_FAILED',
  COPPA_VIOLATION = 'COPPA_VIOLATION',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// Configuration
export interface AuthAgentConfig {
  supabase: {
    url: string;
    serviceKey: string;
  };
  redis: {
    url: string;
  };
  jwt: {
    secret: string;
    issuer: string;
    audience: string;
    accessTokenTtl: number; // 60 minutes
    refreshTokenTtl: number; // 14 days
  };
  voiceCode: {
    length: number; // 6 digits
    ttl: number; // 5 minutes
    maxAttempts: number; // 3 attempts
  };
  rateLimit: {
    maxRequestsPerMinute: number;
    windowMs: number;
  };
  magicLink: {
    baseUrl: string;
    ttl: number; // 15 minutes
  };
}
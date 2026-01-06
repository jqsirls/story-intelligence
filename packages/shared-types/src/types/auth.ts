export interface User {
  id: string;
  email: string;
  emailConfirmed: boolean;
  parentEmail?: string; // For COPPA compliance
  age?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  jwt?: string;
  refreshToken?: string;
  error?: string;
}

export interface AccountLinkRequest {
  customerEmail: string;
  alexaPersonId: string;
}

export interface AccountLinkResponse {
  voiceCode: string;
  tempJwt: string;
  expiresAt: string;
}

export interface VerificationRequest {
  email: string;
  code: string;
}

export interface AlexaUserMapping {
  alexaPersonId: string;
  supabaseUserId: string;
  createdAt: string;
}
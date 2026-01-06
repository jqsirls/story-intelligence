export { TokenServiceAgent } from './TokenServiceAgent';
export { handler, httpHandler, eventHandler } from './handler';

// Export types
export interface TokenRequest {
  subject: string;
  clientId: string;
  scope: string;
  claims?: Record<string, any>;
  expiresIn?: number;
  tokenType: 'access' | 'refresh' | 'id';
}

export interface SignedToken {
  token: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: Date;
  issuedAt: Date;
  claims: Record<string, any>;
}

export interface TokenIntrospectionResponse {
  active: boolean;
  scope?: string;
  client_id?: string;
  username?: string;
  token_type?: string;
  exp?: number;
  iat?: number;
  nbf?: number;
  sub?: string;
  aud?: string | string[];
  iss?: string;
  jti?: string;
}

export interface JWKSResponse {
  keys: Array<{
    kid: string;
    kty: string;
    use: string;
    alg: string;
    n?: string;
    e?: string;
    x?: string;
    y?: string;
    crv?: string;
  }>;
}
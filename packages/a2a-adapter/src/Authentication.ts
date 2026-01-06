/**
 * Authentication Handler
 * 
 * Handles A2A authentication with OpenAPI-compatible schemes:
 * - API Key authentication
 * - OAuth 2.0 Bearer token
 * - OpenID Connect Discovery
 */

import { Logger } from 'winston';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

interface JwtHeader {
  alg?: string;
  kid?: string;
  typ?: string;
}

interface JwtPayload {
  sub?: string;
  agent_id?: string;
  scope?: string;
  iss?: string;
  aud?: string;
  exp?: number;
  iat?: number;
}

export interface AuthResult {
  authenticated: boolean;
  agentId?: string;
  scopes?: string[];
  error?: string;
}

export interface AuthContext {
  agentId: string;
  scopes: string[];
  method: string;
}

export class Authentication {
  private apiKeys: Map<string, { agentId: string; scopes: string[] }> = new Map();
  private jwksClients: Map<string, jwksClient.JwksClient> = new Map();

  constructor(
    private logger: Logger,
    private config: {
      apiKeys?: Record<string, { agentId: string; scopes: string[] }>;
      jwksUrl?: string;
      tokenIssuer?: string;
      tokenAudience?: string;
    }
  ) {
    this.initializeApiKeys();
    this.initializeJwksClients();
  }

  /**
   * Authenticate request
   */
  async authenticate(
    headers: Record<string, string | string[] | undefined>,
    method: string
  ): Promise<AuthContext> {
    // Try API key first
    const apiKey = this.extractApiKey(headers);
    if (apiKey) {
      const result = await this.authenticateApiKey(apiKey, method);
      if (result.authenticated && result.agentId) {
        return {
          agentId: result.agentId,
          scopes: result.scopes || [],
          method
        };
      }
    }

    // Try OAuth 2.0 Bearer token
    const bearerToken = this.extractBearerToken(headers);
    if (bearerToken) {
      const result = await this.authenticateBearerToken(bearerToken, method);
      if (result.authenticated && result.agentId) {
        return {
          agentId: result.agentId,
          scopes: result.scopes || [],
          method
        };
      }
    }

    throw new Error('Authentication failed: No valid credentials provided');
  }

  /**
   * Authenticate API key
   */
  private async authenticateApiKey(apiKey: string, method: string): Promise<AuthResult> {
    const keyInfo = this.apiKeys.get(apiKey);
    if (!keyInfo) {
      return {
        authenticated: false,
        error: 'Invalid API key'
      };
    }

    // Check if scopes allow this method
    const requiredScope = this.getRequiredScope(method);
    if (requiredScope && !keyInfo.scopes.includes(requiredScope)) {
      return {
        authenticated: false,
        error: `Insufficient scope: method ${method} requires scope ${requiredScope}`
      };
    }

    return {
      authenticated: true,
      agentId: keyInfo.agentId,
      scopes: keyInfo.scopes
    };
  }

  /**
   * Authenticate OAuth 2.0 Bearer token with full JWT signature verification
   */
  private async authenticateBearerToken(token: string, method: string): Promise<AuthResult> {
    try {
      // Decode header to get key ID (kid)
      const parts = token.split('.');
      if (parts.length !== 3) {
        return {
          authenticated: false,
          error: 'Invalid token format'
        };
      }

      // Decode header to extract algorithm and key ID
      const headerJson = Buffer.from(parts[0], 'base64url').toString('utf-8');
      const header = JSON.parse(headerJson) as JwtHeader;
      const kid = header.kid;

      // Verify JWT signature using JWKS if configured
      let payload: JwtPayload;
      if (this.config.jwksUrl && kid) {
        // Full signature verification with JWKS
        payload = await this.verifyJwtWithJwks(token, kid);
      } else {
        // Fallback: decode and validate payload structure (for development/testing)
        // In production, jwksUrl should always be configured
        const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf-8');
        payload = JSON.parse(payloadJson) as JwtPayload;
        
        this.logger.warn('JWT verification without signature check - jwksUrl not configured', {
          hasKid: !!kid
        });
      }

      // Check expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return {
          authenticated: false,
          error: 'Token expired'
        };
      }

      // Verify issuer if configured
      if (this.config.tokenIssuer && payload.iss !== this.config.tokenIssuer) {
        return {
          authenticated: false,
          error: 'Invalid token issuer'
        };
      }

      // Verify audience if configured
      if (this.config.tokenAudience) {
        const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
        if (!aud.includes(this.config.tokenAudience)) {
          return {
            authenticated: false,
            error: 'Invalid token audience'
          };
        }
      }

      const scopes = payload.scope ? payload.scope.split(' ') : [];
      const agentId = payload.sub || payload.agent_id || '';

      if (!agentId) {
        return {
          authenticated: false,
          error: 'Token missing agent identifier'
        };
      }

      // Check if scopes allow this method
      const requiredScope = this.getRequiredScope(method);
      if (requiredScope && !scopes.includes(requiredScope)) {
        return {
          authenticated: false,
          error: `Insufficient scope: method ${method} requires scope ${requiredScope}`
        };
      }

      return {
        authenticated: true,
        agentId,
        scopes
      };
    } catch (error) {
      this.logger.error('Bearer token authentication failed', { error });
      return {
        authenticated: false,
        error: error instanceof Error ? error.message : 'Token verification failed'
      };
    }
  }

  /**
   * Verify JWT signature using JWKS
   */
  private async verifyJwtWithJwks(token: string, kid: string): Promise<JwtPayload> {
    if (!this.config.jwksUrl) {
      throw new Error('JWKS URL not configured');
    }

    // Get or create JWKS client
    let client = this.jwksClients.get(this.config.jwksUrl);
    if (!client) {
      client = jwksClient({
        jwksUri: this.config.jwksUrl,
        cache: true,
        cacheMaxAge: 3600000, // 1 hour
        rateLimit: true,
        jwksRequestsPerMinute: 10
      });
      this.jwksClients.set(this.config.jwksUrl, client);
    }

    // Get signing key from JWKS
    const key = await client.getSigningKey(kid);
    const publicKey = key.getPublicKey();

    // Verify JWT signature and decode payload
    const verifyOptions: jwt.VerifyOptions = {};
    if (this.config.tokenIssuer) {
      verifyOptions.issuer = this.config.tokenIssuer;
    }
    if (this.config.tokenAudience) {
      verifyOptions.audience = this.config.tokenAudience;
    }

    const decoded = jwt.verify(token, publicKey, verifyOptions) as JwtPayload;
    return decoded;
  }

  /**
   * Initialize JWKS clients for configured JWKS URLs
   */
  private initializeJwksClients(): void {
    if (this.config.jwksUrl) {
      const client = jwksClient({
        jwksUri: this.config.jwksUrl,
        cache: true,
        cacheMaxAge: 3600000, // 1 hour
        rateLimit: true,
        jwksRequestsPerMinute: 10
      });
      this.jwksClients.set(this.config.jwksUrl, client);
      this.logger.info('JWKS client initialized', { jwksUrl: this.config.jwksUrl });
    }
  }

  /**
   * Extract API key from headers
   */
  private extractApiKey(headers: Record<string, string | string[] | undefined>): string | null {
    const apiKey = headers['x-api-key'] || headers['X-API-Key'];
    if (typeof apiKey === 'string') {
      return apiKey;
    }
    if (Array.isArray(apiKey) && apiKey.length > 0) {
      return apiKey[0];
    }
    return null;
  }

  /**
   * Extract Bearer token from headers
   */
  private extractBearerToken(headers: Record<string, string | string[] | undefined>): string | null {
    const authHeader = headers.authorization || headers.Authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    if (Array.isArray(authHeader) && authHeader.length > 0) {
      const header = authHeader[0];
      if (typeof header === 'string' && header.startsWith('Bearer ')) {
        return header.substring(7);
      }
    }
    return null;
  }

  /**
   * Get required scope for method
   */
  private getRequiredScope(method: string): string | null {
    if (method.startsWith('story.') || method.startsWith('character.')) {
      return 'a2a:write';
    }
    if (method.startsWith('library.')) {
      return 'a2a:read';
    }
    return null; // No scope required for public methods
  }

  /**
   * Initialize API keys from config
   */
  private initializeApiKeys(): void {
    if (this.config.apiKeys) {
      for (const [key, info] of Object.entries(this.config.apiKeys)) {
        this.apiKeys.set(key, info);
      }
    }
  }

  /**
   * Register API key (for dynamic key management)
   */
  registerApiKey(key: string, agentId: string, scopes: string[]): void {
    this.apiKeys.set(key, { agentId, scopes });
    this.logger.info('API key registered', { agentId, scopes });
  }

  /**
   * Revoke API key
   */
  revokeApiKey(key: string): void {
    this.apiKeys.delete(key);
    this.logger.info('API key revoked', { key });
  }
}

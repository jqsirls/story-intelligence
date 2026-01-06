import { KMS } from 'aws-sdk';
import * as jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import { EventBridge } from '@aws-sdk/client-eventbridge';
import { createClient } from '@supabase/supabase-js';
import { Redis } from 'ioredis';

interface TokenServiceConfig {
  kmsKeyId: string;
  region: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
  redisUrl: string;
  issuer: string;
  audience: string[];
}

interface TokenRequest {
  subject: string; // User ID
  clientId: string;
  scope: string;
  claims?: Record<string, any>;
  expiresIn?: number;
  tokenType: 'access' | 'refresh' | 'id';
}

interface SignedToken {
  token: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: Date;
  issuedAt: Date;
  claims: Record<string, any>;
}

interface JWKSKey {
  kid: string;
  kty: string;
  use: string;
  alg: string;
  n?: string; // RSA modulus
  e?: string; // RSA exponent
  x?: string; // EC x coordinate
  y?: string; // EC y coordinate
  crv?: string; // EC curve
}

export class TokenServiceAgent {
  private kms: KMS;
  private eventBridge: EventBridge;
  private supabase: ReturnType<typeof createClient>;
  private redis: Redis;
  private config: TokenServiceConfig;
  private currentKeyId?: string;
  private keyCache: Map<string, any> = new Map();

  constructor(config: TokenServiceConfig) {
    this.config = config;
    this.kms = new KMS({ region: config.region });
    this.eventBridge = new EventBridge({ region: config.region });
    this.supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
    this.redis = new Redis(config.redisUrl);
  }

  /**
   * Initialize the token service
   */
  async initialize(): Promise<void> {
    console.log('Initializing TokenService Agent...');
    
    // Ensure KMS key exists and is accessible
    await this.validateKMSKey();
    
    // Load or generate signing keys
    await this.ensureSigningKeys();
    
    // Connect to Redis
    await this.redis.ping();
    
    console.log('TokenService Agent initialized successfully');
  }

  /**
   * Generate a signed JWT token
   */
  async generateToken(request: TokenRequest): Promise<SignedToken> {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = request.expiresIn || this.getDefaultExpiry(request.tokenType);
    const expiresAt = new Date((now + expiresIn) * 1000);

    // Build JWT claims
    const claims: Record<string, any> = {
      iss: this.config.issuer,
      sub: request.subject,
      aud: request.clientId,
      exp: now + expiresIn,
      iat: now,
      nbf: now,
      jti: this.generateJTI(),
      ...request.claims
    };

    // Add token type specific claims
    switch (request.tokenType) {
      case 'access':
        claims.token_type = 'Bearer';
        claims.scope = request.scope;
        if (this.config.audience.length > 0) {
          claims.aud = [request.clientId, ...this.config.audience];
        }
        break;
        
      case 'id':
        claims.nonce = request.claims?.nonce;
        claims.auth_time = request.claims?.auth_time || now;
        claims.azp = request.clientId; // Authorized party
        break;
        
      case 'refresh':
        claims.token_type = 'Refresh';
        claims.scope = request.scope;
        break;
    }

    // Sign token with KMS
    const token = await this.signWithKMS(claims);

    // Store token metadata for introspection
    await this.storeTokenMetadata(token, claims, request.tokenType);

    // Emit token generation event
    await this.emitTokenEvent('token_generated', {
      tokenType: request.tokenType,
      subject: request.subject,
      clientId: request.clientId,
      expiresAt
    });

    return {
      token,
      tokenType: request.tokenType,
      expiresIn,
      expiresAt,
      issuedAt: new Date(now * 1000),
      claims
    };
  }

  /**
   * Verify and decode a JWT token
   */
  async verifyToken(token: string, options?: jwt.VerifyOptions): Promise<any> {
    try {
      // Extract header to get key ID
      const decoded = jwt.decode(token, { complete: true }) as any;
      if (!decoded || !decoded.header || !decoded.header.kid) {
        throw new Error('Invalid token format');
      }

      // Get public key for verification
      const publicKey = await this.getPublicKey(decoded.header.kid);

      // Verify token
      const verified = jwt.verify(token, publicKey, {
        issuer: this.config.issuer,
        ...options
      });

      // Check if token is revoked
      const isRevoked = await this.isTokenRevoked(token);
      if (isRevoked) {
        throw new Error('Token has been revoked');
      }

      // Update last used timestamp
      await this.updateTokenUsage(token);

      return verified;
    } catch (error: any) {
      await this.emitTokenEvent('token_verification_failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Introspect a token (RFC 7662)
   */
  async introspectToken(token: string): Promise<{
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
  }> {
    try {
      const decoded = await this.verifyToken(token);
      
      return {
        active: true,
        scope: decoded.scope,
        client_id: Array.isArray(decoded.aud) ? decoded.aud[0] : decoded.aud,
        username: decoded.sub,
        token_type: decoded.token_type || 'Bearer',
        exp: decoded.exp,
        iat: decoded.iat,
        nbf: decoded.nbf,
        sub: decoded.sub,
        aud: decoded.aud,
        iss: decoded.iss,
        jti: decoded.jti
      };
    } catch (error) {
      return { active: false };
    }
  }

  /**
   * Revoke a token
   */
  async revokeToken(token: string, reason?: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    
    // Mark token as revoked in database
    const decoded = jwt.decode(token) as any;
    if (decoded) {
      const { error } = await this.supabase
        .from('oauth_access_tokens')
        .update({
          revoked_at: new Date().toISOString(),
          revoked_by: decoded.sub
        })
        .eq('token_hash', tokenHash);

      if (error) {
        console.error('Failed to revoke token in database:', error);
      }
    }

    // Add to revocation cache
    await this.redis.setex(
      `revoked:${tokenHash}`,
      86400 * 7, // 7 days
      reason || 'user_requested'
    );

    await this.emitTokenEvent('token_revoked', {
      tokenHash,
      reason
    });
  }

  /**
   * Get JWKS (JSON Web Key Set) for public key distribution
   */
  async getJWKS(): Promise<{ keys: JWKSKey[] }> {
    const { data: keys, error } = await this.supabase
      .from('oauth_jwks')
      .select('*')
      .eq('is_active', true)
      .is('revoked_at', null);

    if (error) {
      throw new Error(`Failed to fetch JWKS: ${error.message}`);
    }

    const jwks = keys.map(key => {
      const publicKey = JSON.parse(key.public_key);
      return {
        kid: key.kid,
        kty: key.kty,
        use: key.use,
        alg: key.alg,
        ...publicKey
      };
    });

    return { keys: jwks };
  }

  /**
   * Rotate signing keys
   */
  async rotateKeys(): Promise<void> {
    console.log('Starting key rotation...');

    // Generate new key pair
    const newKeyId = this.generateKeyId();
    const keyPair = await this.generateKeyPair();

    // Encrypt private key with KMS
    const encryptedPrivateKey = await this.encryptWithKMS(keyPair.privateKey);

    // Store new key in database
    const { error } = await this.supabase
      .from('oauth_jwks')
      .insert({
        kid: newKeyId,
        kty: 'RSA',
        use: 'sig',
        alg: 'RS256',
        public_key: JSON.stringify(keyPair.publicKeyJWK),
        private_key_encrypted: encryptedPrivateKey,
        valid_from: new Date().toISOString(),
        valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
        rotated_from_kid: this.currentKeyId
      });

    if (error) {
      throw new Error(`Failed to store new key: ${error.message}`);
    }

    // Mark old key as rotated (but keep for verification of existing tokens)
    if (this.currentKeyId) {
      await this.supabase
        .from('oauth_jwks')
        .update({ is_active: false })
        .eq('kid', this.currentKeyId);
    }

    this.currentKeyId = newKeyId;
    this.keyCache.clear(); // Clear key cache

    await this.emitTokenEvent('keys_rotated', {
      newKeyId,
      oldKeyId: this.currentKeyId
    });

    console.log('Key rotation completed successfully');
  }

  /**
   * Handle EventBridge events
   */
  async handleEvent(event: any): Promise<any> {
    const { type, payload } = event;

    switch (type) {
      case 'GENERATE_TOKEN':
        return await this.generateToken(payload);

      case 'VERIFY_TOKEN':
        return await this.verifyToken(payload.token, payload.options);

      case 'INTROSPECT_TOKEN':
        return await this.introspectToken(payload.token);

      case 'REVOKE_TOKEN':
        await this.revokeToken(payload.token, payload.reason);
        return { success: true };

      case 'ROTATE_KEYS':
        await this.rotateKeys();
        return { success: true };

      case 'GET_JWKS':
        return await this.getJWKS();

      default:
        throw new Error(`Unknown event type: ${type}`);
    }
  }

  // Private helper methods

  private async validateKMSKey(): Promise<void> {
    try {
      const response = await this.kms.describeKey({
        KeyId: this.config.kmsKeyId
      }).promise();

      if (!response.KeyMetadata || response.KeyMetadata.KeyState !== 'Enabled') {
        throw new Error('KMS key is not enabled');
      }

      console.log('KMS key validated successfully');
    } catch (error: any) {
      throw new Error(`KMS key validation failed: ${error.message}`);
    }
  }

  private async ensureSigningKeys(): Promise<void> {
    // Check if we have active keys
    const { data: activeKeys } = await this.supabase
      .from('oauth_jwks')
      .select('kid')
      .eq('is_active', true)
      .is('revoked_at', null)
      .single();

    if (!activeKeys) {
      // No active keys, generate initial key pair
      await this.rotateKeys();
    } else {
      this.currentKeyId = activeKeys.kid;
    }
  }

  private async signWithKMS(claims: Record<string, any>): Promise<string> {
    // For KMS signing, we need to prepare the JWT manually
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: this.currentKeyId
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(claims));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    // Sign with KMS
    const signResponse = await this.kms.sign({
      KeyId: this.config.kmsKeyId,
      Message: Buffer.from(signingInput),
      MessageType: 'RAW',
      SigningAlgorithm: 'RSASSA_PKCS1_V1_5_SHA_256'
    }).promise();

    if (!signResponse.Signature) {
      throw new Error('KMS signing failed');
    }

    const signature = this.base64UrlEncode(signResponse.Signature);
    return `${signingInput}.${signature}`;
  }

  private async getPublicKey(keyId: string): Promise<string> {
    // Check cache
    if (this.keyCache.has(keyId)) {
      return this.keyCache.get(keyId);
    }

    // Fetch from database
    const { data: key, error } = await this.supabase
      .from('oauth_jwks')
      .select('public_key')
      .eq('kid', keyId)
      .single();

    if (error || !key) {
      throw new Error(`Public key not found for kid: ${keyId}`);
    }

    const publicKey = this.jwkToPem(JSON.parse(key.public_key));
    this.keyCache.set(keyId, publicKey);
    
    return publicKey;
  }

  private async generateKeyPair(): Promise<{
    publicKeyJWK: any;
    privateKey: string;
  }> {
    // In production, you might want to use KMS GenerateDataKeyPair
    // For now, we'll use Node.js crypto
    const { generateKeyPairSync } = require('crypto');
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    // Convert public key to JWK format
    const publicKeyJWK = this.pemToJwk(publicKey);

    return { publicKeyJWK, privateKey };
  }

  private async encryptWithKMS(data: string): Promise<string> {
    const response = await this.kms.encrypt({
      KeyId: this.config.kmsKeyId,
      Plaintext: Buffer.from(data)
    }).promise();

    if (!response.CiphertextBlob) {
      throw new Error('KMS encryption failed');
    }

    return response.CiphertextBlob.toString('base64');
  }

  private async decryptWithKMS(encryptedData: string): Promise<string> {
    const response = await this.kms.decrypt({
      CiphertextBlob: Buffer.from(encryptedData, 'base64')
    }).promise();

    if (!response.Plaintext) {
      throw new Error('KMS decryption failed');
    }

    return response.Plaintext.toString();
  }

  private async isTokenRevoked(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    const revoked = await this.redis.get(`revoked:${tokenHash}`);
    return revoked !== null;
  }

  private async storeTokenMetadata(
    token: string,
    claims: Record<string, any>,
    tokenType: string
  ): Promise<void> {
    const tokenHash = this.hashToken(token);
    
    if (tokenType === 'access') {
      await this.supabase
        .from('oauth_access_tokens')
        .insert({
          token_hash: tokenHash,
          client_id: Array.isArray(claims.aud) ? claims.aud[0] : claims.aud,
          user_id: claims.sub,
          scope: claims.scope,
          audience: Array.isArray(claims.aud) ? claims.aud : [claims.aud],
          expires_at: new Date(claims.exp * 1000).toISOString(),
          issued_at: new Date(claims.iat * 1000).toISOString()
        });
    }
  }

  private async updateTokenUsage(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    
    await this.supabase
      .from('oauth_access_tokens')
      .update({
        last_used_at: new Date().toISOString(),
        use_count: this.supabase.sql`use_count + 1`
      })
      .eq('token_hash', tokenHash);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateJTI(): string {
    return randomBytes(16).toString('hex');
  }

  private generateKeyId(): string {
    return `key-${Date.now()}-${randomBytes(8).toString('hex')}`;
  }

  private getDefaultExpiry(tokenType: string): number {
    switch (tokenType) {
      case 'access':
        return 3600; // 1 hour
      case 'refresh':
        return 2592000; // 30 days
      case 'id':
        return 3600; // 1 hour
      default:
        return 3600;
    }
  }

  private base64UrlEncode(data: string | Buffer): string {
    const base64 = Buffer.from(data).toString('base64');
    return base64
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  private jwkToPem(jwk: any): string {
    // Convert JWK to PEM format
    // This is a simplified version - in production use a proper library
    const rsaPublicKey = require('jwk-to-pem');
    return rsaPublicKey(jwk);
  }

  private pemToJwk(pem: string): any {
    // Convert PEM to JWK format
    // This is a simplified version - in production use a proper library
    const pemToJwk = require('pem-jwk').pem2jwk;
    return pemToJwk(pem);
  }

  private async emitTokenEvent(eventType: string, data: any): Promise<void> {
    await this.eventBridge.putEvents({
      Entries: [{
        Source: 'storytailor.token-service',
        DetailType: eventType,
        Detail: JSON.stringify({
          timestamp: new Date().toISOString(),
          ...data
        })
      }]
    });
  }
}
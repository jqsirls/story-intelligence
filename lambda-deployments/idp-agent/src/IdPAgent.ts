import { createClient } from '@supabase/supabase-js';
import { EventBridge } from '@aws-sdk/client-eventbridge';
import { Redis } from 'ioredis';
import { createHash, randomBytes } from 'crypto';

interface IdPConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  redisUrl: string;
  eventBusName: string;
  region: string;
  tokenServiceUrl: string;
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string;
  jwksUri: string;
  registrationEndpoint: string;
}

interface AuthorizationRequest {
  response_type: string;
  client_id: string;
  redirect_uri: string;
  scope: string;
  state?: string;
  nonce?: string;
  prompt?: string;
  display?: string;
  max_age?: number;
  ui_locales?: string;
  id_token_hint?: string;
  login_hint?: string;
  acr_values?: string;
  // PKCE parameters
  code_challenge?: string;
  code_challenge_method?: string;
}

interface TokenRequest {
  grant_type: string;
  code?: string;
  redirect_uri?: string;
  client_id: string;
  client_secret?: string;
  refresh_token?: string;
  scope?: string;
  // PKCE
  code_verifier?: string;
}

interface UserInfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  middle_name?: string;
  nickname?: string;
  preferred_username?: string;
  profile?: string;
  picture?: string;
  website?: string;
  email?: string;
  email_verified?: boolean;
  gender?: string;
  birthdate?: string;
  zoneinfo?: string;
  locale?: string;
  phone_number?: string;
  phone_number_verified?: boolean;
  address?: {
    formatted?: string;
    street_address?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
  updated_at?: number;
  // Custom claims for Storytailor
  character_ids?: string[];
  family_id?: string;
  subscription_tier?: string;
}

export class IdPAgent {
  private supabase: ReturnType<typeof createClient>;
  private eventBridge: EventBridge;
  private redis: Redis;
  private config: IdPConfig;

  constructor(config: IdPConfig) {
    this.config = config;
    this.supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
    this.eventBridge = new EventBridge({ region: config.region });
    this.redis = new Redis(config.redisUrl);
  }

  // Utility guards
  private asString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private asBoolean(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
  }

  private asStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.filter((v) => typeof v === 'string') as string[];
    }
    if (typeof value === 'string') {
      return value.split(' ');
    }
    return [];
  }
  /**
   * OpenID Connect Discovery endpoint
   */
  async getDiscoveryDocument(): Promise<any> {
    return {
      issuer: this.config.issuer,
      authorization_endpoint: this.config.authorizationEndpoint,
      token_endpoint: this.config.tokenEndpoint,
      userinfo_endpoint: this.config.userinfoEndpoint,
      jwks_uri: this.config.jwksUri,
      registration_endpoint: this.config.registrationEndpoint,
      scopes_supported: [
        'openid',
        'profile',
        'email',
        'phone',
        'address',
        'offline_access',
        // Custom scopes
        'storytailor:characters',
        'storytailor:library',
        'storytailor:family'
      ],
      response_types_supported: [
        'code',
        'code id_token',
        'code token',
        'code id_token token'
      ],
      response_modes_supported: ['query', 'fragment'],
      grant_types_supported: [
        'authorization_code',
        'refresh_token',
        'client_credentials'
      ],
      acr_values_supported: ['urn:mace:incommon:iap:silver'],
      subject_types_supported: ['public', 'pairwise'],
      id_token_signing_alg_values_supported: ['RS256'],
      id_token_encryption_alg_values_supported: ['RSA1_5', 'A128KW'],
      id_token_encryption_enc_values_supported: ['A128CBC-HS256', 'A128GCM'],
      userinfo_signing_alg_values_supported: ['RS256'],
      userinfo_encryption_alg_values_supported: ['RSA1_5', 'A128KW'],
      userinfo_encryption_enc_values_supported: ['A128CBC-HS256', 'A128GCM'],
      request_object_signing_alg_values_supported: ['RS256'],
      token_endpoint_auth_methods_supported: [
        'client_secret_basic',
        'client_secret_post',
        'client_secret_jwt',
        'private_key_jwt'
      ],
      display_values_supported: ['page', 'popup'],
      claim_types_supported: ['normal'],
      claims_supported: [
        'sub',
        'name',
        'given_name',
        'family_name',
        'middle_name',
        'nickname',
        'preferred_username',
        'profile',
        'picture',
        'website',
        'email',
        'email_verified',
        'gender',
        'birthdate',
        'zoneinfo',
        'locale',
        'phone_number',
        'phone_number_verified',
        'address',
        'updated_at',
        // Custom claims
        'character_ids',
        'family_id',
        'subscription_tier'
      ],
      service_documentation: 'https://docs.storytailor.ai/oauth',
      claims_locales_supported: ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP'],
      ui_locales_supported: ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP'],
      claims_parameter_supported: true,
      request_parameter_supported: true,
      request_uri_parameter_supported: true,
      require_request_uri_registration: true,
      op_policy_uri: 'https://storytailor.ai/privacy',
      op_tos_uri: 'https://storytailor.ai/terms',
      // PKCE support
      code_challenge_methods_supported: ['plain', 'S256']
    };
  }

  /**
   * Authorization endpoint - initiates OAuth flow
   */
  async authorize(request: AuthorizationRequest, userId?: string): Promise<{
    redirect_uri: string;
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  }> {
    try {
      // Validate client
      const client = await this.validateClient(request.client_id, request.redirect_uri);
      if (!client) {
        return {
          redirect_uri: request.redirect_uri,
          error: 'invalid_client',
          error_description: 'Client authentication failed',
          state: request.state
        };
      }

      // Check if user is authenticated
      if (!userId) {
        // Return error indicating authentication required
        return {
          redirect_uri: request.redirect_uri,
          error: 'login_required',
          error_description: 'User authentication required',
          state: request.state
        };
      }

      // Validate request parameters
      const validationError = await this.validateAuthorizationRequest(request, client);
      if (validationError) {
        return {
          redirect_uri: request.redirect_uri,
          error: validationError.error,
          error_description: validationError.description,
          state: request.state
        };
      }

      // Check user consent
      const hasConsent = await this.checkUserConsent(userId, request.client_id, request.scope);
      if (!hasConsent && request.prompt !== 'consent') {
        return {
          redirect_uri: request.redirect_uri,
          error: 'consent_required',
          error_description: 'User consent required',
          state: request.state
        };
      }

      // Generate authorization code
      const code = await this.generateAuthorizationCode({
        userId,
        clientId: request.client_id,
        redirectUri: request.redirect_uri,
        scope: request.scope,
        nonce: request.nonce,
        codeChallenge: request.code_challenge,
        codeChallengeMethod: request.code_challenge_method
      });

      // Emit authorization event
      await this.emitEvent('authorization_granted', {
        userId,
        clientId: request.client_id,
        scope: request.scope
      });

      return {
        redirect_uri: request.redirect_uri,
        code,
        state: request.state
      };

    } catch (error: any) {
      console.error('Authorization error:', error);
      return {
        redirect_uri: request.redirect_uri,
        error: 'server_error',
        error_description: 'Internal server error',
        state: request.state
      };
    }
  }

  /**
   * Token endpoint - exchanges authorization code for tokens
   */
  async token(request: TokenRequest): Promise<{
    access_token?: string;
    token_type?: string;
    expires_in?: number;
    refresh_token?: string;
    id_token?: string;
    scope?: string;
    error?: string;
    error_description?: string;
  }> {
    try {
      // Validate client authentication
      const client = await this.authenticateClient(request.client_id, request.client_secret);
      if (!client) {
        return {
          error: 'invalid_client',
          error_description: 'Client authentication failed'
        };
      }

      switch (request.grant_type) {
        case 'authorization_code':
          return await this.handleAuthorizationCodeGrant(request, client);
          
        case 'refresh_token':
          return await this.handleRefreshTokenGrant(request, client);
          
        case 'client_credentials':
          return await this.handleClientCredentialsGrant(request, client);
          
        default:
          return {
            error: 'unsupported_grant_type',
            error_description: `Grant type ${request.grant_type} is not supported`
          };
      }

    } catch (error: any) {
      console.error('Token error:', error);
      return {
        error: 'server_error',
        error_description: 'Internal server error'
      };
    }
  }

  /**
   * UserInfo endpoint - returns user profile information
   */
  async getUserInfo(accessToken: string): Promise<UserInfo | { error: string; error_description: string }> {
    try {
      // Verify access token
      const tokenData = await this.verifyAccessToken(accessToken);
      if (!tokenData) {
        return {
          error: 'invalid_token',
          error_description: 'Access token is invalid or expired'
        };
      }

      // Check scope
      if (!tokenData.scope.includes('openid')) {
        return {
          error: 'insufficient_scope',
          error_description: 'Access token does not have required scope'
        };
      }

      // Fetch user information
      const userInfo = await this.fetchUserInfo(tokenData.userId, tokenData.scope);

      // Emit userinfo access event
      await this.emitEvent('userinfo_accessed', {
        userId: tokenData.userId,
        clientId: tokenData.clientId,
        scope: tokenData.scope
      });

      return userInfo;

    } catch (error: any) {
      console.error('UserInfo error:', error);
      return {
        error: 'server_error',
        error_description: 'Internal server error'
      };
    }
  }

  /**
   * Revocation endpoint - revokes tokens
   */
  async revokeToken(token: string, tokenTypeHint?: string): Promise<void> {
    try {
      // Try to revoke as refresh token first
      if (!tokenTypeHint || tokenTypeHint === 'refresh_token') {
        const refreshTokenRevoked = await this.revokeRefreshToken(token);
        if (refreshTokenRevoked) return;
      }

      // Try to revoke as access token
      if (!tokenTypeHint || tokenTypeHint === 'access_token') {
        await this.revokeAccessToken(token);
      }

    } catch (error: any) {
      console.error('Token revocation error:', error);
      // Per spec, don't return errors for revocation
    }
  }

  /**
   * Handle EventBridge events
   */
  async handleEvent(event: any): Promise<any> {
    const { type, payload } = event;

    switch (type) {
      case 'AUTHORIZE':
        return await this.authorize(payload.request, payload.userId);

      case 'TOKEN':
        return await this.token(payload);

      case 'USERINFO':
        return await this.getUserInfo(payload.accessToken);

      case 'REVOKE_TOKEN':
        await this.revokeToken(payload.token, payload.tokenTypeHint);
        return { success: true };

      case 'GET_DISCOVERY':
        return await this.getDiscoveryDocument();

      default:
        throw new Error(`Unknown event type: ${type}`);
    }
  }

  // Private helper methods

  private async validateClient(clientId: string, redirectUri: string): Promise<any> {
    const { data: client, error } = await this.supabase
      .from('oauth_clients')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .single();

    if (error || !client) {
      return null;
    }

    // Validate redirect URI
    const redirectUris: any = (client as any).redirect_uris;
    const redirectList: string[] = Array.isArray(redirectUris)
      ? redirectUris as string[]
      : (redirectUris ? [String(redirectUris)] : []);
    if (!redirectList.includes(redirectUri)) {
      return null;
    }

    return client;
  }

  private async authenticateClient(clientId: string, clientSecret?: string): Promise<any> {
    const { data: client, error } = await this.supabase
      .from('oauth_clients')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .single();

    if (error || !client) {
      return null;
    }

    // Public clients don't need secret
    const clientType = this.asString((client as any).client_type) || 'public';
    if (clientType === 'public') {
      return client;
    }

    // Confidential clients must provide secret
    if (!clientSecret || this.asString((client as any).client_secret) !== clientSecret) {
      return null;
    }

    return client;
  }

  private async validateAuthorizationRequest(
    request: AuthorizationRequest,
    client: any
  ): Promise<{ error: string; description: string } | null> {
    // Validate response type
    const allowedResponseTypes: string[] = Array.isArray((client as any).allowed_response_types)
      ? (client as any).allowed_response_types
      : [];
    if (!allowedResponseTypes.includes(request.response_type)) {
      return {
        error: 'unsupported_response_type',
        description: 'Response type not supported by client'
      };
    }

    // Validate scope
    const requestedScopes = request.scope.split(' ');
    const allowedScopes: string[] = Array.isArray((client as any).allowed_scopes)
      ? (client as any).allowed_scopes
      : [];
    const invalidScopes = requestedScopes.filter(scope => !allowedScopes.includes(scope));
    if (invalidScopes.length > 0) {
      return {
        error: 'invalid_scope',
        description: `Invalid scopes: ${invalidScopes.join(', ')}`
      };
    }

    // Validate PKCE
    if ((client as any).require_pkce && !request.code_challenge) {
      return {
        error: 'invalid_request',
        description: 'PKCE code challenge required'
      };
    }

    const allowedCodeChallengeMethods: string[] = Array.isArray((client as any).allowed_code_challenge_methods)
      ? (client as any).allowed_code_challenge_methods
      : [];
    if (request.code_challenge_method && 
        !allowedCodeChallengeMethods.includes(request.code_challenge_method)) {
      return {
        error: 'invalid_request',
        description: 'Code challenge method not supported'
      };
    }

    return null;
  }

  private async checkUserConsent(
    userId: string,
    clientId: string,
    scope: string
  ): Promise<boolean> {
    const { data: consent } = await this.supabase
      .from('oauth_consent_records')
      .select('*')
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .is('consent_revoked_at', null)
      .single();

    if (!consent) {
      return false;
    }

    // Check if all requested scopes are granted
    const requestedScopes = scope.split(' ');
    const granted: string[] = Array.isArray((consent as any).granted_scopes)
      ? (consent as any).granted_scopes
      : (typeof (consent as any).granted_scopes === 'string'
          ? String((consent as any).granted_scopes).split(' ')
          : []);
    return requestedScopes.every(s => granted.includes(s));
  }

  private async generateAuthorizationCode(params: {
    userId: string;
    clientId: string;
    redirectUri: string;
    scope: string;
    nonce?: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
  }): Promise<string> {
    const code = this.generateSecureCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.supabase
      .from('oauth_authorization_codes')
      .insert({
        code,
        client_id: params.clientId,
        user_id: params.userId,
        redirect_uri: params.redirectUri,
        scope: params.scope,
        nonce: params.nonce,
        code_challenge: params.codeChallenge,
        code_challenge_method: params.codeChallengeMethod,
        expires_at: expiresAt.toISOString()
      });

    // Cache in Redis for fast lookup
    await this.redis.setex(
      `auth_code:${code}`,
      600, // 10 minutes
      JSON.stringify(params)
    );

    return code;
  }

  private async handleAuthorizationCodeGrant(
    request: TokenRequest,
    client: any
  ): Promise<any> {
    if (!request.code || !request.redirect_uri) {
      return {
        error: 'invalid_request',
        error_description: 'Missing required parameters'
      };
    }

    // Retrieve authorization code
    const { data: authCode, error } = await this.supabase
      .from('oauth_authorization_codes')
      .select('*')
      .eq('code', request.code)
      .eq('client_id', request.client_id)
      .is('used_at', null)
      .single();

    if (error || !authCode) {
      return {
        error: 'invalid_grant',
        error_description: 'Invalid authorization code'
      };
    }

    // Check expiration
    const authExpiresAtStr = this.asString((authCode as any).expires_at) || '';
    if (authExpiresAtStr && new Date(authExpiresAtStr) < new Date()) {
      return {
        error: 'invalid_grant',
        error_description: 'Authorization code expired'
      };
    }

    // Validate redirect URI
    const authRedirect = this.asString((authCode as any).redirect_uri) || '';
    if (authRedirect !== request.redirect_uri) {
      return {
        error: 'invalid_grant',
        error_description: 'Redirect URI mismatch'
      };
    }

    // Validate PKCE
    if ((authCode as any).code_challenge) {
      if (!request.code_verifier) {
        return {
          error: 'invalid_request',
          error_description: 'PKCE verifier required'
        };
      }

      const verifierValid = this.validatePKCEVerifier(
        request.code_verifier,
        (authCode as any).code_challenge,
        (authCode as any).code_challenge_method
      );

      if (!verifierValid) {
        return {
          error: 'invalid_grant',
          error_description: 'PKCE verification failed'
        };
      }
    }

    // Mark code as used
    await this.supabase
      .from('oauth_authorization_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('code', request.code);

    // Generate tokens via TokenService
    const scopeStr = this.asString((authCode as any).scope) || '';
    const tokens = await this.generateTokens({
      userId: (authCode as any).user_id,
      clientId: client.client_id,
      scope: scopeStr,
      nonce: this.asString((authCode as any).nonce),
      includeRefreshToken: scopeStr.includes('offline_access')
    });

    return tokens;
  }

  private async handleRefreshTokenGrant(
    request: TokenRequest,
    client: any
  ): Promise<any> {
    if (!request.refresh_token) {
      return {
        error: 'invalid_request',
        error_description: 'Missing refresh token'
      };
    }

    // Verify refresh token via TokenService
    const refreshTokenData = await this.verifyRefreshToken(request.refresh_token);
    if (!refreshTokenData) {
      return {
        error: 'invalid_grant',
        error_description: 'Invalid refresh token'
      };
    }

    // Check client match
    if (refreshTokenData.clientId !== client.client_id) {
      return {
        error: 'invalid_grant',
        error_description: 'Token was issued to a different client'
      };
    }

    // Generate new tokens
    const tokens = await this.generateTokens({
      userId: refreshTokenData.userId,
      clientId: client.client_id,
      scope: request.scope || refreshTokenData.scope,
      includeRefreshToken: true,
      rotateRefreshToken: true,
      oldRefreshToken: request.refresh_token
    });

    return tokens;
  }

  private async handleClientCredentialsGrant(
    request: TokenRequest,
    client: any
  ): Promise<any> {
    // Client credentials grant doesn't involve a user
    const allowedScopesForClient: string[] = Array.isArray((client as any).allowed_scopes)
      ? (client as any).allowed_scopes
      : (this.asString((client as any).allowed_scopes)?.split(' ') || []);

    const tokens = await this.generateTokens({
      userId: client.client_id, // Use client ID as subject
      clientId: client.client_id,
      scope: request.scope || allowedScopesForClient.join(' '),
      includeRefreshToken: false,
      isClientCredentials: true
    });

    return tokens;
  }

  private async generateTokens(params: {
    userId: string;
    clientId: string;
    scope: string;
    nonce?: string;
    includeRefreshToken: boolean;
    rotateRefreshToken?: boolean;
    oldRefreshToken?: string;
    isClientCredentials?: boolean;
  }): Promise<any> {
    // Call TokenService to generate tokens
    await this.eventBridge.putEvents({
      Entries: [{
        Source: 'storytailor.idp',
        DetailType: 'GENERATE_TOKEN',
        Detail: JSON.stringify({
          subject: params.userId,
          clientId: params.clientId,
          scope: params.scope,
          tokenType: 'access',
          claims: params.isClientCredentials ? { client_credentials: true } : {}
        })
      }]
    });

    // For now, return mock tokens - in production, wait for TokenService response
    const response: any = {
      access_token: `mock_access_token_${Date.now()}`,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: params.scope
    };

    // Include refresh token if requested
    if (params.includeRefreshToken) {
      response.refresh_token = `mock_refresh_token_${Date.now()}`;
    }

    // Include ID token for OpenID Connect
    if (params.scope.includes('openid') && !params.isClientCredentials) {
      response.id_token = `mock_id_token_${Date.now()}`;
    }

    return response;
  }

  private async verifyAccessToken(token: string): Promise<any> {
    // In production, call TokenService to verify
    // For now, return mock data
    return {
      userId: 'user-123',
      clientId: 'client-abc',
      scope: 'openid profile email'
    };
  }

  private async verifyRefreshToken(token: string): Promise<any> {
    // In production, call TokenService to verify
    // For now, return mock data
    return {
      userId: 'user-123',
      clientId: 'client-abc',
      scope: 'openid profile email offline_access'
    };
  }

  private async fetchUserInfo(userId: string, scope: string): Promise<UserInfo> {
    // Fetch user data
    const { data: user } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    // Fetch additional claims
    const { data: claims } = await this.supabase
      .from('oauth_id_token_claims')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Build UserInfo based on requested scopes
    const scopes = scope.split(' ');
    const userInfo: UserInfo = {
      sub: userId
    };

    if (scopes.includes('profile')) {
      Object.assign(userInfo, {
        name: user?.name,
        given_name: claims?.given_name,
        family_name: claims?.family_name,
        nickname: claims?.nickname,
        preferred_username: claims?.preferred_username,
        profile: claims?.profile_url,
        picture: claims?.picture_url,
        website: claims?.website,
        gender: claims?.gender,
        birthdate: claims?.birthdate,
        zoneinfo: claims?.zoneinfo,
        locale: claims?.locale,
        updated_at: user?.updated_at
      });
    }

    if (scopes.includes('email')) {
      userInfo.email = this.asString(user?.email) || userInfo.email;
      const emailVerified = (claims as any)?.email_verified;
      userInfo.email_verified = typeof emailVerified === 'boolean' ? emailVerified : userInfo.email_verified;
    }

    if (scopes.includes('phone')) {
      userInfo.phone_number = this.asString((claims as any)?.phone_number) || userInfo.phone_number;
      const phoneVerified = (claims as any)?.phone_number_verified;
      userInfo.phone_number_verified = typeof phoneVerified === 'boolean' ? phoneVerified : userInfo.phone_number_verified;
    }

    if (scopes.includes('address') && (claims as any)?.address_formatted) {
      userInfo.address = {
        formatted: this.asString((claims as any).address_formatted),
        street_address: this.asString((claims as any).address_street),
        locality: this.asString((claims as any).address_locality),
        region: this.asString((claims as any).address_region),
        postal_code: this.asString((claims as any).address_postal_code),
        country: this.asString((claims as any).address_country)
      };
    }

    // Custom Storytailor claims
    if (scopes.includes('storytailor:characters')) {
      userInfo.character_ids = this.asStringArray((claims as any)?.character_ids);
    }

    if (scopes.includes('storytailor:family')) {
      userInfo.family_id = this.asString((claims as any)?.family_id);
    }

    return userInfo;
  }

  private async revokeRefreshToken(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    
    const { data, error } = await this.supabase
      .from('oauth_refresh_tokens')
      .update({
        revoked_at: new Date().toISOString(),
        revocation_reason: 'user_requested'
      })
      .eq('token_hash', tokenHash)
      .is('revoked_at', null);

    const rows: any[] = Array.isArray(data) ? (data as any[]) : [];
    return !error && rows.length > 0;
  }

  private async revokeAccessToken(token: string): Promise<void> {
    // Call TokenService to revoke
    await this.eventBridge.putEvents({
      Entries: [{
        Source: 'storytailor.idp',
        DetailType: 'REVOKE_TOKEN',
        Detail: JSON.stringify({
          token,
          reason: 'user_requested'
        })
      }]
    });
  }

  private validatePKCEVerifier(
    verifier: string,
    challenge: string,
    method: string = 'S256'
  ): boolean {
    if (method === 'plain') {
      return verifier === challenge;
    }

    if (method === 'S256') {
      const hash = createHash('sha256').update(verifier).digest('base64url');
      return hash === challenge;
    }

    return false;
  }

  private generateSecureCode(length: number = 32): string {
    return randomBytes(length).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async emitEvent(eventType: string, data: any): Promise<void> {
    await this.eventBridge.putEvents({
      Entries: [{
        Source: 'storytailor.idp',
        DetailType: eventType,
        Detail: JSON.stringify({
          timestamp: new Date().toISOString(),
          ...data
        })
      }]
    });
  }
}
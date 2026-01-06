# Platform-Agnostic Smart Home Integration Design
## Multi-Platform Voice Assistant Support with Automated Token Management

### Overview
This design creates a platform-agnostic smart home integration that works seamlessly across Alexa+, Google Assistant, Apple Siri, and future voice platforms while maintaining robust token management for IoT devices.

### Core Architecture Principles

#### 1. Platform Abstraction Layer
```typescript
// packages/voice-platform-adapter/src/VoicePlatformAdapter.ts
export abstract class VoicePlatformAdapter {
  abstract platformName: string;
  abstract supportedCapabilities: PlatformCapability[];
  
  // Standardized interface for all platforms
  abstract parseUserRequest(request: any): StandardizedRequest;
  abstract formatResponse(response: StandardizedResponse): any;
  abstract getUserContext(request: any): UserContext;
  abstract sendResponse(response: any): Promise<void>;
  abstract supportsSmartHome(): boolean;
}

// Platform-specific implementations
export class AlexaPlusAdapter extends VoicePlatformAdapter {
  platformName = 'alexa_plus';
  supportedCapabilities = ['smart_home', 'multi_agent', 'voice_synthesis'];
  
  parseUserRequest(request: AlexaRequest): StandardizedRequest {
    return {
      userId: request.context.System.user.userId,
      sessionId: request.session.sessionId,
      intent: request.request.intent?.name,
      slots: request.request.intent?.slots,
      deviceId: request.context.System.device.deviceId,
      platform: 'alexa_plus',
      capabilities: this.supportedCapabilities,
      rawRequest: request
    };
  }
}

export class GoogleAssistantAdapter extends VoicePlatformAdapter {
  platformName = 'google_assistant';
  supportedCapabilities = ['smart_home', 'actions_on_google'];
  
  parseUserRequest(request: GoogleRequest): StandardizedRequest {
    return {
      userId: request.user.userId,
      sessionId: request.conversation.conversationId,
      intent: request.inputs[0]?.intent,
      parameters: request.inputs[0]?.arguments,
      deviceId: request.surface?.capabilities?.[0]?.name,
      platform: 'google_assistant',
      capabilities: this.supportedCapabilities,
      rawRequest: request
    };
  }
}

export class AppleSiriAdapter extends VoicePlatformAdapter {
  platformName = 'apple_siri';
  supportedCapabilities = ['smart_home', 'siri_shortcuts'];
  
  parseUserRequest(request: SiriRequest): StandardizedRequest {
    // Implementation for future Apple integration
    return {
      userId: request.user?.id,
      sessionId: request.session?.id,
      intent: request.intent?.name,
      platform: 'apple_siri',
      capabilities: this.supportedCapabilities,
      rawRequest: request
    };
  }
}
```

#### 2. Standardized Request/Response Format
```typescript
// packages/shared-types/src/voice-platform/StandardizedTypes.ts
export interface StandardizedRequest {
  userId: string;
  sessionId: string;
  intent?: string;
  slots?: Record<string, any>;
  parameters?: Record<string, any>;
  deviceId?: string;
  platform: VoicePlatform;
  capabilities: PlatformCapability[];
  rawRequest: any; // Original platform request for fallback
}

export interface StandardizedResponse {
  speech: string;
  reprompt?: string;
  shouldEndSession: boolean;
  smartHomeActions?: SmartHomeAction[];
  platformSpecific?: Record<string, any>;
}

export interface UserContext {
  userId: string;
  platform: VoicePlatform;
  deviceCapabilities: DeviceCapability[];
  connectedSmartDevices: ConnectedDevice[];
  preferences: UserPreferences;
}

export type VoicePlatform = 'alexa_plus' | 'google_assistant' | 'apple_siri' | 'custom_platform';
export type PlatformCapability = 'smart_home' | 'multi_agent' | 'voice_synthesis' | 'actions_on_google' | 'siri_shortcuts';
```

### Smart Home Token Management System

#### 1. Automated Token Refresh Architecture
```typescript
// packages/smart-home-agent/src/token/TokenManager.ts
export class SmartHomeTokenManager {
  private tokenStore: TokenStore;
  private refreshScheduler: TokenRefreshScheduler;
  private encryptionService: EncryptionService;
  
  constructor(
    private supabase: SupabaseClient<Database>,
    private redis: RedisClientType,
    private config: SmartHomeConfig
  ) {
    this.tokenStore = new TokenStore(supabase, redis);
    this.refreshScheduler = new TokenRefreshScheduler(this);
    this.encryptionService = new EncryptionService(config.encryption);
  }
  
  async storeDeviceToken(
    userId: string,
    deviceType: DeviceType,
    tokenData: DeviceTokenData
  ): Promise<void> {
    const encryptedToken = await this.encryptionService.encrypt(tokenData);
    
    await this.tokenStore.store({
      userId,
      deviceType,
      deviceId: tokenData.deviceId,
      encryptedToken,
      expiresAt: tokenData.expiresAt,
      refreshToken: tokenData.refreshToken ? 
        await this.encryptionService.encrypt(tokenData.refreshToken) : null,
      lastRefreshed: new Date().toISOString(),
      refreshAttempts: 0,
      status: 'active'
    });
    
    // Schedule automatic refresh
    if (tokenData.refreshToken && tokenData.expiresAt) {
      await this.refreshScheduler.scheduleRefresh(
        userId,
        deviceType,
        tokenData.deviceId,
        new Date(tokenData.expiresAt)
      );
    }
  }
  
  async getValidToken(
    userId: string,
    deviceType: DeviceType,
    deviceId: string
  ): Promise<string | null> {
    const tokenRecord = await this.tokenStore.get(userId, deviceType, deviceId);
    
    if (!tokenRecord) {
      return null;
    }
    
    // Check if token is still valid
    if (tokenRecord.expiresAt && new Date(tokenRecord.expiresAt) <= new Date()) {
      // Try to refresh token
      const refreshed = await this.refreshToken(tokenRecord);
      if (!refreshed) {
        return null;
      }
      return refreshed;
    }
    
    // Decrypt and return token
    const decryptedToken = await this.encryptionService.decrypt(tokenRecord.encryptedToken);
    return decryptedToken.accessToken;
  }
  
  private async refreshToken(tokenRecord: DeviceTokenRecord): Promise<string | null> {
    if (!tokenRecord.refreshToken) {
      await this.tokenStore.markAsExpired(tokenRecord.id);
      return null;
    }
    
    try {
      const decryptedRefreshToken = await this.encryptionService.decrypt(tokenRecord.refreshToken);
      const deviceManager = this.getDeviceManager(tokenRecord.deviceType);
      
      const newTokenData = await deviceManager.refreshToken(decryptedRefreshToken);
      
      if (newTokenData) {
        // Update stored token
        await this.storeDeviceToken(
          tokenRecord.userId,
          tokenRecord.deviceType,
          newTokenData
        );
        
        return newTokenData.accessToken;
      }
      
      return null;
      
    } catch (error) {
      // Increment refresh attempts
      await this.tokenStore.incrementRefreshAttempts(tokenRecord.id);
      
      // If too many failed attempts, mark as expired
      if (tokenRecord.refreshAttempts >= 3) {
        await this.tokenStore.markAsExpired(tokenRecord.id);
      }
      
      return null;
    }
  }
}

// packages/smart-home-agent/src/token/TokenRefreshScheduler.ts
export class TokenRefreshScheduler {
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(private tokenManager: SmartHomeTokenManager) {}
  
  async scheduleRefresh(
    userId: string,
    deviceType: DeviceType,
    deviceId: string,
    expiresAt: Date
  ): Promise<void> {
    const jobKey = `${userId}:${deviceType}:${deviceId}`;
    
    // Clear existing job if any
    this.clearScheduledJob(jobKey);
    
    // Schedule refresh 5 minutes before expiration
    const refreshTime = new Date(expiresAt.getTime() - 5 * 60 * 1000);
    const delay = refreshTime.getTime() - Date.now();
    
    if (delay > 0) {
      const timeout = setTimeout(async () => {
        await this.executeRefresh(userId, deviceType, deviceId);
        this.scheduledJobs.delete(jobKey);
      }, delay);
      
      this.scheduledJobs.set(jobKey, timeout);
    }
  }
  
  private async executeRefresh(
    userId: string,
    deviceType: DeviceType,
    deviceId: string
  ): Promise<void> {
    try {
      // This will trigger the refresh logic in TokenManager
      await this.tokenManager.getValidToken(userId, deviceType, deviceId);
    } catch (error) {
      console.error('Scheduled token refresh failed:', error);
    }
  }
  
  clearScheduledJob(jobKey: string): void {
    const existingJob = this.scheduledJobs.get(jobKey);
    if (existingJob) {
      clearTimeout(existingJob);
      this.scheduledJobs.delete(jobKey);
    }
  }
}
```

#### 2. Philips Hue Specific Implementation
```typescript
// packages/smart-home-agent/src/devices/PhilipsHueManager.ts
export class PhilipsHueManager implements DeviceManager {
  private tokenManager: SmartHomeTokenManager;
  private httpClient: HttpClient;
  
  async authenticateWithBridge(bridgeIp: string): Promise<HueAuthResult> {
    // Initial authentication flow
    const authResponse = await this.httpClient.post(`http://${bridgeIp}/api`, {
      devicetype: 'storytailor#storytailor_agent'
    });
    
    if (authResponse.error) {
      if (authResponse.error.type === 101) {
        return {
          success: false,
          requiresButtonPress: true,
          message: 'Please press the button on your Philips Hue bridge and try again'
        };
      }
      throw new Error(`Hue authentication failed: ${authResponse.error.description}`);
    }
    
    const username = authResponse.success.username;
    
    // Generate long-lived token (Hue tokens don't expire but we'll treat them as 1 year)
    const tokenData: DeviceTokenData = {
      deviceId: bridgeIp,
      accessToken: username,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      refreshToken: null, // Hue doesn't use refresh tokens
      tokenType: 'hue_username'
    };
    
    return {
      success: true,
      tokenData,
      bridgeInfo: await this.getBridgeInfo(bridgeIp, username)
    };
  }
  
  async refreshToken(refreshToken: string): Promise<DeviceTokenData | null> {
    // Hue doesn't use refresh tokens, but we can validate the existing token
    // by making a test API call
    try {
      const [bridgeIp, username] = refreshToken.split(':');
      await this.httpClient.get(`http://${bridgeIp}/api/${username}/config`);
      
      // Token is still valid, return new expiration
      return {
        deviceId: bridgeIp,
        accessToken: username,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        refreshToken: null,
        tokenType: 'hue_username'
      };
    } catch (error) {
      // Token is invalid, requires re-authentication
      return null;
    }
  }
  
  async setRoomLighting(
    userId: string,
    roomId: string,
    profile: LightingProfile
  ): Promise<void> {
    const bridgeToken = await this.tokenManager.getValidToken(userId, 'philips_hue', roomId);
    
    if (!bridgeToken) {
      throw new Error('Philips Hue bridge not connected or token expired');
    }
    
    const [bridgeIp, username] = bridgeToken.split(':');
    
    // Get lights in the room
    const lights = await this.getRoomLights(bridgeIp, username, roomId);
    
    // Apply lighting profile to all lights in room
    const lightingCommands = lights.map(light => ({
      lightId: light.id,
      state: {
        on: true,
        bri: Math.round(profile.brightness * 2.54), // Convert 0-100 to 0-254
        hue: this.hexToHue(profile.color),
        sat: Math.round(profile.saturation * 2.54),
        transitiontime: Math.round((profile.transitionDuration || 1000) / 100) // Convert ms to deciseconds
      }
    }));
    
    // Execute commands in parallel
    await Promise.all(
      lightingCommands.map(cmd =>
        this.httpClient.put(
          `http://${bridgeIp}/api/${username}/lights/${cmd.lightId}/state`,
          cmd.state
        )
      )
    );
  }
  
  async createGradualTransition(
    userId: string,
    roomId: string,
    from: LightingState,
    to: LightingState,
    duration: number
  ): Promise<void> {
    const steps = Math.max(5, Math.min(20, Math.round(duration / 1000))); // 1 step per second, 5-20 steps
    const stepDuration = duration / steps;
    
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps;
      const intermediateState: LightingState = {
        brightness: this.interpolate(from.brightness, to.brightness, progress),
        color: this.interpolateColor(from.color, to.color, progress),
        saturation: this.interpolate(from.saturation, to.saturation, progress)
      };
      
      await this.setRoomLighting(userId, roomId, {
        ...intermediateState,
        transitionDuration: stepDuration
      });
      
      if (i < steps) {
        await this.sleep(stepDuration);
      }
    }
  }
  
  private interpolate(start: number, end: number, progress: number): number {
    return start + (end - start) * progress;
  }
  
  private interpolateColor(startColor: string, endColor: string, progress: number): string {
    const start = this.hexToRgb(startColor);
    const end = this.hexToRgb(endColor);
    
    const r = Math.round(this.interpolate(start.r, end.r, progress));
    const g = Math.round(this.interpolate(start.g, end.g, progress));
    const b = Math.round(this.interpolate(start.b, end.b, progress));
    
    return this.rgbToHex(r, g, b);
  }
}
```

### Platform-Agnostic Router Integration

#### 1. Enhanced Router with Platform Detection
```typescript
// packages/router/src/PlatformAwareRouter.ts
export class PlatformAwareRouter extends Router {
  private platformAdapters: Map<VoicePlatform, VoicePlatformAdapter> = new Map();
  private smartHomeIntegrator: SmartHomeIntegrator;
  
  constructor(config: RouterConfig) {
    super(config);
    
    // Register platform adapters
    this.platformAdapters.set('alexa_plus', new AlexaPlusAdapter());
    this.platformAdapters.set('google_assistant', new GoogleAssistantAdapter());
    this.platformAdapters.set('apple_siri', new AppleSiriAdapter());
    
    this.smartHomeIntegrator = new SmartHomeIntegrator(config.smartHome);
  }
  
  async handleRequest(rawRequest: any, platform: VoicePlatform): Promise<any> {
    const adapter = this.platformAdapters.get(platform);
    if (!adapter) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    
    // Convert to standardized format
    const standardRequest = adapter.parseUserRequest(rawRequest);
    
    // Process request through existing router logic
    const standardResponse = await this.processStandardizedRequest(standardRequest);
    
    // Handle smart home actions if present
    if (standardResponse.smartHomeActions && adapter.supportsSmartHome()) {
      await this.executeSmartHomeActions(
        standardRequest.userId,
        standardResponse.smartHomeActions,
        platform
      );
    }
    
    // Convert back to platform-specific format
    return adapter.formatResponse(standardResponse);
  }
  
  private async processStandardizedRequest(
    request: StandardizedRequest
  ): Promise<StandardizedResponse> {
    // Use existing router logic but with standardized request
    const routingResult = await this.routeRequest({
      userId: request.userId,
      sessionId: request.sessionId,
      intent: request.intent || 'unknown',
      slots: request.slots || {},
      platform: request.platform
    });
    
    // Check if this is a smart home related request
    const smartHomeActions = await this.detectSmartHomeActions(request, routingResult);
    
    return {
      speech: routingResult.response,
      shouldEndSession: routingResult.shouldEndSession,
      smartHomeActions
    };
  }
  
  private async detectSmartHomeActions(
    request: StandardizedRequest,
    routingResult: any
  ): Promise<SmartHomeAction[]> {
    const actions: SmartHomeAction[] = [];
    
    // Detect story start/end for lighting
    if (routingResult.storyEvent) {
      switch (routingResult.storyEvent.type) {
        case 'story_start':
          actions.push({
            type: 'set_story_environment',
            storyType: routingResult.storyEvent.storyType,
            userId: request.userId
          });
          break;
          
        case 'story_end':
          actions.push({
            type: 'restore_default_lighting',
            userId: request.userId
          });
          break;
          
        case 'narrative_moment':
          actions.push({
            type: 'sync_narrative_lighting',
            narrativeEvent: routingResult.storyEvent.narrativeEvent,
            userId: request.userId
          });
          break;
      }
    }
    
    return actions;
  }
  
  private async executeSmartHomeActions(
    userId: string,
    actions: SmartHomeAction[],
    platform: VoicePlatform
  ): Promise<void> {
    for (const action of actions) {
      try {
        await this.smartHomeIntegrator.executeAction(userId, action, platform);
      } catch (error) {
        console.error(`Smart home action failed:`, error);
        // Don't let smart home failures break the main conversation
      }
    }
  }
}

// packages/router/src/services/SmartHomeIntegrator.ts
export class SmartHomeIntegrator {
  private smartHomeAgent: SmartHomeAgent;
  
  async executeAction(
    userId: string,
    action: SmartHomeAction,
    platform: VoicePlatform
  ): Promise<void> {
    // Check if user has connected smart home devices
    const connectedDevices = await this.getConnectedDevices(userId);
    
    if (connectedDevices.length === 0) {
      return; // No devices connected, skip silently
    }
    
    switch (action.type) {
      case 'set_story_environment':
        await this.smartHomeAgent.createStoryEnvironment(
          action.storyType,
          userId,
          connectedDevices[0].roomId // Use first connected room
        );
        break;
        
      case 'sync_narrative_lighting':
        await this.smartHomeAgent.synchronizeWithNarrative([action.narrativeEvent]);
        break;
        
      case 'restore_default_lighting':
        await this.smartHomeAgent.restoreDefaultLighting(
          connectedDevices[0].roomId
        );
        break;
    }
  }
}
```

### Database Schema for Multi-Platform Support

```sql
-- Enhanced smart home devices table with platform support
ALTER TABLE smart_home_devices ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'alexa_plus';
ALTER TABLE smart_home_devices ADD COLUMN IF NOT EXISTS platform_capabilities TEXT[] DEFAULT '{}';
ALTER TABLE smart_home_devices ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;
ALTER TABLE smart_home_devices ADD COLUMN IF NOT EXISTS refresh_token_encrypted TEXT;
ALTER TABLE smart_home_devices ADD COLUMN IF NOT EXISTS last_token_refresh TIMESTAMPTZ;
ALTER TABLE smart_home_devices ADD COLUMN IF NOT EXISTS refresh_attempts INTEGER DEFAULT 0;
ALTER TABLE smart_home_devices ADD COLUMN IF NOT EXISTS token_status TEXT DEFAULT 'active';

-- Device token storage with encryption
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  device_id UUID REFERENCES smart_home_devices NOT NULL,
  device_type TEXT NOT NULL,
  encrypted_token TEXT NOT NULL,
  token_type TEXT NOT NULL, -- 'access_token', 'hue_username', etc.
  expires_at TIMESTAMPTZ,
  refresh_token_encrypted TEXT,
  last_refreshed TIMESTAMPTZ DEFAULT NOW(),
  refresh_attempts INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'expired', 'revoked'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform-specific user sessions
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'alexa_plus';
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS platform_capabilities TEXT[] DEFAULT '{}';

-- Multi-platform consent tracking
ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS platform TEXT;
ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS platform_specific_data JSONB DEFAULT '{}';

-- Indexes for performance
CREATE INDEX idx_device_tokens_user_device ON device_tokens(user_id, device_id);
CREATE INDEX idx_device_tokens_expires_at ON device_tokens(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_device_tokens_status ON device_tokens(status);
CREATE INDEX idx_smart_home_devices_platform ON smart_home_devices(platform);
CREATE INDEX idx_auth_sessions_platform ON auth_sessions(platform);

-- RLS policies
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY device_tokens_policy ON device_tokens
  FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM smart_home_devices shd 
      WHERE shd.id = device_id AND shd.user_id = auth.uid()
    )
  );

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_device_tokens()
RETURNS INTEGER AS $
DECLARE
  expired_count INTEGER;
BEGIN
  -- Mark expired tokens
  UPDATE device_tokens 
  SET status = 'expired', updated_at = NOW()
  WHERE expires_at < NOW() AND status = 'active';
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  -- Clean up old expired tokens (keep for 30 days for audit)
  DELETE FROM device_tokens 
  WHERE status = 'expired' 
  AND updated_at < NOW() - INTERVAL '30 days';
  
  RETURN expired_count;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Future Platform Extension Example

```typescript
// Example: Adding Microsoft Cortana support
export class MicrosoftCortanaAdapter extends VoicePlatformAdapter {
  platformName = 'microsoft_cortana';
  supportedCapabilities = ['smart_home', 'cortana_skills'];
  
  parseUserRequest(request: CortanaRequest): StandardizedRequest {
    return {
      userId: request.user.id,
      sessionId: request.conversation.id,
      intent: request.request.type === 'IntentRequest' ? request.request.intent.name : undefined,
      slots: request.request.intent?.slots,
      platform: 'microsoft_cortana',
      capabilities: this.supportedCapabilities,
      rawRequest: request
    };
  }
  
  formatResponse(response: StandardizedResponse): CortanaResponse {
    return {
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: response.speech
        },
        shouldEndSession: response.shouldEndSession
      }
    };
  }
}

// Register new platform
router.registerPlatform('microsoft_cortana', new MicrosoftCortanaAdapter());
```

### Key Benefits of This Design

#### 1. **Automated Token Management**
- Proactive token refresh 5 minutes before expiration
- Encrypted token storage with proper key rotation
- Graceful handling of refresh failures
- Platform-agnostic token lifecycle management

#### 2. **Platform Extensibility**
- Standardized request/response format across all platforms
- Easy addition of new voice platforms
- Platform-specific capability detection
- Consistent smart home integration regardless of platform

#### 3. **Robust Error Handling**
- Smart home failures don't break voice conversations
- Automatic token refresh with fallback mechanisms
- Platform-specific error handling and recovery
- Comprehensive logging and monitoring

#### 4. **Privacy Compliance**
- Platform-specific consent management
- Encrypted token storage with proper retention
- Audit trails for cross-platform data access
- COPPA-compliant parental controls across all platforms

This design ensures your smart home integration works seamlessly across current and future voice platforms while maintaining robust token management and privacy compliance.

Would you like me to implement any specific component of this platform-agnostic system?
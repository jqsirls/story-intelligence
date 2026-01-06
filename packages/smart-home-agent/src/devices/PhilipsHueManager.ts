import axios, { AxiosInstance } from 'axios';
import { 
  DeviceManager,
  DeviceType,
  DeviceTokenData,
  LightingProfile,
  LightingState,
  HueDevice,
  HueBridgeAuth,
  HueAuthResult,
  HueBridgeInfo
} from '@alexa-multi-agent/shared-types';

import { SmartHomeTokenManager } from '../token/TokenManager';
import { SmartHomeAgentConfig } from '../types';
import { Logger } from 'winston';

export class PhilipsHueManager implements DeviceManager {
  deviceType: DeviceType = 'philips_hue';
  private httpClient: AxiosInstance;
  private logger: Logger;
  private discoveredBridges: Map<string, HueBridgeInfo> = new Map();

  constructor(
    private tokenManager: SmartHomeTokenManager,
    private config: SmartHomeAgentConfig
  ) {
    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.logger = require('winston').createLogger({
      level: this.config.logging.level,
      format: require('winston').format.combine(
        require('winston').format.timestamp(),
        require('winston').format.json()
      ),
      defaultMeta: { service: 'philips-hue-manager' },
      transports: [new (require('winston').transports.Console)()]
    });
  }

  /**
   * Discover Philips Hue bridges on the network
   */
  async discoverDevices(): Promise<HueBridgeInfo[]> {
    try {
      this.logger.info('Discovering Philips Hue bridges');

      // Method 1: Use Philips discovery service
      const discoveryResponse = await this.httpClient.get(
        'https://discovery.meethue.com/',
        { timeout: this.config.devices.philipsHue.discoveryTimeout }
      );

      const bridges: HueBridgeInfo[] = [];

      if (discoveryResponse.data && Array.isArray(discoveryResponse.data)) {
        for (const bridge of discoveryResponse.data) {
          if (bridge.internalipaddress) {
            try {
              // Verify bridge is accessible and get info
              const bridgeInfo = await this.getBridgeInfo(bridge.internalipaddress);
              if (bridgeInfo) {
                bridges.push(bridgeInfo);
                this.discoveredBridges.set(bridge.internalipaddress, bridgeInfo);
              }
            } catch (error) {
              this.logger.warn('Failed to get bridge info', {
                ip: bridge.internalipaddress,
                error: error instanceof Error ? error.message : String(error)
              });
            }
          }
        }
      }

      this.logger.info('Bridge discovery completed', {
        bridgesFound: bridges.length
      });

      return bridges;

    } catch (error) {
      this.logger.error('Bridge discovery failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Fallback: try common IP ranges (simplified implementation)
      return this.fallbackDiscovery();
    }
  }

  /**
   * Authenticate with a Philips Hue bridge
   */
  async authenticateDevice(config: { deviceId: string; roomId: string }): Promise<DeviceTokenData> {
    const bridgeIp = config.deviceId;
    
    try {
      this.logger.info('Authenticating with Hue bridge', { bridgeIp });

      const authResult = await this.authenticateWithBridge(bridgeIp);
      
      if (!authResult.success) {
        throw new Error(authResult.message || 'Authentication failed');
      }

      if (!authResult.tokenData) {
        throw new Error('No token data returned from authentication');
      }

      this.logger.info('Hue bridge authentication successful', {
        bridgeIp,
        username: authResult.tokenData.accessToken.substring(0, 8) + '...'
      });

      return authResult.tokenData;

    } catch (error) {
      this.logger.error('Hue bridge authentication failed', {
        error: error instanceof Error ? error.message : String(error),
        bridgeIp
      });
      throw error;
    }
  }

  /**
   * Refresh token (Hue doesn't use refresh tokens, but we validate existing ones)
   */
  async refreshToken(refreshToken: string): Promise<DeviceTokenData | null> {
    try {
      // Hue doesn't use refresh tokens, but we can validate the existing token
      // by making a test API call
      const [bridgeIp, username] = refreshToken.split(':');
      
      if (!bridgeIp || !username) {
        return null;
      }

      // Test the token by getting bridge config
      await this.httpClient.get(`http://${bridgeIp}/api/${username}/config`);
      
      // Token is still valid, return new expiration (1 year from now)
      return {
        deviceId: bridgeIp,
        accessToken: `${bridgeIp}:${username}`,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        refreshToken: undefined,
        tokenType: 'hue_username'
      };

    } catch (error) {
      this.logger.warn('Hue token validation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Token is invalid, requires re-authentication
      return null;
    }
  }

  /**
   * Set room lighting based on profile
   */
  async setRoomLighting(userId: string, roomId: string, profile: LightingProfile): Promise<void> {
    try {
      this.logger.info('Setting room lighting', {
        userId,
        roomId,
        brightness: profile.brightness,
        color: profile.color
      });

      // Get valid token for the bridge
      const bridgeToken = await this.tokenManager.getValidToken(userId, 'philips_hue', roomId);
      
      if (!bridgeToken) {
        throw new Error('No valid Hue bridge token found');
      }

      const [bridgeIp, username] = bridgeToken.split(':');
      
      if (!bridgeIp || !username) {
        throw new Error('Invalid Hue bridge token format');
      }

      // Get lights in the room
      const lights = await this.getRoomLights(userId, roomId);
      
      if (lights.length === 0) {
        this.logger.warn('No lights found in room', { userId, roomId });
        return;
      }

      // Convert profile to Hue format
      const hueState = this.convertToHueState(profile);

      // Apply lighting to all lights in room
      const lightingPromises = lights.map(light =>
        this.setLightState(bridgeIp, username, light.id, hueState)
      );

      await Promise.all(lightingPromises);

      this.logger.info('Room lighting applied successfully', {
        userId,
        roomId,
        lightsAffected: lights.length
      });

    } catch (error) {
      this.logger.error('Failed to set room lighting', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        roomId
      });
      throw error;
    }
  }

  /**
   * Create gradual lighting transition
   */
  async createGradualTransition(
    userId: string,
    roomId: string,
    from: LightingState,
    to: LightingState,
    duration: number
  ): Promise<void> {
    try {
      this.logger.info('Creating gradual lighting transition', {
        userId,
        roomId,
        duration
      });

      const steps = Math.max(5, Math.min(20, Math.round(duration / 1000))); // 1 step per second, 5-20 steps
      const stepDuration = duration / steps;

      for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        const intermediateState: LightingState = {
          brightness: this.interpolate(from.brightness, to.brightness, progress),
          color: this.interpolateColor(from.color, to.color, progress),
          saturation: this.interpolate(from.saturation, to.saturation, progress)
        };

        const profile: LightingProfile = {
          ...intermediateState,
          transitionDuration: stepDuration
        };

        await this.setRoomLighting(userId, roomId, profile);

        if (i < steps) {
          await this.sleep(stepDuration);
        }
      }

      this.logger.info('Gradual lighting transition completed', {
        userId,
        roomId,
        steps,
        duration
      });

    } catch (error) {
      this.logger.error('Gradual lighting transition failed', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        roomId
      });
      throw error;
    }
  }

  /**
   * Get lights in a room
   */
  async getRoomLights(userId: string, roomId: string): Promise<HueDevice[]> {
    try {
      // Get bridge token
      const bridgeToken = await this.tokenManager.getValidToken(userId, 'philips_hue', roomId);
      
      if (!bridgeToken) {
        throw new Error('No valid Hue bridge token found');
      }

      const [bridgeIp, username] = bridgeToken.split(':');

      // Get all lights from bridge
      const response = await this.httpClient.get(`http://${bridgeIp}/api/${username}/lights`);
      
      const lights: HueDevice[] = [];
      
      if (response.data) {
        for (const [lightId, lightData] of Object.entries(response.data)) {
          const light = lightData as any;
          
          // For simplicity, assume all lights are in the requested room
          // In a real implementation, you'd filter by room/group
          lights.push({
            id: lightId,
            name: light.name || `Light ${lightId}`,
            type: light.type || 'light',
            state: {
              on: light.state.on || false,
              bri: light.state.bri || 0,
              hue: light.state.hue || 0,
              sat: light.state.sat || 0,
              reachable: light.state.reachable !== false
            },
            capabilities: light.capabilities?.control ? Object.keys(light.capabilities.control) : []
          });
        }
      }

      return lights;

    } catch (error) {
      this.logger.error('Failed to get room lights', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        roomId
      });
      return [];
    }
  }

  /**
   * Test connection to device
   */
  async testConnection(userId: string, deviceId: string): Promise<boolean> {
    try {
      const bridgeToken = await this.tokenManager.getValidToken(userId, 'philips_hue', deviceId);
      
      if (!bridgeToken) {
        return false;
      }

      const [bridgeIp, username] = bridgeToken.split(':');
      
      // Test connection by getting bridge config
      await this.httpClient.get(`http://${bridgeIp}/api/${username}/config`);
      
      return true;

    } catch (error) {
      this.logger.warn('Hue bridge connection test failed', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        deviceId
      });
      return false;
    }
  }

  /**
   * Disconnect device
   */
  async disconnectDevice(userId: string, deviceId: string): Promise<void> {
    try {
      this.logger.info('Disconnecting Hue bridge', { userId, deviceId });

      // Revoke tokens
      await this.tokenManager.revokeDeviceTokens(userId, 'philips_hue', deviceId);

      // Remove from discovered bridges cache
      this.discoveredBridges.delete(deviceId);

      this.logger.info('Hue bridge disconnected successfully', { userId, deviceId });

    } catch (error) {
      this.logger.error('Failed to disconnect Hue bridge', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        deviceId
      });
      throw error;
    }
  }

  // Private helper methods

  private async authenticateWithBridge(bridgeIp: string): Promise<HueAuthResult> {
    try {
      // Attempt to create a new user on the bridge
      const authResponse = await this.httpClient.post(`http://${bridgeIp}/api`, {
        devicetype: 'storytailor#storytailor_agent'
      });

      if (authResponse.data && authResponse.data[0]) {
        const result = authResponse.data[0];
        
        if (result.error) {
          if (result.error.type === 101) {
            return {
              success: false,
              requiresButtonPress: true,
              message: 'Please press the button on your Philips Hue bridge and try again'
            };
          }
          throw new Error(`Hue authentication failed: ${result.error.description}`);
        }

        if (result.success && result.success.username) {
          const username = result.success.username;
          
          // Get bridge info
          const bridgeInfo = await this.getBridgeInfo(bridgeIp, username);
          
          // Create token data
          const tokenData: DeviceTokenData = {
            deviceId: bridgeIp,
            accessToken: `${bridgeIp}:${username}`,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
            refreshToken: `${bridgeIp}:${username}`, // Use same for validation
            tokenType: 'hue_username'
          };

          return {
            success: true,
            tokenData,
            bridgeInfo: bridgeInfo || undefined
          };
        }
      }

      throw new Error('Unexpected response from Hue bridge');

    } catch (error) {
      if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
        throw new Error('Cannot connect to Hue bridge. Please check the IP address and network connection.');
      }
      throw error;
    }
  }

  private async getBridgeInfo(bridgeIp: string, username?: string): Promise<HueBridgeInfo | null> {
    try {
      const url = username 
        ? `http://${bridgeIp}/api/${username}/config`
        : `http://${bridgeIp}/api/config`;
        
      const response = await this.httpClient.get(url);
      
      if (response.data) {
        return {
          id: response.data.bridgeid || bridgeIp,
          name: response.data.name || 'Philips Hue Bridge',
          modelid: response.data.modelid || 'Unknown',
          swversion: response.data.swversion || 'Unknown',
          ipaddress: bridgeIp
        };
      }

      return null;

    } catch (error) {
      this.logger.warn('Failed to get bridge info', {
        error: error instanceof Error ? error.message : String(error),
        bridgeIp
      });
      return null;
    }
  }

  private async setLightState(
    bridgeIp: string,
    username: string,
    lightId: string,
    state: any
  ): Promise<void> {
    try {
      await this.httpClient.put(
        `http://${bridgeIp}/api/${username}/lights/${lightId}/state`,
        state
      );
    } catch (error) {
      this.logger.warn('Failed to set light state', {
        error: error instanceof Error ? error.message : String(error),
        bridgeIp,
        lightId
      });
      // Don't throw - continue with other lights
    }
  }

  private convertToHueState(profile: LightingProfile): any {
    const hueColor = this.hexToHue(profile.color);
    
    return {
      on: true,
      bri: Math.round(profile.brightness * 2.54), // Convert 0-100 to 0-254
      hue: hueColor.hue,
      sat: Math.round(profile.saturation * 2.54), // Convert 0-100 to 0-254
      transitiontime: Math.round((profile.transitionDuration || 1000) / 100) // Convert ms to deciseconds
    };
  }

  private hexToHue(hex: string): { hue: number; sat: number } {
    // Convert hex color to HSV for Hue
    const rgb = this.hexToRgb(hex);
    const hsv = this.rgbToHsv(rgb.r, rgb.g, rgb.b);
    
    return {
      hue: Math.round(hsv.h * 65535 / 360), // Convert 0-360 to 0-65535
      sat: Math.round(hsv.s * 254) // Convert 0-1 to 0-254
    };
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }

  private rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;

    let h = 0;
    const s = max === 0 ? 0 : diff / max;
    const v = max;

    if (diff !== 0) {
      switch (max) {
        case r:
          h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / diff + 2) / 6;
          break;
        case b:
          h = ((r - g) / diff + 4) / 6;
          break;
      }
    }

    return { h: h * 360, s, v };
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
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

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fallbackDiscovery(): Promise<HueBridgeInfo[]> {
    // Simplified fallback discovery - in production, implement proper network scanning
    this.logger.info('Using fallback bridge discovery');
    
    const commonIps = [
      '192.168.1.2',
      '192.168.1.3',
      '192.168.0.2',
      '192.168.0.3'
    ];

    const bridges: HueBridgeInfo[] = [];

    for (const ip of commonIps) {
      try {
        const bridgeInfo = await this.getBridgeInfo(ip);
        if (bridgeInfo) {
          bridges.push(bridgeInfo);
          this.discoveredBridges.set(ip, bridgeInfo);
        }
      } catch (error) {
        // Ignore errors in fallback discovery
      }
    }

    return bridges;
  }
}
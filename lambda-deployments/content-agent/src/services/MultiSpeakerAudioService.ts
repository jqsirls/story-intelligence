/**
 * Multi-Speaker Audio Service
 * 
 * Platform-agnostic spatial audio distribution
 * Supports: Sonos, AirPlay, Alexa Multi-Room, Google Home groups
 * 
 * Enables bedroom transformation with sound from multiple speakers
 */

import { Logger } from 'winston';

export interface SpeakerDevice {
  id: string;
  name: string;
  platform: 'sonos' | 'airplay' | 'alexa' | 'google';
  location?: 'left' | 'right' | 'center' | 'back';
  capabilities: {
    volume: boolean;
    stereo: boolean;
    grouping: boolean;
  };
}

export interface AudioTrack {
  url: string;
  type: 'narration' | 'sound_effect' | 'ambiance' | 'music';
  timestamp?: number;  // When to play (seconds into story)
  duration?: number;
  volume?: number;     // 0.0-1.0
}

export interface SpatialAudioSession {
  sessionId: string;
  mainDevice: SpeakerDevice;      // Primary speaker (avatar/narration)
  surroundDevices: SpeakerDevice[]; // Additional speakers for effects
  groupId?: string;                 // Platform-specific group ID
}

export class MultiSpeakerAudioService {
  
  constructor(private logger: Logger) {}
  
  /**
   * Detect and configure available speakers
   */
  async discoverSpeakers(
    userId: string,
    platform: 'sonos' | 'airplay' | 'alexa' | 'google' | 'auto'
  ): Promise<SpeakerDevice[]> {
    
    switch (platform) {
      case 'sonos':
        return await this.discoverSonosSpeakers(userId);
      case 'airplay':
        return await this.discoverAirPlayDevices(userId);
      case 'alexa':
        return await this.discoverAlexaDevices(userId);
      case 'auto':
        // Try all platforms
        const all = await Promise.all([
          this.discoverSonosSpeakers(userId).catch(() => []),
          this.discoverAirPlayDevices(userId).catch(() => []),
          this.discoverAlexaDevices(userId).catch(() => [])
        ]);
        return all.flat();
      default:
        return [];
    }
  }
  
  /**
   * Sonos speaker discovery and setup
   */
  private async discoverSonosSpeakers(userId: string): Promise<SpeakerDevice[]> {
    
    // Sonos API integration
    // Requires: Sonos OAuth token for user
    
    try {
      const sonosToken = await this.getSonosToken(userId);
      if (!sonosToken) {
        return [];
      }
      
      // Get user's Sonos households
      const households = await fetch('https://api.ws.sonos.com/control/api/v1/households', {
        headers: {
          'Authorization': `Bearer ${sonosToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const householdsData = await households.json() as any;
      const householdId = householdsData.households?.[0]?.id;
      
      if (!householdId) return [];
      
      // Get groups (rooms with speakers)
      const groups = await fetch(`https://api.ws.sonos.com/control/api/v1/households/${householdId}/groups`, {
        headers: { 'Authorization': `Bearer ${sonosToken}` }
      });
      
      const groupsData = await groups.json() as any;
      
      // Map to SpeakerDevice format
      const devices: SpeakerDevice[] = [];
      for (const group of groupsData.groups || []) {
        devices.push({
          id: group.id,
          name: group.name,
          platform: 'sonos',
          capabilities: {
            volume: true,
            stereo: true,
            grouping: true
          }
        });
      }
      
      return devices;
      
    } catch (error) {
      this.logger.error('Sonos discovery failed', { error });
      return [];
    }
  }
  
  /**
   * AirPlay device discovery
   */
  private async discoverAirPlayDevices(userId: string): Promise<SpeakerDevice[]> {
    
    // AirPlay 2 discovery
    // Note: Requires Apple HomeKit integration or device-level discovery
    
    try {
      // For web platform: User manually selects AirPlay devices
      // For iOS app: Can use AVAudioSession to discover
      
      // Retrieve user's saved AirPlay devices
      const savedDevices = await this.getAirPlayDevices(userId);
      
      return savedDevices.map(device => ({
        id: device.id,
        name: device.name,
        platform: 'airplay',
        location: device.location,
        capabilities: {
          volume: true,
          stereo: true,
          grouping: true // AirPlay 2 supports multi-room
        }
      }));
      
    } catch (error) {
      this.logger.error('AirPlay discovery failed', { error });
      return [];
    }
  }
  
  /**
   * Alexa multi-room audio group discovery
   */
  private async discoverAlexaDevices(userId: string): Promise<SpeakerDevice[]> {
    
    // Alexa Multi-Room Music groups
    // Requires: Alexa account linking
    
    try {
      // Get user's Alexa devices from account linking
      const alexaToken = await this.getAlexaToken(userId);
      if (!alexaToken) return [];
      
      // Query Alexa API for devices
      // (Simplified - actual implementation would use Alexa Devices API)
      
      return [];
      
    } catch (error) {
      this.logger.error('Alexa discovery failed', { error });
      return [];
    }
  }
  
  /**
   * Create spatial audio session
   */
  async createSpatialSession(
    userId: string,
    mainDeviceId: string,
    surroundDeviceIds: string[]
  ): Promise<SpatialAudioSession> {
    
    const allDevices = await this.discoverSpeakers(userId, 'auto');
    
    const mainDevice = allDevices.find(d => d.id === mainDeviceId);
    const surroundDevices = allDevices.filter(d => surroundDeviceIds.includes(d.id));
    
    if (!mainDevice) {
      throw new Error('Main device not found');
    }
    
    const session: SpatialAudioSession = {
      sessionId: `spatial_${Date.now()}`,
      mainDevice,
      surroundDevices
    };
    
    this.logger.info('Spatial audio session created', {
      mainDevice: mainDevice.name,
      surroundCount: surroundDevices.length,
      platforms: [...new Set([mainDevice.platform, ...surroundDevices.map(d => d.platform)])]
    });
    
    return session;
  }
  
  /**
   * Play audio on Sonos speaker/group
   */
  async playOnSonos(
    groupId: string,
    audioUrl: string,
    sonosToken: string,
    options: { volume?: number; timestamp?: number } = {}
  ): Promise<void> {
    
    try {
      // Load audio clip to Sonos
      await fetch(`https://api.ws.sonos.com/control/api/v1/groups/${groupId}/audioClip`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sonosToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          streamUrl: audioUrl,
          name: 'Storytailor',
          appId: 'com.storytailor.immersive',
          volume: Math.round((options.volume || 0.5) * 100), // 0-100
          priority: 'high'
        })
      });
      
      this.logger.info('Audio playing on Sonos', { groupId });
      
    } catch (error) {
      this.logger.error('Sonos playback failed', { error });
      throw error;
    }
  }
  
  /**
   * Play audio via AirPlay
   */
  async playOnAirPlay(
    deviceId: string,
    audioUrl: string,
    options: { volume?: number } = {}
  ): Promise<void> {
    
    // AirPlay streaming
    // Implementation depends on platform:
    // - iOS app: AVPlayer with AirPlay route
    // - Web: User manually selects AirPlay in browser
    // - Server-side: Limited options (requires AirPlay SDK)
    
    this.logger.info('AirPlay playback initiated', {
      deviceId,
      url: audioUrl.substring(0, 60)
    });
    
    // For web platform: Return instruction to select AirPlay
    // For iOS/macOS: Use native AirPlay APIs
  }
  
  /**
   * Orchestrate complete immersive audio
   */
  async playImmersiveStory(
    session: SpatialAudioSession,
    audioTracks: {
      narration: string;
      soundEffects: AudioTrack[];
      ambiance?: string;
    },
    sonosToken?: string
  ): Promise<void> {
    
    this.logger.info('Starting immersive audio playback', {
      sessionId: session.sessionId,
      mainDevice: session.mainDevice.name,
      effectCount: audioTracks.soundEffects.length,
      hasSurround: session.surroundDevices.length > 0
    });
    
    // Main device: Narration
    await this.playOnDevice(session.mainDevice, audioTracks.narration, sonosToken);
    
    // Surround devices: Distribute sound effects spatially
    if (session.surroundDevices.length > 0) {
      for (const [index, sfx] of audioTracks.soundEffects.entries()) {
        const deviceIndex = index % session.surroundDevices.length;
        const device = session.surroundDevices[deviceIndex];
        
        // Schedule effect at timestamp
        setTimeout(() => {
          this.playOnDevice(device, sfx.url, sonosToken, {
            volume: sfx.volume || 0.4
          });
        }, (sfx.timestamp || 0) * 1000);
      }
    }
    
    // Ambiance on all devices (very soft background)
    if (audioTracks.ambiance) {
      const ambianceVolume = 0.15; // Very subtle
      
      for (const device of [session.mainDevice, ...session.surroundDevices]) {
        await this.playOnDevice(device, audioTracks.ambiance, sonosToken, {
          volume: ambianceVolume
        });
      }
    }
  }
  
  /**
   * Play audio on any device type
   */
  private async playOnDevice(
    device: SpeakerDevice,
    audioUrl: string,
    sonosToken?: string,
    options: {volume?: number; timestamp?: number} = {}
  ): Promise<void> {
    
    switch (device.platform) {
      case 'sonos':
        if (sonosToken) {
          await this.playOnSonos(device.id, audioUrl, sonosToken, options);
        }
        break;
        
      case 'airplay':
        await this.playOnAirPlay(device.id, audioUrl, options);
        break;
        
      case 'alexa':
        // Would use Alexa Audio Player directive
        break;
        
      case 'google':
        // Would use Google Cast API
        break;
    }
  }
  
  // Helper methods
  
  private async getSonosToken(userId: string): Promise<string | null> {
    // Get from database (stored during OAuth)
    return null; // Stub
  }
  
  private async getAirPlayDevices(userId: string): Promise<SpeakerDevice[]> {
    // Get saved AirPlay devices from database
    try {
      // Note: Requires Supabase client - initialize if needed
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_KEY || ''
      );
      
      const { data, error } = await supabase
        .from('user_device_preferences')
        .select('devices')
        .eq('user_id', userId)
        .eq('platform', 'airplay')
        .single();
      
      if (error || !data) {
        this.logger.info('No AirPlay devices saved for user', { userId });
        return [];
      }
      
      // Convert stored preferences to SpeakerDevice format
      const devices: SpeakerDevice[] = (data.devices || []).map((device: any) => ({
        id: device.uid || device.id || `airplay_${device.name}`,
        name: device.name || 'AirPlay Device',
        platform: 'airplay' as const,
        location: device.location as any,
        capabilities: {
          volume: true,
          stereo: true,
          grouping: true
        }
      }));
      
      this.logger.info('AirPlay devices retrieved', {
        userId,
        deviceCount: devices.length
      });
      
      return devices;
      
    } catch (error) {
      this.logger.error('Failed to get AirPlay devices', { error, userId });
      return [];
    }
  }
  
  private async getAlexaToken(userId: string): Promise<string | null> {
    // Get from Alexa account linking
    return null; // Stub
  }
}


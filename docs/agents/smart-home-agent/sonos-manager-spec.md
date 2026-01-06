# SonosManager Class - Implementation Specification

**Status**: Design Phase  
**Priority**: High  
**Target**: Premium Immersive Storytelling Experience  
**Last Updated**: 2025-12-14  
**Audience**: Internal | Engineering Team

## Overview

The `SonosManager` class provides device-specific management for Sonos speakers, enabling spatial audio orchestration for immersive storytelling experiences. It follows the same architectural pattern as `PhilipsHueManager` for consistency.

**File Location:** `packages/smart-home-agent/src/devices/SonosManager.ts`  
**Base Class:** Implements `DeviceManager` interface  
**Reference Implementation:** `packages/smart-home-agent/src/devices/PhilipsHueManager.ts`

## Class Architecture

### Class Signature

```typescript
import { DeviceManager, DeviceType, SpeakerDevice, SpatialAudioSession } from '@alexa-multi-agent/shared-types';
import { SmartHomeTokenManager } from '../token/TokenManager';
import { SmartHomeAgentConfig } from '../types';
import { Logger } from 'winston';

export class SonosManager implements DeviceManager {
  deviceType: DeviceType = 'sonos';
  private httpClient: AxiosInstance;
  private logger: Logger;
  private sonosTokenManager: SonosTokenManager;
  private discoveredSpeakers: Map<string, SpeakerDevice> = new Map();

  constructor(
    private tokenManager: SmartHomeTokenManager,
    private config: SmartHomeAgentConfig
  ) {
    // Initialize HTTP client, logger, token manager
  }
}
```

### Dependencies

**Required:**
- `SmartHomeTokenManager` - Token management (base class)
- `SonosTokenManager` - Sonos-specific token management
- `SmartHomeAgentConfig` - Configuration
- `axios` - HTTP client for Sonos API
- `winston` - Logging

**Code Reference:**
- `packages/smart-home-agent/src/devices/PhilipsHueManager.ts:18-44` - Constructor pattern

## Core Methods

### Device Discovery

**Method:** `discoverDevices(userId: string): Promise<SpeakerDevice[]>`

**Purpose:** Discover all Sonos speakers in user's household

**Implementation:**
```typescript
async discoverDevices(userId: string): Promise<SpeakerDevice[]> {
  try {
    this.logger.info('Discovering Sonos speakers', { userId });

    // 1. Get Sonos OAuth token
    const token = await this.sonosTokenManager.getToken(userId);
    if (!token) {
      this.logger.warn('No Sonos token found for user', { userId });
      return [];
    }

    // 2. Get user's households
    const households = await this.httpClient.get(
      'https://api.ws.sonos.com/control/api/v1/households',
      {
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const householdId = households.data.households?.[0]?.id;
    if (!householdId) {
      this.logger.warn('No households found for user', { userId });
      return [];
    }

    // 3. Get groups (rooms with speakers)
    const groups = await this.httpClient.get(
      `https://api.ws.sonos.com/control/api/v1/households/${householdId}/groups`,
      {
        headers: {
          'Authorization': `Bearer ${token.accessToken}`
        }
      }
    );

    // 4. Map groups to SpeakerDevice format
    const devices: SpeakerDevice[] = [];
    for (const group of groups.data.groups || []) {
      for (const player of group.playerIds || []) {
        devices.push({
          id: player,
          name: group.name || `Sonos Speaker ${player}`,
          platform: 'sonos',
          location: this.inferLocation(group.name, player),
          capabilities: {
            volume: true,
            stereo: true,
            grouping: true
          }
        });
        this.discoveredSpeakers.set(player, devices[devices.length - 1]);
      }
    }

    this.logger.info('Sonos discovery completed', {
      userId,
      speakersFound: devices.length
    });

    return devices;

  } catch (error) {
    this.logger.error('Sonos discovery failed', {
      error: error instanceof Error ? error.message : String(error),
      userId
    });
    return [];
  }
}
```

**Code Reference:**
- `packages/smart-home-agent/src/devices/PhilipsHueManager.ts:49-95` - Discovery pattern

### Speaker Grouping

**Method:** `createGroup(speakers: SpeakerDevice[], groupType: 'main' | 'spatial' | 'ambiance'): Promise<string>`

**Purpose:** Create a Sonos group for coordinated playback

**Implementation:**
```typescript
async createGroup(
  speakers: SpeakerDevice[],
  groupType: 'main' | 'spatial' | 'ambiance'
): Promise<string> {
  try {
    this.logger.info('Creating Sonos group', {
      speakerCount: speakers.length,
      groupType
    });

    const userId = speakers[0]?.userId; // Assume all speakers from same user
    const token = await this.sonosTokenManager.getToken(userId);
    if (!token) {
      throw new Error('No Sonos token available');
    }

    // Get household ID
    const householdId = await this.getHouseholdId(userId, token);

    // Create group using Sonos API
    const groupResponse = await this.httpClient.post(
      `https://api.ws.sonos.com/control/api/v1/households/${householdId}/groups/createGroup`,
      {
        playerIds: speakers.map(s => s.id),
        name: `Storytailor ${groupType}`
      },
      {
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const groupId = groupResponse.data.id;
    
    this.logger.info('Sonos group created', {
      groupId,
      groupType,
      speakerCount: speakers.length
    });

    return groupId;

  } catch (error) {
    this.logger.error('Failed to create Sonos group', {
      error: error instanceof Error ? error.message : String(error),
      groupType
    });
    throw error;
  }
}
```

### Spatial Audio Playback

**Method:** `playSpatialAudio(session: SpatialAudioSession, audioTracks: SpatialAudioTracks): Promise<void>`

**Purpose:** Play three-stream spatial audio (narration, sound effects, music)

**Implementation:**
```typescript
async playSpatialAudio(
  session: SpatialAudioSession,
  audioTracks: {
    narration: string; // Audio URL
    soundEffects: Array<{
      url: string;
      timestamp: number; // Seconds into story
      position: 'left' | 'right' | 'center' | 'back';
      volume: number;
    }>;
    music?: string; // Background music URL
  }
): Promise<void> {
  try {
    this.logger.info('Starting spatial audio playback', {
      sessionId: session.sessionId,
      mainDevice: session.mainDevice.name,
      effectCount: audioTracks.soundEffects.length
    });

    const userId = session.userId;
    const token = await this.sonosTokenManager.getToken(userId);
    if (!token) {
      throw new Error('No Sonos token available');
    }

    const householdId = await this.getHouseholdId(userId, token);

    // 1. Play narration on main speaker
    await this.playOnGroup(
      session.mainGroupId,
      audioTracks.narration,
      {
        volume: 0.75,
        priority: 'high'
      },
      token
    );

    // 2. Schedule sound effects on spatial speakers
    for (const effect of audioTracks.soundEffects) {
      const targetSpeaker = this.selectSpeakerForPosition(
        effect.position,
        session.spatialSpeakers
      );

      // Schedule effect at timestamp
      setTimeout(async () => {
        await this.playAudioClip(
          targetSpeaker.id,
          effect.url,
          {
            volume: effect.volume,
            priority: 'medium'
          },
          token,
          householdId
        );
      }, effect.timestamp * 1000);
    }

    // 3. Play background music on ambiance speakers
    if (audioTracks.music && session.ambianceSpeakers.length > 0) {
      await this.playOnGroup(
        session.ambianceGroupId,
        audioTracks.music,
        {
          volume: 0.20,
          priority: 'low',
          loop: true
        },
        token
      );
    }

    this.logger.info('Spatial audio playback started', {
      sessionId: session.sessionId
    });

  } catch (error) {
    this.logger.error('Failed to play spatial audio', {
      error: error instanceof Error ? error.message : String(error),
      sessionId: session.sessionId
    });
    throw error;
  }
}
```

### Individual Speaker Control

**Method:** `playAudioClip(playerId: string, audioUrl: string, options: PlayOptions, token: TokenData, householdId: string): Promise<void>`

**Purpose:** Play audio clip on individual speaker

**Implementation:**
```typescript
private async playAudioClip(
  playerId: string,
  audioUrl: string,
  options: {
    volume?: number;
    priority?: 'high' | 'medium' | 'low';
  },
  token: TokenData,
  householdId: string
): Promise<void> {
  try {
    // Set volume if specified
    if (options.volume !== undefined) {
      await this.setVolume(playerId, options.volume, token, householdId);
    }

    // Play audio clip
    await this.httpClient.post(
      `https://api.ws.sonos.com/control/api/v1/households/${householdId}/players/${playerId}/audioClip`,
      {
        name: 'Storytailor Audio',
        appId: 'com.storytailor.app',
        streamUrl: audioUrl,
        volume: options.volume || 50
      },
      {
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    this.logger.debug('Audio clip playing', {
      playerId,
      volume: options.volume
    });

  } catch (error) {
    this.logger.error('Failed to play audio clip', {
      error: error instanceof Error ? error.message : String(error),
      playerId
    });
    throw error;
  }
}
```

### Volume Control

**Method:** `setVolume(speakerId: string, volume: number, token: TokenData, householdId: string): Promise<void>`

**Purpose:** Set volume for individual speaker or group

**Implementation:**
```typescript
async setVolume(
  speakerId: string,
  volume: number, // 0.0-1.0
  token: TokenData,
  householdId: string
): Promise<void> {
  try {
    // Convert to Sonos volume (0-100)
    const sonosVolume = Math.round(volume * 100);
    
    // Clamp to safe limits
    const safeVolume = Math.max(0, Math.min(80, sonosVolume)); // Max 80% for safety

    await this.httpClient.post(
      `https://api.ws.sonos.com/control/api/v1/households/${householdId}/players/${speakerId}/playerVolume`,
      {
        volume: safeVolume
      },
      {
        headers: {
          'Authorization': `Bearer ${token.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    this.logger.debug('Volume set', {
      speakerId,
      volume: safeVolume
    });

  } catch (error) {
    this.logger.error('Failed to set volume', {
      error: error instanceof Error ? error.message : String(error),
      speakerId
    });
    throw error;
  }
}
```

## Integration Points

### With SmartHomeAgent

**File:** `packages/smart-home-agent/src/SmartHomeAgent.ts`

**Integration:**
```typescript
// Register Sonos manager
this.deviceManagers.set('sonos', new SonosManager(this.tokenManager, config));
```

**Code Reference:**
- `packages/smart-home-agent/src/SmartHomeAgent.ts:58` - Device manager registration

### With MultiSpeakerAudioService

**File:** `lambda-deployments/content-agent/src/services/MultiSpeakerAudioService.ts`

**Integration:**
```typescript
// Use SonosManager for Sonos speakers
if (device.platform === 'sonos') {
  const sonosManager = smartHomeAgent.getDeviceManager('sonos');
  await sonosManager.playSpatialAudio(session, audioTracks);
}
```

**Code Reference:**
- `lambda-deployments/content-agent/src/services/MultiSpeakerAudioService.ts:280-325` - Spatial audio orchestration

### With LightingOrchestrator

**File:** `packages/smart-home-agent/src/lighting/LightingOrchestrator.ts`

**Coordination:**
- Synchronize audio and lighting changes
- Story beat coordination
- Emotional moment synchronization

**Code Reference:**
- `packages/smart-home-agent/src/lighting/LightingOrchestrator.ts:96-164` - Narrative event lighting

## Database Integration

### Device Storage

**Table:** `sonos_devices`

**Storage:**
- Store discovered speakers
- Track speaker roles (main, spatial, ambiance)
- Store location information
- Track connection status

**Code Reference:**
- `docs/agents/smart-home-agent/sonos-spatial-audio-spec.md` - Database schema

### Token Management

**Integration:** Use `SonosTokenManager` for token operations

**Code Reference:**
- `docs/agents/smart-home-agent/sonos-token-manager-spec.md` - Token manager spec

## Error Handling

### Connection Failures

**Strategy:**
- Retry with exponential backoff (3 attempts)
- Fallback to single speaker mode
- Graceful degradation

**Implementation:**
```typescript
private async withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}
```

### Speaker Unavailability

**Strategy:**
- Detect unavailable speakers
- Redistribute audio to available speakers
- Notify user of reduced experience

## Health Monitoring

### Device Health Checks

**Method:** `checkDeviceHealth(deviceId: string): Promise<DeviceHealth>`

**Purpose:** Monitor speaker connectivity and status

**Implementation:**
```typescript
async checkDeviceHealth(deviceId: string): Promise<DeviceHealth> {
  try {
    const token = await this.sonosTokenManager.getToken(/* userId */);
    const householdId = await this.getHouseholdId(/* userId */, token);
    
    const response = await this.httpClient.get(
      `https://api.ws.sonos.com/control/api/v1/households/${householdId}/players/${deviceId}`,
      {
        headers: {
          'Authorization': `Bearer ${token.accessToken}`
        }
      }
    );

    return {
      status: 'healthy',
      lastSeen: new Date(),
      capabilities: response.data.capabilities
    };

  } catch (error) {
    return {
      status: 'unhealthy',
      lastSeen: new Date(),
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
```

## Related Documentation

- **Spatial Audio Specification:** See [Sonos Spatial Audio Spec](./sonos-spatial-audio-spec.md)
- **Sonos Integration Guide:** See [Sonos Integration](../integrations/sonos.md)
- **API Endpoints:** See [Sonos API Endpoints](./sonos-api-endpoints.md)
- **Token Manager:** See [SonosTokenManager Spec](./sonos-token-manager-spec.md)
- **Reference Implementation:** See `packages/smart-home-agent/src/devices/PhilipsHueManager.ts`

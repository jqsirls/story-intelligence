# Smart Home Integration Plan
## Philips Hue and IoT Device Integration for Storytailor Agent

### Overview
This plan outlines the integration of smart home devices (starting with Philips Hue) to create immersive storytelling environments while maintaining strict privacy compliance and seamless integration with existing systems.

### Core Concept
Transform physical spaces into story environments through:
- **Ambient Lighting**: Dynamic color and brightness changes based on story type and narrative moments
- **Contextual Atmosphere**: Room-specific lighting profiles for different story genres
- **Narrative Synchronization**: Real-time lighting changes during story narration
- **Privacy-First Design**: Minimal data collection with user control

### Technical Architecture

#### 1. Smart Home Service Layer
```typescript
// packages/smart-home-agent/src/SmartHomeAgent.ts
export class SmartHomeAgent {
  private deviceManagers: Map<DeviceType, DeviceManager>;
  private lightingOrchestrator: LightingOrchestrator;
  private privacyController: IoTPrivacyController;
  
  async connectDevice(deviceConfig: DeviceConnectionConfig): Promise<DeviceConnection>
  async createStoryEnvironment(storyType: StoryType, roomId: string): Promise<EnvironmentProfile>
  async synchronizeWithNarrative(narrativeEvents: NarrativeEvent[]): Promise<void>
  async disconnectDevice(deviceId: string): Promise<void>
}
```

#### 2. Device Manager Implementations
```typescript
// Philips Hue Implementation
export class PhilipsHueManager implements DeviceManager {
  async discoverDevices(): Promise<HueDevice[]>
  async authenticateWithBridge(): Promise<HueBridgeAuth>
  async setRoomLighting(roomId: string, profile: LightingProfile): Promise<void>
  async createGradualTransition(from: LightingState, to: LightingState, duration: number): Promise<void>
}

// Extensible for other devices
export class NanoleafManager implements DeviceManager { /* ... */ }
export class LifxManager implements DeviceManager { /* ... */ }
```

#### 3. Story-Lighting Mapping System
```typescript
interface StoryLightingProfile {
  storyType: StoryType;
  baseProfile: LightingState;
  narrativeEvents: {
    [eventType: string]: LightingTransition;
  };
  ageAppropriate: {
    brightness: { min: number; max: number };
    colorRestrictions: string[];
    transitionSpeed: 'gentle' | 'moderate' | 'dynamic';
  };
}

const STORY_LIGHTING_PROFILES: Record<StoryType, StoryLightingProfile> = {
  'Bedtime': {
    baseProfile: {
      brightness: 20,
      color: '#FF9500', // Warm amber
      saturation: 60
    },
    narrativeEvents: {
      'peaceful_moment': { color: '#FFB347', brightness: 15, transition: 3000 },
      'gentle_adventure': { color: '#87CEEB', brightness: 25, transition: 2000 },
      'story_end': { brightness: 5, transition: 10000 } // Gradual fade
    },
    ageAppropriate: {
      brightness: { min: 5, max: 30 },
      colorRestrictions: ['no_red', 'no_bright_blue'],
      transitionSpeed: 'gentle'
    }
  },
  'Adventure': {
    baseProfile: {
      brightness: 70,
      color: '#32CD32', // Lime green
      saturation: 80
    },
    narrativeEvents: {
      'exciting_moment': { color: '#FFD700', brightness: 85, transition: 1000 },
      'mysterious_scene': { color: '#9370DB', brightness: 40, transition: 2000 },
      'victory_moment': { color: '#00FF00', brightness: 90, transition: 500 }
    },
    ageAppropriate: {
      brightness: { min: 40, max: 90 },
      colorRestrictions: [],
      transitionSpeed: 'dynamic'
    }
  },
  'Educational': {
    baseProfile: {
      brightness: 80,
      color: '#87CEEB', // Sky blue
      saturation: 70
    },
    narrativeEvents: {
      'discovery_moment': { color: '#FFD700', brightness: 85, transition: 1500 },
      'thinking_pause': { brightness: 60, transition: 2000 },
      'achievement': { color: '#32CD32', brightness: 90, transition: 1000 }
    },
    ageAppropriate: {
      brightness: { min: 60, max: 90 },
      colorRestrictions: [],
      transitionSpeed: 'moderate'
    }
  }
  // ... other story types
};
```

### Privacy-First Implementation

#### 1. IoT Privacy Controller
```typescript
export class IoTPrivacyController {
  async validateDeviceConnection(deviceConfig: DeviceConnectionConfig): Promise<PrivacyValidation>
  async requestDeviceConsent(userId: string, deviceType: DeviceType): Promise<ConsentResult>
  async minimizeDataCollection(deviceData: DeviceData): Promise<MinimizedData>
  async auditDeviceAccess(userId: string): Promise<DeviceAccessAudit>
  async revokeDeviceAccess(userId: string, deviceId: string): Promise<void>
}

interface DeviceConnectionConfig {
  deviceType: DeviceType;
  userId: string;
  roomId: string;
  dataMinimization: {
    collectOnlyLighting: boolean;
    excludeUsagePatterns: boolean;
    excludeDeviceMetadata: boolean;
  };
  consentScope: {
    lightingControl: boolean;
    ambientResponse: boolean;
    narrativeSynchronization: boolean;
  };
  retentionPolicy: {
    connectionLogs: string; // "24_hours"
    lightingHistory: string; // "none" or "7_days"
    errorLogs: string; // "30_days"
  };
}
```

#### 2. Data Minimization Strategy
```typescript
// Only collect essential data for functionality
interface MinimalDeviceData {
  deviceId: string; // Hashed for privacy
  roomId: string;
  connectionStatus: 'connected' | 'disconnected';
  lastUsed: string; // For cleanup only
  // NO collection of:
  // - Usage patterns
  // - Detailed device metadata
  // - User behavior analytics
  // - Room occupancy data
}

// Immediate data purging
const DATA_RETENTION_POLICY = {
  connectionLogs: '24_hours',
  lightingCommands: 'none', // Not stored
  errorLogs: '7_days',
  deviceMetadata: 'none' // Not collected
};
```

#### 3. Consent Management for IoT
```typescript
interface IoTConsentRecord {
  userId: string;
  deviceType: DeviceType;
  deviceId: string;
  consentGiven: boolean;
  consentScope: {
    basicLighting: boolean;
    storySync: boolean;
    ambientResponse: boolean;
  };
  parentalConsent: boolean; // Required for COPPA-protected users
  consentMethod: 'voice' | 'app' | 'web';
  consentTimestamp: string;
  withdrawalTimestamp?: string;
  dataRetentionPreference: 'minimal' | 'none';
}
```

### Integration with Existing Systems

#### 1. Router Integration
```typescript
// packages/router/src/services/SmartHomeIntegrator.ts
export class SmartHomeIntegrator {
  async handleStoryStart(storyType: StoryType, userId: string): Promise<void> {
    const userDevices = await this.getUserConnectedDevices(userId);
    if (userDevices.length > 0) {
      await this.smartHomeAgent.createStoryEnvironment(storyType, userDevices[0].roomId);
    }
  }

  async handleNarrativeEvent(event: NarrativeEvent, userId: string): Promise<void> {
    const userDevices = await this.getUserConnectedDevices(userId);
    if (userDevices.length > 0) {
      await this.smartHomeAgent.synchronizeWithNarrative([event]);
    }
  }

  async handleStoryEnd(userId: string): Promise<void> {
    const userDevices = await this.getUserConnectedDevices(userId);
    if (userDevices.length > 0) {
      await this.smartHomeAgent.restoreDefaultLighting(userDevices[0].roomId);
    }
  }
}
```

#### 2. Storytailor Agent Integration
```typescript
// packages/storytailor-agent/src/services/EnvironmentManager.ts
export class EnvironmentManager {
  async enhanceStoryWithEnvironment(story: Story, userId: string): Promise<EnhancedStory> {
    const hasSmartHome = await this.checkSmartHomeAvailability(userId);
    
    if (hasSmartHome) {
      // Add environmental cues to story beats
      const enhancedBeats = story.beats.map(beat => ({
        ...beat,
        environmentalCues: this.generateEnvironmentalCues(beat, story.type)
      }));
      
      return { ...story, beats: enhancedBeats };
    }
    
    return story;
  }

  private generateEnvironmentalCues(beat: StoryBeat, storyType: StoryType): EnvironmentalCue[] {
    // Generate lighting cues based on story content
    const cues: EnvironmentalCue[] = [];
    
    if (beat.content.includes('mysterious') || beat.content.includes('dark')) {
      cues.push({
        type: 'lighting',
        action: 'dim',
        color: '#4B0082', // Indigo
        duration: 2000
      });
    }
    
    if (beat.content.includes('exciting') || beat.content.includes('adventure')) {
      cues.push({
        type: 'lighting',
        action: 'brighten',
        color: '#FFD700', // Gold
        duration: 1000
      });
    }
    
    return cues;
  }
}
```

### Database Schema Extensions

```sql
-- Smart home device management
CREATE TABLE smart_home_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  device_type TEXT NOT NULL, -- 'philips_hue', 'nanoleaf', etc.
  device_id_hash TEXT NOT NULL, -- Hashed device ID for privacy
  room_id TEXT NOT NULL,
  connection_status TEXT DEFAULT 'disconnected',
  consent_given BOOLEAN DEFAULT FALSE,
  parent_consent BOOLEAN DEFAULT FALSE,
  consent_scope JSONB DEFAULT '{}',
  data_retention_preference TEXT DEFAULT 'minimal',
  connected_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours') -- Auto-cleanup
);

-- IoT consent tracking
CREATE TABLE iot_consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  device_id UUID REFERENCES smart_home_devices NOT NULL,
  consent_scope JSONB NOT NULL,
  consent_method TEXT NOT NULL,
  parent_consent BOOLEAN DEFAULT FALSE,
  consent_timestamp TIMESTAMPTZ DEFAULT NOW(),
  withdrawal_timestamp TIMESTAMPTZ,
  legal_basis TEXT NOT NULL
);

-- Minimal connection logging (24-hour retention)
CREATE TABLE device_connection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES smart_home_devices NOT NULL,
  action TEXT NOT NULL, -- 'connect', 'disconnect', 'lighting_change'
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Indexes for performance
CREATE INDEX idx_smart_home_devices_user_id ON smart_home_devices(user_id);
CREATE INDEX idx_smart_home_devices_expires_at ON smart_home_devices(expires_at);
CREATE INDEX idx_device_connection_logs_expires_at ON device_connection_logs(expires_at);

-- RLS policies
ALTER TABLE smart_home_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_connection_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY smart_home_devices_policy ON smart_home_devices
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY iot_consent_records_policy ON iot_consent_records
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY device_connection_logs_policy ON device_connection_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM smart_home_devices shd 
      WHERE shd.id = device_id AND shd.user_id = auth.uid()
    )
  );
```

### User Experience Flow

#### 1. Device Discovery and Setup
```
1. User: "Connect my room lights to stories"
2. System: Discovers Philips Hue bridge
3. System: Requests specific consent for lighting control
4. Parent: Approves consent (if child user)
5. System: Establishes minimal connection
6. System: "Your bedroom lights are now connected!"
```

#### 2. Story Experience
```
1. User: "Tell me a bedtime story"
2. System: Activates warm, dim lighting profile
3. Story begins with gentle amber glow
4. During story: Lights subtly change with narrative
   - Peaceful moments: Softer amber
   - Gentle adventure: Light blue tint
   - Story conclusion: Gradual fade to very dim
5. Story ends: Lights remain at sleep-friendly level
```

#### 3. Privacy Controls
```
1. Parent Dashboard: View all connected devices
2. Granular Controls: Enable/disable specific features
3. Data Transparency: See exactly what data is used
4. Easy Disconnection: One-click device removal
5. Consent History: Full audit trail of permissions
```

### Implementation Phases

#### Phase 1: Core Infrastructure (Weeks 1-2)
- [ ] Create SmartHomeAgent package structure
- [ ] Implement PhilipsHueManager
- [ ] Build IoTPrivacyController
- [ ] Add database schema for device management
- [ ] Create basic consent management system

#### Phase 2: Story Integration (Weeks 3-4)
- [ ] Integrate with Router for story events
- [ ] Implement story-lighting profile system
- [ ] Add environmental cue generation
- [ ] Create narrative synchronization
- [ ] Build age-appropriate lighting restrictions

#### Phase 3: Privacy and Compliance (Weeks 5-6)
- [ ] Implement comprehensive consent workflows
- [ ] Add parental controls for IoT devices
- [ ] Create data minimization enforcement
- [ ] Build privacy audit capabilities
- [ ] Add automated data cleanup

#### Phase 4: User Experience (Weeks 7-8)
- [ ] Create device setup flows
- [ ] Build user-friendly controls
- [ ] Add troubleshooting and support
- [ ] Implement graceful fallbacks
- [ ] Create comprehensive testing

### Privacy Safeguards

#### 1. Data Minimization
- **No Usage Analytics**: Don't track when/how often devices are used
- **No Behavioral Profiling**: Don't analyze lighting preferences
- **No Room Occupancy**: Don't infer presence from device usage
- **Minimal Metadata**: Only store essential connection information

#### 2. Consent Granularity
- **Basic Lighting Control**: On/off and brightness
- **Story Synchronization**: Lighting changes during stories
- **Ambient Response**: Automatic environmental adjustments
- **Each Scope Separately Consented**: Users can choose specific features

#### 3. Child Protection
- **Parental Approval Required**: All IoT connections need parent consent
- **Age-Appropriate Restrictions**: Brightness and color limitations
- **Gentle Transitions**: No jarring lighting changes for children
- **Easy Disconnection**: Parents can instantly disconnect devices

#### 4. Security Measures
- **Local Network Only**: No cloud routing of device commands
- **Encrypted Communications**: All device communications encrypted
- **Regular Security Audits**: Quarterly security assessments
- **Minimal Attack Surface**: Reduce potential security vulnerabilities

### Technical Considerations

#### 1. Network Architecture
```
User Device (Alexa) → Storytailor Router → Smart Home Agent → Local Device Bridge
                                                           ↓
                                              Privacy Controller (validates all commands)
```

#### 2. Fallback Mechanisms
- **Device Unavailable**: Story continues without lighting
- **Connection Lost**: Graceful degradation to voice-only
- **Privacy Violation**: Immediate disconnection and alert
- **Consent Withdrawn**: Instant cessation of all device control

#### 3. Performance Optimization
- **Local Caching**: Cache device states locally
- **Async Operations**: Non-blocking lighting changes
- **Batch Commands**: Group multiple lighting changes
- **Connection Pooling**: Reuse device connections efficiently

### Compliance Considerations

#### 1. UK Children's Code Compliance
- **Connected Toys Provision**: Treat smart lights as connected devices
- **Default Privacy Settings**: All features opt-in by default
- **Parental Controls**: Comprehensive parent oversight
- **Data Minimization**: Collect only essential data

#### 2. COPPA Compliance
- **Parental Consent**: Required for all IoT connections
- **Data Deletion**: Easy removal of all device data
- **Transparency**: Clear explanation of device data use
- **Safe Harbor**: Consider FTC-approved frameworks

#### 3. GDPR Compliance
- **Lawful Basis**: Document legal basis for device control
- **Data Subject Rights**: Enable data access and deletion
- **Privacy by Design**: Build privacy into system architecture
- **Impact Assessment**: Conduct DPIA for IoT features

### Success Metrics

#### 1. User Engagement
- Device connection rate
- Story completion with lighting
- User satisfaction scores
- Feature usage patterns (privacy-compliant)

#### 2. Privacy Compliance
- Consent completion rates
- Data minimization effectiveness
- Privacy audit results
- Compliance violation incidents (target: zero)

#### 3. Technical Performance
- Device connection reliability
- Lighting synchronization accuracy
- System response times
- Error rates and recovery

### Conclusion

This smart home integration plan provides a privacy-first approach to creating immersive storytelling environments. By implementing strict data minimization, granular consent controls, and comprehensive privacy safeguards, we can enhance the storytelling experience while maintaining full compliance with children's privacy regulations.

The phased implementation approach allows for iterative development and testing, ensuring both technical excellence and privacy compliance throughout the development process.
Status: Draft  
Audience: Internal | Partner | Auditor  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 7 - Comprehensive Philips Hue integration documentation with privacy statement

# Philips Hue Integration

## Overview

Storytailor integrates with Philips Hue smart lighting systems to create immersive, narrative-synchronized lighting experiences during story sessions. The integration supports both Hue v2 Cloud OAuth API and v1 local bridge API with automatic fallback.

**Package Location:** `packages/smart-home-agent/src/devices/PhilipsHueManager.ts`
**Deployment Status:** ✅ Deployed (staging)

**Code References:**
- `packages/smart-home-agent/src/devices/PhilipsHueManager.ts:18-606` - Complete Hue manager implementation
- `packages/smart-home-agent/src/lighting/LightingOrchestrator.ts:1-445` - Lighting orchestration
- `packages/smart-home-agent/src/privacy/IoTPrivacyController.ts:1-448` - Privacy controls
- `docs/system/inventory.md:92` - Deployment status

## Architecture

### Multi-Location Support

**Supported Locations:**
- Home
- School
- Hospital
- Therapy center

**Code References:**
- `docs/storytailor/internal_architecture.md:187-190` - Multi-location support
- `packages/smart-home-agent/src/SmartHomeAgent.ts:32-742` - Smart Home Agent

### OAuth 2.0 Authentication

**Hue v2 Cloud OAuth:**
- OAuth tokens obtained and stored in Supabase
- Token encryption working correctly
- Token refresh mechanism in place

**Code References:**
- `HUE_V2_INTEGRATION_STATUS.md:1-65` - OAuth flow status
- `packages/smart-home-agent/src/token/TokenManager.ts:1-396` - Token management
- `lambda-deployments/router/src/handlers/HueOAuthHandlers.ts:1-355` - OAuth handlers

**OAuth Flow:**
1. User initiates Hue connection
2. Router redirects to Hue OAuth authorization
3. User authorizes on Hue website
4. Hue redirects to callback URL with code
5. Router exchanges code for access token
6. Token stored encrypted in Supabase
7. Token used for API calls

**Code Location:** `lambda-deployments/router/src/handlers/HueOAuthHandlers.ts:77-158`

### v2/v1 API Fallback

**Priority Order:**
1. Route API with bridge ID: `/route/api/{bridgeId}/resource/light`
2. Local bridge with OAuth token as application key
3. Create application key using OAuth token
4. v1 local bridge API (fallback)

**Code References:**
- `HUE_V2_INTEGRATION_STATUS.md:54-62` - v2 primary methods
- `packages/smart-home-agent/src/devices/PhilipsHueManager.ts:18-606` - Fallback logic

## Features

### Bridge Discovery

**Discovery Methods:**
- Philips discovery service (`https://discovery.meethue.com/`)
- Fallback to common IP ranges

**Code References:**
- `packages/smart-home-agent/src/devices/PhilipsHueManager.ts:49-95` - Bridge discovery
- `packages/smart-home-agent/src/devices/PhilipsHueManager.ts:49-95` - Discovery implementation

**Code Location:** `packages/smart-home-agent/src/devices/PhilipsHueManager.ts:49-95`

### Lighting Control

**Room Lighting:**
- Set room lighting based on profile
- Gradual lighting transitions
- Narrative event synchronization

**Code References:**
- `packages/smart-home-agent/src/devices/PhilipsHueManager.ts:169-223` - Room lighting
- `packages/smart-home-agent/src/devices/PhilipsHueManager.ts:228-280` - Gradual transitions

**Code Location:** `packages/smart-home-agent/src/devices/PhilipsHueManager.ts:169-223`

### Narrative Synchronization

**Story Lighting Profiles:**
- Story type-based lighting
- Narrative event transitions
- Age-appropriate restrictions

**Code References:**
- `packages/smart-home-agent/src/lighting/LightingOrchestrator.ts:51-91` - Story lighting profiles
- `packages/smart-home-agent/src/lighting/LightingOrchestrator.ts:96-150` - Narrative event lighting

**Code Location:** `packages/smart-home-agent/src/lighting/LightingOrchestrator.ts:51-91`

### Age-Appropriate Restrictions

**COPPA-Protected Users:**
- Maximum brightness: 30%
- Allowed colors: Safe colors only
- Requires parental approval

**Code References:**
- `docs/developer-docs/05_COMPLIANCE/01_PRIVACY_COMPLIANCE_VERIFICATION_REPORT.md:176-183` - Privacy by default
- `packages/smart-home-agent/src/lighting/LightingOrchestrator.ts:72` - Age restrictions

**Code Location:** `packages/smart-home-agent/src/lighting/LightingOrchestrator.ts:72`

```typescript
// Code location: docs/developer-docs/05_COMPLIANCE/01_PRIVACY_COMPLIANCE_VERIFICATION_REPORT.md:176-183
if (user.is_coppa_protected || (user.age && user.age < 13)) {
  return {
    maxBrightness: 30, // Gentle lighting only
    allowedColors: ['#FFFFFF', '#FFB347'], // Safe colors only
    requiresParentalApproval: true
  };
}
```

## Router Integration

### OAuth Endpoints

**Endpoints:**
- `GET /v1/hue/start` - Start OAuth flow
- `GET /v1/hue/callback` - OAuth callback
- `POST /v1/hue/pair` - Pair bridge
- `POST /v1/hue/finalize` - Finalize connection

**Code References:**
- `lambda-deployments/router/src/handlers/HueOAuthHandlers.ts:1-355` - OAuth handlers
- `lambda-deployments/router/src/lambda.ts:1164-1300` - Smart home request handling

**Code Location:** `lambda-deployments/router/src/handlers/HueOAuthHandlers.ts:1-355`

### Smart Home Request Handling

**Router Endpoints:**
- `POST /v1/smarthome/discover` - Discover devices
- `POST /v1/smarthome/connect` - Connect device
- `POST /v1/smarthome/control` - Control device

**Code References:**
- `lambda-deployments/router/src/lambda.ts:1164-1300` - Smart home handlers
- `packages/router/src/services/SmartHomeIntegrator.ts` - Smart home integration

## Token Management

### Token Storage

**Storage:**
- Encrypted tokens in Supabase `device_tokens` table
- Redis caching for performance
- Automatic token refresh

**Code References:**
- `packages/smart-home-agent/src/token/TokenManager.ts:1-396` - Token manager
- `packages/smart-home-agent/src/token/TokenManager.ts:62-130` - Token storage

**Code Location:** `packages/smart-home-agent/src/token/TokenManager.ts:62-130`

### Token Encryption

**Encryption:**
- AES-256 encryption for stored tokens
- Key rotation support
- Secure token retrieval

**Code References:**
- `packages/smart-home-agent/src/token/TokenManager.ts:76-87` - Token encryption
- `packages/smart-home-agent/src/token/EncryptionService.ts` - Encryption service

## Privacy & Compliance

### IoT Privacy Controller

**Privacy Validation:**
- Device connection validation
- Consent checking
- Age appropriateness
- Data minimization
- Retention policy enforcement

**Code References:**
- `packages/smart-home-agent/src/privacy/IoTPrivacyController.ts:42-103` - Privacy validation
- `packages/smart-home-agent/src/privacy/IoTPrivacyController.ts:108-200` - Consent management

**Code Location:** `packages/smart-home-agent/src/privacy/IoTPrivacyController.ts:42-103`

### Consent Management

**IoT Consent Records:**
- User consent tracking
- Parent consent for children
- Consent scope management
- Consent expiration

**Code References:**
- `packages/smart-home-agent/src/privacy/IoTPrivacyController.ts:108-200` - Consent requests
- `supabase/migrations/20240101000005_smart_home_integration.sql:17,57` - Consent records

**Database Schema:**
```sql
-- From migration 20240101000005_smart_home_integration.sql:17,57
CREATE TABLE iot_consent_records (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users,
  device_id UUID REFERENCES smart_home_devices,
  consent_type TEXT,
  parent_consent BOOLEAN DEFAULT FALSE,
  granted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);
```

**Code Location:** `supabase/migrations/20240101000005_smart_home_integration.sql:17,57`

## TAG: PRIVACY

### Child-Identifying Data Flow

**Data Sent to Philips Hue:**
- **User ID**: Not sent (only device tokens)
- **Age Information**: Not sent
- **Child Profile Data**: Not sent
- **Story Content**: Not sent
- **Lighting Commands**: Sent (brightness, color, transition time)
- **Bridge IP Address**: Stored locally, not sent to Hue cloud
- **Device Tokens**: Stored encrypted in Supabase, not sent to Hue

**Data Protection Measures:**
1. **Token Encryption**: All device tokens encrypted at rest (AES-256)
2. **No PII Transmission**: No child-identifying data sent to Philips Hue API
3. **Parental Consent Required**: Children under 13 require verified parent consent before device connection
4. **Age-Appropriate Restrictions**: COPPA-protected users have lighting restrictions (max brightness 30%, safe colors only)
5. **Data Minimization**: Only necessary lighting control data sent (brightness, color, transition)
6. **Retention Policy**: Device tokens retained only while device is connected, deleted on disconnection
7. **RLS Protection**: Device tokens protected by Row Level Security policies

**Code References:**
- `packages/smart-home-agent/src/privacy/IoTPrivacyController.ts:42-103` - Privacy validation
- `packages/smart-home-agent/src/privacy/IoTPrivacyController.ts:69-86` - Parental approval checks
- `packages/smart-home-agent/src/lighting/LightingOrchestrator.ts:72` - Age restrictions

**Compliance Status:**
- ✅ **COPPA Compliant**: No child-identifying data sent to Philips Hue
- ✅ **GDPR Compliant**: Data minimization, consent management, retention policies
- ✅ **UK Children's Code Compliant**: Privacy by default, age-appropriate design

## Configuration

### SSM Parameters

**Required Parameters:**
- `/storytailor-{ENV}/hue/client-id` - Hue OAuth client ID
- `/storytailor-{ENV}/hue/client-secret` - Hue OAuth client secret
- `/storytailor-{ENV}/hue/redirect-uri` - OAuth redirect URI

**Code References:**
- `docs/system/inventory.md:216` - SSM parameters
- `docs/system/ssm_parameters_inventory.md:95-120` - Parameter inventory

### Environment Variables

**Router Lambda:**
- `HUE_CLIENT_ID` - Hue OAuth client ID
- `HUE_CLIENT_SECRET` - Hue OAuth client secret
- `HUE_REDIRECT_URI` - OAuth redirect URI

## API Methods

### Device Discovery

**Method:** `discoverDevices()`

**Returns:** `HueBridgeInfo[]` - List of discovered bridges

**Code Location:** `packages/smart-home-agent/src/devices/PhilipsHueManager.ts:49-95`

### Device Authentication

**Method:** `authenticateDevice(config: { deviceId: string; roomId: string })`

**Returns:** `DeviceTokenData` - Authentication token data

**Code Location:** `packages/smart-home-agent/src/devices/PhilipsHueManager.ts:100-130`

### Room Lighting

**Method:** `setRoomLighting(userId: string, roomId: string, profile: LightingProfile)`

**Code Location:** `packages/smart-home-agent/src/devices/PhilipsHueManager.ts:169-223`

### Gradual Transitions

**Method:** `createGradualTransition(userId: string, roomId: string, from: LightingState, to: LightingState, duration: number)`

**Code Location:** `packages/smart-home-agent/src/devices/PhilipsHueManager.ts:228-280`

## Related Documentation

- **Smart Home Agent:** See `docs/agents/smart-home-agent.md`
- **Privacy Compliance:** See [Compliance Documentation](../compliance/README.md)
- **Platform-Agnostic Design:** See [Platform-Agnostic Smart Home Design](../development/platform-agnostic-smart-home-design.md)

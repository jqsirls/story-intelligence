# Storytailor Embed Widget - Changelog

## [2.0.0] - 2025-12-24

### 🎉 Major Release: Frankie Three-Modality Widget

**Revolutionary therapeutic widget with three distinct experiences for optimal child development and family engagement.**

### ✨ New Features

#### Three-Modality System
- **Video+Audio+Text**: Full engaged reading experience with live avatar, karaoke text, and beat illustrations
- **Audio-Only**: Simplified bedtime/car mode with voice-only interaction
- **Video-Only**: Full-screen Frankie avatar for younger children (ages 3-4)
- **Smart Auto-Detection**: Automatically selects optimal mode based on time of day, user age, and device
- **Seamless Switching**: Users can switch between modes mid-session with state preservation

#### Frankie Character Integration
- Frankie's official avatar replaces generic emoji
- Character personality traits integrated (warm: 0.9, empathetic: 0.9, whimsical: 0.7)
- Frankie's ElevenLabs voice ID configured (`kQJQj1e9P2YDvAdvp2BW`)
- Consistent character experience across all modalities

#### Live Avatar Support
- Hedra/LiveKit integration for real-time avatar video
- Avatar lip-sync with Frankie's voice
- Fallback to static avatar if live video unavailable
- Optimized for mobile and desktop

#### Enhanced Story Reading
- Beat illustrations display (4 images per story)
- Illustrations sync with story progress
- Smooth transitions between beats
- WebVTT word-level synchronization (≤5ms P90 accuracy)

#### Personalization
- "Hey Tommy! Welcome back!" personalized greetings
- Story continuity ("Dragon of Marshmallow Mountain")
- User context from session (name, age, last story)
- Adaptive welcome messages based on user status

#### Therapeutic Features
- 3-tier emotion detection integration
- Emotion-aware UI adjustments (Tier 2+)
- Therapeutic alert events (Tier 3)
- Crisis detection connected to backend

#### Smart Home Integration
- Philips Hue lighting sync during stories
- Environmental immersion
- Connected to Smart Home Agent

### 🔧 Technical Improvements

- **API Integration**: Connected to production Universal Agent (`https://api.storytailor.dev`)
- **Endpoint Updates**: Fixed all API paths to match REST API Gateway
- **Backend Orchestration**: Full 35-agent system integration
- **WebVTT Sync**: Leveraged existing ≤5ms P90 accuracy system
- **Session Management**: User context and story continuity
- **Error Handling**: Improved fallbacks and error messages

### 📦 Bundle Changes

- **Size**: 44 KB minified (increased from 38 KB)
- **New Files**: `ModalityEngine.ts`, `LiveAvatarView.ts`, `frankie-modality.css`
- **Dependencies**: Ready for LiveKit client (peer dependency)

### 🚀 Deployment

- **CDN**: CloudFront (`d1roaoxii58pco.cloudfront.net`)
- **Region**: us-east-1
- **Cache Invalidation**: Automated
- **Version**: Immutable versioned copies in S3

### 🐛 Bug Fixes

- Fixed API endpoint paths (sessions → conversations/start)
- Fixed message sending (chat/message → conversations/:id/message)
- Fixed story retrieval to handle different response formats
- Improved error handling for avatar session failures

### 📚 Documentation

- `FRANKIE_THREE_MODALITY_WIDGET_COMPLETE.md` - Complete feature documentation
- `packages/storytailor-embed/examples/production-frankie.html` - Production example
- `WEBFLOW_INTEGRATION_GUIDE.md` - Updated with new modality system
- Test scenarios for all three modalities

### 🎯 Breaking Changes

None - fully backward compatible. Widget will work with old integration code and auto-upgrade to new features.

### ⚠️ Migration Notes

**From v1.0.0 to v2.0.0**:

Old integration code will continue to work:
```javascript
StorytalorEmbed.init({
  apiKey: 'your-key',
  container: '#widget'
});
```

To enable new features, add:
```javascript
StorytalorEmbed.init({
  apiKey: 'your-key',
  container: '#widget',
  modality: { mode: 'video-audio-text', autoDetect: true },
  character: { name: 'Frankie' },
  features: { emotionTracking: true, storyContinuity: true }
});
```

---

## [1.0.0] - 2025-12-24

### Initial Release

- Basic chat interface
- Story reader with word highlighting
- Voice input/output
- Story grid/library
- Theme system (child-friendly, magical, educational)
- Offline support
- Privacy controls (COPPA mode)
- Responsive design

**Note**: v1.0.0 was not connected to production backend. v2.0.0 is the first production-ready release.


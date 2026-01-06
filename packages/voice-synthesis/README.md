# Voice Synthesis Package

Real-time empathetic voice synthesis for Storytailor's multi-agent platform, delivering studio-quality narration with sub-800ms latency for Alexa+ and web/mobile experiences.

## 🎯 Objective

Deliver **real-time empathetic storytelling** with studio-quality narration while preserving COPPA/GDPR compliance and ensuring graceful degradation across all platforms.

## 🏗️ Architecture

### Multi-Engine Strategy

1. **Primary Engine**: ElevenLabs Flash v2.5 WebSocket streaming for turns < 400 characters
2. **Fallback Engine**: Amazon Polly Neural voices when latency > 250ms or ElevenLabs fails
3. **Long-form Rendering**: ElevenLabs Multilingual v2 for final story MP3s (async)
4. **Voice Cloning**: Opt-in 15-sentence capture with signed parental consent
5. **Cost Management**: Intelligent routing based on user tier and budget limits

### Performance Targets

- **Real-time streaming**: 150ms median, 400ms p95 latency
- **Alexa compatibility**: <800ms end-to-end for voice interactions
- **Cost efficiency**: <$0.05 ARPU at 50k users
- **Availability**: 99.9% uptime with intelligent failover

## 🚀 Quick Start

### Installation

```bash
npm install @alexa-multi-agent/voice-synthesis
```

### Basic Usage

```typescript
import { VoiceService, createDefaultConfig } from '@alexa-multi-agent/voice-synthesis';
import * as winston from 'winston';

const logger = winston.createLogger({ level: 'info' });
const config = createDefaultConfig();
const voiceService = new VoiceService(config, logger);

await voiceService.initialize();

// Real-time streaming
const request = {
  text: "Once upon a time...",
  language: 'en-US',
  emotion: 'excited',
  streaming: true,
};

const chunks = [];
const result = await voiceService.stream(request, (chunk) => {
  chunks.push(chunk);
  console.log(`Received ${chunk.data.length} bytes`);
});

console.log(`Synthesis completed in ${result.latency}ms`);
```

## 📋 Configuration

### Environment Variables

```bash
# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_VOICE_ID=your_voice_id_here
ELEVENLABS_MODEL=eleven_flash_v2_5
ELEVENLABS_STABILITY=0.5
ELEVENLABS_SIMILARITY_BOOST=0.8

# AWS Polly Configuration
AWS_REGION=us-east-1
POLLY_VOICE_ID=Matthew
POLLY_ENGINE=neural

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Cost Management
DAILY_BUDGET_LIMIT=100.00
MAX_COST_PER_REQUEST=0.10

# Failover Settings
FAILOVER_LATENCY_THRESHOLD_MS=250
FAILOVER_ERROR_THRESHOLD=3
```

### Configuration Validation

```typescript
import { validateEnvironment } from '@alexa-multi-agent/voice-synthesis';

const envCheck = validateEnvironment();
if (!envCheck.valid) {
  console.error('Missing required environment variables:', envCheck.missing);
}
```

## 🎙️ Core Features

### 1. Real-time Streaming

```typescript
const streamingRequest = {
  text: "Hello, let me tell you a story!",
  language: 'en-US',
  emotion: 'happy',
  streaming: true,
  format: 'pcm',
  sampleRate: 16000,
};

const audioChunks = [];
const result = await voiceService.stream(streamingRequest, (chunk) => {
  // Process audio chunk in real-time
  audioChunks.push(chunk.data);
  
  if (chunk.isLast) {
    console.log('Streaming complete!');
  }
});
```

### 2. Long-form Generation

```typescript
const longFormRequest = {
  text: "A very long story that will be converted to a complete MP3...",
  language: 'en-US',
  emotion: 'dramatic',
  streaming: false,
  format: 'mp3',
  sampleRate: 22050,
};

const result = await voiceService.generateLongForm(longFormRequest);
console.log(`Audio URL: ${result.audioUrl}`);
console.log(`Duration: ${result.duration} seconds`);
```

### 3. Voice Cloning with Consent

```typescript
const voiceCloneManager = voiceService.getVoiceCloneManager();

// Check parental consent
const hasConsent = await voiceCloneManager.hasParentalConsent(userId);

if (hasConsent) {
  // Create voice clone with 15 audio samples
  const cloneRequest = {
    userId: 'user-123',
    parentConsentId: 'consent-456',
    audioSamples: [...base64AudioSamples], // 15 samples
    voiceName: 'Emma\'s Voice',
    description: 'Custom voice for Emma',
  };

  const voiceClone = await voiceCloneManager.createVoiceClone(cloneRequest);
  console.log(`Voice clone created: ${voiceClone.id}`);
}

// Revoke voice clone
await voiceCloneManager.revokeVoiceClone(userId, 'User requested deletion');
```

### 4. Intelligent Failover

The system automatically handles failover between engines:

```typescript
// Failover triggers:
// - WebSocket errors → immediate Polly switch
// - Rolling latency avg > 250ms → switch with cooldown
// - Error threshold exceeded → circuit breaker activation

voiceService.on('engine_switched', (data) => {
  console.log(`Switched from ${data.from} to ${data.to}: ${data.reason}`);
});

voiceService.on('failover_success', (data) => {
  console.log(`Failover successful for session: ${data.sessionId}`);
});
```

### 5. Cost Management

```typescript
// Check current budget status
const budgetStatus = await voiceService.getCostMetrics();
console.log(`Budget utilization: ${budgetStatus.budgetUtilization * 100}%`);

// Cost tracking per engine
console.log(`ElevenLabs cost: $${budgetStatus.engineBreakdown.elevenlabs}`);
console.log(`Polly cost: $${budgetStatus.engineBreakdown.polly}`);

// Automatic cost limits prevent overspend
// Requests are rejected if they would exceed daily budget
```

## 📊 Monitoring & Metrics

### Performance Metrics

```typescript
// Get recent performance data
const metrics = await voiceService.getMetrics(3600000); // Last hour

const avgLatency = metrics.reduce((sum, m) => sum + m.latency, 0) / metrics.length;
const successRate = metrics.filter(m => m.success).length / metrics.length;

console.log(`Average latency: ${avgLatency}ms`);
console.log(`Success rate: ${successRate * 100}%`);
```

### Health Monitoring

```typescript
const health = await voiceService.healthCheck();

console.log(`Overall status: ${health.status}`); // healthy, degraded, unhealthy
console.log(`ElevenLabs: ${health.engines.elevenlabs}`); // up, down, degraded
console.log(`Polly: ${health.engines.polly}`);
```

### Real-time Events

```typescript
voiceService.on('synthesis_completed', (response) => {
  console.log(`✅ ${response.engine}: ${response.latency}ms`);
});

voiceService.on('synthesis_failed', (response) => {
  console.log(`❌ Failed: ${response.error}`);
});

voiceService.on('circuit_breaker_opened', (data) => {
  console.log(`🚨 Circuit breaker opened for ${data.engine}`);
});
```

## 🔒 Security & Compliance

### COPPA/GDPR Compliance

- **Consent Management**: Parental consent required for voice cloning
- **Data Retention**: Request logs purged after 30 days
- **Encryption**: Voice samples encrypted at rest with AWS KMS
- **Audit Trail**: All operations logged for compliance

### Security Features

- **Signed URLs**: All MP3 URLs signed with 24h expiry
- **Rate Limiting**: Per-user and global rate limits
- **Input Validation**: Comprehensive text and parameter validation
- **PII Protection**: Automatic PII detection and redaction in logs

## 🎯 Device-Specific Optimizations

### Alexa Voice Devices

```typescript
const alexaRequest = {
  text: "Welcome to Storytailor!",
  streaming: true,
  format: 'pcm',
  sampleRate: 16000,
  priority: 'high', // Prioritized for voice interactions
};

// Optimized for <800ms total latency
const result = await voiceService.stream(alexaRequest, onChunk);
```

### Echo Show (Screen Devices)

```typescript
const echoShowRequest = {
  text: "Look at this beautiful illustration!",
  streaming: true,
  format: 'pcm',
  sampleRate: 16000,
  // Can include visual cues in SSML
};
```

### Mobile Apps

```typescript
const mobileRequest = {
  text: "Your story is ready for offline listening!",
  streaming: false, // Generate complete file
  format: 'mp3',
  sampleRate: 22050,
};

const result = await voiceService.generateLongForm(mobileRequest);
// Returns presigned URL for download
```

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### Load Testing

```bash
# k6 load test (100 concurrent users)
npm run test:load
```

### Integration Tests

```bash
# Test against live services
npm run test:integration
```

## 📈 Performance Benchmarks

### Latency Targets

| Scenario | Target | Typical |
|----------|--------|---------|
| Short text streaming (ElevenLabs) | <400ms p95 | ~150ms median |
| Failover to Polly | <500ms | ~300ms |
| Long-form generation | <10s | ~5s |
| Voice clone creation | <60s | ~30s |

### Cost Efficiency

| Engine | Characters | Cost | Use Case |
|--------|------------|------|----------|
| ElevenLabs Flash | 1,000 | $0.30 | Real-time streaming |
| ElevenLabs Multilingual | 1,000 | $0.30 | Long-form quality |
| Polly Neural | 1,000 | $0.016 | Cost-effective fallback |

## 🔧 Advanced Configuration

### Custom Voice Settings

```typescript
const customConfig = {
  elevenlabs: {
    stability: 0.7,        // Voice consistency (0-1)
    similarityBoost: 0.9,  // Voice similarity (0-1)
    style: 0.2,           // Style exaggeration (0-1)
    useSpeakerBoost: true, // Enhanced clarity
  },
  polly: {
    engine: 'neural',     // 'neural' or 'standard'
    voiceId: 'Matthew',   // Voice selection
    textType: 'ssml',     // Support SSML markup
  },
};
```

### SSML Support

```typescript
const ssmlRequest = {
  text: `
    <speak>
      <prosody rate="slow" pitch="low">
        Once upon a time...
      </prosody>
      <break time="1s"/>
      <emphasis level="strong">
        There was a magical kingdom!
      </emphasis>
    </speak>
  `,
  language: 'en-US',
  // SSML automatically detected and processed
};
```

## 🚨 Error Handling

### Common Error Codes

- `INVALID_REQUEST`: Malformed request parameters
- `ENGINE_UNAVAILABLE`: Service temporarily unavailable
- `QUOTA_EXCEEDED`: Daily budget or rate limit exceeded
- `VOICE_NOT_FOUND`: Invalid voice ID
- `TEXT_TOO_LONG`: Text exceeds maximum length
- `AUTHENTICATION_FAILED`: Invalid API credentials

### Error Recovery

```typescript
try {
  const result = await voiceService.stream(request, onChunk);
} catch (error) {
  if (error.code === 'QUOTA_EXCEEDED') {
    // Handle budget limit
    console.log('Daily budget exceeded, try again tomorrow');
  } else if (error.code === 'ENGINE_UNAVAILABLE') {
    // Automatic failover should handle this
    console.log('Service temporarily unavailable');
  }
}
```

## 📚 API Reference

### VoiceService

#### Methods

- `initialize()`: Initialize the service
- `shutdown()`: Graceful shutdown
- `stream(request, onChunk)`: Real-time streaming synthesis
- `generateLongForm(request)`: Async long-form generation
- `getVoiceCloneManager()`: Access voice cloning features
- `getMetrics(timeRange)`: Performance metrics
- `getCostMetrics(userId?, timeRange?)`: Cost tracking
- `healthCheck()`: Service health status

#### Events

- `synthesis_completed`: Successful synthesis
- `synthesis_failed`: Synthesis failure
- `engine_switched`: Failover occurred
- `failover_success`: Failover completed successfully
- `circuit_breaker_opened`: Circuit breaker activated

### VoiceCloneManager

#### Methods

- `createVoiceClone(request)`: Create new voice clone
- `revokeVoiceClone(userId, reason?)`: Delete voice clone
- `listVoiceClones(userId)`: List user's voice clones
- `hasParentalConsent(userId)`: Check consent status

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- GitHub Issues: [Report bugs](https://github.com/storytailor/voice-synthesis/issues)
- Documentation: [Full API docs](https://docs.storytailor.com/voice-synthesis)
- Email: support@storytailor.com

---

**Built with ❤️ for empathetic storytelling experiences**
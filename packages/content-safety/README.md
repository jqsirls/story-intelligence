# Content Safety Package

A comprehensive AI safety and content moderation system for Storytailor that provides multi-layer content filtering, bias detection and mitigation, quality assurance, and real-time monitoring.

## Features

### 🛡️ Multi-Layer Content Safety Pipeline
- **Pre-generation filters**: Sanitize prompts and assess risks before content generation
- **Post-generation validation**: Validate generated content with OpenAI moderation and custom filters
- **Real-time monitoring**: Track content safety events and trigger alerts
- **Human escalation**: Automatically escalate problematic content for human review
- **Alternative content generation**: Generate safe alternatives for flagged content

### 🎯 Bias Detection and Mitigation
- **Demographic bias detection**: Identify racial, ethnic, and age-based stereotypes
- **Gender bias detection**: Detect gender stereotypes and gendered language
- **Cultural bias detection**: Identify cultural superiority and othering language
- **Ability bias detection**: Detect ableist language and disability stereotypes
- **Socioeconomic bias detection**: Identify class-based stereotypes
- **Automatic bias mitigation**: Generate corrected content with bias removed

### 📊 Quality Assurance System
- **Narrative coherence scoring**: Assess story structure and logical flow
- **Age-appropriateness assessment**: Evaluate content suitability for target age
- **Educational value measurement**: Score learning objectives and positive values
- **Emotional resonance scoring**: Assess emotional engagement and character development
- **Creativity index measurement**: Evaluate originality and imaginative elements
- **Parent rating prediction**: Predict parent satisfaction ratings

## Installation

```bash
npm install @alexa-multi-agent/content-safety
```

## Quick Start

```typescript
import { ContentSafetyPipeline } from '@alexa-multi-agent/content-safety';

const config = {
  openaiApiKey: 'your-openai-key',
  supabaseUrl: 'your-supabase-url',
  supabaseKey: 'your-supabase-key',
  redisUrl: 'redis://localhost:6379',
  logLevel: 'info',
  biasDetectionEnabled: true,
  realTimeMonitoringEnabled: true,
  alternativeContentGeneration: true
};

const pipeline = new ContentSafetyPipeline(config);
await pipeline.initialize();

// Process content through the safety pipeline
const request = {
  content: 'Tell me a story about a brave character',
  contentType: 'story',
  userAge: 8,
  metadata: {
    timestamp: new Date().toISOString(),
    source: 'user_request',
    requestId: 'req_123'
  }
};

const result = await pipeline.processContent(request);

if (result.approved) {
  console.log('Content approved:', result.alternativeContent || request.content);
} else {
  console.log('Content rejected:', result.flaggedCategories);
}
```

## Architecture

### Pre-Generation Filters
1. **Prompt Sanitization Filter** - Removes injection attempts and unsafe patterns
2. **Risk Assessment Filter** - Evaluates content complexity and potential risks
3. **Age Appropriateness Filter** - Checks vocabulary and theme suitability
4. **Profanity Filter** - Detects and removes inappropriate language
5. **Personal Info Filter** - Identifies and removes PII

### Post-Generation Validators
- OpenAI moderation API integration
- Custom content validation rules
- Age-specific content checks

### Bias Detection Engine
- Multi-category bias analysis
- Representation analysis for characters and themes
- Severity scoring and correction suggestions

### Quality Assurance Engine
- Narrative structure analysis
- Educational value assessment
- Emotional resonance measurement
- Creativity evaluation
- Parent satisfaction prediction

## Configuration

```typescript
interface ContentSafetyConfig {
  openaiApiKey: string;
  supabaseUrl: string;
  supabaseKey: string;
  redisUrl: string;
  logLevel: string;
  humanModerationWebhook?: string;
  biasDetectionEnabled: boolean;
  realTimeMonitoringEnabled: boolean;
  alternativeContentGeneration: boolean;
}
```

## API Reference

### ContentSafetyPipeline

#### `processContent(request: ContentSafetyRequest): Promise<ContentSafetyResult>`
Process content through the complete safety pipeline.

#### `sanitizePrompt(request: ContentSafetyRequest): Promise<{ sanitizedPrompt: string; riskAssessment: any }>`
Sanitize prompts before content generation.

#### `batchProcessContent(requests: ContentSafetyRequest[]): Promise<ContentSafetyResult[]>`
Process multiple content pieces in batch.

#### `getMetrics(): ContentModerationMetrics`
Get current moderation metrics and statistics.

#### `healthCheck(): Promise<{ status: string; services: any; timestamp: string }>`
Check the health of all pipeline services.

### BiasDetectionEngine

#### `detectBias(content: string, request: ContentSafetyRequest): Promise<BiasDetectionResult>`
Detect various types of bias in content.

### BiasMitigationEngine

#### `mitigateBias(content: string, biasResult: BiasDetectionResult, request: ContentSafetyRequest): Promise<BiasMitigationResult>`
Generate bias-free alternative content.

### QualityAssuranceEngine

#### `assessQuality(content: string, request: ContentSafetyRequest): Promise<QualityAssessmentResult>`
Comprehensive quality assessment of content.

## Monitoring and Alerts

The system provides real-time monitoring with automatic escalation:

- **Event Logging**: All content processing events are logged
- **Alert Triggers**: High-risk content triggers immediate alerts
- **Human Escalation**: Critical issues are escalated to human moderators
- **Metrics Dashboard**: Real-time statistics and trends

## Testing

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support and questions, please contact the development team or create an issue in the repository.
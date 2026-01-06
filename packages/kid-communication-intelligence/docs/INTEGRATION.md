# Kid Communication Intelligence - Integration Guide

## Overview

This guide explains how to integrate the Kid Communication Intelligence System into your application or service.

## Prerequisites

- Node.js 18+ or TypeScript 4.5+
- Access to AWS SSM Parameter Store (for feature flags)
- Existing Universal Agent setup

## Installation

```bash
npm install @alexa-multi-agent/kid-communication-intelligence
```

## Basic Integration

### 1. Initialize the Service

```typescript
import { KidCommunicationIntelligenceService } from '@alexa-multi-agent/kid-communication-intelligence';

const kidIntelligence = new KidCommunicationIntelligenceService({
  enableAudioPreprocessing: true,
  enableTranscriptionEnhancement: true,
  enableMultimodalProcessing: true,
});
```

### 2. Enable via Feature Flag

Set the feature flag in AWS SSM Parameter Store:

```bash
# For production
aws ssm put-parameter \
  --name "/storytailor-production/ENABLE_KID_INTELLIGENCE" \
  --value "true" \
  --type "String" \
  --region us-east-2

# For staging
aws ssm put-parameter \
  --name "/storytailor-staging/ENABLE_KID_INTELLIGENCE" \
  --value "true" \
  --type "String" \
  --region us-east-2
```

### 3. Integrate with Universal Agent

The system is already integrated into the Universal Agent. To enable:

1. **Set the feature flag** (see above)
2. **Deploy the Universal Agent**:
   ```bash
   ./scripts/deploy-universal-agent-proper.sh production
   ```

The system will automatically initialize if the feature flag is enabled.

## Advanced Integration

### Custom Initialization

```typescript
import { KidCommunicationIntelligenceService } from '@alexa-multi-agent/kid-communication-intelligence';

const kidIntelligence = new KidCommunicationIntelligenceService({
  enableAudioPreprocessing: true,
  enableTranscriptionEnhancement: true,
  enableMultimodalProcessing: true,
  // Custom configuration
  audioConfig: {
    targetSampleRate: 16000,
    spectralModification: true,
  },
  transcriptionConfig: {
    multiPassRefinement: true,
    fallbackToWhisper: true,
  },
});

// Check if service is available
if (kidIntelligence.isAvailable()) {
  // Use the service
}
```

### Integration with UserInputEdgeCaseHandler

```typescript
import { UserInputEdgeCaseHandler } from './edge-cases/UserInputEdgeCaseHandler';
import { KidCommunicationIntelligenceService } from '@alexa-multi-agent/kid-communication-intelligence';

const kidIntelligence = new KidCommunicationIntelligenceService({...});
const edgeCaseHandler = new UserInputEdgeCaseHandler(config);

// Inject Kid Intelligence
edgeCaseHandler.setKidIntelligence(kidIntelligence);

// Process input
const result = await edgeCaseHandler.processNonStandardLanguage(
  userInput,
  context
);
```

### Integration with EdgeCaseOrchestrator

```typescript
import { EdgeCaseOrchestrator } from './edge-cases/EdgeCaseOrchestrator';
import { KidCommunicationIntelligenceService } from '@alexa-multi-agent/kid-communication-intelligence';

const kidIntelligence = new KidCommunicationIntelligenceService({...});
const orchestrator = new EdgeCaseOrchestrator(config);

// Inject Kid Intelligence
orchestrator.setKidIntelligence(kidIntelligence);
```

## API Integration

### Audio Transcription Enhancement

```typescript
const audioInput = {
  data: audioBuffer, // Buffer or ArrayBuffer
  sampleRate: 16000,
  format: 'pcm',
};

const childProfile = {
  age: 5,
  previousInteractions: [],
  developmentalStage: 'preschool',
};

// Preprocess audio
const preprocessedAudio = await kidIntelligence.preprocessAudio(
  audioInput,
  childProfile
);

// Enhance transcription
const enhancedTranscription = await kidIntelligence.enhanceTranscription(
  preprocessedAudio,
  childProfile
);
```

### Invented Word Detection

```typescript
const inventedWordIntelligence = kidIntelligence.getInventedWordIntelligence();

const result = await inventedWordIntelligence.inferInventedWord(
  'I want a flibberflop',
  {
    age: 4,
    storyContext: 'magical creatures',
  }
);

if (result.isInvented) {
  console.log(`Detected invented word: ${result.word}`);
  console.log(`Inferred meaning: ${result.inferredMeaning}`);
}
```

### Non-linear Logic Interpretation

```typescript
const logicInterpreter = kidIntelligence.getChildLogicInterpreter();

const result = await logicInterpreter.interpretChildLogic(
  'The dragon... wait, can I have ice cream?',
  {
    age: 6,
    conversationHistory: [...],
  }
);

if (result.hasTopicJump) {
  console.log(`Topic jump detected: ${result.topicJump.from} -> ${result.topicJump.to}`);
}
```

## Configuration

### Environment Variables

```bash
# Feature flag (required)
ENABLE_KID_INTELLIGENCE=true

# Optional: Custom configuration
KID_INTELLIGENCE_AUDIO_SAMPLE_RATE=16000
KID_INTELLIGENCE_ENABLE_MULTIMODAL=true
```

### Feature Flag Configuration

The system checks for the feature flag in this order:

1. `process.env.ENABLE_KID_INTELLIGENCE`
2. AWS SSM Parameter Store: `/storytailor-{environment}/ENABLE_KID_INTELLIGENCE`
3. Default: `false` (disabled)

## Testing

### Unit Tests

```bash
cd tests/kid-communication-intelligence
npm test
```

### Integration Tests

```bash
cd tests/kid-communication-intelligence
npm run test:integration
```

### Simulation Tests

```bash
cd tests/kid-communication-intelligence
npm run test:simulation
```

## Monitoring

### CloudWatch Metrics

The system logs to CloudWatch with these metrics:

- `kid_intelligence.audio_preprocessing.duration`
- `kid_intelligence.transcription_enhancement.duration`
- `kid_intelligence.invented_word_detections`
- `kid_intelligence.confidence_scores`

### Logging

Enable debug logging:

```typescript
process.env.DEBUG = 'kid-intelligence:*';
```

## Troubleshooting

### Service Not Initializing

1. Check feature flag: `ENABLE_KID_INTELLIGENCE=true`
2. Verify SSM parameter exists:
   ```bash
   aws ssm get-parameter --name "/storytailor-production/ENABLE_KID_INTELLIGENCE"
   ```
3. Check CloudWatch logs for initialization errors

### Transcription Not Enhanced

1. Verify audio format is supported (PCM, 16kHz recommended)
2. Check that `enableTranscriptionEnhancement` is `true`
3. Review CloudWatch logs for transcription errors

### Performance Issues

1. Check Lambda memory allocation (512MB+ recommended)
2. Review CloudWatch metrics for bottlenecks
3. Consider disabling unused components

## Best Practices

1. **Gradual Rollout**: Enable feature flag for a subset of users first
2. **Monitor Metrics**: Track performance and accuracy metrics
3. **Error Handling**: Always handle errors gracefully
4. **Testing**: Test with real child speech samples
5. **Documentation**: Document any custom configurations

## Support

For issues or questions:
- Check CloudWatch logs
- Review test suite for examples
- Consult API reference documentation


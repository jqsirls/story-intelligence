# Emotion Agent - Deployment and Location

**Status**: Draft  
**Audience**: Engineering | DevOps  
**Last Updated**: 2025-12-13

## Where It's Deployed

### Production Lambda Function
- **Function Name**: `storytailor-emotion-agent-production`
- **Region**: us-east-1 (US East - N. Virginia)
- **Runtime**: nodejs22.x
- **Memory**: 512 MB
- **Timeout**: 60 seconds
- **Last Modified**: 2025-12-08

**Code References:**
- `docs/system/deployment_inventory.md:37` - Production function details
- `docs/PRODUCTION_STATE_VERIFICATION.md` - Production verification

### Function URL
- **Status**: Not configured
- **Invocation Method**: Lambda invoke (direct) or via Universal Agent
- **Note**: Typically invoked via Universal Agent or Router

## Where the Code Lives

### Source Code
- **Package**: `packages/emotion-agent/`
- **Main File**: `packages/emotion-agent/src/EmotionAgent.ts`
- **Services**:
  - `packages/emotion-agent/src/services/DailyCheckinService.ts`
  - `packages/emotion-agent/src/services/EmotionDetectionService.ts`
  - `packages/emotion-agent/src/services/PatternAnalysisService.ts`
  - `packages/emotion-agent/src/services/VoicePatternAnalyzer.ts`
  - `packages/emotion-agent/src/services/ResponseLatencyAnalyzer.ts`
  - `packages/emotion-agent/src/services/StoryChoicePatternAnalyzer.ts`
  - `packages/emotion-agent/src/services/LongitudinalTrendTracker.ts`
  - `packages/emotion-agent/src/services/EarlyInterventionDetector.ts`
  - `packages/emotion-agent/src/services/MoodBasedStoryRecommendationEngine.ts`
  - `packages/emotion-agent/src/services/CrisisEscalationProtocol.ts`
- **Types**: `packages/emotion-agent/src/types.ts`

### Deployment Code
- **Deployment Script**: `scripts/deploy-emotion-agent.sh` (if exists)
- **Build Output**: `packages/emotion-agent/dist/`

**Code References:**
- `packages/emotion-agent/README.md` - Package documentation

## Where Documentation Exists

### Primary Documentation
- **Agent Documentation**: `docs/agents/emotion-agent/` (this directory)
- **Package README**: `packages/emotion-agent/README.md`
- **Agentic UX**: `docs/agents/emotion-agent.md`

## Where to Find Logs

### CloudWatch Logs
- **Log Group**: `/aws/lambda/storytailor-emotion-agent-production`
- **Region**: us-east-1
- **Access**: AWS Console → CloudWatch → Log Groups

## Where to Monitor Metrics

### CloudWatch Metrics
- **Namespace**: `AWS/Lambda`
- **Function**: `storytailor-emotion-agent-production`
- **Key Metrics**:
  - Invocations
  - Duration
  - Errors
  - Throttles

## Where Configuration Lives

### Environment Variables
- **SSM Parameter Store**: `/storytailor/production/supabase/url`
- **SSM Parameter Store**: `/storytailor/production/supabase/service-key`
- **SSM Parameter Store**: `/storytailor/production/redis/url` (optional)

**Code References:**
- `docs/system/ssm_parameters_inventory.md` - SSM parameters

## Where to Test

### Local Testing
```bash
cd packages/emotion-agent
npm test
npm run example
```


# Content Agent - Cost and Economics

**Status**: Draft  
**Audience**: Finance | Engineering  
**Last Updated**: 2025-12-11

## Cost Per Operation

### Story Generation Cost

**Text Generation (GPT-5.1):**
- **Free Tier**: GPT-5.1-mini
  - Cost: ~$0.01-0.02 per story
  - Usage: Story generation, character creation
- **Paid Tiers**: GPT-5.1
  - Cost: ~$0.05-0.10 per story
  - Usage: Premium story generation

**Code References:**
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:31,45,52,59,66` - Model selection by tier
- `docs/business/unit-economics.md:24-34` - Text generation costs

### Image Generation Cost

**Model**: gpt-image-1 (from SSM `/storytailor-production/openai/model-image`)

**Free Tier**:
- **Images per Story**: 2
- **Cost per Image**: ~$0.02-0.04
- **Cost per Story**: ~$0.04-0.08

**Paid Tiers**:
- **Images per Story**: 5
- **Cost per Image**: ~$0.02-0.04
- **Cost per Story**: ~$0.10-0.20

**Code References:**
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:32,46,53,60,67` - Image count by tier
- `packages/content-agent/src/services/ArtGenerationService.ts:504` - Image generation
- `docs/business/unit-economics.md:35-42` - Image generation costs

### Voice Synthesis Cost

**AWS Polly (Free Tier):**
- **Cost**: ~$0.004 per 1,000 characters
- **Average Story**: ~5,000 characters
- **Cost per Story**: ~$0.02

**ElevenLabs (Paid Tiers):**
- **Cost**: ~$0.18 per 1,000 characters (Creator plan)
- **Average Story**: ~$0.90 per story

**Code References:**
- `lambda-deployments/content-agent/src/services/TierQualityService.ts:33,47,54,61,68` - Audio provider by tier
- `docs/business/unit-economics.md:51-64` - Voice synthesis costs

### Video Generation Cost

**Model**: sora-2 (from SSM `/storytailor-production/openai/model-video`)
- **Cost**: ~$0.50-1.00 per video (estimated)
- **Usage**: Premium feature, add-on purchase

**Code References:**
- `docs/system/ssm_parameters_inventory.md:55` - Video model parameter
- `docs/business/unit-economics.md:44-49` - Video generation costs

### Agent Coordination Costs

**Emotion Agent Call**: ~$0.001-0.002 (if called)
**Personality Agent Call**: ~$0.001-0.002 (if called)
**Child Safety Agent Call**: ~$0.001-0.002 (if called)
**Localization Agent Call**: ~$0.001-0.002 (if called)

**Total Coordination Cost**: ~$0.004-0.008 per story (if all agents called)

### Infrastructure Costs

**Lambda Execution:**
- **Memory**: 1024 MB
- **Timeout**: 300 seconds
- **Average Execution**: ~30-60 seconds per story
- **Cost**: ~$0.0005-0.001 per story

**Code References:**
- `docs/system/deployment_inventory.md:39` - Content Agent Lambda configuration
- `docs/business/unit-economics.md:68-71` - Lambda costs

## Total Cost Per Story

### Free Tier
- GPT-5.1-mini: ~$0.01-0.02
- Images (2): ~$0.04-0.08
- Voice (Polly): ~$0.02
- Infrastructure: ~$0.001
- **Total**: ~$0.07-0.12 per story

**Code References:**
- `docs/business/unit-economics.md:105-113` - Free tier cost breakdown

### Paid Tiers
- GPT-5.1: ~$0.05-0.10
- Images (5): ~$0.10-0.20
- Voice (ElevenLabs): ~$0.90
- Infrastructure: ~$0.001
- Agent Coordination: ~$0.004-0.008
- **Total**: ~$1.05-1.12 per story

**Code References:**
- `docs/business/unit-economics.md:115-123` - Paid tier cost breakdown

## Cost Optimization Strategies

1. **Caching**: Cache story templates and character profiles
2. **Batch Processing**: Generate multiple assets in parallel
3. **Model Selection**: Use GPT-5.1-mini for free tier
4. **Image Optimization**: Limit image count for free tier
5. **Voice Selection**: Use Polly for free tier, ElevenLabs for paid

**Code References:**
- `lambda-deployments/content-agent/src/services/TierQualityService.ts` - Tier-based optimization

## Unit Economics

### Cost Per User Session
- **Average Stories per Session**: 1-2 stories
- **Content Agent Cost per Session**: ~$0.07-0.12 (free) or ~$1.05-1.12 (paid)

### Scaling Cost Projections

**At 1,000 Stories/Day:**
- **Free Tier**: ~$70-120/day
- **Paid Tiers**: ~$1,050-1,120/day
- **Monthly Cost**: ~$2,100-3,600 (free) or ~$31,500-33,600 (paid)

**At 10,000 Stories/Day:**
- **Free Tier**: ~$700-1,200/day
- **Paid Tiers**: ~$10,500-11,200/day
- **Monthly Cost**: ~$21,000-36,000 (free) or ~$315,000-336,000 (paid)

**Note**: Costs scale linearly with usage. Content Agent is the largest cost driver in the platform.

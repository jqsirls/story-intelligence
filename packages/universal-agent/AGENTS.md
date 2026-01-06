# Universal Agent - AGENTS.md

**Channel-agnostic orchestrator** for multi-agent system integration.

## Overview

Universal Agent provides a unified interface across all channels (Alexa, Web, Mobile, A2A) and orchestrates communication between specialized agents.

## Critical Deployment Pattern

**ALWAYS use the proper deployment script**:
```bash
./scripts/deploy-universal-agent-proper.sh production
```

**NEVER** use generic commands like `aws lambda update-function-code` directly.

## Module Bundling Gotchas (CRITICAL)

### Router Module Resolution

**Problem**: Router bundled to both `node_modules/@alexa-multi-agent/router` AND `dist/router/`

**CRITICAL**: `dist/router/package.json` is REMOVED during deployment to prevent Node.js from treating it as a package during direct file requires.

**Why**: Prevents "Cannot find module '@alexa-multi-agent/router'" errors in Lambda.

### Voice Synthesis Bundling

**Requirement**: Voice synthesis must be bundled to `node_modules/@alexa-multi-agent/voice-synthesis/dist/`

**Also copied**: `dist/voice-synthesis/` as fallback for direct require paths

**Config required**: VoiceService needs full config with ALL environment variables (elevenlabs, polly, failover, cost, redis)

### Workspace Dependencies Build Order

**MUST build in this order**:
1. `shared-types` (must build first)
2. `voice-synthesis` (required for WebVTT service)
3. `router` (required for orchestration)
4. `universal-agent` (builds last)

**Deployment script handles this automatically** - don't try to optimize.

## Environment Variables

Required in SSM Parameter Store:
- `/{prefix}/supabase/url`
- `/{prefix}/supabase/service-key`
- `/{prefix}/redis-url`
- `/{prefix}/openai-api-key`
- `/{prefix}/elevenlabs-api-key`

**Deployment script reads from SSM** - ensure parameters exist before deploying.

## Common Issues

**"Cannot find module '@alexa-multi-agent/router'"**:
- Check router was built: `cd packages/router && npm run build`
- Verify `dist/router/package.json` removed by deployment script
- Check files in `node_modules/@alexa-multi-agent/router/dist/`

**"Voice synthesis not available"**:
- Verify voice-synthesis built: `cd packages/voice-synthesis && npm run build`
- Check files exist in deployment package
- Verify VoiceService config has ALL required fields

**Module resolution errors**:
- Ensure `package.json` files have correct `main` field pointing to `dist/`
- Check `type: "commonjs"` set in bundled package.json
- Verify no conflicting `package.json` in `dist/` directories

## Testing

**Unit tests**: Run from packages directory
```bash
cd packages/universal-agent
npm test
```

**Integration**: Handled at root level

## Documentation

**Architecture**: `docs/agents/universal-agent/`
**Deployment**: See root `AGENTS.md` deployment section

---

**Version**: 1.0  
**Last Updated**: December 22, 2025  
**For**: packages/universal-agent

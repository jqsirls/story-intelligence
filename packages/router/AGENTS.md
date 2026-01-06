# Router - AGENTS.md

**Intent classification and delegation orchestrator** for multi-agent system.

## Overview

Router analyzes user input and delegates to appropriate specialized agents.

## Critical Dependency: Redis

**Router REQUIRES Redis connection** - will not initialize without it.

**Before development**:
```bash
npm run redis:start
```

**Connection**: 
- Host: 127.0.0.1 (local) or from environment
- Port: 6379 (default)
- Key prefix: `storytailor:`

## Initialization Timeout

**Router has 5-second initialization timeout**.

If Redis not available:
- Initialization fails
- System cannot start
- Error: "Redis connection timeout"

**Fix**: Ensure Redis running before starting router.

## Build Requirements

**Router must build BEFORE universal-agent**:
```bash
# Correct order
cd packages/router && npm run build
cd ../universal-agent && npm run build
```

**Why**: Universal agent depends on router, Turbo handles this automatically via `dependsOn` in `turbo.json`.

## Testing

```bash
cd packages/router
npm test
```

**Smoke tests**: 
```bash
npm run test:smoke
```

## Module Bundling for Lambda

When deploying universal-agent:
- Router bundled to `node_modules/@alexa-multi-agent/router`
- `dist/router/package.json` removed (prevents module resolution issues)
- Only `node_modules/@alexa-multi-agent/router/package.json` exists

**Handled by deployment script** - don't modify manually.

## Documentation

**Architecture**: `docs/agents/router/`
**Testing**: See root `AGENTS.md` testing section

---

**Version**: 1.0  
**Last Updated**: December 22, 2025  
**For**: packages/router

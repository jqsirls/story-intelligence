# Structure Proposal

**Last Updated**: 2025-12-13

## Ideal Folder Structure

```
/
├── .github/                    # CI/CD configuration
│   ├── workflows/              # GitHub Actions workflows
│   ├── ISSUE_TEMPLATE/         # Issue templates (to create)
│   └── PULL_REQUEST_TEMPLATE.md # PR template (to create)
├── _quarantine/                # Files pending review (temporary)
│   ├── root-disposable-artifacts/
│   ├── packages/
│   ├── directories/
│   └── MANIFEST.md
├── _archive/                   # Archived files (if needed)
├── docs/                       # Canonical documentation
│   ├── README.md               # Docs index
│   ├── WHAT_THIS_IS.md         # Product overview ✅
│   ├── MENTAL_MODEL.md         # Architecture ✅
│   ├── HOW_WE_WORK.md          # Workflow ✅
│   ├── NAMING.md               # Conventions ✅
│   ├── OWNERSHIP.md             # Ownership ✅
│   ├── DECISIONS.md             # Decision log ✅
│   ├── MULTI_LENS_AUDIT.md     # Audit findings ✅
│   ├── FILE_ACTION_LIST.md     # Action list ✅
│   ├── STRUCTURE_PROPOSAL.md   # This file ✅
│   ├── agents/                 # Agent documentation
│   ├── api-reference/          # API documentation
│   ├── compliance/             # Compliance docs
│   ├── deployment/              # Deployment guides
│   ├── system/                 # System architecture
│   └── ...                     # Other existing docs
├── packages/                    # Monorepo packages
│   ├── shared-types/           # Shared TypeScript types
│   ├── router/                 # Intent classification
│   ├── universal-agent/        # Main conversation agent
│   ├── auth-agent/             # Authentication
│   ├── content-agent/          # Content generation
│   ├── library-agent/          # Library management
│   ├── emotion-agent/          # Emotion tracking
│   ├── commerce-agent/         # Billing
│   ├── insights-agent/         # Analytics
│   ├── child-safety-agent/     # Safety monitoring
│   ├── knowledge-base-agent/   # Platform guidance
│   ├── voice-synthesis/        # Voice services
│   ├── security-framework/      # Security utilities
│   ├── testing/                # Test utilities
│   ├── monitoring/             # Monitoring (audit needed)
│   ├── health-monitoring/      # Health checks (audit needed)
│   ├── web-sdk/                # Web SDK
│   ├── mobile-sdk-ios/         # iOS SDK
│   ├── mobile-sdk-android/    # Android SDK
│   └── mobile-sdk-react-native/ # React Native SDK
├── scripts/                     # Deployment and utility scripts
│   ├── deploy-*.sh             # Deployment scripts
│   ├── test-*.sh               # Test scripts
│   └── generate-*.sh           # Utility scripts
├── supabase/                    # Database
│   ├── migrations/             # Database migrations
│   └── config.toml             # Supabase config
├── infrastructure/              # Infrastructure as Code
│   ├── *.tf                    # Terraform files
│   └── *.tfvars                # Terraform variables
├── testing/                      # Test utilities
│   ├── ai-integration/         # AI integration tests
│   └── ...                     # Other test utilities
├── lambda-deployments/          # Lambda handler code
├── experiments/                 # Experimental features (to create)
│   └── EXPERIMENT.md            # Experiment template (to create)
├── README.md                    # Main README
├── AGENTS.md                    # AI agent guide
├── package.json                 # Root package.json
└── turbo.json                   # Turbo configuration
```

## Module Boundaries

### Core Agents

**Purpose**: Handle specific domains of functionality

**Packages**:
- `router/` - Intent classification and routing
- `universal-agent/` - Main conversation agent
- `auth-agent/` - Authentication and account linking
- `content-agent/` - Story and character generation
- `library-agent/` - Library management with RLS
- `emotion-agent/` - Emotion tracking and analysis
- `commerce-agent/` - Subscription and billing
- `insights-agent/` - Pattern analysis
- `child-safety-agent/` - Safety monitoring
- `knowledge-base-agent/` - Platform guidance

**Boundaries**:
- Each agent is independent and can be deployed separately
- Agents communicate via gRPC or events
- No direct dependencies between agents (only via shared-types)

### Supporting Services

**Purpose**: Provide shared functionality

**Packages**:
- `shared-types/` - Shared TypeScript types and gRPC schemas
- `voice-synthesis/` - Voice synthesis services
- `security-framework/` - Security utilities
- `testing/` - Test utilities and helpers
- `monitoring/` - Monitoring services (⚠️ audit needed)
- `health-monitoring/` - Health check services (⚠️ audit needed)

**Boundaries**:
- Can be used by multiple agents
- Should have minimal dependencies
- Should be well-tested and documented

### SDKs

**Purpose**: Client libraries for integration

**Packages**:
- `web-sdk/` - Web/JavaScript SDK
- `mobile-sdk-ios/` - iOS SDK
- `mobile-sdk-android/` - Android SDK
- `mobile-sdk-react-native/` - React Native SDK

**Boundaries**:
- Independent of agent implementation
- Use REST APIs or WebSockets
- Should be platform-native where possible

### Infrastructure

**Purpose**: Deployment and infrastructure

**Directories**:
- `supabase/` - Database schema and migrations
- `infrastructure/` - Terraform configurations
- `lambda-deployments/` - Lambda handler code
- `scripts/` - Deployment and utility scripts

**Boundaries**:
- Infrastructure code is separate from application code
- Scripts should be idempotent and well-documented

## Shared Libraries

### Current Shared Libraries

1. **`packages/shared-types/`**
   - TypeScript types
   - gRPC protocol definitions
   - Shared interfaces

2. **`packages/testing/`**
   - Test utilities
   - Mock helpers
   - Test fixtures

3. **`packages/security-framework/`**
   - Security utilities
   - PII handling
   - Encryption helpers

### Potential Consolidations

1. **`monitoring/` vs `health-monitoring/`**
   - **Action**: Audit both packages
   - **Decision**: Consolidate if duplicate, keep separate if different purposes
   - **Risk**: MED (may break imports)

## Experiments Directory

### Purpose

Directory for experimental features that may or may not make it into production.

### Structure

```
experiments/
├── README.md                   # Experiments policy
├── <experiment-name>/
│   ├── EXPERIMENT.md           # Experiment documentation
│   ├── src/                    # Experiment code
│   └── tests/                  # Experiment tests
└── .gitignore                  # Ignore experiment outputs
```

### Experiment Template

Each experiment should have an `EXPERIMENT.md` file with:

- **Purpose**: What problem does this solve?
- **Hypothesis**: What do we expect to learn?
- **Success Criteria**: How do we measure success?
- **Sunset Date**: When should this be removed if not successful?
- **Migration Path**: How to migrate if successful?

### Sunset Process

1. **Before sunset date**: Review experiment
2. **If successful**: Migrate to appropriate package
3. **If unsuccessful**: Archive or delete
4. **Auto-archive**: Script to archive experiments past sunset date

## Migration Plan

### Phase 1: Create Structure (Week 1)

1. Create `experiments/` directory
2. Create experiment template
3. Move experimental code to experiments (if any)

### Phase 2: Consolidate Packages (Week 2-3)

1. Audit `monitoring/` vs `health-monitoring/`
2. Consolidate if duplicate
3. Update all imports

### Phase 3: Clean Up Root (Week 3-4)

1. Move numbered folders to docs/
2. Delete disposable directories
3. Update all references

### Phase 4: Documentation Consolidation (Week 4+)

1. Merge duplicate documentation directories
2. Update all cross-references
3. Verify no broken links

## Validation

### After Migration

1. **Build**: `npm run build` - Should still work
2. **Tests**: `npm run test` - All tests should pass
3. **Type Check**: `npm run type-check` - No type errors
4. **Links**: Verify no broken documentation links
5. **Imports**: Verify no broken imports

### Success Criteria

- ✅ All builds pass
- ✅ All tests pass
- ✅ No broken links
- ✅ No broken imports
- ✅ Documentation is findable (< 2 minutes to find any doc)
- ✅ Root directory has < 20 markdown files

## Related Documentation

- [File Action List](./FILE_ACTION_LIST.md) - Detailed action list
- [How We Work](./HOW_WE_WORK.md) - Development workflow
- [Mental Model](./MENTAL_MODEL.md) - System architecture

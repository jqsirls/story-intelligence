# PROJECT_MAP.md

**Last Updated**: 2025-12-14  
**Purpose**: Navigation guide and file placement rules to prevent duplicates and misplaced files

## Purpose

This repository is a production-ready TypeScript monorepo implementing a hub-and-spoke multi-agent architecture for personalized storytelling experiences for children. The system uses Turbo for build orchestration, deploys to AWS Lambda functions in us-east-1, and integrates with Supabase (PostgreSQL) for data persistence and Redis for conversation state caching. All source code lives in `packages/*`, deployment scripts in `scripts/`, and canonical documentation in `docs/`. The architecture follows a strict separation: business logic in `packages/`, Lambda-specific handlers in `lambda-deployments/`, and all documentation standardized in `docs/` with kebab-case naming for subdirectories.

## Quick Start Navigation

- **Adding a new agent**: Create `packages/<agent-name>/src/` with `index.ts`, add to workspace in root `package.json`
- **Adding a new test**: Unit tests go in `packages/<package>/src/__tests__/`, integration tests in `testing/ai-integration/` or `testing/e2e/`
- **Adding a database migration**: Create timestamped SQL file in `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
- **Adding deployment script**: Create `scripts/deploy-<agent-name>.sh` following pattern from `scripts/deploy-universal-agent-proper.sh`
- **Adding documentation**: Place in `docs/` - UPPERCASE for root canonical docs, kebab-case for subdirectory docs
- **Adding shared types**: Add to `packages/shared-types/src/types/` and export from `packages/shared-types/src/index.ts`
- **Adding API contract**: Update `packages/api-contract/src/schemas/storytailor-api.yaml` and regenerate types
- **Adding infrastructure**: Terraform configs go in `infrastructure/terraform/`
- **Adding example code**: Place in `examples/` directory
- **Adding a script**: Utility scripts go in `scripts/` directory

## Top-Level Map

| Directory/File | Contains | When to Add Something Here |
|----------------|----------|---------------------------|
| `packages/` | **ALL SOURCE CODE** - Agent packages, services, SDKs, shared utilities | When creating any new TypeScript/JavaScript source code |
| `lambda-deployments/` | Lambda-specific handlers and deployment code (AWS SDK v2 fallbacks, SSM loading) | When creating Lambda-specific handler code that differs from source packages |
| `docs/` | **CANONICAL DOCUMENTATION** - All documentation files | When creating any documentation (UPPERCASE for root, kebab-case for subdirs) |
| `scripts/` | Deployment scripts, utility scripts, test runners | When creating deployment scripts or utility bash/Node.js scripts |
| `supabase/` | Database migrations, schema files, Supabase config | When creating database migrations or modifying schema |
| `infrastructure/` | Terraform configurations for AWS infrastructure | When creating or modifying infrastructure-as-code |
| `testing/` | Integration tests, E2E tests, load tests, security tests | When creating integration/E2E tests or test infrastructure |
| `tests/` | Test setup files and some test utilities | When creating global test setup or test configuration |
| `examples/` | Example code, HTML demos, integration examples | When creating example implementations or demos |
| `api/` | OpenAPI specification files | When updating API contract specifications |
| `examples/` | Example code and demos | When creating example implementations |
| `.github/` | GitHub Actions workflows, CI/CD configs | When creating or modifying CI/CD pipelines |
| `.kiro/` | Design specifications and requirements | When creating design specs or requirements docs |
| `agentic-ux/` | **LEGACY DOCUMENTATION** - Duplicate of `docs/`, should be removed | **DO NOT ADD HERE** - Use `docs/` instead |
| `docs-site/` | **GENERATED** - Docusaurus site build output | **DO NOT EDIT** - Generated from `docs/` |
| `_quarantine/` | Files pending review before deletion | Temporary staging area for cleanup |
| `logo/` | Logo and brand assets | When adding brand assets |
| `personality/` | Personality configuration files | When adding personality YAML configs |
| `Prompts/` | PDF prompt documentation | When adding prompt documentation PDFs |
| `runbooks/` | Operational runbooks | When creating operational procedures |
| `qa-orchestrator/` | QA orchestration scripts | When creating QA automation scripts |
| `release-remediation/` | Release remediation scripts | When creating release fix scripts |
| `deploy-token-service/` | Token service deployment artifacts | Legacy deployment directory |
| `lambda-layer/` | Lambda layer code | When creating Lambda layer packages |
| `mintlify-story-intelligence/` | Mintlify docs config | When configuring Mintlify documentation |
| `mintlify-storytailor/` | Mintlify docs config | When configuring Mintlify documentation |
| `monitoring/` | **EMPTY** - Legacy placeholder | **DO NOT USE** - Use `packages/monitoring/` or `packages/health-monitoring/` |
| `services/` | **EMPTY** - Legacy placeholder | **DO NOT USE** - Services are in `packages/` |
| `deployments/` | **EMPTY** - Legacy placeholder | **DO NOT USE** - Use `scripts/deploy-*.sh` |
| `assets/` | Static assets | When adding static assets (images, etc.) |
| `error-logs/` | Error log files | Generated error logs (should be gitignored) |
| `.turbo/` | **GENERATED** - Turbo build cache | **DO NOT EDIT** - Generated by Turbo |
| `.test-output/` | **GENERATED** - Test output files | **DO NOT EDIT** - Generated test results |
| `AGENTS.md` | Agent development guide | When updating agent development guidelines |
| `README.md` | Project overview and quick start | When updating project overview |
| `package.json` | Root workspace configuration | When adding workspace-level dependencies or scripts |
| `turbo.json` | Turbo build pipeline configuration | When modifying build pipeline |
| `tsconfig.json` | Root TypeScript configuration | When updating TypeScript compiler options |
| `docker-compose.yml` | Local development services (Redis) | When adding local development services |
| `.env.example` | Environment variable template | When adding new required environment variables |

## Deeper Map

### packages/

**Purpose**: All source code for agents, services, SDKs, and shared utilities.

**Structure**:
```
packages/
├── <agent-name>/          # Agent packages (auth-agent, content-agent, etc.)
│   ├── src/
│   │   ├── index.ts       # Main entry point
│   │   ├── <AgentName>.ts # Core implementation
│   │   ├── services/      # Service classes
│   │   ├── utils/         # Package-specific utilities (avoid if possible)
│   │   ├── types.ts       # Package-specific types
│   │   └── __tests__/     # Unit tests (MUST be here)
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── shared-types/          # CANONICAL: Shared TypeScript types and gRPC schemas
│   └── src/
│       ├── types/         # Domain types (auth, story, character, etc.)
│       ├── utils/         # Shared utilities (redis helpers, etc.)
│       └── schemas/       # gRPC protocol definitions
├── api-contract/          # CANONICAL: OpenAPI specs and API type definitions
│   └── src/
│       ├── schemas/       # OpenAPI YAML files
│       └── types/         # Generated TypeScript types
├── testing/               # CANONICAL: Shared test utilities
│   └── src/
│       ├── helpers/        # Test utilities (test-utils.ts)
│       ├── e2e/           # E2E test helpers
│       ├── integration/   # Integration test helpers
│       └── load/          # Load test utilities
├── router/                # Intent classification orchestrator
├── universal-agent/       # Main conversation agent (also called storytailor-agent)
├── voice-synthesis/       # Voice synthesis service
├── security-framework/    # Security and privacy utilities
├── event-system/          # Event publishing and subscription
├── content-safety/        # Content safety and moderation
├── mobile-sdk-ios/        # iOS SDK (Swift)
├── mobile-sdk-android/    # Android SDK (Kotlin)
├── mobile-sdk-react-native/ # React Native SDK
├── web-sdk/               # Web SDK (TypeScript)
└── storytailor-embed/     # Embeddable widget
```

**Rules**:
- **ALL TypeScript source code** must be in `packages/*/src/`
- **Unit tests** must be in `packages/*/src/__tests__/`
- **Shared types** go in `packages/shared-types/src/types/`
- **Shared utilities** should go in `packages/shared-types/src/utils/` (preferred) or `packages/testing/src/helpers/` (for test utilities)
- **Package-specific utils** are allowed in `packages/<package>/src/utils/` but prefer shared location
- **Each package** must have `package.json`, `tsconfig.json`, and `README.md`

### lambda-deployments/

**Purpose**: Lambda-specific handler code that differs from source packages. Contains AWS SDK v2 fallbacks, SSM parameter loading, and Lambda-specific optimizations.

**Structure**:
```
lambda-deployments/
├── <agent-name>/          # Lambda deployment for each agent
│   └── src/
│       └── lambda.ts      # Lambda-specific handler (may differ from packages/)
├── router/
│   └── src/
│       └── lambda.ts      # Router Lambda handler with SSM loading
├── universal-agent/
│   └── src/
│       └── lambda.ts      # Universal Agent Lambda handler
└── deletion-processor/
    └── src/
        └── lambda.ts      # Deletion processor handler
```

**Rules**:
- **Source of truth** is `packages/` - Lambda handlers should mirror source when possible
- **Lambda-specific code** (SSM loading, AWS SDK v2 fallbacks) goes here
- **DO NOT duplicate business logic** - Import from `packages/` when possible
- **Each Lambda deployment** may have its own `package.json` for deployment-specific dependencies

### docs/

**Purpose**: Canonical documentation location. All documentation must be here.

**Structure**:
```
docs/
├── *.md                   # Root canonical docs (UPPERCASE_WITH_UNDERSCORES.md)
├── agents/                 # Agent-specific documentation
├── api-reference/         # API documentation
├── compliance/            # Compliance documentation (COPPA, GDPR, etc.)
├── deployment/            # Deployment guides
├── development/           # Development guides
├── operations/            # Operational runbooks
├── system/                # System architecture and inventory
├── testing/               # Testing documentation
├── business/              # Business documentation
├── sales/                 # Sales documentation
├── marketing/             # Marketing documentation
├── finance/               # Finance documentation
├── design/                # Design system documentation
└── ...                    # Other organized subdirectories
```

**Rules**:
- **Root level docs**: UPPERCASE_WITH_UNDERSCORES.md (e.g., `WHAT_THIS_IS.md`, `MENTAL_MODEL.md`)
- **Subdirectory docs**: kebab-case.md (e.g., `product-overview.md`, `agent-handoff.md`)
- **Sequential guides**: Numbered with kebab-case (e.g., `01-setup-notion.md`, `02-documentation-index.md`)
- **ALL documentation** must be in `docs/` - no exceptions
- **See `docs/NAMING.md`** for complete naming conventions

### scripts/

**Purpose**: Deployment scripts, utility scripts, and automation.

**Structure**:
```
scripts/
├── deploy-<agent-name>.sh        # Agent deployment scripts
├── deploy-universal-agent-proper.sh  # Universal Agent deployment (reference implementation)
├── setup-*.sh                   # Setup and configuration scripts
├── test-*.sh                    # Test execution scripts
├── verify-*.sh                  # Verification scripts
└── *.js, *.ts                   # Node.js utility scripts
```

**Rules**:
- **Deployment scripts** follow pattern: `deploy-<agent-name>.sh` or `deploy-<agent-name>-proper.sh`
- **Setup scripts** follow pattern: `setup-<service>.sh`
- **Test scripts** follow pattern: `test-<type>.sh`
- **Utility scripts** can be any name but should be descriptive

### supabase/

**Purpose**: Database migrations, schema files, and Supabase configuration.

**Structure**:
```
supabase/
├── migrations/
│   └── YYYYMMDDHHMMSS_description.sql  # Timestamped migration files
├── config.toml              # Supabase configuration
└── *.sql                    # Other SQL files (if any)
```

**Rules**:
- **ALL migrations** must be in `supabase/migrations/` with timestamp prefix
- **Migration naming**: `YYYYMMDDHHMMSS_description.sql` (e.g., `20240101000000_initial_schema.sql`)
- **DO NOT modify existing migrations** - Create new migrations for changes

### testing/

**Purpose**: Integration tests, E2E tests, load tests, and test infrastructure.

**Structure**:
```
testing/
├── ai-integration/          # AI integration tests
├── e2e/                     # End-to-end tests (Cypress)
├── load/                    # Load tests (k6)
├── security/                # Security tests
├── compliance/              # Compliance validation tests
└── performance/             # Performance tests
```

**Rules**:
- **Integration tests** go in `testing/ai-integration/` or `testing/e2e/`
- **Load tests** go in `testing/load/`
- **Security tests** go in `testing/security/`
- **Unit tests** go in `packages/*/src/__tests__/` (NOT here)

### tests/

**Purpose**: Global test setup, test configuration, and some test utilities.

**Structure**:
```
tests/
├── helpers/
│   └── setup.ts            # Global test setup
└── kid-communication-intelligence/  # Specific test suites
```

**Rules**:
- **Global test setup** goes in `tests/helpers/setup.ts`
- **Package-specific test setup** goes in `packages/<package>/jest.setup.js`
- **Most test code** should be in `packages/*/src/__tests__/` or `testing/`

## Golden Rules (No Duplicates)

### Source Code

- **ONLY location**: `packages/*/src/`
- **DO NOT create** source code in `lambda-deployments/` (except Lambda-specific handlers)
- **DO NOT create** source code in root directory
- **DO NOT create** source code in `scripts/` (scripts only, not business logic)

### Types and Interfaces

- **Shared types**: `packages/shared-types/src/types/`
- **Package-specific types**: `packages/<package>/src/types.ts`
- **API contract types**: `packages/api-contract/src/types/`
- **DO NOT duplicate** type definitions across packages - use `shared-types`

### Utilities and Helpers

- **Shared utilities**: `packages/shared-types/src/utils/` (preferred)
- **Test utilities**: `packages/testing/src/helpers/`
- **Package-specific utils**: `packages/<package>/src/utils/` (only if truly package-specific)
- **DO NOT create** multiple utils directories - consolidate shared code

### Tests

- **Unit tests**: `packages/*/src/__tests__/` (MUST be here)
- **Integration tests**: `testing/ai-integration/` or `testing/e2e/`
- **Load tests**: `testing/load/`
- **Security tests**: `testing/security/`
- **DO NOT create** tests in root `tests/` directory (except global setup)
- **DO NOT create** tests outside these locations

### Documentation

- **ONLY location**: `docs/`
- **Root canonical docs**: UPPERCASE_WITH_UNDERSCORES.md
- **Subdirectory docs**: kebab-case.md
- **DO NOT create** documentation in `agentic-ux/` (legacy, should be removed)
- **DO NOT create** documentation in root directory (except `AGENTS.md`, `README.md`, `PROJECT_MAP.md`)
- **DO NOT create** documentation in `packages/*/` (except `README.md` per package)

### Database Migrations

- **ONLY location**: `supabase/migrations/`
- **Naming**: `YYYYMMDDHHMMSS_description.sql`
- **DO NOT create** migrations elsewhere
- **DO NOT modify** existing migrations - create new ones

### Deployment Scripts

- **ONLY location**: `scripts/`
- **Naming**: `deploy-<agent-name>.sh` or `deploy-<agent-name>-proper.sh`
- **DO NOT create** deployment scripts elsewhere

### API Clients

- **Platform-specific**: Each SDK has its own (acceptable)
  - iOS: `packages/mobile-sdk-ios/src/APIClient.swift`
  - Android: `packages/mobile-sdk-android/src/main/java/.../APIClient.kt`
  - React Native: `packages/mobile-sdk-react-native/src/`
  - Web: `packages/web-sdk/src/`
  - Embed: `packages/storytailor-embed/src/api/APIClient.ts`
- **API Contract**: `packages/api-contract/src/` (OpenAPI spec and types)
- **DO NOT duplicate** API client logic - each platform implementation is acceptable, but share types from `api-contract`

### Configuration Files

- **Root configs**: `package.json`, `turbo.json`, `tsconfig.json`, `.env.example`
- **Package configs**: `packages/*/package.json`, `packages/*/tsconfig.json`, `packages/*/jest.config.js`
- **Infrastructure configs**: `infrastructure/terraform/*.tf`, `infrastructure/terraform/*.tfvars`
- **DO NOT create** config files in wrong locations

## Naming Conventions

### Files

- **TypeScript classes**: PascalCase - `AuthAgent.ts`, `ContentService.ts`
- **TypeScript utilities**: camelCase - `logger.ts`, `validator.ts`
- **TypeScript types**: `types.ts` or `types/<domain>.ts`
- **Tests**: `<filename>.test.ts` - `AuthAgent.test.ts`
- **Documentation root**: UPPERCASE_WITH_UNDERSCORES.md - `WHAT_THIS_IS.md`, `MENTAL_MODEL.md`
- **Documentation subdirs**: kebab-case.md - `product-overview.md`, `agent-handoff.md`
- **Sequential guides**: `01-setup-notion.md`, `02-documentation-index.md` (only for step-by-step guides)
- **Scripts**: kebab-case.sh or kebab-case.js - `deploy-universal-agent-proper.sh`
- **Migrations**: `YYYYMMDDHHMMSS_description.sql` - `20240101000000_initial_schema.sql`

### Directories

- **Packages**: kebab-case - `auth-agent/`, `content-agent/`, `shared-types/`
- **Documentation**: kebab-case - `api-reference/`, `integration-guides/`, `customer-service/`
- **Scripts**: N/A (flat structure in `scripts/`)

### Variables and Code

- **Variables/Functions**: camelCase - `userId`, `getStory()`
- **Constants**: UPPER_SNAKE_CASE - `MAX_RETRIES`, `DEFAULT_TIMEOUT`
- **Classes**: PascalCase - `AuthAgent`, `ContentService`
- **Interfaces/Types**: PascalCase - `User`, `StoryRequest`
- **Private members**: `_privateMember` (leading underscore)

**See `docs/NAMING.md` for complete naming conventions.**

## Do/Don't Examples

### ✅ DO (Correct Placement)

1. **Adding a new agent**:
   - ✅ Create `packages/my-new-agent/src/index.ts`
   - ✅ Add unit tests in `packages/my-new-agent/src/__tests__/MyNewAgent.test.ts`
   - ✅ Add to workspace in root `package.json`

2. **Adding shared utility function**:
   - ✅ Add to `packages/shared-types/src/utils/redis.ts` or create new file there
   - ✅ Export from `packages/shared-types/src/index.ts`

3. **Adding database migration**:
   - ✅ Create `supabase/migrations/20250114000000_add_new_table.sql`
   - ✅ Use timestamp prefix and descriptive name

4. **Adding documentation**:
   - ✅ Create `docs/operations/my-new-runbook.md` (kebab-case in subdirectory)
   - ✅ Or `docs/MY_NEW_CANONICAL_DOC.md` (UPPERCASE in root)

5. **Adding integration test**:
   - ✅ Create `testing/ai-integration/MyNewIntegration.test.ts`
   - ✅ Or `testing/e2e/specs/my-feature.cy.js` for Cypress tests

### ❌ DON'T (Incorrect Placement)

1. **Creating source code in wrong location**:
   - ❌ `lambda-deployments/my-agent/src/business-logic.ts` (business logic belongs in `packages/`)
   - ❌ `scripts/my-agent.ts` (scripts are for utilities, not business logic)
   - ❌ Root directory `MyAgent.ts` (must be in `packages/`)

2. **Duplicating types**:
   - ❌ Creating `packages/auth-agent/src/types/User.ts` when `packages/shared-types/src/types/auth.ts` already exists
   - ❌ Creating duplicate type definitions across packages

3. **Creating tests in wrong location**:
   - ❌ `tests/my-agent.test.ts` in root `tests/` (unit tests must be in `packages/*/src/__tests__/`)
   - ❌ `packages/my-agent/tests/` (must be `src/__tests__/`)

4. **Creating documentation outside docs/**:
   - ❌ `agentic-ux/docs/MY_NEW_DOC.md` (use `docs/` instead)
   - ❌ Root level `MY_NEW_DOC.md` (only canonical root docs allowed)
   - ❌ `packages/my-agent/DOCUMENTATION.md` (use `docs/agents/my-agent/`)

5. **Creating utils in wrong location**:
   - ❌ `packages/router/src/utils/redis.ts` when `packages/shared-types/src/utils/redis.ts` exists
   - ❌ Creating new `packages/utils/` directory (use `packages/shared-types/src/utils/`)

## Generated vs Hand-Written

### Generated (Do Not Edit)

- **`dist/`** - TypeScript compilation output (generated by `tsc`)
- **`build/`** - Build artifacts (generated by build scripts)
- **`.turbo/`** - Turbo build cache (generated by Turbo)
- **`docs-site/`** - Docusaurus site build output (generated from `docs/`)
- **`node_modules/`** - npm dependencies (generated by `npm install`)
- **`*.map`** - Source maps (generated by TypeScript compiler)
- **`*.js`** in `packages/*/dist/` - Compiled JavaScript (generated from TypeScript)
- **`coverage/`** - Test coverage reports (generated by Jest)
- **`.test-output/`** - Test output files (generated by test runners)
- **`error-logs/`** - Error log files (generated at runtime)

### Hand-Written (Source of Truth)

- **`packages/*/src/`** - ALL TypeScript source code
- **`lambda-deployments/*/src/`** - Lambda-specific handlers (manually maintained)
- **`docs/`** - ALL documentation
- **`supabase/migrations/`** - Database migrations
- **`scripts/`** - Deployment and utility scripts
- **`infrastructure/terraform/`** - Terraform configurations
- **`testing/`** - Test code and test infrastructure
- **`examples/`** - Example code
- **`api/`** - OpenAPI specifications
- **Root config files** - `package.json`, `turbo.json`, `tsconfig.json`, `.env.example`

### Build Process

1. **Source code** (`packages/*/src/`) → **Compiled** (`packages/*/dist/`) via `npm run build`
2. **Compiled code** + **dependencies** → **Lambda package** (ZIP) via `scripts/deploy-*.sh`
3. **Lambda package** → **Deployed** to AWS Lambda via deployment scripts
4. **Documentation** (`docs/`) → **Docusaurus site** (`docs-site/`) via Docusaurus build

## Owners / Decision Points

### Ownership Model

See `docs/OWNERSHIP.md` for complete ownership model. Key points:

- **All packages**: Engineering team
- **Documentation**: Engineering + Product team
- **Infrastructure**: Engineering + DevOps
- **Compliance**: Legal + Engineering

### Decision Log

See `docs/DECISIONS.md` for architectural and technical decisions.

### Key Decision Points

- **Architecture decisions**: Document in `docs/DECISIONS.md`
- **Package structure**: Follow existing patterns in `packages/`
- **Naming conventions**: Follow `docs/NAMING.md`
- **File placement**: Follow this PROJECT_MAP.md
- **Deployment patterns**: Follow `scripts/deploy-universal-agent-proper.sh` as reference

### Who to Ask

- **Code structure**: Engineering team lead
- **Documentation**: Documentation team (see `docs/OWNERSHIP.md`)
- **Deployment**: DevOps team
- **Database changes**: Engineering + Database team
- **Compliance**: Legal + Engineering

## Glossary

- **Agent**: Specialized service handling a specific domain (ContentAgent, AuthAgent, etc.). Located in `packages/<agent-name>/`
- **Router**: Central orchestrator (`packages/router/`) that classifies intents and delegates to agents
- **Universal Agent**: Main conversation agent (`packages/universal-agent/`), also called StorytailorAgent. Handles general conversation flow
- **Lambda Deployment**: AWS Lambda function deployment. Source code in `packages/`, Lambda handlers in `lambda-deployments/`
- **RLS**: Row Level Security (Supabase PostgreSQL feature for data access control)
- **gRPC**: Inter-agent communication protocol. Schemas in `packages/shared-types/src/schemas/`
- **SSM**: AWS Systems Manager Parameter Store. Environment variables stored here, loaded at Lambda runtime
- **Turbo**: Monorepo build orchestration tool. Configuration in `turbo.json`
- **Workspace**: npm workspace (defined in root `package.json`). All `packages/*` are workspaces
- **Story Intelligence™**: Proprietary AI system with four pillars (Narrative, Developmental, Personal, Literary Excellence)
- **COPPA**: Children's Online Privacy Protection Act. Compliance documentation in `docs/compliance/coppa.md`
- **GDPR**: General Data Protection Regulation. Compliance documentation in `docs/compliance/gdpr.md`
- **Lambda Function**: AWS Lambda serverless function. Deployed from `packages/*` via `scripts/deploy-*.sh`
- **Migration**: Database schema change. SQL files in `supabase/migrations/` with timestamp prefix
- **Package**: Monorepo package in `packages/*`. Each package is a workspace with its own `package.json`
- **Service**: Business logic service class. Located in `packages/*/src/services/`
- **Type**: TypeScript type definition. Shared types in `packages/shared-types/src/types/`, package-specific in `packages/*/src/types.ts`

## Duplication Risks and Resolutions

### Critical Duplication Risks

1. **`packages/` vs `lambda-deployments/`**
   - **Risk**: Business logic duplicated between source and Lambda handlers
   - **Resolution**: Source of truth is `packages/`. `lambda-deployments/` should only contain Lambda-specific code (SSM loading, AWS SDK v2 fallbacks). Import from `packages/` when possible.
   - **Rule**: Business logic MUST be in `packages/`. Lambda handlers in `lambda-deployments/` should be thin wrappers.

2. **`agentic-ux/` vs `docs/`**
   - **Risk**: Duplicate documentation in two locations
   - **Resolution**: `agentic-ux/` is legacy. All new documentation goes in `docs/`. `agentic-ux/` should be archived or removed.
   - **Rule**: ALL documentation MUST be in `docs/`. Do not create documentation in `agentic-ux/`.

3. **Multiple Test Locations**
   - **Risk**: Tests scattered across `packages/*/src/__tests__/`, `testing/`, `tests/`, `packages/testing/`
   - **Resolution**: 
     - Unit tests: `packages/*/src/__tests__/` (canonical)
     - Integration tests: `testing/ai-integration/` or `testing/e2e/`
     - Test utilities: `packages/testing/src/helpers/`
     - Global setup: `tests/helpers/setup.ts`
   - **Rule**: Unit tests MUST be in `packages/*/src/__tests__/`. Integration/E2E tests in `testing/`.

4. **Scattered Utilities**
   - **Risk**: Utils in `packages/router/src/utils/`, `packages/auth-agent/src/utils/`, `packages/shared-types/src/utils/`
   - **Resolution**: Consolidate shared utilities to `packages/shared-types/src/utils/`. Package-specific utils only if truly package-specific.
   - **Rule**: Shared utilities MUST be in `packages/shared-types/src/utils/`. Package-specific utils only when necessary.

5. **Multiple API Clients**
   - **Risk**: API client implementations in each SDK package
   - **Resolution**: Platform-specific implementations are acceptable (iOS Swift, Android Kotlin, etc.). Share types from `packages/api-contract/`.
   - **Rule**: Each platform SDK can have its own API client implementation, but MUST use types from `packages/api-contract/`.

6. **Empty Legacy Directories**
   - **Risk**: `services/`, `deployments/`, `monitoring/` are empty placeholders
   - **Resolution**: Do not use these directories. Use `packages/` for services, `scripts/` for deployments, `packages/monitoring/` or `packages/health-monitoring/` for monitoring.
   - **Rule**: Do not create files in empty legacy directories.

## File Placement Decision Tree

**Adding new code?**
- Is it TypeScript/JavaScript source code? → `packages/<package>/src/`
- Is it a test? → `packages/<package>/src/__tests__/` (unit) or `testing/` (integration/E2E)
- Is it a script? → `scripts/`
- Is it documentation? → `docs/` (UPPERCASE root, kebab-case subdirs)
- Is it a database migration? → `supabase/migrations/`
- Is it infrastructure code? → `infrastructure/terraform/`
- Is it example code? → `examples/`
- Is it a Lambda-specific handler? → `lambda-deployments/<agent>/src/lambda.ts`

**Adding shared code?**
- Is it a type/interface? → `packages/shared-types/src/types/`
- Is it a utility function? → `packages/shared-types/src/utils/`
- Is it a test utility? → `packages/testing/src/helpers/`
- Is it an API contract? → `packages/api-contract/src/schemas/`

**Uncertain?**
- Check existing similar code location
- Follow patterns in this PROJECT_MAP.md
- Ask Engineering team lead
- Reference `docs/NAMING.md` and `docs/OWNERSHIP.md`

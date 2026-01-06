# Naming Conventions

**Last Updated**: 2025-12-14

## Package Naming

### Agent Packages
- **Pattern**: `<domain>-agent`
- **Examples**: 
  - `auth-agent` - Authentication
  - `content-agent` - Content generation
  - `library-agent` - Library management
  - `emotion-agent` - Emotion tracking

### Service Packages
- **Pattern**: `<purpose>-<type>` or `<purpose>`
- **Examples**:
  - `shared-types` - Shared TypeScript types
  - `voice-synthesis` - Voice synthesis service
  - `security-framework` - Security utilities
  - `testing` - Test utilities

### SDK Packages
- **Pattern**: `<platform>-sdk` or `mobile-sdk-<platform>`
- **Examples**:
  - `web-sdk` - Web SDK
  - `mobile-sdk-ios` - iOS SDK
  - `mobile-sdk-android` - Android SDK
  - `mobile-sdk-react-native` - React Native SDK

## File Naming

### TypeScript Files
- **Classes**: PascalCase - `AuthAgent.ts`, `ContentService.ts`
- **Utilities**: camelCase - `logger.ts`, `validator.ts`
- **Types**: `types.ts` or `types/<domain>.ts`
- **Tests**: `<filename>.test.ts` - `AuthAgent.test.ts`

### Documentation Files
- **Canonical docs** (root level): UPPERCASE_WITH_UNDERSCORES.md - `WHAT_THIS_IS.md`, `HOW_WE_WORK.md`, `MENTAL_MODEL.md`
- **Regular docs** (subdirectories): kebab-case.md - `api-reference.md`, `deployment-guide.md`, `product-overview.md`
- **Sequential guides**: Numbered with kebab-case - `01-setup-notion.md`, `02-documentation-index.md` (only for step-by-step guides)
- **Standalone docs**: kebab-case.md without numbering - `comprehensive-user-journeys.md`, `multi-agent-orchestration-flow.md`
- **Agent docs**: kebab-case.md in `docs/agents/` - `auth-agent.md`

#### When to Use Numbering
- **Use numbering** (`01-`, `02-`, etc.) only for sequential step-by-step guides where order matters
  - Examples: Setup guides (`01-notion-teamspace-setup.md`, `02-documentation-index.md`), deployment checklists
- **Don't use numbering** for standalone documents, overviews, or comprehensive guides
  - Examples: `comprehensive-user-journeys.md`, `multi-agent-orchestration-flow.md`, `product-overview.md`

### Configuration Files
- **Standard**: `package.json`, `tsconfig.json`, `jest.config.js`
- **Environment**: `.env.example`, `.env.local`
- **Infrastructure**: `docker-compose.yml`, `terraform.tfvars`

## Variable Naming

### TypeScript/JavaScript
- **Variables/Functions**: camelCase - `userId`, `getStory()`
- **Constants**: UPPER_SNAKE_CASE - `MAX_RETRIES`, `DEFAULT_TIMEOUT`
- **Classes**: PascalCase - `AuthAgent`, `ContentService`
- **Interfaces/Types**: PascalCase - `User`, `StoryRequest`
- **Private members**: `_privateMember` (leading underscore)

### Database
- **Tables**: snake_case - `user_profiles`, `story_characters`
- **Columns**: snake_case - `user_id`, `created_at`
- **Indexes**: `idx_<table>_<columns>` - `idx_users_email`

## Directory Naming

### Source Directories
- **Main source**: `src/`
- **Services**: `src/services/`
- **Types**: `src/types/` or `src/types.ts`
- **Tests**: `src/__tests__/` or `__tests__/`
- **Utils**: `src/utils/`

### Documentation Directories
- **Canonical**: `docs/`
- **Agent docs**: `docs/agents/`
- **API docs**: `docs/api-reference/`
- **System docs**: `docs/system/`

## Shared Vocabulary

### Core Concepts
- **Agent**: Specialized service handling a domain (ContentAgent, AuthAgent)
- **Router**: Central orchestrator that routes requests to agents
- **Universal Agent**: Main conversation agent (also called StorytailorAgent)
- **Session**: Single conversation session with a user
- **Conversation**: Multi-turn interaction with a user

### User Types
- **Child**: Primary end user (ages 3-12)
- **Parent/Guardian**: Account manager for child
- **Educator**: Teacher using in classroom
- **Developer**: Integrating Storytailor into their app
- **Partner**: White-label or embedded integration

### Data Terms
- **Story**: Generated or library story content
- **Character**: Story character with personality
- **Library**: User's collection of stories/characters
- **Emotion**: Child's emotional state tracked over time
- **Insight**: Pattern analysis and recommendations

### Technical Terms
- **RLS**: Row Level Security (Supabase)
- **PII**: Personally Identifiable Information
- **gRPC**: Inter-agent communication protocol
- **Lambda**: AWS Lambda function
- **SSM**: AWS Systems Manager Parameter Store

## Naming Conflicts

### Resolved
- **storytailor-agent vs universal-agent**: Both refer to the same package (`universal-agent` is the canonical name)
- **monitoring vs health-monitoring**: Two separate packages with different purposes

### To Resolve
- Review any other naming inconsistencies during cleanup

## Related Documentation

- [How We Work](./HOW_WE_WORK.md) - Development workflow
- [Mental Model](./MENTAL_MODEL.md) - System architecture

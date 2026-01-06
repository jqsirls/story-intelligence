# Contributing to Storytailor

**Last Updated**: 2025-12-13

Thank you for contributing to Storytailor! This guide will help you make changes safely and effectively.

## Quick Start

1. **Read the docs**: Start with [What This Is](./docs/WHAT_THIS_IS.md) and [How We Work](./docs/HOW_WE_WORK.md)
2. **Set up your environment**: Follow the setup instructions in [AGENTS.md](./AGENTS.md)
3. **Make your changes**: Follow the workflow below
4. **Submit a PR**: Use the PR template and checklist

## Making Changes Safely

### Before Starting

1. **Check infrastructure**: Ensure Supabase and Redis are running
   ```bash
   npm run infrastructure:start
   ```

2. **Pull latest changes**: 
   ```bash
   git pull origin main
   ```

3. **Install dependencies** (if needed):
   ```bash
   npm install
   ```

### Development Workflow

1. **Create a branch**:
   ```bash
   git checkout -b feature/my-feature
   # or
   git checkout -b fix/my-bug
   ```

2. **Make your changes** in the appropriate package:
   - Code: `packages/<package-name>/src/`
   - Tests: `packages/<package-name>/src/__tests__/`
   - Documentation: `docs/`

3. **Run tests**:
   ```bash
   npm run test
   # or for specific package
   turbo run test --filter=<package-name>
   ```

4. **Type check**:
   ```bash
   npm run type-check
   ```

5. **Lint**:
   ```bash
   npm run lint
   ```

6. **Build** (if making code changes):
   ```bash
   npm run build
   ```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(router): add intent classification for story requests
fix(auth-agent): resolve account linking timeout issue
docs(README): update setup instructions
refactor(content-agent): simplify story generation logic
chore(deps): update dependencies
```

**Format**: `<type>(<scope>): <description>`

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Maintenance tasks

### Before Pushing

Run full validation:
```bash
npm run ci:validate  # Runs: lint + type-check + test
```

## Pull Request Process

### PR Checklist

Before submitting your PR, ensure:

- [ ] Code follows style guidelines (TypeScript strict mode, single quotes, no semicolons)
- [ ] Tests pass locally (`npm run test`)
- [ ] Added tests for new functionality (90% coverage target)
- [ ] Updated documentation if needed
- [ ] **No disposable artifacts added** (see Disposable Artifacts Policy below)
- [ ] Self-review completed
- [ ] Type checking passes (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)

### PR Title Format

```
[<package-name>] <Description>
```

**Examples**:
- `[router] Add intent classification for story requests`
- `[docs] Update HOW_WE_WORK.md with disposable artifacts policy`
- `[infrastructure] Update .gitignore patterns`
- `[universal-agent] Fix authentication middleware timeout`

### PR Description

Include:
- **What changed**: Brief description of changes
- **Why changed**: Context and motivation
- **How tested**: Testing approach and results
- **Breaking changes**: Any breaking changes (if applicable)
- **Related issues**: Link to related issues or PRs

### Review Process

1. **Self-review**: Review your own PR first
2. **Team review**: At least one team member reviews
3. **CI validation**: All CI checks must pass
4. **Merge**: Squash and merge to main

## Testing Requirements

### Test Coverage

- **Target**: 90% coverage for new code
- **Minimum**: All new functionality must have tests
- **Run**: `npm run test:coverage` to check coverage

### Test Types

- **Unit Tests**: Test individual functions/classes
- **Integration Tests**: Test agent interactions
- **E2E Tests**: Test full user journeys
- **Smoke Tests**: Quick health checks

### Running Tests

```bash
npm run test              # All tests
npm run test:coverage     # With coverage
npm run test:watch        # Watch mode
npm run test:integration  # Integration tests
npm run test:e2e          # E2E tests
npm run test:smoke        # Smoke tests
```

## Code Style Guidelines

### TypeScript

- **Strict mode**: All code must pass strict type checking
- **Single quotes**: Preferred (check existing codebase)
- **No semicolons**: Check existing codebase
- **Functional patterns**: Where possible
- **90% test coverage**: Requirement for new code

### File Naming

Follow [Naming Conventions](./docs/NAMING.md):
- **TypeScript classes**: PascalCase - `AuthAgent.ts`
- **TypeScript utilities**: camelCase - `logger.ts`
- **Tests**: `<filename>.test.ts` - `AuthAgent.test.ts`
- **Documentation**: See `docs/NAMING.md` for doc naming

### Package Structure

Each package follows this structure:
```
packages/<package-name>/
├── src/
│   ├── index.ts          # Main entry point
│   ├── <PackageName>.ts # Core implementation
│   ├── services/         # Service classes
│   ├── types.ts          # TypeScript types
│   └── __tests__/       # Unit tests
├── package.json
├── tsconfig.json
└── README.md
```

## Disposable Artifacts Policy

**CRITICAL**: These file patterns must NOT be committed:

- `*_SUMMARY.md`
- `*_STATUS.md`
- `*_REPORT.md`
- `*_AUDIT.md`
- `*_RESULTS.md`
- `*_COMPLETE.md`
- `*_SUCCESS.md`
- `*_READY.md`
- `*_FINAL.md`
- `PRODUCTION*.md` (except in docs/)
- `DEPLOYMENT*.md` (except in docs/)

**Why**: These are temporary run-specific artifacts that clutter the repo.

**What to do instead**:
- If information is valuable: Put it in `docs/`
- If you need old status: Check git history
- If it's a temporary note: Use `docs/WORKING_NOTES.md` (actively pruned)

See [How We Work](./docs/HOW_WE_WORK.md#disposable-artifacts-policy) for full policy.

## Documentation

### Where to Document

- **Product/User Docs**: `docs/` directory
- **API Docs**: `docs/api-reference/`
- **Agent Docs**: `docs/agents/`
- **Architecture**: `docs/system/architecture.md`
- **Decisions**: `docs/DECISIONS.md`

### Documentation Standards

- **Keep it current**: Update docs when code changes
- **Be clear**: Write for someone new to the codebase
- **Link appropriately**: Link to related docs
- **No disposable artifacts**: Use canonical docs, not temporary files
- **Follow naming conventions**: See `docs/NAMING.md`

## Getting Help

- **Check docs**: Start with `docs/README.md`
- **Check package README**: Each package has its own README
- **Check AGENTS.md**: Guide for AI coding agents
- **Ask team**: Don't hesitate to ask for help

## Related Documentation

- [What This Is](./docs/WHAT_THIS_IS.md) - Product overview
- [Mental Model](./docs/MENTAL_MODEL.md) - System architecture
- [How We Work](./docs/HOW_WE_WORK.md) - Development workflow
- [Naming](./docs/NAMING.md) - Naming conventions
- [Ownership](./docs/OWNERSHIP.md) - Ownership and responsibilities
- [Decisions](./docs/DECISIONS.md) - Decision log
- [Definition of Done](./docs/DEFINITION_OF_DONE.md) - DoD checklist


# How We Work

**Last Updated**: 2025-12-13

## Development Workflow

### Getting Started

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd storytailor-agent
   npm install
   ```

2. **Start Infrastructure**
   ```bash
   npm run infrastructure:start  # Starts Supabase + Redis
   ```

3. **Build**
   ```bash
   npm run build
   ```

4. **Test**
   ```bash
   npm run test
   ```

### Daily Development

- **Watch Mode**: `npm run dev` - Starts all agents in watch mode
- **Build Specific Package**: `turbo run build --filter=<package-name>`
- **Test Specific Package**: `turbo run test --filter=<package-name>`
- **Type Check**: `npm run type-check`

## Code Organization

### Where Things Live

- **Packages**: `packages/*` - All agent and service code
- **Documentation**: `docs/*` - Canonical documentation
- **Scripts**: `scripts/*` - Deployment and utility scripts
- **Database**: `supabase/*` - Migrations and schema
- **Infrastructure**: `infrastructure/*` - Terraform configs
- **Tests**: `testing/*` - Test utilities and helpers

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

### What Are Disposable Artifacts?

Files that are **NOT** part of the product and should not persist in the repo:

**Primary Patterns (Must Not Persist):**
- `*_SUMMARY.md` - Temporary summary files
- `*_STATUS.md` - Temporary status files
- `*_REPORT.md` - Temporary report files
- `*_AUDIT.md` - Temporary audit files
- `*_RESULTS.md` - Temporary result files
- `*_COMPLETE.md` - Temporary completion files
- `*_SUCCESS.md` - Temporary success files
- `*_READY.md` - Temporary ready files
- `*_FINAL.md` - Temporary final files
- `PRODUCTION*.md` - Temporary production status files (except in docs/)
- `DEPLOYMENT*.md` - Temporary deployment status files (except in docs/)

**Additional Patterns:**
- Timestamped test outputs (`test-results/*.txt`, `test-results/*.json`)
- Build artifacts in wrong locations
- Temporary directories (`tmp-*`, `*-ci`, `*-merge`, `*-deployment-*`)
- Legacy duplicate directories (`agentic-ux/`, `STORYTAILOR_DEVELOPER_DOCUMENTATION/`)

### Policy

1. **Never commit disposable artifacts** - They clutter the repo and slow down navigation
2. **Use canonical docs** - If information is valuable, put it in `docs/`
3. **Use git history** - If you need old status, check git history
4. **Quarantine before deletion** - Files are moved to `_quarantine/` for review before deletion

### Enforcement

- **`.gitignore`**: Patterns added to prevent accidental commits
- **Pre-commit hooks**: (Optional) Prevent committing disposable artifacts
- **CI checks**: (Optional) Fail builds if disposable artifacts are committed
- **PR reviews**: Reviewers check for disposable artifacts

## Making Changes

### Before Starting

1. Check if infrastructure is running: `npm run infrastructure:start`
2. Pull latest changes: `git pull`
3. Install dependencies if needed: `npm install`

### Making Code Changes

1. **Create a branch**: `git checkout -b feature/my-feature`
2. **Make changes** in appropriate package
3. **Run tests**: `npm run test` or `turbo run test --filter=<package>`
4. **Type check**: `npm run type-check`
5. **Lint**: `npm run lint`
6. **Commit**: Use conventional commit messages

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(router): add intent classification for story requests
fix(auth-agent): resolve account linking timeout issue
docs(README): update setup instructions
refactor(content-agent): simplify story generation logic
```

### Before Pushing

Run full validation:
```bash
npm run ci:validate  # Runs: lint + type-check + test
```

## Pull Request Process

### PR Checklist

- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] Added tests for new functionality
- [ ] Updated documentation if needed
- [ ] No disposable artifacts added
- [ ] Self-review completed
- [ ] Type checking passes
- [ ] Linting passes

### PR Title Format

```
[<package-name>] <Description>
```

Examples:
- `[router] Add intent classification for story requests`
- `[docs] Update HOW_WE_WORK.md with disposable artifacts policy`
- `[infrastructure] Update .gitignore patterns`

### Review Process

1. **Self-review**: Review your own PR first
2. **Team review**: At least one team member reviews
3. **CI validation**: All CI checks must pass
4. **Merge**: Squash and merge to main

## Testing

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

### Test Requirements

- **90% coverage target** for new code
- **All tests must pass** before merging
- **Add tests** for new functionality
- **Fix flaky tests** immediately

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

## Deployment

### Staging

```bash
npm run deploy:staging
```

### Production

```bash
npm run deploy:production
```

### Manual Deployment

See deployment scripts in `scripts/` directory:
- `scripts/deploy-universal-agent-proper.sh`
- `scripts/deploy-all-agents.sh`

## Troubleshooting

### Common Issues

**Infrastructure not running**:
```bash
npm run infrastructure:start
```

**Build failures**:
```bash
npm run clean
npm install
npm run build
```

**Test failures**:
- Check infrastructure is running
- Check environment variables are set
- Run tests in isolation: `turbo run test --filter=<package>`

**Type errors**:
```bash
npm run type-check
```

## Getting Help

- **Check docs**: Start with `docs/README.md`
- **Check package README**: Each package has its own README
- **Check AGENTS.md**: Guide for AI coding agents
- **Ask team**: Don't hesitate to ask for help

## Related Documentation

- [What This Is](./WHAT_THIS_IS.md) - Product overview
- [Mental Model](./MENTAL_MODEL.md) - System architecture
- [Naming](./NAMING.md) - Naming conventions
- [Ownership](./OWNERSHIP.md) - Ownership and responsibilities
- [Decisions](./DECISIONS.md) - Decision log

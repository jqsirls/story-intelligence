# Definition of Done

**Last Updated**: 2025-12-13

## Code Changes

### Requirements

- [ ] **Code Review**: At least one team member has reviewed the code
- [ ] **Tests**: All tests pass locally (`npm run test`)
- [ ] **Test Coverage**: New code has test coverage (target: 90%)
- [ ] **Type Checking**: Type checking passes (`npm run type-check`)
- [ ] **Linting**: Linting passes (`npm run lint`)
- [ ] **Build**: Build succeeds (`npm run build`)
- [ ] **No Disposable Artifacts**: No `*_SUMMARY.md`, `*_STATUS.md`, `*_REPORT.md`, `*_AUDIT.md`, `*_RESULTS.md` files added

### Documentation

- [ ] **API Changes**: API documentation updated if APIs changed
- [ ] **README Updates**: Package README updated if package behavior changed
- [ ] **Canonical Docs**: Canonical docs updated if workflow/process changed

### Code Quality

- [ ] **Style**: Code follows project style guidelines
- [ ] **Naming**: Names follow conventions in `docs/NAMING.md`
- [ ] **Error Handling**: Appropriate error handling added
- [ ] **Logging**: Appropriate logging added (with PII tokenization)

## Documentation Changes

### Requirements

- [ ] **Accuracy**: Information is accurate and current
- [ ] **Clarity**: Documentation is clear and easy to understand
- [ ] **Links**: All links work and point to correct locations
- [ ] **Format**: Follows documentation style guide
- [ ] **Location**: Placed in appropriate canonical location (`docs/`)

## Infrastructure Changes

### Requirements

- [ ] **Terraform**: Terraform changes reviewed and validated
- [ ] **Migrations**: Database migrations tested
- [ ] **Environment Variables**: New env vars documented in `.env.example`
- [ ] **Secrets**: Secrets management updated if needed

## Deployment

### Requirements

- [ ] **Staging**: Changes deployed to staging and tested
- [ ] **Production**: Changes deployed to production (if applicable)
- [ ] **Rollback Plan**: Rollback plan documented (for high-risk changes)
- [ ] **Monitoring**: Monitoring/alerting updated if needed

## Related Documentation

- [How We Work](./HOW_WE_WORK.md) - Development workflow
- [Ownership](./OWNERSHIP.md) - Ownership and approvals

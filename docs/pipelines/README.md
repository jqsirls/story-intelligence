# Automatic Pipeline System - Documentation Index

**Version**: 1.0  
**Date**: December 25, 2025  
**Status**: Complete

---

## 📚 Documentation Structure

This directory contains comprehensive documentation for the Automatic Pipeline System across all teams.

---

## For Engineering Team

### [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md)

**Purpose**: Technical architecture, service dependencies, code patterns

**Key Topics**:
- System architecture diagram
- Core components (Intelligence Curator, User Type Router, etc.)
- Database schema
- Code patterns and best practices
- EventBridge integration
- Testing strategy

**When to read**: Before implementing new pipelines or modifying existing services

---

## For Operations Team

### [OPERATIONS_GUIDE.md](./OPERATIONS_GUIDE.md)

**Purpose**: Day-to-day operations, incident response, monitoring

**Key Topics**:
- Daily/weekly/monthly checklists
- Kill switch management
- Incident response runbooks
- Emergency contacts
- Escalation paths

**When to read**: On-call rotation, incident response, daily operations

---

## For DevOps/SRE Team

### [MONITORING_GUIDE.md](./MONITORING_GUIDE.md)

**Purpose**: Metrics, alerts, dashboards, performance baselines

**Key Topics**:
- CloudWatch metrics and alarms
- Dashboard configurations
- Log queries
- Performance baselines
- Capacity planning
- Synthetic monitoring

**When to read**: Setting up monitoring, investigating performance issues

---

## For QA/Testing Team

### [TESTING_GUIDE.md](./TESTING_GUIDE.md)

**Purpose**: Test strategies, test cases, coverage requirements

**Key Topics**:
- Unit test examples
- Integration test patterns
- E2E test scenarios
- Mock data setup
- Performance tests
- 90% coverage requirement

**When to read**: Writing tests, debugging test failures, coverage analysis

---

## For Frontend Team

### [FRONTEND_INTEGRATION_GUIDE.md](./FRONTEND_INTEGRATION_GUIDE.md)

**Purpose**: REST API endpoints, real-time subscriptions, UI components

**Key Topics**:
- Consumption tracking API
- Email preferences API
- Referral/rewards API
- Supabase Realtime subscriptions
- Deep linking from emails
- UI/UX guidelines

**When to read**: Integrating pipeline features into frontend

---

## For Medical/Legal Team

### [CLINICAL_REVIEW_REQUIREMENTS.md](./CLINICAL_REVIEW_REQUIREMENTS.md)

**Purpose**: What requires clinical/legal review, review process, sign-off forms

**Key Topics**:
- Therapeutic features requiring review
- Review scope and questions
- Forbidden language (code-enforced)
- Liability assessment
- Insurance requirements
- Sign-off process

**When to read**: Before therapeutic features can be enabled

---

## For Product/Business Team

### [BUSINESS_OVERVIEW.md](./BUSINESS_OVERVIEW.md)

**Purpose**: Business value, revenue projections, rollout strategy

**Key Topics**:
- Business problem and solution
- Revenue projections ($430K+ MRR)
- User segmentation (17 types)
- Competitive advantages
- Success metrics
- ROI analysis (103x Year 1)

**When to read**: Business planning, investor presentations, launch planning

---

## Quick Reference by Role

### I'm an Engineer...

**Building new pipeline?** → Read [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md)  
**Debugging issue?** → Read [OPERATIONS_GUIDE.md](./OPERATIONS_GUIDE.md)  
**Writing tests?** → Read [TESTING_GUIDE.md](./TESTING_GUIDE.md)

### I'm in Operations...

**On-call shift?** → Read [OPERATIONS_GUIDE.md](./OPERATIONS_GUIDE.md)  
**Setting up alerts?** → Read [MONITORING_GUIDE.md](./MONITORING_GUIDE.md)  
**Users complaining?** → Check kill switches in Operations Guide

### I'm a Frontend Dev...

**Integrating pipelines?** → Read [FRONTEND_INTEGRATION_GUIDE.md](./FRONTEND_INTEGRATION_GUIDE.md)  
**Need API docs?** → See REST API Integration section  
**Building UI?** → See UI/UX Guidelines section

### I'm a Product Manager...

**Pitching to stakeholders?** → Read [BUSINESS_OVERVIEW.md](./BUSINESS_OVERVIEW.md)  
**Planning roadmap?** → Check Success Metrics and Rollout Strategy  
**Need competitive intel?** → See Competitive Analysis section

### I'm in Legal/Clinical...

**Reviewing therapeutic features?** → Read [CLINICAL_REVIEW_REQUIREMENTS.md](./CLINICAL_REVIEW_REQUIREMENTS.md)  
**Assessing liability?** → See Liability & Risk Management section  
**Signing off?** → Use Sign-Off Form in Clinical Review doc

---

## Related Documentation

### Sacred Documents (Must Read)

Located in `docs/api/`:
- [THERAPEUTIC_DOCTRINE.md](../api/THERAPEUTIC_DOCTRINE.md) - Clinical guardrails
- [PIPELINE_VETO_RULES.md](../api/PIPELINE_VETO_RULES.md) - Veto authority
- [COMPARATIVE_INTELLIGENCE_GUIDE.md](../api/COMPARATIVE_INTELLIGENCE_GUIDE.md) - Relative scoring
- [COMMUNICATION_TONE_GUIDE.md](../api/COMMUNICATION_TONE_GUIDE.md) - Email tone

### Implementation Details

Located in root:
- [AUTOMATIC_PIPELINE_IMPLEMENTATION_SUMMARY.md](../../AUTOMATIC_PIPELINE_IMPLEMENTATION_SUMMARY.md) - What was built
- [PIPELINE_DEPLOYMENT_CHECKLIST.md](../../PIPELINE_DEPLOYMENT_CHECKLIST.md) - Deployment steps
- [PIPELINE_SYSTEM_COMPLETE.md](../../PIPELINE_SYSTEM_COMPLETE.md) - Completion status

### Integration Guides

Located in `docs/integration-guides/`:
- [email-integration-plan.md](../integration-guides/email-integration-plan.md) - Email templates
- [SENDGRID_TEMPLATE_CREATION_GUIDE.md](../integration-guides/SENDGRID_TEMPLATE_CREATION_GUIDE.md) - Template creation

---

## Quick Start Guides

### For Engineers: Add a New Pipeline

1. Read [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md) → "Adding New Pipeline" section
2. Create service in `packages/universal-agent/src/services/`
3. Add handler in `lambda-deployments/intelligence-curator/src/lambda.ts`
4. Add tests in `__tests__/`
5. Create EventBridge rule (if scheduled)
6. Deploy and monitor

### For Operations: Respond to Incident

1. Read [OPERATIONS_GUIDE.md](./OPERATIONS_GUIDE.md) → "Incident Response" section
2. Identify severity (P1/P2/P3/P4)
3. Follow runbook for that incident type
4. Use kill switch if needed
5. Escalate if unresolved >30 min (P1) or >1 hour (P2)

### For Frontend: Integrate Consumption Tracking

1. Read [FRONTEND_INTEGRATION_GUIDE.md](./FRONTEND_INTEGRATION_GUIDE.md) → "Consumption Tracking" section
2. Add API calls to story player:
   - `play_start` when story begins
   - `play_pause` when user pauses
   - `play_complete` when story finishes
3. Subscribe to Supabase Realtime for metrics updates
4. Display comparative insights (not raw scores)
5. Test thoroughly

---

## Document Maintenance

### When to Update

- New pipeline type added
- New user type added
- Sacred document changed
- Incident pattern discovered
- Process improved

### How to Update

1. Create branch
2. Update relevant documentation
3. PR review by document owner
4. Update version number
5. Merge to main
6. Announce changes in Slack

### Document Owners

| Document | Owner | Review Frequency |
|----------|-------|------------------|
| ARCHITECTURE_OVERVIEW.md | Engineering Lead | Quarterly |
| OPERATIONS_GUIDE.md | Ops Manager | Monthly |
| MONITORING_GUIDE.md | DevOps Lead | Monthly |
| TESTING_GUIDE.md | QA Lead | Quarterly |
| FRONTEND_INTEGRATION_GUIDE.md | Frontend Lead | As needed |
| CLINICAL_REVIEW_REQUIREMENTS.md | Compliance Officer | Annually |
| BUSINESS_OVERVIEW.md | Product Manager | Quarterly |

---

## Feedback

**Documentation issues?** → Create GitHub issue with `documentation` label  
**Suggestions?** → Slack #pipeline-docs  
**Questions?** → Slack #ask-engineering

---

## Version History

### v1.0 (December 25, 2025)

- Initial documentation suite created
- All 7 guides completed
- Sacred documents linked
- Implementation complete

### Future Versions

- v1.1: Add clinical review results (post-review)
- v1.2: Add A/B test results and optimizations
- v1.3: Add Year 1 retrospective and lessons learned

---

## TL;DR

**Engineering**: Read ARCHITECTURE_OVERVIEW.md  
**Operations**: Read OPERATIONS_GUIDE.md  
**DevOps**: Read MONITORING_GUIDE.md  
**QA**: Read TESTING_GUIDE.md  
**Frontend**: Read FRONTEND_INTEGRATION_GUIDE.md  
**Legal/Clinical**: Read CLINICAL_REVIEW_REQUIREMENTS.md  
**Product/Business**: Read BUSINESS_OVERVIEW.md

**Everyone**: Read the 4 sacred documents in `docs/api/`

---

**Complete documentation for Automatic Pipeline System** ✅


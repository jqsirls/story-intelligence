# CI/CD Pipeline Documentation

This directory contains the complete CI/CD pipeline for the Storytailor Multi-Agent System, implementing blue-green deployment strategy with comprehensive testing and monitoring.

## Overview

The CI/CD pipeline consists of three main workflows:

1. **Continuous Integration** (`ci.yml`) - Runs on every push/PR
2. **Staging Deployment** (`staging-deploy.yml`) - Deploys to staging on merge to develop
3. **Production Deployment** (`production-deploy.yml`) - Blue-green deployment on version tags

## Workflows

### 1. Continuous Integration (`ci.yml`)

Triggered on: Push to any branch, Pull requests to main/develop

**Jobs:**
- **Code Quality**: Linting, type checking, formatting validation
- **Test Suite**: Unit tests with coverage reporting
- **Security Scan**: npm audit, Snyk, CodeQL analysis
- **Build**: Package creation and artifact generation
- **Infrastructure**: Terraform validation
- **Database**: Migration validation with Supabase
- **Performance**: Baseline performance testing
- **Compliance**: COPPA/GDPR validation

**Performance Requirements:**
- 90% test coverage minimum
- All security scans must pass
- Infrastructure validation required
- Performance baseline under 800ms

### 2. Staging Deployment (`staging-deploy.yml`)

Triggered on: Push to develop branch

**Jobs:**
- **Pre-deployment**: Full test suite validation
- **Infrastructure**: Deploy staging AWS resources
- **Database**: Run migrations on staging database
- **Integration Tests**: End-to-end testing against staging
- **Load Tests**: 50 VU load test for 5 minutes
- **Security Tests**: OWASP ZAP security scanning
- **Smoke Tests**: Basic endpoint validation

**Staging Environment:**
- URL: `https://staging-api.storytailor.com`
- Reduced resources for cost optimization
- Full feature testing enabled
- Automated rollback on failure

### 3. Production Deployment (`production-deploy.yml`)

Triggered on: Version tags (v1.2.3) or manual dispatch

**Blue-Green Deployment Strategy:**
1. **Pre-deployment**: Comprehensive validation
2. **Green Deploy**: Deploy new version to green environment
3. **Green Testing**: Full production load testing (500 RPS)
4. **Traffic Switch**: Route 53 DNS switch to green
5. **Monitoring**: 15-minute health monitoring
6. **Blue Cleanup**: Remove old blue environment

**Production Requirements:**
- Zero-downtime deployment
- Automatic rollback capability
- 500 RPS load testing
- Security validation
- 15-minute post-deployment monitoring

### 4. Smoke Tests (`smoke-tests.yml`)

Triggered on: Schedule (every 15 minutes) or manual dispatch

**Tests:**
- Health endpoint validation
- Router and Universal Agent health
- CORS configuration
- Rate limiting validation
- Response time monitoring

## Required Secrets

Configure these secrets in GitHub repository settings:

### AWS Configuration
```
AWS_ACCESS_KEY_ID              # AWS access key for deployments
AWS_SECRET_ACCESS_KEY          # AWS secret key for deployments
TERRAFORM_STATE_BUCKET         # S3 bucket for Terraform state
LAMBDA_ARTIFACTS_BUCKET        # S3 bucket for Lambda packages
```

### Supabase Configuration
```
# Staging
SUPABASE_URL_STAGING           # Staging Supabase project URL
SUPABASE_ANON_KEY_STAGING      # Staging anonymous key
SUPABASE_SERVICE_KEY_STAGING   # Staging service role key
SUPABASE_PROJECT_REF_STAGING   # Staging project reference

# Production
SUPABASE_URL_PROD              # Production Supabase project URL
SUPABASE_ANON_KEY_PROD         # Production anonymous key
SUPABASE_SERVICE_KEY_PROD      # Production service role key
SUPABASE_PROJECT_REF_PROD      # Production project reference

SUPABASE_ACCESS_TOKEN          # Supabase CLI access token
```

### API Keys
```
OPENAI_API_KEY                 # OpenAI API key
ELEVENLABS_API_KEY             # ElevenLabs API key
STABILITY_API_KEY              # Stability AI API key
AMAZON_API_KEY                 # Amazon Product API key

# Stripe
STRIPE_SECRET_KEY_TEST         # Stripe test key for staging
STRIPE_SECRET_KEY_PROD         # Stripe production key

# JWT Secrets
JWT_SECRET_STAGING             # JWT secret for staging
JWT_SECRET_PROD                # JWT secret for production

# Alexa
ALEXA_SKILL_ID_STAGING         # Alexa skill ID for staging
ALEXA_SKILL_ID_PROD            # Alexa skill ID for production
```

### Testing & Security
```
API_KEY_STAGING                # API key for staging tests
API_KEY_PROD                   # API key for production tests
CODECOV_TOKEN                  # Codecov integration token
SNYK_TOKEN                     # Snyk security scanning token
```

### DNS & SSL
```
ROUTE53_HOSTED_ZONE_ID         # Route 53 hosted zone for DNS
ACM_CERTIFICATE_ARN            # SSL certificate ARN
```

### Notifications
```
SLACK_WEBHOOK_URL              # Slack webhook for notifications
```

### Turbo (Optional)
```
TURBO_TOKEN                    # Turbo remote cache token
TURBO_TEAM                     # Turbo team identifier
```

## Local Development

### Prerequisites
```bash
# Install required tools
brew install awscli terraform k6 supabase/tap/supabase

# Install Node.js dependencies
npm install

# Install Python dependencies for testing
pip install -r testing/requirements.txt
```

### Running Tests Locally
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Load tests
npm run test:load

# Security tests (requires OWASP ZAP)
npm run test:security

# Compliance tests
npm run test:compliance

# Smoke tests
npm run test:smoke
```

### Local Infrastructure
```bash
# Start local development environment
npm run infrastructure:start

# Stop local environment
npm run infrastructure:stop

# Reset local environment
npm run infrastructure:reset
```

## Deployment Commands

### Manual Deployments
```bash
# Deploy to staging
gh workflow run staging-deploy.yml

# Deploy to production (requires tag)
git tag v1.2.3
git push origin v1.2.3

# Manual production deployment
gh workflow run production-deploy.yml -f tag=v1.2.3

# Emergency deployment (skip tests)
gh workflow run production-deploy.yml -f tag=v1.2.3 -f skip_tests=true
```

### Monitoring Deployments
```bash
# Watch workflow status
gh run list --workflow=production-deploy.yml

# View workflow logs
gh run view <run-id> --log

# Check deployment status
curl https://api.storytailor.com/health
```

## Blue-Green Deployment Details

### Architecture
- **Blue Environment**: Current production (storytailor-prod-blue)
- **Green Environment**: New deployment (storytailor-prod-green)
- **DNS Switch**: Route 53 CNAME update for traffic routing
- **Rollback**: Automatic revert to blue on failure

### Deployment Flow
1. Green environment deployed with new code
2. Comprehensive testing on green environment
3. DNS switched to point to green environment
4. 15-minute monitoring period
5. Blue environment destroyed on success
6. Green becomes new blue for next deployment

### Rollback Process
```bash
# Automatic rollback triggers:
- Green environment health check failure
- Load test failure (P95 > 800ms or error rate > 1%)
- Security test failure
- Post-deployment monitoring alerts

# Manual rollback:
gh workflow run production-deploy.yml -f rollback=true
```

## Monitoring and Alerting

### CloudWatch Metrics
- API Gateway latency and error rates
- Lambda function duration and errors
- Redis performance metrics
- Custom business metrics

### Alerts
- High response time (>800ms P95)
- Error rate >1%
- Lambda cold starts >150ms
- Security vulnerabilities detected
- Compliance violations

### Slack Notifications
- Deployment success/failure
- Test results
- Security alerts
- Performance degradation

## Troubleshooting

### Common Issues

1. **Terraform State Lock**
   ```bash
   # Force unlock (use carefully)
   terraform force-unlock <lock-id>
   ```

2. **Lambda Deployment Timeout**
   ```bash
   # Check function status
   aws lambda get-function --function-name <function-name>
   
   # Manual update
   aws lambda update-function-code --function-name <function-name> --s3-bucket <bucket> --s3-key <key>
   ```

3. **DNS Propagation Issues**
   ```bash
   # Check DNS resolution
   dig api.storytailor.com
   
   # Force DNS cache clear
   sudo dscacheutil -flushcache
   ```

4. **Test Failures**
   ```bash
   # Run specific test suite
   npm run test:integration -- --testNamePattern="Router"
   
   # Debug mode
   DEBUG=* npm run test:integration
   ```

### Emergency Procedures

1. **Production Outage**
   - Check CloudWatch dashboards
   - Review recent deployments
   - Execute rollback if needed
   - Notify team via Slack

2. **Security Incident**
   - Immediately disable affected endpoints
   - Review security scan results
   - Apply security patches
   - Conduct post-incident review

3. **Performance Degradation**
   - Check CloudWatch metrics
   - Review recent changes
   - Scale resources if needed
   - Investigate root cause

## Contributing

### Adding New Tests
1. Create test files in appropriate directories
2. Update CI workflow if needed
3. Document test requirements
4. Ensure proper cleanup

### Modifying Workflows
1. Test changes in feature branch
2. Validate with staging deployment
3. Update documentation
4. Get team review before merging

### Infrastructure Changes
1. Update Terraform configurations
2. Test in staging environment
3. Plan production deployment
4. Coordinate with team for deployment window

## Security Considerations

- All secrets stored in GitHub Secrets
- AWS IAM roles with minimal permissions
- Encrypted Terraform state storage
- Regular security scanning
- Compliance validation in CI/CD

## Performance Requirements

- **Response Time**: P95 < 800ms
- **Error Rate**: < 1%
- **Cold Starts**: < 150ms
- **Throughput**: 500 RPS sustained
- **Availability**: 99.9% uptime

## Compliance

- **COPPA**: Child data protection validation
- **GDPR**: Data privacy compliance checks
- **UK Children's Code**: Age-appropriate design validation
- **Security**: OWASP Top 10 scanning
- **Audit**: Complete deployment audit trail
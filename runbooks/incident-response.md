# Storytailor Incident Response Runbook

## Severity 1 (Critical) Incident Response

### Immediate Response (0-15 minutes)

#### 1. Incident Declaration
- **Who:** Any team member can declare a Sev-1 incident
- **How:** Post in #incidents Slack channel: `!incident sev1 [brief description]`
- **Auto-actions:** 
  - PagerDuty alert sent to on-call engineer
  - Incident commander automatically assigned
  - War room created in Slack

#### 2. Initial Assessment
**Incident Commander Actions:**
```bash
# Check system health
curl -f https://api.storytailor.com/health
curl -f https://staging.storytailor.com/health

# Check key metrics
aws cloudwatch get-metric-statistics \
  --namespace "Storytailor/API" \
  --metric-name "ErrorRate" \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average

# Check database connectivity
psql -h storytailor-prod.cluster-xyz.us-east-1.rds.amazonaws.com -U storytailor -c "SELECT 1;"
```

#### 3. Stakeholder Notification
- **Internal:** Engineering team, Product team, Leadership
- **External:** Customer support team (for user-facing issues)
- **Timeline:** Within 15 minutes of incident declaration

### Investigation Phase (15-60 minutes)

#### 4. Gather Evidence
```bash
# Collect recent logs
aws logs filter-log-events \
  --log-group-name "/aws/lambda/storytailor-api" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern "ERROR"

# Check recent deployments
git log --oneline --since="2 hours ago"

# Check infrastructure changes
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=RunInstances \
  --start-time $(date -u -d '2 hours ago' +%Y-%m-%dT%H:%M:%S)
```

#### 5. Impact Assessment
- **User Impact:** Number of affected users, geographic distribution
- **Business Impact:** Revenue impact, reputation risk
- **System Impact:** Which services are affected, cascade effects

#### 6. Root Cause Analysis (Initial)
Common incident patterns:
- **Database Issues:** Connection pool exhaustion, query timeouts
- **External Service Failures:** OpenAI API, ElevenLabs, AWS services
- **Deployment Issues:** Bad code deploy, configuration changes
- **Security Issues:** DDoS attack, credential compromise
- **Infrastructure Issues:** AWS service outages, network issues

### Mitigation Phase (60+ minutes)

#### 7. Immediate Mitigation
Based on incident type:

**Database Issues:**
```bash
# Scale up RDS instance
aws rds modify-db-instance \
  --db-instance-identifier storytailor-prod \
  --db-instance-class db.r5.2xlarge \
  --apply-immediately

# Clear connection pool
kubectl rollout restart deployment/api-server
```

**External Service Issues:**
```bash
# Enable fallback mode
aws ssm put-parameter \
  --name "/storytailor/config/fallback-mode" \
  --value "true" \
  --overwrite

# Restart services to pick up config
kubectl rollout restart deployment/content-agent
```

**Bad Deployment:**
```bash
# Rollback to previous version
git checkout HEAD~1
./scripts/deploy.sh production --rollback

# Or use blue-green deployment switch
aws elbv2 modify-listener \
  --listener-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/storytailor-alb/50dc6c495c0c9188/0467ef3c8400ae65 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/storytailor-blue/73e2d6bc24d8a067
```

#### 8. Monitoring and Validation
```bash
# Monitor error rates
watch -n 30 'aws cloudwatch get-metric-statistics \
  --namespace "Storytailor/API" \
  --metric-name "ErrorRate" \
  --start-time $(date -u -d "5 minutes ago" +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average'

# Test critical user flows
curl -X POST https://api.storytailor.com/conversation/start \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"intent": "createStory", "storyType": "bedtime", "userInput": "Test story"}'
```

### Recovery Phase

#### 9. Full System Validation
- Run automated smoke tests
- Validate all critical user journeys
- Check data integrity
- Verify external integrations

#### 10. Communication Updates
**Internal Updates:**
- Update #incidents channel every 30 minutes
- Send executive summary to leadership
- Update engineering team on technical details

**External Updates (if user-facing):**
- Update status page: https://status.storytailor.com
- Send customer communication via support channels
- Social media updates if necessary

### Post-Incident Phase

#### 11. Incident Closure
**Criteria for closure:**
- All systems functioning normally
- Error rates back to baseline
- No user impact for 30+ minutes
- Monitoring shows stable metrics

**Closure Actions:**
```bash
# Document final status
echo "Incident resolved at $(date)" >> incident-log.txt

# Reset any emergency configurations
aws ssm put-parameter \
  --name "/storytailor/config/fallback-mode" \
  --value "false" \
  --overwrite

# Send closure notification
slack-cli send "#incidents" "🟢 Incident resolved. All systems operational."
```

#### 12. Post-Mortem Scheduling
- Schedule post-mortem within 24 hours
- Invite all incident participants
- Prepare timeline and technical details
- Focus on prevention, not blame

## Incident Types and Specific Procedures

### Child Safety Incidents
**Triggers:**
- Inappropriate content generated
- Safety filter bypass detected
- Crisis intervention failure

**Immediate Actions:**
1. Disable affected content generation models
2. Notify child safety team immediately
3. Review and quarantine affected content
4. Notify legal team if required

```bash
# Emergency content model disable
aws ssm put-parameter \
  --name "/storytailor/safety/emergency-disable" \
  --value "true" \
  --overwrite

# Quarantine content
aws s3 cp s3://storytailor-content/stories/ s3://storytailor-quarantine/ --recursive
```

### Security Incidents
**Triggers:**
- Unauthorized access detected
- Data breach suspected
- Credential compromise

**Immediate Actions:**
1. Isolate affected systems
2. Rotate all potentially compromised credentials
3. Enable enhanced monitoring
4. Notify security team and legal

```bash
# Rotate API keys immediately
./qa-orchestrator/remediation-scripts/rotate-secrets.sh

# Enable security monitoring
aws ssm put-parameter \
  --name "/storytailor/security/enhanced-monitoring" \
  --value "true" \
  --overwrite
```

### Data Loss Incidents
**Triggers:**
- Database corruption
- Accidental data deletion
- Backup failure

**Immediate Actions:**
1. Stop all write operations
2. Assess data loss scope
3. Initiate point-in-time recovery
4. Notify data protection officer

```bash
# Stop write operations
kubectl scale deployment/api-server --replicas=0

# Initiate database recovery
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier storytailor-prod \
  --target-db-instance-identifier storytailor-recovery \
  --restore-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S)
```

## Contact Information

### On-Call Rotation
- **Primary:** Engineering on-call (PagerDuty)
- **Secondary:** Engineering manager
- **Escalation:** VP Engineering

### Key Contacts
- **Incident Commander:** Auto-assigned via PagerDuty
- **Engineering Manager:** @eng-manager (Slack)
- **VP Engineering:** @vp-eng (Slack)
- **Child Safety Lead:** @safety-lead (Slack)
- **Security Lead:** @security-lead (Slack)
- **Legal:** legal@storytailor.com

### External Contacts
- **AWS Support:** Enterprise support case
- **OpenAI Support:** platform.openai.com/support
- **ElevenLabs Support:** help.elevenlabs.io

## Tools and Resources

### Monitoring Dashboards
- **System Health:** https://grafana.storytailor.com/d/system-health
- **API Metrics:** https://grafana.storytailor.com/d/api-metrics
- **User Journey:** https://grafana.storytailor.com/d/user-journey
- **Security:** https://grafana.storytailor.com/d/security

### Log Aggregation
- **Application Logs:** https://kibana.storytailor.com
- **Infrastructure Logs:** AWS CloudWatch
- **Security Logs:** AWS CloudTrail

### Communication Channels
- **#incidents:** Primary incident coordination
- **#engineering:** Technical discussion
- **#leadership:** Executive updates
- **#customer-support:** User impact coordination

## Incident Severity Definitions

### Severity 1 (Critical)
- Complete service outage
- Data loss or corruption
- Security breach
- Child safety incident
- **Response Time:** 15 minutes
- **Resolution Target:** 4 hours

### Severity 2 (High)
- Significant feature degradation
- Performance issues affecting >50% users
- External service integration failure
- **Response Time:** 1 hour
- **Resolution Target:** 24 hours

### Severity 3 (Medium)
- Minor feature issues
- Performance degradation <50% users
- Non-critical service issues
- **Response Time:** 4 hours
- **Resolution Target:** 72 hours

### Severity 4 (Low)
- Cosmetic issues
- Documentation problems
- Non-urgent improvements
- **Response Time:** Next business day
- **Resolution Target:** 1 week

## Runbook Maintenance

**Review Schedule:** Monthly
**Owner:** Engineering Team
**Last Updated:** 2025-01-31
**Next Review:** 2025-02-28

**Change Log:**
- 2025-01-31: Initial version created for baseline-20250801 release
- 2025-01-31: Added child safety and security incident procedures
- 2025-01-31: Added specific command examples and contact information
# Automatic Pipeline System - Operations Guide

**Audience**: Operations Team  
**Version**: 1.0  
**Date**: December 25, 2025

---

## Quick Reference

### Emergency Contacts

- **Engineering Lead**: [Contact]
- **On-Call Engineer**: [PagerDuty]
- **DevOps**: [Contact]

### Emergency Actions

**Stop all pipelines immediately**:
```bash
# Disable all EventBridge rules
aws events disable-rule --name storytailor-daily-digest-production
aws events disable-rule --name storytailor-weekly-insights-production
# ... (repeat for all 8 rules)
```

**Stop specific pipeline**:
```bash
# Flip kill switch
aws ssm put-parameter \
  --name /storytailor-production/pipelines/daily-digest/enabled \
  --value "false" \
  --overwrite
```

---

## Daily Operations

### Morning Checklist (9am)

1. **Check overnight jobs**:
   - Daily digest (8pm UTC = ~3pm EST previous day)
   - Story scoring (4am UTC = 11pm EST previous day)
   - Referral rewards (1am UTC = 8pm EST previous day)
   - Expire credits (3am UTC = 10pm EST previous day)

2. **Review CloudWatch logs**:
   ```bash
   aws logs tail /aws/lambda/storytailor-intelligence-curator-production \
     --since 12h \
     --follow
   ```

3. **Check error rate**:
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Lambda \
     --metric-name Errors \
     --dimensions Name=FunctionName,Value=storytailor-intelligence-curator-production \
     --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 3600 \
     --statistics Sum
   ```

4. **Check email metrics** (SendGrid dashboard):
   - Open rate: Should be >40%
   - Unsubscribe rate: Should be <0.2%
   - Bounce rate: Should be <2%
   - Spam complaints: Should be 0

### Weekly Checklist (Monday)

1. **Review veto patterns**:
   ```sql
   SELECT 
     pipeline_type,
     veto_reason,
     COUNT(*) as count
   FROM pipeline_executions
   WHERE created_at > NOW() - INTERVAL '7 days'
   AND vetoed = TRUE
   GROUP BY pipeline_type, veto_reason
   ORDER BY count DESC;
   ```

2. **Check SLA compliance**:
   ```sql
   SELECT 
     pipeline_type,
     COUNT(*) as total,
     SUM(CASE WHEN veto_reason = 'SLA_MISSED' THEN 1 ELSE 0 END) as sla_violations,
     ROUND(100.0 * SUM(CASE WHEN veto_reason = 'SLA_MISSED' THEN 1 ELSE 0 END) / COUNT(*), 2) as sla_violation_rate
   FROM pipeline_executions
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY pipeline_type;
   ```
   
   **Alert if**: SLA violation rate >5%

3. **Review email volume**:
   ```sql
   SELECT 
     DATE(sent_at) as date,
     COUNT(*) as emails_sent,
     COUNT(DISTINCT user_id) as unique_users
   FROM email_delivery_log
   WHERE sent_at > NOW() - INTERVAL '7 days'
   GROUP BY DATE(sent_at)
   ORDER BY date;
   ```

### Monthly Checklist (First Monday)

1. **Org health reports should send** (9am UTC first Monday)
2. **Review monthly metrics**:
   - Email open rates by type
   - Unsubscribe rates by type
   - Referral conversion rates
   - Credit issuance volume
   - Pipeline execution counts
3. **Analyze human override patterns**:
   ```sql
   SELECT 
     pipeline_type,
     override_type,
     COUNT(*) as count
   FROM human_overrides
   WHERE occurred_at > NOW() - INTERVAL '30 days'
   GROUP BY pipeline_type, override_type
   ORDER BY count DESC;
   ```
4. **Review false positive rates**:
   - Therapeutic: Should be <30%
   - Crisis: Should be <10%
   - If higher, escalate to engineering

---

## Kill Switch Management

### When to Use Kill Switches

**Immediate disable if**:
- Unsubscribe spike (>0.5% in 1 hour)
- User complaints about spam
- Email content error discovered
- Service degradation (slow/failing)

### How to Disable Pipeline

```bash
# 1. Flip kill switch
aws ssm put-parameter \
  --name /storytailor-production/pipelines/daily-digest/enabled \
  --value "false" \
  --overwrite \
  --region us-east-1

# 2. Verify disabled (takes effect within 5 minutes due to cache)
aws ssm get-parameter \
  --name /storytailor-production/pipelines/daily-digest/enabled

# 3. Monitor logs to confirm no new executions
aws logs tail /aws/lambda/storytailor-intelligence-curator-production --follow
```

### How to Re-Enable Pipeline

```bash
# After fix is deployed
aws ssm put-parameter \
  --name /storytailor-production/pipelines/daily-digest/enabled \
  --value "true" \
  --overwrite
```

### Kill Switch Status Dashboard

```bash
# Check all kill switches
aws ssm get-parameters-by-path \
  --path /storytailor-production/pipelines \
  --recursive | jq '.Parameters[] | {Name: .Name, Value: .Value}'
```

**Expected output**:
```json
{
  "Name": "/storytailor-production/pipelines/daily-digest/enabled",
  "Value": "true"
}
{
  "Name": "/storytailor-production/pipelines/weekly-insights/enabled",
  "Value": "true"
}
...
```

---

## Incident Response

### Scenario 1: Email Spam Complaints

**Symptoms**:
- Unsubscribe rate spikes to >0.5%
- Support tickets: "Too many emails"
- Users marking as spam

**Response**:
1. **Immediate** (within 5 minutes):
   ```bash
   # Disable daily digest
   aws ssm put-parameter \
     --name /storytailor-production/pipelines/daily-digest/enabled \
     --value "false" \
     --overwrite
   ```

2. **Investigate** (within 1 hour):
   - Check veto logs: Why did curator approve?
   - Check frequency caps: Are they working?
   - Check user preferences: Are they respected?

3. **Fix** (within 24 hours):
   - Increase confidence threshold
   - Reduce frequency caps
   - Improve content quality

4. **Re-enable** (after fix verified in staging):
   ```bash
   aws ssm put-parameter \
     --name /storytailor-production/pipelines/daily-digest/enabled \
     --value "true" \
     --overwrite
   ```

### Scenario 2: EventBridge Job Failure

**Symptoms**:
- CloudWatch errors in curator Lambda
- Job timeout (>300s)
- No emails sent for expected job

**Response**:
1. **Check CloudWatch logs**:
   ```bash
   aws logs filter-log-events \
     --log-group-name /aws/lambda/storytailor-intelligence-curator-production \
     --start-time $(date -d '1 hour ago' +%s)000 \
     --filter-pattern "ERROR"
   ```

2. **Check Lambda metrics**:
   - Duration: Should be <30s for most jobs
   - Errors: Should be 0
   - Throttles: Should be 0

3. **If timeout**:
   - Check batch size (might be too many users)
   - Increase Lambda timeout if needed
   - Add pagination to batch processing

4. **Manual replay** (if needed):
   ```bash
   aws events put-events --entries '[{
     "Source": "storytailor.manual",
     "DetailType": "retry",
     "Detail": "{\"jobType\":\"daily_digest\",\"retry\":true}"
   }]'
   ```

### Scenario 3: Referral Reward Not Issued

**Symptoms**:
- User reports: "I referred someone but didn't get credit"
- Referral tracking shows conversion but no reward

**Response**:
1. **Check referral tracking**:
   ```sql
   SELECT * FROM referral_tracking
   WHERE referrer_id = 'user_id'
   ORDER BY created_at DESC;
   ```

2. **Check reward ledger**:
   ```sql
   SELECT * FROM reward_ledger
   WHERE user_id = 'user_id'
   AND source = 'referral'
   ORDER BY created_at DESC;
   ```

3. **Check Stripe balance**:
   ```bash
   stripe customers retrieve cus_xxx
   # Look for balance (should be negative for credit)
   ```

4. **Manual credit issuance** (if needed):
   ```typescript
   await referralRewardService.issueCredit({
     userId: 'user_id',
     amount: 1000,
     source: 'referral',
     description: 'Manual credit - referral reward',
     metadata: { manual: true, ticket: 'SUP-123' }
   });
   ```

### Scenario 4: Crisis Alert Not Sent

**Symptoms**:
- Parent reports: "My child was distressed but I wasn't notified"
- Crisis detection logged but no email

**Response**:
1. **Check pipeline execution**:
   ```sql
   SELECT * FROM pipeline_executions
   WHERE pipeline_type = 'crisis_alert'
   AND user_id = 'user_id'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

2. **Check veto reason**:
   - `LOW_CONFIDENCE`: Crisis threshold is 0.95 (very high)
   - `SLA_MISSED`: Detected too late (>5 minutes)
   - `KILL_SWITCH_ACTIVE`: Disabled

3. **If vetoed incorrectly**:
   - Review detection algorithm
   - Consider lowering threshold (with clinical approval)
   - Escalate to engineering + clinical team

4. **If sent but not received**:
   - Check email_delivery_log
   - Check SendGrid activity
   - Check user's email preferences

---

## Monitoring Dashboards

### Pipeline Health Dashboard

**CloudWatch Metrics**:
- Pipeline executions (by type)
- Veto rate (by type and reason)
- Email delivery success rate
- EventBridge job duration
- Lambda errors/throttles

**Access**:
```
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=Storytailor-Pipelines
```

### Email Performance Dashboard

**SendGrid Dashboard**:
- Open rates by template
- Click rates by template
- Bounce/spam rates
- Unsubscribe rates

**Access**:
```
https://app.sendgrid.com/statistics
```

### Database Dashboard

**Supabase Studio**:
- Pipeline execution logs
- Email delivery logs
- Reward ledger
- Consumption metrics

**Access**:
```
https://lendybmmnlqelrhkhdyc.supabase.co
```

---

## Alerts & Notifications

### Critical Alerts (Page On-Call)

- Email failure rate >5%
- Crisis alert SLA violations >3/hour
- Lambda errors >10/hour
- EventBridge job failures

### Warning Alerts (Slack Notification)

- Veto rate <10% for insights (sending too much)
- Veto rate >90% for insights (not enough data)
- Unsubscribe rate >0.3%
- SLA violations 1-3/hour

### Info Alerts (Daily Email)

- Daily job execution summary
- Email volume report
- Credit issuance summary
- Pipeline execution counts

---

## Scheduled Maintenance

### Weekly (Sunday 2am UTC)

- Expire old credits (3am UTC - happens automatically)
- Archive old pipeline executions (>90 days)
- Archive old email delivery logs (>90 days)

### Monthly (First Monday)

- Review override patterns
- Analyze false positive rates
- Generate ops health report
- Update runbooks based on incidents

### Quarterly

- Clinical review (therapeutic pathways)
- Legal review (liability assessment)
- Insurance review (coverage verification)
- Comprehensive metric analysis

---

## Runbook Updates

### When to Update This Guide

- New pipeline type added
- New incident pattern discovered
- Threshold changed
- Process improved
- Team feedback

### How to Update

1. Create branch
2. Update documentation
3. PR review by ops team
4. Merge to main
5. Notify team in Slack

---

## Team Contacts

**Engineering**:
- Lead: [Contact]
- Pipeline Owner: [Contact]
- On-Call: [PagerDuty]

**Product**:
- Product Owner: [Contact]
- Design Lead: [Contact]

**Clinical**:
- Clinical Psychologist: [Contact]
- Ethics Board: [Contact]

**Legal**:
- Legal Counsel: [Contact]
- Compliance Officer: [Contact]

---

## SLAs

### Response Times

- **Critical** (crisis alert failures): 15 minutes
- **High** (email delivery failures): 1 hour
- **Medium** (job failures): 4 hours
- **Low** (optimization requests): 1 week

### Uptime Targets

- Intelligence Curator Lambda: 99.9%
- EventBridge rules: 99.99%
- Email delivery: 99%
- Database functions: 99.9%

---

## Escalation Path

### Level 1: Operations Team

- Kill switch activation
- Rule enable/disable
- Basic troubleshooting
- User preference updates

### Level 2: Engineering Team

- Code fixes
- Threshold adjustments
- New pipeline deployment
- Database query optimization

### Level 3: Clinical/Legal Team

- Therapeutic feature issues
- False positive crisis alerts
- Language validation failures
- Liability concerns

---

**For 24/7 support**: [PagerDuty Link]  
**For non-urgent issues**: [Jira Board]  
**For questions**: [Slack Channel: #pipeline-ops]


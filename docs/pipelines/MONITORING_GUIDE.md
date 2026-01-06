# Automatic Pipeline System - Monitoring Guide

**Audience**: DevOps/SRE Team  
**Version**: 1.0  
**Date**: December 25, 2025

---

## Monitoring Stack

- **Logs**: CloudWatch Logs
- **Metrics**: CloudWatch Metrics + Custom Metrics
- **Alerts**: CloudWatch Alarms → SNS → PagerDuty
- **Dashboards**: CloudWatch Dashboards
- **Tracing**: X-Ray (optional)

---

## CloudWatch Log Groups

### Lambda Functions

```
/aws/lambda/storytailor-intelligence-curator-production
/aws/lambda/storytailor-intelligence-curator-staging
/aws/lambda/storytailor-universal-agent-production
```

### EventBridge

```
/aws/events/storytailor-daily-digest-production
/aws/events/storytailor-weekly-insights-production
# ... (one per rule)
```

---

## Key Metrics to Monitor

### 1. Pipeline Execution Metrics

**Custom Metrics** (emit from Lambda):

```typescript
await cloudwatch.putMetricData({
  Namespace: 'Storytailor/Pipelines',
  MetricData: [
    {
      MetricName: 'PipelineExecutions',
      Value: 1,
      Unit: 'Count',
      Dimensions: [
        { Name: 'PipelineType', Value: 'daily_digest' },
        { Name: 'Environment', Value: 'production' }
      ]
    },
    {
      MetricName: 'PipelineVetoes',
      Value: 1,
      Unit: 'Count',
      Dimensions: [
        { Name: 'PipelineType', Value: 'daily_digest' },
        { Name: 'VetoReason', Value: 'INSUFFICIENT_SIGNAL' }
      ]
    }
  ]
});
```

**Queries**:
- Total executions per pipeline type (24h)
- Veto rate per pipeline type (%)
- Veto reasons distribution
- Execution duration (p50, p95, p99)

### 2. Email Delivery Metrics

**From email_delivery_log table**:

```sql
-- Email volume by type (last 24h)
SELECT 
  email_type,
  COUNT(*) as sent,
  SUM(CASE WHEN status = 'opened' THEN 1 ELSE 0 END) as opened,
  ROUND(100.0 * SUM(CASE WHEN status = 'opened' THEN 1 ELSE 0 END) / COUNT(*), 1) as open_rate,
  SUM(CASE WHEN status = 'clicked' THEN 1 ELSE 0 END) as clicked,
  ROUND(100.0 * SUM(CASE WHEN status = 'clicked' THEN 1 ELSE 0 END) / COUNT(*), 1) as ctr
FROM email_delivery_log
WHERE sent_at > NOW() - INTERVAL '24 hours'
GROUP BY email_type
ORDER BY sent DESC;
```

**Alerts**:
- Open rate <30% for any type
- Unsubscribe spike (>10 in 1 hour)
- Bounce rate >5%
- Spam complaints >0

### 3. Emotional SLA Metrics

**From pipeline_executions table**:

```sql
-- SLA compliance by pipeline type
SELECT 
  pipeline_type,
  COUNT(*) as total,
  SUM(CASE WHEN veto_reason = 'SLA_MISSED' THEN 1 ELSE 0 END) as sla_violations,
  ROUND(100.0 * SUM(CASE WHEN veto_reason = 'SLA_MISSED' THEN 1 ELSE 0 END) / COUNT(*), 2) as violation_rate
FROM pipeline_executions
WHERE created_at > NOW() - INTERVAL '24 hours'
AND pipeline_type IN ('crisis_alert', 'early_intervention', 'story_failure', 'asset_timeout')
GROUP BY pipeline_type;
```

**Alerts**:
- SLA violation rate >5%
- Crisis alert SLA violations >1 in 1 hour

### 4. Referral & Reward Metrics

**From reward_ledger table**:

```sql
-- Daily credit issuance
SELECT 
  DATE(created_at) as date,
  source,
  COUNT(*) as count,
  SUM(amount) / 100.0 as total_usd
FROM reward_ledger
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), source
ORDER BY date DESC, total_usd DESC;
```

**Metrics**:
- Credits issued per day
- Credits applied per day
- Credits expired per day
- Referral conversion rate
- Milestone bonus rate

### 5. Lambda Performance

**AWS Metrics** (automatic):
- Invocations
- Errors
- Duration (p50, p95, p99)
- Throttles
- Concurrent executions

**Alerts**:
- Error rate >1%
- Duration p99 >30s for batch jobs
- Throttles >0

---

## CloudWatch Alarms

### Critical Alarms (Page On-Call)

**Email Failure Rate**:
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name storytailor-email-failure-rate \
  --metric-name EmailDeliveryFailure \
  --namespace Storytailor/Pipelines \
  --statistic Sum \
  --period 3600 \
  --evaluation-periods 1 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:storytailor-critical-alerts
```

**Crisis Alert SLA Violations**:
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name storytailor-crisis-sla-violations \
  --metric-name PipelineVetoes \
  --namespace Storytailor/Pipelines \
  --dimensions Name=VetoReason,Value=SLA_MISSED Name=PipelineType,Value=crisis_alert \
  --statistic Sum \
  --period 3600 \
  --evaluation-periods 1 \
  --threshold 3 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:storytailor-critical-alerts
```

**Lambda Errors**:
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name storytailor-curator-errors \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --dimensions Name=FunctionName,Value=storytailor-intelligence-curator-production \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:storytailor-critical-alerts
```

### Warning Alarms (Slack Notification)

**High Veto Rate** (might indicate data collection issues):
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name storytailor-high-veto-rate \
  --metric-name VetoRate \
  --namespace Storytailor/Pipelines \
  --statistic Average \
  --period 86400 \
  --evaluation-periods 1 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:storytailor-warning-alerts
```

**Unsubscribe Spike**:
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name storytailor-unsubscribe-spike \
  --metric-name Unsubscribes \
  --namespace Storytailor/Email \
  --statistic Sum \
  --period 3600 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:storytailor-warning-alerts
```

---

## Dashboard Widgets

### Pipeline Execution Dashboard

**Widget 1: Executions by Type (24h)**
```
Metric: PipelineExecutions
Stat: Sum
Period: 1 hour
Dimensions: PipelineType
Chart: Stacked area
```

**Widget 2: Veto Rate (%)**
```
Metric: PipelineVetoes / PipelineExecutions * 100
Stat: Average
Period: 1 hour
Dimensions: PipelineType
Chart: Line
```

**Widget 3: Veto Reasons (Pie)**
```
Metric: PipelineVetoes
Stat: Sum
Period: 24 hours
Dimensions: VetoReason
Chart: Pie
```

**Widget 4: SLA Violations**
```
Metric: SLAViolations
Stat: Sum
Period: 1 hour
Dimensions: PipelineType
Chart: Bar
```

### Email Performance Dashboard

**Widget 1: Email Volume (7 days)**
```
Query: email_delivery_log
Metric: COUNT(*) GROUP BY DATE(sent_at), email_type
Chart: Stacked bar
```

**Widget 2: Open Rate by Type**
```
Query: email_delivery_log
Metric: (opened / sent) * 100 GROUP BY email_type
Chart: Bar
```

**Widget 3: Unsubscribe Rate**
```
Query: email_delivery_log
Metric: SUM(CASE WHEN status = 'unsubscribed') / COUNT(*)
Chart: Line (7-day trend)
```

### Referral Dashboard

**Widget 1: Daily Credits Issued**
```
Query: reward_ledger
Metric: SUM(amount) / 100 GROUP BY DATE(created_at)
Chart: Bar
```

**Widget 2: Conversion Rate**
```
Query: referral_tracking
Metric: (converted / total) * 100
Chart: Line
```

---

## Log Queries

### Query 1: Find Vetoed Pipelines

```
fields @timestamp, pipeline_type, veto_reason, confidence_score, signal_count
| filter vetoed = true
| sort @timestamp desc
| limit 100
```

### Query 2: Find Email Failures

```
fields @timestamp, user_id, email_type, error
| filter status = "failed"
| sort @timestamp desc
| limit 50
```

### Query 3: Find SLA Violations

```
fields @timestamp, pipeline_type, elapsed_minutes, sla_minutes
| filter veto_reason = "SLA_MISSED"
| sort @timestamp desc
| stats count() by pipeline_type
```

### Query 4: Find High-Value Events

```
fields @timestamp, pipeline_type, confidence_score
| filter confidence_score > 0.9
| filter execute = true
| sort @timestamp desc
```

---

## Database Monitoring

### Slow Query Detection

```sql
-- Find slow queries on new tables
SELECT 
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE query LIKE '%consumption_metrics%'
   OR query LIKE '%reward_ledger%'
   OR query LIKE '%pipeline_executions%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Table Size Growth

```sql
-- Monitor table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN (
  'reward_ledger',
  'consumption_metrics',
  'story_effectiveness',
  'email_delivery_log',
  'pipeline_executions'
)
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Index Usage

```sql
-- Check index effectiveness
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename LIKE 'consumption_%'
   OR tablename LIKE 'reward_%'
   OR tablename LIKE 'pipeline_%'
ORDER BY idx_scan DESC;
```

---

## Performance Baselines

### Lambda Duration Targets

- Daily digest batch: <30s (p99)
- Weekly insights batch: <60s (p99)
- Story scoring batch: <45s (p99)
- Referral reward processing: <10s (p99)
- Single pipeline execution: <5s (p95)

### Database Query Targets

- `track_consumption_event()`: <100ms
- `calculate_story_effectiveness()`: <500ms
- `calculate_user_credits()`: <50ms
- `should_send_email()`: <100ms

### Email Delivery Targets

- SendGrid API latency: <1s (p95)
- Email queued to sent: <5s
- Sent to delivered: <30s

---

## Capacity Planning

### Current Capacity

**Intelligence Curator Lambda**:
- Memory: 512 MB
- Timeout: 300s
- Concurrent executions: 10 (default)
- Current usage: ~5% of timeout

**Database**:
- Connection pool: 25 connections
- Current usage: ~10 connections peak
- Table sizes: <100MB each
- Index usage: Healthy

**EventBridge**:
- 8 rules
- ~50 invocations/day
- Well within limits

### Scale Projections

**At 10K active users**:
- Daily digest: ~2K emails/day (20% veto rate)
- Weekly insights: ~300 emails/week
- Lambda invocations: ~500/day
- Database queries: ~10K/day

**At 100K active users**:
- Daily digest: ~20K emails/day
- Weekly insights: ~3K emails/week
- Lambda invocations: ~5K/day
- Database queries: ~100K/day
- **Action needed**: Increase Lambda concurrency, optimize batch processing

---

## Alert Configuration

### Create SNS Topics

```bash
# Critical alerts (PagerDuty)
aws sns create-topic \
  --name storytailor-critical-alerts \
  --region us-east-1

# Warning alerts (Slack)
aws sns create-topic \
  --name storytailor-warning-alerts \
  --region us-east-1
```

### Subscribe to Topics

```bash
# PagerDuty integration
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:storytailor-critical-alerts \
  --protocol https \
  --notification-endpoint https://events.pagerduty.com/integration/...

# Slack integration
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:storytailor-warning-alerts \
  --protocol https \
  --notification-endpoint https://hooks.slack.com/services/...
```

---

## Synthetic Monitoring

### Health Check (Every 5 Minutes)

```bash
#!/bin/bash
# scripts/health-check-pipelines.sh

# Check Intelligence Curator Lambda
aws lambda invoke \
  --function-name storytailor-intelligence-curator-production \
  --payload '{"detail":{"jobType":"health"}}' \
  response.json

if [ $? -ne 0 ]; then
  echo "❌ Lambda health check failed"
  exit 1
fi

# Check database connection
psql $DATABASE_URL -c "SELECT 1 FROM pipeline_executions LIMIT 1" > /dev/null

if [ $? -ne 0 ]; then
  echo "❌ Database health check failed"
  exit 1
fi

# Check SSM parameters accessible
aws ssm get-parameter \
  --name /storytailor-production/pipelines/daily-digest/enabled \
  --region us-east-1 > /dev/null

if [ $? -ne 0 ]; then
  echo "❌ SSM health check failed"
  exit 1
fi

echo "✅ All health checks passed"
```

### Test EventBridge Rules (Daily)

```bash
# Trigger test event
aws events put-events --entries '[{
  "Source": "storytailor.health-check",
  "DetailType": "health",
  "Detail": "{\"jobType\":\"health\"}"
}]'

# Wait 30 seconds
sleep 30

# Check logs for execution
aws logs tail /aws/lambda/storytailor-intelligence-curator-production \
  --since 1m \
  --filter-pattern "health"

# Should see log entry
```

---

## Troubleshooting Queries

### Query 1: Why Was Pipeline Vetoed?

```sql
SELECT 
  created_at,
  pipeline_name,
  veto_reason,
  confidence_score,
  trigger_data
FROM pipeline_executions
WHERE user_id = 'USER_ID'
AND vetoed = TRUE
ORDER BY created_at DESC
LIMIT 10;
```

### Query 2: Email Delivery Status

```sql
SELECT 
  sent_at,
  email_type,
  status,
  provider_message_id
FROM email_delivery_log
WHERE user_id = 'USER_ID'
ORDER BY sent_at DESC
LIMIT 20;
```

### Query 3: Referral Conversion Funnel

```sql
-- Referral funnel
WITH funnel AS (
  SELECT 
    COUNT(*) as total_referrals,
    SUM(CASE WHEN status = 'signed_up' THEN 1 ELSE 0 END) as signups,
    SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as conversions,
    SUM(CASE WHEN reward_status = 'issued' THEN 1 ELSE 0 END) as rewards_issued
  FROM referral_tracking
  WHERE created_at > NOW() - INTERVAL '30 days'
)
SELECT 
  total_referrals,
  signups,
  ROUND(100.0 * signups / total_referrals, 1) as signup_rate,
  conversions,
  ROUND(100.0 * conversions / signups, 1) as conversion_rate,
  rewards_issued,
  ROUND(100.0 * rewards_issued / conversions, 1) as reward_rate
FROM funnel;
```

### Query 4: Pipeline Execution Timeline

```sql
SELECT 
  created_at,
  pipeline_name,
  status,
  vetoed,
  veto_reason,
  EXTRACT(EPOCH FROM (completed_at - started_at)) as duration_seconds
FROM pipeline_executions
WHERE user_id = 'USER_ID'
AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

---

## Runbook: Common Issues

### Issue: Daily Digest Not Sending

**Symptoms**: Users report not receiving daily digest

**Debug Steps**:
1. Check EventBridge rule enabled:
   ```bash
   aws events describe-rule \
     --name storytailor-daily-digest-production
   ```

2. Check Lambda invocations:
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Lambda \
     --metric-name Invocations \
     --dimensions Name=FunctionName,Value=storytailor-intelligence-curator-production \
     --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 3600 \
     --statistics Sum
   ```

3. Check veto logs:
   ```sql
   SELECT * FROM pipeline_executions
   WHERE pipeline_type = 'daily_digest'
   AND created_at > NOW() - INTERVAL '24 hours'
   AND vetoed = TRUE;
   ```

4. Check kill switch:
   ```bash
   aws ssm get-parameter \
     --name /storytailor-production/pipelines/daily-digest/enabled
   ```

**Resolution**:
- If kill switch disabled: Re-enable
- If high veto rate: Lower thresholds
- If Lambda errors: Check logs, fix code
- If EventBridge not triggering: Re-configure rule

### Issue: Referral Reward Not Applied

**Symptoms**: User has credit but not applied to invoice

**Debug Steps**:
1. Check reward ledger:
   ```sql
   SELECT * FROM reward_ledger
   WHERE user_id = 'USER_ID'
   AND status = 'pending';
   ```

2. Check Stripe customer balance:
   ```bash
   stripe customers retrieve cus_XXX
   ```

3. Check if customer has upcoming invoice:
   ```bash
   stripe invoices list --customer cus_XXX --limit 1
   ```

**Resolution**:
- If Stripe balance not created: Re-run issueCredit()
- If invoice doesn't exist: Credits apply to next invoice
- If error in reward_ledger: Check error_message column

### Issue: High SLA Violation Rate

**Symptoms**: SLA_MISSED veto reason frequent

**Debug Steps**:
1. Measure event-to-processing latency:
   ```sql
   SELECT 
     pipeline_type,
     AVG(EXTRACT(EPOCH FROM (started_at - (trigger_data->>'event_timestamp')::TIMESTAMPTZ)) / 60) as avg_delay_minutes
   FROM pipeline_executions
   WHERE veto_reason = 'SLA_MISSED'
   AND created_at > NOW() - INTERVAL '24 hours'
   GROUP BY pipeline_type;
   ```

2. Check Lambda cold start rate:
   ```bash
   # Look for Init Duration in logs
   aws logs filter-log-events \
     --log-group-name /aws/lambda/storytailor-intelligence-curator-production \
     --filter-pattern "Init Duration" \
     --start-time $(date -d '1 hour ago' +%s)000
   ```

**Resolution**:
- If high latency: Optimize database queries, add indexes
- If cold starts: Increase provisioned concurrency
- If EventBridge delay: Check rule configuration
- If database slow: Add caching layer

---

## Backup & Recovery

### Database Backups

- Supabase automatic daily backups
- Point-in-time recovery: 7 days
- Manual backup before major changes:
  ```bash
  pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
  ```

### Configuration Backups

- SSM parameters: Export monthly
  ```bash
  aws ssm get-parameters-by-path \
    --path /storytailor-production \
    --recursive > ssm-backup-$(date +%Y%m%d).json
  ```

### Code Backups

- Git repository (primary)
- Lambda deployment packages in S3
- Weekly snapshot of deployed versions

---

## Maintenance Windows

### Preferred Times

- Database migrations: Sunday 2-4am UTC (lowest traffic)
- Lambda deployments: Anytime (zero downtime)
- EventBridge updates: Anytime (rule updates are instant)

### Communication

**Pre-maintenance** (24h notice):
- Slack: #engineering-announcements
- Status page: https://status.storytailor.com

**During maintenance**:
- Status updates every 30 minutes
- Incident channel: #incident-response

**Post-maintenance**:
- Summary in Slack
- Postmortem if issues

---

## Metrics Review Schedule

### Daily (Automated)

- Pipeline execution counts
- Email delivery volume
- Error rates
- SLA compliance

### Weekly (Manual Review)

- Veto pattern analysis
- Email performance trends
- Referral conversion rates
- User feedback review

### Monthly (Team Meeting)

- Comprehensive metric review
- Capacity planning
- Cost optimization
- Process improvements

---

## Cost Monitoring

### Lambda Costs

```bash
# Get Lambda costs (last 30 days)
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '30 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity DAILY \
  --metrics UnblendedCost \
  --filter file://lambda-filter.json
```

### Email Costs

- SendGrid: $X/month for Y emails
- Target: <$0.01 per email
- Monitor: SendGrid billing dashboard

### Database Costs

- Supabase: Pro plan ($25/month)
- Monitor: Table size growth
- Optimize: Archive old logs regularly

---

## On-Call Playbook

### P1: Critical (Page Immediately)

- Crisis alert system down
- Lambda function errors >10/hour
- Email delivery failure rate >10%
- Database unavailable

**Response Time**: 15 minutes

### P2: High (Page During Business Hours)

- EventBridge job failures
- SLA violations >5/hour
- Unsubscribe spike
- Referral reward failures

**Response Time**: 1 hour

### P3: Medium (Slack Alert)

- High veto rates (data collection issue)
- Slow query warnings
- Capacity warnings
- Config drift detected

**Response Time**: 4 hours

### P4: Low (Daily Review)

- Minor metric deviations
- Optimization opportunities
- Feature requests

**Response Time**: 1 week

---

## Contact Information

**On-Call Engineer**: [PagerDuty]  
**DevOps Lead**: [Contact]  
**Engineering Manager**: [Contact]  
**Incident Commander**: [Contact]

**Escalation**: If P1 incident >30 minutes unresolved, escalate to Engineering Manager.

---

**For monitoring questions**: [Slack: #pipeline-monitoring]  
**For alerts**: [PagerDuty App]  
**For dashboards**: [CloudWatch Console]


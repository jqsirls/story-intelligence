# Automatic Pipeline System - Quick Reference Card

**Version**: 1.0  
**Date**: December 25, 2025

---

## 🚨 Emergency Actions

### Stop Everything

```bash
# Disable all EventBridge rules
for rule in daily-digest weekly-insights story-scoring referral-rewards expire-credits org-health power-user asset-timeout; do
  aws events disable-rule --name "storytailor-${rule}-production" --region us-east-1
done
```

### Stop Specific Pipeline

```bash
# Flip kill switch
aws ssm put-parameter \
  --name /storytailor-production/pipelines/daily-digest/enabled \
  --value "false" \
  --overwrite
```

### Rollback Lambda

```bash
# Update to previous version
aws lambda update-function-code \
  --function-name storytailor-intelligence-curator-production \
  --s3-bucket storytailor-lambda-deploys \
  --s3-key intelligence-curator-previous.zip
```

---

## 📊 Key Metrics

### Healthy Rates

- Email open rate: **>40%** (industry: 20%)
- Unsubscribe rate: **<0.2%** (industry: 0.5%)
- Veto rate (insights): **30-50%** (selective)
- Veto rate (therapeutic): **70-80%** (very selective)
- SLA compliance: **>95%**
- Spam complaints: **0**

### Alert Thresholds

- Email failure rate: **>5%** → Page on-call
- SLA violations: **>5/hour** → Page on-call
- Lambda errors: **>10/hour** → Page on-call
- Unsubscribe spike: **>10/hour** → Slack alert

---

## 🔧 Common Commands

### Check Pipeline Status

```bash
# Check kill switches
aws ssm get-parameters-by-path \
  --path /storytailor-production/pipelines \
  --recursive

# Check EventBridge rules
aws events list-rules --name-prefix storytailor- --region us-east-1

# Check Lambda status
aws lambda get-function \
  --function-name storytailor-intelligence-curator-production
```

### Trigger Manual Job

```bash
# Test any job type
aws events put-events --entries '[{
  "Source": "storytailor.manual",
  "DetailType": "test",
  "Detail": "{\"jobType\":\"daily_digest\"}"
}]'
```

### Check Logs

```bash
# Tail Lambda logs
aws logs tail /aws/lambda/storytailor-intelligence-curator-production \
  --since 1h \
  --follow

# Filter for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/storytailor-intelligence-curator-production \
  --filter-pattern "ERROR"
```

### Database Queries

```sql
-- Veto analysis
SELECT pipeline_type, veto_reason, COUNT(*) 
FROM pipeline_executions 
WHERE created_at > NOW() - INTERVAL '24 hours' AND vetoed = TRUE
GROUP BY pipeline_type, veto_reason;

-- Email performance
SELECT email_type, COUNT(*) as sent, 
  ROUND(100.0 * SUM(CASE WHEN status = 'opened' THEN 1 ELSE 0 END) / COUNT(*), 1) as open_rate
FROM email_delivery_log 
WHERE sent_at > NOW() - INTERVAL '24 hours'
GROUP BY email_type;

-- Referral rewards
SELECT source, SUM(amount)/100.0 as total_usd, status
FROM reward_ledger 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY source, status;
```

---

## 📚 Documentation Quick Links

| Need | Document | Location |
|------|----------|----------|
| Architecture | ARCHITECTURE_OVERVIEW.md | docs/pipelines/ |
| Operations | OPERATIONS_GUIDE.md | docs/pipelines/ |
| Monitoring | MONITORING_GUIDE.md | docs/pipelines/ |
| Testing | TESTING_GUIDE.md | docs/pipelines/ |
| Frontend | FRONTEND_INTEGRATION_GUIDE.md | docs/pipelines/ |
| Clinical | CLINICAL_REVIEW_REQUIREMENTS.md | docs/pipelines/ |
| Business | BUSINESS_OVERVIEW.md | docs/pipelines/ |
| Sacred Docs | THERAPEUTIC_DOCTRINE.md (+ 3 more) | docs/api/ |

---

## 🎯 Pipeline Types

| Type | Confidence | Signal Count | Veto Rate | User Control |
|------|-----------|--------------|-----------|--------------|
| Transactional | 1.0 | 1 | <5% | Cannot disable |
| Insights | 0.6-0.7 | 2-3 | 30-50% | Can opt-out |
| Emotional | 0.7-0.9 | 3-5 | 70-80% | Cannot disable |
| Therapeutic | 0.9 | 5+ | 70-80% | Parent opt-in |
| Marketing | 0.6 | 1 | 10-20% | Can opt-out |

---

## ⏰ EventBridge Schedule

| Job | Schedule | Purpose |
|-----|----------|---------|
| daily-digest | 8pm UTC daily | Evening consumption summary |
| weekly-insights | 6pm UTC Sunday | User-type-specific reports |
| story-scoring | 4am UTC daily | Calculate effectiveness |
| referral-rewards | 1am UTC daily | Process pending rewards |
| expire-credits | 3am UTC daily | Expire old credits |
| org-health | 9am UTC 1st Mon | B2B health reports |
| power-user | 12pm UTC daily | Detect upsell opportunities |
| asset-timeout | Every 15 min | Detect stuck jobs |

---

## 🔑 Key Concepts

### Veto Authority

Intelligence Curator can say "No":
- Insufficient signal
- Low confidence  
- Frequency cap
- Quiet hours
- SLA missed
- Kill switch

**Silence is valid, not failure.**

### Comparative Intelligence

Always relative to user's baseline:
- ✅ "5 min faster than usual"
- ❌ "Score: 82/100"

**Actionable, not informational.**

### Emotional SLA

Time windows for emotional pipelines:
- Crisis: 5 min
- Early intervention: 2 hours
- Story failure: 1 hour
- Therapeutic: 24 hours

**Late empathy = noise.**

### User Types (17)

- Family: parent, guardian, grandparent, aunt/uncle, sibling, foster
- Educators: teacher, librarian, afterschool
- Medical: therapist, specialist, medical
- Other: childcare, nanny, coach, enthusiast, child

**Different needs, different flows.**

---

## 🎬 Quick Start

### Deploy to Staging

```bash
cd "/path/to/project"

# 1. Apply migration
supabase db push --db-url $STAGING_DB

# 2. Deploy Lambda
./scripts/deploy-intelligence-curator.sh staging

# 3. Configure EventBridge
./scripts/configure-pipeline-eventbridge.sh staging

# 4. Test
aws events put-events --entries '[{"Source":"test","DetailType":"test","Detail":"{\"jobType\":\"daily_digest\"}"}]'
```

### Check Health

```bash
# Lambda
aws lambda invoke \
  --function-name storytailor-intelligence-curator-staging \
  --payload '{"detail":{"jobType":"health"}}' \
  response.json && cat response.json

# Database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pipeline_executions;"

# EventBridge
aws events list-rules --name-prefix storytailor-
```

---

## 🆘 Incident Response

### P1: Critical (Page Immediately)

- Crisis alert system down
- Lambda errors >10/hour
- Email failure >10%

**Response**: 15 minutes, call on-call engineer

### P2: High (Business Hours)

- Job failures
- SLA violations >5/hour
- Unsubscribe spike

**Response**: 1 hour, Slack alert

### Common Issues

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| No emails sending | Kill switch off | Re-enable in SSM |
| High veto rate | Insufficient data | Check data collection |
| Low open rate | Poor content | Review email tone |
| SLA violations | Processing slow | Optimize queries |

---

## 📞 Contacts

**On-Call**: [PagerDuty]  
**Engineering**: [Slack: #pipeline-engineering]  
**Operations**: [Slack: #pipeline-ops]  
**Product**: [Slack: #product-pipeline]

---

**Print this page and keep it handy for quick reference during incidents.**


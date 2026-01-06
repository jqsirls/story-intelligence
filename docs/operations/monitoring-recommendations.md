# Monitoring & Enhancement Recommendations

**Date:** December 13, 2025  
**Priority:** High → Medium → Low

## 🎯 Priority 1: Critical Monitoring (Do First)

### 1. Processor Failure Alarms ⚠️ **HIGH PRIORITY**

**Why:** Processors run on a schedule. If they fail silently, you won't know until users complain.

**What to Set Up:**
- CloudWatch alarms for processor Lambda errors
- Alarms for processor timeouts
- Alarms for missed scheduled executions

**Implementation:**
```bash
# Create alarm for inactivity processor errors
aws cloudwatch put-metric-alarm \
  --alarm-name "storytailor-inactivity-processor-errors" \
  --alarm-description "Alert when inactivity processor has errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=FunctionName,Value=storytailor-inactivity-processor-production \
  --region us-east-1

# Create alarm for deletion processor errors
aws cloudwatch put-metric-alarm \
  --alarm-name "storytailor-deletion-processor-errors" \
  --alarm-description "Alert when deletion processor has errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=FunctionName,Value=storytailor-deletion-processor-production \
  --region us-east-1
```

**Time:** 10 minutes  
**Impact:** Critical - Prevents silent failures

---

### 2. Scheduled Execution Monitoring ⚠️ **HIGH PRIORITY**

**Why:** EventBridge rules should trigger daily. If they don't, deletions won't process.

**What to Set Up:**
- Monitor EventBridge rule execution history
- Alert if no executions in 25 hours (should run daily)
- Track execution success/failure rates

**Implementation:**
```bash
# Check execution history (run daily)
aws events list-rule-names-by-target \
  --target-arn "arn:aws:lambda:us-east-1:ACCOUNT_ID:function:storytailor-inactivity-processor-production" \
  --region us-east-1

# Monitor via CloudWatch Events metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Events \
  --metric-name FailedInvocations \
  --dimensions Name=RuleName,Value=storytailor-inactivity-check \
  --start-time $(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum \
  --region us-east-1
```

**Time:** 15 minutes  
**Impact:** Critical - Ensures scheduled jobs run

---

### 3. CloudWatch Dashboard for Processors 📊 **MEDIUM PRIORITY**

**Why:** Single pane of glass for processor health.

**What to Set Up:**
- Dashboard showing:
  - Processor invocation counts
  - Error rates
  - Duration metrics
  - EventBridge rule execution status

**Implementation:**
Use existing `scripts/setup-monitoring.sh` or create custom dashboard:
```bash
# Create processor-specific dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "Storytailor-Processors" \
  --dashboard-body file://processor-dashboard.json \
  --region us-east-1
```

**Time:** 20 minutes  
**Impact:** High - Better visibility

---

## 🎯 Priority 2: Performance & Cost Optimization

### 4. Lambda Memory/Timeout Optimization 💰 **MEDIUM PRIORITY**

**Why:** Right-sizing reduces costs and improves performance.

**What to Do:**
- Review CloudWatch metrics for actual memory usage
- Adjust memory allocation based on actual usage
- Optimize timeout settings

**Current Settings:**
- Processors: Check current memory/timeout
- Universal Agent: Check current memory/timeout

**Implementation:**
```bash
# Check current memory usage
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name MemoryUtilization \
  --dimensions Name=FunctionName,Value=storytailor-inactivity-processor-production \
  --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average,Maximum \
  --region us-east-1
```

**Time:** 30 minutes  
**Impact:** Medium - Cost savings

---

### 5. S3 Bucket Cleanup 💰 **LOW PRIORITY**

**Why:** Reduce storage costs for unused buckets.

**What to Do:**
- Review `storytailor-lambda-deploys-us-east-2` bucket
- Delete if no longer needed
- Archive old deployment packages if needed

**Implementation:**
```bash
# List bucket contents
aws s3 ls s3://storytailor-lambda-deploys-us-east-2 --recursive

# Delete bucket (if empty or no longer needed)
aws s3 rb s3://storytailor-lambda-deploys-us-east-2 --force
```

**Time:** 10 minutes  
**Impact:** Low - Minor cost savings

---

## 🎯 Priority 3: Enhanced Observability

### 6. Custom CloudWatch Metrics 📊 **MEDIUM PRIORITY**

**Why:** Track business metrics, not just technical metrics.

**What to Track:**
- Deletion requests created per day
- Deletion requests processed per day
- Inactivity warnings sent
- Storage archived to Glacier
- Email engagement rates

**Implementation:**
Add to processor code:
```typescript
await cloudwatch.putMetricData({
  Namespace: 'Storytailor/Deletion',
  MetricData: [{
    MetricName: 'DeletionRequestsProcessed',
    Value: processedCount,
    Unit: 'Count',
    Timestamp: new Date()
  }]
});
```

**Time:** 1-2 hours  
**Impact:** Medium - Better business insights

---

### 7. Log Aggregation & Search 🔍 **MEDIUM PRIORITY**

**Why:** Easier troubleshooting when issues occur.

**What to Set Up:**
- CloudWatch Logs Insights queries for common issues
- Saved queries for:
  - Processor errors
  - Database connection issues
  - Email delivery failures

**Implementation:**
```bash
# Create saved query for processor errors
aws logs put-query-definition \
  --name "processor-errors" \
  --query-string "fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc" \
  --log-group-names "/aws/lambda/storytailor-inactivity-processor-production" "/aws/lambda/storytailor-deletion-processor-production" \
  --region us-east-1
```

**Time:** 30 minutes  
**Impact:** Medium - Faster troubleshooting

---

## 🎯 Priority 4: Testing & Validation

### 8. Load Testing 🧪 **MEDIUM PRIORITY**

**Why:** Understand system capacity and identify bottlenecks.

**What to Test:**
- Deletion API endpoints under load
- Processor performance with high deletion request volumes
- Concurrent deletion requests

**Implementation:**
```bash
# Use existing test script
./scripts/test-load-production.sh

# Or use k6 for more comprehensive testing
k6 run load-test-deletion-api.js
```

**Time:** 2-3 hours  
**Impact:** Medium - Better capacity planning

---

### 9. Disaster Recovery Testing 🛡️ **LOW PRIORITY**

**Why:** Ensure system can recover from failures.

**What to Test:**
- Processor failure scenarios
- Database connection failures
- EventBridge rule failures
- Recovery procedures

**Time:** 2-3 hours  
**Impact:** Low - Important but not urgent

---

## 🎯 Priority 5: Documentation & Runbooks

### 10. Operational Runbooks 📚 **MEDIUM PRIORITY**

**Why:** Faster incident response.

**What to Create:**
- Processor failure troubleshooting guide
- Deletion system operational procedures
- Common issues and solutions
- Escalation procedures

**Time:** 2-3 hours  
**Impact:** Medium - Better operations

---

## 📋 Recommended Execution Order

### Week 1 (Critical)
1. ✅ **Processor Failure Alarms** (10 min) - **DO THIS FIRST**
2. ✅ **Scheduled Execution Monitoring** (15 min) - **DO THIS SECOND**
3. ✅ **CloudWatch Dashboard** (20 min) - **DO THIS THIRD**

### Week 2 (Important)
4. Lambda Memory/Timeout Optimization (30 min)
5. Custom CloudWatch Metrics (1-2 hours)
6. Log Aggregation & Search (30 min)

### Week 3+ (Nice to Have)
7. Load Testing (2-3 hours)
8. Operational Runbooks (2-3 hours)
9. S3 Bucket Cleanup (10 min)
10. Disaster Recovery Testing (2-3 hours)

---

## 🚀 Quick Start Script

I can create a script that sets up Priority 1 items automatically:

```bash
# Would create:
# - Processor error alarms
# - Scheduled execution monitoring
# - Basic CloudWatch dashboard
```

**Would you like me to create this script?**

---

## 📊 Expected Benefits

### Immediate (Priority 1)
- ✅ Know immediately if processors fail
- ✅ Detect missed scheduled executions
- ✅ Single dashboard for processor health

### Short-term (Priority 2-3)
- 💰 10-20% cost reduction from optimization
- 📊 Better visibility into system health
- 🔍 Faster troubleshooting

### Long-term (Priority 4-5)
- 🧪 Better capacity planning
- 📚 Improved operational efficiency
- 🛡️ Better disaster recovery

---

## 🎯 My Top 3 Recommendations

1. **Processor Failure Alarms** - Critical, 10 minutes, prevents silent failures
2. **Scheduled Execution Monitoring** - Critical, 15 minutes, ensures jobs run
3. **CloudWatch Dashboard** - High value, 20 minutes, better visibility

**Total time for top 3: 45 minutes**  
**Impact: Prevents production issues and improves visibility**

---

**Status:** Ready to implement  
**Next Step:** Would you like me to create the automation scripts for Priority 1 items?


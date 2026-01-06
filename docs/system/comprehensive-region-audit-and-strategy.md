# Comprehensive Region Audit and Strategy

**Date:** December 13, 2025  
**Status:** 🚨 **CRITICAL ISSUES IDENTIFIED**

## 🎯 Executive Summary

**Primary Production Region:** `us-east-1` (US East - N. Virginia)

**Critical Finding:** Infrastructure is split between `us-east-1` and `us-east-2`, creating potential cross-region latency, complexity, and documentation inconsistencies.

---

## 📊 Current State Analysis

### ✅ us-east-1 (Primary Production Region)

**Key Production Functions (33 total):**
- ✅ `storytailor-router-production` - **PRIMARY ENTRY POINT**
- ✅ `storytailor-universal-agent-production` - **CORE API**
- ✅ `storytailor-commerce-agent-production` - **PAYMENTS**
- ✅ `storytailor-library-agent-production` - **LIBRARY MANAGEMENT**
- ✅ `storytailor-conversation-agent-production`
- ✅ `storytailor-content-production`
- ✅ `storytailor-auth-agent-production`
- ✅ `storytailor-accessibility-agent-production`
- ✅ `storytailor-health-monitoring-agent-production`
- ✅ `storytailor-therapeutic-agent-production`
- ✅ `storytailor-voice-synthesis-agent-production`
- ✅ `storytailor-security-framework-production`
- ✅ `storytailor-child-safety-agent-production`
- ✅ `storytailor-educational-agent-production`
- ✅ `storytailor-character-agent-production`
- ✅ `storytailor-localization-agent-production`
- ✅ `storytailor-idp-agent-production`
- ✅ `storytailor-event-system-production`
- ✅ And 15+ more production functions

**S3 Buckets:**
- ✅ `storytailor-assets-production-326181217496`
- ✅ `storytailor-audio`
- ✅ `storytailor-audio-326181217496`
- ✅ `storytailor-backups-326181217496`
- ✅ `storytailor-cdn-logs`
- ✅ `storytailor-lambda-deploys-us-east-1` (deployment artifacts)

**EventBridge Rules:**
- ❌ **NONE** (rules are in us-east-2)

---

### ⚠️ us-east-2 (Secondary/Legacy Region)

**Functions (62 total):**
- ⚠️ `storytailor-production-router` - **DUPLICATE?**
- ⚠️ `storytailor-library-agent-production` - **DUPLICATE?**
- ⚠️ `storytailor-emotion-agent-production` - **DUPLICATE?**
- ⚠️ `storytailor-insights-agent-production`
- ⚠️ `storytailor-health-monitoring-agent-production` - **DUPLICATE?**
- ⚠️ `storytailor-production-emotion-agent`
- ⚠️ `storytailor-account-deletion-processor-production`
- ⚠️ `storytailor-production-idp-agent`
- ⚠️ `storytailor-avatar-agent-production`
- ⚠️ `storytailor-production-accessibility-agent`
- ⚠️ `storytailor-inactivity-processor-production` - **CRITICAL**
- ⚠️ `storytailor-deletion-processor-production` - **CRITICAL**
- And 50+ more functions

**EventBridge Rules:**
- ✅ `storytailor-account-deletion-daily-trigger-production` (ENABLED)
- ✅ `storytailor-deletion-processing` (ENABLED) → Targets `storytailor-deletion-processor-production` (us-east-2)
- ✅ `storytailor-inactivity-check` (ENABLED) → Targets `storytailor-inactivity-processor-production` (us-east-2)

**S3 Buckets:**
- ⚠️ Same bucket names as us-east-1 (may be replicated or duplicates)

---

## 🚨 Critical Issues Identified

### 1. **Region Split for Core Functions**
- **Router** (entry point) is in `us-east-1`
- **Universal Agent** (core API) is in `us-east-1`
- **Commerce Agent** (payments) is in `us-east-1`
- **Library Agent** (library management) is in `us-east-1`
- **BUT** many other agents are in `us-east-2`

**Impact:**
- Cross-region latency (~50-100ms per call)
- Potential connectivity issues
- Increased complexity
- Higher costs (cross-region data transfer)

### 2. **EventBridge Rules in Wrong Region**
- EventBridge rules are in `us-east-2`
- They target processors in `us-east-2` (correct for those specific functions)
- **BUT** if we consolidate to `us-east-1`, these need to move

### 3. **Documentation Inconsistencies**

**Says us-east-2:**
- ❌ `docs/system/architecture.md:328` - Says "AWS Region: us-east-2"
- ❌ `COMPREHENSIVE_SYSTEM_AUDIT_REPORT.md:198` - Says "Region: us-east-2"
- ❌ `agentic-ux/docs/PLATFORM_OVERVIEW.md:404` - Says "Region: us-east-2"
- ❌ `scripts/configure-eventbridge-deletion.sh:14` - Hardcoded `REGION="us-east-2"`

**Says us-east-1:**
- ✅ `docs/agents/router/where.md:11` - Says "Region: us-east-1"
- ✅ `docs/agents/auth-agent/where.md:11` - Says "Region: us-east-1"
- ✅ `docs/agents/library-agent/where.md:11` - Says "Region: us-east-1"
- ✅ `docs/agents/content-agent/where.md:11` - Says "Region: us-east-1"
- ✅ `PRODUCTION_REGION_CONFIRMED.md:8` - Says "Region: us-east-1"
- ✅ `scripts/deploy-universal-agent-proper.sh:40` - Uses `us-east-1`
- ✅ `scripts/deploy-commerce-agent-proper.sh:37` - Uses `us-east-1`
- ✅ `scripts/deploy-library-agent-proper.sh:37` - Uses `us-east-1`

### 4. **Duplicate Functions**
- Multiple functions with same/similar names in both regions
- Unclear which are active vs legacy

---

## ✅ Recommended Strategy

### **Option A: Consolidate to us-east-1 (RECOMMENDED)**

**Rationale:**
- Core functions (Router, Universal Agent, Commerce, Library) are already in `us-east-1`
- Lower latency for primary user flows
- Simpler architecture
- Consistent with deployment scripts

**Actions Required:**
1. ✅ **Keep in us-east-1:**
   - Router, Universal Agent, Commerce Agent, Library Agent (already there)
   - All other production agents (move from us-east-2)

2. ⚠️ **Move to us-east-1:**
   - `storytailor-inactivity-processor-production`
   - `storytailor-deletion-processor-production`
   - EventBridge rules (recreate in us-east-1)

3. 🗑️ **Clean up us-east-2:**
   - Remove duplicate functions
   - Archive or delete legacy functions
   - Update all documentation

### **Option B: Keep Split (NOT RECOMMENDED)**

**Rationale:**
- If there's a specific reason for split (disaster recovery, compliance, etc.)

**Actions Required:**
1. Document clear separation of concerns
2. Update all documentation to reflect split
3. Ensure cross-region connectivity is properly configured
4. Accept cross-region latency

---

## 📋 Action Plan

### Phase 1: Documentation (IMMEDIATE)

- [ ] Update `docs/system/architecture.md` - Change us-east-2 → us-east-1
- [ ] Update `COMPREHENSIVE_SYSTEM_AUDIT_REPORT.md` - Change us-east-2 → us-east-1
- [ ] Update `agentic-ux/docs/PLATFORM_OVERVIEW.md` - Change us-east-2 → us-east-1
- [ ] Update `scripts/configure-eventbridge-deletion.sh` - Change us-east-2 → us-east-1
- [ ] Create `docs/system/REGION_STRATEGY.md` - Official region documentation
- [ ] Update all agent `where.md` files to confirm regions

### Phase 2: Infrastructure Audit (IMMEDIATE)

- [ ] List all functions in us-east-1
- [ ] List all functions in us-east-2
- [ ] Identify duplicates
- [ ] Identify which functions are actually used
- [ ] Document dependencies (EventBridge, S3, etc.)

### Phase 3: Migration (IF NEEDED)

- [ ] Move inactivity processor to us-east-1
- [ ] Move deletion processor to us-east-1
- [ ] Recreate EventBridge rules in us-east-1
- [ ] Update all Lambda environment variables
- [ ] Test all integrations
- [ ] Clean up us-east-2

---

## 📚 Official Region Documentation

### Production Environment

**Primary Region:** `us-east-1` (US East - N. Virginia)

**All Production Resources Should Be In:**
- ✅ Lambda Functions
- ✅ EventBridge Rules
- ✅ S3 Buckets (primary)
- ✅ CloudWatch Logs
- ✅ IAM Roles (region-specific)

**Global Resources (No Region):**
- ✅ SSM Parameter Store (global, but region-specific access)
- ✅ Route 53 (DNS)
- ✅ CloudFront (CDN)

### Staging Environment

**Primary Region:** `us-east-1` (same as production for consistency)

### Development Environment

**Primary Region:** `us-east-1` (same as production for consistency)

---

## 🔍 Verification Checklist

### For Each Production Function:
- [ ] Is it in us-east-1?
- [ ] Is it documented correctly?
- [ ] Are its dependencies in us-east-1?
- [ ] Are EventBridge rules (if any) in us-east-1?
- [ ] Are S3 buckets (if any) in us-east-1?

### For Documentation:
- [ ] Does it specify us-east-1?
- [ ] Is it consistent with other docs?
- [ ] Is it verified against actual AWS resources?

---

## 📝 Notes

1. **SSM Parameter Store**: Global service, but parameters can be accessed from any region. No migration needed.

2. **S3 Buckets**: Can exist in multiple regions (replication). Need to identify which are primary vs replicated.

3. **EventBridge**: Rules are region-specific. If functions move, rules must move too.

4. **Cross-Region Invocation**: Lambda can invoke cross-region, but adds latency and complexity.

---

**Status:** 🚨 **AUDIT COMPLETE - ACTION REQUIRED**

**Next Steps:**
1. Review this audit
2. Decide on consolidation strategy
3. Execute documentation updates
4. Plan infrastructure migration (if needed)


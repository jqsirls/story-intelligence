# Comprehensive Email Integration Plan - 100% Coverage

**Date:** December 13, 2025  
**Status:** 🔍 **COMPREHENSIVE AUDIT IN PROGRESS**

## 📊 Complete SSM Template Inventory

### SendGrid Dynamic Templates (34 templates)

#### Core Templates (6)
1. ✅ `welcome` - d-cf426d503ee648fe9d70d5a4e2906b59
2. ✅ `invitation` - d-66544e8a1ec34d588735828bed30872f
3. ✅ `receipt` - d-187de2d1b7be4b73a4c9c10d49d47a12
4. ✅ `retention` - d-740ff35d95ee4bef9bf8266151fff18d
5. ✅ `engagement` - d-ed5ac43765f54c45ba3ffc143f10a399
6. ✅ `win-back` - d-78f88d1fca084fcbbd79a8ebb24ecaa5

#### Payments & Subscriptions (6)
7. ✅ `payment-failed` - d-923e880f09024291bc81d5ce596c17a4
8. ✅ `payment-method-updated` - d-a5490190993b47189a6c78d8f52ef6a2
9. ✅ `upgrade-confirmation` - d-86aa23c684f94825a77fc26dc908ca41
10. ✅ `downgrade-confirmation` - d-ea14820e53fa4309811d031268fa9a7e
11. ✅ `subscription-cancelled` - d-fc12ba91c31f4939bcfd05dae343d2f6

#### Story Transfers (4)
12. ✅ `story-transfer-request` - d-c8757218a5dc402eb10d8f42118903f6
13. ✅ `story-transfer-sent` - d-8a328b8b671543f2b50a15487bde2400
14. ✅ `story-transfer-accepted` - d-4b666cb13db34f098fd93e2f6428805e
15. ✅ `story-transfer-rejected` - d-40284ae845614510923093447dcb93a0

#### Character Transfers (3)
16. ✅ `character-transfer-request` - d-49e8c3a705c24e57957b7fbb6b49ba38
17. ✅ `character-transfer-sent` - d-076a897acce14fbfb48d393311305905
18. ✅ `character-transfer-accepted` - d-b160e208612440e0b01f6525e4aa493e

#### Deletion System (4)
19. ✅ `account-deletion-requested` - d-dac95d24afb244dc982582637494e4f4
20. ✅ `account-deletion-completed` - d-b4fdb27e05834a57b514b476653de948
21. ✅ `story-deletion` - d-7e3fcaf315e44f5c8a98a623b5317ce8
22. ✅ `character-deletion` - d-33fb7c5e77f743e996cc2cfe0de641b8

#### Other (11)
23. ✅ `b2b-onboarding` - d-b588cceff5d64e8fbdd757b9669c7515
24. ✅ `data-export-completed` - d-a11bed2c8b824a18879f73c21f3b3f3a
25. ✅ `parent-insight` - d-2c39c2c1870143fca6f08af44821314b
26. ✅ `system-outage` - d-cc68b9724bb840ba8f2c418b58f77e95
27. ✅ `system-restored` - d-b01ed6525e684e3bae3edee3bc967b61
28. ✅ `storytailor-engagement` - d-0c07db6788b9455db4aa208fd90fd51b
29. ✅ `storytailor-invitation` - d-a2c7c3c91ea44bb8a43aa13814337abd
30. ✅ `storytailor-receipt` - d-e59120d106e94284b9c48a3e6700ce50
31. ✅ `storytailor-retention` - d-f5fc3e9fa71b44f99ee39ff2ea812bce
32. ✅ `storytailor-welcome` - d-e1316b8506d149b0929708515b9b8e6b
33. ✅ `storytailor-win-back` - d-9c07b82f9d4c4ee4a84b65fc10319790

### SES Template Names (6 templates)
1. `welcome` - Storytailor_Welcome_v1
2. `receipt` - Storytailor_Receipt_v1
3. `invite` - Storytailor_Invite_v1

## 📧 EmailService Methods Status

### ✅ Implemented (19 methods)
1. ✅ `sendEmail()` - Core method with template support
2. ✅ `sendInactivityWarning()` - 4 templates
3. ✅ `sendDeletionWarning()` - account-deletion-reminders
4. ✅ `sendDeletionConfirmation()` - account-deletion-complete
5. ✅ `sendHibernationNotification()` - account-hibernated
6. ✅ `sendAccountDeletionRequest()` - account-deletion-request
7. ✅ `sendStoryDeletionRequest()` - story-deletion-request
8. ✅ `sendCharacterDeletionRequest()` - character-deletion-request
9. ✅ `sendLibraryMemberRemoved()` - library-member-removed
10. ✅ `sendWelcomeEmail()` - welcome template
11. ✅ `sendReceiptEmail()` - receipt template
12. ✅ `sendInvitationEmail()` - invitation template
13. ✅ `sendStoryTransferRequestEmail()` - story-transfer-request
14. ✅ `sendStoryTransferAcceptedEmail()` - story-transfer-accepted
15. ✅ `sendStoryTransferRejectedEmail()` - story-transfer-rejected
16. ✅ `sendPaymentFailedEmail()` - payment-failed
17. ✅ `sendB2BOnboardingEmail()` - b2b-onboarding

### ❌ Missing Methods (17+ methods)
1. ❌ `sendStoryTransferSentEmail()` - story-transfer-sent
2. ❌ `sendCharacterTransferRequestEmail()` - character-transfer-request
3. ❌ `sendCharacterTransferSentEmail()` - character-transfer-sent
4. ❌ `sendCharacterTransferAcceptedEmail()` - character-transfer-accepted
5. ❌ `sendSubscriptionCancelledEmail()` - subscription-cancelled
6. ❌ `sendUpgradeConfirmationEmail()` - upgrade-confirmation
7. ❌ `sendDowngradeConfirmationEmail()` - downgrade-confirmation
8. ❌ `sendPaymentMethodUpdatedEmail()` - payment-method-updated
9. ❌ `sendDataExportCompletedEmail()` - data-export-completed
10. ❌ `sendParentInsightEmail()` - parent-insight
11. ❌ `sendSystemOutageEmail()` - system-outage
12. ❌ `sendSystemRestoredEmail()` - system-restored
13. ❌ `sendRetentionEmail()` - retention
14. ❌ `sendEngagementEmail()` - engagement
15. ❌ `sendWinBackEmail()` - win-back
16. ❌ `sendAccountDeletionCompletedEmail()` - account-deletion-completed (SendGrid version)
17. ❌ `sendStoryDeletionEmail()` - story-deletion (SendGrid version)
18. ❌ `sendCharacterDeletionEmail()` - character-deletion (SendGrid version)

## 🔗 Integration Points Status

### CommerceAgent (6 locations)
1. ❌ `sendInvitationEmail()` - Line 985 - **STUB** - Needs EmailService integration
2. ❌ `sendStoryTransferEmail()` - Line 1025 - **STUB** - Needs EmailService integration
3. ❌ `handleInvoicePaymentSucceeded()` - Line 378 - **NO EMAIL** - Should send receipt
4. ❌ `handleInvoicePaymentFailed()` - Line 385 - **NO EMAIL** - Should send payment failed
5. ❌ `handleSubscriptionUpdated()` - Line 342 - **NO EMAIL** - Should send upgrade/downgrade confirmation
6. ❌ `handleSubscriptionDeleted()` - Line 362 - **NO EMAIL** - Should send cancellation email
7. ❌ `handleCheckoutCompleted()` - Line 301 - **NO EMAIL** - Should send welcome/B2B onboarding

### LibraryAgent (2 locations)
1. ❌ `StoryService.transferStory()` - Line 175 - **NO EMAIL** - Should send transfer request + sent confirmation
2. ❌ `StoryService.respondToStoryTransfer()` - Line 230 - **NO EMAIL** - Should send accepted/rejected emails

### AuthRoutes (1 location)
1. ❌ `createUserAccount()` - Line 303 - **NO EMAIL** - Should send welcome email

### ClassroomManager (1 location)
1. ❌ `sendWelcomeEmail()` - Line 1371 - **STUB** - Needs EmailService integration

### Other Potential Locations
- Character transfer handlers (if they exist)
- Data export completion handlers
- System outage/restoration handlers
- Parent notification handlers
- Retention campaign triggers
- Engagement campaign triggers
- Win-back campaign triggers

## 📋 Action Items

### Phase 1: Add Missing EmailService Methods (17 methods)
- [ ] Add all missing email methods listed above
- [ ] Test template ID retrieval for each
- [ ] Verify fallback HTML works

### Phase 2: Update CommerceAgent Integration (7 locations)
- [ ] Inject EmailService into CommerceAgent constructor
- [ ] Replace `sendInvitationEmail()` stub with EmailService call
- [ ] Replace `sendStoryTransferEmail()` stub with EmailService call
- [ ] Add receipt email to `handleInvoicePaymentSucceeded()`
- [ ] Add payment failed email to `handleInvoicePaymentFailed()`
- [ ] Add upgrade/downgrade emails to `handleSubscriptionUpdated()`
- [ ] Add cancellation email to `handleSubscriptionDeleted()`
- [ ] Add welcome/B2B onboarding to `handleCheckoutCompleted()`

### Phase 3: Update LibraryAgent Integration (2 locations)
- [ ] Inject EmailService into LibraryAgent/StoryService
- [ ] Add transfer request + sent emails to `transferStory()`
- [ ] Add accepted/rejected emails to `respondToStoryTransfer()`

### Phase 4: Update Other Integration Points (2+ locations)
- [ ] Add welcome email to `AuthRoutes.createUserAccount()`
- [ ] Update `ClassroomManager.sendWelcomeEmail()` to use EmailService
- [ ] Find and update character transfer handlers
- [ ] Find and update data export handlers
- [ ] Find and update system notification handlers

### Phase 5: Build & Deploy
- [ ] Install dependencies (npm install from root)
- [ ] Build universal-agent package
- [ ] Build all dependent packages
- [ ] Deploy Universal Agent Lambda
- [ ] Verify all template IDs are accessible
- [ ] Test email sending for each type

### Phase 6: Testing
- [ ] Test welcome email
- [ ] Test receipt email
- [ ] Test invitation email
- [ ] Test story transfer emails (all 4)
- [ ] Test payment failed email
- [ ] Test subscription emails (upgrade, downgrade, cancel)
- [ ] Test B2B onboarding email
- [ ] Test all deletion emails
- [ ] Verify SendGrid template rendering
- [ ] Verify SES fallback works

## 🎯 Success Criteria

- ✅ All 34 SendGrid templates have corresponding EmailService methods
- ✅ All stub methods replaced with real EmailService calls
- ✅ All webhook handlers send appropriate emails
- ✅ All transfer handlers send appropriate emails
- ✅ All account creation flows send welcome emails
- ✅ All integration points tested and working
- ✅ 100% email coverage for all user journeys


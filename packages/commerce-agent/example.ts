import { CommerceAgent } from './src/CommerceAgent';

async function main() {
  // Initialize the CommerceAgent
  const commerceAgent = new CommerceAgent({
    stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    redisUrl: process.env.REDIS_URL
  });

  try {
    console.log('🚀 CommerceAgent Example Usage\n');

    // Example 1: Create individual checkout session
    console.log('1. Creating individual checkout session...');
    const individualCheckout = await commerceAgent.createIndividualCheckout(
      'user-123',
      'pro_individual'
    );
    console.log('Individual checkout:', individualCheckout);

    // Example 2: Create organization checkout session
    console.log('\n2. Creating organization checkout session...');
    const orgCheckout = await commerceAgent.createOrganizationCheckout(
      'user-456',
      'Acme Elementary School',
      25 // 25 seats
    );
    console.log('Organization checkout:', orgCheckout);

    // Example 3: Get subscription status
    console.log('\n3. Getting subscription status...');
    const subscription = await commerceAgent.getSubscriptionStatus('user-123');
    console.log('Subscription status:', subscription);

    // Example 4: Create user invitation
    console.log('\n4. Creating user invitation...');
    const userInvite = await commerceAgent.createUserInvite(
      'user-123',
      'friend@example.com'
    );
    console.log('User invite:', userInvite);

    // Example 5: Create story transfer invitation
    console.log('\n5. Creating story transfer invitation...');
    const storyInvite = await commerceAgent.createStoryTransferInvite(
      'user-123',
      'parent@example.com',
      'story-789'
    );
    console.log('Story transfer invite:', storyInvite);

    // Example 6: Apply discount code
    console.log('\n6. Applying discount code...');
    const discountResult = await commerceAgent.applyCoupon('user-456', 'INVITE123');
    console.log('Discount result:', discountResult);

    // Example 7: Change subscription plan
    console.log('\n7. Changing subscription plan...');
    const planChange = await commerceAgent.changePlan('user-123', 'pro_organization');
    console.log('Plan change result:', planChange);

    // Example 8: Manage organization seats
    console.log('\n8. Managing organization seats...');
    const seatManagement = await commerceAgent.manageOrganizationSeats({
      organizationId: 'org-123',
      action: 'add',
      seatCount: 5
    });
    console.log('Seat management result:', seatManagement);

    // Example 9: Get referral statistics
    console.log('\n9. Getting referral statistics...');
    const referralStats = await commerceAgent.getReferralStats('user-123');
    console.log('Referral stats:', referralStats);

    // Example 10: Generate invoice
    console.log('\n10. Generating invoice...');
    const invoice = await commerceAgent.generateInvoice('subscription-123');
    console.log('Invoice data:', invoice);

    console.log('\n✅ All examples completed successfully!');

  } catch (error) {
    console.error('❌ Error in example:', error);
  }
}

// Webhook handling example
export function handleStripeWebhook(req: any, res: any) {
  const commerceAgent = new CommerceAgent();
  
  const payload = req.body;
  const signature = req.headers['stripe-signature'];

  try {
    commerceAgent.handleWebhook(payload, signature);
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error}`);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
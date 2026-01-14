import Stripe from 'stripe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createClient as createRedisClient, RedisClientType } from 'redis';
import { 
  CommerceAgentConfig, 
  EmailService,
  CheckoutSession, 
  DiscountResult, 
  SubscriptionResult, 
  StripeEvent,
  OrganizationAccount,
  InviteDiscount,
  ReferralTracking,
  InvoiceData,
  SeatManagementRequest,
  SubscriptionTransferRequest,
  Subscription
} from './types';
import { getCommerceConfig, PLAN_CONFIGS, DISCOUNT_CODES } from './config';
import { Database } from '@alexa-multi-agent/shared-types';

export class CommerceAgent {
  private stripe: Stripe;
  private supabase: SupabaseClient<Database>;
  private redis?: RedisClientType;
  private config: CommerceAgentConfig;
  private emailService?: EmailService;
  private logger: any;

  constructor(config?: Partial<CommerceAgentConfig>) {
    this.config = { ...getCommerceConfig(), ...config };
    this.logger = this.config.logger || console;
    this.emailService = this.config.emailService;
    
    this.stripe = new Stripe(this.config.stripeSecretKey, {
      // NOTE: This package is compiled in two contexts:
      // - commerce-agent itself (Stripe v14 types)
      // - universal-agent tests via workspace moduleNameMapper (Stripe v13 types)
      // Stripe v13's LatestApiVersion literal can be narrower than v14's, so we
      // intentionally quarantine this typing here without changing runtime behavior.
      apiVersion: ('2023-10-16' as any),
    });

    this.supabase = createClient<Database>(
      this.config.supabaseUrl,
      this.config.supabaseServiceKey
    );

    if (this.config.redisUrl) {
      this.redis = createRedisClient({ url: this.config.redisUrl });
      this.redis.connect().catch(console.error);
    }
  }

  // Task 9.1: Stripe integration for individual and organization accounts

  /**
   * Create checkout session for Pro individual accounts
   */
  async createIndividualCheckout(
    userId: string, 
    planId: string = 'pro_individual',
    discountCode?: string
  ): Promise<CheckoutSession> {
    try {
      const plan = PLAN_CONFIGS.find(p => p.id === planId && p.type === 'individual');
      if (!plan) {
        throw new Error(`Invalid individual plan: ${planId}`);
      }

      // Get user email for checkout
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        throw new Error('User not found');
      }

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer_email: user.email,
        payment_method_types: ['card'],
        line_items: [{
          price: plan.priceId,
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
        metadata: {
          userId,
          planId,
          accountType: 'individual'
        },
        subscription_data: {
          metadata: {
            userId,
            planId,
            accountType: 'individual'
          }
        }
      };

      // Apply discount if provided
      if (discountCode) {
        const discount = await this.validateAndApplyDiscount(discountCode, userId);
        if (discount.applied) {
          const coupon = await this.stripe.coupons.create({
            percent_off: discount.discountPercentage,
            duration: 'once',
            name: `Discount: ${discountCode}`
          });
          sessionParams.discounts = [{ coupon: coupon.id }];
        }
      }

      const session = await this.stripe.checkout.sessions.create(sessionParams);

      return {
        sessionId: session.id,
        url: session.url!,
        expiresAt: new Date(session.expires_at * 1000).toISOString()
      };
    } catch (error) {
      console.error('Error creating individual checkout:', error);
      throw error;
    }
  }

  /**
   * Create checkout session for organization accounts with seat-based pricing
   */
  async createOrganizationCheckout(
    userId: string,
    organizationName: string,
    seatCount: number,
    planId: string = 'pro_organization'
  ): Promise<CheckoutSession> {
    try {
      const plan = PLAN_CONFIGS.find(p => p.id === planId && p.type === 'organization');
      if (!plan) {
        throw new Error(`Invalid organization plan: ${planId}`);
      }

      if (plan.maxSeats && seatCount > plan.maxSeats) {
        throw new Error(`Seat count exceeds maximum of ${plan.maxSeats}`);
      }

      // Get user email for checkout
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        throw new Error('User not found');
      }

      const session = await this.stripe.checkout.sessions.create({
        customer_email: user.email,
        payment_method_types: ['card'],
        line_items: [{
          price: plan.priceId,
          quantity: seatCount,
        }],
        mode: 'subscription',
        success_url: `${process.env.FRONTEND_URL}/organization/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/organization/cancel`,
        metadata: {
          userId,
          planId,
          accountType: 'organization',
          organizationName,
          seatCount: seatCount.toString()
        },
        subscription_data: {
          metadata: {
            userId,
            planId,
            accountType: 'organization',
            organizationName,
            seatCount: seatCount.toString()
          }
        }
      });

      return {
        sessionId: session.id,
        url: session.url!,
        expiresAt: new Date(session.expires_at * 1000).toISOString()
      };
    } catch (error) {
      console.error('Error creating organization checkout:', error);
      throw error;
    }
  }

  /**
   * Handle Stripe webhooks for payment events and subscription changes
   */
  async handleWebhook(payload: string, signature: string): Promise<void> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.stripeWebhookSecret
      );

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;
        
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Webhook handling error:', error);
      throw error;
    }
  }

  /**
   * Track subscription status and generate invoices
   */
  async getSubscriptionStatus(userId: string): Promise<Subscription | null> {
    try {
      const { data: subscription, error } = await this.supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error;
      }

      return subscription ? this.mapSubscriptionRow(subscription) : null;
    } catch (error) {
      console.error('Error getting subscription status:', error);
      throw error;
    }
  }

  /**
   * Generate invoice data for a subscription
   */
  async generateInvoice(subscriptionId: string): Promise<InvoiceData> {
    try {
      const { data: subscription, error } = await this.supabase
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('id', subscriptionId)
        .single();

      if (error || !subscription?.stripe_subscription_id) {
        throw new Error('Subscription not found');
      }

      const stripeSubscription = await this.stripe.subscriptions.retrieve(
        subscription.stripe_subscription_id,
        { expand: ['latest_invoice'] }
      );

      const invoice = stripeSubscription.latest_invoice as Stripe.Invoice;

      return {
        id: invoice.id,
        subscriptionId,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status || 'unknown',
        dueDate: new Date(invoice.due_date! * 1000).toISOString(),
        paidAt: invoice.status_transitions.paid_at 
          ? new Date(invoice.status_transitions.paid_at * 1000).toISOString() 
          : undefined,
        invoiceUrl: invoice.hosted_invoice_url || ''
      };
    } catch (error) {
      console.error('Error generating invoice:', error);
      throw error;
    }
  }

  // Private helper methods for webhook handling

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const metadata = session.metadata || {};
    const purchaseType = (metadata as any).purchaseType;

    // Deterministic user mapping: we require metadata.userId (or a compatible equivalent).
    // If it is missing, we fail loudly and do not write any entitlements.
    const userId = (metadata as any).userId as string | undefined;
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new Error('STRIPE_EVENT_UNMAPPED_USER');
    }

    // One-time purchase: story pack fulfillment (writes entitlements immediately).
    if (purchaseType === 'story_pack') {
      const packType = String((metadata as any).packType || '').trim();
      const storiesRemaining =
        packType === '5_pack' ? 5 :
        packType === '10_pack' ? 10 :
        packType === '25_pack' ? 25 :
        null;

      if (!storiesRemaining) {
        throw new Error('INVALID_PACK_TYPE');
      }

      const nowIso = new Date().toISOString();

      const { error } = await this.supabase
        .from('story_packs')
        .insert({
          user_id: userId,
          pack_type: packType,
          stories_remaining: storiesRemaining,
          purchased_at: nowIso,
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: (session.payment_intent as string | null) || null,
          updated_at: nowIso
        });

      if (error) {
        this.logger.error('Error creating story pack entitlement', { error });
        throw error;
      }

      return;
    }

    const { planId, accountType, organizationName, seatCount } = metadata as any;

    if (accountType === 'organization') {
      // Create organization account
      await this.createOrganizationAccount(
        userId,
        organizationName!,
        session.subscription as string,
        parseInt(seatCount!)
      );
      
      // Send B2B onboarding email
      if (this.emailService) {
        const { data: user } = await this.supabase
          .from('users')
          .select('email, first_name, last_name')
          .eq('id', userId)
          .single();
        
        if (user?.email) {
          const adminName = user.first_name && user.last_name 
            ? `${user.first_name} ${user.last_name}`
            : user.email;
          
          const setupUrl = `${process.env.FRONTEND_URL || process.env.APP_URL || 'https://storytailor.com'}/organization/setup`;
          
          await this.emailService.sendB2BOnboardingEmail(
            user.email,
            organizationName!,
            adminName,
            setupUrl
          );
        }
      }
    } else {
      // Send welcome email for individual accounts
      if (this.emailService) {
        const { data: user } = await this.supabase
          .from('users')
          .select('email, first_name, last_name')
          .eq('id', userId)
          .single();
        
        if (user?.email) {
          const userName = user.first_name && user.last_name 
            ? `${user.first_name} ${user.last_name}`
            : undefined;
          
          await this.emailService.sendWelcomeEmail(user.email, userId, userName);
        }
      }
    }

    // The subscription will be handled by the subscription.created webhook
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    const { userId, planId, accountType } = subscription.metadata;

    const subscriptionData = {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      plan_id: planId,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    };

    const { error } = await this.supabase
      .from('subscriptions')
      .insert(subscriptionData);

    if (error) {
      console.error('Error creating subscription record:', error);
      throw error;
    }

    // Update user permissions immediately
    await this.updateUserPermissions(userId, planId, 'active');
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    // Get previous subscription to detect plan changes
    const { data: previousSubscription } = await this.supabase
      .from('subscriptions')
      .select('plan_id')
      .eq('stripe_subscription_id', subscription.id)
      .single();
    
    const { error } = await this.supabase
      .from('subscriptions')
      .update({
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        plan_id: subscription.metadata?.planId || previousSubscription?.plan_id
      })
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      this.logger.error('Error updating subscription:', error);
      throw error;
    }

    // Update user permissions based on new status
    const { userId, planId } = subscription.metadata;
    await this.updateUserPermissions(userId, planId, subscription.status);
    
    // Send upgrade/downgrade email if plan changed
    if (this.emailService && previousSubscription && planId && previousSubscription.plan_id !== planId) {
      const { data: user } = await this.supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();
      
      if (user?.email) {
        const newPlan = PLAN_CONFIGS.find(p => p.id === planId);
        const oldPlan = PLAN_CONFIGS.find(p => p.id === previousSubscription.plan_id);
        
        const newPlanName = newPlan?.name || planId;
        const oldPlanName = oldPlan?.name || previousSubscription.plan_id;
        const effectiveDate = new Date(subscription.current_period_start * 1000).toISOString();
        
        // Determine if upgrade or downgrade (simplified - could be more sophisticated)
        const isUpgrade = (newPlan?.type === 'organization' || newPlanName.toLowerCase().includes('pro')) &&
                          (oldPlan?.type === 'individual' || oldPlanName.toLowerCase().includes('free'));
        
        if (isUpgrade) {
          await this.emailService.sendUpgradeConfirmationEmail(
            user.email,
            userId,
            newPlanName,
            oldPlanName,
            effectiveDate
          );
        } else {
          await this.emailService.sendDowngradeConfirmationEmail(
            user.email,
            userId,
            newPlanName,
            oldPlanName,
            effectiveDate
          );
        }
      }
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const { error } = await this.supabase
      .from('subscriptions')
      .update({ status: 'canceled' })
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      this.logger.error('Error canceling subscription:', error);
      throw error;
    }

    // Remove user permissions
    const { userId, planId } = subscription.metadata;
    await this.updateUserPermissions(userId, planId, 'canceled');
    
    // Send cancellation email
    if (this.emailService) {
      const { data: user } = await this.supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();
      
      if (user?.email) {
        const plan = PLAN_CONFIGS.find(p => p.id === planId);
        const planName = plan?.name || planId || 'your subscription';
        const cancellationDate = new Date(subscription.canceled_at! * 1000).toISOString();
        const reactivateUrl = `${process.env.FRONTEND_URL || process.env.APP_URL || 'https://storytailor.com'}/account/reactivate`;
        
        await this.emailService.sendSubscriptionCancelledEmail(
          user.email,
          userId,
          planName,
          cancellationDate,
          reactivateUrl
        );
      }
    }
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    // Log successful payment for audit purposes
    this.logger.info(`Payment succeeded for invoice: ${invoice.id}`);
    
    // Send receipt email
    if (this.emailService && invoice.customer_email) {
      // Get user ID from customer metadata or subscription
      let userId: string | undefined;
      if (invoice.subscription) {
        const subscription = await this.stripe.subscriptions.retrieve(invoice.subscription as string);
        userId = subscription.metadata?.userId;
      }
      
      if (userId) {
        await this.emailService.sendReceiptEmail(
          invoice.customer_email,
          userId,
          {
            amount: (invoice.amount_paid || 0) / 100, // Convert from cents
            currency: invoice.currency.toUpperCase(),
            invoiceId: invoice.id,
            invoiceUrl: invoice.hosted_invoice_url || undefined,
            date: new Date(invoice.status_transitions.paid_at! * 1000).toISOString()
          }
        );
      }
    }
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    // Log failed payment and potentially notify user
    this.logger.error(`Payment failed for invoice: ${invoice.id}`);
    
    // Send payment failed email
    if (this.emailService && invoice.customer_email) {
      // Get user ID from customer metadata or subscription
      let userId: string | undefined;
      if (invoice.subscription) {
        const subscription = await this.stripe.subscriptions.retrieve(invoice.subscription as string);
        userId = subscription.metadata?.userId;
      }
      
      if (userId) {
        const updateUrl = `${process.env.FRONTEND_URL || process.env.APP_URL || 'https://storytailor.com'}/account/billing/update-payment`;
        
        await this.emailService.sendPaymentFailedEmail(
          invoice.customer_email,
          userId,
          invoice.id,
          (invoice.amount_due || 0) / 100, // Convert from cents
          invoice.currency.toUpperCase(),
          updateUrl
        );
      }
    }
  }

  private async createOrganizationAccount(
    ownerId: string,
    name: string,
    subscriptionId: string,
    seatCount: number
  ): Promise<void> {
    const { error } = await this.supabase
      .from('organization_accounts')
      .insert({
        name,
        owner_id: ownerId,
        subscription_id: subscriptionId,
        seat_count: seatCount,
        used_seats: 0
      });

    if (error) {
      console.error('Error creating organization account:', error);
      throw error;
    }
  }

  private async updateUserPermissions(userId: string, planId: string, status: string): Promise<void> {
    // This would integrate with the library permissions system
    // For now, we'll just log the permission change
    console.log(`Updating permissions for user ${userId}, plan ${planId}, status ${status}`);
    
    // In a real implementation, this would:
    // 1. Update user role/permissions in the database
    // 2. Invalidate any cached permissions
    // 3. Notify other services of the permission change
  }

  // Task 9.2: Subscription management features

  /**
   * Upgrade or downgrade Pro plan for individual users
   */
  async changePlan(userId: string, newPlanId: string): Promise<SubscriptionResult> {
    try {
      const currentSubscription = await this.getSubscriptionStatus(userId);
      if (!currentSubscription) {
        throw new Error('No active subscription found');
      }

      const newPlan = PLAN_CONFIGS.find(p => p.id === newPlanId);
      if (!newPlan) {
        throw new Error(`Invalid plan: ${newPlanId}`);
      }

      // Update Stripe subscription
      const stripeSubscription = await this.stripe.subscriptions.update(
        currentSubscription.stripe_subscription_id!,
        {
          items: [{
            id: (await this.stripe.subscriptions.retrieve(currentSubscription.stripe_subscription_id!)).items.data[0].id,
            price: newPlan.priceId,
          }],
          proration_behavior: 'create_prorations',
          metadata: {
            ...currentSubscription,
            planId: newPlanId
          }
        }
      );

      // Update local subscription record
      const { data: updatedSubscription, error } = await this.supabase
        .from('subscriptions')
        .update({
          plan_id: newPlanId,
          status: stripeSubscription.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSubscription.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update user permissions
      await this.updateUserPermissions(userId, newPlanId, stripeSubscription.status);

      return {
        success: true,
        subscription: this.mapSubscriptionRow(updatedSubscription)
      };
    } catch (error) {
      console.error('Error changing plan:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Manage organization seats (add/remove seats)
   */
  async manageOrganizationSeats(request: SeatManagementRequest): Promise<SubscriptionResult> {
    try {
      const { organizationId, action, seatCount, userId } = request;

      // Get organization details
      const { data: org, error: orgError } = await this.supabase
        .from('organization_accounts')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (orgError || !org) {
        throw new Error('Organization not found');
      }

      if (action === 'add') {
        if (userId) {
          // Add specific user to organization
          const { data, error } = await this.supabase
            .rpc('manage_organization_seats', {
              p_organization_id: organizationId,
              p_action: 'add',
              p_user_id: userId
            });

          if (error || !data) {
            throw new Error('Failed to add user to organization');
          }
        } else {
          // Increase seat count
          const newSeatCount = org.seat_count + seatCount;
          
          // Update Stripe subscription quantity
          const { data: subscription } = await this.supabase
            .from('subscriptions')
            .select('stripe_subscription_id')
            .eq('user_id', org.owner_id)
            .single();

          if (subscription?.stripe_subscription_id) {
            const stripeSubscription = await this.stripe.subscriptions.retrieve(
              subscription.stripe_subscription_id
            );

            await this.stripe.subscriptions.update(subscription.stripe_subscription_id, {
              items: [{
                id: stripeSubscription.items.data[0].id,
                quantity: newSeatCount,
              }],
              proration_behavior: 'create_prorations'
            });
          }

          // Update organization seat count
          await this.supabase
            .from('organization_accounts')
            .update({ seat_count: newSeatCount })
            .eq('id', organizationId);
        }
      } else if (action === 'remove') {
        if (userId) {
          // Remove specific user from organization
          const { data, error } = await this.supabase
            .rpc('manage_organization_seats', {
              p_organization_id: organizationId,
              p_action: 'remove',
              p_user_id: userId
            });

          if (error || !data) {
            throw new Error('Failed to remove user from organization');
          }
        } else {
          // Decrease seat count
          const newSeatCount = Math.max(1, org.seat_count - seatCount);
          
          // Update Stripe subscription quantity
          const { data: subscription } = await this.supabase
            .from('subscriptions')
            .select('stripe_subscription_id')
            .eq('user_id', org.owner_id)
            .single();

          if (subscription?.stripe_subscription_id) {
            const stripeSubscription = await this.stripe.subscriptions.retrieve(
              subscription.stripe_subscription_id
            );

            await this.stripe.subscriptions.update(subscription.stripe_subscription_id, {
              items: [{
                id: stripeSubscription.items.data[0].id,
                quantity: newSeatCount,
              }],
              proration_behavior: 'create_prorations'
            });
          }

          // Update organization seat count
          await this.supabase
            .from('organization_accounts')
            .update({ seat_count: newSeatCount })
            .eq('id', organizationId);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error managing organization seats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get organization libraries (separate from personal libraries)
   */
  async getOrganizationLibraries(organizationId: string): Promise<any[]> {
    try {
      // This would integrate with the LibraryAgent to get organization-specific libraries
      // For now, we'll return a placeholder
      // Typing quarantine (TS2589): avoid deep generic instantiation on Supabase query builder
      // when this file is compiled via universal-agent's ts-jest + workspace module mapping.
      const sb: any = this.supabase as any
      const { data: libraries, error } = await sb
        .from('libraries')
        .select('*')
        .eq('organization_id', organizationId)

      if (error) {
        throw error;
      }

      return libraries || [];
    } catch (error) {
      console.error('Error getting organization libraries:', error);
      throw error;
    }
  }

  /**
   * Transfer subscription between individual and organization accounts
   */
  async transferSubscription(request: SubscriptionTransferRequest): Promise<SubscriptionResult> {
    try {
      const { fromUserId, toUserId, subscriptionId, transferType } = request;

      // Get current subscription
      const { data: subscription, error: subError } = await this.supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .eq('user_id', fromUserId)
        .single();

      if (subError || !subscription) {
        throw new Error('Subscription not found or access denied');
      }

      if (transferType === 'individual_to_org') {
        // Convert individual subscription to organization
        // This would typically involve:
        // 1. Creating an organization account
        // 2. Updating the subscription metadata
        // 3. Transferring libraries and permissions
        
        const orgName = `${fromUserId}'s Organization`; // Placeholder name
        
        // Create organization account
        const { data: org, error: orgError } = await this.supabase
          .from('organization_accounts')
          .insert({
            name: orgName,
            owner_id: toUserId,
            subscription_id: subscription.stripe_subscription_id!,
            seat_count: 1,
            used_seats: 1
          })
          .select()
          .single();

        if (orgError) {
          throw orgError;
        }

        // Update subscription ownership
        await this.supabase
          .from('subscriptions')
          .update({ user_id: toUserId })
          .eq('id', subscriptionId);

        // Update Stripe subscription metadata
        await this.stripe.subscriptions.update(subscription.stripe_subscription_id!, {
          metadata: {
            userId: toUserId,
            accountType: 'organization',
            organizationId: org.id
          }
        });

      } else if (transferType === 'org_to_individual') {
        // Convert organization subscription to individual
        // This would involve removing organization structure
        
        // Update subscription ownership
        await this.supabase
          .from('subscriptions')
          .update({ user_id: toUserId })
          .eq('id', subscriptionId);

        // Update Stripe subscription metadata
        await this.stripe.subscriptions.update(subscription.stripe_subscription_id!, {
          metadata: {
            userId: toUserId,
            accountType: 'individual'
          }
        });

        // Archive organization account
        await this.supabase
          .from('organization_accounts')
          .update({ 
            name: `[ARCHIVED] ${subscription.plan_id}`,
            seat_count: 0,
            used_seats: 0
          })
          .eq('subscription_id', subscription.stripe_subscription_id!);
      }

      return { success: true };
    } catch (error) {
      console.error('Error transferring subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string, immediate: boolean = false): Promise<SubscriptionResult> {
    try {
      const subscription = await this.getSubscriptionStatus(userId);
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      // Cancel in Stripe
      if (immediate) {
        await this.stripe.subscriptions.cancel(subscription.stripe_subscription_id!);
      } else {
        await this.stripe.subscriptions.update(subscription.stripe_subscription_id!, {
          cancel_at_period_end: true
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Task 9.3: Invite and discount system

  /**
   * Create user invitation with 15% first-month discount
   */
  async createUserInvite(inviterId: string, inviteeEmail: string): Promise<{ inviteCode: string; inviteUrl: string }> {
    try {
      // Generate invite discount code
      const { data: discountCode, error } = await this.supabase
        .rpc('generate_invite_discount', {
          p_created_by: inviterId,
          p_type: 'user_invite',
          p_discount_percentage: DISCOUNT_CODES.USER_INVITE.percentage,
          p_valid_days: 30
        });

      if (error || !discountCode) {
        throw new Error('Failed to generate invite code');
      }

      // Create referral tracking record
      const { error: referralError } = await this.supabase
        .from('referral_tracking')
        .insert({
          referrer_id: inviterId,
          // Will be filled when user signs up
          referee_id: undefined,
          discount_code: discountCode,
          reward_amount: 0, // Could implement referral rewards later
          status: 'pending'
        });

      if (referralError) {
        console.error('Error creating referral tracking:', referralError);
      }

      // Generate invite URL
      const inviteUrl = `${process.env.FRONTEND_URL}/invite?code=${discountCode}&email=${encodeURIComponent(inviteeEmail)}`;

      // Send invitation email
      if (this.emailService) {
        // Get inviter name from database
        const { data: inviter } = await this.supabase
          .from('users')
          .select('first_name, last_name, email')
          .eq('id', inviterId)
          .single();
        
        const inviterName = inviter 
          ? `${inviter.first_name || ''} ${inviter.last_name || ''}`.trim() || inviter.email
          : 'A friend';
        
        await this.emailService.sendInvitationEmail(
          inviteeEmail,
          inviterName,
          discountCode,
          inviteUrl,
          DISCOUNT_CODES.USER_INVITE.percentage
        );
      } else {
        // Fallback to stub method
        await this.sendInvitationEmail(inviteeEmail, discountCode, inviteUrl);
      }

      return {
        inviteCode: discountCode,
        inviteUrl
      };
    } catch (error) {
      console.error('Error creating user invite:', error);
      throw error;
    }
  }

  /**
   * Create story transfer invitation with 20% discount for non-users
   */
  async createStoryTransferInvite(
    senderId: string, 
    recipientEmail: string, 
    storyId: string
  ): Promise<{ inviteCode: string; inviteUrl: string }> {
    try {
      // Check if recipient is already a user
      const { data: existingUser } = await this.supabase
        .from('users')
        .select('id')
        .eq('email', recipientEmail)
        .single();

      if (existingUser) {
        // User already exists, just transfer the story without discount
        // This would integrate with LibraryAgent for story transfer
        throw new Error('User already exists. Use direct story transfer instead.');
      }

      // Generate story transfer discount code
      const { data: discountCode, error } = await this.supabase
        .rpc('generate_invite_discount', {
          p_created_by: senderId,
          p_type: 'story_transfer',
          p_discount_percentage: DISCOUNT_CODES.STORY_TRANSFER.percentage,
          p_valid_days: 30
        });

      if (error || !discountCode) {
        throw new Error('Failed to generate story transfer code');
      }

      // Generate invite URL with story context
      const inviteUrl = `${process.env.FRONTEND_URL}/story-invite?code=${discountCode}&story=${storyId}&email=${encodeURIComponent(recipientEmail)}`;

      // Send story transfer invitation email
      if (this.emailService) {
        // Get sender and story details
        const { data: sender } = await this.supabase
          .from('users')
          .select('first_name, last_name, email')
          .eq('id', senderId)
          .single();
        
        const { data: story } = await this.supabase
          .from('stories')
          .select('title')
          .eq('id', storyId)
          .single();
        
        const senderName = sender 
          ? `${sender.first_name || ''} ${sender.last_name || ''}`.trim() || sender.email
          : 'Someone';
        
        const storyTitle = story?.title || 'a story';
        
        await this.emailService.sendStoryTransferRequestEmail(
          recipientEmail,
          senderName,
          storyTitle,
          inviteUrl,
          discountCode
        );
        
        // Also send confirmation to sender
        if (sender?.email) {
          await this.emailService.sendStoryTransferSentEmail(
            sender.email,
            senderName,
            recipientEmail,
            storyTitle
          );
        }
      } else {
        // Fallback to stub method
        await this.sendStoryTransferEmail(recipientEmail, discountCode, inviteUrl, storyId);
      }

      return {
        inviteCode: discountCode,
        inviteUrl
      };
    } catch (error) {
      console.error('Error creating story transfer invite:', error);
      throw error;
    }
  }

  /**
   * Validate and apply coupon/discount code
   */
  async applyCoupon(userId: string, couponCode: string): Promise<DiscountResult> {
    return this.validateAndApplyDiscount(couponCode, userId);
  }

  /**
   * Create custom discount code (admin function)
   */
  async createDiscountCode(
    createdBy: string,
    type: 'user_invite' | 'story_transfer',
    discountPercentage: number,
    validDays: number = 30
  ): Promise<string> {
    try {
      const { data: discountCode, error } = await this.supabase
        .rpc('generate_invite_discount', {
          p_created_by: createdBy,
          p_type: type,
          p_discount_percentage: discountPercentage,
          p_valid_days: validDays
        });

      if (error || !discountCode) {
        throw new Error('Failed to generate discount code');
      }

      return discountCode;
    } catch (error) {
      console.error('Error creating discount code:', error);
      throw error;
    }
  }

  /**
   * Track referral completion and rewards
   */
  async completeReferral(referrerId: string, refereeId: string, discountCode: string): Promise<void> {
    try {
      // Update referral tracking with referee information
      const { error } = await this.supabase
        .from('referral_tracking')
        .update({
          referee_id: refereeId,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('referrer_id', referrerId)
        .eq('discount_code', discountCode);

      if (error) {
        console.error('Error completing referral:', error);
        throw error;
      }

      // Could implement referral rewards here
      // For example, give the referrer account credits or discounts
    } catch (error) {
      console.error('Error completing referral:', error);
      throw error;
    }
  }

  /**
   * Get user's referral statistics
   */
  async getReferralStats(userId: string): Promise<{
    totalReferrals: number;
    completedReferrals: number;
    pendingReferrals: number;
    totalRewards: number;
  }> {
    try {
      const { data: referrals, error } = await this.supabase
        .from('referral_tracking')
        .select('*')
        .eq('referrer_id', userId);

      if (error) {
        throw error;
      }

      const stats = {
        totalReferrals: referrals.length,
        completedReferrals: referrals.filter(r => r.status === 'completed').length,
        pendingReferrals: referrals.filter(r => r.status === 'pending').length,
        totalRewards: referrals.reduce((sum, r) => sum + (r.reward_amount || 0), 0)
      };

      return stats;
    } catch (error) {
      console.error('Error getting referral stats:', error);
      throw error;
    }
  }

  /**
   * Get available discount codes for a user
   */
  async getAvailableDiscounts(userId: string): Promise<InviteDiscount[]> {
    try {
      const { data: discounts, error } = await this.supabase
        .from('invite_discounts')
        .select('*')
        .eq('created_by', userId)
        .is('used_by', null)
        .gt('valid_until', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (discounts || []).map(d => this.mapInviteDiscountRow(d));
    } catch (error) {
      console.error('Error getting available discounts:', error);
      throw error;
    }
  }

  // Email service integration methods

  private async sendInvitationEmail(
    recipientEmail: string, 
    discountCode: string, 
    inviteUrl: string
  ): Promise<void> {
    try {
      // This would integrate with an email service like SendGrid, AWS SES, etc.
      // For now, we'll just log the email details
      console.log('Sending invitation email:', {
        to: recipientEmail,
        subject: 'You\'re invited to join Storytailor!',
        discountCode,
        inviteUrl,
        template: 'user_invitation',
        discount: DISCOUNT_CODES.USER_INVITE
      });

      // Example email content:
      const emailContent = {
        to: recipientEmail,
        subject: 'You\'re invited to join Storytailor!',
        html: `
          <h1>You're invited to join Storytailor!</h1>
          <p>Someone has invited you to join Storytailor, the SI Powered storytelling platform for children.</p>
          <p>Use code <strong>${discountCode}</strong> to get ${DISCOUNT_CODES.USER_INVITE.percentage}% off your first month!</p>
          <a href="${inviteUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Accept Invitation
          </a>
          <p>This invitation expires in 30 days.</p>
        `
      };

      // In a real implementation, you would send this via your email service
      // await emailService.send(emailContent);
    } catch (error) {
      console.error('Error sending invitation email:', error);
      // Don't throw here to avoid breaking the invite creation process
    }
  }

  private async sendStoryTransferEmail(
    recipientEmail: string,
    discountCode: string,
    inviteUrl: string,
    storyId: string
  ): Promise<void> {
    try {
      // This would integrate with an email service
      console.log('Sending story transfer email:', {
        to: recipientEmail,
        subject: 'A story has been shared with you!',
        discountCode,
        inviteUrl,
        storyId,
        template: 'story_transfer',
        discount: DISCOUNT_CODES.STORY_TRANSFER
      });

      const emailContent = {
        to: recipientEmail,
        subject: 'A story has been shared with you!',
        html: `
          <h1>A story has been shared with you!</h1>
          <p>Someone has shared a Storytailor story with you and invited you to create your own account.</p>
          <p>Use code <strong>${discountCode}</strong> to get ${DISCOUNT_CODES.STORY_TRANSFER.percentage}% off your first month when you sign up!</p>
          <a href="${inviteUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Story & Sign Up
          </a>
          <p>This invitation expires in 30 days.</p>
        `
      };

      // In a real implementation, you would send this via your email service
      // await emailService.send(emailContent);
    } catch (error) {
      console.error('Error sending story transfer email:', error);
      // Don't throw here to avoid breaking the invite creation process
    }
  }

  private async validateAndApplyDiscount(code: string, userId: string): Promise<DiscountResult> {
    try {
      const { data: discount, error } = await this.supabase
        .from('invite_discounts')
        .select('*')
        .eq('code', code)
        .is('used_by', null)
        .gt('valid_until', new Date().toISOString())
        .single();

      if (error || !discount) {
        return {
          applied: false,
          discountAmount: 0,
          discountPercentage: 0,
          couponCode: code
        };
      }

      // Type assertion for discount (Supabase type inference issue)
      const discountData = discount as any;

      // Mark discount as used
      await this.supabase
        .from('invite_discounts')
        .update({ used_by: userId })
        .eq('id', discountData.id);

      // Complete referral if this was a referral discount
      if (discountData.type === 'user_invite') {
        await this.completeReferral(discountData.created_by, userId, code);
      }

      return {
        applied: true,
        discountAmount: 0, // Will be calculated by Stripe
        discountPercentage: discountData.discount_percentage || 0,
        couponCode: code
      };
    } catch (error) {
      console.error('Error validating discount:', error);
      return {
        applied: false,
        discountAmount: 0,
        discountPercentage: 0,
        couponCode: code
      };
    }
  }

  private mapSubscriptionRow(
    row: Database['public']['Tables']['subscriptions']['Row']
  ): Subscription {
    return {
      id: row.id,
      user_id: row.user_id,
      stripe_subscription_id: row.stripe_subscription_id ?? null,
      plan_id: row.plan_id,
      status: row.status,
      current_period_start: row.current_period_start ?? null,
      current_period_end: row.current_period_end ?? null,
      created_at: row.created_at ?? null,
    };
  }

  private mapInviteDiscountRow(
    row: Database['public']['Tables']['invite_discounts']['Row']
  ): InviteDiscount {
    const type = row.type === 'story_transfer' ? 'story_transfer' : 'user_invite';
    return {
      id: row.id,
      code: row.code,
      type,
      discountPercentage: row.discount_percentage,
      createdBy: row.created_by,
      validUntil: row.valid_until,
      usedBy: row.used_by ?? undefined,
      createdAt: row.created_at ?? null,
    };
  }
}
import { Subscription, CheckoutSession, DiscountResult, SubscriptionResult, StripeEvent } from '@alexa-multi-agent/shared-types';

export interface EmailService {
  sendWelcomeEmail(to: string, userId: string, userName?: string): Promise<void>;
  sendReceiptEmail(to: string, userId: string, receiptData: {
    amount: number;
    currency: string;
    invoiceId: string;
    invoiceUrl?: string;
    date: string;
  }): Promise<void>;
  sendInvitationEmail(to: string, inviterName: string, inviteCode: string, inviteUrl: string, discountPercent?: number): Promise<void>;
  sendStoryTransferRequestEmail(to: string, senderName: string, storyTitle: string, transferUrl: string, discountCode?: string): Promise<void>;
  sendStoryTransferSentEmail(to: string, senderName: string, recipientEmail: string, storyTitle: string): Promise<void>;
  sendStoryTransferAcceptedEmail(to: string, recipientName: string, storyTitle: string): Promise<void>;
  sendStoryTransferRejectedEmail(to: string, recipientName: string, storyTitle: string): Promise<void>;
  sendPaymentFailedEmail(to: string, userId: string, invoiceId: string, amount: number, currency: string, updateUrl: string): Promise<void>;
  sendB2BOnboardingEmail(to: string, organizationName: string, adminName: string, setupUrl: string): Promise<void>;
  sendSubscriptionCancelledEmail(to: string, userId: string, planName: string, cancellationDate: string, reactivateUrl?: string): Promise<void>;
  sendUpgradeConfirmationEmail(to: string, userId: string, newPlanName: string, previousPlanName: string, effectiveDate: string): Promise<void>;
  sendDowngradeConfirmationEmail(to: string, userId: string, newPlanName: string, previousPlanName: string, effectiveDate: string): Promise<void>;
  sendPaymentMethodUpdatedEmail(to: string, userId: string, last4: string, cardBrand: string): Promise<void>;
}

export interface CommerceAgentConfig {
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  supabaseUrl: string;
  supabaseServiceKey: string;
  redisUrl?: string;
  emailService?: EmailService;
  logger?: any;
}

export interface PlanConfig {
  id: string;
  name: string;
  type: 'individual' | 'organization';
  priceId: string;
  features: string[];
  seatBased?: boolean;
  maxSeats?: number;
}

export interface OrganizationAccount {
  id: string;
  name: string;
  ownerId: string;
  subscriptionId: string;
  seatCount: number;
  usedSeats: number;
  createdAt: string | null;
}

export interface InviteDiscount {
  id: string;
  code: string;
  type: 'user_invite' | 'story_transfer';
  discountPercentage: number;
  validUntil: string;
  usedBy?: string | null;
  createdBy: string;
  createdAt: string | null;
}

export interface ReferralTracking {
  id: string;
  referrerId: string;
  refereeId?: string | null;
  discountCode?: string | null;
  rewardAmount: number;
  status: 'pending' | 'completed' | 'expired';
  createdAt: string | null;
}

export interface InvoiceData {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: string;
  dueDate: string;
  paidAt?: string;
  invoiceUrl: string;
}

export interface SeatManagementRequest {
  organizationId: string;
  action: 'add' | 'remove';
  seatCount: number;
  userId?: string; // For specific seat assignment
}

export interface SubscriptionTransferRequest {
  fromUserId: string;
  toUserId: string;
  subscriptionId: string;
  transferType: 'individual_to_org' | 'org_to_individual';
}

// Re-export shared types
export type { Subscription, CheckoutSession, DiscountResult, SubscriptionResult, StripeEvent };
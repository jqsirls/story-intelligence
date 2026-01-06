export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id?: string;
  plan_id: string;
  status: string;
  current_period_start?: string;
  current_period_end?: string;
  created_at: string;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
  expiresAt: string;
}

export interface DiscountResult {
  applied: boolean;
  discountAmount: number;
  discountPercentage: number;
  couponCode: string;
}

export interface SubscriptionResult {
  success: boolean;
  subscription?: Subscription;
  error?: string;
}

export interface StripeEvent {
  id: string;
  type: string;
  data: Record<string, any>;
  created: number;
}
#!/bin/bash
# Deploy Commerce Agent Lambda
# Handles subscription management and payment processing
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Environment setup
ENVIRONMENT=${1:-staging}
PREFIX="/storytailor-${ENVIRONMENT}"
LAMBDA_NAME="storytailor-commerce-agent-${ENVIRONMENT}"
HANDLER_FILE="index.js"

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                💳 DEPLOYING COMMERCE AGENT 💳                     ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${CYAN}Lambda Name: ${LAMBDA_NAME}${NC}"
echo ""

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
    echo -e "${YELLOW}Usage: $0 [staging|production]${NC}"
    exit 1
fi

# Get AWS account info
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region || echo "us-east-1")
LAMBDA_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/storytailor-lambda-role-${ENVIRONMENT}"

echo -e "${GREEN}✅ AWS Account: ${AWS_ACCOUNT_ID}${NC}"
echo -e "${GREEN}✅ AWS Region: ${AWS_REGION}${NC}"
echo -e "${GREEN}✅ Lambda Role: storytailor-lambda-role-${ENVIRONMENT}${NC}"
echo ""

# Create deployment directory
DEPLOY_DIR="./lambda-deployments/commerce-agent"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

echo -e "${BLUE}📁 Created deployment directory: $DEPLOY_DIR${NC}"

# Create package.json
cat > "$DEPLOY_DIR/package.json" << EOF
{
  "name": "storytailor-commerce-agent",
  "version": "1.0.0",
  "description": "Storytailor Commerce Agent - Subscription and payment management",
  "main": "index.js",
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "redis": "^4.6.0",
    "joi": "^17.11.0",
    "winston": "^3.11.0",
    "uuid": "^9.0.1",
    "stripe": "^14.0.0",
    "axios": "^1.6.0"
  }
}
EOF

# Create Lambda handler
cat > "$DEPLOY_DIR/$HANDLER_FILE" << 'EOF'
const { createClient } = require('@supabase/supabase-js');
const { createClient: createRedisClient } = require('redis');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const Stripe = require('stripe');
const axios = require('axios');

// Configuration
const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
  },
  pricing: {
    basic: {
      id: 'basic',
      name: 'Basic Plan',
      price: 999, // $9.99 in cents
      features: ['5 stories/month', '1 family member', 'Standard voices']
    },
    premium: {
      id: 'premium',
      name: 'Premium Plan',
      price: 1999, // $19.99 in cents
      features: ['50 stories/month', '5 family members', 'Premium voices', 'Educational content']
    },
    family: {
      id: 'family',
      name: 'Family Plan',
      price: 2999, // $29.99 in cents
      features: ['Unlimited stories', 'Unlimited family members', 'All voices', 'Educational content', 'Priority support']
    }
  }
};

// Initialize Stripe
const stripe = new Stripe(config.stripe.secretKey || 'sk_test_dummy');

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Validation schemas
const createSubscriptionSchema = Joi.object({
  userId: Joi.string().required(),
  planId: Joi.string().valid('basic', 'premium', 'family').required(),
  paymentMethodId: Joi.string().optional(),
  metadata: Joi.object().optional()
});

const updateSubscriptionSchema = Joi.object({
  userId: Joi.string().required(),
  subscriptionId: Joi.string().required(),
  planId: Joi.string().valid('basic', 'premium', 'family').optional(),
  cancelAtPeriodEnd: Joi.boolean().optional()
});

const processPaymentSchema = Joi.object({
  userId: Joi.string().required(),
  amount: Joi.number().min(100).required(), // minimum $1.00
  currency: Joi.string().default('usd'),
  description: Joi.string().required(),
  paymentMethodId: Joi.string().required()
});

// Services
class CommerceAgent {
  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.serviceKey);
    this.redis = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Connect to Redis
      this.redis = createRedisClient({ url: config.redis.url });
      await this.redis.connect();
      
      // Test Supabase connection
      const { error } = await this.supabase.from('subscriptions').select('id').limit(1);
      if (error && !error.message.includes('does not exist')) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }
      
      this.isInitialized = true;
      logger.info('CommerceAgent initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize CommerceAgent', { error: error.message });
      throw error;
    }
  }

  async createSubscription(data) {
    const { userId, planId, paymentMethodId, metadata } = data;
    const subscriptionId = uuidv4();
    
    logger.info('Creating subscription', { 
      subscriptionId, 
      userId,
      planId
    });

    try {
      // Get or create Stripe customer
      const stripeCustomer = await this.getOrCreateStripeCustomer(userId);
      
      // Attach payment method if provided
      if (paymentMethodId) {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: stripeCustomer.id
        });
        
        // Set as default payment method
        await stripe.customers.update(stripeCustomer.id, {
          invoice_settings: {
            default_payment_method: paymentMethodId
          }
        });
      }
      
      // Create Stripe subscription
      const plan = config.pricing[planId];
      const stripeSubscription = await stripe.subscriptions.create({
        customer: stripeCustomer.id,
        items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: plan.name,
              metadata: { planId }
            },
            unit_amount: plan.price,
            recurring: {
              interval: 'month'
            }
          }
        }],
        metadata: {
          userId,
          subscriptionId,
          ...metadata
        }
      });
      
      // Store subscription in database
      const subscription = {
        id: subscriptionId,
        user_id: userId,
        stripe_subscription_id: stripeSubscription.id,
        stripe_customer_id: stripeCustomer.id,
        plan_id: planId,
        status: stripeSubscription.status,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        metadata: metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { error: dbError } = await this.supabase
        .from('subscriptions')
        .insert(subscription);
        
      if (dbError && !dbError.message.includes('does not exist')) {
        // Cancel Stripe subscription if DB insert fails
        await stripe.subscriptions.cancel(stripeSubscription.id);
        throw dbError;
      }
      
      // Cache subscription data
      const cacheKey = `subscription:${userId}`;
      await this.redis.set(cacheKey, JSON.stringify(subscription), {
        EX: 3600 // 1 hour cache
      });
      
      // Update user features based on plan
      await this.updateUserFeatures(userId, planId);
      
      logger.info('Subscription created successfully', { subscriptionId });
      
      return {
        success: true,
        subscription: {
          id: subscriptionId,
          planId,
          status: stripeSubscription.status,
          currentPeriodEnd: subscription.current_period_end,
          features: plan.features
        }
      };

    } catch (error) {
      logger.error('Failed to create subscription', { 
        subscriptionId, 
        error: error.message 
      });
      throw error;
    }
  }

  async updateSubscription(data) {
    const { userId, subscriptionId, planId, cancelAtPeriodEnd } = data;
    
    logger.info('Updating subscription', { 
      subscriptionId,
      userId,
      planId,
      cancelAtPeriodEnd
    });

    try {
      // Get subscription from database
      const { data: subscription, error: fetchError } = await this.supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .eq('user_id', userId)
        .single();
        
      if (fetchError || !subscription) {
        throw new Error('Subscription not found');
      }
      
      const stripeSubscriptionId = subscription.stripe_subscription_id;
      let updateData = {};
      
      // Handle plan change
      if (planId && planId !== subscription.plan_id) {
        const plan = config.pricing[planId];
        const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        
        await stripe.subscriptions.update(stripeSubscriptionId, {
          items: [{
            id: stripeSubscription.items.data[0].id,
            price_data: {
              currency: 'usd',
              product_data: {
                name: plan.name,
                metadata: { planId }
              },
              unit_amount: plan.price,
              recurring: {
                interval: 'month'
              }
            }
          }],
          proration_behavior: 'create_prorations'
        });
        
        updateData.plan_id = planId;
        
        // Update user features
        await this.updateUserFeatures(userId, planId);
      }
      
      // Handle cancellation
      if (cancelAtPeriodEnd !== undefined) {
        await stripe.subscriptions.update(stripeSubscriptionId, {
          cancel_at_period_end: cancelAtPeriodEnd
        });
        
        updateData.cancel_at_period_end = cancelAtPeriodEnd;
      }
      
      // Update database
      updateData.updated_at = new Date().toISOString();
      
      const { error: updateError } = await this.supabase
        .from('subscriptions')
        .update(updateData)
        .eq('id', subscriptionId);
        
      if (updateError) {
        throw updateError;
      }
      
      // Invalidate cache
      await this.redis.del(`subscription:${userId}`);
      
      logger.info('Subscription updated successfully', { subscriptionId });
      
      return {
        success: true,
        message: 'Subscription updated',
        updates: updateData
      };

    } catch (error) {
      logger.error('Failed to update subscription', { 
        subscriptionId, 
        error: error.message 
      });
      throw error;
    }
  }

  async processPayment(data) {
    const { userId, amount, currency, description, paymentMethodId } = data;
    const paymentId = uuidv4();
    
    logger.info('Processing payment', { 
      paymentId,
      userId,
      amount,
      currency
    });

    try {
      // Get or create Stripe customer
      const stripeCustomer = await this.getOrCreateStripeCustomer(userId);
      
      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        customer: stripeCustomer.id,
        payment_method: paymentMethodId,
        description,
        confirm: true,
        metadata: {
          userId,
          paymentId
        }
      });
      
      // Store payment record
      const payment = {
        id: paymentId,
        user_id: userId,
        stripe_payment_intent_id: paymentIntent.id,
        amount,
        currency,
        description,
        status: paymentIntent.status,
        created_at: new Date().toISOString()
      };
      
      const { error: dbError } = await this.supabase
        .from('payments')
        .insert(payment);
        
      if (dbError && !dbError.message.includes('does not exist')) {
        logger.warn('Could not store payment in database', { error: dbError.message });
      }
      
      logger.info('Payment processed successfully', { 
        paymentId,
        status: paymentIntent.status
      });
      
      return {
        success: true,
        payment: {
          id: paymentId,
          amount,
          currency,
          status: paymentIntent.status
        }
      };

    } catch (error) {
      logger.error('Failed to process payment', { 
        paymentId, 
        error: error.message 
      });
      throw error;
    }
  }

  async getOrCreateStripeCustomer(userId) {
    try {
      // Check cache first
      const cacheKey = `stripe_customer:${userId}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
      
      // Check database
      const { data: user } = await this.supabase
        .from('users')
        .select('stripe_customer_id, email')
        .eq('id', userId)
        .single();
      
      if (user?.stripe_customer_id) {
        const customer = await stripe.customers.retrieve(user.stripe_customer_id);
        await this.redis.set(cacheKey, JSON.stringify(customer), { EX: 3600 });
        return customer;
      }
      
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user?.email,
        metadata: { userId }
      });
      
      // Update user record
      await this.supabase
        .from('users')
        .update({ stripe_customer_id: customer.id })
        .eq('id', userId);
      
      // Cache customer
      await this.redis.set(cacheKey, JSON.stringify(customer), { EX: 3600 });
      
      return customer;
    } catch (error) {
      logger.error('Failed to get/create Stripe customer', { error: error.message });
      throw error;
    }
  }

  async updateUserFeatures(userId, planId) {
    try {
      const plan = config.pricing[planId];
      const features = {
        stories_per_month: planId === 'family' ? -1 : (planId === 'premium' ? 50 : 5),
        family_members: planId === 'family' ? -1 : (planId === 'premium' ? 5 : 1),
        premium_voices: planId !== 'basic',
        educational_content: planId !== 'basic',
        priority_support: planId === 'family'
      };
      
      const { error } = await this.supabase
        .from('user_features')
        .upsert({
          user_id: userId,
          ...features,
          updated_at: new Date().toISOString()
        });
        
      if (error) {
        logger.warn('Could not update user features', { error: error.message });
      }
      
      // Cache features
      const cacheKey = `user_features:${userId}`;
      await this.redis.set(cacheKey, JSON.stringify(features), { EX: 3600 });
      
    } catch (error) {
      logger.error('Failed to update user features', { error: error.message });
    }
  }

  async getSubscription(userId) {
    try {
      // Check cache first
      const cacheKey = `subscription:${userId}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
      
      // Query database
      const { data, error } = await this.supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();
      
      if (error || !data) {
        return null;
      }
      
      // Cache result
      await this.redis.set(cacheKey, JSON.stringify(data), { EX: 3600 });
      
      return data;
    } catch (error) {
      logger.error('Failed to get subscription', { error: error.message });
      return null;
    }
  }
}

// Lambda handler
const commerceAgent = new CommerceAgent();

exports.handler = async (event) => {
  logger.info('Commerce Agent invoked', { 
    eventType: event.type,
    action: event.action,
    requestId: event.requestId || uuidv4()
  });

  try {
    // Initialize agent if needed
    await commerceAgent.initialize();

    // Parse event
    const { action, data } = event;

    switch (action) {
      case 'createSubscription': {
        const { error } = createSubscriptionSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await commerceAgent.createSubscription(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'updateSubscription': {
        const { error } = updateSubscriptionSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await commerceAgent.updateSubscription(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'processPayment': {
        const { error } = processPaymentSchema.validate(data);
        if (error) throw new Error(`Validation error: ${error.message}`);
        
        const result = await commerceAgent.processPayment(data);
        return {
          statusCode: 200,
          body: JSON.stringify(result)
        };
      }

      case 'getSubscription': {
        if (!data.userId) throw new Error('userId is required');
        
        const subscription = await commerceAgent.getSubscription(data.userId);
        return {
          statusCode: 200,
          body: JSON.stringify({ subscription })
        };
      }

      case 'getPricingPlans': {
        return {
          statusCode: 200,
          body: JSON.stringify({ plans: config.pricing })
        };
      }

      case 'health': {
        return {
          statusCode: 200,
          body: JSON.stringify({
            status: 'healthy',
            agent: 'commerce-agent',
            version: '1.0.0',
            initialized: commerceAgent.isInitialized,
            features: [
              'subscription_management',
              'payment_processing',
              'stripe_integration',
              'feature_management'
            ]
          })
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    logger.error('Commerce Agent error', { 
      error: error.message,
      stack: error.stack 
    });
    
    return {
      statusCode: error.message.includes('Validation') ? 400 : 500,
      body: JSON.stringify({
        error: error.message,
        type: 'CommerceAgentError'
      })
    };
  }
};
EOF

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
cd "$DEPLOY_DIR"
npm install --production

# Create deployment package
echo -e "${YELLOW}📦 Creating deployment package...${NC}"
zip -r deployment.zip . >/dev/null 2>&1

# Get environment variables from Parameter Store
echo -e "${BLUE}🔧 Loading environment configuration...${NC}"
SUPABASE_URL=$(aws ssm get-parameter --name "${PREFIX}/supabase-url" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")
SUPABASE_SERVICE_KEY=$(aws ssm get-parameter --name "${PREFIX}/supabase-service-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")
REDIS_URL=$(aws ssm get-parameter --name "${PREFIX}/redis-url" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")
STRIPE_SECRET_KEY=$(aws ssm get-parameter --name "${PREFIX}/stripe-secret-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")
STRIPE_WEBHOOK_SECRET=$(aws ssm get-parameter --name "${PREFIX}/stripe-webhook-secret" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")

# Check if Lambda exists
LAMBDA_EXISTS=$(aws lambda get-function --function-name "$LAMBDA_NAME" 2>&1 | grep -c "FunctionName" || true)

if [ "$LAMBDA_EXISTS" -eq 0 ]; then
    echo -e "${YELLOW}🆕 Creating new Lambda function...${NC}"
    
    # Create Lambda function
    aws lambda create-function \
        --function-name "$LAMBDA_NAME" \
        --runtime nodejs20.x \
        --handler "$HANDLER_FILE.handler" \
        --role "$LAMBDA_ROLE_ARN" \
        --zip-file fileb://deployment.zip \
        --timeout 30 \
        --memory-size 512 \
        --environment Variables="{
            ENVIRONMENT='$ENVIRONMENT',
            SUPABASE_URL='$SUPABASE_URL',
            SUPABASE_SERVICE_ROLE_KEY='$SUPABASE_SERVICE_KEY',
            REDIS_URL='$REDIS_URL',
            STRIPE_SECRET_KEY='$STRIPE_SECRET_KEY',
            STRIPE_WEBHOOK_SECRET='$STRIPE_WEBHOOK_SECRET'
        }" \
        --description "Storytailor Commerce Agent - Subscription and payment management"
    
    echo -e "${GREEN}✅ Lambda function created${NC}"
    
    # Wait for function to be active
    echo -e "${YELLOW}⏳ Waiting for function to be active...${NC}"
    aws lambda wait function-active --function-name "$LAMBDA_NAME"
    
else
    echo -e "${YELLOW}♻️  Updating existing Lambda function...${NC}"
    
    # Update function code
    aws lambda update-function-code \
        --function-name "$LAMBDA_NAME" \
        --zip-file fileb://deployment.zip
    
    # Wait for update to complete
    aws lambda wait function-updated --function-name "$LAMBDA_NAME"
    
    # Update function configuration
    aws lambda update-function-configuration \
        --function-name "$LAMBDA_NAME" \
        --timeout 30 \
        --memory-size 512 \
        --environment Variables="{
            ENVIRONMENT='$ENVIRONMENT',
            SUPABASE_URL='$SUPABASE_URL',
            SUPABASE_SERVICE_ROLE_KEY='$SUPABASE_SERVICE_KEY',
            REDIS_URL='$REDIS_URL',
            STRIPE_SECRET_KEY='$STRIPE_SECRET_KEY',
            STRIPE_WEBHOOK_SECRET='$STRIPE_WEBHOOK_SECRET'
        }"
    
    echo -e "${GREEN}✅ Lambda function updated${NC}"
fi

# Add EventBridge permissions
echo -e "${YELLOW}🔗 Configuring EventBridge permissions...${NC}"
aws lambda add-permission \
    --function-name "$LAMBDA_NAME" \
    --statement-id "AllowEventBridgeInvoke" \
    --action "lambda:InvokeFunction" \
    --principal "events.amazonaws.com" \
    --source-arn "arn:aws:events:${AWS_REGION}:${AWS_ACCOUNT_ID}:rule/storytailor-${ENVIRONMENT}-commerce-*" \
    2>/dev/null || true

# Test the function
echo -e "${BLUE}🧪 Testing Commerce Agent...${NC}"
TEST_PAYLOAD='{"action":"health"}'

RESULT=$(aws lambda invoke \
    --function-name "$LAMBDA_NAME" \
    --payload "$TEST_PAYLOAD" \
    --cli-binary-format raw-in-base64-out \
    /tmp/commerce-agent-test-output.json 2>&1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Test invocation successful${NC}"
    cat /tmp/commerce-agent-test-output.json | jq '.'
else
    echo -e "${RED}❌ Test invocation failed${NC}"
    echo "$RESULT"
fi

# Cleanup
cd - > /dev/null
rm -rf "$DEPLOY_DIR"
rm -f /tmp/commerce-agent-test-output.json

echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                🎉 COMMERCE AGENT DEPLOYED! 🎉                     ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Lambda Function: ${LAMBDA_NAME}${NC}"
echo -e "${CYAN}Region: ${AWS_REGION}${NC}"
echo ""
echo -e "${GREEN}✅ Commerce Agent is ready to:${NC}"
echo -e "   • Manage subscriptions (Basic/Premium/Family)"
echo -e "   • Process payments via Stripe"
echo -e "   • Handle billing and invoicing"
echo -e "   • Manage user features based on plans"
echo ""
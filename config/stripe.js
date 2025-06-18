const Stripe = require('stripe');

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Test Stripe connection
const testStripeConnection = async () => {
  if (!stripe) {
    console.log('⚠️ Stripe not configured - set STRIPE_SECRET_KEY for payments');
    return false;
  }
  
  try {
    await stripe.balance.retrieve();
    console.log('✅ Stripe connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Stripe connection failed:', error.message);
    return false;
  }
};

// Payment helper functions
const stripeHelpers = {
  // Create payment intent for referral payments
  createReferralPayment: async (amount, currency = 'gbp', referralId) => {
    if (!stripe) throw new Error('Stripe not configured');
    
    return await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to pence
      currency: currency,
      metadata: {
        type: 'referral_payment',
        referralId: referralId
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });
  },
  
  // Create customer for company
  createCustomer: async (email, name, metadata = {}) => {
    if (!stripe) throw new Error('Stripe not configured');
    
    return await stripe.customers.create({
      email,
      name,
      metadata
    });
  },
  
  // Create payment method for customer
  attachPaymentMethod: async (paymentMethodId, customerId) => {
    if (!stripe) throw new Error('Stripe not configured');
    
    return await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
  },
  
  // Retrieve payment intent
  retrievePaymentIntent: async (paymentIntentId) => {
    if (!stripe) throw new Error('Stripe not configured');
    
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  },
  
  // Create refund
  createRefund: async (paymentIntentId, amount = null) => {
    if (!stripe) throw new Error('Stripe not configured');
    
    const refundData = { payment_intent: paymentIntentId };
    if (amount) refundData.amount = amount * 100;
    
    return await stripe.refunds.create(refundData);
  },
  
  // Calculate platform fee (2.5% + £0.20)
  calculatePlatformFee: (amount) => {
    const feePercent = 0.025; // 2.5%
    const fixedFee = 0.20; // £0.20
    return Math.round((amount * feePercent + fixedFee) * 100) / 100;
  }
};

module.exports = {
  stripe,
  testStripeConnection,
  ...stripeHelpers
};
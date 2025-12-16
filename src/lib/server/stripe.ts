// Scout - Stripe Integration
import Stripe from 'stripe';

// Plan configuration (Grove tier names: Seedling, Sapling, Evergreen, Canopy, Platform)
export const PLANS = {
	seedling: {
		name: 'Seedling',
		price: 1000, // $10.00
		credits: 50,
		priceId: '' // Set via environment or Stripe dashboard
	},
	sapling: {
		name: 'Sapling',
		price: 2500, // $25.00
		credits: 200,
		priceId: ''
	}
} as const;

export const CREDIT_PACK = {
	name: 'Credit Pack',
	price: 1000, // $10.00
	credits: 50,
	priceId: ''
};

export function createStripeClient(apiKey: string): Stripe {
	return new Stripe(apiKey);
}

export async function createCheckoutSession(
	stripe: Stripe,
	params: {
		customerId?: string;
		customerEmail: string;
		priceId: string;
		mode: 'subscription' | 'payment';
		successUrl: string;
		cancelUrl: string;
		metadata?: Record<string, string>;
	}
): Promise<Stripe.Checkout.Session> {
	const sessionParams: Stripe.Checkout.SessionCreateParams = {
		mode: params.mode,
		line_items: [{ price: params.priceId, quantity: 1 }],
		success_url: params.successUrl,
		cancel_url: params.cancelUrl,
		metadata: params.metadata
	};

	if (params.customerId) {
		sessionParams.customer = params.customerId;
	} else {
		sessionParams.customer_email = params.customerEmail;
	}

	if (params.mode === 'subscription') {
		sessionParams.subscription_data = {
			metadata: params.metadata
		};
	}

	return stripe.checkout.sessions.create(sessionParams);
}

export async function createCustomerPortalSession(
	stripe: Stripe,
	customerId: string,
	returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
	return stripe.billingPortal.sessions.create({
		customer: customerId,
		return_url: returnUrl
	});
}

export async function getOrCreateCustomer(
	stripe: Stripe,
	email: string,
	metadata?: Record<string, string>
): Promise<Stripe.Customer> {
	// Check if customer exists
	const existing = await stripe.customers.list({
		email,
		limit: 1
	});

	if (existing.data.length > 0) {
		return existing.data[0];
	}

	// Create new customer
	return stripe.customers.create({
		email,
		metadata
	});
}

// Webhook event types we handle
export type StripeWebhookEvent =
	| 'checkout.session.completed'
	| 'customer.subscription.created'
	| 'customer.subscription.updated'
	| 'customer.subscription.deleted'
	| 'invoice.paid'
	| 'invoice.payment_failed';

export function verifyWebhookSignature(
	stripe: Stripe,
	payload: string,
	signature: string,
	webhookSecret: string
): Stripe.Event {
	return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

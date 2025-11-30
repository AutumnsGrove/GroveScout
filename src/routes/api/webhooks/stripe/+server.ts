// Scout - Stripe Webhook Handler
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Stripe from 'stripe';
import { createStripeClient, verifyWebhookSignature, PLANS } from '$lib/server/stripe';
import { upsertSubscription, addCreditEntry, getUserByEmail, getUserById, getCreditBalance } from '$lib/server/db';
import { generateId } from '$lib/server/db';
import {
	createResendClient,
	sendSubscriptionConfirmedEmail,
	sendCreditPackPurchasedEmail
} from '$lib/server/email';

export const POST: RequestHandler = async ({ request, platform }) => {
	if (!platform) {
		return json({ error: 'Platform not available' }, { status: 500 });
	}

	const { DB, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY } = platform.env;

	const payload = await request.text();
	const signature = request.headers.get('stripe-signature');

	if (!signature) {
		return json({ error: 'Missing signature' }, { status: 400 });
	}

	let event: Stripe.Event;
	try {
		const stripe = createStripeClient(STRIPE_SECRET_KEY);
		event = verifyWebhookSignature(stripe, payload, signature, STRIPE_WEBHOOK_SECRET);
	} catch (err) {
		console.error('Webhook signature verification failed:', err);
		return json({ error: 'Invalid signature' }, { status: 400 });
	}

	console.log(`[Stripe] Received event: ${event.type}`);

	try {
		switch (event.type) {
			case 'checkout.session.completed': {
				const session = event.data.object as Stripe.Checkout.Session;
				await handleCheckoutCompleted(DB, RESEND_API_KEY, session);
				break;
			}

			case 'customer.subscription.created':
			case 'customer.subscription.updated': {
				const subscription = event.data.object as Stripe.Subscription;
				await handleSubscriptionUpdate(DB, subscription);
				break;
			}

			case 'customer.subscription.deleted': {
				const subscription = event.data.object as Stripe.Subscription;
				await handleSubscriptionCanceled(DB, subscription);
				break;
			}

			case 'invoice.paid': {
				const invoice = event.data.object as Stripe.Invoice;
				await handleInvoicePaid(DB, RESEND_API_KEY, invoice);
				break;
			}

			case 'invoice.payment_failed': {
				const invoice = event.data.object as Stripe.Invoice;
				console.error(`[Stripe] Payment failed for invoice ${invoice.id}`);
				// Could send email notification here
				break;
			}

			default:
				console.log(`[Stripe] Unhandled event type: ${event.type}`);
		}

		return json({ received: true });
	} catch (err) {
		console.error('[Stripe] Webhook handler error:', err);
		return json({ error: 'Webhook handler failed' }, { status: 500 });
	}
};

async function handleCheckoutCompleted(
	db: D1Database,
	resendApiKey: string,
	session: Stripe.Checkout.Session
) {
	const userId = session.metadata?.user_id;

	if (!userId) {
		console.error('[Stripe] No user_id in checkout session metadata');
		return;
	}

	// Handle one-time credit pack purchase
	if (session.mode === 'payment') {
		const creditAmount = 50;
		await addCreditEntry(db, {
			user_id: userId,
			amount: creditAmount,
			reason: 'purchase',
			stripe_payment_id: session.payment_intent as string,
			note: 'Credit pack purchase'
		});
		console.log(`[Stripe] Granted ${creditAmount} credits to user ${userId} (credit pack)`);

		// Send confirmation email
		try {
			const user = await getUserById(db, userId);
			if (user) {
				const totalCredits = await getCreditBalance(db, userId);
				const resend = createResendClient(resendApiKey);
				await sendCreditPackPurchasedEmail(resend, user.email, {
					credits: creditAmount,
					totalCredits
				});
			}
		} catch (emailError) {
			console.error('[Stripe] Failed to send credit pack email:', emailError);
		}
	}

	// Subscription credits are handled via invoice.paid event
}

async function handleSubscriptionUpdate(db: D1Database, subscription: Stripe.Subscription) {
	const customerId = subscription.customer as string;
	const customerEmail = (subscription as unknown as { customer_email?: string }).customer_email;

	// Try to find user by metadata first, then by email
	let userId = subscription.metadata?.user_id;

	if (!userId && customerEmail) {
		const user = await getUserByEmail(db, customerEmail);
		if (user) {
			userId = user.id;
		}
	}

	if (!userId) {
		console.error('[Stripe] Could not find user for subscription update');
		return;
	}

	// Determine plan from price
	const priceId = subscription.items.data[0]?.price.id;
	let plan: 'basic' | 'pro' = 'basic';

	// You'd match priceId to your configured prices here
	// For now we'll check the amount
	const amount = subscription.items.data[0]?.price.unit_amount ?? 0;
	if (amount >= 2500) {
		plan = 'pro';
	}

	const status = mapSubscriptionStatus(subscription.status);

	// Get period from the first subscription item
	const subItem = subscription.items.data[0];
	const periodStart = subItem?.current_period_start ?? Math.floor(Date.now() / 1000);
	const periodEnd = subItem?.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

	await upsertSubscription(db, {
		user_id: userId,
		plan,
		status,
		stripe_customer_id: customerId,
		stripe_subscription_id: subscription.id,
		current_period_start: new Date(periodStart * 1000).toISOString(),
		current_period_end: new Date(periodEnd * 1000).toISOString()
	});

	console.log(`[Stripe] Updated subscription for user ${userId}: ${plan} (${status})`);
}

async function handleSubscriptionCanceled(db: D1Database, subscription: Stripe.Subscription) {
	const userId = subscription.metadata?.user_id;

	if (!userId) {
		console.error('[Stripe] No user_id in subscription metadata for cancellation');
		return;
	}

	// Get period from the first subscription item
	const subItem = subscription.items.data[0];
	const periodStart = subItem?.current_period_start ?? Math.floor(Date.now() / 1000);
	const periodEnd = subItem?.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

	await upsertSubscription(db, {
		user_id: userId,
		plan: 'basic',
		status: 'canceled',
		stripe_customer_id: subscription.customer as string,
		stripe_subscription_id: subscription.id,
		current_period_start: new Date(periodStart * 1000).toISOString(),
		current_period_end: new Date(periodEnd * 1000).toISOString()
	});

	console.log(`[Stripe] Subscription canceled for user ${userId}`);
}

async function handleInvoicePaid(db: D1Database, resendApiKey: string, invoice: Stripe.Invoice) {
	// Only grant credits for subscription invoices (not one-time payments)
	const subscriptionField = (invoice as unknown as { subscription?: string | null }).subscription;
	if (!subscriptionField) {
		return;
	}

	const subscriptionId = subscriptionField;
	const customerId = invoice.customer as string;

	// Determine credits and plan based on amount
	const amount = invoice.amount_paid;
	let credits = 50; // Default to basic
	let planName = 'Basic';

	if (amount >= 2500) {
		credits = 200; // Pro plan
		planName = 'Pro';
	}

	// Find user - check invoice metadata or subscription metadata
	let userId = (invoice as unknown as { subscription_details?: { metadata?: { user_id?: string } } })
		.subscription_details?.metadata?.user_id;

	let userEmail: string | null = null;

	if (!userId && invoice.customer_email) {
		const user = await getUserByEmail(db, invoice.customer_email);
		if (user) {
			userId = user.id;
			userEmail = user.email;
		}
	}

	if (!userId) {
		console.error('[Stripe] Could not find user for invoice payment');
		return;
	}

	// Get user email if we don't have it
	if (!userEmail) {
		const user = await getUserById(db, userId);
		userEmail = user?.email ?? null;
	}

	// Grant monthly credits
	const paymentIntentId = (invoice as unknown as { payment_intent?: string | null }).payment_intent;
	await addCreditEntry(db, {
		user_id: userId,
		amount: credits,
		reason: 'subscription',
		stripe_payment_id: paymentIntentId ?? undefined,
		note: `Monthly subscription credits (${credits})`
	});

	console.log(`[Stripe] Granted ${credits} credits to user ${userId} (subscription renewal)`);

	// Send subscription confirmation email
	if (userEmail) {
		try {
			const resend = createResendClient(resendApiKey);
			await sendSubscriptionConfirmedEmail(resend, userEmail, {
				planName,
				credits
			});
		} catch (emailError) {
			console.error('[Stripe] Failed to send subscription email:', emailError);
		}
	}
}

function mapSubscriptionStatus(
	stripeStatus: Stripe.Subscription.Status
): 'active' | 'canceled' | 'past_due' | 'trialing' {
	switch (stripeStatus) {
		case 'active':
			return 'active';
		case 'trialing':
			return 'trialing';
		case 'past_due':
		case 'unpaid':
			return 'past_due';
		case 'canceled':
		case 'incomplete':
		case 'incomplete_expired':
		case 'paused':
		default:
			return 'canceled';
	}
}

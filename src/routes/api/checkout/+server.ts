// Scout - Checkout API
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createStripeClient, createCheckoutSession, getOrCreateCustomer } from '$lib/server/stripe';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) {
		return json({ error: { message: 'Unauthorized' } }, { status: 401 });
	}

	if (!platform) {
		return json({ error: { message: 'Platform not available' } }, { status: 500 });
	}

	const { STRIPE_SECRET_KEY, SITE_URL } = platform.env;

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: { message: 'Invalid JSON' } }, { status: 400 });
	}

	const { priceId, mode } = body as { priceId?: string; mode?: 'subscription' | 'payment' };

	if (!priceId) {
		return json({ error: { message: 'Price ID required' } }, { status: 400 });
	}

	if (!mode || !['subscription', 'payment'].includes(mode)) {
		return json({ error: { message: 'Invalid mode' } }, { status: 400 });
	}

	try {
		const stripe = createStripeClient(STRIPE_SECRET_KEY);

		// Get or create Stripe customer
		const customer = await getOrCreateCustomer(stripe, locals.user.email, {
			user_id: locals.user.id
		});

		// Create checkout session
		const session = await createCheckoutSession(stripe, {
			customerId: customer.id,
			customerEmail: locals.user.email,
			priceId,
			mode,
			successUrl: `${SITE_URL}/dashboard?checkout=success`,
			cancelUrl: `${SITE_URL}/pricing?checkout=cancelled`,
			metadata: {
				user_id: locals.user.id
			}
		});

		return json({
			success: true,
			data: { url: session.url }
		});
	} catch (err) {
		console.error('Checkout error:', err);
		return json(
			{ error: { message: err instanceof Error ? err.message : 'Checkout failed' } },
			{ status: 500 }
		);
	}
};

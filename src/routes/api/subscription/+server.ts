// Scout - Subscription Management API
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createStripeClient, createCustomerPortalSession } from '$lib/server/stripe';
import { getSubscriptionByUserId } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user) {
		return json({ error: { message: 'Unauthorized' } }, { status: 401 });
	}

	if (!platform) {
		return json({ error: { message: 'Platform not available' } }, { status: 500 });
	}

	const { DB } = platform.env;
	const subscription = await getSubscriptionByUserId(DB, locals.user.id);

	return json({
		success: true,
		data: subscription
			? {
					plan: subscription.plan,
					status: subscription.status,
					current_period_end: subscription.current_period_end
				}
			: null
	});
};

// Create portal session for managing subscription
export const POST: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user) {
		return json({ error: { message: 'Unauthorized' } }, { status: 401 });
	}

	if (!platform) {
		return json({ error: { message: 'Platform not available' } }, { status: 500 });
	}

	const { DB, STRIPE_SECRET_KEY, SITE_URL } = platform.env;

	const subscription = await getSubscriptionByUserId(DB, locals.user.id);

	if (!subscription) {
		return json({ error: { message: 'No active subscription' } }, { status: 400 });
	}

	try {
		const stripe = createStripeClient(STRIPE_SECRET_KEY);
		const session = await createCustomerPortalSession(
			stripe,
			subscription.stripe_customer_id,
			`${SITE_URL}/settings`
		);

		return json({
			success: true,
			data: { url: session.url }
		});
	} catch (err) {
		console.error('Portal session error:', err);
		return json(
			{ error: { message: err instanceof Error ? err.message : 'Failed to create portal session' } },
			{ status: 500 }
		);
	}
};

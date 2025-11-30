// Scout - Settings Page Data
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getSubscriptionByUserId, getCreditBalance } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user || !platform) {
		throw error(401, 'Unauthorized');
	}

	const { DB } = platform.env;

	const [subscription, credits] = await Promise.all([
		getSubscriptionByUserId(DB, locals.user.id),
		getCreditBalance(DB, locals.user.id)
	]);

	return {
		email: locals.user.email,
		subscription: subscription
			? {
					plan: subscription.plan,
					status: subscription.status,
					current_period_end: subscription.current_period_end
				}
			: null,
		credits
	};
};

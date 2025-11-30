// Scout - Push Notifications API
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { savePushSubscription, deletePushSubscription, getPushSubscriptions } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user) {
		return json({ error: { message: 'Unauthorized' } }, { status: 401 });
	}

	if (!platform) {
		return json({ error: { message: 'Platform not available' } }, { status: 500 });
	}

	const { DB } = platform.env;
	const subscriptions = await getPushSubscriptions(DB, locals.user.id);

	return json({
		success: true,
		data: {
			subscribed: subscriptions.length > 0,
			count: subscriptions.length
		}
	});
};

// Subscribe to push notifications
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) {
		return json({ error: { message: 'Unauthorized' } }, { status: 401 });
	}

	if (!platform) {
		return json({ error: { message: 'Platform not available' } }, { status: 500 });
	}

	const { DB } = platform.env;

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: { message: 'Invalid JSON' } }, { status: 400 });
	}

	const { endpoint, keys } = body as {
		endpoint?: string;
		keys?: { p256dh?: string; auth?: string };
	};

	if (!endpoint || !keys?.p256dh || !keys?.auth) {
		return json({ error: { message: 'Invalid subscription data' } }, { status: 400 });
	}

	await savePushSubscription(DB, locals.user.id, endpoint, keys.p256dh, keys.auth);

	return json({ success: true });
};

// Unsubscribe from push notifications
export const DELETE: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) {
		return json({ error: { message: 'Unauthorized' } }, { status: 401 });
	}

	if (!platform) {
		return json({ error: { message: 'Platform not available' } }, { status: 500 });
	}

	const { DB } = platform.env;

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: { message: 'Invalid JSON' } }, { status: 400 });
	}

	const { endpoint } = body as { endpoint?: string };

	if (!endpoint) {
		return json({ error: { message: 'endpoint is required' } }, { status: 400 });
	}

	await deletePushSubscription(DB, endpoint);

	return json({ success: true });
};

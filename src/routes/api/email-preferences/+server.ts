// Scout - Email Preferences API
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEmailPreferences, upsertEmailPreferences } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user) {
		return json({ error: { message: 'Unauthorized' } }, { status: 401 });
	}

	if (!platform) {
		return json({ error: { message: 'Platform not available' } }, { status: 500 });
	}

	const { DB } = platform.env;
	const prefs = await getEmailPreferences(DB, locals.user.id);

	// Return defaults if no preferences set
	const data = prefs ?? {
		marketing: true,
		search_completed: true,
		search_failed: true,
		weekly_digest: false,
		product_updates: true
	};

	return json({ success: true, data });
};

export const PUT: RequestHandler = async ({ request, locals, platform }) => {
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

	const { marketing, search_completed, search_failed, weekly_digest, product_updates } = body as {
		marketing?: boolean;
		search_completed?: boolean;
		search_failed?: boolean;
		weekly_digest?: boolean;
		product_updates?: boolean;
	};

	await upsertEmailPreferences(DB, locals.user.id, {
		marketing,
		search_completed,
		search_failed,
		weekly_digest,
		product_updates
	});

	return json({ success: true });
};

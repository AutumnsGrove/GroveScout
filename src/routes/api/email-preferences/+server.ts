// Scout - Email Preferences API
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { getEmailPreferences, upsertEmailPreferences } from '$lib/server/db';

// Validation schema for email preferences
const EmailPreferencesSchema = z.object({
	marketing: z.boolean().optional(),
	search_completed: z.boolean().optional(),
	search_failed: z.boolean().optional(),
	weekly_digest: z.boolean().optional(),
	product_updates: z.boolean().optional()
}).strict(); // Reject unknown fields

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

	// Validate input with Zod
	const parseResult = EmailPreferencesSchema.safeParse(body);
	if (!parseResult.success) {
		return json({ error: { message: 'Invalid preferences format' } }, { status: 400 });
	}

	const { marketing, search_completed, search_failed, weekly_digest, product_updates } = parseResult.data;

	await upsertEmailPreferences(DB, locals.user.id, {
		marketing,
		search_completed,
		search_failed,
		weekly_digest,
		product_updates
	});

	return json({ success: true });
};

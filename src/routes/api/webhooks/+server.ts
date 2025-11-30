// Scout - Webhooks Management API
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createWebhook, getWebhooks, deleteWebhook } from '$lib/server/db';

// Generate a webhook secret
function generateSecret(): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let secret = 'whsec_';
	for (let i = 0; i < 32; i++) {
		secret += chars[Math.floor(Math.random() * chars.length)];
	}
	return secret;
}

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user) {
		return json({ error: { message: 'Unauthorized' } }, { status: 401 });
	}

	if (!platform) {
		return json({ error: { message: 'Platform not available' } }, { status: 500 });
	}

	const { DB } = platform.env;
	const webhooks = await getWebhooks(DB, locals.user.id);

	// Hide secrets in response
	const safeWebhooks = webhooks.map((w) => ({
		...w,
		secret: w.secret.slice(0, 10) + '...'
	}));

	return json({ success: true, data: safeWebhooks });
};

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

	const { url, events } = body as { url?: string; events?: string[] };

	if (!url) {
		return json({ error: { message: 'url is required' } }, { status: 400 });
	}

	// Validate URL
	try {
		const parsed = new URL(url);
		if (!['http:', 'https:'].includes(parsed.protocol)) {
			throw new Error('Invalid protocol');
		}
	} catch {
		return json({ error: { message: 'Invalid URL' } }, { status: 400 });
	}

	// Limit to 3 webhooks per user
	const existingWebhooks = await getWebhooks(DB, locals.user.id);
	if (existingWebhooks.length >= 3) {
		return json({ error: { message: 'Maximum 3 webhooks allowed' } }, { status: 400 });
	}

	const secret = generateSecret();
	const webhook = await createWebhook(DB, locals.user.id, url, secret, events);

	// Return the full secret only once
	return json({
		success: true,
		data: webhook
	});
};

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

	const { webhook_id } = body as { webhook_id?: string };

	if (!webhook_id) {
		return json({ error: { message: 'webhook_id is required' } }, { status: 400 });
	}

	await deleteWebhook(DB, locals.user.id, webhook_id);
	return json({ success: true });
};

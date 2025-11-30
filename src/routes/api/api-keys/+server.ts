// Scout - API Keys Management
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createApiKey, getApiKeys, deleteApiKey } from '$lib/server/db';

// Generate a secure API key
function generateApiKey(): { key: string; prefix: string; hash: string } {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let key = 'sk_scout_';
	for (let i = 0; i < 32; i++) {
		key += chars[Math.floor(Math.random() * chars.length)];
	}
	const prefix = key.slice(0, 16);
	// Simple hash for storage (in production use bcrypt or similar)
	const hash = btoa(key);
	return { key, prefix, hash };
}

export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!locals.user) {
		return json({ error: { message: 'Unauthorized' } }, { status: 401 });
	}

	if (!platform) {
		return json({ error: { message: 'Platform not available' } }, { status: 500 });
	}

	const { DB } = platform.env;
	const keys = await getApiKeys(DB, locals.user.id);

	return json({ success: true, data: keys });
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

	const { name, scopes } = body as { name?: string; scopes?: string[] };

	if (!name) {
		return json({ error: { message: 'name is required' } }, { status: 400 });
	}

	// Limit to 5 API keys per user
	const existingKeys = await getApiKeys(DB, locals.user.id);
	if (existingKeys.length >= 5) {
		return json({ error: { message: 'Maximum 5 API keys allowed' } }, { status: 400 });
	}

	const { key, prefix, hash } = generateApiKey();
	const apiKey = await createApiKey(DB, locals.user.id, name, hash, prefix, scopes);

	// Return the full key only once - it won't be shown again
	return json({
		success: true,
		data: {
			...apiKey,
			key // Only returned on creation
		}
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

	const { key_id } = body as { key_id?: string };

	if (!key_id) {
		return json({ error: { message: 'key_id is required' } }, { status: 400 });
	}

	await deleteApiKey(DB, locals.user.id, key_id);
	return json({ success: true });
};

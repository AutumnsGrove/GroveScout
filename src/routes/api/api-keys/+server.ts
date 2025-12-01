// Scout - API Keys Management
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { createApiKey, getApiKeys, deleteApiKey } from '$lib/server/db';
import { verifyApiKey } from '$lib/server/auth';

// Input validation schemas
const CreateApiKeySchema = z.object({
	name: z.string().min(1).max(100),
	scopes: z.array(z.string().max(50)).max(10).optional()
});

const DeleteApiKeySchema = z.object({
	key_id: z.string().uuid()
});

/**
 * Generate a cryptographically secure API key with SHA-256 hash
 */
async function generateApiKey(): Promise<{ key: string; prefix: string; hash: string }> {
	// Generate random bytes using crypto API
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);

	// Create key with prefix
	const randomPart = Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
	const key = `sk_scout_${randomPart}`;
	const prefix = key.slice(0, 16);

	// Hash using SHA-256 (irreversible, secure)
	const encoder = new TextEncoder();
	const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(key));
	const hashArray = new Uint8Array(hashBuffer);
	const hash = Array.from(hashArray)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');

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

	// Validate input with Zod
	const parseResult = CreateApiKeySchema.safeParse(body);
	if (!parseResult.success) {
		return json({ error: { message: 'Invalid input', details: parseResult.error.flatten() } }, { status: 400 });
	}

	const { name, scopes } = parseResult.data;

	// Limit to 5 API keys per user
	const existingKeys = await getApiKeys(DB, locals.user.id);
	if (existingKeys.length >= 5) {
		return json({ error: { message: 'Maximum 5 API keys allowed' } }, { status: 400 });
	}

	// Generate secure API key with SHA-256 hash
	const { key, prefix, hash } = await generateApiKey();
	const apiKey = await createApiKey(DB, locals.user.id, name, hash, prefix, scopes);

	// Return the full key only once - it won't be shown again
	// IMPORTANT: This is the only time the full key will be available
	return json({
		success: true,
		data: {
			...apiKey,
			key, // Only returned on creation
			warning: 'Store this key securely. It will not be shown again.'
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

	// Validate input with Zod
	const parseResult = DeleteApiKeySchema.safeParse(body);
	if (!parseResult.success) {
		return json({ error: { message: 'Invalid key_id format' } }, { status: 400 });
	}

	const { key_id } = parseResult.data;

	await deleteApiKey(DB, locals.user.id, key_id);
	return json({ success: true });
};

// Scout - Webhooks Management API
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { createWebhook, getWebhooks, deleteWebhook } from '$lib/server/db';

// Validation schemas
const CreateWebhookSchema = z.object({
	url: z.string().url().max(2048),
	events: z.array(z.enum(['search.completed', 'search.failed', 'credits.low'])).max(10).optional()
});

const DeleteWebhookSchema = z.object({
	webhook_id: z.string().uuid()
});

/**
 * Check if a hostname resolves to a private/internal IP address
 * Prevents SSRF attacks by blocking webhooks to internal networks
 */
function isPrivateOrReservedHostname(hostname: string): boolean {
	// Block localhost and common local hostnames
	const blockedHostnames = [
		'localhost',
		'127.0.0.1',
		'::1',
		'0.0.0.0',
		'[::1]',
		'[::ffff:127.0.0.1]'
	];

	const lowerHostname = hostname.toLowerCase();

	if (blockedHostnames.includes(lowerHostname)) {
		return true;
	}

	// Block .local domains
	if (lowerHostname.endsWith('.local') || lowerHostname.endsWith('.localhost')) {
		return true;
	}

	// Block internal/reserved TLDs
	if (lowerHostname.endsWith('.internal') || lowerHostname.endsWith('.corp') || lowerHostname.endsWith('.home')) {
		return true;
	}

	// Check for private IPv4 ranges in hostname
	const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
	const ipv4Match = hostname.match(ipv4Pattern);
	if (ipv4Match) {
		const [, a, b, c] = ipv4Match.map(Number);
		// 10.0.0.0/8
		if (a === 10) return true;
		// 172.16.0.0/12
		if (a === 172 && b >= 16 && b <= 31) return true;
		// 192.168.0.0/16
		if (a === 192 && b === 168) return true;
		// 127.0.0.0/8 (loopback)
		if (a === 127) return true;
		// 169.254.0.0/16 (link-local)
		if (a === 169 && b === 254) return true;
		// 0.0.0.0/8
		if (a === 0) return true;
		// 100.64.0.0/10 (carrier-grade NAT)
		if (a === 100 && b >= 64 && b <= 127) return true;
		// 192.0.0.0/24 (IETF protocol assignments)
		if (a === 192 && b === 0 && c === 0) return true;
		// 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (documentation)
		if ((a === 192 && b === 0 && c === 2) ||
			(a === 198 && b === 51 && c === 100) ||
			(a === 203 && b === 0 && c === 113)) return true;
		// 224.0.0.0/4 (multicast)
		if (a >= 224 && a <= 239) return true;
		// 240.0.0.0/4 (reserved)
		if (a >= 240) return true;
	}

	// Check for IPv6 private/reserved in hostname (basic check for bracketed addresses)
	if (hostname.startsWith('[')) {
		const ipv6 = hostname.slice(1, -1).toLowerCase();
		// Link-local
		if (ipv6.startsWith('fe80:')) return true;
		// Unique local
		if (ipv6.startsWith('fc') || ipv6.startsWith('fd')) return true;
		// Loopback
		if (ipv6 === '::1') return true;
	}

	return false;
}

/**
 * Validate webhook URL for security
 */
function validateWebhookUrl(urlString: string): { valid: boolean; error?: string } {
	try {
		const parsed = new URL(urlString);

		// Only allow HTTPS in production (HTTP allowed for local dev)
		if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
			return { valid: false, error: 'Only HTTP(S) URLs are allowed' };
		}

		// Block private/internal addresses (SSRF protection)
		if (isPrivateOrReservedHostname(parsed.hostname)) {
			return { valid: false, error: 'Private or internal URLs are not allowed' };
		}

		// Block URLs with credentials
		if (parsed.username || parsed.password) {
			return { valid: false, error: 'URLs with credentials are not allowed' };
		}

		// Block non-standard ports that might indicate internal services
		const port = parsed.port ? parseInt(parsed.port) : (parsed.protocol === 'https:' ? 443 : 80);
		const allowedPorts = [80, 443, 8080, 8443];
		if (!allowedPorts.includes(port)) {
			return { valid: false, error: 'Non-standard ports are not allowed' };
		}

		return { valid: true };
	} catch {
		return { valid: false, error: 'Invalid URL format' };
	}
}

// Generate a webhook secret
function generateSecret(): string {
	// Use crypto API for secure random generation
	const bytes = new Uint8Array(24);
	crypto.getRandomValues(bytes);
	const randomPart = Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
	return `whsec_${randomPart}`;
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

	// Validate input with Zod
	const parseResult = CreateWebhookSchema.safeParse(body);
	if (!parseResult.success) {
		return json({ error: { message: 'Invalid input' } }, { status: 400 });
	}

	const { url, events } = parseResult.data;

	// SECURITY: Validate URL to prevent SSRF attacks
	const urlValidation = validateWebhookUrl(url);
	if (!urlValidation.valid) {
		return json({ error: { message: urlValidation.error } }, { status: 400 });
	}

	// Limit to 3 webhooks per user
	const existingWebhooks = await getWebhooks(DB, locals.user.id);
	if (existingWebhooks.length >= 3) {
		return json({ error: { message: 'Maximum 3 webhooks allowed' } }, { status: 400 });
	}

	const secret = generateSecret();
	const webhook = await createWebhook(DB, locals.user.id, url, secret, events);

	// Return the full secret only once
	// IMPORTANT: This secret will not be shown again
	return json({
		success: true,
		data: {
			...webhook,
			warning: 'Store this secret securely. It will not be shown again.'
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
	const parseResult = DeleteWebhookSchema.safeParse(body);
	if (!parseResult.success) {
		return json({ error: { message: 'Invalid webhook_id format' } }, { status: 400 });
	}

	const { webhook_id } = parseResult.data;

	await deleteWebhook(DB, locals.user.id, webhook_id);
	return json({ success: true });
};

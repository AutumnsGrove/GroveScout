// Scout - Server Hooks
// Authentication middleware and request handling

import type { Handle } from '@sveltejs/kit';
import { getSession, getSessionIdFromCookie } from '$lib/server/auth';
import { getUserById } from '$lib/server/db';
import {
	checkRateLimit,
	getClientIdentifier,
	rateLimitedResponse,
	RATE_LIMITS,
	type RateLimitConfig
} from '$lib/server/ratelimit';

export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;

	// Skip rate limiting for static assets
	if (path.startsWith('/_app/') || path.startsWith('/favicon')) {
		return resolve(event);
	}

	// Get platform bindings
	const platform = event.platform;

	// Apply rate limiting for API routes
	if (platform && path.startsWith('/api/')) {
		const { KV } = platform.env;

		// Determine rate limit config based on path
		let config: RateLimitConfig = RATE_LIMITS.api;
		let prefix = 'api:';

		if (path.startsWith('/api/auth/')) {
			config = RATE_LIMITS.auth;
			prefix = 'auth:';
		} else if (path.startsWith('/api/search')) {
			config = path === '/api/search' && event.request.method === 'POST'
				? RATE_LIMITS.searchCreate
				: RATE_LIMITS.search;
			prefix = 'search:';
		} else if (path.startsWith('/api/webhooks/')) {
			config = RATE_LIMITS.webhook;
			prefix = 'webhook:';
		} else if (path.startsWith('/api/admin/')) {
			config = RATE_LIMITS.admin;
			prefix = 'admin:';
		}

		// Get client identifier (will use user ID after auth check if available)
		const identifier = getClientIdentifier(event.request, null, prefix);
		const result = await checkRateLimit(KV, identifier, config);

		if (!result.allowed) {
			return rateLimitedResponse(result, config);
		}
	}

	// Skip auth for public routes
	if (
		path.startsWith('/api/webhooks') ||
		path.startsWith('/s/') ||
		path === '/' ||
		path === '/pricing' ||
		path.startsWith('/auth/')
	) {
		return resolve(event);
	}

	if (!platform) {
		// Local development without wrangler
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { DB, KV } = platform.env;

	// Get session from cookie
	const cookieHeader = event.request.headers.get('cookie');
	const sessionId = getSessionIdFromCookie(cookieHeader);

	if (!sessionId) {
		event.locals.user = null;
		event.locals.session = null;
	} else {
		const session = await getSession(KV, sessionId);

		if (!session) {
			event.locals.user = null;
			event.locals.session = null;
		} else {
			const user = await getUserById(DB, session.user_id);
			event.locals.user = user;
			event.locals.session = session;
		}
	}

	// Check if protected route requires auth
	const protectedPaths = ['/dashboard', '/profile', '/search', '/settings', '/checkout'];
	const isProtectedRoute = protectedPaths.some((p) => path.startsWith(p));
	const isProtectedApi = path.startsWith('/api/') && !path.startsWith('/api/auth/') && !path.startsWith('/api/share/');

	if ((isProtectedRoute || isProtectedApi) && !event.locals.user) {
		// Redirect to login for page requests
		if (!path.startsWith('/api/')) {
			return new Response(null, {
				status: 302,
				headers: { Location: `/auth/login?redirect=${encodeURIComponent(path)}` }
			});
		}

		// Return 401 for API requests
		return new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	return resolve(event);
};

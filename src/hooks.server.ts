// Scout - Server Hooks
// Authentication middleware and request handling

import type { Handle } from '@sveltejs/kit';
import { getSession, getSessionIdFromCookie } from '$lib/server/auth';
import { getUserById } from '$lib/server/db';

export const handle: Handle = async ({ event, resolve }) => {
	// Skip auth for static assets and public routes
	const path = event.url.pathname;
	if (
		path.startsWith('/api/webhooks') ||
		path.startsWith('/s/') ||
		path === '/' ||
		path === '/pricing' ||
		path.startsWith('/auth/')
	) {
		return resolve(event);
	}

	// Get platform bindings
	const platform = event.platform;
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

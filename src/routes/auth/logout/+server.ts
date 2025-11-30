// Scout - Logout Handler
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteSession, getSessionIdFromCookie, createLogoutCookie } from '$lib/server/auth';

export const GET: RequestHandler = async ({ request, platform }) => {
	if (platform) {
		const { KV } = platform.env;
		const cookieHeader = request.headers.get('cookie');
		const sessionId = getSessionIdFromCookie(cookieHeader);

		if (sessionId) {
			await deleteSession(KV, sessionId);
		}
	}

	return new Response(null, {
		status: 302,
		headers: {
			Location: '/',
			'Set-Cookie': createLogoutCookie()
		}
	});
};

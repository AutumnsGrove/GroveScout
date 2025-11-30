// Scout - Apple OAuth Initiation
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createOAuthState, getAppleAuthUrl } from '$lib/server/auth';

export const GET: RequestHandler = async ({ url, platform }) => {
	if (!platform) {
		return new Response('Platform not available', { status: 500 });
	}

	const { KV, APPLE_CLIENT_ID, SITE_URL } = platform.env;

	if (!APPLE_CLIENT_ID) {
		return new Response('Apple Sign In not configured', { status: 501 });
	}

	const redirectTo = url.searchParams.get('redirect') || '/dashboard';

	// Create OAuth state for CSRF protection
	const state = await createOAuthState(KV, redirectTo);

	// Build Apple auth URL
	const redirectUri = `${SITE_URL}/api/auth/apple/callback`;
	const authUrl = getAppleAuthUrl(APPLE_CLIENT_ID, redirectUri, state);

	throw redirect(302, authUrl);
};

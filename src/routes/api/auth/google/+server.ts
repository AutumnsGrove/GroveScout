// Scout - Google OAuth Initiation
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createOAuthState, getGoogleAuthUrl } from '$lib/server/auth';

export const GET: RequestHandler = async ({ url, platform }) => {
	if (!platform) {
		return new Response('Platform not available', { status: 500 });
	}

	const { KV, GOOGLE_CLIENT_ID, SITE_URL } = platform.env;
	const redirectTo = url.searchParams.get('redirect') || '/dashboard';

	// Create CSRF state
	const state = await createOAuthState(KV, redirectTo);

	// Build Google OAuth URL
	const redirectUri = `${SITE_URL}/api/auth/callback`;
	const authUrl = getGoogleAuthUrl(GOOGLE_CLIENT_ID, redirectUri, state);

	throw redirect(302, authUrl);
};

// Scout - Google OAuth Initiation
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createOAuthState, getGoogleAuthUrl, generatePKCE } from '$lib/server/auth';

export const GET: RequestHandler = async ({ url, platform }) => {
	if (!platform) {
		return new Response('Platform not available', { status: 500 });
	}

	const { KV, GOOGLE_CLIENT_ID, SITE_URL } = platform.env;
	const redirectTo = url.searchParams.get('redirect') || '/dashboard';

	// Generate PKCE challenge
	const { verifier, challenge } = await generatePKCE();

	// Create CSRF state with PKCE verifier
	const state = await createOAuthState(KV, redirectTo, verifier);

	// Build Google OAuth URL with PKCE challenge
	const redirectUri = `${SITE_URL}/api/auth/callback`;
	const authUrl = getGoogleAuthUrl(GOOGLE_CLIENT_ID, redirectUri, state, challenge);

	throw redirect(302, authUrl);
};

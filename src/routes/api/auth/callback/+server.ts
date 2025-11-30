// Scout - OAuth Callback Handler
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getOAuthState,
	exchangeGoogleCode,
	getGoogleUserInfo,
	handleOAuthCallback,
	createSessionCookie
} from '$lib/server/auth';

export const GET: RequestHandler = async ({ url, platform }) => {
	if (!platform) {
		return new Response('Platform not available', { status: 500 });
	}

	const { DB, KV, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SITE_URL, ENVIRONMENT } = platform.env;

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const error = url.searchParams.get('error');

	// Handle OAuth errors
	if (error) {
		console.error('OAuth error:', error);
		throw redirect(302, `/auth/login?error=${encodeURIComponent(error)}`);
	}

	if (!code || !state) {
		throw redirect(302, '/auth/login?error=missing_params');
	}

	// Verify state (CSRF protection)
	const oauthState = await getOAuthState(KV, state);
	if (!oauthState) {
		throw redirect(302, '/auth/login?error=invalid_state');
	}

	try {
		// Exchange code for tokens
		const redirectUri = `${SITE_URL}/api/auth/callback`;
		const tokens = await exchangeGoogleCode(code, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, redirectUri);

		// Get user info
		const userInfo = await getGoogleUserInfo(tokens.access_token);

		if (!userInfo.email) {
			throw redirect(302, '/auth/login?error=no_email');
		}

		// Create or get user, create session
		const { session, isNewUser } = await handleOAuthCallback(
			DB,
			KV,
			'google',
			userInfo.id,
			userInfo.email,
			userInfo.name
		);

		// Set session cookie
		const isSecure = ENVIRONMENT === 'production';
		const cookie = createSessionCookie(session.id, isSecure);

		// Redirect to original destination or profile setup for new users
		const redirectTo = isNewUser ? '/profile' : oauthState.redirect_to;

		return new Response(null, {
			status: 302,
			headers: {
				Location: redirectTo,
				'Set-Cookie': cookie
			}
		});
	} catch (err) {
		console.error('OAuth callback error:', err);
		throw redirect(302, '/auth/login?error=auth_failed');
	}
};

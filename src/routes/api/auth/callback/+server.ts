// Scout - OAuth Callback Handler
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getOAuthStateWithPKCE,
	exchangeGoogleCode,
	getGoogleUserInfo,
	handleOAuthCallback,
	createSessionCookie,
	validateRedirectUrl
} from '$lib/server/auth';
import { createResendClient, sendWelcomeEmail } from '$lib/server/email';
import { trackEvent } from '$lib/server/db';

export const GET: RequestHandler = async ({ url, platform }) => {
	if (!platform) {
		return new Response('Platform not available', { status: 500 });
	}

	const { DB, KV, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SITE_URL, ENVIRONMENT, RESEND_API_KEY } =
		platform.env;

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const error = url.searchParams.get('error');

	// Handle OAuth errors - use generic message to prevent info leakage
	if (error) {
		console.error('OAuth error:', error);
		throw redirect(302, '/auth/login?error=auth_failed');
	}

	if (!code || !state) {
		throw redirect(302, '/auth/login?error=missing_params');
	}

	// Verify state (CSRF protection) and get PKCE verifier
	const oauthState = await getOAuthStateWithPKCE(KV, state);
	if (!oauthState) {
		throw redirect(302, '/auth/login?error=invalid_state');
	}

	try {
		// Exchange code for tokens (with PKCE verifier)
		const redirectUri = `${SITE_URL}/api/auth/callback`;
		const tokens = await exchangeGoogleCode(
			code,
			GOOGLE_CLIENT_ID,
			GOOGLE_CLIENT_SECRET,
			redirectUri,
			oauthState.code_verifier
		);

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

		// Track analytics
		await trackEvent(DB, isNewUser ? 'user_signup' : 'user_login', session.user_id, {
			provider: 'google'
		});

		// Send welcome email to new users
		if (isNewUser) {
			try {
				const resend = createResendClient(RESEND_API_KEY);
				await sendWelcomeEmail(resend, userInfo.email, {
					name: userInfo.name?.split(' ')[0] // First name only
				});
			} catch (emailError) {
				// Log without exposing error details
				console.error('Failed to send welcome email');
				// Don't fail the auth flow if email fails
			}
		}

		// Redirect to original destination or profile setup for new users
		// Double-validate redirect URL for defense in depth
		const redirectTo = isNewUser ? '/profile' : validateRedirectUrl(oauthState.redirect_to);

		return new Response(null, {
			status: 302,
			headers: {
				Location: redirectTo,
				'Set-Cookie': cookie
			}
		});
	} catch (err) {
		// Log error without exposing details to client
		console.error('OAuth callback error');
		throw redirect(302, '/auth/login?error=auth_failed');
	}
};

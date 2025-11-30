// Scout - Apple OAuth Callback Handler
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getOAuthState,
	exchangeAppleCode,
	createAppleClientSecret,
	getAppleUserInfo,
	handleOAuthCallback,
	createSessionCookie
} from '$lib/server/auth';
import { createResendClient, sendWelcomeEmail } from '$lib/server/email';
import { trackEvent } from '$lib/server/db';

// Apple uses form_post, so we need POST handler
export const POST: RequestHandler = async ({ request, platform }) => {
	if (!platform) {
		return new Response('Platform not available', { status: 500 });
	}

	const {
		DB,
		KV,
		APPLE_CLIENT_ID,
		APPLE_TEAM_ID,
		APPLE_KEY_ID,
		APPLE_PRIVATE_KEY,
		SITE_URL,
		ENVIRONMENT,
		RESEND_API_KEY
	} = platform.env;

	if (!APPLE_CLIENT_ID || !APPLE_TEAM_ID || !APPLE_KEY_ID || !APPLE_PRIVATE_KEY) {
		throw redirect(302, '/auth/login?error=apple_not_configured');
	}

	// Parse form data (Apple sends POST with form data)
	const formData = await request.formData();
	const code = formData.get('code') as string | null;
	const state = formData.get('state') as string | null;
	const error = formData.get('error') as string | null;
	const userDataStr = formData.get('user') as string | null;

	// Handle OAuth errors
	if (error) {
		console.error('Apple OAuth error:', error);
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
		// Create client secret (Apple requires dynamic JWT)
		const clientSecret = await createAppleClientSecret(
			APPLE_CLIENT_ID,
			APPLE_TEAM_ID,
			APPLE_KEY_ID,
			APPLE_PRIVATE_KEY
		);

		// Exchange code for tokens
		const redirectUri = `${SITE_URL}/api/auth/apple/callback`;
		const tokens = await exchangeAppleCode(code, APPLE_CLIENT_ID, clientSecret, redirectUri);

		// Parse user data if provided (only sent on first sign in)
		let userData: { name?: { firstName?: string; lastName?: string } } | undefined;
		if (userDataStr) {
			try {
				userData = JSON.parse(userDataStr);
			} catch {
				// Ignore parse errors
			}
		}

		// Get user info from ID token
		const userInfo = getAppleUserInfo(tokens.id_token, userData);

		if (!userInfo.email && !userInfo.id) {
			throw redirect(302, '/auth/login?error=no_email');
		}

		// Create or get user, create session
		const { session, isNewUser } = await handleOAuthCallback(
			DB,
			KV,
			'apple',
			userInfo.id,
			userInfo.email || `${userInfo.id}@privaterelay.appleid.com`,
			userInfo.name
		);

		// Set session cookie
		const isSecure = ENVIRONMENT === 'production';
		const cookie = createSessionCookie(session.id, isSecure);

		// Track analytics
		await trackEvent(DB, isNewUser ? 'user_signup' : 'user_login', session.user_id, {
			provider: 'apple'
		});

		// Send welcome email to new users
		if (isNewUser && userInfo.email) {
			try {
				const resend = createResendClient(RESEND_API_KEY);
				await sendWelcomeEmail(resend, userInfo.email, {
					name: userInfo.name?.split(' ')[0]
				});
			} catch (emailError) {
				console.error('Failed to send welcome email:', emailError);
			}
		}

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
		console.error('Apple OAuth callback error:', err);
		throw redirect(302, '/auth/login?error=auth_failed');
	}
};

// Also handle GET in case of redirect
export const GET: RequestHandler = async () => {
	throw redirect(302, '/auth/login?error=invalid_method');
};

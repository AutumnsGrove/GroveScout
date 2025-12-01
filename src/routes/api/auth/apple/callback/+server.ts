// Scout - Apple OAuth Callback Handler
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import {
	getOAuthState,
	exchangeAppleCode,
	createAppleClientSecret,
	getAppleUserInfoSecure,
	handleOAuthCallback,
	createSessionCookie,
	validateRedirectUrl
} from '$lib/server/auth';
import { createResendClient, sendWelcomeEmail } from '$lib/server/email';
import { trackEvent } from '$lib/server/db';

// Zod schema for Apple user data validation
const AppleUserDataSchema = z.object({
	name: z.object({
		firstName: z.string().max(100).optional(),
		lastName: z.string().max(100).optional()
	}).optional()
}).optional();

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
		throw redirect(302, '/auth/login?error=auth_failed');
	}

	// Parse form data (Apple sends POST with form data)
	const formData = await request.formData();
	const code = formData.get('code') as string | null;
	const state = formData.get('state') as string | null;
	const error = formData.get('error') as string | null;
	const userDataStr = formData.get('user') as string | null;

	// Handle OAuth errors - use generic error to prevent info leakage
	if (error) {
		console.error('Apple OAuth error:', error);
		throw redirect(302, '/auth/login?error=auth_failed');
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

		// Parse and validate user data if provided (only sent on first sign in)
		let userData: z.infer<typeof AppleUserDataSchema>;
		if (userDataStr) {
			try {
				const parsed = JSON.parse(userDataStr);
				userData = AppleUserDataSchema.parse(parsed);
			} catch {
				// Invalid user data format - continue without it
				userData = undefined;
			}
		}

		// Get user info from ID token WITH SECURE VERIFICATION
		const userInfo = await getAppleUserInfoSecure(tokens.id_token, APPLE_CLIENT_ID, userData);

		if (!userInfo.id) {
			throw redirect(302, '/auth/login?error=auth_failed');
		}

		// Create or get user, create session
		// For Apple private relay, use the stable user ID as identifier
		const { session, isNewUser } = await handleOAuthCallback(
			DB,
			KV,
			'apple',
			userInfo.id,
			userInfo.email || `apple_${userInfo.id.substring(0, 16)}@privaterelay.appleid.com`,
			userInfo.name
		);

		// Set session cookie
		const isSecure = ENVIRONMENT === 'production';
		const cookie = createSessionCookie(session.id, isSecure);

		// Track analytics
		await trackEvent(DB, isNewUser ? 'user_signup' : 'user_login', session.user_id, {
			provider: 'apple'
		});

		// Send welcome email to new users (only if they provided a real email)
		if (isNewUser && userInfo.email && !userInfo.email.includes('privaterelay')) {
			try {
				const resend = createResendClient(RESEND_API_KEY);
				await sendWelcomeEmail(resend, userInfo.email, {
					name: userInfo.name?.split(' ')[0]
				});
			} catch {
				// Log without exposing error details
				console.error('Failed to send welcome email');
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
		// Log error without exposing details
		console.error('Apple OAuth callback error');
		throw redirect(302, '/auth/login?error=auth_failed');
	}
};

// Also handle GET in case of redirect
export const GET: RequestHandler = async () => {
	throw redirect(302, '/auth/login?error=invalid_method');
};

// Scout - Auth Utilities
// Session management and OAuth helpers

import type { Session, User, OAuthState } from '$lib/types';
import { getUserById, createUser, getUserByProvider, createProfile } from './db';

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days in seconds
const SESSION_PREFIX = 'session:';
const OAUTH_STATE_PREFIX = 'oauth:';
const OAUTH_STATE_TTL = 60 * 10; // 10 minutes

// ============================================================================
// Session Management
// ============================================================================

export function generateSessionId(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export async function createSession(kv: KVNamespace, userId: string): Promise<Session> {
	const sessionId = generateSessionId();
	const expiresAt = new Date(Date.now() + SESSION_TTL * 1000).toISOString();

	const session: Session = {
		id: sessionId,
		user_id: userId,
		expires_at: expiresAt
	};

	await kv.put(SESSION_PREFIX + sessionId, JSON.stringify(session), {
		expirationTtl: SESSION_TTL
	});

	return session;
}

export async function getSession(kv: KVNamespace, sessionId: string): Promise<Session | null> {
	const data = await kv.get(SESSION_PREFIX + sessionId);
	if (!data) return null;

	const session: Session = JSON.parse(data);

	// Check if expired
	if (new Date(session.expires_at) < new Date()) {
		await deleteSession(kv, sessionId);
		return null;
	}

	return session;
}

export async function deleteSession(kv: KVNamespace, sessionId: string): Promise<void> {
	await kv.delete(SESSION_PREFIX + sessionId);
}

export async function refreshSession(kv: KVNamespace, sessionId: string): Promise<Session | null> {
	const session = await getSession(kv, sessionId);
	if (!session) return null;

	// Extend the session
	session.expires_at = new Date(Date.now() + SESSION_TTL * 1000).toISOString();

	await kv.put(SESSION_PREFIX + sessionId, JSON.stringify(session), {
		expirationTtl: SESSION_TTL
	});

	return session;
}

// ============================================================================
// OAuth State Management
// ============================================================================

export async function createOAuthState(
	kv: KVNamespace,
	redirectTo: string = '/dashboard'
): Promise<string> {
	const csrfToken = generateSessionId();
	const state: OAuthState = {
		redirect_to: redirectTo,
		csrf_token: csrfToken
	};

	await kv.put(OAUTH_STATE_PREFIX + csrfToken, JSON.stringify(state), {
		expirationTtl: OAUTH_STATE_TTL
	});

	return csrfToken;
}

export async function getOAuthState(kv: KVNamespace, csrfToken: string): Promise<OAuthState | null> {
	const data = await kv.get(OAUTH_STATE_PREFIX + csrfToken);
	if (!data) return null;

	// Delete after use (one-time use)
	await kv.delete(OAUTH_STATE_PREFIX + csrfToken);

	return JSON.parse(data);
}

// ============================================================================
// Google OAuth
// ============================================================================

interface GoogleTokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	scope: string;
	id_token: string;
}

interface GoogleUserInfo {
	id: string;
	email: string;
	verified_email: boolean;
	name: string;
	given_name: string;
	family_name?: string;
	picture?: string;
}

export function getGoogleAuthUrl(clientId: string, redirectUri: string, state: string): string {
	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'openid email profile',
		state,
		access_type: 'offline',
		prompt: 'consent'
	});

	return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(
	code: string,
	clientId: string,
	clientSecret: string,
	redirectUri: string
): Promise<GoogleTokenResponse> {
	const response = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			code,
			client_id: clientId,
			client_secret: clientSecret,
			redirect_uri: redirectUri,
			grant_type: 'authorization_code'
		})
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to exchange code: ${error}`);
	}

	return response.json();
}

export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
	const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
		headers: {
			Authorization: `Bearer ${accessToken}`
		}
	});

	if (!response.ok) {
		throw new Error('Failed to get user info from Google');
	}

	return response.json();
}

// ============================================================================
// User Login/Signup Flow
// ============================================================================

export async function handleOAuthCallback(
	db: D1Database,
	kv: KVNamespace,
	provider: 'google' | 'apple',
	providerId: string,
	email: string,
	displayName?: string
): Promise<{ user: User; session: Session; isNewUser: boolean }> {
	// Check if user exists
	let user = await getUserByProvider(db, provider, providerId);
	let isNewUser = false;

	if (!user) {
		// Create new user
		user = await createUser(db, {
			email,
			auth_provider: provider,
			auth_provider_id: providerId
		});

		// Create profile
		await createProfile(db, user.id, displayName);
		isNewUser = true;
	}

	// Create session
	const session = await createSession(kv, user.id);

	return { user, session, isNewUser };
}

// ============================================================================
// Cookie Helpers
// ============================================================================

export function createSessionCookie(sessionId: string, secure: boolean = true): string {
	const maxAge = SESSION_TTL;
	const sameSite = 'Lax';
	const path = '/';

	let cookie = `session=${sessionId}; Max-Age=${maxAge}; Path=${path}; SameSite=${sameSite}; HttpOnly`;
	if (secure) {
		cookie += '; Secure';
	}

	return cookie;
}

export function createLogoutCookie(): string {
	return 'session=; Max-Age=0; Path=/; SameSite=Lax; HttpOnly';
}

export function getSessionIdFromCookie(cookieHeader: string | null): string | null {
	if (!cookieHeader) return null;

	const cookies = cookieHeader.split(';');
	for (const cookie of cookies) {
		const [name, value] = cookie.trim().split('=');
		if (name === 'session') {
			return value;
		}
	}

	return null;
}

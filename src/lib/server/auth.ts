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
// Apple OAuth
// ============================================================================

interface AppleTokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token: string;
	id_token: string;
}

interface AppleIdTokenPayload {
	iss: string;
	aud: string;
	exp: number;
	iat: number;
	sub: string; // User's unique Apple ID
	email?: string;
	email_verified?: string;
	is_private_email?: string;
	auth_time: number;
	nonce_supported: boolean;
}

export function getAppleAuthUrl(clientId: string, redirectUri: string, state: string): string {
	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'name email',
		state,
		response_mode: 'form_post'
	});

	return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
}

export async function createAppleClientSecret(
	clientId: string,
	teamId: string,
	keyId: string,
	privateKey: string
): Promise<string> {
	// Apple requires a JWT signed with ES256 as the client secret
	const now = Math.floor(Date.now() / 1000);
	const exp = now + 60 * 60 * 24 * 180; // 180 days max

	const header = {
		alg: 'ES256',
		kid: keyId,
		typ: 'JWT'
	};

	const payload = {
		iss: teamId,
		iat: now,
		exp,
		aud: 'https://appleid.apple.com',
		sub: clientId
	};

	// Base64url encode
	const base64UrlEncode = (obj: object) => {
		const json = JSON.stringify(obj);
		const base64 = btoa(json);
		return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
	};

	const headerEncoded = base64UrlEncode(header);
	const payloadEncoded = base64UrlEncode(payload);
	const message = `${headerEncoded}.${payloadEncoded}`;

	// Import the private key and sign
	const pemContents = privateKey
		.replace('-----BEGIN PRIVATE KEY-----', '')
		.replace('-----END PRIVATE KEY-----', '')
		.replace(/\s/g, '');

	const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

	const cryptoKey = await crypto.subtle.importKey(
		'pkcs8',
		binaryKey,
		{ name: 'ECDSA', namedCurve: 'P-256' },
		false,
		['sign']
	);

	const signature = await crypto.subtle.sign(
		{ name: 'ECDSA', hash: 'SHA-256' },
		cryptoKey,
		new TextEncoder().encode(message)
	);

	// Convert signature to base64url
	const signatureArray = new Uint8Array(signature);
	const signatureBase64 = btoa(String.fromCharCode(...signatureArray))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');

	return `${message}.${signatureBase64}`;
}

export async function exchangeAppleCode(
	code: string,
	clientId: string,
	clientSecret: string,
	redirectUri: string
): Promise<AppleTokenResponse> {
	const response = await fetch('https://appleid.apple.com/auth/token', {
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
		throw new Error(`Failed to exchange Apple code: ${error}`);
	}

	return response.json();
}

export function decodeAppleIdToken(idToken: string): AppleIdTokenPayload {
	// Decode JWT without verification (verification should be done in production)
	const parts = idToken.split('.');
	if (parts.length !== 3) {
		throw new Error('Invalid JWT format');
	}

	const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
	const payloadJson = atob(payloadBase64);
	return JSON.parse(payloadJson);
}

export interface AppleUserInfo {
	id: string;
	email?: string;
	name?: string;
}

export function getAppleUserInfo(idToken: string, userData?: { name?: { firstName?: string; lastName?: string } }): AppleUserInfo {
	const payload = decodeAppleIdToken(idToken);

	let name: string | undefined;
	if (userData?.name) {
		const parts = [userData.name.firstName, userData.name.lastName].filter(Boolean);
		name = parts.join(' ') || undefined;
	}

	return {
		id: payload.sub,
		email: payload.email,
		name
	};
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

// Scout - Auth Utilities
// Session management and OAuth helpers

import type { Session, User, OAuthState } from '$lib/types';
import { getUserById, createUser, getUserByProvider, createProfile } from './db';

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days in seconds
const SESSION_PREFIX = 'session:';
const OAUTH_STATE_PREFIX = 'oauth:';
const OAUTH_STATE_TTL = 60 * 10; // 10 minutes

// Apple public keys cache
interface AppleJWK {
	kty: string;
	kid: string;
	use: string;
	alg: string;
	n: string;
	e: string;
}

interface AppleJWKSResponse {
	keys: AppleJWK[];
}

let appleKeysCache: { keys: AppleJWK[]; fetchedAt: number } | null = null;
const APPLE_KEYS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ============================================================================
// Security Utilities
// ============================================================================

/**
 * Verify an API key against stored hash
 */
export async function verifyApiKey(key: string, storedHash: string): Promise<boolean> {
	const encoder = new TextEncoder();
	const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(key));
	const hashArray = new Uint8Array(hashBuffer);
	const computedHash = Array.from(hashArray)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');

	// Constant-time comparison to prevent timing attacks
	if (computedHash.length !== storedHash.length) return false;

	let result = 0;
	for (let i = 0; i < computedHash.length; i++) {
		result |= computedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
	}
	return result === 0;
}

/**
 * Validate redirect URL to prevent open redirect attacks
 * Only allows relative paths starting with /
 */
export function validateRedirectUrl(redirectTo: string, allowedPaths: string[] = []): string {
	const defaultRedirect = '/dashboard';

	if (!redirectTo || typeof redirectTo !== 'string') {
		return defaultRedirect;
	}

	// Must start with single / and not //
	if (!redirectTo.startsWith('/') || redirectTo.startsWith('//')) {
		return defaultRedirect;
	}

	// Block any URL that contains protocol-like patterns
	if (redirectTo.includes(':') || redirectTo.includes('\\')) {
		return defaultRedirect;
	}

	// Parse and validate - reject if parsing reveals external URL
	try {
		const parsed = new URL(redirectTo, 'http://localhost');
		// Ensure it's still a relative path after parsing
		if (parsed.host !== 'localhost') {
			return defaultRedirect;
		}
	} catch {
		return defaultRedirect;
	}

	// If allowedPaths specified, check against whitelist
	if (allowedPaths.length > 0) {
		const isAllowed = allowedPaths.some(path =>
			redirectTo === path || redirectTo.startsWith(path + '/')
		);
		if (!isAllowed) {
			return defaultRedirect;
		}
	}

	return redirectTo;
}

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
// PKCE Support
// ============================================================================

/**
 * Generate PKCE code verifier and challenge for OAuth 2.0 + PKCE
 */
export async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
	// Generate random 32-byte verifier
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);

	// Base64url encode the verifier
	const verifier = btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');

	// Create SHA-256 hash of verifier for challenge
	const encoder = new TextEncoder();
	const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(verifier));
	const hashArray = new Uint8Array(hashBuffer);

	// Base64url encode the challenge
	const challenge = btoa(String.fromCharCode(...hashArray))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');

	return { verifier, challenge };
}

// ============================================================================
// OAuth State Management
// ============================================================================

export interface OAuthStateWithPKCE extends OAuthState {
	code_verifier?: string;
}

export async function createOAuthState(
	kv: KVNamespace,
	redirectTo: string = '/dashboard',
	codeVerifier?: string
): Promise<string> {
	const csrfToken = generateSessionId();

	// Validate redirect URL to prevent open redirect attacks
	const safeRedirect = validateRedirectUrl(redirectTo);

	const state: OAuthStateWithPKCE = {
		redirect_to: safeRedirect,
		csrf_token: csrfToken,
		code_verifier: codeVerifier
	};

	await kv.put(OAUTH_STATE_PREFIX + csrfToken, JSON.stringify(state), {
		expirationTtl: OAUTH_STATE_TTL
	});

	return csrfToken;
}

export async function getOAuthStateWithPKCE(kv: KVNamespace, csrfToken: string): Promise<OAuthStateWithPKCE | null> {
	const data = await kv.get(OAUTH_STATE_PREFIX + csrfToken);
	if (!data) return null;

	// Delete after use (one-time use)
	await kv.delete(OAUTH_STATE_PREFIX + csrfToken);

	return JSON.parse(data);
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

export function getGoogleAuthUrl(
	clientId: string,
	redirectUri: string,
	state: string,
	codeChallenge?: string
): string {
	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'openid email profile',
		state,
		access_type: 'offline',
		prompt: 'consent'
	});

	// Add PKCE parameters if provided
	if (codeChallenge) {
		params.set('code_challenge', codeChallenge);
		params.set('code_challenge_method', 'S256');
	}

	return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(
	code: string,
	clientId: string,
	clientSecret: string,
	redirectUri: string,
	codeVerifier?: string
): Promise<GoogleTokenResponse> {
	const body = new URLSearchParams({
		code,
		client_id: clientId,
		client_secret: clientSecret,
		redirect_uri: redirectUri,
		grant_type: 'authorization_code'
	});

	// Add PKCE verifier if provided
	if (codeVerifier) {
		body.set('code_verifier', codeVerifier);
	}

	const response = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body
	});

	if (!response.ok) {
		const errorText = await response.text();
		// Don't expose full error details to prevent information leakage
		console.error('Google token exchange failed:', errorText);
		throw new Error('Failed to exchange authorization code');
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

/**
 * Fetch Apple's public keys for JWT verification
 */
async function fetchApplePublicKeys(): Promise<AppleJWK[]> {
	// Check cache
	if (appleKeysCache && Date.now() - appleKeysCache.fetchedAt < APPLE_KEYS_CACHE_TTL) {
		return appleKeysCache.keys;
	}

	const response = await fetch('https://appleid.apple.com/auth/keys');
	if (!response.ok) {
		throw new Error('Failed to fetch Apple public keys');
	}

	const data: AppleJWKSResponse = await response.json();
	appleKeysCache = { keys: data.keys, fetchedAt: Date.now() };
	return data.keys;
}

/**
 * Convert JWK to CryptoKey for verification
 */
async function jwkToCryptoKey(jwk: AppleJWK): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		'jwk',
		{
			kty: jwk.kty,
			n: jwk.n,
			e: jwk.e,
			alg: jwk.alg,
			use: jwk.use
		},
		{ name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
		false,
		['verify']
	);
}

/**
 * Base64URL decode helper
 */
function base64UrlDecode(input: string): Uint8Array {
	// Replace URL-safe characters and add padding
	const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
	const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
	const binary = atob(padded);
	return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/**
 * Verify and decode Apple ID token with full signature verification
 */
export async function verifyAppleIdToken(
	idToken: string,
	expectedAudience: string
): Promise<AppleIdTokenPayload> {
	const parts = idToken.split('.');
	if (parts.length !== 3) {
		throw new Error('Invalid JWT format');
	}

	const [headerB64, payloadB64, signatureB64] = parts;

	// Decode header to get key ID
	const headerJson = new TextDecoder().decode(base64UrlDecode(headerB64));
	const header = JSON.parse(headerJson) as { alg: string; kid: string };

	if (header.alg !== 'RS256') {
		throw new Error('Unsupported JWT algorithm');
	}

	// Fetch Apple's public keys and find the matching one
	const keys = await fetchApplePublicKeys();
	const matchingKey = keys.find((k) => k.kid === header.kid);
	if (!matchingKey) {
		throw new Error('No matching Apple public key found');
	}

	// Verify signature
	const cryptoKey = await jwkToCryptoKey(matchingKey);
	const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
	const signature = base64UrlDecode(signatureB64);

	const isValid = await crypto.subtle.verify(
		{ name: 'RSASSA-PKCS1-v1_5' },
		cryptoKey,
		signature,
		signedData
	);

	if (!isValid) {
		throw new Error('Invalid JWT signature');
	}

	// Decode and validate payload
	const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
	const payload: AppleIdTokenPayload = JSON.parse(payloadJson);

	// Validate claims
	const now = Math.floor(Date.now() / 1000);

	if (payload.iss !== 'https://appleid.apple.com') {
		throw new Error('Invalid token issuer');
	}

	if (payload.aud !== expectedAudience) {
		throw new Error('Invalid token audience');
	}

	if (payload.exp < now) {
		throw new Error('Token has expired');
	}

	if (payload.iat > now + 300) {
		// 5 minute clock skew allowance
		throw new Error('Token issued in the future');
	}

	return payload;
}

/**
 * @deprecated Use verifyAppleIdToken instead for secure verification
 * This function only decodes without verification - use only for debugging
 */
export function decodeAppleIdToken(idToken: string): AppleIdTokenPayload {
	console.warn('decodeAppleIdToken is deprecated - use verifyAppleIdToken for secure verification');
	const parts = idToken.split('.');
	if (parts.length !== 3) {
		throw new Error('Invalid JWT format');
	}

	const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
	const padded = payloadBase64 + '='.repeat((4 - (payloadBase64.length % 4)) % 4);
	const payloadJson = atob(padded);
	return JSON.parse(payloadJson);
}

export interface AppleUserInfo {
	id: string;
	email?: string;
	name?: string;
}

/**
 * Get Apple user info from a verified ID token
 * Uses the new secure verification method
 */
export async function getAppleUserInfoSecure(
	idToken: string,
	clientId: string,
	userData?: { name?: { firstName?: string; lastName?: string } }
): Promise<AppleUserInfo> {
	const payload = await verifyAppleIdToken(idToken, clientId);

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

/**
 * @deprecated Use getAppleUserInfoSecure instead
 */
export function getAppleUserInfo(idToken: string, userData?: { name?: { firstName?: string; lastName?: string } }): AppleUserInfo {
	console.warn('getAppleUserInfo is deprecated - use getAppleUserInfoSecure for secure verification');
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
	const sameSite = 'Strict'; // Changed from Lax for better CSRF protection
	const path = '/';

	let cookie = `session=${sessionId}; Max-Age=${maxAge}; Path=${path}; SameSite=${sameSite}; HttpOnly`;
	if (secure) {
		cookie += '; Secure';
	}

	return cookie;
}

export function createLogoutCookie(): string {
	return 'session=; Max-Age=0; Path=/; SameSite=Strict; HttpOnly';
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

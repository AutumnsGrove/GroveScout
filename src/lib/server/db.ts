// Scout - Database Utilities
// Helpers for D1 database operations

import type {
	User,
	Profile,
	Search,
	SearchResult,
	CreditLedgerEntry,
	Subscription
} from '$lib/types';

export function generateId(): string {
	return crypto.randomUUID();
}

export function now(): string {
	return new Date().toISOString();
}

// ============================================================================
// User Operations
// ============================================================================

export async function createUser(
	db: D1Database,
	data: { email: string; auth_provider: string; auth_provider_id: string }
): Promise<User> {
	const id = generateId();
	const timestamp = now();

	await db
		.prepare(
			`INSERT INTO users (id, email, auth_provider, auth_provider_id, is_admin, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?)`
		)
		.bind(id, data.email, data.auth_provider, data.auth_provider_id, timestamp, timestamp)
		.run();

	return {
		id,
		email: data.email,
		auth_provider: data.auth_provider as 'google' | 'apple',
		auth_provider_id: data.auth_provider_id,
		is_admin: false,
		created_at: timestamp,
		updated_at: timestamp
	};
}

// Convert D1 integer to boolean for is_admin
function parseUser(row: Record<string, unknown>): User {
	return {
		...row,
		is_admin: Boolean(row.is_admin)
	} as User;
}

export async function getUserById(db: D1Database, id: string): Promise<User | null> {
	const result = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
	return result ? parseUser(result) : null;
}

export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
	const result = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
	return result ? parseUser(result) : null;
}

export async function getUserByProvider(
	db: D1Database,
	provider: string,
	providerId: string
): Promise<User | null> {
	const result = await db
		.prepare('SELECT * FROM users WHERE auth_provider = ? AND auth_provider_id = ?')
		.bind(provider, providerId)
		.first();
	return result ? parseUser(result) : null;
}

// ============================================================================
// Profile Operations
// ============================================================================

export async function getProfileByUserId(db: D1Database, userId: string): Promise<Profile | null> {
	const result = await db
		.prepare('SELECT * FROM profiles WHERE user_id = ?')
		.bind(userId)
		.first<Profile>();
	return result ?? null;
}

export async function createProfile(
	db: D1Database,
	userId: string,
	displayName?: string
): Promise<Profile> {
	const id = generateId();
	const timestamp = now();

	await db
		.prepare(
			`INSERT INTO profiles (id, user_id, display_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
		)
		.bind(id, userId, displayName ?? null, timestamp, timestamp)
		.run();

	return {
		id,
		user_id: userId,
		display_name: displayName ?? null,
		sizes: null,
		color_preferences: null,
		budget_min: null,
		budget_max: null,
		favorite_retailers: null,
		excluded_retailers: null,
		style_notes: null,
		created_at: timestamp,
		updated_at: timestamp
	};
}

export async function updateProfile(
	db: D1Database,
	userId: string,
	data: Partial<Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<void> {
	const updates: string[] = [];
	const values: unknown[] = [];

	if (data.display_name !== undefined) {
		updates.push('display_name = ?');
		values.push(data.display_name);
	}
	if (data.sizes !== undefined) {
		updates.push('sizes = ?');
		values.push(data.sizes);
	}
	if (data.color_preferences !== undefined) {
		updates.push('color_preferences = ?');
		values.push(data.color_preferences);
	}
	if (data.budget_min !== undefined) {
		updates.push('budget_min = ?');
		values.push(data.budget_min);
	}
	if (data.budget_max !== undefined) {
		updates.push('budget_max = ?');
		values.push(data.budget_max);
	}
	if (data.favorite_retailers !== undefined) {
		updates.push('favorite_retailers = ?');
		values.push(data.favorite_retailers);
	}
	if (data.excluded_retailers !== undefined) {
		updates.push('excluded_retailers = ?');
		values.push(data.excluded_retailers);
	}
	if (data.style_notes !== undefined) {
		updates.push('style_notes = ?');
		values.push(data.style_notes);
	}

	if (updates.length === 0) return;

	updates.push('updated_at = ?');
	values.push(now());
	values.push(userId);

	await db
		.prepare(`UPDATE profiles SET ${updates.join(', ')} WHERE user_id = ?`)
		.bind(...values)
		.run();
}

// ============================================================================
// Search Operations
// ============================================================================

export async function createSearch(
	db: D1Database,
	data: { user_id: string; query_freeform?: string; query_structured?: string }
): Promise<Search> {
	const id = generateId();
	const timestamp = now();

	await db
		.prepare(
			`INSERT INTO searches (id, user_id, query_freeform, query_structured, status, credits_used, created_at)
       VALUES (?, ?, ?, ?, 'pending', 0, ?)`
		)
		.bind(id, data.user_id, data.query_freeform ?? null, data.query_structured ?? null, timestamp)
		.run();

	return {
		id,
		user_id: data.user_id,
		query_freeform: data.query_freeform ?? null,
		query_structured: data.query_structured ?? null,
		status: 'pending',
		credits_used: 0,
		error_message: null,
		created_at: timestamp,
		started_at: null,
		completed_at: null
	};
}

export async function getSearchById(db: D1Database, id: string): Promise<Search | null> {
	const result = await db.prepare('SELECT * FROM searches WHERE id = ?').bind(id).first<Search>();
	return result ?? null;
}

export async function getSearchesByUserId(
	db: D1Database,
	userId: string,
	limit = 20
): Promise<Search[]> {
	const result = await db
		.prepare('SELECT * FROM searches WHERE user_id = ? ORDER BY created_at DESC LIMIT ?')
		.bind(userId, limit)
		.all<Search>();
	return result.results ?? [];
}

export async function updateSearchStatus(
	db: D1Database,
	id: string,
	status: Search['status'],
	extra?: {
		error_message?: string;
		credits_used?: number;
		tokens_input?: number;
		tokens_output?: number;
		api_calls_count?: number;
	}
): Promise<void> {
	const timestamp = now();
	let startedAt = null;
	let completedAt = null;

	if (status === 'running') {
		startedAt = timestamp;
	} else if (status === 'completed' || status === 'failed') {
		completedAt = timestamp;
	}

	await db
		.prepare(
			`UPDATE searches
       SET status = ?,
           started_at = COALESCE(?, started_at),
           completed_at = COALESCE(?, completed_at),
           error_message = COALESCE(?, error_message),
           credits_used = COALESCE(?, credits_used),
           tokens_input = COALESCE(?, tokens_input),
           tokens_output = COALESCE(?, tokens_output),
           api_calls_count = COALESCE(?, api_calls_count)
       WHERE id = ?`
		)
		.bind(
			status,
			startedAt,
			completedAt,
			extra?.error_message ?? null,
			extra?.credits_used ?? null,
			extra?.tokens_input ?? null,
			extra?.tokens_output ?? null,
			extra?.api_calls_count ?? null,
			id
		)
		.run();
}

// ============================================================================
// Search Results Operations
// ============================================================================

export async function createSearchResult(
	db: D1Database,
	data: {
		search_id: string;
		results_raw: string;
		results_curated: string;
		cache_key?: string;
	}
): Promise<SearchResult> {
	const id = generateId();
	const timestamp = now();
	const shareToken = generateShareToken();
	const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

	await db
		.prepare(
			`INSERT INTO search_results (id, search_id, results_raw, results_curated, share_token, cache_key, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			id,
			data.search_id,
			data.results_raw,
			data.results_curated,
			shareToken,
			data.cache_key ?? null,
			timestamp,
			expiresAt
		)
		.run();

	return {
		id,
		search_id: data.search_id,
		results_raw: data.results_raw,
		results_curated: data.results_curated,
		share_token: shareToken,
		cache_key: data.cache_key ?? null,
		created_at: timestamp,
		expires_at: expiresAt
	};
}

export async function getSearchResultBySearchId(
	db: D1Database,
	searchId: string,
	r2?: R2Bucket
): Promise<SearchResult | null> {
	const result = await db
		.prepare('SELECT * FROM search_results WHERE search_id = ?')
		.bind(searchId)
		.first<SearchResult & { r2_key?: string }>();

	if (!result) return null;

	// If results were migrated to R2, fetch from there
	if (result.r2_key && r2) {
		try {
			const { getResultsFromR2 } = await import('./r2');
			const r2Result = await getResultsFromR2(r2, result.r2_key);
			if (r2Result) {
				return {
					...result,
					results_raw: JSON.stringify(r2Result.resultsRaw),
					results_curated: JSON.stringify(r2Result.resultsCurated)
				};
			}
		} catch (err) {
			console.error('[DB] Failed to fetch from R2:', err);
			// Fall back to D1 data (might be missing results_raw)
		}
	}

	return result;
}

export async function getSearchResultByShareToken(
	db: D1Database,
	token: string,
	r2?: R2Bucket
): Promise<(SearchResult & { query_freeform: string | null }) | null> {
	const result = await db
		.prepare(
			`SELECT sr.*, s.query_freeform
       FROM search_results sr
       JOIN searches s ON sr.search_id = s.id
       WHERE sr.share_token = ?
       AND (sr.expires_at IS NULL OR sr.expires_at > datetime('now'))`
		)
		.bind(token)
		.first<SearchResult & { query_freeform: string | null; r2_key?: string }>();

	if (!result) return null;

	// If results were migrated to R2, fetch from there
	if (result.r2_key && r2) {
		try {
			const { getResultsFromR2 } = await import('./r2');
			const r2Result = await getResultsFromR2(r2, result.r2_key);
			if (r2Result) {
				return {
					...result,
					results_raw: JSON.stringify(r2Result.resultsRaw),
					results_curated: JSON.stringify(r2Result.resultsCurated)
				};
			}
		} catch (err) {
			console.error('[DB] Failed to fetch from R2:', err);
		}
	}

	return result;
}

function generateShareToken(): string {
	const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let token = '';
	for (let i = 0; i < 12; i++) {
		token += chars[Math.floor(Math.random() * chars.length)];
	}
	return token;
}

// ============================================================================
// Credit Operations
// ============================================================================

export async function getCreditBalance(db: D1Database, userId: string): Promise<number> {
	const result = await db
		.prepare('SELECT COALESCE(SUM(amount), 0) as balance FROM credit_ledger WHERE user_id = ?')
		.bind(userId)
		.first<{ balance: number }>();
	return result?.balance ?? 0;
}

export async function addCreditEntry(
	db: D1Database,
	data: {
		user_id: string;
		amount: number;
		reason: CreditLedgerEntry['reason'];
		search_id?: string;
		subscription_id?: string;
		stripe_payment_id?: string;
		note?: string;
	}
): Promise<CreditLedgerEntry> {
	const id = generateId();
	const timestamp = now();

	await db
		.prepare(
			`INSERT INTO credit_ledger (id, user_id, amount, reason, search_id, subscription_id, stripe_payment_id, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(
			id,
			data.user_id,
			data.amount,
			data.reason,
			data.search_id ?? null,
			data.subscription_id ?? null,
			data.stripe_payment_id ?? null,
			data.note ?? null,
			timestamp
		)
		.run();

	return {
		id,
		user_id: data.user_id,
		amount: data.amount,
		reason: data.reason,
		search_id: data.search_id ?? null,
		subscription_id: data.subscription_id ?? null,
		stripe_payment_id: data.stripe_payment_id ?? null,
		note: data.note ?? null,
		created_at: timestamp
	};
}

// ============================================================================
// Subscription Operations
// ============================================================================

export async function getSubscriptionByUserId(
	db: D1Database,
	userId: string
): Promise<Subscription | null> {
	const result = await db
		.prepare(
			`SELECT * FROM subscriptions
       WHERE user_id = ?
       AND status IN ('active', 'trialing')
       AND current_period_end > datetime('now')`
		)
		.bind(userId)
		.first<Subscription>();
	return result ?? null;
}

export async function upsertSubscription(
	db: D1Database,
	data: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>
): Promise<void> {
	const id = generateId();
	const timestamp = now();

	await db
		.prepare(
			`INSERT INTO subscriptions (id, user_id, plan, status, stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         plan = excluded.plan,
         status = excluded.status,
         stripe_customer_id = excluded.stripe_customer_id,
         stripe_subscription_id = excluded.stripe_subscription_id,
         current_period_start = excluded.current_period_start,
         current_period_end = excluded.current_period_end,
         updated_at = excluded.updated_at`
		)
		.bind(
			id,
			data.user_id,
			data.plan,
			data.status,
			data.stripe_customer_id,
			data.stripe_subscription_id,
			data.current_period_start,
			data.current_period_end,
			timestamp,
			timestamp
		)
		.run();
}

// ============================================================================
// Admin Operations
// ============================================================================

export interface AdminStats {
	totalUsers: number;
	totalSearches: number;
	totalCreditsUsed: number;
	activeSubscriptions: number;
	recentSearches: number; // Last 24h
	recentUsers: number; // Last 24h
}

export async function getAdminStats(db: D1Database): Promise<AdminStats> {
	const [users, searches, credits, subs, recentSearches, recentUsers] = await Promise.all([
		db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>(),
		db.prepare('SELECT COUNT(*) as count FROM searches').first<{ count: number }>(),
		db
			.prepare("SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM credit_ledger WHERE reason = 'search'")
			.first<{ total: number }>(),
		db
			.prepare("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'")
			.first<{ count: number }>(),
		db
			.prepare("SELECT COUNT(*) as count FROM searches WHERE created_at > datetime('now', '-1 day')")
			.first<{ count: number }>(),
		db
			.prepare("SELECT COUNT(*) as count FROM users WHERE created_at > datetime('now', '-1 day')")
			.first<{ count: number }>()
	]);

	return {
		totalUsers: users?.count ?? 0,
		totalSearches: searches?.count ?? 0,
		totalCreditsUsed: credits?.total ?? 0,
		activeSubscriptions: subs?.count ?? 0,
		recentSearches: recentSearches?.count ?? 0,
		recentUsers: recentUsers?.count ?? 0
	};
}

export async function getAllUsers(
	db: D1Database,
	limit = 50,
	offset = 0
): Promise<{ users: User[]; total: number }> {
	const [usersResult, countResult] = await Promise.all([
		db
			.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?')
			.bind(limit, offset)
			.all(),
		db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>()
	]);

	const users = (usersResult.results ?? []).map(parseUser);

	return {
		users,
		total: countResult?.count ?? 0
	};
}

export async function getAllSearches(
	db: D1Database,
	limit = 50,
	offset = 0
): Promise<{ searches: (Search & { user_email: string })[]; total: number }> {
	const [searchesResult, countResult] = await Promise.all([
		db
			.prepare(
				`SELECT s.*, u.email as user_email
				 FROM searches s
				 JOIN users u ON s.user_id = u.id
				 ORDER BY s.created_at DESC LIMIT ? OFFSET ?`
			)
			.bind(limit, offset)
			.all<Search & { user_email: string }>(),
		db.prepare('SELECT COUNT(*) as count FROM searches').first<{ count: number }>()
	]);

	return {
		searches: searchesResult.results ?? [],
		total: countResult?.count ?? 0
	};
}

export async function setUserAdmin(db: D1Database, userId: string, isAdmin: boolean): Promise<void> {
	await db
		.prepare('UPDATE users SET is_admin = ?, updated_at = ? WHERE id = ?')
		.bind(isAdmin ? 1 : 0, now(), userId)
		.run();
}

// ============================================================================
// Analytics Operations
// ============================================================================

export type AnalyticsEventType =
	| 'user_signup'
	| 'user_login'
	| 'search_created'
	| 'search_completed'
	| 'search_failed'
	| 'credits_purchased'
	| 'subscription_created'
	| 'subscription_cancelled'
	| 'profile_updated';

export interface AnalyticsEvent {
	id: string;
	event_type: AnalyticsEventType;
	user_id: string | null;
	metadata: string | null;
	created_at: string;
}

export async function trackEvent(
	db: D1Database,
	eventType: AnalyticsEventType,
	userId?: string | null,
	metadata?: Record<string, unknown>
): Promise<void> {
	const id = generateId();
	const timestamp = now();

	try {
		await db
			.prepare(
				`INSERT INTO analytics_events (id, event_type, user_id, metadata, created_at)
				 VALUES (?, ?, ?, ?, ?)`
			)
			.bind(id, eventType, userId ?? null, metadata ? JSON.stringify(metadata) : null, timestamp)
			.run();

		// Also update daily stats
		await updateDailyStats(db, eventType);
	} catch (error) {
		// Don't fail the main operation if analytics fails
		console.error('[Analytics] Failed to track event:', error);
	}
}

async function updateDailyStats(db: D1Database, eventType: AnalyticsEventType): Promise<void> {
	const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

	// Map event types to stat columns
	const statColumn = getStatColumn(eventType);
	if (!statColumn) return;

	// Upsert daily stats
	await db
		.prepare(
			`INSERT INTO daily_stats (date, ${statColumn})
			 VALUES (?, 1)
			 ON CONFLICT(date) DO UPDATE SET ${statColumn} = ${statColumn} + 1`
		)
		.bind(today)
		.run();
}

function getStatColumn(eventType: AnalyticsEventType): string | null {
	switch (eventType) {
		case 'user_signup':
			return 'signups';
		case 'search_created':
		case 'search_completed':
			return 'searches';
		case 'user_login':
			return 'logins';
		default:
			return null;
	}
}

export interface DailyStats {
	date: string;
	signups: number;
	searches: number;
	logins: number;
	revenue_cents: number;
}

export async function getDailyStats(db: D1Database, days = 30): Promise<DailyStats[]> {
	const result = await db
		.prepare(
			`SELECT date,
					COALESCE(signups, 0) as signups,
					COALESCE(searches, 0) as searches,
					COALESCE(logins, 0) as logins,
					COALESCE(revenue_cents, 0) as revenue_cents
			 FROM daily_stats
			 WHERE date >= date('now', '-' || ? || ' days')
			 ORDER BY date DESC`
		)
		.bind(days)
		.all<DailyStats>();

	return result.results ?? [];
}

export async function getEventsByType(
	db: D1Database,
	eventType: AnalyticsEventType,
	limit = 100
): Promise<AnalyticsEvent[]> {
	const result = await db
		.prepare(
			`SELECT * FROM analytics_events
			 WHERE event_type = ?
			 ORDER BY created_at DESC
			 LIMIT ?`
		)
		.bind(eventType, limit)
		.all<AnalyticsEvent>();

	return result.results ?? [];
}

export async function getRecentEvents(db: D1Database, limit = 100): Promise<AnalyticsEvent[]> {
	const result = await db
		.prepare(
			`SELECT * FROM analytics_events
			 ORDER BY created_at DESC
			 LIMIT ?`
		)
		.bind(limit)
		.all<AnalyticsEvent>();

	return result.results ?? [];
}

export async function updateDailyRevenue(db: D1Database, amountCents: number): Promise<void> {
	const today = new Date().toISOString().split('T')[0];

	await db
		.prepare(
			`INSERT INTO daily_stats (date, revenue_cents)
			 VALUES (?, ?)
			 ON CONFLICT(date) DO UPDATE SET revenue_cents = revenue_cents + ?`
		)
		.bind(today, amountCents, amountCents)
		.run();
}

// ============================================================================
// Favorites Operations
// ============================================================================

export interface Favorite {
	id: string;
	user_id: string;
	search_id: string;
	note: string | null;
	created_at: string;
}

export async function addFavorite(
	db: D1Database,
	userId: string,
	searchId: string,
	note?: string
): Promise<Favorite> {
	const id = generateId();
	const timestamp = now();

	await db
		.prepare('INSERT INTO favorites (id, user_id, search_id, note, created_at) VALUES (?, ?, ?, ?, ?)')
		.bind(id, userId, searchId, note ?? null, timestamp)
		.run();

	return { id, user_id: userId, search_id: searchId, note: note ?? null, created_at: timestamp };
}

export async function removeFavorite(db: D1Database, userId: string, searchId: string): Promise<void> {
	await db.prepare('DELETE FROM favorites WHERE user_id = ? AND search_id = ?').bind(userId, searchId).run();
}

export async function getFavorites(db: D1Database, userId: string): Promise<(Favorite & { query_freeform: string | null })[]> {
	const result = await db
		.prepare(
			`SELECT f.*, s.query_freeform
			 FROM favorites f
			 JOIN searches s ON f.search_id = s.id
			 WHERE f.user_id = ?
			 ORDER BY f.created_at DESC`
		)
		.bind(userId)
		.all<Favorite & { query_freeform: string | null }>();

	return result.results ?? [];
}

export async function isFavorite(db: D1Database, userId: string, searchId: string): Promise<boolean> {
	const result = await db
		.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND search_id = ?')
		.bind(userId, searchId)
		.first();
	return !!result;
}

// ============================================================================
// Email Preferences Operations
// ============================================================================

export interface EmailPreferences {
	id: string;
	user_id: string;
	marketing: boolean;
	search_completed: boolean;
	search_failed: boolean;
	weekly_digest: boolean;
	product_updates: boolean;
	created_at: string;
	updated_at: string;
}

export async function getEmailPreferences(db: D1Database, userId: string): Promise<EmailPreferences | null> {
	const result = await db.prepare('SELECT * FROM email_preferences WHERE user_id = ?').bind(userId).first();
	if (!result) return null;
	return {
		...result,
		marketing: Boolean(result.marketing),
		search_completed: Boolean(result.search_completed),
		search_failed: Boolean(result.search_failed),
		weekly_digest: Boolean(result.weekly_digest),
		product_updates: Boolean(result.product_updates)
	} as EmailPreferences;
}

export async function upsertEmailPreferences(
	db: D1Database,
	userId: string,
	prefs: Partial<Omit<EmailPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<void> {
	const timestamp = now();
	const id = generateId();

	await db
		.prepare(
			`INSERT INTO email_preferences (id, user_id, marketing, search_completed, search_failed, weekly_digest, product_updates, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT(user_id) DO UPDATE SET
			   marketing = COALESCE(?, marketing),
			   search_completed = COALESCE(?, search_completed),
			   search_failed = COALESCE(?, search_failed),
			   weekly_digest = COALESCE(?, weekly_digest),
			   product_updates = COALESCE(?, product_updates),
			   updated_at = ?`
		)
		.bind(
			id,
			userId,
			prefs.marketing !== undefined ? (prefs.marketing ? 1 : 0) : 1,
			prefs.search_completed !== undefined ? (prefs.search_completed ? 1 : 0) : 1,
			prefs.search_failed !== undefined ? (prefs.search_failed ? 1 : 0) : 1,
			prefs.weekly_digest !== undefined ? (prefs.weekly_digest ? 1 : 0) : 0,
			prefs.product_updates !== undefined ? (prefs.product_updates ? 1 : 0) : 1,
			timestamp,
			timestamp,
			prefs.marketing !== undefined ? (prefs.marketing ? 1 : 0) : null,
			prefs.search_completed !== undefined ? (prefs.search_completed ? 1 : 0) : null,
			prefs.search_failed !== undefined ? (prefs.search_failed ? 1 : 0) : null,
			prefs.weekly_digest !== undefined ? (prefs.weekly_digest ? 1 : 0) : null,
			prefs.product_updates !== undefined ? (prefs.product_updates ? 1 : 0) : null,
			timestamp
		)
		.run();
}

// ============================================================================
// API Keys Operations
// ============================================================================

export interface ApiKey {
	id: string;
	user_id: string;
	name: string;
	key_prefix: string;
	scopes: string[];
	last_used_at: string | null;
	expires_at: string | null;
	created_at: string;
}

export async function createApiKey(
	db: D1Database,
	userId: string,
	name: string,
	keyHash: string,
	keyPrefix: string,
	scopes: string[] = ['search:read', 'search:create']
): Promise<ApiKey> {
	const id = generateId();
	const timestamp = now();

	await db
		.prepare(
			`INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, scopes, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`
		)
		.bind(id, userId, name, keyHash, keyPrefix, JSON.stringify(scopes), timestamp)
		.run();

	return {
		id,
		user_id: userId,
		name,
		key_prefix: keyPrefix,
		scopes,
		last_used_at: null,
		expires_at: null,
		created_at: timestamp
	};
}

export async function getApiKeys(db: D1Database, userId: string): Promise<ApiKey[]> {
	const result = await db
		.prepare('SELECT id, user_id, name, key_prefix, scopes, last_used_at, expires_at, created_at FROM api_keys WHERE user_id = ?')
		.bind(userId)
		.all();

	return (result.results ?? []).map((row) => ({
		...row,
		scopes: JSON.parse((row as Record<string, unknown>).scopes as string)
	})) as ApiKey[];
}

export async function getApiKeyByPrefix(db: D1Database, prefix: string): Promise<{ id: string; user_id: string; key_hash: string; scopes: string[] } | null> {
	const result = await db
		.prepare('SELECT id, user_id, key_hash, scopes FROM api_keys WHERE key_prefix = ?')
		.bind(prefix)
		.first<{ id: string; user_id: string; key_hash: string; scopes: string }>();

	if (!result) return null;
	return { ...result, scopes: JSON.parse(result.scopes) };
}

export async function deleteApiKey(db: D1Database, userId: string, keyId: string): Promise<void> {
	await db.prepare('DELETE FROM api_keys WHERE id = ? AND user_id = ?').bind(keyId, userId).run();
}

export async function updateApiKeyLastUsed(db: D1Database, keyId: string): Promise<void> {
	await db.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?').bind(now(), keyId).run();
}

// ============================================================================
// Webhook Operations
// ============================================================================

export interface Webhook {
	id: string;
	user_id: string;
	url: string;
	secret: string;
	events: string[];
	active: boolean;
	failure_count: number;
	last_triggered_at: string | null;
	created_at: string;
	updated_at: string;
}

export async function createWebhook(
	db: D1Database,
	userId: string,
	url: string,
	secret: string,
	events: string[] = ['search.completed']
): Promise<Webhook> {
	const id = generateId();
	const timestamp = now();

	await db
		.prepare(
			`INSERT INTO webhooks (id, user_id, url, secret, events, active, failure_count, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?)`
		)
		.bind(id, userId, url, secret, JSON.stringify(events), timestamp, timestamp)
		.run();

	return {
		id,
		user_id: userId,
		url,
		secret,
		events,
		active: true,
		failure_count: 0,
		last_triggered_at: null,
		created_at: timestamp,
		updated_at: timestamp
	};
}

export async function getWebhooks(db: D1Database, userId: string): Promise<Webhook[]> {
	const result = await db.prepare('SELECT * FROM webhooks WHERE user_id = ?').bind(userId).all();

	return (result.results ?? []).map((row) => ({
		...row,
		events: JSON.parse((row as Record<string, unknown>).events as string),
		active: Boolean((row as Record<string, unknown>).active)
	})) as Webhook[];
}

export async function getWebhooksForEvent(db: D1Database, userId: string, event: string): Promise<Webhook[]> {
	const webhooks = await getWebhooks(db, userId);
	return webhooks.filter((w) => w.active && w.events.includes(event));
}

export async function deleteWebhook(db: D1Database, userId: string, webhookId: string): Promise<void> {
	await db.prepare('DELETE FROM webhooks WHERE id = ? AND user_id = ?').bind(webhookId, userId).run();
}

export async function updateWebhookStatus(
	db: D1Database,
	webhookId: string,
	success: boolean
): Promise<void> {
	if (success) {
		await db
			.prepare('UPDATE webhooks SET last_triggered_at = ?, failure_count = 0 WHERE id = ?')
			.bind(now(), webhookId)
			.run();
	} else {
		await db
			.prepare('UPDATE webhooks SET failure_count = failure_count + 1, active = CASE WHEN failure_count >= 4 THEN 0 ELSE active END WHERE id = ?')
			.bind(webhookId)
			.run();
	}
}

// ============================================================================
// Referral Operations
// ============================================================================

export interface ReferralCode {
	id: string;
	user_id: string;
	code: string;
	uses_count: number;
	created_at: string;
}

export interface Referral {
	id: string;
	referrer_id: string;
	referred_id: string;
	code_used: string;
	credits_awarded: number;
	created_at: string;
}

export async function createReferralCode(db: D1Database, userId: string): Promise<ReferralCode> {
	const id = generateId();
	const timestamp = now();
	const code = generateReferralCode();

	await db
		.prepare('INSERT INTO referral_codes (id, user_id, code, uses_count, created_at) VALUES (?, ?, ?, 0, ?)')
		.bind(id, userId, code, timestamp)
		.run();

	return { id, user_id: userId, code, uses_count: 0, created_at: timestamp };
}

function generateReferralCode(): string {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	let code = '';
	for (let i = 0; i < 8; i++) {
		code += chars[Math.floor(Math.random() * chars.length)];
	}
	return code;
}

export async function getReferralCode(db: D1Database, userId: string): Promise<ReferralCode | null> {
	const result = await db.prepare('SELECT * FROM referral_codes WHERE user_id = ?').bind(userId).first<ReferralCode>();
	return result ?? null;
}

export async function getReferralCodeByCode(db: D1Database, code: string): Promise<ReferralCode | null> {
	const result = await db.prepare('SELECT * FROM referral_codes WHERE code = ?').bind(code).first<ReferralCode>();
	return result ?? null;
}

export async function applyReferral(
	db: D1Database,
	referrerId: string,
	referredId: string,
	code: string,
	creditsAwarded: number
): Promise<void> {
	const id = generateId();
	const timestamp = now();

	// Create referral record
	await db
		.prepare('INSERT INTO referrals (id, referrer_id, referred_id, code_used, credits_awarded, created_at) VALUES (?, ?, ?, ?, ?, ?)')
		.bind(id, referrerId, referredId, code, creditsAwarded, timestamp)
		.run();

	// Update referral code uses
	await db.prepare('UPDATE referral_codes SET uses_count = uses_count + 1 WHERE user_id = ?').bind(referrerId).run();

	// Award credits to both users
	await addCreditEntry(db, {
		user_id: referrerId,
		amount: creditsAwarded,
		reason: 'referral',
		note: 'Referral bonus - friend signed up'
	});

	await addCreditEntry(db, {
		user_id: referredId,
		amount: creditsAwarded,
		reason: 'referral',
		note: 'Referral bonus - used referral code'
	});
}

export async function getReferrals(db: D1Database, userId: string): Promise<Referral[]> {
	const result = await db
		.prepare('SELECT * FROM referrals WHERE referrer_id = ? ORDER BY created_at DESC')
		.bind(userId)
		.all<Referral>();
	return result.results ?? [];
}

export async function hasBeenReferred(db: D1Database, userId: string): Promise<boolean> {
	const result = await db.prepare('SELECT 1 FROM referrals WHERE referred_id = ?').bind(userId).first();
	return !!result;
}

// ============================================================================
// Search Templates Operations
// ============================================================================

export interface SearchTemplate {
	id: string;
	name: string;
	description: string | null;
	query_freeform: string | null;
	query_structured: string | null;
	category: string | null;
	is_public: boolean;
	use_count: number;
	created_at: string;
}

export async function getSearchTemplates(db: D1Database, category?: string): Promise<SearchTemplate[]> {
	let query = 'SELECT * FROM search_templates WHERE is_public = 1';
	const params: string[] = [];

	if (category) {
		query += ' AND category = ?';
		params.push(category);
	}

	query += ' ORDER BY use_count DESC LIMIT 50';

	const result = await db.prepare(query).bind(...params).all();

	return (result.results ?? []).map((row) => ({
		...row,
		is_public: Boolean((row as Record<string, unknown>).is_public)
	})) as SearchTemplate[];
}

export async function getSearchTemplate(db: D1Database, templateId: string): Promise<SearchTemplate | null> {
	const result = await db.prepare('SELECT * FROM search_templates WHERE id = ?').bind(templateId).first();
	if (!result) return null;
	return { ...result, is_public: Boolean(result.is_public) } as SearchTemplate;
}

export async function incrementTemplateUsage(db: D1Database, templateId: string): Promise<void> {
	await db.prepare('UPDATE search_templates SET use_count = use_count + 1 WHERE id = ?').bind(templateId).run();
}

// ============================================================================
// Push Subscription Operations
// ============================================================================

export interface PushSubscription {
	id: string;
	user_id: string;
	endpoint: string;
	p256dh: string;
	auth: string;
	created_at: string;
}

export async function savePushSubscription(
	db: D1Database,
	userId: string,
	endpoint: string,
	p256dh: string,
	auth: string
): Promise<PushSubscription> {
	const id = generateId();
	const timestamp = now();

	// Upsert based on endpoint
	await db
		.prepare(
			`INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
			 VALUES (?, ?, ?, ?, ?, ?)
			 ON CONFLICT(endpoint) DO UPDATE SET p256dh = ?, auth = ?`
		)
		.bind(id, userId, endpoint, p256dh, auth, timestamp, p256dh, auth)
		.run();

	return { id, user_id: userId, endpoint, p256dh, auth, created_at: timestamp };
}

export async function getPushSubscriptions(db: D1Database, userId: string): Promise<PushSubscription[]> {
	const result = await db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').bind(userId).all<PushSubscription>();
	return result.results ?? [];
}

export async function deletePushSubscription(db: D1Database, endpoint: string): Promise<void> {
	await db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(endpoint).run();
}

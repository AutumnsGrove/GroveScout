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
	extra?: { error_message?: string; credits_used?: number }
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
           credits_used = COALESCE(?, credits_used)
       WHERE id = ?`
		)
		.bind(status, startedAt, completedAt, extra?.error_message ?? null, extra?.credits_used ?? null, id)
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
	searchId: string
): Promise<SearchResult | null> {
	const result = await db
		.prepare('SELECT * FROM search_results WHERE search_id = ?')
		.bind(searchId)
		.first<SearchResult>();
	return result ?? null;
}

export async function getSearchResultByShareToken(
	db: D1Database,
	token: string
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
		.first<SearchResult & { query_freeform: string | null }>();
	return result ?? null;
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

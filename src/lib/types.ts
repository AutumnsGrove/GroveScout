// Scout - Core Types
// All prices in cents, all timestamps in ISO format

import { z } from 'zod';

// ============================================================================
// Database Types
// ============================================================================

export interface User {
	id: string;
	email: string;
	auth_provider: 'google' | 'apple';
	auth_provider_id: string;
	is_admin: boolean;
	created_at: string;
	updated_at: string;
}

export interface AnalyticsEvent {
	id: string;
	event_type: string;
	user_id: string | null;
	session_id: string | null;
	properties: string | null; // JSON
	created_at: string;
}

export interface DailyStat {
	date: string;
	metric: string;
	value: number;
}

export interface Profile {
	id: string;
	user_id: string;
	display_name: string | null;
	sizes: string | null; // JSON
	color_preferences: string | null; // JSON
	budget_min: number | null; // cents
	budget_max: number | null; // cents
	favorite_retailers: string | null; // JSON array
	excluded_retailers: string | null; // JSON array
	style_notes: string | null;
	created_at: string;
	updated_at: string;
}

export interface Search {
	id: string;
	user_id: string;
	query_freeform: string | null;
	query_structured: string | null; // JSON
	status: SearchStatus;
	credits_used: number;
	error_message: string | null;
	created_at: string;
	started_at: string | null;
	completed_at: string | null;
}

export type SearchStatus = 'pending' | 'running' | 'completed' | 'failed' | 'needs_confirmation';

export interface SearchResult {
	id: string;
	search_id: string;
	results_raw: string; // JSON
	results_curated: string; // JSON
	share_token: string | null;
	cache_key: string | null;
	created_at: string;
	expires_at: string | null;
}

export interface CreditLedgerEntry {
	id: string;
	user_id: string;
	amount: number; // positive = added, negative = used
	reason: CreditReason;
	search_id: string | null;
	subscription_id: string | null;
	stripe_payment_id: string | null;
	note: string | null;
	created_at: string;
}

export type CreditReason = 'subscription' | 'purchase' | 'search' | 'refund' | 'bonus' | 'referral';

export interface Subscription {
	id: string;
	user_id: string;
	plan: 'basic' | 'pro';
	status: 'active' | 'canceled' | 'past_due' | 'trialing';
	stripe_customer_id: string;
	stripe_subscription_id: string;
	current_period_start: string;
	current_period_end: string;
	created_at: string;
	updated_at: string;
}

// ============================================================================
// Parsed/Structured Types
// ============================================================================

export interface ProfileSizes {
	shirt?: string;
	pants?: string;
	dress?: string;
	shoes?: string;
	hat?: string;
	[key: string]: string | undefined;
}

export interface ColorPreferences {
	favorites: string[];
	avoid: string[];
}

export interface ParsedQuery {
	category?: string;
	subcategory?: string;
	item_type?: string;
	price_min?: number; // cents
	price_max?: number; // cents
	requirements?: string[];
	brands?: string[];
	exclude_brands?: string[];
	keywords?: string[];
}

export interface ProductResult {
	rank?: number;
	name: string;
	price_current: number; // cents
	price_original?: number; // cents
	discount_percent?: number;
	retailer: string;
	url: string;
	image_url?: string;
	description?: string;
	match_score: number; // 0-100
	match_reason: string;
}

export interface CuratedResults {
	items: ProductResult[];
	search_summary: string;
	generated_at: string;
}

// ============================================================================
// Session & Auth
// ============================================================================

export interface Session {
	id: string;
	user_id: string;
	expires_at: string;
}

export interface OAuthState {
	redirect_to: string;
	csrf_token: string;
}

// ============================================================================
// Queue Types
// ============================================================================

export interface SearchJob {
	search_id: string;
	user_id: string;
	query_freeform: string | null;
	query_structured: ParsedQuery | null;
	profile: ProfileContext;
}

export interface ProfileContext {
	sizes?: ProfileSizes;
	color_preferences?: ColorPreferences;
	budget_min?: number;
	budget_max?: number;
	favorite_retailers?: string[];
	excluded_retailers?: string[];
	style_notes?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: {
		message: string;
		code?: string;
	};
}

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

export const ProfileUpdateSchema = z.object({
	display_name: z.string().max(100).optional(),
	sizes: z
		.object({
			shirt: z.string().optional(),
			pants: z.string().optional(),
			dress: z.string().optional(),
			shoes: z.string().optional(),
			hat: z.string().optional()
		})
		.optional(),
	color_preferences: z
		.object({
			favorites: z.array(z.string()).optional(),
			avoid: z.array(z.string()).optional()
		})
		.optional(),
	budget_min: z.number().int().min(0).optional(),
	budget_max: z.number().int().min(0).optional(),
	favorite_retailers: z.array(z.string()).optional(),
	excluded_retailers: z.array(z.string()).optional(),
	style_notes: z.string().max(2000).optional()
});

export const SearchInputSchema = z.object({
	query: z.string().min(1).max(1000),
	structured: z
		.object({
			category: z.string().optional(),
			price_min: z.number().int().min(0).optional(),
			price_max: z.number().int().min(0).optional(),
			requirements: z.array(z.string()).optional(),
			brands: z.array(z.string()).optional(),
			exclude_brands: z.array(z.string()).optional()
		})
		.optional()
});

export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>;
export type SearchInput = z.infer<typeof SearchInputSchema>;

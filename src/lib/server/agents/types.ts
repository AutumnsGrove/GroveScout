// Scout Agent Types
// Internal types for the search agent system

export interface AgentContext {
	anthropicApiKey: string;
	braveApiKey: string;
	db: D1Database;
	kv: KVNamespace;
}

export interface SavedProduct {
	name: string;
	price_current: number; // cents
	price_original?: number; // cents
	retailer: string;
	url: string;
	image_url?: string;
	description?: string;
	confidence: number; // 0-100
	notes?: string;
}

export interface SearchContext {
	query: string;
	profile: {
		sizes?: Record<string, string | undefined>;
		color_favorites?: string[];
		color_avoid?: string[];
		budget_min?: number;
		budget_max?: number;
		favorite_retailers?: string[];
		excluded_retailers?: string[];
		style_notes?: string;
	};
}

export interface BraveSearchResult {
	title: string;
	url: string;
	description: string;
	age?: string;
	thumbnail?: string;
}

export interface BraveImageResult {
	title: string;
	url: string;
	thumbnail: string;
	source: string;
}

export interface BraveSearchResponse {
	web?: {
		results: Array<BraveSearchResult & { thumbnail?: { src: string } }>;
	};
}

// Token usage tracking from Anthropic API
export interface TokenUsage {
	input_tokens: number;
	output_tokens: number;
	api_calls: number;
}

// Result from runSearchOrchestrator including token usage
export interface OrchestratorResult {
	raw: SavedProduct[];
	curated: SavedProduct[];
	usage: TokenUsage;
}

// Scout Agent Configuration
// Easily configure AI model settings and other agent parameters

export const AGENT_CONFIG = {
	// AI Model Configuration
	model: {
		// Primary model for search orchestration and curation
		// Options: 'claude-haiku-4-5-20251001' (fast/cheap) or 'claude-sonnet-4-20250514' (powerful)
		primary: 'claude-haiku-4-5-20251001',

		// Max tokens for orchestrator (product extraction)
		orchestratorMaxTokens: 4000,

		// Max tokens for curator (top 5 selection)
		curatorMaxTokens: 2000,
	},

	// Search Configuration
	search: {
		// Number of Brave search queries to run per search
		maxSearchQueries: 5,

		// Maximum results per Brave search query
		resultsPerQuery: 10,

		// Number of curated products to return
		curatedProductCount: 5,
	},

	// Cache Configuration
	cache: {
		// How long to cache search results (in seconds)
		searchResultsTTL: 24 * 60 * 60, // 24 hours
	}
} as const;

// Model display names for UI/logging
export const MODEL_NAMES: Record<string, string> = {
	'claude-haiku-4-5-20251001': 'Claude Haiku 4.5',
	'claude-sonnet-4-20250514': 'Claude Sonnet 4',
};

// Get human-readable model name
export function getModelDisplayName(modelId: string): string {
	return MODEL_NAMES[modelId] || modelId;
}

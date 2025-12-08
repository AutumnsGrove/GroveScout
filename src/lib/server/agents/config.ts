// Scout Agent Configuration
// Easily configure AI model settings and other agent parameters

export const AGENT_CONFIG = {
	// AI Model Configuration
	model: {
		// Primary model for search orchestration and curation (text/tools)
		// For cost optimization, use DeepSeek for text processing when available
		primary: 'claude-haiku-4-5-20251001',

		// Vision model for image analysis (style matching, product verification)
		vision: 'claude-haiku-4-5-20251001',

		// DeepSeek for high-volume text processing (when BYOK enabled)
		deepseek: 'deepseek-chat',

		// Max tokens for orchestrator (product extraction) - increased for comprehensive results
		orchestratorMaxTokens: 8000,

		// Max tokens for curator (top 5 selection)
		curatorMaxTokens: 3000,
	},

	// Search Configuration
	search: {
		// Number of Brave search queries to run per search
		maxSearchQueries: 20,

		// Maximum results per Brave search query
		resultsPerQuery: 12,

		// Number of curated products to return
		curatedProductCount: 5,

		// Batch size for parallel search requests
		searchBatchSize: 5,
	},

	// Cache Configuration
	cache: {
		// How long to cache search results (in seconds)
		searchResultsTTL: 24 * 60 * 60, // 24 hours
	},

	// Provider Configuration
	providers: {
		// Enable DeepSeek as primary text model when API key available
		useDeepSeekForText: false, // Will be enabled via BYOK

		// Enable Tavily as additional search source
		useTavily: false, // Will be enabled via BYOK
	}
} as const;

// Model display names for UI/logging
export const MODEL_NAMES: Record<string, string> = {
	'claude-haiku-4-5-20251001': 'Claude Haiku 4.5',
	'claude-sonnet-4-20250514': 'Claude Sonnet 4',
	'deepseek-chat': 'DeepSeek V3',
	'deepseek-reasoner': 'DeepSeek R1',
};

// Get human-readable model name
export function getModelDisplayName(modelId: string): string {
	return MODEL_NAMES[modelId] || modelId;
}

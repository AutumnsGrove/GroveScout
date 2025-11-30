// Scout - Public Shareable Results
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getSearchResultByShareToken } from '$lib/server/db';
import type { CuratedResults } from '$lib/types';

export const load: PageServerLoad = async ({ params, platform }) => {
	if (!platform) {
		throw error(500, 'Platform not available');
	}

	const { DB } = platform.env;
	const result = await getSearchResultByShareToken(DB, params.token);

	if (!result) {
		throw error(404, 'Results not found or expired');
	}

	let results: CuratedResults;
	try {
		results = JSON.parse(result.results_curated);
	} catch {
		throw error(500, 'Invalid results data');
	}

	return {
		query: result.query_freeform,
		results,
		created_at: result.created_at,
		expires_at: result.expires_at
	};
};

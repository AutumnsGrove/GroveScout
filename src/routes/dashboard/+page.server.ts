// Scout - Dashboard Data Loading
import type { PageServerLoad } from './$types';
import { getProfileByUserId, getSearchesByUserId, getCreditBalance } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals, platform }) => {
	const user = locals.user;

	if (!user || !platform) {
		return {
			profile: null,
			searches: [],
			credits: 0
		};
	}

	const { DB } = platform.env;

	const [profile, searches, credits] = await Promise.all([
		getProfileByUserId(DB, user.id),
		getSearchesByUserId(DB, user.id, 10),
		getCreditBalance(DB, user.id)
	]);

	return {
		profile,
		searches,
		credits
	};
};

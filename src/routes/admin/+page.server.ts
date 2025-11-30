// Scout - Admin Dashboard Page Data
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAdminStats, getAllUsers, getAllSearches, getDailyStats, getRecentEvents } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	if (!locals.user.is_admin) {
		throw error(403, 'Access denied. Admin privileges required.');
	}

	if (!platform) {
		throw error(500, 'Platform not available');
	}

	const { DB } = platform.env;

	const [stats, usersData, searchesData, dailyStats, recentEvents] = await Promise.all([
		getAdminStats(DB),
		getAllUsers(DB, 10, 0),
		getAllSearches(DB, 10, 0),
		getDailyStats(DB, 7),
		getRecentEvents(DB, 20)
	]);

	return {
		stats,
		recentUsers: usersData.users,
		totalUsers: usersData.total,
		recentSearches: searchesData.searches,
		totalSearches: searchesData.total,
		dailyStats,
		recentEvents
	};
};

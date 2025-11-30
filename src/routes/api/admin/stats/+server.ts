// Scout - Admin Stats API
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAdminStats, getAllUsers, getAllSearches } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals, platform, url }) => {
	if (!locals.user) {
		return json({ error: { message: 'Unauthorized' } }, { status: 401 });
	}

	if (!locals.user.is_admin) {
		return json({ error: { message: 'Forbidden' } }, { status: 403 });
	}

	if (!platform) {
		return json({ error: { message: 'Platform not available' } }, { status: 500 });
	}

	const { DB } = platform.env;

	const view = url.searchParams.get('view') || 'stats';
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
	const offset = parseInt(url.searchParams.get('offset') || '0');

	try {
		switch (view) {
			case 'stats': {
				const stats = await getAdminStats(DB);
				return json({ success: true, data: stats });
			}

			case 'users': {
				const { users, total } = await getAllUsers(DB, limit, offset);
				return json({ success: true, data: { users, total, limit, offset } });
			}

			case 'searches': {
				const { searches, total } = await getAllSearches(DB, limit, offset);
				return json({ success: true, data: { searches, total, limit, offset } });
			}

			default:
				return json({ error: { message: 'Invalid view' } }, { status: 400 });
		}
	} catch (err) {
		console.error('Admin stats error:', err);
		return json({ error: { message: 'Failed to fetch stats' } }, { status: 500 });
	}
};

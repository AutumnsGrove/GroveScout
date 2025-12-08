// Scout - Scheduled Migration Endpoint
// Triggered by Cloudflare Cron Trigger or manually via admin API

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { migrateOldResults, cleanupExpiredResults, getMigrationStats } from '$lib/server/migration';

/**
 * POST - Run migration (called by cron or admin)
 * Requires internal cron header or admin auth
 */
export const POST: RequestHandler = async ({ request, platform }) => {
	if (!platform) {
		return json({ error: 'Platform not available' }, { status: 500 });
	}

	// Verify this is a cron trigger or admin request
	const isCron = request.headers.get('cf-cron') !== null;
	const isInternal = request.headers.get('x-internal-key') === platform.env.ANTHROPIC_API_KEY;

	if (!isCron && !isInternal) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { DB, R2 } = platform.env;

	if (!R2) {
		return json({ error: 'R2 bucket not configured' }, { status: 500 });
	}

	try {
		// Run migration
		const migrationStats = await migrateOldResults(DB, R2);

		// Also cleanup expired results
		const cleanupStats = await cleanupExpiredResults(DB, R2);

		return json({
			success: true,
			migration: migrationStats,
			cleanup: cleanupStats
		});
	} catch (err) {
		console.error('[Cron] Migration failed:', err);
		return json({ error: 'Migration failed', details: String(err) }, { status: 500 });
	}
};

/**
 * GET - Get migration stats
 */
export const GET: RequestHandler = async ({ locals, platform }) => {
	if (!platform) {
		return json({ error: 'Platform not available' }, { status: 500 });
	}

	// Admin only for stats
	if (!locals.user?.is_admin) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { DB } = platform.env;

	try {
		const stats = await getMigrationStats(DB);
		return json({ success: true, data: stats });
	} catch (err) {
		console.error('[Migration] Failed to get stats:', err);
		return json({ error: 'Failed to get stats' }, { status: 500 });
	}
};

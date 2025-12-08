// Scout - D1 → R2 Migration
// Automatically migrates search results older than 7 days to R2 storage

import { storeResultsInR2 } from './r2';

const MIGRATION_AGE_DAYS = 7;
const BATCH_SIZE = 50;

export interface MigrationStats {
	checked: number;
	migrated: number;
	failed: number;
	skipped: number;
}

/**
 * Migrate old search results from D1 to R2
 * Called by scheduled cron trigger (daily at 3am UTC)
 */
export async function migrateOldResults(
	db: D1Database,
	r2: R2Bucket
): Promise<MigrationStats> {
	const stats: MigrationStats = {
		checked: 0,
		migrated: 0,
		failed: 0,
		skipped: 0
	};

	console.log('[Migration] Starting D1 → R2 migration...');

	try {
		// Find results older than 7 days that haven't been migrated
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - MIGRATION_AGE_DAYS);
		const cutoff = cutoffDate.toISOString();

		const results = await db
			.prepare(
				`SELECT sr.*, s.query_freeform
				 FROM search_results sr
				 JOIN searches s ON sr.search_id = s.id
				 WHERE sr.created_at < ?
				   AND sr.r2_key IS NULL
				   AND sr.results_raw IS NOT NULL
				   AND sr.results_raw != ''
				 ORDER BY sr.created_at ASC
				 LIMIT ?`
			)
			.bind(cutoff, BATCH_SIZE)
			.all<{
				id: string;
				search_id: string;
				results_raw: string;
				results_curated: string;
				share_token: string | null;
				cache_key: string | null;
				created_at: string;
				expires_at: string | null;
				query_freeform: string | null;
			}>();

		stats.checked = results.results?.length ?? 0;
		console.log(`[Migration] Found ${stats.checked} results to migrate`);

		for (const result of results.results ?? []) {
			try {
				// Skip if results are empty/invalid
				if (!result.results_raw || !result.results_curated) {
					stats.skipped++;
					continue;
				}

				// Store in R2
				const r2Key = await storeResultsInR2(
					r2,
					result.search_id,
					result.query_freeform,
					result.results_raw,
					result.results_curated,
					result.share_token,
					result.cache_key,
					result.created_at,
					result.expires_at
				);

				// Update D1 record - set r2_key and clear raw data to save space
				// Keep results_curated for quick access (it's small)
				// Use WHERE r2_key IS NULL to prevent race conditions if cron runs twice
				const now = new Date().toISOString();
				const updateResult = await db
					.prepare(
						`UPDATE search_results
						 SET r2_key = ?,
						     migrated_at = ?,
						     results_raw = NULL
						 WHERE id = ? AND r2_key IS NULL`
					)
					.bind(r2Key, now, result.id)
					.run();

				// Check if the update actually happened (rows affected)
				if (updateResult.meta?.changes === 0) {
					// Already migrated by another process, skip
					stats.skipped++;
					console.log(`[Migration] Skipped ${result.search_id} - already migrated`);
					continue;
				}

				stats.migrated++;
				console.log(`[Migration] Migrated ${result.search_id} → ${r2Key}`);
			} catch (err) {
				stats.failed++;
				console.error(`[Migration] Failed to migrate ${result.search_id}:`, err);
			}
		}

		console.log(
			`[Migration] Complete - migrated: ${stats.migrated}, failed: ${stats.failed}, skipped: ${stats.skipped}`
		);

		return stats;
	} catch (err) {
		console.error('[Migration] Migration failed:', err);
		throw err;
	}
}

/**
 * Get migration status/stats
 */
export async function getMigrationStats(db: D1Database): Promise<{
	totalResults: number;
	migratedToR2: number;
	pendingMigration: number;
	oldestUnmigrated: string | null;
}> {
	const [total, migrated, pending, oldest] = await Promise.all([
		db.prepare('SELECT COUNT(*) as count FROM search_results').first<{ count: number }>(),
		db.prepare('SELECT COUNT(*) as count FROM search_results WHERE r2_key IS NOT NULL').first<{ count: number }>(),
		db
			.prepare(
				`SELECT COUNT(*) as count FROM search_results
				 WHERE r2_key IS NULL
				   AND created_at < datetime('now', '-7 days')`
			)
			.first<{ count: number }>(),
		db
			.prepare(
				`SELECT created_at FROM search_results
				 WHERE r2_key IS NULL
				 ORDER BY created_at ASC
				 LIMIT 1`
			)
			.first<{ created_at: string }>()
	]);

	return {
		totalResults: total?.count ?? 0,
		migratedToR2: migrated?.count ?? 0,
		pendingMigration: pending?.count ?? 0,
		oldestUnmigrated: oldest?.created_at ?? null
	};
}

/**
 * Clean up expired results from R2
 * Results with expires_at in the past should be deleted
 * Uses batched operations for better performance
 */
export async function cleanupExpiredResults(
	db: D1Database,
	r2: R2Bucket
): Promise<{ deleted: number }> {
	let deleted = 0;

	try {
		// Find expired results that are in R2
		const expired = await db
			.prepare(
				`SELECT id, r2_key FROM search_results
				 WHERE r2_key IS NOT NULL
				   AND expires_at IS NOT NULL
				   AND expires_at < datetime('now')
				 LIMIT 100`
			)
			.all<{ id: string; r2_key: string }>();

		const results = expired.results ?? [];
		if (results.length === 0) {
			return { deleted: 0 };
		}

		// Batch delete from R2 using Promise.allSettled for resilience
		const r2Keys = results.map((r) => r.r2_key);
		const r2DeleteResults = await Promise.allSettled(
			r2Keys.map((key) => r2.delete(key))
		);

		// Collect successfully deleted R2 keys
		const successfulDeletes: string[] = [];
		r2DeleteResults.forEach((result, index) => {
			if (result.status === 'fulfilled') {
				successfulDeletes.push(results[index].id);
			} else {
				console.error(`[Cleanup] Failed to delete R2 key ${r2Keys[index]}:`, result.reason);
			}
		});

		// Batch delete from D1 using IN clause for successful R2 deletes
		if (successfulDeletes.length > 0) {
			const placeholders = successfulDeletes.map(() => '?').join(', ');
			await db
				.prepare(`DELETE FROM search_results WHERE id IN (${placeholders})`)
				.bind(...successfulDeletes)
				.run();
			deleted = successfulDeletes.length;
		}

		console.log(`[Cleanup] Deleted ${deleted} expired results`);
		return { deleted };
	} catch (err) {
		console.error('[Cleanup] Cleanup failed:', err);
		return { deleted };
	}
}

/**
 * Force migrate a specific search result to R2 (for testing or manual migration)
 */
export async function forceMigrateResult(
	db: D1Database,
	r2: R2Bucket,
	searchId: string
): Promise<{ success: boolean; r2Key?: string; error?: string }> {
	try {
		const result = await db
			.prepare(
				`SELECT sr.*, s.query_freeform
				 FROM search_results sr
				 JOIN searches s ON sr.search_id = s.id
				 WHERE sr.search_id = ?`
			)
			.bind(searchId)
			.first<{
				id: string;
				search_id: string;
				results_raw: string;
				results_curated: string;
				share_token: string | null;
				cache_key: string | null;
				created_at: string;
				expires_at: string | null;
				query_freeform: string | null;
				r2_key: string | null;
			}>();

		if (!result) {
			return { success: false, error: 'Search result not found' };
		}

		if (result.r2_key) {
			return { success: true, r2Key: result.r2_key };
		}

		if (!result.results_raw) {
			return { success: false, error: 'No raw results to migrate' };
		}

		const r2Key = await storeResultsInR2(
			r2,
			result.search_id,
			result.query_freeform,
			result.results_raw,
			result.results_curated,
			result.share_token,
			result.cache_key,
			result.created_at,
			result.expires_at
		);

		const now = new Date().toISOString();
		await db
			.prepare(
				`UPDATE search_results
				 SET r2_key = ?,
				     migrated_at = ?,
				     results_raw = NULL
				 WHERE id = ?`
			)
			.bind(r2Key, now, result.id)
			.run();

		return { success: true, r2Key };
	} catch (err) {
		return { success: false, error: String(err) };
	}
}

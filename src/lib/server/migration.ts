// Scout - D1 → R2 Migration
// Automatically migrates search results older than 7 days to R2 storage

import { storeResultsInR2, generateR2Key } from './r2';
import { AGENT_CONFIG } from './agents/config';

// Configuration - uses AGENT_CONFIG for consistency
// Note: BATCH_SIZE should stay ≤ 100 to avoid memory issues with D1 result sets
const MIGRATION_AGE_DAYS = AGENT_CONFIG.migration?.migrationAgeDays || 7;
const BATCH_SIZE = AGENT_CONFIG.migration?.migrationBatchSize || 50;
const PARALLEL_BATCH_SIZE = AGENT_CONFIG.migration?.parallelMigrations || 5;

/**
 * Safely batch delete records from D1 using parameterized IN clause
 * This helper ensures SQL injection safety by always using '?' placeholders
 * and binding values separately.
 *
 * @param db - D1 database instance
 * @param ids - Array of IDs to delete (must be non-empty)
 * @returns Number of deleted rows
 */
async function safeBatchDelete(db: D1Database, ids: string[]): Promise<number> {
	if (ids.length === 0) return 0;

	// Generate placeholder string: always '?' characters, never interpolated values
	// This is safe because we're only generating the placeholder pattern, not values
	const placeholders = ids.map(() => '?').join(', ');
	const result = await db
		.prepare(`DELETE FROM search_results WHERE id IN (${placeholders})`)
		.bind(...ids)
		.run();

	return result.meta?.changes ?? ids.length;
}

/**
 * Batch check which R2 keys exist in D1
 * Used by orphan cleanup to avoid N+1 queries
 *
 * @param db - D1 database instance
 * @param r2Keys - Array of R2 keys to check
 * @returns Set of R2 keys that exist in D1
 */
async function batchCheckR2KeysExist(db: D1Database, r2Keys: string[]): Promise<Set<string>> {
	if (r2Keys.length === 0) return new Set();

	const placeholders = r2Keys.map(() => '?').join(', ');
	const result = await db
		.prepare(`SELECT r2_key FROM search_results WHERE r2_key IN (${placeholders})`)
		.bind(...r2Keys)
		.all<{ r2_key: string }>();

	return new Set((result.results ?? []).map(r => r.r2_key));
}

export interface MigrationStats {
	checked: number;
	migrated: number;
	failed: number;
	skipped: number;
}

/**
 * Migrate old search results from D1 to R2
 * Called by scheduled cron trigger (daily at 3am UTC)
 *
 * Race Condition Handling:
 * - Uses WHERE r2_key IS NULL + checking meta.changes to prevent duplicate D1 updates
 * - Idempotency check (R2 head request) detects orphaned R2 objects from crashed migrations
 * - Any duplicate R2 objects from concurrent runs are cleaned up by cleanupOrphanedR2Objects()
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

		// Process in parallel batches for better performance
		const resultsArray = results.results ?? [];
		for (let i = 0; i < resultsArray.length; i += PARALLEL_BATCH_SIZE) {
			const batch = resultsArray.slice(i, i + PARALLEL_BATCH_SIZE);

			const batchResults = await Promise.allSettled(
				batch.map(async (result) => {
					// Skip if results are empty/invalid
					if (!result.results_raw || !result.results_curated) {
						return { status: 'skipped' as const, searchId: result.search_id };
					}

					// Calculate R2 key for idempotency check
					const expectedR2Key = generateR2Key(result.search_id, result.created_at);

					// Idempotency check: see if R2 object already exists
					// This handles the case where a previous migration stored to R2 but failed
					// to update D1 (crash between R2 store and D1 update)
					const existingObject = await r2.head(expectedR2Key);
					if (existingObject) {
						// R2 object already exists - just update D1 to link to it
						const now = new Date().toISOString();
						const updateResult = await db
							.prepare(
								`UPDATE search_results
								 SET r2_key = ?,
								     migrated_at = ?,
								     results_raw = NULL
								 WHERE id = ? AND r2_key IS NULL`
							)
							.bind(expectedR2Key, now, result.id)
							.run();

						if (updateResult.meta?.changes === 0) {
							return { status: 'skipped' as const, searchId: result.search_id };
						}
						console.log(`[Migration] Linked existing R2 object ${result.search_id} → ${expectedR2Key}`);
						return { status: 'migrated' as const, searchId: result.search_id, r2Key: expectedR2Key };
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
						// Already migrated by another process
						return { status: 'skipped' as const, searchId: result.search_id };
					}

					console.log(`[Migration] Migrated ${result.search_id} → ${r2Key}`);
					return { status: 'migrated' as const, searchId: result.search_id, r2Key };
				})
			);

			// Aggregate results from this batch
			for (const result of batchResults) {
				if (result.status === 'fulfilled') {
					if (result.value.status === 'migrated') {
						stats.migrated++;
					} else if (result.value.status === 'skipped') {
						stats.skipped++;
					}
				} else {
					stats.failed++;
					console.error(`[Migration] Failed to migrate:`, result.reason);
				}
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

		// Batch delete from D1 using safe helper
		if (successfulDeletes.length > 0) {
			deleted = await safeBatchDelete(db, successfulDeletes);
		}

		console.log(`[Cleanup] Deleted ${deleted} expired results`);
		return { deleted };
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		console.error(`[Cleanup] Cleanup failed during expired result removal: ${errorMessage}`);
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

/**
 * Clean up orphaned R2 objects that don't have corresponding D1 records
 * This handles the case where a migration stored to R2 but crashed before updating D1
 * and the D1 record was subsequently deleted or the migration was retried with a different key
 *
 * Should be run periodically (e.g., weekly) to clean up any orphaned objects
 */
export async function cleanupOrphanedR2Objects(
	db: D1Database,
	r2: R2Bucket,
	options: { dryRun?: boolean; maxObjects?: number } = {}
): Promise<{ scanned: number; orphaned: number; deleted: number }> {
	const defaultMaxObjects = AGENT_CONFIG.migration?.orphanScanLimit || 1000;
	const { dryRun = false, maxObjects = defaultMaxObjects } = options;
	const stats = { scanned: 0, orphaned: 0, deleted: 0 };

	console.log(`[Cleanup] Scanning for orphaned R2 objects${dryRun ? ' (dry run)' : ''}...`);

	try {
		// List R2 objects with the results/ prefix
		let cursor: string | undefined;
		const orphanedKeys: string[] = [];

		do {
			const listResult = await r2.list({
				prefix: 'results/',
				limit: 100,
				cursor
			});

			const batchKeys = listResult.objects.map(obj => obj.key);
			stats.scanned += batchKeys.length;

			// Batch check which keys exist in D1 (fixes N+1 query pattern)
			const existingKeys = await batchCheckR2KeysExist(db, batchKeys);

			// Find orphaned keys (in R2 but not in D1)
			for (const key of batchKeys) {
				if (!existingKeys.has(key)) {
					orphanedKeys.push(key);
					console.log(`[Cleanup] Found orphaned R2 object: ${key}`);
				}
			}

			// Stop if we've hit the max objects to scan
			if (stats.scanned >= maxObjects) {
				break;
			}

			cursor = listResult.truncated ? listResult.cursor : undefined;
		} while (cursor);

		stats.orphaned = orphanedKeys.length;

		// Delete orphaned objects (unless dry run)
		if (!dryRun && orphanedKeys.length > 0) {
			const deleteResults = await Promise.allSettled(
				orphanedKeys.map((key) => r2.delete(key))
			);

			for (let i = 0; i < deleteResults.length; i++) {
				const result = deleteResults[i];
				if (result.status === 'fulfilled') {
					stats.deleted++;
				} else {
					const errorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason);
					console.error(`[Cleanup] Failed to delete orphaned R2 object ${orphanedKeys[i]}: ${errorMessage}`);
				}
			}
		}

		console.log(
			`[Cleanup] Complete - scanned: ${stats.scanned}, orphaned: ${stats.orphaned}, deleted: ${stats.deleted}`
		);

		return stats;
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		console.error(`[Cleanup] Orphan cleanup failed at scan position ${stats.scanned}: ${errorMessage}`);
		throw err;
	}
}

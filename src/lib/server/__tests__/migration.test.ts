// Tests for D1 → R2 migration logic
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockD1, createMockR2 } from './mocks/cloudflare';

// We need to mock the module before importing
vi.mock('../r2', async () => {
	const actual = await vi.importActual('../r2');
	return {
		...actual,
		storeResultsInR2: vi.fn().mockResolvedValue('results/2025/06/mock-search.md')
	};
});

import { migrateOldResults, getMigrationStats, cleanupExpiredResults } from '../migration';
import { storeResultsInR2 } from '../r2';

describe('D1 → R2 Migration', () => {
	let mockDB: D1Database;
	let mockR2: R2Bucket;

	beforeEach(() => {
		mockDB = createMockD1();
		mockR2 = createMockR2();
		vi.clearAllMocks();
	});

	describe('migrateOldResults', () => {
		it('should return zero stats when no results to migrate', async () => {
			// Mock DB to return empty results
			vi.mocked(mockDB.prepare).mockReturnValue({
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockResolvedValue({ results: [] }),
				first: vi.fn().mockResolvedValue(null),
				run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 0 } }),
				raw: vi.fn().mockResolvedValue([])
			} as unknown as D1PreparedStatement);

			const stats = await migrateOldResults(mockDB, mockR2);

			expect(stats.checked).toBe(0);
			expect(stats.migrated).toBe(0);
			expect(stats.failed).toBe(0);
			expect(stats.skipped).toBe(0);
		});

		it('should migrate results and update D1', async () => {
			const mockResults = [
				{
					id: 'result-1',
					search_id: 'search-1',
					results_raw: JSON.stringify([{ name: 'Product 1' }]),
					results_curated: JSON.stringify({ items: [], search_summary: 'Test', generated_at: '2025-06-15T10:30:00.000Z' }),
					share_token: 'token-1',
					cache_key: null,
					created_at: '2025-06-01T10:00:00.000Z',
					expires_at: '2025-07-01T10:00:00.000Z',
					query_freeform: 'test query'
				}
			];

			// Mock the SELECT query
			const selectStatement = {
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockResolvedValue({ results: mockResults }),
				first: vi.fn(),
				run: vi.fn(),
				raw: vi.fn()
			};

			// Mock the UPDATE query
			const updateStatement = {
				bind: vi.fn().mockReturnThis(),
				all: vi.fn(),
				first: vi.fn(),
				run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
				raw: vi.fn()
			};

			let callCount = 0;
			vi.mocked(mockDB.prepare).mockImplementation(() => {
				callCount++;
				// First call is SELECT, subsequent are UPDATE
				return callCount === 1 ? selectStatement : updateStatement;
			});

			const stats = await migrateOldResults(mockDB, mockR2);

			expect(stats.checked).toBe(1);
			expect(stats.migrated).toBe(1);
			expect(stats.failed).toBe(0);
			expect(storeResultsInR2).toHaveBeenCalledOnce();
		});

		it('should skip already migrated results (race condition protection)', async () => {
			const mockResults = [
				{
					id: 'result-1',
					search_id: 'search-1',
					results_raw: JSON.stringify([{ name: 'Product 1' }]),
					results_curated: JSON.stringify({ items: [], search_summary: 'Test', generated_at: '2025-06-15T10:30:00.000Z' }),
					share_token: 'token-1',
					cache_key: null,
					created_at: '2025-06-01T10:00:00.000Z',
					expires_at: null,
					query_freeform: 'test'
				}
			];

			const selectStatement = {
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockResolvedValue({ results: mockResults }),
				first: vi.fn(),
				run: vi.fn(),
				raw: vi.fn()
			};

			// Simulate another process already migrated - changes = 0
			const updateStatement = {
				bind: vi.fn().mockReturnThis(),
				all: vi.fn(),
				first: vi.fn(),
				run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 0 } }),
				raw: vi.fn()
			};

			let callCount = 0;
			vi.mocked(mockDB.prepare).mockImplementation(() => {
				callCount++;
				return callCount === 1 ? selectStatement : updateStatement;
			});

			const stats = await migrateOldResults(mockDB, mockR2);

			// Should count as skipped, not migrated
			expect(stats.skipped).toBe(1);
			expect(stats.migrated).toBe(0);
		});

		it('should skip results with empty/invalid data', async () => {
			const mockResults = [
				{
					id: 'result-1',
					search_id: 'search-1',
					results_raw: null, // Empty - should skip
					results_curated: JSON.stringify({ items: [] }),
					share_token: null,
					cache_key: null,
					created_at: '2025-06-01T10:00:00.000Z',
					expires_at: null,
					query_freeform: 'test'
				}
			];

			const selectStatement = {
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockResolvedValue({ results: mockResults }),
				first: vi.fn(),
				run: vi.fn(),
				raw: vi.fn()
			};

			vi.mocked(mockDB.prepare).mockReturnValue(selectStatement as unknown as D1PreparedStatement);

			const stats = await migrateOldResults(mockDB, mockR2);

			expect(stats.skipped).toBe(1);
			expect(stats.migrated).toBe(0);
			expect(storeResultsInR2).not.toHaveBeenCalled();
		});

		it('should handle R2 storage failures gracefully', async () => {
			const mockResults = [
				{
					id: 'result-1',
					search_id: 'search-1',
					results_raw: JSON.stringify([{ name: 'Product' }]),
					results_curated: JSON.stringify({ items: [], search_summary: 'Test', generated_at: '2025-06-15T10:30:00.000Z' }),
					share_token: null,
					cache_key: null,
					created_at: '2025-06-01T10:00:00.000Z',
					expires_at: null,
					query_freeform: 'test'
				}
			];

			const selectStatement = {
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockResolvedValue({ results: mockResults }),
				first: vi.fn(),
				run: vi.fn(),
				raw: vi.fn()
			};

			vi.mocked(mockDB.prepare).mockReturnValue(selectStatement as unknown as D1PreparedStatement);

			// Make R2 storage fail
			vi.mocked(storeResultsInR2).mockRejectedValueOnce(new Error('R2 storage failed'));

			const stats = await migrateOldResults(mockDB, mockR2);

			expect(stats.failed).toBe(1);
			expect(stats.migrated).toBe(0);
		});
	});

	describe('getMigrationStats', () => {
		it('should return migration statistics', async () => {
			const mockStatements = {
				bind: vi.fn().mockReturnThis(),
				all: vi.fn(),
				first: vi.fn(),
				run: vi.fn(),
				raw: vi.fn()
			};

			let callIndex = 0;
			mockStatements.first
				.mockResolvedValueOnce({ count: 100 }) // total
				.mockResolvedValueOnce({ count: 50 })  // migrated
				.mockResolvedValueOnce({ count: 10 })  // pending
				.mockResolvedValueOnce({ created_at: '2025-06-01T00:00:00.000Z' }); // oldest

			vi.mocked(mockDB.prepare).mockReturnValue(mockStatements as unknown as D1PreparedStatement);

			const stats = await getMigrationStats(mockDB);

			expect(stats.totalResults).toBe(100);
			expect(stats.migratedToR2).toBe(50);
			expect(stats.pendingMigration).toBe(10);
			expect(stats.oldestUnmigrated).toBe('2025-06-01T00:00:00.000Z');
		});

		it('should handle null oldest unmigrated', async () => {
			const mockStatements = {
				bind: vi.fn().mockReturnThis(),
				all: vi.fn(),
				first: vi.fn()
					.mockResolvedValueOnce({ count: 10 })
					.mockResolvedValueOnce({ count: 10 })
					.mockResolvedValueOnce({ count: 0 })
					.mockResolvedValueOnce(null), // No unmigrated results
				run: vi.fn(),
				raw: vi.fn()
			};

			vi.mocked(mockDB.prepare).mockReturnValue(mockStatements as unknown as D1PreparedStatement);

			const stats = await getMigrationStats(mockDB);

			expect(stats.oldestUnmigrated).toBeNull();
		});
	});

	describe('cleanupExpiredResults', () => {
		it('should return zero when no expired results', async () => {
			const selectStatement = {
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockResolvedValue({ results: [] }),
				first: vi.fn(),
				run: vi.fn(),
				raw: vi.fn()
			};

			vi.mocked(mockDB.prepare).mockReturnValue(selectStatement as unknown as D1PreparedStatement);

			const result = await cleanupExpiredResults(mockDB, mockR2);

			expect(result.deleted).toBe(0);
			expect(mockR2.delete).not.toHaveBeenCalled();
		});

		it('should delete expired results from R2 and D1', async () => {
			const expiredResults = [
				{ id: 'exp-1', r2_key: 'results/2025/01/exp-1.md' },
				{ id: 'exp-2', r2_key: 'results/2025/01/exp-2.md' }
			];

			const selectStatement = {
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockResolvedValue({ results: expiredResults }),
				first: vi.fn(),
				run: vi.fn().mockResolvedValue({ success: true }),
				raw: vi.fn()
			};

			vi.mocked(mockDB.prepare).mockReturnValue(selectStatement as unknown as D1PreparedStatement);

			const result = await cleanupExpiredResults(mockDB, mockR2);

			expect(result.deleted).toBe(2);
			// R2 delete should be called for each key
			expect(mockR2.delete).toHaveBeenCalledTimes(2);
		});

		it('should handle partial R2 failures', async () => {
			const expiredResults = [
				{ id: 'exp-1', r2_key: 'results/2025/01/exp-1.md' },
				{ id: 'exp-2', r2_key: 'results/2025/01/exp-2.md' }
			];

			const selectStatement = {
				bind: vi.fn().mockReturnThis(),
				all: vi.fn().mockResolvedValue({ results: expiredResults }),
				first: vi.fn(),
				run: vi.fn().mockResolvedValue({ success: true }),
				raw: vi.fn()
			};

			vi.mocked(mockDB.prepare).mockReturnValue(selectStatement as unknown as D1PreparedStatement);

			// Make first R2 delete fail
			vi.mocked(mockR2.delete)
				.mockRejectedValueOnce(new Error('R2 delete failed'))
				.mockResolvedValueOnce(undefined);

			const result = await cleanupExpiredResults(mockDB, mockR2);

			// Only one should succeed
			expect(result.deleted).toBe(1);
		});
	});
});

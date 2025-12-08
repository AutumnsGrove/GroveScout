// Mock implementations for Cloudflare bindings
// Used in unit tests to avoid needing actual Cloudflare services

import { vi } from 'vitest';

/**
 * Mock D1 Database
 * Stores data in memory for testing
 */
export function createMockD1(): D1Database {
	const tables: Map<string, Map<string, Record<string, unknown>>> = new Map();

	const createStatement = (sql: string) => {
		let boundParams: unknown[] = [];

		const statement: D1PreparedStatement = {
			bind: (...params: unknown[]) => {
				boundParams = params;
				return statement;
			},
			first: async <T>(_colName?: string): Promise<T | null> => {
				// Simple mock - returns null by default
				// Override with vi.spyOn for specific tests
				return null as T | null;
			},
			all: async <T>(): Promise<D1Result<T>> => {
				return {
					results: [] as T[],
					success: true,
					meta: {
						duration: 0,
						changes: 0,
						last_row_id: 0,
						changed_db: false,
						size_after: 0,
						rows_read: 0,
						rows_written: 0
					}
				};
			},
			run: async (): Promise<D1Result<unknown>> => {
				return {
					results: [],
					success: true,
					meta: {
						duration: 0,
						changes: 1,
						last_row_id: 1,
						changed_db: true,
						size_after: 0,
						rows_read: 0,
						rows_written: 0
					}
				};
			},
			raw: async <T>(): Promise<T[]> => {
				return [] as T[];
			}
		};

		return statement;
	};

	return {
		prepare: vi.fn((sql: string) => createStatement(sql)),
		dump: vi.fn(async () => new ArrayBuffer(0)),
		batch: vi.fn(async <T>(statements: D1PreparedStatement[]) => {
			return statements.map(() => ({
				results: [] as T[],
				success: true,
				meta: { duration: 0, changes: 0, last_row_id: 0, changed_db: false, size_after: 0, rows_read: 0, rows_written: 0 }
			}));
		}),
		exec: vi.fn(async () => ({ count: 0, duration: 0 }))
	} as unknown as D1Database;
}

/**
 * Mock R2 Bucket
 * Stores objects in memory for testing
 */
export function createMockR2(): R2Bucket {
	const storage = new Map<string, { body: string; metadata?: R2HTTPMetadata; customMetadata?: Record<string, string> }>();

	const createR2Object = (key: string, data: typeof storage extends Map<string, infer V> ? V : never): R2Object => ({
		key,
		version: 'v1',
		size: data.body.length,
		etag: 'mock-etag',
		httpEtag: '"mock-etag"',
		uploaded: new Date(),
		httpMetadata: data.metadata || {},
		customMetadata: data.customMetadata || {},
		checksums: {
			toJSON: () => ({})
		},
		writeHttpMetadata: vi.fn(),
		storageClass: 'Standard' as const
	});

	const createR2ObjectBody = (key: string, data: typeof storage extends Map<string, infer V> ? V : never): R2ObjectBody => ({
		...createR2Object(key, data),
		body: new ReadableStream({
			start(controller) {
				controller.enqueue(new TextEncoder().encode(data.body));
				controller.close();
			}
		}),
		bodyUsed: false,
		arrayBuffer: vi.fn(async () => new TextEncoder().encode(data.body).buffer),
		text: vi.fn(async () => data.body),
		json: vi.fn(async () => JSON.parse(data.body)),
		blob: vi.fn(async () => new Blob([data.body]))
	});

	return {
		head: vi.fn(async (key: string) => {
			const data = storage.get(key);
			if (!data) return null;
			return createR2Object(key, data);
		}),
		get: vi.fn(async (key: string) => {
			const data = storage.get(key);
			if (!data) return null;
			return createR2ObjectBody(key, data);
		}),
		put: vi.fn(async (key: string, value: string | ReadableStream | ArrayBuffer, options?: R2PutOptions) => {
			let body: string;
			if (typeof value === 'string') {
				body = value;
			} else if (value instanceof ArrayBuffer) {
				body = new TextDecoder().decode(value);
			} else {
				// ReadableStream - for simplicity, assume it's empty
				body = '';
			}
			storage.set(key, {
				body,
				metadata: options?.httpMetadata,
				customMetadata: options?.customMetadata
			});
			return createR2Object(key, storage.get(key)!);
		}),
		delete: vi.fn(async (keys: string | string[]) => {
			const keyArray = Array.isArray(keys) ? keys : [keys];
			for (const key of keyArray) {
				storage.delete(key);
			}
		}),
		list: vi.fn(async (options?: R2ListOptions) => {
			const objects: R2Object[] = [];
			for (const [key, data] of storage.entries()) {
				if (options?.prefix && !key.startsWith(options.prefix)) continue;
				objects.push(createR2Object(key, data));
			}
			return {
				objects,
				truncated: false,
				delimitedPrefixes: []
			};
		}),
		createMultipartUpload: vi.fn(),
		resumeMultipartUpload: vi.fn()
	} as unknown as R2Bucket;
}

/**
 * Mock KV Namespace
 * Stores key-value pairs in memory for testing
 */
export function createMockKV(): KVNamespace {
	const storage = new Map<string, { value: string; metadata?: unknown; expiration?: number }>();

	return {
		get: vi.fn(async (key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }) => {
			const data = storage.get(key);
			if (!data) return null;
			if (data.expiration && data.expiration < Date.now()) {
				storage.delete(key);
				return null;
			}
			if (options?.type === 'json') {
				return JSON.parse(data.value);
			}
			return data.value;
		}),
		getWithMetadata: vi.fn(async (key: string) => {
			const data = storage.get(key);
			if (!data) return { value: null, metadata: null };
			return { value: data.value, metadata: data.metadata };
		}),
		put: vi.fn(async (key: string, value: string, options?: { expirationTtl?: number; metadata?: unknown }) => {
			storage.set(key, {
				value,
				metadata: options?.metadata,
				expiration: options?.expirationTtl ? Date.now() + options.expirationTtl * 1000 : undefined
			});
		}),
		delete: vi.fn(async (key: string) => {
			storage.delete(key);
		}),
		list: vi.fn(async (options?: { prefix?: string; limit?: number }) => {
			const keys: { name: string; expiration?: number; metadata?: unknown }[] = [];
			for (const [key, data] of storage.entries()) {
				if (options?.prefix && !key.startsWith(options.prefix)) continue;
				keys.push({ name: key, expiration: data.expiration, metadata: data.metadata });
				if (options?.limit && keys.length >= options.limit) break;
			}
			return { keys, list_complete: true, cacheStatus: null };
		})
	} as unknown as KVNamespace;
}

/**
 * Create all mock Cloudflare bindings for a test
 */
export function createMockPlatform() {
	return {
		env: {
			DB: createMockD1(),
			R2: createMockR2(),
			KV: createMockKV(),
			ANTHROPIC_API_KEY: 'test-anthropic-key',
			BRAVE_API_KEY: 'test-brave-key',
			TAVILY_API_KEY: 'test-tavily-key',
			DEEPSEEK_API_KEY: 'test-deepseek-key',
			RESEND_API_KEY: 'test-resend-key',
			STRIPE_SECRET_KEY: 'test-stripe-key',
			STRIPE_WEBHOOK_SECRET: 'test-webhook-secret',
			GOOGLE_CLIENT_ID: 'test-google-id',
			GOOGLE_CLIENT_SECRET: 'test-google-secret',
			ENVIRONMENT: 'test',
			SITE_URL: 'http://localhost:5173'
		},
		context: {
			waitUntil: vi.fn(),
			passThroughOnException: vi.fn()
		},
		caches: {
			default: {
				match: vi.fn(),
				put: vi.fn(),
				delete: vi.fn()
			}
		}
	};
}

// Scout - Durable Object for Advanced Search Job Orchestration
// Uses SQLite persistence and Alarm API for multi‑step AI agent workflows.

import { DurableObject } from 'cloudflare:workers';
import type { SearchJob, ProfileContext } from '$lib/types';
import type { SavedProduct, TokenUsage, OrchestratorResult } from '../types';
import { runSearchOrchestrator } from '../orchestrator';
import { braveSearch, buildSearchQueries } from '../brave';
import { AGENT_CONFIG } from '../config';

export interface Env {
	// Bindings
	DB: D1Database;
	KV: KVNamespace;
	SEARCH_JOB: DurableObjectNamespace<SearchJobDO>;
	// Secrets
	ANTHROPIC_API_KEY: string;
	BRAVE_API_KEY: string;
	RESEND_API_KEY: string;
	SITE_URL: string;
	// Environment variables
	ENVIRONMENT: string;
	MAX_BATCHES?: string;
	TARGET_RESULTS?: string;
	DRIVER_PROVIDER?: string;
	SWARM_PROVIDER?: string;
}

interface ScoutJobRow {
	id: string;
	user_id: string;
	query_freeform?: string;
	query_structured?: string;
	status: 'pending' | 'running' | 'completed' | 'needs_followup' | 'failed' | 'cancelled';
	batch_num: number;
	followup_quiz?: string;
	followup_responses?: string;
	driver_provider: string;
	swarm_provider: string;
	created_at: string;
	updated_at: string;
	error?: string;
	total_input_tokens: number;
	total_output_tokens: number;
	credits_used: number;
	target_results: number;
	max_batches: number;
}

interface ScoutResultRow {
	id: number;
	batch_num: number;
	product_name: string;
	retailer: string;
	url: string;
	price_cents: number;
	original_price_cents?: number;
	confidence: number;
	match_score: number;
	match_reason: string;
	flags: string;
	created_at: string;
}

interface ScoutArtifactRow {
	id: number;
	batch_num: number;
	artifact_type: string;
	content: string;
	created_at: string;
}

export class SearchJobDO extends DurableObject<Env> {
	private state: DurableObjectState;
	private sql: SqlStorage;

	constructor(state: DurableObjectState, env: Env) {
		super(state, env);
		this.state = state;
		this.sql = state.storage.sql;
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;
		const jobId = this.state.id.toString();

		try {
			// Ensure schema exists
			await this.ensureSchema();

			if (request.method === 'POST' && path.endsWith('/start')) {
				return await this.handleStart(request);
			}
			if (request.method === 'GET' && path.endsWith('/status')) {
				return await this.handleStatus();
			}
			if (request.method === 'GET' && path.endsWith('/results')) {
				return await this.handleResults();
			}
			if (request.method === 'GET' && path.endsWith('/stream')) {
				return await this.handleStream(request);
			}
			if (request.method === 'GET' && path.endsWith('/followup')) {
				return await this.handleFollowup();
			}
			if (request.method === 'POST' && path.endsWith('/followup')) {
				return await this.handleSubmitFollowup(request);
			}
			if (request.method === 'POST' && path.endsWith('/resume')) {
				return await this.handleResume();
			}
			if (request.method === 'POST' && path.endsWith('/cancel')) {
				return await this.handleCancel();
			}

			return new Response('Not Found', { status: 404 });
		} catch (error) {
			console.error(`[SearchJobDO ${jobId}] Error handling request:`, error);
			return new Response(
				JSON.stringify({ error: 'Internal server error', details: (error as Error).message }),
				{ status: 500, headers: { 'Content-Type': 'application/json' } }
			);
		}
	}

	async alarm(): Promise<void> {
		const jobId = this.state.id.toString();
		console.log(`[SearchJobDO ${jobId}] Alarm fired`);

		try {
			await this.ensureSchema();
			const job = await this.getJob();
			if (!job) {
				console.error(`[SearchJobDO ${jobId}] Job not found`);
				return;
			}

			if (job.status !== 'running') {
				console.log(`[SearchJobDO ${jobId}] Job is not running (status: ${job.status}), skipping alarm`);
				return;
			}

			// Process next batch
			const batchResult = await this.processBatch(job);
			await this.saveBatchResults(job.batch_num, batchResult);

			// Update job after batch
			job.batch_num += 1;
			job.total_input_tokens += batchResult.usage.input_tokens;
			job.total_output_tokens += batchResult.usage.output_tokens;

			// Check termination conditions
			const targetResults = job.target_results || 5;
			const maxBatches = job.max_batches || 3;
			const totalResults = await this.getTotalResults();

			if (totalResults >= targetResults) {
				job.status = 'completed';
				await this.updateJob(job);
				console.log(`[SearchJobDO ${jobId}] Job completed with ${totalResults} results`);
				// TODO: Send notification
				return;
			}

			if (job.batch_num >= maxBatches) {
				// Not enough results, need follow-up
				job.status = 'needs_followup';
				job.followup_quiz = JSON.stringify(this.generateFollowupQuiz(job));
				await this.updateJob(job);
				console.log(`[SearchJobDO ${jobId}] Job needs follow-up after ${maxBatches} batches`);
				return;
			}

			// Schedule next alarm (delay 10 seconds for rate limiting)
			await this.updateJob(job);
			const delayMs = 10_000; // 10 seconds
			await this.state.storage.setAlarm(Date.now() + delayMs);
			console.log(`[SearchJobDO ${jobId}] Scheduled next alarm in ${delayMs}ms`);
		} catch (error) {
			console.error(`[SearchJobDO ${jobId}] Error in alarm:`, error);
			await this.setJobError(error as Error);
		}
	}

	private async ensureSchema(): Promise<void> {
		// Create tables if they don't exist
		await this.sql.exec(`
			CREATE TABLE IF NOT EXISTS scout_job (
				id TEXT PRIMARY KEY,
				user_id TEXT NOT NULL,
				query_freeform TEXT,
				query_structured TEXT,
				status TEXT NOT NULL DEFAULT 'pending',
				batch_num INTEGER DEFAULT 0,
				followup_quiz TEXT,
				followup_responses TEXT,
				driver_provider TEXT DEFAULT 'claude',
				swarm_provider TEXT DEFAULT 'claude',
				created_at TEXT DEFAULT (datetime('now')),
				updated_at TEXT DEFAULT (datetime('now')),
				error TEXT,
				total_input_tokens INTEGER DEFAULT 0,
				total_output_tokens INTEGER DEFAULT 0,
				credits_used INTEGER DEFAULT 0,
				target_results INTEGER DEFAULT 5,
				max_batches INTEGER DEFAULT 3
			);

			CREATE TABLE IF NOT EXISTS scout_results (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				batch_num INTEGER NOT NULL,
				product_name TEXT NOT NULL,
				retailer TEXT NOT NULL,
				url TEXT NOT NULL,
				price_cents INTEGER,
				original_price_cents INTEGER,
				confidence INTEGER,
				match_score INTEGER,
				match_reason TEXT,
				flags TEXT DEFAULT '[]',
				created_at TEXT DEFAULT (datetime('now')),
				UNIQUE(product_name, retailer, url)
			);

			CREATE TABLE IF NOT EXISTS scout_artifacts (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				batch_num INTEGER NOT NULL,
				artifact_type TEXT NOT NULL,
				content TEXT NOT NULL,
				created_at TEXT DEFAULT (datetime('now'))
			);
		`);
	}

	private async getJob(): Promise<ScoutJobRow | null> {
		const cursor = await this.sql.exec('SELECT * FROM scout_job WHERE id = ?', this.state.id.toString());
		const rows = cursor.toArray() as unknown as ScoutJobRow[];
		return rows[0] || null;
	}

	private async updateJob(job: Partial<ScoutJobRow>): Promise<void> {
		const fields = Object.keys(job)
			.filter(k => k !== 'id')
			.map(k => `${k} = ?`);
		const values = Object.values(job).filter((_, i) => Object.keys(job)[i] !== 'id');
		values.push(this.state.id.toString());

		const query = `UPDATE scout_job SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`;
		await this.sql.exec(query, ...values);
	}

	private async setJobError(error: Error): Promise<void> {
		await this.sql.exec(
			'UPDATE scout_job SET status = ?, error = ?, updated_at = datetime("now") WHERE id = ?',
			'failed',
			error.message,
			this.state.id.toString()
		);
	}

	private async getTotalResults(): Promise<number> {
		const cursor = await this.sql.exec('SELECT COUNT(*) as count FROM scout_results');
		const rows = cursor.toArray() as unknown as { count: number }[];
		return rows[0]?.count || 0;
	}

	private async processBatch(job: ScoutJobRow): Promise<OrchestratorResult> {
		const { query_freeform, query_structured, driver_provider, swarm_provider } = job;

		// Build search context from job and profile (simplified)
		const profileContext: ProfileContext = {}; // TODO: retrieve from user profile
		const searchContext = {
			query: query_freeform || 'general deals',
			profile: {
				sizes: profileContext.sizes,
				color_favorites: profileContext.color_preferences?.favorites,
				color_avoid: profileContext.color_preferences?.avoid,
				budget_min: profileContext.budget_min,
				budget_max: profileContext.budget_max,
				favorite_retailers: profileContext.favorite_retailers,
				excluded_retailers: profileContext.excluded_retailers,
				style_notes: profileContext.style_notes
			}
		};

		// Run the existing orchestrator (single batch)
		const result = await runSearchOrchestrator(
			this.env.ANTHROPIC_API_KEY,
			this.env.BRAVE_API_KEY,
			searchContext
		);

		return result;
	}

	private async saveBatchResults(batchNum: number, result: OrchestratorResult): Promise<void> {
		// Save curated results
		for (const product of result.curated) {
			await this.sql.exec(
				`INSERT OR IGNORE INTO scout_results
				(batch_num, product_name, retailer, url, price_cents, original_price_cents, confidence, match_score, match_reason, flags)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				batchNum,
				product.name,
				product.retailer,
				product.url,
				product.price_current,
				product.price_original || null,
				product.confidence,
				product.confidence, // match_score same as confidence for now
				`Good match for your criteria with ${product.confidence}% confidence.`,
				'[]'
			);
		}

		// Save artifacts (raw results)
		await this.sql.exec(
			'INSERT INTO scout_artifacts (batch_num, artifact_type, content) VALUES (?, ?, ?)',
			batchNum,
			'raw_results',
			JSON.stringify(result.raw)
		);
	}

	private generateFollowupQuiz(job: ScoutJobRow): any {
		// Simple follow-up quiz for demonstration
		return {
			questions: [
				{
					id: 'budget',
					text: 'What is your maximum budget?',
					type: 'range',
					options: ['$50', '$100', '$200', '$500', 'No limit']
				},
				{
					id: 'color',
					text: 'Which colors do you prefer?',
					type: 'multiple_choice',
					options: ['Black', 'White', 'Blue', 'Red', 'Green', 'Other']
				}
			]
		};
	}

	// HTTP handlers (stubs)
	private async handleStart(request: Request): Promise<Response> {
		const body = await request.json<SearchJob>();
		const jobId = this.state.id.toString();

		// Insert job record
		await this.sql.exec(
			`INSERT INTO scout_job (id, user_id, query_freeform, query_structured, status, driver_provider, swarm_provider, target_results, max_batches)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			jobId,
			body.user_id,
			body.query_freeform,
			body.query_structured ? JSON.stringify(body.query_structured) : null,
			'running',
			this.env.DRIVER_PROVIDER || 'claude',
			this.env.SWARM_PROVIDER || 'claude',
			this.env.TARGET_RESULTS ? parseInt(this.env.TARGET_RESULTS) : 5,
			this.env.MAX_BATCHES ? parseInt(this.env.MAX_BATCHES) : 3
		);

		// Schedule first alarm immediately
		await this.state.storage.setAlarm(Date.now());

		return new Response(JSON.stringify({ id: jobId, status: 'running' }), {
			headers: { 'Content-Type': 'application/json' }
		});
	}

	private async handleStatus(): Promise<Response> {
		const job = await this.getJob();
		if (!job) {
			return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404 });
		}
		return new Response(JSON.stringify(job), {
			headers: { 'Content-Type': 'application/json' }
		});
	}

	private async handleResults(): Promise<Response> {
		const cursor = await this.sql.exec('SELECT * FROM scout_results ORDER BY match_score DESC LIMIT 20');
		const results = cursor.toArray() as unknown as ScoutResultRow[];
		return new Response(JSON.stringify(results), {
			headers: { 'Content-Type': 'application/json' }
		});
	}

	private async handleStream(request: Request): Promise<Response> {
		// SSE implementation omitted for brevity
		return new Response('Stream not yet implemented', { status: 501 });
	}

	private async handleFollowup(): Promise<Response> {
		const job = await this.getJob();
		if (!job || job.status !== 'needs_followup') {
			return new Response(JSON.stringify({ error: 'No follow-up available' }), { status: 404 });
		}
		const quiz = job.followup_quiz ? JSON.parse(job.followup_quiz) : null;
		return new Response(JSON.stringify(quiz), {
			headers: { 'Content-Type': 'application/json' }
		});
	}

	private async handleSubmitFollowup(request: Request): Promise<Response> {
		const body = await request.json<{ responses: any }>();
		const job = await this.getJob();
		if (!job) {
			return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404 });
		}

		await this.sql.exec(
			'UPDATE scout_job SET followup_responses = ?, status = ?, updated_at = datetime("now") WHERE id = ?',
			JSON.stringify(body.responses),
			'running',
			this.state.id.toString()
		);

		// Resume processing
		await this.state.storage.setAlarm(Date.now());

		return new Response(JSON.stringify({ success: true }));
	}

	private async handleResume(): Promise<Response> {
		const job = await this.getJob();
		if (!job) {
			return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404 });
		}
		if (job.status !== 'needs_followup') {
			return new Response(JSON.stringify({ error: 'Job cannot be resumed' }), { status: 400 });
		}
		await this.sql.exec(
			'UPDATE scout_job SET status = ?, updated_at = datetime("now") WHERE id = ?',
			'running',
			this.state.id.toString()
		);
		await this.state.storage.setAlarm(Date.now());
		return new Response(JSON.stringify({ success: true }));
	}

	private async handleCancel(): Promise<Response> {
		await this.sql.exec(
			'UPDATE scout_job SET status = ?, updated_at = datetime("now") WHERE id = ?',
			'cancelled',
			this.state.id.toString()
		);
		return new Response(JSON.stringify({ success: true }));
	}
}
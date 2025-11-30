<script lang="ts">
	import { goto } from '$app/navigation';

	let query = $state('');
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);

	interface ApiResponse {
		success?: boolean;
		data?: { id: string };
		error?: { message: string };
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!query.trim() || isSubmitting) return;

		isSubmitting = true;
		error = null;

		try {
			const response = await fetch('/api/search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: query.trim() })
			});

			const result: ApiResponse = await response.json();

			if (!response.ok) {
				throw new Error(result.error?.message || 'Failed to create search');
			}

			if (result.data?.id) {
				goto(`/search/${result.data.id}`);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="search-page">
	<h1>What are you looking for?</h1>
	<p class="subtitle">Describe what you want. Be as specific or vague as you like.</p>

	<form onsubmit={handleSubmit}>
		<textarea
			bind:value={query}
			placeholder="Example: Cozy oversized sweater, earth tones, under $60. Or: mechanical keyboard, clicky switches, RGB, under $80"
			rows="4"
			disabled={isSubmitting}
		></textarea>

		{#if error}
			<div class="error">{error}</div>
		{/if}

		<button type="submit" disabled={!query.trim() || isSubmitting}>
			{isSubmitting ? 'Starting search...' : 'Find deals'}
		</button>

		<p class="hint">
			This will use 1 credit. Results usually take 2-3 minutes.
		</p>
	</form>

	<section class="examples">
		<h3>Example searches</h3>
		<div class="example-list">
			<button type="button" onclick={() => (query = 'Wireless earbuds, good for running, under $100')}>
				"Wireless earbuds, good for running, under $100"
			</button>
			<button type="button" onclick={() => (query = 'Cozy blanket for the couch, oversized, soft material')}>
				"Cozy blanket for the couch, oversized, soft material"
			</button>
			<button type="button" onclick={() => (query = 'Standing desk converter, under $200, good reviews')}>
				"Standing desk converter, under $200, good reviews"
			</button>
		</div>
	</section>
</div>

<style>
	.search-page {
		max-width: 600px;
		margin: 0 auto;
		padding-top: 2rem;
	}

	h1 {
		margin-bottom: 0.5rem;
	}

	.subtitle {
		color: #666;
		margin-bottom: 2rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	textarea {
		width: 100%;
		padding: 1rem;
		border: 2px solid #e5e7eb;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-family: inherit;
		resize: vertical;
		transition: border-color 0.2s;
	}

	textarea:focus {
		outline: none;
		border-color: #6366f1;
	}

	textarea:disabled {
		background: #f9fafb;
	}

	.error {
		background: #fee2e2;
		color: #991b1b;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
	}

	button[type='submit'] {
		background: #6366f1;
		color: white;
		border: none;
		padding: 1rem 2rem;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	button[type='submit']:hover:not(:disabled) {
		background: #5558e3;
	}

	button[type='submit']:disabled {
		background: #9ca3af;
		cursor: not-allowed;
	}

	.hint {
		text-align: center;
		color: #9ca3af;
		font-size: 0.875rem;
	}

	.examples {
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid #e5e7eb;
	}

	.examples h3 {
		margin-bottom: 1rem;
		color: #666;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.example-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.example-list button {
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		text-align: left;
		font-size: 0.875rem;
		color: #666;
		cursor: pointer;
		transition: background-color 0.2s, border-color 0.2s;
	}

	.example-list button:hover {
		background: #f3f4f6;
		border-color: #d1d5db;
	}
</style>

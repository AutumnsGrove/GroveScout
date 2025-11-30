<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import type { CuratedResults } from '$lib/types';

	let { data } = $props();

	// Poll for updates if search is still running
	onMount(() => {
		if (data.search.status === 'pending' || data.search.status === 'running') {
			const interval = setInterval(async () => {
				await invalidate(`/search/${data.search.id}`);

				// Stop polling when done
				if (data.search.status !== 'pending' && data.search.status !== 'running') {
					clearInterval(interval);
				}
			}, 3000);

			return () => clearInterval(interval);
		}
	});

	function copyShareLink() {
		if (data.shareToken) {
			navigator.clipboard.writeText(`${window.location.origin}/s/${data.shareToken}`);
		}
	}

	function formatPrice(cents: number): string {
		return `$${(cents / 100).toFixed(2)}`;
	}

	function getSearchDuration(start: string, end: string | null): string {
		if (!end) return 'N/A';
		const ms = new Date(end).getTime() - new Date(start).getTime();
		const seconds = Math.floor(ms / 1000);
		if (seconds < 60) return `${seconds} seconds`;
		const minutes = Math.floor(seconds / 60);
		return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
	}
</script>

<div class="search-page">
	<header class="search-header">
		<a href="/dashboard" class="back-link">← Back to dashboard</a>
		<h1>Search Results</h1>
		<p class="query">"{data.search.query}"</p>
	</header>

	{#if data.search.status === 'pending'}
		<div class="status-card pending">
			<div class="spinner"></div>
			<h2>In queue...</h2>
			<p>Your search is waiting to be processed. This usually takes less than a minute.</p>
		</div>
	{:else if data.search.status === 'running'}
		<div class="status-card running">
			<div class="spinner"></div>
			<h2>Searching...</h2>
			<p>Scout is hunting for deals. This usually takes 2-3 minutes.</p>
			<p class="hint">Feel free to close this tab—we'll have results when you get back.</p>
		</div>
	{:else if data.search.status === 'failed'}
		<div class="status-card failed">
			<h2>Search Failed</h2>
			<p>{data.search.error_message || 'Something went wrong. No credits were charged.'}</p>
			<a href="/search/new" class="btn-primary">Try Again</a>
		</div>
	{:else if data.search.status === 'completed' && data.results}
		<div class="results-header">
			<p class="summary">{data.results.search_summary}</p>
			{#if data.shareToken}
				<button class="btn-secondary" onclick={copyShareLink}>
					Copy share link
				</button>
			{/if}
		</div>

		<div class="results-grid">
			{#each data.results.items as item, index}
				<article class="product-card">
					<div class="rank">#{index + 1}</div>

					{#if item.image_url}
						<img src={item.image_url} alt={item.name} class="product-image" />
					{:else}
						<div class="product-image placeholder">No image</div>
					{/if}

					<div class="product-info">
						<h3>{item.name}</h3>

						<div class="price-row">
							<span class="price-current">{formatPrice(item.price_current)}</span>
							{#if item.price_original && item.price_original > item.price_current}
								<span class="price-original">{formatPrice(item.price_original)}</span>
								<span class="discount">-{item.discount_percent}%</span>
							{/if}
						</div>

						<p class="retailer">{item.retailer}</p>

						<p class="match-reason">{item.match_reason}</p>

						<div class="match-score">
							<div class="score-bar" style="width: {item.match_score}%"></div>
							<span>{item.match_score}% match</span>
						</div>

						<a href={item.url} target="_blank" rel="noopener" class="btn-buy">
							View Deal →
						</a>
					</div>
				</article>
			{/each}
		</div>

		<footer class="results-footer">
			<p>Search completed in {getSearchDuration(data.search.created_at, data.search.completed_at)}</p>
			<p>Used {data.search.credits_used} credit{data.search.credits_used !== 1 ? 's' : ''}</p>
		</footer>
	{:else}
		<div class="status-card">
			<h2>No results</h2>
			<p>Something unexpected happened.</p>
		</div>
	{/if}
</div>

<style>
	.search-page {
		max-width: 900px;
		margin: 0 auto;
	}

	.search-header {
		margin-bottom: 2rem;
	}

	.back-link {
		color: #6366f1;
		text-decoration: none;
		font-size: 0.875rem;
	}

	h1 {
		margin: 1rem 0 0.5rem;
	}

	.query {
		color: #666;
		font-style: italic;
	}

	/* Status Cards */
	.status-card {
		text-align: center;
		padding: 3rem;
		background: #f9fafb;
		border-radius: 0.75rem;
		margin-bottom: 2rem;
	}

	.status-card.pending,
	.status-card.running {
		background: #eff6ff;
	}

	.status-card.failed {
		background: #fef2f2;
	}

	.status-card h2 {
		margin-bottom: 0.5rem;
	}

	.status-card p {
		color: #666;
		margin-bottom: 0.5rem;
	}

	.hint {
		font-size: 0.875rem;
		color: #9ca3af !important;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid #e5e7eb;
		border-top-color: #6366f1;
		border-radius: 50%;
		margin: 0 auto 1rem;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* Results */
	.results-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.5rem;
		gap: 1rem;
	}

	.summary {
		color: #666;
		flex: 1;
	}

	.results-grid {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.product-card {
		display: grid;
		grid-template-columns: auto 150px 1fr;
		gap: 1.5rem;
		padding: 1.5rem;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
		align-items: start;
	}

	.rank {
		font-size: 1.5rem;
		font-weight: bold;
		color: #6366f1;
		width: 2.5rem;
	}

	.product-image {
		width: 150px;
		height: 150px;
		object-fit: cover;
		border-radius: 0.5rem;
		background: #f3f4f6;
	}

	.product-image.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		color: #9ca3af;
		font-size: 0.875rem;
	}

	.product-info h3 {
		margin: 0 0 0.75rem;
		font-size: 1.125rem;
	}

	.price-row {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.price-current {
		font-size: 1.25rem;
		font-weight: 600;
		color: #059669;
	}

	.price-original {
		text-decoration: line-through;
		color: #9ca3af;
	}

	.discount {
		background: #dcfce7;
		color: #166534;
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.retailer {
		color: #6b7280;
		font-size: 0.875rem;
		margin-bottom: 0.75rem;
	}

	.match-reason {
		color: #374151;
		font-size: 0.875rem;
		line-height: 1.5;
		margin-bottom: 1rem;
	}

	.match-score {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.score-bar {
		height: 4px;
		background: #6366f1;
		border-radius: 2px;
		max-width: 100px;
	}

	.match-score span {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.btn-buy {
		display: inline-block;
		background: #6366f1;
		color: white;
		padding: 0.625rem 1.25rem;
		border-radius: 0.5rem;
		text-decoration: none;
		font-weight: 500;
		font-size: 0.875rem;
	}

	.btn-buy:hover {
		background: #5558e3;
	}

	.btn-primary {
		display: inline-block;
		background: #6366f1;
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		text-decoration: none;
		font-weight: 500;
		margin-top: 1rem;
	}

	.btn-secondary {
		background: white;
		border: 1px solid #e5e7eb;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		cursor: pointer;
		white-space: nowrap;
	}

	.btn-secondary:hover {
		background: #f9fafb;
	}

	.results-footer {
		margin-top: 2rem;
		padding-top: 1rem;
		border-top: 1px solid #e5e7eb;
		display: flex;
		justify-content: space-between;
		color: #9ca3af;
		font-size: 0.875rem;
	}

	/* Mobile */
	@media (max-width: 640px) {
		.product-card {
			grid-template-columns: 1fr;
		}

		.rank {
			position: absolute;
			top: 1rem;
			left: 1rem;
		}

		.product-card {
			position: relative;
			padding-top: 3rem;
		}

		.product-image {
			width: 100%;
			height: 200px;
		}
	}
</style>

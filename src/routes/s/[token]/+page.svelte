<script lang="ts">
	let { data } = $props();

	function formatPrice(cents: number): string {
		return `$${(cents / 100).toFixed(2)}`;
	}
</script>

<svelte:head>
	<title>Scout Results: {data.query}</title>
	<meta name="description" content="Curated deal results from Scout" />
</svelte:head>

<div class="share-page">
	<header class="share-header">
		<div class="branding">
			<a href="/" class="logo">Scout</a>
			<span class="tagline">Deal-hunting, done for you</span>
		</div>
		<h1>Search Results</h1>
		<p class="query">"{data.query}"</p>
	</header>

	<p class="summary">{data.results.search_summary}</p>

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

					<a href={item.url} target="_blank" rel="noopener" class="btn-buy">
						View Deal →
					</a>
				</div>
			</article>
		{/each}
	</div>

	<footer class="share-footer">
		<p>Results generated on {new Date(data.created_at).toLocaleDateString()}</p>
		<p class="cta">
			<a href="/auth/login">Create your own searches →</a>
		</p>
	</footer>
</div>

<style>
	.share-page {
		max-width: 900px;
		margin: 0 auto;
	}

	.share-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.branding {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.logo {
		font-size: 1.5rem;
		font-weight: bold;
		color: #6366f1;
		text-decoration: none;
	}

	.tagline {
		color: #9ca3af;
		font-size: 0.875rem;
	}

	h1 {
		margin-bottom: 0.5rem;
	}

	.query {
		color: #666;
		font-style: italic;
	}

	.summary {
		text-align: center;
		color: #666;
		margin-bottom: 2rem;
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

	.share-footer {
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid #e5e7eb;
		text-align: center;
		color: #9ca3af;
		font-size: 0.875rem;
	}

	.cta {
		margin-top: 1rem;
	}

	.cta a {
		color: #6366f1;
		text-decoration: none;
		font-weight: 500;
	}

	@media (max-width: 640px) {
		.product-card {
			grid-template-columns: 1fr;
			position: relative;
			padding-top: 3rem;
		}

		.rank {
			position: absolute;
			top: 1rem;
			left: 1rem;
		}

		.product-image {
			width: 100%;
			height: 200px;
		}
	}
</style>

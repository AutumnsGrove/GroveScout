<script lang="ts">
	import type { ProductResult } from '$lib/types';

	interface Props {
		product: ProductResult;
		showRank?: boolean;
	}

	let { product, showRank = true }: Props = $props();

	function formatPrice(cents: number): string {
		return `$${(cents / 100).toFixed(2)}`;
	}
</script>

<article class="product-card">
	{#if showRank && product.rank}
		<div class="rank">#{product.rank}</div>
	{/if}

	<div class="product-main">
		<div class="product-info">
			<h3 class="product-name">
				<a href={product.url} target="_blank" rel="noopener noreferrer">
					{product.name}
				</a>
			</h3>
			<p class="product-retailer">{product.retailer}</p>
		</div>

		<div class="product-pricing">
			<span class="price-current">{formatPrice(product.price_current)}</span>
			{#if product.price_original && product.price_original > product.price_current}
				<span class="price-original">{formatPrice(product.price_original)}</span>
				{#if product.discount_percent}
					<span class="discount">-{product.discount_percent}%</span>
				{/if}
			{/if}
		</div>
	</div>

	{#if product.match_reason}
		<div class="match-info">
			<div class="match-score">
				<div class="score-bar" style="width: {product.match_score}%"></div>
			</div>
			<p class="match-reason">{product.match_reason}</p>
		</div>
	{/if}

	<a href={product.url} target="_blank" rel="noopener noreferrer" class="product-link">
		View Deal
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
		</svg>
	</a>
</article>

<style>
	.product-card {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: 1.25rem;
		position: relative;
		transition: box-shadow var(--transition-normal);
	}

	.product-card:hover {
		box-shadow: var(--shadow-md);
	}

	.rank {
		position: absolute;
		top: -0.75rem;
		left: 1rem;
		background: var(--color-primary);
		color: white;
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-full);
	}

	.product-main {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.product-info {
		flex: 1;
		min-width: 0;
	}

	.product-name {
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 0.25rem;
	}

	.product-name a {
		color: var(--color-text);
		text-decoration: none;
	}

	.product-name a:hover {
		color: var(--color-primary);
	}

	.product-retailer {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.product-pricing {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
	}

	.price-current {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-success);
	}

	.price-original {
		font-size: 0.875rem;
		color: var(--color-text-muted);
		text-decoration: line-through;
	}

	.discount {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-error);
		background: var(--color-error-light);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
	}

	.match-info {
		margin-bottom: 1rem;
	}

	.match-score {
		height: 4px;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-full);
		margin-bottom: 0.5rem;
		overflow: hidden;
	}

	.score-bar {
		height: 100%;
		background: linear-gradient(90deg, var(--color-primary), var(--color-success));
		border-radius: var(--radius-full);
		transition: width 0.3s ease;
	}

	.match-reason {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		line-height: 1.5;
	}

	.product-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--color-primary);
		font-weight: 500;
		font-size: 0.875rem;
		text-decoration: none;
	}

	.product-link:hover {
		text-decoration: underline;
	}
</style>

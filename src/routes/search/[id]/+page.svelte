<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { Icons, ProductCard, StatusBadge, LoadingSkeleton } from '$lib/components/scout';
	import { GlassCarousel } from '@autumnsgrove/groveengine/ui';
	import type { CuratedResults } from '$lib/types';

	let { data } = $props();
	let copied = $state(false);

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

	async function copyShareLink() {
		if (data.shareToken) {
			await navigator.clipboard.writeText(`${window.location.origin}/s/${data.shareToken}`);
			copied = true;
			setTimeout(() => copied = false, 2000);
		}
	}

	function formatPrice(cents: number): string {
		return `$${(cents / 100).toFixed(2)}`;
	}

	function getSearchDuration(start: string, end: string | null): string {
		if (!end) return 'N/A';
		const ms = new Date(end).getTime() - new Date(start).getTime();
		const seconds = Math.floor(ms / 1000);
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}m ${remainingSeconds}s`;
	}

	function formatTokens(count: number): string {
		if (count >= 1000) {
			return `${(count / 1000).toFixed(1)}k`;
		}
		return count.toString();
	}

	const totalTokens = $derived((data.search.tokens_input || 0) + (data.search.tokens_output || 0));
</script>

<svelte:head>
	<title>Search Results - Scout</title>
</svelte:head>

<div class="scout-container py-8">
	<!-- Header -->
	<header class="mb-8">
		<a href="/dashboard" class="inline-flex items-center gap-1 text-sm text-grove-600 dark:text-grove-400 hover:underline mb-4">
			<Icons name="arrow-right" size="sm" class="rotate-180" />
			Back to dashboard
		</a>

		<div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
			<div>
				<div class="flex items-center gap-3 mb-2">
					<h1 class="text-display-sm text-bark dark:text-cream">Search Results</h1>
					<StatusBadge status={data.search.status} />
				</div>
				<p class="text-bark-500 dark:text-cream-500 italic">"{data.search.query}"</p>
			</div>

			{#if data.search.status === 'completed' && data.shareToken}
				<button onclick={copyShareLink} class="scout-btn-secondary">
					<Icons name={copied ? 'check' : 'share'} size="sm" />
					{copied ? 'Copied!' : 'Share Results'}
				</button>
			{/if}
		</div>
	</header>

	<!-- Status Cards -->
	{#if data.search.status === 'pending'}
		<div class="scout-card p-8 text-center mb-8 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
			<div class="w-16 h-16 mx-auto mb-4 relative">
				<div class="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-800"></div>
				<div class="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
			</div>
			<h2 class="text-heading-lg text-bark dark:text-cream mb-2">In queue...</h2>
			<p class="text-bark-500 dark:text-cream-500 max-w-md mx-auto">
				Your search is waiting to be processed. This usually takes less than a minute.
			</p>
		</div>
	{:else if data.search.status === 'running'}
		<div class="scout-card p-8 text-center mb-8 bg-scout-50 dark:bg-scout-900/20 border-scout-200 dark:border-scout-800">
			<div class="w-16 h-16 mx-auto mb-4 relative">
				<div class="absolute inset-0 rounded-full border-4 border-scout-200 dark:border-scout-800"></div>
				<div class="absolute inset-0 rounded-full border-4 border-scout-500 border-t-transparent animate-spin"></div>
				<Icons name="sparkles" size="lg" class="absolute inset-0 m-auto text-scout-500" />
			</div>
			<h2 class="text-heading-lg text-bark dark:text-cream mb-2">Scout is hunting...</h2>
			<p class="text-bark-500 dark:text-cream-500 max-w-md mx-auto mb-4">
				Our AI agents are searching dozens of sites for the perfect deals. This usually takes 2-3 minutes.
			</p>
			<p class="text-sm text-bark-400 dark:text-cream-500">
				Feel free to close this tab — we'll have results when you get back.
			</p>
		</div>

		<!-- Loading Skeletons -->
		<div class="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
			{#each Array(5) as _}
				<LoadingSkeleton variant="product" />
			{/each}
		</div>
	{:else if data.search.status === 'failed'}
		<div class="scout-card p-8 text-center mb-8 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
			<div class="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
				<Icons name="x" size="xl" class="text-red-500" />
			</div>
			<h2 class="text-heading-lg text-bark dark:text-cream mb-2">Search Failed</h2>
			<p class="text-bark-500 dark:text-cream-500 max-w-md mx-auto mb-4">
				{data.search.error_message || 'Something went wrong. No credits were charged.'}
			</p>
			{#if totalTokens > 0}
				<p class="text-sm text-bark-400 dark:text-cream-500 mb-6">
					AI tokens used: {formatTokens(totalTokens)} ({data.search.api_calls_count || 0} API calls)
				</p>
			{/if}
			<a href="/search/new" class="scout-btn-primary">
				<Icons name="refresh" size="sm" />
				Try Again
			</a>
		</div>
	{:else if data.search.status === 'completed' && data.results}
		<!-- Results Summary -->
		<div class="scout-card p-6 mb-8 bg-grove-50 dark:bg-grove-900/20 border-grove-200 dark:border-grove-800">
			<div class="flex items-start gap-4">
				<div class="w-12 h-12 bg-grove-100 dark:bg-grove-900/30 rounded-full flex items-center justify-center flex-shrink-0">
					<Icons name="check" size="lg" class="text-grove-600 dark:text-grove-400" />
				</div>
				<div>
					<h2 class="font-semibold text-bark dark:text-cream mb-1">Found {data.results.items.length} great matches!</h2>
					<p class="text-bark-500 dark:text-cream-500">{data.results.search_summary}</p>
				</div>
			</div>
		</div>

		<!-- Product Carousel -->
		<div class="mb-8">
			<GlassCarousel
				itemCount={data.results.items.length}
				showDots
				showArrows
				variant="frosted"
			>
				{#snippet item(index)}
					{@const product = data.results.items[index]}
					<ProductCard
						name={product.name}
						price={product.price_current}
						originalPrice={product.price_original}
						retailer={product.retailer}
						url={product.url}
						imageUrl={product.image_url}
						matchScore={product.match_score}
						matchReason={product.match_reason}
						{index}
					/>
				{/snippet}
			</GlassCarousel>
		</div>

		<!-- Results Footer -->
		<footer class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-cream-300 dark:border-bark-600 text-sm text-bark-400 dark:text-cream-500">
			<div class="flex flex-wrap items-center gap-4">
				<span class="flex items-center gap-1">
					<Icons name="clock" size="sm" />
					Completed in {getSearchDuration(data.search.created_at, data.search.completed_at)}
				</span>
				<span class="flex items-center gap-1">
					<Icons name="credits" size="sm" />
					Used {data.search.credits_used} credit{data.search.credits_used !== 1 ? 's' : ''}
				</span>
				{#if totalTokens > 0}
					<span class="flex items-center gap-1" title="Input: {formatTokens(data.search.tokens_input || 0)} | Output: {formatTokens(data.search.tokens_output || 0)}">
						<Icons name="sparkles" size="sm" />
						{formatTokens(totalTokens)} tokens ({data.search.api_calls_count || 0} API calls)
					</span>
				{/if}
			</div>
			<a href="/search/new" class="text-grove-600 dark:text-grove-400 hover:underline flex items-center gap-1">
				<Icons name="sparkles" size="sm" />
				Start another search
			</a>
		</footer>
	{:else}
		<div class="scout-card p-8 text-center">
			<h2 class="text-heading-lg text-bark dark:text-cream mb-2">No results</h2>
			<p class="text-bark-500 dark:text-cream-500">Something unexpected happened.</p>
		</div>
	{/if}
</div>

<script lang="ts">
	import Icons from './Icons.svelte';
	import ScoreBar from './ScoreBar.svelte';

	interface Props {
		name: string;
		price: number;
		originalPrice?: number;
		retailer: string;
		url: string;
		imageUrl?: string;
		matchScore?: number;
		matchReason?: string;
		index?: number;
		searchId?: string;
		productId?: string;
		onFeedback?: (type: 'up' | 'down') => void;
	}

	let {
		name,
		price,
		originalPrice,
		retailer,
		url,
		imageUrl,
		matchScore = 0,
		matchReason,
		index = 0,
		searchId,
		productId,
		onFeedback
	}: Props = $props();

	// Feedback state
	let feedbackGiven = $state<'up' | 'down' | null>(null);
	let isSubmittingFeedback = $state(false);

	const discount = $derived(
		originalPrice && originalPrice > price
			? Math.round(((originalPrice - price) / originalPrice) * 100)
			: 0
	);

	const formatPrice = (cents: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(cents / 100);
	};

	// Stagger animation delay based on index
	const animationDelay = $derived(`${index * 100}ms`);

	async function submitFeedback(type: 'up' | 'down') {
		if (feedbackGiven || isSubmittingFeedback) return;

		isSubmittingFeedback = true;

		try {
			// If we have searchId and productId, submit to API
			if (searchId && productId) {
				const response = await fetch('/api/feedback', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						search_id: searchId,
						product_id: productId,
						feedback_type: type,
						product_name: name,
						product_url: url
					})
				});

				if (!response.ok) {
					console.error('Failed to submit feedback');
				}
			}

			feedbackGiven = type;
			onFeedback?.(type);
		} catch (err) {
			console.error('Feedback submission error:', err);
		} finally {
			isSubmittingFeedback = false;
		}
	}
</script>

<article
	class="scout-product-card animate-deal-pop"
	style="animation-delay: {animationDelay}"
>
	<!-- Image Section -->
	<div class="scout-product-image relative">
		{#if imageUrl}
			<img src={imageUrl} alt={name} class="w-full h-full object-cover" loading="lazy" />
		{:else}
			<div class="flex flex-col items-center justify-center text-bark-300 dark:text-bark-600">
				<Icons name="shopping-bag" size="xl" />
				<span class="text-xs mt-2">No image</span>
			</div>
		{/if}

		<!-- Discount Badge -->
		{#if discount > 0}
			<div class="absolute top-3 left-3 scout-badge-deal text-sm font-bold px-2.5 py-1">
				{discount}% OFF
			</div>
		{/if}

		<!-- Retailer Badge -->
		<div class="absolute bottom-3 right-3 bg-white/90 dark:bg-bark-800/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-bark dark:text-cream">
			{retailer}
		</div>
	</div>

	<!-- Content Section -->
	<div class="scout-product-body">
		<h3 class="font-medium text-bark dark:text-cream mb-2 line-clamp-2 leading-snug">
			{name}
		</h3>

		<!-- Price -->
		<div class="flex items-baseline gap-2 mb-3">
			<span class="scout-price">{formatPrice(price)}</span>
			{#if originalPrice && originalPrice > price}
				<span class="scout-price-original">{formatPrice(originalPrice)}</span>
			{/if}
		</div>

		<!-- Match Score -->
		{#if matchScore > 0}
			<div class="mb-3">
				<ScoreBar score={matchScore} size="sm" />
			</div>
		{/if}

		<!-- Match Reason -->
		{#if matchReason}
			<p class="text-sm text-bark-500 dark:text-cream-500 mb-4 line-clamp-2">
				{matchReason}
			</p>
		{/if}

		<!-- Action Button -->
		<div class="mt-auto">
			<a
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				class="scout-btn-primary w-full text-sm"
			>
				View Deal
				<Icons name="external" size="sm" />
			</a>
		</div>

		<!-- Feedback Buttons -->
		<div class="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-cream-200 dark:border-bark-600">
			<span class="text-xs text-bark-400 dark:text-cream-500">Was this helpful?</span>
			<div class="flex gap-1">
				<button
					onclick={() => submitFeedback('up')}
					disabled={feedbackGiven !== null || isSubmittingFeedback}
					class="p-1.5 rounded-full transition-all {feedbackGiven === 'up' ? 'bg-grove-100 dark:bg-grove-900/30 text-grove-600 dark:text-grove-400' : 'hover:bg-grove-50 dark:hover:bg-grove-900/20 text-bark-400 dark:text-cream-500 hover:text-grove-600 dark:hover:text-grove-400'} disabled:opacity-50"
					title="Good match"
				>
					<Icons name="heart" size="sm" />
				</button>
				<button
					onclick={() => submitFeedback('down')}
					disabled={feedbackGiven !== null || isSubmittingFeedback}
					class="p-1.5 rounded-full transition-all {feedbackGiven === 'down' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-bark-400 dark:text-cream-500 hover:text-red-600 dark:hover:text-red-400'} disabled:opacity-50"
					title="Not a good match"
				>
					<Icons name="x" size="sm" />
				</button>
			</div>
			{#if feedbackGiven}
				<span class="text-xs text-grove-600 dark:text-grove-400">Thanks!</span>
			{/if}
		</div>
	</div>
</article>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>

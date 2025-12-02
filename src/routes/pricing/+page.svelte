<script lang="ts">
	import { page } from '$app/stores';
	import { Icons, PlanCard } from '$lib/components/scout';

	let { data } = $props();

	let isLoading = $state<string | null>(null);
	let error = $state<string | null>(null);

	const cancelled = $page.url.searchParams.get('checkout') === 'cancelled';

	interface ApiResponse {
		success?: boolean;
		data?: { url: string };
		error?: { message: string };
	}

	async function handleCheckout(priceId: string, mode: 'subscription' | 'payment') {
		isLoading = priceId;
		error = null;

		try {
			const response = await fetch('/api/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ priceId, mode })
			});

			const result: ApiResponse = await response.json();

			if (!response.ok) {
				throw new Error(result.error?.message || 'Checkout failed');
			}

			if (result.data?.url) {
				window.location.href = result.data.url;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			isLoading = null;
		}
	}

	const PRICE_IDS = {
		basic: 'price_basic_monthly',
		pro: 'price_pro_monthly',
		credits: 'price_credit_pack'
	};

	const faqs = [
		{ q: 'What counts as a search?', a: 'Each search request uses 1 credit. If we can\'t find results, you don\'t get charged.' },
		{ q: 'Do credits roll over?', a: 'Subscription credits reset monthly. Credit pack purchases never expire.' },
		{ q: 'Can I cancel anytime?', a: 'Yes! Cancel anytime from your settings. You\'ll keep access until your billing period ends.' },
		{ q: 'What payment methods?', a: 'We accept all major credit cards through Stripe.' }
	];
</script>

<svelte:head>
	<title>Pricing - Scout</title>
</svelte:head>

<div class="scout-container py-12">
	<!-- Header -->
	<header class="text-center max-w-2xl mx-auto mb-12">
		<h1 class="text-display text-bark dark:text-cream mb-4">Simple, transparent pricing</h1>
		<p class="text-body-lg text-bark-500 dark:text-cream-500">
			Start finding deals without the cognitive overload.
		</p>
	</header>

	<!-- Alerts -->
	{#if cancelled}
		<div class="max-w-md mx-auto mb-8 p-4 rounded-grove bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
			<div class="flex items-center gap-2 text-blue-700 dark:text-blue-300">
				<Icons name="x" size="sm" />
				<span>Checkout was cancelled. Feel free to try again when you're ready.</span>
			</div>
		</div>
	{/if}

	{#if error}
		<div class="max-w-md mx-auto mb-8 p-4 rounded-grove bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
			<div class="flex items-center gap-2 text-red-700 dark:text-red-300">
				<Icons name="x" size="sm" />
				<span>{error}</span>
			</div>
		</div>
	{/if}

	<!-- Plans Grid -->
	<div class="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
		<!-- Basic Plan -->
		<PlanCard
			name="Basic"
			price={10}
			searches={50}
			features={[
				'50 searches per month',
				'5 curated results per search',
				'Shareable result links',
				'Profile preferences',
				'Email notifications'
			]}
			priceId={PRICE_IDS.basic}
			onselect={(id) => data.user ? handleCheckout(id, 'subscription') : window.location.href = `/auth/login?redirect=/pricing`}
		/>

		<!-- Pro Plan -->
		<PlanCard
			name="Pro"
			price={25}
			searches={200}
			features={[
				'200 searches per month',
				'5 curated results per search',
				'Shareable result links',
				'Profile preferences',
				'Email notifications',
				'Priority processing'
			]}
			popular
			priceId={PRICE_IDS.pro}
			onselect={(id) => data.user ? handleCheckout(id, 'subscription') : window.location.href = `/auth/login?redirect=/pricing`}
		/>

		<!-- Credit Pack -->
		<div class="scout-card p-6 flex flex-col h-full">
			<div class="text-center mb-6">
				<h3 class="text-xl font-bold text-bark dark:text-cream mb-2">Credit Pack</h3>
				<div class="flex items-baseline justify-center gap-1">
					<span class="text-4xl font-bold text-bark dark:text-cream">$10</span>
					<span class="text-bark-400 dark:text-cream-500">one-time</span>
				</div>
				<p class="text-sm text-bark-400 dark:text-cream-500 mt-2">
					50 searches • Never expires
				</p>
			</div>

			<ul class="space-y-3 mb-6 flex-1">
				{#each ['50 additional searches', 'Never expires', 'Stack with subscription', 'Use anytime'] as feature}
					<li class="flex items-start gap-2 text-sm text-bark-600 dark:text-cream-400">
						<Icons name="check" size="sm" class="text-grove-500 mt-0.5 flex-shrink-0" />
						<span>{feature}</span>
					</li>
				{/each}
			</ul>

			{#if data.user}
				<button
					onclick={() => handleCheckout(PRICE_IDS.credits, 'payment')}
					disabled={isLoading !== null}
					class="scout-btn-secondary w-full"
				>
					{isLoading === PRICE_IDS.credits ? 'Loading...' : 'Buy Credits'}
				</button>
			{:else}
				<a href="/auth/login?redirect=/pricing" class="scout-btn-secondary w-full text-center">
					Sign up first
				</a>
			{/if}
		</div>
	</div>

	<!-- FAQ Section -->
	<section class="bg-cream-100 dark:bg-bark-800 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-16">
		<div class="max-w-4xl mx-auto">
			<h2 class="text-display-sm text-bark dark:text-cream text-center mb-12">Frequently Asked Questions</h2>
			<div class="grid sm:grid-cols-2 gap-8">
				{#each faqs as faq}
					<div class="scout-card p-6">
						<h3 class="font-semibold text-bark dark:text-cream mb-2">{faq.q}</h3>
						<p class="text-sm text-bark-500 dark:text-cream-500">{faq.a}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- CTA -->
	<section class="text-center py-16">
		<h2 class="text-heading-lg text-bark dark:text-cream mb-4">Ready to start finding deals?</h2>
		<p class="text-bark-500 dark:text-cream-500 mb-6">Join overwhelmed shoppers who've found peace with Scout.</p>
		{#if !data.user}
			<a href="/auth/login" class="scout-btn-primary text-lg px-8 py-4">
				<Icons name="sparkles" size="md" />
				Get Started Free
			</a>
		{:else}
			<a href="/search/new" class="scout-btn-primary text-lg px-8 py-4">
				<Icons name="sparkles" size="md" />
				Start Your First Search
			</a>
		{/if}
	</section>
</div>

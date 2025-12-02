<script lang="ts">
	import { Icons, SearchInput } from '$lib/components/scout';
	import { goto } from '$app/navigation';

	let { data } = $props();

	function handleSearch(query: string) {
		goto(`/search/new?q=${encodeURIComponent(query)}`);
	}

	const features = [
		{
			icon: 'sparkles' as const,
			title: 'AI-Powered Search',
			description: 'Our agents search dozens of sites simultaneously to find the best matches for your needs.'
		},
		{
			icon: 'user' as const,
			title: 'Personalized Results',
			description: 'Set your sizes, favorite retailers, and budget once. We remember for every search.'
		},
		{
			icon: 'zap' as const,
			title: 'Save Hours',
			description: 'No more tab overload. Get 5 curated products with direct links in minutes, not hours.'
		}
	];

	const audiences = [
		{ emoji: '🧠', label: 'ADHD brains', desc: 'who get lost in Amazon\'s infinite scroll' },
		{ emoji: '⏰', label: 'Busy people', desc: 'who want deals without the hunt' },
		{ emoji: '😵', label: 'Decision fatigue', desc: 'sufferers who need someone to narrow it down' },
		{ emoji: '✨', label: 'Vibe shoppers', desc: 'who know the feel but not the product' }
	];
</script>

<div class="landing-page">
	<!-- Hero Section -->
	<section class="scout-hero py-20 lg:py-32">
		<div class="scout-container">
			<div class="max-w-3xl mx-auto text-center">
				<h1 class="text-display-lg text-bark dark:text-cream mb-6 animate-fade-in-up">
					Stop drowning in<br />
					<span class="text-gradient-scout">shopping tabs.</span>
				</h1>
				<p class="text-body-lg text-bark-600 dark:text-cream-400 mb-8 max-w-2xl mx-auto animate-fade-in-up" style="animation-delay: 100ms">
					Tell Scout what you want. Walk away. Come back to 5 perfect products with links to buy.
				</p>

				<!-- Search Preview or CTA -->
				<div class="max-w-xl mx-auto animate-fade-in-up" style="animation-delay: 200ms">
					{#if data.user}
						<SearchInput onsubmit={handleSearch} placeholder="Try: Cozy sweater, earth tones, under $60" />
					{:else}
						<div class="flex flex-col sm:flex-row gap-4 justify-center">
							<a href="/auth/login" class="scout-btn-primary text-lg px-8 py-4">
								<Icons name="sparkles" size="md" />
								Get Started Free
							</a>
							<a href="/pricing" class="scout-btn-secondary text-lg px-8 py-4">
								View Pricing
							</a>
						</div>
					{/if}
				</div>

				<!-- Trust Indicators -->
				<div class="mt-12 flex items-center justify-center gap-8 text-sm text-bark-400 dark:text-cream-500 animate-fade-in" style="animation-delay: 400ms">
					<span class="flex items-center gap-2">
						<Icons name="check" size="sm" class="text-grove-500" />
						No credit card required
					</span>
					<span class="flex items-center gap-2">
						<Icons name="check" size="sm" class="text-grove-500" />
						5 free searches
					</span>
				</div>
			</div>
		</div>

		<!-- Background decoration -->
		<div class="absolute inset-0 bg-grid-pattern opacity-50 pointer-events-none"></div>
	</section>

	<!-- How It Works -->
	<section class="py-20 bg-white dark:bg-bark-800">
		<div class="scout-container">
			<div class="text-center mb-16">
				<h2 class="text-display-sm text-bark dark:text-cream mb-4">How Scout Works</h2>
				<p class="text-body-lg text-bark-500 dark:text-cream-500">Three simple steps to shopping freedom</p>
			</div>

			<div class="grid md:grid-cols-3 gap-8 lg:gap-12">
				{#each [
					{ step: 1, title: 'Tell us what you want', desc: '"Cozy sweater, earth tones, under $60"', icon: 'search' as const },
					{ step: 2, title: 'Walk away', desc: 'Our AI agents search the web while you do literally anything else.', icon: 'clock' as const },
					{ step: 3, title: 'Get curated results', desc: '5 perfect matches. Direct links. No infinite scrolling.', icon: 'star' as const }
				] as item, i}
					<div class="text-center group" style="animation-delay: {i * 100}ms">
						<div class="relative inline-block mb-6">
							<div class="w-20 h-20 bg-grove-100 dark:bg-grove-900/30 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-grove">
								<Icons name={item.icon} size="xl" class="text-grove-600 dark:text-grove-400" />
							</div>
							<div class="absolute -top-2 -right-2 w-8 h-8 bg-grove-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
								{item.step}
							</div>
						</div>
						<h3 class="text-heading text-bark dark:text-cream mb-2">{item.title}</h3>
						<p class="text-bark-500 dark:text-cream-500">{item.desc}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Features -->
	<section class="py-20 bg-cream-100 dark:bg-bark-900">
		<div class="scout-container">
			<div class="grid lg:grid-cols-3 gap-8">
				{#each features as feature, i}
					<div class="scout-card p-8 hover:shadow-grove-lg transition-shadow duration-grove" style="animation-delay: {i * 100}ms">
						<div class="w-14 h-14 bg-scout-100 dark:bg-scout-900/30 rounded-grove-lg flex items-center justify-center mb-6">
							<Icons name={feature.icon} size="lg" class="text-scout-600 dark:text-scout-400" />
						</div>
						<h3 class="text-heading text-bark dark:text-cream mb-3">{feature.title}</h3>
						<p class="text-bark-500 dark:text-cream-500">{feature.description}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Built For Section -->
	<section class="py-20 bg-white dark:bg-bark-800">
		<div class="scout-container">
			<div class="max-w-3xl mx-auto">
				<h2 class="text-display-sm text-bark dark:text-cream text-center mb-12">
					Built for overwhelmed shoppers
				</h2>

				<div class="space-y-4">
					{#each audiences as audience, i}
						<div
							class="flex items-center gap-4 p-4 rounded-grove-lg bg-cream-50 dark:bg-bark-700 hover:bg-cream-100 dark:hover:bg-bark-600 transition-colors"
							style="animation-delay: {i * 50}ms"
						>
							<span class="text-3xl">{audience.emoji}</span>
							<div>
								<span class="font-semibold text-bark dark:text-cream">{audience.label}</span>
								<span class="text-bark-500 dark:text-cream-500"> {audience.desc}</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<!-- Pricing Preview -->
	<section class="py-20 bg-gradient-to-br from-grove-500 to-scout-500">
		<div class="scout-container text-center">
			<h2 class="text-display-sm text-white mb-4">Simple, honest pricing</h2>
			<p class="text-grove-100 text-lg mb-8 max-w-xl mx-auto">
				Start free with 5 searches. Then from $10/month for 50 searches. No hidden fees.
			</p>
			<a href="/pricing" class="inline-flex items-center gap-2 bg-white text-grove-600 px-8 py-4 rounded-grove-lg font-semibold text-lg hover:bg-cream-100 transition-colors shadow-grove-lg">
				See All Plans
				<Icons name="arrow-right" size="md" />
			</a>
		</div>
	</section>

	<!-- Final CTA -->
	<section class="py-20 bg-cream dark:bg-bark-900">
		<div class="scout-container text-center">
			<h2 class="text-display-sm text-bark dark:text-cream mb-4">Ready to stop the tab chaos?</h2>
			<p class="text-bark-500 dark:text-cream-500 text-lg mb-8">
				Join overwhelmed shoppers who've found peace with Scout.
			</p>
			{#if data.user}
				<a href="/search/new" class="scout-btn-primary text-lg px-8 py-4">
					<Icons name="sparkles" size="md" />
					Start Your First Search
				</a>
			{:else}
				<a href="/auth/login" class="scout-btn-primary text-lg px-8 py-4">
					<Icons name="sparkles" size="md" />
					Get Started Free
				</a>
			{/if}
		</div>
	</section>
</div>

<style>
	.landing-page {
		margin: calc(-1 * var(--header-height, 0)) 0 0 0;
	}

	.scout-hero {
		position: relative;
		padding-top: calc(var(--header-height, 4rem) + 5rem);
	}
</style>

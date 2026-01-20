<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { Icons, SearchInput, CreditBalance } from '$lib/components/scout';
	// Season constants - define locally since groveengine types not fully exported
	type RegularSeason = 'spring' | 'summer' | 'autumn' | 'winter';
	const REGULAR_SEASONS: readonly RegularSeason[] = ['spring', 'summer', 'autumn', 'winter'];
	const SEASON_LABELS: Record<RegularSeason, string> = {
		spring: 'Spring',
		summer: 'Summer',
		autumn: 'Autumn',
		winter: 'Winter'
	};
	const SEASON_ICONS: Record<RegularSeason, string> = {
		spring: '🌸',
		summer: '☀️',
		autumn: '🍂',
		winter: '❄️'
	};

	let { data } = $props();

	let query = $state('');
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);
	let advanced = $state(false);
	let searchProvider = $state<'brave' | 'tavily'>('brave');
	let selectedSeason = $state<RegularSeason | null>(null);

	// Check for pre-filled query from URL
	onMount(() => {
		const urlQuery = $page.url.searchParams.get('q');
		if (urlQuery) {
			query = urlQuery;
		}
	});

	interface ApiResponse {
		success?: boolean;
		data?: { id: string };
		error?: { message: string };
	}

	async function handleSubmit(value: string) {
		if (!value.trim() || isSubmitting) return;

		isSubmitting = true;
		error = null;

		const endpoint = advanced ? '/api/search/advanced' : '/api/search';

		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: value.trim(),
					searchProvider,
					season: selectedSeason
				})
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
			isSubmitting = false;
		}
	}

	const examples = [
		{ query: 'Wireless earbuds, good for running, under $100', icon: '🎧' },
		{ query: 'Cozy blanket for the couch, oversized, soft material', icon: '🛋️' },
		{ query: 'Standing desk converter, under $200, good reviews', icon: '🖥️' },
		{ query: 'Birthday gift for a coffee lover, $30-50 budget', icon: '☕' }
	];
</script>

<svelte:head>
	<title>New Search - Scout</title>
</svelte:head>

<div class="min-h-[calc(100vh-16rem)] flex items-center justify-center py-12">
	<div class="scout-container max-w-2xl">
		<!-- Header -->
		<div class="text-center mb-8">
			<div class="inline-flex items-center justify-center w-16 h-16 bg-grove-100 dark:bg-grove-900/30 rounded-full mb-4">
				<Icons name="sparkles" size="xl" class="text-grove-600 dark:text-grove-400" />
			</div>
			<h1 class="text-display-sm text-bark dark:text-cream mb-2">What are you looking for?</h1>
			<p class="text-bark-500 dark:text-cream-500">
				Describe what you want. Be as specific or vague as you like.
			</p>
		</div>

		<!-- Search Form -->
		<div class="scout-card p-6 mb-6">
			<SearchInput
				bind:value={query}
				loading={isSubmitting}
				onsubmit={handleSubmit}
				autofocus
				placeholder="Example: Cozy oversized sweater, earth tones, under $60"
			/>

			{#if error}
				<div class="mt-4 p-4 rounded-grove bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
					<div class="flex items-center gap-2 text-red-700 dark:text-red-300">
						<Icons name="x" size="sm" />
						<span class="text-sm">{error}</span>
					</div>
				</div>
			{/if}

			<div class="mt-4 flex items-center justify-between text-sm text-bark-400 dark:text-cream-500">
				<span class="flex items-center gap-1">
					<Icons name="credits" size="sm" />
					Uses 1 credit
				</span>
				<span class="flex items-center gap-1">
					<Icons name="clock" size="sm" />
					{advanced ? 'Results in 5-10 min (multi‑batch)' : 'Results in 2-3 min'}
				</span>
			</div>

			<!-- Search Provider Selector -->
			<div class="mt-4 pt-4 border-t border-cream-300 dark:border-bark-600">
				<label class="block text-sm font-medium text-bark-600 dark:text-cream-400 mb-2">
					Search Engine
				</label>
				<div class="flex gap-3">
					<label class="flex items-center gap-2 cursor-pointer">
						<input
							type="radio"
							name="searchProvider"
							value="brave"
							bind:group={searchProvider}
							class="border-cream-400 dark:border-bark-500 text-grove-600 focus:ring-grove-500"
						/>
						<span class="text-sm text-bark-600 dark:text-cream-400">Brave Search</span>
					</label>
					<label class="flex items-center gap-2 cursor-pointer">
						<input
							type="radio"
							name="searchProvider"
							value="tavily"
							bind:group={searchProvider}
							class="border-cream-400 dark:border-bark-500 text-grove-600 focus:ring-grove-500"
						/>
						<span class="text-sm text-bark-600 dark:text-cream-400">Tavily</span>
					</label>
				</div>
				<p class="text-xs text-bark-400 dark:text-cream-500 mt-1">
					{searchProvider === 'brave'
						? 'Brave Search with comprehensive image search'
						: 'Tavily AI-optimized search for better product extraction'}
				</p>
			</div>

			<!-- Season Context Selector -->
			<div class="mt-4 pt-4 border-t border-cream-300 dark:border-bark-600">
				<label class="block text-sm font-medium text-bark-600 dark:text-cream-400 mb-2">
					Season Context <span class="text-bark-400 dark:text-cream-500 font-normal">(optional)</span>
				</label>
				<div class="flex flex-wrap gap-2">
					{#each REGULAR_SEASONS as season}
						<button
							type="button"
							onclick={() => selectedSeason = selectedSeason === season ? null : season}
							class="px-3 py-1.5 rounded-full text-sm transition-all flex items-center gap-1.5
								{selectedSeason === season
									? 'bg-grove-500 text-white shadow-sm'
									: 'bg-cream-200 dark:bg-bark-700 text-bark-600 dark:text-cream-400 hover:bg-cream-300 dark:hover:bg-bark-600'}"
						>
							<span>{SEASON_ICONS[season]}</span>
							<span>{SEASON_LABELS[season]}</span>
						</button>
					{/each}
				</div>
				<p class="text-xs text-bark-400 dark:text-cream-500 mt-1">
					Help Scout find seasonally-appropriate products
				</p>
			</div>

			<!-- Advanced search toggle -->
			<div class="mt-4 pt-4 border-t border-cream-300 dark:border-bark-600">
				<label class="flex items-center gap-2 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={advanced}
						class="rounded-grove border-cream-400 dark:border-bark-500 text-grove-600 focus:ring-grove-500"
					/>
					<span class="text-sm text-bark-600 dark:text-cream-400">
						Advanced search (multi‑batch AI orchestration)
					</span>
				</label>
				<p class="text-xs text-bark-400 dark:text-cream-500 mt-1 ml-6">
					Uses Durable Objects for iterative refinement, follow‑up questions, and better results.
				</p>
			</div>
		</div>

		<!-- Credit Balance -->
		{#if data.credits !== undefined}
			<div class="flex justify-center mb-8">
				<CreditBalance credits={data.credits} variant="default" />
			</div>
		{/if}

		<!-- Example Searches -->
		<div class="border-t border-cream-300 dark:border-bark-600 pt-8">
			<h3 class="text-sm font-medium text-bark-400 dark:text-cream-500 uppercase tracking-wider mb-4 text-center">
				Try an example
			</h3>
			<div class="grid sm:grid-cols-2 gap-3">
				{#each examples as example}
					<button
						type="button"
						onclick={() => query = example.query}
						class="scout-card p-4 text-left hover:shadow-grove-md transition-all duration-grove group"
					>
						<div class="flex items-start gap-3">
							<span class="text-2xl">{example.icon}</span>
							<span class="text-sm text-bark-600 dark:text-cream-400 group-hover:text-grove-600 dark:group-hover:text-grove-400 transition-colors">
								"{example.query}"
							</span>
						</div>
					</button>
				{/each}
			</div>
		</div>
	</div>
</div>

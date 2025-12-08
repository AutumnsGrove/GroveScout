<script lang="ts">
	import { Icons, CreditBalance, SearchCard, EmptyState } from '$lib/components/scout';

	let { data } = $props();

	// Pagination state
	let displayedSearches = $state(data.searches.slice(0, 5));
	let hasMore = $derived(displayedSearches.length < data.searches.length);
	let isLoadingMore = $state(false);

	function loadMore() {
		isLoadingMore = true;
		// Simulate loading delay for UX
		setTimeout(() => {
			const currentCount = displayedSearches.length;
			displayedSearches = data.searches.slice(0, currentCount + 5);
			isLoadingMore = false;
		}, 300);
	}
</script>

<svelte:head>
	<title>Dashboard - Scout</title>
</svelte:head>

<div class="scout-container py-8">
	<!-- Header -->
	<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-8 border-b border-cream-300 dark:border-bark-600">
		<div>
			<h1 class="text-display-sm text-bark dark:text-cream mb-1">
				Welcome back{data.profile?.display_name ? `, ${data.profile.display_name}` : ''}!
			</h1>
			<p class="text-bark-500 dark:text-cream-500">
				Ready to find some deals?
			</p>
		</div>
		<div class="flex items-center gap-4">
			<CreditBalance credits={data.credits} variant="compact" />
			<a href="/search/new" class="scout-btn-primary">
				<Icons name="sparkles" size="sm" />
				New Search
			</a>
		</div>
	</header>

	<!-- Profile Setup Prompt -->
	{#if !data.profile?.style_notes}
		<div class="scout-card p-6 mb-8 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
			<div class="flex items-start gap-4">
				<div class="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center flex-shrink-0">
					<Icons name="user" size="md" class="text-amber-600 dark:text-amber-400" />
				</div>
				<div class="flex-1">
					<h3 class="font-semibold text-bark dark:text-cream mb-1">Complete your profile</h3>
					<p class="text-sm text-bark-600 dark:text-cream-400 mb-3">
						Add your sizes, color preferences, and style notes to get better personalized results.
					</p>
					<a href="/profile" class="scout-btn-secondary text-sm">
						<Icons name="user" size="sm" />
						Set up profile
					</a>
				</div>
			</div>
		</div>
	{/if}

	<!-- Stats Overview -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
		<div class="scout-card p-4 text-center">
			<div class="scout-stat-value">{data.credits}</div>
			<div class="scout-stat-label">Credits Left</div>
		</div>
		<div class="scout-card p-4 text-center">
			<div class="scout-stat-value">{data.searches.length}</div>
			<div class="scout-stat-label">Total Searches</div>
		</div>
		<div class="scout-card p-4 text-center">
			<div class="scout-stat-value">{data.searches.filter(s => s.status === 'completed').length}</div>
			<div class="scout-stat-label">Completed</div>
		</div>
		<div class="scout-card p-4 text-center">
			<div class="scout-stat-value">{data.searches.filter(s => s.status === 'running' || s.status === 'pending').length}</div>
			<div class="scout-stat-label">In Progress</div>
		</div>
	</div>

	<!-- Recent Searches -->
	<section>
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-heading-lg text-bark dark:text-cream">Recent Searches</h2>
			{#if data.searches.length > 0}
				<a href="/search/new" class="text-sm text-grove-600 dark:text-grove-400 hover:underline flex items-center gap-1">
					<Icons name="sparkles" size="sm" />
					New search
				</a>
			{/if}
		</div>

		{#if data.searches.length === 0}
			<EmptyState
				icon="search"
				title="No searches yet"
				description="Start your first search to find amazing deals tailored to your preferences."
			>
				{#snippet action()}
					<a href="/search/new" class="scout-btn-primary">
						<Icons name="sparkles" size="sm" />
						Start Searching
					</a>
				{/snippet}
			</EmptyState>
		{:else}
			<div class="grid gap-4">
				{#each displayedSearches as search}
					<SearchCard
						id={search.id}
						query={search.query_freeform || 'Structured search'}
						status={search.status}
						createdAt={search.created_at}
						resultCount={5}
					/>
				{/each}
			</div>

			<!-- Load More Button -->
			{#if hasMore}
				<div class="mt-6 text-center">
					<button
						onclick={loadMore}
						disabled={isLoadingMore}
						class="scout-btn-secondary"
					>
						{#if isLoadingMore}
							<Icons name="loader" size="sm" class="animate-spin" />
							Loading...
						{:else}
							<Icons name="arrow-right" size="sm" class="rotate-90" />
							Load More ({data.searches.length - displayedSearches.length} remaining)
						{/if}
					</button>
				</div>
			{/if}
		{/if}
	</section>
</div>

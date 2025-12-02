<script lang="ts">
	import { Icons } from '$lib/components/scout';

	let { data } = $props();

	// Form state
	let displayName = $state(data.profile.display_name);
	let shirtSize = $state(data.profile.sizes.shirt ?? '');
	let pantsSize = $state(data.profile.sizes.pants ?? '');
	let shoeSize = $state(data.profile.sizes.shoes ?? '');
	let colorFavorites = $state(data.profile.color_preferences.favorites.join(', '));
	let colorAvoid = $state(data.profile.color_preferences.avoid.join(', '));
	let budgetMin = $state(data.profile.budget_min?.toString() ?? '');
	let budgetMax = $state(data.profile.budget_max?.toString() ?? '');
	let favoriteRetailers = $state(data.profile.favorite_retailers.join(', '));
	let excludedRetailers = $state(data.profile.excluded_retailers.join(', '));
	let styleNotes = $state(data.profile.style_notes);

	let isSaving = $state(false);
	let error = $state<string | null>(null);
	let success = $state(false);

	interface ApiResponse {
		success?: boolean;
		error?: { message: string };
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		isSaving = true;
		error = null;
		success = false;

		const payload = {
			display_name: displayName || undefined,
			sizes: {
				shirt: shirtSize || undefined,
				pants: pantsSize || undefined,
				shoes: shoeSize || undefined
			},
			color_preferences: {
				favorites: colorFavorites ? colorFavorites.split(',').map((s) => s.trim()).filter(Boolean) : [],
				avoid: colorAvoid ? colorAvoid.split(',').map((s) => s.trim()).filter(Boolean) : []
			},
			budget_min: budgetMin ? Math.round(parseFloat(budgetMin) * 100) : undefined,
			budget_max: budgetMax ? Math.round(parseFloat(budgetMax) * 100) : undefined,
			favorite_retailers: favoriteRetailers ? favoriteRetailers.split(',').map((s) => s.trim()).filter(Boolean) : [],
			excluded_retailers: excludedRetailers ? excludedRetailers.split(',').map((s) => s.trim()).filter(Boolean) : [],
			style_notes: styleNotes || undefined
		};

		try {
			const response = await fetch('/api/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				const result: ApiResponse = await response.json();
				throw new Error(result.error?.message || 'Failed to save profile');
			}

			success = true;
			setTimeout(() => (success = false), 3000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			isSaving = false;
		}
	}
</script>

<svelte:head>
	<title>Profile - Scout</title>
</svelte:head>

<div class="scout-container py-8 max-w-2xl">
	<!-- Header -->
	<header class="mb-8">
		<a href="/dashboard" class="inline-flex items-center gap-1 text-sm text-grove-600 dark:text-grove-400 hover:underline mb-4">
			<Icons name="arrow-right" size="sm" class="rotate-180" />
			Back to dashboard
		</a>
		<h1 class="text-display-sm text-bark dark:text-cream mb-2">Your Profile</h1>
		<p class="text-bark-500 dark:text-cream-500">Help Scout find better deals by telling us about your preferences.</p>
	</header>

	<form onsubmit={handleSubmit} class="space-y-8">
		<!-- Basic Info -->
		<section class="scout-card p-6">
			<div class="flex items-center gap-3 mb-4">
				<div class="w-10 h-10 bg-grove-100 dark:bg-grove-900/30 rounded-full flex items-center justify-center">
					<Icons name="user" size="md" class="text-grove-600 dark:text-grove-400" />
				</div>
				<h2 class="text-heading text-bark dark:text-cream">Basic Info</h2>
			</div>
			<div>
				<label for="displayName" class="block text-sm font-medium text-bark-600 dark:text-cream-400 mb-1">Display Name</label>
				<input type="text" id="displayName" bind:value={displayName} placeholder="How should we call you?" class="scout-input" />
			</div>
		</section>

		<!-- Sizes -->
		<section class="scout-card p-6">
			<div class="flex items-center gap-3 mb-2">
				<div class="w-10 h-10 bg-scout-100 dark:bg-scout-900/30 rounded-full flex items-center justify-center">
					<Icons name="star" size="md" class="text-scout-600 dark:text-scout-400" />
				</div>
				<h2 class="text-heading text-bark dark:text-cream">Sizes</h2>
			</div>
			<p class="text-sm text-bark-400 dark:text-cream-500 mb-4 ml-13">These help us filter results to your fit.</p>
			<div class="grid sm:grid-cols-3 gap-4">
				<div>
					<label for="shirtSize" class="block text-sm font-medium text-bark-600 dark:text-cream-400 mb-1">Shirt/Top</label>
					<input type="text" id="shirtSize" bind:value={shirtSize} placeholder="e.g., M, L, XL" class="scout-input" />
				</div>
				<div>
					<label for="pantsSize" class="block text-sm font-medium text-bark-600 dark:text-cream-400 mb-1">Pants</label>
					<input type="text" id="pantsSize" bind:value={pantsSize} placeholder="e.g., 32x30" class="scout-input" />
				</div>
				<div>
					<label for="shoeSize" class="block text-sm font-medium text-bark-600 dark:text-cream-400 mb-1">Shoes</label>
					<input type="text" id="shoeSize" bind:value={shoeSize} placeholder="e.g., 10.5 US" class="scout-input" />
				</div>
			</div>
		</section>

		<!-- Color Preferences -->
		<section class="scout-card p-6">
			<div class="flex items-center gap-3 mb-4">
				<div class="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center">
					<Icons name="heart" size="md" class="text-pink-600 dark:text-pink-400" />
				</div>
				<h2 class="text-heading text-bark dark:text-cream">Color Preferences</h2>
			</div>
			<div class="space-y-4">
				<div>
					<label for="colorFavorites" class="block text-sm font-medium text-bark-600 dark:text-cream-400 mb-1">Favorite Colors</label>
					<input type="text" id="colorFavorites" bind:value={colorFavorites} placeholder="e.g., blue, earth tones, forest green" class="scout-input" />
					<span class="text-xs text-bark-400 dark:text-cream-500 mt-1 block">Comma separated</span>
				</div>
				<div>
					<label for="colorAvoid" class="block text-sm font-medium text-bark-600 dark:text-cream-400 mb-1">Colors to Avoid</label>
					<input type="text" id="colorAvoid" bind:value={colorAvoid} placeholder="e.g., neon, hot pink" class="scout-input" />
					<span class="text-xs text-bark-400 dark:text-cream-500 mt-1 block">Comma separated</span>
				</div>
			</div>
		</section>

		<!-- Budget -->
		<section class="scout-card p-6">
			<div class="flex items-center gap-3 mb-2">
				<div class="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
					<Icons name="credits" size="md" class="text-amber-600 dark:text-amber-400" />
				</div>
				<h2 class="text-heading text-bark dark:text-cream">Budget</h2>
			</div>
			<p class="text-sm text-bark-400 dark:text-cream-500 mb-4 ml-13">Default price range for your searches.</p>
			<div class="grid sm:grid-cols-2 gap-4">
				<div>
					<label for="budgetMin" class="block text-sm font-medium text-bark-600 dark:text-cream-400 mb-1">Minimum ($)</label>
					<input type="number" id="budgetMin" bind:value={budgetMin} min="0" step="1" placeholder="0" class="scout-input" />
				</div>
				<div>
					<label for="budgetMax" class="block text-sm font-medium text-bark-600 dark:text-cream-400 mb-1">Maximum ($)</label>
					<input type="number" id="budgetMax" bind:value={budgetMax} min="0" step="1" placeholder="100" class="scout-input" />
				</div>
			</div>
		</section>

		<!-- Retailers -->
		<section class="scout-card p-6">
			<div class="flex items-center gap-3 mb-4">
				<div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
					<Icons name="shopping-bag" size="md" class="text-blue-600 dark:text-blue-400" />
				</div>
				<h2 class="text-heading text-bark dark:text-cream">Retailers</h2>
			</div>
			<div class="space-y-4">
				<div>
					<label for="favoriteRetailers" class="block text-sm font-medium text-bark-600 dark:text-cream-400 mb-1">Favorite Retailers</label>
					<input type="text" id="favoriteRetailers" bind:value={favoriteRetailers} placeholder="e.g., rei.com, amazon.com" class="scout-input" />
					<span class="text-xs text-bark-400 dark:text-cream-500 mt-1 block">We'll prioritize these stores. Comma separated.</span>
				</div>
				<div>
					<label for="excludedRetailers" class="block text-sm font-medium text-bark-600 dark:text-cream-400 mb-1">Retailers to Exclude</label>
					<input type="text" id="excludedRetailers" bind:value={excludedRetailers} placeholder="e.g., wish.com" class="scout-input" />
					<span class="text-xs text-bark-400 dark:text-cream-500 mt-1 block">We'll skip these entirely. Comma separated.</span>
				</div>
			</div>
		</section>

		<!-- Style Notes -->
		<section class="scout-card p-6">
			<div class="flex items-center gap-3 mb-4">
				<div class="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
					<Icons name="sparkles" size="md" class="text-purple-600 dark:text-purple-400" />
				</div>
				<h2 class="text-heading text-bark dark:text-cream">Style Notes</h2>
			</div>
			<div>
				<label for="styleNotes" class="block text-sm font-medium text-bark-600 dark:text-cream-400 mb-1">Describe Your Style</label>
				<textarea id="styleNotes" bind:value={styleNotes} rows="4" placeholder="e.g., I prefer minimalist, earth-tone aesthetics. Comfort over fashion. I like outdoor/hiking gear even for everyday wear." class="scout-input resize-y"></textarea>
				<span class="text-xs text-bark-400 dark:text-cream-500 mt-1 block">The more detail, the better Scout can match your vibe.</span>
			</div>
		</section>

		<!-- Alerts -->
		{#if error}
			<div class="p-4 rounded-grove bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
				<div class="flex items-center gap-2 text-red-700 dark:text-red-300">
					<Icons name="x" size="sm" />
					<span>{error}</span>
				</div>
			</div>
		{/if}

		{#if success}
			<div class="p-4 rounded-grove bg-grove-50 dark:bg-grove-900/20 border border-grove-200 dark:border-grove-800">
				<div class="flex items-center gap-2 text-grove-700 dark:text-grove-300">
					<Icons name="check" size="sm" />
					<span>Profile saved successfully!</span>
				</div>
			</div>
		{/if}

		<!-- Actions -->
		<div class="flex items-center gap-4">
			<button type="submit" disabled={isSaving} class="scout-btn-primary">
				{#if isSaving}
					<Icons name="loader" size="sm" class="animate-spin" />
					Saving...
				{:else}
					<Icons name="check" size="sm" />
					Save Profile
				{/if}
			</button>
			<a href="/dashboard" class="text-bark-500 dark:text-cream-500 hover:text-grove-600 dark:hover:text-grove-400 transition-colors">
				Cancel
			</a>
		</div>
	</form>
</div>

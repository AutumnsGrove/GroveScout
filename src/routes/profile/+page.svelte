<script lang="ts">
	import { goto } from '$app/navigation';

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

<div class="profile-page">
	<header>
		<h1>Your Profile</h1>
		<p class="subtitle">Help Scout find better deals by telling us about your preferences.</p>
	</header>

	<form onsubmit={handleSubmit}>
		<section class="form-section">
			<h2>Basic Info</h2>
			<div class="form-group">
				<label for="displayName">Display Name</label>
				<input type="text" id="displayName" bind:value={displayName} placeholder="How should we call you?" />
			</div>
		</section>

		<section class="form-section">
			<h2>Sizes</h2>
			<p class="section-hint">These help us filter results to your fit.</p>
			<div class="form-row">
				<div class="form-group">
					<label for="shirtSize">Shirt/Top</label>
					<input type="text" id="shirtSize" bind:value={shirtSize} placeholder="e.g., M, L, XL" />
				</div>
				<div class="form-group">
					<label for="pantsSize">Pants</label>
					<input type="text" id="pantsSize" bind:value={pantsSize} placeholder="e.g., 32x30" />
				</div>
				<div class="form-group">
					<label for="shoeSize">Shoes</label>
					<input type="text" id="shoeSize" bind:value={shoeSize} placeholder="e.g., 10.5 US" />
				</div>
			</div>
		</section>

		<section class="form-section">
			<h2>Color Preferences</h2>
			<div class="form-group">
				<label for="colorFavorites">Favorite Colors</label>
				<input type="text" id="colorFavorites" bind:value={colorFavorites} placeholder="e.g., blue, earth tones, forest green" />
				<span class="hint">Comma separated</span>
			</div>
			<div class="form-group">
				<label for="colorAvoid">Colors to Avoid</label>
				<input type="text" id="colorAvoid" bind:value={colorAvoid} placeholder="e.g., neon, hot pink" />
				<span class="hint">Comma separated</span>
			</div>
		</section>

		<section class="form-section">
			<h2>Budget</h2>
			<p class="section-hint">Default price range for your searches.</p>
			<div class="form-row">
				<div class="form-group">
					<label for="budgetMin">Minimum ($)</label>
					<input type="number" id="budgetMin" bind:value={budgetMin} min="0" step="1" placeholder="0" />
				</div>
				<div class="form-group">
					<label for="budgetMax">Maximum ($)</label>
					<input type="number" id="budgetMax" bind:value={budgetMax} min="0" step="1" placeholder="100" />
				</div>
			</div>
		</section>

		<section class="form-section">
			<h2>Retailers</h2>
			<div class="form-group">
				<label for="favoriteRetailers">Favorite Retailers</label>
				<input type="text" id="favoriteRetailers" bind:value={favoriteRetailers} placeholder="e.g., rei.com, amazon.com" />
				<span class="hint">We'll prioritize these stores. Comma separated.</span>
			</div>
			<div class="form-group">
				<label for="excludedRetailers">Retailers to Exclude</label>
				<input type="text" id="excludedRetailers" bind:value={excludedRetailers} placeholder="e.g., wish.com" />
				<span class="hint">We'll skip these entirely. Comma separated.</span>
			</div>
		</section>

		<section class="form-section">
			<h2>Style Notes</h2>
			<div class="form-group">
				<label for="styleNotes">Describe Your Style</label>
				<textarea id="styleNotes" bind:value={styleNotes} rows="4" placeholder="e.g., I prefer minimalist, earth-tone aesthetics. Comfort over fashion. I like outdoor/hiking gear even for everyday wear."></textarea>
				<span class="hint">The more detail, the better Scout can match your vibe.</span>
			</div>
		</section>

		{#if error}
			<div class="alert error">{error}</div>
		{/if}

		{#if success}
			<div class="alert success">Profile saved!</div>
		{/if}

		<div class="form-actions">
			<button type="submit" disabled={isSaving}>
				{isSaving ? 'Saving...' : 'Save Profile'}
			</button>
			<a href="/dashboard" class="btn-secondary">Back to Dashboard</a>
		</div>
	</form>
</div>

<style>
	.profile-page {
		max-width: 600px;
		margin: 0 auto;
	}

	header {
		margin-bottom: 2rem;
	}

	h1 {
		margin-bottom: 0.5rem;
	}

	.subtitle {
		color: #666;
	}

	.form-section {
		margin-bottom: 2rem;
		padding-bottom: 2rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.form-section h2 {
		font-size: 1.125rem;
		margin-bottom: 0.5rem;
	}

	.section-hint {
		color: #9ca3af;
		font-size: 0.875rem;
		margin-bottom: 1rem;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
	}

	label {
		display: block;
		font-weight: 500;
		margin-bottom: 0.375rem;
		font-size: 0.875rem;
	}

	input, textarea {
		width: 100%;
		padding: 0.625rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 1rem;
		font-family: inherit;
	}

	input:focus, textarea:focus {
		outline: none;
		border-color: #6366f1;
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
	}

	textarea {
		resize: vertical;
	}

	.hint {
		display: block;
		font-size: 0.75rem;
		color: #9ca3af;
		margin-top: 0.25rem;
	}

	.alert {
		padding: 0.75rem 1rem;
		border-radius: 0.375rem;
		margin-bottom: 1rem;
	}

	.alert.error {
		background: #fef2f2;
		color: #991b1b;
	}

	.alert.success {
		background: #f0fdf4;
		color: #166534;
	}

	.form-actions {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	button[type="submit"] {
		background: #6366f1;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
	}

	button[type="submit"]:hover:not(:disabled) {
		background: #5558e3;
	}

	button[type="submit"]:disabled {
		background: #9ca3af;
		cursor: not-allowed;
	}

	.btn-secondary {
		color: #666;
		text-decoration: none;
	}

	.btn-secondary:hover {
		color: #6366f1;
	}
</style>

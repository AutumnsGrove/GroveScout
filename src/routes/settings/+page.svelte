<script lang="ts">
	let { data } = $props();

	let isLoadingPortal = $state(false);
	let error = $state<string | null>(null);

	interface ApiResponse {
		success?: boolean;
		data?: { url: string };
		error?: { message: string };
	}

	async function openBillingPortal() {
		isLoadingPortal = true;
		error = null;

		try {
			const response = await fetch('/api/subscription', {
				method: 'POST'
			});

			const result: ApiResponse = await response.json();

			if (!response.ok) {
				throw new Error(result.error?.message || 'Failed to open billing portal');
			}

			if (result.data?.url) {
				window.location.href = result.data.url;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			isLoadingPortal = false;
		}
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<div class="settings-page">
	<h1>Settings</h1>

	{#if error}
		<div class="alert error">{error}</div>
	{/if}

	<section class="settings-section">
		<h2>Account</h2>
		<div class="setting-row">
			<div class="setting-label">Email</div>
			<div class="setting-value">{data.email}</div>
		</div>
	</section>

	<section class="settings-section">
		<h2>Subscription</h2>

		{#if data.subscription}
			<div class="subscription-card">
				<div class="plan-info">
					<span class="plan-name">{data.subscription.plan === 'pro' ? 'Pro' : 'Basic'} Plan</span>
					<span class="status status-{data.subscription.status}">{data.subscription.status}</span>
				</div>
				<p class="renewal">
					{#if data.subscription.status === 'active'}
						Renews on {formatDate(data.subscription.current_period_end)}
					{:else if data.subscription.status === 'canceled'}
						Access until {formatDate(data.subscription.current_period_end)}
					{:else}
						Status: {data.subscription.status}
					{/if}
				</p>
				<button class="btn-secondary" onclick={openBillingPortal} disabled={isLoadingPortal}>
					{isLoadingPortal ? 'Loading...' : 'Manage Subscription'}
				</button>
			</div>
		{:else}
			<div class="no-subscription">
				<p>You don't have an active subscription.</p>
				<a href="/pricing" class="btn-primary">View Plans</a>
			</div>
		{/if}
	</section>

	<section class="settings-section">
		<h2>Credits</h2>
		<div class="credits-display">
			<span class="credit-count">{data.credits}</span>
			<span class="credit-label">credits remaining</span>
		</div>
		<a href="/pricing" class="btn-secondary">Buy More Credits</a>
	</section>

	<section class="settings-section">
		<h2>Preferences</h2>
		<a href="/profile" class="btn-secondary">Edit Profile Preferences</a>
	</section>

	<section class="settings-section danger-zone">
		<h2>Account Actions</h2>
		<a href="/auth/logout" class="btn-danger">Sign Out</a>
	</section>
</div>

<style>
	.settings-page {
		max-width: 600px;
		margin: 0 auto;
	}

	h1 {
		margin-bottom: 2rem;
	}

	.alert {
		padding: 1rem;
		border-radius: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.alert.error {
		background: #fef2f2;
		color: #991b1b;
	}

	.settings-section {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.settings-section h2 {
		font-size: 1rem;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 1rem;
	}

	.setting-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.setting-label {
		color: #374151;
		font-weight: 500;
	}

	.setting-value {
		color: #6b7280;
	}

	.subscription-card {
		background: #f9fafb;
		border-radius: 0.5rem;
		padding: 1rem;
	}

	.plan-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.plan-name {
		font-weight: 600;
		font-size: 1.125rem;
	}

	.status {
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
	}

	.status-active {
		background: #d1fae5;
		color: #065f46;
	}

	.status-canceled {
		background: #fef3c7;
		color: #92400e;
	}

	.status-past_due {
		background: #fee2e2;
		color: #991b1b;
	}

	.renewal {
		color: #6b7280;
		font-size: 0.875rem;
		margin-bottom: 1rem;
	}

	.no-subscription {
		text-align: center;
		padding: 1rem;
	}

	.no-subscription p {
		color: #6b7280;
		margin-bottom: 1rem;
	}

	.credits-display {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.credit-count {
		font-size: 2rem;
		font-weight: 700;
		color: #6366f1;
	}

	.credit-label {
		color: #6b7280;
	}

	.btn-primary {
		display: inline-block;
		background: #6366f1;
		color: white;
		padding: 0.625rem 1.25rem;
		border-radius: 0.5rem;
		text-decoration: none;
		font-weight: 500;
	}

	.btn-secondary {
		display: inline-block;
		background: white;
		border: 1px solid #e5e7eb;
		color: #374151;
		padding: 0.625rem 1.25rem;
		border-radius: 0.5rem;
		text-decoration: none;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #f9fafb;
	}

	.btn-secondary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.danger-zone {
		border-color: #fecaca;
	}

	.btn-danger {
		display: inline-block;
		background: white;
		border: 1px solid #ef4444;
		color: #ef4444;
		padding: 0.625rem 1.25rem;
		border-radius: 0.5rem;
		text-decoration: none;
		font-weight: 500;
	}

	.btn-danger:hover {
		background: #fef2f2;
	}
</style>

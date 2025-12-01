<script lang="ts">
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let { data } = $props();

	let isLoadingPortal = $state(false);
	let isExporting = $state(false);
	let isDeleting = $state(false);
	let showDeleteConfirm = $state(false);
	let deleteConfirmText = $state('');
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);

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

	async function exportData() {
		isExporting = true;
		error = null;

		try {
			const response = await fetch('/api/account');

			if (!response.ok) {
				const result: ApiResponse = await response.json();
				throw new Error(result.error?.message || 'Failed to export data');
			}

			// Download the file
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `scout-data-export.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			success = 'Data exported successfully!';
			setTimeout(() => (success = null), 3000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			isExporting = false;
		}
	}

	async function deleteAccount() {
		if (deleteConfirmText !== 'DELETE') return;

		isDeleting = true;
		error = null;

		try {
			const response = await fetch('/api/account', {
				method: 'DELETE'
			});

			if (!response.ok) {
				const result: ApiResponse = await response.json();
				throw new Error(result.error?.message || 'Failed to delete account');
			}

			// Redirect to home after deletion
			window.location.href = '/?deleted=true';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
			isDeleting = false;
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

	{#if success}
		<div class="alert success">{success}</div>
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
		<h2>Appearance</h2>
		<ThemeToggle />
	</section>

	<section class="settings-section">
		<h2>Preferences</h2>
		<a href="/profile" class="btn-secondary">Edit Profile Preferences</a>
	</section>

	<section class="settings-section">
		<h2>Data & Privacy</h2>
		<p class="section-description">Export or delete your account data.</p>
		<div class="action-buttons">
			<button class="btn-secondary" onclick={exportData} disabled={isExporting}>
				{isExporting ? 'Exporting...' : 'Export My Data'}
			</button>
		</div>
	</section>

	<section class="settings-section danger-zone">
		<h2>Danger Zone</h2>
		<div class="action-buttons">
			<a href="/auth/logout" class="btn-secondary">Sign Out</a>
			<button class="btn-danger" onclick={() => (showDeleteConfirm = true)}>
				Delete Account
			</button>
		</div>
	</section>
</div>

{#if showDeleteConfirm}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-overlay" onclick={() => (showDeleteConfirm = false)} role="presentation">
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<h2>Delete Account</h2>
			<p class="modal-warning">
				This action is <strong>permanent</strong> and cannot be undone. All your data including searches, credits, and preferences will be permanently deleted.
			</p>
			<p class="modal-instruction">
				Type <strong>DELETE</strong> to confirm:
			</p>
			<input
				type="text"
				class="input"
				bind:value={deleteConfirmText}
				placeholder="Type DELETE"
			/>
			<div class="modal-actions">
				<button class="btn-secondary" onclick={() => (showDeleteConfirm = false)}>
					Cancel
				</button>
				<button
					class="btn-danger"
					onclick={deleteAccount}
					disabled={deleteConfirmText !== 'DELETE' || isDeleting}
				>
					{isDeleting ? 'Deleting...' : 'Delete My Account'}
				</button>
			</div>
		</div>
	</div>
{/if}

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
		background: var(--color-error-light);
		color: var(--color-error);
	}

	.settings-section {
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.settings-section h2 {
		font-size: 1rem;
		color: var(--color-text-secondary);
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
		color: var(--color-text);
		font-weight: 500;
	}

	.setting-value {
		color: var(--color-text-secondary);
	}

	.subscription-card {
		background: var(--color-bg-secondary);
		border-radius: var(--radius-lg);
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
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
	}

	.status-active {
		background: var(--color-success-light);
		color: var(--color-success);
	}

	.status-canceled {
		background: var(--color-warning-light);
		color: var(--color-warning);
	}

	.status-past_due {
		background: var(--color-error-light);
		color: var(--color-error);
	}

	.renewal {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		margin-bottom: 1rem;
	}

	.no-subscription {
		text-align: center;
		padding: 1rem;
	}

	.no-subscription p {
		color: var(--color-text-secondary);
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
		color: var(--color-primary);
	}

	.credit-label {
		color: var(--color-text-secondary);
	}

	.btn-primary {
		display: inline-block;
		background: var(--color-primary);
		color: white;
		padding: 0.625rem 1.25rem;
		border-radius: var(--radius-lg);
		text-decoration: none;
		font-weight: 500;
	}

	.btn-secondary {
		display: inline-block;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		color: var(--color-text);
		padding: 0.625rem 1.25rem;
		border-radius: var(--radius-lg);
		text-decoration: none;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-secondary:hover:not(:disabled) {
		background: var(--color-bg-secondary);
	}

	.btn-secondary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.danger-zone {
		border-color: var(--color-error-light);
	}

	.btn-danger {
		display: inline-block;
		background: var(--color-bg);
		border: 1px solid var(--color-error);
		color: var(--color-error);
		padding: 0.625rem 1.25rem;
		border-radius: var(--radius-lg);
		text-decoration: none;
		font-weight: 500;
	}

	.btn-danger:hover:not(:disabled) {
		background: var(--color-error-light);
	}

	.btn-danger:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.alert.success {
		background: var(--color-success-light);
		color: var(--color-success);
	}

	.section-description {
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		margin-bottom: 1rem;
	}

	.action-buttons {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	/* Modal */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal {
		background: var(--color-bg);
		border-radius: var(--radius-xl);
		padding: 1.5rem;
		max-width: 400px;
		width: 100%;
		box-shadow: var(--shadow-lg);
	}

	.modal h2 {
		color: var(--color-error);
		margin-bottom: 1rem;
	}

	.modal-warning {
		color: var(--color-text-secondary);
		margin-bottom: 1rem;
		line-height: 1.5;
	}

	.modal-instruction {
		color: var(--color-text);
		margin-bottom: 0.5rem;
	}

	.modal .input {
		margin-bottom: 1rem;
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
	}
</style>

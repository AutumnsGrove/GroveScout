<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		icon?: string;
		title: string;
		description?: string;
		action?: Snippet;
	}

	let { icon = '📭', title, description, action }: Props = $props();
</script>

<div class="empty-state">
	<div class="empty-icon">{icon}</div>
	<h3 class="empty-title">{title}</h3>
	{#if description}
		<p class="empty-description">{description}</p>
	{/if}
	{#if action}
		<div class="empty-action">
			{@render action()}
		</div>
	{/if}
</div>

<style>
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 3rem 2rem;
		background: var(--color-bg-secondary);
		border-radius: var(--radius-xl);
		border: 1px dashed var(--color-border);
	}

	.empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.empty-title {
		font-size: 1.125rem;
		color: var(--color-text);
		margin-bottom: 0.5rem;
	}

	.empty-description {
		color: var(--color-text-secondary);
		max-width: 300px;
		line-height: 1.5;
	}

	.empty-action {
		margin-top: 1.5rem;
	}
</style>

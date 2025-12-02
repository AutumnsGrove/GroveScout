<script lang="ts">
	import { page } from '$app/stores';
	import { Icons } from '$lib/components/scout';

	const redirect = $page.url.searchParams.get('redirect') || '/dashboard';
	const error = $page.url.searchParams.get('error');

	const errorMessages: Record<string, string> = {
		auth_failed: 'Authentication failed. Please try again.',
		invalid_state: 'Session expired. Please try again.',
		missing_params: 'Missing authentication parameters.',
		no_email: 'Could not retrieve your email address.',
		apple_not_configured: 'Apple Sign In is not available yet.',
		invalid_method: 'Invalid authentication method.'
	};
</script>

<svelte:head>
	<title>Sign In - Scout</title>
</svelte:head>

<div class="min-h-[calc(100vh-16rem)] flex items-center justify-center py-12">
	<div class="scout-container max-w-md text-center">
		<!-- Logo & Header -->
		<div class="mb-8">
			<div class="inline-flex items-center justify-center w-16 h-16 bg-grove-100 dark:bg-grove-900/30 rounded-full mb-4">
				<Icons name="search" size="xl" class="text-grove-600 dark:text-grove-400" />
			</div>
			<h1 class="text-display-sm text-bark dark:text-cream mb-2">Sign in to Scout</h1>
			<p class="text-bark-500 dark:text-cream-500">Start finding deals in minutes.</p>
		</div>

		<!-- Error Alert -->
		{#if error}
			<div class="mb-6 p-4 rounded-grove bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
				<div class="flex items-center justify-center gap-2 text-red-700 dark:text-red-300">
					<Icons name="x" size="sm" />
					<span class="text-sm">{errorMessages[error] || 'An error occurred. Please try again.'}</span>
				</div>
			</div>
		{/if}

		<!-- Auth Card -->
		<div class="scout-card p-8">
			<div class="space-y-4">
				<!-- Google Button -->
				<a
					href="/api/auth/google?redirect={encodeURIComponent(redirect)}"
					class="flex items-center justify-center gap-3 w-full px-6 py-4 bg-white dark:bg-bark-700 border border-cream-300 dark:border-bark-600 rounded-grove-lg font-medium text-bark dark:text-cream hover:bg-cream-50 dark:hover:bg-bark-600 transition-colors"
				>
					<svg viewBox="0 0 24 24" class="w-5 h-5">
						<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
						<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
						<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
						<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
					</svg>
					Continue with Google
				</a>

				<!-- Divider -->
				<div class="flex items-center gap-4">
					<div class="flex-1 h-px bg-cream-300 dark:bg-bark-600"></div>
					<span class="text-sm text-bark-400 dark:text-cream-500">or</span>
					<div class="flex-1 h-px bg-cream-300 dark:bg-bark-600"></div>
				</div>

				<!-- Apple Button -->
				<a
					href="/api/auth/apple?redirect={encodeURIComponent(redirect)}"
					class="flex items-center justify-center gap-3 w-full px-6 py-4 bg-bark-900 dark:bg-cream text-white dark:text-bark-900 rounded-grove-lg font-medium hover:bg-bark-800 dark:hover:bg-cream-100 transition-colors"
				>
					<svg viewBox="0 0 24 24" class="w-5 h-5" fill="currentColor">
						<path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
					</svg>
					Continue with Apple
				</a>
			</div>
		</div>

		<!-- Terms -->
		<p class="mt-8 text-sm text-bark-400 dark:text-cream-500">
			By signing in, you agree to our terms of service and privacy policy.
		</p>

		<!-- Features Preview -->
		<div class="mt-12 pt-8 border-t border-cream-300 dark:border-bark-600">
			<p class="text-sm font-medium text-bark-500 dark:text-cream-500 mb-4">What you'll get:</p>
			<div class="grid grid-cols-2 gap-4 text-left">
				{#each [
					{ icon: 'sparkles' as const, text: '5 free searches' },
					{ icon: 'clock' as const, text: 'Results in minutes' },
					{ icon: 'user' as const, text: 'Personalized results' },
					{ icon: 'share' as const, text: 'Shareable links' }
				] as feature}
					<div class="flex items-center gap-2 text-sm text-bark-600 dark:text-cream-400">
						<Icons name={feature.icon} size="sm" class="text-grove-500" />
						<span>{feature.text}</span>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

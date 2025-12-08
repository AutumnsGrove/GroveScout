import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'node',
		globals: true,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/lib/**/*.ts'],
			exclude: [
				'src/lib/components/**',
				'**/*.d.ts',
				'**/types.ts'
			]
		},
		// Alias for $lib imports
		alias: {
			'$lib': '/src/lib'
		}
	}
});

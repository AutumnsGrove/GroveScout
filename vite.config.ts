import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// GroveEngine uses @jsquash/jxl for JPEG XL image compression in some components.
// The WASM worker requires ES module format, and we exclude it from optimization
// to prevent Vite/Rollup from bundling it incorrectly during SSR builds.
export default defineConfig({
	plugins: [sveltekit()],
	worker: {
		format: 'es'
	},
	optimizeDeps: {
		exclude: ['@jsquash/jxl']
	}
});

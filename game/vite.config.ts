import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	base: "/syntheteria/",
	// Rapier WASM support
	optimizeDeps: {
		exclude: ["@dimforge/rapier3d-compat"],
	},
	test: {
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/tests/e2e/**",
		],
	},
});

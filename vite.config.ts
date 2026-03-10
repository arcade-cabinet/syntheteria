import { defineConfig } from "vite";

// https://vite.dev/config/
// Kept for legacy vite build scripts (dev:vite, build:vite, preview).
// Primary build/test now uses Expo/Metro + Jest.
export default defineConfig({
	base: "/syntheteria/",
	// Rapier WASM support
	optimizeDeps: {
		exclude: ["@dimforge/rapier3d-compat"],
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					three: ["three"],
					r3f: ["@react-three/fiber", "@react-three/drei"],
				},
			},
		},
	},
});

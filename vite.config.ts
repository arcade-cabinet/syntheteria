import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";

export default defineConfig({
	plugins: [react(), glsl()],
	assetsInclude: ["**/*.glb", "**/*.gltf", "**/*.hdr", "**/*.bin"],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@root": path.resolve(__dirname, "."),
			// jeep-sqlite has no package exports for "jeep-sqlite/loader" — resolve explicitly for Vite.
			"jeep-sqlite/loader": path.resolve(
				__dirname,
				"node_modules/jeep-sqlite/loader/index.js",
			),
		},
	},
	root: ".",
	publicDir: "public",
	build: {
		outDir: "dist",
		emptyOutDir: true,
		sourcemap: true,
	},
	// Default: Vite crawls every *.html under the repo — pending/playwright/index.html
	// pulls legacy @playwright/experimental-ct-react and breaks dev. Only scan the app shell.
	optimizeDeps: {
		entries: ["index.html"],
	},
	server: {
		port: 5173,
	},
});

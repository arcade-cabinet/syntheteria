import path from "node:path";
import react from "@vitejs/plugin-react";
import glsl from "vite-plugin-glsl";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react(), glsl()],
	assetsInclude: ["**/*.glb", "**/*.gltf", "**/*.hdr", "**/*.bin"],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@root": path.resolve(__dirname, "."),
		},
	},
	root: ".",
	publicDir: "public",
	build: {
		outDir: "dist",
		emptyOutDir: true,
		sourcemap: true,
	},
	optimizeDeps: {
		exclude: ["jeep-sqlite"],
	},
	server: {
		port: 5173,
	},
});

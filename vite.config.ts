import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import staticAssets from "vite-static-assets-plugin";

export default defineConfig({
	plugins: [
		react({
			babel: {
				plugins: ["babel-plugin-reactylon"],
			},
		}),
		staticAssets({
			directory: "public",
			outputFile: "src/static-assets.ts",
			ignore: [".DS_Store"],
		}),
	],
	server: {
		port: 8080,
	},
	build: {
		outDir: "dist",
		chunkSizeWarningLimit: 900,
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (!id.includes("node_modules")) {
						return undefined;
					}
					if (id.includes("@babylonjs/havok")) {
						return "babylon-havok";
					}
					if (id.includes("@babylonjs/loaders")) {
						return "babylon-loaders";
					}
					if (id.includes("@babylonjs/gui")) {
						return "babylon-gui";
					}
					if (id.includes("@babylonjs/core/Materials")) {
						return "babylon-materials";
					}
					if (id.includes("@babylonjs/core/Meshes")) {
						return "babylon-meshes";
					}
					if (id.includes("@babylonjs/core/Engines")) {
						return "babylon-engines";
					}
					if (id.includes("@babylonjs/core/Maths")) {
						return "babylon-maths";
					}
					if (id.includes("@babylonjs/core")) {
						return "babylon-core";
					}
					if (id.includes("reactylon")) {
						return "reactylon";
					}
					if (id.includes("react") || id.includes("scheduler")) {
						return "react-vendor";
					}
					if (id.includes("sql.js")) {
						return "sqljs";
					}
					if (id.includes("/tone/")) {
						return "tone";
					}
					return "vendor";
				},
			},
		},
	},
});

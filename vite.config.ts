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
	},
});

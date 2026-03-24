import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import staticAssets from "vite-static-assets-plugin";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		staticAssets({
			directory: "public",
			outputFile: "src/static-assets.ts",
			ignore: [".DS_Store"],
		}),
	],
	base: "/syntheteria/",
});

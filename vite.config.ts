import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	assetsInclude: ["**/*.glb", "**/*.gltf", "**/*.hdr", "**/*.bin"],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@root": path.resolve(__dirname, "."),
			"react-native": path.resolve(__dirname, "./src/stubs/react-native.ts"),
			"expo-asset": path.resolve(__dirname, "./src/stubs/expo-asset.ts"),
			"react-native-filament": path.resolve(
				__dirname,
				"./src/stubs/react-native-filament.ts",
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
	server: {
		port: 5173,
	},
});

import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

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
	test: {
		environment: "jsdom",
		globals: true,
		include: ["**/*.vitest.{ts,tsx}"],
		exclude: ["**/node_modules/**", "**/dist/**", "tests/**"],
		setupFiles: ["vitest/setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "text-summary", "html"],
			include: ["src/**/*.{ts,tsx}"],
			exclude: [
				"**/*.vitest.{ts,tsx}",
				"**/__tests__/**",
				"**/stubs/**",
				"**/*.d.ts",
				"src/main.tsx",
				"**/node_modules/**",
			],
		},
	},
});

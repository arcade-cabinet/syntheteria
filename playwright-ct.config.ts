/**
 * Playwright component testing — isolated React components in a real browser.
 * Run: pnpm test:ct
 * Tests: tests/components/*.spec.tsx
 */
import path from "node:path";
import { defineConfig, devices } from "@playwright/experimental-ct-react";
import react from "@vitejs/plugin-react";

export default defineConfig({
	testDir: "./tests/components",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 2 : undefined,
	reporter: "html",
	use: {
		ctViteConfig: {
			plugins: [react()],
			assetsInclude: ["**/*.glb", "**/*.gltf"],
			resolve: {
				alias: {
					"@": path.resolve(__dirname, "./src"),
					"@root": path.resolve(__dirname, "."),
					"react-native": path.resolve(__dirname, "./src/stubs/react-native"),
					"expo-asset": path.resolve(__dirname, "./src/stubs/expo-asset.ts"),
					"react-native-filament": path.resolve(
						__dirname,
						"./src/stubs/react-native-filament.ts",
					),
					"react-native-reanimated": path.resolve(
						__dirname,
						"./src/stubs/react-native-reanimated.ts",
					),
				},
			},
		},
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				headless: false,
			},
		},
	],
});

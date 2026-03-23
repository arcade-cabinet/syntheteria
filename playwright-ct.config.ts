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
	expect: {
		toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
	},
	use: {
		ctViteConfig: {
			plugins: [react()],
			assetsInclude: ["**/*.glb", "**/*.gltf", "**/*.wasm"],
			optimizeDeps: {
				// Prevent Vite from bundling sql.js — it must load WASM at runtime.
				exclude: ["sql.js"],
			},
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
					"react-native-svg": path.resolve(
						__dirname,
						"./src/stubs/react-native-svg.ts",
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

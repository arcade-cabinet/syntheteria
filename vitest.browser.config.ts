/**
 * Vitest browser-mode config for isolated R3F component tests.
 *
 * Uses Playwright as the browser provider so we stay on Vite 6 and share
 * the full project resolve aliases and optimizeDeps settings.
 *
 * Run: pnpm test:ct
 * Watch: pnpm test:ct:watch
 * Files: tests/components/**\/*.browser.test.{ts,tsx}
 */
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	assetsInclude: ["**/*.glb", "**/*.gltf", "**/*.wasm"],
	optimizeDeps: {
		// sql.js must load its WASM at runtime — don't bundle it.
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
	test: {
		name: "browser",
		browser: {
			enabled: true,
			name: "chromium",
			provider: "playwright",
			headless: !!process.env.CI,
		},
		include: ["tests/components/**/*.browser.test.{ts,tsx}"],
		exclude: ["**/node_modules/**", "**/dist/**"],
		// Canvas rendering needs time; set a generous default test timeout.
		testTimeout: 30_000,
		hookTimeout: 30_000,
	},
});

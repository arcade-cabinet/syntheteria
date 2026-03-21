/**
 * Vitest browser-mode config (Playwright provider).
 *
 * Run: pnpm test:ct
 * Watch: pnpm test:ct:watch
 *
 * Only smoke.browser.test.tsx runs for now; other browser tests still import outdated
 * previews (old ecs/rendering paths). Widen test.include when those previews are migrated.
 */
import path from "node:path";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import glsl from "vite-plugin-glsl";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react(), glsl()],
	assetsInclude: ["**/*.glb", "**/*.gltf", "**/*.wasm"],
	optimizeDeps: {
		// sql.js must load its WASM at runtime — don't bundle it.
		exclude: ["sql.js"],
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@root": path.resolve(__dirname, "."),
			"jeep-sqlite/loader": path.resolve(
				__dirname,
				"node_modules/jeep-sqlite/loader/index.js",
			),
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
			headless: !!process.env.CI,
			provider: playwright(),
			instances: [{ browser: "chromium" }],
		},
		include: ["tests/components/smoke.browser.test.tsx"],
		exclude: ["**/node_modules/**", "**/dist/**"],
		// Canvas rendering needs time; set a generous default test timeout.
		testTimeout: 30_000,
		hookTimeout: 30_000,
	},
});

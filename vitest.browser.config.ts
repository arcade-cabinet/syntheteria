import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
	optimizeDeps: {
		include: [
			"react",
			"react/jsx-dev-runtime",
			"react/jsx-runtime",
			"react-dom",
			"react-dom/client",
			"koota",
			"clsx",
			"tailwind-merge",
			"yuka",
			"@babylonjs/core/Animations/animation",
			"@babylonjs/core/Events/pointerEvents",
			"@babylonjs/core/Loading/sceneLoader",
			"@babylonjs/core/Materials/PBR/pbrMaterial",
			"@babylonjs/core/Materials/Textures/texture",
			"@babylonjs/core/Materials/standardMaterial",
			"@babylonjs/core/Meshes/meshBuilder",
			"@babylonjs/core/Misc/tools",
			"@babylonjs/core/Physics/v2/Plugins/havokPlugin",
			"@babylonjs/loaders/glTF",
			"sql.js/dist/sql-asm.js",
		],
	},
	test: {
		browser: {
			enabled: true,
			provider: playwright(),
			headless: false,
			instances: [{ browser: "chromium" }],
		},
		include: ["tests/components/**/*.browser.test.tsx"],
	},
});

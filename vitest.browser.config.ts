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
		],
	},
	test: {
		browser: {
			enabled: true,
			provider: playwright(),
			instances: [{ browser: "chromium" }],
		},
		include: ["tests/components/**/*.browser.test.tsx"],
	},
});

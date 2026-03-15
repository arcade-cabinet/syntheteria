/**
 * Playwright E2E — full browser tests against the running app.
 * Run: pnpm test:e2e (starts dev server, then runs tests)
 * Tests: tests/e2e/*.spec.ts
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	reporter: "list",
	timeout: 120_000,
	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
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
	webServer: process.env.CI
		? undefined
		: {
				command: "pnpm dev",
				url: "http://localhost:5173",
				reuseExistingServer: !process.env.CI,
				timeout: 60_000,
			},
});

import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

/** GPU-accelerated WebGL args for headless Chrome */
const GPU_ARGS = [
	"--no-sandbox",
	"--use-angle=gl",
	"--enable-webgl",
	"--ignore-gpu-blocklist",
	"--mute-audio",
	"--disable-background-timer-throttling",
	"--disable-backgrounding-occluded-windows",
	"--disable-renderer-backgrounding",
	"--window-position=9999,9999",
];

export default defineConfig({
	testDir: "./tests",
	fullyParallel: true,
	forbidOnly: isCI,
	retries: isCI ? 2 : 0,
	workers: isCI ? 2 : undefined,
	timeout: 90_000,

	reporter: [
		["list"],
		["json", { outputFile: "test-results/playwright-results.json" }],
	],

	use: {
		baseURL: "http://localhost:8081",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		viewport: { width: 1280, height: 720 },
	},

	projects: [
		// ── E2E ──
		{
			name: "e2e-chromium",
			testMatch: /.*e2e\/(?!ai-playtest).*\.spec\.ts/,
			use: {
				...devices["Desktop Chrome"],
				headless: true,
				launchOptions: {
					args: GPU_ARGS,
				},
			},
		},
		// ── 100-Turn Playtest (headed, long timeout) ──
		{
			name: "playtest",
			testMatch: /.*e2e\/ai-playtest.*\.spec\.ts/,
			timeout: 600_000,
			retries: 0,
			use: {
				...devices["Desktop Chrome"],
				headless: false,
				launchOptions: {
					args: GPU_ARGS.filter((a) => a !== "--window-position=9999,9999"),
				},
				video: "retain-on-failure",
			},
		},
	],

	webServer: {
		command: "npx expo start --web --port 8081",
		url: "http://localhost:8081",
		reuseExistingServer: true,
		timeout: 120_000,
	},
});

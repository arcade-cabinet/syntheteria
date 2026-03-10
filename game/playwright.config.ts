import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Syntheteria E2E tests.
 *
 * Dev workflow  : `npm run test:e2e`      — reuses a running dev server if present
 * CI            : `npm run test:e2e`      — starts vite dev server automatically
 * Interactive UI: `npm run test:e2e:ui`   — Playwright UI mode
 *
 * Uses the Vite dev server (not Expo) for E2E tests because:
 * 1. Vite serves at localhost:5173 with base path /syntheteria/
 * 2. Expo web requires additional native module setup not needed for E2E
 * 3. The game code is identical — only the bundler differs
 */
export default defineConfig({
  testDir: "./tests/e2e",

  // Run test files in parallel; within each file tests run sequentially.
  fullyParallel: true,

  // Fail the run immediately if a test is accidentally left with `.only`.
  forbidOnly: !!process.env.CI,

  // Retry flaky tests twice in CI; no retries locally.
  retries: process.env.CI ? 2 : 0,

  // Single worker in CI to avoid resource contention with the WebGL canvas.
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ["html", { open: "never" }],
    process.env.CI ? ["github"] : ["list"],
  ],

  use: {
    // Vite serves the app at /syntheteria/ due to the base config
    baseURL: "http://localhost:5173/syntheteria/",
    // Capture trace on the first retry so failures are debuggable.
    trace: "on-first-retry",
    // Capture screenshot on failure.
    screenshot: "only-on-failure",
  },

  projects: [
    // Only Chromium in CI for speed; add Firefox/WebKit locally as desired.
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // WebGL requires a real GPU context; use software renderer in CI.
        launchOptions: {
          args: ["--disable-web-security", "--use-gl=angle", "--use-angle=swiftshader"],
        },
      },
    },
  ],

  webServer: {
    command: "npm run dev:vite",
    url: "http://localhost:5173/syntheteria/",
    // Reuse a running dev server locally; always start fresh in CI.
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});

import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Syntheteria E2E tests.
 *
 * Dev workflow  : `npm run test:e2e`      — reuses a running dev server if present
 * CI            : `npm run test:e2e`      — starts Expo web dev server automatically
 * Interactive UI: `npm run test:e2e:ui`   — Playwright UI mode
 *
 * Uses the Expo web dev server (port from DEV_PORT env or 19801).
 * Run `npx expo start --web --port 19801 --host lan` to start locally.
 */
const port = process.env.DEV_PORT ?? "19801";

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
    // Expo web serves at root (no base path)
    baseURL: `http://localhost:${port}`,
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
    command: "npm run dev",
    url: `http://localhost:${port}`,
    // Reuse a running dev server locally; always start fresh in CI.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

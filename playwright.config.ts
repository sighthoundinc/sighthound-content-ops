import { defineConfig, devices } from "@playwright/test";

/**
 * Sighthound Content Relay — Playwright visual regression config.
 *
 * Scope (v1): public-route screenshot baselines for the design-system
 * preview surface and the login page. Auth-gated pages (`/dashboard`,
 * `/blogs`, `/social-posts`, etc.) are explicitly out of scope until a
 * Supabase test user is provisioned and a storage-state fixture is wired
 * up — see `tests/visual/README.md`.
 *
 * Run:
 *   npm run test:visual           → compare against committed baselines
 *   npm run test:visual:update    → regenerate baselines
 *   npm run test:visual:report    → open the HTML diff report
 *
 * One-time setup after `npm install`:
 *   npx playwright install chromium
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/visual",
  timeout: 30_000,
  expect: {
    toHaveScreenshot: {
      // Small tolerance absorbs sub-pixel font rendering jitter without
      // masking real regressions. Tighten if diffs become unreliable.
      maxDiffPixels: 200,
      threshold: 0.2,
      animations: "disabled",
      caret: "hide",
    },
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // If PLAYWRIGHT_BASE_URL is set (e.g., against a deployed Vercel preview),
  // skip the local webServer and hit the remote URL directly.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});

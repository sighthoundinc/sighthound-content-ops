import { expect, test } from "@playwright/test";

/**
 * Sighthound Content Relay — brand visual regression.
 *
 * These tests lock the Content Relay look against drift. They cover the two
 * public routes that exercise the whole token surface:
 *
 * - `/design-system-preview` — the canonical smoke-test route. Renders every
 *   primitive and token ramp from Phase 1 through the post-migration
 *   <Card>/<Badge> extraction. A clean diff here means every primitive is
 *   still on-brand.
 * - `/login` — the brand-showcase surface (Blurple gradient, size="cta"
 *   primary, `.focus-field` ring). Catches regressions in the external-
 *   facing chrome.
 *
 * Auth-gated canonical pages (`/dashboard`, `/blogs`, `/social-posts`,
 * `/calendar`) are explicitly out of scope for v1 — see `README.md` for the
 * storage-state pattern that unlocks them once a Supabase test user exists.
 */

async function waitForReady(page: import("@playwright/test").Page) {
  // Tailwind + next/font hydration + Lexend/JetBrains-Mono webfont load all
  // need to finish before a screenshot is stable. Network idle alone isn't
  // enough — document.fonts.ready covers the last mile.
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
}

test.describe("Content Relay — public brand surfaces", () => {
  test("design-system preview renders every primitive and token", async ({ page }) => {
    await page.goto("/design-system-preview");
    await waitForReady(page);
    await expect(page).toHaveScreenshot("design-system-preview.png", {
      fullPage: true,
    });
  });

  test("login page renders the brand-showcase surface", async ({ page }) => {
    await page.goto("/login");
    await waitForReady(page);
    await expect(page).toHaveScreenshot("login.png", { fullPage: true });
  });
});

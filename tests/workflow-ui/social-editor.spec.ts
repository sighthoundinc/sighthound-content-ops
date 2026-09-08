import { expect, test } from "@playwright/test";

// Use a non-admin worker session and an execution-stage fixture. These probes
// never click save/transition controls and block mutating app requests.
const postId = process.env.WORKFLOW_UI_POST_ID;
const expectedDate = process.env.WORKFLOW_UI_EXPECTED_DATE;
if (!postId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId) || !expectedDate || !/^\d{4}-\d{2}-\d{2}$/.test(expectedDate)) {
  throw new Error("BLOCKED: supply a disposable execution-stage WORKFLOW_UI_POST_ID and WORKFLOW_UI_EXPECTED_DATE.");
}

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const request = route.request();
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) return route.abort("blockedbyclient");
    return route.continue();
  });
  await page.goto(`/social-posts/${postId}`);
  await expect(page.getByRole("heading", { name: "Next Action", exact: true })).toBeVisible();
});

test("execution-stage Canva field is locked", async ({ page }) => {
  await expect(page.locator("#social-post-canva-url")).toBeDisabled();
});

test("scheduled date retains its date-only value", async ({ page }) => {
  await expect(page.locator("#social-post-scheduled-date")).toHaveValue(expectedDate!);
});

test("top and sidebar primary action labels agree", async ({ page }) => {
  const actions = page.locator('[aria-keyshortcuts="Alt+Shift+Enter"]');
  await expect(actions).toHaveCount(2);
  const labels = (await actions.allTextContents()).map((text) => text.trim());
  expect(labels[0]).not.toBe("");
  expect(labels[1]).toBe(labels[0]);
});

test("section navigator reaches setup without mutation", async ({ page }) => {
  const setup = page.getByRole("navigation", { name: "Detail sections" }).locator('a[href="#social-editor-step-setup"]');
  await setup.click();
  await expect(page).toHaveURL(/#social-editor-step-setup$/);
});

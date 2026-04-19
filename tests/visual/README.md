# Visual regression tests

Playwright snapshot suite that locks the Sighthound Content Relay look against unintended drift.

Lives at `tests/visual/`. Config at `/playwright.config.ts`. Closes `MIGRATION_AUDIT.md` §8.9.

## One-time setup

After cloning the repo:

```bash
npm install
npx playwright install chromium
```

Playwright downloads browser binaries to `~/Library/Caches/ms-playwright/` on macOS (~400 MB).

## Running

| Command | What it does |
|---|---|
| `npm run test:visual` | Auto-starts `next dev` on port 3000, loads `/design-system-preview` and `/login`, compares against committed baseline PNGs. Pass = no regression. |
| `npm run test:visual:update` | Same as above but writes new baseline PNGs. Run this intentionally after a vetted visual change and commit the updated PNGs. |
| `npm run test:visual:report` | Opens the HTML diff report from the last run. |
| `PLAYWRIGHT_BASE_URL=https://… npm run test:visual` | Runs against a remote URL (e.g., a Vercel preview) instead of the local dev server. Skips the auto-start. |

## What's covered (v1)

- `/design-system-preview` — full-page snapshot. Locks every primitive and token in one PNG.
- `/login` — full-page snapshot. Locks the brand-showcase surface (Blurple gradient, `size="cta"` CTA, input focus ring, etc.).

## What's NOT covered yet (auth-gated follow-up)

The canonical app pages (`/dashboard`, `/blogs`, `/social-posts`, `/calendar`, `/tasks`) all require a Supabase session. They're intentionally out of scope for v1.

Target surfaces (once the test user lands, pick 3–4 of these):
- `/dashboard` — table/chrome, filter drawers, writer/publisher filter state. Exercises Phase 4.2 chrome + Phase 3.4 skeleton on first paint.
- `/blogs/[id]` — blog detail with detail drawer + inline status chips + `<LinkQuickActions>`. Exercises Phase 3.5 drawer, contract-locked status chips, and the `.focus-field` primitive in forms.
- A content page with **Ask AI panel open** (e.g., `/social-posts/[id]?ai=1` or a test harness) — exercises `<Card>` + `<Badge>` in live severity composition via the blocker / quality / next-steps cards.
- Optional fourth: `/calendar` or `/social-posts` list — catches drift in calendar tile colours, social post board chrome, and the row-tone mapping from `src/lib/table-row-tones.ts`.

To add them later:

1. Provision a **Supabase test user** in the project's auth.
2. Export their credentials as env vars (do NOT commit):
   ```bash
   SUPABASE_TEST_EMAIL=visual-tests@sighthound.com
   SUPABASE_TEST_PASSWORD=<fixture-password>
   ```
3. Add a Playwright `globalSetup` script that signs in once and saves storage state:
   ```ts
   // tests/visual/global-setup.ts (sketch)
   import { chromium } from "@playwright/test";
   export default async () => {
     const browser = await chromium.launch();
     const page = await browser.newPage();
     await page.goto("http://localhost:3000/login");
     await page.fill('input[name="email"]', process.env.SUPABASE_TEST_EMAIL!);
     await page.fill('input[name="password"]', process.env.SUPABASE_TEST_PASSWORD!);
     await page.click('button[type="submit"]');
     await page.waitForURL("http://localhost:3000/");
     await page.context().storageState({ path: "tests/visual/.auth/state.json" });
     await browser.close();
   };
   ```
4. Reference it from `playwright.config.ts`:
   ```ts
   globalSetup: require.resolve("./tests/visual/global-setup"),
   use: { storageState: "tests/visual/.auth/state.json", ... }
   ```
5. Add specs for `/dashboard`, `/blogs`, `/social-posts/[id]`, etc.
6. Gitignore `tests/visual/.auth/` so the session state never ships.

## Baselines

Baselines live next to the spec files in auto-created `__screenshots__/` directories. They're platform-keyed — a baseline captured on macOS will differ slightly from one captured on Linux. The suite is currently **baseline-on-the-machine-that-ran-update**: whoever runs `test:visual:update` first establishes the baseline; subsequent runs on similar environments will pass.

If the CI environment differs from local (common), either:
- (a) Re-generate baselines in a Docker container matching CI, or
- (b) Only run `npm run test:visual` locally for now and defer CI integration.

v1 defers (b). No CI wiring yet.

## When visual tests fail

1. Run `npm run test:visual:report` — opens the HTML report with side-by-side "expected vs. actual vs. diff" images.
2. If the diff is a **real regression**: fix the code.
3. If the diff is an **intentional visual change** (e.g., a deliberate brand tweak): run `npm run test:visual:update` and commit the updated PNGs with a note in the PR description explaining the visual delta.

## Philosophy

Per `AGENTS.md` and `design-system/MIGRATION_AUDIT.md` §19, the Content Relay migration landed clean without visual regression tooling. This v1 suite is minimal on purpose — enough coverage to catch drift in primitives and the brand-showcase surface, with a clear path to expand once auth-gated coverage becomes valuable.

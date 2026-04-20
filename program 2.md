# /login Bundle-Size AutoResearch
## Goal
**Minimise `LOGIN_PAGE_SIZE_KB` on the `/login` route** as reported by `next build`.
Current baseline: **`LOGIN_PAGE_SIZE_KB = 4.450`** (First Load JS = 176.0 kB, largely shared chunks).
Secondary observation metric (not the ratchet): `LOGIN_FIRST_LOAD_KB`.
Why it matters: `/login` is anonymous, uncached-on-first-visit, and a customer's very first view of the app. Smaller = faster time-to-interactive on slow networks and mobile.
## Constraints on this session
This is a creative reuse of `sh-autoresearch` (originally an ML metric ratchet). To keep the ratchet meaningful on a UI metric:
- The bundle-size metric is stable across repeat builds — runs do not need a random seed.
- Each experiment must be a single targeted change to one or two editable files.
- Any change must preserve the login UX contract: the autofill `FormData` workaround, `autoComplete` attributes, OAuth provider strings (`google`, `slack_oidc`), and `reconnect` redirect semantics.
## What you CAN modify
Editable files (defined in `research.env`):
- `src/app/login/page.tsx` — thin Suspense wrapper
- `src/app/login/login-page-content.tsx` — session redirect effect + layout composition
- `src/app/login/login-hero.tsx` — logo fallback state machine + highlights
- `src/app/login/login-form.tsx` — password + OAuth form
Fair-game changes inside these files:
- Replacing `next/image` with a plain `<img>` for the logo (the logo is already `unoptimized` and `priority`, so the Image component is paying overhead with no compensating optimization).
- Simplifying or removing the 3-step logo fallback state machine (two SVG fallbacks for a PNG→SVG that both already ship; the state machine is likely unnecessary).
- Collapsing nested state (`logoSourceIndex`, `logoLoaded`) into simpler expressions or constants when the fallback machine shrinks.
- Moving static JSX (e.g. marketing highlights) out of the client bundle by splitting non-interactive subtrees into server components imported by the client wrapper.
- Replacing shared `AppIcon` usages inside login-only files with tiny inline SVGs for `check`, `google`, `slack` (login-local icons avoid pulling `lucide-react` bindings into the login chunk if tree-shaking allows).
- Reducing repeated long Tailwind class strings via small module-local string constants when it demonstrably reduces minified output.
- Removing the `showError` effect indirection if the form can call `showError` directly inline without losing semantics.
## What you CANNOT modify
- `src/providers/auth-provider.tsx`, `src/providers/alerts-provider.tsx`
- `src/lib/supabase/browser.ts`, `src/lib/icons.tsx` or anything under `src/lib/`
- `src/components/*`
- Any config file: `next.config.*`, `tsconfig.json`, `package.json`, PostCSS/Tailwind config
- Auth flow semantics: Supabase provider strings, redirect targets, autocomplete attributes, the `FormData` autofill workaround
- Do NOT install new packages
## Experiment Priorities
Ranked by expected login-bundle impact, highest first. Each is a single targeted change; agent works top-down and can combine after the list is exhausted.
1. **Replace `next/image` with plain `<img>` for the logo in `login-hero.tsx`** — the logo is already `unoptimized` + `priority`, so we are paying the Image runtime for no gain. This is likely the single largest shavable chunk.
2. **Simplify the logo fallback machine** — instead of cycling through 3 sources with `useState` indices and `onError`, pick a single authoritative source (SVG with text) and drop to plain static markup if it fails. Removes both state hooks and the fallback branch.
3. **Inline the `check` icon in `login-hero.tsx`** — the 3-item list uses `AppIcon name="check"` which pulls `lucide-react`'s Check icon path. A 120-byte inline `<svg>` is smaller and removes one external dep reference from the login chunk.
4. **Inline the `google` and `slack` icons in `login-form.tsx`** — same argument as above for the two OAuth button icons.
5. **Collapse the error-relay `useEffect` in `login-form.tsx`** — `setError(x)` then `useEffect(() => showError(error))` can often be `showError(x)` inline at call sites, removing one hook and one effect subscription.
6. **Move the marketing highlights array + rendering to a small server component** imported by the client `login-hero.tsx`. The list has zero interactivity and does not need to be in the client bundle. (Requires careful file layout — page.tsx already is a server component, so the highlights can render inside it and `login-hero.tsx` can accept them as children.)
7. **Combine #1 + #2 + #3** — stack the three most likely shavers if each alone did not beat `MIN_DELTA` but together do.
8. **Remove redundant long class strings** by extracting repeated Tailwind patterns to module-local constants only where the minified output shrinks. (Low expected yield; last resort.)
9. **Drop the `transition-opacity` / `animate-pulse` logo skeleton branch** if the Image is replaced — the placeholder becomes dead code.
## Simplicity Criterion
- Improvement < `MIN_DELTA` (0.1 kB) → discard even if technically positive
- Improvement requires ugly, unreadable markup → probably not worth keeping
- Improvement comes from deleting code → always keep (smaller + simpler is a double win)
## Crash Handling
If `next build` fails (type error, lint error, missing import):
- If the breakage is a trivial bug in the change, fix it and re-run (counts as the same experiment).
- If the change is fundamentally incompatible with the editable-file constraint, discard and move on.
- `measure-login-bundle.sh` returns exit code 2 on any build failure, which `autoresearch.sh` classifies as CRASH and restores files.
## End-of-Session Documentation
When the session closes:
1. Update the "Current baseline" line at the top with the new best `LOGIN_PAGE_SIZE_KB`.
2. Move tried experiments from the priority list to "What you CAN modify" as `tried: kept` or `tried: failed`.
3. Refresh the priority list for the next session.

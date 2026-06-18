# Design System Import Contract

This contract defines how Sighthound design-system packages are merged into this repository. It exists so future zip imports can bring in better governance, motifs, previews, and reference kits without overwriting local Content Relay production decisions.

## Source and authority

- Incoming design packages are source inputs, not automatic production truth.
- `design-system/AUTHORITATIVE_STATUS.md` records brand authority and open gaps.
- `design-system/DECISIONS_LOG.md` records cross-functional and local implementation decisions.
- `design-system/MIGRATION_AUDIT.md` records Content Relay adoption history and must be preserved.
- Production implementation contracts remain in `AGENTS.md`, `SPECIFICATION.md`, and the source primitives under `src/`.

## Protected local decisions

Do not overwrite these during a raw design-folder sync unless the user explicitly asks to change them:

- Lexend is loaded in the app through `next/font/google`, not CSS `@import`.
- Dense app body text remains Lexend Regular 14px / 400.
- Marketing/auth/CTA buttons use 20px radius; dense app controls use 8px radius.
- Workflow status chips keep the semantic status palette.
- Content Relay sidebar remains white.
- JetBrains Mono remains the app monospace font.
- Production UI icons use `AppIcon` / Lucide wrappers.
- `design-system/MIGRATION_AUDIT.md` remains local history and is not deleted by package syncs.

## Merge classes

### Safe to copy directly

- New governance docs that do not contradict local decisions.
- New preview cards under `design-system/preview/`.
- New reference UI kits under `design-system/ui_kits/`.
- New static brand assets under `design-system/assets/` and `design-system/fonts/`.
- New package manifests such as `_ds_manifest.json` when valid JSON.

### Merge manually

- `design-system/README.md`
- `design-system/SKILL.md`
- `design-system/colors_and_type.css`
- Any file that mentions app density, app type scale, app button radii, sidebar color, status palette, icon implementation, or production component names.

### Do not copy into production app code

- UI-kit JSX from `design-system/ui_kits/`
- Standalone packaged HTML artifacts
- Inline SVG path icons from prototypes
- Raw design preview CSS or inline styles

Reference kits are for visual and interaction direction. Production implementation must be translated into local primitives.

## Required import process

1. Extract the incoming design package to a temporary directory.
2. Compare file inventory against `design-system/`.
3. Copy new additive artifacts without deleting local-only files.
4. Manually merge the files listed under “Merge manually.”
5. Reconcile renamed or superseded kit files, such as `AppShell.jsx` versus `RedactorShell.jsx`.
6. Update `DECISIONS_LOG.md` when an incoming package marks a locally settled production decision as open.
7. Run validation.

## Validation

Run the lightweight checks first:

- `npm run check:design-system`
- `git diff --check -- design-system scripts package.json`
- JSON parse check for `_ds_manifest.json` and other package JSON files.

Run broader app validation only when production files under `src/` change:

- `npm run typecheck`
- `npm run test:visual` for visual surfaces covered by Playwright.
- `npm run check:full` only for broader release or stabilization work.

## Production handoff rule

Design ideas become production only when mapped to approved app primitives:

- shared components under `src/components/`
- shared icon system under `src/lib/icons.tsx`
- token layer in `src/app/globals.css`
- status and vocabulary contracts under `src/lib/`

Do not ship UI-kit code directly.

---
name: sighthound-design
description: Use this skill to generate well-branded interfaces and assets for Sighthound (and the Sighthound Redactor sub-brand) — either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and
create static HTML files for the user to view. If working on production code, you can copy
assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build
or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_
production code, depending on the need.

## Quick orientation

- `README.md` — brand story, voice, visual foundations, iconography, index.
- `OPERATING_MODE.md` — v0.9 provisional mode. How to use without sign-off.
- `AUTHORITATIVE_STATUS.md` — audit-of-record. Every rule annotated ✅ / ⚠️ / 🔴.
- `DECISIONS_LOG.md` — open items awaiting sign-off.
- `colors_and_type.css` — drop-in CSS: design tokens + semantic element styles.
- `assets/` — real logos, hero imagery, product icons, hardware renders. Copy, don't redraw.
- `preview/` — small cards that render each part of the system.
- `ui_kits/sighthound-marketing/` — React recreation of sighthound.com.
- `ui_kits/redactor-app/` — React recreation of the Redactor product UI.

## Local production app guardrails

When applying this skill to the Content Relay app in this repository, follow the local
adaptation decisions in `README.md`, `DECISIONS_LOG.md`, and `MIGRATION_AUDIT.md`.
Do not blindly overwrite production choices from the provisional design package:

- Keep Lexend loaded through `next/font/google`.
- Keep dense app body text at 14px / 400.
- Keep the 20px CTA / 8px compact button radius split.
- Keep workflow status chips on the semantic status palette.
- Keep the Content Relay sidebar white unless a separate product decision changes it.
- Keep JetBrains Mono for technical values.
- Use production `AppIcon` / Lucide wrappers rather than inline UI-kit SVG paths.

## Non-negotiables (✅ confirmed)

- **One brand.** Sighthound + Sighthound Redactor read as one connected brand. Redactor is a sub-brand, not a separate identity.
- **Products:** Sighthound ALPR+ (software), Sighthound Redactor (software), **Sighthound Edge Compute** (hardware), Sighthound Video (software).
- **Brand feel:** Premium · Calm · Modern · Technical but approachable · Enterprise-grade · Flexible · Trustworthy · Data-aware · Product-ready · Scalable.
- **Product names** — **"Sighthound Redactor"** (proper case). **"ALPR+"** (exact form, never "ALPR Plus" or "ALPR").
- Body text is **Dark Navy `#1a1d38`** on light backgrounds. Never black.
- Primary color is **Blurple `#4f60dc`** (~60% per 2022 guide; softened in practice).
- Orange accents (`#f99f25` / `#f05d22` / `#f62470`) are **~10%** only — pops, not fills.
- Buttons: **20px radius** for CTA / marketing; ⚠️ 8px in dense app contexts (practice).
- Primary font: **Lexend** (Google, free). Fallback: Verdana.
- The wordmark uses Robofan (vendor-locked) — never recreate; always use a logo file.
- Tagline: *"Turning sight into insight."*
- Voice: informal yet polished, human, succinct, no arrogance. We/you. Sentence case for headers (per Content Style Guide v2026.04).
- No emoji in production UI.
- ✅ **Privacy claim** usable verbatim: *"Sighthound does not collect customer data; all data stays in the customer's deployment."*
- ✅ **AI rule:** all AI-generated content must be manually verified — no auto-publish.

## Imagery is optional (v0.9.1)

The system must feel Sighthound **even without photography**. Imagery is one tool, not the default. Reach for it only when it adds specific meaning:

- **ALPR+** — live recognition, vehicle events, evidence review.
- **Redactor** — before/after redaction, media review.
- **Edge Compute** — hardware, deployment, edge infrastructure.
- **Video** — monitoring, playback, camera management.

Dashboards, settings, analytics, reports, onboarding, admin tools, docs, pricing, forms, empty states, and navigation should **not** require imagery.

When imagery is wrong, reach for these composition motifs (see `colors_and_type.css` for utility classes):

- **Typography-led** layouts with confident hierarchy
- **Data panels** — KPI tiles, tables, sparklines
- **Cards** as the unit of layout
- **Soft gradients** — `.sh-soft-mist`, `.sh-soft-fade`
- **The wave** — signature graphic, sparingly
- **Detection-grid pattern** — `.sh-pattern-detect`
- **Map / topo patterns** — `.sh-pattern-topo`, `.sh-pattern-grid`
- **Schematic illustrations** — labelled outline diagrams
- **Icon-led sections** — primary icon + heading + body
- **Neutral placeholder blocks** — solid gray panels with caption
- **Product UI structure** — show real UI slices instead of stock

## ⚠️ Accessibility caution

- Light Orange `#f99f25` on white = borderline AA → large text / decorative only.
- Red Orange `#f62470` on white = **fails AA** → never body text.
- Blurple on white = borderline → prefer Navy for body.
- Formal WCAG target not yet committed (see `DECISIONS_LOG.md` #1).

## Signature motifs
The **wave** graphic (curved flowing form, any angle, any palette color, often with transparency) and Blurple → Red-Orange gradients are the two hallmark brand devices. Use sparingly.

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
- `colors_and_type.css` — drop-in CSS: design tokens + semantic element styles.
- `assets/` — real logos, hero imagery, product icons, hardware renders. Copy, don't redraw.
- `preview/` — small cards that render each part of the system.
- `ui_kits/sighthound-marketing/` — React recreation of sighthound.com.
- `ui_kits/redactor-app/` — React recreation of the Redactor product UI.

## Non-negotiables

- Body text is **Dark Navy `#1a1d38`** on light backgrounds. Never black.
- Primary color is **Blurple `#4f60dc`** (~60% of design).
- Orange accents (`#f99f25` / `#f05d22` / `#f62470`) are **~10%** only — pops, not fills.
- **Buttons are always 20px radius**, padding 14/29, Lexend Light 16.
- Primary font: **Lexend** (Google, free). Fallback: Verdana. The wordmark uses Robofan — never recreate it; always use a logo file.
- Tagline: *"Turning sight into insight."*
- Voice: informal yet polished, human, succinct, no arrogance. We/you.
- No emoji in production UI. Use the brand's illustrated icon set.

## Signature motifs
The **wave** graphic (curved flowing form, any angle, any palette color, often with transparency) and Blurple → Red-Orange gradients are the two hallmark brand devices. Use sparingly.

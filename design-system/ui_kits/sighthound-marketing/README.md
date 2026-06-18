# Sighthound marketing site — UI kit (v0.9.1)

A composition-first recreation of **sighthound.com** built from brand tokens, with
imagery used only where it earns its place.

## v0.9.1 reframe

This kit was rebuilt to demonstrate that the system feels Sighthound **without depending
on photography**. The page reads as Sighthound through type, structure, colour, and
composition motifs:

- **Hero** — type-led with a live-detection events panel on the right (data, not stock imagery)
- **Capabilities** — 4 icon-led cards, no images
- **ProductSpotlight** — the 4 products in a 2×2 grid — imagery preserved here, because *this* is where it earns its place
- **Stats** — "By the numbers" data panel on Navy: KPI tiles + sparkline + scan-line pattern
- **Schematic** — "How it deploys" SVG deployment diagram with topo-pattern accent
- **Marquee · CustomerLogos · Footer** — unchanged

## Components
- `Nav.jsx` — top navigation
- `Hero.jsx` — type-led hero + live events panel
- `Capabilities.jsx` — icon-led capability cards
- `ProductSpotlight.jsx` — 4 products (ALPR+, Redactor, Edge Compute, Video)
- `Stats.jsx` — KPI + sparkline data panel
- `Schematic.jsx` — deployment diagram
- `Marquee.jsx` — proof-points marquee
- `CustomerLogos.jsx` — customer grid
- `Footer.jsx` — four-column footer

Open `index.html` to see them assembled.

## Notes
- Built on top of the brand tokens in `../../colors_and_type.css` (v0.9.1).
- No codebase provided; cosmetic-level React.
- Imagery in `ProductSpotlight` pulled from the live Squarespace CDN + saved under `../../assets/`.

# Sighthound ALPR+ — UI kit (v0.9.1)

A live-operations console for the flagship Automatic License Plate Recognition + MMCG
product. Demonstrates the v0.9.1 composition-first system applied to a heavy-data product
surface — almost no stock imagery, fully recognizable as Sighthound.

## What's in here

- **`AppShell.jsx`** — Navy sidebar (consistent with Redactor), Sighthound logo (ALPR+
  has no dedicated wordmark yet — see `DECISIONS_LOG.md` #4), nav with watchlist count
  badge, persona: *T. Marquez · City of Phoenix · Traffic Operations*.
- **`AppShell.jsx`** also exports a `TopBar` with live-pulse indicator (14.3 / min),
  Pause Stream / Export / + Add filter actions.
- **`EventStream.jsx`** — filter-chip bar (active filters as removable pills) + search
  input + scrollable detection list. Each row: confidence dot · timestamp ·
  plate badge · MMCG · site/lane · status pill · numeric confidence. Watchlist hits get
  a `#f99f25` left border; alert hits get `#f62470`. Active row is `#4f60dc` outlined.
- **`VehicleDetail.jsx`** — right pane with:
  - Plate badge + MMCG header
  - **Evidence frame placeholder** — composition motif, not a stock photo. `.sh-pattern-scan`
    background with drawn SVG detection bounding boxes ("VEHICLE · 98%", "PLATE · 99%")
    over abstract lane lines. Includes burned-in frame # and timestamp.
  - 4 supplementary frame thumbnails (also pattern-only).
  - Profile fields (Make / Model / Year / Color / Region / Generation).
  - Confidence bar — color-coded green / blurple / orange by threshold.
  - **Mini-map** — abstract topographic pattern with road lines and a Sighthound-blue marker.
  - Actions (+ Watchlist · Export evidence · Flag).

Open `index.html` for the assembled console.

## v0.9.1 demonstration

Things this kit shows *without* stock photography:
- Live operations feel (pulse indicator, streaming events list)
- Vehicle evidence (SVG bounding boxes over scan-line pattern)
- Geographic context (topo-pattern mini-map)
- Confidence (color-coded bar)
- All metadata as structured data, not captions

Photography would only earn its place here if a real captured frame was being reviewed
post-hoc — and even then, the system's evidence-frame layout handles that without forcing
the visual.

## Notes
- Built on `../../colors_and_type.css` (v0.9.1).
- Reuses brand tokens; no codebase / Figma reference provided.
- Persona, sites and plates are illustrative.
- No internal ALPR+ codebase was attached; refactor to real component APIs when one lands.

# Sighthound Redactor — UI kit (v0.9.1)

A hi-fi recreation of the Redactor desktop/web application UI for video redaction.

## v0.9.1 polish (chrome alignment)

Refined to match the ALPR+ app pattern so all Sighthound product UIs share one shell language:

- **Sidebar** — product overline + persona subtitle pattern (Redactor · Heritage School District). New `+ New project` CTA visually matches ALPR+. Detectors nav item now carries a count badge.
- **Persona** — `K. Skelly · Legal & Compliance` shown as monogram on a warm gradient avatar.
- **TopBar** — adopted the live-pulse pattern from ALPR+: an orange `Processing · 2 jobs in queue` pill (matches the product's bulk/batch nature). Auto-save chip retained.
- **DetectionPanel** — added a *Detections over time* bar-spark (per-10s buckets) and a topo-patterned compliance footer reinforcing CJIS / FOIA / GDPR.

Imagery treatment is unchanged — the footage being redacted *is* the work, so it remains product-essential.

## Components
- `RedactorShell.jsx` — sidebar (Navy, v0.9.1 aligned) + TopBar with processing pill
- `MediaList.jsx` — project file list with status pills (Redacted / Processing / Ready)
- `VideoCanvas.jsx` — playback with detection overlays + scrubber
- `DetectionPanel.jsx` — right panel: detection counts + over-time sparkline + detection list + compliance footer

Open `index.html` for the assembled app view.

`AppShell.jsx` is retained as a legacy local prototype for historical comparison. The
current v0.9.1 assembled kit loads `RedactorShell.jsx`.

## Caveats
- Built from marketing site + brand tokens only; no internal codebase provided.
- For pixel-perfect fidelity, attach the real codebase.
- The packaged standalone (`Sighthound Redactor App.html` at project root) is from v0.9 —
  regenerate if you need a portable file that reflects the v0.9.1 polish.

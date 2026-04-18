# Sighthound Redactor — UI kit

A hi-fi recreation of the Redactor desktop/web application UI for video redaction.

## Components
- `AppShell.jsx` — sidebar + top bar for the editor
- `MediaList.jsx` — project file list with status pills
- `Timeline.jsx` — scrubber + per-track tag blocks (faces, plates, audio)
- `VideoCanvas.jsx` — playback with redaction boxes overlayed
- `DetectionPanel.jsx` — right-side detection list with toggles
- `Uploader.jsx` — empty-state dropzone
- `ExportModal.jsx` — export settings dialog

Open `index.html` for the assembled app view.

## Caveats
Built from marketing site + brand tokens only. No internal codebase provided — if you share
one we'll refactor to match real component APIs.

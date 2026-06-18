# Sighthound Video — UI kit (v0.9.1)

A live-monitoring console for the Sighthound Video VMS — the original Sighthound product.

## Where imagery earns its place

Sighthound Video is the **inverse** case for v0.9.1: live camera feeds *are* the work. The
6-tile camera grid uses real frames from `assets/` (each one chosen to look like a credible
surveillance feed). Composition motifs then frame and label that imagery rather than
substitute for it.

What's composition-led (no imagery):
- Sidebar chrome (Navy + product overline + persona)
- TopBar pulse pill (*12 / 14 cameras online*)
- Camera-tile overlays — label chip, REC/MOTION pulse status, burned-in timestamp + frame #, drawn detection bboxes
- Timeline — 4-hour per-camera motion bands with hour markers and a now-indicator
- Events panel — KPI tiles, filter chips, icon-led event rows

## Components

- **`AppShell.jsx`** — Navy sidebar (consistent with ALPR+ and Redactor), product overline
  *Video · Mercer Logistics*, nav with camera/event counts, persona *D. Patel · Security Ops*.
  Exports a `TopBar` with online-cameras pulse pill, a grid/focus/list layout toggle,
  audio mute and `+ Add camera`.
- **`CameraGrid.jsx`** — 3×2 grid of 16:9 camera tiles. Each tile has:
  - Real footage as the live feed
  - SVG-drawn detection bounding boxes with labels (`VEHICLE · 96%`, `PLATE`, `PERSON · 91%`)
  - Camera-name chip (top-left), REC/MOTION/OFFLINE pulse status (top-right)
  - Burned-in timestamp + frame # (bottom)
  - Selected tile gets a blurple border + 4px halo
- **`Timeline.jsx`** — 6-camera-row motion timeline over the past 4 hours. Motion / Vehicle /
  Plate event bands color-coded; hour grid; "now" indicator at the right edge.
- **`EventsPanel.jsx`** — Right pane with today-so-far KPI tiles, filter chips
  (All / Motion / Vehicle / Plate / Person), and an icon-led event feed with
  follow-up tagging.

Open `index.html` to see them assembled.

## Notes
- Built on `../../colors_and_type.css` (v0.9.1).
- Persona, site name and event data are illustrative.
- No internal Sighthound Video codebase was attached; refactor to real APIs if one lands.
- The 14:32:18 timestamp on every tile is deliberately uniform — a real VMS would show per-camera clocks.
